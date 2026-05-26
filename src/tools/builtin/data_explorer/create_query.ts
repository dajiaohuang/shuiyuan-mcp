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

export const registerCreateQuery: RegisterFn = (server, ctx, opts) => {
  if (!opts.allowWrites) return;

  const schema = z.object({
    name: z
      .string()
      .min(1)
      .max(255)
      .describe("Query name"),
    sql: z
      .string()
      .min(1)
      .describe("SQL query. Declare parameters in comments: -- [params]\\n-- int :user_id"),
    description: z.string().optional().describe("Query description"),
    group_ids: z
      .array(z.number().int())
      .optional()
      .describe("Group IDs allowed to run this query (empty = admin only)"),
    preview: z.boolean().optional().describe("Preview only. Default true."),
    confirm_send: z.boolean().optional().describe("Set true to execute after preview."),
    preview_token: z.string().min(1).optional().describe("Token returned by preview."),
  });

  server.registerTool(
    "discourse_create_query",
    {
      title: "Create Data Explorer Query",
      description:
        "Create a new saved Data Explorer query. By default returns preview only; call again with confirm_send=true and preview_token to execute.",
      inputSchema: schema.shape,
    },
    async (input: unknown, _extra: unknown) => {
      try {
        const { name, sql, description, group_ids, confirm_send = false, preview_token } = schema.parse(input);

        const accessError = requireAdminAccess(ctx.siteState);
        if (accessError) return accessError;
        const { base } = ctx.siteState.ensureSelectedSite();

        const payload: Record<string, unknown> = {
          query: {
            name,
            sql,
            description: description || "",
            group_ids: group_ids || [],
          },
        };

        const action = { payload };

        if (!confirm_send) {
          const { previewToken, expiresAt } = createWritePreview("discourse_create_query", base, action);
          return jsonResponse({
            preview: true,
            operation: "discourse_create_query",
            preview_token: previewToken,
            expires_at: expiresAt,
            message:
              "Preview generated. Ask user to modify fields if needed, or confirm send with confirm_send=true and preview_token.",
            payload: {
              query: {
                name,
                description: description || "",
                group_ids: group_ids || [],
                sql_preview: sql.slice(0, 300),
                sql_length: sql.length,
              },
            },
          });
        }

        const confirmError = validateWritePreviewConfirmation({
          toolName: "discourse_create_query",
          siteBase: base,
          action,
          previewToken: preview_token,
        });
        if (confirmError) return confirmError;

        await rateLimit("query");

        const { client } = ctx.siteState.ensureSelectedSite();

        const data = (await client.post(
          "/admin/plugins/explorer/queries.json",
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
        return jsonError(`Failed to create query: ${err?.message || String(e)}`);
      }
    }
  );
};
