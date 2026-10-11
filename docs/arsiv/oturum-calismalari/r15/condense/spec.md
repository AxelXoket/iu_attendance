# Task: condense one unit of a Turkish plan document, zero information loss

SCR (bash) = /c/Users/USER/AppData/Local/Temp/claude/C--Users-USER-Desktop-iu-attendance/7abdd45e-faba-44fe-954e-90155d6bca30/scratchpad/r15/condense
SCR (Read/Write tools) = C:\Users\USER\AppData\Local\Temp\claude\C--Users-USER-Desktop-iu-attendance\7abdd45e-faba-44fe-954e-90155d6bca30\scratchpad\r15\condense

You get one HTML fragment: a contiguous part of plan.html, a Turkish planning document for a university attendance app. The owner wants the plan shorter and simpler, with NO information lost. Rewrite your fragment shorter so it reads simpler while every piece of information stays.

Target: output at most 72% of the input word count (secgate prints the ratio). Zero information loss outranks the target. If you cannot go lower without dropping a fact, stop at the lowest lossless ratio and name the facts that blocked further cuts.

## What counts as information (all of it must survive)
Every number, unit, version, date, limit, threshold, name (product, library, standard, institution, regulation article such as Md.19), code token, config flag, command, file path, rule, condition, exception, example, rationale (reasons after "çünkü", "yoksa", "bu yüzden", "için"), consequence, ordering, who does what (hoca, öğrenci, yönetici, sunucu, telefon, panel), and every "bkz." cross-reference (other units hold those targets; keep pointers as they are).

Precision words keep their exact meaning: en az, en çok, yalnız, her zaman, hiçbir zaman, ya da, ve, hem, değil, henüz, şimdilik, sonra, ilk sürümde, varsayılan, örnek. Negations stay negations. A rationale may get shorter ("çünkü X" to "(X)" or "X yüzünden") but never disappears.

## How to shorten (Turkish)
- Short noun-phrase sentences: "Kayıtlar sırayla, en çok 200'lük paketlerle gider." instead of "Kayıtlar sırayla gönderilir ve her paket en çok 200 kayıttan oluşur."
- Drop filler verbs and connectors that carry no information: "yapılır", "bulunur", "olarak", "ayrıca", "böylece", "bu da", "şu demek", "kendi" when redundant.
- Do not repeat the subject inside the same row or list item.
- Join sentences that share a subject with ";" or ":".
- Move explanatory side clauses into parentheses.
- Enumerations as comma lists, not prose.
- Keep first person singular where the owner speaks ("isterim", "yaparım", "benim").

Example
Before: "Hoca süreyi değiştirir ya da yoklamayı erken kapatırsa internetsiz telefonlar bunu bilemez. Kayıtlar beklemede kalır, son kararı sunucu hocanın ayarına göre verir."
After: "Süre değişir ya da yoklama erken kapanırsa internetsiz telefonlar bilemez; kayıtlar beklemede kalır, son kararı sunucu hocanın ayarına göre verir."

## Hard rules
- Output is the same HTML fragment with the same structure: same tags in the same order and count (section, div, ul, ol, li, details, summary, p, pre, h2, h3, span, a), same class names, same ids, same row labels inside `<div class="k">`, same HTML comments. Do not add, remove, merge, split or reorder rows, list items or headings. `<code>` and `<strong>` may move only if their text stays.
- `<pre>` blocks stay byte-identical.
- No en dash (U+2013) or em dash (U+2014) anywhere; write ranges with "ile" ("10 ile 15 saniye").
- Turkish only, plain words, no new jargon, no new facts, no opinions, no softening or strengthening of claims.
- Keep HTML entities as they are (&lt; &gt;).
- Write only your own output file. Touch nothing else.

## Verify before you finish
Run: `node "$SCR/secgate.js" "$SCR/units/uNN.in.html" "$SCR/units/uNN.out.html"`
It must print `gate PASS`. It checks tag counts, numbers, `<code>` contents, hrefs, technical tokens, proper nouns and dashes, and prints the word ratio. PASS does not prove the meaning survived: re-read input and output side by side, sentence by sentence, and confirm each fact is present with the same meaning before you finish.

## Return (short)
`uNN ratio=<x> gate=PASS` and at most 3 lines: facts that blocked further cuts, or anything you were unsure about.
