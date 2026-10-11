# Critic C: adversarial design review of summary.md (sections 1, 2, plus scope/ops)

Reviewer stance: competitor engineer who wants this rejected. Target: the design, not the prose.
Inputs: `summary.md`, `faculty-notes.md`. Date: 2026-09-29.

VERDICT: FAIL

Reason in one line: the offline protocol is underspecified at exactly the points where it breaks
(instructor secret lifecycle, session identity, time evidence), two items listed under "Önlenen
hileler" are not prevented, and the MVP scope is not shippable by one student before Bahar 2027.

Evidence file for the QR geometry numbers: `scratchpad/qr_px.py` (output reproduced in finding 8).

---

## 1. Instructor-side offline session key has no lifecycle (CRITICAL)

Summary step 1: "oturum anahtarı, hoca cihazının kayıt sırasında sunucuyla paylaştığı sırdan türetilir".
Unspecified and broken cases:
- **Secret loss.** A PWA secret lives in IndexedDB. Cleared site data, private window, a different
  browser, or Safari without "Add to Home Screen" (WebKit ITP deletes IndexedDB and service worker
  registrations after 7 days without interaction; home screen web apps are exempt) means the
  instructor walks into a basement with no key and cannot start attendance at all.
- **Shared classroom PC.** A non-extractable WebCrypto key is still usable by any JS on that origin,
  including the devtools console. Anyone who uses that PC later can mint valid QR codes for every
  course of that instructor, for any future date, until the key is revoked. Many lab PCs also reset
  on reboot (freeze software), which is the secret-loss case again every morning.
- **Multiple devices / co-instructor ("ortak hoca" is in MVP).** "Hocanın cihazı" is singular. The QR
  must carry a key id or the server cannot tell which secret to verify against.
- **Server does not know the session exists.** Session creation, duration, manual close, head count
  and manual adds all live on the instructor device until it syncs. If that browser loses data
  before syncing, the head count and manual adds are gone and the server sees student records for
  a session it never heard of.
- **Replay binding.** Nothing says the MAC covers course id, section, session nonce, absolute slot
  time and closes_at. If the slot is a counter from session start, a QR from week 3 validates in
  week 5.

Fix: server pre-creates sessions from the timetable and issues per-session seeds; the instructor
device prefetches the next 7 to 14 days of seeds whenever online (office, home). QR payload =
{session_id, key_id, slot_unix, closes_at} + truncated MAC over all of it. Losing the browser loses
only cached seeds; a shared PC leaks at most two weeks for one instructor. Instructor PWA keeps an
outbox (head count, manual adds, close time) and nags until synced; call `navigator.storage.persist()`
and require install to home screen on iOS. Explicitly say: do not run the panel on a shared PC;
the instructor's own phone is the fallback QR source for small rooms.

## 2. The anti-forwarding rule is bypassable and its default turns detection into acceptance (CRITICAL)

Summary step 4 and "Önlenen hileler: QR fotoğrafını sonradan WhatsApp'la göndermek (gecikme kuralı işaretler)".
- **Reboot kills the evidence.** Boot-monotonic clocks (Android `SystemClock.elapsedRealtime`,
  Darwin `CLOCK_MONOTONIC`/`mach_continuous_time`) reset on reboot. A cheater receives the photo,
  scans offline, reboots, syncs: no delay can be computed. Legit students also reboot within a
  7-day window (dead battery, OS update), so this is not an edge case.
- **Wrong clock is easy to pick.** JS `Date.now()` is wall clock and `performance.now()` resets when
  the app is killed; iOS `ProcessInfo.systemUptime` / `mach_absolute_time` / `CLOCK_UPTIME_RAW`
  stop during sleep, so a phone asleep in a pocket for 3 hours reports minutes. The summary does not
  name the clock; it needs a native module either way.
- **The slot time comes from the instructor's unsynced wall clock.** A classroom PC a few minutes
  off (no NTP, CMOS drift) makes every honest record look late or early, so the tolerance has to be
  minutes, while a WhatsApp forward takes seconds. The rule cannot separate them.
- **Open question 9 default is "şüpheli kayıt var sayılır".** So a flagged forwarded QR still counts
  as present. It is detected, not prevented. With a reboot it is not even detected, and it works
  retroactively: a photo of last Tuesday's QR, scanned and synced within 7 days, yields a valid
  record for last Tuesday.

Fix: native `elapsedRealtime` + boot count (Android `Settings.Global.BOOT_COUNT`) / Darwin
`CLOCK_MONOTONIC` + `kern.boottime` in the signed record; server stores each instructor device's
clock offset from every online contact and corrects slot times; records with a broken chain or
delay above threshold go to "incelemede", not "var". Move "WhatsApp forwarding" to "yalnız
işaretlenir" in the summary. Paper-parity is still met; the claim is what is wrong.

## 3. "Bir telefondan iki öğrenci" is not prevented on Android (HIGH)

Samsung Secure Folder, Android multiple users, and work-profile tools (Shelter/Island) install a
second, independent copy of any Play app with its own storage and its own Keystore keys. The server
sees two unrelated public keys. By design there is no hardware id, and App Attest / Play Integrity
(deferred) attest an app instance, not "same physical handset across profiles". Combined with the
automatic 48-hour device change, a friend's account can live permanently in the cheater's Secure
Folder after one wait. This also weakens "arkadaşın hesabına kendi telefonundan girme".
Fix: move both to "önlenemeyen / yalnız kafa sayısı" in the summary; in the pilot make every device
change require instructor approval (no silent 48 h path); the email/old-device notice stays.

## 4. The head-count rule cannot be evaluated when it is asked for, and it names nobody (HIGH)

Step 6: at class end the instructor device is offline and the records are on student phones, so the
"kayıt sayısı" it compares against is 0 or unknown. When it becomes knowable, 5% (pilot target) to
30% of records are still unsynced, so the count is under the head count and the check is silent;
it fires days later, possibly after export. When it fires, "7 fazla kayıt" does not say which 7.
Counting 150 heads at the end of class, while people leave, is itself error-prone at about the same
5% threshold (max(3, 5%) = 7.5 at 150), and it adds a per-session chore against the faculty's
"işlem basit tutulabilirse".
Fix: head count optional, entered at start; evaluate once at the sync deadline (day 7) and on the
review screen; attach per-record evidence (delay flag, broken clock chain, last-slot clustering) so
the instructor can act on specific rows. Otherwise cut it from MVP.

## 5. Unsynced records: silent absence, unmeasurable "0 lost receipts", export-triggered review flood (HIGH)

- Background sync is not guaranteed (summary admits it) and "bağlantı her değiştiğinde" only fires
  while the JS runtime is alive, i.e. effectively on app open. A student who scans and never opens
  the app again is absent, and the only proof (the receipt) is on the same phone. Lost phone =
  lost record and lost receipt, so pilot metric "makbuzu olup kaybolan kayıt 0" cannot be measured
  server-side and is violated by construction.
- "Dışa aktarımdan sonra gelen kayıtlar hocanın inceleme kuyruğuna düşer": instructors export often.
  At 5% late sync, a 150-student course produces ~7 queue items per session, times sessions and
  courses per week.
- Pilot metric "haksız yere finalden men 0" depends on records the server may never see.
Fix: at scan time schedule a local "N kayıt senkron bekliyor" notification (daily until synced,
cancelled on sync); valid records inside the 7-day window auto-accept regardless of export; the
queue only holds records after the deadline or with broken evidence; before any DEVAMSIZ list the
panel shows "students over threshold" so the instructor asks them to open the app. Keep synced
records on the phone until term lock (see finding 12 for why this also is the backup).

## 6. One lesson can become two sessions (MEDIUM)

Browser crash, laptop battery, switching from laptop to phone, or two co-instructors starting on
their own devices all create a second offline session id for the same lesson. "İkinci katılım
reddedilir" is per session, so students split across two sessions, and hour-based counting can
double the denominator.
Fix: server merges sessions by (course, section, scheduled slot) and attendance is counted per
timetable slot, not per session id. The QR carries the scheduled slot id.

## 7. Local notifications promise what the phone cannot know (MEDIUM)

"Kayıt yok, yoklama kapanmak üzere": the phone knows only the timetable. It does not know whether
the instructor opened attendance, when, for how long, or whether class was cancelled or moved
(telafi). Android 14 inexact alarms can slip up to an hour (the summary's own number), so "ders
başladı" can arrive after class. iOS pending notifications are only refilled when the app runs, so
a student who does not open the app for 7 days stops getting them. Separately, the summary lists a
pg-boss "hatırlatma kuyruğu" while MVP notifications are local only; there is nothing for it to queue.
Fix: faculty wording is "bildirilebilir" (optional). MVP keeps only in-app threshold warnings and the
"senkron bekliyor" notification from finding 5. Reword any reminder to "Bu derste bugün kaydın yok".
Drop pg-boss.

## 8. QR geometry and scan speed are asserted, not tested (MEDIUM)

"20 m'deki arka sıra ~2-2,3 m genişlikte bir QR'ı okuyabilir": a 2.2 m square needs a screen at least
2.2 m tall. 16:9 screen heights: 100" = 1.25 m, 120" = 1.49 m, 150" = 1.87 m (script output). At
20 m with a 68 degree camera, a 1.4 m version-3 QR gives 1.15 px/module on CameraX's default
640x480 analysis stream (fails), 2.29 at 1280 wide, 3.44 at 1920 wide; 2x zoom doubles it. So it is
feasible only if the scanner requests a >= 1080p analysis stream and opens pre-zoomed. The iOS Safari
zoom constraint is reported unsupported (secondary sources, verify), which also limits the PWA
fallback. "~1 dk for 150" ignores unlock, app launch and aiming at 3x zoom.
Fix: set analysis resolution explicitly, open scanner directly at 2x, measure the pilot
department's largest room with 3 cheap Android phones and 1 iPhone before freezing QR payload size.

## 9. The phone issues "Yoklamanız alındı" for inputs it cannot validate (MEDIUM)

The student phone has no key, so it accepts any well-formed QR or any 6 digits. A typo in the
backup code or a scan of the neighbouring section's QR produces a confident receipt that the
server rejects days later. The student believes they were present.
Fix: add a check digit (Damm) to the backup code so typos fail offline; show course + section
decoded from the QR on the receipt and block if it is not one of the student's enrolled courses;
receipt text says "senkron sonrası kesinleşir".

## 10. MVP scope is not one student, one semester (HIGH)

Two frontends (Expo + React PWA), a native module (key + boot clock), Fastify, Postgres, Better
Auth, pg-boss, self-hosted error tracking, four roles, six faculty calendars, sections, block hours,
theory/practice split, repeat exemptions, device change flow, receipt comparison screen, review
queue, term lock, xls/xlsx/HTML/CSV-cp1254 import, xlsx + PDF with embedded fonts, a three-sheet
AKSIS export, TR + EN, dark mode, account deletion in app and on web. The pilot is one department.
Cut first: the six unit calendars (one department), super-admin/department-admin split (one admin),
EN, dark mode, PDF export, Google login, pg-boss, self-hosted error tracking (count started vs
completed sessions from sync data instead; that is the %99.5 metric), automated device change
(admin reset), weekly matrix sheet. Keep the native student app only if finding 8's test shows iOS
web cannot zoom; otherwise evaluate a single PWA for both roles, which also removes TestFlight, Play
12-tester rule and store review from the critical path.

## 11. The critical path is legal and BİDB, not code, and it has no date (HIGH)

Open question 13 default: no real data until the KVKK protocol is signed. Genelge 2019/12 wants a
security test before go-live. BİDB VM, backups, SMTP and domain are all requests to IT with no known
SLA. None of this is in the student's control, and Bahar 2027 starts 25 January.
Fix: file the protocol and VM request this week with a one-page data-flow sheet; set a go/no-go date
(e.g. 15 December) after which the pilot moves to Güz 2027; name the fallback host in advance.

## 12. Backups, on-call and graduation are unowned (HIGH)

- Supabase was rejected for "yönetilen yedek yok", but the chosen Postgres on a BİDB VM has no
  backup plan either.
- TestFlight builds expire in 90 days; Bahar runs 25 Jan to 30 Apr = 95 days before finals. A build
  made before term expires mid-term, and if the student is unavailable the iOS app simply stops.
- Personal Apple/Google/Expo accounts, domain and VM credentials make the student the only owner.
Fix: nightly `pg_dump` off the VM + one restore test before pilot; phones keep signed records until
term lock and re-upload on a server "epoch" bump (free disaster recovery, which the offline design
makes possible); calendar a rebuild at week 8; repo, EAS org and store accounts owned by a faculty
member with the student as member; a one-page handover runbook. The offline design means a server
outage only delays sync, but registration and device changes stop; say who fixes that.

## 13. Login depends on email delivery nobody has granted (MEDIUM)

"E-posta İÜ sunucusundan gönderilir" needs BİDB relay permission; the default (yerli VM) sends OTP
from a fresh IP to Google Workspace inboxes, where SPF/DKIM/DMARC and IP reputation decide inbox vs
spam. Registration week is exactly when "90% by week 3" is decided.
Fix: treat İÜ SMTP relay as a hard prerequisite in the BİDB request, or use Google OIDC with the
`hd` claim as primary (both domains are Workspace). Note the tension: Google sign-in "BİDB izin
verirse" is itself an IT dependency, against the no-SSO-dependency spirit of the faculty note.

## 14. Device change orphans in-flight records (LOW)

After a device change, records signed by the old key that are still unsynced must be accepted if
their QR slot predates the revocation; a server that checks "current binding" drops them. A lost
old phone loses them anyway.
Fix: keep old public keys with revoked_at; accept by QR slot time < revoked_at.

---

## What the design gets right (for fairness, not for passing)
- Offline scan with server-side verification is the correct shape for basements.
- MAC instead of signature in the QR is a sound size trade.
- Refusing location, biometrics and foreign push is consistent with KVKK.
- Integer absence-allowance formula with a mandated regression test is correct.
