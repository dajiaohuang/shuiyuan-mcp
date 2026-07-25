import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { isMainModule } from "../util/is_main.js";

test("isMainModule recognizes direct execution", () => {
  const file = fileURLToPath(import.meta.url);
  assert.equal(isMainModule(pathToFileURL(file).href, file), true);
});

test("isMainModule rejects a different entrypoint", () => {
  assert.equal(isMainModule(import.meta.url, process.execPath), false);
});

test("isMainModule resolves Unix npm-style symlinks", {
  skip: process.platform === "win32",
}, () => {
  const dir = mkdtempSync(path.join(tmpdir(), "shuiyuan-main-entry-"));
  try {
    const target = fileURLToPath(import.meta.url);
    const link = path.join(dir, "shuiyuan-mcp");
    symlinkSync(target, link);
    assert.equal(isMainModule(pathToFileURL(target).href, link), true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("isMainModule safely rejects a missing path", () => {
  assert.equal(isMainModule(import.meta.url, path.join(tmpdir(), "missing-shuiyuan-entry")), false);
});
