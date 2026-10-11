# Fix list for the winning direction (A, "Kesin", midnight blue as ink) -> variants/A2

Arbitration by the main session on 6 October 2026 after three blind critics picked A unanimously (mean 8.0; B 6.3, C 5.3) and named A's map the best answer to the owner's question. Every item has an acceptance check. Work in variants/A2 only (a copy of A with its build pipeline: tools/build.js builds specimen.html from tokens.json, src/specimen.css, src/specimen.js, icons.json, qr.json, coverage.json). Keep everything that the critics praised: the ink map, exact lock fidelity, 0 px corners, IBM Plex Sans and Plex Mono, the do and don't triptych, the measured waffle, the annotated home screen, the 400 ms square and tick signature moment, the slow-motion switch, the per-pattern reduced-motion table, the rulecheck and interact tools.

## 1. Owner question: midnight blue as an undertone
1.1 Home screen (Bugün): only one filled blue area per screen. The countdown numeral becomes text.primary (neutral.12); the 4 px window bar and the primary button stay accent.11. Re-measure coverage. Check: home coverage below the old 5.64 percent.
1.2 Phone budget 7 percent (was 8), panel 2 percent. Update tokens.json coverageBudget and every place the page states the budget. Check: every measured screen at or below its budget.
1.3 Görevli ink #3A3CA2 (H 276) sits inside the measured blue family and near Var navy. Move Görevli to a violet with hue between 300 and 320, contrast at least 4.5:1 on its chip and on white, and re-run the CVD distances. Belgeli düzeltme ink #653749 reads as negative: make it a neutral ink (neutral.11 or neutral.12) with its document icon. Devamdan muaf keeps gray and gets a dashed border (graft from C). Check: tcheck PASS, no status ink in the hue range 220 to 290 except Var and accent roles, CVD table updated on the page.
1.4 Add the Röntgen (X-ray) toggle from direction B: one switch that grays every non midnight blue pixel on all phone screens and on the panel screen (for example a CSS filter or a data attribute that swaps every non-accent token to gray), with numbered callouts on what remains and a measured budget bar under each screen. Check: interact test toggles it on and off with the keyboard; the measured shares under each screen come from coverage.json.
1.5 Add the "Bir ders boyunca gece mavisi" timeline (graft from C): instructor phone, student phone and panel across one lesson (for example 09:00 to 09:50), showing when each ink role appears (window opens, primary action, success stamp, selection on the panel). Drawn with A's roles, sharp, small.
1.6 Pure white: warning.onSolid, danger.onSolid and text.onDanger use neutral.1 #FEFEFF. The QR (modules #000000 on #FFFFFF with a four-module quiet zone) is the single documented functional exception; state that on the page.

## 2. Motion
2.1 Hover and press color transitions from 70 ms to 120 ms on hover enter, 100 ms on hover exit; press scale 0.97 at 100 ms; keyboard focus ring 0 ms. Update the duration tokens, the pattern table and the CSS. Check: rulecheck PASS; motion audit withMotion equals interactive.
2.2 Success moment: the receipt must not appear as an empty white box mid-animation. Replace the receipt table with B's receipt timeline (Telefonda kayıtlı with time, Sunucuya ulaştı with time, Sunucu kararı Var with time; small accent.11 square nodes on a 2 px line; hollow pending nodes and "bekliyor" when offline) and bring each step in with its content. Remove the dead band of about 170 px above "Tamam". Keep the 400 ms square and tick draw as the one signature moment. Check: frames at 60, 150 and 300 ms show no empty frame.
2.3 Add a page-wide "Hareketi azalt önizlemesi" switch next to the 4x slow-motion switch (graft from B). Check: with it on, the page behaves as under prefers-reduced-motion.

## 3. Statuses, warnings, copy
3.1 Panel "Son durum" column: only names from brief.md section 4 (Var, Yok, Görevli, Belgeli düzeltme, Elle eklendi, Devamdan muaf). Remove "Karar bekleniyor" and "Onayını bekliyor"; leave the cell empty until a final state exists.
3.2 Exception-first chips in dense tables (graft from B): only Yok and Ret get a rose subtle background (red family, hue 0 to 30, never orange), red ink kept; Var stays white. Re-run contrast.
3.3 Warning level 4 ("Hakkını aştın. Kesin durum AKSİS'te ilan edilir.") is the only filled red banner; levels 1 to 3 stay as ink with their icons. Levels 3 and 4 must look different.
3.4 Replace the tiny rights meter squares (about 7 px) with a labelled meter ("Düzey 2/4") at 8 px or more, or with plain text, so it cannot be read as remaining hak units.
3.5 Backup code: one term everywhere, "Yedek kod" (student: "Yedek kodu gir"; instructor: "Yedek kod").
3.6 Remove developer copy from screens: "Kamera ana (1x) kamerayla açılır" leaves the student scan screen (it stays in the spec text). Use user copy, for example the time left in the window and "Tahtadaki QR'ı çerçevenin içine al".
3.7 Sorun bildir: visible radio marks on the reason rows; correct copy: the student may report within 3 days (for example "Dersten sonraki 3 gün içinde bildirebilirsin. Bildirim hocanın listesine düşer."). Check the rule in brief.md (Ö6) and plan.html#kararlar before writing.
3.8 Time ranges use "ile": "10:00 ile 11:50", never a hyphen between times.
3.9 Offline band (graft from B): light neutral.3 band with the cloud_off icon, text at least 4.5:1, never the dark inverse band; when a sheet opens, the scrim dims it too.
3.10 Offline copy (graft from C): "İnternet gelince kendiliğinden gönderilir. Uygulamayı kapatabilirsin."
3.11 Add the brief states nobody drew, in a compact "Durum metinleri" block (component level, not new screens): "bağlantı bekleniyor" (projector page), "Kayıtların bir kısmı henüz gelmemiş olabilir" (panel note), "onay bekliyor", "Bluetooth yok", "konum yok", "Sen değilsen Oturumlarım ekranından kapat". Use the exact words of brief.md section 4.
3.12 Live Turkish casing demo (graft from C): toLocaleUpperCase('tr-TR') giving "İSTANBUL ILIK IĞDIR" next to plain toUpperCase(); computed by the page's script, not typed.

## 4. Panel screen
4.1 Sort: the header "Ad soyad ↑" must sort rows by Turkish collation (Intl.Collator('tr')); rows in the static markup already in that order. "Ad soyad" in sentence case.
4.2 Checkbox hit area at least 24 by 24 px in table rows (graft from B); re-run the hit test.
4.3 Totals add up: KPI tiles and the row statuses agree with one stated number of students.
4.4 Responsive at 390 px (graft from B): sidebar collapses to a top bar, KPI tiles wrap to two columns, search and filter stack, only the table scrolls inside its own container.

## 5. Scan screen
5.1 Replace the tilted gray rectangles with a believable camera scene drawn in CSS or SVG (graft from C: a dark blurred room, a lit board, the QR in perspective), still 0 percent midnight blue, no photos, no network.

## 6. Turn the specimen into the design document tasarim.html
6.1 Output name: the build writes variants/A2/tasarim.html (keep specimen.html as an alias or stop writing it). <title>İÜ Yoklama · Tasarım</title>, <html lang="tr">, CRLF line endings.
6.2 Header in the style of plan.html: h1 "İÜ Yoklama"; lead "Uygulamanın ve web panelinin görünüşü: renk, yazı, biçim, hareket ve bileşenler."; meta line "Tasarım kararları · Son güncelleme 6 Ekim 2026 · Plan: <a href="plan.html">plan.html</a> · Teknik ayrıntılar: <a href="teknik.html">teknik.html</a>"; a second meta line with the placement rule: "Bu dosya görünüş ve etkileşim kararlarını ve bunları kuran kütüphaneleri gerekçeleriyle anlatır; ürün kararları plan.html'de, teknik ayrıntılar teknik.html'dedir. Her bilgi tek yerde durur, öbür dosya bağlantı verir. R ve L ile başlayan kimlikler depo dışındaki tasarım araştırmasına aittir."
6.3 Navigation: every section plus "Plan" (plan.html) and "Teknik" (teknik.html) at the end.
6.4 Include hook: the build reads HTML fragments from ../../doc/sections/ when present and inserts them at these places, replacing the text "{{no}}" in each fragment with the section's number in the navigation order:
   - ozet.html (id "ozet", title "Özet") first, before "Gece mavisi nerede";
   - ilkeler.html (id "ilkeler") right after ozet;
   - erisilebilirlik.html (id "erisilebilirlik") after the components and layers sections;
   - platform.html (id "platform") replaces A's own platform section;
   - kutuphaneler.html (id "kutuphaneler") after platform;
   - acik.html (id "acik", title "Açık noktalar") before sources;
   - kaynaklar.html (id "kaynaklar") replaces A's own sources section.
   A missing fragment leaves A's own section (or nothing) in place, so the build never breaks. Fragments are written by other agents at the same time; do not edit them.
6.5 Anything plan.html or teknik.html already decides is linked, not restated (for example the WCAG 2.2 AA decision lives in plan.html#hoca; the stack in teknik.html#telefon and teknik.html#panel-cati).

## 7. Gates (all must pass on variants/A2/tasarim.html)
- node ../../tcheck.js tokens.json --css tokens.css --table contrast.html: PASS
- node ../../dgate.js tasarim.html --repo C:\Users\USER\Desktop\iu_attendance: PASS (no dashes, no banned colors, plan.html and teknik.html links resolve, radius ok, no external dependency)
- node ../../shot.js tasarim.html <out> --widths 390,1440 --sections --reduced --hover "<3 button selectors>" --elements "<one selector per phone screen and the panel>": zero errors, no horizontal overflow, withMotion equals interactive, maxRadius 0, every hover probe changed, every screen within its coverage budget, "yasak" 0 percent on every element shot.
- tools/rulecheck.js and tools/interact.js: PASS (extend interact.js for the Röntgen toggle, the reduced-motion preview switch, the receipt timeline replay and the Turkish sort).
- Open your own screenshots and fix every visual flaw before you finish.
