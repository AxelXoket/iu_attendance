# 10 - Scope, gaps, domain model, MVP cut, pilot outcomes

Date: 2026-09-28. Author: researcher sub-agent. Read-only research, no repo changes.

Legend: **[C]** confirmed against a primary source or a direct check. **[I]** inference or recommendation. **[F]** needs a faculty or university decision (not mine to make).

---

## 0. Facts that change the design (verified)

| # | Fact | Source | Design consequence |
|---|------|--------|--------------------|
| F1 | [C] IU regulation Art. 19(1): students must attend at least 70% of courses they take **for the first time** and at least 80% of any practice/lab work. Art. 19(3): students failing either are announced "via the automation system" before finals, are barred from the final and fail (grade FD). Latest amendment RG 28.09.2025/33031. | lexpera consolidated text of "Istanbul Universitesi On Lisans ve Lisans Egitim ve Ogretim Yonetmeligi"; IU 2025-2026 Fall rules PDF items 11-13 | Two thresholds per course (theory vs practice) computed **separately**, not one blended rate. |
| F2 | [C] Courses repeated for a reason other than absence carry **no attendance requirement** (IU rules PDF item 12, Art. 20(5)). | same | Enrollment needs an `attendance_exempt` flag; roster Excel may not carry it, instructor sets it. |
| F3 | [C] Art. 35: students officially assigned to sports/cultural events are excluded from absence calculation. [C, via summarised extract, re-verify] The regulation has **no mechanism that turns a medical report into an excused absence**; "saglik raporu" appears only for registration freeze (Art. 29). | lexpera | "Excused (medical)" must NOT silently remove an absence. Default: medical excuse is recorded but still counts as absent; only Art. 35 assignment is removed from the denominator. [F] faculty must confirm. |
| F4 | [C] Medicine/Dentistry/Pharmacy/Nursing compute clinical practice attendance per department (Art. 19(2)). | lexpera | Irrelevant for a one-department pilot unless the pilot is in those faculties; keep `component` open-ended. |
| F5 | [C] KVKK Board decision 2021/1214: a university circulating a sign sheet showing names + TC ID numbers to other students violated data minimisation; ordered to mask. | kvkk.gov.tr/Icerik/7270 | Students never see other students. No TC Kimlik No anywhere in the system. Roster import drops any TC column. |
| F6 | [C] KVKK Art. 9 (amended by Law 7499, in force 1 June 2024): transfers abroad need adequacy, standard contracts (notified to the Board within 5 business days), or other listed safeguards. | kvkk.gov.tr, law-firm summaries | Hosting on Firebase/Supabase/AWS outside Turkey, and FCM/APNs push, are cross-border transfers. **Escalate** (see section 6). |
| F7 | [C] Medical reports are health data = special-category personal data under KVKK Art. 6. [I] | KVKK text | Never upload or store report files. Store reason code + optional paper reference number only. |
| F8 | [C] `ogr.iu.edu.tr` (students) and `istanbul.edu.tr` (staff) MX records point to Google (aspmx.l.google.com). Checked with nslookup today. | DNS | Both domains are Google Workspace. "Sign in with Google" restricted by the `hd` claim gives verified institutional identity **without** AKSIS/SSO integration. [F/verify] Workspace admin may block third-party OAuth apps; test with one real student account in week 1. [I, unverified] student address format may be `<studentno>@ogr.iu.edu.tr`; if true, roster matching is automatic. Students must activate the address themselves; some will not have. |
| F9 | [C] Google Play: personal developer accounts created after 13 Nov 2023 need a closed test with >= 12 testers opted in for 14 continuous days before production access. Organisation accounts are exempt. | Play Console Help 14151465 | Schedule risk for a student dev: start the closed test in week 1 or publish under a university/organisation account. |
| F10 | [I] Apple: App Review needs a working demo login; using the university name/logo needs permission (IP guideline 5.2). Unlisted App distribution or TestFlight (external testing needs beta review) fit a pilot. | Apple guidelines, from knowledge, not re-fetched | Plan 1 to 2 weeks for review; get written permission to use "Istanbul Universitesi". |
| F11 | [C] Turkey uses UTC+3 year-round (Europe/Istanbul), single time zone. | tz database | Time zones are a non-issue; **device clock drift is the real issue**. |

---

## 1. What the notes missed, ranked by damage if missing

Rank 1 = pilot fails or causes a formal complaint. Rank 5 = annoyance.

### Rank 1: will break the pilot or create legal exposure
1. **Offline check-in integrity and the export race.** Check-ins created offline arrive late. Nothing says which check-ins are valid, until when, or what happens if the instructor already exported to AKSIS. Needs: server-verifiable token that does not trust the device clock, a sync deadline, and "changed since last export" tracking.
2. **Identity and account sharing.** Self-registration with no identity proof lets anyone claim any student number. One phone logging into three accounts defeats the whole system. Needs: verified institutional identity (F8) and device binding (one active device per student, one student per device per term).
3. **Attendance calculation rules.** Notes say "total attendance/absence computed" but not: per hour or per session, theory vs lab thresholds (F1), repeat-exempt students (F2), what the denominator is (held sessions? planned 14 weeks?), what "excused" does (F3), students added in add/drop week (sessions before their enrolment must not count as absences). Wrong math means a student barred from a final wrongly. That is the one outcome that produces formal appeals.
4. **KVKK / data controller.** Who is the data controller (the university), aydinlatma metni (privacy notice) at registration, retention period, hosting location (F6), no TC numbers (F5), no health documents (F7). A student project processing student data without the university's sign-off is the biggest non-technical risk.
5. **Term lock and archive.** Records must freeze at term end; after the AKSIS entry nobody should be able to change them silently.

### Rank 2: every-week friction that kills adoption
6. **Academic calendar.** Holidays (religious holidays move every year), cancelled classes, make-up classes, midterm/final weeks, schedule changes mid-term. Without it, the "sessions held" denominator is wrong and every holiday becomes a manual correction.
7. **Block lessons and per-hour counting.** A 3-hour block is 3 class hours of attendance in Turkish practice. Students leaving after hour 1 is the classic case. One check-in per block must be able to credit N hours, with an optional second check later.
8. **Instructor web panel on the classroom PC + projector.** QR must be shown on a big screen; the instructor phone is too small for 100 students. Also the natural place for roster import and exports.
9. **Roster import diff.** Add/drop changes rosters; re-uploading must show added/removed/renamed rows before applying, match on student number, soft-drop (keep history), and tolerate AKSIS Excel quirks (merged header rows, Turkish characters, numbers stored as text). [F] get 2 or 3 real AKSIS exports (with names redacted) to build fixtures.
10. **No-phone / dead-battery / broken-camera students.** Manual mark by instructor from the live screen, audited. PIN fallback for camera problems.
11. **Multiple sections (subeler), co-instructors, TAs.** Same course code, different sections and rosters; labs often run by TAs; two instructors sharing a course. Needs scoped roles.
12. **Late vs present.** Faculty will ask. Needs a late-after-N-minutes rule and a policy on whether late counts as present (default: present for the rate, flagged in reports).

### Rank 3: correctness and trust
13. **Clock drift.** Student phone clocks are wrong or manipulated; classroom PC clocks drift. Validity must come from server-issued rotating nonces, not device timestamps.
14. **Session edits after close.** Instructor forgets to open, opens late, wants to reopen, wants to void a session (wrong course). Every edit audited with a reason.
15. **Disputes.** "I scanned but it says absent." Needs a check-in receipt shown on the phone (with a short code the instructor can verify) and a visible "not yet synced" state. In-app appeal can come later.
16. **Account recovery and phone change.** With Google sign-in, recovery is Google's problem. Phone change needs a rebind flow with cooldown and instructor visibility.
17. **Students from other departments.** The student account is university-wide; enrolment is per section. Nothing department-scoped on the student side.
18. **Data retention and archive.** Keep per university retention policy [F]; export an archive per term; delete device bindings and push tokens after term.

### Rank 4: quality of life
19. **Turkish + English UI.** English-medium programs and international students exist at IU. Cheap if i18n is set up on day 1, expensive to retrofit.
20. **Accessibility.** Screen reader labels, dynamic text size, contrast, PIN alternative for students who cannot aim a camera.
21. **Department analytics.** Chronic absence across courses, instructor adoption. Useful for the department head, not for the pilot.
22. **App distribution logistics.** F9, F10. Not a feature, but can delay launch by weeks.
23. **Support and observability.** Crash reporting, a contact channel, a status page or at least an in-app banner.

### Rank 5: nice to have
24. Dark mode (follow system theme; nearly free with Material/Cupertino defaults).
25. Multi-campus (IU has several campuses; rooms carry a campus field, nothing else needed).
26. Instructor mobile app (the web panel is responsive; a native instructor app is not needed for the pilot).

---

## 2. Domain model

Conventions: all timestamps stored UTC, displayed Europe/Istanbul. Soft delete only. Every mutating action writes an AuditLog row in the same DB transaction.

### 2.1 Entities

**User**
- `id`, `email` (unique, verified via Google `hd` claim), `display_name`, `kind` (STUDENT | STAFF), `student_number` (unique, nullable for staff), `locale` (tr | en), `created_at`, `last_login_at`.
- Invariant: STUDENT users have email domain `ogr.iu.edu.tr`; STAFF users `istanbul.edu.tr` and must be allow-listed by a DEPT_ADMIN before getting any staff role.
- Invariant: `student_number` can be claimed by exactly one user; a second claim is blocked and raised to DEPT_ADMIN.

**RoleAssignment**
- `user_id`, `role` (SYSTEM_ADMIN | DEPT_ADMIN | INSTRUCTOR | CO_INSTRUCTOR | TA | AUDITOR), `scope_type` (SYSTEM | DEPARTMENT | SECTION), `scope_id`, `granted_by`, `granted_at`, `revoked_at`.
- Permissions: INSTRUCTOR and CO_INSTRUCTOR: everything on the section. TA: open/close attendance, manual present/absent on sessions they ran; cannot set EXCUSED, cannot export, cannot edit roster. AUDITOR (department head): read-only across department. STUDENT is implied by `kind`, never a role row.

**Department**: `id`, `name`, `faculty`, `campus`.

**Term**
- `id`, `academic_year` ("2026-2027"), `period` (GUZ | BAHAR | YAZ), `starts_on`, `ends_on`, `add_drop_ends_on`, `state` (SETUP | ACTIVE | GRADING | LOCKED | ARCHIVED).
- `policy` (JSON, versioned): `theory_min_rate` 0.70, `practice_min_rate` 0.80, `late_after_minutes` 10, `late_counts_as_present` true, `excused_counts_as_absent` true [F], `count_mode_default` PER_HOUR, `sync_deadline_hours` 168, `warning_margin_hours` 2.
- **CalendarException**: `term_id`, `date` or range, `kind` (HOLIDAY | EXAM_WEEK | NO_CLASS), `label`. Session generation skips these.
- Invariant: in LOCKED and ARCHIVED, AttendanceRecord and Enrollment are read-only for everyone except SYSTEM_ADMIN with a reason, which is audited.

**Course** (catalog, stable across terms): `id`, `department_id`, `code`, `name_tr`, `name_en`, `theory_hours_per_week`, `practice_hours_per_week`.

**Section** (a course taught in a term, "sube"): `id`, `course_id`, `term_id`, `section_code`, `count_mode` (PER_HOUR | PER_SESSION), `archived_at`.
- Staff via RoleAssignment with scope SECTION.
- Invariant: unique (`course_id`, `term_id`, `section_code`). Delete allowed only while no ClassSession has attendance; otherwise archive.
- What faculty called "create/edit/delete course" maps to Section (plus Course the first time).

**ScheduleSlot** (the notes' "CourseSchedule"): `id`, `section_id`, `weekday`, `start_time`, `end_time`, `hour_count` (1 to 4), `component` (THEORY | PRACTICE), `room`, `campus`, `valid_from`, `valid_to`, `week_parity` (ALL | ODD | EVEN, for alternating lab groups).
- A course meeting twice a week = two slots. A mid-term schedule change = close the old slot's `valid_to`, add a new slot.

**ClassSession** (one real occurrence)
- `id`, `section_id`, `slot_id` (nullable for extra/make-up), `date`, `start_at`, `end_at`, `hour_count`, `component`, `room`, `kind` (REGULAR | MAKEUP | EXTRA), `status` (SCHEDULED | HELD | CANCELLED), `makeup_for_session_id`, `cancel_reason`.
- Generated from slots for the term, skipping CalendarExceptions. Instructor can cancel, move, add.
- `counts` rule: a session counts toward the denominator only if `status = HELD` and it has at least one closed AttendanceSession or a manual full-roster entry. A held session where nobody took attendance does not penalise students.

**AttendanceSession** (an opened window)
- `id`, `class_session_id`, `opened_by`, `opened_at` (server), `planned_close_at`, `closed_at`, `close_reason` (AUTO | MANUAL | VOIDED), `method` (QR_ROTATING | PIN | MANUAL_ONLY), `secret` (32 random bytes, server only; sent once to the opening web panel), `rotation_seconds` (default 15), `covers_hours` (e.g. [1,2,3]), `state` (OPEN | CLOSED | VOIDED).
- Invariant: at most one OPEN per ClassSession. Several per ClassSession are allowed (hour 1 check, hour 3 check, reopen). VOIDED sessions produce no records.
- Auto-close is a server job at `planned_close_at`; the panel also closes locally. Late tokens are judged by slot index, not by when they arrive.

**CheckIn** (raw, immutable event)
- `id` (UUID generated on the phone, idempotency key), `attendance_session_id`, `student_user_id`, `device_id`, `slot_index` (from QR), `code` (HMAC(secret, session_id, slot_index) truncated), `scanned_at_device`, `device_elapsed_ms_since_boot` (diagnostic), `received_at`, `method` (QR | PIN), `signature` (device key over the payload), `app_version`, `result` (ACCEPTED | DUPLICATE | INVALID_CODE | OUT_OF_WINDOW | DEVICE_NOT_BOUND | NOT_ENROLLED | LATE_SYNC_REVIEW), `result_reason`.
- Validation on the server: code matches HMAC for that slot; slot lies within [opened_at, closed_at] of that AttendanceSession; device is the student's active device; student has an ACTIVE enrolment on the session date. The scan moment is bounded by the slot's real display time, so device clock does not matter. `late` = slot start > opened_at + late_after_minutes.
- Invariant: unique `id` (retries are no-ops); at most one ACCEPTED per (attendance_session, student).
- Received after `closed_at + sync_deadline_hours`, or after the section was exported: ACCEPTED is not applied automatically; stored as LATE_SYNC_REVIEW for the instructor to accept or reject.

**AttendanceRecord** (final status per student per ClassSession)
- `id`, `class_session_id`, `enrollment_id`, `status` (PRESENT | LATE | ABSENT | EXCUSED | EXEMPT_ACTIVITY), `hours_attended` (0..hour_count), `source` (CHECKIN | MANUAL), `excuse_code` (MEDICAL | OFFICIAL_DUTY | OTHER), `excuse_ref` (free text, e.g. paper report number; no file), `note`, `version`, `updated_by`, `updated_at`.
- Invariant: unique (`class_session_id`, `enrollment_id`). Derived from CheckIns until a MANUAL edit exists; after that, new check-ins do not overwrite it, they only flag it.
- Invariant: EXEMPT_ACTIVITY (Art. 35) is removed from both numerator and denominator. EXCUSED counts per term policy (default absent, see F3).

**Enrollment**
- `id`, `section_id`, `student_number`, `student_user_id` (null until the student registers), `roster_name` (snapshot from Excel, used for matching and display), `home_department` (optional), `status` (ACTIVE | DROPPED), `active_from`, `dropped_at`, `attendance_exempt` (repeat not caused by absence, F2), `exempt_reason`, `source_import_id`.
- Invariant: unique (`section_id`, `student_number`). Sessions dated before `active_from` or after `dropped_at` do not count for this student.

**RosterImport**
- `id`, `section_id`, `uploaded_by`, `uploaded_at`, `file_sha256`, `original_filename`, `parser_version`, `row_count`, `diff` (added[], removed[], renamed[], invalid_rows[] with reasons), `state` (PREVIEW | APPLIED | DISCARDED), `applied_at`.
- Invariant: nothing touches Enrollment until the instructor confirms the PREVIEW. Same hash twice = no-op. Removed students become DROPPED, never deleted. TC ID columns are ignored and never stored.

**Device**
- `id`, `user_id`, `platform`, `model`, `public_key` (keypair made in Android Keystore / iOS Secure Enclave), `bound_at`, `revoked_at`, `revoke_reason`.
- Invariant: one active device per student. One device can bind only one student account per term (blocks one phone checking in three friends). Rebinding: self-service once per term with a 24h cooldown, visible to instructors; more needs DEPT_ADMIN.

**ExportSnapshot**
- `id`, `section_id`, `format` (XLSX | PDF), `generated_by`, `generated_at`, `data_version`, `content_sha256`.
- Used to show "N records changed since your last export on <date>" and to produce a delta.

**AuditLog** (append-only)
- `id`, `at`, `actor_user_id`, `actor_role`, `action`, `entity_type`, `entity_id`, `before` (JSON), `after` (JSON), `reason` (required for edits after close and for anything in LOCKED), `client` (web | android | ios, app version).
- Invariant: no UPDATE or DELETE grants on this table for the application DB user. Optional hash chain later.

**Later entities**: `Appeal` (record, student, text, state, resolver), `Notification` (type, target, sent_at, channel), `HeadcountCheck` (instructor-entered head count for fraud measurement, see section 4).

### 2.2 How hour-based counting fits
- Unit of accounting is the **class hour**, per component. Each ClassSession has `hour_count` and `component`.
- One check-in per session credits all `covers_hours` of that AttendanceSession. Default: one AttendanceSession covering all hours, so a 3-hour block gives 3 hours.
- If the instructor runs a second check-in (say at hour 3) covering [3], a student present only in the first gets 2 of 3. `hours_attended` = size of the union of `covers_hours` over the sessions the student checked into.
- `PER_SESSION` count mode (if the faculty wants it): each held session counts as 1 regardless of length.
- Rate per enrollment per component = sum(hours_attended over counting sessions) / sum(hour_count over counting sessions), where counting sessions exclude CANCELLED, sessions without attendance taken, sessions outside the enrolment dates, and EXEMPT_ACTIVITY records.
- Status: OK / AT_RISK (remaining allowed absent hours <= `warning_margin_hours`) / OVER_LIMIT, computed separately for THEORY and PRACTICE. `attendance_exempt` enrolments always show EXEMPT.
- Also show "allowed absence left" against the **planned** term hours (14 weeks x weekly hours), because that is what students actually ask. [F] Faculty must choose whether the official denominator is planned hours or held hours. My recommendation: held hours for the rate, planned hours for the "left" projection, and state both on the export.

---

## 3. MVP vs later vs rejected

Target: one student developer, one semester, one department. Stack-neutral.

### 3.1 Faculty note items

| Item | Call | Reason |
|------|------|--------|
| Instructor sees own courses | MVP | Core. |
| Create/edit/delete course | MVP | As Section create/edit; delete only if empty, else archive. |
| Day, time, classroom | MVP | ScheduleSlot drives session generation. |
| View enrolled students | MVP | Core. |
| Add/remove students by CSV/Excel | MVP | With preview diff; this is the add/drop answer. |
| Add/remove single student manually | MVP | Late adds happen one at a time. |
| Instructor starts attendance | MVP | Core. |
| Open for a set duration, auto-close | MVP | Server job plus local close. |
| Manual close | MVP | One button. |
| Student joins from mobile app | MVP | Core. |
| Join date/time recorded | MVP | Server-derived from slot index, device time kept as diagnostic only. |
| Same student cannot join twice | MVP | Unique constraint + idempotent client UUID. |
| QR code on instructor screen | MVP | Rotating QR (15s) from the web panel; works offline for students. |
| Short PIN | MVP | Same HMAC shown as 6 digits under the QR; fallback for camera issues and accessibility. |
| Location | Rejected | Indoor GPS is unreliable in basements, adds a KVKK-relevant data type, iOS permission friction, and fake-GPS apps defeat it. |
| QR + location | Rejected | Same reasons; the extra hurdle hurts honest students more than cheaters. |
| Records per year/term | MVP | Term entity. |
| Student sees own attendance | MVP | Per course, with "absences left" and sync status. |
| Instructor per-course list | MVP | Session x student matrix. |
| Totals computed | MVP | Per component (70/80). |
| Manual corrections incl. medical/excused | MVP | With reason codes; excused does not remove absence by default (F3). |
| Log who changed what and when | MVP | AuditLog in the same transaction. |
| Per-course report | MVP | Matrix + totals. |
| Per-student status | MVP | Drill-down from matrix. |
| Date-range reports | MVP (filter) | A date filter on the matrix and export; no separate report engine. |
| Excel export | MVP | Ordered like the AKSIS roster to speed manual entry. |
| PDF export | MVP (print stylesheet) | Browser print-to-PDF of the report page; server-side PDF generation later only if the department needs signed archive copies. |
| Notify student when attendance starts | Rejected | Phones are offline in class, and it tells absent students to ask a friend for the code. |
| Reminder before close | Rejected | Same offline problem; the instructor says it out loud. |
| Threshold notification (70%) | MVP as in-app banner; push Later | Banner needs no push infra; push needs FCM/APNs (cross-border transfer, F6) and a token store. |

### 3.2 Gaps

| Gap | Call | Reason |
|-----|------|--------|
| Google sign-in restricted to IU domains | MVP | Solves identity, recovery and phone change without SSO work (F8). Needs a week-1 test with a real account. |
| Device binding | MVP | Only cheap defence against one phone checking in for friends. |
| Rotating QR with server-verifiable nonce | MVP | Makes offline check-ins trustworthy without trusting clocks. |
| Check-in receipt code on phone | MVP | Cheap proof in disputes. |
| Sync deadline + LATE_SYNC_REVIEW queue | MVP | Needed the first time someone syncs a week late. |
| "Changed since last export" | MVP | Prevents silent mismatch with AKSIS. |
| Term lock | MVP | One state flag plus write guard. |
| Archive export at term end | Later | One XLSX per section is enough for the pilot. |
| Department admin role | MVP | Someone must allow-list instructors and set the calendar. |
| Co-instructor | MVP | Same permissions as instructor, zero extra UI. |
| TA role | MVP | Labs are often TA-run; permission subset only. |
| Multiple sections | MVP | It is just multiple Section rows. |
| Shared courses across departments | Later | Out of the pilot department's scope. |
| Holidays / exam weeks | MVP | Small list entered per term by admin. |
| Cancelled / make-up / extra sessions | MVP | Otherwise the denominator is wrong. |
| Twice-a-week courses | MVP | Two slots. |
| Block lessons, per-hour counting | MVP | `hour_count` + `covers_hours`; default one check per block. |
| Multiple checks within a block | MVP | Same model, second button; costs almost nothing. |
| Theory vs lab thresholds | MVP | Regulation (F1). |
| Alternating lab groups (odd/even weeks) | Later | Model it as separate sections in the pilot. |
| Repeat students exempt | MVP | One flag (F2). |
| Students from other departments | MVP | Free with university-wide accounts. |
| Late status | MVP | One policy number. |
| Edits after close, reopen, void | MVP | With mandatory reason. |
| Student appeal in app | Later | Receipt + instructor correction covers the pilot. |
| No-phone students | MVP | Manual mark on the live screen. |
| Account recovery | MVP (by Google) | No password system to build. |
| Phone change | MVP | Self-service rebind with cooldown. |
| KVKK notice, consent screen, retention setting | MVP | Legal precondition; mostly text. |
| TR UI | MVP | Primary users. |
| EN UI | MVP | Strings are few; i18n must exist from day 1 anyway. |
| Dark mode | MVP (system theme only) | Near-free with platform defaults; no custom toggle. |
| Accessibility basics | MVP | Labels, text scaling, contrast, PIN path. |
| Web panel for projector | MVP | QR display and all instructor admin live here. |
| Native instructor app | Rejected for pilot | Responsive web covers phones; halves the surface. |
| Multi-campus | MVP (field only) | `campus` on slot; no logic. |
| Time zones | Rejected | Single zone (F11); store UTC, show Europe/Istanbul. |
| Clock drift handling | MVP | Built into the nonce scheme. |
| Department analytics | Later | Needs a term of data first. |
| Play Integrity / App Attest | Later | Raises the bar on modified apps; not needed to beat paper. |
| Head-count spot checks | MVP | One optional number per session; it is the fraud metric (section 4). |
| AKSIS integration | Rejected | Out of scope by agreement; export is ordered for manual entry. |
| Crash reporting | MVP | Needed for the crash-free metric. |

---

## 4. Pilot outcomes (measurable)

Baseline first: in weeks 1-2, time the current paper method in at least 3 sections with a stopwatch (roll call and sign sheet), and ask instructors how long term-end AKSIS entry takes per section.

| Outcome | Metric and how it is measured | Target |
|---------|-------------------------------|--------|
| Speed | T90 = time from `opened_at` to the slot in which 90% of that session's eventual accepted check-ins were scanned. Computed from slot indexes, so offline sync delay does not distort it. | Median <= 90 s for sections >= 60 students; <= 120 s for 100 students. |
| Instructor effort | Instructor active time per session (open, close, manual marks) from audit timestamps. | Median <= 2 min, vs paper baseline. |
| Minutes saved | (paper baseline minutes - app minutes) x sessions per week, per instructor. | >= 10 min/week per instructor with >= 60 students. |
| Sync health | % accepted check-ins with `received_at - scanned slot time` <= 24 h; and <= sync deadline. | >= 95% within 24 h; >= 99.5% within 7 days. |
| Lost check-ins | Upheld disputes where the student shows a valid receipt but the server has no CheckIn. | 0. Any occurrence is a P1 bug. |
| Correction load | Manual edits per 100 records, excluding EXCUSED and no-phone marks. | <= 3. |
| Fraud proxy | On sessions with a head count, abs(checked-in - headcount) / headcount. | <= 5% median. Paper has no equivalent number, which is itself the point. |
| Stability | Crash-free sessions (Crashlytics or Sentry), both platforms. | >= 99.5%. |
| Adoption | % of enrolled students registered and device-bound by end of week 3; % of held sessions taken in the app by week 4. | >= 90%; >= 90%. |
| Term-end export | Minutes to produce the AKSIS entry file per section; mismatches found when the instructor cross-checks 10 random students. | <= 5 min; 0 mismatches. |
| Satisfaction | SUS survey at week 8, instructors and a student sample. | SUS >= 75 instructors, >= 70 students. |
| Correct barring | Students flagged OVER_LIMIT whose status is overturned after review. | 0. |

Trace: every metric above is computable from CheckIn, AuditLog, AttendanceSession and ExportSnapshot tables plus crash reporting. Write the metric queries as scripts in the repo from week 1, not at term end.

---

## 5. Threat notes (better than paper, not perfect)

| Attack | Defence in MVP | Residual |
|--------|----------------|----------|
| Photo of QR sent to absent friend | 15 s rotation; device binding | Friend on a live call can still scan in time. Accept; head-count metric measures it. |
| One phone checks in for friends | One student per device per term | Friend lends his own phone plus Google login. Rebind cooldown + instructor-visible rebind makes it costly. |
| Old QR replayed | Per-session secret; slot must be inside the window | None. |
| Faked device clock | Validity from slot index, not device time | None. |
| Modified app | Device-signed payloads | Determined attacker. Play Integrity / App Attest later. |
| Instructor or TA abuse | Scoped roles, reasoned edits, audit log | Admin-level abuse needs the audit log to be reviewed. |

---

## 6. Escalations for the main conversation (not decided here)

1. **[Privacy, legal] Data controller and hosting.** The university is the data controller; the student developer is at most a processor. Needs written sign-off from the department/university, an aydinlatma metni, and a decision on hosting: university servers vs a Turkish cloud vs a foreign cloud with KVKK standard contracts (F6). Push notifications through FCM/APNs are a foreign transfer too.
2. **[Policy] Excused absence semantics (F3).** Does a medical report remove an absence in this department? The regulation does not say it does. The app must not invent a rule that contradicts the regulation.
3. **[Policy] Denominator** (held hours vs planned hours) and **per-hour vs per-session** counting for block lessons. These decide who gets barred from the final.
4. **[Identity] Google Workspace third-party OAuth approval** for `ogr.iu.edu.tr` and `istanbul.edu.tr`, and the real student address format. If blocked, fallback is email OTP to the institutional address, which costs about a week more.
5. **[Legal, distribution] Use of the "Istanbul Universitesi" name/logo** and which developer account (personal vs university organisation) publishes the apps (F9, F10).

---

## Sources
- [IU On Lisans ve Lisans Egitim ve Ogretim Yonetmeligi, consolidated (lexpera)](https://www.lexpera.com.tr/mevzuat/yonetmelikler/istanbul-universitesi-on-lisans-ve-lisans-egitim-ve-ogretim-yonetmeligi-1)
- [IU 2025-2026 Fall course rules summary (PDF)](https://cdn.istanbul.edu.tr/FileHandler2.ashx?f=2025-2026-guz-ders-alma-islemleri-ve-ozetlenmis-kurallar.pdf)
- [KVKK Board decision 2021/1214 on attendance lists](https://www.kvkk.gov.tr/Icerik/7270/2021-1214)
- [KVKK: transfers abroad](https://www.kvkk.gov.tr/Icerik/2053/Yurtdisina-Aktarim)
- [Erdem & Erdem: 2024 KVKK amendments](https://www.erdem-erdem.av.tr/bilgi-bankasi/kisisel-verilerin-korunmasi-kanununda-neler-degisti)
- [Play Console Help: testing requirements for new personal accounts](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en)
- [IU student e-mail service](https://ogr.iu.edu.tr/login)
- DNS check (nslookup -type=mx) of ogr.iu.edu.tr and istanbul.edu.tr, run 2026-09-28: Google MX records.
