// D13: rewrites every remaining "sahip" stem in prose (and the one unrenamed field name in the
// ogeTuruTanimla / OgeTuruTanimi signatures) in spec/D13.json and frag/D13.html.
// Each pair states how many times it must occur in each file; any mismatch aborts before writing.
// Usage: node yeniden.js <backend dir>
const fs = require('fs'), path = require('path');
const B = process.argv[2];
if (!B) { console.error('usage: node yeniden.js <backend dir>'); process.exit(2); }

// [old, new, count in spec, count in frag]
const PAIRS = [
  ['(TUM_OGE_TURLERI, sahibin sözleşme dosyasından)', '(TUM_OGE_TURLERI, sorumlu modülün sözleşme dosyasından)', 1, 1],
  ['sahibinin defter tablosuna', 'kendi modülünün defter tablosuna', 1, 3],
  ['böylece sahibin sonradan eklediği alan', 'böylece sorumlu modülün sonradan eklediği alan', 1, 1],
  ['s: { sahip: ModulAdi }', 's: { modul: ModulAdi }', 1, 1],
  ['govde: G; sahip: ModulAdi }', 'govde: G; modul: ModulAdi }', 1, 1],
  ['Kuyruk öğesi türünün sahibi (D04', 'Kuyruk öğesi türünün modülü (D04', 1, 1],
  ['öğe gövdesinin şeması sahibindedir)', 'öğe gövdesinin şeması öğe türünün modülündedir)', 1, 1],
  ['gövde şeması ve sahip modül.', 'gövde şeması ve sorumlu modül.', 1, 1],
  ['istek Bearer sahibinin kimliğiyle işlenir', "istek Bearer'daki hocanın kimliğiyle işlenir", 1, 1],
  ['yol sahibinin /v1/', 'yol rotanın modülünün /v1/', 1, 1],
  ['bilinmeyen rol (sahip) reddedilir', 'bilinmeyen rol (misafir) reddedilir', 1, 1],
  ['kaynak sahipliği modül servisinde, reddi 404', 'kaynağın kişiye ait olup olmadığı modül servisinde denetlenir, reddi 404', 1, 1],
  ["ürün kararıdır ve kural sahibi D07'dir", "ürün kararıdır ve kuraldan sorumlu modül D07'dir", 1, 1],
  ['bu sınıfların dışında, sahibinin PostgreSQL sayacındadır', 'bu sınıfların dışında, sorumlu modülün PostgreSQL sayacındadır', 1, 1],
  ['z.uuidv7()); sahip hedefli ON CONFLICT ile ekler', 'z.uuidv7()); sorumlu modül hedefli ON CONFLICT ile ekler', 1, 1],
  ['yolu çıkarsa sahibi listeye ekler', 'yolu çıkarsa o yolun modülü listeye ekler', 1, 1],
  ['Sahip modül öğe başına SAVEPOINT', 'Sorumlu modül öğe başına SAVEPOINT', 1, 1],
  ['kuralın sahibi iki yere bölünürdü', 'kuralın sorumluluğu iki modüle bölünürdü', 1, 1],
  ['kabul edildi ve sahiplerine gitti', 'kabul edildi ve sorumlu modüllere gitti', 1, 1],
  ['uyarı olarak loglar ve sahip bir sonraki ortak pencereyi bekler', 'uyarı olarak loglar ve yükseltme bir sonraki ortak pencereyi bekler', 1, 1],
  ["engellemez; kuralın sahibi D07'dir.", "engellemez; kuraldan sorumlu modül D07'dir.", 1, 1],
  ['Sahip, telefon uygulamasının sürümünü (apps/mobile app.json expo.version) X yapan değişiklikte belgeyi ', 'Telefon uygulamasının sürümünü (apps/mobile app.json expo.version) X yapan değişiklikte belge ', 1, 1],
  [' ile üretip aynı değişikliğe ekler; X etiketlenene', ' ile üretilip aynı değişikliğe eklenir; X etiketlenene', 1, 1],
  ['<div class="k">Sahip olduğu</div>', '<div class="k">Sorumlu olduğu</div>', 0, 1],
  ['<div class="k">Sahip olmadığı</div>', '<div class="k">Sorumlu olmadığı</div>', 0, 1],
  ['Öteki bütün uçlar sahiplerinin eklentisinde', 'Öteki bütün uçlar kendi modüllerinin eklentisinde', 0, 1],
  ['Ürün kararı ya da sahip onayı gerekenler aşağıda açık nokta.', 'Ürün kararı ya da onay gerekenler aşağıda açık nokta.', 0, 1],
  ['3 açık nokta; hepsi sahibin kararını bekliyor (mimar', '3 açık nokta; hepsi onay bekliyor (mimar', 0, 1],
  ['<span class="tag warn">sahip kararı</span>', '<span class="tag warn">onay bekliyor</span>', 0, 3],
];

const FILES = [['spec/D13.json', 2], ['frag/D13.html', 3]];
const errs = [];
const out = {};
let total = 0;
for (const [rel, col] of FILES) {
  let s = fs.readFileSync(path.join(B, rel), 'utf8');
  for (const p of PAIRS) {
    const [a, b] = p, want = p[col];
    const n = s.split(a).length - 1;
    if (n !== want) { errs.push(`${rel}: "${a}" occurs ${n}, expected ${want}`); continue; }
    if (n) { s = s.split(a).join(b); total += n; }
  }
  if (/[–—]/.test(s)) errs.push(rel + ': forbidden dash');
  const left = [...s.matchAll(/.{0,40}sahi[pb][a-zçğıöşü]*.{0,20}/gi)].map(m => m[0]);
  if (left.length) errs.push(rel + ': stem left: ' + left.join(' | '));
  if (rel.endsWith('.json')) JSON.parse(s);
  out[rel] = s;
}
if (errs.length) { console.error(errs.join('\n')); process.exit(1); }
for (const [rel, s] of Object.entries(out)) fs.writeFileSync(path.join(B, rel), s, 'utf8');
console.log(`rewrote ${total} occurrences in ${Object.keys(out).length} files`);
