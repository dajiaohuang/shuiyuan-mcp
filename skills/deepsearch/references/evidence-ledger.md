# Deepsearch Evidence Ledger

Use this reference when a task has many sources, contested claims, or a high cost of being wrong.

## Compact Ledger

Track only what helps reasoning:

```markdown
| Claim | Source | Date | Reliability | Supports | Limits |
|---|---|---:|---|---|---|
| Short claim | URL/file ref | YYYY-MM-DD | primary/secondary/community | What it proves | What it does not prove |
```

Keep the ledger in working notes. In the final answer, include a compressed evidence section rather than the whole table unless requested.

## Reliability Labels

- `primary`: official docs, laws/regulations, filings, source code, papers, release notes, original data.
- `secondary`: reputable reporting, explainers, review articles, maintained databases.
- `community`: forum posts, social media, anecdotes, issue comments from non-maintainers.
- `unknown`: source identity, date, or provenance is unclear.

## Escalation Rules

Use more verification when:

- The claim is surprising or high-impact.
- Sources disagree.
- The source is old and the domain changes quickly.
- A source quotes another source; find the original.
- A user will spend money, change code, make a medical/legal/financial decision, or publish the result.

## Stopping Rules

It is reasonable to stop when:

- Two independent strong sources agree on the central claim.
- The primary source directly answers the question.
- Additional searches only repeat the same evidence.
- You can state the remaining uncertainty clearly.
