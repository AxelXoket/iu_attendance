# Critic final: r10 vs current (patch12 polish)

VERDICT: PASS

Method: own diff script (scratchpad/cf_diff.py), 12 changed passages (lines 333, 460, 499, 623, 647, 663, 731-732, 735, 779, 885-886, 957). Existing gate check_html.py: PASS on both versions. U+2014 = 0, U+2013 = 0 (also U+2010/2011/2012/2015/2212 = 0). Tag balance clean.

## Verified (no finding)
- expo-camera: npm registry shows 57.0.0 = 2026-06-25, 57.0.5 = 2026-09-11 (latest). Matches research/versions.txt:4.
- BarcodeDetector: MDN BCD shows Chrome desktop "ChromeOS and macOS only", Firefox false, Safari 17 behind "Shape Detection API" preference. Claim correct.
- zxing-wasm README: default serve path is jsDelivr (fastly.jsdelivr.net), override via prepareZXingModule + locateFile. Source link and glossary entry correct. Both new links return 200.
- S15 "öğrenci ve personel" Google Workspace: research/06-iu-specifics.md:105-106 (MX, 2026-09-28). Still marked "çıkarım"; Neden column now matches the question.
- Line 499 "ek yerel kod gerekmez" now agrees with "Yerel kod iki yerde gerekiyor" (saat modülü supplies BOOT_COUNT/uptime) and with "üçüncü bir yerel modül". Removes an r10 contradiction.
- Line 623 regression test: leading "yeniden başlat" guarantees no same-boot anchor before the scan; consistent with the Android anchor rules.
- Line 779 view-not-Activity: correct reason (a separate Activity pauses the RN host, AppState goes background, flag is cleared during scanning).
- Line 647 no-camera path: "Doğrulanamayan her düzeltme beyana dayalı" still covers the rubric item 2 "never sync" row; no contradiction with the Kenar durumlar table.
- Line 663 "Dönem sonu tahmini": wording only. jsQR row still has a dated rejection reason (rubric 1 holds).

## Findings
1. MINOR (line 333): iOS reboot detected only by "uptime azalması". If the phone reboots and the new uptime exceeds the stored one, the reboot is missed and counted as a crash (overcount). Ek F already labels the metric approximate, so not decision-changing; say "yaklaşık" here too.
2. MINOR (line 647): "hocanın kayıtlı telefonu" presumes the hoca registered a phone as a panel device; the doc only implies multi-device panel ("ikinci bir cihaz") and calls panel work desktop work. Suggest "panel hocanın telefonunda da açılıp (kurulabilir PWA)".
3. MINOR (line 732): MDN lists Edge as macOS only; "Chrome ve Edge'de yalnız ChromeOS ve macOS'ta" lumps them. Harmless in practice (no Edge on ChromeOS).
4. MINOR (line 460): "hoca eşleşmeleri toplu onaylar" and "her öğrenci eşleşmesi hoca onayı ister" say the same thing twice; not contradictory. How 150 distinct codes are handed out is unstated, but it is a contingency option already flagged as delaying the pilot.
