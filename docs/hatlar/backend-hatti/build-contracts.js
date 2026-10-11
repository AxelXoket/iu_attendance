// Builds contracts.json from the arbitration decisions below plus the 15 inventories.
// Usage: node build-contracts.js  -> contracts.json (then run node contracts-validate.js)
const fs = require('fs'), path = require('path');
const D = __dirname;
const inv = fs.readdirSync(path.join(D, 'inv')).filter(f => /^D\d\d\.json$/.test(f)).sort().map(f => JSON.parse(fs.readFileSync(path.join(D, 'inv', f), 'utf8')));
const domains = JSON.parse(fs.readFileSync(path.join(D, 'domains.json'), 'utf8'));
const title = Object.fromEntries(domains.map(d => [d.id, d.tr]));
const norm = s => String(s).toLowerCase().replace(/[^a-z0-9_/{}:]/g, '');

// ---------- modules ----------
const NAME = { D01: 'kimlik', D02: 'dersler', D03: 'listeler', D04: 'saat', D05: 'yoklama', D06: 'esitleme', D07: 'dogrulama', D08: 'devam', D09: 'duzeltmeler', D10: 'raporlar', D11: 'projeksiyon', D12: 'veritabani', D13: 'api', D14: 'is-kuyrugu', D15: 'isletim' };
const INFRA = { D12: 'apps/server/src/infra/veritabani/', D13: 'apps/server/src/infra/api/', D14: 'apps/server/src/infra/is-kuyrugu/', D15: 'apps/server/src/infra/izleme/' };

const TABLES = {
  D01: ['kisiler', 'personel_rolleri', 'giris_kodlari', 'eposta_giris_durumlari', 'giris_oturumlari', 'ogrenci_hesaplari', 'cihazlar', 'cihaz_anahtarlari', 'cihaz_degisim_talepleri', 'kayit_kodlari', 'hesap_silme_istekleri'],
  D02: ['birimler', 'bolumler', 'donemler', 'takvimler', 'takvim_tatilleri', 'takvim_sinav_haftalari', 'birim_donemleri', 'dersler', 'subeler', 'program_saatleri', 'program_saati_subeleri', 'oturumlar', 'oturum_subeleri', 'oturum_degisiklikleri'],
  D03: ['liste_satirlari', 'sube_listeleri', 'liste_yuklemeleri'],
  D04: ['oturum_pencereleri', 'pencere_degisiklikleri', 'saat_esitleme_kesintileri'],
  D05: ['yoklama_kayitlari', 'makbuz_okutmalari'],
  D06: ['gonderim_defteri', 'kurulumlar', 'degisiklik_sayaci', 'ogrenci_durum_surumleri', 'karar_teslimleri'],
  D07: ['cihaz_kanitlari', 'app_attest_sayaclari', 'cihaz_dogrulama_degerleri', 'android_iptal_listesi', 'ortak_sinir_sayaclari', 'kayit_karar_gecmisi', 'oturum_isaretleri', 'rastgele_isim_secimleri'],
  D08: ['devam_durumlari', 'devam_sonuclari', 'devam_seviye_gecmisi', 'oturum_son_durumlari'],
  D09: ['duzeltmeler', 'sorun_bildirimleri', 'denetim_kayitlari', 'gunluk_inceleme_partileri'],
  D10: ['aksis_ozet_anliklari', 'aksis_ozet_anligi_satirlari'],
  D11: ['projeksiyon_tarayicilari', 'projeksiyon_eslestirme_kodlari', 'projeksiyon_baglantilari', 'eslestirme_yanlis_denemeleri', 'qr_anahtar_yuvalari', 'qr_anahtar_indirmeleri', 'gosterim_kayitlari', 'yoklama_kanitlari'],
  D12: ['__drizzle_migrations', 'geri_yukleme_kayitlari', 'saklama_islemleri'],
  D13: ['istemci_surum_esikleri'],
  D14: ['eposta_gonderimleri', 'pgboss_semasi'],
  D15: ['telefon_sayaclari', 'hoca_ekran_sureleri', 'isletim_uyarilari'],
};

const ENDPOINTS = {
  D01: ['POST /v1/kimlik/kod', 'POST /v1/kimlik/giris', 'POST /v1/kimlik/cikis', 'GET /v1/kimlik/oturumlar', 'DELETE /v1/kimlik/oturumlar/{girisOturumuId}', 'GET /v1/kimlik/ben', 'POST /v1/kimlik/basvuru', 'POST /v1/kimlik/basvuru/dogrula', 'POST /v1/kimlik/basvuru/silme', 'POST /v1/kimlik/ogrenci/kayit', 'POST /v1/kimlik/cihaz/app-attest-yenile', 'POST /v1/kimlik/cihaz-degisimi', 'GET /v1/kimlik/cihaz-degisimi/{talepId}', 'POST /v1/kimlik/cihaz-degisimi/{talepId}/onay', 'POST /v1/kimlik/cihaz-degisimi/{talepId}/ret', 'POST /v1/kimlik/hesap-silme', 'DELETE /v1/kimlik/hesap-silme', 'POST /v1/kimlik/ogrenciler/{kisiId}/hesap-silme', 'POST /v1/kimlik/kayit-kodlari', 'GET /v1/kimlik/yonetim/basvurular', 'POST /v1/kimlik/yonetim/basvurular/{kisiId}/onay', 'POST /v1/kimlik/yonetim/basvurular/{kisiId}/ret', 'GET /v1/kimlik/yonetim/hesaplar', 'POST /v1/kimlik/yonetim/hesaplar/{kisiId}/oturumlari-kapat', 'POST /v1/kimlik/yonetim/hesaplar/{kisiId}/pasif', 'POST /v1/kimlik/yonetim/hesaplar/{kisiId}/etkin', 'POST /v1/kimlik/yonetim/yoneticiler', 'DELETE /v1/kimlik/yonetim/yoneticiler/{kisiId}'],
  D02: ['GET /v1/dersler', 'POST /v1/dersler', 'GET /v1/dersler/{dersId}', 'PATCH /v1/dersler/{dersId}', 'POST /v1/dersler/{dersId}/arsivle', 'POST /v1/dersler/{dersId}/subeler', 'PATCH /v1/dersler/{dersId}/subeler/{subeId}', 'GET /v1/dersler/{dersId}/program', 'POST /v1/dersler/{dersId}/program/onizleme', 'PUT /v1/dersler/{dersId}/program', 'GET /v1/dersler/{dersId}/oturumlar', 'POST /v1/dersler/{dersId}/telafi', 'GET /v1/dersler/{dersId}/cakismalar', 'PATCH /v1/dersler/oturumlar/{oturumId}', 'POST /v1/dersler/oturumlar/{oturumId}/iptal', 'GET /v1/dersler/oturumlar/onaysiz', 'POST /v1/dersler/oturumlar/{oturumId}/yapildi-mi', 'POST /v1/dersler/oturumlar/yapildi-mi', 'GET /v1/dersler/birimler', 'GET /v1/dersler/yonetim/birimler', 'POST /v1/dersler/yonetim/birimler', 'PATCH /v1/dersler/yonetim/birimler/{birimId}', 'POST /v1/dersler/yonetim/birimler/{birimId}/bolumler', 'GET /v1/dersler/yonetim/donemler', 'POST /v1/dersler/yonetim/donemler', 'POST /v1/dersler/yonetim/takvimler', 'PUT /v1/dersler/yonetim/takvimler/{takvimId}', 'PUT /v1/dersler/yonetim/birimler/{birimId}/donemler/{donemId}', 'GET /v1/dersler/yonetim/kilitler', 'GET /v1/dersler/yonetim/dersler', 'POST /v1/dersler/yonetim/dersler/{dersId}/devir'],
  D03: ['GET /v1/listeler/subeler/{subeId}', 'POST /v1/listeler/subeler/{subeId}/onizleme', 'POST /v1/listeler/subeler/{subeId}/uygula', 'POST /v1/listeler/subeler/{subeId}/satirlar', 'PATCH /v1/listeler/satirlar/{satirId}', 'GET /v1/listeler/subeler/{subeId}/yuklemeler'],
  D04: ['POST /v1/saat/belge', 'GET /v1/saat/pencereler/{oturumId}'],
  D05: ['GET /v1/yoklama/oturumlar/{oturumId}/kayitlar'],
  D06: ['POST /v1/esitleme/gonderim', 'GET /v1/esitleme/degisiklikler'],
  D07: ['POST /v1/dogrulama/deger', 'GET /v1/dogrulama/oturumlar/{oturumId}/kafa-sayisi', 'POST /v1/dogrulama/oturumlar/{oturumId}/rastgele-isim', 'POST /v1/dogrulama/oturumlar/{oturumId}/sinifta-degil', 'DELETE /v1/dogrulama/oturumlar/{oturumId}/sinifta-degil/{ogrenciId}'],
  D08: ['GET /v1/devam/dersler/{dersId}/karar-bekleyenler', 'PUT /v1/devam/dersler/{dersId}/ogrenciler/{satirId}/muaf', 'PUT /v1/devam/yonetim/dersler/{dersId}/oranlar'],
  D09: ['POST /v1/duzeltmeler', 'GET /v1/duzeltmeler', 'POST /v1/duzeltmeler/{id}/geri-al', 'GET /v1/duzeltmeler/onaylar/ozet', 'GET /v1/duzeltmeler/kendi-beyani', 'POST /v1/duzeltmeler/kendi-beyani/kararlar', 'GET /v1/duzeltmeler/teyitler', 'POST /v1/duzeltmeler/teyitler/kararlar', 'GET /v1/duzeltmeler/incelemeler', 'POST /v1/duzeltmeler/incelemeler/kararlar', 'GET /v1/duzeltmeler/isaretli-oturumlar', 'POST /v1/duzeltmeler/isaretli-oturumlar/{oturumId}/incelendi', 'GET /v1/duzeltmeler/sorun-bildirimleri', 'POST /v1/duzeltmeler/sorun-bildirimleri/{id}/kapat', 'GET /v1/duzeltmeler/sonradan-degisenler', 'GET /v1/duzeltmeler/denetim'],
  D10: ['GET /v1/raporlar/dersler/{dersId}', 'GET /v1/raporlar/ogrenciler/{satirId}', 'GET /v1/raporlar/subeler/{subeId}/aksis-ozeti', 'POST /v1/raporlar/subeler/{subeId}/aksis-ozeti/ciktilar', 'GET /v1/raporlar/yonetim/donem-sonu'],
  D11: ['POST /v1/projeksiyon/eslestirme-kodu', 'GET /v1/projeksiyon/kodlar', 'DELETE /v1/projeksiyon/tarayici', 'POST /v1/projeksiyon/onay', 'GET /v1/projeksiyon/baglantilar', 'DELETE /v1/projeksiyon/baglantilar/{id}', 'POST /v1/projeksiyon/qr-anahtarlari'],
  D12: ['GET /v1/veritabani/yonetim/geri-yuklemeler'],
  D13: ['GET /v1/surum'],
  D14: [],
  D15: ['GET /health/live', 'GET /health/ready', 'GET /v1/durum', 'POST /v1/isletim/ekran-sureleri'],
};

const JOBS = {
  D01: ['kimlik_temizligi', 'giris_oturumu_temizligi', 'hesap_silme_yurutucu', 'inceleme_hesaplari_kurulumu', 'bekleyen_kayit_kapatma'],
  D02: ['takvim_oturumlarini_yenile', 'donem_kilidi', 'deneme_dersi_oturumlari'],
  D03: [],
  D04: ['oturum_pencere_kapat', 'saat_esitleme_denetimi', 'esitleme_sonrasi_yeniden_degerlendir'],
  D05: [],
  D06: ['sira_boslugu_raporu'],
  D07: ['android_iptal_listesi_cek', 'bekleyen_kararlari_coz', 'pencere_beklemede_kesinlestir'],
  D08: ['devam_hesapla', 'devam_tutarlilik_denetimi'],
  D09: ['gece_inceleme_siralamasi'],
  D10: ['aksis_gun_sonu_anligi'],
  D11: ['projeksiyon_baglanti_kapat', 'projeksiyon_eslestirme_temizle', 'projeksiyon_bekleyen_yeniden_hesapla'],
  D12: ['saklama_suresi_isi', 'gecelik_pg_dump', 'xprem_birimi_yedegi', 'pgbackrest_tam_yedek', 'pgbackrest_fark_yedek', 'pgbackrest_dogrulama', 'geri_yukleme_denemesi', 'donem_bolumu_denetimi'],
  D13: ['oasdiff_kirilma_denetimi', 'openapi_belgesi_sakla'],
  D14: ['pgboss_bakimi', 'eposta_gonderim_temizligi'],
  D15: ['isletim_denetimi', 'dis_erisim_denetimi', 'isletim_kalp_atisi', 'sertifika_bitis_denetimi', 'saat_esitleme_izleme', 'makine_denetimi', 'gunluk_log_arsivi', 'ota_yayin_denetimi', 'haftalik_olcum_ozeti', 'ci_kalite_kapilari', 'ci_gecelik_guvenlik_denetimi', 'ci_haftalik_is', 'dependabot_guncellemeleri', 'yayin_oncesi_yuk_testi'],
};

const EXPORTS = {
  D01: ['oturumDogrula(bilgi, baglam): OturumSonucu, kökteki oturum kancası', 'yetkiDenetle(kimlik, rol, kapsam?) [yaprak]', 'kisiGetir(tx, kisiId) [yaprak]', 'personelRolleri(tx, kisiId) [yaprak]', 'hesapSilindiMi(tx, kisiId): boolean, kişi satırı FOR SHARE [yaprak]', 'ogrenciHesabiGetir(tx, { kisiId } | { numara } | { numaralar } | { kisiIdler }) [yaprak]', 'cihazGetir(tx, cihazId) [yaprak]', 'cihazAnahtariGetir(tx, anahtarId) [yaprak]', 'girisOturumuGetir(tx, girisOturumuId) [yaprak]', 'cihazDogrulamaSonucunuYaz(tx, cihazId, sonuc)', 'ogrenciTeyitEt(tx, istek)', 'ogrenciTeyidiniReddet(tx, istek)', 'bekleyenKayitlariEslestir(tx, subeId, s?: { ogrenciNolari })', 'kimlikDinleyicileriniKur(aboneler: { dersler, esitleme, projeksiyon, isletim })', 'oturumlariKapat(tx, suzgec, neden)', 'hesabiSil(tx, istek)', 'epostaNormallestir(ham): packages/core/src/kimlik', 'topluTeyitUygunMu(girdi): packages/core/src/kimlik', 'kimlikEklentisi'],
  D02: ['dersGetir(tx, dersId, s?: { kilitle?: paylasimli }) [yaprak]', 'dersYetkisi(tx, kimlik, dersId) [yaprak]', 'subeGetir(tx, subeId, s?: { kilitle?: paylasimli }) [yaprak]', 'dersSubeleri(tx, dersId) [yaprak]', 'birimGetir(tx, birimId) [yaprak]', 'kilitliBirimDonemleri(tx, an?, s?: { uygulanmis?: true }) [yaprak]', 'hocaninDersleri(tx, kisiId, s?)', 'oturumGetir(tx, oturumId)', 'oturumlariGetir(tx, suzgec)', 'oturumSayfasi(tx, suzgec, sayfa)', 'oturumSubeleri(tx, oturumId)', 'birimDonemiGetir(tx, birimId, donemId)', 'kilitDurumu(tx, birimId, donemId, an?)', 'takvimGetir(tx, birimId, donemId)', 'denetlenecekDersler(tx, { an, kilittenSonraGun })', 'donemArasiMi(tx, an?)', 'kafaSayisiniYaz(tx, oturumId, kafaSayisi, yapildi)', 'oranlariYaz(tx, dersId, oranlar)', 'denemeDersiniKur(tx, hocaKisiId): { dersId, subeId }', 'oturumUretimDinleyicisiKaydet(dinleyici)', 'kilitAdimiKaydet(adim)', 'listeKaynagiKaydet(kaynak: { etkinSatirlar })', 'derslerKimlikDinleyicisi(tx, olay)', 'derslerEklentisi'],
  D03: ['listeSatirlari(tx, subeId)', 'satirGetir(tx, satirId)', 'uyelikDenetle(tx, ogrenciNo, subeId, an)', 'numaraIleEslestir(tx, numara, isim)', 'ogrencininEtkinSatirlari(tx, ogrenciNo, an)', 'ogrencininSatirlari(tx, ogrenciNo, s?)', 'muafIsaretle(tx, satirId, muaf, b): sonuç birliği, D08 kendi koduna çevirir', 'denemeListesiniKur(tx, subeId, ogrenciNo, adSoyad)', 'listeDegisikligiDinleyicisiKaydet(dinleyici)', 'listeKovaAnahtari(kovaNo): packages/core/src/listeler/kova.ts', 'listelerEklentisi'],
  D04: ['simdi(): saat arayüzü (infra/saat)', 'istanbulTarihi(anMs) (infra/saat)', 'istanbulAni(tarih, saat) (infra/saat)', 'istanbulGunSonuAni(tarih) (infra/saat)', 'saatBelgesiVer(tx, ozne, tekKullanimlikDeger)', 'saatBelgesiDogrula(belge)', 'pencereleriHesapla(tx, oturumlar)', 'pencereGetir(tx, oturumId)', 'pencereSonucu(tx, { oturumId, kayitSaati, kayitUlasmaAni })', 'esitlemeSaglikliMi()', 'kesintiAraliklari(tx, aralik)', 'oturumKapandiDinleyicisiKaydet(dinleyici)', 'kesintiKapandiDinleyicisiKaydet(dinleyici)', 'pencereDegistiDinleyicisiKaydet(dinleyici)', 'saatEklentisi'],
  D05: ['kayitGetir(tx, donemId, kayitId, s?) [yaprak]', 'kayitlariKilitle(tx, anahtarlar) [yaprak]', 'oturumKayitlari(tx, oturumId, s?) [yaprak]', 'sayilanKayitlar(tx, suzgec) [yaprak]', 'kararSutunlariniYaz(tx, kayitAnahtari, karar) [yaprak]: yalnız D07 çağırır', 'ogrencininKayitlari(tx, ogrenciId, { surumden, surumeKadar })', 'yoklamaKaydiOgesi: OgeIsleyici', 'makbuzOkutmasiOgesi: OgeIsleyici', 'kanitCikar(tx, donemId, kayitId)', 'yoklamaCiftAnahtari(oturumId, ogrenciId): packages/contracts/src/yoklama.ts', 'yoklamaEklentisi'],
  D06: ['surumAl(tx) [yaprak]', 'surumDamgasiIste(tx, damga) [yaprak]', 'ogrenciDurumuDegisti(tx, ogrenciId) [yaprak]', 'kurulumSonTemasi(tx, kisiId) [yaprak]', 'kurulumSonTemaslari(tx, kisiIdler) [yaprak]', 'kararTeslimAni(tx, kayitAnahtari, kararSurumu) [yaprak]', 'ogeTuruKaydet(tur, isleyici)', 'indirmeKaynagiKaydet(ad, kaynak)', 'gondermeSuresiSonu(oturumBitisAni, kilitAni): packages/core/src/esitleme', 'enEskiGecerliSurumuYukselt(tx)', 'esitlemeKimlikDinleyicisi(tx, olay)', 'esitlemeEklentisi'],
  D07: ['dogrulamaDegeriniTuket(tx, deger, beklenenAmac)', 'cihazKanitiniDogrula(tx, kanit)', 'appAttestSayaciniDenetle(tx, anahtarId, sayac, siraNo)', 'kararHesapla(tx, kayitTaslagi, baglam)', 'kararGecmisineYaz(tx, kayitAnahtari, karar, kaynak)', 'kararDegistir(tx, kayitAnahtari, yeniKarar, kaynak)', 'donemKilidiKararKapanisi(tx, birimId, donemId)', 'yenidenDegerlendir(tx, suzgec, neden)', 'oturumIsaretleri(tx, suzgec)', 'isaretIncelendi(tx, isaretId, hoca)', 'cihazDogrulanmadiMi(tx, cihazId)', 'kafaSayisiOgesi(tx, oge, baglam)', 'dogrulamaTeyitAnahtari(ogrenciId): packages/contracts/src/dogrulama.ts', 'dogrulamaListeAnahtari(subeId): packages/contracts/src/dogrulama.ts', 'kararAnahtarlari(girdiler): saf, karar yollarının alacağı çift ve sayaç anahtarları (packages/contracts/src/dogrulama.ts)', 'dogrulamaEklentisi'],
  D08: ['devamHesaplaIsiKoy(tx, dersId, ogrenciId, neden, tetikleyen?, istekKimligi?) [yaprak]', 'dersSonuclari(tx, subeId, { an, hucreler? })', 'oturumSonDurumlari(tx, subeId, { an, tarihten?, tarihe? })', 'ogrenciDevamDurumu(tx, ogrenciId, dersId)', 'sonucuDegistirebilirMi(tx, hedef, { kip, an })', 'oturumSaatleri ve kapsam yüklemi: packages/core/src/devam', 'devamEklentisi'],
  D09: ['denetimeYaz(tx, olay) [yaprak]', 'denetimOlaylariniKaydet(modul, olaylar) [yaprak]', 'duzeltmeleriGetir(tx, suzgec) [yaprak]', 'acikSorunBildirimleri(tx, s) [yaprak]', 'sonDurumOnceligi(kayitlar, duzeltmeler, oturum): packages/core/src/duzeltmeler', 'SEBEP_KODLARI, NEDEN_KODLARI, SON_DURUMLAR: packages/core/src/duzeltmeler', 'elleEklemeOgesi: OgeIsleyici', 'sorunBildirimiOgesi: OgeIsleyici', 'ogrencininDuzeltmeleri: OgrenciKaynagi', 'ogrencininSorunBildirimleri: OgrenciKaynagi', 'duzeltmelerEklentisi'],
  D10: ['aksisAnligiGetir(tx, subeId, tur) [yaprak]', 'degisimSinifi(girdi): packages/core/src/raporlar/degisim-sinifi.ts', 'raporlarEklentisi'],
  D11: ['qrKanitiniAyristir(tx, kayit)', 'qrKilitAnahtarlari(kayit): saf', 'qrSonucu(tx, kayitAnahtari)', 'gosterimAraliklari(tx, oturumId)', 'gosterimKaydiOgesi: OgeIsleyici', 'gosterimKaydiDinleyicisiKaydet(dinleyici: { ad, anahtarlar, calistir })', 'projeksiyonKimlikDinleyicisi(tx, olay)', 'projeksiyonEklentisi'],
  D12: ['veritabaniKur(ayar): Veritabani { islem, semaDurumu, kapat, db, havuz }', 'Islem (tip)', 'islem(fn, secenek?): Veritabani.islem; saltOkunur, yalitim, zamanAsimiMs, yenidenDene', 'islemSonuKancasi(tx, kanca)', 'nesilOku(tx)', 'danismaKilidi(tx, anahtarlar): katmanlı, anahtar başına kip', 'danismaKilidiDene(tx, anahtar): boolean, beklemez', 'saklamaIsleyicisiKaydet(veriSinifi, isleyici)', 'saklamaIsleyicisiniCalistir(saklamaVeritabani, veriSinifi, secenek)', 'kisitAdi(tablo, sutunlar, tur, ek?)', 'kisitIhlali(hata)', 'tabloYardimcilari', 'donemBolumuAc(tx, donemId)', 'geriYuklemePencereleri(tx)', 'testVeritabaniHazirla(secenek)', 'senaryoOncesiSifirla(gocAdresi)', 'testVeritabaniAdi(isciNo)', 'veritabaniEklentisi', 'veritabaniIsleri(bag)'],
  D13: ['rotalariKaydet(app, rotalar)', 'uygulamaHatasi(kod, ayrinti)', 'istekKimligi(istek)', 'hizSinifi(ad)', 'enDusukSurumDenetle(istek)', 'uygulamaKur(b): app.ts kurucusu', 'saatOznesiKur(kimlik)', 'kalanSureMs(istek)', 'yayinBilgisi()', 'ogeTuruTanimla(tur, govde, s)'],
  D14: ['isGonder(tx, kuyruk, veri, secenek?)', 'isTanimla(tanim)', 'epostaGonder(sablon, alici, veri)', 'epostaSiniriDenetle(tx, adres, tur, s?: { ekAnahtarlar })', 'isSagligi(tx): kuyruk ve zamanlama sağlığı', 'isKuyruguKur(secenek): bileşim kökü', 'epostaKur(secenek): bileşim kökü', 'isKuyrugunuBosalt(): test desteği'],
  D15: ['ayarlariYukle(s)', 'ayarlar(): doğrulanmış ortam ayarları', 'gizliAnahtar(amac, kid?)', 'gizliAnahtarSeti(amac)', 'log: pino kaydedici', 'logOlustur(s)', 'uyariAc(tx, tur, ayrinti)', 'saatEsitlemeDurumu(): chrony durum dosyası', 'telefonSayaciOgesi(s: { hesapSilindiMi, saat }): OgeIsleyici', 'kimlikOlayiDinleyicisi(tx, olay)', 'isletimEklentisi', 'isletimIsleri(bag)', 'kapanisiBaslat()', 'TestDunyasi', 'kurucuTanimla'],
};

const READS = {
  D01: ['D02', 'D03', 'D07', 'D09', 'D12', 'D13', 'D14', 'D15'],
  D02: ['D01', 'D06', 'D08', 'D09', 'D12', 'D13', 'D14'],
  D03: ['D02', 'D06', 'D09', 'D12', 'D13'],
  D04: ['D01', 'D02', 'D06', 'D09', 'D12', 'D13', 'D14', 'D15'],
  D05: ['D01', 'D02', 'D03', 'D04', 'D06', 'D07', 'D08', 'D09', 'D11', 'D12', 'D13'],
  D06: ['D01', 'D12', 'D13', 'D14'],
  D07: ['D01', 'D02', 'D03', 'D04', 'D05', 'D06', 'D08', 'D09', 'D11', 'D12', 'D13', 'D14', 'D15'],
  D08: ['D01', 'D02', 'D03', 'D04', 'D05', 'D06', 'D09', 'D12', 'D13', 'D14'],
  D09: ['D01', 'D02', 'D03', 'D05', 'D06', 'D07', 'D08', 'D10', 'D12', 'D13', 'D14'],
  D10: ['D01', 'D02', 'D06', 'D08', 'D12', 'D13', 'D14'],
  D11: ['D01', 'D02', 'D04', 'D06', 'D09', 'D12', 'D13', 'D14', 'D15'],
  D12: ['D01'],
  D13: [],
  D14: ['D04', 'D12', 'D13', 'D15'],
  D15: ['D01', 'D03', 'D04', 'D06', 'D07', 'D12', 'D13', 'D14'],
};

const QUEUE_ITEMS = { D04: ['pencere_suresi', 'erken_kapatma'], D05: ['yoklama_kaydi', 'makbuz_okutmasi'], D07: ['kafa_sayisi'], D09: ['elle_ekleme', 'sorun_bildirimi'], D11: ['gosterim_kaydi'], D15: ['telefon_sayaci'] };

const NOTES = {
  D01: ['Kökteki oturum kancasının işlevi bu modülün dış yüzündedir; kökte D13 kaydeder.', 'Cihaz kanıtını D07 doğrular, sonucu cihazlar tablosuna D01 yazar (cihazDogrulamaSonucunuYaz).', 'yonetici-ekle komutu apps/server/src/cli/yonetici-ekle.ts; GET /hesap-silme durağan sayfasının dosyası docker/caddy/sayfalar/hesap-silme.html.', 'Eski kayit_sorulari artık D07nin cihaz_dogrulama_degerleri tablosu; kimlik_temizligi ona dokunmaz.', 'D11in istediği telefon modeli ve D13ün istediği son görülen istemci cihazlar sütunudur; D01 ekler ve yazar.'],
  D02: ['oturumlar.kafa_sayisi ve oturumlar.yapildi sütunlarını yalnız D02 yazar; D07 kafaSayisiniYaz ile ister.', 'Oturum üretimi ve yeniden üretimi aynı işlemde kayıtlı üretim dinleyicilerini çağırır; D04 pencereleriHesapla işlevini oturumUretimDinleyicisiKaydet ile kaydeder, D02 D04ü içe aktarmaz.', 'Telefona inen tablolarda surum ve silindi sütunları; sürüm D06.surumAl ile alınır, tablolar D06ya indirme kaynağı olarak kaydolur.', 'donem_kilidi işi aynı işlemde kayıtlı kilit adımlarını sırayla çağırır; D07 donemKilidiKararKapanisi adımını kilitAdimiKaydet ile kaydeder.', 'D11in istediği oturum kısa kodu ve QR ile yoklama ayarı D02 tablolarında sütundur; D02 ekler ve yazar.'],
  D03: ['muaf sütunu liste_satirlari tablosunda kalır; değiştiren tek uç D08in muaf ucudur, D03.muafIsaretle ile yazar. PATCH /v1/listeler/satirlar/{satirId} gövdesinde muaf alanı yoktur.', 'Liste uygulanınca aynı işlemde kayıtlı liste dinleyicileri çağrılır: D01 bekleyenKayitlariEslestir, D07 yenidenDegerlendir, D08 devamHesaplaIsiKoy (listeDegisikligiDinleyicisiKaydet ile); D03 bu modülleri içe aktarmaz.'],
  D04: ['Kuyruk öğesi türleri pencere_suresi ve erken_kapatma POST /v1/esitleme/gonderim ile gelir.', 'Saat arayüzü apps/server/src/infra/saat/ D04ündür; kural kodunda SQL now() yoktur.', 'Eşitleme sinyali D15in chrony durum dosyasıdır (saatEsitlemeDurumu); süreç içi SNTP ölçümü yapılmaz.', 'Saat belgesinin ikili biçimi packages/core/src/saat/ içinde; X-Saat-Belgesi başlığını kökte D13 ekler, belgeyi D04 üretir.', 'oturum_pencere_kapat ve kesinti kapanışı kayıtlı dinleyicileri çağırır: D07 (pencere_beklemede_kesinlestir, yenidenDegerlendir), D08 (devam_hesapla), D11 (projeksiyon_baglanti_kapat); D04 bu modülleri içe aktarmaz.'],
  D05: ['Kuyruk öğesi türleri yoklama_kaydi ve makbuz_okutmasi POST /v1/esitleme/gonderim ile gelir.', 'Karar, gerekçe ve etiket sütunlarını yalnız D05 yazar; değeri D07 verir.', 'Kayıt zarfı ve kayıt metni şeması packages/contracts/src/yoklama.ts, kodlaması packages/core/src/yoklama/.'],
  D06: ['Gönderim ucu yalnız dağıtıcıdır; iş kuralı ve tablo yazımı öğe türünün modülünün dış yüzünde, işleyiciler ogeTuruKaydet ile kaydolur.', 'Öğe türleri: yoklama_kaydi, makbuz_okutmasi (D05); pencere_suresi, erken_kapatma (D04); kafa_sayisi (D07); elle_ekleme, sorun_bildirimi (D09); gosterim_kaydi (D11); telefon_sayaci (D15). Bilinmeyen tür tekrar_dene sonucu alır.', 'İndirme kaynakları: D02 (dersler, program saatleri, oturumlar, tatiller, kilit), D03 (liste satırları), D04 (pencereler), D05 (öğrencinin kayıtları), D08 (öğrencinin devam durumu), D09 (öğrencinin düzeltmeleri ve sorun bildirimleri).', 'İmleç, paket ve kuyruk öğesi telefonda durur; şemaları packages/contracts/src/esitleme.ts.', 'İkinci çapa ve paket imzası packages/core/src/saat saf işlevi ve D01in açık anahtarıyla doğrulanır; D06 D04ün sunucu dış yüzünü çağırmaz.'],
  D07: ['Kuyruk öğesi türü kafa_sayisi POST /v1/esitleme/gonderim ile gelir.', 'Karar yetkisi tektir: kararHesapla ve kararDegistir; kayıt satırına D05 yazar, geçmişe D07 yazar.', 'Dönem kilidi kapanış adımı ayrı iş değil, D02nin donem_kilidi işleminde çağrılan dış yüz fonksiyonudur.', 'Etiket ve karar kuralları packages/core/src/dogrulama/ içinde saf fonksiyon; hatalı sürüm listesi yayin-bilgisi.json dosyasından okunur.', 'Cihaz doğrulama değerleri yeni değer verilirken aynı işlemde süresi geçenler silinerek temizlenir; ayrı iş yoktur.'],
  D08: ['p değerleri dersler tablosunda (D02.oranlariYaz yazar), muaf liste_satirlari tablosunda (D03.muafIsaretle yazar); anlamları ve uçları D08indir.', 'devam_hesapla işi tetikleyen değişiklikle aynı işlemde kuyruğa girer (devamHesaplaIsiKoy, D14.isGonder üstünden).', 'Dönem sonu anlığı D10un aksis_ozet_anliklari tablosundadır; D08 değerleri dersSonuclari ile verir.', 'Hak formülü packages/core/src/devam/ içinde saf fonksiyon.'],
  D09: ['denetim_kayitlari tek denetim tablosudur; uygulama rolü yalnız ekler ve okur.', 'Kuyruk öğesi türleri elle_ekleme ve sorun_bildirimi POST /v1/esitleme/gonderim ile gelir.', 'Sebep kodu kataloğu packages/core/src/duzeltmeler/ içinde sabit liste; CHECK kısıtı ve sözleşme oradan türer.', 'Teyit uçları D09da, teyit alanlarını D01 yazar; Kendi beyanı ve İncelemede kararları D07.kararDegistir ile değişir.'],
  D10: ['Rapor ve AKSİS özeti için başka modüllerin tablolarını yalnız okur (teknik.html#sunucu-mimari istisnası); yalnız kendi iki tablosuna yazar.', 'Excel panelde üretilir; rapor uçları JSON döner.', 'aksis_gun_sonu_anligi, kilit işleminin kuyruğa koyduğu devam_hesapla işleri bitmeden anlık almaz.'],
  D11: ['Aşama 2 ve 3 sunucu parçaları; kuyruk öğesi türü gosterim_kaydi POST /v1/esitleme/gonderim ile gelir.', 'Oturum kısa kodu ve QR ayarı D02 tablolarında, telefon modeli D01 tablosunda sütundur; o tablonun modülü yazar.', 'QR dönüşü ve imzası packages/core/src/projeksiyon/ içinde.'],
  D12: ['Alan tablosu tutmaz; yalnız göç defteri, geri yükleme ve saklama kanıtı tabloları.', 'Göç klasörü tektir: apps/server/migrations/<UTC zaman>_<modül>_<açıklama>/; CI göçteki tablo adlarını bu haritayla karşılaştırır.', 'Saklama işi kayıt desenlidir: modüller saklamaIsleyicisiKaydet ile kaydolur, satırları modülün kendi kodu siler ya da anonimleştirir.', 'Şemalar uygulama, drizzle ve pgboss (D12-B02); roller yoklama_goc, yoklama_api, yoklama_isci (D12-B03).', 'Bağlantı ayarlarını server.ts ve worker.ts verir; D12 başka modül içe aktarmaz.'],
  D13: ['Rota tablosu, hata kataloğu ve OpenAPI belgeleri dosyadır, tablo değildir.', 'Kök kancalar: oturum doğrulama (D01in işlevi), Origin denetimi, istek kimliği, hız sınırı, en düşük sürüm, X-Saat-Belgesi başlığı (D04ün işlevi). Bu işlevleri bileşim kökü app.ts verir; infra/api alan modülü içe aktarmaz.', 'yayin-bilgisi.json şeması packages/contracts/src/api.ts içinde; dosyayı CI yazar (D15).'],
  D14: ['pgboss şemasını yayın adımında pg-boss migrate kurar; Drizzle göçüne girmez.', 'E-posta kodu infra/eposta/ (şablonlar dahil) D14ündür; kod e-postası kuyruğa konmaz.', 'İş işleyicileri apps/server/src/jobs/<modül>/ altında işi kuran modülündür; worker.ts tanımları jobs/<modül>/index.ts dosyalarından toplar, D14 kuyruk, zamanlama ve politika altyapısını tutar.', 'Kuyruk sağlığını isSagligi ile verir; eşik ve uyarı işi isletim_denetimi D15indir.'],
  D15: ['Sunucu kodu infra/izleme ve infra/ayarlar klasörlerinde; uç öneki /v1/isletim.', 'Kuyruk öğesi türü telefon_sayaci POST /v1/esitleme/gonderim ile gelir.', 'Gizli anahtarlar Compose secrets dosyasıdır, tablo değildir; chrony durumu salt okunur dosyadır.', 'olcum_ önekli görünümler D15indir ve başka tabloları yalnız okur.', 'xprem ayrı veritabanında çalışır; işletimi D15in, yedeği D12nin.', 'isletim_denetimi D15indir: D14.isSagligi ve eşiklerle zamanlanmış işleri, ölü mektup kuyruğunu ve art arda e-posta hatalarını denetler, isletim_uyarilari tablosuna yazar.'],
};

// ---------- renames ----------
const RENAMES = {
  // tables
  giris_oturumu: 'giris_oturumlari', ogrenci: 'ogrenci_hesaplari', cihaz: 'cihazlar', eposta_giris_durumu: 'eposta_giris_durumlari',
  kayit_sorulari: 'cihaz_dogrulama_degerleri', app_attest_anahtarlari: 'app_attest_sayaclari', denetim_kaydi: 'denetim_kayitlari',
  birim: 'birimler', bolum: 'bolumler', donem: 'donemler', takvim: 'takvimler', takvim_tatili: 'takvim_tatilleri', takvim_sinav_haftasi: 'takvim_sinav_haftalari',
  birim_donemi: 'birim_donemleri', ders: 'dersler', sube: 'subeler', program_saati: 'program_saatleri', program_saati_subesi: 'program_saati_subeleri',
  oturum: 'oturumlar', ders_oturumu: 'oturumlar', oturum_subesi: 'oturum_subeleri', oturum_degisikligi: 'oturum_degisiklikleri',
  liste_satiri: 'liste_satirlari', sube_listesi: 'sube_listeleri', liste_yuklemesi: 'liste_yuklemeleri',
  kurulum: 'kurulumlar', ogrenci_durum_surumu: 'ogrenci_durum_surumleri', karar_teslimi: 'karar_teslimleri',
  devam_durumu: 'devam_durumlari', devam_sonucu: 'devam_sonuclari', oturum_son_durumu: 'oturum_son_durumlari', donem_sonu_sonucu: 'aksis_ozet_anligi_satirlari',
  duzeltme: 'duzeltmeler', kayit_onayi: 'kayit_karar_gecmisi', sorun_bildirimi: 'sorun_bildirimleri', gunluk_inceleme_partisi: 'gunluk_inceleme_partileri',
  aksis_ozet_anligi: 'aksis_ozet_anliklari', aksis_ozet_anligi_satiri: 'aksis_ozet_anligi_satirlari',
  projeksiyon_tarayicisi: 'projeksiyon_tarayicilari', projeksiyon_eslestirme_kodu: 'projeksiyon_eslestirme_kodlari', projeksiyon_baglantisi: 'projeksiyon_baglantilari',
  eslestirme_yanlis_deneme: 'eslestirme_yanlis_denemeleri', qr_anahtar_yuvasi: 'qr_anahtar_yuvalari', qr_anahtar_indirme: 'qr_anahtar_indirmeleri',
  gosterim_kaydi: 'gosterim_kayitlari', yoklama_kaniti: 'yoklama_kanitlari', istemci_surum_esigi: 'istemci_surum_esikleri',
  // jobs
  oturum_kapat: 'oturum_pencere_kapat', oturum_kapatma: 'oturum_pencere_kapat', sira_boslugu_denetimi: 'sira_boslugu_raporu',
  android_iptal_listesi_cekme: 'android_iptal_listesi_cek', donem_kilidi_karar_kapanisi: 'donem_kilidi', donem_kilidi_onaysiz_kendi_beyani: 'donem_kilidi',
  donem_kilidi_yan_etkileri: 'donem_kilidi', donem_sonu_anligi: 'aksis_gun_sonu_anligi', qr_gosterim_beklemesi_bitir: 'bekleyen_kararlari_coz',
  xprem_birim_kopyasi: 'xprem_birimi_yedegi', saklama_suresi_temizligi: 'saklama_suresi_isi', giris_kodu_ve_oturum_temizligi: 'kimlik_temizligi',
};

// inventory "METHOD path" -> canonical "METHOD path" (query strings are stripped automatically)
const EP = {
  'GET /v1/kimlik/birimler': 'GET /v1/dersler/birimler', 'GET /v1/bolumler': 'GET /v1/dersler/birimler',
  'POST /v1/kimlik/ogrenci/kayit-sorusu': 'POST /v1/dogrulama/deger', 'POST /v1/kimlik/cihaz-dogrulama/deger': 'POST /v1/dogrulama/deger',
  'POST /v1/kimlik/cihazlar/app-attest-anahtari': 'POST /v1/kimlik/cihaz/app-attest-yenile',
  'GET /v1/yonetim/basvurular': 'GET /v1/kimlik/yonetim/basvurular', 'POST /v1/yonetim/basvurular/{kisiId}/onay': 'POST /v1/kimlik/yonetim/basvurular/{kisiId}/onay',
  'POST /v1/yonetim/basvurular/{kisiId}/ret': 'POST /v1/kimlik/yonetim/basvurular/{kisiId}/ret', 'GET /v1/yonetim/hesaplar': 'GET /v1/kimlik/yonetim/hesaplar',
  'POST /v1/yonetim/hesaplar/{kisiId}/oturumlari-kapat': 'POST /v1/kimlik/yonetim/hesaplar/{kisiId}/oturumlari-kapat',
  'POST /v1/yonetim/hesaplar/{kisiId}/pasif': 'POST /v1/kimlik/yonetim/hesaplar/{kisiId}/pasif', 'POST /v1/yonetim/hesaplar/{kisiId}/etkin': 'POST /v1/kimlik/yonetim/hesaplar/{kisiId}/etkin',
  'POST /v1/yonetim/yoneticiler': 'POST /v1/kimlik/yonetim/yoneticiler', 'DELETE /v1/yonetim/yoneticiler/{kisiId}': 'DELETE /v1/kimlik/yonetim/yoneticiler/{kisiId}',
  'GET /v1/onaylar/teyit': 'GET /v1/duzeltmeler/teyitler', 'POST /v1/onaylar/teyit': 'POST /v1/duzeltmeler/teyitler/kararlar', 'POST /v1/onaylar/teyit/ret': 'POST /v1/duzeltmeler/teyitler/kararlar',
  'PATCH /v1/oturumlar/{oturumId}': 'PATCH /v1/dersler/oturumlar/{oturumId}', 'POST /v1/oturumlar/{oturumId}/iptal': 'POST /v1/dersler/oturumlar/{oturumId}/iptal',
  'GET /v1/oturumlar/onaysiz': 'GET /v1/dersler/oturumlar/onaysiz', 'POST /v1/oturumlar/{oturumId}/yapildi-mi': 'POST /v1/dersler/oturumlar/{oturumId}/yapildi-mi',
  'POST /v1/oturumlar/yapildi-mi': 'POST /v1/dersler/oturumlar/yapildi-mi',
  'GET /v1/yonetim/birimler': 'GET /v1/dersler/yonetim/birimler', 'POST /v1/yonetim/birimler': 'POST /v1/dersler/yonetim/birimler',
  'PATCH /v1/yonetim/birimler/{birimId}': 'PATCH /v1/dersler/yonetim/birimler/{birimId}', 'POST /v1/yonetim/birimler/{birimId}/bolumler': 'POST /v1/dersler/yonetim/birimler/{birimId}/bolumler',
  'GET /v1/yonetim/donemler': 'GET /v1/dersler/yonetim/donemler', 'POST /v1/yonetim/donemler': 'POST /v1/dersler/yonetim/donemler',
  'POST /v1/yonetim/takvimler': 'POST /v1/dersler/yonetim/takvimler', 'PUT /v1/yonetim/takvimler/{takvimId}': 'PUT /v1/dersler/yonetim/takvimler/{takvimId}',
  'PUT /v1/yonetim/birimler/{birimId}/donemler/{donemId}': 'PUT /v1/dersler/yonetim/birimler/{birimId}/donemler/{donemId}',
  'GET /v1/yonetim/kilitler': 'GET /v1/dersler/yonetim/kilitler', 'GET /v1/yonetim/dersler': 'GET /v1/dersler/yonetim/dersler',
  'PATCH /v1/yonetim/dersler/{dersId}/oranlar': 'PUT /v1/devam/yonetim/dersler/{dersId}/oranlar',
  'PUT /v1/devam/dersler/{dersId}/oranlar': 'PUT /v1/devam/yonetim/dersler/{dersId}/oranlar', 'PUT /v1/devam/dersler/{dersId}/ogrenciler/{ogrenciId}/muaf': 'PUT /v1/devam/dersler/{dersId}/ogrenciler/{satirId}/muaf',
  'DELETE /v1/kimlik/oturumlar/{oturumId}': 'DELETE /v1/kimlik/oturumlar/{girisOturumuId}', 'GET /v1/raporlar/ogrenciler/{ogrenciId}': 'GET /v1/raporlar/ogrenciler/{satirId}', 'GET /v1/raporlar/donem-sonu': 'GET /v1/raporlar/yonetim/donem-sonu', 'POST /v1/yonetim/dersler/{dersId}/devir': 'POST /v1/dersler/yonetim/dersler/{dersId}/devir',
  'GET /v1/esitleme/degisenler': 'GET /v1/esitleme/degisiklikler',
  'PUT /v1/dersler/{dersId}/yoklama-suresi': 'PATCH /v1/dersler/{dersId}',
  'POST /v1/pencereler/{oturumId}/sure': 'POST /v1/esitleme/gonderim', 'POST /v1/pencereler/{oturumId}/erken-kapat': 'POST /v1/esitleme/gonderim',
  'GET /v1/pencereler/{oturumId}': 'GET /v1/saat/pencereler/{oturumId}', 'GET /v1/saat/belge': 'POST /v1/saat/belge',
  'POST /v1/yoklama/kayitlar': 'POST /v1/esitleme/gonderim', 'POST /v1/yoklama/makbuz-okutmalari': 'POST /v1/esitleme/gonderim',
  'GET /v1/yoklama/kayitlarim': 'GET /v1/esitleme/degisiklikler', 'POST /v1/duzeltmeler/elle-eklemeler': 'POST /v1/esitleme/gonderim',
  'POST /v1/yoklama/elle-eklemeler': 'POST /v1/esitleme/gonderim', 'POST /v1/duzeltmeler/sorun-bildirimleri': 'POST /v1/esitleme/gonderim',
  'GET /v1/duzeltmeler/ben/sorun-bildirimleri': 'GET /v1/esitleme/degisiklikler',
  'GET /v1/esitleme/surum': 'GET /v1/surum',
  'PUT /v1/oturumlar/{oturumId}/kafa-sayisi': 'POST /v1/esitleme/gonderim', 'GET /v1/oturumlar/{oturumId}/kafa-sayisi': 'GET /v1/dogrulama/oturumlar/{oturumId}/kafa-sayisi',
  'GET /v1/oturumlar/{oturumId}/kayitlar': 'GET /v1/yoklama/oturumlar/{oturumId}/kayitlar',
  'POST /v1/oturumlar/{oturumId}/rastgele-isim': 'POST /v1/dogrulama/oturumlar/{oturumId}/rastgele-isim',
  'POST /v1/oturumlar/{oturumId}/sinifta-degil': 'POST /v1/dogrulama/oturumlar/{oturumId}/sinifta-degil',
  'DELETE /v1/oturumlar/{oturumId}/sinifta-degil/{ogrenciId}': 'DELETE /v1/dogrulama/oturumlar/{oturumId}/sinifta-degil/{ogrenciId}',
  'POST /v1/qr/anahtarlar': 'POST /v1/projeksiyon/qr-anahtarlari', 'POST /v1/qr/gosterim-kayitlari': 'POST /v1/esitleme/gonderim',
  'GET /v1/yonetim/geri-yuklemeler': 'GET /v1/veritabani/yonetim/geri-yuklemeler',
  'POST /v1/olcum/sayaclar': 'POST /v1/esitleme/gonderim', 'POST /v1/olcum/ekran-sureleri': 'POST /v1/isletim/ekran-sureleri', 'POST /v1/olcum/panel-sureleri': 'POST /v1/isletim/ekran-sureleri',
};

const DROPPED = [
  ['saat_belgesi', 'Tablo değil: kayıt ve paket içinde aynen taşınan imzalı kısa metin. Biçimi packages/core/src/saat/ (D04), şeması packages/contracts/src/saat.ts.'],
  ['ikinci_capa_paketi', 'Tablo değil: gönderim paketinin imzalı bölümü. Şeması packages/contracts/src/esitleme.ts (D06), doğrulaması D04.saatBelgesiDogrula.'],
  ['kayit_zarfi', 'Tablo değil: kuyrukta, istekte ve makbuz QRında aynı kalan zarf; Zod şeması packages/contracts/src/yoklama.ts (D05).'],
  ['kayit_metni', 'Tablo değil: imzalı kayıt metninin içi; yoklama_kayitlari satırında ham olarak saklanır, biçimi packages/core/src/yoklama/ (D05).'],
  ['kayit_sonucu', 'Tablo değil: gönderim cevabındaki öğe sonucu değeri (x-extensible-enum); packages/contracts/src/yoklama.ts (D05).'],
  ['indirilen_satir_alanlari', 'Tablo değil: telefona inen tablolardaki surum ve silindi sütunları. Kuralı D06nın, sütunu her tablonun modülü ekler ve D06.surumAl ile yazar.'],
  ['esitleme_imleci', 'Tablo değil: telefonda duran opak imleç; biçimi packages/contracts/src/esitleme.ts (D06), nesil D12.nesilOku ile okunur.'],
  ['gonderim_paketi', 'Tablo değil: telefondaki paket zarfı; şeması packages/contracts/src/esitleme.ts (D06).'],
  ['kuyruk_ogesi', 'Tablo değil: telefondaki kuyruk öğesi; gövde şeması öğe türünün modülünde, zarfı packages/contracts/src/esitleme.ts (D06). Sunucu izi gonderim_defteri tablosunda.'],
  ['surum_bilgisi', 'Tablo değil, yinelenen kavram: CInın yayında yazdığı yayin-bilgisi.json dosyası (yayin_bilgisi ile aynı). Dosyayı CI yazar (D15), şeması packages/contracts/src/api.ts (D13), sunucu yalnız okur.'],
  ['yayin_bilgisi', 'Tablo değil: CInın yayında yazdığı yayin-bilgisi.json dosyası; D13 ve D15 önerileri ve D06nın surum_bilgisi tek dosyada birleşti. CI yazar (D15), şema ve okuma D13.'],
  ['hatali_surum_listesi', 'Tablo değil: yayin-bilgisi.json içindeki liste; D07 yalnız okur.'],
  ['sebep_kodu_katalogu', 'Tablo değil: packages/core/src/duzeltmeler/ içinde sabit liste (D09); CHECK kısıtı ve sözleşme oradan türer.'],
  ['rota_tablosu', 'Tablo değil: packages/contracts/src/rotalar.ts kod kaydı (D13); modüllerin rota listelerini birleştirir.'],
  ['hata_kodu_katalogu', 'Tablo değil: packages/contracts/src/hatalar.ts kod kaydı (D13); modül kodları kendi sözleşme dosyalarında.'],
  ['openapi_belgesi', 'Tablo değil: packages/contracts/openapi/<appVersion>.json dosyası (D13).'],
  ['gizli_anahtar_seti', 'Tablo değil: Compose secrets dosyası (D15); sunucu D15.gizliAnahtar ile okur.'],
  ['saat_esitleme_durumu', 'Tablo değil: makinedeki zamanlayıcının yazdığı salt okunur chrony durum dosyası (D15); D04 okur.'],
  ['xprem_veritabani', 'Tablo değil, dış hizmet: xpremin aynı kümedeki ayrı veritabanı. İşletimi D15in, yedeği D12nin (gecelik_pg_dump).'],
  ['donem_sonu_sonuc_goruntusu', 'Yinelenen kavram, hem tablo hem iş olarak önerildi: tablo aksis_ozet_anliklari tablosuna, iş aksis_gun_sonu_anligi işine katıldı (D10).'],
  ['gecici_veri_temizligi', 'Kapsam dışı: tek iş on modülün tablosunu silerdi. Her modül kendi temizliğini yapar (kimlik_temizligi, giris_oturumu_temizligi, projeksiyon_eslestirme_temizle, eposta_gonderim_temizligi); saklama süresi saklama_suresi_isi (D12) ile.'],
  ['giris_bildirimi_eposta', 'Kararla çelişiyor: teknik.html#sunucu-kimlik giriş bildirimini kod e-postasıyla aynı yoldan, kuyruksuz gönderir; gidemezse durum denetim kaydına yazılır. Yeniden deneme ürün kararıdır ve onay bekler.'],
  ['GET /hesap-silme', 'API ucu değil: Caddynin sunduğu girişsiz durağan sayfa. Dosyası docker/caddy/sayfalar/hesap-silme.html, içeriği D01in.'],
  ['GET /gizlilik', 'API ucu değil: Caddy imajındaki durağan gizlilik sayfası (D15).'],
  ['GET /guncelleme/*', 'API ucu değil: Caddynin xpreme ilettiği Expo Updates yolu; Caddyfile D15in.'],
];

const PURPOSE = {
  kayit_kodlari: 'Hocanın tek öğrenci numarası için verdiği tek kullanımlık kayıt kodu; tablo ve uç baştan tasarlanır, kullanımı açık nokta (D01-B24).',
  oturum_son_durumlari: 'Öğrenci, oturum ve tür başına var, yok ve mazeretli saat ile son durum kodu (Var, Yok, Görevli, Belgeli düzeltme, Elle eklendi; muaf öğrencide M).',
  cihaz_dogrulama_degerleri: 'Cihaz bağlama, cihaz değişimi ve App Attest anahtar yenilemesinde kanıta konan tek kullanımlık, 5 dakikalık sunucu değerleri; yalnız özetleri saklanır, kullanılınca düşer.',
  app_attest_sayaclari: 'App Attest anahtarı başına son onay sayacı ve anahtarın etkinliği; açık anahtarın kendisi cihaz_anahtarlari tablosunda (D01).',
  denetim_kayitlari: 'Kim, neyi, ne zaman, neden değiştirdi: bütün modüllerin denetim olayları tek tabloda; yalnız eklenir, uygulama rolü güncelleyemez ve silemez.',
  oturumlar: 'Dersin tek buluşması (ders oturumu): programdan ya da telafiden üretilir, hiç silinmez. Kafa sayısı, yapıldı onayı ve oturum kısa kodu sütunlarını yalnız D02 yazar.',
  dersler: 'Bir hocanın bir dönemdeki ders açılışı: dersin hocası, birim, varsayılan yoklama süresi, teori ve uygulama p değerleri (anlamı D08in, yazımı D02nin).',
  cihazlar: 'Öğrenci telefonunun hesaba bağlanması: durum, platform, ikinci profil, doğrulama sonucu, son sıra numarası; telefon modeli ve son görülen istemci de burada (D01 yazar).',
  giris_oturumlari: 'Öğrenci ve personel giriş oturumları: anahtar özeti, istemci, cihaz etiketi, süreler ve kapanma nedeni; kökteki kanca her istekte buradan okur.',
  ogrenci_hesaplari: 'Öğrenciye özgü alanlar: numara, girilen isim, eşleşme ve ilk kayıt teyidi durumu; teyitli ve silinmemiş numara tekil.',
  kayit_karar_gecmisi: 'Her karar geçişi, otomatik ya da hoca onayı ve reddi: uyan gerekçeler, kaynak ve önceki karar; Kendi beyanı ve İncelemede işlemleri de buraya yazılır.',
  aksis_ozet_anliklari: 'AKSİS özetinin değişmez anlığının başlığı: birimin son günü bitince alınan gün sonu anlığı ya da hocanın son gün aldığı çıktının anlığı.',
  aksis_ozet_anligi_satirlari: 'Anlıktaki öğrenci satırı: tür başına yapılan ve devamsız saat, yüzde, sonuç, KARAR BEKLİYOR ve geçici bayrağı; yazıldıktan sonra değişmez.',
  duzeltmeler: 'Hocanın oturum ve öğrenci için girdiği her düzeltme (Görevli, Belgeli düzeltme, beyana dayalı, elle ekleme); yalnız eklenir, geri alma yeni satırdır.',
  eposta_giris_durumlari: 'Adres başına ardışık yanlış deneme sayacı ve uzayan bekleme; kopyalar arası kesin sayaç olduğu için PostgreSQLde.',
  istemci_surum_esikleri: 'yayin-bilgisi.json dosyasından uygulanan en düşük ve en son sürümün platform ve kanal başına tarihçesi.',
  pgboss_semasi: 'pg-boss kütüphanesinin kendi tabloları (pgboss şeması); Drizzle göçüne girmez, yayın adımında pg-boss migrate kurar.',
  __drizzle_migrations: 'Drizzle göç defteri (drizzle şeması); /health/ready şema sürümünü buradan okur, test sıfırlaması dokunmaz.',
  gonderim_defteri: 'Her kurulumdan gelen her kuyruk öğesinin tek satırı (bütün öğe türleri): kesintisiz son sıra, tekrar ve sıra boşluğu hesabının kaynağı.',
  degisiklik_sayaci: 'Telefona inen tabloların değişiklik sürümünü veren tek satırlık sayaç; satır kilidiyle sırayı korur.',
  oturum_pencereleri: 'Her ders oturumunun yoklama penceresi (oturumla bire bir): planlanan ve son açılış ve kapanış anları, süre ayarı, kapandı ve kesinleşti bilgisi.',
};

// ---------- architect alignment (align/decisions.json) ----------
const notDegistir = (id, eski, yeni) => { const i = NOTES[id].indexOf(eski); if (i < 0) throw new Error('note not found ' + id + ': ' + eski.slice(0, 60)); NOTES[id][i] = yeni; };
notDegistir('D04', 'oturum_pencere_kapat ve kesinti kapanışı kayıtlı dinleyicileri çağırır: D07 (pencere_beklemede_kesinlestir, yenidenDegerlendir), D08 (devam_hesapla), D11 (projeksiyon_baglanti_kapat); D04 bu modülleri içe aktarmaz.',
  'Kayıtlı dinleyiciler: oturumKapandi D07 (güvenlik ağı yeniden değerlendirme, iş koymaz) ve D11 (projeksiyon_baglanti_kapat); kesintiKapandi D07 (partili); pencereDegisti D07 (dogrulama.pencere_degisti, karar aynı işlemde). D04 bu modülleri içe aktarmaz.');
notDegistir('D07', 'Etiket ve karar kuralları packages/core/src/dogrulama/ içinde saf fonksiyon; hatalı sürüm listesi yayin-bilgisi.json dosyasından okunur.',
  'Etiket ve karar kuralları packages/core/src/dogrulama/ içinde saf fonksiyon; hatalı sürüm listesi yalnız D13.yayinBilgisi() ile okunur.');
notDegistir('D10', 'aksis_gun_sonu_anligi, kilit işleminin kuyruğa koyduğu devam_hesapla işleri bitmeden anlık almaz.',
  'D10un kilit adımı (raporlar.gun_sonu_anligi, sira 20) gün sonu anlığı işini kilit işleminde kuyruğa koyar; anlık D08.dersSonuclari ve oturumSonDurumlari ile canlı okur, devam_hesapla işlerini beklemez.');
notDegistir('D12', 'Göç klasörü tektir: apps/server/migrations/<UTC zaman>_<modül>_<açıklama>/; CI göçteki tablo adlarını bu haritayla karşılaştırır.',
  'Göç klasörü tektir (apps/server/migrations/); her modül yalnız <14 haneli UTC>_<belirteç>_<açıklama>/ klasörlerini açar. Klasör kuralı ve CI göç denetimi D12nindir (ortak kural, A1).');
const NOT_EK = {
  D01: ['D01 olaylarını kimlikDinleyicileriniKur ile kurulan dört aboneye (dersler D02, esitleme D06, projeksiyon D11, isletim D15) sabit sırayla, olayı doğuran işlemde verir; bileşim kökleri kurar, D01 aboneleri içe aktarmaz.', 'modules/kimlik D02yi yalnız modules/dersler/yaprak.ts üstünden içe aktarır; deneme dersini jobs/kimlik altındaki inceleme_hesaplari_kurulumu D02.denemeDersiniKur ve D03.denemeListesiniKur ile kurdurur.'],
  D02: ['D03 kendi eklentisinde listeKaynagiKaydet ile etkinSatirlar işlevini verir (çakışma ucu ve şube pasifleştirme); D02 D03ü içe aktarmaz.', 'Kilit adımları sira ile çalışır: dogrulama.karar_kapanisi (D07) 10, raporlar.gun_sonu_anligi (D10) 20; D02nin arşiv ve devam adımları kayıtlı adımlardan sonra gelir.', 'Deneme dersini D01in işi denemeDersiniKur ile kurdurur ya da devrettirir; deneme_dersi_oturumlari yalnız oturum üretir.', 'Personel kapsam kaynağını D02, öğrenci kapsam kaynağını D03 kaydeder.'],
  D03: ['Öğrenci kapsam kaynağını (ogrenci_liste_kapsami) D03 D06ya kaydeder; D02ye listeKaynagiKaydet ile yalnız etkinSatirlar verir.', 'Liste yazması önce değişen şubelerin dogrulama:liste anahtarlarını, satır kilitlerinden sonra kova anahtarlarını alır; D07nin KARAR dinleyicisi kararı liste işleminin içinde verir (plan.html#kararlar-supheli-kayit).'],
  D04: ['Pencere satırının sürümünü D06.surumDamgasiIste ile bırakır; işlemi açan modül (D02 üretimi, D06 gönderimi ya da D04ün kendi işlemi) son adımda surumAl çağırır.'],
  D05: ['Kayıt satırına yazan her yol önce (oturum, öğrenci) çift anahtarını alır (yoklamaCiftAnahtari, katman 3); karar ya da sayılan değişince aynı işlemde D08.devamHesaplaIsiKoy çağrılır.'],
  D06: ['Sürüm damgası tek düzenektir: surumDamgasiIste(tx, damga) damgayı işleme bağlar, işlemi açan modül son adımda surumAl çağırınca sayaç bir kez artar ve bütün damgalar aynı sürümle yazılır; PaketBaglami.surumlaDamgala gönderimdeki kısayoludur; surumAl çağrılmadan biten işlem D12.islemSonuKancasi ile hata verir.', 'Öğrenci kapsam kaynağını D03, personel kapsam kaynağını D02 kaydeder.', 'Gönderim işleminde bütün öğe gruplarının danışma anahtarları OgeIsleyici.kilitAnahtarlari ile toplanır ve D06nın kurulum anahtarıyla tek danismaKilidi çağrısında alınır.'],
  D07: ['Pencere sonucunu (ICINDE, DEGISIM_DILIMI, ESKI_PROGRAM, DISINDA ve kayitAnindaSureSecildi) D04 hesaplar; D07 sonucu karara eşler.', 'D01 ve D05i yalnız onların yaprak.ts dosyalarından ya da eklenti seçeneğiyle, D09u yalnız duzeltmeler/yaprak.ts üstünden kullanır.'],
  D08: ['Ders içindeki öğrenci (ders, numara) ile anılır; hesaptan numaraya D01.ogrenciHesabiGetir toplu çağrısıyla geçilir. Telafi eksiğinin tek tanımı D08indir (dersSonuclari.telafiEksigi); D10 yalnız gösterir.', 'D09u yalnız modules/duzeltmeler/yaprak.ts ve packages/core/src/duzeltmeler üstünden içe aktarır.'],
  D09: ['denetimeYaz, denetimOlaylariniKaydet, duzeltmeleriGetir ve acikSorunBildirimleri modules/duzeltmeler/yaprak.ts içindedir; D05, D07, D08 ve D10 D09u yalnız buradan içe aktarır.'],
  D11: ['Gösterim kaydı gelince kayıtlı dinleyiciler (D07) iki aşamada çağrılır: anahtarlar (kilitsiz okuma) ve calistir; D11 D07yi içe aktarmaz. Atlanan satırları projeksiyon_bekleyen_yeniden_hesapla işi 5 saniye sonra tamamlar.'],
  D12: ['Danışma kilidi katmanları ve DANISMA_KATMANLARI tablosu D12nin sözleşme dosyasındadır; elle pg_advisory_xact_lock yazılmaz.', 'Saklama sınıfları SAKLAMA_VERI_SINIFLARI kataloğundadır; sıra kataloğun oncesinde listesinden gelir, modül kayıtta sıra bildirmez.', 'cli/geri-yukleme bileşim kökü olarak D01in kimlikDinleyicileriniKur, hesabiSil ve oturumlariKapat işlevlerini çağırır; infra/veritabani hiçbir modülü içe aktarmaz.'],
  D13: ['yayin-bilgisi.json yalnız yayinBilgisi() ile okunur; başka modül kendi okuyucusunu tutmaz.', 'CI betikleri (openapi-belgesi-sakla, oasdiff-kirilma-denetimi) apps/server/scripts/api/ altındadır; jobs/api yoktur.', 'app.ts (uygulamaKur) api ve isci süreçlerinde D01.kimlikDinleyicileriniKur ile dört aboneyi kurar.'],
  D14: ['worker.ts bileşim köküdür: D15 (ayarlariYukle, logOlustur, isletimIsleri), D13 (uygulamaKur) ve D12 (veritabaniKur, veritabaniIsleri) bağlar; infra/is-kuyrugu ve infra/eposta alan modülü içe aktarmaz.'],
  D15: ['server.ts ve cli/ girişleri bileşim köküdür; D01, D03, D04 ve D07 dış yüzlerini yalnız bunlar çağırır, infra/izleme ve infra/ayarlar alan modülü içe aktarmaz.', 'olcum_ önekli görünüm göçleri <14 haneli UTC>_isletim_<açıklama> klasöründedir ve başka tabloları okuyabilir (göçlerin tablo denetiminin tek istisnası).'],
};
for (const [id, list] of Object.entries(NOT_EK)) NOTES[id].push(...list);
PURPOSE.oturum_pencereleri = 'Her ders oturumunun yoklama penceresi (oturumla bire bir): planlanan ve son açılış ve kapanış anları, süre ayarı, taşıma anı, şubeler ve kapandı bilgisi; kesinleşmeyi D07 izler (D04-B03).';

// ---------- build ----------
const mods = Object.keys(NAME).map(id => {
  const n = NAME[id], tag = n.replace(/-/g, '_');
  return {
    id, name: n, title: title[id],
    path: INFRA[id] || `apps/server/src/modules/${n}/`,
    contracts_file: `packages/contracts/src/${n}.ts`,
    migration_dir: `apps/server/migrations/<14 haneli UTC>_${tag}_<açıklama>/ (tek Drizzle klasörü; ${id} yalnız bu adla klasör açar, göçü yalnız ${id} tablolarına dokunur; klasör kuralı ve CI denetimi D12nin)` + (id === 'D14' ? '; pgboss şeması pg-boss migrate ile' : ''),
    owns_tables: TABLES[id], owns_endpoints: ENDPOINTS[id], owns_jobs: JOBS[id],
    exports: EXPORTS[id], reads_from: READS[id],
    queue_items: QUEUE_ITEMS[id] || [], notes: NOTES[id] || [],
  };
});

// endpoint renames from inventories
const stripQ = p => p.split('?')[0];
const owned = new Map(); for (const m of mods) for (const e of m.owns_endpoints) owned.set(e, m.id);
const droppedNames = new Set(DROPPED.map(d => norm(d[0])));
const endpoint_renames = {}; const problems = [];
const usedEP = new Set();
for (const d of inv) for (const e of d.endpoints || []) {
  const key = `${e.method} ${e.path}`;
  if (droppedNames.has(norm(key))) continue;
  const base = `${e.method} ${stripQ(e.path)}`;
  const canon = EP[key] || EP[base] || base;
  if (EP[key]) usedEP.add(key); if (EP[base]) usedEP.add(base);
  if (!owned.has(canon)) problems.push(`unowned endpoint ${key} -> ${canon} (${d.id})`);
  if (canon !== key) endpoint_renames[key] = canon;
}
for (const k of Object.keys(EP)) if (!usedEP.has(k)) problems.push(`EP map key not in any inventory: ${k}`);
const hit = new Set(Object.values(endpoint_renames)); for (const d of inv) for (const e of d.endpoints || []) hit.add(`${e.method} ${e.path}`);
for (const e of owned.keys()) if (!hit.has(e)) problems.push(`owned endpoint never proposed: ${e}`);

// tables: merged_from and purpose
const tableOwner = new Map(); for (const m of mods) for (const t of m.owns_tables) tableOwner.set(t, m.id);
const jobOwner = new Map(); for (const m of mods) for (const j of m.owns_jobs) jobOwner.set(j, m.id);
const merged = new Map([...tableOwner.keys()].map(t => [t, new Set()]));
const firstPurpose = new Map();
const entNames = new Set(), jobNames = new Set();
for (const d of inv) {
  for (const e of d.entities || []) {
    entNames.add(e.name);
    if (droppedNames.has(norm(e.name))) continue;
    const c = RENAMES[e.name] || e.name;
    if (!merged.has(c)) { problems.push(`unowned table ${e.name} -> ${c} (${d.id})`); continue; }
    merged.get(c).add(e.name);
    const own = tableOwner.get(c);
    if (!firstPurpose.has(c) || d.id === own) if (!(firstPurpose.has(c) && firstPurpose.get(c).own)) firstPurpose.set(c, { text: e.purpose, own: d.id === own });
  }
  for (const j of d.jobs || []) {
    jobNames.add(j.name);
    if (droppedNames.has(norm(j.name))) continue;
    const c = RENAMES[j.name] || j.name;
    if (!jobOwner.has(c)) problems.push(`unowned job ${j.name} -> ${c} (${d.id})`);
  }
}
for (const n of entNames) if (jobNames.has(n) && !droppedNames.has(norm(n)) && RENAMES[n]) problems.push(`name used as table and job with one rename: ${n}`);
merged.get('aksis_ozet_anliklari').add('donem_sonu_sonuc_goruntusu');
const firstSentence = s => { s = String(s).replace(/\s+/g, ' ').trim(); const i = s.search(/[.;] /); let r = i > 40 && i < 240 ? s.slice(0, i) : s; if (r.length > 240) r = r.slice(0, r.lastIndexOf(' ', 236)); return r.replace(/[.;,:]+$/, '') + '.'; };
const canonical_tables = [];
for (const m of mods) for (const t of m.owns_tables) {
  const p = PURPOSE[t] || (firstPurpose.get(t) ? firstSentence(firstPurpose.get(t).text) : '');
  if (!p) problems.push(`no purpose for ${t}`);
  canonical_tables.push({ name: t, owner: m.id, merged_from: [...merged.get(t)].sort(), purpose: p });
  if (!merged.get(t).size) problems.push(`table ${t} has no inventory source`);
}
const renames = {}; for (const [a, b] of Object.entries(RENAMES)) { if (!entNames.has(a) && !jobNames.has(a)) problems.push(`rename key unused: ${a}`); renames[a] = b; }

// ---------- file ownership ----------
const fo = [];
const add = (glob, owner, note) => fo.push(note ? { glob, owner, note } : { glob, owner });
for (const id of ['D01', 'D02', 'D03', 'D04', 'D05', 'D06', 'D07', 'D08', 'D09', 'D10', 'D11']) {
  const n = NAME[id];
  add(`apps/server/src/modules/${n}/*`, id); add(`apps/server/src/jobs/${n}/*`, id);
  add(`apps/server/test/features/${n}/*`, id); add(`apps/server/test/steps/${n}/*`, id); add(`apps/server/test/support/kurucular/${n}.ts*`, id);
  add(`packages/contracts/src/${n}.ts*`, id); add(`packages/core/src/${n}/*`, id);
}
for (const id of ['D12', 'D13', 'D14', 'D15']) {
  const n = NAME[id];
  if (id !== 'D13') add(`apps/server/src/jobs/${n}/*`, id); add(`apps/server/test/features/${n}/*`, id); add(`apps/server/test/steps/${n}/*`, id); add(`packages/contracts/src/${n}.ts*`, id);
}
add('apps/server/src/cli/yonetici-ekle*', 'D01'); add('apps/server/src/cli/yoklama-kaniti*', 'D05'); add('apps/server/src/cli/esitleme-*', 'D06'); add('docker/caddy/sayfalar/hesap-silme*', 'D01');
add('apps/server/src/infra/saat/*', 'D04'); add('apps/server/test/support/sahte-saat*', 'D04');
add('apps/server/src/infra/veritabani/*', 'D12');
for (const id of Object.keys(NAME)) add(`apps/server/migrations/??????????????_${NAME[id].replace(/-/g, '_')}_*`, id, `Yalnız ${id} bu belirteçle göç klasörü açar (14 haneli UTC önek, migration.sql ve snapshot.json). Klasör kuralı ve CI göç denetimi D12nin (A1).`);
add('apps/server/drizzle.config.ts*', 'D12'); add('docker/postgres/*', 'D12'); add('apps/server/test/support/sifirlama*', 'D12'); add('apps/server/src/cli/geri-yukleme*', 'D12');
add('apps/server/src/infra/api/*', 'D13'); add('apps/server/src/app.ts*', 'D13'); add('packages/contracts/src/ortak/*', 'D13'); add('packages/contracts/src/rotalar.ts*', 'D13');
add('packages/contracts/src/hatalar.ts*', 'D13'); add('packages/contracts/src/istemci.ts*', 'D13'); add('packages/contracts/openapi/*', 'D13'); add('packages/contracts/package.json*', 'D13');
add('packages/contracts/tsconfig*', 'D13'); add('.github/workflows/sozlesme*', 'D13'); add('apps/server/scripts/api/*', 'D13');
add('apps/server/src/infra/is-kuyrugu/*', 'D14'); add('apps/server/src/infra/eposta/*', 'D14'); add('apps/server/src/worker.ts*', 'D14'); add('apps/server/test/support/sahte-posta*', 'D14'); add('apps/server/test/support/is-kuyrugu*', 'D14');
add('apps/server/src/infra/izleme/*', 'D15'); add('apps/server/src/infra/ayarlar/*', 'D15'); add('apps/server/src/server.ts*', 'D15'); add('apps/server/src/cli/anahtar-uret*', 'D15'); add('apps/server/src/cli/olcum-raporu*', 'D15'); add('apps/server/src/cli/olay*', 'D15'); add('docker/isletim/*', 'D15');
add('apps/server/test/support/dunya*', 'D15'); add('apps/server/test/support/kancalar*', 'D15'); add('apps/server/test/yuk/*', 'D15');
add('apps/server/package.json*', 'D15'); add('apps/server/tsconfig*', 'D15'); add('apps/server/cucumber*', 'D15'); add('apps/server/Dockerfile*', 'D15');
add('packages/core/package.json*', 'D15'); add('packages/core/tsconfig*', 'D15'); add('packages/core/stryker*', 'D15');
add('docker/caddy/Caddyfile*', 'D15'); add('docker/caddy/sayfalar/gizlilik*', 'D15'); add('docker/xprem/*', 'D15'); add('compose.yaml*', 'D15'); add('compose.gelistirme.yaml*', 'D15');
add('.github/workflows/kalite*', 'D15'); add('.github/workflows/guvenlik*', 'D15'); add('.github/workflows/haftalik*', 'D15'); add('.github/workflows/yayin*', 'D15'); add('.github/dependabot.yml*', 'D15');
add('package.json*', 'D15'); add('pnpm-workspace.yaml*', 'D15'); add('pnpm-lock.yaml*', 'D15'); add('biome.json*', 'D15'); add('tsconfig.base.json*', 'D15'); add('.env.example*', 'D15'); add('.node-version*', 'D15'); add('.gitignore*', 'D15');

const shared_rules = [
  'Tek yazar: bir tabloya yalnız o tablonun modülü yazar (INSERT, UPDATE, DELETE ve göç). Başka modül okumak ya da değiştirmek için o modülün index.ts dış yüzünü çağırır; tek istisna teknik.html#sunucu-mimari: raporlar (D10) ve olcum_ önekli görünümler (D15) başka tabloları yalnız okur.',
  'Dış yüz: alan modülünde apps/server/src/modules/<ad>/index.ts, altyapıda apps/server/src/infra/<ad>/index.ts tek giriştir; iç dosyalar @package etiketlidir, sınırı Biome noPrivateImports hata düzeyinde denetler. Dış yüz çağıranın işlemini (tx) parametre alır, havuzdan bağlantı istemez; index.ts yüklenirken başka modülü çağırmaz.',
  'Tablo tanımı modules/<ad>/tablolar.ts içindedir; yabancı anahtar için başka modülün tablo tanımı içe aktarılabilir, başka modülün tablosuna sütun eklenmez. Sütun gereken modül tablonun modülünden ister; sütunu o modül ekler ve yazar, isteyen dış yüzden okur.',
  'Adlar ASCII Türkçe snake_case (ç c, ğ g, ı i, ö o, ş s, ü u). Tablo adı çoğul (yoklama_kayitlari); defter, geçmiş ve liste tabloları topluluk adıyla (gonderim_defteri, kayit_karar_gecmisi, android_iptal_listesi), tek satırlık sayaç tekil (degisiklik_sayaci). Yabancı anahtar <tekil_ad>_id, anlık zaman _ani sonekli timestamptz, kısıt ve dizin <tablo>_<sütunlar>_<pk|fk|uq|ck|idx> (D12-B01).',
  'Tek başına oturum sözcüğü şemada ve yolda hep ders oturumudur (oturumlar, oturum_id); giriş oturumu her yerde giris_oturumlari ve giris_oturumu_id.',
  'Kimlikler UUIDv7, varsayılan açıkça uuidv7(); dışa açık jeton olarak kullanılmaz. Yoklama kaydına başvuran her tablo (donem_id, kayit_id) çiftini kullanır.',
  'Zaman: anlar UTC timestamptz; program saati yerel time ve ders günü date, Europe/Istanbul ile yorumlanır. Kural kodunda SQL now() ve Date.now() yoktur, saat D04ün saat arayüzünden gelir; iş zamanlamaları Europe/Istanbul.',
  'Sayılar: uygulamada para alanı yoktur. Saat, sayaç ve yüzde tam sayı saklanır (yüzde onda bir birimli tam sayı); kayan nokta yoktur; 64 bitlik değerler JSONda metindir. Durum ve kod listeleri PostgreSQL enum değil, metin ve CHECK.',
  'Uç yolu kendi modülünün önekiyle başlar: /v1/<modül>/...; yalnız yöneticiye açık uçlar /v1/<modül>/yonetim/... altındadır. Açık istisnalar dört kök uçtur: /health/live, /health/ready, /v1/durum (D15) ve /v1/surum (D13). Yol küçük harf ve tireli, JSON alanı camelCase, hata kodu BÜYÜK_HARF (D13-B14); durum, tür ve neden değerlerinin yazımı tanımlayan modülün sözleşme sabitindedir, başka modül onları yeniden yazmaz, içe aktarır.',
  'Telefonun kuyruğa koyduğu her öğe POST /v1/esitleme/gonderim ile gelir. D06 yalnız dağıtır; öğe gövdesinin şeması ve iş kuralı öğe türünün modülündedir.',
  'Kayıt deseni: altyapı ve dağıtıcı modüller alan modülünü içe aktarmaz, alt modül üst modülü çağırmak yerine dinleyici kaydı açar. Alan modülü kendi eklentisinde kaydolur: kuyruk öğesi işleyicisi ve indirme kaynağı D06ya, saklama işleyicisi D12ye, rota listesi D13ün rota tablosuna, oturum üretimi ve kilit adımı D02ye, liste değişikliği D03e, oturum ve kesinti kapanışı D04e. İş tanımları jobs/<modül>/index.ts dosyasından worker.ts ile toplanır; bileşim kökleri app.ts, server.ts ve worker.ts altyapıyı parametreyle verir.', 'Yaprak işlevler: çok modülün çağırdığı ve başka modül çağırmayan işlevler (dış yüzde [yaprak] işaretli: D09 denetimeYaz, D06 surumAl ve ogrenciDurumuDegisti, D08 devamHesaplaIsiKoy) modülün ayrı giriş dosyasında (modules/<ad>/yaprak.ts) durur; bunlara giden çağrı dosya düzeyinde döngü kurmaz. Kalan iki yönlü çağrılarda index.ts yüklenirken başka modülü çağırmaz.',
  'Sözleşmeler: her modülün kendi dosyası packages/contracts/src/<modül>.ts (şemalar, rota listesi, <MODÜL>_ önekli hata kodları, denetim olay türleri). Ortak zarf, sayfalama, kimlik ve zaman tipleri packages/contracts/src/ortak/ (D13). rotalar.ts ve hatalar.ts yalnız birleştirir ve iskelette bir kez yazılır. Cevaplarda büyüyebilen değerler x-extensible-enum taşır.',
  'Ortak kurallar packages/core/src/<modül>/ içinde saf fonksiyondur ve o modülündür; Intl kullanmaz, UTC milisaniyeyle hesaplar, veritabanı ve saat dışarıdan verilir.',
  'Göçler tek Drizzle klasöründe (apps/server/migrations/): her göç <UTC zaman>_<modül>_<açıklama> alt klasöründe, yalnız adındaki modülün tablolarına dokunur, yalnız ileri ve önce genişlet sonra daralt. D12nin CI denetimi göçteki tablo adlarını bu haritayla karşılaştırır, uymazsa durur.',
  'İşler: kuyruk adı iş adıyla aynıdır, işleyici apps/server/src/jobs/<modül>/ altında işi kuran modülündür. İş verisi yalnız iç kimlik taşır (numara, isim, kod yok); her iş aynı girdiyle iki kez çalışınca aynı sonucu verir; iş tetikleyen işlemin içinde D14.isGonder(tx, ...) ile kuyruğa girer.',
  'Denetim olayı yazan her modül D09.denetimeYaz çağırır; olay türü <modül>.<olay> adıyla modülün sözleşme dosyasında tanımlıdır. Denetim tablosuna uygulama rolü yalnız ekler ve okur.',
  'Testler: modülün davranış senaryoları apps/server/test/features/<modül>/, adımları steps/<modül>/, veri kurucusu support/kurucular/<modül>.ts. Ortak test dünyası ve kancalar D15in, veritabanı sıfırlama D12nin, sahte saat D04ün, sahte posta D14ün.',
  'Paylaşılan tek dosyaları tek modül yazar: kök package.json, pnpm katalog, apps/server/package.json, Biome ve tsconfig D15in (yeni paket isteği D15e gider); app.ts D13ün, server.ts D15in, worker.ts D14ün; üçü iskelette bütün modülleri bir kez listeler.',
  'Başka modülün dış yüzü ya da şeması değişecekse değişikliği o modül yapar; dış yüz ve şema yalnız ekleyerek büyür, kaldırma önce genişlet sonra daralt ile iki adımda.',
  'Numara, isim, kod, anahtar ve jeton loga, adres satırına ve iş verisine girmez; loglarda iç kimlik ve rota kalıbı kullanılır.',
  'apps/mobile ve apps/panel bu haritanın dışındadır; sunucu tarafındaki sözleşmeleri packages/contracts üstünden kullanırlar.',
];

const decisions = [
  { topic: 'Modül adları ve klasörler', decision: 'On bir alan modülü apps/server/src/modules/<ad>/ altında: kimlik (D01), dersler (D02), listeler (D03), saat (D04), yoklama (D05), esitleme (D06), dogrulama (D07), devam (D08), duzeltmeler (D09), raporlar (D10), projeksiyon (D11). Dört kesen modül apps/server/src/infra/ altında: veritabani (D12), api (D13), is-kuyrugu (D14, ayrıca infra/eposta), isletim (D15, kodu infra/izleme ve infra/ayarlar).', why: 'teknik.html#kod klasör düzenini (modules/<ad>, infra, jobs, cli, migrations) ve adların çoğunu (kimlik, dersler, listeler, yoklama, duzeltmeler, raporlar) zaten koyuyor. teknikteki oturumlar modülü D02 (üretim ve tablo) ile D04 (pencere) arasında bölündü; yonetim modülünün yerine yönetici uçları her modülün kendi önekine girdi.' },
  { topic: 'Uç yolu öneki', decision: 'Her uç kendi modülünün önekiyle başlar (/v1/<modül>/...); yönetici uçları /v1/<modül>/yonetim/... altında. Açık istisnalar /health/live, /health/ready, /v1/durum (D15) ve /v1/surum (D13). Bu kuralla 24 /v1/yonetim/ ve /v1/oturumlar/ yolu yeniden adlandırıldı.', why: 'teknik.html#sunucu: her modül /v1/<modül> altında kendi eklentisi. Ucun modülü yolun ikinci bölümünden okunur, rota tablosu testi denetler; yönetici rolü kökte yol kalıbından ikinci kez denetlenebilir. D13-B14teki /v1/yonetim örneği 15 alanda karşılığı olmayan yönetim modülüne dayanıyordu.' },
  { topic: 'Ortak kuyruk tek uçtan gelir', decision: 'Telefonun kuyruğa koyduğu her şey POST /v1/esitleme/gonderim ile gelir (D06). Öğe türleri ve modülleri: yoklama_kaydi ve makbuz_okutmasi (D05), pencere_suresi ve erken_kapatma (D04), kafa_sayisi (D07), elle_ekleme ve sorun_bildirimi (D09), gosterim_kaydi (D11), telefon_sayaci (D15). Bu türler için önerilen 11 ayrı uç bu uca bağlandı.', why: 'D06-B01: sıra numarası tek alan, ikinci çapa paket başına imzalı, gönderim tek bağlantı ve tek işlem (teknik.html#sunucu-mimari). Ayrı uçlar kesintisiz son sıra hesabını ve paket imzasını türlere böler.' },
  { topic: 'Öğrencinin kendi durumu', decision: 'Öğrencinin kendi kayıtları, kararları, düzeltmeleri ve sorun bildirimleri GET /v1/esitleme/degisiklikler içinde iner; GET /v1/yoklama/kayitlarim ve GET /v1/duzeltmeler/ben/sorun-bildirimleri ayrı uç olmadı, verilerini D05 ve D09 indirme kaynağı olarak verir.', why: 'Karar teslim anı ve öğrenci durum sürümü D06da; 3 günlük sorun bildirme süresi bu teslim anından başlar. İki yol aynı kararı iki kez teslim edince hangi anın sayılacağı belirsiz kalır.' },
  { topic: 'Kayıt kararının tek yazarı', decision: 'yoklama_kayitlari tablosunu, karar, gerekçe ve etiket sütunları dahil, yalnız D05 yazar. Kararı D07 verir: ilk kararda kararHesapla, sonraki her geçişte kararDegistir; D07 kayit_karar_gecmisi tablosunu yazar, sütunları D05.kararSutunlariniYaz ile değiştirtir. D09 onay ve ret uçları D07.kararDegistir çağırır; kayit_onayi ayrı tablo olmadı.', why: 'D04, D07 ve D09 aynı sütunları yazmayı önerdi; üç yazar hangi geçişin son olduğunu belirsizleştirir. Sütunlar teknik.html#kod-veri-modeli gereği kayıt satırında kalır.' },
  { topic: 'Ders oturumu ve pencere', decision: 'Ders oturumu tablosu oturumlar (D02); oturum, oturumlar ve ders_oturumu buna bağlandı. kafa_sayisi ve yapildi sütunlarını D02 yazar, D07 kafaSayisiniYaz ile ister. Pencere ayrı tabloda (oturum_pencereleri, pencere_degisiklikleri, D04); D02 oturum üretirken aynı işlemde D04.pencereleriHesapla çağırır.', why: 'D02 tablosunda D04 ve D07 sütunları sütun düzeyinde yazma yetkisi demekti; tek yazar kuralı tablo düzeyinde denetlenebilir.' },
  { topic: 'Giriş oturumu adı', decision: 'Giriş oturumu tablosu her yerde giris_oturumlari (D01); giris_oturumu buna bağlandı. Tek başına oturum hep ders oturumudur.', why: 'teknik.html oturum sözcüğünü iki anlamda kullanıyor; oturum_id gibi sütunlarda karışıklık yanlış birleştirmeye yol açar.' },
  { topic: 'Cihaz doğrulama değeri ve App Attest', decision: 'kayit_sorulari ile cihaz_dogrulama_degerleri tek tablo: cihaz_dogrulama_degerleri (D07), tek uç POST /v1/dogrulama/deger. App Attest açık anahtarı cihaz_anahtarlari tablosunda (D01), anahtar başına sayaç app_attest_sayaclari tablosunda (D07); app_attest_anahtarlari buna katıldı. Anahtar yenileme ucu D01in POST /v1/kimlik/cihaz/app-attest-yenile ucu, kanıtı D07.cihazKanitiniDogrula doğrular.', why: 'İki envanter aynı tek kullanımlık değeri ve aynı yenileme ucunu ayrı ayrı önerdi. Değeri kanıtı doğrulayan modül verip tüketince tazelik kuralı tek yerde kalır; cihaz bağlama ve anahtar listesi D01in kapsamı.' },
  { topic: 'Saat eşitlemesinin tek kaynağı', decision: 'Eşitleme durumu makinedeki chronyden gelir: D15in saat_esitleme_izleme işi durum dosyasını yazar. D04ün saat_esitleme_denetimi her API sürecinde bu dosyayı okur, eşiği uygular, saat belgesini durdurur ve saat_esitleme_kesintileri tablosuna yazar. Süreç içi SNTP ölçümü yapılmaz.', why: 'İki ölçüm (chrony ve SNTP) aynı soruya farklı cevap verebilir. Kural (eşik, kesinti, yeniden değerlendirme) D04ün, makine ve uyarı D15in kapsamı.' },
  { topic: 'Dönem kilidi', decision: 'Tek iş donem_kilidi (D02). Aynı işlemde D07.donemKilidiKararKapanisi adımını çağırır (onaysız ve kararsız kilitlenen kayıtlar, denetim olayları D09.denetimeYaz ile). donem_kilidi_karar_kapanisi, donem_kilidi_onaysiz_kendi_beyani ve donem_kilidi_yan_etkileri ayrı iş olmadı. Bekleyen öğrenci kayıtlarını D01in gecelik bekleyen_kayit_kapatma işi kapatır.', why: 'D07 envanteri adımı zamanlanmış iş değil, kilit işleminin içinde diye tanımladı; üç ayrı iş aynı kayıtları farklı saatlerde kilitlemeye çalışıyordu.' },
  { topic: 'AKSİS anlığı', decision: 'Gün sonu ve çıktı anlığı tek tablo çifti: aksis_ozet_anliklari ve aksis_ozet_anligi_satirlari (D10). D08in donem_sonu_sonucu ve D09un donem_sonu_sonuc_goruntusu buna katıldı; tek iş aksis_gun_sonu_anligi (D10), donem_sonu_anligi buna bağlandı. Satır değerleri D08.dersSonuclari ile gelir.', why: 'D10-B13: raporlar modülü yalnız kendi tablosunu yazar. Üç modülün aynı anlığı ayrı tutması sonradan değişenler ve Haksız devamsız karşılaştırmasını belirsiz yapar.' },
  { topic: 'Oran ve muaf', decision: 'p değerlerini değiştiren tek uç PUT /v1/devam/dersler/{dersId}/oranlar (D08), değer dersler tablosunda kalır ve D02.oranlariYaz yazar. Muaf işaretini değiştiren tek uç PUT /v1/devam/dersler/{dersId}/ogrenciler/{ogrenciId}/muaf (D08), değer liste_satirlari tablosunda kalır ve D03.muafIsaretle yazar. PATCH /v1/listeler/satirlar/{satirId} gövdesinden muaf alanı çıkar.', why: 'Anlam, yetki ve yeniden hesap D08in; sütunların yeri teknik.html#kod-veri-modeli kararı (derste p, liste satırında muaf). İki uç aynı alanı değiştirince denetim ve yeniden hesap iki yoldan yürür.' },
  { topic: 'Teyit ve elle ekleme', decision: 'İlk kayıt teyidi uçları D09da: GET /v1/duzeltmeler/teyitler ve POST /v1/duzeltmeler/teyitler/kararlar; teyit alanlarını D01.ogrenciTeyitEt yazar. Elle ekleme bir düzeltme türüdür (duzeltmeler, D09): panelde POST /v1/duzeltmeler, telefonda elle_ekleme kuyruk öğesi.', why: 'Onay listeleri D09un, öğrenci hesabı D01in kapsamı. Elle ekleme D05 ve D09 envanterlerinin ikisinde de görünüyordu.' },
  { topic: 'Denetim kaydı', decision: 'Tek denetim tablosu denetim_kayitlari (D09); denetim_kaydi buna bağlandı. Olay yazan her modül D09.denetimeYaz çağırır.', why: 'teknik.html#kod-veri-modeli: düzeltmeler ve onaylar ayrı tabloya yazılır, uygulama rolü yalnız ekler ve okur. Tek tablo tek yetki kuralı demek.' },
  { topic: 'Temizlik ve saklama', decision: 'gecici_veri_temizligi kalktı; her modül kendi geçici verisini kendi işiyle siler (kimlik_temizligi, giris_oturumu_temizligi, projeksiyon_eslestirme_temizle, eposta_gonderim_temizligi). Saklama süresi işi saklama_suresi_isi (D12); modüller saklama işleyicisiyle kaydolur, satırı modülün kendi kodu siler, D12 kanıtı saklama_islemleri tablosuna yazar.', why: 'Kesen modüller alan tablosu yazmaz; tek temizlik işi on tabloya yazınca tek yazar kuralı bozulurdu.' },
  { topic: 'Sürüm sorgusu ve yayın bilgisi', decision: 'Sürüm ucu GET /v1/surum (D13); GET /v1/esitleme/surum buna bağlandı. surum_bilgisi ve iki yayin_bilgisi önerisi tek dosya: yayin-bilgisi.json; CI yazar (D15), şeması packages/contracts/src/api.ts (D13), sunucu yalnız okur. Uygulanan eşiklerin tarihçesi istemci_surum_esikleri (D13).', why: 'Üç envanter aynı CI dosyasını üç adla önerdi; dosya tablo değil. D13-B14 /v1/surum ucunu modülsüz kök uç sayıyor.' },
  { topic: 'Göç klasörü', decision: 'Tek Drizzle klasörü apps/server/migrations/ (D12). Her göç <UTC zaman>_<modül>_<açıklama> alt klasöründe, yalnız adındaki modülün tablolarına dokunur; D12nin CI denetimi bunu bu haritayla karşılaştırır. Tablo tanımı modules/<ad>/tablolar.ts içinde.', why: 'Drizzle bütün şemadan tek sıralı klasör üretir; modül başına klasör, karşılıklı yabancı anahtarların (kisiler ile birimler) sırasını bozar. Zaman önekli ad iki mühendisin aynı dosyayı yazmasını önler.' },
  { topic: 'Kayıt deseni', decision: 'Altyapı ve dağıtıcı modüller alan modülünü içe aktarmaz; alan modülü kendi eklentisinde D06ya (kuyruk öğesi, indirme kaynağı), D14e (iş tanımı), D12ye (saklama işleyicisi) ve D13ün rota tablosuna kaydolur.', why: 'Yeni öğe türü, iş ya da rota eklemek ortak bir dosyayı değiştirmez; 15 mühendis aynı listeyi düzenlemez.' },
  { topic: 'Sözleşme dosyaları', decision: 'packages/contracts/src/<modül>.ts her modülün kendi dosyası. Ortak tipler packages/contracts/src/ortak/, birleştiren rotalar.ts ve hatalar.ts, fetch yardımcısı istemci.ts ve openapi/ D13ün.', why: 'teknik.html tek rota tablosu ve tek hata kataloğu istiyor; tek dosyayı 15 kişinin düzenlemesi çakışma demek. Birleştirme dosyası tek, içerik modül dosyalarında.' },
  { topic: 'Yedek, sıra boşluğu ve bekleyen kararlar', decision: 'xprem_birim_kopyasi, xprem_birimi_yedegi işine (D12); sira_boslugu_denetimi, sira_boslugu_raporu işine (D06); qr_gosterim_beklemesi_bitir, bekleyen_kararlari_coz işine (D07); oturum_kapat ve oturum_kapatma, oturum_pencere_kapat işine (D04) bağlandı.', why: 'Her çiftte iki modül aynı veriyi aynı amaçla işliyordu; iş, yazdığı tablonun modülüne verildi (yedek D12, tek gönderim defteri D06, karar D07, pencere D04).' },
  { topic: 'Giriş bildirimi e-postası', decision: 'giris_bildirimi_eposta işi yok: bildirim kod e-postasıyla aynı yoldan, kuyruksuz gider; gidemezse durum denetim kaydına yazılır.', why: 'teknik.html#sunucu-kimlik bunu açıkça söylüyor; yeniden deneme ürün kararıdır ve onay bekler.' },
  { topic: 'Durağan sayfalar', decision: 'GET /hesap-silme ve GET /gizlilik API ucu değil, Caddynin sunduğu durağan sayfa; GET /guncelleme/* Caddynin xpreme ilettiği yol. hesap-silme sayfasının dosyası D01in, Caddyfile ve gizlilik sayfası D15in.', why: 'Girişsiz ve durağan içerik API düşse de açılmalı; rota tablosuna ve oasdiffe girmez.' },
  { topic: 'Telefon sayaçları ve ekran süreleri', decision: 'Telefon sayaçları telefon_sayaci kuyruk öğesiyle gelir ve D15 yazar; panelin ekran süreleri POST /v1/isletim/ekran-sureleri (D15). POST /v1/olcum/sayaclar, /v1/olcum/ekran-sureleri ve /v1/olcum/panel-sureleri buna bağlandı.', why: 'Sayaç paketi ortak kuyruktan gelir (D15-B22); uç öneki modül adına uyar.' },
  { topic: 'Paylaşılan tek dosyalar', decision: 'Kök package.json, pnpm katalog, apps/server/package.json, Biome, tsconfig, compose.yaml ve .github/ D15in (sözleşme iş akışı D13ün); app.ts D13ün, server.ts D15in, worker.ts D14ün.', why: 'Her paylaşılan dosyayı tek modül yazınca paralel çalışmada birleştirme çakışması çıkmaz; bağımlılık eklemek tek kapıdan geçer.' },
];

decisions.push(
  { topic: 'İki yönlü çağrılar', decision: 'Alt modülün üst modülü çağırdığı yerde dinleyici kaydı kullanılır: D02 (oturum üretimi, kilit adımı), D03 (liste değişikliği), D04 (oturum ve kesinti kapanışı). Kesen modüller birbirini içe aktarmaz, bileşim kökleri bağlar; çok modülün çağırdığı yaprak işlevler ayrı giriş dosyasındadır. Yaprak dışı kalan iki yönlü çiftler alanın doğasından gelir: D01 ile D02 (birim ve yetki, devir hedefi), D01 ile D07 (cihaz kanıtı ve cihaz okuma), D05 ile D07 (karar ve kayıt), D08 ile D09 (düzeltme ve sonuç).', why: 'İlk taslakta 27 iki yönlü modül çifti vardı; dosya düzeyinde döngü dependency-cruiser no-circular kuralını kırar ve bir modülün testini öbürünün koduna bağlar.' },
  { topic: 'İşletim denetimi işi', decision: 'isletim_denetimi D15e geçti: D14.isSagligi ile zamanlanmış işlerin son başarısını, ölü mektup kuyruğunu ve art arda e-posta hatalarını okur, D15in eşikleriyle isletim_uyarilari tablosuna yazar.', why: 'Eşikler ve uyarı tablosu D15in (D15-B20); iş D14te kalınca D14 ile D15 birbirini çağırıyordu.' },
);
const kuralDegistir = (bas, yeni) => { const i = shared_rules.findIndex(r => r.startsWith(bas)); if (i < 0) throw new Error('rule not found: ' + bas); shared_rules[i] = yeni; };
kuralDegistir('Göçler tek Drizzle klasöründe', "Göçler tek Drizzle klasöründe (apps/server/migrations/, drizzle-kit klasör biçimi: her göç kendi klasöründe migration.sql ve snapshot.json, ortak dergi dosyası yok). Her modül yalnız <14 haneli UTC (YYYYMMDDHHMMSS)>_<belirteç>_<açıklama>/ klasörlerini açar (belirteç migration_dir alanındaki ad), göçü yalnız kendi tablolarına dokunur, yalnız ileri ve önce genişlet sonra daralt. Göç dosyaları spec dosya listesine değil iş paketine yazılır. Snapshot zincirinin tek doğrusu ana daldır: paket birleşmeden önce ana dala yeniden dayanır; dallandığı noktadan sonra ana dala yeni göç klasörü girdiyse kendi klasörünü silip drizzle-kit generate ile yeniden üretir (yeni zaman damgası, güncel snapshot); birleştirme kuyruğu paketleri tek tek alır. Klasör kuralı ve CI göç denetimi D12nindir: ad deseni, ana daldaki en yeni klasörden büyük zaman damgası, dokunulan tablo, dizin, kısıt ve işlevin belirtecin modülüne ait olması (canonical_tables; tek istisna D15in olcum_ görünümleri), ana dalda drizzle-kit generate in fark üretmemesi ve drizzle-kit check.");
kuralDegistir('Yaprak işlevler', "Yaprak dosyası ve döngüsüz içe aktarma: dış yüzde [yaprak] işaretli işlevler modules/<ad>/yaprak.ts içindedir; yaprak.ts başka alan modülünden yalnız onun yaprak.ts dosyasını içe aktarır, hiçbir index.ts içe aktarmaz; yaprak dosyaları arasındaki içe aktarma döngüsüzdür. İki yönlü çağrılan her modül çiftinde bir yön yaprak.ts ya da bileşim kökünün verdiği eklenti seçeneği üstünden gider: D02 D01'i yalnız kimlik/yaprak.ts'ten, D01 D02'yi yalnız dersler/yaprak.ts'ten; D07 D01'i ve D05'i yalnız onların yaprak.ts dosyalarından ya da eklenti seçeneğiyle, D01 ve D05 D07'nin index.ts'ini; D08 D09'u yalnız duzeltmeler/yaprak.ts ve packages/core/src/duzeltmeler üstünden, D09 D08'in index.ts'ini. jobs/<modül>/ dosyaları ve bileşim kökleri (app.ts, server.ts, worker.ts, cli/) her modülün index.ts'ini içe aktarabilir; modules/ altındaki dosya jobs/ ya da bileşim kökü içe aktarmaz. Karşılıklı yabancı anahtarda bir taraf kısıtı yalnız göç SQL'inde kurar, tablolar.ts dosyaları arasında döngü olmaz. D13'ün sınır testi dependency-cruiser API'siyle apps/server/src üstünde no-circular ve yaprak kuralını sıfır ihlalle koşar.");
kuralDegistir('Denetim olayı yazan her modül', "Denetim olayı yazan her modül D09.denetimeYaz çağırır; olay türü <modül>.<olay> adıyla modülün sözleşme dosyasındaki <MODÜL>_DENETIM_OLAYLARI listesinde tanımlıdır ve D09.denetimOlaylariniKaydet ile kaydolur; dersId taşıyan olay birimId de taşır. Denetim tablosuna uygulama rolü yalnız ekler ve okur.");
shared_rules.push(
  "Öğrenci kimliği: ogrenci_id her tabloda hesap (kisiler) kimliğidir ve yalnız hesaptan gelen satırlarda durur (D05 kayıtları, D07 karar geçmişi, D09 sorun bildirimleri, D06 tabloları). Ders içindeki öğrenci (ders, öğrenci numarası) ile anılır: D08 devam_sonuclari (ders_id, ogrenci_no) tekil, D09 düzeltmesi ve D10 anlık satırı liste_satiri_id taşır; hesabı olmayan öğrenci de böyle anılır ve aynı numaranın derste birden çok liste satırı (şube değişimi, yeniden ekleme) tek öğrencidir. Yolda, iş verisinde ve logda numara yoktur, liste satırı kimliği (satirId) taşınır ve numara D03.satirGetir ile çözülür. Hesaptan numaraya geçiş D01.ogrenciHesabiGetir(tx, { kisiIdler }) ve tersi { numaralar } toplu çağrısıyladır; silinmiş hesabın kayıtları da sayılır.",
  "Danışma kilidi katmanları: bütün danışma kilitleri D12.danismaKilidi (bekler) ve D12.danismaKilidiDene (beklemez) ile '<modül>:<kural>:<iç kimlikler>' metin anahtarıyla alınır; elle pg_advisory_xact_lock yazılmaz. Katman önekten gelir (D12'nin DANISMA_KATMANLARI tablosu): 1 dogrulama:liste, devam:hesap, is-kuyrugu:eposta, isletim:*; 2 listeler:kova, dogrulama:teyit; 3 yoklama:cift, projeksiyon:*, esitleme:kurulum_siniri, duzeltmeler:zincir; 4 dogrulama:sayac; 5 dogrulama:isaret. Tek genel sıra vardır, önce katman sonra anahtar metni: bir çağrıdaki anahtarlar bu sırayla alınır; bir işlem birden çok kez çağırabilir ama yeni her anahtar işlemin tuttuğu bütün anahtarlardan sonra gelir; işlemin aynı ya da daha güçlü kipte tuttuğu anahtar yeniden istenince işlem yapılmaz. Sırada geride kalan yeni anahtar yalnız danismaKilidiDene ile alınır; alınamazsa çağıran TEKRAR_DENE döner ya da işi yeniden dener. Çok öğeli işlem (gönderim paketi, toplu karar isteği, liste yazması) öğelerin anahtarlarını saf anahtar işlevleriyle (D05 yoklamaCiftAnahtari, D07 kararAnahtarlari, dogrulamaTeyitAnahtari, dogrulamaListeAnahtari, D03 listeKovaAnahtari, D11 qrKilitAnahtarlari) baştan toplar ve tek çağrıda alır. Anahtar başına kip dışlayıcı (varsayılan) ya da paylasimli. Kural ihlali geliştirmede ve testte hata atar, yayında uyarı loglar. Danışma anahtarlarından sonra satırlar; iş kuyruğu (D14.isGonder) ve öğrenci sürüm satırı (D06.ogrenciDurumuDegisti) satır yazımlarından sonra; genel sayaç (D06.surumAl) en son ve işlemde bir kez.",
  "Sürüm damgası: telefona inen satırın sürümü D06.surumDamgasiIste(tx, damga) ile işlemin sonuna bırakılır; işlemi açan modül son adımda D06.surumAl'ı bir kez çağırır, sayaç bir kez artar ve bekleyen bütün damgalar aynı sürümle yazılır. Damga yalnız işlemde zaten kilitli satırı günceller. surumAl çağrılmadan biten damgalı işlem D12.islemSonuKancasi denetimiyle geri alınır.",
  "Saklama: veri sınıfları D12'nin SAKLAMA_VERI_SINIFLARI kataloğundadır: modül başına <belirteç>.donem_verisi (saat, yoklama, esitleme, dogrulama, devam, duzeltmeler, raporlar, projeksiyon, listeler) ve kimlik.kisi_bagi. Her modül yalnız kendi sınıfı için tek işleyici kaydeder ve yoklama_saklama girişiyle çalışır; sıra kataloğun oncesinde listesinden gelir (esitleme, dogrulama ve projeksiyon yoklamadan önce; devam ve duzeltmeler yoklama ve listelerden önce; raporlar listelerden önce), modül kayıtta sıra bildirmez. Başvuran sınıfın süresi başvurduğu sınıfınkinden uzun olamaz; numara ya da ad kopyası taşıyan devam ve raporlar sınıflarının süresi listeler.donem_verisi süresinden uzun olamaz; D12 açılışta denetler. Hesap silme saklama sınıfı değildir.",
  "Kimlik olayları: D01 olaylarını (giris_oturumu_kapandi, giris_oturumu_yenilendi, cihaz_kapandi, hesap_durumu_degisti, hesap_silindi) olayı doğuran işlemde, kimlikDinleyicileriniKur ile kurulan dört aboneye sabit sırayla verir: dersler (D02 derslerKimlikDinleyicisi), esitleme (D06 esitlemeKimlikDinleyicisi), projeksiyon (D11 projeksiyonKimlikDinleyicisi), isletim (D15 kimlikOlayiDinleyicisi). Kurulumu bileşim kökleri yapar: app.ts uygulamaKur (api ve isci süreçleri), D12'nin cli/geri-yukleme ve D15'in cli/ girişleri; abone eksikse süreç açılmaz.",
  "Birleşim: uç ya da dinleyici kaydı olan her modülün index.ts'i <ad>Eklentisi adlı Fastify eklentisini (kimlikEklentisi, derslerEklentisi, ...) ve EklentiTemelSecenekleri ({ surec }) genişleten seçenek tipini dışa verir; eklenti altyapıyı seçenekten alır, kayıt sırasında veritabanına dokunmaz, zamanlayıcıyı yalnız surec api iken kurar, dinleyici kayıtlarını her süreçte yapar. Rotalar yalnız rotalariKaydet ile kaydedilir; modüller setErrorHandler ve setNotFoundHandler kullanmaz. Hata kodu öneki modül adının büyük harfidir (LISTELER_, IS_KUYRUGU_); kaynak düzeyi ret 404 <MODÜL>_BULUNAMADI, rota düzeyi rol reddi API_ROL_YETKISIZ. Yalnız iş sürecinde doğan kod http null, API isteğinde de doğabilen kod http değeri taşır.",
);
const kararDegistir = (konu, karar, neden) => { const d = decisions.find(x => x.topic === konu); if (!d) throw new Error('decision not found: ' + konu); d.decision = karar; if (neden) d.why = neden; };
kararDegistir('Oran ve muaf', 'p değerlerini değiştiren tek uç PUT /v1/devam/yonetim/dersler/{dersId}/oranlar (D08, yönetici), değer dersler tablosunda kalır ve D02.oranlariYaz yazar. Muaf işaretini değiştiren tek uç PUT /v1/devam/dersler/{dersId}/ogrenciler/{satirId}/muaf (D08, hoca; satirId liste satırı kimliği, hesabı olmayan öğrenci de işaretlenir), değer liste_satirlari tablosunda (ders, numara) başına tek değerdir ve D03.muafIsaretle(tx, satirId, muaf, b) yazar; sonuç birliğini D08 kendi koduna çevirir. PATCH /v1/listeler/satirlar/{satirId} gövdesinde muaf alanı yoktur (katı şema, 400).');
kararDegistir('Göç klasörü', 'Tek Drizzle klasörü apps/server/migrations/. Her modül yalnız <14 haneli UTC>_<belirteç>_<açıklama>/ klasörlerini açar ve dosya haritasında kendi globu vardır; klasör kuralının ve CI göç denetimi D12nindir. Paralel paketler tablo paylaşmaz; snapshot zinciri ana dala yeniden dayanıp yeniden üretmekle ve birleştirme kuyruğuyla tek doğrusal kalır (ortak kural).', 'Drizzle bütün şemadan tek sıralı klasör üretir; modül başına klasör karşılıklı yabancı anahtarların (kisiler ile birimler) sırasını bozar. Belirteçli ve zaman önekli ad iki paketin aynı klasörü yazmasını önler; ortak dergi dosyası olmayan klasör biçimi birleştirme çakışmasını snapshot ile sınırlar, onu da yeniden üretme kuralı ve CI kapatır.');
kararDegistir('İki yönlü çağrılar', 'Alt modülün üst modülü çağırdığı yerde dinleyici kaydı kullanılır: D02 (oturum üretimi, kilit adımı, liste kaynağı), D03 (liste değişikliği), D04 (oturum, kesinti ve pencere değişikliği), D11 (gösterim kaydı), D01 (kimlik olayları). Kalan dört çift (D01 ile D02, D01 ile D07, D05 ile D07, D08 ile D09) yaprak dosyası kuralıyla döngüsüzdür: bir yön karşı modülün yaprak.ts dosyasından ya da eklenti seçeneğinden geçer (ortak kural). Bileşim kökleri ve jobs/ dosyaları modül çifti saymaz.', 'Dosya düzeyinde döngü dependency-cruiser no-circular kuralını kırar ve bir modülün testini öbürünün koduna bağlar. yaprak.ts başka index.ts içe aktarmadığından ona giden ok döngü kuramaz; kural D13ün sınır testinde denetlenir.');
const donem = decisions.find(x => x.topic === 'Dönem kilidi'); donem.decision += ' Kayıtlı kilit adımları sira ile çalışır: dogrulama.karar_kapanisi (D07) 10, raporlar.gun_sonu_anligi (D10) 20; D10un adımı gün sonu anlığı işini kilit işleminde kuyruğa koyar ve anlık D08 değerlerini canlı okur, devam_hesapla işlerini beklemez.';
decisions.push(
  { topic: 'Öğrenci kimliği', decision: 'ogrenci_id hesap kimliğidir; ders içindeki öğrenci (ders, numara) ile anılır; yolda ve iş verisinde liste satırı kimliği taşınır; hesap ile numara arasında D01.ogrenciHesabiGetir toplu çağrısı (ortak kural). Rapor ve muaf yollarındaki kimlik {satirId}.', why: 'Hesabı olmayan, şube değiştiren ve hesabını silip yeniden kaydolan öğrenci aynı devam satırında kalmalı; numara loga ve iş verisine girmez (D01-A15, D03-A08, D08-A07, D09-A08, D10-A11).' },
  { topic: 'Öğrenci kapsam kaynağı', decision: 'Öğrenci kapsam kaynağını (ogrenci_liste_kapsami) D03, personel kapsam kaynağını D02 kaydeder; teyit durumu D06nın imleçteki hesap özetine girer, teyit değişince baştan indirme olur.', why: 'Veri ve üyelik sürümü D03ündür; D02 üstünden kurmak D03 satırını ikinci yoldan okurdu (D03-A09, D02-A18).' },
  { topic: 'Deneme dersi kurulumu', decision: 'D01in inceleme_hesaplari_kurulumu işi tek işlemde hocayı kurar, D02.denemeDersiniKur(tx, hocaKisiId) ile dersi kurdurur ya da devrettirir ve dönen şubeye D03.denemeListesiniKur ile satırı kurdurur; D02nin deneme_dersi_oturumlari yalnız oturum üretir.', why: 'Tek işlem yarım kurulum bırakmaz; inceleme hesabı kuralı D01in (plan.html#kararlar-inceleme-hesaplari).' },
  { topic: 'Danışma kilidi katmanları', decision: 'Kilit sırası beş katmanlı danışma anahtarlarıyla tek kurala bağlandı (ortak kural); D12 kipli danismaKilidi ve beklemeyen danismaKilidiDene verir. Liste değişikliği, teyit ve gösterim kaydı kararı olayın işleminde verilir.', why: 'Tek çağrı kuralı gönderim, liste, teyit ve gösterim yollarında karşılanamıyordu; artan katman ve beklemeyen deneme kilitlenme döngüsünü yapısal olarak önler, plan kararı aynı işlemde ister (plan.html#kararlar-supheli-kayit).' },
  { topic: 'Sürüm damgası', decision: 'Telefona inen satırın sürümü D06.surumDamgasiIste ile işlemin sonuna bırakılır, işlemi açan modül surumAl ı bir kez çağırır (ortak kural); D02nin olay geri çağrısı kalkar.', why: 'Tek sayaç satırı karar ve yeniden değerlendirme boyunca kilitli kalmaz; iki ayrı damga düzeneği aynı işi iki yoldan yapardı (D04-A10, D02-A16).' },
  { topic: 'Saklama sınıfları', decision: 'SAKLAMA_VERI_SINIFLARI kataloğu (D12) tek kaynaktır; modül başına bir donem_verisi sınıfı, sıra kataloğun oncesinde listesinde, süre kuralları açılışta denetlenir (ortak kural). İnce sınıf adları ve modül kaydında oncekiSiniflar yoktur.', why: 'Katalogsuz kayıt iki modülün aynı adı almasına ve sıranın başvurulan tarafta yazılmasına yol açıyordu (D12-B22).' },
  { topic: 'Gece çizelgesi', decision: 'donem_kilidi 00:05 (D02); bekleyen_kayit_kapatma 00:15 ve aksis_gun_sonu_anligi güvenlik ağı 00:25 (ikisi de sonra: donem_kilidi); deneme_dersi_oturumlari 00:35; inceleme_hesaplari_kurulumu 00:45; takvim_oturumlarini_yenile gece onarımı 01:55; pencere_beklemede_kesinlestir yalnız olayla. Saati işi kuran modül belirler, D14 çizelgesi aynen kopyalar.', why: 'D14-B05 kuralları (03:00 ile 05:00 arası boş, en az 5 dakika aralık, sonra işleri en az 10 dakika sonra) en az değişiklikle sağlanır.' },
  { topic: 'Saat eşitlemesi, giriş bildirimi ve yönetici yolları', decision: 'Üçü ürün kararı değildir, onay beklemez: saat eşitlemesinin tek kaynağı makinedeki chrony durum dosyasıdır (teknik.html#altyapi-sunucu-makinesi: sunucunun saati NTP ile eşitlenir ve izlenir); giriş bildirimi kod e-postasıyla aynı yoldan, kuyruksuz gider (teknik.html#sunucu-kimlik); yönetici uçları /v1/<modül>/yonetim/ altındadır (teknik.html#sunucu).', why: 'Envanter önerileri plan ya da teknik kararı değildi; üçü de teknik.html cümlesinin uygulamasıdır.' },
);
const C = { modules: mods, canonical_tables, renames, endpoint_renames, dropped: DROPPED.map(([name, why]) => ({ name, why })), file_ownership: fo, shared_rules, decisions };
let out = JSON.stringify(C, null, 1).replace(/[\u{2013}\u{2014}]/gu, ',')
  .replace(/(?<![A-Za-z0-9_])(D[0-9][0-9](?:-[BKC][0-9]+)?|CI|Caddy|xprem|QR|PostgreSQL|JSON|oasdiff|teknik|chrony)(nin|nın|nun|nün|in|ın|un|ün|ye|ya|e|a|de|da|den|dan|teki|ında|ündür|indir|ü|te)(?![A-Za-z0-9_çğıöşüÇĞİÖŞÜ])/g, "$1'$2");
fs.writeFileSync(path.join(D, 'contracts.json'), out, 'utf8');
const nT = canonical_tables.length, nE = owned.size, nJ = jobOwner.size;
console.log(`built: ${mods.length} modules, ${nT} tables, ${nE} endpoints, ${nJ} jobs, ${Object.keys(renames).length} renames, ${Object.keys(endpoint_renames).length} endpoint renames, ${DROPPED.length} dropped, ${fo.length} globs`);
if (problems.length) { console.log('PROBLEMS (' + problems.length + '):\n' + problems.join('\n')); process.exit(1); }
