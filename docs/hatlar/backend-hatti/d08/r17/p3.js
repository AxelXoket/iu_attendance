// Align round, part 3: state machines and invariants. Exact-once replacements.
const fs = require('fs'), f = __dirname + '/../build-d08.js';
let s = fs.readFileSync(f, 'utf8');
const rep = (a, b) => { const n = s.split(a).length - 1; if (n !== 1) throw new Error('count ' + n + ' for: ' + a.slice(0, 90)); s = s.replace(a, () => b); };

rep(`when: 'Beklemede ya da İncelemede kalan karar kilitte donar ve sayılmaz (D07-B17); açık işaret olmaktan çıkar.' },`,
    `when: 'Beklemede ya da İncelemede kalan karar kilitte donar ve sayılmaz (D07-B17): D08 girdide SonDurumOturumu.kilitli true verir, D09 işlevi açık saati Yok yapar; açık işaret olmaktan çıkar.' },`);
rep(`when: 'Kilit anından önce ulaşan geçerli kayıt sayılır. Kilit anından sonra ulaşan kayıt (İncelemede SON_GUNDEN_SONRA) oturumu değiştirmez.' },`,
    `when: 'Kilit anından önce ulaşan geçerli kayıt sayılır. Kilit anından sonra ulaşan kayıt (İncelemede SON_GUNDEN_SONRA) D09 işlevine SonDurumKaydi.sayimDisi true ile gider ve oturumu değiştirmez.' },`);
rep(`ya da son temasta bekleyen öğe bildirilmiş (D06 ders ayırmaz; bütün derslerde bağlanmamış sayılır, öğrencinin lehine);`,
    `ya da son temasta bekleyen yoklama kaydı bildirilmiş (D06 bekleyenYoklamaVar; ders ayırmaz, bütün derslerde bağlanmamış sayılır, öğrencinin lehine);`);

rep(`'oturum_son_durumlari satırının saatleri ve son durumu D09.sonDurumOnceligi\\'nin o türdeki çıktısına eşittir; D08 yalnız kapsamı, son günden sonra gelen kaydın dışlanmasını, kilitte donan kararı ve MUAF örtüsünü uygular. İkinci bir bölüşüm kuralı yoktur.',`,
    `'oturum_son_durumlari satırının saatleri ve son durumu D09.sonDurumOnceligi\\'nin o türdeki çıktısına eşittir; D08 yalnız kapsamı seçer, girdide SonDurumKaydi.sayimDisi ve SonDurumOturumu.kilitli alanlarını doldurur ve MUAF örtüsünü uygular. İkinci bir bölüşüm ya da süzgeç kuralı yoktur.',`);
rep(`'Ulaşma anı birimin kilit anından sonra olan ya da gerekçesi SON_GUNDEN_SONRA olan kayıt sayıma, oturum satırına, açık işarete ve BAGLANTI_YOK\\'a girmez;`,
    `'Ulaşma anı birimin kilit anından sonra olan ya da gerekçesi SON_GUNDEN_SONRA olan kayıt D09 işlevine sayimDisi true ile verilir; sayıma, oturum satırına, açık işarete ve BAGLANTI_YOK\\'a girmez;`);
rep(`'Muaf ders ve numara düzeyindedir: aynı numaranın bu dersteki satırlarından biri muafsa öğrenci muaftır; muaf ucu numaranın bütün satırlarını aynı işlemde yazar.',`,
    `'Muaf (ders, numara) başına tek değerdir: D03.muafIsaretle numaranın dersteki bütün satırlarına aynı değeri yazar, şube değişiminde ya da yeniden eklemede açılan satır aynı değeri alır; devam_sonuclari.muaf bu değerdir.',`);
rep(`'D08 başka modülün tablosuna yazmaz: p D02.oranlariYaz, muaf D03.muafIsaretle, denetim D09.denetimeYaz ile ve değişiklikle aynı işlemde yazılır.',`,
    `'D08 başka modülün tablosuna yazmaz: p D02.oranlariYaz, muaf D03.muafIsaretle, denetim D09.denetimeYaz ile ve değişiklikle aynı işlemde yazılır. Saklama işleyicisi yoklama_saklama altında yalnız D08 tablolarında SELECT ve DELETE yapar, başka modülün dış yüzünü ve tablosunu kullanmaz.',`);
rep(`'dersSonuclari, oturumSonDurumlari, karar bekleyenler ucu ve sonucuDegistirebilirMi çağıranın işleminde, çağıranın verdiği tek "şimdi" ile canlı hesaplar;`,
    `'dersSonuclari, oturumSonDurumlari, karar bekleyenler ucu ve sonucuDegistirebilirMi çağıranın repeatable read işleminde (current_setting(\\'transaction_isolation\\') denetlenir), çağıranın verdiği tek "şimdi" ile canlı hesaplar;`);
rep(`  'D08 D09\\'un index.ts dosyasını içe aktarmaz: D09\\'un okuma işlevleri D08\\'in girdi kaynağı kaydıyla bağlanır; D08 yalnız D09\\'un yaprağını (denetimeYaz) ve saf son durum işlevini kullanır (dependency-cruiser no-circular).',`,
    `  'D08 D09\\'u yalnız modules/duzeltmeler/yaprak.ts (denetimeYaz, duzeltmeleriGetir, acikSorunBildirimleri) ve packages/core/src/duzeltmeler (sonDurumOnceligi, SON_DURUMLAR) üstünden içe aktarır, D09\\'un index.ts\\'ini hiç içe aktarmaz; D09 D08\\'in index.ts\\'ini ve modules/devam/yaprak.ts\\'i kullanır; devam/yaprak.ts yalnız infra/is-kuyrugu ve sözleşmeyi içe aktarır. D13\\'ün sınır testi (dependency-cruiser no-circular ve yaprak kuralı) sıfır ihlalle koşar.',
  'Her ders grubu işleminin (devam_hesapla ve gece denetimi) ilk kilidi \\'devam:hesap:<dersId>\\' danışma anahtarıdır (katman 1, D12.danismaKilidi); sonra D08 satırları öğrencinin kanonik sırasıyla (D09-B32), en son D06.ogrenciDurumuDegisti aynı sırayla. Elle pg_advisory_xact_lock yoktur; D08 genel sayaç almaz.',
  'dersId taşıyan her devam denetim olayı birimId de taşır; olay türleri (devam.muaf_degisti, devam.oran_degisti) DEVAM_DENETIM_OLAYLARI\\'ndadır ve D09.denetimOlaylariniKaydet ile kaydolur.',
  'Canlı sonuçların her öğrenci satırı ogrenciNo ve satirId taşır; satirId öğrencinin o şubedeki liste satırıdır: etkin olan, yoksa en son pasifleşen.',`);

fs.writeFileSync(f, s);
console.log('p3 ok');
