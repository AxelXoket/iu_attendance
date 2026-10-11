# Critic B7: rubric, traceability, readability

Document: iu-yoklama-ozet.html (101,157 bytes, 29.09.2026 01:50). Rubric: rubric.md (frozen). Input: faculty-notes.md. Prior: critic-B.md, B2 to B6.
Read-only. New scratchpad files only: critic_b7_dump.py, critic_b7_check.py (copies of B6 scripts), critic_b7_extra.py, _b7_body.txt, _b7_app.txt.

Measured (critic_b7_check.py, critic_b7_extra.py):
- Body outside `<details>`: 3,116 words (B6: 3,013). Appendices 5,354.
- Short read (Tek bakışta 159 + kararlar 416 + kapsam 453 + sorular 609) = 1,637. Guide claim (~10 dk) holds.
- U+2014: 0. U+2013: 0. English banned vocabulary: 0. Broken internal anchors: 0.
- Body cells over 20 words: 12 (B6: 10). Longest: S17 36, Oturum anahtarı 35, S3 default 33.
- zxing-cpp v3.1.1: GitHub API published_at 2026-07-29 (matches Ek D "29.07.2026"). Link in Ek H points to the release tag.
- ML Kit data disclosure page (linked in Ek H) confirms data goes to Google over HTTPS for all features.
- TestFlight: 11.03.2027 minus 90 days = 11.12.2026; a December build uploaded before 11 Dec expires before 11 Mar.
- No residue of "3 iş günü", "İki istisna", "aynı derslerde".

## VERDICT: PASS

All 10 rubric items pass, no traceability gap. Both B6 BLOCKERs are fixed. Remaining findings are MINOR.

## 1. Rubric items

| # | Result | Reason |
|---|---|---|
| 1 | PASS | Every section-1 row has winner, 2nd, and rejected options in Ek D with dates or doc links. QR decoder now: zxing-cpp 3.1.1 (29.07.2026, verified) selected; ML Kit 2nd only with İÜ approval, with Google's data-disclosure link. The rejected option (unapproved ML Kit / expo-camera's Android decoder) is stated in section 5 and Ek A/E but has no Ek D "Elendi" row (MINOR 4). |
| 2 | PASS | Late sync (7 gün, late-valid accepted), never sync (receipt QR), dead battery (Android anchor 24 h / iOS belirlenemeyen), no phone (elle ekler), instructor offline (5 takvim günü, then kâğıt), clock (instructor 10 dk + median; student in section 3 and Ek C), forwarded photo (gecikme eşiği; live relay under Önlenemez). |
| 3 | PASS | Bar "kâğıt imzadan iyi" in chip and section 3. Önlenir / İşaretlenir veya sınırlanır / Önlenemez lists now place the clock attack correctly. Lead has three exceptions. Residual summary overclaim (Güvenli Klasör) is MINOR 1 because the list itself is correct. |
| 4 | PASS | No AKSİS/SSO dependency. Import: byte sniffing, UTF-8/cp1254, known headers, number as text. Export: list order, teori/uygulama separate columns, toplam, yüzde, DEVAMLI/DEVAMSIZ. S2/S3 open for real files. |
| 5 | PASS | Every faculty and owner bullet maps (section 3 below). |
| 6 | PASS | "Notlarda olmayan MVP eklemeleri": roles, co-instructor, semester, holidays, telafi, şube, retention, account recovery, web panel, accessibility. |
| 7 | PASS | Controller İÜ; Md.5(2)(ç) with caveat; retention both cases; Turkey hosting; cross-border list with S15. Residue: S15 default silent on Google-hosted mailboxes (MINOR 6). |
| 8 | PASS | İÜ kurum hesabı, 99 USD / 25 USD, review rules (5.1.1(ix), 2.1, 5.2.1, 3.2), timeline (2 Ekim, 2-6 hafta tahmin, 21 Aralık, 90-day TestFlight). Date nit in MINOR 5. |
| 9 | PASS | Ek F covers every MVP group. Loose spots (tek katılım, hesap kurtarma, hoca onayı) are MINOR 8. |
| 10 | PASS | S1-S19 and G-A..G-C, each with why and default. |

## 2. critic-B6 findings

| # | Status | Note |
|---|---|---|
| 1 BLOCKER QR decoder undated | FIXED | zxing-cpp 3.1.1 (29.07.2026) with link; ML Kit "2. seçenek, yalnız İÜ onayıyla"; "Elendi" conflict gone. Residue: no explicit rejected row; C5's expo #39449 and mlkit #1076 not cited. |
| 2 BLOCKER clock "önlenir" | FIXED | Moved to "İşaretlenir veya sınırlanır"; lead now "Üç istisna". Residue: iOS clock shift without reboot not named (MINOR 2). |
| 3 S15 vs consoles | FIXED | Ek A "Mağaza konsollarına dayanılmaz"; Ek F Kararlılık uses own error log; S15 default says so. |
| 4 frames to zxing-cpp | PARTLY | Ek E explains expo-camera exposes no frames, so CameraX module (~1 hafta). Still silent on whether expo-camera (and ML Kit) ships in the Android build. |
| 5 key window weekends | FIXED | "5 takvim günü" in sections 1, 2, 3, Kenar, Ek A. |
| 6 "aynı derslerde" | FIXED | "pilot hocalarının derslerinde". |
| 7 jargon | FIXED | MVP, SSO, Docker Compose, D-U-N-S, Damm, UTC, ppm, P-256 in Ek G (plus HKDF, CameraX). |
| 8 short read | FIXED | "Önlenemeyen" line added; list incomplete (MINOR 1). |
| 9 length / cells | NOT FIXED | 3,013 to 3,116 words; cells 10 to 12; S17 and S3 unsplit. MINOR. |

## 3. Traceability

All bullets map: AKSİS-free + own accounts (chip, 1 Giriş, 6 row 1); view/create/edit + gün/saat/derslik (6 row 2); silme (Arşiv); list view + CSV/Excel add/remove (6 row 4); start, süre, katılım, tarih-saat, tek katılım, kapatma (6 row 5, section 2); basit / yerine imza (Büyük ölçüde, section 3); QR / PIN / konum / QR+konum / farklı (MVP / Yedek / Elendi / Elendi / Sonra); yıl-dönem, öğrenci geçmişi, hoca listesi, toplam (MVP); elle düzeltme + kim/ne zaman (MVP); raporlu/izinli (Görevli MVP, rapor S5); ders/öğrenci/tarih raporları + Excel/PDF (MVP); başladı/kapanmadan (Sonra, reason); eşik %70 (MVP); AKSİS round trip (MVP import, Elle export with columns); owner: konum, bodrum, geç bağlanan, AKSİS entegrasyonu yok, İÜ'ye özel (all covered). "Geçen sefer sorun" is S1. No gap.

## 4. Contradictions, unclear Turkish, jargon

- Tek bakışta "Önlenemeyen" and the section 3 lead omit Güvenli Klasör / second Android profile, which section 3 lists under Önlenemez. First binding needs no face-to-face step, so an absent student can live in a friend's Secure Folder all term without owning a phone in class. The lead's "hile için çoğunlukla telefonu derse getirmek ... gerekiyor" overclaims.
- Section 3 clock line: "Telefon arada yeniden başlatıldıysa kayıt belirlenemeyen olur" names only reboot. Ek C and its regression test "iOS'ta saati kaydır ve okut" say an iOS clock shift alone also gives belirlenemeyen.
- Section 3 lead "her derste dönem başına en fazla 2 kez" drops "her öğrenci için" (reads as 2 per course).
- Section 7 "11 Mart'a kadar yeni bir sürüm" holds only if the December build is uploaded on or after 11 Aralık; the timeline allows 1 to 21 Aralık.
- S15 asks four things; default "İzin yok" answers three. If read literally for Google-hosted mailboxes, the primary login (e-posta kodu) has no path.
- "Kâğıt da bunları önleyemiyor" after "değiştirilmiş uygulama" is logically loose (paper has no app).
- Section 8 "Benimseme" vs Ek F "Benimsenme".
- Unglossed product names in Tek bakışta and section 1: Expo, React, Fastify, PostgreSQL, TypeScript, Flutter, NestJS, Supabase, SheetJS, drizzle, expo-sqlite.

## 5. Style

U+2014 0, U+2013 0, banned vocabulary 0. PASS.

## 6. Findings, most severe first

1. MINOR (R3, short read). Güvenli Klasör / second profile missing from Tek bakışta "Önlenemeyen" and from the section 3 lead. Fix: add "tek telefonda ikinci Android profili" to both; lead becomes "dört istisna" or drop "çoğunlukla ... gerekiyor".
2. MINOR (R2/R3 precision). Section 3 clock line: "Telefon arada yeniden başlatıldıysa ya da iOS'ta saat kaydırıldıysa kayıt 'belirlenemeyen' olur ve 2'lik sınıra girer."
3. MINOR (unclear). Section 3 lead: "her öğrenci için her derste dönem başına en fazla 2 kez".
4. MINOR (R1, R7, feasibility). Add Ek D row "expo-camera'nın Android çözücüsü (ML Kit), onaysız | Elendi". State that expo-camera is excluded from Android autolinking (else ML Kit still ships in the APK and must go on the Play Data safety form). Cite expo/expo #39449.
5. MINOR (R8 dates). Section 7: "Aralık sürümü 11 Aralık'tan sonra yüklenir" or "yeni sürüm, Aralık yüklemesinden en geç 80 gün sonra".
6. MINOR (R7/R10). S15 default: add "E-posta kodu yine İÜ kutularına gider; kutuların Google'da olması İÜ'nün mevcut işlemesidir, hukuk birimi teyit eder."
7. MINOR (R9 measurement, inference). Crash-free metric via own error log misses native crashes unless a next-launch "unclean exit" flag is recorded. Name the mechanism in Ek F or Ek C.
8. MINOR (R9). Ek F: add "Çift kayıt (testle) 0", "Hesap kurtarma süresi", "Hoca hesabı onay süresi".
9. MINOR (length, layout). Body 3,116 words, 12 cells over 20 words. Split S17 (36), Oturum anahtarı (35), S3 default (33).
10. MINOR (jargon, wording). One Ek G line for product names (Expo, React, Fastify, PostgreSQL, TypeScript, Flutter, SheetJS, drizzle); "Benimseme" in both places; replace "Kâğıt da bunları önleyemiyor" with "Kâğıtta ise herkes herkesin yerine imza atabiliyor."
