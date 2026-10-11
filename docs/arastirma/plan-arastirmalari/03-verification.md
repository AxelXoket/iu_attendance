# 03 - Offline-verifiable check-in: design space and recommendation

Research date: 2026-09-28. Read-only web research. Labels used below:
**[F]** = fact confirmed from a cited source; **[I]** = my inference or design proposal; **[C]** = computed by script (scripts in scratchpad: `qr_sizing.py`, `drift.py`, outputs `qr_sizing.out`, `drift.out`).

Constraints restated: student phone offline at check-in, instructor device may be offline, sync later; GPS unusable; bar is "better than paper"; 150+ students must finish in about a minute; faculty want simple.

---

## 1. Methods compared

| Method | Works fully offline (both sides)? | 150 students | Fraud resistance vs paper | Build cost | Platform / legal risk | Verdict |
|---|---|---|---|---|---|---|
| **Rotating MAC-signed QR on projector + device-signed record** | Yes [I] | Parallel: everyone scans the same screen, ~30-60 s total [I] | Much better: stops static screenshot, "sign for friend", fake QR, old-code replay. Live video relay not stopped | Low-medium | Low. Camera permission only | **MVP** |
| Rotating 6-digit typed code (TOTP-style) | Yes [I] | Parallel, slower (typing) | Better than paper; verifiable later like QR; forwarded in chat within seconds | Low | Low | **Fallback** inside MVP (camera broken, back row) |
| Static PIN / session code | Yes | Fast | Weak: forwarded to group chat instantly. IU Bloomington confirms Top Hat code-sharing misconduct cases [F] | Very low | Low | Reject as sole method |
| BLE: instructor phone advertises rotating token, student app scans in foreground | Yes [I] | Parallel; detection within seconds if both apps foreground [I] | Strong: remote relay needs a live BLE relay too | Medium-high | Medium: BT permission prompts, BT off, iOS advertise restrictions, iPhone 17 background-scan bug report | **Optional strong mode**, combined with QR |
| BLE reverse hub (students push signed records to instructor phone) | Yes | Poor: Android GATT client ~7 concurrent links [F, secondary]; serial 150 x 2-3 s = 5-7.5 min [C] | Same as BLE | High | High | Reject for MVP |
| Near-ultrasonic audio token | Yes in theory | Unreliable in halls | Medium | High | High: Google removed audio from Nearby (Aug 2021) and shut Nearby Messages (Dec 2023) [F]; Chirp SDK closed after Sonos buy (2020) [F]; 2026 study: indoor multipath + device variance break many schemes [F]; mic permission optics | Reject |
| GPS / geofence | Needs fix indoors | Fast | Weak: spoofable; Top Hat radius 500 m [F] | Low | Basement = no fix; location permission; KVKK | Reject (constraint) |
| Wi-Fi SSID/BSSID | No (students not on Wi-Fi) | Fast | Weak | Low | iOS needs precise-location authorization + wifi-info entitlement [F]; Android needs fine location | Reject |
| Instructor scans each student's QR | Yes | Serial 5-12.5 min [C] | Strong (instructor sees face) | Low | Low | Small classes / fallback only |
| NFC tag in room (NTAG 424 DNA SUN) | Yes; tap produces AES-CMAC + counter URL verifiable later [F] | Serial queue at one tag | Medium-strong (room presence) | Medium (hardware per room) | Tag theft/relocation | Labs only, not 150-seat halls |
| NFC phone-as-card (HCE) reverse | No for iOS in Turkey | Serial | - | High | iOS HCE is EEA-only; Turkey not in NFC&SE platform territory list [F] | Reject |
| Wi-Fi Aware (iOS 26) | Yes | No: each peer pair needs DeviceDiscoveryUI/AccessorySetupKit pairing with code [F] | - | High | High | Reject |
| Google Nearby Connections | iOS supports only Wi-Fi LAN medium [F] | - | - | High | Late-2026 change: API no longer auto-enables radios [F] | Reject |
| Face / selfie | Offline match possible | Slow | Strong | High | KVKK: biometric = special category; Board principle decision 2026/921 (29.04.2026, announced 02.06.2026): biometric for time tracking disproportionate even with consent, use card/PIN alternatives [F] | Reject |

---

## 2. Findings by question

### 2.1 Rotating signed QR

- **Payload size drives scan distance, and signature choice drives payload size [C].** Using a conservative 10:1 distance rule calibrated to a version-2 code (module pitch >= distance/250):
  - HMAC-SHA256 truncated to 96 bits: 25 bytes -> QR version 2 (25 modules) as bytes at ECC M, or version 3 (29 modules) as base32 text at ECC M. Needed width at a 20 m back row: 2.0 to 2.32 m without zoom, 1.0 to 1.16 m with 2x digital zoom.
  - Ed25519 or ECDSA P-256 signature (64 B): 77 bytes -> version 4-6 (33-41 modules); 2.64-3.28 m at 20 m. A 150-seat hall projector image is roughly 2-2.5 m tall [I], so the asymmetric-signature QR does not fit for back rows without zoom.
  - Rule source: 10:1 guidance, worse (6:1 to 7:1) for dense codes and poor light [F, qr-code vendor guides, 2026]. Treat these as planning numbers; measure in a real hall in the pilot.
  - **Decision [I]: MAC in the QR, not a public-key signature.** Students cannot verify the QR offline anyway (it does not matter; the server verifies), and a 96-bit MAC is unforgeable in practice (guess p = 2^-96 [C]).
- **Rotation interval is not the limiting factor; the acceptance window is [I].** All 150 scan the same screen in parallel, so rotation speed does not slow the class. A scanner that catches a code mid-change simply records the slot it decoded. 2 to 5 s rotation is fine. A 2023 case study ran two codes per second [F], so sub-second is possible but buys nothing offline.
- **Offline catch: rotation only helps if the server can tell WHEN the student scanned** [I]. The student's wall clock is user-editable. Proposal: at scan the app stores the monotonic clock (Android `SystemClock.elapsedRealtimeNanos`, iOS `mach_continuous_time` / `CLOCK_MONOTONIC`, both count deep sleep [I, verify in implementation]) plus a boot identifier. At sync it sends the current monotonic value; server computes `scan_time = server_now - (mono_now - mono_scan)`. Users cannot change the monotonic clock without rebooting, and a reboot changes the boot id (then fall back to wall clock plus flag).
  - Drift of an undisciplined crystal [C, ppm values assumed]: 50 ppm gives 0.18 s after 1 h, 4.3 s after 1 day, 30 s after 7 days. So the grace window must widen with sync delay, and the app should also send `wall_scan`; if `wall_now - wall_scan` agrees with `mono_now - mono_scan` within tolerance, the wall clock was not manually changed and (being network-synced before the student went underground) is used directly, which avoids drift accumulation.
- **Relay attacks.**
  - Photo forwarded via WhatsApp: a relayed scan decodes slot k but happens noticeably after slot k ended; flagged by the scan-lag rule [I]. Note that in a no-signal basement, the in-room friend often cannot send the photo at all [I].
  - Live video call relay (friend points camera at screen): end-to-end latency is typically a few seconds [I, not measured], inside any usable window. **Not stopped by QR alone.** Stopped by BLE strong mode or deterred by headcount.
  - Recommendation: measure real legitimate scan lag and real WhatsApp-photo relay lag in the pilot and set the grace window from data (p99.9 of legit lag).

### 2.2 Short PIN codes
- Static codes are forwarded to group chats in seconds; Indiana University reports confirmed misconduct with Top Hat codes texted to absent classmates [F]. Top Hat itself had to add geolocation plus Bluetooth peer proximity ("Secure Attendance") on top of its 4-digit code [F].
- A **rotating 6-digit TOTP-style code** (MAC-derived, 20-30 s period) is different: server-verifiable later, same scan-lag check, and brute force is hopeless because each device-signed record is one guess per session (p = 1e-6 [C]). Good fallback for camera failures; weaker than QR only because typing is slower, so the window must be wider.

### 2.3 BLE proximity
- **iOS peripheral (instructor iPhone):** `CBPeripheralManager` advertises only local name and service UUIDs, no manufacturer data [F, Apple docs via secondary]. In background the local name is dropped, UUIDs move to an "overflow" area visible only to iOS scanners explicitly scanning for them, and frequency may drop [F, Apple Core Bluetooth guide]. **So the instructor app must stay foreground; encode the 16-byte rotating token as a 128-bit service UUID** [I].
- **iOS central (student iPhone):** foreground scanning is fine; background scanning coalesces duplicates and slows [F]. A Sept 2025 Apple forum thread reports background scanning stops entirely on iPhone 17 / iOS 26; Apple engineer asked for diagnostics, FB20381425, unresolved as of Feb 2026 [F]. **Design for foreground-only scanning while the check-in screen is open.**
- **Android 12+:** BLUETOOTH_SCAN/ADVERTISE/CONNECT are runtime permissions; `neverForLocation` avoids the location permission but "some BLE beacons are filtered from the scan results" (page updated 2026-09-16) [F]. A react-native-ble-manager issue shows Android 13 dropping an iBeacon-format device via "Skipping data matching denylist" [F, secondary]. **Use a custom service UUID / service-data format, never iBeacon/Eddystone** [I]. Other Android traps: >5 scan starts in 30 s throttles the app; unfiltered scans stop at screen off [F, secondary]. Use a ScanFilter on the service UUID.
- **150-person hall [I]:** one advertiser, many passive scanners, so no connection limits. Bodies absorb 2.4 GHz; use max TX power and place the phone at the front, raised. Vendor Attendance Radar claims ~50 m range and lectures of several hundred students (Tilburg, Antwerp, IESE etc., article May 2026) [F, vendor claim, unverified].
- **Reverse hub** (instructor phone collects signed records over BLE): Android GATT concurrent connections are commonly capped at 7 (BTA_GATTC_CONN_MAX) [F, secondary]; 150 serial connect-write-disconnect cycles take minutes [C]. Only benefit is a live offline count. Not worth it for MVP.

### 2.4 Near-ultrasonic audio
Google Nearby Messages dropped ultrasonic on Android from 1 Aug 2021 and the whole API stopped Dec 2023 [F]. Chirp (main commercial SDK) was bought by Sonos in Feb 2020 and SDK downloads closed [F]. Putz et al., arXiv 2602.02249 (Feb 2026): 11,000+ smartphone transmissions; "many existing schemes face challenges in practical usage, largely due to severe multipath propagation indoors and varying audio characteristics across device models" [F]. Add microphone-permission optics. Reject.

### 2.5 Other methods
- **Instructor scans student QR:** strong but serial, 5-12.5 min for 150 [C]. Keep as manual fallback / small sections.
- **NFC:** NTAG 424 DNA SUN gives a per-tap AES-CMAC plus counter that a server can check later and reject replays [F, NXP]. Good for labs; one tag = queue in big halls. iOS HCE (phone as card) is not available in Turkey [F].
- **Wi-Fi SSID/BSSID:** students are not on Wi-Fi (constraint); reading SSID/BSSID requires precise location on iOS [F]; reject.
- **Face/selfie:** KVKK Board principle decision 2026/921 (29.04.2026) says biometric time tracking violates proportionality even with explicit consent and points to card/PIN alternatives [F]. Student-university power imbalance is analogous [I, escalate to legal]. Reject.
- **IMEI binding** (used by Nwabuwe et al., IJACSA 14(4) 2023) is impossible for store apps on Android 10+ (needs READ_PRIVILEGED_PHONE_STATE) [F]. Use hardware keys instead.

### 2.6 Device binding and integrity
- iOS Secure Enclave keys are P-256 only (no Ed25519) [F] -> use **ECDSA P-256 on both platforms** [I].
- **App Attest:** `attestKey` needs Apple's servers (online, do it at enrollment); `generateAssertion` is on-device and works offline [F]. Assertion carries a counter the server checks for monotonic increase [I, verify against Apple validation docs]. Use the attested key to sign each check-in record.
- **Android key attestation:** generate a Keystore (StrongBox if present) P-256 key with the server's challenge at enrollment; verify the chain server-side. Since Feb 2026 RKP devices chain to a new ECDSA P-384 Google root, exclusively from 10 Apr 2026; servers must trust both old RSA and new root [F]. Keybox-spoofing modules (Tricky Store) exist [F, XDA] so attestation raises the bar, not a wall.
- **Play Integrity** requires network [F] -> call it at enrollment and at every sync (sync is online by definition), binding `requestHash` to the uploaded batch [I].
- **Trusted time:** the slot number in the instructor's MAC-protected QR is the only trusted time at scan; student time is reconstructed as in 2.1 [I].

### 2.7 Headcount reconciliation
Instructor (offline) types a head count at session end (or a TA does). Server compares accepted check-ins with the count; excess beyond max(3, 5%) flags the session and orders the list by risk signals [I]. Cheap, human-verifiable, and the main answer to "one student carries two phones" and video relay. Announcing that counts are reconciled is itself the deterrent [I].

### 2.8 Real deployments and papers
- Turkish universities moved to QR attendance in 2025-26 (Firat Univ. portal; Duzce Univ. from Spring 2025-26 via projector QR; Istanbul Ticaret "Ticaretliyiz" app) [F]. Press (Yeni Safak, 4 Dec 2025) describes dynamic timed QR + GPS + device binding [F]. Cumhuriyet (10 Jan 2026): privacy criticism of third-party trackers (Google analytics, device ID, IP) in such an app [F]. **Lesson: no third-party analytics SDKs, clear KVKK notice.**
- Top Hat: 4-digit code + geolocation + Bluetooth peer proximity; IU: works "in most classrooms", confirmed misconduct cases; UW-Madison: "it can take several class sessions" to get student settings working [F].
- SpotterEDU: fixed BLE beacons in ~40 US schools; Washington Post Dec 2019 framed it as surveillance [F]. Lesson: instructor-started, session-only, no passive tracking.
- Nwabuwe et al. 2023 (IJACSA 14(4), Nottingham Trent): dynamic QR + geofence + IMEI [F]; IMEI part is obsolete.
- "Enhancing attendance tracking using animated QR codes" (2023): 2 codes/s [F, abstract only].

---

## 3. Threat list (MVP = rotating QR + signed record + device binding + headcount; S = strong mode adds BLE + user-presence)

| # | Attack | MVP | S |
|---|---|---|---|
| T1 | Friend signs/checks in for absent student using absent student's account on friend's own phone | Stopped: device binding (one active key per student, rebind online + cooldown + flag) | Stopped |
| T2 | Screenshot/photo of QR forwarded to group chat | Mostly stopped: scan-lag flag; often no signal in basement anyway | Stopped (no BLE token) |
| T3 | Live video-call relay of the QR | **Not stopped**; deterred by headcount | Stopped (BLE token missing) unless attacker also relays BLE live |
| T4 | Forged QR / guessed code | Stopped (96-bit MAC) | Stopped |
| T5 | Replay of an old week's QR | Stopped (session id + instructor session record) | Stopped |
| T6 | Edit phone clock to fake scan time | Stopped/flagged (monotonic + boot id + wall/mono consistency) | Same |
| T7 | Present student carries absent friend's phone and scans twice | **Not stopped**; headcount flag | Harder: per-scan device passcode/biometric (local OS auth) means friend must know passcode |
| T8 | Emulator / modified app fabricating records | Mostly stopped (App Attest / key attestation + Play Integrity at sync) | Same |
| T9 | Rooted phone with keybox spoofing + custom app | Not stopped | Not stopped |
| T10 | Two student accounts on one phone | Flagged (IDFV / ANDROID_ID hash shared) | Same |
| T11 | Scan then leave early | Not stopped (paper neither) | Optional second random scan |
| T12 | Late upload of fabricated records | Stopped: records signed at scan, counter, sync deadline | Same |
| T13 | Phone dead / no smartphone | Not an attack; instructor manual add with reason, audited | Same |

---

## 4. Recommendation

**MVP: rotating MAC-QR on the projector, device-bound signed check-in stored offline, sync later, headcount reconciliation, 6-digit rotating code as fallback.** One camera permission, no location, no Bluetooth, no mic. Parallel scanning fits 150+ in about a minute.

**Optional strong mode (per course):** instructor phone also advertises a rotating BLE token; student app records it during the same scan; optional per-scan device unlock (user presence). Failure to see BLE downgrades to "flag", never auto-reject, because BT-off and permission denials will happen.

### 4.1 Protocol sketch [I]

**Enrollment (online, once per device)**
1. Student signs in with university SSO. App generates P-256 key (iOS: App Attest key via `generateKey` + `attestKey(challenge)`; fallback Secure Enclave key flagged `unattested`. Android: Keystore/StrongBox key with `setAttestationChallenge`) and gets a Play Integrity verdict.
2. Server verifies attestation (Apple App Attest root; Google legacy RSA + new ECDSA P-384 roots; package name + signing cert digest; security level TEE/StrongBox; verified boot), stores `{student_id, key_id, pubkey, platform, device_hash = H(IDFV or ANDROID_ID)}`. Policy: one active key per student; rebind needs SSO, is logged, has a cooldown, flags check-ins for N days; one student per device_hash.
3. Instructor device enrollment: server issues a 256-bit `K_i` over TLS, stored non-exportable (Keychain ThisDeviceOnly / Keystore import; for a laptop web app, non-extractable WebCrypto HMAC key). Course sections cached.

**Session (instructor, offline OK)**
- `session_id` = 8 random bytes; `K_s = HKDF-SHA256(K_i, info = "iua/v1/session" || session_id)`.
- Session header stored for later sync: `{v, session_id, instructor_id, section_id, duration_s, T, start_wall, start_mono, boot_id, headcount (entered at end)}`, MACed with `K_i`.
- Every T seconds (default 3-5 s): `slot = floor((mono_now - start_mono) / T)`.
- QR = `"IUA1:" + base32( v(1) | session_id(8) | slot(4) | trunc96(HMAC-SHA256(K_s, "qr" | v | session_id | slot)) )` -> 25 bytes, QR version 3 at ECC M.
- Fallback code shown under the QR: 6 digits = `HOTP(K_s, "pin" | floor(elapsed / 30 s))`.
- Strong mode BLE: 128-bit service UUID = `trunc128(HMAC(K_s, "ble" | slot))`, foreground, max TX power, custom format (no iBeacon/Eddystone).

**Check-in record (student, offline)**
```
rec = { v, student_id, key_id, section_hint, qr_raw | pin_raw,
        scan_wall, scan_mono, boot_id, app_version, local_seq,
        ble_obs: [ {uuid, rssi, mono} ] (strong mode, optional) }
sig = iOS: App Attest assertion over SHA256(canonical(rec))
      Android: ECDSA-P256(Keystore key, canonical(rec))
```
App keeps the first record per session, shows a large "Kaydedildi, senkron bekliyor" screen, queues in encrypted local storage, retries sync whenever online.

**Sync (online)** upload `{records[], now_wall, now_mono, boot_id, integrity_token(requestHash = H(batch))}`. Instructor device syncs the session header the same way.

**Server rules**
- REJECT: bad signature; unknown/revoked key; key not bound to `student_id` at scan time; MAC or PIN invalid; slot outside `[0, duration/T + 1]`; App Attest counter not increasing / duplicate record; student not on the section roster; record arrives after the sync deadline (proposal: 7 days after session end); instructor header never arrives by the deadline (records expire).
- ACCEPT: all checks pass, `scan_time` reconstructed with reliable clock, `slot_start - 2 s <= scan_time <= slot_start + T + grace` where `grace = g0 + 50 ppm x sync_delay` (g0 from pilot, start at 8-10 s), integrity OK, and (strong mode) a BLE token within +/-2 slots.
- FLAG (instructor reviews; default counted present only after approval): scan lag beyond grace; clock unreliable (reboot, wall/mono mismatch); failed/absent integrity verdict; shared device_hash; recent rebind; strong mode BLE missing; session over headcount by more than max(3, 5%) flags the whole session, list sorted by risk.
- Holding state: records for a session whose header has not synced stay PENDING, not rejected, until the deadline.

**Evidence / measurement [I]:** log per session: accepted, flagged, rejected counts, lag histogram, headcount delta. Pilot target: >=98% of present students accepted without flags; median check-in time under 60 s for 150 students.

---

## 5. Open items to escalate

1. **KVKK/legal:** confirm that local OS biometric unlock (strong mode) is not controller-side biometric processing; draft aydinlatma metni; decide retention of device_hash and flags. (Privacy decision: main conversation.)
2. **Policy:** sync deadline (7 days proposed), whether FLAG counts as present by default, rebind cooldown length.
3. **Pilot measurements needed before fixing numbers:** QR readability at back row of a real 150-seat hall, legit scan lag, WhatsApp relay lag, BLE detection rate in a full hall.
4. Verify in implementation: iOS monotonic clock that includes sleep and boot-session id API; App Attest counter semantics; Android BOOT_COUNT availability.

---

## Sources (accessed 2026-09-28)

- Android Bluetooth permissions (updated 2026-09-16): https://developer.android.com/develop/connectivity/bluetooth/bt-permissions
- Apple Core Bluetooth background processing: https://developer.apple.com/library/archive/documentation/NetworkingInternetWeb/Conceptual/CoreBluetooth_concepts/CoreBluetoothBackgroundProcessingForIOSApps/PerformingTasksWhileYourAppIsInTheBackground.html
- Apple peripheral best practices (28 B adv limit): https://developer.apple.com/library/archive/documentation/NetworkingInternetWeb/Conceptual/CoreBluetooth_concepts/BestPracticesForSettingUpYourIOSDeviceAsAPeripheral/BestPracticesForSettingUpYourIOSDeviceAsAPeripheral.html
- iOS peripheral supported keys (secondary): https://medium.com/@kakshata12/creating-ios-application-as-bluetooth-peripheral-669404230232 ; https://developer.apple.com/forums/thread/775252
- iPhone 17 / iOS 26 background scan thread (Sep 2025 - Feb 2026): https://developer.apple.com/forums/thread/801723
- Android denylist filtering iBeacon (secondary): https://github.com/innoveit/react-native-ble-manager/issues/1141
- Android scan throttling (secondary): https://punchthrough.com/ble-scan-returns-no-results-on-android/
- Android GATT connection limit (secondary): https://devzone.nordicsemi.com/f/nordic-q-a/63409/ble-multi-link-connection---maximum-devices
- Nearby Messages overview (audio removed 2021, shutdown Dec 2023): https://developers.google.com/nearby/messages/overview
- Nearby Connections change, Android Developers Blog, Jul 2026: https://android-developers.googleblog.com/2026/07/upcoming-changes-nearby-connections-api.html ; iOS medium limits: https://github.com/google/nearby/discussions/2447
- Chirp acquired by Sonos (Feb 2020): https://audioxpress.com/news/data-over-sound-pioneer-chirp-acquired-by-sonos ; https://en.wikipedia.org/wiki/Chirp_(company)
- Putz et al., acoustic data transmission evaluation, arXiv 2602.02249 (Feb 2026): https://arxiv.org/abs/2602.02249
- Wi-Fi Aware iOS 26 pairing: https://developer.apple.com/videos/play/wwdc2025/228 ; https://developer.apple.com/forums/thread/792143 ; https://www.macrumors.com/2025/06/21/ios-26-adding-two-new-wi-fi-features/
- Apple NFC & SE platform territories / HCE: https://developer.apple.com/support/nfc-se-platform ; https://www.gi-de.com/en/spotlight/financial-platforms/beyond-apple-pay-navigating-the-nfc-shift
- NXP NTAG 424 DNA: https://www.nxp.com/products/rfid-nfc/nfc-hf/ntag-for-tags-and-labels/ntag-424-dna-424-dna-tagtamper-advanced-security-and-privacy-for-trusted-iot-applications:NTAG424DNA
- NEHotspotNetwork requirements: https://seacode.uk/swift/wifi-ssid-bssid ; https://developer.apple.com/forums/thread/679038
- App Attest (attestKey online, assertions on-device): https://developer.apple.com/videos/play/wwdc2021/10244/ ; https://developer.apple.com/documentation/devicecheck/dcappattestservice/attestkey(_:clientdatahash:completionhandler:)
- Secure Enclave P-256 only: https://developer.apple.com/documentation/cryptokit/secureenclave/p256
- Play Integrity standard request: https://developer.android.com/google/play/integrity/standard
- Android key attestation root rotation 2026: https://bayton.org/android/android-enterprise-faq/key-attestation-root-certificate-change/ ; https://protectt.ai/blog/android-key-attestation-root-certificate-rotation
- Android 10 device identifier restrictions: https://developer.android.com/about/versions/10/privacy/changes
- KVKK principle decision 2026/921 (announced 2026-06-02): https://www.kvkk.gov.tr/Icerik/8762/mesai-takibi-amaciyla-biyometrik-veri-islenmesi-hakkinda-kisisel-verileri-koruma-kurulunun-29-04-2026-tarihli-ve-2026-921-sayili-ilke-kararina-iliskin-kamuoyu-duyurusu
- Top Hat at IU: https://citl.indiana.edu/teaching-resources/academic-integrity/tophat-attendance/index.html ; UW-Madison KB: https://kb.wisc.edu/luwmad/121311
- SpotterEDU (WaPo, Dec 2019, mirror): https://www.seattletimes.com/business/colleges-are-turning-students-phones-into-surveillance-machines-tracking-the-locations-of-hundreds-of-thousands/
- Attendance Radar (vendor, May 2026): https://attendanceradar.com/bluetooth-attendance-tracking-for-universities/
- Nwabuwe et al. 2023, IJACSA 14(4), DOI 10.14569/IJACSA.2023.01404104: https://thesai.org/Downloads/Volume14No4/Paper_104-Fraud_Mitigation_in_Attendance_Monitoring_Systems.pdf
- Animated QR case study 2023: https://www.researchgate.net/publication/373589946_Enhancing_attendance_tracking_using_animated_QR_codes_a_case_study
- Turkish deployments: https://qr.firat.edu.tr/ ; https://ef.duzce.edu.tr/duyuru/ebfe/qr-kodlu-yoklama-sistemi-hakkinda ; https://www.yenisafak.com/gundem/universitelerde-yeni-donem-resmen-basladi-yerime-imza-at-devri-sona-erdi-4775250 (2025-12-04) ; https://www.cumhuriyet.com.tr/turkiye/universitelerde-imza-yerine-qr-kodlu-yoklama-uygulamasi-yeni-bir-tartismayi-baslatti-dijital-mahremiyet-2468711 (2026-01-10) ; https://apps.apple.com/tr/app/ticaretliyiz/id6752892767?l=tr
- QR size rule: https://www.qr-code-generator.com/blog/minimum-qr-code-size/ ; https://linkbreakers.com/help/article/qr-code-size-and-print-dimension-benchmarks
