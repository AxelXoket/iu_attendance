// One-off: applies align/D12.json to d12work/spec-data.js (the source build.js reads).
// Every replacement asserts its old text occurs exactly once; re-running on the new file fails loudly.
'use strict';
const fs = require('fs');
const path = require('path');
const SRC = process.argv[2];
if (!SRC) throw new Error('usage: node apply.js <spec-data.js>');
let src = fs.readFileSync(SRC, 'utf8');
delete require.cache[require.resolve(SRC)];
const D = JSON.parse(JSON.stringify(require(SRC)));

const once = (hay, old, where) => {
  const n = hay.split(old).length - 1;
  if (n !== 1) throw new Error(`${where}: expected 1 occurrence, got ${n}: ${old.slice(0, 90)}`);
};
const rep = (s, old, neu, where) => { once(s, old, where); return s.replace(old, () => neu); };
const byName = (arr, key, val) => { const x = arr.find(o => o[key] === val); if (!x) throw new Error('missing ' + val); return x; };

// ---------- summary (text level, it stays a one-line literal) ----------
src = rep(src, `yalnız giriş noktası cli/geri-yukleme D01'in dış yüzünü kullanır.`, `yalnız bileşim kökü cli/geri-yukleme D01'in dış yüzünü kullanır ve kimlik dinleyicilerini dört aboneyle kurar.`, 'summary');

// ---------- endpoints ----------
{
  const e = D.endpoints[0];
  const i = e.errors.indexOf('503 API_SUNUCU_YOGUN ve Retry-After: havuz dolu, bağlantı ya da kilitlenme (islem çevirir, D13 zarflar)');
  const j = e.errors.indexOf('503 API_SORGU_ZAMAN_ASIMI: deyim süresi aşıldı (57014)');
  if (i < 0 || j !== i + 1) throw new Error('endpoint errors');
  e.errors.splice(i, 2, `503 VERITABANI_HAVUZ_DOLU, VERITABANI_KILITLENME, VERITABANI_ERISILEMEZ, VERITABANI_ZAMAN_ASIMI ya da VERITABANI_NESIL_BELIRSIZ ve Retry-After 15 ile 45 saniye: islem çevirir, D13'ün ortukKodlar'ı ekler, rota beyan etmez`);
}

// ---------- jobs ----------
{
  const s = byName(D.jobs, 'name', 'saklama_suresi_isi');
  s.does = rep(s.does, `Açılışta denetler: sureler.ts'teki her anahtar SAKLAMA_VERI_SINIFLARI'nda ve işleyicisi kayıtlı; süresi olan bir sınıftan önce işlenmesi gereken her sınıfın da süresi ve işleyicisi var; katalogda döngü yok. Değilse hiçbir sınıfa dokunmadan VERITABANI_SAKLAMA_ISLEYICI_YOK ya da VERITABANI_SAKLAMA_BAGIMLI_SURESIZ ile düşer, D15 uyarır.`,
    `Açılışta denetler: sureler.ts'teki her anahtar SAKLAMA_VERI_SINIFLARI'nda ve işleyicisi kayıtlı; süre sırası kuralı tutuyor (başvuran sınıfın süresi oncesinde listesindeki sınıflarınkinden, devam ve raporlar sınıflarınınki kopyaKaynagi olan listeler.donem_verisi'ninkinden uzun değil; süresiz sınıf en uzun sayılır); katalogda döngü yok. Değilse hiçbir sınıfa dokunmadan VERITABANI_SAKLAMA_ISLEYICI_YOK, VERITABANI_SAKLAMA_SURE_SIRASI ya da VERITABANI_SAKLAMA_DONGU ile düşer, D15 uyarır.`, 'job saklama');
  const g = byName(D.jobs, 'name', 'geri_yukleme_denemesi');
  g.does = rep(g.does, `(4) xprem birimi ve veritabanı geri getirilip bir güncellemenin indiği denenir.`,
    `(4) xprem birimi ve veritabanı geri getirilip bir güncellemenin indiği denenir; xprem ana anahtarı canlı env dosyasından değil, son döndürmede çevrimdışı arşivden çıkarılıp /opt/iu-yoklama/deneme/xprem-ana-anahtar (0400) dosyasına konan kopyadan alınır, böylece adım yedekteki anahtarı da sınar; dosya yoksa ya da izni 0400 değilse VERITABANI_DENEME_ANAHTAR_YOK.`, 'job deneme');
  for (const j of D.jobs) if (j.yer.startsWith('ana makine')) {
    if (!/durum dosyas/.test(j.does)) throw new Error('machine job without status file: ' + j.name);
  }
}

// ---------- state machines ----------
{
  const sm = n => byName(D.state_machines, 'name', n);
  const tr = (m, from, to) => { const t = m.transitions.filter(x => x.from === from && x.to === to); if (t.length !== 1) throw new Error(`transition ${from}>${to}: ${t.length}`); return t[0]; };
  const goc = sm('goc_adimi (db:migrate içindeki D12 adımı: veritabani:goc)');
  const t1 = tr(goc, 'drizzle_goc', 'tamam');
  t1.when = rep(t1.when, `sıradaki adım D14'ün pg-boss migrate ve kuyruk adımı.`, `sıradaki adımlar pg-boss migrate, en son worker.ts'in kur adımı (D14).`, 'goc tamam');
  const sak = sm('saklama_sinifi (bir gecede bir veri sınıfı)');
  const t2 = tr(sak, 'suresi_var', 'basarisiz');
  t2.when = rep(t2.when, `Süre var ama işleyici yok ya da önceki sınıfın süresi yok; açılış denetimi işi hiçbir sınıfa dokunmadan düşürür.`,
    `Süre var ama işleyici yok ya da süre sırası kuralı tutmuyor; açılış denetimi işi hiçbir sınıfa dokunmadan düşürür (VERITABANI_SAKLAMA_ISLEYICI_YOK, VERITABANI_SAKLAMA_SURE_SIRASI).`, 'saklama basarisiz');
  const t2b = tr(sak, 'suresi_var', 'parti_isleniyor');
  t2b.when = rep(t2b.when, `Süre var, işleyici kayıtlı, bu sınıftan önce`, `Süre var, işleyici kayıtlı, süre sırası tutuyor, bu sınıftan önce`, 'saklama parti');
  const gy = sm('geri_yukleme (gerçek dönüş: docker/postgres/yedek/geri-yukle.sh ve cli/geri-yukleme)');
  const t3 = tr(gy, 'kaydedildi', 'iptaller_uygulandi');
  t3.when = rep(t3.when, `Komut 0 ile bitti: bütün panel oturumları`, `Komut 0 ile bitti: önce D01.kimlikDinleyicileriniKur dört aboneyle (dersler D02, esitleme D06, projeksiyon D11, isletim D15) kuruldu ve kimlikDinleyicileriHazir geçti; bütün panel oturumları`, 'iptaller');
  const yd = sm('yedek_isi (makine işleri: pgBackRest, döküm, xprem birimi, deneme)');
  const t4 = tr(yd, 'calisiyor', 'basarili');
  t4.when = rep(t4.when, `durum dosyasında sonBasariAni bu çalışmanın bitişi olur.`, `durum dosyasında sonSonuc basarili, sonBasariAni bu çalışmanın bitişi, ardisikAtlanan 0 olur.`, 'yedek basarili');
  const t5 = tr(yd, 'calisiyor', 'basarisiz');
  t5.when = rep(t5.when, `hata kodu durum dosyasına, sonBasariAni önceki dosyadan aynen taşınır.`, `hata kodu durum dosyasına, sonBasariAni önceki dosyadan aynen taşınır, ardisikAtlanan 0 olur.`, 'yedek basarisiz');
  const t6 = tr(yd, 'calisiyor', 'atlandi');
  t6.when = rep(t6.when, `sonBasariAni taşınır, böylece`, `sonBasariAni taşınır, ardisikAtlanan bir artar, böylece`, 'yedek atlandi disk');
  for (const t of yd.transitions.filter(x => x.from === 'kilit_bekliyor' && x.to === 'atlandi')) t.when += ' sonBasariAni taşınır, ardisikAtlanan bir artar.';
  for (const t of yd.transitions) t.when = t.when.replace(/ \. /g, '. ');
}

// ---------- invariants ----------
{
  const inv = D.invariants;
  const idx = pre => { const i = inv.findIndex(x => x.startsWith(pre)); if (i < 0) throw new Error('invariant ' + pre); return i; };
  inv[idx('Göçler yalnız ileri gider')] = `Göçler yalnız ileri gider; her göç klasörü <14 haneli UTC (YYYYMMDDHHMMSS)>_<belirteç>_<açıklama> adını taşır ve zaman damgası ana daldaki en yeni klasörden büyüktür; belirteç GOC_BELIRTECLERI'nden en uzun eşleşmeyle okunur; göç yalnız belirtecin modülünün tablo, dizin, kısıt ve işlevlerine dokunur (tek istisna isletim göçünün başka tabloları yalnız okuyan olcum_ önekli görünümleri), satır yazmaz ve SET LOCAL lock_timeout = '3s', SET LOCAL statement_timeout = '60s' ile başlar; ana dala girmiş göç klasörü bir daha değişmez; ana dalda drizzle-kit generate fark üretmez ve drizzle-kit check temizdir.`;
  let i = idx('API süreçlerinde (yoklama_api)');
  inv[i] = rep(inv[i], '503 API_SUNUCU_YOGUN döner', '503 VERITABANI_HAVUZ_DOLU döner', 'inv havuz');
  i = idx('nesilOku iki kaynaktan');
  inv[i] = rep(inv[i], '(503 API_SUNUCU_YOGUN, log nedeni nesil_belirsiz)', '(503 VERITABANI_NESIL_BELIRSIZ)', 'inv nesil');
  i = idx('Test sıfırlaması göç defterine');
  inv[i] = rep(inv[i], 'Test sıfırlaması göç defterine ve pgboss şemasına dokunmaz;', `Test sıfırlaması göç defterine ve pgboss şemasına dokunmaz, pgboss'a yalnız D14'ün isKuyrugunuBosalt'ı dokunur;`, 'inv sifirlama');
  i = idx('Bir işlem danismaKilidi');
  inv[i] = `Danışma kilitleri yalnız danismaKilidi ve danismaKilidiDene ile, DANISMA_KATMANLARI'nda katmanı olan anahtarla alınır; bir işlemde yeni her anahtar (katman, anahtar metni) sırasında işlemin tuttuğu bütün anahtarlardan sonra gelir ya da beklemeden denenir; kilit sırası her işlemde danışma anahtarları, satırlar, iş kuyruğu ve öğrenci sürümü, en son genel sayaçtır.`;
  inv.splice(i + 1, 0,
    `islemSonuKancasi kancaları yalnız commit edilecek denemede, fn döndükten sonra ve COMMIT'ten önce kayıt sırasıyla çalışır; geri alınan SAVEPOINT'te kaydedilen ya da yeniden denenen denemeye ait kanca çalışmaz; kanca hatası işlemi geri alır.`,
    `Saklama süreleri sıra kuralına uyar: başvuran sınıfın süresi başvurduğu sınıfınkinden, devam ve raporlar sınıflarınınki listeler.donem_verisi'ninkinden uzun değildir (süresiz en uzundur); uymayan ayarda saklama işi hiçbir sınıfa dokunmaz.`);
}

// ---------- exports (plain names, note field) and contracts file ----------
{
  const old = Object.fromEntries(D.exportsList.map(e => [e.name, e]));
  const g = n => { if (!old[n]) throw new Error('export ' + n); return old[n]; };
  const vk = g('veritabani');
  let vkNote = rep(vk.purpose, `Contracts'taki veritabani: bileşim kökü`, `contracts.json'daki veritabaniKur(ayar): Veritabani { islem, semaDurumu, kapat, db, havuz } satırı (I058). Bileşim kökü`, 'vk1');
  vkNote = rep(vkNote, ` contracts.json'daki 'veritabani: Drizzle bağlantısı ve havuz' girişi bu biçimle güncellenir (istek).`, '', 'vk2');
  const islemOld = g('islem');
  if (!islemOld.purpose.includes("40P01 ve 40001'de")) throw new Error('islem purpose');
  const nesil = g('nesilOku');
  const sik = g('saklamaIsleyicisiKaydet');
  const sic = g('saklamaIsleyicisiniCalistir (ek: test ve elle çalıştırma)');
  const tvh = g('testVeritabaniHazirla');
  const sos = g('senaryoOncesiSifirla ve testVeritabaniAdi (ek, contracts listesine eklenir)');
  const ty = g('tabloYardimcilari (ek, contracts listesine eklenir)');
  const ki = g('kisitIhlali (ek, contracts listesine eklenir)');
  const ve = g('veritabaniEklentisi (ek: uç sahibi her modül gibi)');
  const vi = g('veritabaniIsleri (ek: jobs/veritabani/index.ts)');
  const sd = g('Sözleşme dosyası (packages/contracts/src/veritabani.ts)');
  const [sosSig1, sosSig2] = sos.signature.split('; ');
  if (!sosSig1.startsWith('senaryoOncesiSifirla(') || !sosSig2.startsWith('testVeritabaniAdi(')) throw new Error('sos split');
  let sosNote = rep(sos.purpose, ` İş kuyruğunu D15'in kancası D14 üzerinden deleteAllJobs ile temizler. testVeritabaniAdi işçi numarasından yoklama_test_<n> adını verir.`, ` pgboss şemasına yalnız D14'ün isKuyrugunuBosalt'ı (deleteAllJobs) dokunur; onu D15'in senaryo kancası çağırır (I075).`, 'sos');
  const viSig = rep(vi.signature, `sureAsimiSaniye: 2400 | 120;`, `sureAsimiSaniye?: number;`, 'vi sig');
  const viNote = vi.purpose + ` sureAsimiSaniye isteğe bağlıdır, verilmezse D14 1800 saniye kullanır; D12'nin iki öğesi 2400 ve 120 verir (I075).`;

  D.exportsList = [
    { name: 'veritabaniKur', signature: vk.signature, note: vkNote },
    { name: 'Islem', signature: g('Islem (tip)').signature, note: 'Tip. ' + g('Islem (tip)').purpose },
    { name: 'islem', signature: islemOld.signature, note: `contracts.json'daki islem(fn, secenek?) satırı: Veritabani.islem; saltOkunur, yalitim, zamanAsimiMs, yenidenDene. Varsayılan READ COMMITTED; yalitim repeatable_read'de BEGIN ISOLATION LEVEL REPEATABLE READ, saltOkunur'da READ ONLY eklenir (Drizzle transaction isolationLevel ve accessMode). Yalıtım yalnız BEGIN'de verilir, fn içinde SET TRANSACTION yazılmaz. zamanAsimiMs SET LOCAL statement_timeout verir: rol varsayılanının altına her işlemde inebilir, üstüne yalnız salt okunur işlemde ve en çok 15000 ms çıkar; ağır rota değeri D13.kalanSureMs ile küçültüp verir (min(15000, kalanSureMs)); 1'den küçük değer işlem açılmadan VERITABANI_ZAMAN_ASIMI olur, çünkü statement_timeout 0 sınırsız demektir. 40P01 ve 40001'de (REPEATABLE READ'in yazma çakışması dahil) fn'yi 50 ile 150 ms rastgele bekleyip bir kez baştan çalıştırır; önceki denemenin kancaları ve danışma anahtarı izi silinir. Geçici hataları packages/contracts/src/ortak/hata.ts'teki GECICI_SQLSTATELER'den okunan türle kendi 503 kodlarına çevirir (SQLSTATE önce tam, sonra iki haneli sınıf olarak aranır): kilitlenme (tek yeniden denemeden sonra 40P01 ya da 40001, 55P03) VERITABANI_KILITLENME; havuz (53300, havuz bekleme süresinin dolması) VERITABANI_HAVUZ_DOLU; erişilemez (57P01, 57P02, 57P03, 25P03, 08 sınıfı; ayrıca yazan işlemde pg_is_in_recovery() doğruyken 25006) VERITABANI_ERISILEMEZ; zaman aşımı (57014, 25P04) VERITABANI_ZAMAN_ASIMI; nesil belirsizliği VERITABANI_NESIL_BELIRSIZ. Hepsi UygulamaHatasi'dır, http 503 ve bekleme { aralik: [15, 45] }; D13'ün ortukKodlar'ı onları her rotaya ekler, rotalar beyan etmez (I068). Öteki hatalar, salt okunur işlemde 25006 dahil (programlama hatası), değer taşımayan VeritabaniHatasi olur ve D13'te 500 API_SUNUCU_HATASI'na düşer. Her iki durumda { neden, sqlstate, kisit, tablo } hatanın cause alanında yalnız log içindir, zarfa girmez; VeritabaniHatasi pg sürücüsünün code alanını da aynı SQLSTATE ile taşır. fn içinde yakalanan hata (SAVEPOINT yolu, kisitIhlali) çevrilmez. tx.transaction ile açılan iç işlem (SAVEPOINT) kök işlemin kanca ve danışma anahtarı izini paylaşır. Dış yüzler tx'i parametre alır.` },
    { name: 'islemSonuKancasi', signature: `islemSonuKancasi(tx: Islem, kanca: () => Promise<void>): void`, note: `Kancayı tx'in en dış işlemine bağlar (iç SAVEPOINT tx'i verilse de). Kancalar islem'in fn'si döndükten sonra ve COMMIT'ten önce, aynı işlemde ve kayıt sırasıyla çalışır; kanca çalışırken kaydedilen kanca sona eklenip aynı turda çalışır. Kanca fırlatırsa işlem geri alınır ve hata çağırana gider (veritabanı hatasıysa islem'in çevirisinden geçer; kancadaki 40P01 ya da 40001 bütün işlemi bir kez yeniden çalıştırır). Geri alınan bir SAVEPOINT içinde kaydedilen kanca düşer; 40P01 ya da 40001 sonrası fn baştan çalışırken önceki denemenin kancaları silinir. islem'in açmadığı tx verilirse VERITABANI_ISLEM_TANINMIYOR atar. D06 sürüm damgası denetimini bununla yapar: damgalı işlem surumAl'sız biterse kanca işlemi geri alır (I019).` },
    { name: 'nesilOku', signature: nesil.signature, note: rep(nesil.purpose, `uyuşmazsa UygulamaHatasi('API_SUNUCU_YOGUN') atar (cause.neden nesil_belirsiz).`, `uyuşmazsa UygulamaHatasi('VERITABANI_NESIL_BELIRSIZ') atar.`, 'nesil') },
    { name: 'danismaKilidi', signature: `danismaKilidi(tx: Islem, anahtarlar: readonly DanismaAnahtari[]): Promise<void>; type DanismaAnahtari = string | { anahtar: string; kip: 'paylasimli' }`, note: `Bekleyen danışma kilidi (contracts.json ortak kural 'Danışma kilidi katmanları'; I014, I053, I118). Anahtar '<modül>:<kural>:<iç kimlikler>' metnidir, numara ya da isim taşımaz; katmanı önekinden DANISMA_KATMANLARI tablosuyla bulunur (önce '<modül>:<kural>', yoksa '<modül>:*'); bilinmeyen önek her ortamda VERITABANI_DANISMA_ONEK_BILINMIYOR atar. Bir çağrının anahtarları önce katmana, sonra anahtar metnine (kod birimi sırası, yerel sıralama yok) göre sıralanıp sırayla alınır: dışlayıcı kip (varsayılan) pg_advisory_xact_lock, paylasimli kip pg_advisory_xact_lock_shared, ikisi de hashtextextended(anahtar, 0) ile tek bigint uzayında. D12 kök işlem başına tutulan anahtarları kipiyle ve sıradaki en büyük (katman, anahtar) değerini izler: tutulan anahtar aynı ya da daha zayıf kipte yeniden istenirse işlem yapılmaz; paylaşımlı tutulanın dışlayıcı istenmesi yeni anahtar sayılır. Yeni anahtar bu en büyük değerden sonra gelmiyorsa geliştirmede ve testte VERITABANI_DANISMA_SIRA atar, yayında uyarı loglar (anahtar ve önceki en büyük değer; kişisel veri yok) ve kilidi yine alır; 40P01 ve 40001'de islem'in tek yeniden denemesi son güvence olarak kalır. Geri alınan SAVEPOINT'te alınan anahtar izden düşer (PostgreSQL de işlem düzeyi kilidi o anda bırakır). Bir işlem birden çok kez çağırabilir; çok öğeli işlem (gönderim paketi, toplu karar isteği, liste yazması) öğelerin anahtarlarını saf anahtar işlevleriyle (D05 yoklamaCiftAnahtari, D07 kararAnahtarlari, dogrulamaTeyitAnahtari, dogrulamaListeAnahtari, D03 listeKovaAnahtari, D11 qrKilitAnahtarlari) baştan toplar ve tek çağrıda alır. Sıra: danışma anahtarları, satırlar, iş kuyruğu (D14.isGonder) ve öğrenci sürümü (D06.ogrenciDurumuDegisti), en son genel sayaç (D06.surumAl, bir kez). Elle pg_advisory_xact_lock yazılmaz (Biome kuralı elle-danisma-kilidi.grit; D14'ün adres kilidi is-kuyrugu:eposta:<özet> da bununla, I060).` },
    { name: 'danismaKilidiDene', signature: `danismaKilidiDene(tx: Islem, anahtar: DanismaAnahtari): Promise<boolean>`, note: `Beklemeyen deneme: pg_try_advisory_xact_lock ya da pg_try_advisory_xact_lock_shared, danismaKilidi ile aynı hashtextextended uzayı ve önek kuralı. Sıra kuralından bağımsızdır; sırada geride kalan yeni anahtar yalnız bununla alınır. true dönerse anahtar kipiyle tutulanlara eklenir (en büyük değer de güncellenir); false dönerse hiçbir şey alınmaz, çağıran TEKRAR_DENE döner ya da işi yeniden dener. Tutulan anahtar aynı ya da daha zayıf kipte istenirse sorgusuz true döner. D07'nin kararHesapla'sı bağlam anahtarlarını böyle dener (I101).` },
    { name: 'saklamaIsleyicisiKaydet', signature: sik.signature, note: rep(sik.purpose, `Sıra katalogdan gelir, işleyici bağımlılık bildirmez.`, `Sıra ve süre kuralı katalogdan gelir; kayıtta sıra ya da oncekiSiniflar yoktur, işleyici bağımlılık bildirmez (I025).`, 'sik') },
    { name: 'saklamaIsleyicisiniCalistir', signature: sic.signature, note: 'Test ve elle çalıştırma için. ' + sic.purpose },
    { name: 'kisitAdi', signature: g('kisitAdi').signature, note: g('kisitAdi').purpose },
    { name: 'kisitIhlali', signature: ki.signature, note: ki.purpose },
    { name: 'tabloYardimcilari', signature: ty.signature, note: ty.purpose + ` D14'ün eposta_gonderimleri tablosu da bununla tanımlanır ve göçü tablo haritası denetiminden geçer (I075).` },
    { name: 'donemBolumuAc', signature: `donemBolumuAc(tx: Islem, donemId: string): Promise<void>`, note: `D02 dönem açan işlemde çağırır (I063). TABLO_ISARETLERI'nde donem_bolunebilir işaretli ve katalogda bölünmüş (relkind p) her tablo için dönemin bölümünü uygulama.veritabani_donem_bolumu_ac işleviyle açar (yoklama_sahip sahipli SECURITY DEFINER, uygulama rollerine yalnız EXECUTE, lock_timeout 3 s; D12-B14). Bölünmüş tablo yoksa (bugün) ya da bölüm zaten varsa hiçbir şey yapmaz; bu yolda yalnız katalog okunur, işlevin varlığı aranmaz.` },
    { name: 'geriYuklemePencereleri', signature: `geriYuklemePencereleri(tx: Islem): Promise<readonly { hedefAni: Date; kayipPencereSonu: Date }[]>`, note: `geri_yukleme_kayitlari'ndan hedef_ani ve kayip_pencere_sonu_ani okur, hedefAni artan sırada; kayıt yoksa boş dizi. app.ts D11'e eklenti seçeneğiyle verir (I053); D11 kayıp penceredeki kayıtları buna göre değerlendirir. Tablo dönüş başına tek satır tutar.` },
    { name: 'testVeritabaniHazirla', signature: tvh.signature, note: tvh.purpose },
    { name: 'senaryoOncesiSifirla', signature: sosSig1, note: sosNote },
    { name: 'testVeritabaniAdi', signature: sosSig2, note: `Cucumber işçi numarasından yoklama_test_<n> adını verir; testVeritabaniHazirla ve D15'in kancaları aynı adı kullanır.` },
    { name: 'veritabaniEklentisi', signature: ve.signature, note: 'Uç sahibi her modül gibi eklenti verir. ' + ve.purpose },
    { name: 'veritabaniIsleri', signature: viSig, note: 'jobs/veritabani/index.ts. ' + viNote },
  ];

  let sdSig = rep(sd.signature, `export const VERITABANI_HATALARI = hataKodlariTanimla('veritabani', { VERITABANI_IMLEC_GECERSIZ: { http: 400, hoca, ogrenci } }); export const VERITABANI_ISLETIM_KODLARI: readonly VeritabaniIsletimKodu[];`,
    `export const VERITABANI_HATALARI = hataKodlariTanimla('veritabani', { VERITABANI_IMLEC_GECERSIZ: { http: 400, hoca, ogrenci }, [VERITABANI_KILITLENME | VERITABANI_HAVUZ_DOLU | VERITABANI_ERISILEMEZ | VERITABANI_ZAMAN_ASIMI | VERITABANI_NESIL_BELIRSIZ]: { http: 503, hoca, ogrenci, bekleme: { aralik: [15, 45] } }, [işletim, CI ve test kodları]: { http: null, hoca: null, ogrenci: null } }); export type DanismaAnahtari = string | { anahtar: string; kip: 'paylasimli' }; export const DANISMA_KATMANLARI: Readonly<Record<string, 1 | 2 | 3 | 4 | 5>>;`, 'sd sig');
  sdSig = rep(sdSig, `oncesinde: readonly SaklamaVeriSinifi[] }[];`, `oncesinde: readonly SaklamaVeriSinifi[]; kopyaKaynagi?: SaklamaVeriSinifi }[];`, 'sd sig2');
  D.contractsFile = {
    path: 'packages/contracts/src/veritabani.ts',
    signature: sdSig,
    note: `Dış yüz girişi değildir; D12'nin sözleşme sabitlerinin tek kaynağıdır. Uç şemaları ve rota beyanı (D13 birleştirir). VERITABANI_HATALARI D12'nin tek kataloğudur ve TUM_HATALAR'a bütünüyle girer: VERITABANI_IMLEC_GECERSIZ (400; hoca: 'Liste sayfası açılamadı. Sayfayı yenileyip yeniden deneyin.', ogrenci: 'Bu sayfa açılamadı.'); beş geçici kod (503, bekleme aralik [15, 45]; hoca ve ogrenci metni D13'ün API_SUNUCU_YOGUN metniyle aynı: 'Sunucu şu an yoğun; birazdan yeniden denenecek.'), ortukKodlar'a girer, rotalar yazmaz; işletim, CI ve test kodları http null ve metinsizdir, hiçbir rotanın hatalar listesine giremez (I068). YedekIsDurumu makine işi başına durum dosyasıdır (I083): { bicim: 1, is: 'gecelik_pg_dump' | 'xprem_birimi_yedegi' | 'pgbackrest_tam_yedek' | 'pgbackrest_fark_yedek' | 'pgbackrest_dogrulama' | 'geri_yukleme_denemesi', sonCalismaAni: ISO, sonSonuc: 'basarili' | 'basarisiz' | 'atlandi', sonBasariAni: ISO | null, ardisikAtlanan: tam sayı, hataKodu: VERITABANI_ kodu | null }; sonBasariAni yalnız basarili'de güncellenir, öbür sonuçlarda önceki dosyadan taşınır; ardisikAtlanan atlandi'de bir artar, öbür sonuçlarda 0 olur. DANISMA_KATMANLARI önekten katmana tablodur: 1 dogrulama:liste, devam:hesap, is-kuyrugu:eposta, isletim:*; 2 listeler:kova, dogrulama:teyit; 3 yoklama:cift, projeksiyon:*, esitleme:kurulum_siniri, duzeltmeler:zincir; 4 dogrulama:sayac; 5 dogrulama:isaret (contracts.json ortak kural). SAKLAMA_VERI_SINIFLARI veri sınıfı kataloğudur, sıra ve süre kuralının tek kaynağı (D12-B22). TABLO_ISARETLERI şema testinin işaret listesi, GOC_BELIRTECLERI göç klasörü belirteçlerinin kapalı listesi (kimlik, dersler, listeler, saat, yoklama, esitleme, dogrulama, devam, duzeltmeler, raporlar, projeksiyon, veritabani, api, is_kuyrugu, isletim). CHECK listelerinin tek kaynağı da bu dosyadır.`,
  };
}

// ---------- files and migration folders ----------
{
  const before = D.files.length;
  D.files = D.files.filter(f => !f.startsWith('apps/server/migrations/'));
  if (before - D.files.length !== 4) throw new Error('migration files removed: ' + (before - D.files.length));
  const ins = (after, ...add) => { const i = D.files.indexOf(after); if (i < 0) throw new Error('file ' + after); D.files.splice(i + 1, 0, ...add); };
  ins('apps/server/src/infra/veritabani/saklama/sinir.ts', 'apps/server/src/infra/veritabani/saklama/sure-sirasi.ts');
  ins('apps/server/src/infra/veritabani/nesil.test.ts', 'apps/server/src/infra/veritabani/kilit.test.ts');
  ins('apps/server/src/infra/veritabani/saklama/sinir.test.ts', 'apps/server/src/infra/veritabani/saklama/sure-sirasi.test.ts');
  ins('apps/server/test/features/veritabani/islem-ve-havuz.feature', 'apps/server/test/features/veritabani/danisma-kilidi.feature', 'apps/server/test/features/veritabani/islem-sonu-kancasi.feature');
  if (new Set(D.files).size !== D.files.length) throw new Error('duplicate file');
  D.migrations = [
    { klasor: 'apps/server/migrations/<14 haneli UTC>_veritabani_baslangic/', dosyalar: ['migration.sql', 'snapshot.json'], icerik: `geri_yukleme_kayitlari ve saklama_islemleri: tablolar, dizinler ve kısıtlar; iki tablo yalniz_ekleme işaretli olduğundan uygulama rollerinden DELETE ve tablo düzeyinde UPDATE geri alınır.` },
    { klasor: 'apps/server/migrations/<14 haneli UTC>_veritabani_islevler/', dosyalar: ['migration.sql', 'snapshot.json'], icerik: `uygulama.veritabani_degismez_sutun() tetikleyici işlevi ve nesil okuma işlevleri (yoklama_sahip sahipli SECURITY DEFINER, uygulama rollerine yalnız EXECUTE). Bölüm açma ve kaldırma işlevleri bölmeyi yapan göçle gelir (D12-B14).` },
  ];
}

// ---------- tests ----------
{
  const T = D.tests;
  const t = n => byName(T, 'name', n);
  const at = n => { const i = T.findIndex(x => x.name === n); if (i < 0) throw new Error('test ' + n); return i; };
  // migration CI
  t('Göç denetimi: sahiplik').asserts = `adı _dersler_ olan bir göç listeler tablosuna sütun eklerse, listeler tablosunda dizin açarsa ya da listeler_ önekli işlev açarsa katalog farkı denetimi VERITABANI_GOC_SAHIPLIK verir; kendi tablosuna sütun, dizin ve dersler_ önekli işlev eklerse geçer (yer kontrolü). Sahip, contracts.json canonical_tables'tan üretilen goc/tablo-haritasi.ts'ten okunur; haritada olmayan tablo da VERITABANI_GOC_SAHIPLIK. D15'in infra/izleme/tablolar.ts'teki tablosuna _isletim_ göçü ve D14'ün tabloYardimcilari ile tanımlı eposta_gonderimleri tablosunu açan _is_kuyrugu_ göçü geçer (belirteç en uzun eşleşmeyle okunur); D05'in oturumlar'a yabancı anahtarı geçer (kısıt conrelid ile atanır, tgisinternal tetikleyiciler sayılmaz). _isletim_ göçü başka tabloları okuyan olcum_ önekli görünüm açınca geçer (tek istisna); aynı göç başka tabloya sütun ekleyince ya da olcum_ öneksiz görünüm açınca VERITABANI_GOC_SAHIPLIK; görünümün pg_depend bağımlılıkları yalnız tablo okumasıdır.`;
  const siraIdx = at('Göç denetimi: sıra ve yeniden üretme');
  T.splice(siraIdx, 1,
    { name: 'Göç denetimi: klasör adı ve belirteç', kind: 'behavior', asserts: `Ayrıştırıcı GOC_BELIRTECLERI'ni içe aktarır, listeyi yeniden yazmaz. 20261010120000_dersler_oturum_dizini ve 20261010120000_is_kuyrugu_eposta geçer, belirteçleri dersler ve is_kuyrugu (yer kontrolü). 13 haneli önek (2026101012000_dersler_x), geçersiz an (20261340120000_dersler_x), bilinmeyen belirteç (20261010120000_ders_x), açıklamasız ad (20261010120000_dersler) ve klasöre konmamış migration.sql ayrı örneklerle VERITABANI_GOC_AD verir.` },
    { name: 'Göç denetimi: zaman sırası', kind: 'behavior', asserts: `Ana daldaki en yeni klasör 20261010120000 iken eşit önekli ve 20261009235959 önekli yeni klasör VERITABANI_GOC_SIRA verir; 20261010120001 önekli geçer (yer kontrolü). Karşılaştırma dalın yeni klasörlerinin her biri için ana daldaki en yeni klasörle yapılır.` },
    { name: 'Göç denetimi: ana dalda üretim farkı yok', kind: 'behavior', asserts: `tablolar.ts değişip göç üretilmemişse birleştirme adayında drizzle-kit generate yeni klasör üretir ve VERITABANI_GOC_URETIM_FARKI verir; göç üretilip işlenince aynı denetim klasör üretmez (yer kontrolü).` },
    { name: 'Göç denetimi: drizzle-kit check ve yeniden dayanma', kind: 'behavior', asserts: `İki dal aynı ana dal snapshot'ından birer göç üretir; birincisi birleşir, ikincisi yeniden dayanıp klasörünü yeniden üretmeden gelirse iki snapshot aynı öncülü gösterir ve drizzle-kit check VERITABANI_GOC_ZINCIR verir. Kural uygulanınca (kendi klasörü silinip drizzle-kit generate ile yeniden üretilince) check temiz, yeni zaman damgası ana daldakinden büyük ve snapshot zinciri doğrusal (yer kontrolü).` });
  // islem and locks
  const hv = t(`Havuz dolu: API'de 2 saniyede 503`);
  hv.asserts = rep(hv.asserts, `503 API_SUNUCU_YOGUN ve 15 ile 45 arası Retry-After alır, log cause.neden havuz_dolu;`, `503 VERITABANI_HAVUZ_DOLU ve 15 ile 45 arası Retry-After alır;`, 'havuz');
  t('Zaman aşımı ve salt okunur').asserts = `pg_sleep(6) yoklama_api ile 503 VERITABANI_ZAMAN_ASIMI alır; saltOkunur ve zamanAsimiMs 8000 ile aynı sorgu geçer; yazan işlemde 5000'in, her işlemde 15000'in üstü reddedilir; zamanAsimiMs 1000 ile pg_sleep(2) VERITABANI_ZAMAN_ASIMI alır; zamanAsimiMs 0 ve -5 işlem açılmadan VERITABANI_ZAMAN_ASIMI verir (yer kontrolü: zamanAsimiMs 1 ile işlem açılır). saltOkunur işlemde INSERT 25006 alır ve 500 API_SUNUCU_HATASI'na düşer (yeniden denenebilir sayılmaz); kurtarmadaki kümede yazan işlemin 25006'sı 503 VERITABANI_ERISILEMEZ.`;
  const kl = t('Kilitlenmede tek yeniden deneme');
  kl.asserts = rep(kl.asserts, `503 API_SUNUCU_YOGUN ve Retry-After alır, log cause.neden kilitlenme ve SQLSTATE 40P01.`, `503 VERITABANI_KILITLENME ve Retry-After alır, log SQLSTATE 40P01.`, 'kilitlenme');
  const ghIdx = at('Geçici hataların tamamı API_SUNUCU_YOGUN');
  T[ghIdx] = { name: 'Geçici hatalar D12 kodlarına çevrilir', kind: 'behavior', asserts: `GECICI_SQLSTATELER içe aktarılır, yeniden yazılmaz: içindeki her SQLSTATE için sahte sürücü hatası (40P01 ve 40001 ikinci kez) islem'den türüne göre VERITABANI_KILITLENME, VERITABANI_HAVUZ_DOLU, VERITABANI_ERISILEMEZ ya da VERITABANI_ZAMAN_ASIMI olarak çıkar, beklemeSaniye 15 ile 45 arası; sabitte tek tek yazılmamış 08 sınıfı kodu (08P01) VERITABANI_ERISILEMEZ. 23505 VeritabaniHatasi olur, mesajında ve alanlarında ihlal edilen değer yok, code alanı 23505 (yer kontrolü: özgün pg hatasının detail alanında değer vardı).` };
  const dkIdx = at('Danışma kilidi sırası');
  T.splice(dkIdx, 1,
    { name: 'Danışma kilidi: tek çağrıda katman ve metin sırası', kind: 'behavior', asserts: `Aynı anahtarları (farklı katmanlardan ve aynı katmanda farklı metinle) ters sırada veren eşzamanlı 100 işlem çiftinde hiç 40P01 yok; pg_locks'taki alma sırası (katman, metin) sırası. Yer kontrolü: sıralama kaldırılınca 100 denemede 40P01 görülür.` },
    { name: 'Danışma kilidi: artan sıra kuralı', kind: 'behavior', asserts: `Bir işlemde yoklama:cift:a (katman 3) sonra dogrulama:sayac:x (katman 4) iki ayrı çağrıyla alınır (yer kontrolü); ardından listeler:kova:1 (katman 2) testte VERITABANI_DANISMA_SIRA atar, NODE_ENV production'da uyarı satırı loglanır ve kilit alınır. Tutulan yoklama:cift:a yeniden istenince pg_locks'a satır eklenmez, yeni anahtarda eklenir (yer kontrolü); dışlayıcı tutulan anahtarın paylaşımlı istenmesi işlemsiz, paylaşımlı tutulanın dışlayıcı istenmesi yeni anahtar sayılır ve en büyük değerin kendisiyse VERITABANI_DANISMA_SIRA atar.` },
    { name: 'Danışma kilidi: beklemeyen deneme', kind: 'behavior', asserts: `Başka oturum listeler:kova:1'i tutarken dogrulama:sayac:x tutan işlemde danismaKilidiDene(listeler:kova:1) 50 ms içinde false döner, hata atmaz, pg_locks'ta bekleyen satır yok; öbür oturum bırakınca true döner ve anahtar tutulanlara girer (sonraki danismaKilidi isteği işlemsiz). Paylaşımlı kipte iki oturum aynı anahtarda true alır, dışlayıcı tutulan anahtarda paylaşımlı deneme false (yer kontrolü).` },
    { name: 'Danışma kilidi: katman tablosu ve önek', kind: 'contract', asserts: `DANISMA_KATMANLARI içe aktarılır: her önekin modül parçası GOC_BELIRTECLERI'nin karşılığı olan bir modül adıdır, katmanlar 1 ile 5 arası. bilinmeyen:kural:1 anahtarı her ortamda VERITABANI_DANISMA_ONEK_BILINMIYOR atar; isletim:herhangi:1 isletim:* satırından katman 1 alır (yer kontrolü). Biome kuralı elle yazılmış pg_advisory_xact_lock çağrısını reddeder, depo taramasında yok.` },
    { name: 'Danışma kilidi: geri alınan SAVEPOINT ve paylaşımlı kip', kind: 'behavior', asserts: `İç işlemde (SAVEPOINT) alınan anahtar iç işlem geri alınınca başka oturumca hemen alınabilir (PostgreSQL bıraktı) ve dış işlemde yeniden istenince yeniden alınır, iz onu düşürmüştür; iç işlem commit edilince anahtar tutulmaya devam eder (yer kontrolü). Paylaşımlı kipte iki işlem aynı anahtarla birlikte ilerler, dışlayıcı isteyen ikisi bitene kadar bekler.` },
    { name: 'İşlem sonu kancası', kind: 'behavior', asserts: `İki kanca kayıt sırasıyla, fn döndükten sonra ve COMMIT'ten önce çalışır: kancanın yazdığı satır commit sonrası görünür, kanca fn'nin yazdıklarını görür, sıra bir sayaçtan okunur. Kanca fırlatınca fn'nin satırları da yok ve hata çağırana gider. Geri alınan SAVEPOINT'te kaydedilen kanca çalışmaz, commit edilen SAVEPOINT'te kaydedilen çalışır (yer kontrolü). Zorla 40P01 alan ilk denemenin kancası çalışmaz, yeniden denemede kaydedilen bir kez çalışır. İç işlemin tx'i verilen kanca dış işleme bağlanır; islem dışından gelen tx VERITABANI_ISLEM_TANINMIYOR atar.` });
  // nesil and others
  const nk = t('Nesil kararı');
  nk.asserts = rep(nk.asserts, `(nesilOku'da API_SUNUCU_YOGUN, neden nesil_belirsiz)`, `(nesilOku'da VERITABANI_NESIL_BELIRSIZ)`, 'nesil test');
  const yuk = t('Ders çıkışı yükünde havuz');
  yuk.asserts = rep(yuk.asserts, `havuz dolu nedenli 503 API_SUNUCU_YOGUN oranı`, `503 VERITABANI_HAVUZ_DOLU oranı`, 'yuk');
  // saklama
  const kat = t('Saklama: katalog ve kayıt denetimi');
  kat.asserts = rep(kat.asserts, `oncesinde başvuruları katalogda ve grafik döngüsüz.`, `oncesinde ve kopyaKaynagi başvuruları katalogda ve grafik döngüsüz; kayıt nesnesinde sıra ya da oncekiSiniflar alanı tip hatasıdır.`, 'katalog');
  const bsIdx = at('Saklama: işleyicisiz ya da bağımlısı süresiz sınıf');
  T.splice(bsIdx, 1,
    { name: 'Saklama: işleyicisiz sınıf', kind: 'behavior', asserts: `Süresi yazılı ama işleyicisi olmayan sınıfta iş VERITABANI_SAKLAMA_ISLEYICI_YOK ile hiçbir sınıfa dokunmadan düşer, saklama_islemleri boş; işleyici kaydedilince aynı süreyle iş partileri işler (yer kontrolü).` },
    { name: 'Saklama: süre sırası kuralı', kind: 'property', asserts: `fast-check, SAKLAMA_VERI_SINIFLARI içe aktarılır: rastgele süre ataması (süresiz dahil) için açılış denetimi ancak ve ancak oncesinde listesindeki bir sınıftan uzun ya da kopyaKaynagi'ndan uzun süreli bir sınıf varsa VERITABANI_SAKLAMA_SURE_SIRASI verir (süresiz en uzundur). Örnekler: yoklama 24 iken esitleme 36 ya da süresiz, listeler 24 iken raporlar 36 kırmızı ve hiçbir satır değişmez; esitleme 12, yoklama 24 ve her sınıfın 24 olduğu atama geçer (yer kontrolü). Aynı denetim sureler.ts için sözleşme testinde koşar.` });
  const it = t('İş tanımları D14 kurallarına uyar');
  it.asserts = rep(it.asserts, `sureAsimiSaniye 2400 ve 120,`, `sureAsimiSaniye 2400 ve 120 (alan isteğe bağlı, verilmezse D14 1800 kullanır),`, 'is tanim');
  t(`Hata kataloğu D13'e uyar`).asserts = `VERITABANI_HATALARI hataKodlariTanimla('veritabani', ...) kurallarından geçer ve TUM_HATALAR'a girer: VERITABANI_IMLEC_GECERSIZ 400; VERITABANI_KILITLENME, VERITABANI_HAVUZ_DOLU, VERITABANI_ERISILEMEZ, VERITABANI_ZAMAN_ASIMI ve VERITABANI_NESIL_BELIRSIZ 503, bekleme aralik [15, 45], hoca ve ogrenci metni dolu, ortukKodlar'ın her kimlik için döndürdüğü kümede (içe aktarılır); öteki her VERITABANI_ kodu http null ve hiçbir rotanın hatalar listesinde değil (yer kontrolü: bir rotaya http null kod yazılınca yükleme reddeder).`;
  // reset
  const so = t('Senaryo öncesi sıfırlama');
  so.asserts = rep(so.asserts, `pg-boss'un durumu`, `D12'nin sıfırlaması pgboss şemasına hiç deyim göndermez (sürücü kancası; kuyruğu D15'in kancası D14'ün isKuyrugunuBosalt'ıyla boşaltır); pg-boss'un durumu`, 'sifirlama');
  // backup
  t('Yedek durum dosyası').asserts = `Her makine işinin yazdığı /var/lib/iu-yoklama/durum/veritabani/<iş adı>.json YedekIsDurumu şemasına uyar (bicim, is, sonCalismaAni, sonSonuc, sonBasariAni, ardisikAtlanan, hataKodu); basarili, basarisiz ve atlandi için birer örnek dosya şemadan geçer, fazla alan reddedilir. basarisiz ve atlandi sonrası sonBasariAni önceki dosyadaki değerdir, sonCalismaAni yenidir; ardisikAtlanan iki atlandi ardından 2, basarili ya da basarisiz sonrası 0. Dosya yarım kalmaz (geçici dosya ve rename). docker compose config çıktısında dizin işçiye /durum/veritabani olarak salt okunur bağlı (D15'in compose.yaml'ı).`;
  const gd = t('Geri yükleme denemesi');
  gd.asserts = rep(gd.asserts, `xprem güncellemesi iniyor;`, `xprem güncellemesi /opt/iu-yoklama/deneme/xprem-ana-anahtar dosyasındaki anahtarla iniyor (canlı env dosyası denemeye bağlanmaz); dosya yokken deneme VERITABANI_DENEME_ANAHTAR_YOK ile basarisiz yazar;`, 'deneme');
  const yp = t('Yapılandırma denetimleri');
  yp.asserts = rep(yp.asserts, `compose.deneme.yaml kümeleri archive_mode=off ile açar ve pgBackRest archive_command taşımaz.`, `compose.deneme.yaml kümeleri archive_mode=off ile açar, pgBackRest archive_command taşımaz ve xprem ana anahtarını yalnız /opt/iu-yoklama/deneme/xprem-ana-anahtar dosyasından bağlar.`, 'yapilandirma');
  const gi = t('Geri yükleme iptalleri');
  gi.asserts = rep(gi.asserts, `Komut ikinci kez çalışınca değişiklik yok.`, `Komut dört kimlik abonesini kimlikDinleyicileriniKur ile kurar: kapatılan öğrenci oturumunun D11 QR yuvası aynı işlemde iptal. Komut ikinci kez çalışınca değişiklik yok; abonelerden biri eksik kurulursa kimlikDinleyicileriHazir fırlatır ve komut hiçbir iptali uygulamadan durur.`, 'iptaller');
  // new exports
  const ucIdx = at('Geri yükleme kaydı aynı nesli kabul etmez, tekrar çalışır');
  T.splice(ucIdx, 0,
    { name: 'Geri yükleme pencereleri', kind: 'behavior', asserts: `Kayıt yokken geriYuklemePencereleri boş dizi döner; iki dönüş kaydedilince iki öğe hedefAni artan sırada, değerler hedef_ani ve kayip_pencere_sonu_ani ile aynı (yer kontrolü: kayıtlar gerçekten yazıldı).` },
    { name: 'Dönem bölümü açma', kind: 'behavior', asserts: `Bölünmüş tablo yokken donemBolumuAc katalog dışında hiçbir şeye dokunmaz, DDL olayı yok ve yoklama_api ile çalışır. Bölmeyi yapan göç uygulanmış bir test veritabanında aynı çağrı dönemin bölümünü açar, ikinci çağrı işlemsizdir (yer kontrolü).` });
  // mutation
  const mk = t('Koruma kodu bozulunca kırmızı');
  mk.asserts = rep(mk.asserts, `danismaKilidi'nin ikinci çağrı koruması,`, `danismaKilidi'nin anahtar sıralaması ve artan sıra koruması, islemSonuKancasi'nın geri alma yolu, süre sırası denetimi, göç denetiminin ad ve zaman sırası kuralları,`, 'mutasyon');
  if (new Set(T.map(x => x.name)).size !== T.length) throw new Error('duplicate test name');
}

// ---------- resolved gaps ----------
{
  const g = id => byName(D.resolved_gaps, 'gap', id);
  const b03 = g('D12-B03');
  b03.decision = rep(b03.decision, `yoklama_isci'ye pg_monitor (D15'in veritabanı ölçüleri).`, `yoklama_isci pg_monitor üyesidir ve bu kalıcıdır (D15'in veritabanı ölçüleri, I083).`, 'B03');
  const b07 = g('D12-B07');
  b07.decision = rep(b07.decision, `işçi 5 (pg-boss 2, işleyicilerin Drizzle havuzu 3)`, `işçi 5 (pg-boss 2 + Drizzle 3, Drizzle'ın 2'si devam_hesapla partileri; I075)`, 'B07a');
  b07.decision = rep(b07.decision, `Havuzda bekleme API'de 2 saniye, sonra 503 API_SUNUCU_YOGUN;`, `Havuzda bekleme API'de 2 saniye, sonra 503 VERITABANI_HAVUZ_DOLU;`, 'B07b');
  b07.decision = rep(b07.decision, `islem saltOkunur ve zamanAsimiMs ile rapor sorgusunda süreyi en çok 20 saniyeye çıkarır: telefon ve panelin 30 saniyelik istek süresinden havuz beklemesi (2 s) ve cevabın yolda geçireceği pay düşülünce kalan üst sınır. D13'ün requestTimeout'u (20 s, D13-B26) yalnız isteğin alınmasını sınırlar, işleyici süresini bağlamaz.`,
    `islem saltOkunur ve zamanAsimiMs ile ağır rotadaki sorguda süreyi en çok 15 saniyeye çıkarır, rota değeri D13.kalanSureMs ile küçültür (min(15000, kalanSureMs)): üst sınır D13'ün 20 saniyelik işleyici bütçesidir (ISLEYICI_BUTCESI_MS, D13-B26), içinde havuz beklemesine (2 s) ve cevabın yazılmasına pay kalır (I068).`, 'B07c');
  const b08 = g('D12-B08');
  b08.decision = `Varsayılan READ COMMITTED. Birden çok deyimde tutarlı anlık görüntü gereken okuma (D08'in karar bekleyenler ve sonuç hesabı, D10'un rapor uçları ve anlıkları) islem'i yalitim: 'repeatable_read' ile açar; çağıran current_setting('transaction_isolation') ile denetleyebilir (I067). Sayaç ve en çok N kuralları danışma kilidiyle, beş katmanlı tek genel sırayla korunur (contracts.json ortak kural 'Danışma kilidi katmanları', I014): 1 dogrulama:liste, devam:hesap, is-kuyrugu:eposta, isletim:*; 2 listeler:kova, dogrulama:teyit; 3 yoklama:cift, projeksiyon:*, esitleme:kurulum_siniri, duzeltmeler:zincir; 4 dogrulama:sayac; 5 dogrulama:isaret. Sıra önce katman, sonra anahtar metnidir: danismaKilidi(tx, anahtarlar) bir çağrıdaki anahtarları bu sırayla alır; bir işlem birden çok kez çağırabilir ama yeni her anahtar işlemin tuttuğu bütün anahtarlardan sonra gelir; işlemin zaten tuttuğu anahtarı aynı ya da daha zayıf kipte yeniden istemek işlemsizdir; sırada geride kalan yeni anahtar yalnız danismaKilidiDene(tx, anahtar) ile alınır (beklemez; false dönerse çağıran TEKRAR_DENE döner ya da işi yeniden dener). Çok öğeli işlem öğelerin anahtarlarını saf anahtar işlevleriyle (D05 yoklamaCiftAnahtari, D07 kararAnahtarlari, dogrulamaTeyitAnahtari, dogrulamaListeAnahtari, D03 listeKovaAnahtari, D11 qrKilitAnahtarlari) baştan toplar ve tek çağrıda alır. Anahtar başına kip dışlayıcı (varsayılan) ya da paylasimli (I053). Danışma anahtarlarından sonra satırlar (donem_id, id) sırasıyla yazılır; satırlardan sonra iş kuyruğu (D14.isGonder) ve öğrenci sürümü (D06.ogrenciDurumuDegisti), en son genel sayaç: D06'nın ertelenmiş damgaları (surumDamgasiIste) işlemin sahibinin son adımda bir kez çağırdığı surumAl ile yazılır, sayaçtan sonra yeni kilit alınmaz (D06-B19); damgalı işlem surumAl'sız biterse islemSonuKancasi denetimi işlemi geri alır (I019). Sıra ihlali geliştirmede ve testte hata, yayında uyarıdır; 40P01 ve 40001'de islem fn'yi 50 ile 150 ms rastgele bekleyip bir kez baştan çalıştırır (son güvence), sonra 503 VERITABANI_KILITLENME; fn veritabanı dışında yan etki yapmaz. Gönderme ucunun eşzamanlı durum makinesi testi (teknik.html#testler-kalite) kuralı dener.`;
  b08.why = `SERIALIZABLE ders çıkışı yükünde yeniden deneme fırtınası yapar; danışma anahtarlarında her bekleme sırada daha ileri bir anahtarda olduğundan bekleme döngüsü kurulamaz, tek yeniden deneme kalan nadir yarışı karşılar. İşlem başına tek çağrı kuralı gönderim, liste, teyit ve gösterim yollarında karşılanamıyordu: anahtarların bir kısmı ancak satır okununca belli olur; artan katman ve beklemeyen deneme aynı güvenceyi verir. READ COMMITTED'te çok deyimli canlı hesap eşzamanlı bir commit'in yarısını görebilir (ör. düzeltme görünür, kapattığı sorun bildirimi açık).`;
  const b09 = g('D12-B09');
  b09.decision = `Göç klasörü kuralı (A1, contracts.json ortak kural): her modül yalnız apps/server/migrations/<14 haneli UTC (YYYYMMDDHHMMSS)>_<belirteç>_<açıklama>/ klasörlerini açar, belirteç GOC_BELIRTECLERI'nden; klasörde migration.sql, snapshot.json ve gerekirse oncesi-concurrently.sql (drizzle-kit klasör biçimi, ortak dergi dosyası yok). Göç dosyaları spec dosya listesine değil iş paketine yazılır. Paralel çalışmada aynı aşamadaki paketler tablo paylaşmaz; paket birleşmeden önce ana dala yeniden dayanır, dallandığı noktadan sonra ana dala göç klasörü girdiyse kendi klasörünü silip drizzle-kit generate ile yeniden üretir; birleştirme kuyruğu paketleri tek tek alır. CI göç denetimi D12'nindir: ad deseni ve belirteç, ana daldaki en yeni klasörden büyük zaman damgası, dokunulan tablo, dizin, kısıt ve işlevin belirtecin modülüne ait olması (canonical_tables ve işlev öneki; tek istisna D15'in olcum_ görünümleri), ana dalda drizzle-kit generate farksızlığı ve drizzle-kit check. ` + b09.decision;
  const b14 = g('D12-B14');
  b14.decision = rep(b14.decision, `Yeni dönemin bölümünü D02 dönem açılırken donemBolumuAc(tx, donemId) ile açtırır;`, `Yeni dönemin bölümünü D02 dönem açan işlemde donemBolumuAc(tx, donemId) ile açtırır (dış yüz, I063; bölünmüş tablo yokken işlem yapmaz);`, 'B14');
  const b22 = g('D12-B22');
  b22.decision = rep(b22.decision, `Başlangıç kataloğu: esitleme.donem_verisi, dogrulama.donem_verisi ve projeksiyon.donem_verisi (oncesinde yoklama.donem_verisi); devam.donem_verisi ve duzeltmeler.donem_verisi (oncesinde yoklama.donem_verisi, listeler.donem_verisi); saat.donem_verisi, raporlar.donem_verisi, yoklama.donem_verisi, listeler.donem_verisi (anonimleştirme);`,
    `Katalog (tek kaynak; I025, I029, I038, I049, I052, I064, I114): esitleme.donem_verisi, dogrulama.donem_verisi ve projeksiyon.donem_verisi (oncesinde [yoklama.donem_verisi]); devam.donem_verisi ve duzeltmeler.donem_verisi (oncesinde [yoklama.donem_verisi, listeler.donem_verisi]); raporlar.donem_verisi (oncesinde [listeler.donem_verisi]); devam ve raporlar numara ya da ad kopyası taşıdığından kopyaKaynagi listeler.donem_verisi; saat.donem_verisi, yoklama.donem_verisi, listeler.donem_verisi (anonimleştirme) oncesinde boş;`, 'B22a');
  b22.decision = rep(b22.decision, `Kayıtta ve işçi açılışında denetlenir (D12'nin dış yüzü).`, `Kayıtta ve işçi açılışında denetlenir (D12'nin dış yüzü); modül kaydında sıra ya da oncekiSiniflar yoktur. Süre kuralı: başvuran sınıfın süresi başvurduğu sınıfınkinden uzun olamaz; numara ya da ad kopyası taşıyan devam ve raporlar sınıflarının süresi listeler.donem_verisi süresinden uzun olamaz; süresiz sınıf en uzun sayılır. saklama_suresi_isi bunu açılışta denetler ve ihlalde hiçbir sınıfa dokunmadan VERITABANI_SAKLAMA_SURE_SIRASI ile düşer; aynı denetim sureler.ts için sözleşme testinde koşar.`, 'B22b');
  b22.why += ` Süre kuralı silme sırasının kilitlenmemesi içindir: başvurulan sınıfın satırları ancak başvuranlar silindikten sonra silinebilir, başvuran daha uzun saklanırsa iş her gece aynı yerde takılırdı; listeden çıkan numaranın kopyası da listeden uzun yaşamamalı.`;
  const b28 = g('D12-B28');
  b28.decision += ` xprem ana anahtarı canlı env dosyasından değil, son döndürmede çevrimdışı arşivden çıkarılıp /opt/iu-yoklama/deneme/xprem-ana-anahtar (0400) dosyasına konan kopyadan alınır; böylece deneme yedekteki anahtarı da sınar, dosya yoksa ya da izni 0400 değilse VERITABANI_DENEME_ANAHTAR_YOK ile basarisiz yazar (I083).`;
  const b30 = g('D12-B30');
  b30.decision = rep(b30.decision, `cli/geri-yukleme bir giriş noktasıdır (worker.ts gibi bileşim kökü) ve D01'in index.ts'ini içe aktarabilir; infra/veritabani içe aktarmaz.`,
    `cli/geri-yukleme worker.ts gibi bir bileşim köküdür (contracts.json reads_from'daki tek modül D01, I058; A2): komut önce D01.kimlikDinleyicileriniKur'u dört aboneyle (dersler D02 derslerKimlikDinleyicisi, esitleme D06 esitlemeKimlikDinleyicisi, projeksiyon D11 projeksiyonKimlikDinleyicisi, isletim D15 kimlikOlayiDinleyicisi) kurar ve kimlikDinleyicileriHazir'ı çağırır, sonra hesabiSil ve oturumlariKapat; böylece yeniden uygulanan iptallerin olayları da bütün abonelere aynı işlemde gider (I050). infra/veritabani hiçbir modülü içe aktarmaz.`, 'B30');
  const b32 = g('D12-B32');
  b32.decision = rep(b32.decision, `uyuşmazsa 503 API_SUNUCU_YOGUN atar (log nedeni nesil_belirsiz)`, `uyuşmazsa 503 VERITABANI_NESIL_BELIRSIZ atar`, 'B32');
  const b34 = g('D12-B34');
  b34.decision += ` pgboss şemasına yalnız D14'ün isKuyrugunuBosalt'ı (deleteAllJobs) dokunur; onu D15'in senaryo kancası çağırır, D12'nin sıfırlaması pgboss'a hiç deyim göndermez (I075).`;
}

// ---------- open points ----------
{
  const a03 = byName(D.open_points, 'id', 'D12-A03');
  a03.recommendation = rep(a03.recommendation, `Bir sınıfa süre verilirse ondan önce işlenmesi gereken sınıflara da en az aynı süre verilir.`,
    `Süreler katalogdaki kurala uyar: başvuran sınıfın süresi başvurduğu sınıfınkinden uzun olamaz; numara ya da ad kopyası taşıyan devam ve raporlar sınıflarının süresi listeler.donem_verisi süresinden uzun olamaz (D12 açılışta denetler, VERITABANI_SAKLAMA_SURE_SIRASI).`, 'A03');
  const a05 = byName(D.open_points, 'id', 'D12-A05');
  a05.recommendation += ` Mimar kararı: sahibe açık nokta olarak kalır (I121).`;
  for (const o of D.open_points) if (o.needs_owner !== true) throw new Error('open point not owner: ' + o.id);
}

// ---------- requests: decided ----------
{
  const K = {
    'contracts.json': ['I058', `contracts.json'a işlendi: veritabaniKur ve Islem dış yüzde, reads_from'da bileşim kökü cli/geri-yukleme için D01, modül başına göç globu (A1, I017).`],
    'D13': ['I059', `Kabul: Veritabani.db ve islem iletimi seçenekleriyle, SQLSTATE yedek tablosu, kök log cause ayrıntısı, öneksiz eklenti, hedefli ON CONFLICT. islem'in kodları I068 ile D12'nin beş 503 koduna geçti.`],
    'D14': ['I060', `Kabul: isKuyruguKur Veritabani.db ile, worker.ts saklamaVeritabani ve isTanimla, pgboss yetkileri kur adımında, adres kilidi danismaKilidi ile is-kuyrugu:eposta:<özet> (katman 1), makine işi saatleri aynen.`],
    'D15': ['I061', `Kabul: göç servisi sabit adresi, yoklama_saklama sırrı, compose.gelistirme.yaml, yayın akışı notu, tam yedek eşiği 8 gün, atlandi eskime kuralında, Biome grit eklentileri.`],
    'D01': ['I062', `Kabul: kimlik olayları yapısal log satırı olarak da yazılır; kimlik.kisi_bagi işleyicisi yoklama_saklama ile çalışır.`],
    'D02': ['I063', `Kabul: kisitAdi ek biçimi; dönem açan işlemde donemBolumuAc.`],
    'D04, D05, D06, D07, D08, D09, D10, D11, D03': ['I064', `Kabul: katalogdaki kendi sınıfıyla kayıt, yoklama_saklama, saklamaIsleyicisiniCalistir ile sınama; çok kaynaklı işlemde anahtarlar katman kuralıyla toplanır (I014, I057).`],
    'D05, D07, D08, D11': ['I065', `Kabul: _ani sonekli adlar (telefon_ani, hoca_telefon_ani, hesaplanma_ani, denetlenme_ani, degisim_ani), hassasiyet tabloYardimcilari.an.`],
    'D06': ['I066', `Kabul: hesaba bağlı satırlar esitlemeKimlikDinleyicisi ile silinir; degisiklik_sayaci satırı ilk kullanımda açılır.`],
    'D08, D10': ['I067', `Kabul.`],
  };
  for (const r of D.requests) {
    const k = K[r.modul]; if (!k) throw new Error('request ' + r.modul);
    r.karar = k[0]; r.sonuc = k[1]; delete K[r.modul];
  }
  if (Object.keys(K).length) throw new Error('unmatched decisions ' + Object.keys(K));
}

// ---------- error codes ----------
{
  const E = D.errorCodes;
  const drop = ['API_SUNUCU_YOGUN (D13)', 'API_SORGU_ZAMAN_ASIMI (D13)', 'VERITABANI_ERISILEMEZ', 'VERITABANI_SAKLAMA_BAGIMLI_SURESIZ'];
  for (const k of drop) if (!E.some(r => r[0] === k)) throw new Error('code ' + k);
  const kept = E.filter(r => !drop.includes(r[0]));
  const imlec = kept.shift(); if (imlec[0] !== 'VERITABANI_IMLEC_GECERSIZ') throw new Error('first code');
  const hata = kept.shift(); if (hata[0] !== 'API_SUNUCU_HATASI (D13)') throw new Error('second code');
  const yog = `hoca ve ogrenci: 'Sunucu şu an yoğun; birazdan yeniden denenecek.'`;
  const isletim = kept.map(([k, s, w]) => [k, 'http null; ' + s.replace('işletim (CI)', 'CI').replace(/^test$/, 'test'), w]);
  const yeni = [
    ['VERITABANI_GOC_AD', 'http null; CI', `Göç klasörünün adı <14 haneli UTC>_<belirteç>_<açıklama> desenine uymuyor, an geçersiz ya da belirteç GOC_BELIRTECLERI'nde yok.`],
    ['VERITABANI_GOC_ZINCIR', 'http null; CI', `drizzle-kit check temiz değil: iki snapshot aynı öncülü gösteriyor (yeniden dayanıp klasörü yeniden üretmeden gelen dal) ya da zincir bozuk.`],
    ['VERITABANI_SAKLAMA_SURE_SIRASI', 'http null; işletim', `Süre sırası kuralı tutmuyor: başvuran sınıfın süresi başvurduğununkinden ya da devam veya raporlarınki listeler.donem_verisi'ninkinden uzun (süresiz en uzun); iş hiçbir sınıfa dokunmadan düştü.`],
    ['VERITABANI_DANISMA_ONEK_BILINMIYOR', 'http null; programlama hatası', `Danışma anahtarının öneki DANISMA_KATMANLARI'nda yok; her ortamda atar.`],
    ['VERITABANI_DANISMA_SIRA', 'http null; programlama hatası', `Yeni danışma anahtarı işlemin tuttuğu en büyük (katman, anahtar) değerinden sonra gelmiyor; geliştirmede ve testte atar, yayında yalnız uyarı logudur.`],
    ['VERITABANI_ISLEM_TANINMIYOR', 'http null; programlama hatası', `islemSonuKancasi, danismaKilidi ya da danismaKilidiDene islem'in açmadığı bir tx aldı.`],
    ['VERITABANI_DENEME_ANAHTAR_YOK', 'http null; işletim', `Geri yükleme denemesi için /opt/iu-yoklama/deneme/xprem-ana-anahtar yok ya da izni 0400 değil; deneme basarisiz yazar.`],
  ];
  const at = (k) => { const i = isletim.findIndex(r => r[0] === k); if (i < 0) throw new Error('anchor ' + k); return i; };
  isletim.splice(at('VERITABANI_GOC_SAHIPLIK'), 0, yeni[0]);
  isletim.splice(at('VERITABANI_GOC_URETIM_FARKI') + 1, 0, yeni[1]);
  isletim.splice(at('VERITABANI_DENEME_DISK_ESIGI') + 1, 0, yeni[6]);
  isletim.splice(at('VERITABANI_SAKLAMA_ISLEYICI_YOK') + 1, 0, yeni[2]);
  isletim.splice(at('VERITABANI_TEST_ULASILAMIYOR'), 0, yeni[3], yeni[4], yeni[5]);
  D.errorCodes = [
    [imlec[0], '400', imlec[2]],
    ['VERITABANI_KILITLENME', '503, bekleme aralik [15, 45], örtük', `islem çevirir: 40P01 ya da 40001 tek yeniden denemeden sonra da sürdü; 55P03 (lock_timeout). ${yog}`],
    ['VERITABANI_HAVUZ_DOLU', '503, bekleme aralik [15, 45], örtük', `islem çevirir: havuz bekleme süresi doldu (API'de 2 s, işçide 30 s); 53300. Metin aynı.`],
    ['VERITABANI_ERISILEMEZ', '503, bekleme aralik [15, 45], örtük', `islem çevirir: 57P01, 57P02, 57P03, 25P03, 08 sınıfı; yazan işlemde pg_is_in_recovery() doğruyken 25006. Göç, kurulum ya da CLI bağlanamazsa aynı kodla ve sıfır olmayan çıkış koduyla durur. Metin aynı.`],
    ['VERITABANI_ZAMAN_ASIMI', '503, bekleme aralik [15, 45], örtük', `islem çevirir: 57014 (statement_timeout), 25P04 (transaction_timeout); zamanAsimiMs 1'den küçükse işlem açılmadan. Metin aynı.`],
    ['VERITABANI_NESIL_BELIRSIZ', '503, bekleme aralik [15, 45], örtük', `nesilOku: kontrol dosyası ile WAL dosya adındaki zaman çizelgesi farklı (terfiden hemen sonra). Metin aynı.`],
    [hata[0], hata[1], hata[2]],
    ['API_SUNUCU_YOGUN ve API_SORGU_ZAMAN_ASIMI (D13)', '503', `Yalnız D12 dışından kaçan ham SQLSTATE için D13'ün kök yakalayıcısı; islem'den çıkan hata bu kodlara düşmez.`],
    ...isletim,
  ];
  const codes = D.errorCodes.map(r => r[0]);
  if (new Set(codes).size !== codes.length) throw new Error('duplicate code');
}

// ---------- alignment record ----------
D.alignment = [
  { refs: ['A1', 'I017', 'I058'], outcome: `Göç klasörü kuralı ve CI göç denetimi (ad ve belirteç, zaman sırası, sahiplik, ana dalda generate farksızlığı, drizzle-kit check) D12-B09'a, değişmezlere, bölüme ve testlere yazıldı; dört göç dosyası spec.files'tan çıktı, iş paketine yazılacak (spec.migrations).` },
  { refs: ['I014', 'I036', 'I053', 'I101', 'I118'], outcome: `İşlem başına tek çağrı kuralı yerine beş katmanlı tek genel sıra: danismaKilidi anahtar başına kipli, danismaKilidiDene eklendi, DANISMA_KATMANLARI sözleşme dosyasında; D12-B08 ve değişmez yeniden yazıldı, kilitlenmede tek yeniden deneme son güvence.` },
  { refs: ['I019'], outcome: `islemSonuKancasi dış yüze eklendi; D06 sürüm damgası denetimini bununla yapar.` },
  { refs: ['I025', 'I029', 'I036', 'I038', 'I049', 'I052', 'I064', 'I114'], outcome: `SAKLAMA_VERI_SINIFLARI tek kaynak: oncesinde listeleri karara göre, kopyaKaynagi ve süre sırası kuralı açılış denetiminde; VERITABANI_SAKLAMA_BAGIMLI_SURESIZ kalktı, yerine VERITABANI_SAKLAMA_SURE_SIRASI; D12-A03 önerisindeki cümle değişti, açık nokta sahipte.` },
  { refs: ['I053'], outcome: `geriYuklemePencereleri dış yüze eklendi; app.ts D11'e eklenti seçeneğiyle verir.` },
  { refs: ['I058', 'A2', 'I050'], outcome: `Dış yüz contracts.json ile aynı 19 düz adla, açıklamalar not alanında; sözleşme dosyası dış yüzden ayrıldı (spec.contracts_file); cli/geri-yukleme bileşim kökü olarak dört kimlik abonesini kurar.` },
  { refs: ['I063'], outcome: `donemBolumuAc dış yüzde; bölünmüş tablo yokken işlem yapmaz.` },
  { refs: ['I068'], outcome: `Geçici hatalar GECICI_SQLSTATELER ile D12'nin beş 503 koduna; işletim kodları http null tek katalogda (VERITABANI_ISLETIM_KODLARI kalktı); zamanAsimiMs üst sınırı 15000 ve kalanSureMs; 25 saniyelik süre cümlesi D13'ün 20 saniyelik işleyici bütçesi oldu (cümle D12-B07'deydi).` },
  { refs: ['I075'], outcome: `db:migrate sırası Drizzle göçleri, pg-boss migrate, worker.ts kur; sıfırlamada pgboss'a yalnız isKuyrugunuBosalt; eposta_gonderimleri göçü tablo haritası denetiminde; sureAsimiSaniye isteğe bağlı; bağlantı bütçesinin işçi satırı.` },
  { refs: ['I080', 'I083'], outcome: `olcum_ görünümleri CI istisnası, yoklama_isci pg_monitor kalıcı, YedekIsDurumu yeni şeması ve dosya yolu, işçiye /durum/veritabani bağı, denemede ayrı xprem ana anahtarı, OnCalendar'da Europe/Istanbul.` },
  { refs: ['I120', 'I121'], outcome: `İstekler kararlarıyla işaretlendi (karar ve sonuc alanları); D12-A05 sahibe açık nokta olarak kaldı.` },
];

// ---------- serialize changed constants back into the source ----------
const lit = s => {
  if (/[`\\]|\$\{/.test(s)) throw new Error('unsafe literal: ' + s.slice(0, 60));
  return (!s.includes("'") && s.length <= 60) ? `'${s}'` : '`' + s + '`';
};
const key = k => /^[A-Za-z_$][\w$]*$/.test(k) ? k : `'${k}'`;
const leaf = v => typeof v !== 'object' || v === null || (Array.isArray(v) && v.every(x => typeof x === 'string' && x.length <= 60));
const ser = (v, ind) => {
  if (typeof v === 'string') return lit(v);
  if (typeof v === 'boolean' || typeof v === 'number' || v === null) return String(v);
  if (Array.isArray(v)) {
    if (v.every(x => typeof x === 'string' && x.length <= 60)) return '[' + v.map(lit).join(', ') + ']';
    if (v.every(x => typeof x === 'string') && v.length <= 3 && ind.length >= 2) return '[' + v.map(lit).join(', ') + ']';
    return '[\n' + v.map(x => ind + '  ' + ser(x, ind + '  ')).join(',\n') + ',\n' + ind + ']';
  }
  const ks = Object.keys(v);
  if (ks.every(k => leaf(v[k]))) return '{ ' + ks.map(k => `${key(k)}: ${ser(v[k], ind)}`).join(', ') + ' }';
  return '{\n' + ks.map(k => `${ind}  ${key(k)}: ${ser(v[k], ind + '  ')}`).join(',\n') + ',\n' + ind + '}';
};
const region = name => {
  const s = src.indexOf(`\nconst ${name} = `);
  if (s < 0) throw new Error('region ' + name);
  let e = src.indexOf('\nconst ', s + 1);
  const m = src.indexOf('\nmodule.exports', s + 1);
  if (e < 0 || m < e) e = m;
  return [s + 1, e];
};
const put = (name, val) => {
  const [s, e] = region(name);
  src = src.slice(0, s) + `const ${name} = ${ser(val, '')};\n` + src.slice(e);
};
for (const n of ['endpoints', 'jobs', 'state_machines', 'invariants', 'exportsList', 'files', 'tests', 'resolved_gaps', 'open_points', 'requests', 'errorCodes']) put(n, D[n]);
const mi = src.indexOf('\nmodule.exports');
src = src.slice(0, mi + 1)
  + `const contractsFile = ${ser(D.contractsFile, '')};\n\n`
  + `const migrations = ${ser(D.migrations, '')};\n\n`
  + `const alignment = ${ser(D.alignment, '')};\n\n`
  + src.slice(mi + 1);
src = rep(src, `module.exports = { summary, tables, endpoints, jobs, state_machines, invariants, exportsList, files, tests, resolved_gaps, contradictions_resolved, open_points, requests, errorCodes };`,
  `module.exports = { summary, tables, endpoints, jobs, state_machines, invariants, exportsList, contractsFile, files, migrations, tests, resolved_gaps, contradictions_resolved, open_points, requests, errorCodes, alignment };`, 'exports line');
src = src.replace(/\n{3,}/g, '\n\n');
if (/[–—]/.test(src)) throw new Error('dash in source');
fs.writeFileSync(SRC, src, 'utf8');

// round trip: the written source loads to exactly the transformed data
delete require.cache[require.resolve(SRC)];
const back = require(SRC);
for (const k of Object.keys(back)) {
  const want = k === 'summary' || k === 'tables' || k === 'contradictions_resolved' ? null : D[k];
  if (want && JSON.stringify(back[k]) !== JSON.stringify(want)) throw new Error('round trip mismatch: ' + k);
}
console.log('applied; exports', back.exportsList.length, 'files', back.files.length, 'tests', back.tests.length, 'invariants', back.invariants.length, 'codes', back.errorCodes.length);
