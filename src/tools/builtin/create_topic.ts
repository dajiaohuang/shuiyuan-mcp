import { z } from "zod";
import type { RegisterFn } from "../types.js";
import { jsonResponse, jsonError, rateLimit, isZodError, zodError } from "../../util/json_response.js";
import { requireWriteAccess } from "../../util/access.js";
import { createWritePreview, validateWritePreviewConfirmation } from "../../util/write_preview.js";

export const registerCreateTopic: RegisterFn = (server, ctx, opts) => {
  if (!opts.allowWrites) return;

  const schema = z.object({
    title: z.string().min(1).max(300),
    raw: z.string().min(1).max(30000),
    category_id: z.number().int().positive().optional(),
    tags: z.array(z.string().min(1).max(100)).max(10).optional(),
    author_username: z.string().optional(),
    preview: z.boolean().optional().describe("Preview only. Default true."),
    confirm_send: z.boolean().optional().describe("Set true to execute after preview."),
    preview_token: z.string().min(1).optional().describe("Token returned by preview."),
  });

  server.registerTool(
    "discourse_create_topic",
    {
      title: "Create Topic",
      description: "Create a new topic. By default returns preview only; call again with confirm_send=true and preview_token to publish.",
      inputSchema: schema.shape,
    },
    async (input, _extra) => {
      try {
        const {
          title,
          raw,
          category_id,
          tags,
          author_username,
          confirm_send = false,
          preview_token,
        } = schema.parse(input);

        const accessError = requireWriteAccess(ctx.siteState, opts.allowWrites);
        if (accessError) return accessError;
        const { base } = ctx.siteState.ensureSelectedSite();

        const action = {
          title,
          raw,
          category_id: typeof category_id === "number" ? category_id : null,
          tags: Array.isArray(tags) ? tags : [],
          author_username: author_username || null,
        };

        if (!confirm_send) {
          const { previewToken, expiresAt } = createWritePreview("discourse_create_topic", base, action);
          return jsonResponse({
            preview: true,
            operation: "discourse_create_topic",
            preview_token: previewToken,
            expires_at: expiresAt,
            message:
              "Preview generated. Ask user to modify fields if needed, or confirm send with confirm_send=true and preview_token.",
            payload: action,
          });
        }

        const confirmError = validateWritePreviewConfirmation({
          toolName: "discourse_create_topic",
          siteBase: base,
          action,
          previewToken: preview_token,
        });
        if (confirmError) return confirmError;

        await rateLimit("topic");

        const { client } = ctx.siteState.ensureSelectedSite();

        const payload: any = { title, raw };
        const headers: Record<string, string> = {};

        if (typeof category_id === "number") payload.category = category_id;
        if (Array.isArray(tags) && tags.length > 0) payload.tags = tags;
        if (author_username && author_username.length > 0) headers["Api-Username"] = author_username;

        const data: any = await client.post(`/posts.json`, payload, { headers });

        return jsonResponse({
          id: data?.id || data?.post?.id,
          topic_id: data?.topic_id || data?.topicId || data?.topic?.id,
          slug: data?.topic_slug || data?.topic?.slug || null,
          title: data?.topic_title || data?.title || title,
          preview_confirmed: true,
        });
      } catch (e: unknown) {
        if (isZodError(e)) return zodError(e);
        const err = e as any;
        return jsonError(`Failed to create topic: ${err?.message || String(e)}`);
      }
    }
  );
};

