import { createHash, randomUUID } from "node:crypto";
import { jsonError } from "./json_response.js";

const PREVIEW_TTL_MS = 30 * 60 * 1000;

type PendingWritePreview = {
  toolName: string;
  siteBase: string;
  actionHash: string;
  expiresAtMs: number;
};

const pendingPreviews = new Map<string, PendingWritePreview>();

function purgeExpiredPreviews(nowMs: number = Date.now()): void {
  for (const [token, value] of pendingPreviews.entries()) {
    if (value.expiresAtMs <= nowMs) {
      pendingPreviews.delete(token);
    }
  }
}

function stableNormalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableNormalize);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      out[key] = stableNormalize((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  return value;
}

function hashAction(action: unknown): string {
  const canonical = JSON.stringify(stableNormalize(action));
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

export function createWritePreview(
  toolName: string,
  siteBase: string,
  action: unknown
): { previewToken: string; expiresAt: string } {
  purgeExpiredPreviews();

  const previewToken = randomUUID();
  const expiresAtMs = Date.now() + PREVIEW_TTL_MS;
  pendingPreviews.set(previewToken, {
    toolName,
    siteBase,
    actionHash: hashAction(action),
    expiresAtMs,
  });

  return {
    previewToken,
    expiresAt: new Date(expiresAtMs).toISOString(),
  };
}

export function validateWritePreviewConfirmation(params: {
  toolName: string;
  siteBase: string;
  action: unknown;
  previewToken?: string;
}): ReturnType<typeof jsonError> | null {
  purgeExpiredPreviews();

  const { toolName, siteBase, action, previewToken } = params;
  if (!previewToken || previewToken.trim().length === 0) {
    return jsonError("preview_token is required when confirm_send=true");
  }

  const pending = pendingPreviews.get(previewToken);
  if (!pending) {
    return jsonError("Preview token not found or expired. Please run preview again.");
  }

  if (pending.toolName !== toolName || pending.siteBase !== siteBase) {
    return jsonError("Preview token does not match this operation or site. Please run preview again.");
  }

  const currentHash = hashAction(action);
  if (pending.actionHash !== currentHash) {
    return jsonError("Request payload changed since preview. Please run preview again before confirming.");
  }

  pendingPreviews.delete(previewToken);
  return null;
}
