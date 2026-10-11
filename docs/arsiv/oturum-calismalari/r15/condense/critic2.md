# Coverage critic: find information lost when a Turkish plan was condensed and split in two

You are the critic. This is a single, read-only review done by you alone: do NOT launch sub-agents, do NOT run critic or rating loops, do NOT edit any file. Keep tool calls few: read your old slice, read the matching new sections, grep for anything you cannot find.

SCR (bash) = /c/Users/USER/AppData/Local/Temp/claude/C--Users-USER-Desktop-iu-attendance/7abdd45e-faba-44fe-954e-90155d6bca30/scratchpad/r15/condense
SCR (Read tool) = C:\Users\USER\AppData\Local\Temp\claude\C--Users-USER-Desktop-iu-attendance\7abdd45e-faba-44fe-954e-90155d6bca30\scratchpad\r15\condense

Files:
- slices/kN.src.html: one part of the OLD plan (the reference).
- out/plan.html and out/teknik.html: the NEW pair. plan.html keeps what is done and why; teknik.html holds exact technical detail (versions, settings, code layout, tests, operations). Wording was shortened and duplicates were removed: a fact may now live in another section or in the other file, with a "bkz." link pointing to it. That is allowed.

The owner's rule: shorter only through simpler wording, removing duplicates and moving technical detail. Not one piece of information may be lost.

Information = every number, limit, threshold, version, date, name, regulation article, code token, rule, condition, exception, example, rationale (the reason behind a decision), consequence, who does what (hoca, öğrenci, yönetici, sunucu, telefon, panel), and cross-references. Precision words carry meaning: en az, en çok, yalnız, her zaman, hiçbir zaman, ya da, ve, hem, değil, henüz, şimdilik, sonra, ilk sürümde, varsayılan, örnek.

Method: go through kN.src.html sentence by sentence. Find each fact in the new pair (start in the section with the same name; grep both files when it is not there). Report a fact only when it is absent from both files, or present with changed meaning: weaker or stronger, different actor, different condition or scope, lost reason, lost example, or merged in a way that makes it wrong.

Do not report: wording changes that keep the meaning, facts that moved, style preferences, length.

Return only this, one line per problem, most serious first:
[MISSING|CHANGED] short exact quote from the old slice | what is lost or changed | file and section where it belongs
Last line: `kN: <n> problems` (0 if none).
