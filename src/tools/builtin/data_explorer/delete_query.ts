import { z } from "zod";
import type { RegisterFn } from "../../types.js";
import {
  jsonResponse,
  jsonError,
  isZodError,
  zodError,
  rateLimit,
} from "../../../util/json_response.js";
import { requireAdminAccess } from "../../../util/access.js";
import { createWritePreview, validateWritePreviewConfirmation } from "../../../util/write_preview.js";

export const registerDeleteQuery: RegisterFn = (server, ctx, opts) => {
  if (!opts.allowWrites) return;

  const schema = z.object({
    id: z.number().int().positive().describe("Query ID to delete"),
    preview: z.boolean().optional().describe("Preview only. Default true."),
    confirm_send: z.boolean().optional().describe("Set true to execute after preview."),
    preview_token: z.string().min(1).optional().describe("Token returned by preview."),
  });

  server.registerTool(
    "discourse_delete_query",
    {
      title: "Delete Data Explorer Query",
      description:
        "Soft-delete a Data Explorer query. By default returns preview only; call again with confirm_send=true and preview_token to execute.",
      inputSchema: schema.shape,
    },
    async (input: unknown, _extra: unknown) => {
      try {
        const { id, confirm_send = false, preview_token } = schema.parse(input);

        const accessError = requireAdminAccess(ctx.siteState);
        if (accessError) return accessError;
        const { base } = ctx.siteState.ensureSelectedSite();

        const action = { id };
        if (!confirm_send) {
          const { previewToken, expiresAt } = createWritePreview("discourse_delete_query", base, action);
          return jsonResponse({
            preview: true,
            operation: "discourse_delete_query",
            preview_token: previewToken,
            expires_at: expiresAt,
            message:
              "Preview generated. Ask user to modify fields if needed, or confirm send with confirm_send=true and preview_token.",
            payload: action,
          });
        }

        const confirmError = validateWritePreviewConfirmation({
          toolName: "discourse_delete_query",
          siteBase: base,
          action,
          previewToken: preview_token,
        });
        if (confirmError) return confirmError;

        await rateLimit("query");

        const { client } = ctx.siteState.ensureSelectedSite();

        await client.delete(`/admin/plugins/explorer/queries/${id}.json`);

        return jsonResponse({ deleted: true, id, preview_confirmed: true });
      } catch (e: unknown) {
        if (isZodError(e)) return zodError(e);
        const err = e as any;
        return jsonError(`Failed to delete query: ${err?.message || String(e)}`);
      }
    }
  );
};
