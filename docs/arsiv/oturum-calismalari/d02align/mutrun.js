// Mutation check of build.js self-checks: each mutation must turn the build red with the named message; the ground control must pass.
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const M = path.join(__dirname, 'mut'), R = path.join(M, 'a', 'r2');
const run = () => { try { return { ok: true, out: execFileSync('node', [path.join(R, 'build.js')], { env: { ...process.env, D02_OUT: path.join(M, 'out') } }).toString() }; } catch (e) { return { ok: false, out: e.stdout.toString() }; } };
const mut = (file, from, to, beklenen) => {
  const f = path.join(file === 'contracts.json' ? M : R, file), orig = fs.readFileSync(f, 'utf8');
  if (!orig.includes(from)) return `KURULAMADI ${beklenen}`;
  fs.writeFileSync(f, orig.replace(from, to));
  const r = run();
  fs.writeFileSync(f, orig);
  if (fs.readFileSync(f, 'utf8') !== orig) throw new Error('geri yazılamadı ' + f);
  return (!r.ok && r.out.includes(beklenen)) ? `KIRMIZI (beklenen) ${beklenen}` : `YESIL KALDI ${beklenen} :: ${r.out.slice(0, 200)}`;
};
const g = run(); console.log('zemin kontrolü:', g.ok ? 'YEŞİL' : 'KIRMIZI ' + g.out.slice(0, 300));
console.log(mut('p4-netlik.js', "D02-B06: Sınav haftalarında ders yapılır mı; varsayılan ne olsun?', 'Tatilde hiç oturum üretilmez. Sınav haftası satırında \"ders yapılır\" seçimi olsun, varsayılan yapılmaz; ders yapan birim seçimi açar, hoca gerekirse telafi ekler. Sunucu bu varsayılanla kurulur, karar değişirse yalnız varsayılan değer değişir.', true)", "D02-B06: Sınav haftalarında ders yapılır mı; varsayılan ne olsun?', 'Tatilde hiç oturum üretilmez. Sınav haftası satırında \"ders yapılır\" seçimi olsun, varsayılan yapılmaz; ders yapan birim seçimi açar, hoca gerekirse telafi ekler. Sunucu bu varsayılanla kurulur, karar değişirse yalnız varsayılan değer değişir.', false)", 'mimarın karar verdiği açık nokta kalmamalı'));
console.log(mut('p3-isler.js', 'Kaynak yetkisinin tek yeri (I009).', 'Kaynak yetkisinin tek yeri (I009, surumleDamgala).', 'emekli ad ya da kimlik kaldı: surumleDamgala'));
console.log(mut('p3-isler.js', '{ name: "isler",', '{ name: "isler ve tanimlar",', 'dış yüz adı tek tanımlayıcı olmalı'));
console.log(mut('p3-isler.js', '{ name: "OTURUM_DURUMLARI",', '{ name: "OTURUM_TURLERI",', 'tekrar eden dış yüz adı'));
console.log(mut('contracts.json', '_dersler_<açıklama>/ (tek Drizzle klasörü', '_derslerX_<açıklama>/ (tek Drizzle klasörü', 'göç klasörü contracts.json ile aynı değil'));
console.log(mut('p4-netlik.js', "Mimar kararı I006 (ACCEPT)", "Karar I006 (ACCEPT)", 'kapanan açık noktada mimar kararı yok'));
console.log(mut('p4-netlik.js', "  o('D02-A11',", "  o('D02-A12', 'x', 'y', true),\n  o('D02-A11',", 'kapanan açık nokta hâlâ açık'));
console.log(mut('build.js', 'derslerKimlikDinleyicisi dinleyiciler.ts), jobs/dersler/', 'derslerKimlikDinleyicisi dinleyiciler.ts, derslerKur), jobs/dersler/', 'bölümde emekli ad ya da kimlik'));
console.log(mut('p3-isler.js', "'apps/server/src/jobs/dersler/index.ts',", "'apps/server/src/jobs/dersler/index.ts',\n  'apps/server/migrations/20261010000000_dersler_ilk/migration.sql',", 'göç dosyası spec dosya listesinde'));
console.log(mut('build.js', "_dersler_<açıklama>/ klasörleri (migration.sql", "_dersler_<ad>/ klasörleri (migration.sql", 'bölümde göç klasörü contracts.json ile aynı değil'));
