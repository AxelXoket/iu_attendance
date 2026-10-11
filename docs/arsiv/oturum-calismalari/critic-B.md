# Critic B: rubric compliance, traceability, readability

Document: summary.md (2,747 words, measured with `wc -w`). Rubric: rubric.md (frozen). Input: faculty-notes.md.
Deterministic checks run: em dash U+2014 count 0, en dash U+2013 count 0, Turkish/English filler words (kapsamlı, sağlam, kritik, önemli, oldukça, temel, crucial, robust, comprehensive) count 0. Section word counts: 1 Kararlar 705, 2 Akış 206, 3 Mevzuat 185, 4 KVKK 262, 5 Kapsam 492, 6 Takvim/dağıtım 334, 7 Ölçütler 123, 8 Açık sorular 395.

## VERDICT: FAIL

Rubric: 2 PASS (items 4, 8), 8 FAIL (1, 2, 3, 5, 6, 7, 9, 10; items 6 and 7 are narrow fixes). Traceability gaps exist.

## 1. Rubric items

| # | Result | Reason |
|---|---|---|
| 1 | FAIL | No links anywhere in the document. Dates exist for only a few options (WatermelonDB "Nisan 2025", SheetJS version, Google 2021). Expo, Fastify, Better Auth, drizzle, pdfmake, pg-boss carry no version or date. Rows "Kod yapısı", "Listeyle eşleşme", "Hata izleme" have no second choice and no rejected option; "Hoca tarafı" and "Giriş" have no second choice. Pointing at `research/01..10` in the last line does not satisfy "each with dated evidence". |
| 2 | FAIL | Late sync, no phone, clock change (student), photographed QR are covered. Missing: (a) never sync: step 7 stops at "7 gün"; nothing says what happens on day 8, and the student's only recourse (itiraz akışı) is deferred to "Sonraya"; (b) phone dies or is lost AFTER scanning and before sync: the record and the receipt vanish, not addressed; (c) instructor device dead or forgotten: no fallback stated, and the projector PC works only if it was registered online earlier (step 1); (d) instructor device clock wrong or manipulated: the QR time slice comes from that clock, not addressed. |
| 3 | FAIL | Lists exist, but they contradict the defaults: "QR fotoğrafını WhatsApp'la göndermek" is listed as STOPPED ("gecikme kuralı işaretler"), yet Q9's default counts flagged records as present, so by default it is only shown, not stopped. The rotating 6-digit backup code relayed live by message is in neither list. A rooted phone or modified client (attestation deferred) is in neither list. The "gecikme kuralı" threshold is never given. |
| 4 | PASS (weak) | No AKSIS dependency. Export columns are specified (sıra, toplam saat, katıldığı saat, yüzde, DEVAMLI/DEVAMSIZ, devamsız sayfası, haftalık matris). Import is column-level only for öğrenci no and isim; "bilinen tüm başlık biçimleri" names none, but Q2 flags a real sample file, which satisfies the "or" clause. Wording issue: the header says "SSO entegrasyonu yok" while "Giriş" proposes "Google ile giriş"; say explicitly it is optional and never required. |
| 5 | FAIL | See section 2 below: "keep it simple", course delete, the "registration" step and the changed meaning of two notifications are not mapped or not explained. |
| 6 | FAIL (minor) | "Notlara eklenenler" covers roles, semesters, holidays, sections, co-instructors, audit. Missing from the additions list: retention and periodic destruction (only in section 4), account recovery (lost access to institutional e-mail, graduated student), the web panel itself, the head-count duty. "Sonraya kalanlar" mixes faculty items (push) with additions (itiraz, bölüm analitiği, lab grupları, asistan) without marking which is which. |
| 7 | FAIL (narrow) | Controller, legal basis, hosting, cross-border are decided. Retention "10 yıl" and legal basis "Md.5(2)(ç) hukuki yükümlülük" are both valid only if the app is the official record, yet Q16's default is "yardımcı kayıt". The document gives no retention period or legal basis for its own default case and does not flag that dependency. |
| 8 | PASS | Account type, cost, review risks, timeline are concrete. Readability issue: the timeline example is anchored on a 5 Ekim first build while section 8 recommends a Bahar 2027 pilot. Anchor it to Bahar (for example first build early January, Play 14-day clock starting then). |
| 9 | FAIL | Section 7 lists 10 pilot metrics but does not tie them to features. MVP features with no measurable outcome: roster import (for example % rows auto-matched, mismatches per upload), device binding and device change (requests per 100 students, time to resolve), local notifications (fired vs scheduled), backup code (share of check-ins via code), calendar and denominator logic (0 wrong "hak" values vs manual calculation), account deletion, TR/EN, roles. |
| 10 | FAIL | All 18 faculty questions have a default, but "why it matters" is missing for most: Q2, Q3, Q4, Q7, Q8, Q9, Q10, Q12, Q14, Q17, Q18 have none. Owner questions "Sana 1" and "Sana 2" have no default. |

## 2. Traceability against faculty-notes.md

Mapped and clear: AKSIS'e bağımlılık yok; hoca kendi tanımlasın; öğrenci kendi giriş; ders görüntüleme; gün/saat/sınıf; kayıtlı öğrenciler; CSV/Excel ile ekleme ve çıkarma (with diff, soft removal); all 7 "Yoklama Alma" bullets; QR; PIN; konum; QR+konum; "farklı yöntem" (BLE later); yıl/dönem saklama; öğrencinin katıldığı dersler; ders bazında liste; toplam hesap; manuel düzeltme; denetim kaydı; all 4 "Raporlama" bullets; AKSIS'ten indir, yükle; dönem sonu AKSIS'e aktar; owner's "konum kullanılamaz" and "alt katlarda internet yok".

Gaps:
1. "İşlem basit tutulabilirse çok iyi olur": never mapped. MVP adds a new manual duty for the instructor (enter kafa sayısı every class) and a 48-hour device-change wait for students. The summary must say in 3 lines what the instructor does per class and why that is still simpler than paper.
2. "Ders ... silme": marked MVP, but conflicts with 10-year retention and "dönem sonu kilidi". State: silme = arşivleme once any attendance exists.
3. "Öğrenci belli bir registration ile sisteme kaydoldu": not in section 5. Where and when does registration happen (needs internet, e-mail code)? What happens if a student arrives at the first class unregistered? Can an unregistered phone check in offline and bind later?
4. "Öğrenciye yoklamanın başladığı bildirilebilir" and "kapanmadan önce hatırlatma": the local notification fires on the SCHEDULE, not on the real start or close, because an offline phone cannot know them. The summary never says this. The faculty will assume real-time. Say: "ders saatinde çalar; hoca geç başlatır veya dersi iptal ederse bildirim yine çalar".
5. "Raporlu ya da izinli": the reason is given (section 4, section 5 Kayıtlar, Elenenler, Q5), but split across four places and it never says what the instructor actually does in the app for a student with a report or a generic excuse that is not Md.35 "görevli" (family matter, instructor's own discretion). State: the absence stays; instructor may still correct to "var" if the department allows; no free-text reason field (to avoid health data leaking into notes).
6. Threshold notification ("%70 eşiği"): needs the latest totals, including instructor corrections, so it depends on sync. Not stated.
7. Escalations not surfaced in the summary: "Must results also be typed into AKSIS by hand before the Md.19 announcement deadline?" (04-competitors), "whether the AKSIS roster export includes student email" (07-auth), and "whether anti-fraud requires device attestation, which decides whether a PWA can be the student client" (09-distribution, a decision the summary makes silently by deferring attestation). Q3 covers the screen format but not the manual-typing workload or deadline.

## 3. Owner constraints (offline, no AKSIS)

- No AKSIS dependency anywhere. Pass.
- No campus Wi-Fi dependency during class for students. Pass.
- Hidden online dependencies not stated: (a) student registration and device binding need internet once; (b) instructor device must have registered online before step 1; (c) if the QR is shown from a shared classroom PC, that PC must hold the instructor's secret, which is both an online pre-step and a security question (escalate to main session); (d) the head-count comparison and duplicate rejection only resolve after sync, so the step-6 warning arrives later, not "ders sonunda".

## 4. Concision (target about 1,800 words, currently 2,747)

Repeated facts (same decision stated 3 to 5 times):
- Rejected verification methods: table row 1, section 5 "Doğrulama", "Elenenler". Keep one place.
- Push later: table "Bildirim", section 4 Barındırma, section 5 Bildirimler, "Sonraya", Q15 (5 times).
- "Raporlu" removed: section 4, section 5 Kayıtlar, "Elenenler", Q5 (4 times).
- BLE later: table, section 5, "Sonraya" (3 times). Analytics/crash ban: table, section 4, additions "Veri", "Rakiplerden", section 7 (5 times). Head count: table, step 6, hileler, additions, section 7.

Concrete cuts, no decision lost:
- Replace section 5 "Hocanın notları" + "Sonraya" + "Elenenler" with ONE table: Hocanın maddesi | Karar (MVP / Sonra / Elendi) | Neden veya yerine ne. This also fixes gaps 1 to 6. Remove the "Elenenler" text from table row 1 (keep only the winner and 2nd). Saves about 150 words.
- Table row "Doğrulama" (122 words in cells): drop the 96-bit MAC and 2-2,3 m vs 2,6-3,3 m math, keep "kısa kod, arka sıradan okunur" and point to research. Saves about 50.
- Table row "Excel / PDF" (51-word cell): cp1254, BOM, `;` ayraç, formül enjeksiyonu are implementation notes; move to research. Saves about 35.
- Table row "Backend": drop `closes_at` and pg-boss. Saves about 20.
- "Rakiplerden dersler" (about 110 words): keep 2 lines (nobody else supports offline; İstanbul Tıp 2021 precedent). Saves about 70.
- Section 4: compress "Güvenlik" and imha details (6 ay, 3 yıl, 30 gün, 72 saat, arka kapı) into one "Yükümlülükler" line. Saves about 60.
- Section 6: merge "Ölçeklenince" into 2 lines, cost into one line. Saves about 120.
- Section 3: shorten the "39 değerde" explanation to one clause. Saves about 25.
- Spend about 150 words on the missing "neden önemli" parts of section 8 and the feature-metric mapping.

Hard to scan or unclear:
- Table cells of 26 to 54 words (rows Doğrulama, Backend, Giriş, Listeyle eşleşme, Cihaz bağlama, Excel). A table cell over about 20 words is a paragraph; move detail out.
- "20 m'deki arka sıra ~2-2,3 m genişlikte bir QR'ı okuyabilir" reads as a capability, but it means "QR projeksiyonda en az ~2 m genişlikte olmalı". Rewrite; the escalation also says this is an inference until measured, so mark it "tahmin".
- "max(3, %5)": write "3 kayıt veya %5, hangisi büyükse".
- Jargon with no gloss, relevant when the owner talks to faculty: MAC, BLE, monotonik saat, P-256, Keystore/Secure Enclave, BaaS, MAU, 802.1X, EAS, SUS puanı, VERBİS, EBYS, API 36, Unlisted. Either one-word gloss in parentheses or remove from the faculty-facing parts.
- "Ajanların eskalasyonları" and `scratchpad/...` paths: temporary directory, meaningless to faculty, and the owner's rule is that escalations reach him verbatim, not by link.
- Owner Q1 decides the stack, but the table presents Expo as settled and rejects Flutter web for the panel. Say what changes if the answer is Flutter (two languages, monorepo rationale drops).

## 5. Style

- Em dash and en dash: 0. Pass.
- Filler words: 0. Pass.
- Tone is direct. Minor: "Kâğıt imza bunların hiçbirini yakalamıyor" is fine; "Maliyet karar verdirecek büyüklükte değil" is vague, give the number (VM cost per month).
