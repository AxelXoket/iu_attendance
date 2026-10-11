// D15 spec, part 5: extra sections (rules, schemas, matrices). Rendered into the fragment's
// "Durumlar ve kurallar" part and stored in the spec as extra keys (the validator ignores extra keys).
'use strict';

const queue_items = [
  {
    tur: 'telefon_sayaci',
    gelis: "POST /v1/esitleme/gonderim (D06) içinde öğe; gün kapanınca kuyruğa o günün kayıtlarından sonra girer (D06-B28). Gün yalnız packages/contracts/src/isletim.ts'teki saf gunAtlanirMi(govde) true dönünce gönderilmez: bütün sayısal sayaçlar 0 ve ekranHatalari, retler ve ekranSureleri boş; bildirimIzni bu karara girmez. Böylece hoca telefonunun sayaçları sıfır olsa da kafa sayısı ve onay ekranı süreleri her gün gelir (olcum_hoca_isi yalnız panel verisiyle hesaplanmaz). Bildirim izni ve sürüm için telefon, atlanan günler olsa da en az haftada bir paket gönderir (istemci kuralı, sözleşmede); telefon ve testler aynı işlevi kullanır.",
    kimlik: "İki rol, oturumsuz (D06-B10): kişi D06'nın doğruladığı oturumdan ya da paket imzasından gelir (PaketBaglami.kisiId, rol, kurulumId).",
    govde: {
      bicim: '1',
      gun: 'YYYY-AA-GG; sayıların ait olduğu İstanbul günü',
      platform: 'android | ios',
      uygulamaSurumu: 'x.y.z, en çok 32 karakter',
      runtimeSurumu: 'metin, en çok 32 karakter, ya da null',
      guncellemeKimligi: 'UUID ya da null',
      sayaclar: '{ gonderilmemisKayit?, basarisizDeneme?, yerelModulCokmesi?, icSayacOkumaHatasi?, bilinmeyenSonuc?: 0..1000000; bildirimIzni?: boolean }; bilinmeyen ad atılır ve sayılır',
      ekranHatalari: "[{ tur: 'HATA_SINIRI' | 'GENEL', ekran: ^[a-z][a-z0-9_]{0,47}$, sayi: 1..1000000 }] en çok 100",
      retler: '[{ http: 400..599, kod: ^[A-Z][A-Z0-9_]{0,63}$ ya da null, sayi: 1..1000000 }] en çok 50',
      ekranSureleri: "[{ oturumId: UUID, ekranTuru: EKRAN_TURLERI ya da bilinmeyen (atılır), saniye: 1..86400 }] en çok 200; yalnız PERSONEL",
    },
    sonuclar: "KABUL { uygulandi: true | false }, ZATEN_VAR, RET ISLETIM_SAYAC_GOVDE_GECERSIZ | ISLETIM_SAYAC_GUN_GECERSIZ | ISLETIM_SAYAC_ROL_GECERSIZ. Hesabı silinmiş kişinin gecikmiş öğesi ve ekran süresi tavanını aşan personel öğesi hiçbir tabloya yazılmadan KABUL { uygulandi: false } alır (telefonun kuyruğu boşalır). TEKRAR_DENE dönmez (geçici veritabanı hatasında D06'nın geri dönüş noktası kuralı geçer).",
    sinir: 'govdeEnBuyukBayt 49152 (D06 bu sınırı öğe düzeyinde uygular; şemanın en büyük geçerli gövdesi yaklaşık 35.100 bayt, D06 öğe gövdesi sınırı 65536).',
  },
];

const registrations = [
  "D06.ogeTuruKaydet('telefon_sayaci', telefonSayaciOgesi({ hesapSilindiMi, saat })): isletimEklentisi içinde, kayıt işlevi ve D01'in hesapSilindiMi okuyucusu app.ts'ten seçenekle (altyapı alan modülünü içe aktarmaz).",
  "D01.kimlikOlayiDinleyicisiKaydet(kimlikOlayiDinleyicisi): aynı yol (D01-A14).",
  "D13.rotalariKaydet(app, [canlılık, hazırlık, durum, ekran süreleri]): işlev app.ts'ten seçenekle; rota tanımları packages/contracts/src/isletim.ts ISLETIM_ROTALARI.",
  "D14.isTanimla: worker.ts isletimIsleri(bag) tanımlarını uyarlar (dört pg-boss işi).",
  "D12.saklamaIsleyicisiKaydet: kayıt yok; D15'in 13 aylık silmesi geçici işletim verisidir ve haftalık işte yapılır (D15-B22).",
  "Fastify onReady ve onClose (yalnız surec api ve olcumYazici true; yalnız server.ts true verir, test dünyası ve D13'ün openapi_belgesi_sakla betiği vermez): dakikalık API ölçü dosyası yazıcısı.",
];

const dis_yuz_kullanimi = [
  "D06 (contracts.json): ogeTuruKaydet (app.ts'ten seçenekle); OgeIsleyici, GelenOge, PaketBaglami, OgeSonucu, OGE_SONUCLARI tipleri (packages/contracts/src/esitleme.ts).",
  "D12 (contracts.json): veritabaniKur (server.ts), Veritabani.islem, semaDurumu ve danismaKilidi (eklenti ve işler, parametreyle), tabloYardimcilari ve kisitAdi (tablolar.ts), testVeritabaniHazirla, senaryoOncesiSifirla ve testVeritabaniAdi (kancalar), YedekIsDurumu şeması (packages/contracts/src/veritabani.ts).",
  "D13 (contracts.json): rotalariKaydet (app.ts'ten), rotaTanimla, hataKodlariTanimla, UygulamaHatasi, hataZarfiSemasi, genisleyenEnum ve ortak şemalar (packages/contracts/src/ortak/), PLATFORMLAR ve yayinBilgisiSemasi (packages/contracts/src/api.ts), TUM_ROTALAR (test dünyası), app.ts kurucusu (server.ts, test dünyası).",
  "D14 (contracts.json): isSagligi ve epostaGonder (işlere bag ile), isKuyruguKur, epostaKur ve smtpTasiyicisi (server.ts), sahtePostaKutusu ve test kuyruğu yardımcıları (test dünyası), EPOSTA_TURLERI.",
  "D01 (bileşim kökü yoluyla, D15-A12): kimlikOlayiDinleyicisiKaydet ve hesapSilindiMi okuyucusu (app.ts'ten eklentiye), oturumlariKapat (anahtar-uret oturumlari-kapat).",
  "D07 (bileşim kökü yoluyla, D15-A12): yenidenDegerlendir (yalnız anahtar-uret ele-gecirildi; belgeKid süzgeci D07'den istek).",
  "D03 (sözleşme sabiti, D15-A12): LISTELER_GIZLI_ALANLAR, server.ts'te logOlustur'a ekGizliAdlar.",
  "D04 (bileşim kökü yoluyla, D15-A12): Saat arayüzü simdi() (parametreyle), sistemSaati (server.ts), pgBossSaati (test dünyası).",
  "Bütün modüllerin veri kurucuları: KurucuHaritasi ile (test dünyası); olcum_ görünümleri D01, D02, D03, D05, D06, D07 ve D09 tablolarını yalnız okur (contracts.json istisnası).",
];

// Ayar şeması: [ortam değişkeni, Ayarlar alanı, tip ve kural, varsayılan, süreçler, isteyen]
const ayar_semasi = [
  ['ISLETIM_ORTAM', 'genel.ortam', 'gelistirme | test | hazirlik | uretim', 'yok (zorunlu)', 'hepsi', 'D15'],
  ['ISLETIM_KOPYA_ADI', 'genel.kopyaAdi', '^[a-z0-9-]{1,32}$; süreç türü ortamdan değil ayarlariYukle({ surec }) bağımsız değişkeninden gelir', 'süreç türünün adı', 'api (uretim ve hazirlik zorunlu)', 'D15'],
  ['LOG_DUZEYI', 'genel.logDuzeyi', 'debug | info | warn | error', 'info; gelistirme debug', 'hepsi', 'D15'],
  ['GIZLI_DIZIN', 'genel.gizliDizin', 'mutlak yol', '/run/secrets; gelistirme ./.gizli', 'hepsi', 'D15'],
  ['DURUM_DIZINI', 'genel.durumDizini', 'mutlak yol', '/durum', 'api, isci', 'D15'],
  ['ALAN_ADI', 'genel.alanAdi', 'küçük harf ana makine adı', 'yok', 'isci (sertifika denetimi ve uyarı metni; Caddy kendi ortamından okur)', 'D15'],
  ['PANEL_ADRESI', 'genel.panelAdresi', "https kökeni (yol yok); http yalnız gelistirme", 'yok', 'api', 'D13 (Origin), D01 (çerez)'],
  ['API_PORT', 'api.port', '1..65535', '3000', 'api', 'D13'],
  ['API_DINLEME_ADRESI', 'api.dinlemeAdresi', 'IPv4', '0.0.0.0', 'api', 'D13'],
  ['GUVENILEN_VEKIL_ADRESI', 'api.guvenilenVekilAdresi', 'IPv4; trustProxy yalnız bu adres', 'yok; gelistirme ve test boş (trustProxy kapalı)', 'api (uretim ve hazirlik zorunlu)', 'D13'],
  ['YAYIN_BILGISI_YOLU', 'api.yayinBilgisiYolu', 'mutlak yol', '/app/yayin-bilgisi.json', 'api, isci', 'D13, D07'],
  ['BASKI_OLAY_DONGUSU_GECIKMESI_MS', 'api.baski.olayDongusuGecikmesiMs', '10..10000', '1000', 'api', 'D13'],
  ['BASKI_OLAY_DONGUSU_KULLANIMI_BINDE', 'api.baski.kullanimBinde', "1..1000 (app.ts 1000'e böler)", '980', 'api', 'D13'],
  ['BASKI_BELLEK_BAYT', 'api.baski.bellekBayt', 'kap bellek sınırından küçük', "sınırın yüzde 85'i; sınır yoksa 2147483648", 'api', 'D13'],
  ['KAPANIS_ONCESI_BEKLEME_MS', 'api.kapanisOncesiBeklemeMs', '0..20000', '6000; test 0', 'api', 'D15'],
  ['VERITABANI_SUNUCU', 'veritabani.sunucu', 'ana makine adı', 'postgres', 'hepsi', 'D12'],
  ['VERITABANI_PORT', 'veritabani.port', '1..65535', '5432', 'hepsi', 'D12'],
  ['VERITABANI_ADI', 'veritabani.ad', 'metin', 'yoklama', 'hepsi', 'D12'],
  ['VERITABANI_HAVUZ_BOYUTU', 'veritabani.havuzBoyutu', '1..50', 'api 20, isci 3, goc 2, cli 1', 'hepsi', 'D12'],
  ['VERITABANI_HAVUZ_BEKLEME_MS', 'veritabani.havuzBeklemeMs', '100..60000', 'api 2000, isci 30000', 'hepsi', 'D12'],
  ['EPOSTA_SMTP_SUNUCU', 'eposta.smtpSunucu', 'ana makine adı', 'yok', 'api, isci', 'D14'],
  ['EPOSTA_SMTP_PORT', 'eposta.smtpPort', '1..65535', '587', 'api, isci', 'D14'],
  ['EPOSTA_SMTP_GUVENLIK', 'eposta.smtpGuvenlik', "tls | starttls | yok ('yok' yalnız gelistirme ve test)", 'starttls', 'api, isci', 'D14'],
  ['EPOSTA_SMTP_KULLANICI', 'eposta.smtpKullanici', 'metin; varsa smtp_parolasi sırrı zorunlu', 'boş', 'api, isci', 'D14'],
  ['EPOSTA_GONDEREN_ADRES', 'eposta.gonderenAdres', 'e-posta adresi', 'yok', 'api, isci', 'D14'],
  ['EPOSTA_GONDEREN_AD', 'eposta.gonderenAd', '1..80 karakter', 'yok', 'api, isci', 'D14'],
  ['EPOSTA_URUN_ADI', 'eposta.urunAdi', '1..40 karakter', 'yok', 'api, isci', 'D14'],
  ['EPOSTA_GUNLUK_SINIR', 'eposta.gunlukSinir', '1..100000', 'boş (sınırsız)', 'api, isci', 'D14'],
  ['INCELEME_HOCA_ADRESI', 'kimlik.incelemeHocaAdresi', 'e-posta adresi (alan kuralı D01)', 'yok', 'api, isci', 'D01'],
  ['INCELEME_HOCA_ADI', 'kimlik.incelemeHocaAdi', '1..80 karakter', 'yok', 'api, isci', 'D01'],
  ['INCELEME_OGRENCI_NO', 'kimlik.incelemeOgrenciNo', '^[0-9]{9,10}$; loga girmez', 'yok', 'api, isci', 'D01'],
  ['INCELEME_OGRENCI_ADI', 'kimlik.incelemeOgrenciAdi', '1..80 karakter; loga girmez', 'yok', 'api, isci', 'D01'],
  ['SAAT_ESITLEME_ESIK_MS', 'saat.esitlemeEsikMs', '1..5000', '100', 'api, isci', 'D04'],
  ['SAAT_ESITLEME_DOSYA_YASI_MS', 'saat.esitlemeDosyaYasiMs', '30000..600000', '120000', 'api, isci', 'D04'],
  ['SAAT_ESITLEME_DENETIM_ARALIGI_MS', 'saat.esitlemeDenetimAraligiMs', '1000..60000', '5000', 'api', 'D04'],
  ['ANDROID_PAKET_ADI', 'dogrulama.androidPaketAdi', 'Java paket adı', 'yok', 'api, isci', 'D07'],
  ['ANDROID_IMZA_OZETLERI', 'dogrulama.androidImzaOzetleri', 'virgülle ayrılmış 64 onaltılık karakter', 'yok', 'api, isci', 'D07'],
  ['APP_ATTEST_UYGULAMA_KIMLIGI', 'dogrulama.appAttestUygulamaKimligi', '^[A-Z0-9]{10}[.][A-Za-z0-9.-]+$', 'yok', 'api, isci', 'D07'],
  ['IPTAL_LISTESI_ADRESI', 'dogrulama.iptalListesiAdresi', 'https adresi', 'https://android.googleapis.com/attestation/status', 'isci', 'D07'],
  ['DEVAM_SAYIM_TABANI', 'devam.sayimTabani', 'YAPILAN (ilk sürümde tek değer; PLANLANAN plan.html#acik-sayim-tabani kararına bağlı)', 'YAPILAN', 'api, isci', 'D08'],
  ['DUZELTMELER_PARTI_BOYU', 'duzeltmeler.partiBoyu', '1..200', '20', 'isci', 'D09'],
  ['ASAMA2_QR_ACIK', 'asama2.qrAcik', "true | false; D02 ile D11'in ortak tek Aşama 2 QR bayrağı (app.ts derslerEklentisi'ne qrDersAyariAcik, D11 eklentisine verir)", 'false', 'api, isci', 'D02, D11'],
  ['ISLETIM_UYARI_ALICILARI', 'isletim.uyariAlicilari', 'virgülle ayrılmış e-posta adresleri, 1..5', 'yok (uretim ve hazirlik zorunlu)', 'isci', 'D15'],
  ['ISLETIM_SERTIFIKA_TURU', 'isletim.sertifikaTuru', 'acme | elle', 'acme', 'isci', 'D15'],
  ['ISLETIM_CADDY_ADRESI', 'isletim.caddyAdresi', 'ana makine:port', 'caddy:443', 'isci', 'D15'],
  ['ISLETIM_SERTIFIKA_KOK_DOSYASI', 'isletim.sertifikaKokDosyasi', "mutlak yol, PEM kök sertifikaları; verilirse sertifika denetimi zinciri yalnız bu köklerle doğrular; uretim ortamında verilirse ISLETIM_AYAR_GECERSIZ", "boş (Node'un sistem kökleri); hazirlik /app/src/infra/izleme/le-deneme-kokleri.pem (Let's Encrypt deneme kökleri)", 'isci', 'D15'],
];

// Sırlar matrisi: [sır adı, tür, servisler, kullanan]
const sirlar = [
  ['saat_belgesi', 'anahtar kümesi (gizliAnahtarDosyasiSemasi)', 'api-1, api-2, isci', 'D04 (üretme ve doğrulama; işçide yeniden değerlendirme)'],
  ['qr_anahtar_kaynagi', 'anahtar kümesi', 'api-1, api-2, isci', 'D11'],
  ['giris_kodu_ozeti', 'anahtar kümesi', 'api-1, api-2', 'D01'],
  ['eposta_ozeti', 'anahtar kümesi', 'api-1, api-2, isci', 'D14 (bileşim kökünde epostaKur)'],
  ['ulasma_makbuzu', 'anahtar kümesi', 'api-1, api-2', 'D06'],
  ['inceleme_sabit_kodu', 'tek değer', 'api-1, api-2', 'D01'],
  ['smtp_parolasi', 'tek değer (EPOSTA_SMTP_KULLANICI varsa)', 'api-1, api-2, isci', 'D14'],
  ['kalp_atisi', "JSON { normalAdres, sorunAdres | null } (kalpAtisiSirriSemasi)", 'isci', 'D15'],
  ['yoklama_api_parolasi', 'tek değer (D12 Compose parçası)', 'api-1, api-2, goc (kurulum adımı parolayı yeniler)', 'D12'],
  ['yoklama_isci_parolasi', 'tek değer (D12)', 'isci, goc', 'D12'],
  ['yoklama_sahip_parolasi, postgres_parolasi', 'tek değer (D12)', 'goc', 'D12 (kurulum adımı rolleri ve parolaları yeniler)'],
  ['xprem_parolasi', 'tek değer (D12)', 'goc, xprem', 'D12 (rol), D15 (xprem işletimi)'],
  ['xprem ana anahtarı', 'tek değer; xprem dosyadan okuyabiliyorsa sır, okuyamıyorsa 0600 env_file (teknik.html#dagitim-ayrinti-korunacak-anahtarlar)', 'xprem', 'D15 (işletim), D12 (yedek)'],
];

const olcum_gorunumleri = [
  ['olcum_gonderme_suresi', 'yoklama_kayitlari (D05), cihazlar (D01)', 'gun (hesaplanan_ani İstanbul günü), platform, kayit_sayisi, gun_icinde_ulasan, oran_binde', "Gönderme hedefi: ulasma_ani - hesaplanan_ani <= 24 saat; hedef oran_binde >= 950."],
  ['olcum_saat_dogrulanamayan', 'yoklama_kayitlari, cihazlar', 'gun, platform, saat_sebebi, kayit_sayisi, dogrulanamayan, oran_binde', "etiket_saat_dogrulanamadi; Android ve iPhone ayrı, sebep dağılımı (plan.html#gun-zayif-nokta); hedef oran_binde <= 20."],
  ['olcum_isaretsiz_kabul', 'yoklama_kayitlari, oturum_isaretleri (D07)', 'donem_id, gun, payda, pay, oran_binde, cihaz_dogrulanmadi, ikinci_profil, qrsiz', "Payda ilk_kesin_karar VAR ya da INCELEMEDE; pay ilk_kesin_karar VAR, etiket_saat_dogrulanamadi false ve oturumda KAFA_SAYISI_ASIMI satırı yok; üç etiket ayrı sayı; hedef oran_binde >= 980."],
  ['olcum_kafa_sayisi_asimi', 'oturumlar (D02), oturum_isaretleri', 'donem_id, gun (oturumlar.tarih), kafa_sayisi_girilen, asim_isaretli, asimsiz_oran_binde', 'Kafa sayısı girilmiş ve yapıldı oturumlardan işaretsizlerin oranı; hedef >= 950.'],
  ['olcum_hoca_isi', 'hoca_ekran_sureleri (D15), oturumlar, dersler (D02)', 'donem_id, birim_id, hafta, oturum_sayisi, ortanca_saniye, p90_saniye', "Kafa sayısı girilmiş oturumlarda yalnız dersin sahibinin (dersler.sahip_kisi_id) satırları toplanır; percentile_disc ile tam sayı; hoca başına sütun yok; hedef ortanca <= 120."],
  ['olcum_kayit_kaybi', 'gonderim_defteri, kurulumlar (D06)', 'gun, makbuzla_yeniden_gelen, acik_boslukli_kurulum, bosluk_ilerleme_saati (saat kovası), eksik_sira_toplam', "Makbuzla yeniden gelen: kabul_ani < ilk_gorulme_ani; 24 saatten eski boşluk sorguda saat kovasından seçilir (görünüm now() kullanmaz)."],
  ['olcum_telefon_sayaclari', 'telefon_sayaclari (D15)', 'gun, platform, uygulama_surumu, kurulum_sayisi, gonderilmemis_kayit_toplam, gonderilmemis_kayitli_kurulum, basarisiz_deneme_toplam, bildirim_izni_var, bildirim_izni_bildiren, yerel_modul_cokmesi_toplam, ic_sayac_okuma_hatasi_toplam, bilinmeyen_sonuc_toplam', 'Telefonun gördüğü sayılar (plan.html#kararlar-olcum); kişi ve kurulum kimliği çıktıda yok.'],
  ['olcum_ekran_hatalari', 'telefon_sayaclari', 'gun, platform, uygulama_surumu, tur, ekran, toplam, kurulum_sayisi', 'ekran_hatalari dizisinin açılmış hali.'],
  ['olcum_ret_kodlari', 'telefon_sayaclari', 'gun, platform, uygulama_surumu, http, kod, toplam, kurulum_sayisi', 'Tek başına da reddedilen kayıtların kodları (plan.html#kararlar-yeniden-deneme); yeni kod uyarısı bunun üstünde.'],
  ['olcum_benimseme', 'liste_satirlari (D03), yoklama_kayitlari, oturumlar, dersler', 'donem_id, ders_id, hafta, liste_ogrenci, kayit_veren_ogrenci, yapilan_oturum, kayit_alan_oturum, kafa_sayisi_girilen_oturum, etkin_hoca (hafta toplamı)', 'Liste ile hesap eşleştirilmez (numara birleşimi yok): kayıt veren öğrenci kayıtlardaki ayrık ogrenci_id sayısıdır; hedef değerleri D15-A06.'],
];

// Uyarı türleri kataloğu (UYARI_TURLERI): [tür, anahtar, seviye, kapanma, koşul, kaynak]
const uyari_kurallari = [
  ['isletim.disk_doluluk', 'bağlama noktası', 'UYARI >= yüzde 80; KRITIK >= yüzde 90', 'KOSUL', 'makine.json diskler', 'makine_denetimi'],
  ['isletim.bellek_az', '', 'UYARI', 'KOSUL', 'kullanılabilir bellek yüzde 10 altı', 'makine_denetimi'],
  ['isletim.kap_yeniden_basladi', 'servis', 'UYARI', 'SESSIZLIK', 'yeniden başlama artışı > 0', 'makine_denetimi'],
  ['isletim.kap_bellek_tasti', 'servis', 'KRITIK', 'SESSIZLIK', 'OOMKilled', 'makine_denetimi'],
  ['isletim.kap_calismiyor', 'servis', 'KRITIK', 'KOSUL', "durum running değil (goc ve yedek hariç)", 'makine_denetimi'],
  ['isletim.makine_denetimi_sessiz', '', 'UYARI', 'KOSUL', 'makine.json 25 dakikadan eski ya da okunamıyor', 'isletim_denetimi'],
  ['isletim.saat_esitleme', '', 'KRITIK', 'KOSUL', 'chrony.json okunamıyor, senkron değil, sapma eşik üstü, dosya eski ya da sonBozukAni son 10 dakikada', 'saat_esitleme_izleme'],
  ['isletim.wal_arsivi', '', 'KRITIK (son deneme başarısız); UYARI (son başarı 60 dk eski)', 'KOSUL', 'pg_stat_archiver', 'isletim_denetimi'],
  ['isletim.baglanti_sayisi', '', 'UYARI >= 80; KRITIK >= 90', 'KOSUL', 'pg_stat_activity istemci bağlantıları', 'isletim_denetimi'],
  ['isletim.yedek_basarisiz', 'iş', 'KRITIK', 'KOSUL', 'D12 durum dosyasında son sonuç başarısız', 'D12 makine işleri'],
  ['isletim.yedek_eski', 'iş', 'KRITIK (döküm, pgBackRest, xprem birimi > 26 saat); UYARI (doğrulama > 8 gün, geri yükleme denemesi > 35 gün)', 'KOSUL', 'D12 durum dosyası son başarı anı', 'D12 makine işleri'],
  ['isletim.yedek_durumu_okunamadi', 'iş', 'UYARI', 'KOSUL', 'durum dosyası yok ya da YedekIsDurumu şemasına uymuyor', 'isletim_denetimi'],
  ['isletim.pgboss_sema', '', 'KRITIK', 'KOSUL', 'isSagligi.semaSurumu beklenen ile bulunan farklı', 'D14.isSagligi'],
  ['isletim.olu_mektup', 'kuyruk', 'UYARI', 'KOSUL', 'oluMektup > 0', 'D14.isSagligi'],
  ['isletim.is_sessiz', 'kuyruk', 'KRITIK (aralık <= 900 sn); UYARI (daha seyrek)', 'KOSUL', 'zamanlamalı işte sonBasariAni, 2 x beklenenAralikSaniye + 600 saniyeden eski', 'D14.isSagligi'],
  ['isletim.kuyruk_birikti', 'kuyruk', 'UYARI', 'KOSUL', 'enEskiBekleyenSaniye > 900', 'D14.isSagligi'],
  ['isletim.eposta_basarisiz', '', 'KRITIK', 'KOSUL', 'ardisikBasarisiz >= 3', 'D14.isSagligi'],
  ['isletim.eposta_yarim', '', 'UYARI', 'KOSUL', 'yarimKalan > 0', 'D14.isSagligi'],
  ['isletim.eposta_gunluk_sinir', '', 'UYARI', 'KOSUL', 'son24SaatGonderilen >= gunlukSinir x 0,8', 'D14.isSagligi'],
  ['isletim.devam_tutarlilik_farki', '', 'UYARI', 'KOSUL', 'devam_tutarlilik_denetimi son çıktısında farkSayisi > 0 (D08-A08)', 'D14.isSagligi sonCikti'],
  ['isletim.api_5xx', '', 'UYARI', 'KOSUL', 'son 10 dakikada 503 dışı 5xx >= 20', 'API ölçü dosyaları'],
  ['isletim.api_503', '', 'UYARI', 'KOSUL', '503 oranı >= yüzde 5 ve toplam >= 200', 'API ölçü dosyaları'],
  ['isletim.gonderim_yavas', '', 'UYARI', 'KOSUL', 'gönderim p95 >= 2000 ms ve adet >= 100', 'API ölçü dosyaları'],
  ['isletim.api_olcum_yok', '', 'UYARI', 'KOSUL', '5 dakikadan yeni API ölçü dosyası yok', 'API ölçü dosyaları'],
  ['isletim.sertifika_bitiyor', '', 'UYARI (acme 14, elle 30 gün); KRITIK (7 gün)', 'KOSUL', 'kalan gün', 'sertifika_bitis_denetimi'],
  ['isletim.sertifika_gecersiz', '', 'KRITIK', 'KOSUL', 'zincir ya da ad doğrulanamadı', 'sertifika_bitis_denetimi'],
  ['isletim.yeni_ret_kodu', "'<http>:<kod>'", 'UYARI', 'SESSIZLIK', 'son 15 dakikadaki sayaçlarda son 28 günde görülmemiş kod', 'telefon_sayaclari'],
  ['isletim.makbuzlu_kayit_yeniden_geldi', '', 'UYARI', 'SESSIZLIK', 'son 24 saatte olcum_kayit_kaybi.makbuzla_yeniden_gelen > 0', 'olcum_kayit_kaybi'],
  ['<başka modül>.<olay>', 'çağıranın', 'çağıranın (varsayılan UYARI)', 'SESSIZLIK', "uyariAc çağrısı (ör. dogrulama.iptal_listesi_eski, kimlik.inceleme_ayari_eksik)", 'D01, D07'],
];

const compose_servisleri = [
  ['caddy', 'prod', 'ghcr.io/<depo>/iu-yoklama-caddy@<özet> (apps/server/Dockerfile hedef caddy)', 'onyuz (172.30.11.10 sabit)', '80, 443/tcp, 443/udp yayımlar; birimler caddy-veri (/data), caddy-ayar (/config); restart unless-stopped; read_only, tmpfs /tmp'],
  ['api-1, api-2', 'prod', 'ghcr.io/<depo>/iu-yoklama-sunucu@<özet> (hedef sunucu); komut node src/server.ts', 'onyuz, veritabani', 'TZ=UTC, init, user node, read_only, cap_drop ALL, no-new-privileges; mem_limit 1g; stop_grace_period 30s; sağlık /health/live (10 sn, 3 deneme, start_period 60 sn); /durum/saat salt okunur, api-durum birimi /durum/api; depends_on goc tamamlandı ve postgres sağlıklı'],
  ['isci', 'prod', 'aynı sunucu imajı; komut node src/worker.ts (D14)', 'onyuz (caddy:443 sertifika denetimi için), veritabani; dışarı çıkış açık', 'TZ=UTC, init, user node, read_only; mem_limit 512m; stop_grace_period 40s (D14); /durum/saat, /durum/makine, /durum/veritabani ve api-durum salt okunur'],
  ['goc', 'prod', 'aynı sunucu imajı; komut node --run db:migrate', 'veritabani', "tek seferlik (restart no); yayın betiği docker compose run --rm goc ile çalıştırır; api ve isci service_completed_successfully bekler"],
  ['xprem', 'prod', 'xprem imajı docker/xprem/surum.env özetiyle (cosign verify sonrası)', 'onyuz, veritabani', 'DISABLE_TELEMETRY=true; xprem-dosyalari birimi (D12 gece yedekler); yönetim paneli portu yayımlanmaz, yalnız SSH tüneli; restart unless-stopped; havuzu destekliyorsa 10 bağlantı'],
  ['mailpit', 'dev', 'axllent/mailpit sürüm sabit', 'varsayılan', 'yalnız 127.0.0.1:1025 ve 127.0.0.1:8025 (teknik.html#kod-gelistirme-ortami)'],
  ['postgres, postgres-test, yedek', 'profilsiz, test, yedek', 'D12 Compose parçası (include: docker/postgres/compose.yaml)', 'veritabani (172.30.12.0/24, D12)', 'D12; bütün servislerde logging local, API kopyalarında max-size 100m ve max-file 10, öbürlerinde 50m ve 5'],
];

const caddy_yollari = [
  ['/health/*', 'respond 404', 'Sağlık uçları dışarıya kapalı.'],
  ['/v1 ve /v1/*', 'reverse_proxy api-1:3000 api-2:3000', "lb_policy header X-Kurulum-Kimligi (yoksa rastgele); lb_try_duration 5s; etkin sağlık /health/live, 2 sn aralık, 1 sn zaman aşımı, 2 başarısızlık ve 2 başarı; transport keepalive 60s, dial_timeout 2s, response_header_timeout 25s. Güvenlik başlıkları API'de helmet'in (D13)."],
  ['/guncelleme/*', 'reverse_proxy xprem', "Yalnız xprem'in güncelleme protokolü ve yayın API'si önekleri iletilir (ilk kurulumda xprem belgesinden yazılır); yönetim paneli yolu iletilmez, CI Caddy senaryosu denetler."],
  ['/gizlilik', 'file_server /srv/sayfalar/gizlilik.html', 'İçerik sahibin kararı (plan.html#acik-gizlilik-politikasi); API düşse de açılır.'],
  ['/hesap-silme', 'file_server /srv/sayfalar/hesap-silme.html', 'Dosya D01\'in, sunma D15\'in.'],
  ['/assets/*', 'file_server /srv/panel', 'Cache-Control public, max-age=31536000, immutable; eksik dosya 404 (teknik.html#panel-sunulma).'],
  ['diğer her yol', 'try_files {path} /index.html; file_server /srv/panel', "Cache-Control no-cache; CSP, Permissions-Policy, Referrer-Policy, nosniff, HSTS (D15-B05)."],
  ['genel', 'encode zstd gzip; request_body max_size 4MB; -Server', "Sunucu zaman aşımları: read_header 10s, read_body 30s, idle 2m. Erişim logu kapalı, hata logu stderr. İstemci adres başlıkları yok sayılır; ağ geçidi varsa yalnız GUVENILEN_AG_GECIDI'nin ISTEMCI_ADRES_BASLIGI'na güvenilir."],
];

const yuk_testi = {
  tetikler: [
    'Ders çıkışı yük testi: ilk yayından önce; her dönem başından önce; gönderim, saat belgesi, kimlik ya da yoklama şemasına dokunan sunucu yayınından önce; Fastify, PostgreSQL, Node ya da Drizzle büyük sürüm geçişinden önce.',
    'Haftalık işin elle koşusu: her sunucu yayınından önce.',
    'Android 7.0 emülatörü ve güncel Android denemesi: her mağaza ve APK sürümünde, sertifika sağlayıcısı değişince.',
    'xprem denemesi (imzalı yayın, yüzde, geri alma, bozuk imza reddi): ilk derlemede ve her Expo SDK yükseltmesinde.',
  ],
  profiller: [
    'Ders başı: 20.000 telefon, 60 saniyeye yayılmış sabit geliş; telefon başına saat belgesi ve tek kayıtlık gönderim.',
    'Ders çıkışı (en kötü durum): 20.000 telefon 1 dakikada; saat belgesi, gönderim (paket başına 1 ile 6 kayıt, yüzde 5\'i 200 kayıt), yüzde 30\'u değişenler; aynı anda 50 hoca ders raporu ve AKSİS özeti.',
    'Gece: 5.000 iPhone arka plan gönderimi 30 dakikaya yayılmış; gece işleri aynı pencerede elle tetiklenir.',
    'Giriş yığılması: 300 hoca 2 dakika içinde kod ister ve girer (D14 testi); e-posta hazırlık ortamında yerel kutuya.',
  ],
  olcutler: [
    'POST /v1/esitleme/gonderim: p95 < 1000 ms, p99 < 3000 ms (D06).',
    'POST /v1/saat/belge: p95 < 100 ms, p99 < 300 ms (D04).',
    '503 dışı 5xx: 0. 503: yüzde 2 altı ve hepsi Retry-After\'lı (D06, D13). 429: 0 (D13).',
    'Makbuzlu (KABUL ya da ZATEN_VAR almış) her kayıt sunucuda tam bir kez (sonrasi-denetim.ts, plan.html#hedefler).',
    'pg_stat_activity en çok 80 bağlantı; havuz bekleme p99 < 2 s; havuz dolu oranı yüzde 1 altı (D12).',
    'AKSİS özeti ve ders raporu ders çıkışı sürerken p95 <= 2 s, gönderim p95 raporsuz koşudan en çok yüzde 10 kötü (D10).',
    'devam_hesapla gecikmesi p95 <= 5 dakika yük altında, olağan saatte <= 30 saniye (D08).',
    'Oturum kancası süresi istek süresinin p95\'te yüzde 10\'unu geçmez (D01); D02 değişenler kaynağı p95 < 15 ms (D02).',
    'Kayıt başına veritabanı gidiş dönüşü, 100.000 kayıt başına tablo ve dizin boyutu ve zarf boyu dağılımı rapora yazılır (D05, teknik.html#veritabani-donem-alani).',
  ],
};

const tehdit_modeli = {
  varliklar: 'İmzalı yoklama kayıtları ve denetim kaydı; saat belgesi, QR, giriş kodu özeti, e-posta özeti ve ulaşma makbuzu anahtarları; oturum anahtarı özetleri; xprem güncelleme imza anahtarı ve yayın anahtarı; veritabanı ve yedekleri; SSH erişimi; CI sırları (cosign, xprem yayın anahtarı).',
  saldirganlar: 'Toplu hile isteyen öğrenci (plan.html#hile); dışarıdan saldırgan; ele geçmiş hoca hesabı; kötü niyetli yönetici; tedarik zinciri (npm, imaj, eylem); BİDB içinden ya da hipervizörden erişim.',
  sinirlar: 'İnternet ile Caddy; Caddy ile API (iç ağ, trustProxy yalnız Caddy); API ile PostgreSQL (rol ve yetki, D12); CI ile GHCR ve xprem (onaylı ortam); sahip ile SSH; makine ile dış izleme hizmeti (yalnız gövdesiz istek).',
  onlemler: 'Cihaz imzası ve ikinci çapa (plan.html#gun-ikinci-capa); tek etkenli giriş sınırları (plan.html#kararlar-tek-etkenli-giris); hız sınıfları ve aşırı yük (teknik.html#sunucu-guvenlik); Origin ve çerez kuralı (teknik.html#sunucu-kimlik); gizli anahtar ayrımı ve kid (teknik.html#sunucu-ayarlar); imzalı imaj ve özetle çekme (D15-B11); bağımlılık beklemesi ve denetimi (teknik.html#temel, teknik.html#altyapi-guncellemeler); onaylı OTA yayını ve gece denetimi (D15-B31); log gizliliği (teknik.html#sunucu-ayarlar); yedek ve geri yükleme denemesi (teknik.html#veritabani-yedek).',
  kabul_edilen_riskler: 'Güncelleme imzası sunucuda atılır: sunucuyu ya da yayın anahtarını ele geçiren bütün telefonlara kod gönderebilir (teknik.html#dagitim-ayrinti-xprem-guvenligi), gece denetimi ve etiketler yalnız fark eder. Hoca girişi tek etkenlidir (plan.html#kararlar-tek-etkenli-giris). Sunucu yurt dışına açıktır, coğrafi engel konamaz (plan.html#kararlar-inceleme-hesaplari). Sanal disk ve hipervizör BİDB\'nin elindedir (D15-A01). Bellekteki hız sınırları kopya sayısı katı geniştir (plan.html#teknoloji-sunucu-yeri).',
};

const olay_mudahalesi = [
  ['Saat belgesi, QR ya da ulaşma makbuzu anahtarı sızdı', "anahtar-uret ele-gecirildi --amac <amaç> --kid <kid> --yeni-kid <yeni>; yayinla.sh --yeniden-baslat; o kid'le belgelenmiş ve şüphe anından sonra ulaşan kayıtlar D04 işaretiyle D07'de İncelemede; çevrimdışı yedek yenilenir."],
  ['Giriş kodu ya da e-posta özeti anahtarı sızdı', 'anahtar-uret dondur ile hemen değiştir, kopyaları sırayla yeniden başlat; yalnız 5 dakikalık kodlar ve e-posta sayaçları düşer (teknik.html#dagitim-ayrinti-korunacak-anahtarlar).'],
  ['Hoca hesapları ele geçti şüphesi', 'anahtar-uret oturumlari-kapat --tur personel (D01.oturumlariKapat, her oturum için denetim kaydı); hocalar e-posta koduyla yeniden girer.'],
  ['xprem yayın anahtarı ya da CI şüphesi', "ota-yayin ortamındaki anahtar xprem'de iptal edilip yenilenir; ota_yayin_denetimi elle koşturulur; etiketsiz güncelleme xprem panelinden (SSH tüneli) geri alınır; sahibin GitHub oturumları kapatılır."],
  ['Sunucu ele geçti şüphesi', "Makine temiz imajla yeniden kurulur; bütün sırlar yeniden üretilir (saat belgesi ve QR için ele-gecirildi); veritabanı şüpheden önceki âna PITR ile döner (D12); telefonlar sonraki kayıtları yeniden gönderir (plan.html#gun-kenar-durumlar); xprem imza anahtarı da değiştirilir ve yeni uygulama sürümü gerekir."],
  ['SSH anahtarı kayboldu ya da sızdı', 'Anahtar authorized_keys\'ten çıkarılır, ikinci donanım anahtarıyla girilir (D15-A10); sızıntıda sunucu şüphesi adımları uygulanır.'],
];

const hata_kodlari = [
  ['ISLETIM_KAPANIYOR', '503', '/health/live, /health/ready, /v1/durum', 'Süreç kapanıyor; Caddy kopyayı devreden çıkarır.'],
  ['ISLETIM_HAZIR_DEGIL_VERITABANI', '503', '/health/ready', 'Veritabanına ulaşılamadı ya da 2 saniyede cevap yok.'],
  ['ISLETIM_HAZIR_DEGIL_SEMA', '503', '/health/ready', 'İmajdaki son göç defterde yok ya da nesil belirsiz.'],
  ['ISLETIM_GUN_ARALIK_DISI', '400', 'POST /v1/isletim/ekran-sureleri', 'Gün ileri tarihli ya da 14 günden eski.'],
  ['ISLETIM_SURE_GECERSIZ', '400', 'POST /v1/isletim/ekran-sureleri', 'Çift (oturum, ekran) ya da toplam 86400 saniye üstü.'],
  ['ISLETIM_SAYAC_GOVDE_GECERSIZ', 'öğe RET', 'telefon_sayaci', 'Gövde JSON değil ya da şemaya uymuyor.'],
  ['ISLETIM_SAYAC_GUN_GECERSIZ', 'öğe RET', 'telefon_sayaci', 'Gün ulaşma gününden 1 günden fazla ileri ya da 395 günden eski.'],
  ['ISLETIM_SAYAC_ROL_GECERSIZ', 'öğe RET', 'telefon_sayaci', 'Öğrenci paketinde ekran süresi.'],
  ['ISLETIM_AYAR_GECERSIZ', 'süreç', 'ayarlariYukle', 'Eksik ya da hatalı ayar veya sır; süreç çıkış kodu 78.'],
  ['ISLETIM_AYARLAR_YUKLENMEDI', 'süreç', 'ayarlar()', 'Programlama hatası: ayarlar yüklenmeden okundu.'],
  ['ISLETIM_AYARLAR_ZATEN_YUKLU', 'süreç', 'ayarlariYukle', 'Farklı girdiyle ikinci yükleme.'],
  ['ISLETIM_SAAT_DILIMI', 'süreç', 'ayarlariYukle', 'Süreç saat farkı 0 değil (TZ=UTC değil).'],
  ['ISLETIM_BASKI_BELLEK_SINIRI', 'süreç', 'ayarlariYukle', 'BASKI_BELLEK_BAYT kap sınırından küçük değil.'],
  ['ISLETIM_GIZLI_ANAHTAR_YOK', 'süreç', 'gizliAnahtar', 'Amaç bu sürece yüklenmemiş.'],
  ['ISLETIM_UYARI_GECERSIZ', 'süreç', 'uyariAc', 'Tür, anahtar ya da metin kuralı tutmuyor.'],
  ['ISLETIM_YUK_TOHUMU_YASAK', 'süreç', 'test/yuk/tohum.ts', 'Tohum betiği uretim ortamında çalıştırıldı.'],
  ['ISLETIM_SEMA_GERIDE', 'süreç', 'server.ts açılışı', 'Veritabanı imajın beklediği göçün gerisinde; süreç açılmaz.'],
  ['API_UC_BULUNAMADI, API_ISTEK_GECERSIZ, API_KIMLIK_GEREKLI, API_ROL_YETKISIZ, API_KOKEN_GECERSIZ, API_GOVDE_COK_BUYUK, API_ICERIK_TURU, API_HIZ_SINIRI, API_SUNUCU_YOGUN', 'D13', 'bütün D15 rotaları (örtük)', 'D13\'ün kök kodları.'],
];

const istekler = [
  ['D13', "app.ts isletimEklentisi'ni rotalariKaydet, D06.ogeTuruKaydet, D01.kimlikOlayiDinleyicisiKaydet, veritabani, saat ve surec ile kaydeder; logger olarak D15'in log'unu (logOlustur sonucu) verir; apiKur ayarlarını D15 ayarlarından eşler (panelAdresi, baski, guvenilenVekilAdresi, yayinBilgisiYolu)."],
  ['D14', "worker.ts: ayarlariYukle({ surec: 'isci' }), logOlustur, isletimIsleri(bag) tanımlarını isTanimla'ya uyarlar; IsSagligi zamanlama girdisine sonCikti; isletim_ozeti e-posta türü; testte deleteAllJobs yardımcısı; çizelge güncellemesi (D15-A12)."],
  ['D12', 'olcum_ önekli görünüm göçleri D15 adıyla (<UTC>_isletim_<açıklama>) ve başka tabloları okuyabilir; yoklama_isci pg_monitor üyesi (kararlı); YedekIsDurumu dosyaları /var/lib/iu-yoklama/durum/veritabani/<iş>.json.'],
  ['D06', "PaketBaglami'na hesapSilinmis (gecikmiş sayaç paketi silinmiş hesaba yeniden bağlanmasın); telefon_sayaci için govdeEnBuyukBayt 16384."],
  ['D01', 'kimlikOlayiDinleyicisiKaydet ve oturumlariKapat dış yüzleri (D01-A14); inceleme ayarları D15 şemasında hazır.'],
  ['D07', "KID_BILINMIYOR için 'anahtar emekli' gerekçesi; iptal listesi ve App Attest yenileme uyarılarında uyariAc türleri dogrulama.* önekiyle."],
  ['D05', "olcum_ görünümleri ilk_kesin_karar, etiket_* ve hesaplanan_ani sütunlarını okur; bu sütunlar kaldırılacaksa önce görünüm güncellenir (önce genişlet, sonra daralt)."],
  ['Telefon uygulaması (harita dışı)', "telefon_sayaci gövde kuralları (sıfır gün gönderilmez, haftada en az bir paket, çok oturumlu ekranda eşit bölme, 60 saniye boşta durma); her uygulama yayınında eski sürüm istek örnekleri (D15-B32)."],
  ['Panel (harita dışı)', 'Ekran süreleri birikmiş toplamla, en çok 5 dakikada bir ve sayfa gizlenirken; istemciKimligi yerel depoda.'],
];

const surec_akisi = [
  "1. ayarlariYukle({ surec: 'api' }); hata varsa stderr'e yalnız ad listesi, çıkış kodu 78.",
  "2. logOlustur({ ayarlar, ekGizliAdlar: LISTELER_GIZLI_ALANLAR (D03) }); saat = sistemSaati() (D04).",
  "3. veritabani = veritabaniKur({ adres, parola: yoklama_api_parolasi, rol: 'yoklama_api', havuzBoyutu: 20, havuzBeklemeMs: 2000, uygulamaAdi: 'iu-yoklama-' + kopyaAdi }) (D12); semaDurumu hazir dönene kadar en çok 120 saniye bekle (ulasilamiyor ve nesil_belirsiz beklenir; geride hemen çıkış 1, ISLETIM_SEMA_GERIDE).",
  "4. isKuyrugu = isKuyruguKur({ rol: 'api', veritabani, saat, log }) ve eposta = epostaKur({ tasiyici: smtpTasiyicisi(...), ozetAnahtari: gizliAnahtar('eposta_ozeti').deger, ... }) (D14), app.ts'ten önce.",
  "5. app = app.ts kurucusu ({ ayarlar, log, veritabani, saat, isKuyrugu, eposta, ... }) (D13); bütün eklentiler, D15'inki dahil; app.ready().",
  "6. app.listen({ host: API_DINLEME_ADRESI, port: API_PORT }).",
  "7. SIGTERM ya da SIGINT: kapanisiBaslat(); KAPANIS_ONCESI_BEKLEME_MS bekle; app.close(); eposta.kapat(10000); isKuyrugu.durdur(); veritabani.kapat(); log flush; çıkış 0. İkinci sinyal ya da 25 saniye aşımı çıkış 1.",
  "8. unhandledRejection ve uncaughtException: hata sınıfı ve yığın fatal düzeyde loglanır (değer yok), flush, çıkış 1; Docker yeniden başlatır.",
];

const dosya_semalari = [
  ['chrony.json (/durum/saat)', '{ bicim: 1, olcumAni: ISO, senkron: boolean, sapmaMs: tam sayı >= 0, katman: 1..16 | null, kaynak: en çok 64 karakter | null, sonBozukAni: ISO | null }', 'saat_esitleme_izleme yazar; D04 ve D15 okur.'],
  ['makine.json (/durum/makine)', '{ bicim: 1, olcumAni, diskler: [{ bagla, toplamBayt, kullanilanBayt }], bellek: { toplamBayt, kullanilabilirBayt }, kaplar: [{ servis, durum, saglik | null, yenidenBaslamaSayisi, yenidenBaslamaArtisi, bellekTasti, baslamaAni }] }', 'makine_denetimi yazar; isletim_denetimi okur.'],
  ['<kopya>.json (/durum/api)', "{ bicim: 1, kopya, yazmaAni, dakikalar: [{ dakika, toplam, besYuzDis, servisYok, hizSiniri, gonderim: { adet, kovalar: 15 sayı (25, 50, 100, 200, 300, 500, 750, 1000, 1500, 2000, 3000, 5000, 10000, 20000 ms ve üstü) } }] (son 15 dakika) }; sağlık uçları ve /v1/durum sayılmaz", 'Her API kopyası dakikada bir yazar; isletim_denetimi okur.'],
  ['<iş>.json (/durum/veritabani)', "D12'nin YedekIsDurumu şeması (packages/contracts/src/veritabani.ts)", 'D12 makine işleri yazar; isletim_denetimi okur.'],
  ['<amaç>.json (Compose sırrı)', '{ bicim: 1, amac, etkinKid, anahtarlar: [{ kid: ^[a-z0-9-]{1,8}$, deger: base64 32 bayt, durum: ETKIN | YALNIZ_DOGRULAMA | ELE_GECIRILDI, olusturmaAni, emeklilikAni? }] (1..4) }; tam bir ETKIN ve etkinKid ona eşit', 'anahtar-uret yazar; ayarlariYukle okur.'],
];

module.exports = {
  queue_items, registrations, dis_yuz_kullanimi, ayar_semasi, sirlar, olcum_gorunumleri, uyari_kurallari,
  compose_servisleri, caddy_yollari, yuk_testi, tehdit_modeli, olay_mudahalesi, hata_kodlari, istekler, surec_akisi, dosya_semalari,
};
