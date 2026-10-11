# 09 - App distribution: Apple, Google Play, PWA fallback, timeline, recommendation

Research date: 2026-09-28. All sources fetched on that date unless noted. Labels:
**[CONFIRMED]** = read on a primary/official page; **[REPORTED]** = secondary source;
**[INFERENCE]** = my reasoning, not stated by a source.

---

## 0. Headline findings

1. **Istanbul University already publishes apps on both stores.** A Play listing `edu.istanbul.mobile` ("Istanbul Universitesi") exists, and on the App Store the AUZEF faculty publishes "AUZEF Mobil Uygulama" (developer id 949150354, seller shown as "Auzef"); Istanbul Universitesi-Cerrahpasa (a separate university) has "IUC Mobil". **[CONFIRMED listings exist]** So IU (or at least a unit of it) already has organization developer accounts and a D-U-N-S record. The fastest "official" path is not a new account; it is getting the IU IT department (Bilgi Islem) to publish under an existing IU account. **[INFERENCE]**
   - https://play.google.com/store/apps/details?id=edu.istanbul.mobile
   - https://apps.apple.com/tr/developer/i-stanbul-%C3%BCniversitesi-a%C3%A7%C4%B1k-ve-uzaktan-e%C4%9Fitim-fak%C3%BCltesi/id949150354?l=tr
2. **Apple's fee waiver no longer lists eligible countries.** The current help page states eligibility by entity type only (nonprofit, accredited educational institution, government entity) and even references EU-specific terms. The 2018/2020 news posts limited it to a list of countries (Turkey was never listed). An Apple education onboarding kit (2024) says "Apple Developer Programme is free through a fee waiver for accredited educational institutions". A Turkish public university accredited under YOK is plausibly eligible, but this is not confirmed for Turkey. **[CONFIRMED wording; INFERENCE on Turkey]**
3. **Google Play: new personal accounts still need 12 testers x 14 continuous days in a closed test** before production (reduced from 20 on 2024-12-11). Organization accounts are exempt. **[CONFIRMED]**
4. **Google Play: "government apps" (developed by or on behalf of a government agency) must be published from an organization account.** A state university is a public legal entity; if IU officially adopts the app, publishing from a student's personal account is the wrong shape. **[CONFIRMED rule; INFERENCE on applicability to IU]**
5. **Target API: since 2026-08-31 new apps and updates must target Android 16 (API 36)**; extension possible to 2026-11-01. **[CONFIRMED]**
6. **Android developer verification (sideloading lockdown) starts 2026-09-30 in Brazil, Indonesia, Singapore, Thailand only**; global rollout "2027 and beyond". Turkey is not in the first wave, so APK sideloading still works for the 2026-27 pilot, but it is a dying path. **[CONFIRMED]**
7. **A PWA can scan QR on iOS and store data offline, but cannot do BLE on iOS, has no device attestation, and push only works after home-screen install.** A PWA-first pilot is realistic for QR-only attendance with weak anti-fraud; it loses the strongest anti-proxy controls. **[CONFIRMED components; INFERENCE on fit]**

---

## 1. Apple

### 1.1 Individual vs organization account

| Item | Individual | Organization |
|---|---|---|
| Seller name on App Store | Student's legal name | Legal entity name (e.g. "Istanbul Universitesi") |
| D-U-N-S | Not required | Required for companies and educational institutions; optional for government organizations |
| Other requirements | Apple Account with 2FA, age of majority, legal name | 2FA, legal binding authority of the enroller, work email on org domain, public functional website |
| Enrollment channel | Web or Apple Developer app | Per help page, organizations enroll via web |
| Fee | 99 USD/yr or local-currency equivalent | Same, or fee waiver if eligible |

Sources: https://developer.apple.com/programs/enroll/ ; https://developer.apple.com/help/account/membership/program-enrollment/ ; https://developer.apple.com/support/D-U-N-S/ **[CONFIRMED]**

**Cost in Turkey.** Apple states 99 USD "in local currency where available". Turkish users report ~649.99 TL/yr when enrolling through the Apple Developer iPhone app (ShiftDelete, 2023-04-20) and a developer post on X dated 2026-03-23 (snowflake-decoded) still quotes "650 TL (~$15)". **[REPORTED; verify at checkout]**
- https://shiftdelete.net/apple-gelistirici-hesabi-nasil-acilir
- https://x.com/erhanmeydan/status/2036139143843950892

**D-U-N-S.** Free; D&B assigns in up to 5 business days, plus up to 2 business days to sync to Apple; contact D&B if more than 2 weeks. DBAs, trade names and **branches are not accepted** (relevant: a single department or faculty cannot enroll on its own; the enrolling entity must be the legal entity, i.e. the university). **[CONFIRMED]** https://developer.apple.com/support/D-U-N-S/

**Can a public university enroll?** Yes, as an organization (accredited educational institution) or, if Apple treats it as a government organization, without mandatory D-U-N-S. The person enrolling must have legal binding authority, which a student does not. **[CONFIRMED rules; INFERENCE on IU]**

**Fee waiver.** Requirements (current page): legal entity that is a nonprofit, accredited educational institution or government entity; not an individual; no Paid Applications Agreement; no sale of digital goods. Request at enrollment or anytime before expiry. Approved orgs also skip the EU Core Technology Fee. No region list on the page as of 2026-09-28. **[CONFIRMED]**
- https://developer.apple.com/help/account/membership/fee-waivers/
- Historic region lists: https://developer.apple.com/news/?id=01032018a (2018-01-03, US only), https://developer.apple.com/news/?id=02032020a (2020-02-03, +8 countries). Turkey never listed.
- Education kit (2024): https://education-static.apple.com/geo/uk/education/atlc/AppleDeveloperProgram_FeeWaiverforEducation_OnboardingKit.pdf
- The old free iOS Developer University Program ended in 2024 (https://www.mactrast.com/2024/05/apple-puts-an-end-to-ios-developer-university-program-for-students/) **[REPORTED]**; its replacement for institutions is this fee waiver.

At ~650 TL the fee is not the real obstacle; the account *owner* is. **[INFERENCE]**

### 1.2 TestFlight

- Internal testers: up to 100 App Store Connect users, no review. External testers: up to 10,000 by email or public link. First build added to an external group goes to Beta App Review; later builds "may not" need full review. Builds expire after 90 days. Testers need the TestFlight app. Managed Apple Accounts in reserved domains cannot test. **[CONFIRMED]**
  - https://developer.apple.com/testflight/
  - https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/
- Implication: a few-hundred-student pilot fits TestFlight external testing (public link). Cost: a 90-day rebuild cadence, an extra install step (TestFlight app), and beta review still applies (so demo-account and guideline issues surface here too). **[INFERENCE]**

### 1.3 App Store review risks for an attendance app (guidelines revised 2026-06-08)

Guidelines: https://developer.apple.com/app-store/review/guidelines/ ; revision notice: https://developer.apple.com/news/?id=a233fmpw **[CONFIRMED]**

| Guideline | Risk for this app | Mitigation |
|---|---|---|
| **2.1 App completeness** | Reviewer cannot log in (needs IU email) or cannot pass QR/geofence checks from Cupertino. Text: "include demo account info (and turn on your back-end service!)"; a built-in demo mode is allowed "with prior approval by Apple" if a demo account is impossible. | Permanent reviewer account + demo course with a static QR/session that ignores location. Put steps in Review Notes. |
| **3.2 Business (limited audience)** | HIGH. Apple asks via 2.1 "Information Needed": "Is your app restricted to users who are part of a single company?" etc. and has rejected with "Business apps with limited audiences should generally be distributed using Apple Business Manager" (forum thread, 2022-04). | Answer honestly; request **Unlisted App Distribution** (explicitly lists "higher-education students") or Custom App via Apple School Manager. |
| **4.2 Minimum functionality** | Low if native (camera, location, notifications, offline). High if it is a thin WebView around a website ("elevate it beyond a repackaged website"). | Native features; not a wrapped website. |
| **4.8 Login services** | Low. Exempt if "an education, enterprise, or business app that requires the user to sign in with an existing education or enterprise account" or if it uses only own sign-in. If "Sign in with Google" is offered as a primary account option, an equivalent privacy login (Sign in with Apple) is required. | Use IU SSO / own accounts only. |
| **5.1.1(v) Account deletion** | Medium. Rule: "If your app supports account creation, you must also offer account deletion within the app" (enforced since 2022-06-30). If accounts are provisioned by the university and the app has no sign-up, the rule arguably does not trigger, but Apple's page does not state an institutional exemption. | Safest: in-app "delete my account/data" that triggers deletion or a documented request flow, with retention disclosure (attendance records the university must legally keep). |
| **5.1.1(i)/(ii)** | Privacy policy link in metadata and in-app; consent for collection. | KVKK-aligned privacy policy URL. |
| **5.2.1 IP / impersonation** | HIGH if IU name/logo used without permission: "Don't use protected third-party material such as trademarks ... without permission, and don't include misleading ... names ... in your app bundle or developer name." | Written IU authorization, or neutral name/no logo until authorized. |

Sources: https://developer.apple.com/support/offering-account-deletion-in-your-app/ ; https://developer.apple.com/forums/thread/704518 ; https://bendodson.com/weblog/2022/05/17/unlisted-app-distribution-on-the-app-store/ **[CONFIRMED text / REPORTED rejection examples]**

### 1.4 Restricting to one institution

- **Unlisted App Distribution**: normal App Review, app reachable only by direct link, not in search/charts; available in all App Store regions; managed and unmanaged devices; also reachable via ABM/ASM. Request after the app is submitted/approved; declined if the app is beta or already private via ABM/ASM. Apple advises in-app mechanisms to prevent unauthorized use. **[CONFIRMED]** https://developer.apple.com/support/unlisted-app-distribution/
- **Custom Apps (Apple School Manager / Apple Business)**: developer sets distribution to "Private" and enters the institution's Organization ID; delivered by MDM or redemption codes; still reviewed. **[CONFIRMED]** https://developer.apple.com/business/custom-apps
- **Apple School Manager in Turkey**: available (Apps only, not Books), page dated 2026-04-14. Custom Apps availability for Turkey not explicitly stated. **[CONFIRMED / unknown]** https://support.apple.com/en-us/102867
- For students' own iPhones, Custom Apps need redemption codes or MDM, which is heavy for a pilot. **Unlisted is the right fit** for a single-university student app. **[INFERENCE]**

---

## 2. Google Play

### 2.1 Personal vs organization

- Fee US$25 one-time; ID verification (government ID + card in legal name); new personal accounts must verify an Android device via the Play Console app. **[CONFIRMED]** https://support.google.com/googleplay/android-developer/answer/6112435
- Same functionality for both. Personal is for "students, hobbyists"; Organization for "commercial, industrial, professional, or governmental" entities. **Organization is mandatory** for financial, health, VPN and **government apps ("developed by or on behalf of a government agency")**. Organization requires D-U-N-S. **[CONFIRMED]** https://support.google.com/googleplay/android-developer/answer/13634885
- Government apps: declaration on App content page (since 2023-01-31); proof of permission in writing from the government entity; Misleading Claims policy bans apps that "falsely claim affiliation with a government entity". Whether a public university counts is not stated. **[CONFIRMED / unknown]** https://support.google.com/googleplay/android-developer/answer/9514050
- Impersonation policy: no icons/titles "falsely implying a relationship with another company / developer / entity / organization", e.g. copying a logo. **[CONFIRMED]** https://support.google.com/googleplay/android-developer/answer/9888374

### 2.2 New personal account testing gate

- Personal accounts created after 2023-11-13: closed test, **>= 12 testers continuously opted in for >= 14 days**, then apply for production access (questionnaire), review "usually takes seven days or less". Internal testing does not count. **[CONFIRMED]** https://support.google.com/googleplay/android-developer/answer/14151465
- 20 -> 12 reduction dated 2024-12-11 **[REPORTED]** https://www.testerscommunity.com/blog/google-play-12-testers-policy
- Organization accounts are not subject to this gate. **[REPORTED, consistent with official scope text]**
- Review time: "For certain developer accounts ... review times of up to seven days or longer in exceptional cases." **[CONFIRMED]** https://support.google.com/googleplay/android-developer/answer/9859751

### 2.3 Testing tracks

- Internal: up to 100 testers, "might not be subject to standard Play policy or security reviews", available in minutes. Closed: email lists up to 2,000 users each or Google Groups, reviewed. Open: unlimited. **[CONFIRMED]** https://support.google.com/googleplay/android-developer/answer/9845334
- For a pilot of a few hundred students, a **closed track with a Google Group** covers everyone and simultaneously satisfies the 12x14 gate. **[INFERENCE]**

### 2.4 Private apps (Managed Google Play)

- Private apps are published to specific organizations (up to 1,000 org IDs per app), need the org to have managed Google Play via an EMM; third-party developers can publish on the org's behalf. **[CONFIRMED]** https://support.google.com/googleplay/work/answer/6145139
- Requires IU to run an EMM and students to have a work profile. Not realistic for students' personal phones. **[INFERENCE]**

### 2.5 Data safety, account deletion, reviewer access

- Data safety form required for all apps including closed and open tracks; **internal-only apps are exempt**; privacy policy required. **[CONFIRMED]** https://support.google.com/googleplay/android-developer/answer/10787469
- Account deletion: apps that allow account creation need **both** an in-app path and a **web link** to request deletion, declared in Data safety. Exempt: permanently private apps. **[CONFIRMED]** https://support.google.com/googleplay/android-developer/answer/13327111
- App access: sign-in details must be "reusable, and valid regardless of user location"; bypass OTP/2FA; QR/barcode access needs a static URL; English. A geofenced/QR attendance flow needs a reviewer demo path. **[CONFIRMED]** https://support.google.com/googleplay/android-developer/answer/15748846

### 2.6 Target API level 2026

- From **2026-08-31**: new apps and updates must target **Android 16 (API 36)** (Wear OS/AAOS 35; TV/XR 34). Existing apps must target >= API 35 to stay visible to new users on newer devices. Extension to **2026-11-01** on request. **[CONFIRMED]** https://support.google.com/googleplay/android-developer/answer/11926878 ; https://developer.android.com/google/play/requirements/target-sdk
- Framework check: Flutter/React Native/Expo template must already produce targetSdk 36. **[INFERENCE]**

---

## 3. Pilot alternatives

### 3.1 TestFlight + Play testing tracks only (no public release)

- iOS: TestFlight external via public link, up to 10,000; Beta App Review on first build; 90-day expiry.
- Android: internal track (100, no review, no Data safety) or closed track with Google Group (reviewed, needs Data safety).
- Verdict: **best pilot option**. Real native capabilities, no 3.2 fight on the public store, and on a personal Play account the closed track doubles as the 12x14 gate. Cost: student friction (install TestFlight, opt in to test on Play), 90-day iOS rebuilds. **[INFERENCE]**

### 3.2 Android APK sideload

- Works in Turkey today. Android developer verification: APIs and limited-distribution accounts (students/teachers/hobbyists, up to 20 devices, no ID, no fee) launched Aug 2026; enforcement 2026-09-30 only in Brazil, Indonesia, Singapore, Thailand; global "2027 and beyond". Unverified apps still installable via ADB or an "advanced flow" (developer mode, restart, 24 h wait). **[CONFIRMED]** https://developer.android.com/developer-verification ; https://thehackernews.com/2026/06/google-sets-sept-30-deadline-for.html
- Verdict: acceptable only for the dev team and faculty demo devices; not for hundreds of students (security warnings, no auto-update, likely blocked in Turkey from 2027). **[INFERENCE]**

### 3.3 PWA fallback on iOS Safari (2026)

| Capability | iOS Safari / Home Screen web app | Source |
|---|---|---|
| Camera for QR | Yes, getUserMedia works in browser and standalone mode (iOS 13.4+). No `BarcodeDetector` on Safari, so ship a JS decoder (ZXing/jsQR). Camera permission may be re-prompted in standalone mode. | https://progressier.com/pwa-capabilities/qr-code-and-barcode-reader **[REPORTED]** |
| Offline storage | IndexedDB + Service Worker. Since Safari 17 (2023-08-10) origin quota up to 60% of disk, home-screen apps same quota; `navigator.storage.persist()` granted heuristically, favoured for Home Screen apps; LRU eviction; ITP deletes script-writable storage of sites not interacted with "for some time" (the historic 7-day rule); Home Screen apps keep their own usage counter. | https://webkit.org/blog/14403/updates-to-storage-policy/ **[CONFIRMED]** |
| Push | Only for web apps **added to the Home Screen**, iOS 16.4+ (2023-02-16), permission must follow a user tap. | https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/ **[CONFIRMED]** |
| BLE (proximity beacons) | Not supported; WebKit position "oppose" on Web Bluetooth. | https://github.com/WebKit/standards-positions/issues/570 **[CONFIRMED label per search; issue page]** |
| Hardware-backed keys / device attestation | WebAuthn passkeys exist, but Apple passkeys return attestation "none" and sync via iCloud Keychain, so they are not device-bound proof. WebCrypto keys are not hardware-backed. No App Attest / Play Integrity equivalent on the web. | https://www.slashid.dev/blog/passkeys-deepdive/ **[REPORTED]** |
| Background location / geofence | Only foreground `geolocation`, no background. | [INFERENCE from platform; not separately sourced] |

**Is PWA-first a realistic way around store friction?** Yes for a *QR-code-in-class* pilot: zero review, deploy instantly, works on both platforms, offline queue possible. It loses: (a) device binding and attestation, the main defence against a student checking in for an absent friend by forwarding a QR photo or sharing credentials; (b) BLE proximity entirely on iOS; (c) reliable push on iOS unless every student installs to Home Screen; (d) reliability of the Safari camera/permission UX and storage persistence. **[INFERENCE]** Recommendation: build the PWA as the **web fallback and faculty dashboard**, not as the student primary client, unless the anti-fraud design (separate research) does not need device binding.

---

## 4. Timeline (realistic)

Example start: first testable build Mon 2026-10-05. Figures from sources above; slip buffers are **[INFERENCE]**.

### Path A: student's personal accounts (fastest)

| Date | Step |
|---|---|
| 10-05 | Apple individual enrollment (hours to ~2 days); Play personal account + ID + device verification (hours to days). TestFlight internal and Play internal testing usable same day once accounts are active. |
| 10-07/08 | TestFlight external Beta App Review (typically ~24 h; first review can bounce on demo access). Play closed track with Google Group published (hours). |
| 10-22 | 14 continuous days with >= 12 opted-in testers complete. Apply for Play production access. |
| by 10-29 | Production access decision (<= 7 days). |
| by 11-05 | First production review (up to 7 days for new accounts). **Play live ~4.5 weeks after first build.** |
| 10-15 to 10-29 | App Store: submit ~day 10; 90% of submissions reviewed in < 24 h, but budget 1 to 2 rejection loops (2.1 demo access, 3.2 limited audience, 5.2.1 name/logo) of ~3 to 7 days each, then Unlisted request. **iOS live ~2 to 4 weeks after first build.** |

Apple review time: https://developer.apple.com/distribute/app-review/ **[CONFIRMED "90% ... less than 24 hours"]**

### Path B: under an IU organization account

- If IU IT already holds the accounts (evidence in section 0): technical publication is the same as above minus the Play 12x14 gate (org accounts exempt), so Android ~1 to 2 weeks, iOS ~1 to 3 weeks after IU grants access. The unknown is **institutional approval time** (IT security review, KVKK/VERBIS, legal sign-off), which can take weeks to months. **[INFERENCE]**
- If IU must enroll from scratch: D-U-N-S up to 7 business days (likely already exists), Apple org verification (days to weeks), fee waiver review, Play org verification. Add 2 to 6 weeks before the first upload. **[INFERENCE]**

---

## 5. Recommendation

**Pilot (one department, a few hundred students), starting now:**
1. Do **not** publish to the public stores. Distribute through **TestFlight external (public link)** and **Google Play closed testing (Google Group of the department's students)**. Keep internal tracks for the dev team and faculty.
2. Accounts: the student's **personal Apple (Apple Developer app, ~650 TL) and personal Play (US$25)** accounts are acceptable *only* for the pilot. Start the Play closed test with >= 12 real testers on day one so the 14-day gate runs in parallel with the pilot.
3. **No IU logo, no "Istanbul Universitesi" in the app name or developer name** until there is written authorization. Use a neutral name ("Yoklama" + department) and say "pilot run with the X department" in the description. This removes 5.2.1 and Play impersonation risk.
4. Build the reviewer path now: reusable demo account, demo course, static QR URL, location check bypass flag for the demo tenant, English review notes. Needed for Beta App Review and Play closed-track review.
5. Build compliance now: privacy policy URL (KVKK), in-app delete-account/data request, and a **web deletion-request page** (Play requires it once past internal testing), Data safety answers, targetSdk 36.
6. PWA only as faculty dashboard and emergency fallback.

**Scale (faculty or university-wide):**
1. Publish under **Istanbul University's organization account** (existing IU/AUZEF accounts or a new one enrolled by IU with fee waiver). Reasons: (a) Apple 5.2.1 and Play impersonation rules require authorization for the IU name/logo, which an official account settles; (b) Play requires organization accounts for apps built "by or on behalf of a government agency", and a state university officially adopting the app is very likely to be treated that way; (c) attendance data is personal data the university controls under KVKK, so the controller should be the seller of record; (d) continuity: the app must survive the student graduating; (e) org Play accounts skip the 12x14 gate.
2. The student becomes a team member (Apple "Developer/App Manager" role; Play user with release permissions) on IU's accounts, not the owner.
3. iOS: App Store with **Unlisted App Distribution** (fits "higher-education students"); Android: public Play listing restricted by login, or unlisted-equivalent by not promoting it. Custom Apps via Apple School Manager only if IU already runs ASM.
4. Plan the transfer early: Apple app transfer between accounts and Play app transfer both exist but carry constraints; avoid needing them by agreeing ownership before public launch. **[INFERENCE; transfer rules not researched here]**

**Escalations for the main conversation (not decided here):**
- Ownership/controller decision (student vs IU) is a legal and privacy question (KVKK data controller, VERBIS). Needs an owner decision and ideally IU legal input.
- Whether anti-fraud needs device attestation (App Attest / Play Integrity) decides whether PWA is viable at all; that is an architecture call.
- Apple fee-waiver eligibility for a Turkish institution is not confirmed; only Apple can answer (contact form).
