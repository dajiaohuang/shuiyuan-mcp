import { z } from "zod";
import type { RegisterFn } from "../types.js";
import { jsonResponse, jsonError, rateLimit, isZodError, zodError } from "../../util/json_response.js";
import { requireWriteAccess } from "../../util/access.js";
import { createWritePreview, validateWritePreviewConfirmation } from "../../util/write_preview.js";

export const registerCreatePost: RegisterFn = (server, ctx, opts) => {
  if (!opts.allowWrites) return;

  const schema = z.object({
    topic_id: z.number().int().positive(),
    raw: z.string().min(1).max(30000),
    author_username: z.string().optional(),
    preview: z.boolean().optional().describe("Preview only. Default true."),
    confirm_send: z.boolean().optional().describe("Set true to execute after preview."),
    preview_token: z.string().min(1).optional().describe("Token returned by preview."),
  });

  server.registerTool(
    "discourse_create_post",
    {
      title: "Create Post",
      description: "Create a post in a topic. By default returns preview only; call again with confirm_send=true and preview_token to publish.",
      inputSchema: schema.shape,
    },
    async (input, _extra) => {
      try {
        const {
          topic_id,
          raw,
          author_username,
          confirm_send = false,
          preview_token,
        } = schema.parse(input);

        const accessError = requireWriteAccess(ctx.siteState, opts.allowWrites);
        if (accessError) return accessError;
        const { base } = ctx.siteState.ensureSelectedSite();

        const action = {
          topic_id,
          raw,
          author_username: author_username || null,
        };

        if (!confirm_send) {
          const { previewToken, expiresAt } = createWritePreview("discourse_create_post", base, action);
          return jsonResponse({
            preview: true,
            operation: "discourse_create_post",
            preview_token: previewToken,
            expires_at: expiresAt,
            message:
              "Preview generated. Ask user to modify fields if needed, or confirm send with confirm_send=true and preview_token.",
            payload: action,
          });
        }

        const confirmError = validateWritePreviewConfirmation({
          toolName: "discourse_create_post",
          siteBase: base,
          action,
          previewToken: preview_token,
        });
        if (confirmError) return confirmError;

        await rateLimit("post");

        const { client } = ctx.siteState.ensureSelectedSite();
        const payload: any = { topic_id, raw };
        const headers: Record<string, string> = {};

        if (author_username && author_username.length > 0) headers["Api-Username"] = author_username;

        const data = (await client.post(`/posts.json`, payload, { headers })) as any;

        return jsonResponse({
          id: data?.id || data?.post?.id,
          topic_id: data?.topic_id || topic_id,
          post_number: data?.post_number || data?.post?.post_number,
          preview_confirmed: true,
        });
      } catch (e: unknown) {
        if (isZodError(e)) return zodError(e);
        const err = e as any;
        return jsonError(`Failed to create post: ${err?.message || String(e)}`);
      }
    }
  );
};
