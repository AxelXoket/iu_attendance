# Critic B6: rubric, traceability, readability

Document: iu-yoklama-ozet.html (97,446 bytes, 29.09.2026 01:40). Rubric: rubric.md (frozen). Input: faculty-notes.md. Prior: critic-B.md, B2 to B5.
Read-only. New scratchpad files only: critic_b6_dump.py (copy of critic_b5_dump.py), critic_b6_check.py, _b6_body.txt, _b6_app.txt.

Measured (critic_b6_check.py):
- Body outside `<details>`: 3,013 words (B5 measure 2,919, so +94). Appendices 5,086.
- Short read as the guide defines it: Tek bakışta 145 + kararlar 397 + kapsam 452 + sorular 595 = 1,589 words. Guide claim (~1,600) TRUE.
- U+2014: 0. U+2013: 0. English banned vocabulary: 0. Internal anchors: 0 broken.
- Body cells over 20 words: 10 (B5: 8).
- 29.09 to 01.12.2026 = 63 days (9 weeks, TRUE). 20.01.2027 + 90 = 20.04; 10.04.2027 + 90 = 09.07 (TRUE). 20.12.2026 and 02.05.2027 Sundays, 19.12 Saturday (TRUE). 2 Ekim + 6 weeks = 13.11, before 21 Aralık (store-account path fits).
- ZXing / ML Kit: first appears in r5b (not in r4 or r5), so no previous B critic judged it. research/ has no ZXing or ML Kit data-disclosure evidence; it comes only from critic-C5 B2, which cited developers.google.com/ml-kit/android-data-disclosure, googlesamples/mlkit #1076, expo/expo #39449. None of those links is in the document.

## VERDICT: FAIL

Rubric: 8 PASS, 2 FAIL (1 and 3), both narrow. All three B5 BLOCKERs are fixed. No traceability gap. Both new failures come from r5b edits (ZXing) or were missed in earlier rounds (clock row).

## 1. Rubric items

| # | Result | Reason |
|---|---|---|
| 1 | FAIL (narrow) | New decision "Android'de QR, ML Kit yerine ZXing ile çözülür" (section 1, Ek A "QR çözücü", Ek D, Ek E). Winner zxing-cpp has no version, no date, no link. The rejected option's evidence (ML Kit sends diagnostics to Google) has no link either, although C5 supplied three. The 2nd choice is muddled: Ek D says ML Kit "Elendi", Ek A and Ek E say "Olmazsa ML Kit S15'te onaya sunulur", which makes it the conditional 2nd. Same standard B5 used for undated expo-sqlite (BLOCKER). Everything else passes: op-sqlite 2nd dated, expo-sqlite 57.0.3 (11.09.2026), Firebase Auth rejected with the 25.08.2025 date, Next.js 16.3.6 rejected, xlsx 0.18.5 (24.03.2022). |
| 2 | PASS | Late sync (7 gün, late-valid accepted), never sync (receipt QR), dead battery (Android pre-scan anchor within 24 h; iOS "belirlenemeyen", cap), no phone / battery before class (elle ekler), instructor offline (3 iş günü, 5 takvim günü, then kâğıt), instructor clock (10 dk, median), forwarded photo (işaretlenir, eski fotoğraf önlenir). Student clock: outcome derivable from Ek C, but section 3 states it wrongly for iOS (see R3). |
| 3 | FAIL (narrow) | Section 3 lists "Telefonun saatini değiştirmek" under "Önlenir". By Ek C's own rule, shifting the iOS clock breaks the anchor-rate check ("kern.boottime saat değiştirilince kayıyor", "Çapalar tutarsızsa ... belirlenemeyen"), so a relayed QR scanned after a clock shift becomes "belirlenemeyen" and is auto-accepted up to 2 times per course. Same for reboot plus airplane mode before scanning (no anchor in this boot, both platforms). That is "sınırlanır", not "önlenir". The lead "İki istisna var: iletilen yedek kod ... ve değiştirilmiş uygulama" omits this third route. The regression test "iOS'ta saati kaydır ve okut" shows the builder knows the outcome. B5 made the analogous dead-battery misstatement a BLOCKER. |
| 4 | PASS | No AKSİS/SSO dependency. Import headers, encoding, type sniffing, number as text (Ek C). Export columns: list order, teori/uygulama separate, toplam, yüzde, DEVAMLI/DEVAMSIZ. S2/S3 open for real files. |
| 5 | PASS | Every faculty and owner bullet maps to a line (section 3 below). |
| 6 | PASS | "Notlarda olmayan MVP eklemeleri" list, eight groups, hesap kurtarma now explicit. |
| 7 | PASS | Controller İÜ, Md.5(2)(ç) with caveat, retention both cases, Turkey hosting, cross-border list; S15 now asks store-console crash data and ML Kit. Minor residue in finding 3. |
| 8 | PASS | İÜ kurum hesabı, cost, review risks, timeline. B5 finding 4 fixed in Ek E: branches cannot enrol, signing authority, 2 to 6 weeks marked "tahmin" (matches research/09 INFERENCE label). |
| 9 | PASS | Ek F now has "Listeyle eşleşme ≤%5; 0". Every MVP feature has a row or a clear parent row. Minor: "tek katılım" and report generation have no own metric (covered loosely by Doğrulama and Dışa aktarma). |
| 10 | PASS | S1 to S19, G-A to G-C, each with why and default. Ek B now says S1-S19 and G-A..G-C. |

## 2. critic-B5 findings

| # | Status | Note |
|---|---|---|
| 1 BLOCKER dead battery iOS | FIXED | Kenar row splits Android (pre-scan anchor, 24 h) and iOS (belirlenemeyen, cap). |
| 2 BLOCKER local DB 2nd / dates | FIXED | op-sqlite 18.2.5 (20.09.2026) 2nd; expo-sqlite 57.0.3 and drizzle 0.45.3 dated; Firebase Auth rejected. |
| 3 BLOCKER Ek F eşleşme | FIXED | Row added with ≤%5; 0. |
| 4 store account rules | FIXED | Ek E "Kurum hesabı kuralları" (not section 7, but reachable). |
| 5 S15 crash data | FIXED | S15 asks it. Residue: default "İzin yok" vs MVP use of consoles (finding 3). |
| 6 length | NOT FIXED | 2,919 to 3,013. Acceptable under the new short-read design (1,589). MINOR. |
| 7 student PWA status | FIXED | Section 1, Ek A, Ek D all "Elendi"; G-B repurposed; not in Sonraya kalanlar. |
| 8 "3 ders günü" vs "3 gün" | FIXED | "3 iş günü (en fazla 5 takvim günü)" in sections 1, 2, 3, Kenar, Ek A. New ambiguity: weekend keys (finding 5). |
| 9 lead sentence overclaim | PARTLY | "İki istisna" added; third route (forced belirlenemeyen) missing (BLOCKER 2). |
| 10 readability | FIXED | Paper-time location, "yerinden edilmez" rewritten in Ek C, S9 "her öğrenci için", "zaman aralığı" in Ek G, "çekirdek" gone, Ek B S1-S19. New unclear phrase "aynı derslerde" (finding 6). |
| 11 xlsx date, Next.js | FIXED | Both in Ek D. |
| 12 long cells | NOT FIXED | 8 to 10 (S17 36, S3 default 33, Oturum anahtarı 32, izinli 30, AKSİS 27, S14 26). MINOR. |

## 3. Traceability

| Faculty / owner bullet | Doc line | OK? |
|---|---|---|
| AKSİS-free; hoca kendi tanımlasın; öğrenci kendi girsin | chip; 1 Giriş; 6 row 1 | OK |
| Verdiği dersleri görme; oluşturma/düzenleme; gün, saat, sınıf | 6 row 2 | OK |
| Ders silme | 6 Arşiv with reason | OK |
| Kayıtlı öğrenciler; liste bazlı ekle/sil; CSV/Excel | 6 row 4, preview, pasif | OK |
| Başlatma; süre; mobil katılım; tarih-saat; tek katılım | 6 row 5 | OK |
| Otomatik kapanma; elle kapatma | 2 "kendiliğinden kapanır ... elle de kapatabilir" | OK |
| Basit tutulsun; yerine imza | 6 "Büyük ölçüde"; chip; section 3 | OK |
| QR; PIN; konum; QR+konum; farklı yöntem | MVP; Yedek; Elendi; Elendi; Sonra | OK |
| Yıl/dönem; öğrencinin dersleri; hoca listesi; toplam | 6 MVP | OK |
| Elle düzeltme; raporlu/izinli; kim, ne zaman | 6 MVP; Görevli / S5; sebep kodu | OK |
| Ders / öğrenci / tarih aralığı rapor; Excel/PDF | 6 MVP | OK |
| Başladı / kapanmadan bildirim; eşik (%70) | Sonra with reason; MVP four levels | OK |
| AKSİS'ten indir, yükle; registration; dönem sonu AKSİS'e | 6 MVP; MVP; Elle with column spec | OK |
| Owner: konum zor; bodrum internetsiz; geç bağlanan; AKSİS entegrasyonu yok; İÜ'ye özel | Elendi; core design; 7 gün; chip; throughout | OK |

No traceability gap.

## 4. Contradictions, unclear Turkish, jargon

Contradictions:
- Section 3 "Önlenir: Telefonun saatini değiştirmek" vs Ek C iOS anchor rule (BLOCKER 2).
- ML Kit "Elendi" (Ek D) vs "Olmazsa ML Kit S15'te onaya sunulur" (Ek A, Ek E).
- S15 default "İzin yok" vs Ek A "MVP'de mağaza konsolları ... kullanılır" and Ek F "Kararlılık (mağaza konsolları)": the default removes the MVP metric's data source and the document does not say what replaces it.
- Ek C "Saat kaynakları ... tek küçük yerel modül" vs Ek E "planlanan yerel modüle eklenecek ZXing": the same "small" module now also decodes camera frames. Ek C still configures zoom through expo-camera; the document does not say how frames reach zxing-cpp. Inference, not verified here: expo-camera exposes no frame-processor API, so this needs either a custom camera module or a vision-camera frame processor, which is not "küçük" for one person in 9 weeks.

Unclear Turkish:
- "Kâğıt imzanın süresi Güz'ün son haftalarında, aynı derslerde": the pilot runs in Bahar with different courses. Write "pilot hocalarının Güz derslerinde".
- "sonraki 3 iş günü için (en fazla 5 takvim günü)": does the window include a Saturday telafi? "Telafi dersi dahil internetsiz başlatılabilir" suggests yes, "iş günü" suggests no.

Unglossed jargon: MVP (15 times in the body, including Tek bakışta; not in Ek G), SSO (chip), Docker Compose, D-U-N-S, Damm, UTC, ppm, P-256.

Short read: a reader of Tek bakışta + 1 + 6 + 9 learns nothing of what the system does not stop (live relay, friend's phone, modified app). One line in Tek bakışta closes it.

## 5. Style

U+2014 0, U+2013 0, English banned vocabulary 0. PASS.

## 6. Findings, most severe first

1. BLOCKER (R1). QR decoder decision undated and unsourced; ML Kit status mixed. Fix Ek D: add "zxing-cpp | <sürüm, tarih> | Seçildi (Android QR). Ağa bağlanmaz" with GitHub link; change ML Kit row to "2. seçenek, yalnız İÜ onayıyla (S15)" with the Google data-disclosure link; keep "onaysız ML Kit" as rejected. Add the three C5 links to Ek H.
2. BLOCKER (R3, R2). "Telefonun saatini değiştirmek" is not prevented on iOS. Move it to "İşaretlenir veya sınırlanır": "Android'de etkisiz; iOS'ta kayıt 'belirlenemeyen' olur, otomatik kabul sınırına girer." Lead: "İki istisna" becomes three: yedek kod, zamanı belirlenemeyen kayıt (yeniden başlatma, saat kaydırma; ikisi birlikte en fazla 2), değiştirilmiş uygulama.
3. MINOR (R7, privacy, escalate to main session). S15 default "İzin yok" conflicts with MVP crash data from store consoles (Ek A, Ek F). State the default for consoles explicitly and the fallback metric (senkron verisi only) if denied.
4. MINOR (feasibility, inference). Name how camera frames reach zxing-cpp and whether the ML Kit dependency still ships in the APK (expo/expo #39449; Play Data safety form). Adjust "tek küçük yerel modül".
5. MINOR (unclear). Key window: say whether weekend and holiday days inside "3 iş günü" get keys (Saturday telafi).
6. MINOR (unclear). "aynı derslerde" to "pilot hocalarının Güz derslerinde".
7. MINOR (jargon). Add MVP, SSO, Docker Compose, D-U-N-S, Damm, UTC, ppm, P-256 to Ek G, or gloss inline.
8. MINOR (short read). Add to Tek bakışta: "Önlenemeyenler: canlı aktarım, arkadaşının telefonunu getirmek, değiştirilmiş uygulama (Bölüm 3)."
9. MINOR (length, layout). Body 3,013 words, 10 cells over 20 words. Short-read design holds (1,589), so not a failure. Split S17 (36) and S3 default (33) first.
