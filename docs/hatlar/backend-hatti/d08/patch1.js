// Review fixes for build-d08.js (round 1). Each replacement must match exactly once.
const fs = require('fs');
const f = __dirname + '/build-d08.js';
let s = fs.readFileSync(f, 'utf8');
const Q = "\\'"; // backslash + quote as it appears inside the builder's single-quoted strings
const rep = (a, b) => {
  const n = s.split(a).length - 1;
  if (n !== 1) { console.error('MATCH COUNT ' + n + ' FOR:', a.slice(0, 100)); process.exit(1); }
  s = s.replace(a, () => b);
};
// 1 capitalize summary
rep("const summary = 'devam modülü (D08)", "const summary = 'Devam modülü (D08)");
// 2 subeGetir in read list
rep('D02 dersGetir, dersYetkisi, dersSubeleri,', 'D02 dersGetir, subeGetir, dersYetkisi, dersSubeleri,');
// 3 delay mapping in export purpose
rep("Aynı işlemde aynı (ders, öğrenci) için ikinci çağrı iş eklemez (işlem nesnesine bağlı küme).' },",
  "Aynı işlemde aynı (ders, öğrenci) için ikinci çağrı iş eklemez (işlem nesnesine bağlı küme). Ders geneli YAPILDI işi 5 dakika, OTURUM_KAPANDI işi 15 dakika sonra başlar (isGonder startAfter): ders çıkışı tepesinden sonra çalışır, yalnız zamana bağlı alanları yeniler; öbür nedenler hemen.' },");
// 3b job schedule text
rep('tükenen iş D14' + Q + "ün ölü mektup kuyruğuna.',",
  'tükenen iş D14' + Q + "ün ölü mektup kuyruğuna. Ders geneli YAPILDI 5 dakika, OTURUM_KAPANDI 15 dakika gecikmeyle başlar (ders çıkışı tepesini boşaltmak için; gecikme nedenden koddaki tabloyla belirlenir).',");
// 4 group failure isolation
rep('Hesap veritabanı durumu ve saatin saf fonksiyonudur; satırlar yalnız IS DISTINCT FROM ise yazılır',
  'Her ders grubu ayrı işlemdir; bir grubun hatası yalnız o grubun işlerini başarısız sayar, öbür gruplar tamamlanır (D14' + Q + 'ün parti yardımcısı). Hesap veritabanı durumu ve saatin saf fonksiyonudur; satırlar yalnız IS DISTINCT FROM ise yazılır');
// 5 roles row + delayed note in registrations row
rep("  ['Kayıtlar', 'Eklentide (API ve işçi bileşiminde bir kez):",
  "  ['Yetkiler', 'yoklama_api dört tabloda yalnız SELECT (uçlar D08 tablosuna yazmaz). yoklama_isci devam_sonuclari" + Q + "nda SELECT, INSERT, UPDATE; devam_durumlari ve oturum_son_durumlari" + Q + "nda ayrıca DELETE; devam_seviye_gecmisi" + Q + "nde yalnız INSERT ve SELECT. Satır silme (saklama) yalnız yoklama_goc rolüyle; devam_sonuclari silinince öbür üçü CASCADE ile gider.'],\n  ['Kayıtlar', 'Eklentide (API ve işçi bileşiminde bir kez):");
rep('D04' + Q + 'e oturum kapanış dinleyicisi (hepsi ders geneli devamHesaplaIsiKoy)',
  'D04' + Q + 'e oturum kapanış dinleyicisi (hepsi ders geneli devamHesaplaIsiKoy; YAPILDI ve OTURUM_KAPANDI gecikmeli)');
// 6 oran test: archive case
rep("kilitli dönem 409 DEVAM_DONEM_KILITLI.'),\n  t('Karar bekleyenler ucu'",
  "kilitli dönem 409 DEVAM_DONEM_KILITLI; arşivlenmiş ders 409 DEVAM_DERS_ARSIVDE.'),\n  t('Karar bekleyenler ucu'");
// 7 rephrase record test
rep("t('Kayıt gelince seviye işle güncellenir', 'behavior', 'Yok oturumu yapılınca devam_hesapla aynı işlemde kuyruğa girer;",
  "t('Kayıt gelince seviye işle güncellenir', 'behavior', 'Sayılan kaydı yazan işlemde (D05) ve oturumu yapıldı yapan işlemde (D02) devam_hesapla kuyruğa girer;");
// 8 BAGLANTI only for verified accounts
rep('öğrencinin hesabı var ve D06.kurulumSonTemasi' + Q + 'nın son temas anı',
  'öğrencinin teyitli hesabı var (teyitsiz hesabın gelecek kaydı Beklemede olur, sonucu çeviremez) ve D06.kurulumSonTemasi' + Q + 'nın son temas anı');
rep("BAGLANTI yalnız son oturum bittikten sonra ve hesabı olan öğrencide.'",
  "BAGLANTI yalnız son oturum bittikten sonra ve teyitli hesabı olan öğrencide.'");
// 9 B24 why: explicit relation to the plan's download list
rep("'contracts.json \"Öğrencinin kendi durumu\" kararı ve D06-B11; satır başına sürüm gerekmez, başka öğrencinin verisi inmez ({plan:kararlar-indirme|İndirme}); teyitsiz numara sahiplenmesi başkasının devamını göremez.'",
  "'{plan:kararlar-indirme|Planın indirme listesi} başka öğrencinin verisini dışlamak için \"yalnız\" der; öğrencinin kendi devam durumu ekranın ihtiyacıdır ({plan:kararlar-supheli-kayit|Öğrencinin ekranı: her derste kalan hakkı}) ve contracts.json \"Öğrencinin kendi durumu\" kararı ile D06-B11 bunu öğrenci bölümüne koyar; liste bu anlamda genişler, başka öğrencinin verisi yine inmez. Satır başına sürüm gerekmez; teyitsiz numara sahiplenmesi başkasının devamını göremez.'");
// 10 trigger table delays
rep("'devamHesaplaIsiKoy', 'ders', 'YAPILDI'],", "'devamHesaplaIsiKoy (5 dakika sonra)', 'ders', 'YAPILDI'],");
rep("'oturumKapandiDinleyicisiKaydet', 'ders', 'OTURUM_KAPANDI'],", "'oturumKapandiDinleyicisiKaydet (15 dakika sonra)', 'ders', 'OTURUM_KAPANDI'],");
fs.writeFileSync(f, s);
console.log('patched ok');
