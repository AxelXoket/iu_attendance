// Patches data5.js (D15 extra sections) for the review findings. Every replacement must match exactly once.
'use strict';
const fs = require('fs'), path = require('path');
const F = path.join(__dirname, '..', 'data5.js');
let s = fs.readFileSync(F, 'utf8');
const rep = (a, b) => {
  const n = s.split(a).length - 1;
  if (n !== 1) throw new Error(`expected 1 match, got ${n}: ${a.slice(0, 80)}`);
  s = s.replace(a, () => b);
};
const repBlock = (startMarker, endMarker, body) => {
  const i = s.indexOf(startMarker);
  const j = s.indexOf(endMarker, i);
  if (i < 0 || j < 0) throw new Error('block not found ' + startMarker);
  s = s.slice(0, i) + body + s.slice(j);
};

// --- sırlar
rep("  ['saat_belgesi', 'anahtar kümesi (gizliAnahtarDosyasiSemasi)', 'api-1, api-2, isci', 'D04 (üretme ve doğrulama; işçide yeniden değerlendirme)'],",
  "  ['saat_belgesi', 'anahtar kümesi (gizliAnahtarDosyasiSemasi)', 'api-1, api-2, isci (döndürmede üçü de yeniden başlar)', 'D04 (üretme ve doğrulama; işçide yeniden değerlendirme)'],");
rep("  ['qr_anahtar_kaynagi', 'anahtar kümesi', 'api-1, api-2, isci', 'D11'],",
  "  ['qr_anahtar_kaynagi', 'anahtar kümesi', 'api-1, api-2, isci (döndürmede üçü de yeniden başlar)', 'D11'],");
rep("  ['inceleme_sabit_kodu', 'tek değer', 'api-1, api-2', 'D01'],",
  "  ['inceleme_sabit_kodu', 'tek değer', 'api-1, api-2, isci (işçide değeri okunmaz, yalnız varlığı: kimlik.incelemeSabitKoduVar)', 'D01 (API girişte; işçide inceleme_hesaplari_kurulumu eksiklik uyarısı için)'],");
rep("'xprem', 'D15 (işletim), D12 (yedek)'],",
  "'xprem', 'D15 (işletim ve çevrimdışı yedek: anahtar-uret yedekle, D15-B06)'],");

// --- ölçüm görünümleri
rep("\"Payda ilk_kesin_karar VAR ya da INCELEMEDE; pay ilk_kesin_karar VAR, etiket_saat_dogrulanamadi false ve oturumda KAFA_SAYISI_ASIMI satırı yok; üç etiket ayrı sayı; hedef oran_binde >= 980.\"",
  "\"Payda ilk_kesin_karar VAR ya da INCELEMEDE; pay ilk_kesin_karar VAR, etiket_saat_dogrulanamadi false ve oturumu işaretli değil. İşaretli oturum: KAFA_SAYISI_ASIMI satırı gecerli = true ve kesinlesti_ani dolu (son durum; bir kez işaretlenip son hesapta eşiğin altına inen oturum işaretli sayılmaz; anlam D15-A13 ile plana önerildi). Kesinleşmemiş oturumdaki kayıt orana girmez, kesinlesmemis sütununda sayılır. Üç etiket ayrı sayı; hedef oran_binde >= 980.\"");
rep("'donem_id, gun, payda, pay, oran_binde, cihaz_dogrulanmadi, ikinci_profil, qrsiz'",
  "'donem_id, gun, payda, pay, oran_binde, kesinlesmemis, cihaz_dogrulanmadi, ikinci_profil, qrsiz'");
rep("['olcum_kafa_sayisi_asimi', 'oturumlar (D02), oturum_isaretleri', 'donem_id, gun (oturumlar.tarih), kafa_sayisi_girilen, asim_isaretli, asimsiz_oran_binde', 'Kafa sayısı girilmiş ve yapıldı oturumlardan işaretsizlerin oranı; hedef >= 950.'],",
  "['olcum_kafa_sayisi_asimi', 'oturumlar (D02), oturum_isaretleri', 'donem_id, gun (oturumlar.tarih), kafa_sayisi_girilen, kesinlesmemis, asim_isaretli, asimsiz_oran_binde', 'Kafa sayısı girilmiş ve yapıldı oturumlardan işaretsizlerin oranı; işaretli oturum olcum_isaretsiz_kabul ile aynı tanım (gecerli = true ve kesinlesti_ani dolu), kesinleşmemiş oturum orana girmez; hedef >= 950.'],");
rep("\"Kafa sayısı girilmiş oturumlarda yalnız dersin sahibinin (dersler.sahip_kisi_id) satırları toplanır; percentile_disc ile tam sayı; hoca başına sütun yok; hedef ortanca <= 120.\"",
  "\"Kafa sayısı girilmiş oturumlarda yalnız dersin şimdiki sahibinin (dersler.sahip_kisi_id) ve önceki sahiplerinin (kisi_id = ANY(dersler.onceki_sahip_kisi_idleri); devirden önceki oturumlar ölçüden düşmesin) satırları toplanır; percentile_disc ile tam sayı; hoca başına sütun yok; hedef ortanca <= 120.\"");
rep("  ['olcum_telefon_sayaclari', 'telefon_sayaclari (D15)',",
  "  ['olcum_telefonda_kayip', 'kurulumlar (D06), cihazlar ve kisiler (D01), duzeltmeler (D09)', 'olcu (TELEFONDA_KALAN | CIHAZ_DEGISIMI | BEYANA_DAYALI), gun, platform, olay_sayisi, kayit_sayisi, eksik_sira', \"plan.html#hedefler'deki üç ayrı oran (Kayıt kaybı). TELEFONDA_KALAN: gun son_temas_ani'nin İstanbul günü; son cihazı onaylı değişimle kapanmamış ve kişisi silinmemiş, bekleyen_yoklama_sayisi ya da acik_bosluk_sayisi 0'dan büyük kurulumlar; olay_sayisi kurulum, kayit_sayisi bekleyen yoklama toplamı, eksik_sira açık boşluk toplamı; 7 gündür temassızlık süzgeci sorguda (görünüm now() kullanmaz). CIHAZ_DEGISIMI: gun cihazlar.kapanma_ani günü, kapanma_nedeni degisim; olay_sayisi cihaz, kayit_sayisi o cihazın kurulumunda kalan bekleyen yoklama. BEYANA_DAYALI: gun duzeltmeler.olusturma_ani günü, tur DUZELTME ve sebep_kodu BEYANA_DAYALI; olay_sayisi ve kayit_sayisi düzeltme sayısı. Oranı özet ve olcum-raporu aynı dönemde ulaşan yoklama kaydı başına binde hesaplar.\"],\n  ['olcum_telefon_sayaclari', 'telefon_sayaclari (D15)',");

// --- uyarı türleri kataloğu: 7 sütun
repBlock('// Uyarı türleri kataloğu (UYARI_TURLERI)', 'const compose_servisleri', `// Uyarı türleri kataloğu (UYARI_TURLERI): [tür, anahtar, seviye, kapanma, koşul, değerlendiren iş, girdi]
// KOSUL kapanışı yalnız değerlendiren iş, o çalışmada girdiyi başarıyla okuyup koşulu yanlış bulunca uygulanır.
const uyari_kurallari = [
  ['isletim.disk_doluluk', 'bağlama noktası', 'UYARI >= yüzde 80; KRITIK >= yüzde 90', 'KOSUL', 'makine.json diskler', 'isletim_denetimi', 'makine (makine.json; makine_denetimi yazar)'],
  ['isletim.bellek_az', '', 'UYARI', 'KOSUL', 'kullanılabilir bellek yüzde 10 altı', 'isletim_denetimi', 'makine'],
  ['isletim.kap_yeniden_basladi', 'servis', 'UYARI', 'SESSIZLIK', 'yenidenBaslamaArtisi > 0 (aynı kap kimliğinde)', 'isletim_denetimi', 'makine'],
  ['isletim.kap_bellek_tasti', 'servis', 'KRITIK', 'SESSIZLIK', 'oomArtisi > 0 (docker events oom olayı; her olay bir kez sayılır)', 'isletim_denetimi', 'makine'],
  ['isletim.kap_calismiyor', 'servis', 'KRITIK', 'KOSUL', 'durum running değil (goc ve yedek hariç); geçerli bakim.json varken değerlendirilmez', 'isletim_denetimi', 'makine ve bakım (bakim.json)'],
  ['isletim.makine_denetimi_sessiz', '', 'UYARI', 'KOSUL', 'makine.json 25 dakikadan eski ya da okunamıyor; bu durumda makine girdisine bağlı öbür türlere dokunulmaz', 'isletim_denetimi', 'makine'],
  ['isletim.saat_esitleme', '', 'KRITIK', 'KOSUL', 'chrony.json okunamıyor, senkron değil, sapma eşik üstü, dosya eski ya da sonBozukAni son 10 dakikada', 'isletim_denetimi', 'saat (chrony.json; saat_esitleme_izleme yazar)'],
  ['isletim.wal_arsivi', '', 'KRITIK (son deneme başarısız); UYARI (son başarı 60 dk eski)', 'KOSUL', 'pg_stat_archiver', 'isletim_denetimi', 'pg_sistem'],
  ['isletim.baglanti_sayisi', '', 'UYARI >= 80; KRITIK >= 90', 'KOSUL', 'pg_stat_activity istemci bağlantıları', 'isletim_denetimi', 'pg_sistem'],
  ['isletim.yedek_basarisiz', 'iş', 'KRITIK', 'KOSUL', 'YedekIsDurumu.sonSonuc basarisiz', 'isletim_denetimi', 'yedek:<iş> (o işin durum dosyası; D12 yazar)'],
  ['isletim.yedek_eski', "iş (pgBackRest için 'pgbackrest': tam ve fark yedeğin en yenisi)", 'KRITIK: gecelik_pg_dump, xprem_birimi_yedegi ve pgbackrest son başarısı > 26 saat; UYARI: pgbackrest_tam_yedek > 8 gün, pgbackrest_dogrulama > 8 gün, geri_yukleme_denemesi > 36 gün', 'KOSUL', 'YedekIsDurumu.sonBasariAni yaşı (YEDEK_ESIKLERI); tam yedek pazar, fark pazartesi-cumartesi koştuğundan tam yedek tek başına 26 saatle ölçülmez; ilk cumartesiler arası 35 gün olabilir', 'isletim_denetimi', 'yedek:<iş>'],
  ['isletim.yedek_atlandi', 'iş', 'UYARI', 'KOSUL', 'YedekIsDurumu.ardisikAtlanan >= 2 (tek atlama yaş eşiğiyle görünür)', 'isletim_denetimi', 'yedek:<iş>'],
  ['isletim.yedek_durumu_okunamadi', 'iş', 'UYARI', 'KOSUL', 'durum dosyası yok ya da YedekIsDurumu şemasına uymuyor; o işin öbür türlerine dokunulmaz', 'isletim_denetimi', 'yedek:<iş>'],
  ['isletim.pgboss_sema', '', 'KRITIK', 'KOSUL', 'isSagligi.semaSurumu beklenen ile bulunan farklı', 'isletim_denetimi', 'is_sagligi (D14.isSagligi)'],
  ['isletim.olu_mektup', 'kuyruk', 'UYARI', 'KOSUL', 'oluMektup > 0', 'isletim_denetimi', 'is_sagligi'],
  ['isletim.is_sessiz', 'kuyruk', 'KRITIK (aralık <= 900 sn); UYARI (daha seyrek)', 'KOSUL', 'zamanlamalı işte sonBasariAni, 2 x beklenenAralikSaniye + 600 saniyeden eski', 'isletim_denetimi', 'is_sagligi'],
  ['isletim.kuyruk_birikti', 'kuyruk', 'UYARI', 'KOSUL', 'enEskiBekleyenSaniye > 900', 'isletim_denetimi', 'is_sagligi'],
  ['isletim.eposta_basarisiz', '', 'KRITIK', 'KOSUL', 'ardisikBasarisiz >= 3', 'isletim_denetimi', 'is_sagligi'],
  ['isletim.eposta_yarim', '', 'UYARI', 'KOSUL', 'yarimKalan > 0', 'isletim_denetimi', 'is_sagligi'],
  ['isletim.eposta_gunluk_sinir', '', 'UYARI', 'KOSUL', 'son24SaatGonderilen >= gunlukSinir x 0,8', 'isletim_denetimi', 'is_sagligi'],
  ['isletim.devam_tutarlilik_farki', '', 'UYARI', 'KOSUL', 'devam_tutarlilik_denetimi son çıktısında farkSayisi > 0 (D08-A08)', 'isletim_denetimi', 'is_sagligi (sonCikti)'],
  ['isletim.api_5xx', '', 'UYARI', 'KOSUL', 'son 10 dakikada 503 dışı 5xx >= 20', 'isletim_denetimi', 'api_olcum (/durum/api/<kopya>.json)'],
  ['isletim.api_503', '', 'UYARI', 'KOSUL', '503 oranı >= yüzde 5 ve toplam >= 200', 'isletim_denetimi', 'api_olcum'],
  ['isletim.gonderim_yavas', '', 'UYARI', 'KOSUL', 'gönderim p95 >= 2000 ms ve adet >= 100', 'isletim_denetimi', 'api_olcum'],
  ['isletim.api_olcum_yok', '', 'UYARI', 'KOSUL', '5 dakikadan yeni API ölçü dosyası yok (bu durumda api_olcum girdisine bağlı öbür türlere dokunulmaz); geçerli bakim.json varken değerlendirilmez', 'isletim_denetimi', 'api_olcum ve bakım'],
  ['isletim.sertifika_bitiyor', '', 'UYARI (acme 14, elle 30 gün); KRITIK (7 gün)', 'KOSUL', 'kalan gün', 'sertifika_bitis_denetimi (isletim_denetimi kapatmaz, yalnız bildirir)', 'sertifika (caddy:443 TLS bağlantısı)'],
  ['isletim.sertifika_gecersiz', '', 'KRITIK', 'KOSUL', 'zincir ya da ad doğrulanamadı', 'sertifika_bitis_denetimi (isletim_denetimi kapatmaz, yalnız bildirir)', 'sertifika'],
  ['isletim.denetim_girdisi', "girdi adı: is_sagligi, pg_sistem, telefon_sayaclari, olcum_kayit_kaybi ya da sertifika", 'UYARI; aynı girdi art arda üçüncü çalışmada da okunamazsa KRITIK (tekrar_sayisi 3)', 'KOSUL', 'girdi okunamadı ya da o girdinin kuralı hata verdi (ör. başka modülün göçünden sonra kırılan sorgu); o girdiye bağlı türlere dokunulmaz, öbür kurallar çalışır; girdi yeniden okununca kapanır', 'girdiyi okuyan iş (isletim_denetimi; sertifika anahtarında sertifika_bitis_denetimi)', 'adı geçen girdi'],
  ['isletim.yeni_ret_kodu', "'<http>:<kod>'", 'UYARI', 'SESSIZLIK', 'su seviyesinden sonra yazılan (yazma_ani) sayaç satırlarında, su seviyesinden önce yazılmış ve gun >= bugün - 28 olan satırlarda görülmemiş kod; su seviyesi önceki başarılı çalışmanın çıktısı', 'isletim_denetimi', 'telefon_sayaclari'],
  ['isletim.makbuzlu_kayit_yeniden_geldi', '', 'UYARI', 'SESSIZLIK', 'son 24 saatte olcum_kayit_kaybi.makbuzla_yeniden_gelen > 0', 'isletim_denetimi', 'olcum_kayit_kaybi'],
  ['<başka modül>.<olay>', 'çağıranın', 'çağıranın (varsayılan UYARI)', 'SESSIZLIK', "uyariAc çağrısı (ör. dogrulama.iptal_listesi_eski, kimlik.inceleme_ayari_eksik)", 'isletim_denetimi (yalnız SESSIZLIK kapanışı)', 'D01, D07 uyariAc çağrısı'],
];

`);

// --- Compose servisleri
rep("'TZ=UTC, init, user node, read_only; mem_limit 512m; stop_grace_period 40s (D14); /durum/saat, /durum/makine, /durum/veritabani ve api-durum salt okunur'",
  "'TZ=UTC, init, user node, read_only; mem_limit 512m; stop_grace_period 40s (D14); /durum/saat, /durum/makine (makine.json ve bakim.json), /durum/veritabani ve api-durum salt okunur; sırlar matristeki gibi, inceleme_sabit_kodu yalnız varlığı için'");
rep("'DISABLE_TELEMETRY=true; xprem-dosyalari birimi (D12 gece yedekler); yönetim paneli portu yayımlanmaz, yalnız SSH tüneli; restart unless-stopped; havuzu destekliyorsa 10 bağlantı'",
  "\"DISABLE_TELEMETRY=true; xprem-dosyalari birimi (D12 gece yedekler); kök yolda (/) çalışır, Caddy /guncelleme önekini atar; dışa dönük adres ayarı https://<ALAN_ADI>/guncelleme (manifestteki varlık adresleri bu tabanla yazılır, ilk kurulumda xprem belgesinden doğrulanır). Yönetim paneli dışarı yalnız Caddy'nin açık eşleyicileriyle kapanmaz, ayrıca: panel portu (xprem belgesine göre ayrı port ya da aynı port) Compose'da yalnız 127.0.0.1:${XPREM_YONETIM_PORT}'a yayımlanır ve sahip SSH -L tüneliyle açar (teknik.html#dagitim-ayrinti-xprem-guvenligi); restart unless-stopped; havuzu destekliyorsa 10 bağlantı\"");

// --- Caddy yolları
rep("  ['/guncelleme/*', 'reverse_proxy xprem', \"Yalnız xprem'in güncelleme protokolü ve yayın API'si önekleri iletilir (ilk kurulumda xprem belgesinden yazılır); yönetim paneli yolu iletilmez, CI Caddy senaryosu denetler.\"],",
  "  ['@xprem_protokol (/guncelleme altındaki protokol yolları)', 'uri strip_prefix /guncelleme; reverse_proxy xprem:{$XPREM_PORT}', \"Yalnız açık eşleyici: Expo Updates protokolünün yolları (manifest ve varlıklar) ilk kurulumda xprem belgesinden yazılır; joker /guncelleme/* iletilmez. Önek Caddy'de atılır, xprem kökte çalışır.\"],\n  ['@xprem_yayin (/guncelleme altındaki yayın API yolları)', 'request_body max_size 64MB; uri strip_prefix /guncelleme; reverse_proxy xprem', \"eoas'ın yükleme yolları, xprem belgesinden. Site düzeyindeki 4 MB sınırı bu eşleyiciye uygulanmaz (iç içe iki sınırda küçüğü geçerli olurdu): genel sınır '@genel_govde not @xprem_yayin' eşleyicisiyle verilir.\"],\n  ['/guncelleme/* (kalan her yol)', 'respond 404', \"Yönetim paneli yolu dahil eşleyici dışındaki her güncelleme yolu Caddy'de 404 alır, xprem'e ulaşmaz. CI Caddy senaryosu yönetim yolunun 404, protokol yolunun önek atılmış olarak xprem'e gittiğini, yayın yolunun 5 MB gövdeyi geçirdiğini sınar.\"],");
rep("  ['genel', 'encode zstd gzip; request_body max_size 4MB; -Server',",
  "  ['genel', 'encode zstd gzip; request_body @genel_govde max_size 4MB (xprem yayın yolları hariç); -Server',");

// --- yük testi
rep("    'xprem denemesi (imzalı yayın, yüzde, geri alma, bozuk imza reddi): ilk derlemede ve her Expo SDK yükseltmesinde.',",
  "    \"xprem denemesi (imzalı yayın, yüzde, geri alma, bozuk imza reddi, manifestteki varlık adreslerinin https://<ALAN_ADI>/guncelleme/ ile başlaması, yönetim yolunun dışarıdan 404 alması): ilk derlemede, her Expo SDK yükseltmesinde ve her xprem sürüm yükseltmesinde.\",");
rep("    'Ders çıkışı (en kötü durum): 20.000 telefon 1 dakikada; saat belgesi, gönderim (paket başına 1 ile 6 kayıt, yüzde 5\\'i 200 kayıt), yüzde 30\\'u değişenler; aynı anda 50 hoca ders raporu ve AKSİS özeti.',",
  "    \"Ders çıkışı (en kötü durum): 20.000 telefon 1 dakikada; saat belgesi, gönderim (paket başına 1 ile 6 kayıt, yüzde 5'i 200 kayıt), yüzde 30'u değişenler; aynı anda 50 hoca ders raporu ve AKSİS özeti. Aşama 2 sunucu parçası yayındaysa (D11 senaryosu, ortak/kursu.ts): 500 kürsü tarayıcısı (tohum.ts D11 kurucusuyla eşleştirir) telefonlardan önce 60 saniye yalnız, sonra koşu boyunca 10 saniyede bir GET /v1/projeksiyon/kodlar ister; telefonların kayıtları QR alanı taşır.\",");
rep("    'AKSİS özeti ve ders raporu ders çıkışı sürerken p95 <= 2 s, gönderim p95 raporsuz koşudan en çok yüzde 10 kötü (D10).',",
  "    'AKSİS özeti ve ders raporu ders çıkışı sürerken p95 <= 2 s, gönderim p95 raporsuz koşudan en çok yüzde 10 kötü (D10).',\n    \"Aşama 2 yayındaysa: GET /v1/projeksiyon/kodlar p95 < 200 ms; QR alanlı gönderimde gönderim eşikleri aynı; yalnız kürsü evresinde pg_stat_user_tables'ta D11 tablolarının n_tup_ins ve n_tup_upd sayıları değişmez, yani kod ucu veritabanına yazmaz (D11).\",");

// --- olay müdahalesi
rep("  ['Saat belgesi, QR ya da ulaşma makbuzu anahtarı sızdı', \"anahtar-uret ele-gecirildi --amac <amaç> --kid <kid> --yeni-kid <yeni>; yayinla.sh --yeniden-baslat; o kid'le belgelenmiş ve şüphe anından sonra ulaşan kayıtlar D04 işaretiyle D07'de İncelemede; çevrimdışı yedek yenilenir.\"],",
  "  ['Saat belgesi, QR ya da ulaşma makbuzu anahtarı sızdı', \"makine/anahtar.sh ele-gecirildi --amac <amaç> --kid <kid> --yeni-kid <yeni> --supheden <ISO an>: yeni kid önce yalnız doğrulamada (HAZIR) eklenir, isci, api-1 ve api-2 yeniden başlar ve küme özeti denetlenir; sonra yeni kid etkin, eski kid ELE_GECIRILDI ve eleGecirilmeAni şüphe anı, süreçler yine yeniden başlar (ilk adımın birkaç dakikasında eski anahtar imzalamayı sürdürür, bu kayıtlar da aşağıdaki aralığa girer). Saat belgesi ve QR'da son adım D07.yenidenDegerlendir'i o kid ve şüphe anından işaret anına kadarki ulaşma aralığıyla çağırır, bu kayıtlar İncelemede'ye döner; işaretten sonra doğrulananlar D04'ün anahtarEleGecirildi işaretiyle zaten İncelemede alınır; şüphe anından önce ulaşanlar değişmez (ayrım ulaşma anıyla, belgenin kendi imza anıyla değil: sızan anahtar geçmiş tarihli belge üretebilir). Çevrimdışı yedek yenilenir.\"],");
rep("  ['Giriş kodu ya da e-posta özeti anahtarı sızdı', 'anahtar-uret dondur ile hemen değiştir, kopyaları sırayla yeniden başlat; yalnız 5 dakikalık kodlar ve e-posta sayaçları düşer (teknik.html#dagitim-ayrinti-korunacak-anahtarlar).'],",
  "  ['Giriş kodu ya da e-posta özeti anahtarı sızdı', 'makine/anahtar.sh dondur --amac <amaç> ile hemen değiştir: iki adım, her adımda işçi ve iki API kopyası sırayla yeniden başlar, birkaç dakika sürer; yalnız 5 dakikalık kodlar ve e-posta sayaçları düşer (teknik.html#dagitim-ayrinti-korunacak-anahtarlar).'],");

// --- hata kodları
rep("  ['ISLETIM_SURE_GECERSIZ', '400', 'POST /v1/isletim/ekran-sureleri', 'Çift (oturum, ekran) ya da toplam 86400 saniye üstü.'],",
  "  ['ISLETIM_SURE_GECERSIZ', '400', 'POST /v1/isletim/ekran-sureleri', 'Çift (oturum, ekran), toplam 86400 saniye üstü ya da kişi ve gün tavanı (500 satır, 5 kaynak kimliği) aşılıyor.'],");
rep("  ['ISLETIM_AYAR_GECERSIZ', 'süreç', 'ayarlariYukle', 'Eksik ya da hatalı ayar veya sır; süreç çıkış kodu 78.'],",
  "  ['ISLETIM_AYAR_GECERSIZ', 'süreç', 'ayarlariYukle', 'Eksik ya da hatalı ayar veya sır, ya da uretim ortamında ISLETIM_SERTIFIKA_KOK_DOSYASI; süreç çıkış kodu 78.'],");
rep("  ['ISLETIM_SAAT_DILIMI', 'süreç', 'ayarlariYukle', 'Süreç saat farkı 0 değil (TZ=UTC değil).'],",
  "  ['ISLETIM_SAAT_DILIMI', 'süreç', 'ayarlariYukle', 'Sürecin saat dilimi adı UTC ya da Etc/UTC değil (saat farkına bakılmaz).'],");
rep("  ['ISLETIM_UYARI_GECERSIZ', 'süreç', 'uyariAc', 'Tür, anahtar ya da metin kuralı tutmuyor.'],",
  "  ['ISLETIM_UYARI_GECERSIZ', 'süreç', 'uyariAc', 'Tür ya da anahtar deseni tutmuyor (uzun metin kesilir, hata değildir).'],");

// --- istekler
rep("  ['D13', \"app.ts isletimEklentisi'ni rotalariKaydet, D06.ogeTuruKaydet, D01.kimlikOlayiDinleyicisiKaydet, veritabani, saat ve surec ile kaydeder; logger olarak D15'in log'unu (logOlustur sonucu) verir; apiKur ayarlarını D15 ayarlarından eşler (panelAdresi, baski, guvenilenVekilAdresi, yayinBilgisiYolu).\"],",
  "  ['D13', \"app.ts isletimEklentisi'ni rotalariKaydet, D06.ogeTuruKaydet, D01.kimlikOlayiDinleyicisiKaydet, D01'in hesapSilindiMi okuyucusu, D12.danismaKilidi, veritabani, saat ve surec ile kaydeder; app.ts kurucusu olcumYazici seçeneğini (varsayılan false) alıp eklentiye geçirir, yalnız server.ts true verir, test dünyası ve openapi_belgesi_sakla vermez; logger olarak D15'in log'unu (logOlustur sonucu) verir; apiKur ayarlarını D15 ayarlarından eşler (panelAdresi, baski, guvenilenVekilAdresi, yayinBilgisiYolu); derslerEklentisi'ne qrDersAyariAcik olarak ve D11 eklentisine ayarlar().asama2.qrAcik ile ayarlar().projeksiyon'u verir.\"],");
rep("  ['D14', \"worker.ts: ayarlariYukle({ surec: 'isci' }), logOlustur, isletimIsleri(bag) tanımlarını isTanimla'ya uyarlar; IsSagligi zamanlama girdisine sonCikti; isletim_ozeti e-posta türü; testte deleteAllJobs yardımcısı; çizelge güncellemesi (D15-A12).\"],",
  "  ['D14', \"worker.ts: ayarlariYukle({ surec: 'isci' }), logOlustur, isletimIsleri(bag) tanımlarını isTanimla'ya uyarlar ve isle'nin döndürdüğü küçük nesneyi iş çıktısı olarak yazar; IsSagligi zamanlama girdisine sonCikti (isletim_denetimi'nin retSuSeviyesi dahil); isletim_ozeti e-posta türü; testte deleteAllJobs yardımcısı; çizelge güncellemesi (D15-A12).\"],");
rep("  ['D12', 'olcum_ önekli görünüm göçleri D15 adıyla (<UTC>_isletim_<açıklama>) ve başka tabloları okuyabilir; yoklama_isci pg_monitor üyesi (kararlı); YedekIsDurumu dosyaları /var/lib/iu-yoklama/durum/veritabani/<iş>.json.'],",
  "  ['D12', \"olcum_ önekli görünüm göçleri D15 adıyla (<UTC>_isletim_<açıklama>) ve başka tabloları okuyabilir; yoklama_isci pg_monitor üyesi (kararlı); YedekIsDurumu dosyası her makine işi için /var/lib/iu-yoklama/durum/veritabani/<iş adı>.json (gecelik_pg_dump, xprem_birimi_yedegi, pgbackrest_tam_yedek, pgbackrest_fark_yedek, pgbackrest_dogrulama, geri_yukleme_denemesi) ve şemada son sonuç ile son başarı ayrı: { bicim, is, sonCalismaAni, sonSonuc: basarili | basarisiz | atlandi, sonBasariAni | null, ardisikAtlanan, hataKodu | null }; geri_yukleme_denemesi xprem ana anahtarını canlı env dosyasından değil, son döndürmede çevrimdışı arşivden çıkarılıp ayrı dosyaya (/opt/iu-yoklama/deneme/xprem-ana-anahtar, 0400) konan kopyadan alsın, böylece 'xprem güncellemesi iniyor' adımı yedekteki anahtarı da sınar; D12'nin systemd zamanlayıcıları da OnCalendar'da Europe/Istanbul'u açıkça yazsın (makinenin saat dilimi varsayılmaz).\"],");
rep("  ['D06', \"PaketBaglami'na hesapSilinmis (gecikmiş sayaç paketi silinmiş hesaba yeniden bağlanmasın); telefon_sayaci için govdeEnBuyukBayt 16384.\"],",
  "  ['D06', \"PaketBaglami'na alan gerekmez (önceki hesapSilinmis isteği geri çekildi; silinmiş hesap D01 okuyucusuyla denetlenir); telefon_sayaci için govdeEnBuyukBayt 49152 ve ilkCapaVar false.\"],");
rep("  ['D01', 'kimlikOlayiDinleyicisiKaydet ve oturumlariKapat dış yüzleri (D01-A14); inceleme ayarları D15 şemasında hazır.'],",
  "  ['D01', \"kimlikOlayiDinleyicisiKaydet ve oturumlariKapat dış yüzleri (D01-A14); hesapSilindiMi(tx, kisiId): Promise<boolean> okuyucusu (kisiler satırını FOR SHARE ile okur, silinme_ani doluysa true; hesabiSil aynı satırı güncellediğinden eşzamanlı öğe işlemiyle sıralanır); inceleme_hesaplari_kurulumu işçide sabit kodun varlığını ayarlar().kimlik.incelemeSabitKoduVar'dan okusun (işçide değer yoktur; bu seçim D01 iş tanımına yazılsın); olcum_telefonda_kayip cihazlar.kapanma_nedeni, kapanma_ani, platform ve kisiler.silinme_ani sütunlarını okur, kaldırılacaksa önce görünüm güncellenir.\"],");
rep("  ['D07', \"KID_BILINMIYOR için 'anahtar emekli' gerekçesi; iptal listesi ve App Attest yenileme uyarılarında uyariAc türleri dogrulama.* önekiyle.\"],",
  "  ['D07', \"KID_BILINMIYOR için 'anahtar emekli' gerekçesi; iptal listesi ve App Attest yenileme uyarılarında uyariAc türleri dogrulama.* önekiyle; yenidenDegerlendir süzgecine belgeKid ({ amac: 'saat_belgesi' | 'qr_anahtar_kaynagi'; kid }) ve nedenlere anahtar_ele_gecirildi (anahtar-uret ele-gecirildi'nin son adımı, şüphe anından işaret anına kadar ulaşan kayıtlar); olcum_isaretsiz_kabul ve olcum_kafa_sayisi_asimi oturum_isaretleri.gecerli ve kesinlesti_ani sütunlarını okur.\"],\n  ['D09', \"olcum_telefonda_kayip duzeltmeler.tur, sebep_kodu ve olusturma_ani sütunlarını okur (BEYANA_DAYALI sayısı); sütunlar ya da sebep kodu adı değişecekse önce görünüm güncellenir.\"],\n  ['D11', \"Ders çıkışı yük testindeki projeksiyon senaryosu D15'in dosyasındadır (apps/server/test/yuk/ortak/kursu.ts, ders-cikisi.ts); D11 kürsü tarayıcısını eşleştiren kurucuyu (support/kurucular) ve kodlar ucunun istek biçimini verir. Ayarlar'daki projeksiyon bölümü ve ASAMA2_QR_ACIK D15'te hazır.\"],");
rep("  ['Telefon uygulaması (harita dışı)', \"telefon_sayaci gövde kuralları (sıfır gün gönderilmez, haftada en az bir paket, çok oturumlu ekranda eşit bölme, 60 saniye boşta durma); her uygulama yayınında eski sürüm istek örnekleri (D15-B32).\"],",
  "  ['Telefon uygulaması (harita dışı)', \"telefon_sayaci gövde kuralları (gün yalnız sözleşmedeki gunAtlanirMi true dönünce gönderilmez; haftada en az bir paket; çok oturumlu ekranda eşit bölme; 60 saniye boşta durma); her uygulama yayınında eski sürüm istek örnekleri (D15-B32).\"],");

// --- süreç akışı
rep("  \"5. app = app.ts kurucusu ({ ayarlar, log, veritabani, saat, isKuyrugu, eposta, ... }) (D13); bütün eklentiler, D15'inki dahil; app.ready().\",",
  "  \"5. app = app.ts kurucusu ({ ayarlar, log, veritabani, saat, isKuyrugu, eposta, olcumYazici: true, ... }) (D13); bütün eklentiler, D15'inki dahil; app.ready().\",");

// --- durum dosyaları
rep("  ['makine.json (/durum/makine)', '{ bicim: 1, olcumAni, diskler: [{ bagla, toplamBayt, kullanilanBayt }], bellek: { toplamBayt, kullanilabilirBayt }, kaplar: [{ servis, durum, saglik | null, yenidenBaslamaSayisi, yenidenBaslamaArtisi, bellekTasti, baslamaAni }] }', 'makine_denetimi yazar; isletim_denetimi okur.'],",
  "  ['makine.json (/durum/makine)', '{ bicim: 2, olcumAni, olayPenceresi: { baslangic, bitis }, diskler: [{ bagla, toplamBayt, kullanilanBayt }], bellek: { toplamBayt, kullanilabilirBayt }, kaplar: [{ servis, kapKimligi, durum, saglik | null, yenidenBaslamaSayisi, yenidenBaslamaArtisi (aynı kap kimliğinde, >= 0), oomArtisi (pencerideki docker events oom sayısı), baslamaAni }] }', 'makine_denetimi yazar; isletim_denetimi okur. Önceki çalışmanın anı ve kap kimliği başına sayı /var/lib/iu-yoklama/makine-onceki.json’da (yalnız betik okur).'],\n  ['bakim.json (/durum/makine)', '{ bicim: 1, surum, baslangicAni, gecerlilikSonu (baslangicAni + en çok 45 dakika) }', 'yayinla.sh yayın süresince yazar, her çıkışta trap ile siler; isletim_denetimi okur ve gecerlilikSonu geçmemişse isletim.kap_calismiyor ile isletim.api_olcum_yok kurallarını değerlendirmez. Okunamayan ya da süresi geçmiş dosya yok sayılır (uyarılar çalışır).'],");
rep("  ['<iş>.json (/durum/veritabani)', \"D12'nin YedekIsDurumu şeması (packages/contracts/src/veritabani.ts)\", 'D12 makine işleri yazar; isletim_denetimi okur.'],",
  "  ['<iş adı>.json (/durum/veritabani)', \"D12'nin YedekIsDurumu şeması (packages/contracts/src/veritabani.ts); D15'in kullandığı alanlar sonSonuc, sonBasariAni ve ardisikAtlanan (D12'den istek)\", 'D12 makine işleri iş başına bir dosya yazar; isletim_denetimi her dosyayı ayrı okur, okunamayan dosya yalnız o işin uyarılarını dondurur.'],");
rep("'{ bicim: 1, amac, etkinKid, anahtarlar: [{ kid: ^[a-z0-9-]{1,8}$, deger: base64 32 bayt, durum: ETKIN | YALNIZ_DOGRULAMA | ELE_GECIRILDI, olusturmaAni, emeklilikAni? }] (1..4) }; tam bir ETKIN ve etkinKid ona eşit', 'anahtar-uret yazar; ayarlariYukle okur.'],",
  "'{ bicim: 1, amac, etkinKid, anahtarlar: [{ kid: ^[a-z0-9-]{1,8}$, deger: base64 32 bayt, durum: HAZIR | ETKIN | YALNIZ_DOGRULAMA | ELE_GECIRILDI, olusturmaAni, emeklilikAni?, eleGecirilmeAni? (yalnız ELE_GECIRILDI, zorunlu) }] (1..4) }; tam bir ETKIN ve etkinKid ona eşit, en çok bir HAZIR', 'anahtar-uret yazar (makine/anahtar.sh çağırır); ayarlariYukle okur.'],");

fs.writeFileSync(F, s);
const d = (delete require.cache[require.resolve(F)], require(F));
console.log('ok', d.uyari_kurallari.length, d.ayar_semasi.length, d.olcum_gorunumleri.length, d.istekler.length, d.dosya_semalari.length, d.caddy_yollari.length);
