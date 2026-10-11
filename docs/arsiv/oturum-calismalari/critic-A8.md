# Critic A8: fidelity of iu-yoklama-ozet.html (29.09.2026, 02:00 build)

VERDICT: FAIL (2 new BLOCKERs; all 3 A7 BLOCKERs are fixed)

## Method

- Extracted the full text, including all 9 `<details>` blocks, to `_a8_text.txt` (605 lines) and diffed it against `_a7_text.txt`.
- Re-fetched these sources today:
  - expo sdk-57 `expo-camera/android/build.gradle`;
  - the Expo autolinking docs;
  - expo issue #39449;
  - the VisionCamera v5 code-scanner docs and search results;
  - Apple forums thread 784399 on MetricKit.
- The document contains no U+2014 or U+2013 characters.

## 1. Status of critic-A7 findings

| # | Status | Note |
|---|---|---|
| B1 ML Kit still ships | FIXED | §1 L34 now reads "Android'de expo-camera derlemeye hiç alınmaz". Ek D L422 names `expo.autolinking.android.exclude`, which is confirmed in the Expo docs, and adds an APK check for ML Kit, the code scanner and RECORD_AUDIO. #39449 lists `play-services-code-scanner`, `mlkit:barcode-scanning` and `camera-mlkit-vision`, which matches the sdk-57 gradle file. |
| B2 revoked device: rejected or review | FIXED | Ek C L326-331: pre-revocation synced sessions are evaluated normally, the rest go to review, and only the revoked device's own sync is rejected. A regression test is included. There is a residual summary mismatch, see m1. |
| B3 native crashes and §5 | FIXED | §5 L135 lists the contents, 90-day retention and aydınlatma. It names ApplicationExitInfo and MetricKit. MetricKit works regardless of the analytics opt-in (Apple DTS, forum 784399). Two gaps remain, see N2 and m3. |
| m1 "yetkili karar" | FIXED | Replaced by the general "belgeli düzeltme" code in L109, L151 and L258. |
| m2 TestFlight 11 Mart | FIXED | L188: "her sürümden en geç 80 gün sonra yenisi". See m6. |
| m3 guessing odds | FIXED | Now given as orders of magnitude and labeled "(tahmin)". This is consistent with 10^6 / (slices × ≤3 devices). |
| m4 iOS clock-shift test | FIXED | L346: "yeniden başlatmadan ... gecikme yakalanır, kayıt incelemeye düşer". |
| m5 vision-camera alternative | FIXED | Ek D L423 lists it as the 2nd option. It is correct that the v5 code scanner uses ML Kit on Android. |

## 2. BLOCKERs

### N1. S15 states a legal inference as a settled fact

- L222 says: "Öğrenci e-posta kutularının Google Workspace'te olması İÜ'nün kendi tercihi; e-posta koduyla giriş bundan etkilenmez."
- Research 05 marks this as an open legal question:
  - L137: "verify where IU's own student mail is hosted if it is a foreign SaaS. [LEGAL]"
  - L263: "foreign SaaS would itself be a transfer question".
- The fact that the mail is hosted on Google is confirmed (mx-check). Whether sending OTPs and device e-mails to those mailboxes needs no transfer basis is not confirmed. It also conflicts with the summary rule "Kişisel veri işleyen hiçbir yurtdışı servis ... onay olmadan kullanılmaz".
- Fix: mark it "(çıkarım; hukuk birimi teyit etmeli)" and keep the question open.

### N2. The document's own native-code inventory is now false, and the effort estimate misses the new native work

- Ek C L347 says: "Yerel kod iki yerde gerekiyor: saat için küçük bir modül ve ... kamera modülü (tahmini ~1 hafta)".
- The new §5 L135, Ek A L249 and the Ek F L512 gate require reading ApplicationExitInfo (Android, Java) and MetricKit (iOS, Swift). Neither has an Expo or JS API, so this is a third native module, and the document names no library for it.
- §7 L178 ("~1 hafta") is the headline 1 Aralık risk, so the understatement matters for the decision.
- Fix: list the third module and add it to the estimate, or name an existing library.

## 3. MINOR (does not fail the document)

- m1. §3 L92 and Ek C L308 still say "kayıp diye iptal edilen cihazın kayıtları incelemeye düşer", with no qualifier. Ek C L327 says sessions whose start record reached the server before revocation are evaluated normally. Align the summaries.
- m2. §2 L74 says "Kayıp cihaz ... iptal edilir ve anahtarları yenilenir". Ek C dropped "anahtarları yenilenir" and replaced it with never reusing the device number. It is now unclear what gets renewed.
- m3. ApplicationExitInfo needs API 30+ (Android 11). Native crashes on Android 7-10 are invisible to the ≥%99 gate. State the coverage, or report the gate per OS version.
- m4. With expo-camera excluded on Android, the JS side must import it only on iOS, for example in `*.ios.tsx`. Otherwise the Android bundle requires a missing native module at load. Add this to the build or regression check.
- m5. Ek E L464 says "Pilot sürümü 13 Ocak'a kadar BİDB'de yeniden test edilir. Bunun için 9 hafta var". The 9 weeks are the time until 1 Aralık, and 29 Eylül to 13 Ocak is ~15 weeks. The referent of "Bunun" is wrong.
- m6. L190, "En geç 10 Nisan", holds only for a ~20 Ocak build. On the L188 fallback (the Aralık build, uploaded by 21 Aralık), the 80-day rule gives ~11 Mart. Word it as "20 Ocak sürümüyle başlanırsa".

## Checked and correct in the new text

- `expo.autolinking.android.exclude` syntax.
- expo #39449 content.
- sdk-57 gradle: the default is "true", and ML Kit and the code scanner are `implementation` dependencies.
- VisionCamera 5.2.3 (20.08.2026, 01 L61) and its ML Kit use on Android.
- MetricKit is independent of the "Share With App Developers" setting.
- Workspace MX, per mx-check.
- Guessing odds: order of magnitude plus the tahmin label.
- Ek F new rows are internally consistent.
- Glossary entries: Expo, autolinking, ApplicationExitInfo/MetricKit, API 36.
- The Güvenli Klasör item is listed as unverified in Ek E L481.

Scratch: `_a8_text.txt`, `_a8_extract.py`.
