'use strict';
// Summary, tables, endpoints, jobs, state machines, invariants.
const { rep, find, strIdx } = require('./lib.js');

module.exports = function p1(S) {
  // ---------- summary (A2, I006, I050) ----------
  rep(S, 'summary',
    "Alan modüllerini içe aktarmaz: D06, D12, D13 ve D14'ün dış yüzleri bileşim köklerinden parametreyle gelir; kendi dış yüzü (ayarlar, gizli anahtar, log, uyarı, saat eşitleme durumu, sayaç işleyicisi, test dünyası) öbür modüllere verilir.",
    "Alan modüllerini içe aktarmaz: D06, D12, D13 ve D14'ün dış yüzleri bileşim köklerinden parametreyle gelir; D01, D02, D03, D04 ve D07'yi yalnız server.ts ve cli/ girişleri çağırır. Kendi dış yüzü (ayarlar, gizli anahtar, log, uyarı, saat eşitleme durumu, sayaç işleyicisi, kimlik olayı abonesi, test dünyası) öbür modüllere verilir.");

  // ---------- tables ----------
  const hes = find(S.tables, 'name', 'hoca_ekran_sureleri');
  rep(hes, 'purpose',
    "(tavan: ekran süreleri ucu ve telefon_sayaci öğesi)",
    "(tavan: ekran süreleri ucu ve telefon_sayaci öğesi aynı 'isletim:ekran_tavani:<kisiId>:<gun>' danışma anahtarıyla uygular, iki yolda da kesindir)");

  // ---------- endpoints (I069: ISLETIM_KAPANIYOR bekleme { sabit: 5 }; I014 katmanlı kilit) ----------
  const live = find(S.endpoints, 'path', '/health/live');
  rep(live.errors, 0, 'Caddy kopyayı en geç 4 saniyede devreden çıkarır', 'Caddy kopyayı en geç 4 saniyede devreden çıkarır; Retry-After 5 (bekleme { sabit: 5 })');
  const ready = find(S.endpoints, 'path', '/health/ready');
  rep(ready.errors, 0, '503 ISLETIM_KAPANIYOR: kapanış başladı', '503 ISLETIM_KAPANIYOR: kapanış başladı; Retry-After 5');
  const durum = find(S.endpoints, 'path', '/v1/durum');
  rep(durum.errors, 0, '(art arda iki başarısızlık gerektiğinden yanlış alarm üretmez)', '(art arda iki başarısızlık gerektiğinden yanlış alarm üretmez); Retry-After 5');
  const ekran = find(S.endpoints, 'path', '/v1/isletim/ekran-sureleri');
  rep(ekran, 'idempotency',
    "tek işlemde önce D12.danismaKilidi(tx, ['isletim:ekran_tavani:<kisiId>:<gun>']) alınır (D12 kuralı: işlem başına tek çağrı, ilk yazımdan önce),",
    "tek işlemde önce D12.danismaKilidi(tx, [ekranTavaniAnahtari(kisiId, gun)]) ile 'isletim:ekran_tavani:<kisiId>:<gun>' alınır (katman 1, işlemin ilk çağrısı; contracts.json ortak kural 'Danışma kilidi katmanları'; telefon_sayaci öğesi aynı anahtarı OgeIsleyici.kilitAnahtarlari kancasıyla verdiğinden tavan iki yolda birlikte kesindir),");

  // ---------- jobs ----------
  const ozet = find(S.jobs, 'name', 'haftalik_olcum_ozeti');
  rep(ozet, 'does',
    "(tür isletim_ozeti, D14'e ekleme isteği; eklenene kadar isletim_uyarisi, konu 'Haftalık ölçüm özeti')",
    "(tür isletim_ozeti, D14'ün EPOSTA_TURLERI'nde; I082, I077)");
  const kalite = find(S.jobs, 'name', 'ci_kalite_kapilari');
  rep(kalite, 'does', 'Sırayla: Biome ci (biçim, kurallar, modül sınırları);', "Sırayla: Biome ci (biçim, kurallar, modül sınırları, D12'nin infra/veritabani/kurallar/*.grit eklentileri);");
  rep(kalite, 'does', 'apps/server Vitest testleri;', "apps/server Vitest testleri (D13'ün sınır testi dahil: dependency-cruiser API'siyle no-circular ve yaprak kuralı, ayrı yapılandırma dosyası yok; I069);");
  rep(kalite, 'does', 'docker compose config ile Compose doğrulaması ve servis sırları matrisi;', 'docker compose config ile Compose doğrulaması (compose.yaml tek başına ve compose.gelistirme.yaml ile) ve servis sırları matrisi;');
  rep(kalite, 'does', 'Caddyfile doğrulaması ve Caddy yol, başlık ve gövde sınırı senaryosu;', 'Caddyfile doğrulaması ve Caddy yol, başlık, gövde sınırı ve yük dağıtımı senaryosu;');
  const yuk = find(S.jobs, 'name', 'yayin_oncesi_yuk_testi');
  rep(yuk, 'does',
    'ders başı, ders çıkışı (en kötü durum 20.000 telefon 1 dakikada), gece ve giriş yığılması profilleri;',
    "ders başı, ders çıkışı (en kötü durum 20.000 telefon 1 dakikada; değişenler isteği öğrenci indirmesinin D08 devam bölümünü de kapsar, I038), gece ve giriş yığılması profilleri; telefon başına istek hızı D13'ün HIZ_SINIFLARI değerlerinden alınır (I069);");
  rep(yuk, 'does',
    'telefonların kayıtları QR alanı taşır (D11 senaryosu, apps/server/test/yuk/ortak/kursu.ts).',
    "telefonların kayıtları QR alanı taşır (projeksiyon senaryosu D15'in apps/server/test/yuk/ortak/kursu.ts ve ders-cikisi.ts dosyalarında; kürsü tarayıcısını eşleştiren kurucu D11'in apps/server/test/support/kurucular/projeksiyon.ts'i, I088).");

  // ---------- state machines ----------
  const api = find(S.state_machines, 'name', 'API kopyası (server.ts süreci)');
  const t1 = api.transitions.find((t) => t.from === 'VERITABANI_BEKLENIYOR' && t.to === 'HAZIR');
  rep(t1, 'when',
    'iş kuyruğu (D14, rol api) ve e-posta kuruldu, app.ts uygulamayı kurdu, listen başladı.',
    'iş kuyruğu (D14 isKuyruguKur, rol api) ve e-posta (epostaKur) kuruldu, uygulamaKur (D13 app.ts; kimlik dinleyicileri ve bütün eklentiler, D15\'inki dahil) uygulamayı kurdu, listen başladı.');
  const t2 = api.transitions.find((t) => t.from === 'HAZIR' && t.to === 'KAPANIYOR');
  rep(t2, 'when', '503 ISLETIM_KAPANIYOR;', '503 ISLETIM_KAPANIYOR (Retry-After 5);');

  const sayac = find(S.state_machines, 'name', 'Telefon sayacı satırı ((kurulum_id, gun) anahtarı)');
  const t3 = sayac.transitions.find((t) => t.from === 'KAYITLI' && t.to === 'SILINDI');
  rep(t3, 'when', '(hesap_silindi olayı, aynı işlemde)', "(hesap_silindi olayı; D01 kimlikDinleyicileriniKur'un isletim abonesi olarak olayı doğuran işlemde)");
  const t3b = sayac.transitions.find((t) => t.when.startsWith('Personel paketindeki ekran süreleri'));
  rep(t3b, 'when', '(500 satır ya da 5 kaynak kimliği; yalnız yeni anahtarlar sayılır) aşıyor:', "(500 satır ya da 5 kaynak kimliği; yalnız yeni anahtarlar sayılır) aşıyor; tavan, kilitAnahtarlari kancasıyla paketin başında alınan 'isletim:ekran_tavani:<kisiId>:<gun>' anahtarı altında okunur:");

  const anahtar = find(S.state_machines, 'name', 'Gizli anahtar (amaç başına kid)');
  const t4 = anahtar.transitions.find((t) => t.from === 'ETKIN' && t.to === 'ELE_GECIRILDI');
  rep(t4, 'when',
    "Son adımda saat belgesi ve QR amaçlarında anahtar-uret, o kidli belgeyi taşıyıp şüphe anından sonra ulaşmış ama işaretten önce doğrulanmış kayıtları D07.yenidenDegerlendir ile yeniden değerlendirir.",
    "Son adımda saat belgesi ve QR amaçlarında anahtar-uret D07.yenidenDegerlendir(tx, { belgeKid: { amac, kid } }, 'ANAHTAR_ELE_GECIRILDI') çağırır: o kid'li belgeyle çapa kurup şüphe anından işaret anına kadar ulaşmış kayıtlar yeniden değerlendirilir (I086).");

  const yayin = S.state_machines.find((m) => m.name.startsWith('Sunucu yayını'));
  const t5 = yayin.transitions.find((t) => t.from === 'HAZIRLIK' && t.to === 'IMAJ_DOGRULANDI');
  rep(t5, 'when',
    'Yayın penceresi uygun (İstanbul saatiyle, TZ=Europe/Istanbul date; hafta içi 08:00-20:00 arası yalnız --simdi ile).',
    "Yayın penceresi uygun: dönem arasında saat sınırı yoktur, değilse İstanbul saatiyle (TZ=Europe/Istanbul date) hafta içi 08:00-20:00 arası yalnız --simdi ile. Dönem arası bilgisini betik çalışan sürümün komutuyla alır: docker compose run --rm --no-deps goc node src/cli/anahtar-uret.ts donem-arasi; bileşim kökü olan bu giriş D02.donemArasiMi(tx) çağırıp { donemArasi } yazar (I006; infra/izleme D02'yi içe aktarmaz). Komut hata verirse ya da veritabanı hazır değilse dönem içi sayılır.");
  rep(t5, 'when',
    'anahtar-uret denetle geçer.',
    "anahtar-uret denetle geçer. Yeni imajın yayin-bilgisi.json'unda çalışan sürümün dosyasında olmayan her hatalı sürüm girdisinin baslangic'i yayın anından önce değildir: ilan canlıya bu yayınla çıkar (I031); bilerek geçmek için --gec-ilan verilir, o zaman D07 açılışta dogrulama.hatali_surum_gec_yuklendi uyarısını açar.");
  const t6 = yayin.transitions.find((t) => t.from === 'HAZIRLIK' && t.to === 'DURDU');
  rep(t6, 'when', 'Pencere dışı, imza, sürüm etiketi ya da anahtar denetimi tutmadı:', 'Pencere dışı, imza, sürüm etiketi, anahtar denetimi ya da hatalı sürüm başlangıcı tutmadı:');
  const t7 = yayin.transitions.find((t) => t.from === 'YEDEK_DENETLENDI' && t.to === 'GOC_TAMAM');
  rep(t7, 'when', '0 ile bitti.', "0 ile bitti. Göç eski işçi ve eski API kopyaları açıkken çalışır; önce genişlet, sonra daralt merdiveni (teknik.html#sunucu-mimari) eski kodun genişlemiş şemada çalışmasını karşılar (I061).");

  // ---------- invariants ----------
  const iv = S.invariants;
  iv[strIdx(iv, 'D15 tabloları alan tablolarına yabancı anahtar kurmaz')] =
    "D15 tabloları alan tablolarına yabancı anahtar kurmaz; infra/izleme, infra/ayarlar ve jobs/isletim hiçbir alan modülünü (D01 ile D11) içe aktarmaz, D06, D12, D13 ve D14 dış yüzleri bileşim köklerinden parametreyle gelir. D15'in dosyalarından D01, D02, D03, D04 ve D07'yi yalnız server.ts, cli/ girişleri (anahtar-uret, olay, olcum-raporu) ve test desteği çağırır; app.ts (D13) eklentiye seçenek verir (contracts.json ortak kural 'Yaprak dosyası ve döngüsüz içe aktarma', A2).";
  iv[strIdx(iv, "hoca_ekran_sureleri'nde (kisi_id, gun) başına en çok 500 satır")] =
    "hoca_ekran_sureleri'nde (kisi_id, gun) başına en çok 500 satır ve en çok 5 ayrı kaynak_kimligi vardır; panel ucu ve telefon_sayaci öğesi tavanı aynı 'isletim:ekran_tavani:<kisiId>:<gun>' danışma anahtarı altında okuduğundan iki yolda da kesindir.";
  iv[strIdx(iv, "Bütün havuzların ve ayrılmış bağlantıların toplamı 80'i geçmez")] =
    "Bütün havuzların ve ayrılmış bağlantıların toplamı 80'i geçmez (D12 bütçesi: iki API kopyası 40, işçi 5 = pg-boss 2 + Drizzle 3 ve Drizzle'ın 2'si devam_hesapla partileri, saklama bağlantısı 1, xprem 10, göç 2, pgBackRest 2, gece dökümü 1, süper kullanıcı 3; toplam 64).";
  const kimlikIv = "Kimlik olayları D15'e yalnız D01.kimlikDinleyicileriniKur'un isletim abonesi (kimlikOlayiDinleyicisi) olarak, olayı doğuran işlemde ve dersler, esitleme, projeksiyon abonelerinden sonra gelir; D15'in komut girişleri (cli/anahtar-uret, cli/olay) dört aboneyi kurup kimlikDinleyicileriHazir çağırmadan iş yapmaz.";
  const kilitIv = "D15'in danışma anahtarları 'isletim:' önekli ve katman 1'dir (contracts.json ortak kural 'Danışma kilidi katmanları'); yalnız D12.danismaKilidi ile, işlemin ilk çağrısında ya da D06'nın paket başındaki tek çağrısında alınır, elle pg_advisory_xact_lock yazılmaz.";
  iv.splice(strIdx(iv, 'Silinmiş hesabın kişisine ait') + 1, 0, kimlikIv);
  iv.splice(strIdx(iv, "hoca_ekran_sureleri'nde (kisi_id, gun) başına") + 1, 0, kilitIv);
};
