# Critic B8: regression review r7 -> current

Document: iu-yoklama-ozet.html (105,985 bytes on disk, 02:00). Previous: iu-yoklama-ozet.r7.html (PASS in critic-B7.md). Rubric: rubric.md (frozen). Input: faculty-notes.md.
Read-only. New scratchpad files only: critic_b8_diff.py, critic_b8_check.py (copy of B7 check), _b8_diff.txt, _b8_body.txt, _b8_app.txt, _b8_all.txt, _b8_vc.tgz, _b8_vcb.tgz, _b8_eal.tgz, _b8_emc.tgz.

## Method

- critic_b8_diff.py: strips style/script, flattens both versions to text lines, unified diff (_b8_diff.txt, 98 lines, 24 hunks). Style and script blocks unchanged.
- critic_b8_check.py: U+2014 0, U+2013 0, English banned vocabulary 0, broken internal anchors 0.
- Body outside `<details>` 3,227 words (B7 3,116). Short read 1,668 (B7 1,637). Body cells over 20 words: 14 (B7 12).
- Verified externally: react-native-vision-camera 5.2.3 published 2026-08-20 (npm), matches Ek D. Its barcode plugin react-native-vision-camera-barcode-scanner 5.2.3 declares `com.google.mlkit:barcode-scanning:17.3.0` in android/build.gradle, so "Kod tarayıcısı Android'de yine ML Kit kullanıyor" holds. expo/expo #39449 exists (expo-camera ML Kit dependency issue). ogr.iu.edu.tr and istanbul.edu.tr MX point to Google (mx-check.txt), so the S15 "Google Workspace" default is grounded.

## VERDICT: PASS

All 10 rubric items still pass, no traceability gap, no new contradiction. Findings are MINOR.

## 1. What changed (24 hunks)

Tek bakışta Önlenemeyen + section 3 lead (dört istisna, her öğrenci için); section 1 Doğrulama "Doğrulama için tek izin kamera"; section 1 Android build excludes expo-camera; section 1 and 5 own crash log (ApplicationExitInfo / MetricKit, 90 gün); "yetkili karar" -> "belgeli düzeltme" in 3 places (no residue); warning level recalculated after a correction; section 7 prerequisites (SMTP by 1 Aralık, security test passed); TestFlight 80-day rule; S15 default; Ek A Çökme izleme; Ek C device revocation rules + regression test; Ek C clock regression tests split; Ek C guess odds reworded; Ek C notification permission; Ek D ML Kit row + vision-camera row; Ek E autolinking + 13 Ocak; Ek F three new rows, Benimseme; Ek G product names.

Checked for new contradictions:
- iOS clock shift: r7 test expected "belirlenemeyen"; current test expects "gecikme yakalanır, kayıt incelemeye düşer" when no reboot. This matches section 3 ("zaman belirlenebiliyorsa yakalanır; yeniden başlatıldıysa belirlenemeyen") and Ek C's two-sided rate check (uptime is unaffected by a clock change, the sync anchor supplies the second side). Consistent.
- Bildirim izni vs "tek izin kamera": now scoped to "Doğrulama için"; MVP "Devam eşiği bildirimi" is the local notification that needs it. Consistent.
- "Seviye geri gitmez" vs recalculation: section 4 and Ek C both carry the same exception. Consistent.
- 13 Ocak retest: section 7 already had it; Ek E now matches.
- Random install id in the crash log vs "Tutulmayacak veriler: donanım kimliği" and Ek D "Cihaz kimliği özeti Elendi": a random id is not a hardware id. No conflict.

## 2. Rubric items

| # | Result | Reason |
|---|---|---|
| 1 | PASS | New vision-camera row dated (verified). zxing-cpp winner, ML Kit 2nd with approval, expo-camera Android excluded with #39449. Explicit Elendi row still missing (F4). |
| 2 | PASS | All seven cases unchanged or sharpened (iOS clock test, device revocation). |
| 3 | PASS | Bar unchanged; lead now four exceptions matching Önlenemez list; Tek bakışta includes ikinci profil. |
| 4 | PASS | Import/export untouched. |
| 5 | PASS | No kapsam row removed; only Raporlu/izinli wording changed. |
| 6 | PASS | Additions list untouched. |
| 7 | PASS | Crash log contents, retention (90 gün) and domestic hosting stated; S15 default now covers Google-hosted mailboxes. |
| 8 | PASS | TestFlight 80-day rule closes the 11 Mart gap. |
| 9 | PASS | Ek F adds Tek katılım, Hesap kurtarma, Hoca onayı; Kararlılık names the native-crash mechanism (F2). |
| 10 | PASS | S1-S19 intact, each with why and default. |

## 3. critic-B7 MINOR findings

| # | Status | Note |
|---|---|---|
| 1 Güvenli Klasör in short read | FIXED | Tek bakışta and section 3 lead ("Dört istisna"). |
| 2 iOS clock line | FIXED | Resolved by correcting Ek C test instead; section 3 and Ek C now agree. |
| 3 "her öğrenci için" | FIXED | |
| 4 Ek D Elendi row, autolinking, #39449 | PARTLY | Autolinking exclusion, build check and #39449 added; no explicit Elendi row. |
| 5 TestFlight date | FIXED | "her sürümden en geç 80 gün sonra yenisi". |
| 6 S15 Google mailboxes | FIXED | MX records confirm Google. |
| 7 native crash mechanism | FIXED | ApplicationExitInfo / MetricKit; Android coverage gap (F2). |
| 8 Ek F rows | FIXED | |
| 9 length / cells | NOT FIXED | Worse: 3,227 words, 14 cells; S17 36, Oturum anahtarı 35, S3 default 33. |
| 10 jargon / wording | PARTLY | Product glossary and "Benimseme" done; some names still unglossed, "Kâğıt imza da" still loose. |

## 4. Traceability

Diff removes no scope line. Every faculty and owner bullet still maps as in critic-B7 section 3. No gap.

## 5. Findings

1. MINOR (R3 consistency). Section 3 "Çalınan hoca anahtarı" and Ek B "Başlatma kaydı gelmedi" still say "kayıp diye iptal edilen cihazın kayıtları incelemeye düşer"; Ek C now evaluates sessions whose start record reached the server before cancellation normally. Fix: "iptalden önce başlatma kaydı gelmemiş oturumların kayıtları".
2. MINOR (R9, partly inference). ApplicationExitInfo exists only on Android 11 (API 30)+. If the app supports older Android (React Native minSdk has been 24; not verified for SDK 57), native crashes there go unread. Add an unclean-exit flag fallback or state "Android 11+".
3. MINOR (length, B7 #9). Body 3,227 words, 14 body cells over 20 words; S17 (36), Oturum anahtarı (35), S3 default (33) still unsplit.
4. MINOR (R1 residue, B7 #4). No explicit Ek D "Elendi" row for the Android decoder (expo-camera / ML Kit without İÜ approval); the rejection lives only inside the ML Kit row text.
5. MINOR (jargon). Unglossed: NestJS, Supabase, expo-sqlite, expo-camera, Google Workspace (body); RECORD_AUDIO, "Google kod tarayıcısı" (Ek D); "yığın izi" (section 5). "Kâğıt imza da bunları önleyemiyor" still pairs paper with "değiştirilmiş uygulama".
6. MINOR (unclear Turkish). Ek E "Pilot sürümü 13 Ocak'a kadar ... yeniden test edilir. Bunun için 9 hafta var": "Bunun" now reads as the retest (15 weeks away); the 9 weeks is 29 Eylül to 1 Aralık. Section 4 "Tahmin değişti diye": "tahmin" is not defined (means kalan planlı saat).
7. MINOR (traceability of numbers). Ek C guess odds went from computed ~1/1.000.000 and ~1/14.000 (24 dilim x 3 cihaz) to "milyonda birkaç" / "on binde bir düzeyi (tahmin)". Not wrong (72/10^6 is about 0,7/10^4) but the derivation is gone.
8. MINOR (wording). Ek D "APK'da ... bulunmadığı kontrol edilir": Play receives an AAB; name the build output actually checked (AAB and the APKs generated from it).
