import { homedir } from "node:os";
import { posix, win32 } from "node:path";

export const SHUIYUAN_SITE = "https://shuiyuan.sjtu.edu.cn";

export function resolveShuiyuanDir(
  env: NodeJS.ProcessEnv = process.env,
  platform: NodeJS.Platform = process.platform,
  homeDir = homedir(),
): string {
  const path = platform === "win32" ? win32 : posix;
  if (env.SHUIYUAN_MCP_HOME) return env.SHUIYUAN_MCP_HOME;
  if (platform === "win32" && env.APPDATA) return path.join(env.APPDATA, "shuiyuan-mcp");
  if (platform !== "win32" && env.XDG_CONFIG_HOME) return path.join(env.XDG_CONFIG_HOME, "shuiyuan-mcp");
  return path.join(homeDir, ".config", "shuiyuan-mcp");
}

export function defaultShuiyuanDir(): string {
  return resolveShuiyuanDir();
}

export function defaultShuiyuanCookieFile(): string {
  const path = process.platform === "win32" ? win32 : posix;
  return path.join(defaultShuiyuanDir(), "cookies.json");
}

export function defaultShuiyuanProfileFile(): string {
  const path = process.platform === "win32" ? win32 : posix;
  return path.join(defaultShuiyuanDir(), "profile.json");
}

export function defaultShuiyuanUserDataDir(): string {
  const path = process.platform === "win32" ? win32 : posix;
  return path.join(defaultShuiyuanDir(), "browser-profile");
}
