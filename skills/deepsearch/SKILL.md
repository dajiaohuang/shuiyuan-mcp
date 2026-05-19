---
name: deepsearch
description: "Use when the user says `deepsearch`, asks for deep research, asks to investigate thoroughly, compare sources, find primary evidence, trace claims, synthesize scattered information, or perform multi-pass search across web, local files, GitHub, Shuiyuan, Gmail, or other available tools."
---

# Deepsearch

Use this skill to turn a broad question into a structured investigation. Prefer evidence over speed; keep the user informed when the search space is large.

## Core Workflow

1. Clarify the target only if the request is too ambiguous to search safely.
2. Define 2-5 concrete research questions.
3. Search broadly, then narrow:
   - Use web search for current/public facts.
   - Use repo/local search for code or documents.
   - Use domain MCPs when relevant, such as `mcp__shuiyuan__` for Shuiyuan.
   - Use primary sources first for technical, legal, financial, medical, or official facts.
4. Record source quality and disagreement.
5. Synthesize findings into a concise answer with links or file references.
6. Call out confidence, unknowns, and what would change the conclusion.

## Search Passes

Run at least two passes for nontrivial tasks:

- Pass 1: orientation. Identify names, dates, vocabulary, canonical sources.
- Pass 2: verification. Search exact phrases, official docs, source code, issue trackers, or archives.
- Optional pass 3: adversarial check. Search for contradictions, failure cases, criticism, or newer updates.

For research that may affect money, health, law, safety, or current decisions, verify against current primary sources.

## Evidence Hygiene

- Do not rely on a single secondary source for important claims.
- Prefer exact dates over relative dates.
- Distinguish facts from inference.
- Avoid over-quoting; summarize instead.
- If a source cannot be opened, say so and do not pretend to have read it.
- When using local files, cite absolute file paths with line numbers when useful.

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

## Optional References

Read `references/query-patterns.md` when planning difficult searches.
Read `references/report-template.md` when the user asks for a report-style answer.
