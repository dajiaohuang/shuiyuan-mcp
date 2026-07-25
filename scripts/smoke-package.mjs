import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tempRoot = mkdtempSync(path.join(tmpdir(), "shuiyuan-package-smoke-"));

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    timeout: 120_000,
    shell: process.platform === "win32",
    ...options,
  });
}

try {
  const pack = run("npm", ["pack", "--silent", "--pack-destination", tempRoot]);
  assert.equal(pack.status, 0, `npm pack failed:\n${pack.stderr}`);
  const tarballName = pack.stdout.trim().split(/\r?\n/).at(-1);
  assert.ok(tarballName, "npm pack did not report a tarball name");

  const installRoot = path.join(tempRoot, "install");
  const install = run("npm", [
    "install",
    "--silent",
    "--ignore-scripts",
    "--prefix",
    installRoot,
    path.join(tempRoot, tarballName),
  ]);
  assert.equal(install.status, 0, `isolated package install failed:\n${install.stderr}`);

  const packageJson = JSON.parse(readFileSync(
    path.join(installRoot, "node_modules", "shuiyuan-mcp", "package.json"),
    "utf8",
  ));
  assert.deepEqual(
    Object.keys(packageJson.bin).sort(),
    ["discourse-mcp", "shuiyuan-mcp", "shuiyuan-mcp-login"],
  );

  const binPath = path.join(
    installRoot,
    "node_modules",
    ".bin",
    process.platform === "win32" ? "shuiyuan-mcp.cmd" : "shuiyuan-mcp",
  );
  const missingProfile = path.join(tempRoot, "missing-profile.json");
  const cli = run(binPath, ["--profile", missingProfile], {
    cwd: installRoot,
  });

  assert.equal(cli.status, 1, `packaged CLI should report a missing profile, got ${cli.status}`);
  assert.match(cli.stderr, /Shuiyuan profile not found/);
  process.stdout.write(`Packaged CLI smoke test passed on ${process.platform}.\n`);
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
