// Align round, part 4: exports block, resolved gaps (edits and closed open points), open points. Exact-once.
const fs = require('fs'), f = __dirname + '/../build-d08.js';
let s = fs.readFileSync(f, 'utf8');
const rep = (a, b) => { const n = s.split(a).length - 1; if (n !== 1) throw new Error('count ' + n + ' for: ' + a.slice(0, 90)); s = s.replace(a, () => b); };
const block = (start, end, body) => { const a = s.indexOf(start); const b = s.indexOf(end, a); if (a < 0 || b < 0 || s.indexOf(start, a + 1) >= 0) throw new Error('block ' + start); s = s.slice(0, a) + body + s.slice(b); };
const dropLine = prefix => { const a = s.indexOf('\n' + prefix); if (a < 0 || s.indexOf('\n' + prefix, a + 1) >= 0) throw new Error('line ' + prefix); const b = s.indexOf('\n', a + 1); s = s.slice(0, a) + s.slice(b); };

// lowercase option names follow D03's ListeSatiri.gecKayitSecimi values
s = s.split('onceki_sayilmaz').join('ONCEKI_SAYILMAZ').split('onceki_yok').join('ONCEKI_YOK');

// exports
block('const exports_ = [', '\n\nconst files = [', fs.readFileSync(__dirname + '/exports.src.js', 'utf8').replace(/\n$/, ''));

// resolved gap edits
rep(`partide birleşme, D12.danismaKilidi ile ders kilidi;`, `partide birleşme, D12.danismaKilidi ile ders kilidi (\\'devam:hesap:<dersId>\\', katman 1);`);
rep(`D08 katmanı (oturum-katmani.ts) yalnız: kapsam (hangi oturum öğrencinin), son günden sonra gelen kaydı işleve vermemek, kilitte donan açık kararı Yok sayıp geciciyi kaldırmak, muafta son durumu MUAF yapmak.`,
    `D08 katmanı (oturum-katmani.ts) yalnız kapsam ve MUAF örtüsüdür: hangi oturumun öğrencinin olduğunu seçer, girdide SonDurumKaydi.sayimDisi (son günden sonra gelen kayıt) ve SonDurumOturumu.kilitli (kilitte donan açık karar Yok, gecici false) alanlarını doldurur, muafta son durumu MUAF yapar (D08-A15).`);
rep(`D08-A11 kapandı: D05\\'in oturum ekranı Son durum sütununu aynı D09 işleviyle kendisi türetir; muaf satırı MUAF göstermesi D08-A08\\'de.'`,
    `D08-A11 kapandı: D05\\'in oturum ekranı Son durum sütununu aynı D09 işleviyle ve aynı iki girdi alanıyla kendisi türetir; muaf satırın hücresi DEVAM_SON_DURUMLARI\\'ndaki MUAF\\'tır.'`);
rep(`Seçim liste_satirlari.gec_kayit_secimi sütunudur (D03-B12).`, `Seçim liste_satirlari.gec_kayit_secimi sütunudur (D03-B12). Üyelik ve Md.9/4 kısmı dışa açık saf yüklem kapsamdaMi\\'dir; D09 düzeltme kabulünde aynı işlevi kullanır.`);
rep(`geçmişte iptal nedeni hoca olan ya da "yapılmadı" denen NORMAL oturum saati eksi yapılan TELAFI oturum saati, 0\\'ın altına inmez.`,
    `geçmişte iptal nedeni hoca olan ya da "yapılmadı" denen normal oturum saati eksi yapılan telafi oturum saati, 0\\'ın altına inmez (tür, durum ve neden değerleri D02\\'nin OTURUM_TURLERI, OTURUM_DURUMLARI ve IPTAL_NEDENLERI sabitlerinden içe aktarılır).`);
rep(`D10-B19 aynı tanımı kullanmalı (D08-A12).`, `Tek tanım budur: dersSonuclari.telafiEksigi\\'nde döner, D10 yalnız gösterir (D08-A12); tanım farkı sahibe sorulan D02-A02\\'ye gider.`);
rep(`D06.kurulumSonTemasi { sonTemasAni, bekleyenOgeSayisi } için ya son temas anı bu oturumun bitişinden önce ya da bekleyenOgeSayisi > 0.`,
    `D06.kurulumSonTemaslari(tx, kisiIdler) toplu okumasının { sonTemasAni, bekleyenYoklamaVar } değeri için ya son temas anı bu oturumun bitişinden önce ya da bekleyenYoklamaVar true.`);
rep(`D09.sonDurumOnceligi\\'ne verilmez, oturum kayıtsız gibi (Yok) kalır.`, `D09.sonDurumOnceligi\\'ne SonDurumKaydi.sayimDisi true ile verilir ve işlev onu saymaz; oturum kayıtsız gibi (Yok) kalır.`);
rep(`Süzgeç D09 işlevine taşınırsa D05\\'in ekranı da aynı sonucu verir (D08-A15).'`, `Süzgeç D09 işlevinin girdisinde olduğundan D05\\'in ekranı da aynı sonucu verir (D08-A15).'`);
rep(`'Muaf ders ve numara düzeyindedir: bu dersteki aynı numaranın satırlarından biri muafsa öğrenci muaftır; muaf ucu numaranın dersteki bütün satırlarını (etkin ve pasif) aynı işlemde D03.muafIsaretle ile yazar, böylece şube değişiminde açılan yeni satır muafı düşürmez.`,
    `'Muaf (ders, numara) başına tek değerdir: muaf ucu D03.muafIsaretle(tx, satirId, muaf, b) çağırır; D03 numaranın dersteki bütün satırlarını (etkin ve pasif) aynı işlemde yazar ve şube değişiminde ya da yeniden eklemede açılan yeni satıra aynı değeri verir (A3).`);
rep(`her değişiklik tek D09.denetimeYaz (devam.muaf_degisti).`, `her değişiklik tek D09.denetimeYaz (devam.muaf_degisti; birimId ile).`);
rep(`D03\\'ün yeni satıra muafı kopyalaması D08-A08\\'de.'`, `D03\\'ün yeni satıra aynı değeri vermesi D08-A08 ile kapandı.'`);
rep(`D01.yetkiDenetle(kimlik, { roller: [yonetici] }, { birimId }) sahiplikten bağımsız denetlenir`, `D01.yetkiDenetle(kimlik, \\'yonetici\\', { birimId }) sahiplikten bağımsız denetlenir`);
rep(`denetim devam.oran_degisti (önceki ve yeni değer);`, `denetim devam.oran_degisti (önceki ve yeni değer, birimId ile); uç /v1/devam/yonetim/ altında (D08-A14);`);
rep(`ayar şeması D15\\'in infra/ayarlar dosyasında, D08 bileşim kökünden parametre olarak alır`, `ayar şeması D15\\'in infra/ayarlar dosyasında, D08 bileşim kökünden devamEklentisi seçeneği sayimTabani olarak alır`);
rep(`D09-B20\\'nin kendi kalan hak formülü yerine bunu çağırması D08-A08\\'de.'`, `D09 kaydı olmayan bildirimde D09-B20 formülü yerine bunu çağırır (D08-A08 ile kapandı).'`);

// closed open points and B23, appended to resolved gaps
rep(`\n];\n\nconst contradictions = [`, `
  g('D08-B23', 'Son hafta hatırlatması için birimin son günü ve kilit anı telefona D02\\'nin kilit genel kaynağındaki birim dönemi satırıyla iner (D02-B32); D06 ve D08 bunu kullanır. D08\\'in sunucu hesabı son güne ihtiyaç duymaz: kilit anı D02.kilitDurumu ile gelir. D08-A10 bununla kapandı.', 'Gönderme süresi en geç son gündür ve son gün son ders gününden sonra olabilir ({plan:devam-donem-sonu|Dönem sonu}); son oturumdan çıkarım bunu kaçırırdı.'),
  g('D08-A07', 'Kapandı: D01 D08\\'in reads_from listesindedir (contracts.json). Öğrenci kimliği ortak kuralı: ogrenci_id hesap kimliğidir ve yalnız hesaptan gelen satırlarda durur; ders içindeki öğrenci (ders, numara) ile anılır ve aynı numaranın derste birden çok liste satırı tek öğrencidir; yolda, iş verisinde ve logda numara yoktur, liste satırı kimliği taşınır ve numara D03.satirGetir ile çözülür. D08\\'in tek D01 çağrısı ogrenciHesabiGetir\\'dir: hesap işi, canlı uçlar ve dersSonuclari dersin bütün liste numaraları için { numaralar }, kayıtların kişi kimlikleri için { kisiIdler } biçimiyle tek toplu çağrı yapar; öğrencinin kendi indirmesi ve ogrenciDevamDurumu { kisiId } ile. Silinmiş hesabın kayıtları da sayılır.', 'D01 D08\\'i okumadığından yeni iki yönlü çift ya da döngü doğmaz; kişi kimliği başına arama sorgu sayısını öğrenci sayısına bağlardı. Numara anahtarı hesapsız, şube değiştiren ve yeniden kaydolan öğrenciyi tek satırda tutar.'),
  g('D08-A08', 'Kapandı; öbür modüllerin karşılığı: D02 kafa sayısı ve "Ders yapıldı mı?" yazımında devamHesaplaIsiKoy(tx, dersId, null, DEVAM_NEDENLERI.YAPILDI), oturum satırlarında subeIdleri, tur, iptalNedeni, telafiEdilenOturumId, yapildi, baslangicAni ve bitisAni, gece denetimi için denetlenecekDersler(tx, { an, kilittenSonraGun: 30 }). D03 muafı (ders, numara) başına tek değer tutar ve yeni satıra aynı değeri verir; saklama sırası D12 kataloğundadır (devam.donem_verisi yoklama ve listelerden önce, süresi listelerinkinden uzun olamaz), D03 oncekiSiniflar yazmaz. D05 karar ve sayılan değişiminde aynı işlemde iş koyar; sayilanKayitlar(tx, { donemId, oturumIdler }) topludur ve kayıt gerekceKodu ile ulasmaAni taşır. D06 ders başına sayı değil bekleyenYoklamaVar (boolean) verir ve toplu kurulumSonTemaslari(tx, kisiIdler) ekler; canlı hesap ve iş bunu kullanır. D09 girdi kaynağı kaydetmez: D08 duzeltmeleriGetir(tx, { dersId }) ve acikSorunBildirimleri(tx, { dersId }) işlevlerini doğrudan modules/duzeltmeler/yaprak.ts\\'ten, sonDurumOnceligi\\'ni packages/core/src/duzeltmeler\\'den içe aktarır; devamGirdiKaynagiKaydet dış yüzü ve "girdi kaynağı kaydedilmeden işçi açılmaz" denetimi kalktı. D15 DEVAM_SAYIM_TABANI ayarını ve isletim.devam_tutarlilik_farki uyarısını (yalnız farkSayisi > 0) ekler.', 'Yaprak kuralı (ortak kural): D08 D09\\'un index.ts\\'ini içe aktarmaz; D09 D08\\'in index.ts\\'ini (dersSonuclari, sonucuDegistirebilirMi, ogrenciDevamDurumu) ve modules/devam/yaprak.ts\\'i (devamHesaplaIsiKoy) kullanır; devam/yaprak.ts yalnız infra/is-kuyrugu ve sözleşmeyi içe aktarır. Kayıt deseni gerekmediği için açılış sırası bağımlılığı da kalmadı.'),
  g('D08-A09', 'Kapandı: muaf ucunun yolu PUT /v1/devam/dersler/{dersId}/ogrenciler/{satirId}/muaf (contracts.json); değer D03.muafIsaretle\\'nin aldığı liste satırı kimliğidir, hesabı olmayan öğrenci de işaretlenir.', 'Tekrarlayan öğrenci uygulamayı hiç kurmayabilir; numara yola girmez.'),
  g('D08-A12', 'Kapandı: dersSonuclari(tx, subeId, { an, hucreler? }) ve oturumSonDurumlari(tx, subeId, { an, tarihten?, tarihe? }) çağıranın repeatable read işleminde canlı hesaplanır, saklanan oturum_son_durumlari okunmaz; her öğrenci satırı ogrenciNo ve satirId taşır (öğrencinin o şubedeki liste satırı: etkin olan, yoksa en son pasifleşen). KARAR BEKLİYOR nedeni dizidir (ACIK_ISARET, BAGLANTI_YOK birlikte olabilir). Telafi eksiğinin tek tanımı D08-B15\\'tir ve dersSonuclari.telafiEksigi\\'nde döner; D10 yalnız gösterir, tanım farkı sahibe sorulan D02-A02\\'ye gider. D10\\'un hesap bekleme alanı, HESAP_SURUYOR engeli ve anlığın devam_hesapla işlerini beklemesi kalktı.', 'Özet, hücre ve anlık aynı işlemde aynı hesaptan gelince hücre toplamı özetle her an eşittir; saklanan tablo YAPILDI gecikmesi ve kuyruk boyunca geride kalabilir.'),
  g('D08-A14', 'Kapandı: oran ucu PUT /v1/devam/yonetim/dersler/{dersId}/oranlar (contracts.json, "Oran ve muaf" kararı); yetki yönetici rolü ve D01.yetkiDenetle(kimlik, \\'yonetici\\', { birimId }); muaf ucu hocanın olduğu için yerinde kaldı.', 'Yönetici uçları {teknik:sunucu|/v1/<modül>/yonetim/ altındadır}; D13 ikinci rol denetimini bu yol kalıbıyla yapar.'),
  g('D08-A15', 'Kapandı: D09.sonDurumOnceligi girdisine SonDurumKaydi.sayimDisi ve SonDurumOturumu.kilitli eklendi. D08 bu alanları doldurur (sayimDisi: ulaşma anı kilit anından sonra ya da gerekçe SON_GUNDEN_SONRA; kilitli: D02.kilitDurumu kilitli) ve oturum-katmani.ts\\'teki kopya kurallar kalktı; D08 katmanı yalnız kapsam ve MUAF örtüsüdür.', 'D05, D08, D10 ve telefon aynı işlevle aynı sonucu verir; iki uygulama arasında uyuşmazlık doğmaz.'),
];

const contradictions = [`);

// open points closed by the architect
for (const id of ['D08-A07', 'D08-A08', 'D08-A09', 'D08-A10', 'D08-A12', 'D08-A14', 'D08-A15']) dropLine(`  o('${id}', `);
rep(`PLANLANAN için öneri: kapsamdaki, programdan üretilmiş (NORMAL), iptal edilmemiş bütün oturumların saati;`, `PLANLANAN için öneri: kapsamdaki, programdan üretilmiş (tür normal, D02 OTURUM_TURLERI), iptal edilmemiş bütün oturumların saati;`);

fs.writeFileSync(f, s);
console.log('p4 ok');
