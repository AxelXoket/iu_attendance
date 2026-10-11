# Critic C10: adversarial review of iu-yoklama-ozet.html (tenth revision)

Stance: competitor engineer who wants this rejected. Read-only on existing files, no browser automation.
Inputs: `iu-yoklama-ozet.html` (md5 e7035d0f73e32e2fdef68548089aa678, 9 `<details>`, 0 em/en dashes, one inline
script = theme toggle only), text via `_c10_extract.py` to `_c10_text.txt` (md5 ac91563cf5bc9b24dd6034f815010d31,
identical to `_a10_text.txt`), line diff against r9 text in `_c10_diff.txt` (r9 html md5 91b6ba9d... matches C9 input),
`faculty-notes.md`, `critic-C9.md`. Date 2026-09-29.
BLOCKER = changes a decision or makes a stated claim false. SPEC = protocol-spec detail.
Not re-raised: "Önlenemez" items, Ek F measurements, open questions, 9-week freeze ("yüksek risk", slip to Güz 2027).

Verified today (scripts / primary sources):
- npm registry: jsqr latest 1.4.0 published 2021-04-24 (Ek D row correct); expo-camera 57.0.0 published 2026-06-25
  (row correct; latest is 57.0.5, row names the SDK line, fine); zxing-wasm 3.1.4 published 2026-09-10 (correct).
- MDN browser-compat-data 8.1.3 (2026-09-24), `api.BarcodeDetector`: Chrome desktop "ChromeOS and macOS only",
  Edge/Opera macOS only, Firefox false, Safari/iOS 17 only behind the "Shape Detection API" flag. Ek D "Elendi.
  Windows ve Linux'taki masaüstü Chrome'da, Firefox'ta ve Safari'de yok" is correct (Safari: not by default).
- Script: 39 wrong values of floor(T x 0.2) for T in 1..199 (T=15 gives 2, correct 3); 20 Ara 2026 and 2 May 2027
  Sundays; 29 Eyl to 1 Ara = 9.0 weeks; 21 Ara + 80 = 11 Mart, 20 Oca + 80 = 10 Nisan; 50 ppm = 4.32 s/day;
  2 s + 48 h x 50 ppm = 10.64 s. All match the document.

VERDICT: PASS (0 BLOCKER, 4 SPEC)

## Part 1. Status of critic-C9 findings

| # | C9 item | Status | One line |
|---|---|---|---|
| 1 | B1 Android reboot test contradicts edge row | FIXED | Test now scoped "okutmayla aynı açılışta hiç çapa yok"; new test "önce taze çapa, sonra pil bitiyor: zaman belirlenir"; Bölüm 3 scoped and iOS stated. Scenario string still loose: SPEC-1. |
| 2 | SPEC-1 crash marker counts OS kills and reboots | FIXED | Bölüm 5: set on foreground, cleared on background, reboot excluded; Ek F labels it "yaklaşık ölçüm". Mechanism gaps: SPEC-2, SPEC-3. |
| 3 | SPEC-2 typed short code cannot verify P-256 receipt | FIXED | Short code removed from Ek C Makbuz and Ek D; no-camera path is "beyana dayalı". Leftover duplicate sentence: SPEC-4. |
| 4 | SPEC-3 zxing-wasm default jsDelivr fetch | FIXED | Ek D row: WASM served from İÜ server via locateFile and precached by Workbox; jsQR and BarcodeDetector rows added and verified. |
| 5 | SPEC-4 SMS fallback drops identity proof | FIXED | S15 SMS fallback removed; alternative is a class-issued one-time code with hoca approval on every match; Ek D "SMS yalnız hesap kurtarmada, Sonra" no longer conflicts. |

## Part 2. Findings

### SPEC-1. Ek C regression scenario does not by itself produce "no anchor in the same boot"
- Test 1 reads `okutmayla aynı açılışta hiç çapa yok ("çevrimdışı aç, okut, yeniden başlat, sonra senkronla")`. Bölüm 2
  takes an anchor on every online open and in the background task, so a phone that was online earlier in the same
  boot has a pre-scan anchor and a correct implementation determines the time. The label saves it; the quoted steps do not.
- Fix: `("yeniden başlat, çevrimdışı aç, okut, yeniden başlat, sonra senkronla")`.

### SPEC-2. Crash-marker reboot check has no stated iOS mechanism
- Bölüm 5 excludes reboots, but Ek C says "iOS'ta açılış kimliği yok". Workable rule: store the clock module's
  since-boot value with the marker; if the value at next launch is smaller, a reboot happened.
- Fix (Bölüm 5): "Yeniden başlatma, Android'de BOOT_COUNT ile, iOS'ta açılıştan beri geçen sürenin azalmasıyla anlaşılır."

### SPEC-3. The Android camera module must stay inside the React activity or its crashes are invisible
- Inference (not tested here): React Native AppState on Android follows the host activity's pause/resume. If the
  CameraX/zxing-cpp scanner is a separate Activity, AppState goes "background" while scanning, the marker is cleared,
  and crashes in the only new native code (the riskiest part) are not counted in Ek F Kararlılık.
- Fix (Ek C / Ek E camera note): "Kamera modülü ayrı bir Activity değil, uygulama içindeki bir görünüm (view) olarak yazılır."

### SPEC-4. Wording left over from the edits
- Ek A Çökme izleme: "Bunun için yerel kod gerekmez" is now loose, since the reboot check reads BOOT_COUNT / uptime
  from the existing clock module. The two-native-module count stays true. Fix: "Bunun için ek yerel kod gerekmez;
  yeniden başlatma kontrolü mevcut saat modülünü kullanır."
- Ek C Makbuz says "beyana dayalı" twice in consecutive sentences. Fix: "Kamera yoksa ya da imza doğrulanamazsa
  düzeltme "beyana dayalı" sebep koduyla yapılır."

## Part 3. Fixed constraints

- Offline-first: holds. The panel's QR decoder WASM is now self-hosted and precached; revoked-device quarantine,
  unscheduled-start confirmation and found-device review are later panel actions, not needed in class.
- No AKSIS: respected (file import, manual AKSİS sayfası, deadline as an admin field; S15 fallback is a class code,
  not SSO).
- Simplicity: unchanged or better. Short code removed; SMS fallback removed; jsQR / BarcodeDetector are documentation
  rows only. Native code stays in two places.

Sources: registry.npmjs.org/jsqr, /expo-camera, /zxing-wasm (queried 2026-09-29); cdn.jsdelivr.net/npm/@mdn/browser-compat-data
data.json 8.1.3 (saved as `_c10_bcd.json`). Arithmetic checked by inline Python.
