'use strict';
// Exports: one plain identifier per entry, remarks in note (align D15 I080). The contracts file is not an export;
// its named constants that other modules or clients use are listed one by one.
const { find } = require('./lib.js');

module.exports = function p2(S) {
  const old = (n) => find(S.exports, 'name', n);
  const E = [];
  const push = (e) => E.push(e);

  // ayarlariYukle
  const ay = { ...old('ayarlariYukle') };
  ay.purpose = ay.purpose.replace(
    "ISLETIM_SERTIFIKA_KOK_DOSYASI uretim ortamında verilmişse ISLETIM_AYAR_GECERSIZ.",
    "ISLETIM_SERTIFIKA_KOK_DOSYASI uretim ortamında verilmişse ya da SAAT_ESITLEME_KAPANIS_ESIGI_MS SAAT_ESITLEME_DENETIM_ARALIGI_MS'nin üç katından küçükse ISLETIM_AYAR_GECERSIZ; e-posta ayarları (EPOSTA_SMTP_SUNUCU, EPOSTA_GONDEREN_ADRES, EPOSTA_GONDEREN_AD, EPOSTA_URUN_ADI) api ve isci'de zorunludur, eksikse işçi de açılmaz (I077).");
  if (ay.purpose === old('ayarlariYukle').purpose) throw new Error('ayarlariYukle edit missed');
  push(ay);

  // ayarlar and Ayarlar (split)
  const ayOld = old('ayarlar ve Ayarlar (tip)');
  const sig = ayOld.signature;
  const cut = sig.indexOf('; type Ayarlar');
  push({
    name: 'ayarlar',
    signature: sig.slice(0, cut),
    purpose: "Yüklenmiş ayarlar; yüklenmeden çağrılırsa ISLETIM_AYARLAR_YUKLENMEDI. Alan modülleri ayarı bileşim kökünden parametreyle alır (D08, D13 gibi); bu işlev komutlar, işler ve test dünyası içindir. Gizli değerler GizliDeger sarmalayıcısındadır.",
  });
  push({
    name: 'Ayarlar',
    signature: 'type ' + sig.slice(cut + 7).replace(/\s+\/\/.*$/, ''),
    purpose: "Doğrulanmış ayar nesnesinin tipi. asama2.qrAcik ASAMA2_QR_ACIK'tan gelir; D02 ile D11'in ortak tek Aşama 2 QR bayrağıdır, app.ts derslerEklentisi'ne qrDersAyariAcik olarak ve projeksiyonEklentisi'ne qrAcik olarak buradan verir (I052). projeksiyon isteğe bağlı bölümdür ve ortamdan okunmaz: şeması packages/contracts/src/projeksiyon.ts'teki projeksiyonAyarSemasi (D11), değeri projeksiyonAyarSemasi.parse({}) ile D11 varsayılanlarıdır: 10, 20 ve 30 saniye sınırları, 1 saniye tolerans, 5 dakika kod süresi, 15 dakika onay öncesi, 10 dakikada 5 yanlış, adres başına 10 dakikada 100 yeni tarayıcı, 200.000 depolama tavanı, 60 saniye önceki çerez kabulü, yedek kod sınırları, Bluetooth ve konum değerleri; eşikler kuralı gereği değişikliği kod değişikliğidir, app.ts projeksiyonEklentisi'ne ayarlar olarak buradan verir. Alanların tam listesi: Durumlar ve kurallar, Ayar şeması.",
    note: "Tipler z.infer<typeof AYAR_SEMASI> ile; projeksiyonAyarSemasi D11'in sözleşme dosyasından içe aktarılır, D15 yeniden yazmaz.",
  });

  push(old('GizliDeger'));
  push(old('gizliAnahtar'));
  push({ ...old('gizliAnahtarSeti (ek)'), name: 'gizliAnahtarSeti', note: 'contracts.json dış yüzünde (I080).' });

  // log and logOlustur (split)
  const lgOld = old('log ve logOlustur');
  push({
    name: 'log',
    signature: 'const log: Logger  // pino; apps/server/src/infra/izleme/index.ts',
    purpose: "Süreçteki kök kaydedici; logOlustur çağrılmadan stderr'e info düzeyinde yazar, logOlustur'dan sonra onun kurduğu kaydediciye bağlıdır. Fastify (loggerInstance, uygulamaKur), D14, D12 ve modüller alt kaydedici açar.",
  });
  push({
    name: 'logOlustur',
    signature: 'function logOlustur(s: { ayarlar: Ayarlar; ekGizliAdlar?: readonly string[]; hedef?: DestinationStream }): Logger',
    purpose: lgOld.purpose.replace("logOlustur süreç başına bir kez kökteki pino kaydedicisini kurar ve log'u ona bağlar; Fastify (loggerInstance, D13 app.ts), D14, D12 ve modüller alt kaydedici açar. ", 'Süreç başına bir kez kökteki pino kaydedicisini kurar ve log\'u ona bağlar. ').replace(' logOlustur çağrılmadan log stderr\'e info düzeyinde yazar.', '') +
      " Ölçülen log olayları: pino hooks.logMethod, olay alanı OLCULEN_LOG_OLAYLARI'nda olan satırı (ilk sürümde D07'nin dogrulama.kanit_reddedildi satırı; platform, amac, gerekce) süreç içi sayaca ekler; satırın kendisi değişmez. API sürecinin dakikalık ölçü dosyası bu sayaçları logOlaylari alanında yazar, isletim_denetimi isletim.kanit_reddi kuralıyla okur (I031).",
  });

  push(old('uyariAc'));
  const ua = E[E.length - 1] = { ...E[E.length - 1] };
  ua.purpose = ua.purpose.replace(
    "Çağıranlar: D01 (inceleme hesabı ayarı eksik), D07 (iptal listesi 7 günden eski, App Attest yenileme sıklığı) ve D15'in kendi işleri.",
    "Çağıranlar: D01 (kimlik.inceleme_ayari_eksik), D04 (saat.pencere_kapanamadi, I018), D07 (dogrulama.iptal_listesi_eski, dogrulama.app_attest_yenileme_sik, dogrulama.hatali_surum_gec_yuklendi; I031) ve D15'in kendi işleri.");
  if (!ua.purpose.includes('saat.pencere_kapanamadi')) throw new Error('uyariAc edit missed');

  push(old('saatEsitlemeDurumu'));
  const se = E[E.length - 1] = { ...E[E.length - 1] };
  se.purpose = se.purpose.replace(
    "D04 belge kuralını SAAT_ESITLEME_ESIK_MS ve SAAT_ESITLEME_DOSYA_YASI_MS ayarlarıyla",
    "D04 belge kuralını SAAT_ESITLEME_ESIK_MS, SAAT_ESITLEME_DOSYA_YASI_MS, SAAT_ESITLEME_DENETIM_ARALIGI_MS ve SAAT_ESITLEME_KAPANIS_ESIGI_MS ayarlarıyla");
  if (!se.purpose.includes('KAPANIS_ESIGI')) throw new Error('saatEsitlemeDurumu edit missed');

  // telefonSayaciOgesi: kilitAnahtarlari hook (I014), I084
  const ts = { ...old('telefonSayaciOgesi') };
  ts.signature = "function telefonSayaciOgesi(s: { hesapSilindiMi: (tx: Islem, kisiId: KisiId) => Promise<boolean>; saat: Saat }): OgeIsleyici<'telefon_sayaci'>;  // { roller: ['OGRENCI', 'PERSONEL'], oturumGerekli: false, govdeEnBuyukBayt: 49152, ilkCapaVar: false, ayrintiSemasi: z.object({ uygulandi: z.boolean() }), kilitAnahtarlari(tx: Islem, ogeler: readonly GelenOge<'telefon_sayaci'>[], baglam: PaketBaglami): Promise<readonly DanismaAnahtari[]>, isle(tx: Islem, oge: GelenOge<'telefon_sayaci'>, baglam: PaketBaglami): Promise<OgeSonucu> }  // tipler packages/contracts/src/esitleme.ts (D06), DanismaAnahtari packages/contracts/src/veritabani.ts (D12)";
  const tsCut = "Ekran süreleri kişi ve gün tavanını (500 satır, 5 kaynak kimliği; yalnız yeni anahtarlar) aşarsa öğe hiçbir tabloya yazılmaz, KABUL { uygulandi: false } ve isletim.ekran_suresi_tavani log satırı; bu yolda danismaKilidi çağrılmaz (D06 paket işleminde çağırmış olabilir, D12'nin işlem başına tek çağrı kuralı), aynı kurulumun paketlerini D06'nın kurulum satırı kilidi sıralar.";
  if (!ts.purpose.includes(tsCut)) throw new Error('telefonSayaciOgesi tavan text missing');
  ts.purpose = ts.purpose.replace(tsCut,
    "Ekran süreleri kişi ve gün tavanını (500 satır, 5 kaynak kimliği; yalnız yeni anahtarlar) aşarsa öğe hiçbir tabloya yazılmaz, KABUL { uygulandi: false } ve isletim.ekran_suresi_tavani log satırı. Tavan, panel ucuyla aynı danışma anahtarı altında okunur: kilitAnahtarlari kancası paketteki her PERSONEL öğesinin gövdesini ayrıştırıp ekranSureleri doluysa ekranTavaniAnahtari(kisiId, gun) ('isletim:ekran_tavani:<kisiId>:<gun>', katman 1) döner (bozuk gövdede anahtar yok, isle RET verir); D06 bunları kendi 'esitleme:kurulum_siniri:<kisiId>' anahtarıyla birleştirip hiçbir grubu işlemeden önce tek D12.danismaKilidi çağrısında alır (contracts.json ortak kural 'Danışma kilidi katmanları', I014). isle yeni danışma anahtarı istemez.")
    .replace('Kaydı isletimEklentisi yapar, D06.ogeTuruKaydet işlevi app.ts\'ten seçenekle gelir.', "Kaydı isletimEklentisi yapar, D06.ogeTuruKaydet işlevi app.ts'ten seçenekle gelir; PaketBaglami'na alan eklenmez (I084).");
  push(ts);

  // kimlikOlayiDinleyicisi: isletim subscriber (I050, I080, I085)
  push({
    name: 'kimlikOlayiDinleyicisi',
    signature: 'const kimlikOlayiDinleyicisi: KimlikDinleyicisi  // KimlikDinleyicisi = (tx: Islem, olay: KimlikOlayi) => Promise<void>; iki tip de D01\'in',
    purpose: "D01.kimlikDinleyicileriniKur({ dersler, esitleme, projeksiyon, isletim }) çağrısının isletim abonesidir; D01 olayı doğuran işlemde abonelere sırayla (dersler, esitleme, projeksiyon, isletim) verir. Kurulumu bileşim kökleri yapar: app.ts uygulamaKur (api ve isci), D12'nin cli/geri-yukleme'si ve D15'in cli/anahtar-uret ile cli/olay girişleri; hiçbir eklenti kendisi kaydolmaz, kimlikOlayiDinleyicisiKaydet adlı işlev yoktur (I050, I080). Yalnız hesap_silindi olayında aynı işlemde telefon_sayaclari ve hoca_ekran_sureleri'nde kisi_id = olay.kisiId satırlarını siler; öbür olaylarda bir şey yapmaz (D01-B34). Fırlatırsa olayı doğuran işlem geri alınır.",
    note: 'contracts.json dış yüzünde (I080).',
  });

  // isletimEklentisi: option kimlikOlayiDinleyicisiKaydet removed (I080, I081); EklentiTemelSecenekleri (D13)
  const ek = old('isletimEklentisi (ek)');
  push({
    name: 'isletimEklentisi',
    signature: "const isletimEklentisi: FastifyPluginAsync<IsletimEklentisiSecenekleri>; interface IsletimEklentisiSecenekleri extends EklentiTemelSecenekleri /* D13: { surec: 'api' | 'isci' | 'belge' } */ { veritabani: Pick<Veritabani, 'islem' | 'semaDurumu'>; danismaKilidi: (tx: Islem, anahtarlar: readonly DanismaAnahtari[]) => Promise<void>; saat: Saat; rotalariKaydet: (app: FastifyInstance, rotalar: readonly RotaUygulamasi[]) => void; ogeTuruKaydet: (tur: 'telefon_sayaci', isleyici: OgeIsleyici<'telefon_sayaci'>) => void; hesapSilindiMi: (tx: Islem, kisiId: KisiId) => Promise<boolean>; olcumYazici?: boolean }",
    purpose: ek.purpose
      .replace("telefon_sayaci işleyicisini (hesapSilindiMi ve saatle kurulmuş) ve kimlik dinleyicisini verilen kayıt işlevleriyle bağlar.", "telefon_sayaci işleyicisini (hesapSilindiMi ve saatle kurulmuş) verilen ogeTuruKaydet ile bağlar. Kimlik olayı dinleyicisini eklenti kaydetmez: kimlikOlayiDinleyicisi uygulamaKur'daki kimlikDinleyicileriniKur çağrısına isletim abonesi olarak girer (I081).")
      .replace('surec api ise yanıt sayaçlarını tutan onResponse kancasını (fastify-plugin ile kökte) ekler;', "surec 'api' ise yanıt sayaçlarını tutan onResponse kancasını (fastify-plugin ile kökte) ekler;")
      .replace('Varsayılan false: yalnız server.ts true verir (app.ts kurucusunun seçeneğiyle); test dünyası ve D13\'ün openapi_belgesi_sakla betiği app.ready() çağırsa da', "Varsayılan false: yalnız server.ts true verir (uygulamaKur seçeneğiyle); test dünyası ve D13'ün openapi_belgesi_sakla betiği (surec 'belge') app.ready() çağırsa da"),
    note: 'contracts.json dış yüzünde (I080); seçenekleri app.ts verir (I081).',
  });
  if (E[E.length - 1].purpose.includes('kimlik dinleyicisini verilen kayıt')) throw new Error('isletimEklentisi edit missed');

  // kapanisiBaslat and kapanisDurumu (split)
  const kp = old('kapanisiBaslat ve kapanisDurumu');
  push({ name: 'kapanisiBaslat', signature: 'function kapanisiBaslat(): void', purpose: kp.purpose.replace('503 ISLETIM_KAPANIYOR döner', '503 ISLETIM_KAPANIYOR (Retry-After 5) döner') });
  push({ name: 'kapanisDurumu', signature: "function kapanisDurumu(): 'CALISIYOR' | 'KAPANIYOR'", purpose: "Sağlık uçları ve test dünyası kapanışın başlayıp başlamadığını buradan okur; kapanisiBaslat'tan sonra her zaman KAPANIYOR." });

  push({ ...old('isletimIsleri (ek)'), name: 'isletimIsleri', note: 'contracts.json dış yüzünde (I080); worker.ts (D14) isTanimla\'ya uyarlar ve isle\'nin döndürdüğü küçük nesneyi iş çıktısı olarak yazar (I082).' });

  // Test support (split)
  const td = old('TestDunyasi, KurucuHaritasi, kurucuTanimla (test desteği)');
  const kanc = old('Test kancaları (apps/server/test/support/kancalar.ts)');
  const tdSig = td.signature;
  const k1 = tdSig.indexOf('; interface KurucuHaritasi');
  const k2 = tdSig.indexOf('; function kurucuTanimla');
  const tdPurpose = td.purpose
    .replace('uygulama (app.ts, D04 sahte saat, D14 sahte posta, D12 test veritabanı, D14 test kuyruğu) işçi süreci başına bir kez kurulur (kayıt defterleri süreç başına tek).',
      "uygulama, server.ts'in çağırdığı kurucuyla (uygulamaKur, deneme seçenekleriyle: surec 'api', olcumYazici yok, D04 sahte saat, D14 sahte posta ve test kuyruğu, D12 test veritabanı) işçi süreci başına bir kez kurulur (kayıt defterleri süreç başına tek; I069).")
    .replace("cevabı 2xx'te rotanın cevap şemasıyla, 4xx ve 5xx'te hataZarfiSemasi ile ve kodun rotanın hatalar listesinde ya da API_ kodlarında olmasıyla denetler (D13 isteği).",
      "her cevabı rotanın beyan ettiği o durumun şemasıyla, her 4xx ve 5xx gövdesini ayrıca hataZarfiSemasi ile ve kodun rotanın hatalar listesinde ya da API_ kodlarında olmasıyla denetler; beyan dışı durum ya da şemaya uymayan gövde senaryoyu kırmızı yapar (D13, I069).");
  if (tdPurpose === td.purpose) throw new Error('TestDunyasi edit missed');
  push({
    name: 'TestDunyasi',
    signature: tdSig.slice(0, k1) + '  // apps/server/test/support/dunya.ts',
    purpose: tdPurpose,
    note: 'Kancalar (apps/server/test/support/kancalar.ts; dışa verilmez, Cucumber kayıt eder): ' + kanc.signature.replace('Before -> sıfırlama sırası', 'Before -> D12.senaryoOncesiSifirla, D14.isKuyrugunuBosalt, sahte saat, dünya durumu') + '. ' +
      kanc.purpose.replace("D14'ün test kuyruğunda deleteAllJobs,", "D14.isKuyrugunuBosalt() (pg-boss deleteAllJobs; I077, I082),"),
  });
  if (!E[E.length - 1].note.includes('isKuyrugunuBosalt()')) throw new Error('kancalar edit missed');
  push({ name: 'KurucuHaritasi', signature: tdSig.slice(k1 + 2, k2), purpose: "Modüllerin veri kurucularının tip haritası; her modül support/kurucular/<modül>.ts'te declare module ile genişletir, dünya dosyası değişmez (D11'in projeksiyon kurucusu yük testinde de kullanılır, I088)." });
  push({ name: 'kurucuTanimla', signature: tdSig.slice(k2 + 2).replace(/\s+\/\/.*$/, ''), purpose: "Bir modülün veri kurucusunu adıyla kaydeder; TestDunyasi.kurucu(ad) onu senaryonun dünyasıyla kurar. Aynı ad iki kez kaydedilirse yüklenirken hata.", note: 'contracts.json dış yüzünde (I080).' });

  // ---------- contracts file constants (packages/contracts/src/isletim.ts), one name each ----------
  const SZ = 'packages/contracts/src/isletim.ts';
  const c = (name, signature, purpose, note) => push(note ? { name, signature, purpose, note } : { name, signature, purpose });
  c('ISLETIM_ROTALARI', `export const ISLETIM_ROTALARI: readonly [RotaTanimi, RotaTanimi, RotaTanimi, RotaTanimi]  // ${SZ}`,
    "Dört rotanın tanımı (rotaTanimla): /health/live ve /v1/durum baskiDisi true, /health/ready ve /v1/isletim/ekran-sureleri false; D13 TUM_ROTALAR'da birleştirir, isletimEklentisi rotalariKaydet ile kaydeder.");
  c('ISLETIM_HATALARI', `export const ISLETIM_HATALARI = hataKodlariTanimla('isletim', { ... })  // ${SZ}`,
    "HTTP kodları ve süreç düzeyindeki kodlar tek katalogda (D13 HataTanimi): ISLETIM_KAPANIYOR { http: 503, bekleme: { sabit: 5 } }, öbür HTTP kodları hoca ve öğrenci metniyle; ISLETIM_AYAR_GECERSIZ, ISLETIM_SEMA_GERIDE gibi süreç kodları http null ve metinsiz (HTTP'ye çıkmaz; I069). D13 TUM_HATALAR'da birleştirir. Liste: Hata kodları.");
  c('ISLETIM_OGE_GEREKCELERI', `export const ISLETIM_OGE_GEREKCELERI: readonly ['ISLETIM_SAYAC_GOVDE_GECERSIZ', 'ISLETIM_SAYAC_GUN_GECERSIZ', 'ISLETIM_SAYAC_ROL_GECERSIZ']  // ${SZ}`,
    "telefon_sayaci öğesinin RET gerekçe kodları; HTTP kataloğuna girmez, öğe sonucunda döner.");
  c('ekranSureleriIstegi', `export const ekranSureleriIstegi: z.ZodType<EkranSureleriIstegi>  // ${SZ}`,
    "POST /v1/isletim/ekran-sureleri gövde şeması; panel için istemci kuralı da bu şemanın belgesindedir: değerler oturum ve ekran başına o günün birikmiş toplamıdır, panel en çok 5 dakikada bir ve sayfa gizlenirken (visibilitychange) bir kez gönderir, istemciKimligi tarayıcının ilk açılışta ürettiği UUIDv7'dir ve yerel depoda kalır (harita dışı istek, I091).");
  c('ekranSureleriCevabi', `export const ekranSureleriCevabi: z.ZodType<{ kaydedilen: number }>  // ${SZ}`, 'POST /v1/isletim/ekran-sureleri 200 cevabı.');
  c('telefonSayaciGovdesiSemasi', `export const telefonSayaciGovdesiSemasi: z.ZodType<TelefonSayaciGovdesi>  // ${SZ}`,
    "telefon_sayaci öğe gövdesi (bicim 1). Telefon uygulamasının istemci kuralları bu şemanın belgesindedir: gün yalnız gunAtlanirMi true dönünce gönderilmez; atlanan günler olsa da haftada en az bir paket; çok oturumlu ekranda süre ekrandaki oturumlara eşit bölünür; ekran 60 saniye dokunmasız kalınca süre durur (harita dışı istek, I090).");
  c('gunAtlanirMi', `export function gunAtlanirMi(govde: TelefonSayaciGovdesi): boolean  // ${SZ}`,
    "Saf işlev: bütün sayısal sayaçlar 0 ve ekranHatalari, retler ve ekranSureleri boşsa true; bildirimIzni karara girmez. Telefon uygulaması ve testler bu işlevi kullanır, kuralı yeniden yazmaz (I090).");
  c('ekranTavaniAnahtari', `export function ekranTavaniAnahtari(kisiId: string, gun: string): string  // ${SZ}`,
    "Saf anahtar işlevi: 'isletim:ekran_tavani:<kisiId>:<gun>' (katman 1). Ekran süreleri ucu ilk danismaKilidi çağrısında, telefon_sayaci işleyicisi kilitAnahtarlari kancasında kullanır (I014).");
  c('chronyDurumuSemasi', `export const chronyDurumuSemasi: z.ZodType  // ${SZ}`, 'chrony.json biçimi (Durum dosyaları); saat_esitleme_izleme yazar, saatEsitlemeDurumu doğrular.');
  c('makineDurumuSemasi', `export const makineDurumuSemasi: z.ZodType  // ${SZ}`, 'makine.json biçimi (bicim 2); makine_denetimi yazar, isletim_denetimi okur.');
  c('bakimDosyasiSemasi', `export const bakimDosyasiSemasi: z.ZodType  // ${SZ}`, 'bakim.json biçimi; yayinla.sh yazar, isletim_denetimi okur.');
  c('apiOlcumDosyasiSemasi', `export const apiOlcumDosyasiSemasi: z.ZodType  // ${SZ}`, "/durum/api/<kopya>.json biçimi (dakikalık sayılar, gönderim süre kovaları ve logOlaylari); API ölçü yazıcısı yazar, isletim_denetimi okur.");
  c('gizliAnahtarDosyasiSemasi', `export const gizliAnahtarDosyasiSemasi: z.ZodType  // ${SZ}`, "Anahtar kümesi sır dosyası biçimi (kid ^[a-z0-9-]{1,8}$, 32 bayt, en çok 4 anahtar, tam bir ETKIN, en çok bir HAZIR); anahtar-uret yazar, ayarlariYukle doğrular.");
  c('kalpAtisiSirriSemasi', `export const kalpAtisiSirriSemasi: z.ZodType<{ normalAdres: string; sorunAdres: string | null }>  // ${SZ}`, 'kalp_atisi sırrının biçimi; işçide ayarlariYukle doğrular.');
  c('EKRAN_TURLERI', `export const EKRAN_TURLERI: readonly ['KAFA_SAYISI', 'DERS_YAPILDI_MI', 'KENDI_BEYANI_ONAYI', 'TEYIT_ONAYI', 'INCELEME', 'SORUN_BILDIRIMI']  // ${SZ}`, 'Süresi ölçülen ekranlar; hoca_ekran_sureleri CHECK listesi ve iki istek şeması buradan.');
  c('SAYAC_ADLARI', `export const SAYAC_ADLARI: readonly string[]  // ${SZ}`, 'Telefon sayaç adları (gonderilmemisKayit, basarisizDeneme, yerelModulCokmesi, icSayacOkumaHatasi, bilinmeyenSonuc, bildirimIzni); liste dışı ad atılır ve sayılır.');
  c('UYARI_TURLERI', `export const UYARI_TURLERI: Readonly<Record<UyariTuru, { seviye: 'KRITIK' | 'UYARI'; kapanma: 'KOSUL' | 'SESSIZLIK'; degerlendiren: string; girdi: string }>>  // ${SZ}`, "Uyarı türü kataloğu: her isletim.* türü için seviye, kapanma kuralı, değerlendiren iş ve girdi; başka modüllerin türleri (dogrulama.*, saat.pencere_kapanamadi, kimlik.*) örnek satırlarıyla. Tablo: Durumlar ve kurallar, Uyarı türleri.");
  c('ISLETIM_GIRDILERI', `export const ISLETIM_GIRDILERI: readonly string[]  // ${SZ}`, "İşletim denetimi girdilerinin adları: veritabanı girdileri is_sagligi, pg_sistem, telefon_sayaclari, olcum_kayit_kaybi, Caddy bağlantısı sertifika ve durum dosyaları makine, saat, bakim, api_olcum, yedek:<iş>; isletim.denetim_girdisi uyarısının anahtarı buradan.");
  c('ISLETIM_ESIKLERI', `export const ISLETIM_ESIKLERI: Readonly<Record<string, number>>  // ${SZ}`, 'Uyarı eşikleri (disk, bellek, bağlantı, 5xx, 503 oranı, gönderim p95, kuyruk, e-posta, kanıt reddi); ortam değişkeni değildir, testler buradan içe aktarır.');
  c('YEDEK_ESIKLERI', `export const YEDEK_ESIKLERI: Readonly<Record<string, { kritikSaat?: number; uyariGun?: number }>>  // ${SZ}`, "D12 makine işlerinin iş adıyla yaş eşikleri (gecelik_pg_dump, xprem_birimi_yedegi ve pgBackRest 26 saat KRITIK; pgbackrest_tam_yedek 8 gün, pgbackrest_dogrulama 8 gün, geri_yukleme_denemesi 36 gün UYARI; I061).");
  c('EKRAN_SURESI_TAVANI', `export const EKRAN_SURESI_TAVANI: { satir: 500; kaynakKimligi: 5 }  // ${SZ}`, 'Kişi ve gün başına ekran süresi tavanı; iki yol ve testler buradan içe aktarır.');
  c('ISLETIM_GIZLI_ALANLAR', `export const ISLETIM_GIZLI_ALANLAR: readonly string[]  // ${SZ}`, "logOlustur'un her derinlikte '[gizli]' yaptığı anahtar adları.");
  c('OLCULEN_LOG_OLAYLARI', `export const OLCULEN_LOG_OLAYLARI: readonly ['dogrulama.kanit_reddedildi']  // ${SZ}`, "logOlustur'un saydığı log olayları; API ölçü dosyasının logOlaylari alanı ve isletim.kanit_reddi kuralı bunları okur (I031).");
  c('SIR_MATRISI', `export const SIR_MATRISI: Readonly<Record<string, readonly ('api' | 'isci' | 'goc' | 'xprem')[]>>  // ${SZ}`, "Hangi sırrın hangi Compose servisine bağlandığı (Durumlar ve kurallar, Sırlar matrisi); ayarlariYukle'nin süreç başına zorunlu listesi ve Compose testi buradan içe aktarır.");

  S.exports = E;
};
