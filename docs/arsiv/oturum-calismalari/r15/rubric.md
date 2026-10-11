# Frozen rubric: 15-slice research audit of plan.html (frozen 2026-10-04, before any agent runs)

Reference: primary sources only (official docs, release notes, changelogs, package registries,
standards and regulation texts, vendor announcements). Secondary sources may only corroborate.

## Owner constraints (hard)
- Research only. No code, no scripts, no file edits in the repo. plan.html is read-only.
- Do not raise KVKK or other legal-compliance topics, timelines or schedules, sponsors, or
  re-staging of the plan's phases.
- Output feeds the owner's own finalisation of plan.html.

## Lenses every recommendation is judged on
1. correct: the plan's statement matches the primary source today (2026-10-04).
2. current: the latest stable, supported option is named; nothing EOL, deprecated or abandoned.
3. useful: the item earns its place for this product (one developer, one university, offline-first).
4. sustainable: maintained (recent releases, more than one active maintainer or a backing org,
   security record, licence), likely to still be supported in 3 to 5 years.
5. scalable: holds at 50,000 students and the plan's stated peak (20,000 phones in 1 to 5 minutes).
6. compact: fewer moving parts, fewer dependencies, smaller app, simpler operations. A
   recommendation that adds a tool must remove more than it adds or fix a real defect.

## A finding is valid only if
- It names the plan line (plan-text.md line number) and quotes the plan text, or is marked MISSING.
- It carries at least one primary-source URL with a verbatim quote and a date.
- Its recommendation is concrete, plan-level, in plain Turkish, and passes the lenses above.
- Confidence is stated honestly; anything not confirmed by a source is marked low.

## Critic pass criteria (per slice)
- Every finding is independently re-checked against its source and at least one more source
  where one exists. Verdicts: CONFIRMED, CORRECTED, REFUTED, UNVERIFIABLE.
- Recommendations that add bloat or pick an unsustainable option are rejected.
- The critic lists important misses in the slice with sources. A critic's own claims are
  re-checked by a fresh second critic before they reach the report.
- Slice PASS only when no high-severity item is unverified and no high-severity miss remains.

## Measurable outcome
- Count of plan claims checked, confirmed, corrected; every correction sourced.
- Net change in moving parts (tools and dependencies added minus removed) across all
  accepted recommendations is zero or negative unless a defect forces otherwise.
