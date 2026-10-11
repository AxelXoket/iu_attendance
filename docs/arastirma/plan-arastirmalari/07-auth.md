# 07: Identity and account design without SSO

Researched 2026-09-28. Read-only web research. Every claim is tagged:
**[C]** confirmed from a primary or official source (URL given), **[S]** secondary source only,
**[I]** my inference or recommendation. Local copies of fetched IU/YOK PDFs (text extracts) are in
`scratchpad/research/src/` (`iu_eposta_talimat.txt`, `iu_epk_tl01.txt`, `yok_sdp.txt`, `iu_ders_alma.txt`).

---

## 0. Facts about Istanbul University that drive the design

| Fact | Tag | Source |
|---|---|---|
| Staff domain is `@istanbul.edu.tr`, student domain is `@ogr.iu.edu.tr`. | C | IU BIDB "Office 365'e Kayit Olma" PDF (2016): https://cdn.istanbul.edu.tr/statics/bilgiislem.istanbul.edu.tr/wp-content/uploads/2016/12/22-office365.pdf |
| `@istanbul.edu.tr` belongs to "calisanlari **ve emekli personeli**" (staff AND retirees). Administrative staff get it too. So the domain alone does not prove "active instructor". | C | IU "E-Posta Kullanim Talimati" (first published 30.11.2016): https://cdn.istanbul.edu.tr/FileHandler2.ashx?f=iu-bidb-tl-008-e-posta-kullanim-talimati.pdf |
| Both `@istanbul.edu.tr` and `@ogr.iu.edu.tr` "Google Mail (Gmail) altyapisinda calismaktadir" (as of the 2016 talimat). Current MX could not be verified: IU authoritative name servers (194.27.128.101/102) did not answer Google Public DNS on 2026-09-28. | C (2016), current state unverified | same talimat; https://dns.google/resolve?name=ogr.iu.edu.tr&type=MX |
| Old rule (2012 talimatname): undergrad address = `ogrencinumarasi@ogr.iu.edu.tr`, grad = `ad.soyad@ogr.iu.edu.tr`. Newer rule (2016 talimat): student picks one of the usernames **suggested** at ogr.iu.edu.tr. So the student number can NOT be reliably derived from the email address. | C | 2012: https://cdn.istanbul.edu.tr/statics/bilgiislem.istanbul.edu.tr/wp-content/uploads/2012/02/EPK-TL-01.pdf ; 2016: talimat above |
| Students must actively create their `@ogr.iu.edu.tr` mailbox (opt-in, at ogr.iu.edu.tr). Only IU students can obtain one. Mailbox is deleted when the student leaves IU. | C | 2016 talimat; https://ogr.iu.edu.tr (support form) |
| Attendance rule: 70% theory, 80% practice/lab; non-attending students are announced before finals and fail (FD). | C | IU 2025-2026 Guz ders alma kurallari PDF: https://cdn.istanbul.edu.tr/FileHandler2.ashx?f=2025-2026-guz-ders-alma-islemleri-ve-ozetlenmis-kurallar.pdf (items 11-12) |
| After the add/drop (ekle/birak) period no course changes are possible in AKSIS; rosters stabilize then. | C | same PDF, item 32 |
| Official retention for attendance records: YOK "Saklama Sureli Standart Dosya Plani v.4" (2023), code 302.07 "Devam/Devamsizlik" (incl. 02 "Devam Cizelgeleri") = **10 D** (10 years, then destroy). | C | https://s3-ankara.yok.gov.tr/yokmedia/9032aaa7-f482-4e73-a23b-979120171345.pdf (legend: "D- Imha") |
| IU runs AVESIS (public academic profiles), e.g. https://avesis.istanbul.edu.tr/eyolcu . Profile slug appears to mirror the email local part. | C (exists) / I (slug=email) | https://avesis.istanbul.edu.tr/ |

Consequence **[I]**: university email is the only no-SSO proof of "is an IU student / IU staff member" we have,
but (a) many students never created the mailbox, (b) it does not encode the student number, (c) staff
domain includes retirees and non-teaching staff.

---

## 1. Instructor accounts and roles

**Recommended [I]:** two gates, both required.
1. **Email ownership:** sign-up only with `@istanbul.edu.tr`; 6-digit email OTP (10 min TTL, 5 attempts, resend cooldown). Normalize address (lowercase, trim, reject `+tags`). Allowlist lives in config, so IU-Cerrahpasa (`@iuc.edu.tr`, a separate university since 2018) can be added later deliberately.
2. **Human approval:** account lands in `pending_instructor`. A **department admin** (bolum) approves. Super admin approves department admins. Approval UI shows the AVESIS search link for that name as a hint (manual check, not scraping) **[I]**.
   - Bootstrap: the super admin creates the first department admins by invitation (email with one-time link), not by self-sign-up.
   - Until approved, the instructor can draft courses and upload rosters but cannot open sessions or see student data from other courses **[I]** (reduces friction without leaking data).

**Roles [I]:**

| Role | Scope | Granted by |
|---|---|---|
| super_admin | global; creates faculties/departments, department admins; audit log; legal holds | seed / other super admin (2-person rule for granting) |
| department_admin | one or more departments; approves instructors; resolves rebind escalations; sees department courses | super_admin |
| instructor | owns courses (course = department + term + code + section) | department_admin approval |
| assistant (co-instructor / TA) | per-course grant with capability flags: `run_session`, `edit_attendance`, `manage_roster`, `approve_join`, `approve_rebind` | the course owner (invite by `@istanbul.edu.tr` email; a TA who is a student uses their student account with a per-course TA grant) |
| student | own enrollments and records only | self-registration + roster link |

Model it as RBAC with **scoped grants** (role, scope_type, scope_id), not global roles, so one person can be instructor in course A and TA in course B **[I]**. Every approval and every attendance edit is written to an append-only audit table **[I]**.

---

## 2. Student registration channel

| Option | Cost | Proof strength | Friction | Verdict [I] |
|---|---|---|---|---|
| Email OTP to `@ogr.iu.edu.tr` | ~0 (transactional email) | proves "is an IU student"; not which number | high for students without a mailbox; mail is Gmail-backed so push notifications work if they add it to the phone | **Primary** |
| Magic link | ~0 | same as OTP | worse on mobile: link opens in whatever browser/mail app, needs App Links/Universal Links; Firebase email link had to be re-plumbed after Dynamic Links shut down on **25 Aug 2025** (https://firebase.google.com/support/dynamic-links-faq, https://firebase.google.com/docs/auth/android/email-link-migration) [C] | Reject; use a typed 6-digit code |
| SMS OTP (Turkey) | Netgsm OTP: 0.48 TL/SMS standard, 10,000 pack 2,790 TL (1,999 TL new customer), prices incl. KDV+OIV, domestic only, API only [C] https://www.netgsm.com.tr/fiyatlar/otp-sms . Twilio lists $0.0305/segment to Turkey [C] https://www.twilio.com/en-us/sms/pricing/tr ; Verify adds $0.05 per success [C] https://www.twilio.com/en-us/verify/pricing | proves phone possession only; says nothing about studentship; SIMs are shareable | low | Optional **recovery** factor only, not identity |
| Passkeys | free | strong login, phishing resistant | good | **Add later for login**, but NOT device binding: passkeys sync via iCloud Keychain / Google Password Manager and since iOS 17 can be shared via Shared Groups and AirDrop [C] https://support.apple.com/en-gb/120758 |
| Password + email verification | ~0 | weakest; passwords get shared, which is exactly the fraud | medium | Reject as primary |

**IYS:** OTP SMS is outside IYS because it is not a commercial electronic message (it answers a user-initiated security action) [S] https://kurumsal.turktelekom.com.tr/mobil/dijital-mesajlasma-ve-reklam/otp-sms , https://www.vatansms.com/toplu-sms/otp-sms/ . Keep the SMS body strictly transactional (no promotion) **[I]**.

**Passkey tooling in 2026 [C/S]:** iOS AuthenticationServices (iOS 16+) and Android Credential Manager (API 28+). Flutter has no first-party API; packages `passkeys` (Corbado, custom RP supported), `flutter_passkey_service`, `credential_manager` (https://pub.dev/packages/passkeys). React Native: `react-native-passkeys` (Expo module, not in Expo Go) https://github.com/peterferguson/react-native-passkeys . Backends: Supabase passkeys **beta since 28 May 2026** (https://supabase.com/changelog/46458-passkeys-for-supabase-auth-beta), Keycloak passkeys supported since 26.4 (Sep 2025), policy options added in 26.7.0 (9 Jul 2026) https://www.keycloak.org/2026/07/keycloak-2670-released , Better Auth `@better-auth/passkey` 1.7.x.

**Students without a university mailbox [I]:** the app shows a one-screen guide ("ogr.iu.edu.tr > create address > add to Gmail app") and offers a **fallback**: register with a personal email + OTP, enter student number, account is `unverified` and every course join goes to instructor approval. The instructor sees a badge "not university-verified". This keeps the door open without letting unverified accounts auto-link.

**Deliverability [C + I]:**
- Gmail requires SPF or DKIM for all senders and SPF+DKIM+DMARC for bulk senders; Microsoft enforces SPF/DKIM/DMARC for >5,000/day to Outlook.com consumer domains since **5 May 2025**, non-compliant mail is rejected with 550 5.7.15 [S] https://techcommunity.microsoft.com/blog/microsoftdefenderforoffice365blog/strengthening-email-ecosystem-outlook%E2%80%99s-new-requirements-for-high%E2%80%90volume-senders/4399730 .
- Institutional tenants (Google Workspace or M365) add their own admin spam/quarantine policies on top **[I]**. Send from a dedicated subdomain (e.g. `auth.<ourdomain>`) with SPF, DKIM (2048-bit) and DMARC `p=quarantine` aligned; plain-text-heavy OTP mail, no links, no images, subject "IU Yoklama dogrulama kodu: 123456" **[I]**.
- Ask IU BIDB to allowlist the sending domain/IP in the `ogr.iu.edu.tr` and `istanbul.edu.tr` tenants before launch. Measure: OTP-sent vs OTP-verified ratio per recipient domain as a dashboard metric; alert under 85% **[I]**.
- **KVKK Art. 9 (amended by Law 7499, in force 1 June 2024):** sending student emails through a foreign ESP is a cross-border transfer; the standard-contract route requires notifying KVKK within 5 business days of signing [S] https://www.kvkk.gov.tr/Icerik/8043/Standart-Sozlesme-Bildirim-Modulu-Hakkinda-Kamuoyu-Duyurusu . Prefer an EU/TR-hosted relay or a Turkish provider; this is a legal decision, **escalate**.

**App Review [I]:** both stores need reviewer credentials. Create a reviewer account on an allowlisted test address whose OTP is a fixed code, enabled only for that address, logged, and disabled after review. No social login is used, so Apple 4.8 (Sign in with Apple parity) does not apply; if Google/Microsoft sign-in is ever added, 4.8 has an exception only for apps that require an *existing* education account [S] https://developer.apple.com/app-store/review/guidelines/ .

---

## 3. Linking a student to roster rows

Roster row = (course, student_number, full_name, optional email) uploaded by the instructor. Student account = (verified email, claimed student_number, display name).

**Algorithm [I]:**
1. At registration the student enters `student_number` (numeric, trimmed; validate length/pattern per faculty) and name. It is a **claim**, not a fact.
2. On every roster upload and every new claim, run the matcher:
   - **Strong match:** roster email == verified account email → auto-link.
   - **Normal match:** student_number equal AND name similarity >= threshold after Turkish-aware folding (`I/ı`, `İ/i`, `Ş/ş`, `Ğ/ğ`, `Ç/ç`, `Ö/ö`, `Ü/ü`, collapse spaces, order-insensitive tokens) → auto-link.
   - **Number matches, name does not** → `needs_review` (instructor sees both names side by side).
   - **Name matches exactly one row, number differs by edit distance 1 or a transposition** → suggest "Did you mean 20231234?"; student confirms, then it becomes a normal match. Never silently rewrite.
   - **No match** → student can press "Join course" with a course join code → `pending_join` for the instructor/TA with `approve_join`.
3. **Uniqueness:** one active account per student_number (global). A second account claiming the same number goes to `conflict` and both owners get notified; department admin or instructor resolves. The real owner will surface quickly because they cannot link **[I]**.
4. **Late adds (after ekle/birak):** instructor re-uploads the roster; the import is a diff (added / removed / changed name), never delete-and-recreate, so existing attendance stays attached to row ids. Removed rows become `withdrawn` (kept for history).
5. **Walk-ins not on roster:** `pending_join`; check-ins made while pending are stored as `provisional` and only count once approved. Approval creates a roster row flagged `added_by_instructor`.
6. Changing the claimed student_number after linking requires admin action (audit-logged).

Measure: auto-link rate, median time a `needs_review`/`pending_join` item waits, number of conflicts per term.

---

## 4. Device binding and attestation

**Key per install [C]:** Android Keystore key (TEE or StrongBox) with Key Attestation; the attestation chain is verified on the server (root download https://android.googleapis.com/attestation/root, CRL https://android.googleapis.com/attestation/status). Google switched to a new ECDSA "Key Attestation CA 1" root for chains issued from **1 Feb 2026**; devices launching with Android 16 support only Remote Key Provisioning (shorter-lived certs you must validate). Page updated 2026-07-09: https://developer.android.com/privacy-and-security/security-key-attestation . Google recommends its Kotlin verifier https://github.com/android/keyattestation (Apache-2.0).
iOS: Secure Enclave keys are P-256 ECDSA only **[C, platform fact]**, so use **ECDSA P-256 (ES256)** on both platforms.

**Integrity services:**

| | Play Integrity (Android) | App Attest (iOS) |
|---|---|---|
| Cost | free | free |
| Quota | 10,000 token requests/day + 10,000 decryptions/day per Cloud project by default; increase via form, needs app on Play and linked Cloud project, "can take up to a week" [C] https://developer.android.com/google/play/integrity/setup (updated 2026-09-16) | `attestKey` goes to Apple once per install; keep < 100 req/s, ramp <= 10M users/day [C] https://developer.apple.com/documentation/devicecheck/preparing-to-use-the-app-attest-service |
| Offline | needs network; standard request binds a `requestHash` (SHA-256 of the action, max 500 bytes), replay protected, decoded via `playintegrity.googleapis.com ... decodeIntegrityToken` [C] https://developer.android.com/google/play/integrity/standard | `generateAssertion` is **on device, no Apple server call** ("While generating an assertion doesn't call Apple servers...") and carries a monotonic counter [C] https://developer.apple.com/videos/play/wwdc2021/10244/ |
| Notes | Since May 2025, `MEETS_STRONG_INTEGRITY` on Android 13+ requires a security patch from the last 12 months [S] https://www.androidauthority.com/google-play-integrity-hardware-attestation-3561592/ . Requires Google Play services, so Huawei/no-GMS phones get no verdict. Device recall (beta): 3 bits per device that survive factory reset, kept 3 years [C] https://developer.android.com/google/play/integrity/device-recall | DeviceCheck: 2 bits per device that persist "across app reinstallation, device transfer between users, and even Erase all contents and settings" [C] WWDC21 above |

**How they combine with offline check-ins [I]:**
- **Bind time (online, once per install):** app generates key → Android sends key-attestation chain + Play Integrity token with `requestHash = SHA256(pubkey || server_nonce)`; iOS sends App Attest attestation over `SHA256(pubkey || server_nonce)` (on iOS the App Attest key itself can be the signing key, or it attests a separate Secure Enclave key). Server stores `device_key` in state `active` or `pending`.
- **Check-in (offline OK):** payload signed with the device key; on iOS optionally as an App Attest assertion (counter gives replay ordering for free).
- **Sync (online):** batch is uploaded with a fresh Play Integrity standard token / App Attest assertion whose hash covers the batch digest. Integrity is therefore checked at bind and at every sync, never at the moment of check-in. Quota: 1 token per sync per device per day; above ~10k active Android devices per day apply for a quota increase before term starts.
- **No-GMS / attestation failure:** do not hard-block. Accept key attestation alone (no GMS needed), mark the device `integrity=degraded`, and surface that on the instructor's list. Hard-block only on a key-attestation chain that fails or is revoked.

**One active device per student [I]:**
- Exactly one `active` key per student. Login on a new device (email OTP) creates a `pending` key. The old device gets a push and the student gets an email: "A new phone asked to take over your attendance account".
- Activation of the pending key: automatic after a **cooldown** (suggest 48 h; the old key keeps working meanwhile) OR immediately if an instructor/department admin with `approve_rebind` approves. Limit: 2 self-service rebinds per term, beyond that admin approval only.
- Check-ins signed by a `pending` key are stored `provisional` and count once the key activates.
- **Lost phone:** same flow; the student can also mark "lost" from the web (email OTP), which revokes the old key immediately (check-ins signed by it and synced later are accepted only if the session evidence predates the revocation time, otherwise flagged).
- **One account per device:** write DeviceCheck bit / device-recall bit "bound" at binding; a second student account binding on the same device is flagged for the instructor (not blocked; siblings share phones).
- **Carrying a friend's phone:** create the signing key with user authentication required and invalidation on biometric change (`setUserAuthenticationRequired(true)` + `setInvalidatedByBiometricEnrollment(true)`; iOS `SecAccessControl .biometryCurrentSet`) [S] https://mas.owasp.org/MASTG/knowledge/android/MASVS-AUTH/MASTG-KNOW-0001/ . The friend then needs the owner's biometric; enrolling the friend's finger destroys the key and forces a visible rebind. Residual risk: Android fallback to device PIN if enabled, and a phone owner who simply unlocks and hands over the phone; that has to be caught by in-class evidence (other research tracks), not by identity.

---

## 5. Sessions and tokens for days offline

**Recommended [I], consistent with RFC 9700 (OAuth 2.0 Security BCP, Jan 2025), which requires refresh tokens of public clients to be sender-constrained or rotated [C] https://www.rfc-editor.org/info/rfc9700/ :**
- Access token: 15 min JWT.
- Refresh token: opaque, **rotating**, sliding lifetime 30 days since last use, absolute 180 days (one term + margin), **bound to the device key**: every refresh request carries a signature by the device key over (refresh token hash, timestamp, server nonce) (DPoP-style, RFC 9449). A stolen refresh token without the Secure Enclave/Keystore key is useless, which is what justifies the long lifetime.
- Reuse of a rotated refresh token revokes the whole family and sends the device to re-login.
- **Offline check-ins do not need a valid token.** Their authority comes from the device key, which the server knows was `active` for that student. At sync, if the refresh token has expired, the app does email OTP re-login; the new session re-proves the same device key (no rebind needed because the key is unchanged), then the queued batch uploads.
- Server decides validity per check-in by: key state at the time the server-verifiable session evidence says the check-in happened, not the phone clock.
- Revocation reaches an offline device only when it syncs; accept that and rely on server-side verification at sync.

---

## 6. Account deletion vs retained attendance records

**Store rules [C]:**
- Apple 5.1.1(v): in-app initiation required; deactivation alone "is insufficient"; data you are legally required to keep may be retained if the user is told; manual/slow deletion allowed if the timeline is communicated. https://developer.apple.com/support/offering-account-deletion-in-your-app
- Google Play: in-app path **and** a web link for deletion requests; may retain data "for legitimate reasons such as security, fraud prevention or regulatory compliance" with clear disclosure; declare in Data safety. https://support.google.com/googleplay/android-developer/answer/13327111
- KVKK: deletion/anonymisation regulation: periodic destruction interval max 6 months for controllers with a retention policy; data-subject requests answered within 30 days [S] https://www.kvkk.gov.tr/Icerik/5441/KISISEL-VERILERIN-SILINMESI-YOK-EDILMESI-VEYA-ANONIM-HALE-GETIRILMESI-HAKKINDA-YONETMELIK

**Design [I]:**
- Attendance records point to the **roster row** (instructor-uploaded number + name), never directly to the user account. The account is a separate identity linked to roster rows.
- On deletion: delete account, email, password/passkeys, device keys, push tokens, personal-email fallback, profile; unlink roster rows (`user_id = NULL`); keep audit events with the user id replaced by a random tombstone id.
- Kept: roster rows and attendance marks as the **course's** record (the student number and name came from the instructor's roster, not from the student). Retention period: follow YOK SSDP 302.07 "Devam/Devamsizlik" 10 years D only if IU treats our data as the official record; otherwise a much shorter period (e.g. until grades are final + objection window) and export to the instructor. Which one applies is a KVKK controller/processor question (is IU the controller, or the app operator?) and must be **escalated** to the owner and IU legal.
- Deletion is immediate for the account, with a 7-day undo window communicated in the app; the store disclosure text says exactly what is retained, why, and for how long.
- Instructor account deletion: courses transfer to a co-instructor or department admin before deletion; if none, the department admin inherits them.

---

## 7. Build vs buy, libraries (with dates)

No auth provider handles hardware-key device binding, attestation, rebind cooldowns or offline check-ins. That part is custom whatever we choose **[I]**. The provider only covers email OTP, sessions, roles.

| Option | Status / date | Fit [I] |
|---|---|---|
| **Better Auth** (TypeScript) | v1.7.0 18 Aug 2026, v1.7.6 24 Sep 2026; plugins email-otp, passkey (`@better-auth/passkey`), organization, admin, Expo integration, RFC 8628 device flow in 1.7.0 [C] https://better-auth.com/changelog | **First choice if backend is TypeScript.** Self-hosted, data stays in our DB (KVKK friendly), active releases. |
| **Keycloak** (Java, self-hosted) | 26.7.0 on 9 Jul 2026, 26.7.4 Sep 2026; passkeys, organizations with optional domains, fine-grained org admin roles [C] https://www.keycloak.org/2026/07/keycloak-2670-released | Choose if the backend is not TS or IU IT wants a standard IdP. Heavier to run; device binding still custom. |
| **Supabase Auth** | email OTP GA; passkeys beta 28 May 2026 (supabase_flutter >= 2.15.0) [C] | Only if Supabase is chosen as the whole backend; self-host for KVKK. |
| **Firebase Auth** | US-hosted; SMS requires Blaze; email-link needed migration after 25 Aug 2025 [C] | Reject: cross-border transfer, and adds nothing we need. |
| **Self-built on primitives** | argon2/opaque tokens + a WebAuthn lib | Viable (surface is small: OTP + rotating device-bound refresh). Only if the stack has no mature auth lib. |

**Attestation / key libraries:**
- Server Android: `android/keyattestation` (Kotlin, Google, Apache-2.0) [C] https://github.com/android/keyattestation ; Play Integrity via Google API client `decodeIntegrityToken`.
- Server iOS: `node-app-attest` / `appattest-checker-node` (Node), `raileasyuk/appattest` (Go), `veehaitch/devicecheck-appattest` (Kotlin) [S, release dates not verified].
- Flutter client: `biometric_signature` 13.1.0 (published ~26 Sep 2026, verified publisher visionflutter.com, 26k weekly downloads; Secure Enclave, Keystore/StrongBox, Android key attestation with StrongBox->TEE fallback, biometric-invalidation) [C] https://pub.dev/packages/biometric_signature . Note its Android default is RSA-2048; request EC P-256. `app_attest` 0.2.1 (~Aug 2026, unverified publisher, 373 weekly downloads) [C] https://pub.dev/packages/app_attest : too thin to depend on; write ~200 lines of platform channel (Swift `DCAppAttestService`, Kotlin `StandardIntegrityManager`) instead **[I]**.
- React Native: not researched in depth here; `react-native-passkeys` for passkeys.

---

## 8. Escalations for the main conversation

1. **KVKK controller identity** (IU vs app operator) decides retention period, deletion semantics and whether a foreign email/SMS provider is allowed. Legal/privacy decision.
2. **Unverified-student fallback** (personal email) trades coverage against fraud. Product/security decision.
3. **Biometric-bound signing key** blocks shared-phone fraud but costs a rebind whenever a student changes fingerprints/Face ID. Product decision.
4. Ask IU BIDB for: current mail provider (MX), sender allowlisting, and whether the AKSIS roster export includes student email (would raise the auto-link rate a lot).
