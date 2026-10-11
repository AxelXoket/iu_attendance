// D15 spec, part 3: exports, files, tests.
'use strict';

const exportsList = [
  {
    name: 'ayarlariYukle',
    signature:
      "function ayarlariYukle(s: { surec: 'api' | 'isci' | 'goc' | 'cli'; ortam?: Readonly<Record<string, string | undefined>>; gizliDizin?: string }): Ayarlar  // apps/server/src/infra/ayarlar/index.ts",
    purpose:
      "Bileşim kökleri (server.ts, worker.ts, göç ve komut girişleri) ve test dünyası açılışta bir kez çağırır. Ortam değişkenlerini AYAR_SEMASI (Zod) ile, gizli dosyaları GIZLI_DIZIN altında sürece göre zorunlu listeyle doğrular; dondurulmuş nesne döner ve gizliAnahtar için süreç içi kümeyi kurar. Eksik ya da hatalı değerde AyarHatasi (ISLETIM_AYAR_GECERSIZ) fırlatır; ileti yalnız ayar ve dosya adlarını sayar, değer yazmaz. Sürecin saat dilimi adı (Intl.DateTimeFormat().resolvedOptions().timeZone) UTC ya da Etc/UTC değilse ISLETIM_SAAT_DILIMI (saat farkına bakılmaz); API'de BASKI_BELLEK_BAYT kabın bellek sınırından (cgroup memory.max) küçük değilse ISLETIM_BASKI_BELLEK_SINIRI; ISLETIM_SERTIFIKA_KOK_DOSYASI uretim ortamında verilmişse ISLETIM_AYAR_GECERSIZ. İşçide inceleme_sabit_kodu dosyasının değeri okunmaz, yalnız varlığı ve boş olmadığı (fs.stat) denetlenir ve kimlik.incelemeSabitKoduVar olarak verilir (D01'in inceleme_hesaplari_kurulumu işçide çalışır); API'de değer GizliDeger'dir. Yüklenen her anahtar amacı için { olay: isletim.anahtarlar_yuklendi, amac, kumeOzeti } log satırı yazar (sıralı kid, durum ve anahtar özetinin SHA-256'sı; değer değil); döndürme bunu karşılaştırır. İkinci çağrı aynı nesneyi döner, farklı girdiyle ISLETIM_AYARLAR_ZATEN_YUKLU; bu yüzden yeni anahtar kümesi yalnız sürecin yeniden başlamasıyla yüklenir.",
  },
  {
    name: 'ayarlar ve Ayarlar (tip)',
    signature:
      "function ayarlar(): Ayarlar; type Ayarlar = Readonly<{ genel: GenelAyarlar; api: ApiAyarlari; veritabani: VeritabaniAyarlari; eposta: EpostaAyarlari; kimlik: KimlikAyarlari; saat: SaatAyarlari; dogrulama: DogrulamaAyarlari; devam: DevamAyarlari; duzeltmeler: DuzeltmeAyarlari; asama2: { qrAcik: boolean }; projeksiyon: z.infer<typeof projeksiyonAyarSemasi>; isletim: IsletimAyarlari }>  // tipler z.infer<typeof AYAR_SEMASI>; projeksiyonAyarSemasi packages/contracts/src/projeksiyon.ts (D11)",
    purpose:
      "Yüklenmiş ayarlar; yüklenmeden çağrılırsa ISLETIM_AYARLAR_YUKLENMEDI. Alan modülleri ayarı bileşim kökünden parametreyle alır (D08, D13 gibi); bu işlev komutlar, işler ve test dünyası içindir. Gizli değerler GizliDeger sarmalayıcısındadır. asama2.qrAcik ASAMA2_QR_ACIK'tan gelir; D02 ile D11'in ortak tek Aşama 2 QR bayrağıdır, app.ts derslerEklentisi'ne qrDersAyariAcik olarak ve D11 eklentisine buradan verir. projeksiyon bölümü ortamdan okunmaz: D11 sözleşmesindeki varsayılanlarla projeksiyonAyarSemasi.parse({}) sonucudur (10, 20 ve 30 saniye sınırları, kod süresi, deneme ve tarayıcı tavanları); eşikler kuralı gereği değişikliği kod değişikliğidir, app.ts D11 eklentisine buradan verir. Alanların tam listesi: Durumlar ve kurallar, Ayar şeması.",
  },
  {
    name: 'GizliDeger',
    signature: "class GizliDeger { ac(): string; toJSON(): '[gizli]'; toString(): '[gizli]'; [Symbol.for('nodejs.util.inspect.custom')](): '[gizli]' }",
    purpose:
      "Veritabanı ve SMTP parolası, inceleme sabit kodu ve kalp atışı adresleri bu sarmalayıcıda durur; JSON'a, loga ya da hata iletisine yanlışlıkla girerse '[gizli]' yazar. Değeri yalnız ac() verir.",
  },
  {
    name: 'gizliAnahtar',
    signature:
      "function gizliAnahtar(amac: GizliAmac): GizliAnahtar; function gizliAnahtar(amac: GizliAmac, kid: string): GizliAnahtar | null; type GizliAmac = 'saat_belgesi' | 'qr_anahtar_kaynagi' | 'giris_kodu_ozeti' | 'eposta_ozeti' | 'ulasma_makbuzu'; type GizliAnahtar = Readonly<{ amac: GizliAmac; kid: string; deger: Uint8Array; durum: 'HAZIR' | 'ETKIN' | 'YALNIZ_DOGRULAMA' | 'ELE_GECIRILDI'; eleGecirilmeAni: Date | null }>",
    purpose:
      "kid'siz çağrı amacın tek etkin anahtarını, kid'li çağrı o anahtarı (döndürmede hazırlanan, emekli ya da ele geçirilmiş dahil) verir, yoksa null. HAZIR anahtar yalnız doğrulamada kullanılır, kid'siz çağrı onu hiçbir zaman vermez. eleGecirilmeAni yalnız ELE_GECIRILDI'de doludur: komutun --supheden değeri, şüphenin başladığı an; o kidle bu andan sonra ulaşmış kayıtlar İncelemede'ye alınır (Olay müdahalesi). deger 32 baytın kopyasıdır. Amaç bu sürece yüklenmemişse ISLETIM_GIZLI_ANAHTAR_YOK (programlama hatası). Kullananlar: D04 saat belgesi, D11 QR anahtar kaynağı, D01 giriş kodu özeti, D14 e-posta özeti (bileşim kökünden epostaKur'a), D06 ulaşma makbuzu. Her amaç tek iş içindir, anahtar paylaşılmaz (teknik.html#sunucu-ayarlar).",
  },
  {
    name: 'gizliAnahtarSeti (ek)',
    signature: 'function gizliAnahtarSeti(amac: GizliAmac): Readonly<{ etkinKid: string; anahtarlar: readonly GizliAnahtar[] }>',
    purpose: "Bir amacın bütün anahtarları; D06'nın bileşim kökündeki ulaşma makbuzu kurulumu gibi bütün kid'leri birden isteyenler için.",
  },
  {
    name: 'log ve logOlustur',
    signature:
      'const log: Logger; function logOlustur(s: { ayarlar: Ayarlar; ekGizliAdlar?: readonly string[]; hedef?: DestinationStream }): Logger  // pino; apps/server/src/infra/izleme/index.ts',
    purpose:
      "logOlustur süreç başına bir kez kökteki pino kaydedicisini kurar ve log'u ona bağlar; Fastify (loggerInstance, D13 app.ts), D14, D12 ve modüller alt kaydedici açar. JSON satır, zaman UTC ISO, düzey LOG_DUZEYI'nden, taban alanlar { surec, kopya } (pid ve hostname yok). İkinci güvence (teknik.html#sunucu-ayarlar): redact yolları (*.authorization, *.cookie, *['set-cookie'], *.parola) ve her derinlikte ISLETIM_GIZLI_ALANLAR ile ekGizliAdlar'daki anahtar adlarını '[gizli]' yapan biçimlendirici (ör. D03'ün LISTELER_GIZLI_ALANLAR'ı server.ts'ten verilir). Hata nesnesi yalnız sınıf, kod, SQLSTATE, kısıt adı ve yığın çerçeveleriyle yazılır, ileti metni değerle yazılmaz. Node'da err.stack'in ilk satırı iletiyi taşıdığından biçimlendirici yığının ilk satırını '<sınıf> [<kod>]' ile değiştirir ve yalnız '    at ' ile başlayan çerçeveleri bırakır (cause zinciri için de aynı). logOlustur çağrılmadan log stderr'e info düzeyinde yazar.",
  },
  {
    name: 'uyariAc',
    signature:
      "function uyariAc(tx: Islem, tur: UyariTuru, ayrinti: { an: Date; anahtar?: string; seviye?: 'KRITIK' | 'UYARI'; deger?: string; satirlar?: readonly string[] }): Promise<{ uyariId: string; yeni: boolean }>; type UyariTuru = `${ModulAdi}.${string}`",
    purpose:
      "Çağıranın işleminde uyarıyı açar ya da günceller: (tur, anahtar) için açık satır varsa son_gorulme_ani, tekrar_sayisi, son_deger ve satirlar yenilenir, yoksa satır açılır (INSERT ... ON CONFLICT (tur, anahtar) WHERE durum = 'ACIK' DO UPDATE). Bildirim göndermez, işletim denetimi en geç 10 dakikada bildirir. isletim.* türlerinin seviyesi ve kapanma kuralı UYARI_TURLERI kataloğundan gelir; başka modülün türü verilen seviyeyle (varsayılan UYARI) ve SESSIZLIK kuralıyla açılır. Satırlarda ve değerde 9 ile 11 haneli rakam dizisi önce '[gizli]' olur, sonra uzunluklar kesilir: değer 120 karakteri aşarsa ilk 117 karakter ve '...'; satır 200 karakteri aşarsa ilk 197 karakter ve '...'; 10'dan çok satır varsa ilk 9 satır ve '... ve N satır daha'. Uzunluk hiçbir zaman hata değildir, çünkü uyariAc çağıranın işleminde çalışır ve fırlatması çağıranın bütün işini geri alırdı (ör. D07'nin iptal listesi güncellemesi). Yalnız tür ya da anahtar deseni tutmazsa ISLETIM_UYARI_GECERSIZ (programlama hatası). Çağıranın işlemi hata yolundaysa uyarı ayrı işlemde açılır: ana işlem geri alındıktan sonra await veritabani.islem((tx) => uyariAc(tx, 'dogrulama.iptal_listesi_eski', { an, satirlar })). Çağıranlar: D01 (inceleme hesabı ayarı eksik), D07 (iptal listesi 7 günden eski, App Attest yenileme sıklığı) ve D15'in kendi işleri.",
  },
  {
    name: 'saatEsitlemeDurumu',
    signature:
      "function saatEsitlemeDurumu(): Promise<SaatEsitlemeOkumasi>; type SaatEsitlemeOkumasi = { durum: 'OKUNDU'; senkron: boolean; sapmaMs: number; katman: number | null; kaynak: string | null; olcumAni: Date; sonBozukAni: Date | null } | { durum: 'OKUNAMADI'; neden: 'DOSYA_YOK' | 'BICIM_BOZUK' | 'ERISIM_YOK' }",
    purpose:
      "<DURUM_DIZINI>/saat/chrony.json dosyasını (en çok 4 KiB) her çağrıda okur ve chronyDurumuSemasi ile doğrular; fırlatmaz, önbellek tutmaz. Eşik ve yaş kuralını uygulamaz: D04 belge kuralını SAAT_ESITLEME_ESIK_MS ve SAAT_ESITLEME_DOSYA_YASI_MS ayarlarıyla (contracts.json, Saat eşitlemesinin tek kaynağı), D15 işletim denetiminde uyarıyı aynı ayarlarla uygular.",
  },
  {
    name: 'telefonSayaciOgesi',
    signature:
      "function telefonSayaciOgesi(s: { hesapSilindiMi: (tx: Islem, kisiId: KisiId) => Promise<boolean>; saat: Saat }): OgeIsleyici<'telefon_sayaci'>;  // { roller: ['OGRENCI', 'PERSONEL'], oturumGerekli: false, govdeEnBuyukBayt: 49152, ilkCapaVar: false, ayrintiSemasi: z.object({ uygulandi: z.boolean() }), isle(tx: Islem, oge: GelenOge<'telefon_sayaci'>, baglam: PaketBaglami): Promise<OgeSonucu> }  // tipler packages/contracts/src/esitleme.ts (D06)",
    purpose:
      "telefon_sayaci öğesinin işleyicisi (contracts.json telefonSayaciOgesi); isletimEklentisi, app.ts'ten gelen hesapSilindiMi okuyucusu ve saatle kurar. İlk adım: hesapSilindiMi(tx, baglam.kisiId) true ise hiçbir tabloya yazmadan KABUL { uygulandi: false } döner, telefon kuyruğu boşalır (D06-B10 silinmiş hesabın imzalı paketini kabul eder; D01 silmesinden sonra gelen gecikmiş öğe satırı yeniden açmaz). Sonra gövdeyi JSON olarak ayrıştırıp telefonSayaciGovdesiSemasi ile doğrular; (kurulum, gün) satırını tek INSERT ... ON CONFLICT (kurulum_id, gun) DO UPDATE ... WHERE telefon_sayaclari.sira < EXCLUDED.sira RETURNING ile yazar (yazma_ani = saat.simdi()); personel paketindeki ekran sürelerini aynı işlemde hoca_ekran_sureleri'ne en büyük değer kuralıyla ekler. Ekran süreleri kişi ve gün tavanını (500 satır, 5 kaynak kimliği; yalnız yeni anahtarlar) aşarsa öğe hiçbir tabloya yazılmaz, KABUL { uygulandi: false } ve isletim.ekran_suresi_tavani log satırı; bu yolda danismaKilidi çağrılmaz (D06 paket işleminde çağırmış olabilir, D12'nin işlem başına tek çağrı kuralı), aynı kurulumun paketlerini D06'nın kurulum satırı kilidi sıralar. Sonuç: yeni ya da daha büyük sıra KABUL { uygulandi: true }; aynı oge_kimligi ZATEN_VAR; aynı gün için daha küçük ya da eşit sıralı başka öğe KABUL { uygulandi: false }; bozuk gövde RET ISLETIM_SAYAC_GOVDE_GECERSIZ; gün aralık dışı RET ISLETIM_SAYAC_GUN_GECERSIZ; öğrenci paketinde ekran süresi RET ISLETIM_SAYAC_ROL_GECERSIZ. govdeEnBuyukBayt şemanın en büyük geçerli gövdesine göre: bütün listeler en büyük boyda yaklaşık 35.100 bayt; 48 KiB yeni sayaç adlarına pay bırakır ve D06'nın öğe gövdesi sınırının (65536) altındadır. Ulaşma anı GelenOge.ulasmaAni; beklenen hiçbir durumda fırlatmaz, SAVEPOINT açmaz (D06 beklentisi). Kaydı isletimEklentisi yapar, D06.ogeTuruKaydet işlevi app.ts'ten seçenekle gelir.",
  },
  {
    name: 'kimlikOlayiDinleyicisi (ek)',
    signature: 'function kimlikOlayiDinleyicisi(tx: Islem, olay: KimlikOlayi): Promise<void>  // KimlikOlayi D01 tipidir',
    purpose:
      "D01'in kimlik olayına bağlanır (D01-A14 kimlikOlayiDinleyicisiKaydet; bağlama isletimEklentisi seçeneğiyle app.ts'ten). Yalnız hesap_silindi olayında aynı işlemde telefon_sayaclari ve hoca_ekran_sureleri'nde kisi_id = olay.kisiId satırlarını siler; öbür olaylarda bir şey yapmaz (D01-B34).",
  },
  {
    name: 'isletimEklentisi (ek)',
    signature:
      "const isletimEklentisi: FastifyPluginAsync<{ veritabani: Pick<Veritabani, 'islem' | 'semaDurumu'>; danismaKilidi: (tx: Islem, anahtarlar: readonly string[]) => Promise<void>; saat: Saat; rotalariKaydet: (app: FastifyInstance, rotalar: readonly RotaUygulamasi[]) => void; ogeTuruKaydet: (tur: 'telefon_sayaci', isleyici: OgeIsleyici<'telefon_sayaci'>) => void; kimlikOlayiDinleyicisiKaydet: (d: typeof kimlikOlayiDinleyicisi) => void; hesapSilindiMi: (tx: Islem, kisiId: KisiId) => Promise<boolean>; surec: 'api' | 'isci'; olcumYazici?: boolean }>",
    purpose:
      "app.ts'in modül eklentileri adımında kaydedilir (D13, 'D15'inki dahil'). ISLETIM_ROTALARI'nı verilen rotalariKaydet ile kaydeder; telefon_sayaci işleyicisini (hesapSilindiMi ve saatle kurulmuş) ve kimlik dinleyicisini verilen kayıt işlevleriyle bağlar. hesapSilindiMi D01'in okuyucusudur, app.ts verir (altyapı D01'i içe aktarmaz). surec api ise yanıt sayaçlarını tutan onResponse kancasını (fastify-plugin ile kökte) ekler; dakikalık ölçü dosyası yazıcısını yalnız olcumYazici true iken onReady'de başlatıp onClose'da durdurur. Varsayılan false: yalnız server.ts true verir (app.ts kurucusunun seçeneğiyle); test dünyası ve D13'ün openapi_belgesi_sakla betiği app.ready() çağırsa da /durum/api'ye yazmaya çalışmaz, paralel test işçileri aynı dosyayı ezmez. Kayıt sırasında veritabanına dokunmaz; infra/api'yi ve alan modüllerini içe aktarmaz, hatayı packages/contracts/src/ortak/hata.ts'teki UygulamaHatasi ile kurar.",
  },
  {
    name: 'kapanisiBaslat ve kapanisDurumu',
    signature: "function kapanisiBaslat(): void; function kapanisDurumu(): 'CALISIYOR' | 'KAPANIYOR'",
    purpose:
      "server.ts SIGTERM ya da SIGINT'te çağırır; sonra /health/live, /health/ready ve /v1/durum 503 ISLETIM_KAPANIYOR döner, Caddy kopyayı en geç 4 saniyede devreden çıkarır. Test dünyası kapanış senaryosunda çağırır.",
  },
  {
    name: 'isletimIsleri (ek)',
    signature:
      "function isletimIsleri(bag: { veritabani: Pick<Veritabani, 'islem'>; isSagligi: (tx: Islem) => Promise<IsSagligi>; epostaGonder: typeof epostaGonder; saat: Saat; ayarlar: Ayarlar; log: Logger }): readonly IsletimIsTanimi[]; type IsletimIsTanimi = { ad: 'isletim_denetimi' | 'isletim_kalp_atisi' | 'sertifika_bitis_denetimi' | 'haftalik_olcum_ozeti'; veri: z.ZodType<Record<string, never>>; politika: 'exclusive'; cron: string; saatDilimi: 'Europe/Istanbul'; kacirilan: 'skip' | 'once'; sureAsimiSaniye: number; deneme: { sayi: number; beklemeSaniye: number }; isle(b: { isKimligi: string; tetiklemeAni: Date; iptal: AbortSignal; log: Logger }): Promise<Readonly<Record<string, unknown>> | void> }  // apps/server/src/jobs/isletim/index.ts",
    purpose:
      "worker.ts (D14) bag'i kurar ve tanımları D14.isTanimla'ya uyarlar; D12'nin veritabaniIsleri'yle aynı desen, böylece jobs/isletim infra/is-kuyrugu'nu içe aktarmaz. Dört pg-boss işi; makine ve CI işleri burada değildir. isle'nin döndürdüğü küçük nesne iş çıktısıdır (isletim_denetimi { retSuSeviyesi }); D14 onu pg-boss çıktısına yazar ve isSagligi'nın sonCikti'sinde verir. isletim_kalp_atisi isSagligi'ndan isletim_denetimi kuyruğunun sonBasariAni'sini okur.",
  },
  {
    name: 'ISLETIM sözleşmesi (packages/contracts/src/isletim.ts)',
    signature:
      'export const ISLETIM_ROTALARI: readonly [RotaTanimi, RotaTanimi, RotaTanimi, RotaTanimi]; export const ISLETIM_HATALARI; export const ISLETIM_OGE_GEREKCELERI; export const ISLETIM_ISLETIM_KODLARI; export const ekranSureleriIstegi, ekranSureleriCevabi, telefonSayaciGovdesiSemasi, chronyDurumuSemasi, makineDurumuSemasi, bakimDosyasiSemasi, apiOlcumDosyasiSemasi, gizliAnahtarDosyasiSemasi, kalpAtisiSirriSemasi: z.ZodType; export const EKRAN_TURLERI, SAYAC_ADLARI, UYARI_TURLERI, ISLETIM_GIRDILERI, ISLETIM_ESIKLERI, YEDEK_ESIKLERI, EKRAN_SURESI_TAVANI, ISLETIM_GIZLI_ALANLAR; export function gunAtlanirMi(govde: TelefonSayaciGovdesi): boolean',
    purpose:
      "Dört rotanın tanımı (rotaTanimla, D13 birleştirir), HTTP hata kodları (hataKodlariTanimla), öğe gerekçe kodları, süreç düzeyi işletim kodları (HTTP'ye çıkmaz), gövde ve dosya şemaları, ekran türleri, sayaç adları, uyarı türü kataloğu (her tür için seviye, kapanma kuralı, değerlendiren iş ve girdi), girdi adları, eşikler (iş adıyla yedek eşikleri dahil), ekran süresi tavanı ve log gizleme adları. gunAtlanirMi saf işlevdir: bütün sayısal sayaçlar 0 ve ekranHatalari, retler ve ekranSureleri boşsa true; bildirimIzni karara girmez. Telefon uygulaması ve testler bu işlevi kullanır, kuralı yeniden yazmaz. Testler eşikleri ve listeleri buradan içe aktarır, yeniden yazmaz.",
  },
  {
    name: 'TestDunyasi, KurucuHaritasi, kurucuTanimla (test desteği)',
    signature:
      "class TestDunyasi extends World { readonly uygulama: FastifyInstance; readonly saat: SahteSaat; readonly posta: SahtePostaKutusu; bag: Map<string, string>; sonCevap: TestCevabi | null; istekGonder<R extends RotaTanimi>(rota: R, girdi: RotaGirdisi<R>, s?: { kimlik?: TestKimligi; istemciAdresi?: string; basliklar?: Readonly<Record<string, string>> }): Promise<TestCevabi<R>>; kurucu<K extends keyof KurucuHaritasi>(ad: K): KurucuHaritasi[K]; gizliDegerKaydet(...degerler: string[]): void; logSatirlari(): readonly Readonly<Record<string, unknown>>[] }; interface KurucuHaritasi {}; function kurucuTanimla<K extends string, T>(ad: K, kur: (d: TestDunyasi) => T): void  // apps/server/test/support/dunya.ts",
    purpose:
      "Her senaryo bir dünya; uygulama (app.ts, D04 sahte saat, D14 sahte posta, D12 test veritabanı, D14 test kuyruğu) işçi süreci başına bir kez kurulur (kayıt defterleri süreç başına tek). istekGonder isteği Fastify inject ile ağ açmadan yollar; kimliği telefonda Bearer, panelde çerez ve Origin olarak ekler; her simüle kullanıcıya ayrı istemci adresi verir (teknik.html#testler-veritabani-sifirlama); cevabı 2xx'te rotanın cevap şemasıyla, 4xx ve 5xx'te hataZarfiSemasi ile ve kodun rotanın hatalar listesinde ya da API_ kodlarında olmasıyla denetler (D13 isteği). Modüllerin veri kurucuları support/kurucular/<modül>.ts'te kurucuTanimla ile kaydolur ve KurucuHaritasi'nı declare module ile genişletir; dünya dosyası değişmez. gizliDegerKaydet ile kaydedilen numara ve isimler After kancasında senaryonun loglarında aranır.",
  },
  {
    name: 'Test kancaları (apps/server/test/support/kancalar.ts)',
    signature:
      "BeforeAll({ target: HookTarget.COORDINATOR }) -> D12.testVeritabaniHazirla; BeforeAll -> işçi kaynakları; Before -> sıfırlama sırası; After -> log taraması; AfterAll -> kapatma",
    purpose:
      "Koordinatör kancası D12.testVeritabaniHazirla'yı bir kez çağırır. İşçi başına: TZ=UTC denetimi, FSTDEP uyarısını kırmızıya çeviren process.on('warning') (teknik.html#sunucu), test ayarlarıyla ayarlariYukle, bellek hedefli logOlustur, uygulamanın kurulması. Her senaryodan önce sabit sırayla: D12.senaryoOncesiSifirla, D14'ün test kuyruğunda deleteAllJobs, sahte saatin varsayılan ana (2026-10-05 09:00 İstanbul) kurulması, dünya durumunun boşaltılması. Her senaryodan sonra yakalanan log satırlarında kaydedilmiş gizli değerler aranır, bulunursa senaryo kırmızı olur. Başka modüllerin kanca dosyaları genel sıfırlama yapmaz, yalnız kendi etiketli kurulumlarını yapar.",
  },
];

const files = [
  // sözleşme
  'packages/contracts/src/isletim.ts',
  // ayarlar
  'apps/server/src/infra/ayarlar/index.ts',
  'apps/server/src/infra/ayarlar/sema.ts',
  'apps/server/src/infra/ayarlar/gizli-dosyalar.ts',
  'apps/server/src/infra/ayarlar/gizli-deger.ts',
  'apps/server/src/infra/ayarlar/cgroup.ts',
  'apps/server/src/infra/ayarlar/yayin-bilgisi.kaynak.json',
  'apps/server/src/infra/ayarlar/yayin-bilgisi-uret.ts',
  'apps/server/src/infra/ayarlar/sema.test.ts',
  'apps/server/src/infra/ayarlar/gizli-dosyalar.test.ts',
  'apps/server/src/infra/ayarlar/gizli-deger.test.ts',
  'apps/server/src/infra/ayarlar/yayin-bilgisi-uret.test.ts',
  // izleme
  'apps/server/src/infra/izleme/index.ts',
  'apps/server/src/infra/izleme/tablolar.ts',
  'apps/server/src/infra/izleme/log.ts',
  'apps/server/src/infra/izleme/log.test.ts',
  'apps/server/src/infra/izleme/eklenti.ts',
  'apps/server/src/infra/izleme/saglik.ts',
  'apps/server/src/infra/izleme/kapanis.ts',
  'apps/server/src/infra/izleme/ekran-sureleri.ts',
  'apps/server/src/infra/izleme/telefon-sayaci.ts',
  'apps/server/src/infra/izleme/telefon-sayaci.test.ts',
  'apps/server/src/infra/izleme/kimlik-dinleyicisi.ts',
  'apps/server/src/infra/izleme/uyarilar.ts',
  'apps/server/src/infra/izleme/kurallar.ts',
  'apps/server/src/infra/izleme/kurallar.test.ts',
  'apps/server/src/infra/izleme/girdiler.ts',
  'apps/server/src/infra/izleme/durum-dosyalari.ts',
  'apps/server/src/infra/izleme/durum-dosyalari.test.ts',
  'apps/server/src/infra/izleme/api-olcum.ts',
  'apps/server/src/infra/izleme/api-olcum.test.ts',
  'apps/server/src/infra/izleme/istanbul-gunu.ts',
  'apps/server/src/infra/izleme/sertifika.ts',
  'apps/server/src/infra/izleme/le-deneme-kokleri.pem',
  'apps/server/src/infra/izleme/kalp-atisi.ts',
  'apps/server/src/infra/izleme/olcumler.ts',
  'apps/server/src/infra/izleme/olcum-ozeti.ts',
  'apps/server/src/infra/izleme/olcum-ozeti.test.ts',
  'apps/server/src/infra/izleme/compose-denetimi.test.ts',
  'apps/server/src/infra/izleme/asvs.test.ts',
  'apps/server/src/infra/izleme/ota-denetimi.ts',
  'apps/server/src/infra/izleme/ota-denetimi.test.ts',
  'apps/server/src/infra/izleme/node-surumu-denetimi.ts',
  'apps/server/src/infra/izleme/node-surumu-denetimi.test.ts',
  // makine tarafı (D15-A12: docker/isletim/ altına taşınması önerildi)
  'apps/server/src/infra/izleme/makine/ortak.sh',
  'apps/server/src/infra/izleme/makine/saat-esitleme-izleme.sh',
  'apps/server/src/infra/izleme/makine/makine-denetimi.sh',
  'apps/server/src/infra/izleme/makine/log-arsivi.sh',
  'apps/server/src/infra/izleme/makine/log-bul.sh',
  'apps/server/src/infra/izleme/makine/yayinla.sh',
  'apps/server/src/infra/izleme/makine/kur.sh',
  'apps/server/src/infra/izleme/makine/anahtar.sh',
  'apps/server/src/infra/izleme/makine/cosign-sunucu.pub',
  'apps/server/src/infra/izleme/makine/chrony.conf',
  'apps/server/src/infra/izleme/makine/iu-yoklama-saat-esitleme.service',
  'apps/server/src/infra/izleme/makine/iu-yoklama-saat-esitleme.timer',
  'apps/server/src/infra/izleme/makine/iu-yoklama-makine-denetimi.service',
  'apps/server/src/infra/izleme/makine/iu-yoklama-makine-denetimi.timer',
  'apps/server/src/infra/izleme/makine/iu-yoklama-log-arsivi.service',
  'apps/server/src/infra/izleme/makine/iu-yoklama-log-arsivi.timer',
  'apps/server/src/infra/izleme/makine/makine.test.ts',
  // işler
  'apps/server/src/jobs/isletim/index.ts',
  'apps/server/src/jobs/isletim/isletim-denetimi.ts',
  'apps/server/src/jobs/isletim/isletim-kalp-atisi.ts',
  'apps/server/src/jobs/isletim/sertifika-bitis-denetimi.ts',
  'apps/server/src/jobs/isletim/haftalik-olcum-ozeti.ts',
  // bileşim kökü ve komutlar
  'apps/server/src/server.ts',
  'apps/server/src/cli/anahtar-uret.ts',
  'apps/server/src/cli/olcum-raporu.ts',
  // davranış senaryoları
  'apps/server/test/features/isletim/saglik-uclari.feature',
  'apps/server/test/features/isletim/sunucu-kapanisi.feature',
  'apps/server/test/features/isletim/ekran-sureleri.feature',
  'apps/server/test/features/isletim/telefon-sayaci.feature',
  'apps/server/test/features/isletim/hesap-silme.feature',
  'apps/server/test/features/isletim/uyarilar.feature',
  'apps/server/test/features/isletim/isletim-denetimi.feature',
  'apps/server/test/features/isletim/kalp-atisi.feature',
  'apps/server/test/features/isletim/sertifika.feature',
  'apps/server/test/features/isletim/haftalik-olcum-ozeti.feature',
  'apps/server/test/features/isletim/olcum-gorunumleri.feature',
  'apps/server/test/features/isletim/log-gizliligi.feature',
  'apps/server/test/features/isletim/eski-surum-istekleri.feature',
  'apps/server/test/features/isletim/anahtar-dondurme.feature',
  'apps/server/test/features/isletim/asvs-eslemesi.json',
  'apps/server/test/features/isletim/ornekler/surumler/.gitkeep',
  'apps/server/test/steps/isletim/saglik-adimlari.ts',
  'apps/server/test/steps/isletim/sayac-adimlari.ts',
  'apps/server/test/steps/isletim/uyari-adimlari.ts',
  'apps/server/test/steps/isletim/denetim-adimlari.ts',
  'apps/server/test/steps/isletim/olcum-adimlari.ts',
  'apps/server/test/steps/isletim/surum-ornekleri-adimlari.ts',
  'apps/server/test/steps/isletim/anahtar-adimlari.ts',
  // ortak test dünyası
  'apps/server/test/support/dunya.ts',
  'apps/server/test/support/kancalar.ts',
  // yük testi
  'apps/server/test/yuk/esikler.ts',
  'apps/server/test/yuk/ortak/imza.ts',
  'apps/server/test/yuk/ortak/telefon.ts',
  'apps/server/test/yuk/ortak/kursu.ts',
  'apps/server/test/yuk/ders-basi.ts',
  'apps/server/test/yuk/ders-cikisi.ts',
  'apps/server/test/yuk/gece.ts',
  'apps/server/test/yuk/giris-yiginlasmasi.ts',
  'apps/server/test/yuk/panel-raporlari.ts',
  'apps/server/test/yuk/tohum.ts',
  'apps/server/test/yuk/sonrasi-denetim.ts',
  // paket ve araç ayarları
  'apps/server/package.json',
  'apps/server/tsconfig.json',
  'apps/server/cucumber.js',
  'apps/server/Dockerfile',
  'apps/server/Dockerfile.dockerignore',
  'packages/core/package.json',
  'packages/core/tsconfig.json',
  'packages/core/stryker.config.json',
  'packages/core/stryker-esikler.json',
  'packages/core/stryker-esik-denetimi.ts',
  'package.json',
  'pnpm-workspace.yaml',
  'pnpm-lock.yaml',
  'biome.json',
  'tsconfig.base.json',
  '.env.example',
  // dağıtım
  'compose.yaml',
  'docker/caddy/Caddyfile',
  'docker/caddy/sayfalar/gizlilik.html',
  'docker/xprem/surum.env',
  'docker/xprem/xprem.env.ornek',
  'docker/xprem/cosign.pub',
  // CI
  '.github/workflows/kalite.yml',
  '.github/workflows/guvenlik.yml',
  '.github/workflows/haftalik.yml',
  '.github/workflows/yayin-sunucu.yml',
  '.github/workflows/yayin-ota.yml',
  '.github/dependabot.yml',
];

const t = (name, kind, asserts) => ({ name, kind, asserts });

const tests = [
  t("Canlılık ucu veritabanı olmadan cevap verir", "behavior", "Eklenti, semaDurumu ulasilamiyor döndüren ve her islem çağrısında hata fırlatan sahte veritabanı nesnesiyle kurulur: GET /health/live 204 ve gövdesiz, sahte nesneye hiç çağrı yok; /health/ready 503 ISLETIM_HAZIR_DEGIL_VERITABANI (zemin: gerçek test veritabanıyla ikisi de 204)."),
  t("Hazırlık ucu şema geride iken hazır değil der", "behavior", "D12 semaDurumu geride (imajdaki son göç özeti defterde yok) iken /health/ready 503 ISLETIM_HAZIR_DEGIL_SEMA; nesil_belirsiz için de aynı kod; defterde özetten sonra göç varken 204 (genişletme göçü)."),
  t("Hazırlık ucu 2 saniyede cevap gelmezse hazır değil der", "behavior", "semaDurumu 2.500 ms bekleyen sahteyle /health/ready 503 ISLETIM_HAZIR_DEGIL_VERITABANI ve süre 2.100 ms altında; 1.900 ms bekleyende 204 (sınır yer kontrolü)."),
  t("Durum ucu gövdesiz 204 döner ve veritabanına dokunmaz", "behavior", "Eklenti, her islem ve semaDurumu çağrısında hata fırlatan ve çağrıları sayan sahte veritabanı nesnesiyle kurulur (canlılık testindeki gibi; pg_stat_statements kümenin tamamını ve paralel Cucumber işçilerini topladığından kullanılmaz): GET /v1/durum 204, gövde boş, Cache-Control: no-store ve X-Istek-Kimligi var (D13), sahte nesnenin çağrı sayısı 0. Zemin: aynı kurulumda POST /v1/isletim/ekran-sureleri sahte nesneyi çağırır (sayı 1 ve üstü) ve 5xx alır; sayaç gerçekten sayıyor."),
  t("Aşırı yükte canlılık ve durum uçları cevap verir", "behavior", "D13 deneme seçeneğiyle baskı açıkken /health/live ve /v1/durum 204; /health/ready ve POST /v1/isletim/ekran-sureleri 503 API_SUNUCU_YOGUN ve Retry-After (D13 aralığı)."),
  t("Kapanış başlayınca sağlık uçları 503 döner, süren istek biter", "behavior", "Uzun süren deneme isteği açıkken kapanisiBaslat: yeni /health/live, /health/ready ve /v1/durum 503 ISLETIM_KAPANIYOR; açık istek 200 ile tamamlanır; KAPANIS_ONCESI_BEKLEME_MS (test 0) sonra app.close; kapanış sırası app.close, eposta.kapat, iş kuyruğu durdur, havuz kapat çağrı kaydından okunur."),
  t("Eksik zorunlu ayar süreci açmaz ve değer sızdırmaz", "behavior", "PANEL_ADRESI eksik ve EPOSTA_SMTP_PORT 'abc' iken ayarlariYukle ISLETIM_AYAR_GECERSIZ fırlatır; ileti iki adı sayar, ortamdaki herhangi bir değeri (ör. veritabanı adresi) içermez (yer kontrolü: değerler ortamda vardı)."),
  t("Gizli anahtar dosyası kuralları", "property", "fast-check numRuns 2000: rastgele anahtar kümelerinde ayarlariYukle yalnız şu durumda kabul eder: tam bir ETKIN, en çok bir HAZIR, etkinKid ETKIN olana eşit, kid'ler tekil ve ^[a-z0-9-]{1,8}$, değer base64 32 bayt, eleGecirilmeAni yalnız ELE_GECIRILDI'de ve dolu, en çok 4 anahtar. Kabul edilen kümede gizliAnahtar(amac) etkin anahtarı (hiçbir zaman HAZIR olanı), gizliAnahtar(amac, kid) aynı baytları ve eleGecirilmeAni'yi verir, bilinmeyen kid null."),
  t("Süreç türüne göre zorunlu sırlar", "behavior", "surec api iken saat_belgesi, qr_anahtar_kaynagi, giris_kodu_ozeti, eposta_ozeti, ulasma_makbuzu, inceleme_sabit_kodu ve yoklama_api_parolasi zorunlu; isci iken giris_kodu_ozeti ve ulasma_makbuzu aranmaz, istenirse ISLETIM_GIZLI_ANAHTAR_YOK fırlar. İşçide inceleme_sabit_kodu dosyası varken kimlik.incelemeSabitKoduVar true ve değer hiçbir alanda yok (Ayarlar nesnesi JSON'a çevrilip aranır), dosya yokken false ve süreç açılır. Liste ve beklenen tablo sözleşmedeki matristen içe aktarılır."),
  t("Saat dilimi UTC değilse süreç açılmaz", "behavior", "Çocuk süreçte: TZ=Europe/Istanbul ile ayarlariYukle ISLETIM_SAAT_DILIMI; TZ=Europe/London ile, saat farkı 0 olan ocak ayında da ISLETIM_SAAT_DILIMI (saat farkına değil ada bakıldığının kanıtı); TZ=UTC ve TZ=Etc/UTC ile açılır (pozitif kontrol)."),
  t("Bellek eşiği kap sınırının altında olmalı", "behavior", "Sahte cgroup memory.max 1073741824 iken BASKI_BELLEK_BAYT 1073741824 ISLETIM_BASKI_BELLEK_SINIRI, 912680550 kabul; memory.max max (sınırsız, geliştirme) iken varsayılan 2 GiB."),
  t("GizliDeger hiçbir çıktıda görünmez", "behavior", "JSON.stringify, String(), util.inspect ve pino log satırı '[gizli]' yazar, ac() değeri verir; değerin kendisi hiçbir çıktıda geçmez (yer kontrolü: ac() sonucu doğru)."),
  t("Log gizleme her derinlikte çalışır", "property", "fast-check numRuns 1000: rastgele iç içe nesnelerde ISLETIM_GIZLI_ALANLAR ve ekGizliAdlar'daki her anahtarın değeri log satırında '[gizli]', öbür anahtarlar aynen (pozitif kontrol: gizli olmayan alan değişmeden çıkar)."),
  t("Senaryo loglarında numara ve isim bulunmaz", "behavior", "After kancası, kurucuların gizliDegerKaydet ile kaydettiği numara ve isimleri senaryonun log satırlarında arar. Kendi testi: bir deneme adımı numarayı bilerek ham olarak log hedefine yazar ve kanca senaryoyu kırmızı yapar; aynı numara gizli alan adıyla loglanınca yeşil kalır."),
  t("Veritabanı hatası logda değer taşımaz", "behavior", "Bilerek tekil kısıt ihlali yaptıran deneme isteğinde log satırında SQLSTATE 23505 ve kısıt adı var, ihlal eden değer ve sorgu parametresi yok (teknik.html#sunucu-ayarlar; D12 senaryosuyla aynı ilke, D15 biçimlendiricisi üzerinden). İletisine bilerek 10 haneli numara konmuş bir Error loglanınca satırda numara yok (yığının ilk satırı dahil), sınıf adı ve '    at ' çerçeveleri var (yer kontrolü: aynı numara ham yazılınca After kancası senaryoyu kırmızı yapar)."),
  t("Ekran süreleri birikmiş toplamla yazılır", "behavior", "Hoca panelden 2026-10-05 için oturum A KAFA_SAYISI 40 gönderir: 200 { kaydedilen: 1 }; ardından 25 gönderir: 200 { kaydedilen: 0 }, satır 40 kalır; 70 gönderir: satır 70; aynı istek iki kez: değişiklik yok."),
  t("İki tarayıcı ayrı satır yazar", "behavior", "Aynı hoca iki istemciKimligi ile aynı oturum ve ekran için 30 ve 50 gönderir: iki satır; olcum_hoca_isi oturumu 80 saniye sayar."),
  t("Ekran süresi gün ve süre sınırları", "behavior", "Sahte saat 2026-10-20 10:00 İstanbul: gun 2026-10-06 (14 gün) kabul, 2026-10-05 400 ISLETIM_GUN_ARALIK_DISI, 2026-10-21 400 ISLETIM_GUN_ARALIK_DISI; toplamı 86401 olan istek 400 ISLETIM_SURE_GECERSIZ; aynı (oturumId, ekranTuru) iki kez 400 ISLETIM_SURE_GECERSIZ. Şemanın en büyük geçerli gövdesi (200 öğe, her alan en uzun değerinde; boyutu test kendisi hesaplar, yaklaşık 20 KB) 200 alır."),
  t("Ekran süresi yetki ve köken kuralları", "behavior", "Oturumsuz 401 API_KIMLIK_GEREKLI; öğrenci oturumu 403 API_ROL_YETKISIZ; yanlış Origin ile çerezli istek 403 API_KOKEN_GECERSIZ; 32 KiB üstü gövde 413 API_GOVDE_COK_BUYUK (D13 kancaları; senaryo rota beyanını sınar)."),
  t("Ekran süresi kişi ve gün tavanı", "behavior", "EKRAN_SURESI_TAVANI sözleşmeden içe aktarılır. Aynı hoca ve gün için 500 farklı anahtar yazılınca 500. satır kabul (sınır yer kontrolü), 501. yeni anahtarı taşıyan istek 400 ISLETIM_SURE_GECERSIZ ve hiçbir satırı yazılmaz; tavan doluyken var olan bir satırı artıran istek 200 (yalnız yeni anahtarlar sayılır); altıncı istemciKimligi 400. Telefon yolunda tavanı aşan personel öğesi KABUL { uygulandi: false } alır, ne sayaç ne ekran süresi satırı yazılır ve isletim.ekran_suresi_tavani log satırı çıkar; aynı paketteki yoklama kaydı KABUL alır."),
  t("Sayaç paketi kabul edilir ve yinelenince ZATEN_VAR alır", "behavior", "Öğrenci telefonundan gönderimde telefon_sayaci öğesi: KABUL { uygulandi: true }, satır değerleri gövdeyle aynı; aynı öğe yeniden gönderilince ZATEN_VAR ve satır değişmez."),
  t("Aynı gün için büyük sıra kazanır, varış sırası sonucu değiştirmez", "property", "fast-check numRuns 500: bir (kurulum, gün) için rastgele sıralarla üretilmiş 1 ile 6 öğe rastgele sırada işlenir; son satır her zaman en büyük sıralı öğenin değerlerini taşır, küçük sıralı öğeler KABUL { uygulandi: false } alır."),
  t("Bilinmeyen sayaç adı saklanmaz, sayılır", "behavior", "Gövdede sayaclar.yeniSayac 5 ve gonderilmemisKayit 2: satırda gonderilmemis_kayit 2, bilinmeyen_ad_sayisi 1, yeniSayac hiçbir sütunda yok; sonuç KABUL."),
  t("Bozuk sayaç paketi öğe düzeyinde reddedilir", "behavior", "JSON olmayan gövde RET ISLETIM_SAYAC_GOVDE_GECERSIZ; gün ulaşma gününden 2 gün ileri RET ISLETIM_SAYAC_GUN_GECERSIZ; öğrenci paketinde ekranSureleri RET ISLETIM_SAYAC_ROL_GECERSIZ; aynı paketteki yoklama kaydı KABUL alır (paket düşmez, D06 kuralı). Şemanın en büyük geçerli personel gövdesi (bütün listeler en uzun boyda, yaklaşık 35 KB; test hesaplar) KABUL alır, govdeEnBuyukBayt'ı 1 bayt aşan öğe D06'dan RET ESITLEME_OGE_GECERSIZ alır."),
  t("Hoca telefonunun ekran süreleri tabloya girer", "behavior", "Personel paketinde ekranSureleri [{oturumId: A, ekranTuru: INCELEME, saniye: 45}]: hoca_ekran_sureleri satırı kaynak TELEFON, kaynak_kimligi kurulum kimliği, saniye 45."),
  t("Hesap silinince sayaçlar ve ekran süreleri silinir", "behavior", "D01'in hesap_silindi olayı (kurucu ile tetiklenir) aynı işlemde kişinin telefon_sayaclari ve hoca_ekran_sureleri satırlarını siler; başka kişinin satırları kalır (zemin); olay işlemi geri alınınca satırlar da kalır."),
  t("Silinmiş hesabın gecikmiş sayaç öğesi yazılmaz", "behavior", "Personel hesabı D01 kurucusuyla silinir (hesap_silindi olayı, satırlar silinir); aynı kurulumun telefonunda bekleyen, ekran süresi de taşıyan telefon_sayaci öğesi silmeden sonra eski cihaz anahtarıyla imzalı pakette gelir: sonuç KABUL { uygulandi: false }, telefon_sayaclari ve hoca_ekran_sureleri'nde o kişi için satır yok. Zemin: silinmemiş başka hesabın aynı anda gelen öğesi satır yazar. Eşzamanlılık: silme işlemi kişi satırını güncellerken başlayan öğe işlemi silme bitene kadar bekler ve satır yazmaz (iki bağlantıyla sıralanmış deneme)."),
  t("Sıfır gün kuralı tek işlevden gelir", "property", "fast-check numRuns 2000: rastgele telefon_sayaci gövdelerinde gunAtlanirMi(govde) yalnız bütün sayısal sayaçlar 0 ve ekranHatalari, retler, ekranSureleri boşken true; bildirimIzni true, false ya da yokken sonuç değişmez; tek bir ekran süresi ya da ret eklenince false (pozitif kontrol: sayaçları sıfır, ekranSureleri dolu hoca günü gönderilir). İşlev packages/contracts/src/isletim.ts'ten içe aktarılır, telefon uygulaması aynı işlevi kullanır."),
  t("Aynı uyarı tek açık satırda birikir", "behavior", "uyariAc aynı (tur, anahtar) ile üç kez: tek ACIK satır, tekrar_sayisi 3, yeni ilk çağrıda true sonra false; farklı anahtar ayrı satır."),
  t("Uyarı satırında numara maskelenir, uzun metin kesilir", "behavior", "satirlar ['Öğrenci 2024000123 için'] ile uyariAc: satırda '[gizli]', rakam dizisi yok; 8 haneli sayı (ör. 12345678 bayt) aynen kalır (sınır kontrolü). 12 satır verilince 10 satır yazılır, sonuncusu '... ve 3 satır daha'; 250 karakterlik satır 200 karaktere, 130 karakterlik değer 120 karaktere '...' ile kesilir ve fırlatılmaz: çağıranın aynı işlemdeki yazımı kalıcı olur (yer kontrolü). Yalnız tür deseni tutmayan çağrı ISLETIM_UYARI_GECERSIZ."),
  t("Bildirim, hatırlatma ve düzeldi iletisi", "behavior", "KRITIK ve UYARI düzeyinde iki uyarı aynı çalışmada açılır, isletim_denetimi bildirir: her alıcıya tek özet e-posta, iki uyarı ayrı satırlarda ve kısa kimlikleri farklı (D14 sahte posta, konu seviye sayılarını taşır); 5 saat 59 dakika sonra çalışma yeni e-posta göndermez, 6 saat sonra hatırlatma gider; koşul düzelince KAPANDI ve tek düzeldi satırı; hiç bildirilmemiş uyarı kapanınca ileti yok."),
  t("SMTP düşükken bildirim hatası kalp atışını çevirir", "behavior", "Sahte posta kutusu her gönderimde bağlantı hatası verir: uyarı bildirim_hatasi true kalır, isletim_kalp_atisi sorunAdres'e istek atar; sorunAdres yoksa hiç istek atmaz; posta düzelince sonraki denetim bildirir ve kalp atışı normale döner."),
  t("Bildirim adımı süre bütçesine uyar", "behavior", "Sahte posta kutusu her gönderimi 10 saniye geciktirip bağlantı hatası verir (sahte zamanlayıcıyla; D14'ün iki yeniden denemesi dahil); 5 alıcı ve 6 açık uyarıyla isletim_denetimi 300 saniye içinde biter, uyarılar adım 2'de açılmış ve kalıcıdır (bildirim adımı başarısız olsa da), hepsinde bildirim_hatasi true. Gönderim 120 saniyeyi aşınca iptal sinyali gelir ve bitmemiş gönderim gitmedi sayılır. Zemin: posta düzelince sonraki çalışma her alıcıya tek özet gönderir."),
  t("Sessizlik kuralı başka modülün uyarısını kapatır", "behavior", "dogrulama.iptal_listesi_eski uyarısı açılır: 25 saat 59 dakika sonra açık, 26 saat sonra isletim_denetimi kapatır (SESSIZLIK)."),
  t("Uyarı kuralları sınırlarda doğru karar verir", "property", "kurallar.ts saf işlevleri tablo testiyle her eşiğin bir altı, eşiti ve bir üstüyle: disk 79/80/90, bağlantı 79/80/90, 5xx 19/20, 503 oranı binde 49/50, gönderim p95 1999/2000 ms; yedek yaşı iş adıyla (YEDEK_ESIKLERI): gecelik_pg_dump, xprem_birimi_yedegi ve pgbackrest 25 saat 59 dakika/26 saat, pgbackrest_tam_yedek ve pgbackrest_dogrulama 7 gün 23 saat/8 gün, geri_yukleme_denemesi 35 gün 23 saat/36 gün; ardışık atlanan 1/2; makine dosyası 24/25 dakika, iş sessizliği 2 x aralık + 600 saniye; eşikler ISLETIM_ESIKLERI ve YEDEK_ESIKLERI'nden içe aktarılır."),
  t("İşletim denetimi D14 sağlık ölçüsünden uyarı açar", "behavior", "D14'ün test kuyruğunda ölü mektuba düşen iş, son başarısı aralığın iki katından eski zamanlanmış iş ve art arda 3 başarısız e-posta varken isletim_denetimi çalışır: isletim.olu_mektup (anahtar kuyruk), isletim.is_sessiz ve KRITIK isletim.eposta_basarisiz açılır; durum düzelince sonraki çalışmada üçü de KAPANDI."),
  t("Durum dosyalarından uyarı", "behavior", "Sahte durum dizininde: chrony.json senkron false ise KRITIK isletim.saat_esitleme; makine.json disk yüzde 85 UYARI, 91 KRITIK; 26 saat önce biten gecelik_pg_dump dosyası KRITIK isletim.yedek_eski; sonSonuc basarisiz KRITIK isletim.yedek_basarisiz; ardisikAtlanan 2 UYARI isletim.yedek_atlandi; 30 dakikalık makine dosyası isletim.makine_denetimi_sessiz. Pazar 01:00 tam yedeği ve pazartesiden cumartesiye 01:00 fark yedekleri başarılı iken cumartesi 08:00 denetiminde (tam yedek 6 gün 7 saat, son fark yedeği 7 saat önce) hiçbir yedek uyarısı yok: tam yedeğin haftalık takvimi yanlış KRITIK üretmez. Ayın ilk cumartesileri arasındaki 35 günlük aralıkta geri yükleme denemesi uyarısı yok."),
  t("Okunamayan girdi açık uyarıyı kapatmaz", "behavior", "Açık ve bildirilmiş isletim.disk_doluluk uyarısı varken makine.json silinir ve isletim_denetimi çalışır: disk uyarısı açık kalır, tekrar_sayisi değişmez, düzeldi satırı gitmez; isletim.makine_denetimi_sessiz açılır. Aynı deneme bir yedek durum dosyasıyla: dosya bozulunca o işin yedek_eski uyarısı açık kalır, isletim.yedek_durumu_okunamadi açılır, öbür işlerin uyarıları kendi dosyalarına göre kapanır. Zemin: makine.json geri gelip disk yüzde 50 gösterince disk uyarısı kapanır ve tek düzeldi satırı gider."),
  t("Sertifika uyarısını işletim denetimi kapatmaz", "behavior", "sertifika_bitis_denetimi 06:35'te UYARI isletim.sertifika_bitiyor açar; 06:40'ta isletim_denetimi çalışır: uyarı açık kalır ve her alıcıya özet e-posta gider; sonraki çalışmalarda da açık kalır. Uyarıyı yalnız sertifika_bitis_denetimi, sertifika yenilenmiş okunduğunda kapatır ve sonraki isletim_denetimi düzeldi satırını gönderir. Caddy düşükken sertifika_bitis_denetimi uyarıya dokunmaz, isletim.denetim_girdisi (anahtar sertifika) açar."),
  t("Bir girdi bozukken öbür kuralların uyarıları açılır", "behavior", "isSagligi sahtesi hata fırlatırken (göçten sonra kırılan sorgu benzeri) ve makine.json disk yüzde 91 gösterirken isletim_denetimi çalışır: iş başarıyla biter, KRITIK isletim.disk_doluluk ve isletim.denetim_girdisi (anahtar is_sagligi) açılır; isSagligi'na bağlı açık isletim.olu_mektup uyarısı açık kalır. Aynı girdi art arda üç çalışmada okunamayınca isletim.denetim_girdisi KRITIK olur. Hata veren sorgu ayrı işlemde koştuğundan öbür sorgular 25P02 (işlem bozuldu) almaz."),
  t("API ölçü dosyalarından uyarı", "behavior", "İki kopyanın son 10 dakikalık dosyalarında toplam 503 dışı 5xx 20: isletim.api_5xx; 503 oranı yüzde 5 ve toplam 200 üstü: isletim.api_503; gönderim kovalarından p95 2000 ms: isletim.gonderim_yavas; 5 dakikadan eski dosya sayılmaz."),
  t("Yeni ret kodu aynı gün uyarı açar", "behavior", "Son 28 günde görülmemiş (400, YOKLAMA_X) ret kodu taşıyan sayaç paketi gelir: sonraki denetimde isletim.yeni_ret_kodu, anahtar '400:YOKLAMA_X'; aynı kod su seviyesinden önce yazılmış ve gun'ü 28 gün içinde olan bir satırda görülmüşse uyarı yok. İşçi 40 dakika kapalı kalıp açılınca o arada yazılan satırlardaki yeni kod yine uyarı açar (su seviyesi önceki başarılı çalışmanın çıktısı). Makbuzla yeniden gelen ve son_alinma_ani'si iki gün önce olan öğedeki yeni kod da uyarı açar (pencere yazma_ani'ye bakar)."),
  t("Devam tutarlılık farkı uyarıya döner", "behavior", "D14 isSagligi devam_tutarlilik_denetimi için son çıktıda farkSayisi 3 verirken isletim.devam_tutarlilik_farki açılır; sonraki çıktı 0 olunca kapanır (D08-A08)."),
  t("WAL arşivi ve bağlantı sayısı", "behavior", "pg_stat_archiver sahte görünümünde last_failed_time last_archived_time'dan yeni ise KRITIK isletim.wal_arsivi; bağlantı 80 UYARI, 90 KRITIK isletim.baglanti_sayisi (sistem görünümü okuması bir sorgu katmanından verilir, kural saf)."),
  t("Kalp atışı adres seçimi", "behavior", "Sahte HTTP sunucusu: açık KRITIK yokken ve son başarılı denetim yeniyken normalAdres'e tek GET, gövdesiz ve sorgusuz; açık KRITIK varken sorunAdres'e; isletim_denetimi üç çalışma üst üste hata verince (sahte isSagligi'nda sonBasariAni 35 dakika önce) açık uyarı olmasa da sorunAdres'e; isletim_uyarilari okuması hata verince sorunAdres'e; işçi 10 dakika önce açılmış ve hiç başarılı denetim yokken normalAdres'e (yer kontrolü); uretim ortamında kalp_atisi sırrı yoksa işçinin ayarlariYukle'si ISLETIM_AYAR_GECERSIZ verir."),
  t("Sertifika bitiş eşikleri", "behavior", "Testte üretilen kendinden imzalı kök ve sertifikalarla yerel TLS sunucusu, kök ISLETIM_SERTIFIKA_KOK_DOSYASI ile verilir: acme türünde 15 gün kala uyarı yok, 13 gün kala UYARI, 6 gün kala KRITIK isletim.sertifika_bitiyor; elle türünde 29 gün kala UYARI; adı tutmayan sertifika KRITIK isletim.sertifika_gecersiz. Kök dosyası verilmeyince aynı sertifika sistem köklerine göre sertifika_gecersiz olur (ayarın etkisinin yer kontrolü); ISLETIM_ORTAM uretim iken ayar verilirse ayarlariYukle ISLETIM_AYAR_GECERSIZ."),
  t("Ölçüm görünümleri hedef tanımlarını uygular", "behavior", "Kurucularla tohumlanmış verilerde: 24 saatte ulaşan oran, saati doğrulanamayan oranı (Android ve iPhone ayrı), işaretlenmeden kabul (payda ilk kesin kararı VAR ya da INCELEMEDE olanlar, pay VAR ve etiketsiz ve kafa sayısı işaretsiz oturumda), kafa sayısı aşımı olmayan oturum oranı ve hocanın işi ortancası elle hesaplanan beklenen tabloyla birebir aynı; BEKLEMEDE ve RET kayıtları paydaya girmez (plan.html#hedefler). İşaretli oturum: KAFA_SAYISI_ASIMI satırı gecerli true ve kesinlesti_ani dolu; bir kez işaretlenip son hesapta eşiğin altına inen oturum (gecerli false) işaretli sayılmaz, kesinleşmemiş oturum ayrı sütunda sayılır ve orana girmez."),
  t("Hocanın işi yalnız dersin sahiplerini sayar", "behavior", "Başka personelin aynı oturum için gönderdiği 300 saniye olcum_hoca_isi'ne girmez; dersin sahibinin 90 saniyesi girer; ders devredildikten sonra eski hocanın (onceki_sahip_kisi_idleri) devirden önceki oturumdaki 60 saniyesi girer; kafa sayısı girilmemiş oturum ortancaya girmez."),
  t("Ölçüm görünümleri kişisel veri çıkarmaz", "contract", "Her olcum_ görünümünün sütun listesi katalogdan okunur: kisi_id, ogrenci_id, ogrenci_no, ad_soyad, eposta adlı sütun yoktur; görünümler security_invoker true (pg_class.reloptions)."),
  t("Telefonda kalan kayıplar üç ayrı oranla sayılır", "behavior", "Kurucularla: son teması 8 gün önce olan ve 3 bekleyen yoklama ile 2 eksik sıra bildiren kurulum TELEFONDA_KALAN'da 3 kayıt ve 2 eksik sıra; son teması 6 gün önce olan kurulum henüz sayılmaz (7 gün sınırı, sorguda); cihazı onaylı değişimle kapanan (kapanma_nedeni degisim) eski kurulumun bekleyen 4 kaydı TELEFONDA_KALAN'da değil CIHAZ_DEGISIMI'nde; BEYANA_DAYALI sebep kodlu iki elle ekleme BEYANA_DAYALI'da 2. Üç ölçü ayrı satırda ve ayrı oranla; deneme dersi ve inceleme hesabı satırları hiçbirine girmez."),
  t("Haftalık özet ve 13 aylık silme", "behavior", "haftalik_olcum_ozeti çalışınca her alıcıya tek e-posta gider, satırlar hedefi, değeri ve kohort aralığını yazar. Gönderme oranı olgun kohorttan: pazar günü hesaplanan ve salı ulaşan kayıt ertesi pazartesinin özetine girmez, bir hafta sonraki özette o haftanın oranında 24 saati aşmış olarak görünür. Bildirim izni oranı her kurulumun son bildirdiği değerden: pazartesi izin var bildirip sonraki günler paket göndermeyen kurulum izinli sayılır. 396 günlük sayaç ve ekran süresi satırları ve 396 gün önce kapanmış uyarı silinir, 394 günlükler kalır; aynı veriyle iki kez çalışınca ikinci çalışma 0 satır siler (D14 adımı)."),
  t("Rota tanımları D13 kurallarına uyar", "contract", "ISLETIM_ROTALARI: dört yol, yalnız /health/live ve /v1/durum baskiDisi, /health/* ve /v1/durum kök istisna, /v1/isletim/ekran-sureleri personel rolü, govdeSiniri 32768 ve 2 MiB altında, hatalar listesindeki her kod TUM_HATALAR'da; D13'ün rota tablosu sözleşme testi bu modülde de yeşil."),
  t("Compose dosyası kuralları", "contract", "docker compose config çıktısı (JSON) üzerinde: api-1, api-2, isci ve goc'ta TZ=UTC, init true, user node, read_only, cap_drop ALL; restart unless-stopped (goc hariç); logging local; isci stop_grace_period 40s, API 30s; her servisin sırları sözleşmedeki matrisle birebir aynı (fazla sır kırmızı; isci'de inceleme_sabit_kodu var); dış arayüze yalnız caddy 80 ve 443 yayımlar, xprem yönetim portu ve mailpit yalnız 127.0.0.1'e; caddy onyuz ağında 172.30.11.10."),
  t("Caddy yolları ve başlıkları", "behavior", "CI'da Caddy, test ayarıyla (yerel sertifika), sahte API ve isteğin yolunu ve gövde boyunu yankılayan sahte xprem ile açılır: /health/live 404; /v1/olmayan API'den JSON 404 (index.html değil); /v1 tek başına API'ye gider; /olmayan-sayfa index.html 200 ve CSP; /assets/olmayan.js 404; /assets dosyası uzun önbellekli; index.html Cache-Control no-cache; panel cevabında Content-Security-Policy ve Permissions-Policy var, API cevabında Caddy CSP'si yok. Güncelleme yolu: protokol eşleyicisindeki yol sahte xprem'e /guncelleme öneki atılmış olarak gider; xprem yönetim paneli yolu ve eşleyici dışındaki her /guncelleme/ yolu Caddy'den 404 alır, sahte xprem'e hiç istek düşmez. Gövde sınırı: /v1'e 5 MB gövde 413; yayın eşleyicisine 5 MB gövde 413 almaz ve sahte xprem'e tam boyla ulaşır, 65 MB gövde 413."),
  t("Yayın bilgisi üretimi", "behavior", "yayin-bilgisi-uret kaynağa bicim 1, sira (kaynak dosyasına dokunan commit sayısı) ve olusturmaAni (son commit anı) ekler; çıktı D13 yayinBilgisiSemasi'na uyar; aynı commit iki kez aynı baytları üretir; en düşük sürümü en son sürümden büyük kaynak kırmızı."),
  t("Eski sürüm istekleri hâlâ kabul edilir", "behavior", "ornekler/surumler/<sürüm>/ altındaki her örnek istek (D13'ün destek listesindeki sürümler), sahte saat örneğin geçerli penceresine kurularak oynatılır; beklenen durum ve öğe sonuçları aynen döner (plan.html#dagitim-guncelleme-ilkesi). Klasör boşken senaryo örnek sayısının sıfır olmadığını yazar ve kırmızıdır (ilk uygulama yayınından sonra)."),
  t("ASVS eşlemesi eksiksiz", "contract", "asvs-eslemesi.json'daki her uygulanan madde var olan bir senaryo adına ya da ayar denetimine bağlı (feature dosyaları ayrıştırılarak), uygulanmayan her maddenin gerekçesi dolu; madde numaraları tekil."),
  t("Saat eşitleme betiği chronyc çıktısını doğru çevirir", "behavior", "PATH'e konan sahte chronyc ile: Leap status Normal ve katman 2 senkron true, sapmaMs = tavan(1000 x (|sistem farkı| + kök dağılımı + kök gecikmesi / 2)); 'Not synchronised' senkron false ve sonBozukAni yazılır; sonraki sağlıklı okumada sonBozukAni korunur; dosya chronyDurumuSemasi'na uyar ve yazım sırasında okuyan yarım dosya görmez (1000 eşzamanlı okuma)."),
  t("Makine betiği yeniden başlamayı ve bellek taşmasını bir kez sayar", "behavior", "Sahte docker ile: RestartCount 2 iken ilk çalışma artış 0, 3 olunca artış 1, değişmeyince yine 0; yayın kabı yeniden kurunca (yeni kap kimliği, RestartCount 0) artış 0, eksi değil. docker events sahtesi 08:03'te bir oom olayı verir: 08:08 çalışmasında oomArtisi 1, 08:18 çalışmasında 0 (aynı olay iki kez sayılmaz); OOMKilled alanı hiç okunmaz. makine.json makineDurumuSemasi'na uyar."),
  t("Yayın betiği imza tutmazsa hiçbir şey değiştirmez", "behavior", "Sahte docker ve cosign ile: cosign verify hata verirse betik çıkış kodu 1, docker compose up hiç çağrılmaz; imajın sürüm etiketi istenen sürümden farklıysa aynı; doğrulama makinedeki sabit açık anahtarla yapılır (imajdan gelen anahtar dosyası kullanılmaz). Betik TZ=UTC ortamında koşar: İstanbul 09:00 (UTC 06:00) hafta içinde --simdi olmadan uyarıyla durur, İstanbul 21:00 (UTC 18:00) geçer; pencere İstanbul saatine göre denetlenir."),
  t("Yayın betiği her adımda güvenle durur ya da geri döner", "behavior", "Sahte docker ile her adım sırayla bozulur: göç hata verirse hiçbir servis yeniden kurulmaz, yayin.env önceki haline döner, çıkış 1; xprem, işçi, api-1, api-2 ya da caddy adımı tutmazsa o ana kadar değişen servisler önceki özetle aynı sırayla yeniden kurulur (çağrı kaydından okunur) ve yayinlar.log'a satır düşer. bakim.json yayın süresince vardır, her çıkışta (hata dahil) silinir; süresi geçmiş bakim.json'u isletim_denetimi yok sayar."),
  t("Ana makine zamanlayıcıları İstanbul saatiyle tetiklenir", "behavior", "Unit dosyalarındaki OnCalendar değeri systemd-analyze calendar ile çözülür: log arşivinin bir sonraki tetiği UTC 00:15'e (İstanbul 03:15) denk gelir. log-arsivi.sh TZ=UTC ile UTC 22:30'da (İstanbul ertesi gün 01:30) çalıştırılınca İstanbul'un önceki gününü seçer, UTC gününü değil."),
  t("Anahtar döndürme iki adımda ve bütün süreçlerde", "behavior", "anahtar-dondurme.feature: döndürmenin ilk adımından sonra işçi ayarlarıyla (surec isci) yeniden yüklenen süreç yeni kidli saat belgesini doğrular, gizliAnahtar('saat_belgesi') hâlâ eski etkin anahtarı verir; ikinci adımdan sonra yeni kid etkin, eski kidli belge doğrulanır. makine.test.ts: sahte docker ile anahtar.sh dondur çağrı sırası hazirla, isci, api-1, api-2 yeniden başlatma, küme özeti denetimi, etkinlestir, yeniden başlatma, denetim; bir sürecin logundaki kumeOzeti dosyanınkinden farklıysa betik etkinleştirmeden durur ve yeni kidi siler."),
  t("Ele geçirilen anahtarın şüphe anından sonraki kayıtları yeniden değerlendirilir", "behavior", "Saat belgesi kidi K ile üç kayıt: şüphe anından önce ulaşan, şüphe anından sonra ama işaretten önce ulaşan, işaretten sonra ulaşan. anahtar.sh ele-gecirildi --supheden <an> sonrası: ikinci kayıt D07.yenidenDegerlendir ile İncelemede'ye döner, üçüncüsü doğrulamada anahtarEleGecirildi true ile İncelemede alınır, birincisi değişmez (yer kontrolü). Dosyada K ELE_GECIRILDI ve eleGecirilmeAni şüphe anı."),
  t("Çevrimdışı yedek xprem ana anahtarını kapsar", "behavior", "anahtar-uret yedekle sahte gizli dizinde (saat belgesi, QR, ulaşma makbuzu kümeleri ve xprem ana anahtarı dosyası) arşiv üretir: arşivde dört girdi ve özet listesinde dört satır var; giriş kodu ve e-posta özeti yok. xprem ana anahtarı dosyası yoksa komut 1 ile çıkar ve eksik adı yazar. İkinci çalışmada önceki arşivin özet listesiyle karşılaştırma xprem anahtarındaki tek bayt değişikliğini fark eder."),
  t("Ders çıkışı yük testi geçme ölçütleri", "load", "k6 thresholds (esikler.ts): gönderim p95 < 1000 ms, p99 < 3000 ms; saat belgesi p95 < 100 ms, p99 < 300 ms (D04); 503 dışı 5xx 0; 503 oranı < yüzde 2 ve her 503 Retry-After'lı; 429 oranı 0 (D13); koşu sonrası denetim: makbuzlu her kayıt sunucuda tam bir kez, pg_stat_activity en çok 80 bağlantı, havuz bekleme p99 < 2 s (D12), devam_hesapla gecikmesi p95 en çok 5 dakika (D08); ders çıkışı sürerken AKSİS özeti p95 en çok 2 s ve gönderim p95 raporsuz ölçümden en çok yüzde 10 kötü (D10). Aşama 2 yayındaysa (D11 senaryosu): 500 kürsü 10 saniyede bir GET /v1/projeksiyon/kodlar ister, 20.000 telefonun kayıtları QR alanı taşır; kodlar ucu p95 < 200 ms, gönderim eşikleri aynı; telefonlar başlamadan önceki 60 saniyelik yalnız kürsü evresinde pg_stat_user_tables'ta D11 tablolarının n_tup_ins ve n_tup_upd sayıları değişmez (kod ucu yazmaz)."),
  t("Ders başı, gece ve giriş yığılması profilleri", "load", "Ders başı: 20.000 telefon 60 saniyeye yayılmış belge ve tek kayıtlık gönderim, aynı eşikler. Gece: 5.000 iPhone gönderimi 30 dakikaya yayılmış, gece işleri aynı anda elle tetiklenir; iş süreleri ve gönderim p95 yazılır. Giriş yığılması: 300 hocanın 2 dakika içinde kod istemesi, ölçütler D14'ün 'Ders başı giriş yığılması' testinden."),
  t("Uyarı kurallarının mutasyonu", "mutation", "kurallar.ts'te disk eşiği karşılaştırması >= yerine > yapılınca 'Uyarı kuralları sınırlarda doğru karar verir' testi kırmızı olur; KOSUL kapanışı devre dışı bırakılınca bildirim senaryosu kırmızı olur; kapanış süzgecinden 'değerlendiren iş ve okunan girdi' koşulu kaldırılınca 'Okunamayan girdi açık uyarıyı kapatmaz' ve 'Sertifika uyarısını işletim denetimi kapatmaz' kırmızı olur; kalp atışında sonBasariAni denetimi kaldırılınca 'Kalp atışı adres seçimi' kırmızı olur; dosyalar md5 ile karşılaştırılarak geri yazılır, git kullanılmaz."),
  t("OTA denetimi küçük yüzdeli yayını kaçırmaz", "behavior", "ota-denetimi.test.ts: sahte xprem, xprem'in kova hesabıyla yalnız tek kovaya (yüzde 1) etiketsiz güncelleme döndürür; betik bütün kovaları kapsayan sabit kimliklerle sorar ve kırmızı biter, etiketsiz güncelleme kimliğini yazar. Sorulan sürümler saklı OpenAPI sürüm listesinden gelir: en düşük ile en son arasındaki bir sürüme verilen etiketsiz güncelleme de yakalanır. Zemin: bütün güncellemeler etiketliyken yeşil."),
  t("Node sürümü üç dosyada aynı", "behavior", "node-surumu-denetimi.test.ts: deneme klasöründe .node-version, Dockerfile taban etiketi ve eas.json node değeri aynıyken çıkış 0; yalnız Dockerfile bir küçük sürüm yükseltilince çıkış 1 ve üç değeri yazar."),
  t("Ölçü dosyası yazıcısı yalnız sunucu sürecinde açılır", "behavior", "app.ts test dünyasındaki gibi olcumYazici verilmeden kurulup app.ready() çağrılınca /durum/api altına dosya yazılmaz ve zamanlayıcı kurulmaz; olcumYazici true ile kurulunca dakikada bir apiOlcumDosyasiSemasi'na uyan dosya yazılır (yer kontrolü)."),
  t("Sayaç sıra kuralının mutasyonu", "mutation", "telefon-sayaci.ts'te WHERE telefon_sayaclari.sira < EXCLUDED.sira koşulu kaldırılınca varış sırası özellik testi kırmızı olur; geri yazılıp md5 eşleşir."),
  t("Ortak kurallar paketinin haftalık mutasyon testi", "mutation", "Stryker komut çalıştırıcısıyla; klasör başına puan stryker-esikler.json eşiğinin altına düşerse iş kırmızı; eşik denetim betiğinin kendisi bir kez bilerek düşük puanlı sahte raporla kırmızı, yüksekle yeşil denenir."),
];

module.exports = { exportsList, files, tests };
