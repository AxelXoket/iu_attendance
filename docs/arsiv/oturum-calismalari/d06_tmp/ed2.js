// One-off edits for veri-2.js (D06 align round): exact replacements plus wholesale exports and files arrays.
const fs = require('fs'); const f = process.argv[2]; let s = fs.readFileSync(f, 'utf8');
const R = (a, b) => { const n = s.split(a).length - 1; if (n !== 1) { console.error('MATCH ' + n + ': ' + a.slice(0, 90)); process.exitCode = 1; return; } s = s.replace(a, () => b); };
const between = (start, end, body) => { const i = s.indexOf(start), j = s.indexOf(end, i); if (i < 0 || j < 0) { console.error('BLOCK not found: ' + start); process.exitCode = 1; return; } s = s.slice(0, i) + body + s.slice(j); };

// state machine
R(`when: "Tür kayıtlı değil, oturum gerekli, geçici çakışma, işleyici hatası, zaman bütçesi ya da sahibin geçici gerekçesi (ör. saati yalnız ikinci çapayla kurulabilen kayıtta ikinci çapa yok).`,
  `when: "Tür kayıtlı değil, oturum gerekli, geçici çakışma, işleyici hatası, zaman bütçesi ya da sahibin geçici gerekçesi (ör. saati yalnız ikinci çapayla kurulabilen kayıtta ikinci çapa yok; işleyicinin danismaKilidiDene ile alamadığı yeni anahtar).`);

// invariants
R(`"Bir gönderimin bütün yazmaları tek veritabanı işlemindedir (kimlik kancasının salt okunur anahtar okuması tek istisna, D06-C04) ve işlem en çok 20 saniye sürer (transaction_timeout).`,
  `"Bir gönderimin bütün yazmaları tek veritabanı işlemindedir (kimlik kancasının salt okunur anahtar okuması tek istisna, D06-C04) ve işlem D13'ün 20 saniyelik işleyici bütçesinden kalan süreyi aşmaz (transaction_timeout = D13.kalanSureMs).`);
R(`"Öğrencinin yoklama gönderimi degisiklik_sayaci satırını kilitlemez. Gönderimde sayaç yalnız bir işleyici damga kaydettiyse, bütün gruplardan sonra bir kez alınır; sayaçtan sonra yalnız işlemin zaten kilitlediği satırlar ve kurulumun kendi defter satırları yazılır.",`,
  `"Sayaç işlemde en çok bir kez artar: damgalı işlemin sahibi son adımda surumAl'ı bir kez çağırır ve bekleyen bütün damgalar aynı sürümle yazılır; surumAl'sız biten damgalı işlem COMMIT edilemez (D12.islemSonuKancasi). Öğrencinin yoklama gönderimi degisiklik_sayaci satırını kilitlemez. Gönderimde sayaç yalnız bir işleyici damga kaydettiyse, bütün gruplardan, defter ve kurulum yazımından sonra, işlemin son yazımı olarak alınır; sayaçtan sonra yeni satır kilidi alınmaz, damgalar yalnız işlemde zaten kilitli satırları günceller.",
    "Gönderim işleminde danışma anahtarları (bütün grupların kilitAnahtarlari kancalarından gelenler ve esitleme:kurulum_siniri:<kisiId>) tek D12.danismaKilidi çağrısıyla, hiçbir satır kilidinden ve hiçbir işleyiciden önce alınır; modülde elle pg_advisory_xact_lock yoktur.",`);

// exports and files
between(`  exports: [`, `  files: [`, `  exports: [
    {
      name: "surumAl",
      signature: "surumAl(tx: Islem): Promise<bigint>  // modules/esitleme/yaprak.ts [yaprak]",
      purpose:
        "İşlemin sahibi, telefona inen satırlarını, iş kuyruğunu ve öğrenci sürümünü yazdıktan sonra işlemin son adımı olarak bir kez çağırır (contracts.json ortak kural 'Danışma kilidi katmanları' sırası). UPDATE degisiklik_sayaci SET surum = surum + 1 WHERE id = 1 RETURNING surum; satır yoksa (ilk kullanım) INSERT ... VALUES (1, 0, 0) ON CONFLICT (id) DO NOTHING ve UPDATE yinelenir. Satır işlem sonuna kadar kilitli kalır; sayaç bir kez artar, işlemin bekleyen bütün damgaları (surumDamgasiIste) bu sürümle kayıt sırasıyla çağrılır ve yeni sürüm döner. Aynı işlemde ikinci çağrı sayacı yeniden artırmaz, aynı sürümü döner. Çağıran dönen sürümü yalnız işlemde zaten kilitli satırlara koyar; sayaçtan sonra yeni satır kilidi alınmaz (D06-B19). Gönderimde sahibi D06'dır: öğe işleyicisi surumAl çağırmaz, baglam.surumlaDamgala ile damga bırakır; D06 paket sonunda, bütün gruplardan sonra bir kez çağırır. Alan modülü içe aktarmaz."
    },
    {
      name: "surumDamgasiIste",
      signature: "surumDamgasiIste(tx: Islem, damga: (surum: bigint) => Promise<void>): void  // modules/esitleme/yaprak.ts [yaprak]",
      purpose:
        "Telefona inen satırın sürümünü işlemin sonuna bırakır (contracts.json ortak kural 'Sürüm damgası'): damga işleme bağlanır, işlemin sahibi son adımda surumAl'ı çağırınca bütün bekleyen damgalarla aynı sürümle çağrılır. Damga yalnız işlemde zaten kilitli satırları günceller (ör. UPDATE ... SET surum = $1 WHERE id = ANY(yazilanlar)). İşlemdeki ilk bekleyen damgada D12.islemSonuKancasi(tx, denetim) kaydedilir: işlem surumAl çağrılmadan biterse denetim hata atar ve işlem geri alınır (API isteğinde 500 API_SUNUCU_HATASI, log satırında damga sayısı). surumAl'dan sonra aynı işlemde çağrılırsa hata atar. Liste en dış işleme bağlıdır (D12.islemSonuKancasi ile aynı bağ); geri alınan bir SAVEPOINT içinde kaydedilen damga düşer. PaketBaglami.surumlaDamgala gönderimde bu işleve giden kısayoldur; üretimde (D02) ve dinleyici yolunda (D04 pencereleriHesapla) aynı işlev kullanılır."
    },
    {
      name: "ogrenciDurumuDegisti",
      signature: "ogrenciDurumuDegisti(tx: Islem, ogrenciId: KisiId): Promise<bigint>  // modules/esitleme/yaprak.ts [yaprak]",
      purpose:
        "Öğrencinin kendi verisini (kayıt, karar, düzeltme, sorun bildirimi, devam durumu, hesap teyidi) değiştiren her işlem aynı işlemde, kendi satır yazımlarından ve iş kuyruğundan sonra, genel sayaçtan önce çağırır. Öğrencinin satırını kilitleyip sürümü bir artırır (satır yoksa 1 ile açar) ve yeni sürümü döner; çağıran bu sürümü kendi satırına yazar ki kaynağı 'şu sürümden beri' sorusunu cevaplayabilsin. Alan modülü içe aktarmaz."
    },
    {
      name: "kurulumSonTemasi",
      signature: "kurulumSonTemasi(tx: Islem, kisiId: KisiId): Promise<{ sonTemasAni: Date | null; bekleyenYoklamaVar: boolean }>  // modules/esitleme/yaprak.ts [yaprak]",
      purpose:
        "Kişinin bütün kurulumları arasında en son doğrulanmış temasın anı; bekleyenYoklamaVar, kişinin herhangi bir kurulumu kendi son temasında sonuçlanmamış yoklama_kaydi bildirdiyse true (telefon_sayaci gibi öbür türler sayılmaz). Hiç temas yoksa { null, false }. KARAR BEKLİYOR hesabı (D08, D10) için; kural onların, ders başına ayrım yoktur. Çok kişide kurulumSonTemaslari kullanılır."
    },
    {
      name: "kurulumSonTemaslari",
      signature: "kurulumSonTemaslari(tx: Islem, kisiIdler: readonly KisiId[]): Promise<ReadonlyMap<KisiId, { sonTemasAni: Date | null; bekleyenYoklamaVar: boolean }>>  // modules/esitleme/yaprak.ts [yaprak]",
      purpose:
        "kurulumSonTemasi'nın toplu biçimi, tek sorgu (kurulumlar WHERE kisi_id = ANY($1), kisi_id başına toplama). Sonuç istenen her kişi için bir değer taşır; kurulumu olmayan kişi { sonTemasAni: null, bekleyenYoklamaVar: false } alır. Ders ya da kurulum başına bekleyen öğe sayısı verilmez: KARAR BEKLİYOR'un bağlantı nedeni için boolean yeterlidir (D08'in canlı hesabı bunu kullanır)."
    },
    {
      name: "kararTeslimAni",
      signature: "kararTeslimAni(tx: Islem, kayitAnahtari: { donemId: DonemId; kayitId: KayitId }, kararSurumu: KararSurumu): Promise<{ telefonaUlastiAni: Date | null; ilkSunulmaAni: Date; sonSunulmaAni: Date; sunulanKurulumSonTemasAni: Date | null } | null>  // modules/esitleme/yaprak.ts [yaprak]",
      purpose:
        "Kaydın verilen karar sürümünün teslim bilgisi: hiç sunulmadıysa ya da satır saklama süresi dolup silindiyse null; sunulduysa iki sunum anı, onaylandıysa telefona ulaştığı an, ayrıca sunumun yapıldığı kurulumun son temas anı. Sorun bildirme süresinin (3 gün) başı D09'un kuralıdır; null 'sunulmadı' demektir, onaysız sunumun nasıl sayılacağı açık nokta D06-A02."
    },
    {
      name: "ogeTuruKaydet",
      signature:
        "ogeTuruKaydet<T extends OgeTuru>(tur: T, isleyici: OgeIsleyici<T>): void; OgeIsleyici<T> = { roller: readonly ('OGRENCI' | 'PERSONEL')[]; oturumGerekli: boolean; govdeEnBuyukBayt: number; ilkCapaVar: boolean; ayrintiSemasi?: z.ZodType; kilitAnahtarlari?(tx: Islem, ogeler: readonly GelenOge[], baglam: PaketBaglami): Promise<readonly DanismaAnahtari[]> } & ({ isle(tx: Islem, oge: GelenOge<T>, baglam: PaketBaglami): Promise<OgeSonucu> } | { isleToplu(tx: Islem, ogeler: readonly GelenOge<T>[], baglam: PaketBaglami): Promise<readonly OgeSonucu[]> })  // DanismaAnahtari D12'nin: string | { anahtar: string; kip: 'paylasimli' }",
      purpose:
        "Öğe türünün sahibi eklentisi yüklenirken bir kez kaydolur; aynı tür ikinci kez kaydolursa açılış durur. Sahipler ve işleyici biçimleri Başka modüllerden beklenenler bölümünde. İşleyici ardışık aynı tür öğeleri sıra düzeninde alır (isleToplu bir çağrıda, isle tek tek), aynı uzunlukta ve sırada sonuç döner, beklenen hiçbir durumda fırlatmaz, hızlı yolda öğe başına SAVEPOINT açmaz, gövdeyi ham metinden kendisi ayrıştırır, gönderim içinde surumAl çağırmaz (baglam.surumlaDamgala kullanır); yan etki belleği (ör. bir okuma önbelleği) tek isleToplu çağrısına yereldir, çağrılar arasında taşınmaz. kilitAnahtarlari isteğe bağlıdır: grubun danışma anahtarlarını saf anahtar işlevleriyle gövdeden çıkarır (beklemez, satır kilitlemez); D06 paketin bütün gruplarının anahtarlarını kendi esitleme:kurulum_siniri:<kisiId> anahtarıyla birleştirip hiçbir grubu işlemeden önce tek D12.danismaKilidi çağrısında alır. İşleyicinin aynı anahtarlar için kendi danismaKilidi çağrısı işlemsizdir; sırada geride kalan yeni anahtarı yalnız D12.danismaKilidiDene ile alır, alamazsa öğeye kendi geçici koduyla TEKRAR_DENE döner."
    },
    {
      name: "indirmeKaynagiKaydet",
      signature:
        "indirmeKaynagiKaydet(ad: string, kaynak: GenelKaynak | KapsamKaynagi | OgrenciKaynagi): void  // tipler packages/contracts/src/esitleme.ts",
      purpose:
        "Telefona inen veri kaynakları kaydolur: genel kaynaklar D02 (dersler, ders saatleri, oturumlar, tatiller, kilit), D03 (liste satırları), D04 (pencereler); öğrenci kapsam kaynağını D03 ('ogrenci_liste_kapsami', öğrencinin silinmemiş liste satırlarının şubeleri; pasif satırın şubesi kapsamda kalır), personel kapsam kaynağını D02 (ders sahipliği) kaydeder; öğrenci kaynakları D05 (kayıtlar ve kararlar), D08 (devam durumu), D09 (düzeltmeler ve sorun bildirimleri). Ad cevaptaki anahtardır, tekildir; çift kayıt ya da rol başına birden çok kapsam kaynağı açılışı durdurur."
    },
    {
      name: "gondermeSuresiSonu",
      signature:
        "gondermeSuresiSonu(oturumBitisAni: Date, kilitAni: Date | null): Date  // packages/core/src/esitleme/gonderme-suresi.ts, saf; modules/esitleme/index.ts dışa vermez",
      purpose:
        "Oturumun gönderme süresinin dışlayıcı sonu: en erken(oturumBitisAni + 7 x 86.400.000 ms, kilitAni). kilitAni D02.birimDonemiGetir'in BirimDonemiBilgisi.kilitAni değeridir (son günün ertesi 00:00 Europe/Istanbul, D02 hesaplar); birim dönemi yoksa (deneme dersi, kilitDurumu kaynak 'takvim_yok') null verilir ve sonuç ders bitişi artı 7 gündür. Ulaşma anı bu andan küçükse süre içindedir. UTC milisaniyeyle hesaplanır, Intl ve infra kullanmaz. D04, D07, D09 ve D10 packages/core/src/esitleme'den içe aktarır; D06'nın modül dosyalarını çekmez."
    },
    {
      name: "enEskiGecerliSurumuYukselt",
      signature: "enEskiGecerliSurumuYukselt(tx: Islem): Promise<{ oncekiDeger: bigint; yeniDeger: bigint }>  // modules/esitleme/en-eski-surum.ts",
      purpose:
        "Yönetim komutunun işlevi: en_eski_gecerli_surum'u güncel surum'a çıkarır (satır yoksa ilk kullanım kuralıyla açar), herkesin sonraki indirmesi baştan iner. Komut satırı girişi apps/server/src/cli/esitleme-en-eski-surum.ts (bileşim kökü): aynı işlemde D09.denetimeYaz ile 'esitleme.en_eski_surum_yukseltildi' olayı yazar (dersId taşımaz; tür ESITLEME_DENETIM_OLAYLARI'nda, giriş D09.denetimOlaylariniKaydet ile kaydeder); modules/esitleme D09'u içe aktarmaz."
    },
    {
      name: "esitlemeKimlikDinleyicisi",
      signature: "esitlemeKimlikDinleyicisi: KimlikDinleyicisi  // (tx: Islem, olay: KimlikOlayi) => Promise<void>; tipler D01'in; modules/esitleme/kimlik-dinleyicisi.ts, index.ts dışa verir",
      purpose:
        "D01.kimlikDinleyicileriniKur'a esitleme abonesi olarak bileşim kökleri verir (app.ts uygulamaKur api ve isci süreçlerinde, D12 cli/geri-yukleme, D15 cli/anahtar-uret ve cli/olay*); D01 olayı doğuran işlemde dersler aboneden sonra, projeksiyondan önce çağırır. hesap_silindi olayında kişinin karar_teslimleri, ogrenci_durum_surumleri ve kurulumlar satırlarını (gonderim_defteri cascade ile) olayı doğuran işlemde siler; öbür olaylar (giris_oturumu_kapandi, giris_oturumu_yenilendi, cihaz_kapandi, hesap_durumu_degisti) yok sayılır. Alan modülü içe aktarmaz, iş kuyruğuna koymaz, genel sayaç almaz."
    },
    {
      name: "esitlemeEklentisi",
      signature: "esitlemeEklentisi: FastifyPluginAsync<EsitlemeEklentisiSecenekleri>; EsitlemeEklentisiSecenekleri = EklentiTemelSecenekleri & { saat: Saat; log: Logger; ulasmaMakbuzu: { etkin(): GizliAnahtar; anahtar(kid: string): GizliAnahtar | null }; kimlik: { cihazAnahtariGetir; cihazGetir; kisiGetir; hesapSilindiMi; ogrenciHesabiGetir }; esitlemeSaglikliMi: () => boolean }  // modules/esitleme/eklenti.ts, index.ts dışa verir; EklentiTemelSecenekleri = { surec: 'api' | 'isci' } (D13)",
      purpose:
        "Modülün Fastify eklentisi (contracts.json ortak kural 'Birleşim'). Altyapıyı seçenekten alır, kayıt sırasında veritabanına dokunmaz. Dinleyici kayıtlarını her süreçte yapar: D12.saklamaIsleyicisiKaydet('esitleme.donem_verisi', ...); zamanlayıcısı yoktur (surec 'api' iken de kurmaz). Rotaları yalnız D13.rotalariKaydet ile ekler; setErrorHandler ve setNotFoundHandler kullanmaz. Hata kodu öneki ESITLEME_; rota düzeyi rol reddi D13'ün API_ROL_YETKISIZ'idir; yolda kaynak kimliği olmadığından kaynak düzeyi 404 (ESITLEME_BULUNAMADI) doğmaz. Seçeneklerde kimlikOlayiDinleyicisiKaydet yoktur: kimlik olayları esitlemeKimlikDinleyicisi ile gelir."
    }
  ],

`);
between(`  files: [`, `  tests: [`, `  files: [
    "apps/server/src/modules/esitleme/index.ts",
    "apps/server/src/modules/esitleme/yaprak.ts",
    "apps/server/src/modules/esitleme/tablolar.ts",
    "apps/server/src/modules/esitleme/eklenti.ts",
    "apps/server/src/modules/esitleme/kayitlar.ts",
    "apps/server/src/modules/esitleme/kuyruklar.ts",
    "apps/server/src/modules/esitleme/kimlik-cozumu.ts",
    "apps/server/src/modules/esitleme/ikinci-capa.ts",
    "apps/server/src/modules/esitleme/gonderim.ts",
    "apps/server/src/modules/esitleme/dagitici.ts",
    "apps/server/src/modules/esitleme/danisma-anahtarlari.ts",
    "apps/server/src/modules/esitleme/defter.ts",
    "apps/server/src/modules/esitleme/kurulum.ts",
    "apps/server/src/modules/esitleme/ulasma-makbuzu.ts",
    "apps/server/src/modules/esitleme/indirme.ts",
    "apps/server/src/modules/esitleme/teslim.ts",
    "apps/server/src/modules/esitleme/kimlik-dinleyicisi.ts",
    "apps/server/src/modules/esitleme/saklama.ts",
    "apps/server/src/modules/esitleme/en-eski-surum.ts",
    "apps/server/src/modules/esitleme/iz.ts",
    "apps/server/src/jobs/esitleme/index.ts",
    "apps/server/src/jobs/esitleme/sira-boslugu-raporu.ts",
    "apps/server/src/cli/esitleme-en-eski-surum.ts",
    "packages/contracts/src/esitleme.ts",
    "packages/core/src/esitleme/index.ts",
    "packages/core/src/esitleme/imlec.ts",
    "packages/core/src/esitleme/imlec.test.ts",
    "packages/core/src/esitleme/su-seviyesi.ts",
    "packages/core/src/esitleme/su-seviyesi.test.ts",
    "packages/core/src/esitleme/sayfa.ts",
    "packages/core/src/esitleme/sayfa.test.ts",
    "packages/core/src/esitleme/gonderme-suresi.ts",
    "packages/core/src/esitleme/gonderme-suresi.test.ts",
    "packages/core/src/esitleme/ikinci-capa-metni.ts",
    "packages/core/src/esitleme/ikinci-capa-metni.test.ts",
    "packages/core/src/esitleme/makbuz-bicimi.ts",
    "packages/core/src/esitleme/makbuz-bicimi.test.ts",
    "packages/core/src/esitleme/protokol.ts",
    "packages/core/src/esitleme/protokol.test.ts",
    "apps/server/test/features/esitleme/gonderim.feature",
    "apps/server/test/features/esitleme/gonderim-kimlik.feature",
    "apps/server/test/features/esitleme/ikinci-capa.feature",
    "apps/server/test/features/esitleme/dagitim-hatalari.feature",
    "apps/server/test/features/esitleme/danisma-kilidi.feature",
    "apps/server/test/features/esitleme/surum-damgasi.feature",
    "apps/server/test/features/esitleme/indirme.feature",
    "apps/server/test/features/esitleme/kapsam.feature",
    "apps/server/test/features/esitleme/sayac-eszamanlilik.feature",
    "apps/server/test/features/esitleme/ogrenci-durumu.feature",
    "apps/server/test/features/esitleme/yedekten-donus.feature",
    "apps/server/test/features/esitleme/son-temas.feature",
    "apps/server/test/features/esitleme/hesap-silme.feature",
    "apps/server/test/features/esitleme/saklama.feature",
    "apps/server/test/features/esitleme/en-eski-surum.feature",
    "apps/server/test/features/esitleme/sira-boslugu-raporu.feature",
    "apps/server/test/features/esitleme/gonderim-durum-makinesi.feature",
    "apps/server/test/features/esitleme/sozlesme.feature",
    "apps/server/test/steps/esitleme/gonderim-adimlari.ts",
    "apps/server/test/steps/esitleme/indirme-adimlari.ts",
    "apps/server/test/steps/esitleme/ogrenci-durumu-adimlari.ts",
    "apps/server/test/steps/esitleme/surum-damgasi-adimlari.ts",
    "apps/server/test/steps/esitleme/yedekten-donus-adimlari.ts",
    "apps/server/test/steps/esitleme/durum-makinesi-adimlari.ts",
    "apps/server/test/steps/esitleme/sozlesme-adimlari.ts",
    "apps/server/test/steps/esitleme/is-adimlari.ts",
    "apps/server/test/support/kurucular/esitleme.ts"
  ],

  goc:
    "Göç tablolar.ts dosyasından drizzle-kit generate ile üretilir ve contracts.json migration_dir ile aynı yere yazılır: apps/server/migrations/<14 haneli UTC (YYYYMMDDHHMMSS)>_esitleme_<açıklama>/ (migration.sql ve snapshot.json; dosya haritasında apps/server/migrations/??????????????_esitleme_* globu D06'nındır). Göç yalnız D06'nın beş tablosuna dokunur ve satır yazmaz (D12-B34; degisiklik_sayaci satırı ilk kullanımda açılır). Göç dosyaları dosya listesine değil iş paketine yazılır; klasör kuralı ve CI göç denetimi D12'nindir. Paket birleşmeden önce ana dala yeniden dayanır; arada ana dala yeni göç klasörü girdiyse kendi klasörünü silip drizzle-kit generate ile yeniden üretir.",

`);

// tests
R(`asserts: "İki istek kurulum satırı kilidinde sıraya girer; her öğe sahibinin tablosunda tam bir kez; öğe başına biri KABUL, öbürü ZATEN_VAR." }`,
  `asserts: "İki istek aynı danışma anahtarında (esitleme:kurulum_siniri) ve kurulum satırı kilidinde sıraya girer; her öğe sahibinin tablosunda tam bir kez; öğe başına biri KABUL, öbürü ZATEN_VAR. Aynı sıra başka öğe kimliğiyle eşzamanlı gelince ikinci paket defteri kilitten önce okumuş olsa da kilitten sonraki yeniden okuma RET ESITLEME_SIRA_CAKISMASI verir, sahibin tablosunda tek öğe kalır; yeniden okuma bilerek kaldırılınca senaryo kırmızı (dosya md5 ile geri yazılır)." }`);
R(`asserts: "Aynı kurulumun satırı 2 saniyeden uzun kilitli tutulunca 503 ESITLEME_KURULUM_MESGUL ve Retry-After 5; hiçbir satır yazılmaz." }`,
  `asserts: "Aynı kurulumun satırı 2 saniyeden uzun kilitli tutulunca 503 ESITLEME_KURULUM_MESGUL, hata zarfında bekleme { sabit: 5 } ve Retry-After 5; hiçbir satır yazılmaz." }`);
R(`isle biçimli işleyicide bütçe her öğeden sonra denetlenir; aynı paket yeniden gönderilince işlenenler ZATEN_VAR, kalanlar ilerler." }`,
  `isle biçimli işleyicide bütçe her öğeden sonra denetlenir; aynı paket yeniden gönderilince işlenenler ZATEN_VAR, kalanlar ilerler. Kancası yavaş istekte (işlem açılırken D13.kalanSureMs 10000) bütçe 5 saniyeye iner." }`);
R(`asserts: "20 saniyeden uzun bekleyen sahte işleyici: transaction_timeout işlemi keser, cevap 503 ve hiçbir tabloda satır kalmaz.`,
  `asserts: "İşleyici bütçesinden uzun bekleyen sahte işleyici: transaction_timeout (D13.kalanSureMs) işlemi keser, D12.islem 25P04'ü VERITABANI_ZAMAN_ASIMI'na çevirir, cevap 503 ve bekleme { aralik: [15, 45] }, hiçbir tabloda satır kalmaz.`);
R(`asserts: "Geçerli imza: işleyici bağlamında VAR, belge ve olaydanBelgeyeMs aynen; tek baytı değişmiş metin, başka kurulumun ya da paketin metni ve öğrencide 'o' türü: YOK, yokNedeni paket_imzasiz; listede olmayan öğe: YOK gonderilmedi; ikinciCapa null ve neden esitleme_bozuk: YOK esitleme_bozuk; personel oturumunda 'o': VAR. Anahtar türü uyuşmazlığı ('a' ile secure_enclave ya da app_attest anahtarı, 's' ile android_p256): YOK paket_imzasiz ve imzadan kimlik kurulmaz." }`,
  `asserts: "Geçerli imza: işleyici bağlamında VAR, belge ve olaydanBelgeyeMs aynen; tek baytı değişmiş metin, başka kurulumun ya da paketin metni ve öğrencide 'o' türü: YOK, yokNedeni PAKET_IMZASIZ; listede SONRA_YENIDEN_BASLATMA nedeniyle duran öğe: YOK SONRA_YENIDEN_BASLATMA; listede olmayan öğe: YOK GONDERILMEDI; ikinciCapa null ve neden ESITLEME_BOZUK: YOK ESITLEME_BOZUK; neden IMZALANAMADI: YOK PAKET_IMZASIZ; personel oturumunda 'o': VAR. Bağlamdaki her yokNedeni değeri D04'ün sabitler listesinde (sözleşme testi listeden okur, yazımı yeniden yazmaz). Anahtar türü uyuşmazlığı ('a' ile secure_enclave ya da app_attest anahtarı, 's' ile android_p256): YOK PAKET_IMZASIZ ve imzadan kimlik kurulmaz." }`);
R(`asserts: "Hoca paketi [erken_kapatma, kafa_sayisi]: kafa_sayisi grubu sürerken başka işlem degisiklik_sayaci'nı beklemeden artırır; surumAl gönderim başına bir kez çağrılır, damga erken_kapatma'nın yazdığı satıra o sürümü koyar ve satır sonraki indirmede iner. Öğrenci paketi sayaca hiç dokunmaz (kontrol)." }`,
  `asserts: "Hoca paketi [erken_kapatma, kafa_sayisi]: kafa_sayisi grubu sürerken başka işlem degisiklik_sayaci'nı beklemeden artırır; surumAl gönderim başına bir kez, defter ve kurulum yazımından sonra çağrılır, iki grubun damgaları aynı sürümü yazar ve satırlar sonraki indirmede iner; sayaçtan sonra sorgu günlüğünde yeni satır kilidi yok. Öğrenci paketi sayaca hiç dokunmaz (kontrol)." }`);
R(`asserts: "Öğrencinin paketi (imleç onayı ve yoklama öğeleri) ile aynı öğrencinin kaydına hoca onayı (D05.kararSutunlariniYaz yolu) zorlanmış zamanlamayla 50 kez eşzamanlı: 40P01 sayısı 0; onay satırı kilitliyken gönderim onayı atlar ve 200 döner, sonraki istek yazar." }`,
  `asserts: "Öğrencinin paketi (imleç onayı, yoklama ve sorun bildirimi öğeleri) ile aynı öğrencinin kaydına hoca onayı (D05.kararSutunlariniYaz yolu) zorlanmış zamanlamayla 50 kez eşzamanlı: 40P01 sayısı 0; onay satırı kilitliyken gönderim onayı atlar ve 200 döner, sonraki istek yazar." }`);
R(`asserts: "Gönderim ve indirme son_temas_ani'yi saat arayüzünden yazar; 401, 403 ve 503 ile biten istek yazmaz; kurulumSonTemasi kişinin en son temasını verir ve eski telefon bekleyen yoklama bildirdiyse yeni telefonun bekleyensiz temasından sonra da bekleyenYoklamaVar true; yalnız telefon_sayaci bekleyen kurulumda false (kontrol)." }`,
  `asserts: "Gönderim ve indirme son_temas_ani'yi saat arayüzünden yazar; 401, 403 ve 503 ile biten istek yazmaz; kurulumSonTemasi kişinin en son temasını verir ve eski telefon bekleyen yoklama bildirdiyse yeni telefonun bekleyensiz temasından sonra da bekleyenYoklamaVar true; yalnız telefon_sayaci bekleyen kurulumda false (kontrol). kurulumSonTemaslari üç kişi için tek sorgu çalıştırır (sorgu günlüğünden), her kişide kurulumSonTemasi ile aynı değeri verir, kurulumu olmayan kişi { null, false } ile haritada bulunur." }`);
R(`{ name: "Hesap silinince D06 satırları silinir", kind: "behavior", asserts: "D01'in hesap_silindi olayı aynı işlemde kişinin kurulumlar, defter (cascade), öğrenci sürümü ve karar teslimi satırlarını siler; başka kişinin satırlarına dokunmaz (kontrol). Silinmiş kişinin imzalı paketi: öğeler sahiplerine dağıtılır, HTTP 200 ve sonSira döner, işlem sonunda kişinin D06 satırları yeniden silinmiş olur." }`,
  `{ name: "Hesap silinince D06 satırları silinir", kind: "behavior", asserts: "D01.kimlikDinleyicileriniKur ile kurulan esitleme abonesi (esitlemeKimlikDinleyicisi) hesap_silindi olayında aynı işlemde kişinin kurulumlar, defter (cascade), öğrenci sürümü ve karar teslimi satırlarını siler; başka kişinin satırlarına dokunmaz (kontrol); giris_oturumu_kapandi, giris_oturumu_yenilendi, cihaz_kapandi ve hesap_durumu_degisti olaylarında hiçbir D06 satırı değişmez (kontrol). Silinmiş kişinin imzalı paketi: D01.hesapSilindiMi true, öğeler sahiplerine dağıtılır, HTTP 200 ve sonSira döner, işlem sonunda kişinin D06 satırları yeniden silinmiş olur. Silme ile gönderim eşzamanlı: 40P01 yok (gönderim kişi satırını kurulum satırından önce FOR SHARE alır)." }`);
R(`{ name: "sira_boslugu_raporu boşlukları bulur ve eskiyi temizler", kind: "behavior", asserts: "Boşluklu kurulumda acik_bosluk_sayisi ve ilk_eksik_sira doğru, boşluksuz kurulumda sıfır (kontrol), kapanan boşluk sıfırlanır; gönderimin kilitlediği kurulum atlanır ve sayılır; su seviyesinin altında ve 401 günlük defter satırı, 401 günlük karar teslimi silinir, 399 günlük ve su seviyesinin üstündeki satır kalır (kontrol); aynı gün iki kez çalışınca aynı sonuç; log satırında numara ve isim yok." }`,
  `{ name: "sira_boslugu_raporu boşlukları bulur ve eskiyi temizler", kind: "behavior", asserts: "Boşluklu kurulumda acik_bosluk_sayisi ve ilk_eksik_sira doğru, boşluksuz kurulumda sıfır (kontrol), kapanan boşluk sıfırlanır; gönderimin kilitlediği kurulum atlanır ve sayılır; su seviyesinin altında ve 401 günlük defter satırı silinir, 399 günlük ve su seviyesinin üstündeki satır kalır (kontrol); karar_teslimleri satırına dokunulmaz (kontrol); D14'ün 'aynı veriyle iki kez çalışırsa' adımıyla iki kez çalışınca kurulumlar ve defter ilk çalışmadan sonrakiyle aynı; log satırında numara ve isim yok." },
    { name: "Saklama işleyicisi süresi dolan karar teslimlerini siler", kind: "behavior", asserts: "D12.saklamaIsleyicisiniCalistir(saklamaVeritabani, 'esitleme.donem_verisi', { sinirAni, ... }) yoklama_saklama girişiyle: son sunumu sinirAni'dan eski karar_teslimleri satırları partilerle silinir, yeni olan kalır (kontrol); kurulumlar, gonderim_defteri ve ogrenci_durum_surumleri değişmez (kontrol); işleyici başka modülün tablosuna dokunmaz, INSERT yapmaz. Satırı silinmiş kararda kararTeslimAni null döner. Kayıt öneksiz ya da ince sınıf adıyla ('esitleme.karar_teslimleri') yapılınca D12 açılışı durdurur (kontrol)." },
    { name: "En eski geçerli sürüm komutu", kind: "behavior", asserts: "cli/esitleme-en-eski-surum.ts çalışınca en_eski_gecerli_surum güncel surum olur ve aynı işlemde esitleme.en_eski_surum_yukseltildi denetim olayı yazılır (birimId ve dersId yok); sonraki indirme bastanIndir true. degisiklik_sayaci satırı yokken komut satırı açar (0) ve hata vermez. Denetim yazımı bilerek başarısız edilince sürüm değişmez (tek işlem)." }`);
R(`{ name: "Teyitsiz öğrencinin kapsam bağlamı", kind: "behavior", asserts: "Teyitsiz öğrencinin indirmesinde kapsam kaynağına teyitli false ve numara verilir; sahte liste kaynağı adı bu bayrakla siler ve cevapta ad yok. Teyitten sonraki indirme bastanIndir true ve kendi adını taşır (kontrol)." }`,
  `{ name: "Teyitsiz öğrencinin kapsam bağlamı", kind: "behavior", asserts: "Teyitsiz öğrencinin indirmesinde öğrenci kapsam kaynağına (D03'ün ogrenci_liste_kapsami kaydı yerine sahte kaynak) teyitli false ve numara verilir; sahte liste kaynağı adı bu bayrakla siler ve cevapta ad yok. Teyit durumu D01.ogrenciHesabiGetir'den imleçteki hesap özetine girer: teyitten sonraki indirme bastanIndir true ve kendi adını taşır (kontrol); teyit değişmeden ikinci indirme bastanIndir false (kontrol)." },
    { name: "Kısıtlı oturum oturumsuz sayılır", kind: "behavior", asserts: "Değişim bekleyen kısıtlı oturumun Bearer'ı (oturumHatasi KIMLIK_KAPSAM_SINIRLI) ve geçerli paket imzası: HTTP 200, yoklama_kaydi işlenir, sorun_bildirimi TEKRAR_DENE ESITLEME_OTURUM_GEREKLI, PaketBaglami.oturum ve kimlik null. Aynı istek imzasız: 401 API_KIMLIK_GEREKLI. İndirmede aynı oturum 403 KIMLIK_KAPSAM_SINIRLI; çerezle gelen indirme 403 API_ROL_YETKISIZ." },
    { name: "Danışma anahtarları paket başında tek çağrıda", kind: "behavior", asserts: "kilitAnahtarlari kancası olan iki sahte türle paket: D12.danismaKilidi işlem başına tam bir kez çağrılır (sahte sayaçla), anahtarlar iki grubun anahtarları ve esitleme:kurulum_siniri:<kisiId>, çağrı hiçbir işleyiciden ve kurulum satırı kilidinden önce; kancasız tür anahtar vermez (kontrol). PaketBaglami.kimlik oturumlu pakette istek.kimlik, oturumsuz imzalı pakette null. İşleyici sırada geride kalan yeni anahtarı danismaKilidiDene ile alamayınca yalnız o öğe TEKRAR_DENE alır." },
    { name: "Sürüm damgası tek sürümle yazılır", kind: "behavior", asserts: "Bir işlemde üç surumDamgasiIste ve bir surumAl: sayaç bir artar, üç damga aynı sürümü alır, kayıt sırasıyla. surumAl çağrılmadan biten damgalı işlem D12.islemSonuKancasi ile geri alınır ve hiçbir satır kalmaz; aynı işlem surumAl ile COMMIT eder (pozitif kontrol). surumAl'dan sonra surumDamgasiIste hata atar; aynı işlemde ikinci surumAl sayacı artırmaz, aynı sürümü döner; geri alınan SAVEPOINT içinde kaydedilen damga çalışmaz ve denetimi tetiklemez. degisiklik_sayaci satırı yokken ilk surumAl satırı açar ve 1 döner; eşzamanlı iki ilk surumAl 1 ve 2 döner. Mutasyon: denetim kancası kaydı bilerek kaldırılınca senaryo kırmızı (dosya md5 ile geri yazılır)." }`);
R(`{ name: "Modül sınırı", kind: "contract", asserts: "Başka modül yalnız modules/esitleme/index.ts ve yaprak.ts'i içe aktarır; modules/esitleme yalnız D12 ve D13 dış yüzlerini ve infra'yı içe aktarır, D01 ve D04 işlevleri esitlemeEklentisi seçeneğiyle gelir, öğe ve kaynak sahiplerini içe aktarmaz; jobs/esitleme yalnız D14.isTanimla'yı ve infra/saat'i kullanır; yaprak.ts başka modül içe aktarmaz; dependency-cruiser no-circular D06'yı içeren döngü bulmaz ve modules/esitleme'ye bilerek D01 içe aktarması eklenince kırmızı (Biome noPrivateImports)." }`,
  `{ name: "Modül sınırı", kind: "contract", asserts: "Başka modül yalnız modules/esitleme/index.ts ve yaprak.ts'i içe aktarır; modules/esitleme yalnız D12 ve D13 dış yüzlerini, infra'yı ve packages/core/src/saat sabitlerini içe aktarır, D01 ve D04 işlevleri esitlemeEklentisi seçeneğiyle gelir, öğe ve kaynak sahiplerini içe aktarmaz; yaprak.ts alan modülü içe aktarmaz (yalnız D12'nin islemSonuKancasi'nı ve tipleri); jobs/esitleme modülün kendi dosyalarını, D14.isTanimla'yı ve infra/saat'i kullanır; modules/esitleme jobs/ ya da cli/ içe aktarmaz; dependency-cruiser no-circular D06'yı içeren döngü bulmaz ve modules/esitleme'ye bilerek D01 içe aktarması eklenince kırmızı (Biome noPrivateImports)." },
    { name: "Eklenti birleşimi ve kayıtlar", kind: "contract", asserts: "esitlemeEklentisi kayıt sırasında veritabanına sorgu göndermez (sorgu sayacı 0); surec 'api' ve 'isci' için saklama işleyicisini kaydeder, zamanlayıcı kurmaz; setErrorHandler ve setNotFoundHandler çağırmaz; rotalar yalnız rotalariKaydet'ten gelir. Seçenek tipinde kimlikOlayiDinleyicisiKaydet yok; uygulamaKur esitleme abonesi olarak esitlemeKimlikDinleyicisi verir, abone eksikse süreç açılmaz. ESITLEME_DENETIM_OLAYLARI'nın her türü esitleme. önekli, D09.denetimOlaylariniKaydet ile kayıtlı ve dersId taşımaz; ESITLEME_ hata kodlarının hepsi esitleme.ts'teki listede. Rota tablosunda indirme defterYazar: true ve kimlikKaynaklari ['bearer'], gönderim kimlik ['cihazImzasi', 'oturum'] ve hız 'gonderim'." }`);
if (process.exitCode) console.log('FAILED, nothing written'); else { fs.writeFileSync(f, s); console.log('ok'); }
