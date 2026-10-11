const fs = require('fs');
const { build, locate } = require('./locate.js');
const REPO = 'C:/Users/USER/Desktop/iu_attendance/';
let bad = 0;
for (const f of ['plan.html', 'teknik.html', 'tasarim.html']) {
  const html = fs.readFileSync(REPO + f, 'utf8');
  const v = html.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ');
  const mine = build(f).text;
  const same = v === mine;
  if (!same) { bad++; let k = 0; while (k < v.length && v[k] === mine[k]) k++; console.log(f, 'DIFF at', k, JSON.stringify(v.slice(k - 40, k + 40)), '|', JSON.stringify(mine.slice(k - 40, k + 40))); }
  else console.log(f, 'text identical to validator, length', v.length);
}
// positive controls with known anchors (checked by hand in the source)
const pos = [
  ['plan.html', 'Önceden programa girilir.', 'kararlar-kafa-sayisi'],
  ['plan.html', 'Ders silinmez, arşivlenir.', 'devam-donem-sonu'],
  ['teknik.html', 'Oturum başına iş yok', 'sunucu-arka-plan'],
  ['plan.html', 'Saatler İstanbul saati: sunucu her oturumun', 'kararlar-inceleme-hesaplari'],
];
for (const [f, q, want] of pos) { const r = locate(f, q); const ok = r.ok && r.anchorId === want; if (!ok) bad++; console.log(ok ? 'PASS' : 'FAIL', f, q.slice(0, 30), '->', r.anchorId, 'want', want); }
// negative control: a quote that does not exist must not be found
const neg = locate('plan.html', 'Bu cümle belgede yok ve bulunmamalı');
if (neg.ok) bad++; console.log(neg.ok ? 'FAIL negative control found' : 'PASS negative control not found');
// artifact control: inline <code> leaves a space before punctuation
const art1 = locate('teknik.html', 'yerel: time, "Europe/Istanbul"');
const art2 = locate('teknik.html', 'yerel: time , "Europe/Istanbul"');
console.log('artifact without space found?', art1.ok, '| with space found?', art2.ok);
process.exit(bad ? 1 : 0);
