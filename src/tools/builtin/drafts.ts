import { z } from "zod";
import type { RegisterFn } from "../types.js";
import { jsonResponse, jsonError, rateLimit } from "../../util/json_response.js";
import { requireWriteAccess } from "../../util/access.js";
import { createWritePreview, validateWritePreviewConfirmation } from "../../util/write_preview.js";

/**
 * Discourse Draft Tools
 *
 * Drafts in Discourse use a key-based system:
 * - "new_topic" - Draft for creating a new topic
 * - "topic_<id>" - Draft for replying to topic with ID <id>
 * - "new_private_message" - Draft for a new private message
 *
 * The draft data is stored as a JSON object containing:
 * - reply: The draft text content
 * - title: Topic title (for new topics)
 * - categoryId: Category ID
 * - tags: Array of tag names
 * - action: "createTopic", "reply", "edit", etc.
 *
 * Drafts use a sequence number for optimistic locking. When updating
 * a draft, you should use the sequence returned from listing/getting drafts.
 */

/**
 * Get a specific draft by key
 */
export const registerGetDraft: RegisterFn = (server, ctx, _opts) => {
  const schema = z.object({
    draft_key: z
      .string()
      .min(1)
      .max(40)
      .describe('Draft key (e.g., "new_topic", "topic_123", "new_private_message")'),
    sequence: z.number().int().min(0).optional().describe("Expected sequence number (optional)"),
  });

  server.registerTool(
    "discourse_get_draft",
    {
      title: "Get Draft",
      description:
        'Retrieve a specific draft by key. Returns JSON with draft_key, sequence, and parsed data (title, reply, categoryId, tags, action).',
      inputSchema: schema.shape,
    },
    async (input: unknown, _extra: unknown) => {
      const { draft_key, sequence } = schema.parse(input);

      try {
        const { client } = ctx.siteState.ensureSelectedSite();
        const params = new URLSearchParams();
        if (typeof sequence === "number") params.set("sequence", String(sequence));

        const url = `/drafts/${encodeURIComponent(draft_key)}.json${params.toString() ? `?${params}` : ""}`;
        const data = (await client.get(url)) as {
          draft?: string;
          draft_sequence?: number;
        };

        if (!data?.draft) {
          return jsonResponse({ draft_key, found: false });
        }

        let parsedData: Record<string, unknown> = {};
        try {
          parsedData = JSON.parse(data.draft);
        } catch {
          parsedData = { raw: data.draft };
        }

        return jsonResponse({
          draft_key,
          sequence: data.draft_sequence ?? null,
          found: true,
          data: {
            title: parsedData.title || null,
            reply: parsedData.reply || null,
            category_id: parsedData.categoryId || null,
            tags: Array.isArray(parsedData.tags) ? parsedData.tags : [],
            action: parsedData.action || null,
          },
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        return jsonError(`Failed to get draft: ${msg}`);
      }
    }
  );
};

/**
 * Create or update a draft
 */
export const registerSaveDraft: RegisterFn = (server, ctx, opts) => {
  if (!opts.allowWrites) return;

  const schema = z.object({
    draft_key: z
      .string()
      .min(1)
      .max(40)
      .describe('Draft key: "new_topic" for new topics, "topic_<id>" for replies (e.g., "topic_123")'),
    reply: z.string().min(1).max(50000).describe("The draft content/body text"),
    title: z.string().min(1).max(300).optional().describe("Topic title (required for new_topic drafts)"),
    category_id: z.number().int().positive().optional().describe("Category ID for the topic"),
    tags: z.array(z.string().min(1).max(100)).max(10).optional().describe("Array of tag names"),
    sequence: z
      .number()
      .int()
      .min(0)
      .default(0)
      .describe("Current sequence number (use 0 for new drafts, or the sequence from get for updates)"),
    action: z
      .enum(["createTopic", "reply", "edit", "privateMessage"])
      .optional()
      .describe('Draft action type (defaults based on draft_key)'),
    preview: z.boolean().optional().describe("Preview only. Default true."),
    confirm_send: z.boolean().optional().describe("Set true to execute after preview."),
    preview_token: z.string().min(1).optional().describe("Token returned by preview."),
  });

  server.registerTool(
    "discourse_save_draft",
    {
      title: "Create/Save Draft",
      description:
        "Create or update a draft. By default returns preview only; call again with confirm_send=true and preview_token to execute.",
      inputSchema: schema.shape,
    },
    async (input: unknown, _extra: unknown) => {
      const { draft_key, reply, title, category_id, tags, sequence, action, confirm_send = false, preview_token } = schema.parse(input);

      const accessError = requireWriteAccess(ctx.siteState, opts.allowWrites);
      if (accessError) return accessError;
      const { base } = ctx.siteState.ensureSelectedSite();

      const draftData: Record<string, unknown> = { reply };

      let resolvedAction = action;
      if (!resolvedAction) {
        if (draft_key === "new_topic") resolvedAction = "createTopic";
        else if (draft_key === "new_private_message") resolvedAction = "privateMessage";
        else if (draft_key.startsWith("topic_")) resolvedAction = "reply";
      }

      if (resolvedAction) draftData.action = resolvedAction;
      if (title) draftData.title = title;
      if (typeof category_id === "number") draftData.categoryId = category_id;
      if (tags && tags.length > 0) draftData.tags = tags;

      if (draft_key.startsWith("topic_")) {
        const topicId = parseInt(draft_key.replace("topic_", ""), 10);
        if (!isNaN(topicId)) draftData.topic_id = topicId;
      }

      const payload = {
        draft_key,
        data: JSON.stringify(draftData),
        sequence,
      };

      const actionForConfirm = {
        draft_key,
        sequence,
        payload,
      };

      if (!confirm_send) {
        const { previewToken, expiresAt } = createWritePreview("discourse_save_draft", base, actionForConfirm);
        return jsonResponse({
          preview: true,
          operation: "discourse_save_draft",
          preview_token: previewToken,
          expires_at: expiresAt,
          message:
            "Preview generated. Ask user to modify fields if needed, or confirm send with confirm_send=true and preview_token.",
          payload: {
            draft_key,
            sequence,
            data: {
              title: draftData.title ?? null,
              reply: typeof draftData.reply === "string" ? String(draftData.reply).slice(0, 200) : null,
              reply_length: typeof draftData.reply === "string" ? String(draftData.reply).length : 0,
              category_id: draftData.categoryId ?? null,
              tags: Array.isArray(draftData.tags) ? draftData.tags : [],
              action: draftData.action ?? null,
              topic_id: draftData.topic_id ?? null,
            },
          },
        });
      }

      const confirmError = validateWritePreviewConfirmation({
        toolName: "discourse_save_draft",
        siteBase: base,
        action: actionForConfirm,
        previewToken: preview_token,
      });
      if (confirmError) return confirmError;

      await rateLimit("draft", 500);

      try {
        const { client } = ctx.siteState.ensureSelectedSite();

        const result = (await client.post("/drafts.json", payload)) as {
          draft_sequence?: number;
          conflict_user?: { id: number; username?: string };
        };

        if (result.conflict_user) {
          return jsonError("Draft conflict detected", {
            conflict_user_id: result.conflict_user.id,
            new_sequence: result.draft_sequence ?? sequence,
          });
        }

        return jsonResponse({
          draft_key,
          sequence: result.draft_sequence ?? sequence,
          saved: true,
          preview_confirmed: true,
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        return jsonError(`Failed to save draft: ${msg}`);
      }
    }
  );
};

/**
 * Delete a draft
 */
export const registerDeleteDraft: RegisterFn = (server, ctx, opts) => {
  if (!opts.allowWrites) return;

  const schema = z.object({
    draft_key: z.string().min(1).max(40).describe("Draft key to delete"),
    sequence: z.number().int().min(0).describe("Current sequence number (required for deletion)"),
    preview: z.boolean().optional().describe("Preview only. Default true."),
    confirm_send: z.boolean().optional().describe("Set true to execute after preview."),
    preview_token: z.string().min(1).optional().describe("Token returned by preview."),
  });

  server.registerTool(
    "discourse_delete_draft",
    {
      title: "Delete Draft",
      description:
        "Delete a draft by key. By default returns preview only; call again with confirm_send=true and preview_token to execute.",
      inputSchema: schema.shape,
    },
    async (input: unknown, _extra: unknown) => {
      const { draft_key, sequence, confirm_send = false, preview_token } = schema.parse(input);

      const accessError = requireWriteAccess(ctx.siteState, opts.allowWrites);
      if (accessError) return accessError;
      const { base } = ctx.siteState.ensureSelectedSite();

      const action = {
        draft_key,
        sequence,
      };

      if (!confirm_send) {
        const { previewToken, expiresAt } = createWritePreview("discourse_delete_draft", base, action);
        return jsonResponse({
          preview: true,
          operation: "discourse_delete_draft",
          preview_token: previewToken,
          expires_at: expiresAt,
          message:
            "Preview generated. Ask user to modify fields if needed, or confirm send with confirm_send=true and preview_token.",
          payload: action,
        });
      }

      const confirmError = validateWritePreviewConfirmation({
        toolName: "discourse_delete_draft",
        siteBase: base,
        action,
        previewToken: preview_token,
      });
      if (confirmError) return confirmError;

      await rateLimit("draft", 500);

      try {
        const { client } = ctx.siteState.ensureSelectedSite();
        await client.delete(`/drafts/${encodeURIComponent(draft_key)}.json`, { sequence });
        return jsonResponse({ draft_key, deleted: true, preview_confirmed: true });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("409") || msg.toLowerCase().includes("conflict") || msg.toLowerCase().includes("sequence")) {
          return jsonError("Sequence mismatch - draft may have been modified", { draft_key });
        }
        return jsonError(`Failed to delete draft: ${msg}`);
      }
    }
  );
};
