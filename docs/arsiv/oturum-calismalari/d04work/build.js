// Builds the reworked packages/D04.json. Run: node build.js <backend dir>
const fs = require('fs'), path = require('path');
const D = process.argv[2];
const M = 'apps/server/src/modules/saat/', J = 'apps/server/src/jobs/saat/', F = 'apps/server/test/features/saat/', ST = 'apps/server/test/steps/saat/', K = 'packages/core/src/saat/';
const MIG = 'apps/server/migrations/20261020100000_saat_pencere_tablolari/';
const pk = (id, size, title, o) => ({ id: 'D04-P' + id, title, files: o.files, tables: o.tables || [], endpoints: o.endpoints || [], jobs: o.jobs || [], exports: o.exports || [], needs: o.needs || [], tests: o.tests, depends_on: (o.dep || []).map(d => 'D04-P' + d), size, notes: o.notes });
const packages = [
  pk('01', 'S', 'Saat arayüzü ve İstanbul yardımcıları', {
    files: [K + 'saat.ts', 'apps/server/src/infra/saat/index.ts', 'apps/server/src/infra/saat/sistem-saati.ts', 'apps/server/src/infra/saat/istanbul.ts', 'apps/server/src/infra/saat/istanbul.test.ts', 'apps/server/test/support/sahte-saat.ts'],
    exports: ['simdi', 'istanbulTarihi', 'istanbulAni', 'istanbulGunSonuAni', 'duvarSaatiFarkiMs'],
    tests: ['Saat dilimi bağımsızlığı ve İstanbul yardımcıları'],
    notes: 'Kural anlarının tek kaynağı Saat arayüzü, sistem saati, duvar saati farkı, pg-boss saatine bağlı sahte saat ve İstanbul tarih yardımcıları hiçbir modüle bağlanmadan yazılır; istanbul.test.ts yaz saatli ve bugünkü örnekleri TZ=UTC ve TZ=Europe/Istanbul altında iki kez koşar. Hiçbir şey beklemez, simdi ve istanbulTarihi bu yüzden ilk aşamada hazırdır.'
  }),
  pk('02', 'M', 'Saat sözleşmesi, çekirdek tipleri ve belge biçimi', {
    files: ['packages/contracts/src/saat.ts', K + 'sabitler.ts', K + 'tipler.ts', K + 'base64url.ts', K + 'belge.ts', K + 'belge.test.ts', K + 'belge-ornekleri.json'],
    exports: ['ILK_CAPA_DURUMLARI', 'IKINCI_CAPA_DURUMLARI', 'IKINCI_CAPA_YOK_NEDENLERI', 'ILK_CAPA_TELEFON_BILDIRIMLERI', 'SAAT_DURUMLARI', 'SAAT_KAYNAKLARI', 'PENCERE_SONUCLARI', 'KAPANIS_NEDENLERI', 'DEGISIKLIK_TURLERI', 'SAAT_DENETIM_OLAYLARI', 'SAAT_ROTALARI', 'PENCERE_SURESI_OGESI', 'ERKEN_KAPATMA_OGESI', 'SaatOznesi', 'belgeCoz', 'belgeImzaGirdisi', 'KAYMA_PPM', 'BELGE_EN_COK_YAS_MS', 'BELGE_ISTEK_EN_COK_MS', 'BELGE_BAYT', 'BELGE_KARAKTER', 'DEGER_BAYT'],
    needs: ['D13.CihazId', 'D13.KisiId', 'D13.rotaTanimla', 'D13.ogeTuruTanimla', 'D13.genisleyenEnum', 'D13.hataKodlariTanimla', 'D13.anSemasi'],
    tests: ['Belge biçimi kayıtlı örnekle aynı'],
    notes: 'packages/contracts/src/saat.ts (kod sabitleri, denetim olayları, SAAT_ROTALARI, iki öğe şeması, SAAT_ hata kataloğu) ile çekirdeğin sabitleri, SaatOznesi dahil tipleri, base64url kodlayıcısı ve 82 baytlık belge biçimi yazılır; belge.test.ts kayıtlı örnek belgeyi Buffer ve atob silinmiş ortamda bayt bayt denetler. Komşuların beklediği sözleşme sabitleri, SaatOznesi ve sayı sabitleri tanımlandıkları bu pakettedir; yalnız D13 sözleşme dışa verimlerini bekler, çekirdek girişi index.ts beklenmez.'
  }),
  pk('03', 'M', 'Çapa aralığı ve saat sonucu', {
    files: [K + 'capa.ts', K + 'sonuc.ts', K + 'capa.test.ts', K + 'sonuc.test.ts'],
    exports: ['capaAraligi', 'saatSonucu'],
    tests: ['Çapa aralığı gerçek anı kapsar', 'Pay plan formülüne uyar', '7 gün sınırı iki çapada da geçerli', '10 saniyeden uzun belge isteği çapa kurmaz', 'İki çapanın birleşimi', 'Ulaşma anı denetimi', 'Tahmin yalnız kaynak YOK iken boş', 'Başka öznenin belgesi çapa kurmaz'],
    dep: ['02'],
    notes: 'İleri ve geri çapa aralığı (100 ppm kayma payı) ile iki çapayı birleştiren saf saatSonucu yazılır; capa.test.ts ve sonuc.test.ts sabitleri içe aktararak fast-check özellikleri ve sınır tablolarıyla denetler. Yalnız sözleşme ve tipler paketini bekler; pencere hesabıyla aynı aşamada yapılır.'
  }),
  pk('04', 'M', 'Pencere hesabı ve eski program', {
    files: [K + 'pencere.ts', K + 'program.ts', K + 'pencere.test.ts', K + 'program.test.ts'],
    exports: ['pencereHesapla', 'pencereIcindeMi', 'pencereDurumu'],
    tests: ['Pencere sınırı öğrenci lehine ve yarı açık', 'Pencere hesabı varış sırasından bağımsız', 'Aynı kurulumun değişiklikleri sıra düzeninde', 'Değişiklik geçmişe işlemez', 'Kayıt anındaki süre ayarı', 'Eski programla gelen kayıt'],
    dep: ['02'],
    notes: 'Varış sırasından bağımsız pencereHesapla, öğrenci lehine yarı açık pencereIcindeMi, pencereDurumu ve eski program penceresi yazılır; pencere.test.ts ve program.test.ts fast-check özellikleri ve sınır tablolarıyla denetler. Çapa hesabını kullanmaz, yalnız sözleşme ve tipler paketini bekler.'
  }),
  pk('05', 'S', 'Çekirdek girişi ve mutasyon eşiği', {
    files: [K + 'index.ts'],
    tests: ['Saat çekirdeği mutasyon testi'],
    dep: ['01', '02', '03', '04'],
    notes: 'packages/core/src/saat/index.ts çekirdeği tek girişten yeniden dışa verir ve Stryker en az yüzde 90 öldürme eşiği bu modül için kurulur (haftalık iş D15nin). Dışa verimler tanımlandıkları paketlerdedir; bu paketi hiçbir paket beklemez.'
  }),
  pk('06', 'L', 'Saat tabloları ve pencere servisi', {
    files: [M + 'tablolar.ts', MIG + 'migration.sql', MIG + 'snapshot.json', M + 'pencere-servisi.ts', M + 'pencere-kilidi.ts', M + 'surum-damgasi.ts', F + 'pencere-plani.feature', ST + 'pencere-adimlari.ts'],
    tables: ['oturum_pencereleri', 'pencere_degisiklikleri', 'saat_esitleme_kesintileri'],
    exports: ['pencereleriHesapla', 'pencereGetir', 'pencereSonucu'],
    needs: ['D12.tabloYardimcilari', 'D12.kisitAdi', 'D12.Islem', 'D02.dersGetir', 'D02.oturumGetir', 'D02.OturumUretimOlayi', 'D02.OTURUM_DURUMLARI', 'D06.surumDamgasiIste', 'D06.surumAl', 'D15.TestDunyasi'],
    tests: ['Oturum üretimi pencere açar', 'Bileşik yabancı anahtar dönemi korur', 'D02 olayındaki oturum baştan hesaplanır'],
    dep: ['01', '02', '04'],
    notes: 'Üç tablonun Drizzle tanımı ve göçü (bileşik yabancı anahtarlar, sözleşme sabitlerinden CHECK listeleri; göç klasörü D02 oturumlar ve D01 kisiler göçlerinden sonraki zaman damgasını taşır), pencere kilidi, sürüm damgası, pencereleriHesapla, pencereGetir ve FOR KEY SHARE ile okuyan pencereSonucu yazılır. D07 ve D05in beklediği pencereSonucu ve pencereGetir burada hazır olur; paket belge, eşitleme ve eklenti beklemez. pencere-plani.feature D15 test dünyasında atılabilir veritabanıyla denetler; pencere adımları sonraki paketlerin senaryolarınca da kullanılır.'
  }),
  pk('07', 'M', 'Eşitleme durumu ve saat belgesi servisi', {
    files: [M + 'esitleme-durumu.ts', M + 'anahtarlar.ts'
