# İÜ Yoklama: context for the design work

## Product
İÜ Yoklama is a class attendance app for Istanbul University (Turkey), built by the owner with department faculty.

- One phone app for Android and iOS with two modes, student and instructor. Stack: Expo SDK 57 (React Native 0.86, React 19.2, New Architecture). QR scanning with expo-camera; the QR is drawn with the qrcode JavaScript library; the instructor's QR screen is kept awake (expo-keep-awake).
- A web panel for instructors and admins: Vite 8, React 19, TanStack Router 1, TanStack Query 5. Courses and schedules, roster upload from the AKSIS Excel export, reports downloaded as Excel, a print view, corrections, approval lists, an "AKSIS özeti" screen, and a full-screen projector page that shows only the QR.
- Core flow: the instructor shows a QR (phone or projector page); students scan it with their own phones, often offline (basement classrooms without signal); the record is stored on the phone and sent when internet returns. Students get receipts; absence warnings have levels.
- Turkish UI only. Dates and times in Europe/Istanbul with Turkish formats.
- Users: Turkish university students (Android is the large majority in Turkey, many mid and low end phones) and faculty members of all ages. The fraud bar is "better than paper"; faculty want it simple.
- Existing decisions in plan.html, do not contradict them: WCAG 2.2 AA on phone and panel; no in-app text size or contrast setting, the app follows the phone and browser settings; text colors contrast at least 4.5:1; the panel works with the keyboard alone; click targets on the panel at least 24 px; paste and autofill stay on in the e-mail code field.
- Repository documents: plan.html (product and architecture decisions), teknik.html (technical detail). A new design document, tasarim.html, will hold the design system. Research goes to a separate file outside the repository.

## Owner lock, 6 October 2026 (verbatim: "hiçbir şekilde sarı ya da yeşil olmayacak bu arada, kesinlikle olmayacak, bahsedilen renkler kilitlenmeli")
- No yellow and no green anywhere: not in the app, not in the panel, not in the documents. Banned range: any color with OKLCH chroma above 0.02 and hue between 35 and 220 degrees (orange, amber, yellow, olive, green, teal, cyan). This includes success, warning and attendance status colors, charts, illustrations and the İÜ corporate yellow and green. tcheck.js and dgate.js enforce it.
- The palette is locked, exactly as in locked.json: page background #F2F4F8 (neutral.2), the 12-step neutral scale at hue 270 (#FEFEFF ... #1A2030), the 12-step midnight-blue accent scale at hue 262, primary fill #143065 (accent.11), hover #1F4184 (accent.10), pressed #0F2248 (accent.12), focus ring and links #2B58B1 (accent.9), primary text #1A2030, secondary text #596074. No alternative undertones.
- Allowed hues for meaning beyond the locked neutrals and midnight blue: blues and violets (hue 220 to 330) and reds and roses (hue 330 to 360 and 0 to 35). Status meaning is carried by icon plus label first; color supports it. Success uses the midnight-blue family, never green. Warning uses the red family at lower emphasis or a violet, never yellow or amber.
- Research recommendations R02-K08 and R02-K09 (green success, amber warning, green "geldi", amber "geç kaldı") are void under this lock. R02 also used guessed status names; the real ones are in brief.md section 4.

## Owner clarification, 6 October 2026 (verbatim: "gece mavisi alt ton olacak, ana tonlar gri ve kırık beyaz dediğimiz gibi, gece mavisini nasıl ve nerede kullanacağımızı düşünmemiz lazım")
- The main tones are gray and off-white. Midnight blue is the undertone: it already tints the locked neutral scale (hue 270) and otherwise appears only in a few deliberate places. It is never a dominant color and never a large surface by default.
- How and where midnight blue appears is a central decision of the design. Every proposal states an explicit usage map: each role where an accent step appears (role, place, step, why), a "never" list, and a coverage budget per screen measured with coverage.js on screenshots (the share of pixels in the "gece mavisi" family). shot.js --elements "<selector>|..." prints this share per element.

## Fact-checker corrections that bind every proposal
- Control borders (inputs, checkboxes, the only visual boundary of a control) need 3:1 against their actual background. neutral.9 #7D8497 gives only 2.99:1 on neutral.4 (hover rows) and 2.78:1 on neutral.5 (selected or pressed rows); on those backgrounds use neutral.10 #6E7589 (3.42:1 or more). Declare these pairs in tokens.json so tcheck.js measures them.
- #F2F4F8 is a color in IBM's palette (Cool Gray 10) but none of Carbon's four themes uses it as a background; do not claim Carbon uses it as a page color.
- Inline links in body text are always underlined (the link color differs from body text by only 2.38:1).

## Binding constraints already decided in plan.html and teknik.html
- Minimum platforms: Android 7 (minSdk 24), iOS 16.4. Panel browsers: Chrome and Edge 111, Firefox 114, Safari 16.4; lecture-hall PCs that show the projector page may run Chrome 109. Newer CSS (@starting-style, linear(), View Transitions, interpolate-size, popover, transition-behavior) is progressive enhancement: without support the element works and simply does not animate.
- teknik.html#panel-cati: "Hazır arayüz kütüphanesi yerine tarayıcının kendi öğeleri (düğme, tablo, form, dialog, tarih kutusu)." The panel is built on the browser's own elements, not a ready-made UI component library.
- plan.html#asama23: the QR is always dark modules on a light background with a four-module quiet zone, large modules readable from the back row; "panelin koyu teması QR'a uygulanmaz". No other dark theme decision exists.
- The receipt QR on the phone is drawn with plain views; the camera opens with the main (1x) lens.
- Exact Turkish names of statuses, labels and warning texts are in brief.md section 4; use them verbatim.

## The owner's design brief, 6 October 2026 (Turkish original, verbatim)
"Genel manada kırık beyaz ( krem rengine kaymayan saf beyazın biraz daha koyusu ) ve gri tonlarında genel temamız olacak, ancak çok ruhsuz olacağı için alt ton eklemek istiyorum, muhtemelen ya gece mavisi ya da pna benzer nötr ve güzel bir renk olmalı, köşeli ancak elegant bir yapı olacak, panellerin açılışları herhangi bir butonun hover esnasında animasyonu, kapanış açılış ( paneller butonlar her şey için ) animasyonları, kullanıcının etkileşime geçeceği her şeyin smooth animasyonlar dahilinde olması lazım, panelleri oluşturmaya başladıktan sonra onların animasyonları için ayrıca konuşuruz, bunları göz önünde bulundurarak internette detaylı araştırma yapmanı, modern ui dinamiklerini ele almanı, çok satan modern uygulama ui larını da incelemeni, belirli forumlarda ui ile ilgili yorumları taramanı ve araştırmanı istiyorum, ayrı bir tasarım dosyası oluştur, araştırma için de ayrı"

("pna benzer" is a typo for "ona benzer", meaning "similar to that".)

Meaning, point by point:
- Base theme: off-white ("kırık beyaz"), a slightly darker shade of pure white that must not drift toward cream, plus gray tones.
- That alone would feel soulless, so add an undertone: probably midnight blue ("gece mavisi") or a similar neutral, beautiful color.
- Structure: angular, sharp corners, yet elegant.
- Smooth animation for everything the user interacts with: panel opening and closing, button hover, open and close animations for panels, buttons and everything else.
- Panel-specific animations will be discussed separately once panels are being built.
- Research: detailed internet research, modern UI dynamics, the UIs of best-selling modern apps, UI comments on forums.
- Deliverables: a separate design file and a separate research file.

## Writing rules for anything that may reach the documents
- Turkish, plain words. Never use U+2013 (en dash) or U+2014 (em dash); use commas, colons or parentheses.
- In English text avoid: delve, crucial, robust, comprehensive, nuanced, multifaceted, furthermore, moreover, pivotal, landscape, tapestry, underscore, foster, showcase, intricate, vibrant, fundamental, significant, interplay. In Turkish avoid marketing language.
- Do not raise KVKK (the personal data law), timelines, sponsors or phase re-staging.

## Tools in this folder
- color.js: deterministic color math. node color.js hex <L> <C> <H> | info <hex...> | contrast <fg> <bg> | scale <H> <C> <L1,L2,...> | cvd <hex...>. Never eyeball color conversions or contrast.
- validate.js: shape gate for research and verify files.
