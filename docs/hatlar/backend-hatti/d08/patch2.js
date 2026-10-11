// Review fixes for build-d08.js (round 2). Each replacement must match exactly once.
const fs = require('fs');
const f = __dirname + '/build-d08.js';
let s = fs.readFileSync(f, 'utf8');
const Q = "\\'";
const rep = (a, b) => {
  const n = s.split(a).length - 1;
  if (n !== 1) { console.error('MATCH COUNT ' + n + ' FOR:', a.slice(0, 100)); process.exit(1); }
  s = s.replace(a, () => b);
};
// 1 nightly job: where the difference count goes (D08 cannot call D15)
rep('Fark > 0 "hesabın elle hesaplananla uyuşmazlığı 0" hedefinin ihlalidir ve isletim uyarısına (D15) gider.',
  'Aynı sayılar pg-boss iş çıktısına da yazılır; fark > 0 "hesabın elle hesaplananla uyuşmazlığı 0" hedefinin ihlalidir. D08 D15' + Q + 'i çağırmaz: uyarıyı D15' + Q + 'in isletim_denetimi iş çıktısından açar (D08-A08).');
// 2 A08: add D15 items
rep("duzeltmeleriGetir süzgeci {dersId, ogrenciIdler?}.', false, 'D02, D05, D06, D09'),",
  "duzeltmeleriGetir süzgeci {dersId, ogrenciIdler?}. D15: ayar şemasına DEVAM_SAYIM_TABANI (ilk sürümde yalnız YAPILAN); isletim_denetimi devam_tutarlilik_denetimi çıktısındaki farkSayisi > 0 için işletim uyarısı açar.', false, 'D02, D05, D06, D09, D15'),");
// 3 registrations row: outage-close listener explicitly not registered
rep('D04' + Q + 'e oturum kapanış dinleyicisi (hepsi ders geneli devamHesaplaIsiKoy; YAPILDI ve OTURUM_KAPANDI gecikmeli)',
  'D04' + Q + 'e oturum kapanış dinleyicisi (hepsi ders geneli devamHesaplaIsiKoy; YAPILDI ve OTURUM_KAPANDI gecikmeli; kesinti kapanışına dinleyici yok, çünkü kesinti sonrası değişen kararları D07 verir, D05 yazar ve D05 tetikler)');
// 4 tables intro: executed-DDL evidence
rep("Hak, tür kararı ve yüzde CHECK ile veritabanında da hesaplanır: kod hatası bozuk değer yazdıramaz ({teknik:veritabani|Kısıtlar}).');",
  "Hak, tür kararı ve yüzde CHECK ile veritabanında da hesaplanır: kod hatası bozuk değer yazdıramaz ({teknik:veritabani|Kısıtlar}). Bu DDL tasarım sırasında PostgreSQL 17.5 (PGlite; uuidv7 yerine yalnız testte gen_random_uuid) üstünde çalıştırıldı: kural modelinden üretilen 1.718 geçerli satır kabul edildi, 26 kısıtın her biri yalnız kendi kuralını bozan satırı adıyla reddetti, saklama silmesi CASCADE ile çocukları götürdü (betik d08/pg/ddl-test.mjs).');");
// 5 exports details: where the types live
rep("details('Dış yüz: sözleşmedeki dört işlev', () => { table(['İşlev', 'İmza', 'Amaç'], exports_.map(x => [x.name, `\\`${x.signature}\\``, x.purpose])); });",
  "details('Dış yüz: sözleşmedeki dört işlev', () => { p('Tipler: Islem D12' + Q + 'nin; DersId, SubeId, OturumId, OgrenciId, DonemId, KayitId D13' + Q + 'ün ortak markalı kimlikleri (packages/contracts/src/ortak); DevamNedeni, DevamTetikleyenTuru, SubeDevamSonuclari, OgrenciDevamDurumu packages/contracts/src/devam.ts içinde.'); table(['İşlev', 'İmza', 'Amaç'], exports_.map(x => [x.name, `\\`${x.signature}\\``, x.purpose])); });");
fs.writeFileSync(f, s);
console.log('patched ok');
