const fs = require('fs');
const rep = (f, a, b) => { const s = fs.readFileSync(f, 'utf8'); const n = s.split(a).length - 1; if (n !== 1) { console.log('COUNT', n, f, JSON.stringify(a.slice(0, 80))); process.exitCode = 1; return; } fs.writeFileSync(f, s.replace(a, b)); console.log('ok', f, JSON.stringify(b.slice(0, 60))); };
const F = __dirname + '/icerik.js', U = __dirname + '/uret.js';

// dizin adları sütunlarla birebir
rep(F, `"yoklama_kayitlari_donem_id_oturum_id_ogrenci_id_idx: (donem_id, oturum_id, ogrenci_id, id); oturumun ve öğrencinin bütün ham kayıtları, sayılan seçimi",`,
  `"yoklama_kayitlari_donem_id_oturum_id_ogrenci_id_idx: (donem_id, oturum_id, ogrenci_id); oturumun ve öğrencinin bütün ham kayıtları, sayılan seçimi",`);
rep(F, `"yoklama_kayitlari_karar_donem_id_idx: (karar, donem_id, oturum_id) WHERE`, `"yoklama_kayitlari_karar_donem_id_oturum_id_idx: (karar, donem_id, oturum_id) WHERE`);
rep(F, `"FK (donem_id, oturum_id) REFERENCES oturumlar (donem_id, id); D02'nin`, `"Kısıt ve dizin adları D12.kisitAdi ile <tablo>_<sütunlar>_<pk|fk|uq|ck|idx> (D12-B01); en uzunu 51 bayt, sınır 63",
    "FK (donem_id, oturum_id) REFERENCES oturumlar (donem_id, id); D02'nin`);

// ulaşma anı: yedekten dönüş istisnası
rep(F, `c('ulasma_ani', 'timestamptz', false, '', "Paketin sunucuya ulaştığı an: D06 saat arayüzünden paket başına bir kez okur, paketteki her kayda aynen yazılır. Okutma yolunda hocanın gönderiminin ulaştığı an."),`,
  `c('ulasma_ani', 'timestamptz', false, '', "Paketin sunucuya ulaştığı an: D06 saat arayüzünden paket başına bir kez okur, paketteki her kayda aynen yazılır. Okutma yolunda hocanın gönderiminin ulaştığı an. Yedekten dönüşte kaybolup yeniden gelen kayıt geçerli ulaşma belgesi taşıyorsa belgenin anı (D12-B31)."),`);

// öğe gövdesi ve sonucu: ulaşma belgesi
rep(F, `ayrıntılı denetim işleyicide" },`, `ayrıntılı denetim işleyicide", ulasmaBelgesi: "isteğe bağlı metin; bu zarf için önceden alınmış ulaşma belgesi (telefon ilk aldığını saklar, yedekten dönüş sonrası yeniden gönderimde yollar)" },`);
rep(F, `      degisiklikSurumu: 'string | null (64 bit)',
    },`, `      degisiklikSurumu: 'string | null (64 bit)',
      ulasmaBelgesi: "string | null (KABUL ve ZATEN_VAR'da: D04 saat belgesi; özne kaydın cihazı, tek kullanımlık değer zarfın SHA-256 özetinin ilk 16 baytı; eşitleme bozukken boş)",
    },`);
rep(F, `    govde: { zarf: 'okutulan makbuz QR içeriği aynen', hocaId: 'öğeyi oluşturan hoca (UUID)' },`,
  `    govde: { zarf: 'okutulan makbuz QR içeriği aynen', hocaId: 'öğeyi oluşturan hoca (UUID)', ulasmaBelgesi: 'isteğe bağlı; yoklama_kaydi ile aynı kural' },`);
rep(F, `      kayit: "{ donemId, kayitId, ogrenciId, karar, kararGerekcesi, etiketler } | null; yalnız dersin hocasına ve KABUL ya da ZATEN_VAR'da",`,
  `      kayit: "{ donemId, kayitId, ogrenciId, karar, kararGerekcesi, etiketler, ulasmaBelgesi } | null; yalnız dersin hocasına ve KABUL ya da ZATEN_VAR'da",`);

// değişmez 8
rep(F, `"Bir paketteki bütün kayıtların ulaşma anı aynıdır ve saat arayüzünden gelir; kural kodunda SQL now() ve Date.now() yoktur.",`,
  `"Bir paketteki bütün kayıtların ulaşma anı aynıdır ve saat arayüzünden gelir; tek istisna, yedekten dönüşte yeniden gelen kaydın geçerli ulaşma belgesindeki andır. Kural kodunda SQL now() ve Date.now() yoktur.",`);

// cevap tipi: liste satırı anahtarı ve hesapsız öğrenci
rep(F, `ogrenciler: "Array<{ ogrenciId: string, ogrenciNo: string (metin), adSoyad: string,`,
  `ogrenciler: "Array<{ satirId: string (liste satırı), ogrenciId: string | null (hesabı yoksa null), ogrenciNo: string (metin), adSoyad: string,`);

// testler
rep(F, `  T("Öğrencinin indirmesi yalnız kendi kayıtlarını verir", 'behavior',`,
  `  T("Yedekten dönüşte ulaşma anı korunur", 'behavior', "KABUL cevabındaki ulaşma belgesiyle kaybolmuş kayıt yeniden gönderilince ulasma_ani belgenin anıdır ve gec_geldi değişmez; başka zarfın ya da bozulmuş belgenin anı kullanılmaz, paketin ulaşma anı yazılır (pozitif ve negatif kontrol)."),
  T("Hesabı olmayan öğrenci oturum listesinde", 'behavior', "Listede olup hesabı olmayan öğrencinin satırı ogrenciId null ve kayıtsız döner; elle ekleme düzeltmesi varsa son durumu Elle eklendi; hesaplı öğrencinin kaydı numarasıyla doğru satıra bağlanır."),
  T("Öğrencinin indirmesi yalnız kendi kayıtlarını verir", 'behavior',`);

// başka alanların D05'e bıraktığı üç madde
rep(F, `const contradictions_resolved = [`, `resolved_gaps.push(
  G('D12-B31', "Başka alanın D05'e bıraktığı biçim. KABUL ve ZATEN_VAR sonucuna ulaşma belgesi eklenir: D04.saatBelgesiVer ile, özne kaydın cihazı ve tek kullanımlık değer zarfın SHA-256 özetinin ilk 16 baytı. Telefon ilk aldığı belgeyi kaydın yanında saklar ve yeniden gönderimde öğe gövdesinde yollar. Kayıt sunucuda yoksa (yedekten dönüş) ve belge D04.saatBelgesiDogrula ile geçerli, öznesi kaydın cihazı, değeri bu zarfın özetiyse ulasma_ani belgenin anıdır; değilse paketin ulaşma anı. Kayıt varsa belge yok sayılır.", "PITR en çok 5 dakikalık WAL penceresini geri alır (teknik.html#veritabani); o pencerede ulaşmış kayıt yeniden gönderilince ulaşma anı geç yazılırsa gönderme süresi ve birimin son günü kuralı öğrencinin aleyhine işleyebilir (plan.html#kararlar-gonderme-suresi). Yeni anahtar ya da tablo gerekmez: D04'ün belge biçimi ve anahtar listesi kullanılır, eski anahtarlar dönem kilidine kadar kalır."),
  G('D12-B18', "Başka alanın D05'e bıraktığı kural. Hesabı silinmiş öğrencinin kaydı: doğrulanmış saati silme anından önceyse saklanır ve normal karara bağlanır; sonraysa saklanmadan RET HESAP_SILINMIS; saati doğrulanamıyorsa saklanır, kararı D07 verir (İncelemede).", "Silme öğrencinin aleyhine sonuç doğurmaz (plan.html#hedefler, Haksız devamsız 0) ve plan.html#kararlar-hesap-silme 'silinen öğrenci yeni kayıt gönderemez' der; silmeden sonra imzalanmış kayıt yeni veri sayılır."),
  G('D07-B12', "Başka alanın D05'e bıraktığı sütun. App Attest sayacı kayıt satırında app_attest_sayaci sütunudur; (dönem, cihaz, sıra) tekil dizini sıra numarasına göre komşu kayıtları bulur. Denetimi D07 appAttestSayaciniDenetle ile yapar, D05 yalnız ilk gelişte çağırır.", "teknik.html#sunucu-imza-dogrulama sayacı varış sırasına göre değil sıra numarasına göre denetletir; yeniden gelen kayıtta sayaca bakılmaz."),
);

const contradictions_resolved = [`);

// açık nokta: D04 ile ulaşma belgesi; D01 toplu biçim
rep(F, `  O('D05-A06',`, `  O('D05-A08', "D04 ile ulaşma belgesi sözleşmesi kabul ediliyor mu: saatBelgesiVer özne olarak kaydın cihazını ve tek kullanımlık değer olarak zarf özetinin ilk 16 baytını alır, saatBelgesiDogrula belgenin anını, öznesini ve değerini döner; eşitleme bozukken belge verilmez ve alan boş kalır (D12-B31).", "Kabul edilsin; D04'ün durumsuz belgesi zaten 'sunucu bu anı bu değer için gördü' demektir, yeni anahtar ya da tablo gerekmez.", false),
  O('D05-A06',`);
rep(F, `"D01, öğrenci kaydı ve App Attest yenileme cevaplarında her anahtarın cihaz_anahtarlari.id değerini döner, anahtar satırlarını hiç silmez ve cihazAnahtariGetir'i etkinliğe bakmadan döndürür mü?", "Evet; telefon kayıt metnine bu kimliği yazar (D05-B03), eski ve yenilenen anahtarla imzalı bekleyen kayıtlar doğrulanır.", false),`,
  `"D01, öğrenci kaydı ve App Attest yenileme cevaplarında her anahtarın cihaz_anahtarlari.id değerini döner, anahtar satırlarını hiç silmez ve cihazAnahtariGetir'i etkinliğe bakmadan döndürür mü? Ayrıca oturum ucu için ogrenciHesabiGetir'in kimlik listesi alan toplu biçimi eklenir mi?", "Evet; telefon kayıt metnine bu kimliği yazar (D05-B03), eski ve yenilenen anahtarla imzalı bekleyen kayıtlar doğrulanır. Toplu biçim gelene kadar oturum ucu numarayı öğrenci başına bir kez okur (işlem içi önbellek); 2000 satırlık sınıfta bu 2000 birincil anahtar okuması demektir, panel yük testinde ölçülür.", false),`);

// uret.js: kullanılan dış yüzler, işleme sırası, oturum ucu
rep(U, `D01 «cihazAnahtariGetir», «cihazGetir», «kisiGetir», «yetkiDenetle»`, `D01 «cihazAnahtariGetir», «cihazGetir», «kisiGetir», «ogrenciHesabiGetir», «yetkiDenetle»`);
rep(U, `D04 «simdi», «saatBelgesiDogrula», «pencereSonucu», «esitlemeSaglikliMi»`, `D04 «simdi», «saatBelgesiVer», «saatBelgesiDogrula», «pencereSonucu», «esitlemeSaglikliMi»`);
rep(U, `Ardından D04.pencereSonucu ve D04.esitlemeSaglikliMi.",`, `Ulaşma anı paketinkidir; öğede bu zarf için geçerli ulaşma belgesi varsa (yedekten dönüş) belgenin anıdır (D12-B31). Ardından D04.pencereSonucu ve D04.esitlemeSaglikliMi.",`);
rep(U, `D08.devamHesaplaIsiKoy; Aşama 2 kanıt satırı (D11). Sonuç KABUL.",`, `D08.devamHesaplaIsiKoy; Aşama 2 kanıt satırı (D11). Sonuç KABUL; KABUL ve ZATEN_VAR cevabına D04.saatBelgesiVer ile ulaşma belgesi eklenir.",`);
rep(U, `Varsa öğrenciler D02.oturumSubeleri ve D03.listeSatirlari'ndan (numara ve ad liste satırından), sayılan kayıtlar bu tablodan,`,
  `Varsa her satır bir liste satırıdır (D02.oturumSubeleri ve D03.listeSatirlari; numara ve ad liste satırından); kayıt satıra öğrencinin numarasıyla bağlanır (numara D01.ogrenciHesabiGetir'den, öğrenci başına bir kez), hesabı olmayan öğrencinin satırı kayıtsız kalır; sayılan kayıtlar bu tablodan,`);
