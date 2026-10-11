// Rewrites every remaining "sahip" stem in the D09 generator sources and in the text fields of packages/D09.json.
// Wording only: ids, depends_on, needs, files, exports, tables, endpoints, jobs and test bodies stay as they are.
// Each pair must match exactly the expected number of times or nothing is written.
// Usage: node reword-sahip.js [--dry]   then: node build-d09.js
const fs = require('fs'), path = require('path');
const W = __dirname, B = path.resolve(W, '..');
const dry = process.argv.includes('--dry');

const EDITS = {
  'build-d09.js': [
    ["row('Sahip olduğu',", "row('Sorumlu olduğu',", 1],
    ["Kaynak yetkisi yalnız D02.dersYetkisi(tx, kimlik, dersId) === 'sahip' (yönetici kapsamı kimlik.roller'dan); öbür sonuç",
     "Kaynak yetkisi yalnız D02.dersYetkisi(tx, kimlik, dersId) dersin hocası sonucunu verince vardır (yönetici kapsamı kimlik.roller'dan); öbür sonuç", 1],
    ["veri kurucular sahip rolle (teknik.html#testler, D12-B35)", "veri kurucular şemayı kuran yoklama_goc rolüyle (teknik.html#testler, D12-B35)", 1],
    ["Sahibin kararını gerektirenler ara kararla yürür ve Açık noktalar'da sorulur.",
     "Ürün kararı gerektirenler, karar verilene kadar ara kararla yürür ve Açık noktalar'da onay bekler.", 1],
    ["${x.needs_owner ? 'Sahibin kararı' : 'Modüller arası'}", "${x.needs_owner ? 'Onay bekliyor' : 'Modüller arası'}", 1],
    // D13 renamed the third argument of ogeTuruTanimla to { modul: ModulAdi }; D04 follows the same form.
    ["ogeTuruTanimla('elle_ekleme', ElleEklemeGovdesi, { sahip: 'duzeltmeler' })", "ogeTuruTanimla('elle_ekleme', ElleEklemeGovdesi, { modul: 'duzeltmeler' })", 1],
    ["ogeTuruTanimla('sorun_bildirimi', SorunBildirimiGovdesi, { sahip: 'duzeltmeler' })", "ogeTuruTanimla('sorun_bildirimi', SorunBildirimiGovdesi, { modul: 'duzeltmeler' })", 1],
  ],
  'data-tables.js': [
    ["\"Partinin hocası: dersin o geceki sahibi; FK kisiler.\"", "\"Partinin hocası: o gece dersin hocası olan kişi; FK kisiler.\"", 1],
  ],
  'data-endpoints.js': [
    ["const SAHIP = \"kaynak düzeyinde yalnız D02.dersYetkisi(tx, kimlik, dersId) === 'sahip' geçer (üç parametre, I009);",
     "const DERS_HOCASI = \"kaynak düzeyinde yalnız D02.dersYetkisi(tx, kimlik, dersId) dersin hocası sonucunu verirse geçer (üç parametre, I009);", 1],
    ["Bearer anahtarı); \" + SAHIP;", "Bearer anahtarı); \" + DERS_HOCASI;", 1],
    ["yalnız kişinin sahibi olduğu dersler: liste", "yalnız kişinin hocası olduğu dersler: liste", 1],
    ["dersId verilip D02.dersYetkisi(tx, kimlik, dersId) 'sahip' değilse 404 DUZELTMELER_BULUNAMADI",
     "dersId verilip D02.dersYetkisi(tx, kimlik, dersId) 'yonetici' ya da null dönerse 404 DUZELTMELER_BULUNAMADI", 1],
    ["auth: \"Rol HOCA: dersId zorunlu ve D02.dersYetkisi(tx, kimlik, dersId) === 'sahip' (değilse ve kişi yönetici de değilse 404).",
     "auth: \"Rol HOCA: dersId zorunlu ve D02.dersYetkisi(tx, kimlik, dersId) dersin hocası sonucunu vermeli (vermezse ve kişi yönetici de değilse 404).", 1],
    ["İki rollü kişi sahibi olduğu derste hoca kuralıyla", "İki rollü kişi hocası olduğu derste hoca kuralıyla", 1],
    ["auth: \"Rol HOCA; dersId zorunlu, D02.dersYetkisi(tx, kimlik, dersId) === 'sahip' (değilse 404).\"",
     "auth: \"Rol HOCA; dersId zorunlu, D02.dersYetkisi(tx, kimlik, dersId) dersin hocası sonucunu vermeli (vermezse 404).\"", 1],
    ["auth: \"Rol HOCA: dersId zorunlu, D02.dersYetkisi(tx, kimlik, dersId) === 'sahip' (değilse 404). Rol YONETICI",
     "auth: \"Rol HOCA: dersId zorunlu, D02.dersYetkisi(tx, kimlik, dersId) dersin hocası sonucunu vermeli (vermezse 404). Rol YONETICI", 1],
  ],
  'data-rest.js': [
    ["(o gece açık dönemde sahibi olduğu dersi olan her hoca)", "(o gece açık dönemde hocası olduğu bir ders bulunan her hoca)", 1],
    ["2) Her öğeyi dersin bugünkü sahibine bağlar (D02.dersGetir hocaKisiId).", "2) Her öğeyi dersin bugünkü hocasına bağlar (D02.dersGetir hocaKisiId).", 1],
    ["\"Hoca yalnız sahibi olduğu dersin (D02.dersYetkisi(tx, kimlik, dersId) === 'sahip'; listeler D02.hocaninDersleri ile süzülür)",
     "\"Hoca yalnız hocası olduğu dersin (D02.dersYetkisi(tx, kimlik, dersId) dersin hocası sonucunu verir; listeler D02.hocaninDersleri ile süzülür)", 1],
    ["ve D02.dersYetkisi(tx, baglam.kimlik, dersId) === 'sahip' istenir.", "ve D02.dersYetkisi(tx, baglam.kimlik, dersId) için dersin hocası sonucu istenir.", 1],
    ["t('behavior', \"İki rollü kişi sahibi olmadığı derse yazamaz\"", "t('behavior', \"İki rollü kişi hocası olmadığı derse yazamaz\"", 1],
    ["dersYetkisi denetimi 'sahip' yerine doğruluk denetimine çevrilince", "dersYetkisi denetimi dersin hocası sonucu yerine doğruluk denetimine çevrilince", 1],
    ["(harfi V kalan, Elle eklendi ölçümüne girmeyen) sahibin kararı: D09-A01.", "(harfi V kalan, Elle eklendi ölçümüne girmeyen) onay bekliyor (Açık noktalar, D09-A01).", 1],
    ["Saat bölüşümünün tek sahibi bu işlevdir;", "Saat bölüşümünün tek yeri bu işlevdir;", 1],
    ["hoca yalnız sahibi olduğu derslerin satırlarını ve olaylarını görür", "hoca yalnız hocası olduğu derslerin satırlarını ve olaylarını görür", 1],
    ["akıbeti D01'in kuralıdır (D01-B22). Sahibin kararı: D09-A04.", "akıbeti D01'in kuralıdır (D01-B22). Onay bekliyor (Açık noktalar, D09-A04).", 1],
    ["Öğe reddi: ders kişinin değil (dersYetkisi 'sahip' değil: DUZELTMELER_BULUNAMADI)", "Öğe reddi: ders kişinin değil (dersYetkisi 'yonetici' ya da null: DUZELTMELER_BULUNAMADI)", 1],
    ["Bekleyen işler dersin bugünkü sahibine aittir: yetki her istekte D02.dersYetkisi(tx, kimlik, dersId) === 'sahip' ile denetlenir",
     "Bekleyen işler dersin bugünkü hocasına aittir: yetki her istekte D02.dersYetkisi(tx, kimlik, dersId) dersin hocası sonucuyla denetlenir", 1],
    ["parti dersin o geceki sahibine göre kurulur;", "parti dersin o geceki hocasına göre kurulur;", 1],
    ["D02 onay ve düzeltmede yalnız sahip sonucunu kabul eder.", "D02 onay ve düzeltmede yalnız dersin hocası sonucunu kabul eder.", 1],
    ["\"Kaynak yok, kişi dersin sahibi değil (dersYetkisi 'sahip' değil) ya da öğrencinin oturuma bağı yok;",
     "\"Kaynak yok, kişi dersin hocası değil (dersYetkisi 'yonetici' ya da null döner) ya da öğrencinin oturuma bağı yok;", 1],
    ["ogeTuruTanimla('elle_ekleme', ElleEklemeGovdesi, { sahip: 'duzeltmeler' })", "ogeTuruTanimla('elle_ekleme', ElleEklemeGovdesi, { modul: 'duzeltmeler' })", 1],
    ["ogeTuruTanimla('sorun_bildirimi', SorunBildirimiGovdesi, { sahip: 'duzeltmeler' })", "ogeTuruTanimla('sorun_bildirimi', SorunBildirimiGovdesi, { modul: 'duzeltmeler' })", 1],
  ],
  '../packages/D09.json': [
    ["yetki.ts sahip ve yönetici kapsam kuralı", "yetki.ts dersin hocası ve yönetici kapsam kuralı", 1],
    ["\"İki rollü kişi sahibi olmadığı derse yazamaz\"", "\"İki rollü kişi hocası olmadığı derse yazamaz\"", 1],
  ],
};

let errs = [], total = 0, done = 0;
const out = {};
for (const [f, pairs] of Object.entries(EDITS)) {
  let s = fs.readFileSync(path.join(W, f), 'utf8');
  for (const [a, b, n] of pairs) {
    const got = s.split(a).length - 1;
    if (got === 0 && s.split(b).length - 1 >= n) { done += n; continue; } // already applied on an earlier run
    if (got !== n) { errs.push(`${f}: expected ${n}, found ${got}: ${a.slice(0, 80)}`); continue; }
    if (/[–—]/.test(b)) errs.push(`${f}: dash in replacement: ${b.slice(0, 80)}`);
    s = s.split(a).join(b); total += n;
  }
  out[f] = s;
}
if (errs.length) { console.log('ERRORS\n' + errs.join('\n')); process.exit(1); }
if (!dry) for (const [f, s] of Object.entries(out)) fs.writeFileSync(path.join(W, f), s, 'utf8');
console.log((dry ? 'would rewrite ' : 'rewrote ') + total + ' occurrences in ' + Object.keys(out).length + ' files; ' + done + ' already applied');
