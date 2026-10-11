'use strict';
// Compose, Caddy, load test, incident response, error codes, requests, off-map requests, process flow,
// file schemas, shared files, image, release workflows, neighbour columns of the olcum_ views.
const { rep, find, idx } = require('./lib.js');

module.exports = function p5(S) {
  // ---------- compose services ----------
  const C = S.compose_servisleri;
  const c = (s) => find(C, 'servis', s);
  rep(c('api-1, api-2'), 'ayrinti', 'depends_on goc tamamlandı ve postgres sağlıklı', 'depends_on goc tamamlandı ve postgres sağlıklı; sırlar matristeki gibi (eposta_ozeti ve smtp_parolasi koşulsuz, I077)');
  rep(c('isci'), 'ayrinti', 'sırlar matristeki gibi, inceleme_sabit_kodu yalnız varlığı için', 'sırlar matristeki gibi (yoklama_saklama_parolasi dahil, I061; eposta_ozeti ve smtp_parolasi koşulsuz, I077), inceleme_sabit_kodu yalnız varlığı için');
  const goc = c('goc');
  goc.ag = "veritabani (ipv4_address 172.30.12.20 sabit; D12'nin pg_hba postgres satırı yalnız bu adrese açık, ağın dinamik adresleri 172.30.12.128/25'ten; I061)";
  rep(goc, 'ayrinti', 'tek seferlik (restart no);', 'tek seferlik (restart no); TZ=UTC; sırlar postgres_parolasi, yoklama_sahip_parolasi, yoklama_api_parolasi, yoklama_isci_parolasi, yoklama_saklama_parolasi ve xprem_parolasi;');
  rep(goc, 'ayrinti', ' ve olcum-raporu da aynı servisle', ', olcum-raporu, olay ve anahtar-uret donem-arasi da aynı servisle');
  C.splice(idx(C, 'servis', 'mailpit') + 1, 0, { servis: 'compose.gelistirme.yaml', profil: 'dev', imaj: 'katman dosyası, servis eklemez', ag: 'D12 parçasındaki gibi', ayrinti: "Yalnız geliştirmede compose.yaml'ın üstüne eklenen katman: D12'nin docker/postgres/compose.gelistirme.yaml parçasını içerir (postgres 127.0.0.1:5432, archive_mode=off). Kök package.json dev betiği docker compose -f compose.yaml -f compose.gelistirme.yaml --profile dev up --wait ile açar; yayın paketine (/app/yayin/) girmez, sunucuya kopyalanmaz (I061)." });

  // ---------- caddy ----------
  const cy = find(S.caddy_yollari, 'yol', '/v1 ve /v1/*');
  rep(cy, 'not', 'lb_policy header X-Kurulum-Kimligi (yoksa rastgele);', 'lb_policy header X-Kurulum-Kimligi { fallback client_ip_hash }: kopya başlığın özetiyle, başlık yoksa (panel, girişten önce) istemci adresiyle seçilir (I069, D15-B42);');
  rep(cy, 'not', 'transport keepalive 60s,', "transport keepalive 60s (üst akışta boşta bağlantı süresi, API'nin 72 saniyelik keepAliveTimeout'undan kısa),");
  rep(cy, 'not', 'response_header_timeout 25s.', 'response_header_timeout 25s (I069).');
  rep(find(S.caddy_yollari, 'yol', 'genel'), 'hedef', 'request_body @genel_govde max_size 4MB (xprem yayın yolları hariç)', "request_body @genel_govde max_size 4MB (2 MiB'lık liste gövdesinden büyük, I069; xprem yayın yolları hariç)");

  // ---------- load test ----------
  const Y = S.yuk_testi;
  const pi = Y.profiller.findIndex((p) => p.startsWith('Ders çıkışı'));
  rep(Y.profiller, pi, "yüzde 30'u değişenler;", "yüzde 30'u değişenler (öğrenci indirmesinin D08 devam bölümü dahil, I038);");
  rep(Y.profiller, pi, 'Aşama 2 sunucu parçası yayındaysa (D11 senaryosu, ortak/kursu.ts): 500 kürsü tarayıcısı (tohum.ts D11 kurucusuyla eşleştirir)',
    "Aşama 2 sunucu parçası yayındaysa (projeksiyon senaryosu D15'in ortak/kursu.ts ve ders-cikisi.ts dosyalarında, I088): 500 kürsü tarayıcısı (tohum.ts D11'in apps/server/test/support/kurucular/projeksiyon.ts kurucusuyla eşleştirir)");
  const oi = Y.olcutler.findIndex((o) => o.startsWith('503 dışı 5xx'));
  rep(Y.olcutler, oi, '429: 0 (D13).', "429: 0 (D13); telefon başına istek hızı D13'ün HIZ_SINIFLARI değerlerinden içe aktarılır (I069).");

  // ---------- incident response ----------
  const O = S.olay_mudahalesi;
  rep(find(O, 'durum', 'Saat belgesi, QR ya da ulaşma makbuzu anahtarı sızdı'), 'adimlar',
    "Saat belgesi ve QR'da son adım D07.yenidenDegerlendir'i o kid ve şüphe anından işaret anına kadarki ulaşma aralığıyla çağırır, bu kayıtlar İncelemede'ye döner;",
    "Saat belgesi ve QR'da son adım D07.yenidenDegerlendir(tx, { belgeKid: { amac, kid } }, 'ANAHTAR_ELE_GECIRILDI') çağırır: o kid'li belgeyle çapa kurup şüphe anından işaret anına kadar ulaşan kayıtlar İncelemede'ye döner (I086);");
  find(O, 'durum', 'Hoca hesapları ele geçti şüphesi').adimlar =
    "olay oturumlari-kapat --tur personel (docker compose run --rm --no-deps goc node src/cli/olay.ts oturumlari-kapat --tur personel; giriş önce D01.kimlikDinleyicileriniKur'u dört aboneyle kurar, sonra D01.oturumlariKapat, her oturum için denetim kaydı; projeksiyon abonesi hocaların QR yuvalarını da iptal eder); hocalar e-posta koduyla yeniden girer.";

  // ---------- error codes (I069: ISLETIM_KAPANIYOR bekleme, process codes http null) ----------
  const H = S.hata_kodlari;
  rep(find(H, 'kod', 'ISLETIM_KAPANIYOR'), 'anlam', 'Süreç kapanıyor; Caddy kopyayı devreden çıkarır.', 'Süreç kapanıyor; Caddy kopyayı devreden çıkarır. bekleme { sabit: 5 }: Retry-After 5 (I069).');
  let n = 0;
  for (const h of H) if (h.http === 'süreç') { h.http = 'null (süreç)'; n++; }
  if (n !== 9) throw new Error('expected 9 process codes, got ' + n);

  // ---------- requests to other modules: all decided ----------
  const I = S.istekler;
  const ist = (m) => find(I, 'modul', m);
  const d13 = ist('D13');
  rep(d13, 'istek', "D06.ogeTuruKaydet, D01.kimlikOlayiDinleyicisiKaydet, D01'in hesapSilindiMi okuyucusu", "D06.ogeTuruKaydet, D01'in hesapSilindiMi okuyucusu");
  rep(d13, 'istek', 'app.ts kurucusu olcumYazici seçeneğini', 'app.ts kurucusu uygulamaKur olcumYazici seçeneğini');
  d13.sonuc = "Sonuçlandı, I081 (CHANGE): önerildiği gibi; yalnız kimlik olayı seçeneği kalktı, D15'in dinleyicisi uygulamaKur'daki kimlikDinleyicileriniKur çağrısına isletim abonesi olarak girer.";
  const d14 = ist('D14');
  rep(d14, 'istek', 'testte deleteAllJobs yardımcısı; çizelge güncellemesi (D15-A12).', 'testte deleteAllJobs yardımcısı; çizelge güncellemesi (ota_yayin_denetimi çizelgeden çıkar, haftalik_olcum_ozeti 07:10, sertifika_bitis_denetimi 06:35, gunluk_log_arsivi makinede 03:15).');
  d14.sonuc = 'Sonuçlandı, I082 (ACCEPT); test yardımcısının adı isKuyrugunuBosalt (pg-boss deleteAllJobs ile).';
  ist('D12').sonuc = "Sonuçlandı, I083 (ACCEPT): olcum_ görünüm göçleri <14 haneli UTC>_isletim_<açıklama> klasöründe ve başka tabloları okuyabilir (A1), YedekIsDurumu şeması ve dosya yolu, deneme geri yüklemesinin ayrı xprem anahtar dosyası ve OnCalendar'da Europe/Istanbul D12'de.";
  ist('D06').sonuc = 'Sonuçlandı, I084 (ACCEPT).';
  const d01 = ist('D01');
  rep(d01, 'istek', 'kimlikOlayiDinleyicisiKaydet ve oturumlariKapat dış yüzleri (D01-A14);', 'oturumlariKapat dış yüzü;');
  d01.sonuc = 'Sonuçlandı, I085 (CHANGE): okuyucu ve sabit kod varlığı kabul; olay bağlantısı kimlikOlayiDinleyicisiKaydet değil kimlikDinleyicileriniKur aboneliğidir (I050); görünümün okuduğu sütun adları değişmez.';
  const d07 = ist('D07');
  rep(d07, 'istek', "KID_BILINMIYOR için 'anahtar emekli' gerekçesi; iptal listesi", 'İptal listesi');
  rep(d07, 'istek', 've nedenlere anahtar_ele_gecirildi', 've nedenlere ANAHTAR_ELE_GECIRILDI');
  d07.sonuc = "Sonuçlandı, I086 (CHANGE): ayrıca istenen 'anahtar emekli' gerekçesi reddedildi (I080, D07-B19: belge çapa kurmaz, kayıt Saat doğrulanamadı yolundan gider); dogrulama.* türleri, YenidenSuzgec.belgeKid ve YenidenNeden ANAHTAR_ELE_GECIRILDI kabul; sütun adları değişmez.";
  ist('D09').sonuc = 'Sonuçlandı, I087 (ACCEPT).';
  ist('D11').sonuc = "Sonuçlandı, I088 (ACCEPT): kurucu apps/server/test/support/kurucular/projeksiyon.ts'te.";
  ist('D05').sonuc = 'Sonuçlandı, I089 (ACCEPT); telefon_saati sütunu telefon_ani adını alır (I065).';
  S.istekler = I.filter((r) => /^D\d\d$/.test(r.modul));
  if (S.istekler.length !== 9 || S.istekler.some((r) => !r.sonuc)) throw new Error('istekler not all decided');

  // ---------- off-map requests (I090, I091) ----------
  S.harita_disi_istekler = [
    { istemci: 'Telefon uygulaması', istek: "telefon_sayaci gövde kuralları: gün yalnız gunAtlanirMi true dönünce gönderilmez; atlanan günler olsa da haftada en az bir paket; çok oturumlu ekranda süre ekrandaki oturumlara eşit bölünür; ekran 60 saniye dokunmasız kalınca süre durur. Her uygulama yayınında eski sürüm istek örnekleri üretilip apps/server/test/features/isletim/ornekler/surumler/<sürüm>/ altına eklenir (D15-B32).", sozlesme: 'telefonSayaciGovdesiSemasi ve gunAtlanirMi (packages/contracts/src/isletim.ts)', sonuc: 'I090 (ACCEPT)' },
    { istemci: 'Panel', istek: "Ekran süreleri oturum ve ekran başına birikmiş toplamla, en çok 5 dakikada bir ve sayfa gizlenirken (visibilitychange) bir kez gönderilir; istemciKimligi tarayıcının ilk açılışta ürettiği UUIDv7'dir ve yerel depoda kalır.", sozlesme: 'ekranSureleriIstegi şeması (packages/contracts/src/isletim.ts)', sonuc: 'I091 (ACCEPT)' },
  ];

  // ---------- server.ts flow (I069, I077) ----------
  const P = S.surec_akisi;
  const p4i = P.findIndex((s) => s.startsWith('4.'));
  rep(P, p4i, "(D14), app.ts'ten önce.", "(D14), uygulamaKur'dan önce; saat D04'ün Saat nesnesidir, uyarlayıcı yok (I077).");
  const p5i = P.findIndex((s) => s.startsWith('5.'));
  P[p5i] = "5. app = uygulamaKur({ surec: 'api', ayarlar, log, veritabani, islem, saat, isKuyrugu, eposta, olcumYazici: true }) (D13 app.ts, dinleme açmaz): kimlik dinleyicilerini dört aboneyle ve bütün eklentileri, D15'inki dahil, kurar; app.ready(). Test dünyası aynı kurucuyu deneme seçenekleriyle çağırır (I069).";

  // ---------- state files ----------
  const D = S.dosya_semalari;
  const api = find(D, 'dosya', '<kopya>.json (/durum/api)');
  rep(api, 'bicim', '} }] (son 15 dakika) }', '}, logOlaylari: [{ olay, platform, amac, gerekce, sayi }] }] (son 15 dakika) }');
  rep(api, 'bicim', 'sağlık uçları ve /v1/durum sayılmaz', "sağlık uçları ve /v1/durum sayılmaz; logOlaylari logOlustur'un OLCULEN_LOG_OLAYLARI sayacından (I031)");
  rep(find(D, 'dosya', '<iş adı>.json (/durum/veritabani)'), 'bicim', "(D12'den istek)", "(D12 kabul etti, I083; atlandi sonucu sonBasariAni'yi taşır)");

  // ---------- shared single files ----------
  const K = S.paketler;
  const k = (start) => K.findIndex((s) => s.startsWith(start));
  rep(K, k('Kök package.json'), 'dev (docker compose --profile dev up --wait,', 'dev (docker compose -f compose.yaml -f compose.gelistirme.yaml --profile dev up --wait,');
  rep(K, k('Kök package.json'), 'ile sunucu, işçi ve panel)', 'ile sunucu, işçi ve panel; Node süreçleri --conditions=kaynak ile)');
  const as = k('apps/server/package.json');
  rep(K, as, "pg-boss 12.36.0 ve üstü, nodemailer, pg-boss'un kullandığı cron-parser (D14 isteği),", "pg-boss 12 (en az 12.36.0), nodemailer, pg-boss'un kullandığı cron-parser ve tlds (D14'ün bağlantı denetimindeki IANA listesi; dördü tam sabit, I077),");
  rep(K, as, '(D13); betikler:', "(D13); devDependencies'te dependency-cruiser tam sürüm (kuralları D13'ün sınır testinde, ayrı yapılandırma dosyası yok; I069); betikler:");
  rep(K, as, 'test:senaryo (TZ=UTC cucumber-js), test:birim (TZ=UTC vitest run).', 'test:senaryo (TZ=UTC NODE_OPTIONS=--conditions=kaynak cucumber-js), test:birim (TZ=UTC vitest run, Vitest çözücüsü aynı kaynak koşuluyla); geliştirme ve testte packages/contracts .ts kaynağından, imajda derlenmiş dist\'ten çözülür (I069).');
  const bi = k('biome.json');
  rep(K, bi, "noRestrictedImports: pg-boss ve nodemailer yalnız infra/is-kuyrugu ve infra/eposta'da (D14 isteği),", "noRestrictedImports: pg-boss ve nodemailer yalnız infra/is-kuyrugu ve infra/eposta'da (D14, I077),");
  K[bi] = K[bi] + " plugins: D12'nin apps/server/src/infra/veritabani/kurallar/*.grit GritQL eklentileri (elle danışma kilidi, ON CONFLICT hedefi, sql.raw değeri; liste dosya dosya yazılır, I061).";
  K.push(
    ".node-version: Node 26'nın tam sürümü; apps/server/Dockerfile'daki taban imaj etiketi ve apps/mobile/eas.json ile aynı (kalite kapısının Node sürümü denetimi üçünü karşılaştırır, teknik.html#temel).",
    '.gitignore: node_modules, dist, coverage ve Stryker raporları, .env (yalnız .env.example izlenir), .gizli/ (geliştirme sırları), yük üretecinin yerel özel anahtar dosyası; sır ve derleme çıktısı depoya girmez.',
    "compose.gelistirme.yaml: yalnız geliştirme katmanı (Durumlar ve kurallar, Compose servisleri); D12'nin docker/postgres/compose.gelistirme.yaml parçasını içerir, sunucuya kopyalanmaz (I061).");

  // ---------- image ----------
  const M = S.imaj;
  const m = (start) => M.findIndex((s) => s.startsWith(start));
  rep(M, m('derle aşaması'), "packages/core ve packages/contracts tsc ile JS'e (Node node_modules altında .ts çalıştırmaz),", "packages/core kendi tsconfig'iyle, packages/contracts tsconfig.build.json ile (D13'ün dosyası) tsc'den JS'e (Node node_modules altında .ts çalıştırmaz; I069),");
  const sh = m('sunucu hedefi');
  rep(M, sh, 'infra/izleme/makine betikleri ve unit dosyaları (cosign-sunucu.pub hariç; o makinede sabittir).', 'docker/isletim betikleri ve unit dosyaları /app/yayin/isletim altında (cosign-sunucu.pub hariç; o makinede sabittir); compose.gelistirme.yaml girmez.');
  rep(M, sh, 'aynı imaj API, işçi ve göç servisi olur.', 'aynı imaj API, işçi ve göç servisi olur. Derlemenin son adımı imaj açılış denetimidir: node -e ile derlenmiş packages/contracts ve packages/core paketleri koşul bayrağı olmadan (default koşulu, dist) içe aktarılır; başarısızsa imaj derlenmez (I069).');
  rep(M, m('Dockerfile.dockerignore'), 'infra/izleme/makine ana makine betikleri uygulama koduna girmez, yalnız /app/yayin/makine altına veri olarak kopyalanır.', 'docker/isletim ana makine betikleri uygulama koduna girmez, yalnız /app/yayin/isletim altına veri olarak kopyalanır.');

  // ---------- release workflows ----------
  const W = S.yayin_is_akislari;
  rep(W, W.findIndex((s) => s.startsWith('yayin-sunucu.yml')), 'yayin-bilgisi-uret.ts;', 'yayin-bilgisi-uret.ts (artan sira, iosDagitimTurleri ve yeni hatalı sürüm girdisinde baslangic denetimiyle; I031, I069);');
  W.splice(W.findIndex((s) => s.startsWith('yayin-ota.yml')) + 1, 0,
    "yayin-telefon.yml: mobil/v* etiketiyle; ilk iş (sozlesme-kapisi) D13'ün sozlesme.yml koşusunda sozlesme işinin aynı etiketin commit'inde etiket kipinde yeşil bittiğini GitHub API'sinden denetler, değilse kırmızı biter ve telefon ikilisi derlenmez; derleme işi needs ile ona bağlıdır (I069). İkilinin derlenmesi ve mağazaya gönderimi telefon uygulamasının kodudur (harita dışı); bu iş akışı yalnız kapıyı ve sırayı sağlar.");

  // ---------- neighbour columns read by the olcum_ views (I087, I089, I065, I085, I086) ----------
  S.olcum_komsu_sutunlari = [
    { modul: 'D05', tablo: 'yoklama_kayitlari', sutunlar: 'ilk_kesin_karar, etiket_* (etiket_saat_dogrulanamadi dahil), hesaplanan_ani, telefon_ani (eski adı telefon_saati, I065); saat_sebebi üretilmiş sütun', gorunumler: 'olcum_gonderme_suresi, olcum_saat_dogrulanamayan, olcum_isaretsiz_kabul, olcum_benimseme', karar: 'I089, I065' },
    { modul: 'D09', tablo: 'duzeltmeler', sutunlar: 'tur, sebep_kodu, olusturma_ani', gorunumler: 'olcum_telefonda_kayip (BEYANA_DAYALI)', karar: 'I087' },
    { modul: 'D01', tablo: 'cihazlar, kisiler', sutunlar: 'cihazlar.kapanma_nedeni, kapanma_ani, platform; kisiler.silinme_ani', gorunumler: 'olcum_telefonda_kayip, olcum_gonderme_suresi, olcum_saat_dogrulanamayan', karar: 'I085' },
    { modul: 'D07', tablo: 'oturum_isaretleri', sutunlar: 'gecerli, kesinlesti_ani', gorunumler: 'olcum_isaretsiz_kabul, olcum_kafa_sayisi_asimi', karar: 'I086' },
  ];
};
