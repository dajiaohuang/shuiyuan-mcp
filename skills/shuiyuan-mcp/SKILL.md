---
name: shuiyuan-mcp
description: "Use when working with Shuiyuan/SJTU Discourse through the `mcp__shuiyuan__` MCP tools: searching Shuiyuan, reading topics/posts, summarizing discussions, checking user posts, drafting replies, publishing topics or replies, editing Shuiyuan posts, choosing categories, or troubleshooting Shuiyuan MCP read/write access."
---

# Shuiyuan MCP

Use the `mcp__shuiyuan__` tool namespace whenever the user asks about Shuiyuan content or wants to publish to Shuiyuan. Prefer the MCP tools over raw HTTP when the needed tool is available.

## Quick Workflow

1. For search or research, call `mcp__shuiyuan__.discourse_search` or `mcp__shuiyuan__.discourse_filter_topics`.
2. For details, call `discourse_read_topic` or `discourse_read_post`; summarize from returned JSON only.
3. For publishing, confirm the target category unless the user has already specified one.
4. Before creating a public topic, search for likely duplicates.
5. After writing, read the topic back and verify title/body/category rendered correctly.
6. If Chinese text renders as `?`, fix the affected title/post immediately using a UTF-8-safe path.

## Tool Map

Read tools usually available:

- `discourse_search`
- `discourse_filter_topics`
- `discourse_read_topic`
- `discourse_read_post`
- `discourse_get_user`
- `discourse_list_user_posts`
- `discourse_get_draft`
- `discourse_get_chat_messages`

Write tools may only appear when Shuiyuan MCP is started with writes enabled:

- `discourse_create_topic`
- `discourse_create_post`
- `discourse_update_topic`
- `discourse_update_post`
- `discourse_save_draft`

If write tools are absent, tell the user to restart Shuiyuan MCP with writes enabled. In this repo, `shuiyuan-mcp` is intended to default to `--allow_writes --read_only=false`.

## Publishing Rules

- Do not publish unless the user clearly asked to publish.
- Read `references/rules.md` before publishing public topics or replies about people, events, disputes, screenshots, privacy, sensitive claims, or large reposted content.
- Ask for category when ambiguous. For category IDs, read `references/categories.md`.
- Use `极客时间` (`category_id: 51`) for technical tools, MCP, AI agents, programming, automation, or developer workflows.
- Use `水源教程` (`category_id: 74`) for user-facing tutorials about Shuiyuan itself.
- Keep titles concise and Chinese-readable. Shuiyuan topic titles must be at most 48 characters; shorten before posting instead of retrying after a 422 error.
- Include source links explicitly when introducing a project.
- After publishing, return the Shuiyuan URL and mention any edits made.

## Encoding Guardrail

When using shell scripts or direct HTTP for Chinese content, avoid PowerShell `@'...'@ | node --input-type=module -` because it can mangle UTF-8. Prefer:

- Native MCP tool calls when available.
- `mcp__node_repl__.js` for direct fetch/edit fallback.
- A UTF-8 `.js` file executed with Node if a local script is needed.

If a post is already published with `?` replacing Chinese, fix it by updating the post/title with UTF-8-safe input, then re-read it with `discourse_read_topic`.

## Fallbacks

If MCP write calls return `403 BAD CSRF`, use the browser-like cookie flow only when the user explicitly wants the action completed and the saved cookie belongs to them:

1. Read the cookie file from the local Shuiyuan profile.
2. Fetch `/session/csrf.json` with cookies.
3. Merge any `Set-Cookie` values from the CSRF response into the cookie jar.
4. Send the write request with `X-CSRF-Token`, `X-Requested-With: XMLHttpRequest`, `Origin`, `Referer`, and merged cookies.
5. Verify with `discourse_read_topic`.

Never print or paste real cookie values.
