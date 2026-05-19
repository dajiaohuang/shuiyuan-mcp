---
name: deepsearch
description: "Use when the user says `deepsearch`, asks for deep research, asks to investigate thoroughly, compare sources, find primary evidence, trace claims, verify current facts, synthesize scattered information, or perform multi-pass search across web, local files, GitHub, Shuiyuan, Gmail, or other available tools."
---

# Deepsearch

Use this skill to turn a broad question into a structured investigation. Prefer evidence over speed, but keep the work bounded and visible.

## Operating Mode

1. Start with a short research frame unless the user asked for silent execution:
   - Target question
   - Scope boundaries
   - 2-5 subquestions
   - Likely source classes
2. Search in passes. After each pass, update the working hypothesis and the next best query.
3. Keep a compact evidence ledger in your notes: claim, source, date, reliability, what it proves, what it does not prove.
4. Stop when the answer is supported by enough independent evidence for the stakes, or when further search is unlikely to change the result.
5. Present conclusions with confidence and caveats, not a pile of links.

## Search Passes

Run at least two passes for nontrivial tasks:

- Pass 1: orientation. Identify names, dates, vocabulary, canonical sources.
- Pass 2: verification. Search exact phrases, official docs, source code, issue trackers, primary records, or archives.
- Optional pass 3: adversarial check. Search for contradictions, failure cases, criticism, or newer updates.

For research that may affect money, health, law, safety, or current decisions, verify against current primary sources.

## Tool Routing

- Use web search for public or current facts; browse when information may have changed, primary sources matter, or the user asks for links.
- Use repo/local search (`rg`, file reads, tests) for codebase and document investigations.
- Use GitHub tools for issues, PRs, releases, and repository metadata when available.
- Use domain MCPs when relevant, such as `mcp__shuiyuan__` for Shuiyuan topics and posts. For Shuiyuan-heavy research, read `references/shuiyuan-mcp.md` to reduce forum requests.
- Use browser automation only when page state, login, screenshots, or interactive inspection matters.

## Evidence Hygiene

- Do not rely on a single secondary source for important claims.
- Prefer primary sources, then reputable secondary sources, then community reports.
- Prefer exact dates over relative dates.
- Distinguish facts from inference.
- Track source freshness; stale docs and old forum answers may be superseded.
- Avoid over-quoting; summarize instead.
- If a source cannot be opened, say so and do not pretend to have read it.
- When using local files, cite absolute file paths with line numbers when useful.

## Quality Gates

Before finalizing, check:

- Answer: Does it directly answer the user's question?
- Coverage: Were the key subquestions addressed?
- Evidence: Are important claims backed by sources or file refs?
- Conflict: Did you look for contradictory evidence?
- Currency: Are time-sensitive claims verified with current sources?
- Limits: Are gaps, assumptions, and confidence stated plainly?

## Output Shape

Default answer:

- Short conclusion first.
- Key evidence with links/file refs.
- Nuance or disagreement.
- Practical next step.

For complex investigations, use:

1. Bottom line
2. Findings
3. Evidence
4. Gaps / uncertainty
5. Recommended action

Avoid dumping the full evidence ledger unless the user asks for it. Include only evidence that changes the answer.

## Optional References

Read `references/query-patterns.md` when planning difficult searches.
Read `references/report-template.md` when the user asks for a report-style answer.
Read `references/evidence-ledger.md` when the investigation has many claims, sources, or disagreements.
Read `references/shuiyuan-mcp.md` when deepsearching Shuiyuan topics, especially long threads.
