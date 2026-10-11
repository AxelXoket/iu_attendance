# Critic B2: rubric, traceability, readability

Document: iu-yoklama-ozet.html (29 Eylul 2026 draft). Rubric: rubric.md (frozen). Input: faculty-notes.md. Prior critic: critic-B.md.
Deterministic checks: scratchpad/critic_b2_check.py (read-only against the HTML).

Measured:
- Main body (outside `<details>`): 2,523 words. Appendices: 2,123 words.
- Section words: Tek bakista 101, 1 Kararlar 341, 2 Akis 164, 3 Hile 80, 4 Mevzuat 201, 5 KVKK 265, 6 Kapsam 464, 7 Takvim 239, 8 Olcutler 186, 9 Sorular 447.
- U+2014: 0. U+2013: 0.
- Grep over the whole file: "tarih aralig" 0 hits, "yil/donem" 0 hits, "registration" 0 hits, "D-U-N-S" 0 hits.
- Float claim in section 4 re-run: `floor(T*(1-80/100))` vs integer form gives 39 mismatches for T=1..199 (T=5,10,15,...), 0 at p=60/70/75. Claim is TRUE, but the formula the document prints (`T - ceil(T*p/100)`) gives 0 mismatches even in float, so the text does not name the formula that actually breaks.
- Data volume: 50,000 students x 1 session/week x 28 weeks = 1.4M, not 8.4M. 8.4M needs 168 sessions per student per year (for example 6 courses x 28 weeks). 4.2 GB / 8.4M = 500 bytes per record (consistent).

## VERDICT: FAIL

Rubric: 4 PASS (2, 4, 7, 10), 6 FAIL (1, 3, 5, 6, 8, 9). Traceability gaps exist (date-range report missing, AKSIS export change not stated plainly, instructor-approval change unexplained).

## 1. Rubric items

| # | Result | Reason |
|---|---|---|
| 1 | FAIL | Rows with no second choice: Oturum anahtari (points to Ek A, which gives design alternatives but no dates), Yedekleme, Listeyle eslesme, Cihaz ("Sonra" is not a 2nd choice), Excel/PDF (pdfmake/Puppeteer only in Ek A), Bildirim. Rejected with no reason anywhere in the document: Capacitor, Flutter web (research/01 has both: Capacitor 8.5.2 2026-09-11, Appflow sunset 2027-12-31; Flutter web canvas rendering weak for tables, print, find). Undated winners: Fastify 5, Better Auth 1.7, drizzle (research/01: 0.45.3, 2026-09-21), SheetJS 0.20.3 (no date), PostgreSQL (no version), React. Ek E links release pages but a release page link is not a dated claim. |
| 2 | PASS (weak) | All seven cases stated: late sync (steps 5-6), never sync (edge row), dead battery / no phone (edge row), instructor device offline (14-day key design) and missing (edge row), clock manipulation (student: Onlenir + Ek C; instructor: edge row), photographed QR (Isaretlenir card). Residual gaps listed as findings: dead battery AFTER scanning reboots the phone and the record is flagged (card 2) but the "Sarj bitti" row does not say so; instructor clock row says "sinanir" without saying what the outcome is (reject, flag, or accept with offset); no row for an instructor device that has not been online for 14 days. |
| 3 | FAIL | The rotating 6-digit backup code (20-30 s, no camera needed) relayed by message is in none of the three lists, and no delay rule is stated for code entries. That is the cheapest remote attack in the design. Also, a QR photo relayed faster than the 8-10 s threshold passes unflagged, but the card reads as if every WhatsApp relay is flagged. The "better than paper" bar exists only as a chip and a parenthesis; one sentence stating what paper allows (anyone signs any name, unlimited) would make the comparison explicit. |
| 4 | PASS | No AKSIS/SSO dependency; Google sign-in is "isteğe bağlı" and in Sonra. Import headers are column-level in Ek C with S2 asking for a real file. Export is "toplam, yüzde, DEVAMLI/DEVAMSIZ" with S3 open. Weak spot: export no longer lists the identifying columns (ogrenci no, ad) or the haftalik matris that the md draft had. |
| 5 | FAIL | "Tarih aralığına göre rapor alınabilmelidir" is not mapped anywhere (0 hits). "Yoklama kayıtları yıl/dönem bazlı saklanmalıdır" not named. The faculty "registration" step has no row. See section 3. |
| 6 | FAIL (narrow) | Additions list covers roles, calendar, sections, device binding, retention, recovery. Missing from it: the head-count duty (a new per-class instructor task), instructor approval of every device change (new duty), the "muaf" field (only in section 4), theory/practice split (only in a row note), the unlisted-student join request (only Ek C), the web panel itself (only implied by "Ayrı hoca uygulaması: Elendi"; the rubric names it explicitly). |
| 7 | PASS | Controller IU, legal basis Md.5(2)(ç) with the "yardımcı" dependency flagged, retention for both official and helper cases, hosting in Turkey, cross-border decided "no" with S15. Minor: "Hesap silme ... yasal kayıt kalır" should say "kayıt kalır (resmi sayılırsa 10 yıl, yardımcı sayılırsa itiraz süresi sonuna kadar)". |
| 8 | FAIL (narrow) | Account type, cost, review risks are concrete. The timeline is gone: critic-B asked to re-anchor the store timeline to Bahar; the draft deleted it instead. research/09 section 4 has one (Play live about 4.5 weeks after first build on a personal account, iOS 2 to 4 weeks, org accounts 1 to 3 weeks after IU grants access). Also contradictory path: section 7 says "iOS'ta Unlisted dağıtım" and then plans TestFlight rebuilds every 90 days; which one does the pilot use? |
| 9 | FAIL | Section 8 is per area, not per feature. MVP features with no outcome: ders saati bildirimi ("Değişerek" MVP), roller/asistan, ders silme = arsiv, donem kilidi, hesap kurtarma, erisilebilirlik, blok ders/sube. "Çökmesiz oturum en az %99,5" cannot be measured when section 1 forbids crash SDKs and no other source is named. |
| 10 | PASS | S1 to S17 and S-A to S-D each have "neden" and "varsayılan". Gap: the escalation "must results be typed into AKSIS by hand before the Md.19 deadline" (Ek B, 04) and "Apple fee waiver" (Ek B, 09) are not in the S-list; S3 asks only the screen format. |

## 2. critic-B findings (my enumeration of 16: 9 rubric notes, 7 traceability gaps)

| # | critic-B finding | Status | Note |
|---|---|---|---|
| 1 | R1 dates, 2nd, rejected | PARTLY | Links and some dates added (Ek C, Ek E). Rows still lack 2nd; Capacitor, Flutter web unexplained; several winners undated. |
| 2 | R2 never sync, lost phone, instructor device, instructor clock | FIXED | Edge table added. New residuals in finding 13, 15, 16. |
| 3 | R3 WhatsApp contradiction, backup-code relay, rooted client, threshold | PARTLY | WhatsApp now "not counted until approved" (consistent with S9); root in Onlenemez; threshold 8-10 s. Backup-code relay still missing. |
| 4 | R4 Google login wording | FIXED | "2.: Google ile giriş, isteğe bağlı". |
| 5 | R6 additions (retention, recovery, web panel, head count, Sonra mixing) | PARTLY | Retention and recovery added. Web panel and head count still absent from the additions list. |
| 6 | R7 legal basis/retention for helper default | FIXED | Both retention cases; legal-basis question flagged. |
| 7 | R8 anchor timeline to Bahar | NOT FIXED | Timeline removed, not re-anchored. |
| 8 | R9 feature-metric mapping | PARTLY | Metrics expanded (import, device change, backup code, accuracy, deletion); not per feature; several features still without outcome. |
| 9 | R10 "why" for most questions, owner defaults | FIXED | Every row has both. |
| 10 | Gap 1 "keep it simple" | PARTLY | Row "Uyuldu" and the per-class note exist, but omit "bring and project your own device" and the device-change approvals. |
| 11 | Gap 2 delete = archive | FIXED | "Yoklaması olan ders silinmez, arşivlenir." |
| 12 | Gap 3 registration | PARTLY | Section 2 "Önceden" covers registration; no row for the faculty bullet; unregistered student in the first basement class not handled. |
| 13 | Gap 4 notification fires on schedule | FIXED | "Değişerek" row states it. |
| 14 | Gap 5 raporlu/izinli, what instructor does | FIXED | "mazeretli" label, no reason stored, counts absent, S5. |
| 15 | Gap 6 threshold depends on sync | FIXED | "Senkrondan sonra telefonda hesaplanır". |
| 16 | Gap 7 escalations surfaced | PARTLY | Ek B verbatim (good). "Typed into AKSIS by hand before deadline" and Apple fee waiver not in the S-list. |

Also from critic-B sections 3 to 5: hidden online deps FIXED (section 2 "Önceden, internet varken"; shared PC holds no key). Long decision-table cells FIXED (section 8 cells still 21 to 34 words). Jargon PARTLY (glossary added, about 40 body terms still unglossed). Scratchpad path NOT FIXED (still in Ek E). Flutter consequence FIXED. QR size marked as planning number FIXED. max(3,%5) wording FIXED. Cost number PARTLY (numbers given, data-volume premise wrong).

## 3. Traceability, every faculty and owner bullet

| Faculty/owner bullet | Doc decision | Where | OK? |
|---|---|---|---|
| AKSIS login problematic, no AKSIS dependency | No integration | chip, S14 | OK |
| Ogretim uyesi kendi tanimlasin | MVP, but instructor accounts need bolum yoneticisi approval | 1 Giris, 6 Roller | GAP: change from "kendi tanımlasın" not explained (reason: stop a student registering as instructor) |
| Ogrenci kendi giris yapsin | MVP, e-mail code | 1 Giris, 2 | OK |
| Verdigi dersleri goruntuleme | MVP | 6 row 1 | OK |
| Ders olusturma/duzenleme | MVP | 6 row 1 | OK |
| Ders silme | MVP as archive | 6 row 2 | OK |
| Gun, saat, sinif | MVP, sessions auto-generated | 6 row 1 | OK |
| Kayitli ogrencileri goruntuleme | MVP | 6 row 3 | OK |
| Liste bazli ekle/sil, CSV/Excel | MVP, diff + soft removal | 6 row 3 | OK |
| Yoklama baslatma | MVP | 6 row 4 | OK |
| Belirli sure acik | MVP | 6 row 4 | OK |
| Mobil uygulamadan katilim | MVP | 6 row 5 | OK |
| Tarih ve saat kaydi | MVP | 6 row 5 | OK |
| Tek katilim | MVP | 6 row 5 | OK (how duplicates resolve offline not stated; acceptable) |
| Otomatik kapanma | MVP | 6 row 4 | OK |
| Elle kapatma | MVP | 6 row 4 | OK |
| Basit tutulsun | "Uyuldu" | 6 last row, 2 note | GAP: omits "bring own device to projector" and device-change approvals |
| Yerine imza atanlar (paper bar) | chip "kâğıt imzadan iyi" | chip, 3 | Weak (see R3) |
| QR | MVP | 6 | OK |
| PIN/kod | Yedek, rotating | 6 | OK, change explained |
| Konum | Elendi | 6 | OK, reason given |
| QR + konum | Elendi | 6 | OK |
| Farkli yontem | Sonra: BLE, NFC | 6 | OK |
| Yil/donem bazli saklama | implied by "Takvim: dönem" and donem kilidi | 6 additions | GAP: not named |
| Ogrencinin katildigi dersler | "öğrencinin geçmişi" | 6 | Weak: who sees it (student app? instructor across courses?) not stated |
| Hoca ders bazinda liste | "Kayıtlar" | 6 | OK |
| Toplam katilim hesabi | "toplamlar" | 6, 4 | OK |
| Elle duzeltme | MVP, reason code | 6 | OK |
| Raporlu/izinli | Açık soru, default absent | 6, S5 | OK, change explained |
| Kim, ne zaman | MVP | 6 | OK |
| Ders bazinda rapor | "Raporlar" | 6 | OK |
| Ogrenci bazinda devam | "öğrencinin geçmişi" | 6 | Weak |
| Tarih araligina gore rapor | nothing | none | GAP: silently dropped |
| Excel/PDF | MVP | 6, 1 | OK |
| Yoklama basladi bildirimi | Değişerek | 6 | OK, change explained |
| Kapanmadan hatirlatma | Sonra, push | 6 | GAP (reason incomplete): push also cannot reach a phone that has no internet in the basement; say it |
| Devam esigi bildirimi | MVP after sync | 6, 4 | OK |
| AKSIS'ten indir, yukle | MVP | 6 | OK |
| "Registration" ile kaydolma | Section 2 "Önceden" | 2 | GAP: no row; first-class-unregistered case missing |
| Donem sonu AKSIS'e aktarma | MVP | 6 | GAP (change not plain): what ships is a page the instructor reads and types into AKSIS by hand; the row says "Dosya üzerinden yapılır", which a professor will read as file upload into AKSIS |
| Owner: konum kullanilamaz | Elendi | 6 | OK |
| Owner: alt katlarda internet yok | core design | chip, 2 | OK |
| Owner: AKSIS entegrasyonu yok | chip | chip | OK |

## 4. Readability

Length: 2,523 words in the main body is still long for "destan gibi olmayan". Target: at most 2,100 words AFTER adding the missing items (store timeline, backup-code relay, date-range report, AKSIS manual entry). Cuts that lose no decision:
- Push/foreign transfer is stated 6 times (Tek bakista Veri, 1 Bildirim, 5 Barindirma, 6 row, 6 Sonra list, S15). Keep 1 Bildirim + S15. About 40 words.
- Tek bakista "Veri" bullet repeats 1 Barindirma and 5. Merge into one clause. About 20.
- 6 "Notlarda olmayanlar > Elendi" (7 items, about 90 words): move to Ek C, keep one line "Diğer elenenler: ses, biyometri, Wi-Fi, NFC kart, IMEI, BLE toplama (nedenler Ek C)". About 70.
- 6 "Rakipler" note: one line. About 25.
- 5 KVKK: move the yurtdisi procedure (standart sozlesme, noter, 5 is gunu, Md.9(7)) and imha cadence (6 ay, 3 yil, 30 gun) and the 72 saat/arka kapi line to an appendix; decision stays "yurtdışı yok". About 70.
- 4 Mevzuat: drop the klinik ders line (pilot is one department) or mark Sonra; shrink the 39-values paragraph to one sentence with the named bad formula. About 50.
- 7: move "Dağıtımda dikkat edilecekler" (API 36, 5.2.1, demo account) to Ek C; spend 40 of the saved words on the timeline. Net about 30.
- 1 Yedekleme row: operational, move to Ek C or shorten to "Her gece yedek, dönemde bir geri yükleme testi (S14)". About 15.
Total about 320 cut, about 100 added: about 2,300 to 2,100 depending on how hard section 9 "Neden" cells are trimmed.

Contradictions between sections:
- Head count is optional (2 step 4, per-class note) yet section 3 relies on it as a defense and section 8 measures "Kafa sayısıyla fark en fazla %5". Decide: mandatory during pilot, or say the check is skipped when no count is entered.
- 2 step 6 counts valid records as "var" within 7 days; step 7 flags the whole lesson on day 7. What happens to records already counted and warnings already sent? Unstated.
- 5 "donanım kimliği tutulmaz" vs "IDFV / ANDROID_ID tuzlu özeti". A faculty reader sees a contradiction; add "(uygulamaya özel, cihazın donanım numarası değil)".
- 7 "iOS'ta Unlisted dağıtım" vs TestFlight 90-day rebuild plan.
- 8 crash metric vs 1 no crash SDK.
- 4 printed formula vs "Ondalıklı hesap" warning (see measured section).

Unclear Turkish or wrong register:
- "Kayıtlar kafa sayısını 3 kişiden ve %5'ten fazla aşarsa": write "hem 3 kişiden hem %5'ten fazla aşarsa".
- "SheetJS 0.20.3 (CDN)": reads as loading a script from a CDN at runtime (itself a third-party transfer). Write "SheetJS'in kendi sitesindeki paketten kurulur, npm'den değil".
- "Kritik yol": project-management jargon; "Takvimi belirleyen dört ön koşul".
- "Başvurular bu hafta yapılmalı": relative date in a dated document; "2 Ekim 2026'ya kadar".
- "Rakipler" for other universities: "Diğer üniversiteler".
- First person and owner-directed voice in a document the faculty may read: "bunu script ile doğruladım", "Ek A ... seçimim", "Ek B · Ajanların sana ilettiği", "Sana" heading, "3 bağımsız eleştirmen turu". Either mark the doc as owner-only or use "Geliştiriciye" and passive voice.
- Ek A labels sources as "03", "10", "07" with no legend; "01" is never named anywhere. Add one line mapping numbers to report titles.
- Ek E ends with a path in the session scratchpad; that directory is temporary. Either copy research/ into the repo docs or drop the sentence.

Jargon in the main body not in Ek D (from the script): senkron, BİDB, ULAKBİM, EAS, TestFlight, SMTP (rölesi), IDFV/ANDROID_ID, App Attest, Play Integrity, NFC, Güvenli Klasör, root, emülatör, kafa sayısı, şube, blok ders, CDN, CVE, SDK, monorepo, pg_dump, Docker Compose, UBYS, AUZEF, passkey, IMEI, "tuzlu özet". Ek D glosses EBYS and BaaS, which the main body never uses. Add about 12 glosses (senkron, BİDB, ULAKBİM, EAS, TestFlight, SMTP rölesi, App Attest/Play Integrity, NFC, Güvenli Klasör, root/emülatör, kafa sayısı, tuzlu özet); drop EBYS.

Cells over 20 words: all in section 8 (26, 24, 21, 34, 31 words). Split "Veri işleri" (34) and "Benimsenme" (31) into two rows each, or turn section 8 into a feature | ölçüt | hedef table, which also fixes R9.

Uncited claims in the body: "Basında QR yoklama fişleme olarak eleştirildi" (research/04 cites Sözcü, April 2025; not in Ek E); UBYS Mobil 2,1 puan (App Store link in research/04; not in Ek E). Apple "~650 TL" (INFERENCE: 99 USD at 2026 rates is several thousand TL; the figure looks stale; source it or delete). Play org exemption marked "doğrulanmadı" while research/09 line 15 marks it CONFIRMED and Ek E's own Play link is titled "yeni kişisel hesap test şartı".

## 5. Style

- U+2014 and U+2013: 0. PASS.
- English banned list: 0 (existing check_html.py). PASS.
- Turkish soft filler: "Kritik yol", "Temel erişilebilirlik" (say what "temel" means: ekran okuyucu etiketleri, yeterli kontrast). Minor.
- Tone is direct. No padding sentences found.

## 6. Findings, most severe first

1. R3: rotating backup code relayed by message (20-30 s window, no camera) is in no fraud list and has no stated delay rule. Also QR relays faster than 8-10 s pass unflagged. Fix: add both to section 3 with the rule that applies (or to "Önlenemez"), plus a pilot trigger "yedek kod oranı %5'i geçen ders işaretlenir".
2. R5: "Tarih aralığına göre rapor" silently dropped (0 hits). Fix: add to the "Raporlar" row: "Tarih aralığı seçilerek, MVP". Name "yıl/dönem bazlı saklama" in the Kayıtlar row.
3. Traceability: "AKSİS'e aktarma" is MVP in name only; the instructor types results by hand. Fix row note: "AKSİS'e otomatik aktarım yok; hoca bu sayfadan bakarak elle girer." Add to S3 the escalation "elle giriş Md.19 ilan tarihinden önce mi yapılmalı?"
4. Hidden per-class duty: shared classroom PC holds no key, so the instructor must bring and project own device; every student device change also needs instructor approval. Neither is in "Hocanın her dersteki işi" nor in "Basit tutulsun: Uyuldu". Fix: add both, and one line on why it is still less work than paper.
5. R1: rows without 2nd (Oturum anahtarı, Yedekleme, Listeyle eşleşme, Cihaz, Excel/PDF, Bildirim); Capacitor and Flutter web rejected with no reason; Fastify 5, Better Auth 1.7, drizzle, SheetJS 0.20.3, PostgreSQL undated. Fix: copy dates and reasons from research/01, 02, 07, 08 into Ek C, one line per option.
6. R8: store timeline removed instead of re-anchored; Unlisted vs TestFlight path unclear. Fix: 3 dated lines from research/09 section 4 anchored to 25 Ocak 2027, and name the pilot's iOS path.
7. R9: metrics not tied per feature; ders saati bildirimi, roller, arşiv, dönem kilidi, hesap kurtarma, erişilebilirlik have none; crash metric unmeasurable under the no-SDK rule. Fix: feature | ölçüt | hedef table; name the crash source (Play Console / App Store Connect) or drop it.
8. R6: additions list misses head count, instructor-approved device change, muaf field, theory/practice split, join request, web panel. Fix: one "MVP ek" line each.
9. Traceability: faculty said "Öğretim üyesi kendi tanımlasın"; doc adds bölüm yöneticisi approval with no reason. Fix: one clause of reason in the Giriş row.
10. Traceability: "Kapanmadan hatırlatma: Sonra, push" omits that push cannot reach an offline phone anyway. Fix: add "İnternetsiz telefona push da ulaşmaz".
11. Registration: no row for the faculty's "registration" bullet; no answer for a student who first shows up unregistered in a basement class. Fix: edge row "Kayıtsız öğrenci: okutamaz, hoca elle ekler; sonra kaydolunca eşleşir".
12. Head-count semantics: optional count vs defense and metric; retroactive day-7 flag on records already counted and warnings already sent. Fix: decide mandatory-in-pilot and state what day-7 flagging does to counted records.
13. Dead battery after scan: reboot flags the record (card 2), but the "Şarj bitti" row says only "Hoca elle ekler". Fix: add the after-scan case; it also pressures the 98% unflagged target.
14. Data volume premise wrong: 50k x 1/week x 28 = 1.4M, not 8.4M. Fix: "öğrenci başına haftada 6 ders oturumu, 28 hafta".
15. Instructor clock row: "QR zamanı ders programıyla sınanır" does not say the outcome. Fix: state reject, flag, or accept with measured offset.
16. No row for an instructor device offline more than 14 days (keys expired, Başlat in the basement fails). Fix: edge row with the fallback (paper, enter later).
17. Section 4 names "Ondalıklı hesap" but not the formula that breaks; the printed formula is safe in float. Fix: "floor(T x (1 - p/100)) kullanılmaz; tam sayıyla T - (T x p + 99) div 100". Claim itself verified (39 mismatches, all at %80).
18. "donanım kimliği tutulmaz" vs IDFV/ANDROID_ID hash reads as a contradiction. Fix: "(uygulamaya özel kimlik, donanım numarası değil)".
19. Jargon: about 25 body terms unglossed; glossary has unused EBYS/BaaS; "SheetJS (CDN)" misreads as runtime CDN. Fix: add 12 glosses listed in section 4; reword CDN.
20. Owner-facing voice and dead references in a faculty-readable doc: "doğruladım", "seçimim", "Sana", "Ajanların"; Ek A numbers with no legend; scratchpad path in Ek E. Fix: passive voice or "Geliştiriciye"; add a numbers legend; move research into the repo or drop the path.
21. Length 2,523 words; push/foreign transfer repeated 6 times. Fix: apply the cuts in section 4, target at most 2,100 including the additions above.
22. Uncited or stale: "fişleme" press, UBYS 2,1, Apple ~650 TL, Play org exemption "doğrulanmadı" (research says CONFIRMED). Fix: add the two sources to Ek E, drop the TL figure, write "kurum hesabı muaf".
23. Minor wording: "3 kişiden ve %5'ten" -> "hem ... hem"; "Kritik yol"; "bu hafta" -> "2 Ekim 2026'ya kadar"; "Rakipler" -> "Diğer üniversiteler"; section 8 cells over 20 words.
