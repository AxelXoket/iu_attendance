# Critic B3: rubric, traceability, readability

Document: iu-yoklama-ozet.html (29 Eylul 2026). Rubric: rubric.md (frozen). Input: faculty-notes.md. Prior: critic-B.md, critic-B2.md.
Deterministic checks (read-only): scratchpad/critic_b3_check.py, scratchpad/critic_b3_dump.py (text dumps _b3_body.txt, _b3_app.txt).

Measured:
- Main body (outside `<details>`): 2,527 words (B2 measured 2,523; the revision added items and cut about as much). Sections: ozet 99, kararlar 343, akis 249, hile 131, mevzuat 237, kvkk 184, kapsam 378, takvim 242, olcut 135, sorular 493.
- U+2014: 0. U+2013: 0. English banned vocabulary: 0.
- Main-body cells over 20 words: 2 (both 21). OK.
- Formula claim re-run: `floor(T*(1-80/100))` in float vs exact gives 39 mismatches for T=1..199 (T=5,10,15,...), T=15 gives 2 (exact 3). Integer form `T - (T*p+99) div 100` exact for T=0..1999, p=0..100. Claim TRUE. (Side note: p=90 also has 19 mismatches; the text only claims 80, so no error.)
- Data volume: 50,000 x 6 x 28 = 8.4M, 4.2 GB / 8.4M = 500 B per record. TRUE (28 weeks is implied, not written).
- Semester 25 Oca to 30 Nis 2027 = 95 days; TestFlight build from ~5 Ocak expires ~5 Nisan, so a ~22 Mart rebuild is correct.
- 2026/347 citation checked against research/05 line 14 and 63: supports "yalniz aydinlatma, ayrica acik riza metni sunulmaz". TRUE.
- AKSIS deadlines 20 Aralik 2026 / 2 Mayis 2027 match research/06 lines 72, 224 (both are Sundays; source is the draft calendar, flagged in the doc).
- Anchors: body links #ek-a, #ek-c, #ek-d, #ek-e, #ek-f all exist.

## VERDICT: FAIL

Rubric: 8 PASS (2, 3, 4, 5, 6, 7, 8, 10; 3, 6 and 8 weak), 2 FAIL (1, 9), both narrow and cheap to fix. Traceability: four faculty-requested behaviours are changed without a stated reason (finding 4). Two internal contradictions (findings 3, 5).

## 1. Rubric items

| # | Result | Reason |
|---|---|---|
| 1 | FAIL (narrow) | Section 1 now has a 2nd for every row and Ek D dates most options (Expo 30.06.2026, Flutter 12.08.2026, Capacitor 11.09.2026, Fastify 16.09.2026, NestJS, Better Auth, Keycloak, drizzle, write-excel-file, PocketBase, WatermelonDB). Still undated: React (winner of "Hoca paneli"; no version or date anywhere in the document; research/01 line 37 has React 19.2 via Expo SDK 57), SheetJS 0.20.3 (winner for import; no date; research/versions3.txt line 20 shows the 0.20.3 build dated 2024-07-19, which means the chosen reader is about 26 months without a release, a fact a reader should see), PostgreSQL ("kurulumda sabitlenir", no version, no date, no link), pdfmake 0.3.11 / Typst 0.15.1 / Puppeteer 25.12 (versions without dates). |
| 2 | PASS | Late sync (2 Sonra), never sync, dead battery after scan, no phone, lost phone, instructor device missing, instructor offline beyond 3-day keys, instructor clock (flag by median), student clock (Onlenir, zaman capasi), forwarded QR (Isaretlenir) and fast live relay (Onlenemez). Only nit: dead battery BEFORE class is covered only implicitly by "Telefonu yok"; write "Telefonu yok, sarji bitmis ya da kayitsiz ogrenci". |
| 3 | PASS (weak) | Bar stated in one sentence ("Kagitta herkes herkesin yerine imza atabiliyor"). Three lists present; backup-code relay and sub-threshold live relay now listed. Weak: the 8-10 s delay threshold is attached to backup-code relay, but the code rotates every 20-30 s, so a legitimate entry can be 0-30 s late; delay cannot separate relay from typing (INFERENCE from Ek C numbers; research/03 line 50 asserts "same scan-lag check" without resolving this). What actually limits code relay is the "2 kez" cap and the %5 course flag; say so. The "2 kez" budget itself is inconsistent (finding 3). |
| 4 | PASS | No AKSIS/SSO dependency; Google sign-in is 2nd and Sonra. Import headers column-level in Ek C; export "liste sirasiyla toplam, yuzde, DEVAMLI/DEVAMSIZ" with S2/S3 open for a real file. Nit: name the identity columns of the AKSIS page (ogrenci no, ad soyad). |
| 5 | PASS | Every faculty bullet maps to a section 6 row (table in section 3 below). Tarih araligi, yil/donem, registration and AKSIS manual entry are now explicit. Reasons for some changes are missing; counted under traceability, not here. |
| 6 | PASS (weak) | Additions list names web panel, roles incl. ortak hoca, donem/tatil/iptal/telafi, sube/blok, muaf, teori/uygulama, Md.35, device binding, kafa sayisi, makbuz, donem kilidi, saklama/imha, hesap silme, erisilebilirlik. "Hesap kurtarma" (named in the rubric) is no longer named anywhere in the body; the mechanism exists (e-posta kodu again + yuz yuze cihaz degisimi + S12) but a reader looking for it cannot find it. |
| 7 | PASS | Controller IU, basis Md.5(2)(c) with the helper-record caveat, retention both cases, hosting in Turkey, cross-border "no" plus S15. Citation 2026/347 verified. |
| 8 | PASS (weak) | Account type (IU org accounts, existing edu.istanbul.mobile / AUZEF), cost (99 USD, 25 USD, Expo), review risks (5.1.1(ix), 3.2, 2.1, 5.2.1, API 36), dated pilot timeline (15 Ara, Ocak basi, 25 Ocak, ~22 Mart). Weak: contradiction between "prerequisites missing, pilot slips to Guz 2027" and "IU account unavailable, iOS falls back to PWA"; no Android fallback; TestFlight first external build needs Beta App Review (research/09 line 55), not mentioned in the timeline. |
| 9 | FAIL (narrow) | Ek F now maps features to outcomes (20 rows), crash source named. One MVP line has no outcome anywhere: "saklama ve imha" (section 6, Notlarda olmayanlar > MVP > Kayit guvencesi). "Makbuz" is measured only in section 8 (Dogruluk), not in Ek F, so the per-feature table is incomplete. |
| 10 | PASS | S1-S17 and G-A-G-D each have why and default. Nit: S17 has a question in the "Neden" cell and no default for the Apple fee waiver (default: pay 99 USD) or logo permission (default: no logo until approved). |

## 2. critic-B2 findings 1-23

| # | Status | Note |
|---|---|---|
| 1 | FIXED | Backup-code relay and sub-threshold relay listed; %5 course flag in Ek C. New residual: delay threshold vs 20-30 s code period (rubric 3 note). |
| 2 | FIXED | "Ders, ogrenci, tarih araligi raporlari"; "Yil/donem kaydi". |
| 3 | FIXED | Row "AKSIS'e aktarma: Elle, otomatik aktarim yok"; S3 asks the Md.19 timing. |
| 4 | FIXED | "Hocanin isi" lists projection, kursu PC approval, device-change approval. Residual: body omits that kursu PC needs internet (Ek C). |
| 5 | PARTLY | Dates and reasons added in Ek D; React, SheetJS, PostgreSQL still undated; pdfmake/Typst/Puppeteer undated. |
| 6 | FIXED | Dated pilot timeline; TestFlight for pilot, Unlisted when scaling. New residual: PWA fallback vs slip. |
| 7 | PARTLY | Ek F per feature; crash source = store consoles. Saklama/imha has no outcome. |
| 8 | PARTLY | Web panel, head count, device change, muaf, teori/uygulama added; join request moved to Sonra (Ek D). "Hesap kurtarma" no longer named. |
| 9 | FIXED | Giris row gives the reason (others registering as instructor; retirees keep @istanbul.edu.tr). |
| 10 | FIXED | "Push da bodrumdaki telefona ulasmaz". |
| 11 | FIXED | Row 1 note and edge row "kayitsiz ogrenci". |
| 12 | FIXED | Head count mandatory in pilot; "Hoca karar verene kadar sayilmis kayitlar degismez". |
| 13 | FIXED | Edge row "Okuttuktan sonra sarj bitti". |
| 14 | FIXED | 6 ders; verified 8.4M. Nit: write "28 hafta". |
| 15 | FIXED | Median-based delay, "ders isaretlenir". Nit: "buyukse" has no number. |
| 16 | FIXED | Edge row "3 gunden uzun sure internetsiz". |
| 17 | FIXED | Bad formula named; claim verified (39, T=15). |
| 18 | FIXED | "Bu, telefonun donanim numarasi degildir." |
| 19 | PARTLY | Ek G glosses 26 terms, EBYS dropped, CDN reworded. Unglossed in body: SDK, push, Sentry, Top Hat, UBYS, div, regresyon testi, script, Genelge 2019/12, "3.2", "risk sirasi". |
| 20 | PARTLY | Passive voice, "Geliştiriciye", Ek A legend, scratchpad path gone. Ek B is untranslated English with agent voice ("I am escalating it to you", "This is a privacy call for you") in a faculty-readable doc; heading says "Arastirma ajanlarinin". |
| 21 | NOT FIXED | 2,527 words, flat vs 2,523. Non-decision text still in body (section 4 below). |
| 22 | FIXED | Sozcu and UBYS in Ek H, TL figure dropped, Play org exemption stated. Nit: "UBYS Mobil'in 2,1 puaninda ... payi var" is an inference from reviews; say "yorumlara gore". |
| 23 | FIXED | "hem ... hem de", "Pilotun on kosullari", "2 Ekim'e kadar", "Diger universiteler"; long cells gone. |

## 3. Traceability

| Faculty/owner bullet | Doc | Where | OK? |
|---|---|---|---|
| AKSIS-free; hoca kendi tanimlasin; ogrenci kendi giris | MVP, bolum yoneticisi approval with reason | chip, 1 Giris, 6 row 1 | OK |
| Verdigi dersleri gorme; olusturma/duzenleme | MVP | 6 row 2 | OK |
| Ders silme | MVP as archive | 6 row 3 | GAP (reason): why archive is not stated (records must be kept for the retention period) |
| Gun, saat, sinif | MVP | 6 row 2 | OK |
| Kayitli ogrencileri gorme | MVP | 6 row 4 | OK |
| Liste bazli ekle/sil, CSV/Excel "otomatik" | MVP, diff shown before applying, removed = pasif | 6 row 4 | GAP (reason): preview step and soft removal are changes from "otomatik ... silinebilmeli"; one clause of why (wrong file must not erase records) missing |
| Baslatma, sure, otomatik/elle kapatma, mobil katilim, tarih-saat, tek katilim | MVP | 6 row 5, 2 | OK (time may be undeterminable; handled in 3 and Ek C) |
| Basit tutulsun | "Uyuldu" | 6 last row | WEAK: new per-class duties (head count every class in pilot, projection of own device, device approvals) are disclosed in 2, but "Uyuldu" overstates it; counting 100-150 heads inside the "en fazla 2 dakika" target is an untested assumption (INFERENCE) |
| Yerine imza (paper bar) | Section 3 sentence | 3 | OK |
| QR; PIN; konum; QR+konum; farkli yontem | MVP; Yedek; Elendi; Elendi; Sonra | 6 | OK, each with reason |
| Yil/donem saklama; ogrencinin dersleri; hoca listesi; toplam | MVP | 6 row "Yil/donem" | OK |
| Elle duzeltme; kim, ne zaman | MVP, sebep kodu | 6 | OK (sebep kodu list not given; nit) |
| Raporlu | Soru, default: not stored | 6, 4, S5 | OK, reason given |
| Izinli | "Gorevli (Md.35)" | 6 | GAP (reason): doc silently equates "izinli" with Md.35 gorevlendirme; say "Yonetmelikte devamsizligi dusuren tek izin Md.35" (research/10 F3) |
| Ders / ogrenci / tarih araligi rapor; Excel/PDF | MVP | 6 | OK |
| Basladi / kapanmadan bildirim | Sonra, reason | 6 | OK |
| Esik bildirimi (%70) | MVP, four levels, after sync | 6, 4 | OK |
| AKSIS'ten indir, yukle; registration; donem sonu AKSIS'e | MVP; MVP; Elle with reason | 6, 2 | OK |
| Owner: konum yok; bodrumda internet yok; AKSIS entegrasyonu yok | Elendi; core; chip | 6, 2, chip | OK |

Escalations (Ek B) are all covered by S1-S17/G-A-G-D or resolved in Ek A, except research/03 "does local OS biometric unlock count as the university processing biometrics": moot because biometric-bound keys are rejected (Ek D), but the doc never says the app uses no biometric unlock. One clause in 5 "Tutulmayacak veriler" closes it.

## 4. Readability and length

Main-body text that is not decision-relevant and can move to an appendix without loss (about 250 words, giving about 2,270):
- 8 Pilot olcutleri repeats Ek F almost row for row (135 words). Keep 3 headline targets (120 sn, senkron %99,5, haksiz men 0) plus the Ek F pointer. About 80.
- 4 formula paragraph ("floor(...) kullanilmaz ... 39 degerinde ... T=15 ... script ... regresyon testi"): implementation detail for the developer. Keep "Hak tam sayiyla hesaplanir (Ek C)". About 45.
- 4 klinik lines (Md.19 "Klinik derslerde ... anabilim dali", Md.20 "Iki kez basarisiz olunan klinik ...") unless the pilot department is clinical. About 20.
- 7 "Veri hacmi (tahmin)" line: the section itself says cost does not drive the decision. About 30.
- 6 "Tarayici ve erisilebilirlik" UBYS anecdote and "Nisantasi'nda kayitlar kaybolmustu": justification, belongs in Ek D Diger universiteler. About 20.
- 1 footnote "Flutter secilirse ..." duplicates Ek D Flutter row. About 15.
- 7 "Olceklenince ... Unlisted ... 3.2": not pilot scope; Ek E. About 17.
- "Rapor devamsizligi dusurmuyor" appears in 4, 6 and S5. Keep 4 and S5. About 12.

Contradictions and ambiguities:
- "2 kez otomatik kabul": section 3 says per student per semester, shared by backup code and anchor-less records; Ek C yedek kod says per student PER COURSE per semester; Ek A and Ek C zaman capasi say per student per semester; S9 says "donemde 2". Budget scope and whether the two share it are undefined.
- 7: "Tamamlanmazsa pilot Guz 2027'ye kayar" (store account is prerequisite 4) vs "IU hesabi kullanilamazsa iOS'ta yedek cozum PWA". Android fallback absent.
- 2 "Hocanin isi": kursu PC approval omits "yalniz internet varsa" (Ek C); in a basement room without internet the PC path does not work.
- Tek bakista: "Karar tarihi: 15 Aralik 2026" does not say what is decided; "Veri sorumlusu IU" sits under "Takvim".
- 3 header "Onlenemez (kagit da onleyemiyor)" contains "Degistirilmis uygulama, emulator ya da root'lu telefon", which has no paper analogue.

Unclear Turkish:
- 4: "Senato, pilot icin ise fakulte kurulu bir yonerge cikarmadikca uygulama yalniz yardimci aractir." Garbled. Write "Senato (pilotta fakulte kurulu) bir yonerge cikarmadikca uygulamanin kaydi yalniz yardimci kayittir."
- 4: "1 hak kaldi": hak is counted in ders saati; say "1 ders saati hak kaldi".
- 2: "risk sirasina gore" with no criterion; say "gecikmesi en yuksek kayittan baslayarak".
- 4: "script", "regresyon testi", "div" in a faculty-readable section.

## 5. Style

U+2014 0, U+2013 0, banned English vocabulary 0, no filler sentences found. PASS.

## 6. Findings, most severe first

1. R1: React (Hoca paneli winner), SheetJS 0.20.3, PostgreSQL have no version/date; pdfmake/Typst/Puppeteer versions undated. Fix: Ek D rows "React 19.2 (Expo SDK 57 ile, 30.06.2026)", "SheetJS 0.20.3, 19.07.2024 (26 aydir yeni surum yok; okuma icin tek secenek)", "PostgreSQL <surum, tarih>", dates for the three PDF tools.
2. R9: "saklama ve imha" is MVP with no measurable outcome; makbuz missing from Ek F. Fix: Ek F rows "Saklama ve imha | suresi dolup silinmemis kayit (testle) | 0" and "Makbuz | makbuzla kanitlanan kayip kayit | 0".
3. Contradiction: "2 kez otomatik kabul" is per student per semester (3, Ek A, S9) vs per student per course (Ek C yedek kod); shared or separate budget unstated. Fix: one rule, written identically in 3, Ek C and S9.
4. Traceability: four changes without reason: ders silme -> arsiv, CSV/Excel "otomatik" -> onizleme + pasiflestirme, izinli -> yalniz Md.35, "Basit tutulsun: Uyuldu" despite new duties. Fix: one clause each; change "Uyuldu" to "Buyuk olcude: yeni is kafa sayisi ve cihaz onayi, pilotta olculur".
5. Contradiction 7: missing store account -> slip to Guz 2027 vs -> iOS PWA fallback; no Android fallback. Fix: "Magaza hesabi disindaki kosullar eksikse pilot kayar; yalniz magaza hesabi eksikse iOS'ta PWA, Android'de <X> ile pilot yapilir".
6. R3 accuracy: 8-10 s delay threshold cannot flag a relayed backup code whose period is 20-30 s (INFERENCE). Fix: in 3 write "Yedek kod gecikmeyle yakalanamaz; dönemde 2 kez siniri ve %5 ders isareti sinirlar."
7. Length: 2,527 words, flat since B2. Move the eight blocks in section 4 (about 250 words): section 8 duplicate of Ek F, formula detail, klinik lines, veri hacmi, UBYS/Nisantasi, Flutter footnote, Unlisted line, repeated rapor sentence.
8. Readability 4: garbled Senato sentence decides the legal status of the record (S16). Fix: sentence in section 4 above.
9. 2 "Hocanin isi": kursu PC approval needs internet (Ek C) but the body omits it. Fix: "(yalniz internet varsa)".
10. R6 weak: "hesap kurtarma" not named. Fix: additions "Hesap: yeniden giris e-posta koduyla, telefon degisimi yuz yuze onayla (S12 kisisel e-posta)".
11. Ek B: untranslated English with agent first person in a faculty-readable doc. Fix: one-line Turkish gloss per item, or label "Gelistirici icin, Ingilizce ozgun metin".
12. Tek bakista: "Karar tarihi" unexplained; "Veri sorumlusu" under "Takvim". Fix: "Pilot karari: 15 Aralik 2026 (on kosullar tamamsa Bahar 2027, degilse Guz 2027)".
13. R8 weak: TestFlight first external build goes through Beta App Review (research/09 line 55); timeline "Ocak basi" does not budget for it. Fix: "Aralik sonu: beta incelemesi".
14. Jargon: SDK, push, Sentry, Top Hat, UBYS, div, regresyon testi, script, Genelge 2019/12, "3.2", "risk sirasi" unglossed. Fix: add to Ek G or reword inline.
15. Minor: dead battery before class not named; "saat sapmasi buyukse" has no number; S17 lacks defaults for fee waiver and logo; "1 hak kaldi" unit; biometric unlock not ruled out in 5; "28 hafta" unstated in veri hacmi.
