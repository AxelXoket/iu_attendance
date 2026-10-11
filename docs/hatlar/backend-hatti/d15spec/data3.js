// D15 spec, part 3: exports, files, tests.
'use strict';

const exportsList = [
  {
    name: 'ayarlariYukle',
    signature:
      "function ayarlariYukle(s: { surec: 'api' | 'isci' | 'goc' | 'cli'; ortam?: Readonly<Record<string, string | undefined>>; gizliDizin?: string }): Ayarlar  // apps/server/src/infra/ayarlar/index.ts",
    purpose:
      "Bileşim kökleri (server.ts, worker.ts, göç ve komut girişleri) ve test dünyası açılışta bir kez çağırır. Ortam değişkenlerini AYAR_SEMASI (Zod) ile, gizli dosyaları GIZLI_DIZIN altında sürece göre zorunlu listeyle doğrular; dondurulmuş nesne döner ve gizliAnahtar için süreç içi kümeyi kurar. Eksik ya da hatalı değerde AyarHatasi (ISLETIM_AYAR_GECERSIZ) fırlatır; ileti yalnız ayar ve dosya adlarını sayar, değer yazmaz. Süreç saat farkı 0 değilse ISLETIM_SAAT_DILIMI; API'de BASKI_BELLEK_BAYT kabın bellek sınırından (cgroup memory.max) küçük değilse ISLETIM_BASKI_BELLEK_SINIRI. İkinci çağrı aynı nesneyi döner, farklı girdiyle ISLETIM_AYARLAR_ZATEN_YUKLU.",
  },
  {
    name: 'ayarlar ve Ayarlar (tip)',
    signature:
      "function ayarlar(): Ayarlar; type Ayarlar = Readonly<{ genel: GenelAyarlar; api: ApiAyarlari; veritabani: VeritabaniAyarlari; eposta: EpostaAyarlari; kimlik: KimlikAyarlari; saat: SaatAyarlari; dogrulama: DogrulamaAyarlari; devam: DevamAyarlari; duzeltmeler: DuzeltmeAyarlari; isletim: IsletimAyarlari }>  // tipler z.infer<typeof AYAR_SEMASI>",
    purpose:
      "Yüklenmiş ayarlar; yüklenmeden çağrılırsa ISLETIM_AYARLAR_YUKLENMEDI. Alan modülleri ayarı bileşim kökünden parametreyle alır (D08, D13 gibi); bu işlev komutlar, işler ve test dünyası içindir. Gizli değerler GizliDeger sarmalayıcısındadır. Alanların tam listesi: Durumlar ve kurallar, Ayar şeması.",
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
      "function gizliAnahtar(amac: GizliAmac): GizliAnahtar; function gizliAnahtar(amac: GizliAmac, kid: string): GizliAnahtar | null; type GizliAmac = 'saat_belgesi' | 'qr_anahtar_kaynagi' | 'giris_kodu_ozeti' | 'eposta_ozeti' | 'ulasma_makbuzu'; type GizliAnahtar = Readonly<{ amac: GizliAmac; kid: string; deger: Uint8Array; durum: 'ETKIN' | 'YALNIZ_DOGRULAMA' | 'ELE_GECIRILDI' }>",
    purpose:
      "kid'siz çağrı amacın tek etkin anahtarını, kid'li çağrı o anahtarı (emekli ya da ele geçirilmiş dahil) verir, yoksa null. deger 32 baytın kopyasıdır. Amaç bu sürece yüklenmemişse ISLETIM_GIZLI_ANAHTAR_YOK (programlama hatası). Kullananlar: D04 saat belgesi, D11 QR anahtar kaynağı, D01 giriş kodu özeti, D14 e-posta özeti (bileşim kökünden epostaKur'a), D06 ulaşma makbuzu. Her amaç tek iş içindir, anahtar paylaşılmaz (teknik.html#sunucu-ayarlar).",
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
      "logOlustur süreç başına bir kez kökteki pino kaydedicisini kurar ve log'u ona bağlar; Fastify (loggerInstance, D13 app.ts), D14, D12 ve modüller alt kaydedici açar. JSON satır, zaman UTC ISO, düzey LOG_DUZEYI'nden, taban alanlar { surec, kopya } (pid ve hostname yok). İkinci güvence (teknik.html#sunucu-ayarlar): redact yolları (*.authorization, *.cookie, *['set-cookie'], *.parola) ve her derinlikte ISLETIM_GIZLI_ALANLAR ile ekGizliAdlar'daki anahtar adlarını '[gizli]' yapan biçimlendirici (ör. D03'ün LISTELER_GIZLI_ALANLAR'ı server.ts'ten verilir). Hata nesnesi yalnız sınıf, kod, SQLSTATE, kısıt adı ve yığınla yazılır, ileti metni değerle yazılmaz. logOlustur çağrılmadan log stderr'e info düzeyinde yazar.",
  },
  {
    name: 'uyariAc',
    signature:
      "function uyariAc(tx: Islem, tur: UyariTuru, ayrinti: { an: Date; anahtar?: string; seviye?: 'KRITIK' | 'UYARI'; deger?: string; satirlar?: readonly string[] }): Promise<{ uyariId: string; yeni: boolean }>; type UyariTuru = `${ModulAdi}.${string}`",
    purpose:
      "Çağıranın işleminde uyarıyı açar ya da günceller: (tur, anahtar) için açık satır varsa son_gorulme_ani, tekrar_sayisi, son_deger ve satirlar yenilenir, yoksa satır açılır (INSERT ... ON CONFLICT (tur, anahtar) WHERE durum = 'ACIK' DO UPDATE). Bildirim göndermez, işletim denetimi en geç 10 dakikada bildirir. isletim.* türlerinin seviyesi ve kapanma kuralı UYARI_TURLERI kataloğundan gelir; başka modülün türü verilen seviyeyle (varsayılan UYARI) ve SESSIZLIK kuralıyla açılır. Satırlarda ve değerde 9 ile 11 haneli rakam dizisi '[gizli]' olur; tür deseni, anahtar deseni ya da uzunluk tutmazsa ISLETIM_UYARI_GECERSIZ (programlama hatası). Çağıranlar: D01 (inceleme hesabı ayarı eksik), D07 (iptal listesi 7 günden eski, App Attest yenileme sıklığı) ve D15'in kendi işleri.",
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
      "const telefonSayaciOgesi: OgeIsleyici;  // { roller: ['OGRENCI', 'PERSONEL'], oturumGerekli: false, govdeEnBuyukBayt: 16384, ayrintiSemasi: z.object({ uygulandi: z.boolean() }), isle(tx: Islem, oge: GelenOge, baglam: PaketBaglami): Promise<OgeSonucu> }  // tipler packages/contracts/src/esitleme.ts (D06)",
    purpose:
      "telefon_sayaci öğesinin işleyicisi (contracts.json telefonSayaciOgesi). Gövdeyi JSON olarak ayrıştırıp telefonSayaciGovdesiSemasi ile doğrular; (kurulum, gün) satırını tek INSERT ... ON CONFLICT (kurulum_id, gun) DO UPDATE ... WHERE telefon_sayaclari.sira < EXCLUDED.sira RETURNING ile yazar; personel paketindeki ekran sürelerini aynı işlemde hoca_ekran_sureleri'ne en büyük değer kuralıyla ekler. Sonuç: yeni ya da daha büyük sıra KABUL { uygulandi: true }; aynı oge_kimligi ZATEN_VAR; aynı gün için daha küçük ya da eşit sıralı başka öğe KABUL { uygulandi: false }; bozuk gövde RET ISLETIM_SAYAC_GOVDE_GECERSIZ; gün aralık dışı RET ISLETIM_SAYAC_GUN_GECERSIZ; öğrenci paketinde ekran süresi RET ISLETIM_SAYAC_ROL_GECERSIZ. Ulaşma anı GelenOge.ulasmaAni; beklenen hiçbir durumda fırlatmaz, SAVEPOINT açmaz (D06 beklentisi). Kaydı isletimEklentisi yapar, D06.ogeTuruKaydet işlevi app.ts'ten seçenekle gelir.",
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
      "const isletimEklentisi: FastifyPluginAsync<{ veritabani: Pick<Veritabani, 'islem' | 'semaDurumu'>; saat: Saat; rotalariKaydet: (app: FastifyInstance, rotalar: readonly RotaUygulamasi[]) => void; ogeTuruKaydet: (tur: 'telefon_sayaci', isleyici: OgeIsleyici) => void; kimlikOlayiDinleyicisiKaydet: (d: typeof kimlikOlayiDinleyicisi) => void; surec: 'api' | 'isci' }>",
    purpose:
      "app.ts'in modül eklentileri adımında kaydedilir (D13, 'D15'inki dahil'). ISLETIM_ROTALARI'nı verilen rotalariKaydet ile kaydeder; telefon_sayaci işleyicisini ve kimlik dinleyicisini verilen kayıt işlevleriyle bağlar; surec api ise yanıt sayaçlarını tutan onResponse kancasını (fastify-plugin ile kökte) ekler ve dakikalık ölçü dosyası yazıcısını onReady'de başlatıp onClose'da durdurur. Kayıt sırasında veritabanına dokunmaz; infra/api'yi ve alan modüllerini içe aktarmaz, hatayı packages/contracts/src/ortak/hata.ts'teki UygulamaHatasi ile kurar.",
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
      "function isletimIsleri(bag: { veritabani: Pick<Veritabani, 'islem'>; isSagligi: (tx: Islem) => Promise<IsSagligi>; epostaGonder: typeof epostaGonder; saat: Saat; ayarlar: Ayarlar; log: Logger }): readonly IsletimIsTanimi[]; type IsletimIsTanimi = { ad: 'isletim_denetimi' | 'isletim_kalp_atisi' | 'sertifika_bitis_denetimi' | 'haftalik_olcum_ozeti'; veri: z.ZodType<Record<string, never>>; politika: 'exclusive'; cron: string; saatDilimi: 'Europe/Istanbul'; kacirilan: 'skip' | 'once'; sureAsimiSaniye: number; deneme: { sayi: number; beklemeSaniye: number }; isle(b: { isKimligi: string; tetiklemeAni: Date; iptal: AbortSignal; log: Logger }): Promise<void> }  // apps/server/src/jobs/isletim/index.ts",
    purpose:
      "worker.ts (D14) bag'i kurar ve tanımları D14.isTanimla'ya uyarlar; D12'nin veritabaniIsleri'yle aynı desen, böylece jobs/isletim infra/is-kuyrugu'nu içe aktarmaz. Dört pg-boss işi; makine ve CI işleri burada değildir.",
  },
  {
    name: 'ISLETIM sözleşmesi (packages/contracts/src/isletim.ts)',
    signature:
      'export const ISLETIM_ROTALARI: readonly [RotaTanimi, RotaTanimi, RotaTanimi, RotaTanimi]; export const ISLETIM_HATALARI; export const ISLETIM_OGE_GEREKCELERI; export const ISLETIM_ISLETIM_KODLARI; export const ekranSureleriIstegi, ekranSureleriCevabi, telefonSayaciGovdesiSemasi, chronyDurumuSemasi, makineDurumuSemasi, apiOlcumDosyasiSemasi, gizliAnahtarDosyasiSemasi, kalpAtisiSirriSemasi: z.ZodType; export const EKRAN_TURLERI, SAYAC_ADLARI, UYARI_TURLERI, ISLETIM_ESIKLERI, ISLETIM_GIZLI_ALANLAR',
    purpose:
      "Dört rotanın tanımı (rotaTanimla, D13 birleştirir), HTTP hata kodları (hataKodlariTanimla), öğe gerekçe kodları, süreç düzeyi işletim kodları (HTTP'ye çıkmaz), gövde ve dosya şemaları, ekran türleri, sayaç adları, uyarı türü kataloğu (seviye, kapanma kuralı), eşikler ve log gizleme adları. Testler eşikleri ve listeleri buradan içe aktarır, yeniden yazmaz.",
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
  'apps/server/src/infra/izleme/durum-dosyalari.ts',
  'apps/server/src/infra/izleme/durum-dosyalari.test.ts',
  'apps/server/src/infra/izleme/api-olcum.ts',
  'apps/server/src/infra/izleme/api-olcum.test.ts',
  'apps/server/src/infra/izleme/istanbul-gunu.ts',
  'apps/server/src/infra/izleme/sertifika.ts',
  'apps/server/src/infra/izleme/kalp-atisi.ts',
  'apps/server/src/infra/izleme/olcumler.ts',
  'apps/server/src/infra/izleme/olcum-ozeti.ts',
  'apps/server/src/infra/izleme/olcum-ozeti.test.ts',
  'apps/server/src/infra/izleme/compose-denetimi.test.ts',
  'apps/server/src/infra/izleme/asvs.test.ts',
  // makine tarafı (D15-A12: docker/isletim/ altına taşınması önerildi)
  'apps/server/src/infra/izleme/makine/ortak.sh',
  'apps/server/src/infra/izleme/makine/saat-esitleme-izleme.sh',
  'apps/server/src/infra/izleme/makine/makine-denetimi.sh',
  'apps/server/src/infra/izleme/makine/log-arsivi.sh',
  'apps/server/src/infra/izleme/makine/log-bul.sh',
  'apps/server/src/infra/izleme/makine/yayinla.sh',
  'apps/server/src/infra/izleme/makine/kur.sh',
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
  'apps/server/test/features/isletim/asvs-eslemesi.json',
  'apps/server/test/features/isletim/ornekler/surumler/.gitkeep',
  'apps/server/test/steps/isletim/saglik-adimlari.ts',
  'apps/server/test/steps/isletim/sayac-adimlari.ts',
  'apps/server/test/steps/isletim/uyari-adimlari.ts',
  'apps/server/test/steps/isletim/denetim-adimlari.ts',
  'apps/server/test/steps/isletim/olcum-adimlari.ts',
  'apps/server/test/steps/isletim/surum-ornekleri-adimlari.ts',
  // ortak test dünyası
  'apps/server/test/support/dunya.ts',
  'apps/server/test/support/kancalar.ts',
  // yük testi
  'apps/server/test/yuk/esikler.ts',
  'apps/server/test/yuk/ortak/imza.ts',
  'apps/server/test/yuk/ortak/telefon.ts',
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
  // sağlık ve kapanış
  t('Canlılık ucu veritabanı olmadan cevap verir', 'behavior', "Eklenti, semaDurumu ulasilamiyor döndüren ve her islem çağrısında hata fırlatan sahte veritabanı nesnesiyle kurulur: GET /health/live 204 ve gövdesiz, sahte nesneye hiç çağrı yok; /health/ready 503 ISLETIM_HAZIR_DEGIL_VERITABANI (zemin: gerçek test veritabanıyla ikisi de 204)."),
  t('Hazırlık ucu şema geride iken hazır değil der', 'behavior', 'D12 semaDurumu geride (imajdaki son göç özeti defterde yok) iken /health/ready 503 ISLETIM_HAZIR_DEGIL_SEMA; nesil_belirsiz için de aynı kod; defterde özetten sonra göç varken 204 (genişletme göçü).'),
  t('Hazırlık ucu 2 saniyede cevap gelmezse hazır değil der', 'behavior', 'semaDurumu 2.500 ms bekleyen sahteyle /health/ready 503 ISLETIM_HAZIR_DEGIL_VERITABANI ve süre 2.100 ms altında; 1.900 ms bekleyende 204 (sınır yer kontrolü).'),
  t('Durum ucu gövdesiz 204 döner ve veritabanına dokunmaz', 'behavior', 'GET /v1/durum 204, gövde boş, Cache-Control: no-store ve X-Istek-Kimligi var (D13); senaryo süresince pg_stat_statements bu rotadan sorgu göstermez (zemin: ekran-sureleri isteği sorgu gösterir).'),
  t('Aşırı yükte canlılık ve durum uçları cevap verir', 'behavior', "D13 deneme seçeneğiyle baskı açıkken /health/live ve /v1/durum 204; /health/ready ve POST /v1/isletim/ekran-sureleri 503 API_SUNUCU_YOGUN ve Retry-After (D13 aralığı)."),
  t('Kapanış başlayınca sağlık uçları 503 döner, süren istek biter', 'behavior', 'Uzun süren deneme isteği açıkken kapanisiBaslat: yeni /health/live, /health/ready ve /v1/durum 503 ISLETIM_KAPANIYOR; açık istek 200 ile tamamlanır; KAPANIS_ONCESI_BEKLEME_MS (test 0) sonra app.close; kapanış sırası app.close, eposta.kapat, iş kuyruğu durdur, havuz kapat çağrı kaydından okunur.'),
  // ayarlar
  t('Eksik zorunlu ayar süreci açmaz ve değer sızdırmaz', 'behavior', "PANEL_ADRESI eksik ve EPOSTA_SMTP_PORT 'abc' iken ayarlariYukle ISLETIM_AYAR_GECERSIZ fırlatır; ileti iki adı sayar, ortamdaki herhangi bir değeri (ör. veritabanı adresi) içermez (yer kontrolü: değerler ortamda vardı)."),
  t('Gizli anahtar dosyası kuralları', 'property', "fast-check numRuns 2000: rastgele anahtar kümelerinde ayarlariYukle yalnız şu durumda kabul eder: tam bir ETKIN, etkinKid ona eşit, kid'ler tekil ve ^[a-z0-9-]{1,8}$, değer base64 32 bayt, en çok 4 anahtar. Kabul edilen kümede gizliAnahtar(amac) etkin anahtarı, gizliAnahtar(amac, kid) aynı baytları verir, bilinmeyen kid null."),
  t('Süreç türüne göre zorunlu sırlar', 'behavior', "surec api iken saat_belgesi, qr_anahtar_kaynagi, giris_kodu_ozeti, eposta_ozeti, ulasma_makbuzu, inceleme_sabit_kodu ve yoklama_api_parolasi zorunlu; isci iken giris_kodu_ozeti ve ulasma_makbuzu aranmaz, istenirse ISLETIM_GIZLI_ANAHTAR_YOK fırlar. Liste ve beklenen tablo sözleşmedeki matristen içe aktarılır."),
  t('Saat dilimi UTC değilse süreç açılmaz', 'behavior', "TZ=Europe/Istanbul ile çocuk süreçte ayarlariYukle ISLETIM_SAAT_DILIMI; TZ=UTC ile açılır (pozitif kontrol)."),
  t('Bellek eşiği kap sınırının altında olmalı', 'behavior', 'Sahte cgroup memory.max 1073741824 iken BASKI_BELLEK_BAYT 1073741824 ISLETIM_BASKI_BELLEK_SINIRI, 912680550 kabul; memory.max max (sınırsız, geliştirme) iken varsayılan 2 GiB.'),
  t('GizliDeger hiçbir çıktıda görünmez', 'behavior', "JSON.stringify, String(), util.inspect ve pino log satırı '[gizli]' yazar, ac() değeri verir; değerin kendisi hiçbir çıktıda geçmez (yer kontrolü: ac() sonucu doğru)."),
  // log
  t('Log gizleme her derinlikte çalışır', 'property', "fast-check numRuns 1000: rastgele iç içe nesnelerde ISLETIM_GIZLI_ALANLAR ve ekGizliAdlar'daki her anahtarın değeri log satırında '[gizli]', öbür anahtarlar aynen (pozitif kontrol: gizli olmayan alan değişmeden çıkar)."),
  t('Senaryo loglarında numara ve isim bulunmaz', 'behavior', "After kancası, kurucuların gizliDegerKaydet ile kaydettiği numara ve isimleri senaryonun log satırlarında arar. Kendi testi: bir deneme adımı numarayı bilerek ham olarak log hedefine yazar ve kanca senaryoyu kırmızı yapar; aynı numara gizli alan adıyla loglanınca yeşil kalır."),
  t('Veritabanı hatası logda değer taşımaz', 'behavior', "Bilerek tekil kısıt ihlali yaptıran deneme isteğinde log satırında SQLSTATE 23505 ve kısıt adı var, ihlal eden değer ve sorgu parametresi yok (teknik.html#sunucu-ayarlar; D12 senaryosuyla aynı ilke, D15 biçimlendiricisi üzerinden)."),
  // ekran süreleri
  t('Ekran süreleri birikmiş toplamla yazılır', 'behavior', "Hoca panelden 2026-10-05 için oturum A KAFA_SAYISI 40 gönderir: 200 { kaydedilen: 1 }; ardından 25 gönderir: 200 { kaydedilen: 0 }, satır 40 kalır; 70 gönderir: satır 70; aynı istek iki kez: değişiklik yok."),
  t('İki tarayıcı ayrı satır yazar', 'behavior', 'Aynı hoca iki istemciKimligi ile aynı oturum ve ekran için 30 ve 50 gönderir: iki satır; olcum_hoca_isi oturumu 80 saniye sayar.'),
  t('Ekran süresi gün ve süre sınırları', 'behavior', 'Sahte saat 2026-10-20 10:00 İstanbul: gun 2026-10-06 (14 gün) kabul, 2026-10-05 400 ISLETIM_GUN_ARALIK_DISI, 2026-10-21 400 ISLETIM_GUN_ARALIK_DISI; toplamı 86401 olan istek 400 ISLETIM_SURE_GECERSIZ; aynı (oturumId, ekranTuru) iki kez 400 ISLETIM_SURE_GECERSIZ.'),
  t('Ekran süresi yetki ve köken kuralları', 'behavior', "Oturumsuz 401 API_KIMLIK_GEREKLI; öğrenci oturumu 403 API_ROL_YETKISIZ; yanlış Origin ile çerezli istek 403 API_KOKEN_GECERSIZ; 16 KiB üstü gövde 413 API_GOVDE_COK_BUYUK (D13 kancaları; senaryo rota beyanını sınar)."),
  // telefon sayacı
  t('Sayaç paketi kabul edilir ve yinelenince ZATEN_VAR alır', 'behavior', "Öğrenci telefonundan gönderimde telefon_sayaci öğesi: KABUL { uygulandi: true }, satır değerleri gövdeyle aynı; aynı öğe yeniden gönderilince ZATEN_VAR ve satır değişmez."),
  t('Aynı gün için büyük sıra kazanır, varış sırası sonucu değiştirmez', 'property', 'fast-check numRuns 500: bir (kurulum, gün) için rastgele sıralarla üretilmiş 1 ile 6 öğe rastgele sırada işlenir; son satır her zaman en büyük sıralı öğenin değerlerini taşır, küçük sıralı öğeler KABUL { uygulandi: false } alır.'),
  t('Bilinmeyen sayaç adı saklanmaz, sayılır', 'behavior', "Gövdede sayaclar.yeniSayac 5 ve gonderilmemisKayit 2: satırda gonderilmemis_kayit 2, bilinmeyen_ad_sayisi 1, yeniSayac hiçbir sütunda yok; sonuç KABUL."),
  t('Bozuk sayaç paketi öğe düzeyinde reddedilir', 'behavior', "JSON olmayan gövde RET ISLETIM_SAYAC_GOVDE_GECERSIZ; gün ulaşma gününden 2 gün ileri RET ISLETIM_SAYAC_GUN_GECERSIZ; öğrenci paketinde ekranSureleri RET ISLETIM_SAYAC_ROL_GECERSIZ; aynı paketteki yoklama kaydı KABUL alır (paket düşmez, D06 kuralı)."),
  t('Hoca telefonunun ekran süreleri tabloya girer', 'behavior', 'Personel paketinde ekranSureleri [{oturumId: A, ekranTuru: INCELEME, saniye: 45}]: hoca_ekran_sureleri satırı kaynak TELEFON, kaynak_kimligi kurulum kimliği, saniye 45.'),
  t('Hesap silinince sayaçlar ve ekran süreleri silinir', 'behavior', "D01'in hesap_silindi olayı (kurucu ile tetiklenir) aynı işlemde kişinin telefon_sayaclari ve hoca_ekran_sureleri satırlarını siler; başka kişinin satırları kalır (zemin); olay işlemi geri alınınca satırlar da kalır."),
  // uyarılar
  t('Aynı uyarı tek açık satırda birikir', 'behavior', "uyariAc aynı (tur, anahtar) ile üç kez: tek ACIK satır, tekrar_sayisi 3, yeni ilk çağrıda true sonra false; farklı anahtar ayrı satır."),
  t('Uyarı satırında numara maskelenir', 'behavior', "satirlar ['Öğrenci 2024000123 için'] ile uyariAc: satırda '[gizli]', rakam dizisi yok; 8 haneli sayı (ör. 12345678 bayt) aynen kalır (sınır kontrolü)."),
  t('Bildirim, hatırlatma ve düzeldi iletisi', 'behavior', "KRITIK uyarı açılır, isletim_denetimi çalışır: her alıcıya tek e-posta (D14 sahte posta, konu isletim uyarısı); 5 saat 59 dakika sonra çalışma yeni e-posta göndermez, 6 saat sonra hatırlatma gider; koşul düzelince KAPANDI ve tek düzeldi iletisi; hiç bildirilmemiş uyarı kapanınca ileti yok."),
  t('SMTP düşükken bildirim hatası kalp atışını çevirir', 'behavior', "Sahte posta kutusu her gönderimde bağlantı hatası verir: uyarı bildirim_hatasi true kalır, isletim_kalp_atisi sorunAdres'e istek atar; sorunAdres yoksa hiç istek atmaz; posta düzelince sonraki denetim bildirir ve kalp atışı normale döner."),
  t('Sessizlik kuralı başka modülün uyarısını kapatır', 'behavior', "dogrulama.iptal_listesi_eski uyarısı açılır: 25 saat 59 dakika sonra açık, 26 saat sonra isletim_denetimi kapatır (SESSIZLIK)."),
  // işletim denetimi kuralları
  t('Uyarı kuralları sınırlarda doğru karar verir', 'property', "kurallar.ts saf işlevleri tablo testiyle her eşiğin bir altı, eşiti ve bir üstüyle: disk 79/80/90, bağlantı 79/80/90, 5xx 19/20, 503 oranı binde 49/50, gönderim p95 1999/2000 ms, yedek yaşı 25 saat 59 dakika/26 saat, makine dosyası 24/25 dakika, iş sessizliği 2 x aralık + 600 saniye; eşikler ISLETIM_ESIKLERI'nden içe aktarılır."),
  t('İşletim denetimi D14 sağlık ölçüsünden uyarı açar', 'behavior', "D14'ün test kuyruğunda ölü mektuba düşen iş, son başarısı aralığın iki katından eski zamanlanmış iş ve art arda 3 başarısız e-posta varken isletim_denetimi çalışır: isletim.olu_mektup (anahtar kuyruk), isletim.is_sessiz ve KRITIK isletim.eposta_basarisiz açılır; durum düzelince sonraki çalışmada üçü de KAPANDI."),
  t('Durum dosyalarından uyarı', 'behavior', "Sahte durum dizininde: chrony.json senkron false ise KRITIK isletim.saat_esitleme; makine.json disk yüzde 85 UYARI, 91 KRITIK; 26 saat önce biten gecelik_pg_dump dosyası KRITIK isletim.yedek_eski; sonuc basarisiz KRITIK isletim.yedek_basarisiz; 30 dakikalık makine dosyası isletim.makine_denetimi_sessiz; okunamayan dosya sağlıklı sayılmaz."),
  t('API ölçü dosyalarından uyarı', 'behavior', "İki kopyanın son 10 dakikalık dosyalarında toplam 503 dışı 5xx 20: isletim.api_5xx; 503 oranı yüzde 5 ve toplam 200 üstü: isletim.api_503; gönderim kovalarından p95 2000 ms: isletim.gonderim_yavas; 5 dakikadan eski dosya sayılmaz."),
  t('Yeni ret kodu aynı gün uyarı açar', 'behavior', "Son 28 günde görülmemiş (400, YOKLAMA_X) ret kodu taşıyan sayaç paketi gelir: sonraki denetimde isletim.yeni_ret_kodu, anahtar '400:YOKLAMA_X'; aynı kod 28 gün içinde görülmüşse uyarı yok."),
  t('Devam tutarlılık farkı uyarıya döner', 'behavior', "D14 isSagligi devam_tutarlilik_denetimi için son çıktıda farkSayisi 3 verirken isletim.devam_tutarlilik_farki açılır; sonraki çıktı 0 olunca kapanır (D08-A08)."),
  t('WAL arşivi ve bağlantı sayısı', 'behavior', "pg_stat_archiver sahte görünümünde last_failed_time last_archived_time'dan yeni ise KRITIK isletim.wal_arsivi; bağlantı 80 UYARI, 90 KRITIK isletim.baglanti_sayisi (sistem görünümü okuması bir sorgu katmanından verilir, kural saf)."),
  // kalp atışı ve sertifika
  t('Kalp atışı adres seçimi', 'behavior', "Sahte HTTP sunucusu: açık KRITIK yokken normalAdres'e tek GET, gövdesiz ve sorgusuz; açık KRITIK varken sorunAdres'e; uretim ortamında kalp_atisi sırrı yoksa işçinin ayarlariYukle'si ISLETIM_AYAR_GECERSIZ verir."),
  t('Sertifika bitiş eşikleri', 'behavior', "Testte üretilen kendinden imzalı kök ve sertifikalarla yerel TLS sunucusu: acme türünde 15 gün kala uyarı yok, 13 gün kala UYARI, 6 gün kala KRITIK isletim.sertifika_bitiyor; elle türünde 29 gün kala UYARI; adı tutmayan sertifika KRITIK isletim.sertifika_gecersiz."),
  // ölçüm
  t('Ölçüm görünümleri hedef tanımlarını uygular', 'behavior', "Kurucularla tohumlanmış verilerde: 24 saatte ulaşan oran, saati doğrulanamayan oranı (Android ve iPhone ayrı), işaretlenmeden kabul (payda ilk kesin kararı VAR ya da INCELEMEDE olanlar, pay VAR ve etiketsiz ve kafa sayısı işaretsiz oturumda), kafa sayısı aşımı olmayan oturum oranı ve hocanın işi ortancası elle hesaplanan beklenen tabloyla birebir aynı; BEKLEMEDE ve RET kayıtları paydaya girmez (plan.html#hedefler)."),
  t('Hocanın işi yalnız dersin sahibini sayar', 'behavior', "Başka personelin aynı oturum için gönderdiği 300 saniye olcum_hoca_isi'ne girmez; dersin sahibinin 90 saniyesi girer; kafa sayısı girilmemiş oturum ortancaya girmez."),
  t('Ölçüm görünümleri kişisel veri çıkarmaz', 'contract', 'Her olcum_ görünümünün sütun listesi katalogdan okunur: kisi_id, ogrenci_id, ogrenci_no, ad_soyad, eposta adlı sütun yoktur; görünümler security_invoker true (pg_class.reloptions).'),
  t('Haftalık özet ve 13 aylık silme', 'behavior', "haftalik_olcum_ozeti çalışınca sahibe tek e-posta gider, satırlar hedefi ve değeri yazar; 396 günlük sayaç ve ekran süresi satırları ve 396 gün önce kapanmış uyarı silinir, 394 günlükler kalır; aynı veriyle iki kez çalışınca ikinci çalışma 0 satır siler (D14 adımı)."),
  // sözleşme ve dağıtım
  t('Rota tanımları D13 kurallarına uyar', 'contract', "ISLETIM_ROTALARI: dört yol, yalnız /health/live ve /v1/durum baskiDisi, /health/* ve /v1/durum kök istisna, /v1/isletim/ekran-sureleri personel rolü, govdeSiniri 16384 ve 2 MiB altında, hatalar listesindeki her kod TUM_HATALAR'da; D13'ün rota tablosu sözleşme testi bu modülde de yeşil."),
  t('Compose dosyası kuralları', 'contract', "docker compose config çıktısı (JSON) üzerinde: api-1, api-2, isci ve goc'ta TZ=UTC, init true, user node, read_only, cap_drop ALL; restart unless-stopped (goc hariç); logging local; isci stop_grace_period 40s, API 30s; her servisin sırları sözleşmedeki matrisle birebir aynı (fazla sır kırmızı); yalnız caddy 80 ve 443 yayımlar; caddy onyuz ağında 172.30.11.10."),
  t('Caddy yolları ve başlıkları', 'behavior', "CI'da Caddy, test ayarıyla (yerel sertifika) ve sahte API ile açılır: /health/live 404; /v1/olmayan API'den JSON 404 (index.html değil); /v1 tek başına API'ye gider; /olmayan-sayfa index.html 200 ve CSP; /assets/olmayan.js 404; /assets dosyası uzun önbellekli; index.html Cache-Control no-cache; panel cevabında Content-Security-Policy ve Permissions-Policy var, API cevabında Caddy CSP'si yok; 4 MB üstü gövde 413."),
  t('Yayın bilgisi üretimi', 'behavior', "yayin-bilgisi-uret kaynağa bicim 1, sira (kaynak dosyasına dokunan commit sayısı) ve olusturmaAni (son commit anı) ekler; çıktı D13 yayinBilgisiSemasi'na uyar; aynı commit iki kez aynı baytları üretir; en düşük sürümü en son sürümden büyük kaynak kırmızı."),
  t('Eski sürüm istekleri hâlâ kabul edilir', 'behavior', "ornekler/surumler/<sürüm>/ altındaki her örnek istek (D13'ün destek listesindeki sürümler), sahte saat örneğin geçerli penceresine kurularak oynatılır; beklenen durum ve öğe sonuçları aynen döner (plan.html#dagitim-guncelleme-ilkesi). Klasör boşken senaryo örnek sayısının sıfır olmadığını yazar ve kırmızıdır (ilk uygulama yayınından sonra)."),
  t('ASVS eşlemesi eksiksiz', 'contract', 'asvs-eslemesi.json\'daki her uygulanan madde var olan bir senaryo adına ya da ayar denetimine bağlı (feature dosyaları ayrıştırılarak), uygulanmayan her maddenin gerekçesi dolu; madde numaraları tekil.'),
  // makine betikleri
  t('Saat eşitleme betiği chronyc çıktısını doğru çevirir', 'behavior', "PATH'e konan sahte chronyc ile: Leap status Normal ve katman 2 senkron true, sapmaMs = tavan(1000 x (|sistem farkı| + kök dağılımı + kök gecikmesi / 2)); 'Not synchronised' senkron false ve sonBozukAni yazılır; sonraki sağlıklı okumada sonBozukAni korunur; dosya chronyDurumuSemasi'na uyar ve yazım sırasında okuyan yarım dosya görmez (1000 eşzamanlı okuma)."),
  t('Makine betiği yeniden başlamayı bir kez sayar', 'behavior', 'Sahte docker ile RestartCount 2 iken ilk çalışma artış 0, 3 olunca artış 1, değişmeyince yine 0; makine.json makineDurumuSemasi\'na uyar.'),
  t('Yayın betiği imza tutmazsa hiçbir şey değiştirmez', 'behavior', "Sahte docker ve cosign ile: cosign verify hata verirse betik çıkış kodu 1, docker compose up hiç çağrılmaz; revizyon etiketi depo commit'inden farklıysa aynı; hafta içi 08:00-20:00 arasında --simdi olmadan çalıştırma uyarıyla durur."),
  // yük ve mutasyon
  t('Ders çıkışı yük testi geçme ölçütleri', 'load', "k6 thresholds (esikler.ts): gönderim p95 < 1000 ms, p99 < 3000 ms; saat belgesi p95 < 100 ms, p99 < 300 ms (D04); 503 dışı 5xx 0; 503 oranı < yüzde 2 ve her 503 Retry-After'lı; 429 oranı 0 (D13); koşu sonrası denetim: makbuzlu her kayıt sunucuda tam bir kez, pg_stat_activity en çok 80 bağlantı, havuz bekleme p99 < 2 s (D12), devam_hesapla gecikmesi p95 en çok 5 dakika (D08); ders çıkışı sürerken AKSİS özeti p95 en çok 2 s ve gönderim p95 raporsuz ölçümden en çok yüzde 10 kötü (D10)."),
  t('Ders başı, gece ve giriş yığılması profilleri', 'load', 'Ders başı: 20.000 telefon 60 saniyeye yayılmış belge ve tek kayıtlık gönderim, aynı eşikler. Gece: 5.000 iPhone gönderimi 30 dakikaya yayılmış, gece işleri aynı anda elle tetiklenir; iş süreleri ve gönderim p95 yazılır. Giriş yığılması: 300 hocanın 2 dakika içinde kod istemesi, ölçütler D14\'ün \'Ders başı giriş yığılması\' testinden.'),
  t('Uyarı kurallarının mutasyonu', 'mutation', "kurallar.ts'te disk eşiği karşılaştırması >= yerine > yapılınca 'Uyarı kuralları sınırlarda doğru karar verir' testi kırmızı olur; KOSUL kapanışı devre dışı bırakılınca bildirim senaryosu kırmızı olur; dosyalar md5 ile karşılaştırılarak geri yazılır, git kullanılmaz."),
  t('Sayaç sıra kuralının mutasyonu', 'mutation', "telefon-sayaci.ts'te WHERE telefon_sayaclari.sira < EXCLUDED.sira koşulu kaldırılınca varış sırası özellik testi kırmızı olur; geri yazılıp md5 eşleşir."),
  t('Ortak kurallar paketinin haftalık mutasyon testi', 'mutation', 'Stryker komut çalıştırıcısıyla; klasör başına puan stryker-esikler.json eşiğinin altına düşerse iş kırmızı; eşik denetim betiğinin kendisi bir kez bilerek düşük puanlı sahte raporla kırmızı, yüksekle yeşil denenir.'),
];

module.exports = { exportsList, files, tests };
