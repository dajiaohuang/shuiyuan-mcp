# Deepsearch Query Patterns

Use this reference when a topic is broad, current, contested, or hard to verify.

## Query Expansion

Start with:

- Official name
- Common alias
- Acronym
- Chinese and English terms when relevant
- Exact error text or title
- Related entity names
- Date, version, jurisdiction, or product line when relevant

Then add qualifiers:

- `site:official-domain`
- `filetype:pdf`
- `github issue`
- `docs`
- `changelog`
- `release notes`
- `criticism`
- `limitations`
- `pricing`
- `law`
- `policy`
- `changelog`
- `announcement`
- `source code`

## Query Ladder

Move from broad to precise:

1. Broad orientation: `<entity> <topic>`
2. Canonical source: `<entity> <topic> official docs`
3. Exact claim: quoted phrase, error text, title, regulation number, or API name
4. Time/version bound: add year, release, version, jurisdiction, category, or model
5. Contradiction: add limitation, deprecated, bug, controversy, lawsuit, correction, or errata

Do not keep repeating broad queries after pass 1. Use each result to sharpen the next query.

## Verification Patterns

- For software behavior: official docs, source code, release notes, tests, issue comments by maintainers.
- For institutions: official pages, policy PDFs, archived pages if changed recently.
- For news: multiple reputable outlets plus original announcement, court filing, company post, or regulator page.
- For academic claims: paper, dataset, replication, errata, author pages.
- For communities such as Shuiyuan: read the original topic and nearby replies before summarizing.
- For Shuiyuan deepsearch: search/filter first, then use raw `discourse_read_topic` for long-thread synthesis and structured reads only for citation precision.

## Contradiction Search

After forming a tentative conclusion, search:

- `<claim> false`
- `<claim> limitation`
- `<claim> bug`
- `<claim> changed`
- `<claim> deprecated`
- `<claim> lawsuit`
- `<claim> review`

Use contradiction results to calibrate confidence, not as automatic disproof.

## Local / Repo Patterns

- Start with `rg` for identifiers, exact phrases, CLI flags, filenames, and error text.
- Read neighboring files before proposing architectural conclusions.
- For behavior claims, prefer tests, implementation, and config over README prose.
- For recent changes, inspect `git diff`, `git log`, and relevant generated artifacts.
