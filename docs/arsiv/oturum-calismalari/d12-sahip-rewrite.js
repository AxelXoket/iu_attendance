// One-off: rewrites every "sahip" stem in D12's generator sources (build.js, spec-data.js, paketle.js) and in
// packages/D12.json (title and notes text plus the renamed test name). Each pair must match exactly `n` times.
// Usage: node d12-sahip-rewrite.js <backend dir> [--dry]
'use strict';
const fs = require('fs'), path = require('path');
const B = process.argv[2];
const dry = process.argv.includes('--dry');
const W = 'd12work/';
const R = [
  // code identifiers (error codes, catalog field, test name)
  [W + 'spec-data.js', 'VERITABANI_GOC_SAHIPLIK', 'VERITABANI_GOC_MODUL_DISI', 4],
  [W + 'build.js', 'VERITABANI_GOC_SAHIPLIK', 'VERITABANI_GOC_MODUL_DISI', 1],
  [W + 'spec-data.js', 'VERITABANI_SAKLAMA_SINIF_SAHIBI', 'VERITABANI_SAKLAMA_SINIF_BASKA_MODUL', 3],
  [W + 'spec-data.js', 'sinif: SaklamaVeriSinifi; sahip: ModulBelirteci;', 'sinif: SaklamaVeriSinifi; modul: ModulBelirteci;', 1],
  [W + 'spec-data.js', "'Göç denetimi: sahiplik'", "'Göç denetimi: modül sınırı'", 1],
  [W + 'paketle.js', "T('Göç denetimi: sahiplik')", "T('Göç denetimi: modül sınırı')", 1],
  // build.js prose
  [W + 'build.js', "row('Sahip olduğu',", "row('Sorumlu olduğu',", 1],
  [W + 'build.js', "row('Sahip olmadığı',", "row('Sorumlu olmadığı',", 1],
  [W + 'build.js', "Sahiplik ${code('goc/tablo-haritasi.ts')}'ten okunur (contracts.json canonical_tables'tan: tablo, sahip modül, belirteç)",
    "Nesnenin modülü ${code('goc/tablo-haritasi.ts')}'ten okunur (contracts.json canonical_tables'tan: tablo, sorumlu modül, belirteç)", 1],
  [W + 'build.js', 'işlev sahibi ad önekinden okunur', 'işlevin modülü ad önekinden okunur', 1],
  [W + 'build.js', "kataloğunda (${code('<belirteç>.<sınıf>')}, sahip, başlangıç,", "kataloğunda (${code('<belirteç>.<sınıf>')}, modül, başlangıç,", 1],
  [W + 'build.js', 'API 5, işçi 3, saklama 1, sahip 2.', 'API 5, işçi 3, saklama 1, göç 2.', 1],
  [W + 'build.js', "'bütün nesnelerin sahibi; DDL; SECURITY DEFINER işlevlerin sahibi'", "'bütün nesneler bu role ait; DDL; SECURITY DEFINER işlevler de bu role ait'", 1],
  [W + 'build.js', "'yalnız xprem veritabanının sahibi'", "'yalnız xprem veritabanı bu role ait'", 1],
  [W + 'build.js', 'yalnız ekleme ya da yeniden adlandırmadır, sahibi yapar.', 'yalnız ekleme ya da yeniden adlandırmadır, değişikliği ilgili modül yapar.', 1],
  [W + 'build.js', "${o.needs_owner ? 'sahip' : 'modüller'}", "${o.needs_owner ? 'onay bekliyor' : 'modüller'}", 1],
  // spec-data.js prose
  [W + 'spec-data.js', 'yalnız göç defterinin (__drizzle_migrations), geri yükleme kayıtlarının ve saklama kanıtının sahibidir,',
    'yalnız göç defterinden (__drizzle_migrations), geri yükleme kayıtlarından ve saklama kanıtından sorumludur,', 1],
  [W + 'spec-data.js', 'sıfırlama ve veri kurucular sahip rolle;', 'sıfırlama ve veri kurucular şemayı kuran yoklama_goc rolüyle;', 1],
  [W + 'spec-data.js', 'öneki isleyici.modul ile ve katalogdaki sahiple aynı', 'öneki isleyici.modul ile ve katalogdaki modülle aynı', 1],
  [W + 'spec-data.js', 'yoklama_goc sahipli SECURITY DEFINER', 'yoklama_goc rolüne ait SECURITY DEFINER', 4],
  [W + 'spec-data.js', 'Her senaryodan önce sahip rolle uygulama', 'Her senaryodan önce yoklama_goc rolüyle uygulama', 1],
  [W + 'spec-data.js', 'Uç sahibi her modül gibi eklenti verir.', 'Ucu olan her modül gibi eklenti verir.', 1],
  [W + 'spec-data.js', 'pg-boss migrate sahip rolle tablo açınca', 'pg-boss migrate yoklama_goc rolüyle tablo açınca', 1],
  [W + 'spec-data.js', '(yer kontrolü). Sahip, contracts.json canonical_tables', '(yer kontrolü). Tablonun modülü, contracts.json canonical_tables', 1],
  [W + 'spec-data.js', 'önek sahibin GOC_BELIRTECLERI', 'önek, sınıfın modülünün GOC_BELIRTECLERI', 1],
  [W + 'spec-data.js', 'API 5, işçi 3, saklama 1, sahip 2', 'API 5, işçi 3, saklama 1, göç 2', 2],
  [W + 'spec-data.js', 'işlev adları sahibi modülün adıyla başlar', 'işlev adları işlevi açan modülün adıyla başlar', 1],
  [W + 'spec-data.js', 'göç denetimi işlevin sahibini bu önekten okur', 'göç denetimi işlevin modülünü bu önekten okur', 1],
  [W + 'spec-data.js', 'Kurulum adımı üçünü yoklama_goc sahipliğinde açar.', 'Kurulum adımı üçünü açar, üçü de yoklama_goc rolüne aittir.', 1],
  [W + 'spec-data.js', "pg-boss migrate'in sahip rolle açtığı", "pg-boss migrate'in yoklama_goc rolüyle açtığı", 1],
  [W + 'spec-data.js', 'yoklama_goc (bütün nesnelerin sahibi; göç servisi', 'yoklama_goc (bütün nesneler bu role ait; göç servisi', 1],
  [W + 'spec-data.js', 'UPDATE ve DELETE sahibinin göçünde geri alınır', 'UPDATE ve DELETE tabloyu kuran modülün göçünde geri alınır', 1],
  [W + 'spec-data.js', 'Kuyruklar yayın adımında sahip rolle açıldığından', 'Kuyruklar yayın adımında yoklama_goc rolüyle açıldığından', 1],
  [W + 'spec-data.js', 'yoklama (sahibi yoklama_goc, builtin C.UTF-8) ve xprem (sahibi xprem) veritabanlarını açar',
    'yoklama (yoklama_goc rolüne ait, builtin C.UTF-8) ve xprem (xprem rolüne ait) veritabanlarını açar', 1],
  [W + 'spec-data.js', 'işlemin sahibinin son adımda bir kez çağırdığı surumAl', 'işlemi açan modülün son adımda bir kez çağırdığı surumAl', 1],
  [W + 'spec-data.js', 'doldurma sahibinin pg-boss işiyle', 'doldurma tablodan sorumlu modülün pg-boss işiyle', 1],
  [W + 'spec-data.js', 'Yeni işaret sahibi modülün isteğiyle', 'Yeni işaret, tablodan sorumlu modülün isteğiyle', 1],
  [W + 'spec-data.js', 'Silmenin akışı hesabın sahibi modülde,', 'Silmenin akışı hesaptan sorumlu modülde,', 1],
  [W + 'spec-data.js', 'karar kişi satırının ve akışın sahibi D01\'indir', 'karar, kişi satırından ve akıştan sorumlu D01\'indir', 1],
  [W + 'spec-data.js', 'fiziksel silme sahibi modülün kodunda olur', 'fiziksel silme verinin sorumlu modülünün kodunda olur', 1],
  [W + 'spec-data.js', "('<belirteç>.<sınıf>', sahip modül, saklama başlangıcı", "('<belirteç>.<sınıf>', sorumlu modül, saklama başlangıcı", 1],
  [W + 'spec-data.js', 'sahip olmayan modülün başkasının kaydını', 'sınıftan sorumlu olmayan modülün başkasının kaydını', 1],
  [W + 'spec-data.js', 'süreyi sahibi koyar.', 'süreyi işi kuran modül koyar.', 1],
  [W + 'spec-data.js', 'Envanterdeki süreler sahiplere öneridir:', 'Envanterdeki süreler işi kuran modüllere öneridir:', 1],
  [W + 'spec-data.js', 'Sıfırlama sahip rolle uygulama', 'Sıfırlama yoklama_goc rolüyle uygulama', 1],
  [W + 'spec-data.js', "D10'un 'sahip rolle siler' yazdığı işleyicileri", "D10'un şemayı kuran rolle sileceğini yazdığı işleyicileri", 1],
  [W + 'spec-data.js', 'why: `Sahip rolle bağlanan test', 'why: `yoklama_goc rolüyle bağlanan test', 1],
  [W + 'spec-data.js', 'olur; sahip rolle denenen işleyici,', 'olur; yoklama_goc rolüyle denenen işleyici,', 1],
  [W + 'spec-data.js', 'ifadesinin eklenmesi D12-A07\'de sahibin onayına sunulur.', 'ifadesinin eklenmesi onay bekliyor (Açık noktalar, D12-A07).', 1],
  [W + 'spec-data.js', 'yöneticinin sahipsiz dersler listesine', 'yöneticinin hocasız dersler listesine', 1],
  [W + 'spec-data.js', 'Mimar kararı: sahibe açık nokta olarak kalır (I121).', 'Mimar kararı: onay bekleyen açık nokta olarak kalır (I121).', 1],
  [W + 'spec-data.js', "İşleyiciler 'sahip rolle' değil yoklama_saklama ile", 'İşleyiciler şemayı kuran yoklama_goc rolüyle değil yoklama_saklama ile', 1],
  [W + 'spec-data.js', 'zaman sırası, sahiplik, ana dalda generate', 'zaman sırası, modül sınırı, ana dalda generate', 1],
  [W + 'spec-data.js', 'önerisindeki cümle değişti, açık nokta sahipte.', 'önerisindeki cümle değişti, açık nokta onay bekliyor.', 1],
  [W + 'spec-data.js', 'D12-A05 sahibe açık nokta olarak kaldı.', 'D12-A05 onay bekleyen açık nokta olarak kaldı.', 1],
  // paketle.js prose (stale generator, kept consistent)
  [W + 'paketle.js', 'katalog farkıyla sahiplik,', 'katalog farkıyla modül sınırı,', 1],
  [W + 'paketle.js', 'senaryoları ile sahiplik, değişmezlik,', 'senaryoları ile modül sınırı, değişmezlik,', 1],
  // packages/D12.json (notes text and the test name renamed with the spec)
  ['packages/D12.json', 'yoklama_goc sahipli SECURITY DEFINER', 'yoklama_goc rolüne ait SECURITY DEFINER', 1],
  ['packages/D12.json', 'katalog farkıyla sahiplik,', 'katalog farkıyla modül sınırı,', 1],
  ['packages/D12.json', 'senaryoları ile sahiplik, değişmezlik,', 'senaryoları ile modül sınırı, değişmezlik,', 1],
  ['packages/D12.json', '"Göç denetimi: sahiplik"', '"Göç denetimi: modül sınırı"', 1],
];
const cache = new Map();
const get = f => { if (!cache.has(f)) cache.set(f, fs.readFileSync(path.join(B, f), 'utf8')); return cache.get(f); };
const errs = [];
for (const [f, a, b, n] of R) {
  const s = get(f);
  const k = s.split(a).length - 1;
  if (k !== n) { errs.push(`${f}: expected ${n}, found ${k}: ${a}`); continue; }
  cache.set(f, s.split(a).join(b));
}
if (errs.length) { console.log('ERRORS\n' + errs.join('\n')); process.exit(1); }
for (const [f, s] of cache) {
  const left = [...s.matchAll(/.{0,40}sahi[pb][a-zçğıöşü]*.{0,30}/gi)].map(m => m[0]);
  console.log(`${f}: ${left.length} left${left.length ? '\n  ' + left.join('\n  ') : ''}`);
  const dash = x => (x.match(/[–—]/g) || []).length;
  if (dash(s) !== dash(fs.readFileSync(path.join(B, f), 'utf8'))) { console.log(f + ': dash added'); process.exit(1); }
  if (!dry) fs.writeFileSync(path.join(B, f), s);
}
console.log(dry ? 'dry run ok' : 'written');
