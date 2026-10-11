# Decisions for fix round 2 (main session arbitration, 6 October 2026)

Round 2 critics: 159 findings (20 HIGH), down from 222 (37 HIGH). The remaining HIGH findings share one root cause: the same fact is written in several places (token file, prose, demo CSS, anatomy tables, library rows, Özet) and the copies drift. These decisions remove the root cause. They extend decisions-r1.md, which still holds.

E1. One source per value. Every design value (color, size, spacing, radius, duration, curve, spring, type style, component size) lives only in the token file printed in #tokenlar and in tables generated from it (renk, kontrast, tipografi, bicim, anatomi, etkilesim, kutuphaneler). Prose and fragments never retype a value: they name the token and link to its table. Component sizes are tokens (component.*) and the anatomy table is generated from them; the demo CSS reads the same generated variables.

E2. Status stamp: no background, transparent. Delete att.*.bg and the success, warning and info subtle tokens; the only filled status background is status.danger.subtle for Yok and Ret in dense tables. #kontrast measures every status ink on bg.surface, bg.hover and bg.selected. The token path is att.<durum>.border.

E3. Reduced motion: the Azaltılmış cell of each row in the Etkileşim tablosu is the only rule. The token file carries it per pattern (an $extensions reducedMotion value on each motion pattern) so a generator can produce it; remove token-level reduced remaps that disagree.

E4. Bold Text: a mapping table in #tipografi (Sans 400 to 600, 500 to 700, 600 to 700; Mono 400 to 600, 500 to 700), also stored as an $extensions boldText value on each type style; #erisilebilirlik links to it.

E5. Increased contrast: $extensions contrastMore values in the token file for text.secondary, text.link, text.linkHover, border.strong, border.subtle, danger.fill, danger.fillHover, danger.fillPressed (its own, darker value), status.danger.solid and text.disabled; tokens.css emits the @media (prefers-contrast: more) block; tcheck.js measures the new pairs.

E6. Phone focus ring for hardware keyboards: outline props (outlineWidth 2, outlineOffset 2, or -2 for items that touch an edge) with a Reanimated CSS-style transition of outlineColor from transparent to focus.ring in dur.mikro with ease.mikro; written once in the #etkilesim focus row, linked from #erisilebilirlik.

E7. Success animation recipe: react-native-svg Path with an animated strokeDashoffset for the square and the check; scale with withSpring(spring.imza). The library row says exactly this. No "View bars" anywhere.

E8. Product rules exactly as plan.html and teknik.html say them (copy their sentence and link):
- Devamdan muaf: plan.html#devam (Md.20/5): no attendance requirement in a course repeated because of FF, DC or DD (the instructor marks it); the requirement stays for FD and the other cases the plan lists.
- Sending: teknik.html#telefon-arka-plan and teknik.html#telefon-gonderme-protokolu: sending happens mainly when the app opens and while it is open when internet returns; background sending is not guaranteed. Every offline message says this truthfully (for example "İnternet gelince, uygulamayı açtığında gönderilir.").
- Account deletion: plan.html#kararlar-hesap-silme: the screen and the web page say what is deleted, what stays, why and for how long.
- Panel targets: plan.html#hoca says every clicked element is at least 24 px, with no exception: inline links get a 24 px hit area (line height or padding).
- Head count before record count (D8 of round 1) stays.

E9. Voice: tasarim.html never says "sahip" or "sahibin". Decisions are written as decisions ("Karar, 6 Ekim 2026: ...") or in the plan's first person; the locked palette is "kilitli renk".

E10. Scannability (rubric D14): the page at 1440 px gets at least 35 percent shorter without losing content. Numbered rule lists use the full width (two columns where the rules are short); long implementation tables (anatomy, full token file, pattern details, library tables, platform tables) sit inside <details> elements with an informative <summary> that states the decision in one line, closed by default except where the section's main point is the table itself; no full-width rule over a narrow text column.

E11. Research file: the traceability table lists exactly the decisions in tokens.json "sources" (the same list as #kaynaklar, same count); findings and recommendations that recommend a banned color get a visible lock note (scan claim, evidence, implication, values for banned hex and for the words yeşil, sarı, kehribar, amber, turuncu used as a recommendation); R07-K01 is voided (it proposes generating a theme from other inputs); the benchmark table shows real, sourced observations, never placeholders.
