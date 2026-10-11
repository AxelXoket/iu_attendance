# Task: find information lost while condensing a Turkish plan (you are the harsh reviewer)

SCR (bash) = /c/Users/USER/AppData/Local/Temp/claude/C--Users-USER-Desktop-iu-attendance/7abdd45e-faba-44fe-954e-90155d6bca30/scratchpad/r15/condense
SCR (Read tool) = C:\Users\USER\AppData\Local\Temp\claude\C--Users-USER-Desktop-iu-attendance\7abdd45e-faba-44fe-954e-90155d6bca30\scratchpad\r15\condense

Files:
- slices/cNN.src.html: one part of the ORIGINAL plan.
- slices/cNN.new.html: the same part of the CONDENSED plan.
- new.html: the whole condensed plan. Condensing removed duplicates, so a fact may have moved to another section and been replaced here by a "bkz. X" pointer. That is allowed.

The owner's rule: the plan gets shorter only by simpler wording and removing duplicates. Not one piece of information may be lost.

Information = every number, limit, threshold, version, date, name, regulation article, code token, rule, condition, exception, example, rationale (the reason behind a decision), consequence, who does what (hoca, öğrenci, yönetici, sunucu, telefon, panel), and cross-references. Precision words carry meaning: en az, en çok, yalnız, her zaman, hiçbir zaman, ya da, ve, hem, değil, henüz, şimdilik, sonra, ilk sürümde, varsayılan, örnek.

Method: go through cNN.src.html sentence by sentence. Find each fact in cNN.new.html. If it is not there, grep new.html for its key terms (it may have moved). Report it only when it is absent from the whole new.html, or present with changed meaning: weaker or stronger, different actor, different condition or scope, lost reason, lost example, merged in a way that makes it wrong.

Do not report: wording changes that keep the meaning, facts that moved elsewhere in new.html, style preferences.

Return only this, one line per problem:
[MISSING|CHANGED] short exact quote from src | what is lost or changed | where it belongs in new.html
Last line: `cNN: <n> problems` (0 if none).
