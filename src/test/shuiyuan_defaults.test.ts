import test from "node:test";
import assert from "node:assert/strict";
import { resolveShuiyuanDir } from "../shuiyuan_defaults.js";

test("Windows keeps APPDATA as the default base", () => {
  const actual = resolveShuiyuanDir(
    { APPDATA: "C:\\Users\\tester\\AppData\\Roaming" },
    "win32",
    "C:\\Users\\tester",
  );
  assert.equal(actual, "C:\\Users\\tester\\AppData\\Roaming\\shuiyuan-mcp");
});

test("Windows ignores XDG_CONFIG_HOME when APPDATA is available", () => {
  const actual = resolveShuiyuanDir(
    {
      APPDATA: "C:\\Users\\tester\\AppData\\Roaming",
      XDG_CONFIG_HOME: "C:\\xdg",
    },
    "win32",
    "C:\\Users\\tester",
  );
  assert.equal(actual, "C:\\Users\\tester\\AppData\\Roaming\\shuiyuan-mcp");
});

test("Linux honors XDG_CONFIG_HOME", () => {
  const actual = resolveShuiyuanDir(
    { XDG_CONFIG_HOME: "/var/lib/tester/config" },
    "linux",
    "/home/tester",
  );
  assert.equal(actual, "/var/lib/tester/config/shuiyuan-mcp");
});

test("Linux ignores APPDATA and falls back to ~/.config", () => {
  const actual = resolveShuiyuanDir(
    { APPDATA: "/unexpected/appdata" },
    "linux",
    "/home/tester",
  );
  assert.equal(actual, "/home/tester/.config/shuiyuan-mcp");
});

test("SHUIYUAN_MCP_HOME explicitly overrides platform defaults", () => {
  assert.equal(
    resolveShuiyuanDir(
      {
        SHUIYUAN_MCP_HOME: "/srv/shuiyuan/state",
        XDG_CONFIG_HOME: "/home/tester/.config",
      },
      "linux",
      "/home/tester",
    ),
    "/srv/shuiyuan/state",
  );
  assert.equal(
    resolveShuiyuanDir(
      {
        SHUIYUAN_MCP_HOME: "D:\\shuiyuan-state",
        APPDATA: "C:\\Users\\tester\\AppData\\Roaming",
      },
      "win32",
      "C:\\Users\\tester",
    ),
    "D:\\shuiyuan-state",
  );
});
