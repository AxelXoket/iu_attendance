# 01 Framework choice: IU attendance app (Android + iOS + instructor web panel)

Research date: 2026-09-28. Read-only web research. All version numbers and dates below were
pulled by script from the registries (npm, pub.dev, GitHub API) on 2026-09-28, raw output in:

- `scratchpad/research/versions.txt`, `versions2.txt`, `versions3.txt`
- scripts: `scratchpad/research/versions.mjs`, `versions2.mjs`, `versions3.mjs`

Legend: **[V]** verified against a primary source today. **[I]** inference or judgment.

---

## 1. Verdict

| Rank | Stack | One-line reason |
|---|---|---|
| **Winner** | **Expo (React Native, New Architecture only) in a TypeScript monorepo, with a separate React web panel** | Only option where a solo student on Windows can build, test on a real iPhone and ship iOS without owning a Mac; one language across mobile, web panel and backend; every device capability this app needs is a first-party Expo module released in lockstep with the SDK. |
| **Second** | **Flutter 3.47** (web panel either Flutter web or a separate React app) | Equal or better on the pure mobile side (drift is the best offline DB of the lot, Turkish job market roughly 3:1 in its favour). Loses on: iOS dev loop needs a Mac, Excel tooling in Dart is weak, and a good web panel still pushes you to a second language. Pick Flutter instead if the student already knows Dart or has a Mac. |
| Rejected | Kotlin / Compose Multiplatform 1.12 | Web target still Beta; QR, secure storage and push rely on small community libs (hundreds of stars); iOS needs a Mac; steepest learning curve (Gradle, Kotlin/Native, Xcode interop). |
| Rejected | Capacitor 8.5 (Ionic) | Genuinely one codebase for app + web panel, but WebView UI, key plugins (SQLite, secure storage, BLE) are community-maintained, and Ionic's commercial build service Appflow stops new sales (Feb 2025) and sunsets 2027-12-31. Viable plan B, not the best plan A. |
| Rejected | .NET MAUI 10, NativeScript 9 | Small mobile plugin ecosystems for QR/BLE/offline, low Turkish student uptake; MAUI repo has 4,070 open issues. Not evaluated deeper. |
| Not evaluated | Lynx, Valdi and other 2025/26 newcomers | Too young for a university pilot that must run for years with a solo maintainer. [I] |

**Confidence: medium (about 65 percent).** The mobile capability gap between Expo and Flutter is
small; the decision is driven by (a) no Mac, (b) the web panel and Excel work, (c) one language.
If the student already writes Dart comfortably, Flutter is the better choice and confidence flips.
That single fact should be asked before committing.

---

## 2. Framework versions and release cadence [V]

| Framework | Current stable | Released | Next | Source |
|---|---|---|---|---|
| Flutter | 3.47 (Dart 3.11+ constraint) | 2026-08-12 | 3.50 planned Nov 2026 | https://docs.flutter.dev/release/release-notes , https://flutter.dev/blog/whats-new-in-flutter-3-47 , schedule on https://docs.flutter.dev/install/archive |
| React Native | 0.87.1 | 2026-08-26 | 0.88 RC (in Expo SDK 58 beta) | npm registry; https://expo.dev/changelog/sdk-58-beta |
| Expo SDK | 57 (expo 57.0.25 published 2026-09-24), RN 0.86, React 19.2 | SDK 57 released 2026-06-30 | SDK 58 beta 2026-09-15 (RN 0.88 RC) | https://expo.dev/changelog , https://expo.dev/changelog/sdk-57 |
| Compose Multiplatform | 1.12.1 | 2026-09-22 | 1.13.0-alpha01 (2026-09-10) | GitHub releases API |
| Kotlin | 2.4.20 | 2026-09-07 | | GitHub releases API |
| Capacitor | 8.5.2 | 2026-09-11 | | npm / GitHub |

Notes:
- React Native 0.82 (Oct 2025) removed the Legacy Architecture; `newArchEnabled=false` is ignored. Every RN library you pick must support the New Architecture. https://reactnative.dev/blog/2025/10/08/react-native-0.82 [V]
- Expo SDK 56 (2026-05-21): Hermes v1 default, Expo UI (Jetpack Compose / SwiftUI APIs) stable. https://expo.dev/changelog/sdk-56 [V via search summary]
- Expo SDK 57 announced it is "exploring a new SDK release cadence" with non-breaking upgrades between majors. [V]
- Expo Go requires login since 2026-09-03 (changelog). Irrelevant in practice: this app needs a dev build anyway (custom native modules). [V]
- Compose Multiplatform stability table (kotlinlang docs): Android, iOS, Desktop **Stable**; Web (Kotlin/Wasm) **Beta**. https://kotlinlang.org/docs/multiplatform/supported-platforms.html [V]
- Flutter 3.47 removed iOS 14/15 availability checks in the embedder (release notes PR #188189). Minimum iOS version should be confirmed before launch; old student iPhones matter. [V for the PR, I for impact]

---

## 3. Library maturity for THIS app's feature list [V unless marked]

Downloads: npm = last 30 days (2026-08-29 to 2026-09-27); pub.dev = `downloadCount30Days`.

### 3.1 QR scanning (camera)

| Stack | Library | Version | Last release | Adoption |
|---|---|---|---|---|
| Expo | `expo-camera` (built-in barcode/QR: `onBarcodeScanned`) | 57.0.5 | 2026-09-11 | 8.28M dl/mo |
| RN | `react-native-vision-camera` | 5.2.3 | 2026-08-20 | 2.13M dl/mo, 9.6k stars |
| Flutter | `mobile_scanner` (ML Kit on Android, Apple Vision on iOS, ZXing on web) | 7.4.2 | 2026-09-14 | 1.57M dl/30d, 2,302 likes, 160/160 pts |
| CMP | QRKit / Kamera / EasyQRScan | EasyQRScan 0.7.2 (2026-08-11) | | 378 / 579 / 152 stars |
| Capacitor | `@capacitor-mlkit/barcode-scanning` | 8.2.1 | 2026-09-10 | 507k dl/mo |

Verdict: Expo and Flutter both solved. CMP is the weak one.
Rotating-QR **display** is trivial everywhere (`react-native-qrcode-svg` / `qr_flutter`; note `qr_flutter` last release 2023-05-14, stable but unmaintained [V]).

### 3.2 BLE (optional, phase 2)

| Stack | Central (scan) | Peripheral (advertise, needed if instructor phone is the beacon) |
|---|---|---|
| RN | `react-native-ble-plx` 3.5.1, 2026-02-18, 759k dl/mo; `react-native-ble-manager` 12.5.3, 2026-09-21, 395k dl/mo | Weak: `munim-bluetooth-peripheral` 0.4.4 (728 dl/mo), `react-native-multi-ble-peripheral` 0.1.8 (1k dl/mo), `react-native-ble-advertiser` last 2022 |
| Flutter | `flutter_blue_plus` 2.3.13, 2026-09-22, 239k dl/30d; `universal_ble` 2.3.0, 2026-09-07, BSD | `flutter_ble_peripheral` 3.1.0 (2026-09-03, 3.7k dl/30d); `bluetooth_low_energy` 6.2.1 (2026-01-17, 11k dl/30d) |
| CMP | Kable 0.45.0, 2026-09-15, 1.2k stars (good) | none mature |
| Capacitor | `@capacitor-community/bluetooth-le` 8.3.0, 2026-08-13 | none mature |

**Licence trap [V]:** `flutter_blue_plus` is no longer BSD. Its custom licence says "Use of the Software by any for-profit organization requires a commercial license" and it includes build-time telemetry. "Accredited educational institutions are exempt." IU is exempt, but a contractor or spin-off would not be. Prefer `universal_ble` (BSD) if Flutter is chosen. https://pub.dev/packages/flutter_blue_plus/license
Verdict: BLE advertising from a phone is weak in every cross-platform stack, and iOS restricts advertising payloads and background advertising regardless of stack [I, OS-level]. If BLE is ever needed, plan a small native module (Expo Modules API makes this a Swift/Kotlin file pair). Do not let BLE drive the framework choice.

### 3.3 Secure key storage (Keystore / Secure Enclave-backed Keychain)

| Stack | Library | Version | Last release | Adoption |
|---|---|---|---|---|
| Expo | `expo-secure-store` | 57.0.4 | 2026-09-11 | 21.96M dl/mo; SDK 58 adds Android `requireConfirmation` for authenticated reads/writes |
| RN | `react-native-keychain` | 10.0.0 | 2025-03-23 (18 months old) | |
| Flutter | `flutter_secure_storage` | 11.2.0 | 2026-09-16 | 4.5M dl/30d, 4,490 likes |
| CMP | KVault / KSafe / multiplatform-settings | KVault stars 317, KSafe 332 | Maven index unreliable (see 7) | small |
| Capacitor | `@aparajita/capacitor-secure-storage` | 8.0.1 | 2026-09-23 | 857k dl/mo |

Note [I]: none of these store a non-exportable asymmetric key; they store secrets in Keychain/Keystore-encrypted storage. If the design needs a device-bound signing key (private key never leaves Secure Enclave/StrongBox), that is a small native module in any stack (or `react-native-quick-crypto` 1.1.7, 2026-08-15, for software crypto). Same cost across stacks.

### 3.4 Offline local DB + sync queue

| Stack | Library | Version | Last release | Adoption | Comment |
|---|---|---|---|---|---|
| Expo | `expo-sqlite` + `drizzle-orm` | 57.0.3 / 0.45.3 | 2026-09-11 / 2026-09-21 | 4.67M dl/mo | Drizzle: native driver, migrations bundled into the app, live queries. https://orm.drizzle.team/docs/connect-expo-sqlite |
| RN | `@op-engineering/op-sqlite` | 18.2.5 | 2026-09-20 | 2.11M dl/mo, 9 open issues | fastest SQLite binding; also Drizzle-supported |
| RN | `@nozbe/watermelondb` | 0.28.0 | **2025-04-07** (17 months) | 256k dl/mo, 304 open issues | **Reject for a new project**: slow release cadence, pre-1.0 |
| Flutter | `drift` | 2.35.0 | 2026-09-09 | 1.35M dl/30d, 2,478 likes | best-in-class typed SQL, migrations, streams |
| CMP | SQLDelight 2.4.0 / Room KMP | 2026-09-18 | 6.9k stars | good |
| Any | PowerSync (managed sync) | RN 2.3.0 / Dart 2.4.0 | 2026-09-21 / 2026-09-02 | | option if a hosted sync engine is wanted |

Note: SDK 58 beta removes libSQL support from `expo-sqlite` (`syncLibSQL()` gone). Do not build sync on it. [V]
Verdict [I]: for this app the sync is simple (append-only check-in records, idempotent upload by client-generated UUID). A hand-written outbox table is enough on any stack. drift is a notch nicer than Drizzle, not a decisive gap.

### 3.5 Push notifications

| Stack | Library | Version | Last release |
|---|---|---|---|
| Expo | `expo-notifications` (+ free Expo Push service over FCM/APNs) | 57.0.21 | 2026-09-24, 16.9M dl/mo |
| RN | `@react-native-firebase/messaging` | 26.4.0 | 2026-09-05 |
| Flutter | `firebase_messaging` | 16.7.0 | 2026-09-14, 3.44M dl/30d |
| Flutter | `flutter_local_notifications` | 22.3.1 | 2026-09-13 |
| CMP | KMPNotifier | 663 stars | |
| Capacitor | `@capacitor/push-notifications` | 8.1.2 | 2026-07-15 |

Design implication [I]: "session started" and "closing soon" pushes will not reach phones in a basement with no signal and no Wi-Fi. Push is a convenience, never part of the check-in path. The 70 percent threshold alert is a server-side scheduled job; it is stack-independent.

### 3.6 Background limits [I, OS-level, same for every stack]

- iOS BGTaskScheduler and Android WorkManager give opportunistic, not guaranteed, execution. The check-in itself happens with the app in the foreground (camera open), so the record is written to the local DB immediately. Sync should run on app foreground, on connectivity change, and opportunistically in the background.
- Libraries: Expo `expo-background-task` 57.0.20 (2026-09-24, 1.2M dl/mo) [V]; Flutter `workmanager` 0.10.10 (2026-09-07) [V].

### 3.7 File picking and Excel/PDF

| Need | Expo / TypeScript | Flutter / Dart |
|---|---|---|
| File picker | `expo-document-picker` 57.0.2 (2026-09-11) | `file_picker` 13.1.0 (2026-09-15) |
| Read Excel roster | `read-excel-file` 9.3.10 (2026-08-10, 7.5M dl/mo); SheetJS CE only from cdn.sheetjs.com | `excel` 4.0.6 **last release 2024-08-20**; `excel_plus` 2.24.0 (new, 66 likes); `syncfusion_flutter_xlsio` (commercial licence, free community licence has revenue limits) |
| Write Excel report | `write-excel-file` 4.1.1 (2026-06-08, 3.3M dl/mo) | same as above |
| PDF | browser print / server-side; `expo-print` 57.0.2 | `pdf` 3.13.1 + `printing` 5.15.1 (2026-09-19), excellent |

**Security trap [V]:** `xlsx` on npm is frozen at 0.18.5 (2022-03-24) and carries CVE-2023-30533 (prototype pollution) and CVE-2024-22363 (ReDoS). Fixed builds exist only on cdn.sheetjs.com. Never `npm install xlsx`. https://cdn.sheetjs.com/advisories/CVE-2023-30533 , https://cdn.sheetjs.com/advisories/CVE-2024-22363
Verdict [I]: roster import and report export are desktop tasks on the web panel. TypeScript's Excel tooling is clearly stronger than Dart's.

---

## 4. Web target: can one codebase serve the instructor panel?

| Stack | Web output | Fit for an instructor panel (tables, Excel upload, export, print, copy/paste) |
|---|---|---|
| Flutter web | Canvas rendering (CanvasKit / skwasm on Wasm). DOM has no real text. | Works for logged-in dashboards [V, secondary sources: https://amgres.com/blog/flutter-web-webassembly-wasm-2026-guide ]. Weaker for dense data tables, native text selection, browser find, print, accessibility, first-load size. [I] |
| Expo web | react-native-web renders real DOM; Expo Router file routes with static rendering; `"use dom"` components embed plain React DOM. https://docs.expo.dev/guides/dom-components/ | Usable. But the phone UI (big buttons, camera) and the panel UI (tables, filters) share almost no screens. [I] |
| CMP web | Kotlin/Wasm canvas, **Beta** | Not for production university software now. |
| Capacitor | It is a web app | Best single-codebase fit, at the cost of WebView mobile UX. |

**Recommendation [I]:** build the panel as a **separate web app** (Vite + React, or Next.js) in the **same TypeScript monorepo** as the Expo app, sharing a `packages/core` (types, zod schemas, sync protocol, QR token verification, Excel column mapping). The student and instructor apps share logic, not screens. With Flutter this sharing is impossible unless the panel is also Flutter web, which is the weaker web option. This is the strongest single argument for Expo.

---

## 5. Build, distribution, dev loop

| Item | Expo | Flutter | CMP |
|---|---|---|---|
| iOS build without a Mac | **Yes**: "iOS builds run on macOS runners hosted in Expo's macOS cloud" https://docs.expo.dev/build/introduction/ [V] | No locally: Flutter iOS setup requires Xcode on macOS https://docs.flutter.dev/platform-integration/ios/setup [V]. Cloud CI (Codemagic) can build, but day-to-day iOS debugging needs a Mac. | Needs Xcode on macOS |
| Dev on a real iPhone from Windows | Yes: EAS-built dev client + Metro on Windows, Fast Refresh over LAN [I, standard Expo workflow] | No | No |
| Free CI tier | EAS Free: 15 Android + 15 iOS builds/month, low-priority queue; OTA updates to 1K MAU; Starter $19/mo. https://expo.dev/pricing [V] | Codemagic: 500 free M2 macOS minutes/month, then $0.10/min, not for Teams https://docs.codemagic.io/billing/pricing/ [V via search summary] | Codemagic / GitHub Actions |
| OTA JS updates | EAS Update (store-policy compliant JS-only updates) | Shorebird (third-party, paid tiers) | none |
| Store submit | EAS Submit | Fastlane / Codemagic | Fastlane |
| Hot reload | Fast Refresh | Stateful hot reload, also on web since 3.35 (Aug 2025) [V] | Compose Hot Reload (desktop-first) [I] |

Apple Developer Program fee applies to every stack. Worth checking whether IU already has an institutional Apple/Google developer account so the app is published under the university, not the student [I].

OTA matters here [I]: a pilot will surface bugs during term; pushing a JS fix the same day without store review is a real operational advantage for a solo maintainer.

---

## 6. Hiring, community, learning curve

- **LinkedIn job counts for Türkiye, 2026-09-28, quoted keywords, geoId 102105699 [V, but LinkedIn counts are noisy]:** "Flutter" 561, "React Native" 180. Same query for "Kotlin Multiplatform" returned 834 and "Compose Multiplatform" 5,000+, which is clearly fuzzy matching noise, so KMP counts are unusable. The Flutter to RN ratio (about 3:1) is plausible and consistent with the general impression that Flutter is the dominant cross-platform choice in Turkey. [I]
- Stack Overflow 2025 survey (secondary summary, not verified on the primary page): React Native 14.51 percent vs Flutter 13.55 percent usage, near parity globally.
- React/TypeScript web skills are ubiquitous among Turkish CS students and needed anyway for the web panel [I]. A second helper who knows React can contribute to both the panel and the app.
- Learning curve for a student [I]: Dart and Flutter are easy to pick up and very consistent; TypeScript + React is equally approachable and transfers to the web panel and the backend. KMP requires Kotlin, Gradle, Kotlin/Native and Swift interop, the steepest by far.
- Ecosystem scale [V]: react-native 49.1M npm dl/mo, expo 34.2M dl/mo, flutter/flutter 179k GitHub stars, facebook/react-native 127k stars, compose-multiplatform 19.4k stars.

---

## 7. Scorecard for this app [I]

Scale 1 to 5. Weights reflect this project (solo student on Windows, web panel essential, offline QR core).

| Criterion (weight) | Expo | Flutter | CMP | Capacitor |
|---|---|---|---|---|
| QR scan maturity (3) | 5 | 5 | 3 | 4 |
| Secure storage (2) | 5 | 5 | 3 | 4 |
| Offline DB (3) | 4 | 5 | 4 | 3 |
| Push (2) | 5 | 5 | 3 | 4 |
| BLE incl. peripheral (1) | 3 | 3.5 | 3 | 2 |
| Web panel story (3) | 5 (shared TS, separate React panel) | 3 | 2 | 5 |
| Excel / report tooling (2) | 5 | 3 | 2 | 5 |
| No-Mac iOS build + device dev loop (3) | 5 | 2 | 1 | 2 |
| OTA fixes (1) | 5 | 3 | 1 | 3 |
| Turkish hiring / community (2) | 3 | 5 | 2 | 3 |
| Learning curve (2) | 4 | 4 | 2 | 5 |
| Native UX quality (1) | 5 | 5 | 5 | 3 |
| **Weighted total (max 125)** | **114** | **100.5** | **63** | **92** |

Totals computed by script (node one-liner over the weights and scores above), not by hand.
The scores are a judgment aid, not a measurement. Removing the "no Mac" row (if the student owns a Mac) leaves Expo 99, Flutter 94.5: close enough that prior skill decides.

---

## 8. Risks of the recommendation

1. **Expo SDK churn.** A major SDK every few months; RN 0.82+ is New Architecture only. Mitigation: stay one SDK behind latest, only use Expo first-party modules plus well-maintained New-Arch libs, pin versions. [I]
2. **EAS free tier limits.** 15 iOS builds/month and 1K OTA MAU. A one-department pilot fits; campus-wide rollout may need Starter ($19/mo) or self-hosted builds via `eas build --local` on a Mac. [V pricing, I impact]
3. **BLE peripheral.** Weak in RN; would need a custom Expo native module. Keep BLE out of v1. [V ecosystem, I plan]
4. **Device-bound signing key.** Not provided by `expo-secure-store` directly; may need a small native module or a software key stored in secure storage. Same cost in Flutter. [I]
5. **Turkish hiring skews Flutter.** If the project outlives the student, the next maintainer is statistically more likely to know Flutter; mitigated by React skills being common. [I]
6. **Two apps (mobile + web panel) instead of one.** More surface for a solo dev; mitigated by the shared `packages/core` and by the panel being plain CRUD. [I]
7. **Unverified:** exact Flutter 3.47 minimum iOS version; Expo SDK 57 minimum iOS/Android versions; KMP library release dates (Maven Central search index returned stale data, e.g. Kable 0.37.1 vs GitHub 0.45.0, so those dates were not used).

---

## 9. Sources

Primary:
- https://docs.flutter.dev/release/release-notes , https://docs.flutter.dev/release/release-notes/release-notes-3.47.0 , https://flutter.dev/blog/whats-new-in-flutter-3-47 , https://docs.flutter.dev/install/archive
- https://docs.flutter.dev/platform-integration/ios/setup , https://docs.flutter.dev/tools/hot-reload
- https://expo.dev/changelog , https://expo.dev/changelog/sdk-57 , https://expo.dev/changelog/sdk-58-beta , https://expo.dev/changelog/sdk-56 , https://expo.dev/pricing
- https://docs.expo.dev/build/introduction/ , https://docs.expo.dev/versions/latest/sdk/camera/ , https://docs.expo.dev/guides/dom-components/
- https://reactnative.dev/blog/2025/10/08/react-native-0.82
- https://kotlinlang.org/docs/multiplatform/supported-platforms.html , https://github.com/JetBrains/compose-multiplatform/releases , https://blog.jetbrains.com/kotlin/2025/09/compose-multiplatform-1-9-0-compose-for-web-beta/
- https://orm.drizzle.team/docs/connect-expo-sqlite
- https://pub.dev/packages/flutter_blue_plus/license , https://pub.dev/packages/mobile_scanner
- https://cdn.sheetjs.com/advisories/CVE-2023-30533 , https://cdn.sheetjs.com/advisories/CVE-2024-22363
- https://ionic.io/blog/important-announcement-the-future-of-ionics-commercial-products
- https://docs.codemagic.io/billing/pricing/
- Registries queried by script: registry.npmjs.org, api.npmjs.org/downloads, pub.dev/api, api.github.com
- https://www.linkedin.com/jobs/search?keywords=%22Flutter%22&location=Turkey&geoId=102105699 (and same for "React Native")

Secondary (used only for context, flagged where relied on):
- https://amgres.com/blog/flutter-web-webassembly-wasm-2026-guide
- https://survey.stackoverflow.co/2025/technology (primary page did not expose the mobile framework table to the fetcher; numbers from search summary)
