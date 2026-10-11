# Arbitration decisions (plan.html integration). A=accept, P=partial, R=reject, V=needs batch recheck

## S02 server
- A 01: drop openapi-typescript + openapi-fetch (maintenance mode). Shared Zod contracts + one typed route table in packages/contracts + small own fetch helper. Response types wire-form; responses read type-only or lenient enums (tolerant client). OpenAPI only for oasdiff. Touch: ozet, sozlesme(580), sunucu verisi(680), panel(706), CI(717), klasor(767), is sirasi(814,818), kaynaklar.
- P 02: keep fastify-type-provider-zod 7.0.0 pinned; move to @fastify/type-provider-zod at its next release (same exports). Fallback list: drop fastify-zod-openapi and Orval; fallback = Fastify setValidatorCompiler + Zod toJSONSchema.
- A 03: Fastify >= 5.12.5; follow Fastify advisories too (749); no module-level not-found handler, root only.
- P 04: single root error handler proven by a scenario (each module throws, root shape returns); FSTDEP deprecation warnings fail tests (not whole --throw-deprecation).
- P 05: auth endpoints contract: CI-only Better Auth openAPI doc through same oasdiff; plugin off in production; basePath stays.
- A 06: class-exit = up to 3 requests/phone; submit reply carries a fresh time certificate (one request per phone); k6 arrival-rate, worst case 20k in 1 min.
- A 07: trustProxy = proxy address only; submit limit per verified device after signature check; wide per-IP flood limit.
- A 08 (with IP fix): drop Valkey; exact limits in Better Auth DB storage; coarse in-memory per instance.
- A 09: boundary exceptions (table files may import other tables for FK; reports read-only; infra db setup). dependency-cruiser single-maintainer, fallback Biome noRestrictedImports.
- A 10: Biome noNodejsModules + no node types in core/contracts tsconfig.
- A 11: OpenAPI 3.1.0.
- A 12: store each release's contract in packages/contracts; oasdiff per supported version; fail on ERR; growable response enums x-extensible-enum from day one.
- A 13: pnpm dev starts named compose services with --wait (pg_isready healthcheck); demo data from test builders.
- A missV1 proxy: reverse proxy (Caddy or university) from day one: TLS, writes X-Forwarded-For, later becomes LB.
- A missV1 under-pressure thresholds explicit; phone honours Retry-After on 429/503.
- V missV2-high Better Auth IP: fix = Better Auth trusts only the header our proxy/Fastify writes (ipAddressHeaders). Converges with V1 proxy miss.
- A missV2 tx passing + pool connectionTimeoutMillis -> 503.
- A missV2 bodyLimit explicit, 413 -> phone halves batch.

## S03 database (V2 only, PASS)
- A F01: Drizzle 1.0.0-rc.4 pinned; rollback to 0.45 cheap only before first migrations, else previous RC/patch; prefer basic query builder; Better Auth relations-v2 adapter.
- A F02: migrator = one transaction; Squawk --assume-in-transaction; each migration SET LOCAL lock_timeout + statement_timeout, retry; status lists text+CHECK not enum; big-table index: CONCURRENTLY in release step + same IF NOT EXISTS in migration.
- A F03: CI regenerates migrations; new file = fail.
- P F04: same id + different bytes/device -> ret+flag; id format checked in Zod (CHECK backstop); id time never used; ON CONFLICT DO NOTHING (no target) then per-record result. Keep "dizinleri kucuk".
- A F05: raw records are evidence; partial unique: one counted record per session+student; one active device per student.
- P F06: drop "1-3 GB"; measure after k6 (pg_total_relation_size) and write it; sessions/week 1-2 (lower bound).
- P F07: store exact signed bytes once (+ iPhone assertion bytes); no separate signature/certificate columns.
- P F08: no BRIN up front.
- A F09: timestamptz; DB init builtin C.UTF-8 (same in Testcontainers); Turkish only in name ORDER BY COLLATE tr-TR-x-icu, no index on it.
- A F10: two roles; app role INSERT/SELECT on audit; default privileges.
- A F11: pgBackRest >= 2.59.3, single-maintainer list, fallback pg_basebackup + WAL archive.
- P F12: backups off-server, encrypted, pg_dump too; archive_timeout a few minutes (not 60 s).
- A F13: phones keep acked records until term lock; server returns last seq per device; phone resends above it.
- P F14: record gets arrival time + decision + reason code; evidence flags separate; beklemede is a decision state.
- A F15: list row dates (added, passive, by whom); student confirmation (who, when); Better Auth 4 tables.
- P F16: device: last App Attest counter + last seq; counter checked in seq order.
- P F17: synced tables: change version + deleted flag via one counter row; sync token carries DB generation (changes on restore -> full re-download).
- A F18: no raw event table; metrics from attendance rows + phones' daily counters. (Fix lines 151, 798.)
- A F19: compose mount /var/lib/postgresql; pin 18.6.
- A F20: referencing tables use (term, record id).
- (S03 misses below)
- A misses: per-record validation before insert + SAVEPOINT fallback; explicit uuidv7() default; schedule = local time Europe/Istanbul (fix "Butun zamanlar UTC"); student number unique only when confirmed; shared_buffers ~1/4 RAM + shm_size 256MB, k6 on prod settings; pg_stat_statements from day one; sube (section) in data model.

## S06 tests (V1 PASS, V2 PASS)
- A F01+F02: Stryker weekly only; Vitest 5 runner bug -> coverageAnalysis "all" until fix; thresholds.break set.
- A F03: example scenario uses Gecmis block + teyitli student.
- A F04: Cucumber >= 13.2; coordinator hook builds template + clones once; close migration conn first.
- A F05: drop Testcontainers; local compose PG, CI service container; coordinator drops leftovers first; same postgres tag pinned in both.
- P F06: each simulated user own remoteAddress; limits on in test config; code-limit scenario.
- P F07: reset = TRUNCATE app schema (public) + pg-boss deleteAllJobs().
- A F08: rule times only from clock interface (no SQL now()); one fake clock drives core + pg-boss TestClock; Better Auth expiry tested by moving expiry in DB.
- P F09: defer Schemathesis (real reasons: signed sync endpoint, Zod already checks responses); sync model test = one Cucumber scenario with fast-check.
- A F10: no nightly k6; weekly k6 --once smoke; capacity proof pre-release, prod-size server, arrival-rate.
- A F11: allowance exhaustive T=0..1000, p=70/80, vs counting definition; fast-check numRuns explicit.
- P F12: phone send queue pure TS (folder in apps/mobile, no RN imports) + Vitest/fast-check model test; real-phone checklist pre-release.
- A F13: Node 24 type stripping for steps, tsx fallback.
- A F14: first scenarios add time-certificate rules + device change.
- A F15: k6 link -> 2.x.
- P F16: test DB non-durable flags, tmpfs /var/lib/postgresql.
- A misses: no free description lines in .feature (Turkish keyword list grew), use # comments; auth + fraud scenarios (wrong teacher, other student, other phone, course not on list); dependency-cruiser in CI list + summary; PR flow / pre-push hook if private repo; weekly job random minute + workflow_dispatch + manual run pre-release; concurrent duplicate batch scenarios + 200-record body limit; device verification behind one interface with fake; TZ=UTC in tests, scenario times Europe/Istanbul, core also once with TZ=Europe/Istanbul; image smoke test (build, start, /health/ready) weekly + pre-release.

## S08 integrity (V1 PASS, V2 PASS) -- ARCH DECISION, tell owner
- DECIDE Android: key attestation ONLY, drop Play Integrity. Reasons: GitHub APK gets no PLAY_RECOGNIZED/LICENSED (F01); 10k/day token+decode quota, no raise path off Play, registration wave of 50k breaks it (F02, scalable); Play Integrity needs Cloud project + service account + google-auth-library + decode call (V1/V2 misses); on Android 7-12 its verdict is not hardware-backed (V2 corr). Key attestation: hardware-backed from Android 8, proves app via attestationApplicationId (package + signing cert digest), no quota, no runtime Google call except cached revocation list. Cost: own verifier (chain to Google roots, BOTH roots: old RSA + P-384 since 1 Feb 2026, revocation list, RKP expiry, challenge = hash of device public key / registration nonce). If app ever ships on Play, Play Integrity can be added then.
- A F07+misses: record = one fixed text (base64) produced once on phone, stored/sent as is; Android signs its UTF-8 bytes (DER, node crypto dsaEncoding der); iPhone App Attest assertion (CBOR) over same bytes; server never re-serializes. Drop "JWS ES256" wording.
- A F08: App Attest assertions are made on device without Apple (WWDC21/26) -> drop "belgelenmemis"; airplane test stays as acceptance; attestKey only at registration, retried.
- P F04 (V1 issue smaller fix): online requests authenticated by a device token from registration, not App Attest; counter advances only with records; server checks counter against seq order (not arrival order); a resent record -> zaten var without counter check.
- P F05: device row: key type, attestation result (security level, verified boot, date), iPhone last counter; server accepts only production App Attest env.
- A F06: iOS keychain survives uninstall -> first launch without local DB wipes old keys, device-change flow; Android allowBackup off for app data.
- P F09: node-app-attest pinned, on single-maintainer list; iOS 27 fields optional (absent below 27).
- P F10: drop @noble/curves software key; fallback = own native module makes non-attested hardware key (Android Keystore / iOS Secure Enclave via CryptoKit), records labelled Cihaz dogrulanmadi.
- A misses: App Attest key can be invalidated by offload/restore -> on each online app open do a local test assertion, invalidKey -> new key + device-change while online; App Attest bound to Apple team id -> register real students only with the permanent Apple account; server (not phone report) decides unverified; label effect explicit (counted, shown labelled; unverified phones listed separately in instructor's bulk confirmation and approved one by one).

## S09 time (V1 PASS, V2 PASS)
- P F1: second anchor at send time: right before upload phone gets fresh nonce-bound certificate; device key signs per send package (record ids, that certificate, elapsed since each record); server: record time = cert time - signed elapsed; allowance = measured round trip + 100 ppm x elapsed. Unverified only if reboot both before and after. TrustedTime out of first release (add if Android unverified > 2%).
- A F2: iOS reboot = App Group POSIX semaphore created O_EXCL (Apple DTS); name <= 31 chars; any sem_open error except EEXIST = restart (fail safe). Not kern.boottime / bootsessionuuid / systemUptime.
- P F3: Android reboot = change in boot_id or BOOT_COUNT; BOOT_COUNT alone if boot_id unreadable.
- P F4: allowance per record; QR: reject only if delay - allowance > 30 s, normal only if delay + allowance < 10 s, else flagged; same allowance in "after arrival" reject.
- P F5: nonce in certificate request; counter at send and at reply; measured round trip = fixed part of allowance, capped (10 s) instead of hard 2 s.
- P F6: certificate = short HMAC token (server time, device id, nonce) via Node crypto; tiny dedicated call on app open, network change and background task; piggyback on other replies as bonus. Glossary wording.
- A F7: Expo uptime excludes sleep on both platforms.
- A F8: one shared counter: at most 2 (unverified time + backup code together) per student per course per term.
- A misses: QR slot proves only "after QR shown" -> unverified-time QR records keep label + count in 2; server host clock synced (chrony/NTP) and monitored, no certificates when unsynced; expo-network listener; privacy manifest 35F9.1 because of RN/expo-device, raw counter never leaves phone; time zone: server sends session open/close as UTC instants, phone never uses own zone, shows Istanbul time; label also covers certificate older than 7 days.

## S11 android (V1 PASS, V2 FAIL on Samsung miss) -- DECISION, tell owner
- DECIDE F1: Google Play (production, after the mandatory 12 testers x 14 days closed test of a new personal account) becomes the main Android path; GitHub APK stays as fallback (no Google services, or Play trouble). Reasons: Samsung Auto Blocker on by default on Galaxy phones shipped with One UI 6.1.1+ blocks browser APKs (V1+V2 miss), unknown-sources step, Play Protect warnings, automatic updates. NOT the Play Integrity quota (moot after S08). Resolves open point 857.
- P F2: keep owner's line: same EAS key uploaded as Play app signing key BEFORE first open-testing/production release (Play now defaults to its own key). Upload key = same key is a deliberate trade-off (Google advises separate). Release = one AAB build; GitHub gets Play Console's signed universal APK; if Play account is lost, EAS builds the APK with the same key. Never accept Play's signing-key upgrade while GitHub path lives.
- A F3: one Google account: Play Console (25 USD once, identity verification) covers Android developer verification; no separate Android Developer Console.
- A F4: no in-app APK installer; update screen opens Play page (Play install) or GitHub releases/latest/download link (other installs); drop APK hash from version check.
- A F5: drop Obtainium item; fixed APK name + latest-download link.
- A F6: offline backup only for Android signing key + update signing key; Apple certs re-created through EAS.
- A F7: Android dev builds locally (npx expo run:android); EAS free quota for releases + iOS; Starter plan (19 USD/month) in a month iOS builds run out.
- A F8: APK from a public repo (separate public releases repo if source stays private).
- A F9: Expo SDK upgraded at least yearly (Play target API + Apple Xcode/iOS SDK rule).
- A misses: GitHub install steps include turning off Samsung Auto Blocker; Play review needs the same demo account (fixed demo instructor code, demo student exempt from one-phone rule); name/logo rule also for Play; server certificate must be trusted by Android 7.0 (Let's Encrypt is not) else min Android 7.1; key-loss sentence corrected.

## CONVERGENCE: Better Auth client IP (S02 V2 high, S06 V1, S04 V2 high) -> confirmed by 3 independent auditors, no recheck needed. Fix: reverse proxy writes X-Forwarded-For; on the Better Auth route Fastify writes request.ip into one header; Better Auth trusts only that header (ipAddressHeaders); scenario with two remoteAddress values.

## S13 panel (V1 FAIL on pairing miss, V2 PASS)
- A F02 (+F01 moot): reports only .xlsx (text cells, no formulas); CSV only accepted on upload.
- P F03: SheetJS reads AND writes; drop write-excel-file; widths need cellStyles:true; dynamic import only on upload/download pages; one Vite 8 build check; fallback named (read-excel-file / write-excel-file).
- P F04: SheetJS from its CDN tarball pinned by pnpm lockfile integrity (pnpm >= 10.26), not committed; advisories watched by hand; preview drawn by React, no sheet_to_html.
- A F05: list parsing: magic bytes; BOM; strict UTF-8 then windows-1254; , or ; ; values as text; flag numbers stored as numbers; pure function tested in Vitest.
- P F06: minimum browsers Chrome/Edge 111, Firefox 114, Safari 16.4 (target, tested on oldest); lecture PC OS/browser in open points; chrome109 build target if needed.
- DECIDE F07: router = TanStack Router 1.x, code-based routes, no plugin/codegen (stable 1.x since 2023, same family as TanStack Query; React Router ships a major yearly). Panel React separate from phone's.
- P F08: panel static build served by API image (@fastify/static), same origin -> drop @fastify/cors; index.html no-cache, hashed assets immutable; vite:preloadError reload once; SPA fallback not for /assets and /v1. TLS at reverse proxy.
- A F09: WCAG 2.2 AA panel + phone; no in-app size/contrast settings (follow OS/browser); 4.5:1; keyboard; 24 px targets; OTP field paste/autofill (one-time-code); manual TalkBack/VoiceOver/keyboard/Lighthouse each release.
- P F10: Screen Wake Lock on projection page if supported; fullscreen button.
- A F11: export letters V Y G B E M with legend.
- A F12: print view header (course, range, gecici); no page numbers required.
- A F13: no UI kit, native elements.
- A F14: panel work-order item full scope.
- A misses: Phase 2 pairing reversed (projection page shows code+QR, hoca approves on phone, only that browser gets QR; single use, few minutes; hoca sees/cuts linked lecterns); panel session on shared PC: 1 h inactivity, "ortak bilgisayar" = ends on browser close, logout on every page (also S04); lang="tr" + explicit tr locale; display/export in Europe/Istanbul, date range sent as days; keep uploaded row order for AKSIS summary; header match NFC + tr lowercase + fold Turkish letters (headers only); one QR library (qrcode, ECC L, 4-module quiet zone) shared by phone and projection page; Kaynaklar gets a "Web paneli" group.

## S14 rules (V1 PASS, V2 PASS)
- P F01: term-end lock = per-unit "son gun devamsizlik isleme" date (admin sets per unit and term); for undergrads it is the last class day, so the last week has no 7-day slack: last-week unsent reminder on every open; student whose phone has not synced since last session and whose result can flip by one record -> KARAR BEKLIYOR; after deadline -> sonradan degisenler. Open point narrowed: who corrects AKSIS after that day.
- P F02: reports per IU Ogrenci Saglik Raporlari Yonergesi: ordinary report reduces nothing (nothing entered); only inpatient + health-board reports exclude THEORY hours. Keep neutral "Belgeli duzeltme" but narrow it: only with student-affairs letter / board decision number, states hour type covered; no report type/dates stored ("Saglik bilgisi tutulmaz" stays). Also covers unit-board decisions.
- A F03+missV2: late-added student: default earlier sessions not counted (T = held hours after add date); Md.9/4 late registration by board decision: T = all held hours, earlier sessions Yok. Choice shown only for students added after first held lesson.
- P F04: correction may set hours (2 of 3) for sessions longer than 1 h, default all hours; record keeps hour count.
- P F05: Gorevli per Md.35 (sports matches, culture/art events, competitions + preparation); excused hours leave absence total, T unchanged.
- P F06+missV2: help line under Muaf: FF/DC/DD repeat = muaf; FD repeat, twice-failed clinical course (Md.20/5) and Md.28/4 final-term practical courses = not muaf. No reason picker.
- P F07+missV1: term dates, add-drop end, absence deadline and lock per unit (faculty/institute), not "genel IU takvimi"; yearly courses + Md.19/2 per-department practice not in first version, added when such a unit joins; fix "yapi degismeden genisler".
- A F08: document number mandatory only for Gorevli + Belgeli; reason code -> final state table.
- P F09: label "Devamdan muaf"; AKSIS summary prints "DEVAMLI (muaf)" until real AKSIS sample; no warnings to them.
- A F10: percentage floored, one decimal, with attended/total hours; decision from integer formula; heading "devam %".
- A F11: warning levels per component; level 2 by next session's hours of that type; message "Bir ders daha kacirirsan devamsiz kalirsin" when remaining < next session hours.
- P F12: head-count comparison refreshes as records arrive, final at send deadline; note on screen; late flag -> batch review of that session.
- P F13: target = 0 loss for "Sunucuya ulasti" records; phone-only losses counted from device changes + beyana dayali corrections; seq gaps = bug detector.
- A F14: target counts only suspicion flags; Cihaz dogrulanmadi + QR'siz tracked separately; head-count target aligned with flag rule (>= 95% of sessions).
- A F15: log instructor time on head count + approval screens (median per session).
- A F16: QR target: largest hall back row, oldest supported Android + iPhone, default settings, read within 10 s.
- A F17: 2-cap single definition (same as S09 F8).
- P F18: open point: undergrad absence deadline = last class day (per unit); question who corrects after.
- A F19: source line: Md.9/4, Md.14, Md.19, Md.20, Md.35 + IU Ogrenci Saglik Raporlari Yonergesi link; title "On Lisans".
- A misses: count base (held vs planned hours) is an open point, rules take base as parameter, course flagged if unheld un-made-up hours exist; p is a course setting (default 70/80); "Haksiz devamsiz" measured as DEVAMSIZ->DEVAMLI after summary (from audit log); AKSIS summary single Sonuc column.

## S04 auth (V1 PASS, V2 FAIL on IP miss) -- ARCH DECISION, tell owner
- DECIDE F04: drop Better Auth; own small module from day one (2 tables: login codes, sessions; ~5 endpoints: request code, sign in, sign out, my sessions, close session) with Node crypto + @fastify/cookie, inside our Zod contract. Both auditors: still the more compact choice for this scope; Vercel acquisition (2026-07-07) noted as making Better Auth a credible fallback. Conditions written in plan: codes stored as HMAC with server key, atomic single use + attempt count, timingSafeEqual, session tokens stored only as SHA-256, Origin check, client IP only from Fastify request.ip (trustProxy = proxy address). Removes: better-auth (17 deps), @better-auth/expo, client libs, the converged IP bug, plaintext session tokens, Turkish I email bug, updateUser route; S02-05 and S02-08 Better Auth parts become moot.
- A F01: codes keyed (HMAC), not plain hash.
- P F02: limits per address + per account, numeric: per address 1/min, 5/hour, 10/day; 3 tries per code; consecutive failures -> growing waits with automatic unlock (not admin-only lock); counters in PostgreSQL; loose per-IP limit (campus NAT); limits on in tests.
- P F03: documented deviation from ASVS 6.3.3 (single factor email code) with mitigations: 3 devices, 30 days, "new device signed in" mail, session list/close, audit log. No home-made second factor.
- A F05: phone keeps session token in expo-secure-store, sends Bearer via our fetch helper; no auth client packages.
- A F06 (high): sender = BIDB service account (FR-005 form) + Google Workspace SMTP relay for server IP (or OAuth2); if own domain: SPF+DKIM+DMARC aligned, inbox test. Add to open points.
- P F07: code mail via pg-boss job; same response same speed whatever the address state; pending instructor gets "onay bekliyor" mail; job lives only as long as the code (5 min) and is deleted when done.
- P F08: panel browsers count as devices; 4th sign-in closes oldest + mail; instructor sees/closes sessions; admin closes all sessions of an account; deactivation ends sessions; panel: browser-close cookie, 1 h inactivity, max 24 h; 30-day session only in the instructor's own phone app.
- A F09: 30-day absolute cap, no refresh; renew prompt 3 days before while online; offline expiry keeps queued instructor actions; "no forced re-login mid-term" = students.
- P F10: store review account: fixed reusable code only for that address, env flag on only during review windows, same failure limits, sees only demo course, logged; fix line 87.
- A F11: name match function in packages/core: NFC, trim, collapse spaces, Intl.Collator tr base; table test. Names only.
- A F12: registration form only @istanbul.edu.tr; reaches admin after code verification; manual approval stays.
- A F13: in-app account deletion request for instructors too (Apple).
- P F15: Nodemailer on single-maintainer list; fallback = last good version pinned behind mail interface.
- A F16: panel same origin as API; cookie httpOnly, Secure, SameSite=Lax; no CORS.
- A misses: student non-record requests use a session token issued at registration (random, stored hashed, secure store this-device-only) -> also S08 F04 online-request token; registration code: secure random, bound to one student number, 72 h or first use, attempt-limited; e-mail field: no autocapitalize/autocorrect, email keyboard; server normalises (trim, I and I-dot -> i, ASCII lowercase, non-ASCII -> warning), test table; panel state-changing requests JSON only + Origin check.

## S12 iOS + OTA (V1 PASS, V2 PASS)
- A F1: TestFlight build dies 90 days after upload, OTA does not extend it: new build before expiry, students turn on TestFlight auto-update; written as the one exception to "no forced update mid-term" during trial.
- P F2+S04F10+S11miss: demo accounts for Apple + Play review: pre-approved demo instructor (fixed code only for that address, kept in App Store Connect/Play Console + server secret, not repo, changeable per submission, only demo course, exempt from 3-device limit, on only during review windows) + demo student exempt from one-phone rule; both recreated automatically if deleted; server reachable from abroad during review.
- P F3+misses: Apple account chosen before first TestFlight build and never changed (App Attest + keychain bound to team id). Guideline 5.1.1(ix) may demand an organization account (sensitive user info; May 2026 precedent): ask in an App Review consultation before deciding; individual account shows my legal name as seller (5.2.1 risk). Neutral descriptive app name.
- P F4: xprem control-plane mode, own database on existing PostgreSQL, no Redis/CDN; storage on a backed-up local volume (single instance), S3-compatible bucket only when scaled out; update URL on own domain; xprem image + eoas CLI pinned to same version; source link github.com/mercuretechnologies/xprem.
- P F5 (high): xprem signs with a server-held key: dashboard never public (SSH tunnel), publish token only in CI; offline backup = xprem master key + xprem DB inside PostgreSQL backups (line 519 wording).
- P F6: runtimeVersion policy appVersion (changes every public release; fixes published from that release's branch) so new features never reach older binaries.
- A F7: local SQLite schema changes only with a new binary, never by OTA.
- A F8: updateId sent in version check and with each upload.
- P F9: release info from one source (CI-written file); APK hash dropped.
- A F10: no dormant Phase 2/3 code switched on later; phases ship in reviewed binaries.
- P F11: Apple membership auto-renew (via Apple Developer app if site auto-renew not offered).
- A misses: xprem on single-maintainer list, fallback = pinned MIT image / fork, any Expo-Updates server can take over thanks to own URL + backed-up master key + DB; update check NOT on every cold start: checkAutomatically ON_ERROR_RECOVERY, app checks at most once a day after records are sent; xprem telemetry off; fallbackToCacheTimeout 0; account deletion always startable for students and instructors (queued behind unsent records with on-screen note) -> change line 84; TestFlight -> App Store move tested on own iPhone first (keys + pending records kept), offered to a student only when unsent = 0; GitHub APK update prompt staged by version check (percentage by device-id hash).

## S01 toolchain (V2 PASS)
- P F01: pnpm 12; pmOnFail: ignore keeps lockfile single-document so Dependabot can read it (dependabot-core #15904); exact pnpm version installed by CI, Docker and EAS (dev machine not enforced); check GitHub dependency graph once; drop setting when Dependabot fixes it.
- P F02: write minimumReleaseAge explicitly (strict 1-day hold; Dependabot bug #16375 fixed 2026-10-01) + trustPolicy: no-downgrade; drop "surum dusurme".
- A F03: security PRs can wait up to 1 day; urgent fix via pnpm audit --fix (minimumReleaseAgeExclude), removed after.
- A F04: Dependabot 3-day cooldown is default; config only grouping + majors separate.
- P F05: TypeScript pinned ~6.0.3 (npm latest = 7.0.2); move to 7 when tools support it (not "at 7.1"); TS7-safe settings list; source TS 7.0 announcement.
- P F06: Node 26 (LTS on 2026-10-28, EOL 2029-04-30); single CI version; version in .node-version, Dockerfile base tag and eas.json node field (must match).
- A F07: pnpm version in packageManager; CI pnpm/setup (young, SHA-pinned), Docker official pnpm image, eas.json pnpm + node.
- A F08: drop Turborepo; pnpm -r; pnpm deploy for server image.
- DECIDE F09 (vs S02-09): drop dependency-cruiser; Biome noPrivateImports at error level (module public face = index.ts, internals @package) + S02-09 exceptions; dependency-cruiser is the fallback if Biome proves too weak.
- A F10: Biome noFloatingPromises as error in server + phone code.
- A F11: CI permissions contents: read; third-party actions pinned to full SHA; Dependabot github-actions; node24 action majors.
- A F13+S06: protected main with required checks if repo public; private free repo -> pre-push hook runs Biome, tsc, Vitest; "kirmiziysa birlestirilmez" stated as my rule there.
- A F14: reverse proxy in Compose (Caddy unless IU gives proxy + certificate): TLS, forwards to API, later load balancer. Panel files served by API (S13); dev uses Vite proxy; @fastify/cors dropped.
- P F15: OpenTelemetry deferred until a monitoring backend exists; pino + request id + health + counters from day one. (check S05)
- P F16: dev: Metro over same Wi-Fi or Expo tunnel; API over LAN; release-like builds use Tailscale (stable, private), fake data only.
- P F18: pnpm catalogs for typescript, zod, vitest; NOT react/expo packages.
- A misses: Dependabot ignores expo, expo-*, react, react-native in apps/mobile (SDK upgrade via npx expo install --fix + expo-doctor); Node 26 type stripping for server/worker/tests (erasableSyntaxOnly, verbatimModuleSyntax, no enum, no tsconfig paths), core + contracts compiled to JS in image, tsx only if Cucumber needs it; pnpm allowBuilds list; Cucumber workers = CPU count; Dependabot docker + docker-compose; Compose profiles (app services prod, Mailpit dev).

## PROGRESS (plan.html edits; original md5 b9f1988abe70731d844f93c73e09664e = HEAD 4cca017)
- DONE: Hesaplar ve giris rows; Yoklama Asama 1 (pencere TZ, kafa sayisi, blok ders); saat callout + zayif nokta; etiketler + son durumlar; kenar durumlar (+iPhone anahtar, +yedekten donus).
- DONE2: Tek bakista dagitim; Devamsizlik (+uyari, formul); Hoca ve yonetici; Dagitim (except Desteklenen surumler row).
- TODO: Kayit ve gonderme (needs S07); Asama 2/3 (S10 + S13 pairing + S09 QR); Hile + Benzer (S15); Devamsizlik; Hoca ve yonetici; Dagitim; Teknolojiler (all subsections + ozet); Olceklenme; Surdurulebilirlik; Baslangic; Hedefler; Acik noktalar; Kaynaklar; Sozluk; meta date.
- S10 audit2 done (PASS): F03 64-bit tag fits QR v1-L; F04 frame size capped at PREVIEW (~720p budget phones), no patch; F07 keep BLUETOOTH_CONNECT; F11 location module not GPS-only; F12 REJECT (re-staging). Misses: iOS scan foreground, no filter, AllowDuplicates, stops when screen locks; Android 12+ neverForLocation not allowed when deriving location -> location permission needed; projection page must show "no code" instead of stale QR on network drop; 4-module quiet zone; line 243 contradiction; gallery claim.

## S07 mobile (V2 PASS)
- A F03: no TanStack Query on phone (screens read SQLite; instructor online screens call fetch helper). Panel keeps it.
- A F04: no drizzle on phone: expo-sqlite + numbered SQL steps + PRAGMA user_version, change listener; migration test.
- A F05: 30 s timeout per request; unexpected response (captive portal) = failure; expo-network listener.
- P F06: honour Retry-After plus random spread above it.
- P F10: start-up check DB vs key (no DB -> wipe old keys; key missing/mismatch -> device change); restored pending records go into the device-change decision; allowBackup false not enough alone.
- A F11: phone DB add-only; schema changes only with new binary.
- P F12: one shared phone queue for all writes (student check-in + problem report; instructor head count, early close, duration change, manual add, receipt scan) with time certificate + retry; instructor writes authenticated by session; event log after records.
- A F08: download cursor + data generation -> "bastan indir" (same as S03 restore).
- A F01: phone starts on newest stable SDK at that time (today 57; 58 beta: RN 0.88, React 19.3, same OS floors, iOS 27 scene lifecycle default).
- A F02: concrete sync-engine reasons (Zero refuses offline writes; PowerSync needs own service + op-sqlite; Electric joined Databricks 2026-08-11, cloud closing).
- A F07: Android background min 15 min set explicitly (default 12 h), throttled; iPhone idle/overnight; background send only pre-signed records, no keychain reads when locked.
- A F09: WAL + synchronous=FULL; receipt only after commit.
- A F14+miss: event log gets JS errors (error boundary + global handler) and native crash records read at start (Android 11+ exit reasons, iOS MetricKit).
- A F16: iOS side of native module minimal, Android tested first locally, iOS builds batched.
- A F17: shared rules use no Intl/locale; times as UTC ms; Turkish name matching + sorting on server (FIX Ogrenci kaydi row: "sunucudaki tek fonksiyon").
- A F15: Kaynaklar StatCounter TR Android-version + iOS-version pages; Android <7 ~1.8%, iOS <16.4 ~2.3%.
- A misses: notification permission asked right after first check-in with reason (Android: create channel first), denied -> unsent banner on open, permission state logged; Let's Encrypt vs Android 7.0 (CA trusted by 7.0 or floor 7.1/API 25; test on 7.0 emulator); server validates per record (no whole-batch 400); phone retries only network error, timeout, 408, 429, 5xx; 400/413 -> halve batch, mark bad record ret (kept), log, continue; 401/403 -> stop, show device state; Phase 1 receipt QR needs expo-camera (instructor) + small QR renderer in Phase 1 list; App Attest offload breakage: new key bound via second hardware key (Secure Enclave) made at registration, no face-to-face; hak uyarisi may lag without push (background task downloads after send).

## S10 phase 2/3 (V2 PASS)
- A F01/F02: QR delay with per-record allowance; instructor phone derives QR slot from certificate + counter (no valid cert -> QR still made, session flagged).
- P F03: QR payload digits only (numeric mode); 64-bit MAC -> about 41 digits -> version 1-L.
- P F04: keep expo-camera; analysis frames capped at preview size (screen or 1080p, ~720p budget phones), fix "en yuksek cozunurluk"; measure first-read time on cheapest + high-res Android; no patch by default.
- A F05: 2x zoom per platform (Android 2/maxRatio, iOS log2/log max), read after camera starts, recheck each SDK.
- A F06: CameraView only, no launchScanner.
- P F07: all Bluetooth in own native module (advertise + scan only, no connect); drop react-native-ble-manager + munim-bluetooth; keep BLUETOOTH_CONNECT for enable dialog.
- P F08+miss: student scan <= 30 s, stop after seeing current code a few times; Android one filtered scan session (fixed first half of service UUID), <= 5 starts / 30 s; iPhone foreground only, no filter, AllowDuplicates, app filters; screen kept on; screen lock -> "Bluetooth yok", not against student.
- A F09: 2-5% is a target to test (Acadly is mesh), measured vs QR-verified records per phone model.
- A F10: precise location only; approximate -> no GPS check, "konum yok" neutral; iOS temporary full accuracy via own module.
- P F11: single-shot location in own module (Android FUSED if present else NETWORK then GPS; iOS CLLocationManager) with mock/simulation/accessory flags; drop expo-location.
- R F12 (re-staging).
- A F13: iOS accessory flag too.
- A F14 (+S14 F16): QR target: largest hall back row, cheapest supported Android + oldest supported iPhone, >= 95% of 20 tries read within 5 s; note screen height and distance.
- A F15: pairing single use, bound to first browser, one projection per session, reuse -> reject + close + notify, attempts limited.
- A F16: one pure-JS QR lib (qrcode) phone + panel; no react-native-qrcode-svg.
- A F17: expo-keep-awake on phone, Screen Wake Lock on projection.
- A misses: no neverForLocation -> Android BLE scan needs location permission + location on (fix line 261); projection page prefetches codes <= 30 s, shows by server time, expired -> remove QR "baglanti bekleniyor"; GPS: sum both accuracy radii + margin, no fix = neutral; 4-module quiet zone, light background; single delay ladder (normal <= 10 s, flagged 10-30, reject > 30 after allowance); gallery item -> Isaretlenir; instructor QR keys in Android Keystore (non-exportable HMAC) / iOS secure store this-device-only.

## S05 ops (V2 PASS)
- A F01: rate limit per verified device (preHandler after verification) on send + authenticated routes; per-IP only on unauthenticated routes, wide (NAT); LRU > active devices; trustProxy = proxy only; k6 with these settings.
- DECIDE F02+F14: Caddy (unless IU gateway) does TLS, serves panel files (small Caddy image with panel build), sets panel CSP + cache rules, forwards /v1 to API and update path to xprem, ignores client X-Forwarded-For; later LB. API serves only /v1 -> no @fastify/static, no @fastify/cors; Origin check mandatory.
- A F03: no codes/tokens/student numbers in URLs; logs route pattern; never log student number/name (UUID only); pino redaction second guard.
- A F04: no OpenTelemetry at first (pino + request id + duration, health, DB counters); @fastify/otel when copies multiply; pg-boss 12.36 OTel built in, idle until SDK.
- A F05: pg-boss schema by its own command in release step after Drizzle (migrate:false at start), version pinned (>= 12.36.0).
- A F06: one scheduled job every few minutes closes expired sessions (no per-session jobs); nightly job missed: once.
- P F07: image via pnpm deploy, node user, init: true, graceful shutdown, stop_grace_period 40 s, migrations as one-shot service the others wait for.
- A F08: Docker log driver local.
- P F09: secrets as Compose secret files per service, Zod-validated; dev .env via node --env-file.
- A F10: Cache-Control: no-store on API responses.
- A F11: SHA-pinned actions enforced, GITHUB_TOKEN read-only, Dependabot actions + docker + compose, immutable GitHub releases.
- A F12: under-pressure thresholds explicit from k6.
- P F13: /health/ready = DB + schema only; worker liveness from pg-boss instance table; health endpoints internal; live outside under-pressure.
- P F15: Valkey off the growth list; shared counters in PostgreSQL; Valkey only if measurement demands.
- P F16: MASVS 2.1.0, MAS-L1 + RESILIENCE app/device integrity items; NO certificate pinning (auto-renewed cert, Android pins need new APK).
- P F17: advisories via Dependabot alerts + nightly pnpm audit --prod.
- A F18: Stryker weekly; schedules at odd minute (e.g. 03:17); watch 60-day disable.
- A misses: login code mail sent directly without awaiting (NOT queued; queue jobs carry no code/name/number) -> FIX Hoca girisi row; restart: unless-stopped + process exits on fatal error + external uptime check alerting me; host NTP; clock-certificate key + QR key source in Korunacak anahtarlar, offline backup, never generated at start, kid in every certificate, old public keys kept until term lock; root error handler generic message + request id, DB errors logged as code + constraint only, redact err.params/err.query, scenario checks no student number leaks; API pg-boss uses Drizzle pool (db option), connection budget vs max_connections 100; mem_limit for API + worker, under-pressure memory threshold below it.
- DONE3: Kayit ve gonderme (all rows); Hoca girisi mail fix; Ogrenci kaydi server-side matching fix. NEXT: Asama 2/3, Teknolojiler, Olceklenme, Surdurulebilirlik, Baslangic, Hedefler, Acik noktalar, Kaynaklar, Sozluk, Desteklenen surumler row, meta date; then S15 (Hile + Benzer).
- DONE4: Asama 2 + Asama 3 bullets; Teknolojiler: Ozet, Temel, Sunucu (Cati, Mimari, Sozlesme, Veritabani erisimi, Kimlik, Imza, Arka plan, E-posta, Guvenlik, Ayarlar, Loglar). NEXT: Veritabani details, Testler (+ ornek senaryo Gecmis/teyitli), Telefon, Web paneli, Altyapi, Olceklenme, Surdurulebilirlik, Baslangic, Hedefler, Acik noktalar, Kaynaklar, Sozluk, Desteklenen surumler row, meta date 5 Ekim 2026, Hile + Benzer (S15).

## S15 market (V2 PASS; read S15 digest for the rest)
- F1 high (reboot + offline + forwarded QR -> unverified auto-accept) is covered by the S09 send-time anchor; reboot after scan too -> stays capped at 2.
- CORRECT lines 116 + 331: offline products DO exist: Attendix (Sept 2025, student app, classroom BLE beacons, offline queued check-ins); Edusign NFC reader "wireless and offline". Both put hardware in the room; this plan does not.
- ADD Turkiye: Aksaray Universitesi directive (Senato 15.01.2025) orders paper signatures when no internet.
- Wording: Ohio Top Hat "pahali" unsupported -> drop; "en sik sikayet" superlative unsupported -> "sik".
- F4: backup code must never be shown on the projector under the QR.
- F5 issue: reverse pairing needs phone online -> keep reverse pairing (projection already online) + phone shows QR itself when offline (already written).
- F6: calling 3 random names catches ~27% (10 of 100 absent) -> flagged sessions read full list.
- Play Integrity quota note for line 295 moot (Play Integrity dropped).
- DONE5: Teknolojiler all subsections (Veritabani, Testler + ornek senaryo, Telefon, Web paneli + Sunulma, Altyapi); Olceklenme; Surdurulebilirlik; Baslangic (klasor, veri modeli, gelistirme, is sirasi). NEXT: Hedefler, Acik noktalar, Hile + Benzer (S15), Tek bakista 'Neden internetsiz', Desteklenen surumler row, Kaynaklar, Sozluk, meta date. Then deterministic checks + critic.
- DONE6: ALL sections integrated (Hedefler, Acik noktalar, Hile, Benzer, Tek bakista, Desteklenen surumler, Kaynaklar + Web paneli group, Sozluk, date). Checks: tag balance ok, anchors ok, en dash 15->0, em dash 0, words 6525->13938. plan.html md5 52a89f4e... (before 09:00 dash fix). Cold critic launched on final plan. NEXT: apply critic fixes, self-rate, report to owner (no commit without approval; commit msg style 'Docs : ...' ASCII).
- CRITIC (cold, FAIL, 35 items; full text in agent message). Applied: 1,2,3,4,5,6,14. Remaining: 7 Caddy always, 8 compose profiles, 9 background no signing, 10 after-deadline rule, 11 two-anchor label wording, 12 HMAC old secret key kept, 13 Play Integrity reasons (app is on Play, can add later), 15 cert renewal wording (373/535/612/726), 16 browser versions 114/430, 17 Jibble hardware, 18 baglanti bekleniyor same text, 19 app-integrity Android part, 20 prod App Attest only, 21 Asama 2 card overclaim, 22 collapse spaces, 23 demo code limits, 24 Node LTS wording, 25 Kaynaklar labels, 26 xprem yonetim paneli, 27 ilk kayit teyidi wording, 28 projeksiyon icin hesap, 29 10-30 s -> Incelemede, 30 random name only server records + hoca list item, 31 queue auth wording, 32 panel locale vs core, 33 QR yok card, 34 WAL wording + karar list, 35 split Calistirma row into Servisler/Caddy/Imaj.
