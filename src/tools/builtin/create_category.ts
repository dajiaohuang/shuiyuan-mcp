import { z } from "zod";
import type { RegisterFn } from "../types.js";
import { jsonResponse, jsonError, rateLimit, isZodError, zodError } from "../../util/json_response.js";
import { requireWriteAccess } from "../../util/access.js";
import { createWritePreview, validateWritePreviewConfirmation } from "../../util/write_preview.js";

export const registerCreateCategory: RegisterFn = (server, ctx, opts) => {
  if (!opts.allowWrites) return;

  const schema = z.object({
    name: z.string().min(1).max(100),
    color: z.string().regex(/^[0-9a-fA-F]{6}$/).optional(),
    text_color: z.string().regex(/^[0-9a-fA-F]{6}$/).optional(),
    emoji: z.string().optional(),
    icon: z.string().optional(),
    parent_category_id: z.number().int().positive().optional(),
    description: z.string().min(1).max(10000).optional(),
    preview: z.boolean().optional().describe("Preview only. Default true."),
    confirm_send: z.boolean().optional().describe("Set true to execute after preview."),
    preview_token: z.string().min(1).optional().describe("Token returned by preview."),
  });

  server.registerTool(
    "discourse_create_category",
    {
      title: "Create Category",
      description: "Create a new category. By default returns preview only; call again with confirm_send=true and preview_token to execute.",
      inputSchema: schema.shape,
    },
    async (input, _extra) => {
      try {
        const {
          name,
          color,
          text_color,
          emoji,
          icon,
          parent_category_id,
          description,
          confirm_send = false,
          preview_token,
        } = schema.parse(input);

        const accessError = requireWriteAccess(ctx.siteState, opts.allowWrites);
        if (accessError) return accessError;
        const { base } = ctx.siteState.ensureSelectedSite();

        const action = {
          name,
          color: color ?? null,
          text_color: text_color ?? null,
          emoji: emoji ?? null,
          icon: icon ?? null,
          parent_category_id: parent_category_id ?? null,
          description: description ?? null,
        };

        if (!confirm_send) {
          const { previewToken, expiresAt } = createWritePreview("discourse_create_category", base, action);
          return jsonResponse({
            preview: true,
            operation: "discourse_create_category",
            preview_token: previewToken,
            expires_at: expiresAt,
            message:
              "Preview generated. Ask user to modify fields if needed, or confirm send with confirm_send=true and preview_token.",
            payload: action,
          });
        }

        const confirmError = validateWritePreviewConfirmation({
          toolName: "discourse_create_category",
          siteBase: base,
          action,
          previewToken: preview_token,
        });
        if (confirmError) return confirmError;

        await rateLimit("category");

        const { client } = ctx.siteState.ensureSelectedSite();

        const payload: any = { name };
        if (color) payload.color = color;
        if (text_color) payload.text_color = text_color;
        if (parent_category_id) payload.parent_category_id = parent_category_id;
        if (description) payload.description = description;
        if (emoji) payload.emoji = emoji;
        if (icon) payload.icon = icon;
        if (emoji) {
          payload.style_type = 2;
        } else if (icon) {
          payload.style_type = 1;
        }

        const data: any = await client.post(`/categories.json`, payload);
        const category = data?.category || data;

        return jsonResponse({
          id: category?.id,
          slug: category?.slug || (category?.name ? String(category.name).toLowerCase().replace(/\s+/g, "-") : null),
          name: category?.name || name,
          preview_confirmed: true,
        });
      } catch (e: unknown) {
        if (isZodError(e)) return zodError(e);
        const err = e as any;
        return jsonError(`Failed to create category: ${err?.message || String(e)}`);
      }
    }
  );
};
