# Critic C2: adversarial review of iu-yoklama-ozet.html (revised protocol)

Reviewer stance: competitor engineer who wants this rejected. Read-only review.
Inputs: `iu-yoklama-ozet.html` (all sections and Ek A-E), `faculty-notes.md`, `critic-C.md`,
`research/06-iu-specifics.md`, `research/08-notify-report.md`. Date: 2026-09-29.

VERDICT: FAIL

One line: the revision fixed the lifecycle and identity problems, but the new protocol has one
laundering channel (reboot between scan and sync) that every time-based attack falls into and
that honest students hit routinely, it cannot start an attendance that is not on the timetable
(a faculty requirement), its 7-day window overruns the AKSIS deadline in the last week of term,
and its default for "izinli" contradicts Md.35 and would bar students on official duty.

---

## Part 1. Status of the 14 critic-C findings

| # | Finding | Status | Reason |
|---|---|---|---|
| 1 | Instructor key lifecycle | PARTLY | Server-created sessions, 14-day seeds, key_id, MAC over all fields, persist(), no seed on shared PC: done. The instructor outbox (Başlat time, close time, head count, manual adds) and its "not yet synced" nag are not specified anywhere. |
| 2 | Anti-forwarding bypass | FIXED (as asked) | Native elapsedRealtime/boot count and CLOCK_MONOTONIC named, offset measured, broken chain goes to "incelemede", WhatsApp moved to "işaretlenir". New holes in the fix itself: see C2-1, C2-7, C2-8. |
| 3 | Two students on one Android phone | PARTLY | Secure Folder moved to "önlenemez" and device change now needs instructor approval, but "Arkadaşının hesabına kendi telefonundan girmek" is still listed under "Önlenir", which the same section's Secure Folder entry contradicts. |
| 4 | Head count | PARTLY | Optional and evaluated on day 7: done. Still entered at the end ("Süre dolunca" step), still names nobody (no per-record evidence), and a day-7 flag has no defined consequence. |
| 5 | Unsynced records | PARTLY | Daily "senkron bekliyor" reminder and 7-day auto-accept regardless of export: done. Missing: pre-DEVAMSIZ "students near threshold with pending records" list. "Makbuzlu kayıp kayıt 0" is still a pilot metric the server cannot measure. |
| 6 | One lesson, two sessions | FIXED | Server owns the session; records merge by course, section and slot. |
| 7 | Local notifications | PARTLY | pg-boss is gone and the closing reminder moved to "Sonra", but a class-time local notification stays in MVP (iOS 64-pending limit, refilled only when the app runs, Android 14 inexact up to 1 h, per Ek C). |
| 8 | QR geometry | FIXED (as a plan) | 2x zoom, >=1080p analysis stream, measure in the largest room. Still unmeasured; payload size must not freeze before that test. |
| 9 | Phone accepts what it cannot validate | PARTLY | Check digit and "senkron sonrası kesinleşir" receipt: done. The QR carries no course/section, so a session_id missing from the phone's list cannot be told apart from the neighbour section's QR (C2-3). |
| 10 | MVP too big | PARTLY | EN, dark mode, unit calendars, Google login, pg-boss, PDF engine cut. Four roles, block lessons, account recovery, join requests, typo suggestions, second-account hashing and a custom native module remain (Part 3). |
| 11 | Legal/BİDB critical path | FIXED | Applications this week, 15 Aralık go/no-go, fallback hosts named. But the list omits the IU publisher account (C2-10). |
| 12 | Backups, on-call, graduation | PARTLY | Nightly pg_dump, restore test, records kept until term lock, week-8 rebuild, accounts owned by a faculty member: done. On-call owner is "BİDB ile netleşmeli", no handover runbook. |
| 13 | Email delivery | FIXED | İÜ SMTP relay is a stated prerequisite in the critical path. |
| 14 | Device change orphans records | FIXED | Old keys valid until revoked_at. Whether revoked_at is request time or approval time is not stated (C2-9). |

---

## Part 2. Findings on the revised protocol (most severe first)

### C2-1. The reboot bucket launders every time attack and punishes honest students (CRITICAL)
- With reboot between scan and sync the scan time is unknown, so a forwarded QR, an old photo of
  last week's QR scanned today, and a dead battery all land in the same "incelemede" row with the
  same evidence (none). "Eski dersin QR fotoğrafıyla katılmak: Önlenir" is false: it is only
  flagged, if the cheater reboots before syncing.
- Honest reboots are routine: the doc's own edge-case table has "Şarj bitti"; students scan in the
  morning and sync at home. The design's own target "işaretlenmeden kabul >= %98" allows 2% flagged:
  0.02 x 100 students x 14 weeks x 4 courses = 112 items per instructor per term, each with nothing
  to judge on. Instructors will approve all (cheaters pass) or ignore all ("onaya kadar sayılmaz",
  so honest students go DEVAMSIZ, against "Haksız yere finalden men 0").
- Fix: the phone stores an anchor (server time, monotonic value, boot id) at every online contact,
  not only at sync. Scan time = nearest same-boot anchor before OR after the scan. A reboot after
  the scan no longer matters if the phone was online at any point earlier in that boot (true for
  almost every student). Only "no same-boot anchor on either side" stays unresolved; auto-accept
  the first 2 per student per term, flag repeats. Review is required only for flags that flip a
  student's DEVAMLI/DEVAMSIZ result.

### C2-2. A stolen 14-day seed gives remote, undetectable attendance to a whole class (CRITICAL)
- Seeds live in the instructor PWA (IndexedDB/WebCrypto). The instructor's laptop sits on the podium,
  plugged into the projector, during breaks. Anyone with devtools can call the MAC with the stored
  key. A static web page then generates live, correctly timed QRs for every course of that instructor
  for 14 days. The delay check passes because the QR is generated at the right slot. This scales to
  the whole class in a way paper forgery does not, so it fails the "better than paper" bar.
- Nothing ties a record to the fact that the instructor actually pressed Başlat in that room.
- Fix: add a random 32-bit start nonce generated at Başlat to the QR payload and MAC; the instructor
  outbox reports {session_id, nonce, start, close}; server rejects records with the wrong nonce or a
  slot outside [start, close]. A thief now needs a live accomplice in the room every session. Cut the
  seed horizon to 3 days (instructors are online daily); revoke on "cihazımı başkası kullandı".

### C2-3. No attendance outside the pre-generated timetable, and the phone cannot classify unknown QRs (HIGH)
- Faculty: "Öğretim elemanı ilgili ders için yoklama başlatabilmelidir." Offline, the instructor device
  can only start sessions whose seeds it already holds. An extra hour, a telafi arranged yesterday, a
  moved slot, or a schedule edit made after the seeds were downloaded cannot be started, or starts
  under the old session_id.
- Student side: the phone "kendi oturumlarını indirir" and checks the QR against them. A session
  created after its last sync (telafi, add-drop enrolment, not-yet-listed student) is unknown to it.
  The payload {session_id, key_id, slot, closes_at} carries no course/section, so the phone cannot
  tell "my course, new session" from "neighbour section". The doc never says whether it blocks,
  warns or stores; each choice either loses honest records or reopens critic-C #9.
- Fix: put a short course_section_id in the payload. Derive session keys from a per-course-section
  daily seed so the instructor device can open an ad hoc session offline (session = course_section +
  start minute), reconciled by the server from the outbox. Phone rule: block only if the
  course_section is not one of the student's enrolled ones and the list is fresh (< 24 h); otherwise
  sign, store and show "Alındı, doğrulama bekliyor".

### C2-4. "İzinli" default contradicts Md.35 and would bar students on official duty (HIGH)
- Section 4 says Md.35 excludes sports, culture, art and competition duty from absence. S5 and the
  scope row "Raporlu / izinli" default both raporlu AND izinli to "mazeretli, devamsız sayılır".
  `research/08-notify-report.md` had a separate `G görevli (counts as present, MADDE 35)` mark; the
  summary dropped it. A student on university sports duty is counted absent: a wrongful final bar.
- Fix: separate status "görevli (Md.35)" that removes those hours from absences, with a mandatory
  document number and audit row; "raporlu" stays as the S5 default. Add a regression test.

### C2-5. The 7-day window overruns the AKSIS deadline in the final week (HIGH)
- Draft deadline 20 Aralık / 2 Mayıs. Last-week sessions (14-18 Aralık, 26-30 Nisan) have windows
  ending 21-25 Aralık / 3-7 Mayıs: 1 to 5 days after the deadline (computed by script). Day-7 head
  count also runs after export. Md.19 needs the DEVAMSIZ list before finals, so the instructor
  exports with records still in flight, which is exactly the export-then-review flood C #5 removed.
- Fix: window = min(7 days, deadline minus 2 days). In the last two weeks, phone shows "bugün
  senkronla" daily; panel shows "senkron bekleyen ve eşikteki öğrenciler" before export and marks
  the export provisional until the window closes.

### C2-6. The backup code is the forwarding bypass (HIGH)
- The code rotates every 20-30 s. Honest typing takes up to ~30 s after the code appears, so the delay
  threshold for code entries cannot be 8-10 s; a code sent as a WhatsApp text arrives in 2 s. Forwarders
  just use the code path. "Yedek kod kullanımı en fazla %5" is a metric, not a control. Separately,
  a check digit inside 6 digits leaves 10^5, not the claimed 1/1,000,000 guess rate.
- Fix: tag every code record "yedek"; auto-accept up to 2 per student per course per term, flag the
  rest; state the code as 6 digits + 1 check digit if the 1e-6 claim stays.

### C2-7. Tolerance that grows with sync delay lets a late sync hide a forward; instructor clock offset is stale (MEDIUM)
- Ek C: 50 ppm, "tolerans senkron gecikmesiyle birlikte büyür". After 3 days (~13 s) the tolerance
  exceeds the 8-10 s threshold, so a forwarder simply syncs late. The instructor's slot times come
  from a laptop clock last measured when seeds were downloaded (up to 14 days: ~60 s at 50 ppm;
  Windows syncs NTP about weekly by default).
- Fix: the anchor from C2-1 bounds phone drift to hours. Judge delay relative to the session median:
  median(student scan time - QR slot) is the instructor's offset for that session, honest scans
  cluster, forwards are outliers. No dependence on the instructor clock at all.

### C2-8. iOS boot identity via kern.boottime conflicts with App Store rules and KVKK wording (MEDIUM)
- Ek C sends "CLOCK_MONOTONIC + kern.boottime" in the signed record. Apple's required-reason API
  35F9.1 (system boot time) says derived information may not be sent off-device, except elapsed time
  between in-app events. Absolute boot time is also a device fingerprint, against "donanım kimliği
  tutulmaz". kern.boottime also moves when the wall clock is changed (inference, verify), producing
  false "reboot" flags.
- Fix: decide same-boot on the device; send only elapsed intervals and a same_boot boolean; declare
  35F9.1 in the privacy manifest.

### C2-9. Device change approval is a rubber stamp and underspecified (MEDIUM)
- Which instructor approves (a student has several)? What evidence does the instructor see? Remote
  approval plus a shared email OTP moves a friend's account to my phone, so "Önlenir" is wrong.
  revoked_at = approval time lets a "lost" phone handed to a friend keep signing until approval.
  Records scanned on the new phone before approval have no stated fate.
- Fix: in-person approval: new phone shows a 6-digit bind code, instructor types it in the panel in
  class. revoked_at = request time. New-key records are held and auto-accepted on approval. Move the
  friend-account claim to "zorlaştırılır".

### C2-10. Store publication under the IU account is missing from the critical path (MEDIUM)
- Section 7 says Apple 5.1.1(ix) requires the real pilot to ship from the IU account (AUZEF), yet the
  four-item critical path (protocol, server + SMTP, aydınlatma, security test) omits it. Without it,
  iPhone students cannot join on 25 Ocak.
- Fix: add "IU publisher account access or submission by IU staff" as item five with the same
  15 Aralık gate, and name the S-B PWA as the fallback for iOS if it slips.

### C2-11. "Held" and block-hour counting are undefined, and they set the denominator (MEDIUM)
- Sessions are auto-generated. S4 default counts held lessons, but "held" is never defined: instructor
  device lost and paper used, class cancelled on the day (snow) with no cancel entered, zero scans.
  Block lessons (MVP): one scan for 3 hours, or one attendance per hour at 2 minutes each?
- Fix: held = outbox Başlat, or >= 1 valid record, or a manual entry; unheld past sessions show a
  one-tap "yapılmadı / yapıldı (kâğıt)" prompt. Block default: one attendance credits all hours,
  instructor may split. Both go in the regression suite with the ceil formula.

### C2-12. Shared-PC ban removes the usual way to project in large halls (MEDIUM)
- "Hoca kendi cihazını yansıtır": podium PCs are the wired path to the projector; instructors without a
  laptop must mirror a phone, which needs an adapter and DP alt mode many phones lack. The 150-seat
  case needs projection by the doc's own geometry.
- Fix: the real rule is "no multi-session seed on a shared PC". Allow a podium PC (usually on wired
  LAN) to fetch one session's key online after approval from the instructor's phone, expiring at
  closes_at.

### C2-13. Specification gaps that will cause implementation bugs (LOW)
- "zaman_dilimi" in the QR payload reads as "time zone" in Turkish; specify slot = floor(unix_utc / 5).
  Store UTC; generate the timetable in Europe/Istanbul (UTC+3, no DST since 2016); phone checks use
  epoch time, never local time (exchange students with home time zones).
- "Çökmesiz oturum >= %99,5" has no measurement path now that crash SDKs are out; define it from sync
  data (sessions started vs completed).
- "Makbuzlu kayıp kayıt 0" cannot be observed server-side; replace with "support tickets with a
  receipt that the server never saw".

---

## Part 3. Is the MVP realistic for one student in one semester?

No, not by 15 Aralık (about 11 weeks, while studying).
- Native module risk: Secure Enclave P-256 signing plus boot-clock reads need custom Swift/Kotlin.
  "Mac olmadan (EAS)" means every iOS change is a cloud build; the free EAS tier is reported at 15 iOS
  builds per month, and Secure Enclave needs a physical iPhone and the paid Apple account.
- Still in MVP and cuttable for a one-department pilot: asistan and bölüm yöneticisi as separate roles
  (keep hoca + one admin; ortak hoca = second hoca on the course), account recovery (admin reset),
  join requests from unlisted students (instructor re-uploads the list), student-number typo
  suggestions, hashed IDFV/ANDROID_ID (legally pending and misses Secure Folder anyway), class-time
  local notification.
- Cut but essential to the faculty: offline start of an unscheduled session (C2-3), correct "izinli"
  handling (C2-4). "Tarih aralığına göre rapor" is not visible in the scope table; confirm it is in.

## Part 4. Contradictions with the fixed constraints

- Offline-first: attendance can only start for sessions the server created and the device downloaded
  (C2-3). Seeds, device approvals and student session lists all need prior connectivity; that is fine
  only if an unknown session degrades to "stored, pending", which the doc does not say.
- No AKSIS: respected. The İÜ SMTP relay is a new single institutional dependency for registration;
  acceptable because no login is needed in class, but it must be tested in registration week.
- Simplicity: the "2 dakika" instructor promise ignores the review queue (reboot flags, delay flags,
  late records, second-account flags, head-count flags, join requests, device approvals). Without
  C2-1 and C2-6 the queue is about 100+ items per instructor per term with no evidence per item.

## What improved (for fairness)
Server-owned sessions, key_id, full-field MAC, revoked_at, day-7 head count, check digit, flagged
records not counted, explicit go/no-go date, and backups are all real fixes.

Sources checked: Apple required-reason API 35F9.1 wording (developer.apple.com forum thread 749799
and Apple docs page title), EAS free tier build count (docs.expo.dev and changelog, secondary),
date arithmetic for C2-5 by script.
