# Critic A7: fidelity of iu-yoklama-ozet.html (29.09.2026, 01:50 build)

VERDICT: FAIL (3 BLOCKERs: 1 carried over as PARTLY, 2 new)

Method: I extracted the full text, including every `<details>` block, to `_a7_text.txt` (582 lines, 67 links) and diffed it against `_a6_text.txt`. I checked each changed line against research 01, 03 and 09 and against `mx-check`. I also re-fetched the primary sources today:
- `expo/expo` branch `sdk-57`, `packages/expo-camera/android/build.gradle`;
- the ML Kit Android data disclosure page.

The document contains no U+2014 or U+2013 characters.

## 1. Status of critic-A6 findings

| # | Status | Note |
|---|---|---|
| N1 "yedek kod muaf" flag | FIXED | The flag is gone from §3, §6 and Ek C. The %5 row no longer says "muaf hariç". The replacement at L350 is "Öğrenci başına muafiyet işareti tutulmaz ... tarafsız bir sebep koduyla elle ekler". The remaining "muaf" hits are the Md.20 repeater field, which is correct. |
| N2 ZXing cost | PARTLY | The Android camera module, ~1 week, the 1 Aralık risk and the ML Kit "confirmed" move are all in. The gradle property is still not named, and the plan still ships ML Kit on Android. See B1. |
| m1 "kurul kararı" code | PARTLY | Renamed to "yetkili karar". It is still a separate code whose main population is Md.36 cases. See m1 below. |
| m2 APK rule and ML Kit in the unverified list | FIXED | Both have moved out of the unverified list (L457). |
| m3 business-day keys versus weekend telafi | FIXED | Keys now cover "5 takvim günü" everywhere. `iş gün` now matches only the KVKK 5-day notice. |
| m4 "aynı derslerde" | FIXED | Now "pilot hocalarının derslerinde". |
| m5 "her derste" and the shared cap | FIXED | L81 now reads "bu ikisi birlikte her derste dönem başına en fazla 2 kez". |
| m6 AUZEF legal entity | FIXED | "hangi tüzel kişi adına açıldığı bilinmiyor (S17)". |
| m7 S15 test channels | FIXED | Now "ML Kit için İÜ onayı S15'te soruluyor". |

## 2. BLOCKERs

**B1 (carried over from A6 N2). Following the plan as written still ships ML Kit in the Android app.**
- The document keeps expo-camera for iOS: "QR, iOS'ta expo-camera ile okunur" (§1 L34). Autolinking still builds expo-camera's Android module.
- sdk-57 `build.gradle` reads `barcodeScannerEnabled = findProperty('expo.camera.barcode-scanner-enabled')`, which defaults to `"true"`. That value selects `implementation` over `compileOnly` for `com.google.mlkit:barcode-scanning:17.3.0` and `camera-mlkit-vision`.
- The ML Kit disclosure page does not limit its collection to API calls.
- This conflicts with §1 L34, "Android'de ML Kit yerine kendi kamera modülümüz", and with the summary's claim "onay olmadan kullanılmaz".
- Fix:
  - Set `expo.camera.barcode-scanner-enabled=false`, or exclude expo-camera from Android autolinking.
  - Add a build gate that fails if `com.google.mlkit` appears in the APK dependencies.

**B2 (new, internal contradiction). Records carrying a revoked device's key are "rejected" in one place and "sent to review" in others.**
- Ek C L325 (new): "İptal edilen bir cihazın anahtar numarasıyla gelen kayıtlar reddedilir."
- §3 L92: "kayıp diye iptal edilen cihazın kayıtları incelemeye düşer". Ek C L307 says the same.
- A lost instructor laptop's earlier sessions contain honest scans. Under L325 those scans are silently lost.
- Fix: reject only records whose time is after the revocation. Records from before the revocation, or with an undetermined time, go to review.

**B3 (new, decision-relevant omission). The replacement crash metric cannot see native crashes, and the new data flow is not in §5.**
- The following lines replace the store consoles with "uygulamanın İÜ sunucusuna gönderdiği hata kaydı": S15 default (L221), Ek A (L248), and the Ek F gate "Çökme yaşamayan kullanıcı ≥%99" (L500).
- A JS-level error log cannot record a process crash. That includes a crash in the new CameraX/zxing-cpp native code, which is exactly where the risk now sits. So the gate overstates stability.
- The error log is also new personal-data processing, keyed per user so that crash-free users can be counted. §5 L128-135 has no entry for its contents, retention or aydınlatma.
- Fix:
  - Say that native crashes need an extra mechanism, for example Android `ApplicationExitInfo` (API 30+) and iOS MetricKit crash diagnostics, read at the next launch.
  - Add the error log to §5 with a retention period.

## 3. MINOR (does not fail the document)

- m1. "yetkili karar" (§4 L109, §6 L150, Ek A L257) is still used only for Md.36 and the other mevzuat exceptions. It is a thinner version of the 05 L87 leak. Fold it into the general document-backed correction code.
- m2. "11 Mart'a kadar yeni bir sürüm" (L187) is correct only if the Aralık build reaches TestFlight on about 21 Dec (21 Dec + 90 days = 21 Mar, minus a 10-day margin). A build uploaded on 1 Dec expires on 1 Mar. Write it as "Aralık sürümünün yükleme tarihinden 80 gün içinde".
- m3. "~1/14.000 (24 dilim × 3 cihaz)" (L353) is not derived in the text.
  - The 24 is presumably the 10-minute default divided by 25 s. At 20 s it is 30 slices, and an extended window gives more.
  - An undetermined record's interval can also span several sessions of the course.
  - The "~1/1.000.000" figure ignores multiple devices and ±1 slice tolerance.
  - State these assumptions. The 2-cap bounds the impact either way.
- m4. L338's expected result, "belirlenemeyen" for "iOS'ta saati kaydır ve okut", conflicts with Ek C's own model. The anchors use server time plus time since boot, so a clock shift with anchors on both sides in the same boot gives a determinable time, and the late QR is caught. Only the one-sided or reboot case gives "belirlenemeyen".
- m5. The own CameraX module (~1 week) is chosen without comparing it to react-native-vision-camera 5.2.3 (01 L61) plus a zxing frame-processor plugin. State why the alternative was rejected, or list it as the 2nd option.

Checked and correct in the new text:
- 48 h × 50 ppm + 2 s = 10.64 s.
- 10⁶ / 72 ≈ 13,900.
- zxing-cpp 3.1.1 dated 29.07.2026.
- 20 Jan + 90 days = 20 Apr, so "en geç 10 Nisan" works.
- ML Kit "varsayılan" (build.gradle).
- ML Kit disclosure wording.
- Glossary entries for ppm, HKDF and D-U-N-S.
- The AUZEF wording.
- Key horizon consistency.

Scratch files: `_a7_text.txt`, `_a7_links.txt`, `_a7_extract.py`.
