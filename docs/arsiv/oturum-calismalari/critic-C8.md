# Critic C8: adversarial review of iu-yoklama-ozet.html (eighth revision)

Stance: competitor engineer who wants this rejected. Read-only, no browser automation.
Inputs: `iu-yoklama-ozet.html` (md5 ea80eb84ff3f84aadc42c20107dee484, 9 `<details>`, 1 script, 0 em/en dashes),
text via `_c8_extract.py` to `_c8_text.txt` (md5 1b2270a3c1d6a5438918695a4c982ee8, identical to `_a8_text.txt`),
`patch9.py` (the round-7 edits), `faculty-notes.md`, `critic-C7.md`. Date 2026-09-29.
BLOCKER = changes a decision or makes a stated claim false. SPEC = protocol-spec detail.
Not re-raised: "Önlenemez" items (now incl. Android second profile), Ek F measurements, open questions,
9-week freeze (labelled "yüksek risk", slip to Güz 2027).

VERDICT: FAIL (1 BLOCKER, 5 SPEC)

Verified on the web today: `react-native-vision-camera` latest 5.2.3 published 2026-08-20 (Ek D row real; v5 barcode
scanning is the separate `react-native-vision-camera-barcode-scanner` 5.2.3); expo/expo#39449 exists and names
expo-camera's ML Kit / code-scanner gradle deps (Ek E citation valid); expo-modules-core Android default minSdk 24;
ApplicationExitInfo is API 30+, `getTraceInputStream` only for REASON_ANR and (API 31+) REASON_CRASH_NATIVE;
npm has only 0.x community packages for MetricKit / ApplicationExitInfo (`react-native-metrickit-sdk` 0.1.0,
`@cphtech-dk/expo-crash-capture` 0.1.1), no Expo-maintained module.

## Part 1. Status of critic-C7 findings

| # | C7 item | Status | One line |
|---|---|---|---|
| B1 | Revoked device: reddedilir vs incelemeye | FIXED | Ek C Anahtarlar list: pre-revocation start records normal, others review, only the device's own sync rejected, regression test. Bölüm 3 scoping residue: SPEC-2. |
| SPEC-1 | expo-camera autolinked on Android | FIXED | Bölüm 1 "derlemeye hiç alınmaz", Ek D `expo.autolinking.android.exclude`, APK check for ML Kit / code scanner / RECORD_AUDIO, iOS mic off, Ek E cites #39449. |
| SPEC-2 | iOS clock-shift test expectation | FIXED | Two cases now. Android ordering residue: SPEC-3. |
| SPEC-3 | "Seviye geri gitmez" blocks corrections | FIXED | Bölüm 4 and Ek C: correction recomputes and notifies. |
| SPEC-4 | Fallback build / retest rule | FIXED | "testi geçmiş Aralık sürümü", "yüksek önemde bulgu kalmaması", every later build same code or retested, Ek E says 13 Ocak, 80-day rule (20 Ocak + 80 = 10 Nisan, 21 Aralık + 80 = 11 Mart). |
| SPEC-5 | SMTP relay date | FIXED | "İÜ sunucusu ve SMTP rölesi (1 Aralık'a kadar)" in Bölüm 7 and Ek E. |
| SPEC-6 | Key renewal undefined / cihaz_no uniqueness | PARTLY | Ek C fixed (never reused, unique per ders). Kenar durumlar row still says "iptal edilir ve anahtarları yenilenir": SPEC-2. |
| SPEC-7 | "Tek izin kamera" | FIXED | "Doğrulama için tek izin kamera"; Ek C adds notification permission and in-app fallback. |

## Part 2. Findings

### B1. BLOCKER: the new crash-log design adds a third native module, so "Yerel kod iki yerde gerekiyor" is false, and it cannot deliver what Bölüm 5 / Ek F claim
- Round-7 edit added "Yerel çökmeler bir sonraki açılışta okunur (Android'de ApplicationExitInfo, iOS'ta MetricKit)"
  to Bölüm 1, Bölüm 5, Ek A, Ek F. Neither API is reachable from Expo JS; the only npm wrappers are 0.x community
  packages. Ek C still says native code is needed in exactly two places (clock, camera) and the freeze budget counts
  only the camera (~1 hafta). The claim is now false and the budget omits the work.
- The stated payload is also wrong for Android: ApplicationExitInfo is API 30+ (Expo minSdk 24, so Android 7-10
  phones report nothing), and it gives no trace for JVM crashes (REASON_CRASH); traces exist only for ANR and, API 31+,
  native crashes. So "hata türü, yığın izi" and Ek F "Kararlılık ... yerel çökmeler bir sonraki açılışta okunur" are
  not true for a large part of the pilot's Android users.
- Fix (keeps the native count at two): "MVP'de JS hataları `ErrorUtils` genel yakalayıcısıyla, yerel çökmeler
  'temiz kapanış işareti' yöntemiyle (açılışta işaret kalmışsa çökme sayılır) kaydedilir; yerel kod gerekmez.
  ApplicationExitInfo / MetricKit sonraki fazda." Otherwise say "Yerel kod üç yerde" and add it to the freeze budget,
  and restate Ek F Kararlılık as "Android 11+ ve iOS".

### SPEC-1. Wrong-time "Başlat" silently makes a held session that charges every student absence hours
- Ek C "Yapıldı" tanımı: "Bir ders, başlatma kaydı ya da elle giriş varsa yapılmış sayılır", and Başlat works for
  telafi without a schedule entry. An accidental or test Başlat (wrong course, projector test at night), or a stolen
  device before revocation, adds T hours and an absence for everyone not scanned, against Ek F "Haksız yere
  finalden men 0". "Öğrenci kayıtları tek başına ... saydırmaz" does not cover the start record itself.
- Fix: "Takvimde olmayan bir başlatma, hoca 'Ders yapıldı mı?' sorusunu onaylayana ve saat sayısını girene kadar
  yapılmış sayılmaz."

### SPEC-2. Revocation wording still inconsistent in two places; a found device's queue is silently lost
- Bölüm 3: "kayıp diye iptal edilen cihazın kayıtları incelemeye düşer" is unscoped; Ek C says pre-revocation
  sessions are normal. As a security claim under "Çalınan hoca anahtarı" it overstates: sessions a thief started
  and synced before revocation are counted normally. Kenar durumlar: "anahtarları yenilenir" contradicts Ek C
  (number retired, new device gets a new number).
- "Yalnız iptal edilen cihazın kendi senkronu reddedilir" drops a found device's queued headcounts, manual
  corrections and cihaz değişimi onayları (Ek C says approvals travel in that queue).
- Fix: Bölüm 3 "iptalden sonra gelen, bilinmeyen başlatma değerli kayıtlar"; edge row "yeniden eklenen cihaz yeni
  numara alır"; "iptal edilen cihaz bulunursa kuyruğu hocaya onay için gösterilir, otomatik uygulanmaz".

### SPEC-3. Android reboot regression test is ordered so it may expect the wrong result
- "Yeniden başlat ve iletilen QR'ı okut: belirlenemeyen." On Android, reboot then scan then sync leaves a same-boot
  post-scan anchor (the sync), which fixes the time, so the correct result is "gecikme yakalanır" if that anchor is
  used. Ek C only defines the pre-scan single-anchor case, so the doc does not say. The belirlenemeyen path needs
  "okut, sonra yeniden başlat, sonra senkronla" on iOS, or no same-boot anchor on either side on Android.
- Fix: "Android'de okutmayla aynı açılıştaki sonraki çapa da kullanılır" and split the test by ordering and platform.

### SPEC-4. S15 default settles a KVKK question as fact
- "Öğrenci e-posta kutularının Google Workspace'te olması İÜ'nün kendi tercihi; e-posta koduyla giriş bundan
  etkilenmez" is a legal conclusion in a document that says it is not legal advice. If İÜ's lawyers disagree, the
  login decision has no fallback (Google ile giriş has the same exposure, SMS is "sonra").
- Fix: mark it "çıkarım, hukuk birimi teyit etmeli" and name the fallback (yurt içi SMS kodu, Netgsm, Ek D).
  Privacy call: escalate to the owner, not decided here.

### SPEC-5. Hoca paneli must decode QR from a desktop webcam, with no library listed
- Kenar durumlar and Ek C Makbuz: the instructor scans the student's signed-record QR "panelde". The panel is a
  desktop PWA; `BarcodeDetector` is not available in desktop Chrome on Windows/Linux, Firefox or Safari, so a JS/WASM
  decoder is needed. Ek D lists none.
- Fix: Ek D row "zxing-wasm (ya da zxing-cpp'nin WASM derlemesi): hoca panelinde makbuz QR'ı için"; or state the
  panel shows a typed short code fallback.

## Part 3. Fixed constraints

- Offline-first: holds. Revocation no longer rejects honest offline records; notification permission denial has an
  in-app fallback; crash log is sent later, not needed at scan time.
- No AKSIS: respected (file import, manual AKSİS sayfası, deadline as admin field).
- Simplicity: violated only by B1 (an unbudgeted third native module for a pilot metric). Second-profile exception
  is honestly listed as Önlenemez; no new moving parts otherwise.

Sources: registry.npmjs.org/react-native-vision-camera; api.github.com/repos/expo/expo/issues/39449;
github.com/expo/expo packages/expo-modules-core/android/build.gradle (minSdk 24);
developer.android.com/reference/android/app/ApplicationExitInfo and embrace.io/blog/android-applicationexitinfo-api
(API 30, trace only for ANR / native API 31+); npm search "metrickit", "ApplicationExitInfo".
Inference: whether MetricKit crash payloads depend on the user's analytics opt-in (sources disagree; not used above).
