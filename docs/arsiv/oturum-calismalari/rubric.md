# Frozen rubric: IU Yoklama, research + decision phase

Frozen 2026-09-28 before research starts. The builder (main session) may not edit it.

The deliverable is a decision document (scope + tech + design). It PASSES only if every item holds:

1. Every technology decision names a winner, a second choice, and a rejected option, each with dated evidence
   (release/commit dates, docs links). No decision rests on "popular" alone.
2. The attendance verification method works when the student phone has NO internet at the moment of attendance,
   and the document states exactly what happens for: late sync, never sync, dead battery, no phone,
   instructor phone offline, clock manipulation, photographed QR forwarded to someone outside.
3. Fraud resistance is stated against the explicit bar "better than paper signature", with a named list of
   attacks it stops and attacks it does not stop.
4. Zero dependency on AKSIS/SSO. Roster import from the AKSIS Excel export and export back for manual entry
   are specified at the column level, or marked as an open item needing a real sample file.
5. Every item in the faculty notes maps to a scope line (MVP / later / rejected with reason). Nothing dropped silently.
6. Items the notes missed are listed separately and marked as additions (roles, semesters, holidays, sections,
   co-instructors, audit, retention, account recovery, web panel, etc.).
7. KVKK: data controller, legal basis, retention, hosting location and cross-border transfer are decided or
   flagged as a question for the university.
8. Distribution path for both stores is concrete (account type, cost, review risk, timeline).
9. Each MVP feature names a measurable outcome (e.g. time to take attendance for 100 students, sync success rate).
10. Open questions for the faculty are listed, each with why it matters and a default if unanswered.
