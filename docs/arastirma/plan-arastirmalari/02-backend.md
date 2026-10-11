# 02 Backend choice for the IU attendance app

Researched 2026-09-28. Read-only web research (WebSearch/WebFetch). Legend:
**[V]** verified against the cited source this session, **[I]** inference or my own estimate,
**[U]** stated by a secondary source only, not confirmed against a primary source.

## Verdict

| Rank | Option | One-line reason |
|---|---|---|
| **Winner** | Custom backend: TypeScript (Fastify or NestJS) + PostgreSQL, Docker Compose on an IU BIDB VM (or a Turkish provider) | Only option that is legally clean on day one, has the fewest moving parts to hand over, and the core logic (signature check, time window, dedupe, audit) has to be custom code anyway |
| **Second** | Supabase **self-hosted** on IU servers (Supabase Cloud Frankfurt only for dev with synthetic data) | Postgres + RLS + Auth (email OTP, domain gate hook) + pg_cron out of the box; data stays plain Postgres so it can later collapse into the winner. Cost: 12-13 containers, community-supported, no managed PITR |
| Rejected | Firebase | No Türkiye region (Google/Turkcell Ankara region targets full capacity 2028); proprietary Firestore data model = hard lock-in; rules cannot verify signatures |
| Rejected | Appwrite (Cloud and self-hosted) | Cloud: only EU region is Frankfurt. Self-hosted: large multi-container stack, major version churn (1.8.1 Mar 2026, 2.x by Sep 2026); smaller hiring pool than Postgres/Node for a successor |
| Rejected | PocketBase | Pre-1.0 with two parallel release lines (v0.22.x and v0.40.x), single maintainer ("no paid team or company behind it"), SQLite single-server only. Fine for a hackathon, wrong for a university-wide handover |
| Rejected for production (hosted) | Supabase Cloud / Appwrite Cloud / Firebase with real student data | Public-institution cloud rule (Genelge 2019/12) plus KVKK Art. 9(7); see Residency section. Needs a legal opinion before any real data leaves Türkiye |

## 1. Data residency and law (drives everything else)

- **KVKK Art. 9 as amended by Law 7499 (2 Mar 2024)** [V, official text mevzuat.gov.tr/mevzuatmetin/1.5.6698.pdf]:
  - 9(1) transfer abroad on an adequacy decision; 9(4) otherwise with appropriate safeguards (a: agreement between public bodies, b: BCRs, c: Board-published standard contract, ç: written undertaking approved by the Board).
  - 9(5) "Standart sözleşme, imzalanmasından itibaren beş iş günü içinde ... Kuruma bildirilir."
  - 9(6) occasional transfers (consent, contract performance, etc.).
  - **9(7): "Altıncı fıkranın (a), (b) ve (c) bentleri, kamu kurum ve kuruluşlarının kamu hukukuna tâbi faaliyetlerine uygulanmaz."** Istanbul University is a state university and attendance is a public-law activity [I], so the "student consented" route is not available for it.
- **No adequacy decision has been issued by the Board** as of July 2026 [U: koksal.av.tr, kvkk-cross-border guides; consistent with the absence of any decision on kvkk.gov.tr]. So any transfer to Frankfurt etc. means signing the KVKK standard contract with the vendor and notifying within 5 business days. Supabase/Google/Appwrite would have to accept the Turkish SCC as-is [I]; that is not something a student can arrange.
- **Presidential Circular 2019/12, Bilgi ve İletişim Güvenliği Tedbirleri (6 July 2019)** [V, iletisim.gov.tr]: "Kamu kurum ve kuruluşlarına ait veriler, kurumların kendi özel sistemleri veya kurum kontrolündeki yerli hizmet sağlayıcılar hariç bulut depolama hizmetlerinde saklanmayacak." A state university is a public institution [I]; the attendance records are therefore expected to live on IU's own systems or a domestic provider under IU control.
- **Regions** [V]:
  - Supabase: 17 AWS regions; EU ones eu-west-1/2/3, eu-central-1 (Frankfurt), eu-central-2 (Zurich), eu-north-1. **No Türkiye region.** (supabase.com/docs/guides/platform/regions)
  - Firebase/Firestore: many EU regions incl. europe-west3 Frankfurt, europe-central2 Warsaw; Middle East me-central1 Doha, me-central2 Dammam, me-west1 Tel Aviv. **No Türkiye region.** Page last updated 2026-09-24. (firebase.google.com/docs/firestore/locations)
  - Google Cloud Türkiye (Ankara, with Turkcell): announced Nov 2025, construction from Q1 2026, **full capacity targeted 2028** [V: businesswire 2025-11-11, AA, DCD, invest.gov.tr]. Not usable for this project's timeline.
  - Appwrite Cloud: FRA, NYC, SYD, SFO, SGP, TOR; AMS and LON "coming soon". **No Türkiye region**, only EU region is Frankfurt. (appwrite.io/docs/products/network/regions)
- Domestic hosting: IU BIDB runs a virtualization platform [U: search snippet on bilgiislem.istanbul.edu.tr, ISO/IEC 27001:2022 claim not confirmed on the page]. Türk Telekom Bulut offers VMs in Istanbul/Ankara DCs [U: datacentermap/turktelekombulut.com]. Any plain-VM provider works for the winner and for Supabase self-hosted; none of them offer "managed Supabase/Firebase".
- **Unavoidable foreign processors even when self-hosting** [I]: Android push goes through FCM (Google) and iOS through APNs (Apple). Device tokens and payload text leave Türkiye regardless of backend. Mitigation: payloads carry no names or grades, only a course code and a generic string, and the app fetches details from the IU server. **Escalate: this needs the KVKK officer's sign-off.**

## 2. Per-option comparison

### 2.1 Custom backend (TypeScript Fastify/NestJS or FastAPI or Go) + PostgreSQL  (WINNER)

- Offline signed check-ins: a single `POST /checkins:batch` endpoint. Verify Ed25519 with Node `crypto.verify` (or WebCrypto), check window against server-issued session start/end (never the device clock alone), `INSERT ... ON CONFLICT (idempotency_key) DO NOTHING` plus `UNIQUE(session_id, student_id)`. Deterministic, unit-testable. [I]
- Row authorization: in the service layer (`WHERE course.instructor_id = $me`), optionally backed by Postgres RLS with `SET LOCAL app.user_id` for defence in depth. [I]
- Audit log: append-only `attendance_audit` table written in the same transaction as the correction (who, when, old, new, reason); revoke UPDATE/DELETE on it from the app role. [I]
- Scheduled jobs: auto-close needs **no job at all** if "closed" is derived from `closes_at <= now()` at insert/read time. Reminders and 70% threshold alerts: pg-boss (Postgres-backed queue, no Redis) or BullMQ. [I]
- Push: `firebase-admin` sends to FCM for Android and iOS (FCM relays to APNs with an uploaded APNs key). [I; standard FCM setup]
- Excel/PDF: server-side (ExcelJS for .xlsx, pdfmake/PDFKit for PDF; openpyxl + WeasyPrint if Python). Server-side keeps exports consistent with the audited data. [I]
- Currency [V]: NestJS v12.1.1 released 2026-09-28, v11.2.6 security patch 2026-09-23 (github.com/nestjs/nest/releases). Fastify v5.12.5 security release Sep 16 (2026), v6.0.0-alpha.4 Sep 17 (github.com/fastify/fastify/releases).
- Cost: licence $0. Pilot and 50k both fit on one modest VM (see §3). [I]
- Lock-in: none; Postgres + HTTP API.
- Self-host on IU servers: easiest of all options, 2-3 containers (api, postgres, optional worker). [I]
- Ops burden for solo dev: moderate. The dev must write auth (email OTP), rate limiting and the admin panel. Mitigation: use an established auth library rather than hand-rolled OTP; keep a modular monolith, not microservices. [I]
- Handover after graduation: best of the set. Postgres + Node/Python are skills BIDB staff and future students already have; a README, migrations and tests are the handover package. Risk: custom code quality is on the student. [I]

### 2.2 Supabase (SECOND; self-hosted for prod, Cloud only for dev)

- Pricing [V, supabase.com/pricing]: Free $0 (500 MB DB, 50k MAU, **paused after 1 week of inactivity**, max 2 projects), Pro from $25/mo (100k MAU, 8 GB DB, 250 GB egress, 100 GB files, $10 compute credit), Team from $599/mo (SOC2/ISO 27001 reports on Team+). Overage: MAU $0.00325, DB $0.125/GB, egress $0.09/GB. Compute: Micro covered by credit, Small +$5, Medium +$50 [U: uibakery/makerkit breakdowns].
- Auth: email OTP built in; "Before User Created" hook can reject sign-ups outside allowed domains (documented example) [V]. Built-in mailer is limited to **2 emails/hour**; custom SMTP required for any real use [V, supabase.com/docs/guides/auth/rate-limits].
- Row authorization: Postgres RLS, the strongest native fit of all BaaS options [I].
- Offline sync: no built-in client offline store; signed-check-in verification must be an Edge Function (Deno, WebCrypto Ed25519) or a Postgres function. PowerSync (Open Edition self-hostable) exists if full bidirectional sync is ever needed [U: powersync.com]. For append-only check-ins an app-side outbox is enough [I].
- Scheduled jobs: Supabase Cron = pg_cron, second-to-yearly intervals, can call SQL or HTTP/Edge Functions [V, supabase.com/docs/guides/cron].
- Push: no built-in push; Edge Function calling FCM [I].
- Excel/PDF: Edge Function or client-side [I].
- Self-hosting [V, supabase.com/docs/guides/self-hosting]: Docker Compose; you own provisioning, hardening, updates, backups, HA, monitoring. Missing vs platform: single project only, no branching, no managed backups/PITR, no advanced metrics, no management API. Community support only. Stack: Studio, Envoy (default gateway since self-hosted v0.8.0, 2026-08-11), Auth, PostgREST, Realtime, Storage, imgproxy, postgres-meta, Postgres, Edge Runtime, Logflare, Vector, Supavisor [V, github.com/supabase/supabase/tree/master/docker].
- Currency [V, docker/CHANGELOG.md]: self-hosted v0.8.2 2026-09-23, v0.8.1 2026-09-09, v0.8.0 2026-08-11, update.sh/upgrades.json introduced v0.7.1 2026-08-03 (young upgrade tooling). Repo Apache-2.0, ~110.9k stars [V].
- Lock-in: low for data (plain Postgres), medium for code (RLS policies + Edge Functions + supabase-js calls).
- Why second and not first [I]: every hard requirement (signature check, idempotency, window check, audit, alerts) still lands in custom Edge Functions/SQL, so Supabase saves mainly auth + admin UI while adding ~13 services for BIDB to run and a split codebase (SQL policies + Deno functions + client queries) for the successor. Choose it instead of the winner only if the student strongly prefers not to write auth and BIDB agrees to host the stack.

### 2.3 Firebase (REJECTED)

- Pricing [V, firebase.google.com/pricing]: FCM no-cost; Auth 50k MAU no-cost; Functions 2M invocations/mo free then $0.40/M; Firestore Spark 50k reads, 20k writes, 20k deletes/day, 1 GiB. Standard edition list price $0.06/100k reads, $0.18/100k writes [U: secondary; exact europe-west3 figures not retrieved from the Google page]. Firebase now also lists "SQL Connect (PostgreSQL)" from $9.37/mo after a 3-month trial [V].
- Offline: Firestore has the best built-in offline cache of the set [I; well known], but offline writes are unsigned document writes. Rules `hashing` namespace offers crc32/crc32c/md5/sha256 only, no signature verification [V, firebase.google.com/docs/reference/rules/rules.hashing], so a Cloud Function is required anyway.
- Row auth: security rules, workable. Audit: Function triggers. Jobs: scheduled Functions + Cloud Scheduler (per-job pricing; exact free-job count not retrieved) [I/U].
- Residency: no Türkiye region, Ankara region targeted 2028 [V]. Self-host: impossible (emulator is not production). Lock-in: highest (Firestore query/data model, rules, Functions triggers). Reject.

### 2.4 Appwrite (REJECTED)

- Pricing [V, appwrite.io/blog/post/appwrite-pricing-update, 2025-08-08, effective 2025-09-01]: Pro $25/mo per project, 2 TB bandwidth, overage $15/100 GB bandwidth, $2.8/100 GB storage, $0.06/GB-hour functions; Pro/Scale unlimited messages; Free 1,000 messages/mo. 200k MAU on Pro [U]. Dedicated DB compute from $10/mo [V, appwrite.io/pricing].
- Features: Messaging with FCM and APNs providers [V, appwrite.io/docs/products/messaging/fcm]; functions with cron schedules [I]; document permissions/teams for row auth [I].
- Currency [V]: self-hosted 1.8.0 Oct 2025, 1.8.1 2026-03-06; releases 2.1.0 to 2.3.0 in Sept (2026 per changelog context); changelog 2026-09-24 "Native PostgreSQL, MySQL, and dedicated databases in every Appwrite Cloud region". Very active, but a moving target for a self-hoster.
- Residency: Cloud only Frankfurt in EU, none in Türkiye [V]. Self-hosted: possible, but a large container stack and an Appwrite-specific data/permission model; weaker handover story than plain Postgres [I].

### 2.5 PocketBase (REJECTED)

- [V, pocketbase.io/faq]: "Only on a single server, aka. vertical" scaling; "embedded SQLite (in WAL mode) and there are no plans for supporting other databases"; "There is no paid team or company behind it. It is a personal open source project."; recommended for "small and midsize applications".
- [V, github.com/pocketbase/pocketbase/releases]: v0.40.4 2026-09-12, v0.40.3 2026-09-06 alongside v0.22.55 backport line; v0.40.0 had breaking changes. Still 0.x.
- Strengths: single binary, trivial to host, built-in cron and JS/Go hooks, 10k+ realtime connections on a $4 VPS [V]. Weakness for this project: bus factor 1 upstream plus bus factor 1 downstream (the student), breaking changes between 0.x lines, SQLite single node for a possible 50k-student rollout. Reject for production; acceptable only as a throwaway prototype.

## 3. Load and cost estimate  [I, computed by script, not eyeballed]

Assumptions: 6 courses/student, 1 or 2 sessions/week, 14-week terms, 2 terms/year, ~500 bytes/check-in row incl. indexes and signature, 20 app opens x 30 reads/student/month.

| Scale | Check-ins/year | Check-ins/month in term | DB growth/year | Firestore est. |
|---|---|---|---|---|
| Pilot 500 students, 1/wk | 84,000 | 10,500 | 0.04 GB | ~$0 (free tier) |
| Pilot 500 students, 2/wk | 168,000 | 21,000 | 0.08 GB | ~$0 |
| 50k students, 1/wk | 8,400,000 | 1,050,000 | 4.2 GB | ~$18/mo |
| 50k students, 2/wk | 16,800,000 | 2,100,000 | 8.4 GB | ~$20/mo |

Campus peak if 20% of 50k check in within 5 minutes: ~33 writes/s. One Postgres on a 4 vCPU / 8 GB VM handles this with large headroom [I]. Monthly cash cost at 50k: custom or Supabase self-hosted on IU VM $0 licence (VM + backup from BIDB); Supabase Pro ~$25 + $5..50 compute + ~$0.125/GB beyond 8 GB after year 1-2; Appwrite Pro $25 + DB compute; Firebase ~$20-60. **Cost does not separate the options; residency and handover do.** Email OTP volume (50k sign-ups once, then re-logins) needs IU SMTP or a mail provider in every option.

## 4. Handover (student graduates)

- Winner: repo + Docker Compose + migrations + runbook handed to BIDB; any Node/Postgres developer can take over [I].
- Supabase self-hosted: BIDB must learn to upgrade a 13-service stack whose upgrade tooling is from Aug 2026 [V dates, I judgement].
- Firebase/Appwrite Cloud: billing account and console ownership must move to an IU institutional account; if the student's personal card or Google account owns it, the service dies with the graduation [I].
- PocketBase: upstream single maintainer plus 0.x breaking changes [V].

## 5. Escalations for the main conversation (not decided here)

1. Legal: confirm with IU's KVKK contact that Genelge 2019/12 applies and that no cloud outside Türkiye may hold real student data (pilot included). This decides "self-host from day one" vs "Frankfurt for the pilot".
2. Privacy: FCM/APNs device tokens and push payload content necessarily leave Türkiye; payload content policy needs sign-off.
3. Hosting owner: whether BIDB will host a VM (and back it up) or the department rents a domestic VM. Handover plan depends on this answer.
4. Anti-fraud design of the offline signature (device key registration, instructor-rotated nonce/QR) belongs to the check-in protocol track; the backend choice above supports any of them.

## Sources (accessed 2026-09-28)

- https://supabase.com/pricing
- https://supabase.com/docs/guides/platform/regions
- https://supabase.com/docs/guides/self-hosting
- https://supabase.com/docs/guides/cron
- https://supabase.com/docs/guides/auth/auth-hooks/before-user-created-hook
- https://supabase.com/docs/guides/auth/rate-limits
- https://raw.githubusercontent.com/supabase/supabase/master/docker/CHANGELOG.md
- https://github.com/supabase/supabase (license, stars)
- https://firebase.google.com/pricing
- https://firebase.google.com/docs/firestore/locations (updated 2026-09-24)
- https://firebase.google.com/docs/firestore/pricing (updated 2026-09-24)
- https://firebase.google.com/docs/reference/rules/rules.hashing
- https://www.businesswire.com/news/home/20251111239976/en/ ; https://www.aa.com.tr/en/economy/turkcell-google-cloud-to-build-hyperscale-data-centers-in-turkiye/3780306 ; https://thetechcapital.com/turkcell-google-cloud-plan-sovereign-cloud-region-in-ankara-by-2028/
- https://appwrite.io/blog/post/appwrite-pricing-update (2025-08-08, upd. 2025-10-29)
- https://appwrite.io/pricing ; https://appwrite.io/docs/products/network/regions ; https://appwrite.io/docs/products/messaging/fcm ; https://appwrite.io/changelog ; https://appwrite.io/blog/post/appwrite-1-8-1-self-hosted-release
- https://pocketbase.io/faq/ ; https://github.com/pocketbase/pocketbase/releases
- https://github.com/nestjs/nest/releases ; https://github.com/fastify/fastify/releases
- https://www.mevzuat.gov.tr/mevzuatmetin/1.5.6698.pdf (KVKK consolidated text, Art. 9)
- https://www.iletisim.gov.tr/turkce/haberler/detay/cumhurbaskani-erdogandan-bilgi-ve-iletisim-guvenligi-tedbirleri-genelgesi (Genelge 2019/12)
- https://koksal.av.tr/bilgi-merkezi/yurt-disina-veri-aktarimi/ (no adequacy decision, secondary)
- https://powersync.com/blog/bringing-offline-first-to-supabase (secondary)
- https://turktelekombulut.com/ ; https://bilgiislem.istanbul.edu.tr/tr (content not retrievable)

Not verified: exact Firestore europe-west3 per-operation rates, Cloud Scheduler free-job count, Appwrite Pro MAU cap, IU BIDB ISO 27001 status and VM offering, Appwrite/PocketBase licences (not re-checked; GitHub API rate-limited).
