# Critic C7: adversarial review of iu-yoklama-ozet.html (seventh revision)

Stance: competitor engineer who wants this rejected. Read-only, no browser automation.
Inputs: `iu-yoklama-ozet.html` (md5 64231947fb6a5ef10c7c0f1d265689e4, 1 script = theme toggle, 9 `<details>`),
text via `_c7_extract.py` to `_c7_text.txt` (md5 74b90560004cc29daf827dac09821b76, identical to `_a7_text.txt`),
`faculty-notes.md`, `critic-C.md`..`critic-C6.md`. Date 2026-09-29.
BLOCKER = changes a decision or makes a stated claim false. SPEC = protocol-spec detail.
Not re-raised: "Önlenemez" items, Ek F measurements, open questions, 9-week freeze (labelled "yüksek risk", slip to Güz 2027).

VERDICT: FAIL (1 BLOCKER, 7 SPEC)

Checked by script (`_c7_check.py`), not findings: 13 Ocak Wed, 20 Ocak Wed, 25 Ocak Mon, 11 Mart Thu,
1 Mayıs Sat, 2 Mayıs Sun; 21 Aralık + 90 d = 21 Mart (11 Mart fallback upload fits); 20 Ocak + 90 = 20 Nisan;
10 Nisan + 90 = 9 Temmuz; iOS tolerance 2 s + 48 h x 50 ppm = 10.64 s; 50 ppm = 4.32 s/day; float formula wrong
for 39 of T=1..199 at p=80; Base45 of 31 bytes = 47 chars; 600 s / 25 s x 3 devices = 1/13,889.
Checked on the web: zxing-cpp v3.1.1 released 2026-07-29 and `io.github.zxing-cpp:android:3.1.1` is on Maven
Central (depends on androidx camera-core), so the Ek D row is real.

## Part 1. Status of critic-C6 findings

| # | C6 item | Status | One line |
|---|---|---|---|
| B1 | Android ZXing not addable to expo-camera | FIXED | Bölüm 1, Ek C, Ek E, S15 all say own CameraX + zxing-cpp module, ~1 week in the freeze. Build-level gap: SPEC-1. |
| B2 | Daily key on device | PARTLY | K_gün stays on server, only K_dev ships. But the new revocation sentence contradicts the rest: B1. |
| B3 | Old QR photo "Önlenir" false | FIXED | Moved to "İşaretlenir veya sınırlanır", "Üç istisna", test asserts belirlenemeyen + cap. Test scenario wording: SPEC-2. |
| SPEC-1 | iOS 2 s tolerance | FIXED | 2 s + 50 ppm x interval, max ~10.6 s at 48 h, lowest-RTT anchor. |
| SPEC-2 | Retest slot / failure rule | FIXED | Retest by 13 Ocak, fallback to tested Aralık build, new build by 11 Mart. Residue: SPEC-4. |
| SPEC-3 | No-start-record counting | FIXED | "hoca cevaplayana kadar sayılmaz", KARAR BEKLİYOR, once per session. |
| SPEC-4 | Server date split | PARTLY | Server dated 1 Aralık; SMTP relay still only "15 Aralık" though the 1 Aralık test covers login: SPEC-5. |
| SPEC-5 | S17 owner | FIXED | "rektörlüğün yazılı olarak yetkilendirdiği bir kişi". |
| SPEC-6 | Backup code course binding / odds | FIXED | Course picked or code typed, one entry per session, 1/14.000 restated (assumes known session; nit only). |
| SPEC-7 | Weekend keys | FIXED | "5 takvim günü" in Bölüm 1, 2, 3 and edge row. |
| SPEC-8 | Console crash data vs S15 | FIXED | Kararlılık uses own error log; Ek A "Mağaza konsollarına dayanılmaz". |

## Part 2. Findings

### B1. BLOCKER: revoked-device records are both "reddedilir" and "incelemeye düşer"; the reject branch loses honest records
- Ek C Anahtarlar: "İptal edilen bir cihazın anahtar numarasıyla gelen kayıtlar reddedilir." Bölüm 3 and Ek C
  table: "kayıp diye iptal edilen cihazın kayıtları incelemeye düşer." Same records, opposite outcomes.
- Taken literally, "reddedilir" is unscoped: instructor loses the tablet Wednesday, revokes it (edge row
  "Kayıp cihaz web panelinden iptal edilir"), and every unsynced student record from Monday/Tuesday classes on
  that key number is rejected. That falsifies Ek F/Bölüm 8 "Makbuzla kanıtlanıp kaybolan kayıt 0" and risks
  "Haksız yere finalden men 0" for students whose receipt said "Alındı".
- Fix (Ek C): "İptalden sonra: başlatma değeri iptalden önce sunucuya ulaşmış kayıtlar normal değerlendirilir;
  diğerleri incelemeye düşer (oturum başına tek soru). İptal edilen cihazın kendi senkronu reddedilir." Drop
  "reddedilir" for student records; add a regression test (lost device, revoke, late student sync -> not rejected).

### SPEC-1. expo-camera stays autolinked on Android, so ML Kit, Google code scanner and RECORD_AUDIO still ship
- expo-camera `android/build.gradle` (main) adds `com.google.mlkit:barcode-scanning:17.3.0`,
  `play-services-code-scanner:16.1.0`, `camera-mlkit-vision` and `play-services-mlkit-document-scanner` by default;
  its manifest declares `com.google.mlkit.vision.DEPENDENCIES=barcode_ui` (Play services fetches the module at
  install); the config plugin defaults `recordAudioAndroid = true` (microphone permission). Expo docs: prebuilt
  modules already include barcode libs. Doc says only "Android'de expo-camera kullanılmaz" in effect, not how.
- Fix: Ek C/E: "expo-camera Android'de autolinking dışı (`expo.autolinking.android.exclude`); CI, APK'da
  `com.google.mlkit`, `code-scanner`, `RECORD_AUDIO` olmadığını denetler; iOS'ta `microphonePermission: false`."
  (Whether unused linked ML Kit transmits is inference; the exclusion makes the question moot.)

### SPEC-2. Regression scenario "iOS'ta saati kaydır ve okut" expects belirlenemeyen, which contradicts the design
- iOS time comes from anchors + uptime with rate matching; a wall-clock shift without reboot does not break the
  rate check, so the design (and Bölüm 3 "zaman belirlenebiliyorsa yakalanır") gives a delay flag, not belirlenemeyen.
  A test expecting belirlenemeyen cannot go red if clock-shift wrongly degrades to the 2-cap path.
- Fix: two iOS cases: "saati kaydır, yeniden başlatma yok -> gecikme işareti, incelemede" and "iki çapa arasında
  yeniden başlat -> belirlenemeyen + 2'lik sınır".

### SPEC-3. "Seviye geri gitmez" also blocks corrections
- A later Md.35 "Görevli" entry or corrected absence leaves the student at "Hakkını aştın" although the recomputed
  count is within limits; conflicts with Ek F "Elle yapılan hesapla uyuşmazlık 0".
- Fix: "Seviye yalnız projeksiyon değişince geri gitmez; düzeltme ya da Md.35 girişi seviyeyi yeniden hesaplar ve
  öğrenciye düzeltme bildirimi gider." Add to the regression test.

### SPEC-4. Fallback "test edilmiş Aralık sürümü" presumes that build passed, and later builds have no retest rule
- "Güvenlik testi ... tamamlanmalı" (15 Aralık) does not say "geçti"; a tested-with-findings build cannot go live
  under Genelge 2019/12. The 11 Mart and 10 Nisan uploads are not said to be retested or code-identical.
  Ek E still says "~20 Ocak sürümü BİDB'de yeniden test edilir" beside Bölüm 7's "13 Ocak'a kadar".
- Fix: "15 Aralık ön koşulu: test geçti (kritik/yüksek bulgu yok). Fallback yalnız aynı commit. 11 Mart ve 10 Nisan
  derlemeleri ya aynı commit ya da BİDB yeniden testi." Align Ek E to 13 Ocak.

### SPEC-5. SMTP relay dated 15 Aralık, but the 1 Aralık security test covers login by e-mail code
- Fix: prerequisite line "İÜ sunucusu ve SMTP rölesi: 1 Aralık; güvenlik testi: 15 Aralık".

### SPEC-6. "Cihaz iptal edilince o cihazın anahtarları yenilenir" is undefined under HKDF(K_gün, cihaz_no)
- A revoked device gets no new keys; renewing means a new cihaz_no for a re-enrolled device. Also cihaz_no must be
  unique across co-instructors (ortak hoca) of the same course, else two devices share K_dev.
- Fix: "İptal edilen cihaz numarası bir daha kullanılmaz; yeniden eklenen cihaz yeni numara alır; numara ders
  başına tekildir (ortak hocalar dahil)."

### SPEC-7. "Tek izin kamera" is true only for verification
- Local sync reminders and threshold notices need POST_NOTIFICATIONS (Android 13+) and iOS notification
  authorization. Fix: "Doğrulama için tek izin kamera; hatırlatmalar için bildirim izni (reddedilirse uygulama içi uyarı)."

## Part 3. Fixed constraints

- Offline-first: holds. 5-day keys cover weekend telafi; week-1 backup code works by typed course code; iOS
  tolerance no longer penalises next-day syncs. B1 is the only offline-sync record-loss path found.
- No AKSIS: respected (file import, manual AKSİS page, deadline as admin field).
- Simplicity: the camera module is acknowledged in the freeze budget; B1, SPEC-1..7 are wording or one-line config.

Sources: github.com/expo/expo packages/expo-camera/android/build.gradle, AndroidManifest.xml, plugin/src/withCamera.ts
(main); docs.expo.dev/versions/latest/sdk/camera (prebuilt modules note); docs.expo.dev/modules/autolinking
(android.exclude); developers.google.com/ml-kit/android-data-disclosure; api.github.com zxing-cpp releases;
repo1.maven.org io/github/zxing-cpp/android/maven-metadata.xml.
Inference: whether linked-but-unused ML Kit sends data; iOS uptime clock choice (doc defers to implementation).
