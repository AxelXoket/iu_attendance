// One-off: updates d12work/build.js for the alignment (spec fields and section text). Exact-match asserted.
'use strict';
const fs = require('fs');
const F = process.argv[2];
let s = fs.readFileSync(F, 'utf8');
const rep = (old, neu, w) => { const n = s.split(old).length - 1; if (n !== 1) throw new Error(w + ': ' + n); s = s.replace(old, () => neu); };

// spec JSON fields
rep(`  exports: D.exportsList,
  files: D.files,`, `  exports: D.exportsList,
  contracts_file: D.contractsFile,
  files: D.files,
  migrations: D.migrations,`, 'spec fields');
rep(`  requests: D.requests,
};`, `  requests: D.requests,
  alignment: D.alignment,
};`, 'spec alignment');

// Sahip olmadığı
rep("klasör kuralı ve CI denetimi D12'nindir (dosya haritasına belirteç başına ${code('apps/server/migrations/??????????????_<belirteç>_*')} globu istenir, ör. ${code('_api_')} için D13).",
  "klasör kuralı ve CI denetimi D12'nindir (dosya haritasında her modülün kendi ${code('apps/server/migrations/??????????????_<belirteç>_*')} globu var, ör. ${code('_api_')} D13, ${code('_is_kuyrugu_')} D14; D12'ninki ${code('_veritabani_')}).", 'sahip olmadigi');
rep("Tek istisna giriş noktası ${code('cli/geri-yukleme')}: bileşim kökü gibi D01'in ${code('index.ts')}'ini içe aktarır (geri yüklemeden sonra iptaller).",
  "Tek istisna bileşim kökü ${code('cli/geri-yukleme')}: D01'in ${code('kimlikDinleyicileriniKur')}'unu dört aboneyle (D02, D06, D11, D15) kurup ${code('kimlikDinleyicileriHazir')}'ı çağırır, sonra geri yüklemeden sonraki iptaller için ${code('hesabiSil')} ve ${code('oturumlariKapat')}; contracts.json'da okuduğu tek modül D01'dir. ${code('geriYuklemePencereleri')}'ni D11'e ${code('app.ts')} eklenti seçeneğiyle verir.", 'konusma yolu');

// Dış yüz, sözleşme dosyası, göç klasörleri
rep("h.push(details(`Dış yüz: contracts'taki altı giriş, Islem tipi, ek girişler ve sözleşme dosyası`,\n  table(['Ad', 'İmza', 'Amaç'], D.exportsList.map(e => [esc(e.name), code(e.signature), esc(e.purpose)]))));",
  "h.push(details(`Dış yüz: ${D.exportsList.length} giriş, adları contracts.json ile aynı`,\n  table(['Ad', 'İmza', 'Not'], D.exportsList.map(e => [code(e.name), code(e.signature), esc(e.note)]))));\nh.push(details(`Sözleşme dosyası: ${D.contractsFile.path} (dış yüz girişi değil)`,\n  `    <p>${code(D.contractsFile.signature)}</p>\\n    <p>${esc(D.contractsFile.note)}</p>`));", 'dis yuz');
rep("  '    <ul>\\n' + D.files.map(f => `      <li>${code(f)}</li>`).join('\\n') + '\\n    </ul>'));",
  "  '    <ul>\\n' + D.files.map(f => `      <li>${code(f)}</li>`).join('\\n') + '\\n    </ul>'));\nh.push(details(`Göç klasörleri: ${D.migrations.length} klasör, iş paketine yazılır, dosya listesinde yok`,\n  table(['Klasör', 'Dosyalar', 'İçerik'], D.migrations.map(m => [code(m.klasor), m.dosyalar.map(code).join(', '), esc(m.icerik)]))));", 'goc klasorleri');

// İşler paragrafı
rep("${code('/var/lib/iu-yoklama/durum/veritabani/<iş>.json')} dosyasına yazar (şema ${code('YedekIsDurumu')}, D15 okur ve uyarır).",
  "${code('/var/lib/iu-yoklama/durum/veritabani/<iş adı>.json')} dosyasına yazar (şema ${code('YedekIsDurumu')}: son çalışma, son sonuç, son başarı, ardışık atlanan, hata kodu); dizin işçiye ${code('/durum/veritabani')} olarak salt okunur bağlanır, D15 okur ve uyarır.", 'isler');

// İşlem ve hata
rep("h.push(row('İşlem ve hata', `Her sorgu ${code('islem')} içinden geçer; varsayılan READ COMMITTED, tutarlı çok deyimli okuma için ${code(\"yalitim: 'repeatable_read'\")}; sayaç kurallarında işlem başına tek ${code('danismaKilidi')} çağrısı, ilk yazımdan önce; kilit sırası danışma anahtarları, satırlar, en sonda D06'nın sürüm sayacı; kilitlenmede tek yeniden deneme; dış yüz tx alır (${link('teknik.html#sunucu-mimari', 'Mimari')}). Havuz beklemesi API'de 2 saniye, işçide 30 saniye. Geçici hatalar ortak ${code('UygulamaHatasi')} ile D13'ün 503 kodlarına çevrilir; öteki hata yalnız SQLSTATE, kısıt ve tablo taşır; PostgreSQL logu ERROR iletisi yazmaz, terse ve parametresizdir (${link('teknik.html#sunucu-ayarlar', 'Loglar')}).`));",
  "h.push(row('İşlem ve hata', `Her sorgu ${code('islem')} içinden geçer; varsayılan READ COMMITTED, tutarlı çok deyimli okuma için ${code(\"yalitim: 'repeatable_read'\")}; dış yüz tx alır (${link('teknik.html#sunucu-mimari', 'Mimari')}). Danışma kilitleri yalnız ${code('danismaKilidi')} (bekler) ve ${code('danismaKilidiDene')} (beklemez) ile, beş katmanlı tek genel sırayla: önce katman (${code('DANISMA_KATMANLARI')}), sonra anahtar metni; yeni her anahtar işlemin tuttuklarından sonra gelir, sırada geride kalan yalnız denenir, tutulanı yeniden istemek işlemsizdir; anahtar başına kip dışlayıcı ya da paylaşımlı. Sıra: danışma anahtarları, satırlar, iş kuyruğu ve öğrenci sürümü, en son genel sayaç (D06'nın ${code('surumAl')}'ı, bir kez). ${code('islemSonuKancasi')} kancaları fn'den sonra, COMMIT'ten önce çalışır, fırlatırsa işlem geri alınır (D06'nın sürüm damgası denetimi). Kilitlenmede tek yeniden deneme son güvencedir. Havuz beklemesi API'de 2 saniye, işçide 30 saniye. Geçici hatalar ${code('GECICI_SQLSTATELER')} ile D12'nin beş 503 koduna çevrilir (bekleme 15 ile 45 saniye, rotaya örtük eklenir); ${code('zamanAsimiMs')} en çok 15000 ve ağır rotada D13'ün kalan işleyici bütçesiyle küçülür; öteki hata yalnız SQLSTATE, kısıt ve tablo taşır; PostgreSQL logu ERROR iletisi yazmaz, terse ve parametresizdir (${link('teknik.html#sunucu-ayarlar', 'Loglar')}).`));", 'islem ve hata');

// Göç akışı
rep("h.push(row('Göç akışı', `Tek klasör ${code('apps/server/migrations/')}; her göç ${code('<UTC zaman>_<belirteç>_<açıklama>/')} altında ${code('migration.sql')}, ${code('snapshot.json')} ve gerekirse ${code('oncesi-concurrently.sql')}. ${code('db:migrate')}: önce D12'nin ${code('veritabani:goc')} adımı (kurulum, hedefi var olan CONCURRENTLY dizinler ve geçerlilik denetimi, Drizzle göçleri), sonra D14'ün pg-boss migrate ve kuyruk adımı; göç servisi, geliştirme ve test koordinatörü aynı betiği çalıştırır (${link('teknik.html#altyapi-imaj', 'İmaj ve kapanış')}). CI denetimi ${code('veritabani:goc-denetimi')}: ad ve belirteç (${code('GOC_BELIRTECLERI')}'nden en uzun eşleşme, ör. ${code('is_kuyrugu')}), zaman sırası, ana dala girmiş klasörün değişmemesi, yeniden üretme farkı, Squawk, katalog farkıyla sahiplik, deyim düzeyinde satır yazma yakalama, zaman aşımı ayarı; ayrıca ${code('surum-denetimi.sh')}. Sahiplik ${code('goc/tablo-haritasi.ts')}'ten okunur (tasarımdaki canonical_tables'tan: tablo, sahip modül, belirteç); kısıt ${code('conrelid')} ile tablosuna atanır, ${code('tgisinternal')} tetikleyiciler sayılmaz, işlev sahibi ad önekinden okunur; isletim göçü yalnız ${code('olcum_')} önekli görünüm açar ya da değiştirir, görünüm başka tabloları yalnız okur (${code('pg_depend')}) ve okuduğu sütunları ekleyen göçlerden sonra zamanlanır (boş veritabanına bütün göçlerin uygulanması bunu dener). CONCURRENTLY adımı ${code('db:migrate')} içindedir, yayın betiği ayrıca çağırmaz.`));",
  "h.push(row('Göç akışı', `Tek klasör ${code('apps/server/migrations/')} (drizzle-kit klasör biçimi, ortak dergi dosyası yok). Her modül yalnız ${code('<14 haneli UTC (YYYYMMDDHHMMSS)>_<belirteç>_<açıklama>/')} klasörlerini açar; belirteç ${code('GOC_BELIRTECLERI')}'nden, klasörde ${code('migration.sql')}, ${code('snapshot.json')} ve gerekirse ${code('oncesi-concurrently.sql')}. Göç dosyaları spec dosya listesinde değil iş paketindedir. Paralel çalışma: aynı aşamadaki paketler tablo paylaşmaz; paket birleşmeden önce ana dala yeniden dayanır, dallandığı noktadan sonra ana dala göç klasörü girdiyse kendi klasörünü silip ${code('drizzle-kit generate')} ile yeniden üretir; birleştirme kuyruğu paketleri tek tek alır. ${code('db:migrate')} sırası: D12'nin ${code('veritabani:goc')} adımı (kurulum, hedefi var olan CONCURRENTLY dizinler ve geçerlilik denetimi, Drizzle göçleri), pg-boss migrate, en son ${code('worker.ts')}'in kur adımı (D14); göç servisi, geliştirme ve test koordinatörü aynı betiği çalıştırır (${link('teknik.html#altyapi-imaj', 'İmaj ve kapanış')}). CI denetimi ${code('veritabani:goc-denetimi')}, her kural kendi koduyla: klasör adı deseni ve belirteç (en uzun eşleşme, ör. ${code('is_kuyrugu')}; ${code('VERITABANI_GOC_AD')}); zaman damgası ana daldaki en yeni klasörden büyük (${code('VERITABANI_GOC_SIRA')}); ${code('migration.sql')}'de dokunulan tablo, dizin, kısıt ve işlev belirtecin modülüne ait (${code('VERITABANI_GOC_SAHIPLIK')}); ana dalda ${code('drizzle-kit generate')} fark üretmez (${code('VERITABANI_GOC_URETIM_FARKI')}); ${code('drizzle-kit check')} temiz (${code('VERITABANI_GOC_ZINCIR')}). Ayrıca ana dala girmiş klasörün değişmemesi, Squawk, deyim düzeyinde satır yazma yakalama, zaman aşımı ayarı ve ${code('surum-denetimi.sh')}. Sahiplik ${code('goc/tablo-haritasi.ts')}'ten okunur (contracts.json canonical_tables'tan: tablo, sahip modül, belirteç); dizin ${code('indrelid')}, kısıt ${code('conrelid')} ile tablosuna atanır, ${code('tgisinternal')} tetikleyiciler sayılmaz, işlev sahibi ad önekinden okunur. Tek istisna D15'in görünümleridir: isletim göçü yalnız ${code('olcum_')} önekli görünüm açar ya da değiştirir, görünüm başka tabloları yalnız okur (${code('pg_depend')}) ve okuduğu sütunları ekleyen göçlerden sonra zamanlanır (boş veritabanına bütün göçlerin uygulanması bunu dener). CONCURRENTLY adımı ${code('db:migrate')} içindedir, yayın betiği ayrıca çağırmaz.`));", 'goc akisi');

// Saklama
rep("h.push(row('Saklama', `Veri sınıfları ${code('SAKLAMA_VERI_SINIFLARI')} kataloğunda (${code('<belirteç>.<sınıf>')}, sahip, başlangıç, ${code('oncesinde')}); modül kendi sınıfını",
  "h.push(row('Saklama', `Veri sınıfları ${code('SAKLAMA_VERI_SINIFLARI')} kataloğunda (${code('<belirteç>.<sınıf>')}, sahip, başlangıç, ${code('oncesinde')}, ${code('kopyaKaynagi')}); sıranın tek kaynağı katalogdur: esitleme, dogrulama ve projeksiyon yoklamadan önce; devam ve duzeltmeler yoklama ve listelerden önce; raporlar listelerden önce; saat, yoklama, listeler ve ${code('kimlik.kisi_bagi')} bağımsız; modül kaydında sıra ya da ${code('oncekiSiniflar')} yoktur. Süre kuralı: başvuran sınıfın süresi başvurduğu sınıfınkinden uzun olamaz, numara ya da ad kopyası taşıyan devam ve raporlar sınıflarınınki ${code('listeler.donem_verisi')} süresinden uzun olamaz (süresiz en uzun sayılır); iş açılışta denetler, ihlalde hiçbir sınıfa dokunmadan ${code('VERITABANI_SAKLAMA_SURE_SIRASI')} ile düşer. Modül kendi sınıfını", 'saklama');

// Test veritabanı
rep("her senaryodan önce ${code('senaryoOncesiSifirla')}; geliştirme",
  "her senaryodan önce ${code('senaryoOncesiSifirla')} (pgboss şemasına dokunmaz, kuyruğu D15'in kancası D14'ün ${code('isKuyrugunuBosalt')}'ıyla boşaltır); geliştirme", 'test db');

// Roller ve bütçe
rep("'API ile aynı; ayrıca pg_monitor; yoklama_saklama üyeliği yok;", "'API ile aynı; ayrıca pg_monitor üyesi (kalıcı, D15\\'in ölçüleri); yoklama_saklama üyeliği yok;", 'rol isci');
rep("['İşçi (pg-boss 2, Drizzle 3; D14-B10)', '5']", "['İşçi (pg-boss 2 + Drizzle 3, Drizzle\\'ın 2\\'si devam_hesapla partileri; D14-B10)', '5']", 'butce');

// Hata kodları
rep("h.push(`  <p>İstemciye görünen tek D12 kodu ${code('VERITABANI_IMLEC_GECERSIZ')}'dir: ${code('packages/contracts/src/veritabani.ts')} içinde ${code(\"hataKodlariTanimla('veritabani', ...)\")} ile HTTP durumu ve hoca, öğrenci metinleriyle tanımlanır, ${code('TUM_HATALAR')}'a yalnız o girer. Geçici veritabanı hatalarını ${code('islem')} ortak ${code('UygulamaHatasi')}'na (${code('packages/contracts/src/ortak/hata.ts')}) çevirir: D13'ün ${code('API_SUNUCU_YOGUN')} ve ${code('API_SORGU_ZAMAN_ASIMI')} kodları; Retry-After ve zarf D13'ündür. SQLSTATE, kısıt ve tablo hatanın ${code('cause')} alanında yalnız log içindir. İşletim, CI ve test kodları ayrı ${code('VERITABANI_ISLETIM_KODLARI')} sabitindedir, ${code('TUM_HATALAR')}'a hiç girmez; çıkış kodu, log ve durum dosyasında görünür.</p>`);",
  "h.push(`  <p>D12'nin bütün kodları ${code('packages/contracts/src/veritabani.ts')} içinde tek ${code(\"hataKodlariTanimla('veritabani', ...)\")} kataloğundadır ve ${code('TUM_HATALAR')}'a girer. İstemciye görünen altı kod var: ${code('VERITABANI_IMLEC_GECERSIZ')} (400, rota beyan eder) ve ${code('islem')}'in geçici veritabanı hatalarını ${code('GECICI_SQLSTATELER')}'den (${code('packages/contracts/src/ortak/hata.ts')}) okunan türle çevirdiği beş 503 kodu; bunlar bekleme ${code('{ aralik: [15, 45] }')} taşır, D13'ün ${code('ortukKodlar')}'ı her rotaya ekler, rotalar yazmaz; Retry-After ve zarf D13'ündür. SQLSTATE, kısıt ve tablo hatanın ${code('cause')} alanında yalnız log içindir. İşletim, CI ve test kodları http null ve metinsizdir, hiçbir rotanın hatalar listesine giremez; çıkış kodu, log ve durum dosyasında görünür.</p>`);", 'hata paragraf');
rep("h.push(details(`${D.errorCodes.length} satır: bir D12 kodu istemciye görünür, ${D.errorCodes.filter(r => /\\(D13\\)/.test(r[0])).length} satır D13 koduna çevrilen durumlar, kalanı işletim, CI ve test kodu`,",
  "h.push(details(`${D.errorCodes.length} satır: ${D.errorCodes.filter(r => /^(400|503)/.test(r[1]) && !/\\(D13\\)/.test(r[0])).length} D12 kodu istemciye görünür, ${D.errorCodes.filter(r => /\\(D13\\)/.test(r[0])).length} satır D13'ün kodu, kalanı http null işletim, CI ve test kodu`,", 'hata baslik');

// Testler
rep("saf kurallar (kisitAdi, nesil kararı, saklama sırası ve ay kırpma, SCRAM doğrulayıcısı, göç denetimi ayrıştırıcısı) Vitest ve fast-check ile.",
  "saf kurallar (kisitAdi, nesil kararı, danışma anahtarı sırası, saklama sırası, süre sırası ve ay kırpma, SCRAM doğrulayıcısı, göç klasörü adı ayrıştırıcısı) Vitest ve fast-check ile. Sabitler (GECICI_SQLSTATELER, GOC_BELIRTECLERI, DANISMA_KATMANLARI, SAKLAMA_VERI_SINIFLARI) testte içe aktarılır, yeniden yazılmaz.", 'test paragraf');
rep("h.push(details(`${D.tests.length} test: şema, yetki, göç, işlem, nesil, saklama, uç, sıfırlama, yedek, yük ve mutasyon`,",
  "h.push(details(`${D.tests.length} test: şema, yetki, göç ve CI göç denetimi, işlem, danışma kilidi, işlem sonu kancası, nesil, saklama, uç, sıfırlama, yedek, yük ve mutasyon`,", 'test baslik');

// Mimar kararları (after Çelişkiler details)
rep("  table(['Çelişki', 'Çözüm'], D.contradictions_resolved.map(c => [code(c.id), esc(c.resolution)]))));",
  "  table(['Çelişki', 'Çözüm'], D.contradictions_resolved.map(c => [code(c.id), esc(c.resolution)]))));\nh.push(details(`Mimar kararları: ${D.alignment.length} karar öbeği bu bölüme işlendi`,\n  table(['Karar', 'Nasıl işlendi'], D.alignment.map(a => [a.refs.map(code).join(', '), esc(a.outcome)]))));", 'mimar');

// İstekler
rep("h.push(`  <p>D12'nin kararları komşu modüllerde ve contracts.json'da şu değişiklikleri gerektirir; her biri yalnız ekleme ya da yeniden adlandırmadır, sahibi yapar.</p>`);\nh.push(table(['Kime', 'İstek'], D.requests.map(r => [esc(r.modul), esc(r.istek)])));",
  "h.push(`  <p>D12'nin kararlarının komşu modüllerde ve contracts.json'da gerektirdiği değişiklikler; her biri yalnız ekleme ya da yeniden adlandırmadır, sahibi yapar. Hepsi mimarın hizalama kararıyla sonuçlandı (karar sütunu).</p>`);\nh.push(table(['Kime', 'İstek', 'Karar'], D.requests.map(r => [esc(r.modul), esc(r.istek), `${code(r.karar)} ${esc(r.sonuc)}`])));", 'istekler');

if (/[–—]/.test(s)) throw new Error('dash');
fs.writeFileSync(F, s, 'utf8');
console.log('build.js patched');
