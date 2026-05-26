# AGENTS.md - Shuiyuan MCP

This repository is a Shuiyuan-focused fork of Discourse MCP.

- Upstream style entry: `src/index.ts` -> `dist/index.js` (bin: `discourse-mcp`)
- Shuiyuan wrappers: `src/shuiyuan-login.ts`, `src/shuiyuan-mcp.ts`
- Node: `>=24`
- Package/repo branding: `shuiyuan-mcp`, `io.github.dajiaohuang/shuiyuan-mcp`, `https://github.com/dajiaohuang/shuiyuan-mcp`

## Historical Decisions (From Prior Codex Threads)

These are not optional preferences. They are project decisions already made in previous Discourse/Shuiyuan conversations and implemented in code.

1. Authentication flow is cookie-based for Shuiyuan SSO.
   - First-run login opens a real browser (Playwright) and saves local session state.
   - Default persisted files are under `%APPDATA%\\shuiyuan-mcp\\`:
     - `cookies.json`
     - `profile.json`
     - `browser-profile/`
2. Launcher split is intentional.
   - `shuiyuan-mcp-login` / `shuiyuan-mcp-login.exe`: interactive login + cookie/profile save.
   - `shuiyuan-mcp` / `shuiyuan-mcp.exe`: normal MCP start reusing saved profile.
3. Shuiyuan start path defaults to write-enabled mode.
   - `src/shuiyuan-mcp.ts` appends `--allow_writes --read_only=false` by default.
   - Do not silently remove this behavior unless explicitly requested.
4. Default site and tools mode for Shuiyuan wrappers are fixed.
   - Site: `https://shuiyuan.sjtu.edu.cn`
   - Tools mode: `discourse_api_only`
5. Read performance work has already been done in `discourse_read_topic`.
   - `format` supports: `"auto" | "structured" | "raw"`
   - `auto` switches to raw mode for larger reads (request reduction).
   - Raw strategy and caching were added to avoid rate-limit pressure.
6. Encoding regressions happened before and must be guarded against.
   - Chinese content previously became `?` during some script paths.
   - Always verify published title/body by reading back after write operations.
   - Favor UTF-8-safe execution paths (MCP tool call first; avoid fragile inline shell encodings).
7. Shuiyuan title length constraint is known and must be enforced.
   - Topic title must be <= 48 characters.
   - Shorten before create/update calls instead of retrying after server rejection.
8. Rules compliance is a first-class requirement.
   - Rules references were deliberately added into README/skills.
   - Keep `skills/shuiyuan-mcp/references/rules.md` and publishing guardrails in sync with behavior.
9. Category conventions were established for publishing flows.
   - Technical MCP/tooling posts: category `51`.
   - Shuiyuan usage tutorial posts: category `74`.
10. Windows release flow is part of supported product behavior.
    - `scripts/build-shuiyuan-exe.ps1` builds `dist-win/shuiyuan-mcp-login.exe` and `dist-win/shuiyuan-mcp.exe`.
    - GitHub releases are expected to ship both launchers in a zip.

## SDLC Commands

```bash
pnpm build       # Compile TypeScript to dist/
pnpm typecheck   # Type-check only (no emit)
pnpm lint        # Run ESLint on src/
pnpm test        # Run tests (requires build first)
pnpm clean       # Remove dist/
```

## Source Map

| Area | Files |
|------|-------|
| Entry/CLI | `src/index.ts` |
| Shuiyuan login/start wrappers | `src/shuiyuan-login.ts`, `src/shuiyuan-mcp.ts`, `src/shuiyuan_defaults.ts` |
| HTTP client | `src/http/client.ts` |
| Tool registry | `src/tools/registry.ts` |
| Resource registry | `src/resources/registry.ts` |
| Built-in tools | `src/tools/builtin/*` |
| Remote tools | `src/tools/remote/tool_exec_api.ts` |
| Utilities | `src/util/*.ts` (`logger`, `redact`, `json_response`) |
| Windows launchers | `packaging/ShuiyuanLauncher/*`, `scripts/build-shuiyuan-exe.ps1` |
| Skills and policy refs | `skills/shuiyuan-mcp/*`, `skills/deepsearch/*` |

## Key Patterns

### Tool implementation

- Tools live in `src/tools/builtin/` as individual files.
- Each tool exports a registration function called by `src/tools/registry.ts`.
- All tools return strict JSON (no Markdown) with `isError: true` on failure.
- Write tools require `--allow_writes` and matching auth config.

### Resources

- URI-addressable read-only data (categories, tags, groups, channels, drafts).
- Registered in `src/resources/registry.ts`.

### HTTP layer

- Client in `src/http/client.ts` handles auth, retries (429/5xx), caching.
- User-Agent: `Discourse-MCP/0.x`.
- Write tools enforce approximately 1 request/second rate limiting.

### Configuration

- CLI flags validated via Zod in `src/index.ts`.
- Auth via `--auth_pairs` JSON (API keys, User API keys, or Shuiyuan cookie profile flow).
- `--site <url>` tethers to one site and hides `discourse_select_site`.

### Testing

- Tests live in `src/test/` and run with Node's built-in test runner.
- Build before tests: `pnpm build && pnpm test`.

## Adding a New Tool

1. Create `src/tools/builtin/<name>.ts`
2. Export a `RegisterFn`
3. Register it in `src/tools/registry.ts`

Minimal template:

```typescript
import { z } from "zod";
import type { RegisterFn } from "../types.js";
import { jsonResponse, jsonError } from "../../util/json_response.js";

export const registerMyTool: RegisterFn = (server, ctx, opts) => {
  if (!opts.allowWrites) return; // omit for read-only tools

  server.registerTool(
    "discourse_my_tool",
    {
      title: "My Tool",
      description: "Does X. Returns JSON with Y.",
      inputSchema: z.object({ id: z.number() }).shape,
    },
    async () => {
      const { client } = ctx.siteState.ensureSelectedSite();
      try {
        const data = await client.get(`/endpoint.json`);
        return jsonResponse(data);
      } catch (e: any) {
        return jsonError(`Failed: ${e?.message}`);
      }
    }
  );
};
```

Useful helpers:

- `jsonResponse(data)`
- `jsonError(msg)`
- `paginatedResponse(name, items, meta)`
- `rateLimit(key)`
- `ctx.siteState.ensureSelectedSite()`

