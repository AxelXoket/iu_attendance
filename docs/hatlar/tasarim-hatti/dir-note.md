# Direction note to apply before delivery (owner, 6 October 2026)

The owner wrote, after the ink direction was built: "Ayrıca gece mavisini yazılarda, panel içlerinde, her yerde yavaş yavaş kullanacağız, hafif beyaz/griden gece mavisine geçişler, panel arka aydınlatmaları vs çook fazla şey var aklıma hepsini yapacağız".

Meaning: the next design step widens midnight blue gradually: in text, inside panels, everywhere; gradients from light white or gray to midnight blue; panel backlighting; more ideas to come, designed together with the owner. The palette lock stays (same colors, no yellow, no green). The current document is the first version and its "ink only" rules are its baseline, not a final rule.

Apply in tasarim.html (through its sources: variants/A2 sections and tokens, doc/sections fragments), without the word "sahip":
1. #gece-mavisi: title the never list "Bu sürümde gece mavisi olmayan yerler" (or equivalent) and add one line under it: "Karar, 6 Ekim 2026: bu liste ilk sürümün tabanıdır. Sıradaki adımda gece mavisi yazılarda, panel içlerinde ve yüzeylerde kademeli olarak genişler; kırık beyaz ve griden gece mavisine geçişler ve panel arka aydınlatması birlikte tasarlanacak (Açık noktalar)." Link to the new open point.
2. The midnight-blue budget wherever it is stated (Özet row, Gece mavisi nerede, measured share): call it "bu sürümün bütçesi" and say it will be redefined with the widening.
3. #acik: a new first point "Gece mavisinin genişletilmesi", quoting the sentence above verbatim as the 6 October 2026 decision; what is open: gradients (endpoints only from the locked palette, interpolation in OKLCH so no hue drifts toward yellow or green), panel backlighting (a soft midnight-blue light behind panels), midnight-blue tinted text levels and panel interiors, new budgets per screen; why it matters; recommendation: design it in the next session from the owner's ideas, keep the lock and the contrast rules; who decides: the next session together.
4. #ozet: the row on midnight blue's role and the budget row each get "(ilk sürüm; genişleyecek, Açık noktalar)" with a link.
5. Keep everything else. Run the gates after: tcheck, build, dgate --repo, shot.js (390, 1440, reduced, hover, elements), rulecheck, interact.
