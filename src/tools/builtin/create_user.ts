import { z } from "zod";
import type { RegisterFn } from "../types.js";
import { jsonResponse, jsonError, rateLimit, isZodError, zodError } from "../../util/json_response.js";
import { requireWriteAccess } from "../../util/access.js";
import { createWritePreview, validateWritePreviewConfirmation } from "../../util/write_preview.js";

export const registerCreateUser: RegisterFn = (server, ctx, opts) => {
  if (!opts?.allowWrites) return;

  const schema = z.object({
    username: z.string().min(1).max(20),
    email: z.string().email(),
    name: z.string().min(1).max(255),
    password: z.string().min(10).max(200),
    active: z.boolean().optional().default(true),
    approved: z.boolean().optional().default(true),
    upload_id: z.number().int().positive().optional().describe("Avatar upload_id (from discourse_upload_file)"),
    preview: z.boolean().optional().describe("Preview only. Default true."),
    confirm_send: z.boolean().optional().describe("Set true to execute after preview."),
    preview_token: z.string().min(1).optional().describe("Token returned by preview."),
  });

  server.registerTool(
    "discourse_create_user",
    {
      title: "Create User",
      description: "Create a new user account. By default returns preview only; call again with confirm_send=true and preview_token to execute.",
      inputSchema: schema.shape,
    },
    async (input, _extra) => {
      try {
        const args = schema.parse(input);

        const accessError = requireWriteAccess(ctx.siteState, opts.allowWrites);
        if (accessError) return accessError;
        const { base } = ctx.siteState.ensureSelectedSite();

        const action = {
          username: args.username,
          email: args.email,
          name: args.name,
          password: args.password,
          active: args.active,
          approved: args.approved,
          upload_id: args.upload_id ?? null,
        };

        if (!args.confirm_send) {
          const { previewToken, expiresAt } = createWritePreview("discourse_create_user", base, action);
          return jsonResponse({
            preview: true,
            operation: "discourse_create_user",
            preview_token: previewToken,
            expires_at: expiresAt,
            message:
              "Preview generated. Ask user to modify fields if needed, or confirm send with confirm_send=true and preview_token.",
            payload: {
              username: args.username,
              email: args.email,
              name: args.name,
              password: "<redacted>",
              password_length: args.password.length,
              active: args.active,
              approved: args.approved,
              upload_id: args.upload_id ?? null,
            },
          });
        }

        const confirmError = validateWritePreviewConfirmation({
          toolName: "discourse_create_user",
          siteBase: base,
          action,
          previewToken: args.preview_token,
        });
        if (confirmError) return confirmError;

        await rateLimit("user");
        const { client } = ctx.siteState.ensureSelectedSite();

        const userData = {
          username: args.username,
          email: args.email,
          name: args.name,
          password: args.password,
          active: args.active,
          approved: args.approved,
        };

        const response = await client.post("/users.json", userData) as any;

        if (response.success) {
          // Use canonical username from response (Discourse may normalize it)
          const createdUsername = response.username || args.username;
          let avatarUpdated = false;
          let avatarError: string | undefined;

          // Set avatar if upload_id was provided
          if (args.upload_id !== undefined) {
            try {
              await rateLimit("user");
              await client.put(
                `/u/${encodeURIComponent(createdUsername)}/preferences/avatar/pick.json`,
                { upload_id: args.upload_id, type: "uploaded" }
              );
              avatarUpdated = true;
            } catch (e: any) {
              // Log but don't fail the whole operation
              avatarError = e?.message || String(e);
              ctx.logger.error(`Failed to set avatar for new user ${createdUsername}: ${avatarError}`);
            }
          }

          const result: Record<string, unknown> = {
            success: true,
            username: createdUsername,
            name: args.name,
            email: args.email,
            active: response.active ?? args.active,
            avatar_updated: avatarUpdated,
            preview_confirmed: true,
            message: response.message || "Account created",
          };
          if (avatarError) {
            result.avatar_error = avatarError;
          }
          return jsonResponse(result);
        } else {
          const details: Record<string, unknown> = {};
          if (response.errors) details.errors = response.errors;
          if (response.values) details.values = response.values;
          return jsonError(response.message || "Unknown error", Object.keys(details).length > 0 ? details : undefined);
        }
      } catch (e: unknown) {
        if (isZodError(e)) return zodError(e);
        const err = e as any;
        const details: Record<string, unknown> = {};
        if (err?.body) details.body = err.body;
        if (err?.status) details.status = err.status;
        return jsonError(`Failed to create user: ${err?.message || String(e)}`, Object.keys(details).length > 0 ? details : undefined);
      }
    }
  );
};
