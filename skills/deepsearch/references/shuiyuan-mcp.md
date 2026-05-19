# Deepsearch With Shuiyuan MCP

Use this reference when research involves Shuiyuan topics or posts. The goal is to find enough evidence without walking long threads one JSON page at a time.

## Request-Saving Strategy

1. Search first, read second.
   - Use `discourse_search` or `discourse_filter_topics` to identify 3-5 candidate topics.
   - Do not bulk-read every search result.
2. Orient with structured reads.
   - For a candidate topic, start with `discourse_read_topic({ topic_id, post_limit: 5, format: "structured" })`.
   - This preserves title, category, post numbers, usernames, and timestamps for initial evidence.
3. Bulk scan with raw reads.
   - For long topics, summaries, or whole-thread context, use `discourse_read_topic({ topic_id, post_limit: 50, format: "raw" })`.
   - `format: "auto"` also switches to raw when `post_limit > 20`.
   - Raw mode reads `/raw/{topic}?page=N`, about 100 posts per page, reducing request count.
4. Return to structured only for citation precision.
   - If the answer needs a specific author, timestamp, post id, or exact post number, re-read a small structured window with `start_post_number` and `post_limit <= 20`.
   - Use `discourse_read_post` when you already know a post id.

## Research Pattern

For forum research:

1. `discourse_search` broad terms and aliases.
2. Read top candidates with structured `post_limit: 5`.
3. Pick the most relevant topics.
4. Use raw mode for long-topic synthesis.
5. Use structured mode for exact citations or quoting.
6. Check contradictions with another search pass before finalizing.

## Evidence Notes

- Cite topic URLs and post numbers when available.
- If raw mode reveals an important claim but not enough metadata, do one narrow structured read around the relevant post range.
- Reuse prior raw results from the same topic in working notes instead of rereading.
- Avoid parallel bulk reads across many Shuiyuan topics; this can trigger rate limits.
