# Posting Patterns

Use this file when composing or publishing Shuiyuan posts.

## Preflight

1. Search for duplicate topics:
   - `discourse_search({ query: "<project/topic keywords>", max_results: 10 })`
2. Confirm category:
   - Use `references/categories.md` if the user has not chosen.
3. Draft the title and raw Markdown.
4. Publish with write tools when available.
5. Read back the topic and check:
   - Title is correct.
   - Chinese text is not replaced by `?`.
   - GitHub/source links render.
   - Category is correct.

## Intro Post Template

~~~markdown
大家好，我最近折腾了一个小工具：[项目名](GitHub URL)。

它可以……

主要功能：

- 功能 1
- 功能 2
- 功能 3

基本用法：

```powershell
command here
```

GitHub 仓库：

https://github.com/owner/repo

如果你觉得这个项目有用，欢迎顺手点个 star；也非常欢迎提 issue 或 PR。
~~~

## Editing After Publish

When fixing a live post:

- Preserve topic/post IDs from the publish response.
- Use `discourse_update_topic` for title/category/tags when available.
- Use `discourse_update_post` for body when available.
- If MCP update fails due CSRF and direct HTTP fallback is used, do not reveal cookies.
- Always read back with `discourse_read_topic`.
