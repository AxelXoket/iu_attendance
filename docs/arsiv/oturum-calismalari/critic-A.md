# Critic A: fidelity and completeness of summary.md against research/01..10 + mx-check.txt

VERDICT: FAIL

Reason: 8 factual errors or overstatements, 7 misrepresentations, 10 decision-relevant omissions, 11 silent source conflicts, 2 internal inconsistencies. Line numbers refer to summary.md (S) and the research file named.

Deterministic re-check done: float-vs-integer allowance mismatch recomputed (p=60,70,75: 0; p=80: 39; T=15 gives 3 vs 2). The summary's figure is correct. QR widths (2.0-2.32 m MAC, 2.64-3.28 m signature) match 03 and qr_sizing.out.

---

## A. Factual errors

1. **NFC rejected for the wrong reason.** S L9: "NFC (iOS'ta Türkiye'de yok)". 03 L24/L64: only HCE (phone acting as a card) is unavailable in Turkey. NFC *tags* (NTAG 424 DNA SUN, AES-CMAC plus counter, verifiable offline) work and 03 L23 keeps them as "Labs only".
   Fix: "NFC: telefonun kart gibi davranması (HCE) iOS'ta Türkiye'de yok; derslikteki NFC etiketi çalışır ama tek etiket kuyruk yapar, yalnız laboratuvar için."
2. **Md.19(2) unit is wrong.** S L39: "klinik devam bölüm bazında". 05 L224, 06 L139, 08 L14: "anabilim dalı". These are different academic units.
   Fix: "klinik devam anabilim dalı bazında ayrı hesaplanır."
3. **Genelge 2019/12 misquoted, and it changes the defaults.** S L12: "kamu verisini kurum dışı yabancı buluta koymayı yasaklıyor". Text (05 L108): cloud storage is barred except "kurumların kendi özel sistemleri veya **kurum kontrolündeki** yerli hizmet sağlayıcılar". A domestic provider is fine only under IU control and a processor contract (05 L125, [LEGAL]). So S L12 option 3 "yerli sağlayıcı" and Q14 default "yerli bir VM" are not clean on their own.
   Fix: "Yerli sağlayıcı ancak İÜ kontrolünde ve veri işleyen sözleşmesiyle olur; öğrencinin kendi kiraladığı VM bu şartı sağlamaz."
4. **Md.35 is broader in the summary than in the regulation.** S L44 "Resmi görevlendirme devamsızlık sayılmaz" and L80 "izinli durumunun karşılığı Md.35'teki görevli". 05 L227, 06 L144, 08 L16: only sport, culture, art and competition assignments. Faculty will read "izinli" more broadly.
   Fix: "Md.35: yalnız spor, kültür, sanat etkinliği ve yarışma görevlendirmesi sayılmaz."
5. **SCC notification body.** S L65 "5 iş günü içinde Kurul'a bildirim". Law and regulation say "Kuruma bildirilir" (02 L22, 05 L97, L101). Kurum and Kurul are different bodies in a legal text.
6. **"ExcelJS'in bakımlı çatalı" is not supported.** S L18. 08 L133: exceljs is dormant (last publish about 3 years ago). The @protobi fork calls itself "Temporary fork ... pending upstream merge". Nothing in the sources says it is maintained.
7. **Expo cost stated as certain.** S L165 "Kampüs geneli için 19 USD/ay". 01 L207 says "may need". It also leaves out the free tier's OTA limit of 1K MAU (01 L158), which is the actual trigger at campus scale.
8. **Email username claim is overstated.** S L15 "Öğrenci e-posta kullanıcı adı öğrenci no içermiyor". 06 L108-111 and 07 L17 say it is not *reliably* the number: the 2012 rule was `ogrencinumarasi@`, and older accounts may still follow it. 10 F8 even guessed it might be.

## B. Misrepresentations (inference stated as fact, caveat dropped)

9. **"Raporlu" is presented as settled.** S L62, L80, L133. 05 L86 marks it as a [LEGAL] stop resting on its own inference (a raporlu label counts as health data). 06 L155, 08 L121 and 10 L119 all propose storing R/MEDICAL but counting it as absent. The faculty explicitly asked for "raporlu". This belongs in open questions for IU legal, not in "Elenenler".
10. **Wrong precedent for rejecting face recognition.** S L9 cites 2026/921, which concerns employee time tracking (mesai takibi), and 03 L66 marks the student analogy as [I]. The on-point decision is 2024/197: fingerprint attendance at a university was disproportionate even with consent (05 L31).
    Fix: "yüz/parmak izi (KVKK 2024/197: üniversite yoklamasında rıza olsa bile ölçüsüz)".
11. **Cause of the "last time" failure asserted.** S L14 says the "herkes aynı anda merkezi sisteme giriyor" problem will not occur, framing it as the known cause. 04 L25-29 and 06 L168-169: no public trace, unverified. Q1 asks about it, but the decision row states it as fact.
12. **QR sizing caveats dropped.** S L9. These are 10:1 planning numbers that must be measured in a real hall (03 L38, L155). With 2x zoom, which the summary itself relies on, the needed width halves to 1.0-1.16 m (03 L36). The projector image is only about 2-2.5 m tall [I]. As written, a reader concludes that a 2 m QR is required.
13. **"None of them can check in offline."** S L137. 04 L43/L93 only says none *advertises or documents* offline check-in. Hacettepe is "Not stated" (04 L51). A missing mention is not a verified inability.
14. **Summary claims "one student per device" but names no mechanism.** S L16 and L32 ("Önlenen: bir telefondan iki öğrenci"), while S L64 bans hardware IDs and S L16 defers App Attest/Play Integrity. The sources' mechanism is `device_hash = H(IDFV or ANDROID_ID)` (03 L118) or DeviceCheck/device-recall bits (07 L124, both Apple/Google services). A per-install key alone resets on reinstall. The sources also conflict: 03 T10 and 07 L124 say flag, do not block ("siblings share phones"), while 10 L133 says block.
    Fix: "Aynı cihazda ikinci hesap uygulamaya özel cihaz kimliğinin (IDFV/ANDROID_ID) özetiyle tespit edilir; engellenmez, hocaya işaretlenir (kardeşler telefon paylaşabilir)."
15. **Play org-account exemption from 12x14 is [REPORTED] (09 L98) but stated as fact at S L153.** Low severity.

## C. Decision-relevant omissions

16. **IU student mailboxes are hosted on Google** (mx-check.txt, 06 L106). 05 L137 and Q9 (L263) flag this as its own transfer question. The summary knows the MX result (S L14) but in KVKK (S L65) treats "E-posta İÜ sunucusundan gönderilir" as the full answer, and it drops the question.
    Where: KVKK Barındırma plus Q13. "Kodlar İÜ sunucusundan gönderilse de @ogr.iu.edu.tr kutuları Google'da; bunun KVKK açısından sorun olup olmadığı İÜ hukukuna sorulmalı."
17. **Student mailbox is opt-in.** 06 L108 and 07 L18/L25: students must create it at ogr.iu.edu.tr, and "many students never created the mailbox". This drives the 90% by week 3 adoption target (S L177) and the Q12 default.
    Where: Giriş row. "Öğrenci e-postası otomatik açılmıyor, öğrenci kendisi açıyor; bir kısmının adresi yok."
18. **Retention "helper" branch missing.** S L66 gives only the 10-year official-record case. 05 L158 and 07 L151: if the app is a helper, delete after AKSIS entry plus the objection window. Q16 decides between the two branches, so both outcomes should be stated.
    "Yardımcı kayıt sayılırsa: AKSİS girişi ve itiraz süresi bitince silinir."
19. **Never-sync and after-deadline behaviour undefined.** If the instructor's session header never syncs, every student record for that session stays PENDING and then expires (03 L142, L145). A single lost instructor device loses the whole session. On records after the deadline, 03 L142 says REJECT and 10 L116 says instructor review. S L29 says neither.
    Where: Akış step 7. "7 günden sonra gelen kayıt hoca incelemesine düşer (ya da reddedilir: karar gerekli). Hoca cihazı oturumu hiç senkronlamazsa o dersin tüm kayıtları düşer; hoca cihazı ders sonunda ilk fırsatta senkronlanmalı."
20. **"Önlenemeyen" list is incomplete.** Missing: modified app or emulator (03 T8; now unmitigated because attestation is deferred; 10 L276), rooted phone with keybox spoofing (T9), and scan-then-leave (T11, which paper does not stop either).
    "Değiştirilmiş uygulama/emülatör (App Attest/Play Integrity gelene kadar), rootlu telefon, okutup çıkmak."
21. **Pilot metrics cut.** Dropped: instructor effort ≤2 min per session and minutes saved ≥10 min/week per instructor (10 L252-253), which are the actual value metrics; held sessions taken in the app ≥90% by week 4 (10 L259); student SUS ≥70 (10 L261); ≥98% accepted without flag (03 L147).
    Where: section 7. "Hoca zamanı: oturum başına en fazla 2 dk; kâğıda göre haftada en az 10 dk kazanç."
22. **Apple 5.1.1(ix) missing.** Apps requiring sensitive user info "should be submitted by a legal entity ... not by an individual developer" (05 L204). This directly conflicts with the pilot-on-personal-accounts plan (S L147), and Beta App Review applies to TestFlight external testing.
    Where: Mağaza riskleri. "Apple 5.1.1(ix): hassas veri işleyen uygulama bireysel değil tüzel kişi hesabından gönderilmeli; kişisel hesapla pilot reddedilebilir."
23. **AKSIS absence-entry deadline missing.** The draft calendar has 20 Aralık 2026 / 2 Mayıs 2027 (the day before finals), and the updated calendar leaves the cell blank (06 L71-73). This sets the hard date for the export feature.
    Where: İÜ takvimi. "Devamsızlığın AKSİS'e son giriş günü: taslakta 20 Aralık / 2 Mayıs, güncel takvimde boş; bölüme sorulmalı."
24. **Two MVP items from 10 dropped silently.** Accessibility basics (10 L231: labels, text scaling, contrast, PIN path) and the AUDITOR read-only department-head role (10 L81). Low.
25. **Load figures pick the lower row without saying so.** S L167 uses the 1 session/week row. The 2/week row doubles the figures to 16.8M records and 8.4 GB (02 L95), and all of them are [I] estimates. Low.

## D. Source conflicts resolved silently

26. **Flagged records.** S Q9 default: "evet, var sayılır". 03 L144: "default counted present only after approval". 03 escalated this as a policy call.
27. **PDF generator.** S L18 uses pdfmake. 08 L154 recommends Puppeteer or Typst. 10 L190 says browser print-to-PDF for MVP. Only 02 mentions pdfmake, and only in passing.
28. **TA role.** S L121 defers it to later. 10 L209 has it in MVP ("labs are often TA-run"), and 07 L45 defines it.
29. **Start and closing reminders.** S L86-87 puts them in MVP as local notifications (08). 10 L191-192 rejects both because they tell absent students to ask a friend for the code.
30. **Rebind parameters.** S L16 uses 48 h and 2 per term (07 L121). 10 L133 has 24 h and once per term. S also drops 07's "self-service; beyond that admin approval only", so "en fazla 2 kez" reads as an absolute cap.
31. **Personal-email fallback.** S Q12 default: "hayır". 07 L66 recommends allowing it with an "unverified" badge plus instructor approval, and 07 escalated it.
32. **QR rotation interval.** S says "birkaç saniyede bir" (03: 3-5 s). 10 L108/L176 uses 15 s. The market norm is 10-15 s (04 L171).
33. **Session secret.** S L23 derives it offline from the instructor device key (03). 10 L108 has the server issue a per-session secret to the panel at open, which needs the panel to be online. This matters for the "instructor offline" case and should be stated as a choice.
34. **Pilot speed target.** S L171 uses ≤120 s for 100 students (10). 03 L147 targets under 60 s for 150, and S L9 itself claims about 1 minute for 150. The looser target was picked without saying so.
35. **Primary sign-in.** 10 makes Google sign-in the MVP primary. 07 makes email OTP the primary. S follows 07 and does not mention 10. Low.
36. **Key algorithm.** 02 L39 says Ed25519. 03 L70 and 07 L102 say P-256, because Secure Enclave supports only P-256. S is correct but does not say so. Low.

## E. Internal inconsistencies

37. **Rebind notice needs push.** S L16 sends a rebind notice "eski cihaza", but MVP has no server push (S L17). It can only reach the old device as an in-app message on its next sync.
38. **Reminder queue without remote reminders.** S L12 includes a "hatırlatma kuyruğu pg-boss", but every MVP notification is local (S L17, L85-90). Either say what the queue is for or drop it.
