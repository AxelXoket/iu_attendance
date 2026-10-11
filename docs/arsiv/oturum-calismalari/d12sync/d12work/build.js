// Builds spec/D12.json and frag/D12.html from spec-data.js. Deterministic: same data, same bytes.
'use strict';
const fs = require('fs');
const path = require('path');
const D = require('./spec-data.js');

const B = path.resolve(__dirname, '..');
fs.mkdirSync(path.join(B, 'spec'), { recursive: true });
fs.mkdirSync(path.join(B, 'frag'), { recursive: true });

// ---------- spec JSON ----------
const spec = {
  id: 'D12',
  module: 'veritabani',
  summary: D.summary,
  tables: D.tables,
  endpoints: D.endpoints,
  jobs: D.jobs.map(j => ({ name: j.name, schedule: j.schedule, idempotency: j.idempotency, does: j.does })),
  state_machines: D.state_machines,
  invariants: D.invariants,
  exports: D.exportsList,
  contracts_file: D.contractsFile,
  files: D.files,
  migrations: D.migrations,
  tests: D.tests,
  resolved_gaps: D.resolved_gaps,
  contradictions_resolved: D.contradictions_resolved,
  open_points: D.open_points,
  requests: D.requests,
  alignment: D.alignment,
};
fs.writeFileSync(path.join(B, 'spec', 'D12.json'), JSON.stringify(spec, null, 2) + '\n', 'utf8');

// ---------- fragment ----------
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const code = s => `<code>${esc(s)}</code>`;
const link = (href, text) => `<a href="${href}">${esc(text)}</a>`;
const row = (k, v) => `    <div class="row"><div class="k">${esc(k)}</div><div>${v}</div></div>`;
const table = (head, rows) => [
  '    <div style="overflow-x:auto"><table>',
  '      <tr>' + head.map(h => `<th>${esc(h)}</th>`).join('') + '</tr>',
  ...rows.map(r => '      <tr>' + r.map(c => `<td>${c}</td>`).join('') + '</tr>'),
  '    </table></div>',
].join('\n');
const details = (summary, inner) => `  <details>\n    <summary>${esc(summary)}</summary>\n${inner}\n  </details>`;

const h = [];
h.push('<section id="veritabani">');
h.push(`  <h2>Veritabanı ve veri yaşam döngüsü <span class="tag mute">D12</span></h2>`);
h.push(`  <p>${esc(D.summary)}</p>`);

// Amaç ve sınırlar
h.push('  <h3>Amaç ve sınırlar</h3>');
h.push('  <div class="rows">');
h.push(row('Sahip olduğu', `Üç tablo (${code('__drizzle_migrations')}, ${code('geri_yukleme_kayitlari')}, ${code('saklama_islemleri')}), bir uç (${code('GET /v1/veritabani/yonetim/geri-yuklemeler')}), sekiz iş. PostgreSQL kabı ve imajı, ayar dosyaları, roller, şemalar, kurulum adımı, tek göç klasörünün kuralı ve CI denetimi, havuz ve ${code('islem')}, nesil, yedek, geri yükleme, saklama mekanizması, test veritabanı ve sıfırlama.`));
h.push(row('Sahip olmadığı', `Alan tabloları ve onların göç içeriği: ${code('apps/server/migrations/')} altındaki her ${code('<14 haneli UTC>_<belirteç>_<açıklama>/')} alt klasörünün içeriği belirtecin modülünündür, klasör kuralı ve CI denetimi D12'nindir (dosya haritasında her modülün kendi ${code('apps/server/migrations/??????????????_<belirteç>_*')} globu var, ör. ${code('_api_')} D13, ${code('_is_kuyrugu_')} D14; D12'ninki ${code('_veritabani_')}). ${code('compose.yaml')}, ${code('apps/server/package.json')} ve ${code('/health/ready')} (D15); ${code('worker.ts')} ve pgboss şeması ile yetkileri (D14); giriş oturumları ve hesap silme akışı (D01); saklama süresinin kendisi (İÜ'nün cevabı).`));
h.push(row('Konuşma yolu', `${code('infra/veritabani')} ve ${code('jobs/veritabani')} hiçbir modülü içe aktarmaz. Modüller dış yüzünü çağırır ve saklama işleyicisini ona kaydeder; bağlantı ayarlarını, saati ve D04'ün İstanbul yardımcılarını bileşim kökleri verir; iş tanımlarını ${code('worker.ts')} D14'ün ${code('isTanimla')}'sından geçirir. Tek istisna bileşim kökü ${code('cli/geri-yukleme')}: D01'in ${code('kimlikDinleyicileriniKur')}'unu dört aboneyle (D02, D06, D11, D15) kurup ${code('kimlikDinleyicileriHazir')}'ı çağırır, sonra geri yüklemeden sonraki iptaller için ${code('hesabiSil')} ve ${code('oturumlariKapat')}; contracts.json reads_from'da yalnız D01 yazılıdır, dört abone işlevini bileşim kökü olarak içe aktarır (A2). ${code('geriYuklemePencereleri')}'ni D11'e ${code('app.ts')} eklenti seçeneğiyle verir. Uç rotası sözleşme dosyasından D13'ün rota tablosuna girer, eklentiyi ${code('app.ts')} öneksiz kaydeder. Makine işlerinin sonucu D15'e durum dosyasıyla gider.`));
h.push(row('Dayandığı kararlar', [
  link('teknik.html#veritabani', 'Veritabanı'), link('teknik.html#veritabani-donem-alani', 'Dönem alanı ve bağlantı havuzu'),
  link('teknik.html#veritabani-yedek', 'Yedek'), link('teknik.html#sunucu-mimari', 'Veritabanı erişimi ve göç akışı'),
  link('teknik.html#kod-veri-modeli', 'Veri modeli ve nesil'), link('teknik.html#testler-veritabani-sifirlama', 'Veritabanı sıfırlama'),
  link('teknik.html#altyapi-imaj', 'İmaj ve göç servisi'), link('plan.html#kararlar-hesap-silme', 'Hesap silme'),
  link('plan.html#gun-kenar-durumlar', 'Yedekten dönüş'), link('plan.html#teknoloji-olceklenme-yolu', 'Ölçeklenme yolu'),
].join(', ') + '.'));
h.push('  </div>');
h.push(details(`Dış yüz: ${D.exportsList.length} giriş, adları contracts.json ile aynı`,
  table(['Ad', 'İmza', 'Not'], D.exportsList.map(e => [code(e.name), code(e.signature), esc(e.note)]))));
h.push(details(`Sözleşme dosyası: ${D.contractsFile.path} (dış yüz girişi değil)`,
  `    <p>${code(D.contractsFile.signature)}</p>\n    <p>${esc(D.contractsFile.note)}</p>`));
h.push(details(`Dosyalar: ${D.files.length} dosya, hepsi D12'nin klasörlerinde`,
  '    <ul>\n' + D.files.map(f => `      <li>${code(f)}</li>`).join('\n') + '\n    </ul>'));
h.push(details(`Göç klasörleri: ${D.migrations.length} klasör, iş paketine yazılır, dosya listesinde yok`,
  table(['Klasör', 'Dosyalar', 'İçerik'], D.migrations.map(m => [code(m.klasor), m.dosyalar.map(code).join(', '), esc(m.icerik)]))));

// Tablolar
h.push('  <h3>Tablolar</h3>');
h.push(`  <p>Üçü de alan tablosu değildir. Göç defteri drizzle şemasında, öbür ikisi uygulama şemasındadır; ikisi de ${code('TABLO_ISARETLERI')}'nde ${code('yalniz_ekleme')} işaretlidir ve hiç silinmez.</p>`);
for (const t of D.tables) {
  const inner = [
    `    <p>${esc(t.purpose)}</p>`,
    table(['Sütun', 'Tip', 'Boş olabilir', 'Varsayılan', 'Not'], t.columns.map(c => [code(c.name), code(c.type), c.null ? 'evet' : 'hayır', c.default ? code(c.default) : '', esc(c.note)])),
    '    <p>Dizinler:</p>',
    '    <ul>\n' + t.indexes.map(x => `      <li>${esc(x)}</li>`).join('\n') + '\n    </ul>',
    '    <p>Kısıtlar ve yetkiler:</p>',
    '    <ul>\n' + t.constraints.map(x => `      <li>${esc(x)}</li>`).join('\n') + '\n    </ul>',
  ].join('\n');
  const one = { '__drizzle_migrations': `__drizzle_migrations: Drizzle'ın göç defteri, D12 yalnız okur`, 'geri_yukleme_kayitlari': 'geri_yukleme_kayitlari: her gerçek dönüşün yöntemi, kayıp penceresi ve nesli', 'saklama_islemleri': 'saklama_islemleri: saklama süresi işinin silinmeyen kanıtı' }[t.name];
  h.push(details(one, inner));
}

// Uç noktalar
const e = D.endpoints[0];
h.push('  <h3>Uç noktalar</h3>');
h.push('  <div class="rows">');
h.push(row(`${e.method} ${e.path}`, `İstemci ${esc(e.client)}. ${esc(e.auth)}`));
h.push(row('İstek', Object.entries(e.request).map(([k, v]) => `${code(k)}: ${esc(v)}`).join('<br>')));
h.push(row('Tekrar ve sınır', `${esc(e.idempotency)} ${esc(e.rate_limit)}`));
h.push(row('Hatalar', e.errors.map(x => esc(x)).join('; ') + '.'));
h.push('  </div>');
h.push(details('Cevap: yeniden eskiye geri yüklemeler ve sonraki sayfanın imleci',
  table(['Alan', 'Tip'], Object.entries(e.response).map(([k, v]) => [code(k), esc(v)]))));

// İşler
h.push('  <h3>İşler</h3>');
h.push(`  <p>Saatler Europe/Istanbul. İki iş pg-boss'ta, işçide çalışır ve D14 çizelgesindeki yerindedir (05:00 ve 06:25); D14-B05 günlük pg-boss işinin 03:00 ile 05:00 arasında başlamasını yasaklar, modüllerin temizlik işleri de bu kurala ve çizelgedeki yerlerine uyar. Altısı makine işidir: ana makinedeki systemd zamanlayıcısıyla (OnCalendar saat dilimini açıkça taşır, hepsi Persistent=true), geri yüklemeyle ortak tek kilitte sırayla, API ve işçi düşmüşken de çalışır ve sonucunu ${code('/var/lib/iu-yoklama/durum/veritabani/<iş adı>.json')} dosyasına yazar (şema ${code('YedekIsDurumu')}: son çalışma, son sonuç, son başarı, ardışık atlanan, hata kodu); dizin işçiye ${code('/durum/veritabani')} olarak salt okunur bağlanır, D15 okur ve uyarır. Makine işlerinin saatleri D12'nindir ve D14 çizelgesine aynen geçer.</p>`);
h.push(table(['İş', 'Nerede', 'Ne zaman'], D.jobs.map(j => [code(j.name), esc(j.yer), esc(j.zaman)])));
h.push(details('Her işin ne yaptığı, tekrar kuralı ve zamanlaması',
  table(['İş', 'Ne yapar', 'Tekrar', 'Zamanlama'], D.jobs.map(j => [code(j.name), esc(j.does), esc(j.idempotency), esc(j.schedule)]))));

// Durumlar ve kurallar
h.push('  <h3>Durumlar ve kurallar</h3>');
h.push('  <div class="rows">');
h.push(row('PostgreSQL kabı', `PostgreSQL 18.6, kendi imajı ${code('iu-attendance-postgres:18.6-pgbackrest2.59.3')} (${link('teknik.html#veritabani-yedek', 'Yedek')}). Servis tanımları D12'nin Compose parçasında: ${code('docker/postgres/compose.yaml')}; D15'in ${code('compose.yaml')} dosyası onu ${code('include')} ile bir kez alır, API, işçi, göç servisi ve xprem ${code('veritabani')} ağına katılır; göç servisinin adresi sabittir (${code('172.30.12.20')}), öbür kaplar ${code('ip_range 172.30.12.128/25')}'ten adres alır. Üretimde PostgreSQL makineye kapı yayımlamaz; geliştirmede ${code('compose.gelistirme.yaml')} ${code('127.0.0.1:5432')}'yi yayımlar, geliştirme pg_hba'sını bağlar ve ${code('archive_mode=off')} verir. Sağlık denetimi TCP'den (${code('pg_isready -h 127.0.0.1')}). Veri birimi ${code('/var/lib/postgresql')} yoluna bağlanır, adı ${code('IU_POSTGRES_BIRIMI')} değişkeninden gelir (döküm dönüşü yeni birim açar). initdb builtin C.UTF-8 (${link('teknik.html#veritabani-donem-alani', 'Zaman ve sıralama')}).`));
h.push(row('Şemalar ve roller', `Şemalar ${code('uygulama')}, ${code('drizzle')}, ${code('pgboss')}. Rolleri, veritabanlarını, eklentiyi ve uygulama şemasının varsayılan yetkilerini kurulum adımı açar; pgboss'ta yalnız şema USAGE verir, tablo yetkileri D14'ün kur adımındadır. Kurulum parolayı istemcide hesaplanan SCRAM doğrulayıcısıyla, ${code('pg_stat_statements.track_utility')} kapalı oturumda ve yalnız saklı doğrulayıcı tutmuyorsa yazar. Parolalar Compose sırrıyla yalnız gereken servise (${link('teknik.html#sunucu-ayarlar', 'Ayarlar')}). Ayrıntı aşağıdaki tabloda.`));
h.push(row('Ad ve sütun kuralları', `Bağlayıcı ad kuralı; kısıt, dizin ve tetikleyici adını yalnız ${code('kisitAdi')} verir (NOT NULL kısıtları hariç). Kimlik ${code('uuid')} ve ${code('uuidv7()')}, an ${code('timestamptz(3)')} ve ${code('_ani')} sonekli, gün ${code('date')}, saat ${code('time')}; durum metin ve ${code('durumKisiti')} ile adlı CHECK; etiket ayrı evet/hayır sütunu; ON CONFLICT her zaman hedefli (${link('teknik.html#sunucu-mimari', 'Veritabanı erişimi')}, ${link('teknik.html#veritabani', 'Kısıtlar')}). Yaşam sütunları ${code('silinme_ani')}, ${code('pasif_ani')}, ${code('arsiv_ani')}; kısmi dizin koşulu IS NULL. Tablo işaretleri sözleşme dosyasındaki ${code('TABLO_ISARETLERI')} listesinde: ${code('istemci_kimligi')}, ${code('yalniz_ekleme')}, ${code('donem_bolunebilir')}, ${code('tekil_satir')}, ${code('dizinsiz_kabul')}; şema testi listeyi katalogla iki yönde karşılaştırır.`));
h.push(row('Zaman', `Sunucu ve roller UTC; an milisaniye hassasiyetli ve değeri saat arayüzünden gelir, kural için SQL ${code('now()')} yok; gün ve saat metin okunur; İstanbul gün sınırı SQL'de açık ${code("AT TIME ZONE 'Europe/Istanbul'")} ile; Türkçe sıralama yalnız sorguda ve dizinsiz (${link('teknik.html#testler-veritabani-sifirlama', 'Saat ve sahteler')}).`));
h.push(row('İşlem ve hata', `Her sorgu ${code('islem')} içinden geçer; varsayılan READ COMMITTED, tutarlı çok deyimli okuma için ${code("yalitim: 'repeatable_read'")}; dış yüz tx alır (${link('teknik.html#sunucu-mimari', 'Mimari')}). Danışma kilitleri yalnız ${code('danismaKilidi')} (bekler) ve ${code('danismaKilidiDene')} (beklemez) ile, beş katmanlı tek genel sırayla: önce katman (${code('DANISMA_KATMANLARI')}), sonra anahtar metni; yeni her anahtar işlemin tuttuklarından sonra gelir, sırada geride kalan yalnız denenir, tutulanı yeniden istemek işlemsizdir; anahtar başına kip dışlayıcı ya da paylaşımlı. Sıra: danışma anahtarları, satırlar, iş kuyruğu ve öğrenci sürümü, en son genel sayaç (D06'nın ${code('surumAl')}'ı, bir kez). ${code('islemSonuKancasi')} kancaları fn'den sonra, COMMIT'ten önce çalışır, fırlatırsa işlem geri alınır (D06'nın sürüm damgası denetimi). Kilitlenmede tek yeniden deneme son güvencedir. Havuz beklemesi API'de 2 saniye, işçide 30 saniye. Geçici hatalar ${code('GECICI_SQLSTATELER')} ile D12'nin beş 503 koduna çevrilir (bekleme 15 ile 45 saniye, rotaya örtük eklenir); ${code('zamanAsimiMs')} en çok 15000 ve ağır rotada D13'ün kalan işleyici bütçesiyle küçülür; öteki hata yalnız SQLSTATE, kısıt ve tablo taşır; PostgreSQL logu ERROR iletisi yazmaz, terse ve parametresizdir (${link('teknik.html#sunucu-ayarlar', 'Loglar')}).`));
h.push(row('Göç akışı', `Tek klasör ${code('apps/server/migrations/')} (drizzle-kit klasör biçimi, ortak dergi dosyası yok). Her modül yalnız ${code('<14 haneli UTC (YYYYMMDDHHMMSS)>_<belirteç>_<açıklama>/')} klasörlerini açar; belirteç ${code('GOC_BELIRTECLERI')}'nden, klasörde ${code('migration.sql')}, ${code('snapshot.json')} ve gerekirse ${code('oncesi-concurrently.sql')}. Göç dosyaları spec dosya listesinde değil iş paketindedir. Paralel çalışma: aynı aşamadaki paketler tablo paylaşmaz; paket birleşmeden önce ana dala yeniden dayanır, dallandığı noktadan sonra ana dala göç klasörü girdiyse kendi klasörünü silip ${code('drizzle-kit generate')} ile yeniden üretir; birleştirme kuyruğu paketleri tek tek alır. ${code('db:migrate')} sırası: D12'nin ${code('veritabani:goc')} adımı (kurulum, hedefi var olan CONCURRENTLY dizinler ve geçerlilik denetimi, Drizzle göçleri), pg-boss migrate, en son ${code('worker.ts')}'in kur adımı (D14); göç servisi, geliştirme ve test koordinatörü aynı betiği çalıştırır (${link('teknik.html#altyapi-imaj', 'İmaj ve kapanış')}). CI denetimi ${code('veritabani:goc-denetimi')}, her kural kendi koduyla: klasör adı deseni ve belirteç (en uzun eşleşme, ör. ${code('is_kuyrugu')}; ${code('VERITABANI_GOC_AD')}); zaman damgası ana daldaki en yeni klasörden büyük (${code('VERITABANI_GOC_SIRA')}); ${code('migration.sql')}'de dokunulan tablo, dizin, kısıt ve işlev belirtecin modülüne ait (${code('VERITABANI_GOC_SAHIPLIK')}); ana dalda ${code('drizzle-kit generate')} fark üretmez (${code('VERITABANI_GOC_URETIM_FARKI')}); ${code('drizzle-kit check')} temiz (${code('VERITABANI_GOC_ZINCIR')}). Ayrıca ana dala girmiş klasörün değişmemesi, Squawk, deyim düzeyinde satır yazma yakalama, zaman aşımı ayarı ve ${code('surum-denetimi.sh')}. Sahiplik ${code('goc/tablo-haritasi.ts')}'ten okunur (contracts.json canonical_tables'tan: tablo, sahip modül, belirteç); dizin ${code('indrelid')}, kısıt ${code('conrelid')} ile tablosuna atanır, ${code('tgisinternal')} tetikleyiciler sayılmaz, işlev sahibi ad önekinden okunur. Tek istisna D15'in görünümleridir: isletim göçü yalnız ${code('olcum_')} önekli görünüm açar ya da değiştirir, görünüm başka tabloları yalnız okur (${code('pg_depend')}) ve okuduğu sütunları ekleyen göçlerden sonra zamanlanır (boş veritabanına bütün göçlerin uygulanması bunu dener). CONCURRENTLY adımı ${code('db:migrate')} içindedir, yayın betiği ayrıca çağırmaz.`));
h.push(row('Nesil', `${code('nesilOku')}: ${code('system_identifier')} ve ${code('timeline_id')}; zaman çizelgesi WAL dosya adıyla çapraz denetlenir (${link('teknik.html#kod-veri-modeli', 'Veri modeli')}, ${link('plan.html#kararlar-indirme', 'İndirme')}). Geri yüklemede nesil değişmeden trafik açılmaz.`));
h.push(row('Saklama', `Veri sınıfları ${code('SAKLAMA_VERI_SINIFLARI')} kataloğunda (${code('<belirteç>.<sınıf>')}, sahip, başlangıç, ${code('oncesinde')}, ${code('kopyaKaynagi')}); sıranın tek kaynağı katalogdur: esitleme, dogrulama ve projeksiyon yoklamadan önce; devam ve duzeltmeler yoklama ve listelerden önce; raporlar listelerden önce; saat, yoklama, listeler ve ${code('kimlik.kisi_bagi')} bağımsız; modül kaydında sıra ya da ${code('oncekiSiniflar')} yoktur. Süre kuralı: başvuran sınıfın süresi başvurduğu sınıfınkinden uzun olamaz, numara ya da ad kopyası taşıyan devam ve raporlar sınıflarınınki ${code('listeler.donem_verisi')} süresinden uzun olamaz (süresiz en uzun sayılır); iş açılışta denetler, ihlalde hiçbir sınıfa dokunmadan ${code('VERITABANI_SAKLAMA_SURE_SIRASI')} ile düşer. Modül kendi sınıfını ${code('saklamaIsleyicisiKaydet')} ile kaydeder, satırı kendi kodu ayrı ${code('yoklama_saklama')} girişiyle siler ya da anonimleştirir, D12 kanıtı aynı işlemde yazar. İşleyici INSERT, iş kuyruğu ve denetim yazmaz; modüller işleyicilerini bugün ${code('saklamaIsleyicisiniCalistir')} ile dener. Süreler ${code('saklama/sureler.ts')}'te ve bugün boş: hiçbir şey silinmez (${link('plan.html#acik-saklama-suresi', 'Saklama süresi')}, ${link('plan.html#kararlar-hesap-silme', 'Hesap silme')}). Hesap silme bir saklama sınıfı değildir, D01'in kimlik olayıyla yürür.`));
h.push(row('Yedek', `pgBackRest ile PITR (zamana göre 21 gün), restic ile gecelik döküm ve xprem birimi (34 günlük takvim kesimi); silinen veri yedeklerden en geç 35 günde çıkar. Depolar sunucu dışında, yurt içinde, şifreli (${link('teknik.html#veritabani-yedek', 'Yedek')}, ${link('plan.html#teknoloji-sunucu-yeri', 'Sunucu yeri')}); parolalar çevrimdışı yedeklenir (${link('teknik.html#dagitim-ayrinti-korunacak-anahtarlar', 'Korunacak anahtarlar')}, ${link('teknik.html#dagitim-ayrinti-guncelleme-sunucusu', 'xprem birimi')}). Compose dosya sırlarında uid ve mode yok sayıldığından sır dosyaları makinede 0400 izinli durur, pgBackRest sırrı kap içindeki postgres kullanıcısına (uid 999) aittir. Stanza'yı ${code('pgbackrest.sh kur')} açar.`));
h.push(row('Geri yükleme', `Yalnız işletmecinin SSH ile başlattığı ${code('docker/postgres/yedek/geri-yukle.sh')}; makine işlerinin kilidini akış boyunca tutar. Adımlar aşağıdaki durum makinesinde, kılavuz ${code('docker/postgres/geri-yukleme-kilavuzu.md')}: nesil doğrulama, göç, kayıt, iptallerin yeniden uygulanması (bütün panel oturumları kapanır), stanza, sonra trafik. Telefonlar kuyruklarını yeniden gönderir, program ve listeler baştan iner (${link('plan.html#gun-kenar-durumlar', 'Kenar durumlar')}).`));
h.push(row('Test veritabanı', `${code('postgres-test')}: aynı imaj, tmpfs, kendi ağı (${code('172.30.13.0/24')}) ve ${code('pg_hba.test.conf')}; üretimdeki ortam değişkenleri, sırlar ve sağlık denetimi; fsync, synchronous_commit, full_page_writes ve archive_mode kapalı; ${code('127.0.0.1:5433')} (${link('teknik.html#testler-veritabani-sifirlama', 'Veritabanı sıfırlama')}). Koordinatörde ${code('testVeritabaniHazirla')}, her senaryodan önce ${code('senaryoOncesiSifirla')} (pgboss şemasına dokunmaz, kuyruğu D15'in kancası D14'ün ${code('isKuyrugunuBosalt')}'ıyla boşaltır); geliştirme ve test sırlarını ${code('gelistirme-gizli-uret.sh')} üretir; test havuzları Cucumber işçisi başına API 5, işçi 3, saklama 1, sahip 2.`));
h.push('  </div>');

h.push(details('Roller ve yetkiler: beş giriş rolü ve süper kullanıcı', table(['Rol', 'Giriş', 'Kim kullanır', 'Yetki ve ayar'], [
  [code('postgres'), 'yerel soket (peer); ağdan yalnız göç servisinin sabit adresinden (172.30.12.20/32) postgres ve yoklama veritabanlarına, scram-sha-256', 'kurulum adımı, pgBackRest, gece dökümü, geri yükleme betiği', 'süper kullanıcı'],
  [code('yoklama_goc'), 'ağ, scram-sha-256', 'göç servisi, test sıfırlaması, veri kurucular, cli/geri-yukleme', 'bütün nesnelerin sahibi; DDL; SECURITY DEFINER işlevlerin sahibi'],
  [code('yoklama_api'), 'ağ, scram-sha-256', 'API kopyaları, yonetici-ekle', 'uygulama: SELECT, INSERT, UPDATE, DELETE, dizilerde USAGE ve SELECT (yalnız ekleme tablolarında DELETE ve tablo düzeyinde UPDATE yok); drizzle: SELECT; pgboss: yalnız şema USAGE, tablo yetkisi D14 kur; nesil işlevleri EXECUTE; statement_timeout 5 s, lock_timeout 2 s, boşta işlem 30 s; havuz beklemesi 2 s'],
  [code('yoklama_isci'), 'ağ, scram-sha-256', 'işçi', 'API ile aynı; ayrıca pg_monitor üyesi (kalıcı, D15\'in ölçüleri); yoklama_saklama üyeliği yok; statement_timeout 5 dk, lock_timeout 30 s, boşta işlem 5 dk; havuz beklemesi 30 s'],
  [code('yoklama_saklama'), 'ağ, scram-sha-256; parolası yalnız işçide ve göç servisinde', 'yalnız saklama_suresi_isi, işçide ayrı bağlantı (havuz 1)', 'uygulama: USAGE, SELECT, UPDATE, DELETE; saklama_islemleri: INSERT; başka INSERT ve pgboss yetkisi yok; hiçbir rol üyesi değil; bölüm kaldırma işlevinde EXECUTE; süreler işçiyle aynı'],
  [code('xprem'), 'ağ, scram-sha-256', 'xprem', 'yalnız xprem veritabanının sahibi'],
])));
h.push(details('Bağlantı bütçesi: 64 bağlantı, sınır 80, max_connections 100', table(['Bileşen', 'Bağlantı'], [
  ['API kopyası, 2 kopya ve kopya başına 20', '40'], ['İşçi (pg-boss 2 + Drizzle 3, Drizzle\'ın 2\'si devam_hesapla partileri; D14-B10)', '5'], ['Saklama bağlantısı (yoklama_saklama)', '1'], ['xprem', '10'], ['Göç servisi', '2'], ['pgBackRest', '2'], ['Gece dökümü', '1'], ['Süper kullanıcıya ayrılan', '3'], ['Toplam (üçüncü API kopyasına yer var)', '64'],
])));
const yaml = `# docker/postgres/compose.yaml (D12). D15'in compose.yaml dosyası: include: [docker/postgres/compose.yaml]
# Geliştirme ayrıca compose.gelistirme.yaml ekler: 127.0.0.1:5432, pg_hba.gelistirme.conf, archive_mode=off.
x-postgres-ortak: &ortak
  build: .
  image: iu-attendance-postgres:18.6-pgbackrest2.59.3
  environment:
    POSTGRES_PASSWORD_FILE: /run/secrets/postgres_parolasi
    POSTGRES_INITDB_ARGS: --locale-provider=builtin --builtin-locale=C.UTF-8 --locale=C.UTF-8 --encoding=UTF8
  secrets: [postgres_parolasi]
  shm_size: 256mb
  # geçici sunucu yalnız sokete açılır; TCP'den yanıt gerçek sunucuyu gösterir
  healthcheck: { test: [CMD, pg_isready, -h, 127.0.0.1, -p, "5432"], interval: 5s, retries: 24 }
services:
  postgres:                    # profilsiz; üretimde kapı yayımlamaz
    <<: *ortak
    command: [postgres, -c, config_file=/etc/postgresql/postgresql.conf]
    volumes:
      - veri:/var/lib/postgresql
      - ./postgresql.conf:/etc/postgresql/postgresql.conf:ro
      - ./pg_hba.conf:/etc/postgresql/pg_hba.conf:ro
      - ./pgbackrest.conf:/etc/pgbackrest/pgbackrest.conf:ro
    secrets:
      - postgres_parolasi
      - { source: pgbackrest_gizli, target: /etc/pgbackrest/conf.d/gizli.conf }
    restart: unless-stopped
    networks: [veritabani]
  postgres-test:
    <<: *ortak
    profiles: [test]
    command: [postgres, -c, config_file=/etc/postgresql/postgresql.conf,
              -c, hba_file=/etc/postgresql/pg_hba.test.conf, -c, fsync=off,
              -c, synchronous_commit=off, -c, full_page_writes=off, -c, archive_mode=off,
              -c, shared_buffers=512MB, -c, logging_collector=on]
    volumes:
      - { type: tmpfs, target: /var/lib/postgresql, tmpfs: { size: 2147483648 } }
      - ./postgresql.conf:/etc/postgresql/postgresql.conf:ro
      - ./pg_hba.test.conf:/etc/postgresql/pg_hba.test.conf:ro
    ports: ["127.0.0.1:5433:5432"]
    networks: [veritabani-test]
  yedek:                       # tek seferlik: docker compose --profile yedek run --rm yedek ...
    profiles: [yedek]
    image: restic/restic:0.19.1
    secrets: [restic_gizli]
volumes:
  veri: { name: "\${IU_POSTGRES_BIRIMI:-iu-yoklama-postgres-veri}" }
networks:
  veritabani:                  # goc: ipv4_address 172.30.12.20 (D15 compose.yaml)
    ipam: { config: [{ subnet: 172.30.12.0/24, ip_range: 172.30.12.128/25 }] }
  veritabani-test:
    ipam: { config: [{ subnet: 172.30.13.0/24 }] }
secrets:                       # dosyalar \${IU_GIZLI_DIZIN} altında: postgres, yoklama_goc, yoklama_api,
                               # yoklama_isci, yoklama_saklama, xprem parolaları; pgbackrest_gizli; restic_gizli
                               # (geliştirme ve test için gelistirme-gizli-uret.sh üretir)`;
h.push(details('Compose parçasının iskeleti: postgres, postgres-test ve yedek servisleri', `    <pre><code>${esc(yaml)}</code></pre>`));

h.push(details(`Durum makineleri: göç adımı, saklama sınıfı, geri yükleme, hazırlık, yedek işi`,
  D.state_machines.map(m => [
    `    <p><strong>${esc(m.name)}</strong>. Durumlar: ${m.states.map(code).join(', ')}.</p>`,
    table(['Nereden', 'Nereye', 'Kim', 'Ne zaman'], m.transitions.map(t => [code(t.from), code(t.to), esc(t.by), esc(t.when)])),
  ].join('\n')).join('\n')));
h.push(details(`Değişmezler: ${D.invariants.length} kural, her biri bir testle korunur`,
  '    <ol>\n' + D.invariants.map(x => `      <li>${esc(x)}</li>`).join('\n') + '\n    </ol>'));

// Hata kodları
h.push('  <h3>Hata kodları</h3>');
h.push(`  <p>D12'nin bütün kodları ${code('packages/contracts/src/veritabani.ts')} içinde tek ${code("hataKodlariTanimla('veritabani', ...)")} kataloğundadır ve ${code('TUM_HATALAR')}'a girer. İstemciye görünen altı kod var: ${code('VERITABANI_IMLEC_GECERSIZ')} (400, rota beyan eder) ve ${code('islem')}'in geçici veritabanı hatalarını ${code('GECICI_SQLSTATELER')}'den (${code('packages/contracts/src/ortak/hata.ts')}) okunan türle çevirdiği beş 503 kodu; bunlar bekleme ${code('{ aralik: [15, 45] }')} taşır, D13'ün ${code('ortukKodlar')}'ı her rotaya ekler, rotalar yazmaz; Retry-After ve zarf D13'ündür. SQLSTATE, kısıt ve tablo hatanın ${code('cause')} alanında yalnız log içindir. İşletim, CI ve test kodları http null ve metinsizdir, hiçbir rotanın hatalar listesine giremez; çıkış kodu, log ve durum dosyasında görünür.</p>`);
h.push(details(`${D.errorCodes.length} satır: ${D.errorCodes.filter(r => /^(400|503)/.test(r[1]) && !/\(D13\)/.test(r[0])).length} D12 kodu istemciye görünür, ${D.errorCodes.filter(r => /\(D13\)/.test(r[0])).length} satır D13'ün kodu, kalanı http null işletim, CI ve test kodu`,
  table(['Kod', 'HTTP ya da yer', 'Ne zaman'], D.errorCodes.map(([k, s, w]) => [code(k), esc(s), esc(w)]))));

// Testler
h.push('  <h3>Testler</h3>');
h.push(`  <p>Davranış senaryoları ${code('apps/server/test/features/veritabani/')} altında gerçek ${code('postgres-test')} veritabanında koşar; saf kurallar (kisitAdi, nesil kararı, danışma anahtarı sırası, saklama sırası, süre sırası ve ay kırpma, SCRAM doğrulayıcısı, göç klasörü adı ayrıştırıcısı) Vitest ve fast-check ile. Sabitler (GECICI_SQLSTATELER, GOC_BELIRTECLERI, DANISMA_KATMANLARI, SAKLAMA_VERI_SINIFLARI) testte içe aktarılır, yeniden yazılmaz. Yokluk iddia eden her test bir yer kontrolüyle önce varlığı gösterir.</p>`);
h.push(details(`${D.tests.length} test: şema, yetki, göç ve CI göç denetimi, işlem, danışma kilidi, işlem sonu kancası, nesil, saklama, uç, sıfırlama, yedek, yük ve mutasyon`,
  table(['Test', 'Tür', 'Ne denetler'], D.tests.map(t => [esc(t.name), code(t.kind), esc(t.asserts)]))));

// Netleştirilenler
h.push('  <h3>Netleştirilenler</h3>');
h.push(`  <p>Envanterdeki ${D.resolved_gaps.length} boşluğun ve ${D.contradictions_resolved.length} çelişkinin her biri ya bir kararla ya da bir açık noktayla kapandı; ürün kararı gerektirenler aşağıdaki açık noktalara bağlıdır.</p>`);
h.push(details(`Boşluklar: D12-B01 ile D12-B35 arası, karar ve gerekçe`,
  table(['Boşluk', 'Karar', 'Neden'], D.resolved_gaps.map(g => [code(g.gap), esc(g.decision), esc(g.why)]))));
h.push(details(`Çelişkiler: D12-C01 ile D12-C05 arası, nasıl çözüldü`,
  table(['Çelişki', 'Çözüm'], D.contradictions_resolved.map(c => [code(c.id), esc(c.resolution)]))));
h.push(details(`Mimar kararları: ${D.alignment.length} karar öbeği bu bölüme işlendi`,
  table(['Karar', 'Nasıl işlendi'], D.alignment.map(a => [a.refs.map(code).join(', '), esc(a.outcome)]))));

// Başka modüllerden istekler
h.push('  <h3>Başka modüllerden istekler</h3>');
h.push(`  <p>D12'nin kararlarının komşu modüllerde ve contracts.json'da gerektirdiği değişiklikler; her biri yalnız ekleme ya da yeniden adlandırmadır, sahibi yapar. Hepsi mimarın hizalama kararıyla sonuçlandı (karar sütunu).</p>`);
h.push(table(['Kime', 'İstek', 'Karar'], D.requests.map(r => [esc(r.modul), esc(r.istek), `${code(r.karar)} ${esc(r.sonuc)}`])));

// Açık noktalar
h.push('  <h3>Açık noktalar</h3>');
h.push('  <div class="callout warn">');
h.push('    <ul>');
for (const o of D.open_points) h.push(`      <li><strong>${esc(o.id)}</strong> <span class="tag ${o.needs_owner ? 'warn' : 'mute'}">${o.needs_owner ? 'sahip' : 'modüller'}</span> ${esc(o.question)} Öneri: ${esc(o.recommendation)}</li>`);
h.push('    </ul>');
h.push('  </div>');
h.push('</section>');

fs.writeFileSync(path.join(B, 'frag', 'D12.html'), h.join('\n') + '\n', 'utf8');
console.log('wrote spec/D12.json and frag/D12.html');
