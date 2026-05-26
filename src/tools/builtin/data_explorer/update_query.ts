import { z } from "zod";
import type { RegisterFn } from "../../types.js";
import {
  jsonResponse,
  jsonError,
  isZodError,
  zodError,
  rateLimit,
  transformQueryDetail,
} from "../../../util/json_response.js";
import { requireAdminAccess } from "../../../util/access.js";
import { createWritePreview, validateWritePreviewConfirmation } from "../../../util/write_preview.js";

export const registerUpdateQuery: RegisterFn = (server, ctx, opts) => {
  if (!opts.allowWrites) return;

  const schema = z.object({
    id: z.number().int().positive().describe("Query ID to update"),
    name: z.string().min(1).max(255).optional().describe("New query name"),
    sql: z
      .string()
      .min(1)
      .optional()
      .describe("New SQL query"),
    description: z.string().optional().describe("New query description"),
    group_ids: z
      .array(z.number().int())
      .optional()
      .describe("New group IDs allowed to run this query"),
    preview: z.boolean().optional().describe("Preview only. Default true."),
    confirm_send: z.boolean().optional().describe("Set true to execute after preview."),
    preview_token: z.string().min(1).optional().describe("Token returned by preview."),
  });

  server.registerTool(
    "discourse_update_query",
    {
      title: "Update Data Explorer Query",
      description:
        "Update an existing Data Explorer query. By default returns preview only; call again with confirm_send=true and preview_token to execute.",
      inputSchema: schema.shape,
    },
    async (input: unknown, _extra: unknown) => {
      try {
        const {
          id,
          name,
          sql,
          description,
          group_ids,
          confirm_send = false,
          preview_token,
        } = schema.parse(input);

        const accessError = requireAdminAccess(ctx.siteState);
        if (accessError) return accessError;
        const { base } = ctx.siteState.ensureSelectedSite();

        const queryUpdate: Record<string, unknown> = {};
        if (name !== undefined) queryUpdate.name = name;
        if (sql !== undefined) queryUpdate.sql = sql;
        if (description !== undefined) queryUpdate.description = description;
        if (group_ids !== undefined) queryUpdate.group_ids = group_ids;

        if (Object.keys(queryUpdate).length === 0) {
          return jsonError("No fields to update");
        }

        const payload = { query: queryUpdate };

        const action = {
          id,
          payload,
        };

        if (!confirm_send) {
          const { previewToken, expiresAt } = createWritePreview("discourse_update_query", base, action);
          return jsonResponse({
            preview: true,
            operation: "discourse_update_query",
            preview_token: previewToken,
            expires_at: expiresAt,
            message:
              "Preview generated. Ask user to modify fields if needed, or confirm send with confirm_send=true and preview_token.",
            payload: {
              id,
              updates: {
                ...queryUpdate,
                ...(typeof sql === "string" ? { sql_preview: sql.slice(0, 300), sql_length: sql.length } : {}),
              },
            },
          });
        }

        const confirmError = validateWritePreviewConfirmation({
          toolName: "discourse_update_query",
          siteBase: base,
          action,
          previewToken: preview_token,
        });
        if (confirmError) return confirmError;

        await rateLimit("query");
        const { client } = ctx.siteState.ensureSelectedSite();

        const data = (await client.put(
          `/admin/plugins/explorer/queries/${id}.json`,
          payload
        )) as any;

        const query = data?.query || data;
        return jsonResponse({
          ...transformQueryDetail(query),
          preview_confirmed: true,
        });
      } catch (e: unknown) {
        if (isZodError(e)) return zodError(e);
        const err = e as any;
        return jsonError(`Failed to update query: ${err?.message || String(e)}`);
      }
    }
  );
};
