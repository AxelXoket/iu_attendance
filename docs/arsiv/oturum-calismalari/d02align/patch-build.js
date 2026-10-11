// build.js: summary, migration block, stronger self-checks, section text in step with the aligned spec.
const { load, save, rep, repLine, insAfter, J } = require('./lib.js');
let s = load('build.js');

// ---------- spec ----------
s = repLine(s, '  summary: "D02 (dersler) birimi', `  summary: ${J("D02 (dersler) birimi, bölümü, genel dönemi, birim takvimini, birim ve dönem kilidini, dersi, şubeyi ve haftalık programı tutar; oturumları programdan dönemin tamamı için önceden üretir ve her değişiklikte yalnız başlamamış oturumları saf bir plan fonksiyonuyla yeniden hesaplayıp farkı yazar. Oturum bir program saatinin tek buluşmasıdır ve hiç silinmez: iptal, taşıma, telafi, tek oturum düzenlemesi ve \"Ders yapıldı mı?\" cevabı oturum satırında ve değişiklik geçmişinde iz bırakır, sayımı D08 ve D10 oturum durumundan okur. Yerel program saati UTC ana PostgreSQL'in saat dilimi verisiyle (AT TIME ZONE 'Europe/Istanbul') çevrilir; kilit dahil kural taşıyan her an bileşim kökünün verdiği saat arayüzünden gelir, kilit anı son günün ertesi 00:00 İstanbul'dur. Pencere hesabı (D04) üretim dinleyicisi, kilit kapanışı (D07, sıra 10) ve gün sonu anlığı (D10, sıra 20) kilit adımı, liste kaynağı (D03) etkinSatirlar olarak D02'ye kaydolur; D02 D01'in kimlik olaylarını derslerKimlikDinleyicisi aboneliğiyle alır. Telefona inen beş tablo işlem başına tek D06 sürümüyle damgalanır (D06.surumDamgasiIste, en son tek surumAl) ve D06'nın kapsamına göre beş genel kaynaktan iner; personel kapsam kaynağı D02'nin, öğrenci kapsam kaynağı D03'ündür. Deneme dersini D01'in inceleme_hesaplari_kurulumu işi D02.denemeDersiniKur ile kurdurur ya da devrettirir (itme modeli); inceleme hesabı deneme dersi dışında hiçbir şey yazamaz. Ürün kararı isteyen ")} + P4.open_points.filter(o => o.needs_owner).length + ${J(' soru önerilen varsayılanla açık noktada bekliyor; mimarın kararlarıyla kapanan ')} + P4.resolved_gaps.filter(r => /^D02-A\\d\\d$/.test(r.gap)).length + ${J(" sözleşme ve komşu eki Netleştirilenler'de kararıyla yazılı.")},`);
s = insAfter(s, '  denetim_olaylari: P4.denetim_olaylari,', `  migrations: { dir: mod.migration_dir, glob: C.file_ownership.filter(g => g.owner === 'D02' && g.glob.startsWith('apps/server/migrations/')).map(g => g.glob)[0], rule: ${J("Göç yalnız bu modülün tablolarına dokunur, yalnız ileri ve önce genişlet sonra daralt; her göç kendi klasöründe migration.sql ve snapshot.json taşır. Göç dosyaları spec dosya listesine değil iş paketine yazılır; klasör kuralı ve CI göç denetimi D12'nindir. Paralel paketler birleşmeden önce ana dala yeniden dayanır; araya göç girdiyse paket kendi klasörünü silip drizzle-kit generate ile yeniden üretir (A1).")} },`);

// ---------- self-checks ----------
s = repLine(s, 'for (const r of spec.resolved_gaps) seen[r.gap]', 'for (const r of spec.resolved_gaps) if (/^D02-B\\d\\d$/.test(r.gap)) seen[r.gap] = (seen[r.gap] || 0) + 1;');
s = insAfter(s, "for (const id of Object.keys(seen)) if (!gapIds.includes(id))", [
  '// open points the architect closed are recorded as resolved entries with the decision ids; none of them may stay open',
  "const kapanan = spec.resolved_gaps.filter(r => /^D02-A\\d\\d$/.test(r.gap));",
  "for (const r of spec.resolved_gaps) if (!/^D02-[AB]\\d\\d$/.test(r.gap)) errs.push('karar kimliği biçimi ' + r.gap);",
  "for (const r of kapanan) { if (spec.open_points.some(o => o.id === r.gap)) errs.push('kapanan açık nokta hâlâ açık ' + r.gap); if (!/Mimar kararı I\\d{3}/.test(r.why)) errs.push('kapanan açık noktada mimar kararı yok ' + r.gap); }",
  "if (new Set(kapanan.map(r => r.gap)).size !== kapanan.length) errs.push('aynı açık nokta iki kez kapandı');",
  "for (const o of spec.open_points) if (o.needs_owner !== true) errs.push('mimarın karar verdiği açık nokta kalmamalı: ' + o.id);",
]);
s = repLine(s, 'spec.open_points.forEach((o, i) => { const want', "spec.open_points.forEach((o, i) => { if (!/^D02-A\\d\\d$/.test(o.id)) errs.push('açık nokta kimliği biçimi ' + o.id); if (i && o.id <= spec.open_points[i - 1].id) errs.push(`açık nokta kimlikleri artan sırada değil: ${o.id}`); });");
s = repLine(s, '// open point ids sequential', '// open point ids unique and increasing; a closed id is never reused (checked above)');
s = insAfter(s, "for (const w of ['KVKK', 'sponsor'])", [
  '// export names: one plain identifier each, no duplicates (spec-validate.js asks the same)',
  "for (const n of exportNames) if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(n)) errs.push('dış yüz adı tek tanımlayıcı olmalı: ' + n);",
  "if (new Set(exportNames).size !== exportNames.length) errs.push('tekrar eden dış yüz adı');",
  '// migrations: same folder rule as contracts.json (A1)',
  "const gocKlasoru = mod.migration_dir.split(' (')[0];",
  "if (!spec.invariants.some(x => x.includes(gocKlasoru))) errs.push('göç klasörü contracts.json ile aynı değil: değişmezlerde ' + gocKlasoru + ' yok');",
  "if (spec.migrations.glob !== 'apps/server/migrations/??????????????_dersler_*') errs.push('göç globu ' + spec.migrations.glob);",
  "if (spec.files.some(f => f.startsWith('apps/server/migrations/'))) errs.push('göç dosyası spec dosya listesinde');",
  '// names the architect retired must not come back (closed entries may name them to say what was removed)',
  "const ESKI = ['surumleDamgala', 'onceki_sahip_kisi_idleri', 'oncekiSahipKisiIdleri', 'yoneticiKapsami', 'YoneticiKapsami', 'incelemeHesaplari', 'denemeDersi(', 'derslerKur', 'kimlikOlayiDinleyicisiKaydet', 'beklenenDuzenlemeNo', 'PROGRESS 5', 'bu işleri bekler', 'sahipAtamaSurumu', 'oturumlar_ders_id_tarih_uq', 'oturumlar_ders_id_bitis_ani_idx', 'oturumlar_durum_id_ck', 'oturum_subeleri_oturum_id_ck', 'dersler_donem_id_ck', '/v1/devam/dersler/{dersId}/oranlar', 'ekme modeli', 'UTC zaman>', 'iki kaynağı', 'D02-A12', 'D02-A13', 'D02-A14', 'D02-A15', 'D02-A16', 'D02-A17', 'D02-A18', 'DERSLER_DERS_BULUNAMADI', 'DERSLER_SUBE_BULUNAMADI', 'DERSLER_OTURUM_BULUNAMADI', 'DERSLER_BIRIM_BULUNAMADI', 'DERSLER_BOLUM_BULUNAMADI', 'DERSLER_DONEM_BULUNAMADI', 'DERSLER_TAKVIM_BULUNAMADI'];",
  "const acikGovde = JSON.stringify({ ...spec, resolved_gaps: spec.resolved_gaps.filter(r => !/^D02-A/.test(r.gap)) }) + JSON.stringify(P4.hata_katalogu);",
  "for (const t of ESKI) if (acikGovde.includes(t)) errs.push('emekli ad ya da kimlik kaldı: ' + t);",
]);

// ---------- section rows ----------
s = repLine(s, "P(row('Çağırdığı dış yüzler'", `P(row('Çağırdığı dış yüzler', esc(${J("D01 yalnız modules/kimlik/yaprak.ts'ten: kisiGetir, personelRolleri, yetkiDenetle, hesapSilindiMi; D06 surumDamgasiIste ve surumAl (modules/esitleme/yaprak.ts), indirmeKaynagiKaydet; D08 devamHesaplaIsiKoy (modules/devam/yaprak.ts) ve DEVAM_NEDENLERI (packages/contracts/src/devam.ts); D09 denetimeYaz (modules/duzeltmeler/yaprak.ts); D12 islem, kisitAdi, tabloYardimcilari, donemBolumuAc, testVeritabaniHazirla, veritabani_degismez_sutun (SQL işlevi); D13 rotalariKaydet, uygulamaHatasi, hizSinifi, ortak Kimlik tipi ve beklenenSurumNoSemasi; D14 isGonder, isTanimla. D03, D04, D05, D07, D10 ve D11 içe aktarılmaz. modules/dersler/yaprak.ts hiçbir index.ts'i ve başka alan modülünün hiçbir dosyasını içe aktarmaz; yalnız kendi tablolar.ts'ini, packages/contracts, packages/core ve D12'nin işlem tipini (import type) kullanır (ortak kural Yaprak dosyası, A2).")})));`);
s = repLine(s, "P(row('Ona kaydolanlar'", `P(row('Ona kaydolanlar', esc(${J("D04 pencereleriHesapla ((tx, olay) => pencereleriHesapla(tx, olay.oturumlar) uyarlayıcısıyla oturumUretimDinleyicisiKaydet), D07 dogrulama.karar_kapanisi (sira 10) ve D10 raporlar.gun_sonu_anligi (sira 20) kilit adımları (kilitAdimiKaydet), D03 liste kaynağı (listeKaynagiKaydet, yalnız etkinSatirlar). D02 kendi eklentisinde D06'ya beş genel kaynak ve personel kapsam kaynağı olarak kaydolur; D01'in kimlik olaylarını derslerKimlikDinleyicisi ile alır, aboneyi bileşim kökü D01.kimlikDinleyicileriniKur ile kurar (I050). Eklentiler app.ts uygulamaKur ile api ve isci süreçlerinde kurulduğundan kayıtlar iki süreçte aynıdır.")})));`);
s = repLine(s, "P(row('Kod yeri'", [
  `P(row('Kod yeri', esc(${J("apps/server/src/modules/dersler/ (index.ts derslerEklentisi'ni, seçenek tipini ve dış yüzü verir; dersGetir, dersYetkisi, subeGetir, dersSubeleri, birimGetir ve kilitliBirimDonemleri ile öbür salt okuma işlevleri yaprak.ts içinde, D01 bunları oradan alır; kuyruk tanımları kuyruklar.ts, kapsam kaynağı kapsam.ts, derslerKimlikDinleyicisi dinleyiciler.ts), jobs/dersler/ (export const isler), packages/core/src/dersler/ (saf üretim planı ve takvim kuralları), packages/contracts/src/dersler.ts (şemalar, rota listesi, DERSLER_ hata kodları, OTURUM_TURLERI ve öbür değer sabitleri, OturumUretimOlayi, DERSLER_DENETIM_OLAYLARI). Dosya döngüsü yok: dersler/tablolar.ts D01'in tablo tanımını içe aktarmaz, kisiler yabancı anahtarları yalnız göç SQL'inde kurulur ve şema testi denetler; D02 D01'i yalnız kimlik/yaprak.ts'ten içe aktarır (dependency-cruiser no-circular ve yaprak kuralı, X24).")})));`,
  `P(row('Göç', lnk(${J("contracts.json migration_dir ile aynı: apps/server/migrations/<14 haneli UTC>_dersler_<açıklama>/ klasörleri (migration.sql ve snapshot.json); dosya haritasında apps/server/migrations/??????????????_dersler_* globu bu modülündür. Göç yalnız D02 tablolarına dokunur, yalnız ileri ve önce genişlet sonra daralt; göç dosyaları spec dosya listesine değil iş paketine yazılır; klasör kuralı ve CI göç denetimi D12'nindir. Paralel paketler birleşmeden önce ana dala yeniden dayanır; araya göç girdiyse paket kendi klasörünü silip drizzle-kit generate ile yeniden üretir (A1).")})));`,
].join('\n'));
s = rep(s, "bileşim kökünün (app.ts, worker.ts) verdiği saat arayüzünden gelir", "bileşim kökünün eklenti seçeneğiyle verdiği saat arayüzünden gelir (app.ts uygulamaKur, api ve isci süreçleri)");
s = rep(s, 'Deneme işi her çalışmada dersler.deneme log satırı (kuruldu, sahip değişti, eklenen oturum) ya da dersler.deneme.hoca_yok uyarısı yazar.', 'Deneme işi her çalışmada dersler.deneme log satırı (eklenen oturum) ya da dersler.deneme.ders_yok uyarısı, denemeDersiniKur dersler.deneme.kurulum log satırı (kuruldu, devredildi ya da degismedi) yazar.');

// tables, endpoints, jobs paragraphs
s = rep(s, 'surum taşır (DEFAULT 0, işlemin tek sürümüyle damgalanır)', 'surum taşır (DEFAULT 0, D06.surumDamgasiIste ile işlemin tek sürümüyle damgalanır)');
s = rep(s, 'Her kısıt, dizin ve tetikleyici adı kisitAdi(tablo, sütunlar, tür) ile (D12-B01; 63 baytı aşanlar kisitAdi çağrısı olarak yazıldı)', 'Her kısıt, dizin ve tetikleyici adı kisitAdi(tablo, sütunlar, tür, ek?) ile: <tablo>_<sütunlar>_<ek>_<tür>, sütunsuz adda <tablo>_<ek>_<tür> (D12-B01, I063; ör. oturumlar_ders_id_tarih_deneme_uq, oturumlar_degismez_tg, oturumlar_onaysiz_idx)');
s = rep(s, "başka hocanın kaynağı 404. Hata zarfı, oturum kancası, 401, 403, doğrulama 400, 413 ve 429 D13\\'ün.", "başka hocanın kaynağı 404 DERSLER_BULUNAMADI (kaynak düzeyi ret tek kod). Hata zarfı, oturum kancası, 401, rota düzeyi rol reddi (403 API_ROL_YETKISIZ), doğrulama 400, 413 ve 429 D13\\'ün; D02 rotaları yalnız D13.rotalariKaydet ile ekler, setErrorHandler ve setNotFoundHandler kullanmaz.");
s = rep(s, 'Oluşturan uçlar yeni kayıtta da tekrarda da 200 döner (D13-B12).', 'POST /v1/dersler yeni derste 201, tekrarda 200 döner (rota beyanı durumlar [201, 200]); öbür oluşturan uçlar yeni kayıtta da tekrarda da 200 döner (D13-B12). Beklenen numara ortak beklenenSurumNoSemasi alanı beklenenSurumNo ile gelir (D13).');
s = rep(s, 'kimlik ve rol (D13), inceleme hesabı (403 DERSLER_INCELEME_HESABI), kaynak yetkisi (404),', 'kimlik ve rol (D13; 401, 403 API_ROL_YETKISIZ), inceleme hesabı (403 DERSLER_INCELEME_HESABI), kaynak yetkisi (404 DERSLER_BULUNAMADI),');
s = rep(s, 'tanımlar export const isler dizisinde D14.isTanimla ile, worker.ts toplar.', 'tanımlar export const isler dizisinde D14.isTanimla ile, worker.ts toplar; KuyrukTanimi nesneleri modules/dersler/kuyruklar.ts içinde; her iş için D14 adımı "aynı veriyle iki kez çalışırsa" ile senaryo vardır (I074).');
s = rep(s, '(donem_kilidi 00:05, deneme_dersi_oturumlari 00:35, takvim gece onarımı 01:55)', '(donem_kilidi 00:05, deneme_dersi_oturumlari 00:35 ve yayın adımında bir kez, takvim gece onarımı 01:55)');

// generation rule block
s = repLine(s, "'   oturum_degisiklikleri, dinleyiciler (D04; satır yazar, surumAl çağırmaz, damgasını surumleDamgala ile bırakır),',", [
  "  '   oturum_degisiklikleri (degisiklik_ani = olay.an), D02 damgası (D06.surumDamgasiIste),',",
  "  '   dinleyiciler (D04; satır yazar, surumAl çağırmaz, damgasını D06.surumDamgasiIste ile bırakır),',",
].join('\n'));
s = repLine(s, "'   denetim (D09), D08 işi (DEVAM_NEDENLERI.PROGRAM), en son tek surumAl (D06): D02 satırları ve dinleyici damgaları aynı sürümle',", "  '   denetim (D09), D08 işi (DEVAM_NEDENLERI.PROGRAM), en son tek D06.surumAl: bütün damgalar aynı sürümle',");

// download sources
s = rep(s, "personel kapsamı D02\\'nin KapsamKaynagi(PERSONEL):", "personel kapsamı D02\\'nin KapsamKaynagi(PERSONEL) (D02 yalnız bunu kaydeder, I094):");
s = rep(s, 'kişinin sahip ya da önceki sahip olduğu bir dersin', 'kişinin sahip ya da sahiplik_gecmisi içinde önceki sahip olduğu bir dersin');

// exports table
s = repLine(s, 'P(`<details><summary>Dış yüz (${spec.exports.length} işlev)', [
  "const sozlesmeAdlari = new Set(mod.exports.map(x => x.split('(')[0].trim()));",
  'const nSozlesme = spec.exports.filter(x => sozlesmeAdlari.has(x.name)).length;',
  "P(`<details><summary>Dış yüz (${spec.exports.length} öğe): contracts.json listesindeki ${nSozlesme} işlev ve eklenti; ek ${spec.exports.length - nSozlesme} öğe (seçenek ve olay tipi, değer sabitleri, denetim olayı haritası, iş tanımları)</summary>`);",
].join('\n'));

// audit events table
s = repLine(s, 'P(`<details><summary>${P4.denetim_olaylari.length} denetim olay türü', "P(`<details><summary>${P4.denetim_olaylari.length} denetim olay türü (D09.denetimeYaz; şemalar packages/contracts/src/dersler.ts'teki DERSLER_DENETIM_OLAYLARI haritasında, bileşim kökü D09.denetimOlaylariniKaydet ile kaydeder; dersId taşıyan her olay zarfta birimId de taşır; alan adları D09'un yasak adlarıyla çakışmaz, her olay 8 KB altında; I045)</summary>`);");
s = repLine(s, "P(th(['Tür', 'Önceki', 'Sonraki', 'Ayrıntı']));", "P(th(['Tür', 'Zarf', 'Önceki', 'Sonraki', 'Ayrıntı']));");
s = repLine(s, 'for (const x of P4.denetim_olaylari) P(tr(', 'for (const x of P4.denetim_olaylari) P(tr([code(x.tur), esc(x.zarf), esc(x.onceki), esc(x.sonraki), esc(x.ayrinti)]));');

// error code paragraph
s = rep(s, 'Başka hocanın kaynağı varlığı sızdırmamak için 404 döner; 403 yalnız ilke düzeyi red (inceleme hesabı);', "Kaynak düzeyi ret ve yokluk varlığı sızdırmamak için tek kodla 404 DERSLER_BULUNAMADI döner; rota düzeyi rol reddi D13\\'ün 403 API_ROL_YETKISIZ kodudur; DERSLER_ önekli 403 yalnız ilke düzeyi red (inceleme hesabı);");

// clarified and open points
s = repLine(s, 'P(`<p>${esc(`Envanterdeki ${INV.gaps.length} boşluğun', "P(`<p>${esc(`Envanterdeki ${INV.gaps.length} boşluğun ${spec.resolved_gaps.filter(r => /^D02-B/.test(r.gap)).length} tanesi burada kararla kapandı, ${INV.gaps.filter(g => g.needs_owner).length} tanesi ürün kararı istediği için açık noktada önerilen varsayılanla bekliyor; ${kapanan.length} sözleşme ve komşu eki (eski açık noktalar) mimarın kararıyla kapandı ve aynı tabloda karar kimliğiyle yazılı (align/decisions.json); ${INV.contradictions.length} çelişki çözüldü.`)}</p>`);");
s = repLine(s, 'P(`<details><summary>${spec.resolved_gaps.length} boşluk kararı: karar ve nedeni</summary>`);', "P(`<details><summary>${spec.resolved_gaps.length} karar (boşluk ve kapanan açık nokta): karar ve nedeni</summary>`);");
s = repLine(s, "P(th(['Boşluk', 'Karar', 'Neden']));", "P(th(['Boşluk ya da açık nokta', 'Karar', 'Neden']));");
s = repLine(s, 'P(`<div class="callout warn"><p>${esc(', "P(`<div class=\"callout warn\"><p>${esc(`${spec.open_points.length} soru sahibin kararını bekliyor; sunucu öneriyle kurulur, karar değişirse yalnız varsayılan ya da kural değişir. Mimarın karar verdiği açık nokta kalmadı.`)}</p><ul>`);");

// the section may not bring retired names back either (closed entries' rows excepted)
s = insAfter(s, "if (/[–—]/.test(html)) {", [
  "{ let govde = html; for (const r of kapanan) govde = govde.split(tr([code(r.gap), lnk(r.decision), lnk(r.why)])).join('');",
  "  const kalan = ESKI.filter(t => govde.includes(esc(t)) || govde.includes(t)); if (kalan.length) { console.log('bölümde emekli ad ya da kimlik: ' + kalan.join(', ')); process.exit(1); } }",
  "{ const gocSatiri = (html.match(/<div class=\"k\">Göç<\\/div><div>(.*?)<\\/div><\\/div>/) || [])[1] || ''; if (!gocSatiri.includes(esc(gocKlasoru))) { console.log('bölümde göç klasörü contracts.json ile aynı değil: ' + gocKlasoru); process.exit(1); } }",
]);

save('build.js', s);
console.log('build tamam');
