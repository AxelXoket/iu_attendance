// D14 review round fixes (r17 stage 4). Mutates the spec object S built by build-d14.js.
// Every edit asserts its anchor exists, so a stale anchor fails loudly instead of silently skipping.
'use strict';

module.exports = function patch(S) {
  const must = (v, what) => { if (v === undefined || v === null || v === -1) throw new Error('patch anchor missing: ' + what); return v; };
  const ex = n => must(S.exports.find(e => e.name === n), 'export ' + n);
  const gap = id => must(S.resolved_gaps.find(g => g.gap === id), 'gap ' + id);
  const tst = n => must(S.tests.find(t => t.name === n), 'test ' + n);
  const col = (t, c) => must(must(S.tables.find(x => x.name === t), 'table ' + t).columns.find(x => x.name === c), 'column ' + c);
  const rep = (o, k, from, to) => { must(o[k].includes(from) ? 1 : undefined, `${k}: ${from.slice(0, 50)}`); o[k] = o[k].replace(from, to); };
  const sm = n => must(S.state_machines.find(m => m.name === n), 'state machine ' + n);
  const tr = (m, from, to) => must(m.transitions.find(t => t.from === from && t.to === to), `transition ${from}->${to}`);

  const SINIRLI = `giris_kodu, basvuru_kodu, basvuru_silme_kodu, onay_bekliyor`;
  const TURLER = ['giris_kodu', 'basvuru_kodu', 'basvuru_silme_kodu', 'onay_bekliyor', 'giris_bildirimi', 'isletim_uyarisi', 'isletim_ozeti'];
  const HATA_TURLERI = ['gecici', 'kalici', 'baglanti', 'zaman_asimi', 'kimlik_dogrulama', 'kapanis', 'kapasite', 'veritabani'];
  const inList = a => a.map(x => `'${x}'`).join(',');

  // ------------------------------------------------------------ summary
  rep(S, 'summary', `HTTP ucu yoktur; öbür modüller beş dış yüz işlevine ve worker.ts'in topladığı iş tanımlarına bağlanır.`,
    `Çok işli kuyruk (D08 devam_hesapla) parti işleyicisiyle alınır, her iş ayrı tamamlanır ya da başarısız sayılır; zamanlamalı işin küçük çıktısı (D08 farkSayisi) isSagligi'nda görünür. HTTP ucu yoktur; öbür modüller beş dış yüz işlevine ve worker.ts'in topladığı iş tanımlarına bağlanır.`);

  // ------------------------------------------------------------ eposta_gonderimleri
  const et = S.tables.find(t => t.name === 'eposta_gonderimleri');
  rep(et, 'purpose', `Tanım apps/server/src/infra/eposta/tablolar.ts;`,
    `Reddedilen istek özet başına 24 saatte en çok bir sinirda satırı yazar, sonrakiler yalnız loglanır: tablo istek sayısıyla değil adres ve gün sayısıyla büyür. Tanım apps/server/src/infra/eposta/tablolar.ts, D12'nin tabloYardimcilari ile uygulama şemasında (kimlik(), an(), durumKisiti());`);
  col('eposta_gonderimleri', 'id').note = `Birincil anahtar, UUIDv7 (tabloYardimcilari.kimlik()); dışa jeton olarak verilmez. epostaSiniriDenetle bunu gonderimId olarak döndürür.`;
  col('eposta_gonderimleri', 'tur').note = `${TURLER.join(', ')}. Liste ve CHECK (tabloYardimcilari.durumKisiti) infra/eposta/turler.ts'teki EPOSTA_TURLERI sabitinden; tablonun ilk göçü bu yedi türle açılır, sonraki yeni tür CHECK'i genişleten göçle gelir.`;
  col('eposta_gonderimleri', 'sonuc').note = `bekliyor, gonderiliyor, gonderildi, basarisiz, sinirda. Geçişler Durumlar bölümünde. sinirda satırı özet başına 24 saatte en çok bir tanedir.`;
  col('eposta_gonderimleri', 'hata_turu').note = `Yalnız basarisiz iken dolu: gecici (SMTP 4xx), kalici (SMTP 5xx), baglanti (STARTTLS ilan etmeyen sunucu dahil), zaman_asimi, kimlik_dogrulama (SMTP 535), kapanis, kapasite, veritabani (gönderimden önce satır güncellemesi hata verdi, ikinci yazım tuttu). kapanis, kapasite ve veritabani teslim denemesi tamamlanmadan süreç tarafında biten gönderimdir ve sınıra sayılmaz. Programlama hatası (adres, şablon verisi, yalıtım) satıra hiç dokunmaz.`;
  const oa = col('eposta_gonderimleri', 'olusturma_ani');
  oa.type = 'timestamptz(3)';
  oa.note = `tabloYardimcilari.an(); değer saat arayüzünden (D04 Saat, bileşim kökünden verilir); SQL now() varsayılanı bilerek yok. Sınır pencereleri ve temizlik buna bakar.`;
  const sa = col('eposta_gonderimleri', 'sonuc_ani');
  sa.type = 'timestamptz(3)';
  sa.note = `tabloYardimcilari.an(); gonderildi, basarisiz ve sinirda iken dolu (sinirda satırında olusturma_ani ile aynı).`;
  et.indexes = [
    `eposta_gonderimleri_alici_ozeti_olusturma_ani_idx ON (alici_ozeti, olusturma_ani) WHERE sonuc <> 'sinirda': sınır sayımı (adres başına son 24 saat). Kısmi dizin; sayım sorgusu aynı koşulu yazar, böylece okunan satır özet başına günde en çok 10 sayılan satır ve birkaç sayılmayan satırdır.`,
    `eposta_gonderimleri_alici_ozeti_sonuc_ani_idx ON (alici_ozeti, sonuc_ani) WHERE sonuc = 'sinirda': özetin son 24 saatte ret satırı var mı denetimi (sinirda satırında sonuc_ani olusturma_ani ile aynı).`,
    `eposta_gonderimleri_olusturma_ani_idx ON (olusturma_ani): 7 günlük temizlik ve 24 saatlik sağlık özeti.`,
  ];
  et.constraints = et.constraints.map(c => {
    if (c.startsWith('eposta_gonderimleri_tur_ck')) return `eposta_gonderimleri_tur_ck CHECK (tur IN (${inList(TURLER)}))`;
    if (c.startsWith('eposta_gonderimleri_hata_turu_ck')) return `eposta_gonderimleri_hata_turu_ck CHECK (hata_turu IS NULL OR hata_turu IN (${inList(HATA_TURLERI)}))`;
    if (c.startsWith('Kısıt ve dizin adları')) return `Kısıt ve dizin adları D12.kisitAdi ile üretilir; tur, sonuc ve hata_turu CHECK'leri tabloYardimcilari.durumKisiti ile sözleşme listesinden yazılır (D12 şema testi karşılaştırır); yabancı anahtar yok (satır kişiye bağlanmaz).`;
    return c;
  });
  must(et.constraints.some(c => c.includes("'veritabani'")) ? 1 : undefined, 'hata_turu ck updated');

  // ------------------------------------------------------------ pgboss_semasi
  const pt = S.tables.find(t => t.name === 'pgboss_semasi');
  col('pgboss_semasi', 'output').note = `Başarısız işte yalnız güvenli hata özeti (uygulama hata kodu, SQLSTATE, kısıt adı, hata sınıfı); özgün mesaj yazılmaz. Tamamlanan işte yalnız kuyruğun çıktı şemasından (KuyrukTanimi.cikti) geçmiş küçük değer, en çok 1 KiB; şema yoksa boş. isSagligi zamanlamalı kuyruğun son tamamlanan işinin çıktısını sonCikti olarak verir.`;
  const ci = pt.columns.findIndex(c => c.name === 'created_on');
  must(ci, 'created_on index');
  pt.columns.splice(ci + 1, 0, {
    name: 'start_after', type: 'timestamptz', null: false, default: 'job_now()',
    note: `İşin en erken alınabileceği an (isGonder baslamaAni, yeniden deneme beklemesi). enEskiBekleyenSaniye yalnız bu anı geçmiş işleri sayar.`,
  });

  // ------------------------------------------------------------ jobs
  const bakim = must(S.jobs.find(j => j.name === 'pgboss_bakimi'), 'job pgboss_bakimi');
  rep(bakim, 'does', `7 günden eski biten işleri`, `deleteAfterSeconds süresini aşan biten işleri (7 gün; seyrek zamanlamalı kuyrukta 2 beklenen aralık artı 1 gün)`);

  // ------------------------------------------------------------ state machines
  const es = sm('eposta_gonderimleri.sonuc');
  tr(es, '(yok)', 'bekliyor').when = `Sınıra giren tür (${SINIRLI}); çağıranın işlemi READ COMMITTED; adres özeti başına işlem kilidi alındıktan sonra son 60, 3.600 ve 86.400 saniyede sayılan gönderim (sinirda satırı ile kapasite, kapanis ve veritabani hata türlü basarisiz satır sayılmaz) 1, 5 ve 10'un altında. Çağıranın (D01) işleminde yazılır; işlem geri alınırsa satır da yok.`;
  tr(es, '(yok)', 'sinirda').when = `Pencerelerden biri dolu ve bu özetin son 24 saatte sinirda satırı yok. sonuc_ani olusturma_ani ile aynı; e-posta gitmez, satır sınıra sayılmaz. Son 24 saatte sinirda satırı varsa yeni satır yazılmaz, ret yalnız loglanır (olay eposta.sinir, sebep; adres ve özet yok).`;
  tr(es, '(yok)', 'gonderiliyor').when = `Sınıra girmeyen tür (giris_bildirimi, isletim_uyarisi, isletim_ozeti), kapasite boş ve gönderici açık; kendi kısa işleminde eklenir. Ekleme hata verirse satır yok, ileti gitmez, sonuç BASARISIZ (veritabani).`;
  const bg = tr(es, 'bekliyor', 'gonderiliyor');
  bg.when = `Koşullu güncelleme (WHERE id = gonderimId AND sonuc = 'bekliyor' AND alici_ozeti = özet AND tur = şablon) tutunca. Satır yoksa (işlem geri alındı), durum farklıysa (ikinci çağrı), özet ya da tür tutmazsa (ör. onay_bekliyor izniyle giris_kodu şablonu) gönderilmez, sonuç IPTAL.`;
  const bgi = es.transitions.indexOf(bg);
  es.transitions.splice(bgi + 1, 0,
    { from: 'bekliyor', to: 'basarisiz', by: 'epostaGonder', when: `Koşullu güncellemeden önce kapasite dolu (süreçte yoldaki gönderim 200) ya da gönderici kapanıyor: aynı koşullu güncellemeyle basarisiz (kapasite ya da kapanis) yazılır, ileti gitmez. Koşullu güncelleme veritabanı hatası verirse bir kez basarisiz (veritabani) yazmayı dener; o da tutmazsa satır bekliyor kalır ve 10 dakikadan sonra yarım kalan sayılır. Üç durumda da sonuç BASARISIZ, log yalnız SQLSTATE.` },
    { from: '(yok)', to: 'basarisiz', by: 'epostaGonder', when: `Sınıra girmeyen türde kapasite dolu ya da gönderici kapanıyor: satır doğrudan basarisiz (kapasite ya da kapanis) eklenir, ileti gitmez, sonuç BASARISIZ.` });
  tr(es, 'gonderiliyor', 'gonderildi').when = `SMTP 2xx yanıtı. Ardından gelen satır güncellemesi hata verirse sonuç yine GONDERILDI (ileti gitti), satır gonderiliyor kalır ve yarım kalan sayılır; log yalnız SQLSTATE.`;
  tr(es, 'gonderiliyor', 'basarisiz').when = `Kalıcı hata (5xx, kimlik doğrulama), üç geçici hatadan sonra, TLS yükseltmesi yapılamadı (baglanti) ya da deneme beklemesindeyken kapanış başladı (kapanis). Adres ve şablon verisi satıra dokunmadan önce denetlendiği için programlama hatası bu geçişi yapmaz.`;
  const sil = tr(es, 'gonderildi', '(silindi)');
  sil.from = 'gonderiliyor, gonderildi, basarisiz, sinirda';
  sil.when = `7 günden eski (bekliyor için de aynı eşik).`;

  const pj = sm('pg-boss işi (D14 kuyruk politikasıyla)');
  const ca = tr(pj, 'created', 'active');
  ca.by = `işçi (work; tek işli kuyrukta localConcurrency 1 ve batchSize 1, parti kuyruğunda parti.esZamanli ve parti.boyut)`;
  ca.when = `startAfter geçti; yoklamada (tek işli 2 saniye, parti 0,5 saniye) ya da notifyWorker ile alındı.`;
  must(pj.transitions.find(t => t.to === 'completed'), 'completed transition').when = `Veri şemaya uydu ve işleyici hatasız bitti; döndürdüğü değer kuyruğun çıktı şemasından geçip output'a yazıldı. Parti işleyicisinde başarısız listesinde olmayan her iş kimlik dizisiyle tek tek tamamlanır.`;
  must(pj.transitions.find(t => t.to === 'retry' && t.by === 'işleyici sarmalayıcısı'), 'retry by wrapper').when = `İşleyici hata verdi ya da parti işleyicisi işi başarısız listesine koydu (güvenli özetle), ve deneme kaldı; bekleme 30 saniyeden başlar, üstel artar, en çok 1.800 saniye.`;
  tr(pj, 'completed', '(silindi)').when = `deleteAfterSeconds sonra: 7 gün; seyrek zamanlamalı kuyrukta en az 2 beklenen aralık artı 1 gün (haftalık iş 15 gün), böylece son başarı anı ve son çıktı sonraki çalışmaya kadar okunur; failed da aynı.`;
  pj.transitions.splice(2, 0, { from: '(yok)', to: 'created', by: 'kuyruklariKur (yayın adımı)', when: `acilistaBirKez tanımlı exclusive kuyruğa kur bir iş gönderir; bekleyen ya da çalışan iş varken ikinci kur iş açmaz.` });

  const ws = sm('İşçi süreci (worker.ts)');
  tr(ws, 'baslatiliyor', 'acilmadi').when = `İşçi açılışı tablosundaki bir adım hata verdi: ayar ya da sır eksik, TZ UTC değil (IS_KUYRUGU_SAAT_DILIMI), yayın bilgisi bozuk, e-posta ayarı eksik (IS_KUYRUGU_EPOSTA_AYAR_EKSIK) çıkış 78; veritabanı 120 saniyede hazır değil ya da şema geride, pgboss şema sürümü uyuşmuyor (IS_KUYRUGU_SEMA_SURUMU), kayıtlı kuyruk yok (IS_KUYRUGU_KUYRUK_EKSIK), tanım ya da zamanlama kuralı bozuk, app.ts hazır olmadı çıkış 1. Compose yeniden kaldırır.`;
  tr(ws, 'baslatiliyor', 'calisiyor').when = `Açılış sırası bitti (İşçi açılışı tablosu): ayarlar, log, TZ, veritabanı, yayın bilgisi, saat, e-posta, app.ts kurucusu dinleme açmadan (kayıt desenindeki dinleyiciler işçide de kurulu), tanımlar ve altyapı iş fabrikaları, isKuyruguKur; en son work kayıtları ve zamanlama açıldı, isci.hazir logu yazıldı.`;
  tr(ws, 'durduruluyor', 'durdu').when = `Sırayla: (1) eposta.kapat(5 sn) ile pg-boss stop({ graceful: true, timeout: 30000 }) aynı anda başlar ve ikisi beklenir; e-posta önce kapandığından deneme beklemesindeki gönderim hemen kapanis ile çözülür ve işleyicisi pg-boss süresinde biter, iş süre aşımına düşüp aynı e-postayı ikinci kez göndermez; (2) app.close(); (3) havuz kapanır; toplam Compose'un 40 saniyelik bekleme süresinin içinde.`;

  const gs = sm('E-posta göndericisi (süreç başına)');
  tr(gs, 'acik', 'kapaniyor').when = `server.ts'te app.close'tan sonra kapat(10 sn); worker.ts'te kapanışın ilk adımı olarak pg-boss stop ile aynı anda kapat(5 sn); ikisinde de havuz kapanmadan önce.`;
  tr(gs, 'kapaniyor', 'kapaniyor').when = `Yeni çağrı gönderilmez; sınıra giren türde bekliyor satırı basarisiz (kapanis) yazılır, sınırsız türde satır doğrudan basarisiz (kapanis) eklenir; BASARISIZ döner.`;

  // ------------------------------------------------------------ invariants
  const inv = i => must(S.invariants[i], 'invariant ' + i);
  must(inv(3).startsWith('pg-boss iş çıktısında') ? 1 : undefined, 'invariant 3 anchor');
  S.invariants[3] = `Başarısız iş çıktısında ve loglarda yalnız uygulama hata kodu, SQLSTATE, kısıt adı ve hata sınıfı bulunur; özgün hata mesajı ve SMTP yanıt metni saklanmaz. Tamamlanan iş çıktısı yalnız kuyruğun çıktı şemasına uyan açık sınırlı tam sayı, mantıksal değer ve sabit liste değeridir, en çok 1 KiB.`;
  must(inv(10).startsWith('Sınıra giren e-posta') ? 1 : undefined, 'invariant 10 anchor');
  S.invariants[10] = `Sınıra giren e-posta (giriş kodu, başvuru kodu, başvuru silme kodu, onay bekliyor) epostaSiniriDenetle'den izin almadan gönderilemez; aynı adrese son 60 saniyede 1, 3.600 saniyede 5, 86.400 saniyede 10'dan fazlası gitmez, READ COMMITTED işlemde yarışan isteklerde de; başka yalıtım düzeyindeki çağrı reddedilir.`;
  must(inv(12).startsWith('Ürün e-postaları düz metindir') ? 1 : undefined, 'invariant 12 anchor');
  S.invariants[12] = `Ürün e-postaları düz metindir, bağlantı, alan adı ve adres içermez (kural: Bağlantı denetimi tablosu); son paragrafları plan.html'deki sabit uyarı cümlesidir. Ürün dışı e-postada (işletim uyarısı ve özeti) bağlantı denetimine takılan belirteç [adres] olur.`;
  must(inv(14).startsWith('Kural taşıyan zaman') ? 1 : undefined, 'invariant 14 anchor');
  S.invariants[14] = `Kural taşıyan zaman (sınır pencereleri, temizlik eşiği, sağlık ölçümü) SQL now() ya da Date.now() ile değil, bileşim kökünün verdiği D04 Saat nesnesiyle okunur.`;
  must(inv(15).startsWith('İş verisi şeması yalnız ekleyerek') ? 1 : undefined, 'invariant 15 anchor');
  S.invariants[15] = `İş verisi şeması yalnız ekleyerek büyür; yeni alan iki yayında gelir: önce işçinin şeması alanı isteğe bağlı tanır, sonraki yayında gönderen yazar. Kuyrukta bekleyen eski sürüm işi yeni işleyicide de doğrulanır; sarmalayıcı _istekKimligi'ni ayırıp kalanı strict ayrıştırır.`;
  S.invariants.push(
    `Parti işleyicisinde bir işin hatası yalnız o işi başarısız sayar; parti kuyruklarının eşzamanlılık toplamı işçinin Drizzle havuzundan en az 1 eksiktir.`,
    `eposta_gonderimleri'nde bir adres özeti için 24 saatte en çok bir sinirda satırı bulunur; reddedilen istek sayısı tabloyu büyütmez.`,
    `Kapanış, kapasite ya da veritabanı yüzünden teslim edilmeden biten gönderim adresin sınır hakkından düşmez.`,
  );

  // ------------------------------------------------------------ exports
  const ig = ex('isGonder');
  rep(ig, 'purpose', `Veriyi kuyruk şemasıyla doğrular (en çok 8 KiB).`, `Veriyi kuyruk şemasıyla doğrular (en çok 8 KiB; tanım denetimi en kötü durum boyutunu önceden hesapladığından kuralına uyan tanımda bu hata yalnız tanım dışı veriyle çıkar). İstek kimliği verinin ayrılmış _istekKimligi alanına yazılır.`);

  const it = ex('isTanimla');
  it.signature = `isTanimla<V, C = void>(tanim: { kuyruk: KuyrukTanimi<V, C>; sureAsimiSaniye: number; kalpAtisiSaniye?: number; deneme?: { sayi?: number; beklemeSaniye?: number; ustel?: boolean }; zamanlama?: { cron: string; sonra?: readonly string[] }; acilistaBirKez?: true } & ({ isleyici: (veri: V, baglam: IsBaglami) => Promise<C | void> } | { partiIsleyici: (isler: ReadonlyArray<PartiIsi<V>>, baglam: PartiBaglami) => Promise<{ basarisiz: ReadonlyArray<{ isId: string; hata: unknown }> }>; parti: { boyut: number; esZamanli: number } })): IsTanimi<V>`;
  it.purpose = `Saf: tanımı doğrular ve döndürür; modül jobs/<modül>/index.ts dosyasında export const isler dizisine koyar, worker.ts toplar. sureAsimiSaniye zorunlu (10-3.600; parti kuyruğunda bütün partinin süresi), deneme sayısı 0-5 (varsayılan 3), bekleme 1-3.600 saniye (varsayılan 30, üstel), cron 5 alanlı, tz her zaman Europe/Istanbul. Tek işli tanım isleyici alır (localConcurrency 1, batchSize 1, yoklama 2 saniye); çok işli kuyruk partiIsleyici ile parti { boyut: 2-100, esZamanli: 1-4 } alır (batchSize, localConcurrency; yoklama 0,5 saniye), zamanlama ve çıktı şeması taşımaz. Bütün parti tanımlarının esZamanli toplamı işçinin Drizzle havuzundan (3) en az 1 eksik olmalıdır: tek işli kuyruklara bağlantı kalır. acilistaBirKez yalnız exclusive kuyrukta; kur yayın adımında bir iş açar. Ad tekliği, sonra başvuruları, parti ve çizelge kuralları işçi açılışında, kur'da ve sözleşme testinde denetlenir (IS_KUYRUGU_TANIM_GECERSIZ, _YINELENEN_AD, _ZAMANLAMA_KURALI).`;

  const egi = S.exports.indexOf(it);
  S.exports.splice(egi + 1, 0, {
    name: 'PartiIsi ve PartiBaglami (tip)',
    signature: `type PartiIsi<V> = { isId: string; veri: V; deneme: number; tetiklemeAni: Date; istekKimligi: string | null }; type PartiBaglami = { kuyruk: string; log: Logger; iptal: AbortSignal }`,
    purpose: `Parti işleyicisinin girdisi. Sarmalayıcı (infra/is-kuyrugu/parti.ts) her işin verisini ayrı doğrular: şemaya uymayan iş partiye girmeden IS_KUYRUGU_VERI_GECERSIZ ile başarısız sayılır, öbürleri işleyiciye gider. İşleyici dönünce başarısız listesindeki işler kendi güvenli özetleriyle pg-boss fail, öbürleri complete ile (kimlik dizisi) kapanır; pg-boss'un parti sonundaki otomatik tamamlaması yalnız active işe dokunduğundan sonucu değiştirmez (sözleşme testi). İşleyici fırlatırsa partideki tamamlanmamış her iş aynı güvenli özetle başarısız olur. Gruplama (D08: ders başına ayrı işlem) işleyicinindir; her iş aynı girdiyle iki kez çalışmaya dayanıklı kalır.`,
  });

  const eg = ex('epostaGonder');
  eg.signature = `epostaGonder<T extends EpostaTuru>(sablon: T, alici: { adres: string; gonderimId?: string }, veri: EpostaVerisi[T]): Promise<{ durum: 'GONDERILDI' | 'BASARISIZ' | 'IPTAL'; gonderimId: string | null; hataTuru?: EpostaHataTuru; deneme: number }>; type EpostaHataTuru = 'gecici' | 'kalici' | 'baglanti' | 'zaman_asimi' | 'kimlik_dogrulama' | 'kapanis' | 'kapasite' | 'veritabani'`;
  rep(eg, 'purpose', `Sınıra giren türde gonderimId zorunlu; satır bekliyor değilse ya da özet tutmazsa IPTAL.`,
    `Sınıra giren türde gonderimId zorunlu; satır bekliyor değilse, özet ya da tür tutmazsa IPTAL. Satır yazımında veritabanı hatası: ileti gitmeden önceyse BASARISIZ (veritabani), gittikten sonraysa GONDERILDI ve satır yarım kalan görünür; log yalnız SQLSTATE. Ürün dışı türde bağlantı belirteci [adres] olur, söz reddedilmez.`);

  const esd = ex('epostaSiniriDenetle');
  esd.signature = `epostaSiniriDenetle(tx: Tx /* READ COMMITTED */, adres: string, tur: 'giris_kodu' | 'basvuru_kodu' | 'basvuru_silme_kodu' | 'onay_bekliyor'): Promise<{ izinli: true; gonderimId: string } | { izinli: false; sebep: 'DAKIKA' | 'SAAT' | 'GUN' }>`;
  esd.purpose = `Çağıranın işleminde adres özetine pg_advisory_xact_lock alır, son 60, 3.600 ve 86.400 saniyedeki sayılan gönderimleri sayar (sınıra giren türlerde sinirda olmayan ve kapasite, kapanis ya da veritabani hata türlü olmayan satırlar; kısmi dizinden). İzinliyse bekliyor satırı yazar; değilse özetin son 24 saatte sinirda satırı yoksa bir tane yazar, varsa yalnız loglar. Ön koşul: çağıranın işlemi READ COMMITTED (D12.islem'in varsayılanı); current_setting('transaction_isolation') başka değer dönerse IS_KUYRUGU_EPOSTA_YALITIM (programlama hatası), çünkü daha yüksek yalıtımda görüntü kilitten önce alınmış olabilir ve yarışan iki istek 0 sayar. Normalleştirilmiş adresi alır, özeti kendisi hesaplar (anahtar D14'ten çıkmaz). Kod üretilmeden ve adresle ilgili başka kilitten önce çağrılır.`;

  const hs = ex('IsSagligi (tip)');
  hs.signature = `type IsSagligi = { olcumAni: Date; semaSurumu: { beklenen: number; bulunan: number | null }; canliIsciOrnegi: number; kuyruklar: Array<{ ad: string; tanimli: boolean; bekleyen: number; calisan: number; oluMektup: number; enEskiBekleyenSaniye: number | null; zamanlama: null | { cron: string; sonBasariAni: Date | null; beklenenAralikSaniye: number; sonSureMs: number | null; sonCikti: unknown | null } }>; eposta: { son24SaatGonderilen: number; son24SaatBasarisiz: number; son24SaatSinirdaAlici: number; son24SaatTekilAlici: number; ardisikBasarisiz: number; yarimKalan: number; sonBasariAni: Date | null; gunlukSinir: number | null } }`;
  hs.purpose = `Kuyruk sayaçları, en eski bekleyen iş, son başarı anı, son süre ve son çıktı iş tablosundan (getQueue().table; partition kapalı, tek tablo) tek sorguyla okunur, pg-boss'un 60 saniyelik monitor geçişini beklemez; canlı örnek getInstances'tan (kalp atışı 90 saniyeden yeni ve zamanlaması açık örnek); beklenen aralık cron-parser ile; e-posta sayıları eposta_gonderimleri'nden (son 24 saat, verilen saate göre). Tanımlar: enEskiBekleyenSaniye = simdi eksi max(start_after, created_on), yalnız state created ya da retry ve start_after <= simdi olan işlerde, yoksa null (ileri tarihli ve bekleme süresindeki iş birikme sayılmaz). sonBasariAni ve sonSureMs son completed işten; sonCikti onun output'u (çıktı şeması yoksa null). ardisikBasarisiz: sonuc_ani'ye göre en yeni satırdan geriye, yalnız gonderildi ve SMTP denemesi tamamlanmış basarisiz (gecici, kalici, baglanti, zaman_asimi, kimlik_dogrulama) satırlarında ilk gonderildi'ye kadar sayılan basarisiz, en çok 50. yarimKalan: olusturma_ani [simdi - 24 saat, simdi - 10 dakika] aralığında bekliyor ya da gonderiliyor satır (tek çökme uyarıyı en çok 24 saat açık tutar). son24SaatSinirdaAlici: son 24 saatteki sinirda satırı (özet başına en çok bir).`;

  const kt = ex('KuyrukTanimi (tip, sözleşme)');
  kt.signature = `type KuyrukTanimi<V, C = void> = { readonly ad: string; readonly veri: z.ZodType<V>; readonly politika: 'standard' | 'stately' | 'exclusive'; readonly cikti?: z.ZodType<C> }  // packages/contracts/src/is-kuyrugu.ts`;
  rep(kt, 'purpose', `z.boolean, z.enum ve en çok 1.000 elemanlı diziler. Denetim Zod 4'ün toJSONSchema çıktısı üzerinde yapılır.`,
    `z.boolean, z.enum ve açık max'lı diziler. Denetim Zod 4'ün toJSONSchema çıktısı üzerinde yapılır ve en kötü durum boyutunu hesaplar: her yaprağın en uzun JSON biçimi (UUID 38 bayt, ISO an 26, ISO tarih 12, tam sayı 7, mantıksal 5, sabit liste en uzun değer artı 2) dizi max'ıyla çarpılır, alan adları ve _istekKimligi eklenir; toplam 8 KiB'ı geçen tanım reddedilir (ör. tek UUID dizisi ve istek kimliği taşıyan veride en çok yaklaşık 200 eleman), böylece tanımdan geçen iş çalışma anında IS_KUYRUGU_VERI_BUYUK ile çağıranın işlemini geri aldırmaz. cikti isteğe bağlıdır: yalnız açık sınırlı z.int, z.boolean, z.enum ve bunlardan strict nesne ya da açık max'lı dizi; en kötü durum 1 KiB'ı geçemez; tek işli tanımın işleyicisi bu tipte değer döndürür, sarmalayıcı doğrulayıp output'a yazar.`);

  const ev = ex('EPOSTA_TURLERI ve EpostaVerisi');
  ev.signature = `const EPOSTA_TURLERI: { giris_kodu, basvuru_kodu, basvuru_silme_kodu, onay_bekliyor, giris_bildirimi, isletim_uyarisi, isletim_ozeti }; type EpostaVerisi = { giris_kodu: { kod: string /* ^\\d{6}$ */; gecerlilikDakika: number }; basvuru_kodu: { kod: string; gecerlilikDakika: number }; basvuru_silme_kodu: { kod: string /* ^\\d{6}$ */; gecerlilikDakika: number }; onay_bekliyor: Record<string, never>; giris_bildirimi: { girisAni: Date; istemciTuru: 'telefon' | 'panel'; cihazEtiketi: string; kapananOturumEtiketi: string | null }; isletim_uyarisi: { konu: string; satirlar: string[] }; isletim_ozeti: { konu: string; satirlar: string[] } }`;
  rep(ev, 'purpose', `isletim_uyarisi ürün değildir, sınıra girmez, sabit cümle taşımaz.`,
    `Sınıra girenler: giris_kodu, basvuru_kodu, basvuru_silme_kodu (D01-B32, onaylanmamış başvuranın web üzerinden silmesi) ve onay_bekliyor. isletim_uyarisi ve isletim_ozeti (D15 haftalık özeti) ürün değildir, sınıra girmez, sabit cümle taşımaz; bağlantı belirteci [adres] olur.`);

  const ik = ex('isKuyruguKur (bileşim kökü)');
  ik.signature = `isKuyruguKur(secenek: { rol: 'api' | 'isci'; veritabani: Veritabani; baglantiAdresi?: string; tanimlar?: readonly IsTanimi<unknown>[]; saat: Saat /* D04: { simdi(): number } */; log: Logger; testSaati?: TestClock; casus?: boolean; zamanlamaAcik?: boolean; bakimAcik?: boolean }): Promise<{ durdur(): Promise<void> }>`;
  rep(ik, 'purpose', `Dış yüz işlevlerini bu örneğe bağlar; ikinci kurulum durdur'dan önce hata verir.`,
    `saat D04'ün Saat nesnesidir; testte D04'ün pgBossSaati(testClock) nesnesi aynı TestClock'u yürütür, bileşim kökü ayrı uyarlayıcı yazmaz. İşçide work kayıtları tek işli ve parti ayarlarıyla, en son açılır. Dış yüz işlevlerini bu örneğe bağlar; ikinci kurulum durdur'dan önce hata verir (test desteğindeki zamanlamaliOrnekAc dış yüzü bağlamadığından bu kurala girmez).`);

  const kk = ex('kuyruklariKur (bileşim kökü)');
  kk.signature = `kuyruklariKur(secenek: { gocBaglantiAdresi: string; tanimlar: readonly IsTanimi<unknown>[]; log: Logger; testSaati?: TestClock }): Promise<{ acilan: string[]; guncellenen: string[]; kaldirilanZamanlama: string[]; tanimsizKuyruk: string[]; acilisIsi: string[] }>`;
  rep(kk, 'purpose', `Kayıttan kalkan kuyruk silinmez, raporlanır`,
    `Seyrek zamanlamalı kuyrukta deleteAfterSeconds en az 2 beklenen aralık artı 1 gündür. acilistaBirKez tanımlı her kuyruğa bir iş gönderir (kuyruk exclusive: bekleyen ya da çalışan iş varken ikinci gönderim iş açmaz; rapor acilisIsi). Kayıttan kalkan kuyruk silinmez, raporlanır`);

  const ekur = ex('epostaKur (bileşim kökü)');
  ekur.signature = `epostaKur(secenek: { tasiyici: EpostaTasiyicisi; gonderen: { ad: string; adres: string }; urunAdi: string; ozetAnahtari: Uint8Array; veritabani: Veritabani; saat: Saat /* D04 */; log: Logger; gunlukSinir?: number; bekle?: (ms: number) => Promise<void> }): { kapat(sureMs: number): Promise<void> }`;

  const smtp = ex('smtpTasiyicisi (bileşim kökü)');
  smtp.purpose = `Nodemailer havuzlu SMTP: en çok 5 bağlantı, bağlantı ve karşılama zaman aşımı 10 saniye, soket 30 saniye, logger ve debug kapalı (SMTP dökümü adres ve metin taşır). Güvenlik eşlemesi: 'tls' secure true (genelde 465); 'starttls' secure false ve requireTLS true: sunucu STARTTLS ilan etmezse bağlantı düz metne düşmez, kimlik doğrulama ve ileti gönderilmez, gönderim baglanti ile başarısız olur; ikisinde tls.minVersion 'TLSv1.2' ve tls.rejectUnauthorized true (SMTP_TLS_AYARLARI sabiti, ayarla kapatılamaz). 'yok' secure false ve ignoreTLS true, yalnız geliştirmede Mailpit için; yayında verilirse bileşim kökü IS_KUYRUGU_EPOSTA_AYAR_EKSIK ile açılmaz. Röle, OAuth2 ya da kendi alan adı yolu bu taşıyıcının ayarıyla değişir.`;

  const hk = ex('IS_KUYRUGU_HATA_KODLARI (sözleşme)');
  hk.signature = `const IS_KUYRUGU_HATA_KODLARI = hataKodlariTanimla('is-kuyrugu', { IS_KUYRUGU_KURULMADI: { http: 500, hoca: IS_KUYRUGU_GENEL_HATA_METNI, ogrenci: IS_KUYRUGU_GENEL_HATA_METNI }, ... })  // packages/contracts/src/is-kuyrugu.ts`;
  hk.purpose = `Modülün 20 kodu (Hata kodları bölümü), D13'ün hataKodlariTanimla biçiminde: her kod http 500 ve aynı genel hoca ve öğrenci metni. D13'ün kökü 5xx'te yalnız API_SUNUCU_HATASI zarfını ve sabit mesajını döndürdüğünden bu metinler istemciye çıkmaz; katalog biçimi için doludur. hatalar.ts birleştirmesine (TUM_HATALAR) girer.`;

  const spi = S.exports.indexOf(ex('sahtePostaKutusu (test desteği)'));
  S.exports.splice(spi, 0,
    {
      name: 'baglantiDenetle (D14 içi)',
      signature: `baglantiDenetle(metin: string): { belirtecSayisi: number; temizMetin: string }  // apps/server/src/infra/eposta/baglanti-denetimi.ts`,
      purpose: `Kural Bağlantı denetimi tablosunda. Metni boşlukla belirteçlere böler, baştaki ve sondaki noktalama işaretlerini ayıklar; şema, 'www.', '@' ya da IANA alan adı sonuyla biten ana makine biçimindeki her belirteci sayar ve temizMetin'de [adres] yapar. Ürün türünde belirtecSayisi > 0 ise gönderici IS_KUYRUGU_EPOSTA_BAGLANTI ile reddeder; ürün dışı türde temizMetin gönderilir, log yalnız tür ve sayıyı yazar. Cihaz etiketi aynı denetimden geçer, takılırsa 'Bilinmeyen cihaz' yazılır.`,
    },
    {
      name: 'altyapiIsleriniUyarla (D14 içi, worker.ts)',
      signature: `altyapiIsleriniUyarla(isler: readonly AltyapiIsTanimi[]): IsTanimi<Record<string, never>>[]; type AltyapiIsTanimi = { ad: string; cron: string; saatDilimi: string; kacirilan: 'skip' | 'once'; veri?: z.ZodType<Record<string, never>>; politika?: 'exclusive'; sureAsimiSaniye?: number; deneme?: { sayi: number; beklemeSaniye: number }; isle(b: { isKimligi: string; tetiklemeAni: Date; iptal: AbortSignal; log: Logger }): Promise<void> }  // apps/server/src/infra/is-kuyrugu/altyapi-uyarlayici.ts`,
      purpose: `D15'in isletimIsleri(bag) ve D12'nin veritabaniIsleri(bag) çıktısını isTanimla biçimine çevirir: { kuyruk: { ad, veri, politika }, isleyici: (veri, baglam) => isle({ isKimligi: baglam.isId, tetiklemeAni: baglam.tetiklemeAni, iptal: baglam.iptal, log: baglam.log }), sureAsimiSaniye, deneme, zamanlama: { cron } }. Eksik alanlar ALTYAPI_IS_VARSAYILANI'ndan: politika exclusive, veri boş strict nesne, sureAsimiSaniye 1.800, deneme { sayi: 3, beklemeSaniye: 30 }. saatDilimi 'Europe/Istanbul' değilse IS_KUYRUGU_TANIM_GECERSIZ; kacirilan D14'ün sıklık kuralıyla (aralığı 1 günden kısa iş skip, günlük ve daha seyrek iş once) uyuşmazsa IS_KUYRUGU_ZAMANLAMA_KURALI; iki durumda işçi açılmaz. Böylece jobs/isletim ve jobs/veritabani infra/is-kuyrugu'yu içe aktarmaz.`,
    });
  S.exports.push(
    {
      name: 'isKuyrugunuBosalt (test desteği)',
      signature: `isKuyrugunuBosalt(): Promise<void>  // apps/server/test/steps/is-kuyrugu/destek.ts`,
      purpose: `Test sürecinin ortak pg-boss örneğinde deleteAllJobs çağırır (kuyruk ve zamanlama kayıtları kalır). D12'nin senaryoOncesiSifirla'sı pgboss şemasına yalnız bunun üzerinden dokunur; D15'in test dünyası kancası her senaryodan önce çağırır.`,
    },
    {
      name: 'isiCalistirVeBekle ve kuyruktakiIsler (test desteği)',
      signature: `isiCalistirVeBekle<V>(kuyruk: KuyrukTanimi<V, unknown>, veri: V, secenek?: { tekillikAnahtari?: string; zamanAsimiMs?: number }): Promise<'completed' | 'failed'>; kuyruktakiIsler(kuyruk: string): Promise<ReadonlyArray<{ isId: string; durum: 'created' | 'retry' | 'active' | 'completed' | 'cancelled' | 'failed'; veri: unknown; cikti: unknown | null }>>  // destek.ts`,
      purpose: `isiCalistirVeBekle işi kendi işleminde isGonder ile koyar, ortak işçiyi notifyWorker ile uyarır ve pg-boss casusuyla (getSpy().waitForJobWithId) sonucu bekler; 'aynı veriyle iki kez çalışırsa' adımı bunu iki kez çağırır. kuyruktakiIsler 'kuyrukta N iş bekler' ve 'ölü kuyruğa düşer' adımlarının okumasıdır (<ad>_olu adıyla da çağrılır).`,
    },
    {
      name: 'zamanlamaliOrnekAc (test desteği)',
      signature: `zamanlamaliOrnekAc(testSaati: TestClock, secenek?: { tanimlar?: readonly IsTanimi<unknown>[] }): Promise<{ kapat(): Promise<void> }>  // destek.ts`,
      purpose: `Zamanlama ve bakım senaryoları için zamanlaması ve bakımı açık ayrı bir PgBoss örneği açar; dış yüz işlevlerini bağlamaz, ortak örneği durdurmaz, bu yüzden isKuyruguKur'un ikinci kurulum kuralına girmez. kapat() örneği stop ile kapatır; ortak örnekteki isGonder ve isiCalistirVeBekle çalışmayı sürdürür.`,
    });

  // ------------------------------------------------------------ files
  const addAfter = (anchor, ...nw) => { const i = must(S.files.indexOf(anchor), 'file ' + anchor); S.files.splice(i + 1, 0, ...nw); };
  addAfter('apps/server/src/infra/is-kuyrugu/sarmalayici.ts', 'apps/server/src/infra/is-kuyrugu/parti.ts', 'apps/server/src/infra/is-kuyrugu/altyapi-uyarlayici.ts');
  addAfter('apps/server/src/infra/is-kuyrugu/hata-suzgeci.test.ts', 'apps/server/src/infra/is-kuyrugu/parti.test.ts', 'apps/server/src/infra/is-kuyrugu/altyapi-uyarlayici.test.ts');
  addAfter('apps/server/src/infra/eposta/sablonlar/basvuru-kodu.ts', 'apps/server/src/infra/eposta/sablonlar/basvuru-silme-kodu.ts');
  addAfter('apps/server/src/infra/eposta/sablonlar/isletim-uyarisi.ts', 'apps/server/src/infra/eposta/sablonlar/isletim-ozeti.ts');
  addAfter('apps/server/src/infra/eposta/baglanti-denetimi.test.ts', 'apps/server/src/infra/eposta/tasiyici.test.ts');
  addAfter('apps/server/test/features/is-kuyrugu/saglik.feature', 'apps/server/test/features/is-kuyrugu/isci-sureci.feature');
  addAfter('apps/server/test/steps/is-kuyrugu/test-kuyruklari.ts', 'apps/server/test/steps/is-kuyrugu/destek.ts');

  // ------------------------------------------------------------ tests (updated)
  rep(tst('Kayıtlı iş tanımları ad ve veri kurallarına uyar'), 'asserts', `z.string() yapraklı örnek şema IS_KUYRUGU_TANIM_GECERSIZ verir (artı denetim).`,
    `z.string() yapraklı örnek şema IS_KUYRUGU_TANIM_GECERSIZ verir (artı denetim). En kötü durum boyutu tanımdan hesaplanır: 300 elemanlı UUID dizili şema reddedilir, 150 elemanlı geçer ve 150 elemanlı veri isGonder'de IS_KUYRUGU_VERI_BUYUK vermez; 1 KiB üstü çıktı şeması reddedilir; parti esZamanli toplamı havuzu doldurursa reddedilir; _istekKimligi taşıyan iş strict şemada geçer, başka _ önekli alan geçmez.`);
  rep(tst('Saatte 5 ve günde 10 sınırı kayan penceredir'), 'asserts', `başarısız gönderim sayılır, sinirda satırı ve giriş bildirimi sayılmaz.`,
    `SMTP denemesi tamamlanmış başarısız gönderim sayılır; sinirda satırı, giriş bildirimi ve kapasite, kapanis ya da veritabani sonuçlu satır sayılmaz.`);
  rep(tst('Sınıra giren tür izinsiz ve iki kez gönderilemez'), 'asserts', `başka adresle çağrı IPTAL döner;`,
    `başka adresle çağrı IPTAL döner; onay_bekliyor izniyle alınan gonderimId giris_kodu şablonuyla IPTAL döner (tür eşleşmesi);`);
  rep(tst('Şablonlarda bağlantı olmaz, son paragraf sabit cümledir'), 'asserts', `işletim uyarısında bağlantılı satır IS_KUYRUGU_EPOSTA_BAGLANTI ile reddedilir.`,
    `işletim uyarısında ve özetinde bağlantılı satırdaki belirteç [adres] olur, söz reddedilmez, ileti gider ve log belirtecin kendisini değil sayısını yazar; 'isletim.wal_arsivi' ve 'chrony.json' içeren satır değişmeden gider (zemin).`);
  const saglik = tst('Sağlık özeti kuyruk ve e-posta durumunu verir');
  saglik.asserts = `Temiz durumda sayılar 0, sonBasariAni boş; ölü kuyrukta 1 iş ve art arda 2 başarısız (kalici) gönderim kurulunca oluMektup 1 ve ardisikBasarisiz 2; araya giren kapanis satırı ardisikBasarisiz'i değiştirmez; 11 dakikalık bekliyor satırı yarimKalan 1, 25 saatlik bekliyor satırı 0; günlük zamanlamalı kuyrukta beklenenAralikSaniye 86.400 ve son başarı anı döner; haftalık test kuyruğunda son başarıdan 8 gün sonra sonBasariAni hâlâ dolu (deleteAfterSeconds); API sürecinde çağrı IS_KUYRUGU_YANLIS_SUREC verir.`;
  const isci = tst('İşçi yanlış ortamda açılmaz');
  isci.name = 'İşçi açılış sırası ve çıkış kodları';
  isci.asserts = `Açılış adımlarının çağrı sırası kayıttan okunur ve worker.ts'teki ISCI_ACILIS_ADIMLARI sabitiyle (İşçi açılışı tablosu) aynıdır; süreç saat dilimi UTC değilken IS_KUYRUGU_SAAT_DILIMI ve çıkış 78; yayın bilgisi dosyası yokken çıkış 78; e-posta özet anahtarı 32 bayttan kısayken IS_KUYRUGU_EPOSTA_AYAR_EKSIK ve çıkış 78; kayıtlı kuyruk yokken IS_KUYRUGU_KUYRUK_EKSIK ve çıkış 1. Doğru ortamda açılır, app.ts dinleme açmaz (sunucu adresi yok) ve işçide yayinBilgisi() değer döner (artı denetim: yüklenmeden çağrı hata fırlatır).`;
  rep(tst('Kuyruk kurulumu ayarları aynen yazar ve tekrar çalışınca değişmez'), 'asserts', `her kuyruğun <ad>_olu kuyruğu vardır;`,
    `her kuyruğun <ad>_olu kuyruğu vardır; haftalık zamanlamalı test kuyruğunda deleteAfterSeconds 1.296.000;`);
  rep(tst('Zamanlama kuralları bütün kayıtta tutar'), 'asserts', `Kayıttaki her zamanlama için`, `Kayıttaki her zamanlama için (uyarlanan altyapı işleri dahil)`);
  const mut = tst('Koruyucu testler kasıtlı bozmada kırmızıya döner');
  rep(mut, 'asserts', `gonderimId denetimi kaldırılınca 'Sınıra giren tür' kırmızı olur.`,
    `gonderimId ya da tür eşleşmesi kaldırılınca 'Sınıra giren tür'; parti sarmalayıcısı bütün partiyi başarısız sayınca 'Parti işleyicisinde'; requireTLS kaldırılınca 'STARTTLS ilan etmeyen'; ret satırının tekil yazımı kaldırılınca 'Reddedilen istekler'; yalıtım denetimi kaldırılınca 'Sınır denetimi READ COMMITTED'; enEskiBekleyenSaniye created_on ile ölçülünce 'En eski bekleyen'; işçi kapanışında eposta.kapat pg-boss stop'tan sonraya alınınca 'İşçi kapanışında' kırmızı olur.`);

  // ------------------------------------------------------------ tests (new)
  const mi = S.tests.indexOf(mut);
  S.tests.splice(mi, 0,
    { name: 'Başvuru silme kodu giriş koduyla aynı sayaca girer', kind: 'behavior',
      asserts: `Aynı adrese giris_kodu izni alındıktan 30 saniye sonra basvuru_silme_kodu için epostaSiniriDenetle DAKIKA ile reddedilir, 61 saniye sonra izinli olur; gönderilen iletinin konusu '<ürün adı> başvuru silme kodu', metni kodu, geçerlilik satırını ve son paragrafta içe alınan SABIT_UYARI_CUMLESI'ni içerir, konu kodu içermez; başka adreste ilk basvuru_silme_kodu isteği izinli (zemin).` },
    { name: 'Parti işleyicisinde bir işin hatası yalnız o işi başarısız sayar', kind: 'behavior',
      asserts: `boyut 50 test kuyruğunda işleyici 3 işi başarısız listesine koyunca 47 iş completed, 3 iş retry olur ve çıktılarında yalnız güvenli özet bulunur; şemaya uymayan 1 iş işleyiciye hiç verilmez ve IS_KUYRUGU_VERI_GECERSIZ ile başarısız olur; işleyici fırlatınca partideki işlerin hepsi retry olur (zemin); esZamanli 2 iken işleyici içindeki sayaç aynı anda en çok 2 parti görür.` },
    { name: 'Parti kuyruğu ders çıkışı yükünü taşır', kind: 'load',
      asserts: `boyut 50, esZamanli 2 ve iş başına 5 ms işleyicili test kuyruğuna 20.000 iş konunca hepsi 3 dakikadan kısa sürede completed olur; aynı yük tek işli ayarla ölçülür ve parti ayarı ondan en az 10 kat hızlıdır (zemin); ölçüm D15 yük testi raporuna eklenir.` },
    { name: 'Tamamlanan işin çıktısı isSagligi\'nda görünür', kind: 'behavior',
      asserts: `Çıktı şemalı zamanlamalı test işi { farkSayisi: 3 } döndürünce isSagligi o kuyruğun zamanlama.sonCikti'sında { farkSayisi: 3 } görünür, sonraki çalışma { farkSayisi: 0 } döndürünce 0 olur; çıktı şeması olmayan kuyrukta değer döndüren işleyici ve 1 KiB üstü çıktı IS_KUYRUGU_CIKTI_GECERSIZ ile başarısız olur; z.string() yapraklı çıktı şeması tanımda reddedilir (artı denetim).` },
    { name: 'Reddedilen istekler tabloyu şişirmez', kind: 'behavior',
      asserts: `Aynı adrese aynı dakikada 1.000 epostaSiniriDenetle sonrası o özetin tabloda tam 1 bekliyor ve tam 1 sinirda satırı vardır; sayım sorgusunun EXPLAIN (ANALYZE, FORMAT JSON) çıktısında kısmi sayım dizini kullanılır ve okunan satır 10'u geçmez; farklı 1.000 adreste 1.000 bekliyor satırı oluşur (zemin, yazımın gerçekten olduğunu gösterir).` },
    { name: 'STARTTLS ilan etmeyen sunucuya ileti gitmez', kind: 'behavior',
      asserts: `smtpTasiyicisi 'starttls' ile STARTTLS ilan etmeyen sahte SMTP sunucusuna bağlanınca gönderim BASARISIZ (baglanti) olur, sunucu AUTH ve DATA komutu almaz (parola ve kod düz metin gitmez); STARTTLS ilan eden sahte sunucuda ileti gider (zemin); 'tls' ve 'starttls' taşıyıcısının ayarında minVersion TLSv1.2 ve rejectUnauthorized true'dur, ayar nesnesinden değiştirilemez.` },
    { name: 'Bağlantı denetimi örnek tablosunda doğru karar verir', kind: 'behavior',
      asserts: `Örnekler Bağlantı denetimi tablosundan içe alınır. Geçenler: 'isletim.wal_arsivi', 'chrony.json', '12.37.0', 'D14-B05', 'saat 02:15', '/durum/saat', 'oturum_pencere_kapat'. Yakalananlar: 'ornek.example', 'www.x.com', 'a@b.co', 'http://x', 'HTTPS://X.COM', 'ftp://y', 'mailto:z', 'istanbul.edu.tr', 'x.com/yol', '(www.x.com).'. Ürün türünde yakalanan belirteç IS_KUYRUGU_EPOSTA_BAGLANTI verir, ürün dışı türde [adres] olur.` },
    { name: 'Test kuyruğu yardımcıları ortak işçiyi bozmaz', kind: 'contract',
      asserts: `3 iş konmuşken isKuyrugunuBosalt sonrası kuyruktakiIsler bütün test kuyruklarında boş döner (zemin: önce 3 iş vardır) ve kuyruk ayarları durur; zamanlamaliOrnekAc açılıp kapatılınca ortak örnekte isiCalistirVeBekle çalışmayı sürdürür ve ikinci kurulum hatası oluşmaz; isiCalistirVeBekle hata veren işte 'failed', başaran işte 'completed' döner.` },
    { name: 'En eski bekleyen iş ileri tarihli işi saymaz', kind: 'behavior',
      asserts: `baslamaAni 2 saat ileri iş varken enEskiBekleyenSaniye null; başlama anı 20 dakika önce geçmiş ve alınmamış iş varken 1.200 (zemin); retry beklemesindeki iş beklemesi bitene kadar sayılmaz.` },
    { name: 'İşçi kapanışında e-posta önce kapanır, uyarı iki kez gitmez', kind: 'behavior',
      asserts: `Taşıyıcı ilk denemede 421 dönerken isletim_uyarisi gönderen test işi 5 saniyelik deneme beklemesindeyken işçi kapanışı başlar: gönderim hemen BASARISIZ (kapanis) döner, iş completed olur, pg-boss stop 30 saniyeden önce biter; işçi yeniden açılınca iş yeniden çalışmaz, taşıyıcı çağrı sayısı 1 kalır (aynı uyarı iki kez denenmez). Kapanış çağrı sırası kayıttan okunur: eposta.kapat ve pg-boss stop birlikte, sonra app.close, sonra havuz.` },
    { name: 'Açılışta bir kez çalışacak iş kur iki kez çalışınca tek açılır', kind: 'behavior',
      asserts: `acilistaBirKez tanımlı exclusive test kuyruğu için kur iki kez çalışınca kuyrukta 1 iş vardır ve ikinci raporun acilisIsi listesi boştur; iş tamamlandıktan sonra kur yeniden çalışınca 1 yeni iş açılır (zemin); exclusive olmayan kuyrukta acilistaBirKez IS_KUYRUGU_TANIM_GECERSIZ verir.` },
    { name: 'Hata kataloğu D13 biçimine uyar', kind: 'contract',
      asserts: `IS_KUYRUGU_HATA_KODLARI hataKodlariTanimla'dan geçer ve TUM_HATALAR'a çift kodsuz girer; 20 kodun her birinde http 500, hoca ve ogrenci metni içe alınan IS_KUYRUGU_GENEL_HATA_METNI; işte fırlatılan bir D14 kodu API isteğine sızarsa cevap 500 API_SUNUCU_HATASI olur, gövdede D14 kodu geçmez.` },
    { name: 'Kapanış ve kapasite sonucu sınıra sayılmaz', kind: 'behavior',
      asserts: `Giriş kodu gönderimi kapanışta basarisiz (kapanis) bitince aynı adres 60 saniye beklemeden yeni izin alır; kapasite sonucu için de aynı; zemin: kalici (550) sonuçlu gönderimden sonra 60 saniye içindeki istek DAKIKA ile reddedilir.` },
    { name: 'Sınır denetimi READ COMMITTED dışında reddedilir', kind: 'behavior',
      asserts: `REPEATABLE READ ve SERIALIZABLE işlemde epostaSiniriDenetle IS_KUYRUGU_EPOSTA_YALITIM ile reddedilir ve satır yazılmaz; D12.islem'in varsayılan READ COMMITTED işleminde izin verir (zemin).` },
    { name: 'Altyapı iş fabrikaları isTanimla\'ya uyarlanır', kind: 'contract',
      asserts: `worker.ts'in topladığı kayıtta isletim_denetimi, isletim_kalp_atisi, sertifika_bitis_denetimi, haftalik_olcum_ozeti, saklama_suresi_isi ve donem_bolumu_denetimi kuyrukları exclusive ve Europe/Istanbul ile vardır; kacirilan 'once' verilen 10 dakikalık örnek iş IS_KUYRUGU_ZAMANLAMA_KURALI, saatDilimi 'UTC' verilen örnek IS_KUYRUGU_TANIM_GECERSIZ ile açılışı durdurur; uyarlanan işleyici isle'ye isKimligi, tetiklemeAni ve iptal'i aynen geçirir.` },
    { name: 'Satır yazımında veritabanı hatası BASARISIZ döner', kind: 'behavior',
      asserts: `bekliyor satırı başka işlemde kilitliyken koşullu güncelleme deyim süresi aşımıyla (57014) hata verince epostaGonder BASARISIZ (veritabani) döner, taşıyıcı çağrılmaz, log yalnız SQLSTATE taşır; ileti gittikten sonraki güncelleme hata verince sonuç GONDERILDI olur ve 10 dakika sonra isSagligi yarimKalan 1 gösterir.` },
  );

  // ------------------------------------------------------------ resolved gaps
  rep(gap('D14-B05'), 'why', `Envanterdeki 02:15 pg_dump önerisi D12'nin 03:30 seçimiyle değişti; 03:00-04:00 aynı zamanda geçmişteki yaz saati geçişinin saatidir.`,
    `03:00-04:00 geçmişteki yaz saati geçişinin saatidir; pencere ayrıca makinedeki gece işlerine yer bırakır: D12'nin 02:15 dökümü ve ardından gelen xprem birim yedeği büyüyen veritabanında 03:00'ü geçebilir, D15'in log arşivi 03:15'tedir.`);
  const b10 = gap('D14-B10');
  b10.decision = `Başlangıçta tek işçi kopyası. Tek işli kuyruk: localConcurrency 1, batchSize 1, pollingIntervalSeconds 2 (pg-boss varsayılanları açıkça yazılır). Çok işli kuyruk (bugün yalnız D08 devam_hesapla) partiIsleyici ile: batchSize parti.boyut (2-100), localConcurrency parti.esZamanli (1-4), pollingIntervalSeconds 0,5 (pg-boss alt sınırı); sarmalayıcı her işi ayrı tamamlar ya da başarısız sayar (PartiIsi). İşçinin bağlantı payı 5: pg-boss havuzu 2 (doğrudan), işleyicilerin Drizzle havuzu 3, havuzda bekleme 30 saniye (işçi etkileşimli değil). Parti kuyruklarının esZamanli toplamı Drizzle havuzunun 1 eksiğini geçmez: bugün devam_hesapla 2, tek işli kuyruklara en az 1 bağlantı kalır; işçi açılışı ve kur denetler. Sayı D12 ve D15 bütçesindeki 5 ile aynı; bütçe satırına 'işçi 5 = pg-boss 2 + Drizzle 3, Drizzle'ın 2'si devam_hesapla partileri' yazılır (istek). Yük testinden sonra gerekirse artar.`;
  b10.why = `D08 ders çıkışında yaklaşık 20.000 devam_hesapla işini 5 dakikada bitirmeli; tek tek alımda iş başına 50 ms ile bile yaklaşık 17 dakika sürer ve hedef tasarım gereği tutmazdı. pg-boss'un work işleyicisi zaten iş dizisi alır, complete ve fail kimlik dizisi kabul eder (pgboss.io/api/workers, pgboss.io/api/jobs); parti yardımcısı yalnız iş başına sonucu ve güvenli özeti ekler. Envanterler işçi bağlantısını 10 ve 5 önerdi; 100 sınırının yarısında kalan D15 hesabı 5'e dayanıyor. Bir zamanlama birden çok kopyada da tek iş gönderir; kopya artırmak zamanlamayı çoğaltmaz (pgboss.io/api/scheduling).`;
  rep(gap('D14-B11'), 'decision', `art arda başarısız ve yarım kalan gönderim.`, `art arda başarısız ve yarım kalan gönderim, zamanlamalı işin son çıktısı (sonCikti, D14-B23).`);
  rep(gap('D14-B11'), 'decision', `D15 isletim_uyarisi türüyle epostaGonder çağırır.`, `D15 isletim_uyarisi ve isletim_ozeti türleriyle epostaGonder çağırır.`);
  rep(gap('D14-B12'), 'decision', `Sarmalayıcı hatayı pg-boss'a yalnız güvenli özetle`,
    `Sarmalayıcı işleyiciden önce _istekKimligi'ni ayırır, kalanı strict ayrıştırır; yeni veri alanı iki yayında gelir (önce işçi tanır, sonra gönderen yazar). Dizilerin max'ı zorunludur, en kötü durum boyutu tanımda 8 KiB ile sınanır. Tamamlanan işin çıktısı yalnız kuyruğun çıktı şemasından geçer (D14-B23). Sarmalayıcı hatayı pg-boss'a yalnız güvenli özetle`);
  const b13 = gap('D14-B13');
  rep(b13, 'decision', `Zamanlama senaryoları zamanlaması açık ayrı bir örnek açar,`, `Zamanlama senaryoları zamanlamaliOrnekAc ile zamanlaması açık ayrı bir örnek açar (dış yüzü bağlamaz, ortak örneği durdurmaz; isKuyruguKur'un ikinci kurulum kuralı yalnız dış yüzü bağlayan kuruluma uygulanır),`);
  rep(b13, 'decision', `Zamanlama kurallarını sözleşme testi cron-parser'la denetler.`,
    `Zamanlama kurallarını sözleşme testi cron-parser'la denetler. Test desteği apps/server/test/steps/is-kuyrugu/destek.ts'te: isKuyrugunuBosalt (deleteAllJobs; D12'nin senaryoOncesiSifirla'sı ve D15'in kancası bunu çağırır), isiCalistirVeBekle, kuyruktakiIsler, zamanlamaliOrnekAc; imzalar dış yüz tablosunda.`);
  const b15 = gap('D14-B15');
  b15.decision = `Kararlı türler şimdi yazılır: giris_kodu, basvuru_kodu, basvuru_silme_kodu (D01-B32: onaylanmamış başvuranın web üzerinden silmesi), onay_bekliyor, giris_bildirimi ve ürün dışı isletim_uyarisi ile isletim_ozeti (D15). basvuru_silme_kodu giriş koduyla aynı biçimde (kod, geçerlilik, sabit cümle) ve aynı sınır sayacında. Kalan türler (başvuru onaylandı, hesap yok, başvuru reddedildi, Aşama 2 projeksiyon uyarısı) karar bekliyor (Açık noktalar, D14-A01). Yeni tür bir şablon, tür listesine bir satır ve CHECK'i genişleten bir göçtür.`;
  b15.why = `Başvuru silme kodu bekletilemez: onaydan önce giriş olmadığından (plan.html#kararlar-roller) başvuranın tek silme yolu e-posta kodudur, Google Play web üzerinden silmeyi şart koşar (plan.html#kararlar-hesap-silme) ve D01 bu türü sayaca zaten katıyor (D01-B08). Öbür her yeni e-posta türü DMARC p=none ortamında oltalama yüzeyini büyütür; D01 ve D11 envanterleri D14'ün önerisinden farklı öneriyor. Bu bir ürün kararıdır ve henüz verilmedi (Açık noktalar, D14-A01).`;
  rep(gap('D14-B16'), 'decision', "'<ürün adı> başvuru kodu',", "'<ürün adı> başvuru kodu', '<ürün adı> başvuru silme kodu',");
  const b17 = gap('D14-B17');
  rep(b17, 'decision', `Kapanışta kapat(): API'de 10, işçide 5 saniye bekler, bekleyen deneme beklemelerini kapanis sonucuyla bitirir; sıra app.close, eposta.kapat, iş kuyruğu durdur, havuz kapat.`,
    `Kapanışta kapat(): API'de 10, işçide 5 saniye bekler, bekleyen deneme beklemelerini kapanis sonucuyla bitirir. API sırası app.close, eposta.kapat, iş kuyruğu durdur, havuz kapat; işçi sırası eposta.kapat ile pg-boss stop birlikte, sonra app.close, sonra havuz: deneme beklemesindeki işleyici pg-boss süresinde biter, süre aşımıyla yeniden çalışıp aynı uyarıyı ikinci kez göndermez. Satır yazımında veritabanı hatası gönderimden önceyse BASARISIZ (veritabani), sonraysa GONDERILDI.`);
  const b19 = gap('D14-B19');
  b19.decision = `Kayan pencereler: son 60, 3.600 ve 86.400 saniye, saat diliminden bağımsız; sayılar sinir.ts'teki EPOSTA_SINIRLARI sabitinde (1, 5, 10). Sayılan türler isteğin tetiklediği e-postalar: giris_kodu, basvuru_kodu, basvuru_silme_kodu, onay_bekliyor (eklenirse hesap yok). Giriş bildirimi ve işletim e-postaları sayılmaz. SMTP denemesi tamamlanmış başarısız gönderim sayılır; sinirda satırı ile kapasite, kapanis ve veritabani sonuçlu satır sayılmaz. Sayma ve ekleme çağıranın READ COMMITTED işleminde, özet başına pg_advisory_xact_lock ile (iki anahtarlı biçim: sınıf 14, özetin ilk 4 baytı); aynı anda gelen iki istek sınırı aşamaz, çakışan iki özet yalnız sırayla bekler; başka yalıtım düzeyi IS_KUYRUGU_EPOSTA_YALITIM. Sınır aşılınca e-posta gitmez, cevap D01'de aynı kalır; ret özet başına 24 saatte bir sinirda satırı yazar, sonrakiler yalnız loglanır. Sayım dizini sinirda'yı dışlayan kısmi dizindir; okunan satır özet başına sınırlı kalır.`;
  b19.why = `Takvim günü gece yarısının iki yanında 20 kod demek ve sınırı saat dilimine bağlar. onay bekliyor sayılmazsa onay bekleyen birinin kutusu doldurulabilir. Kopyalar arası kesin sayaç PostgreSQL'de olmalı (plan.html#teknoloji-sunucu-yeri). Girişsiz IP sınırı dakikada 3.000; her ret satır yazsaydı tek adrese günde milyonlarca satır yazılır, sayım her istekte bunları tarar ve kilidi o süre tutardı, D01'in sabit cevap süresi aşılırdı. Kapanışta biten kodu sayan kural her yayında hocayı bir dakika girişsiz bırakırdı; plan girişsiz kalmayı daha büyük zarar sayıyor (plan.html#kararlar-tek-etkenli-giris). Yüksek yalıtımda görüntü kilitten önce alınabilir, iki istek 0 sayar.`;
  const b21 = gap('D14-B21');
  rep(b21, 'decision', `SMTP gizli ayarı API'ye ve, D15 işletim uyarısını e-postayla yollarsa, işçiye verilir.`,
    `smtp_parolasi ve eposta_ozeti anahtarı API kopyalarına ve işçiye koşulsuz verilir: işçi isletim_uyarisi ve isletim_ozeti gönderir, e-posta ayarı eksikse açılmaz. Güvenlik ayarı: tls secure true; starttls secure false ve requireTLS true (STARTTLS ilan etmeyen sunucuya düz metin kimlik doğrulama ve ileti gitmez); ikisinde en az TLS 1.2 ve sertifika doğrulaması, ayarla kapatılamaz.`);
  rep(b21, 'why', `Yedekli gönderici iki yolun bakımını ister, bu ölçekte gerekmez.`,
    `Yedekli gönderici iki yolun bakımını ister, bu ölçekte gerekmez. Nodemailer'da requireTLS verilmezse sunucu STARTTLS ilan etmediğinde bağlantı düz metinde sürer (nodemailer.com/smtp); ilanı silen ağ saldırganı giriş kodunu (tek etken) ve SMTP parolasını okurdu.`);

  S.resolved_gaps.push(
    { gap: 'D14-B23 (gözden geçirmeden)',
      decision: `Zamanlamalı işin küçük ölçüsü pg-boss iş çıktısında durur: KuyrukTanimi.cikti isteğe bağlı Zod şeması (açık sınırlı tam sayı, mantıksal, sabit liste; en çok 1 KiB), tek işli işleyici Promise<C | void> döndürür, sarmalayıcı şemayla doğrulayıp output'a yazar; şemasız kuyrukta dönen değer ya da şemaya uymayan değer IS_KUYRUGU_CIKTI_GECERSIZ. IsSagligi.kuyruklar[].zamanlama.sonCikti son completed işin output'udur. D08 devam_tutarlilik_denetimi { dersSayisi, ogrenciSayisi, farkSayisi, farkTurleri } döndürür; D15'in isletim.devam_tutarlilik_farki kuralı sonCikti.farkSayisi > 0'ı okur. D15'in önerdiği ikinci yol (D08'in uyariAc çağırması) seçilmedi: D08 ve D15 bu yolu zaten tasarladı, D08 D15'i çağırmaz.`,
      why: `pg-boss işleyicinin dönüş değerini output'a yazar (pgboss.io/api/workers); D14 sarmalayıcısı bu yolu kapatırsa plan.html#hedefler'deki 'hesabın elle hesaplananla uyuşmazlığı 0' hedefinin tek alarm yolu kurulamaz. Şema, çıktıya değer sızmasını veri kuralıyla aynı biçimde engeller.` },
    { gap: 'D14-B24 (gözden geçirmeden)',
      decision: `Bağlantı denetimi kuralı yazılı ve örnek tablosuyla sınanır (Bağlantı denetimi tablosu): şema ('://', http:, https:, ftp:, mailto:), 'www.' öneki, '@' ve IANA kök listesinde (tlds paketi, tam sabit) ya da RFC 6761 özel adlarında biten ana makine biçimi. Ürün türünde takılan belirteç şablon hatasıdır (IS_KUYRUGU_EPOSTA_BAGLANTI); ürün dışı türde belirteç [adres] olur ve log yalnız sayıyı yazar.`,
      why: `Kural yazılmadan test edilemezdi; işletim uyarısında ret uygulansaydı D15 satırlarındaki 'isletim.wal_arsivi', 'chrony.json', '12.37.0' gibi belirteçler alan adı sayılabilir, isletim_denetimi hata alır ve uyarılar hiç gitmezdi. Dosya adı alan adı sonuyla bitebilir (ör. .sh): işletim e-postasında [adres] olur, bu kayıp uyarının gitmemesinden küçüktür.` },
    { gap: 'D14-B25 (gözden geçirmeden)',
      decision: `worker.ts açılış sırası ve her adımın çıkış kodu İşçi açılışı tablosunda: ayarlar (D15), log, TZ, veritabanı (yoklama_isci, havuz 3, bekleme 30 sn), yayinBilgisiYukle (D13; işçideki D07 kodu için), sistemSaati (D04), epostaKur, app.ts kurucusu (surec 'isci', dinleme yok), tanımlar ve altyapı iş fabrikaları (D15 isletimIsleri, D12 veritabaniIsleri; altyapiIsleriniUyarla), isKuyruguKur, en son work ve zamanlama. Yapılandırma hatası çıkış 78 (D15'in ayar çıkış koduyla aynı), öbürleri 1.`,
      why: `Sıra yazılmazsa işçideki D07 kodu yayinBilgisi() çağrısında hata fırlatır, D15'in dört işi ve D12'nin iki işi kaydolmaz; çıkış kodu Compose ve işletim için yapılandırma hatasını geçici hatadan ayırır.` },
    { gap: 'D14-B26 (gözden geçirmeden)',
      decision: `isTanimla'da acilistaBirKez: true yalnız exclusive kuyrukta; kur (yayın adımı) her çalışmada bu kuyruklara bir iş gönderir, bekleyen ya da çalışan iş varken exclusive politika ikinci işi açmaz. D01 inceleme_hesaplari_kurulumu bunu kullanır (yayında bir kez ve 00:45 zamanlaması).`,
      why: `D01 işin yayın adımında da çalışmasını istiyor; ayrı yol yazılmazsa her modül kendi açılış kodunu yazardı. Tekillik anahtarına yayın kimliği koymak gerekmez: exclusive politika aynı sonucu verir ve iş zaten tekrar çalışmaya dayanıklıdır.` },
  );

  // ------------------------------------------------------------ contradictions
  S.contradictions_resolved.push({ id: 'D14-C05', resolution: `'isKuyruguKur ikinci kurulumda hata verir' ile 'zamanlama senaryoları ayrı örnek açar' çelişmez: ayrı örnek test desteğindeki zamanlamaliOrnekAc'tır, dış yüz işlevlerini bağlamaz ve ortak örneği durdurmaz; ikinci kurulum kuralı yalnız dış yüzü bağlayan kuruluma uygulanır.` });

  // ------------------------------------------------------------ open points
  const a01 = must(S.open_points.find(o => o.id === 'D14-A01'), 'A01');
  a01.question = `Kararlı ürün e-postalarına (giriş kodu, başvuru kodu, başvuru silme kodu, onay bekliyor, giriş bildirimi) hangileri eklensin: başvuru onaylandı, hesap yok (tanınmayan adrese, D01-B06), başvuru reddedildi, Aşama 2'de projeksiyon kodu başka hocanın hesabıyla kullanılınca uyarı (D11)?`;
  rep(a01, 'recommendation', ` Başvuru silme kodu D01-B32 kararına bağlı; seçilirse giriş koduyla aynı şablon ve aynı sınır sayacı.`, ``);

  // ------------------------------------------------------------ queue policy
  const qp = n => must(S.queue_policy.find(p => p.ayar === n), 'queue policy ' + n);
  const w = qp('work: localConcurrency, batchSize, pollingIntervalSeconds, includeMetadata');
  w.deger = `tek işli: 1, 1, 2, true; parti: parti.esZamanli (1-4), parti.boyut (2-100), 0,5, true`;
  w.not = `işçide; includeMetadata tetiklemeAni için; parti kuyruklarının esZamanli toplamı Drizzle havuzundan (3) en az 1 eksik`;
  const da = qp('deleteAfterSeconds');
  da.deger = `604.800 (7 gün); seyrek zamanlamalı kuyrukta en az 2 x beklenen aralık + 86.400 (haftalık iş 1.296.000)`;
  da.not = `biten (completed, failed) iş; son başarı anı ve son çıktı sonraki çalışmaya kadar okunur`;
  const pi = S.queue_policy.indexOf(w);
  S.queue_policy.splice(pi + 1, 0,
    { ayar: 'cikti (KuyrukTanimi)', deger: 'isteğe bağlı Zod şeması, en çok 1 KiB', not: 'tamamlanan işin output alanı; parti kuyruğunda yok' },
    { ayar: 'acilistaBirKez', deger: 'yalnız exclusive kuyrukta', not: 'kur yayın adımında bir iş gönderir; bekleyen iş varken ikincisi açılmaz' });

  // ------------------------------------------------------------ schedule plan
  const sp = S.schedule_plan;
  const spi2 = n => must(sp.findIndex(p => p.is === n), 'schedule ' + n);
  sp.splice(spi2('pgbackrest_dogrulama'), 1);
  sp.splice(spi2('ota_yayin_denetimi'), 1);
  sp.splice(spi2('pgbackrest_fark_yedek, pazar pgbackrest_tam_yedek') + 1, 0,
    { saat: '01:30 çarşamba', is: 'pgbackrest_dogrulama', modul: 'D12', yer: 'makine', not: 'fark yedeği sürüyorsa kilitte bekler' });
  sp.splice(spi2('hesap_silme_yurutucu') + 1, 0,
    { saat: '02:15', is: 'gecelik_pg_dump ve ardından xprem_birimi_yedegi', modul: 'D12', yer: 'makine', not: 'systemd zamanlayıcısı, pg-boss dışında' });
  const bos = sp[spi2('pg-boss günlük işi yok')];
  bos.not = `03:15 gunluk_log_arsivi (D15), makinede; 02:15 döküm zincirinin uzamasına da yer bırakır`;
  const gi = sp[spi2('gece_inceleme_siralamasi')];
  gi.not = `sonra: pencere_beklemede_kesinlestir, bekleyen_kararlari_coz, devam_tutarlilik_denetimi; 02:15 dökümünden 3 saat 35 dakika sonra, ilk dersten önce`;
  sp.splice(spi2('donem_bolumu_denetimi') + 1, 0,
    { saat: '06:35', is: 'sertifika_bitis_denetimi', modul: 'D15', yer: 'pg-boss', not: '' });
  const ho = sp[spi2('haftalik_olcum_ozeti')];
  ho.saat = 'pazartesi 07:10';
  ho.not = 'ders başı yoğunluğundan önce; ota_yayin_denetimi GitHub Actions\'a geçti (D15)';
  const dt = sp[spi2('devam_tutarlilik_denetimi')];
  dt.not = 'D08 tasarımı 04:10 yazıyor, kural 03:00-05:00 dışını ister (istek)';

  // ------------------------------------------------------------ templates
  const ti = n => must(S.templates.findIndex(t => t.tur === n), 'template ' + n);
  S.templates.splice(ti('basvuru_kodu') + 1, 0, {
    tur: 'basvuru_silme_kodu',
    konu: '<ürün adı> başvuru silme kodu',
    metin: ['Başvuru silme kodun: <kod>', 'Kod <gecerlilikDakika> dakika geçerli ve yalnız bir kez kullanılır. Kodu girince başvurun ve başvuru bilgilerin silinir.', '', '<SABIT_UYARI_CUMLESI>'],
  });
  S.templates.splice(ti('isletim_uyarisi') + 1, 0, {
    tur: 'isletim_ozeti',
    konu: '<ürün adı> işletim özeti: <konu>',
    metin: ['<satirlar, her biri ayrı satır; bağlantı belirteci [adres] olur>'],
  });
  S.templates[ti('isletim_uyarisi')].metin = ['<satirlar, her biri ayrı satır; bağlantı belirteci [adres] olur>'];

  // ------------------------------------------------------------ constants
  S.constants.push(
    { ad: 'SMTP_TLS_AYARLARI', deger: `{ minVersion: 'TLSv1.2', rejectUnauthorized: true }`, kaynak: 'D14-B21' },
    { ad: 'IS_PARTI_SINIRLARI', deger: '{ boyut: [2, 100], esZamanli: [1, 4], yoklamaSaniye: 0.5 }', kaynak: 'D14-B10' },
    { ad: 'ISCI_HAVUZU', deger: '{ pgBoss: 2, drizzle: 3, beklemeMs: 30000 }', kaynak: 'D14-B10' },
    { ad: 'IS_BOYUT_SINIRLARI', deger: '{ veriEnCokBayt: 8192, ciktiEnCokBayt: 1024 }', kaynak: 'D14-B12, D14-B23' },
    { ad: 'ALTYAPI_IS_VARSAYILANI', deger: `{ politika: 'exclusive', sureAsimiSaniye: 1800, deneme: { sayi: 3, beklemeSaniye: 30 } }`, kaynak: 'D14-B25' },
    { ad: 'ISCI_ACILIS_ADIMLARI', deger: 'İşçi açılışı tablosundaki 11 adımın adı ve çıkış kodu (78 ya da 1)', kaynak: 'D14-B25' },
    { ad: 'IS_KUYRUGU_GENEL_HATA_METNI', deger: 'Beklenmeyen bir sorun oldu. Biraz sonra yeniden dene.', kaynak: 'D13 hataKodlariTanimla biçimi' },
  );

  // ------------------------------------------------------------ error codes
  const ec = k => must(S.error_codes.find(e => e.kod === k), 'error ' + k);
  rep(ec('IS_KUYRUGU_TANIM_GECERSIZ'), 'ne_zaman', `5 alanlı olmayan cron.`,
    `5 alanlı olmayan cron, parti ayarı sınır dışı ya da esZamanli toplamı havuzu dolduruyor, en kötü durum veri boyutu 8 KiB ya da çıktı boyutu 1 KiB üstü, acilistaBirKez exclusive olmayan kuyrukta, altyapı işinde saat dilimi Europe/Istanbul değil.`);
  rep(ec('IS_KUYRUGU_ZAMANLAMA_KURALI'), 'ne_zaman', `missed kuralı bozuk.`, `missed kuralı bozuk (altyapı işinin kacirilan değeri sıklıkla uyuşmuyor).`);
  ec('IS_KUYRUGU_SAAT_DILIMI').sonuc = 'İşçi açılmaz (çıkış 78).';
  ec('IS_KUYRUGU_KUYRUK_EKSIK').sonuc = 'İşçi açılmaz (çıkış 1).';
  rep(ec('IS_KUYRUGU_SEMA_SURUMU'), 'sonuc', `API, işçi ve kur açılmaz.`, `API, işçi ve kur açılmaz (işçide çıkış 1).`);
  const bag = ec('IS_KUYRUGU_EPOSTA_BAGLANTI');
  bag.ne_zaman = `Ürün e-postasının işlenen metninde bağlantı denetimine takılan belirteç var (yalnız şablon hatasıyla olur).`;
  bag.sonuc = `Söz reddedilir, e-posta gitmez. Ürün dışı türde (isletim_uyarisi, isletim_ozeti) belirteç [adres] olur, hata verilmez.`;
  const ae = ec('IS_KUYRUGU_EPOSTA_AYAR_EKSIK');
  ae.ne_zaman = `SMTP ayarı, gönderen adresi, görünen ad, ürün adı ya da 32 baytlık özet anahtarı yok; yayında güvenlik 'yok'.`;
  ae.sonuc = 'API ve işçi açılmaz (işçide çıkış 78).';
  const ai = S.error_codes.indexOf(ec('IS_KUYRUGU_VERI_BUYUK'));
  S.error_codes.splice(ai + 1, 0, { kod: 'IS_KUYRUGU_CIKTI_GECERSIZ', ne_zaman: `İşleyicinin döndürdüğü değer kuyruğun çıktı şemasına uymuyor, 1 KiB üstü ya da kuyrukta çıktı şeması yokken değer döndü.`, sonuc: `İş başarısız sayılır (deneme, sonra ölü kuyruk); log error. Programlama hatası.` });
  const si = S.error_codes.indexOf(ec('IS_KUYRUGU_EPOSTA_SINIR_ATLANDI'));
  S.error_codes.splice(si + 1, 0, { kod: 'IS_KUYRUGU_EPOSTA_YALITIM', ne_zaman: `epostaSiniriDenetle READ COMMITTED olmayan işlemde çağrıldı.`, sonuc: `Söz reddedilir, satır yazılmaz, çağıranın işlemi geri alınır. Programlama hatası.` });
  for (const e of S.error_codes) { e.http = 500; e.hoca = 'IS_KUYRUGU_GENEL_HATA_METNI'; e.ogrenci = 'IS_KUYRUGU_GENEL_HATA_METNI'; }
  must(S.error_codes.length === 20 ? 1 : undefined, 'error code count 20');

  // ------------------------------------------------------------ requests
  const rq = m => must(S.requests.find(r => r.modul === m), 'request ' + m);
  rq('D01').istek = `Kod (giris), başvuru kodu, başvuru silme kodu (basvuru_silme_kodu) ve onay bekliyor e-postasından önce, kod üretmeden ve adresle ilgili başka kilitten önce, kendi READ COMMITTED işleminde epostaSiniriDenetle(tx, normalAdres, tur); izin yoksa kod üretmez, cevap aynı. İşlem bitip cevap gittikten sonra (onResponse) epostaGonder; giris_bildirimi BASARISIZ dönerse D09.denetimeYaz ile bildirim_gonderilemedi. Adres D01'in tek normalleştirme fonksiyonundan geçmiş olur. Cihaz etiketi tarayıcı ya da telefon ailesi ve işletim sisteminden oluşan sabit listeden üretilir. inceleme_hesaplari_kurulumu tanımına acilistaBirKez: true (yayında bir kez).`;
  rep(rq('İş tanımlayan modüller'), 'istek', `her işin 'aynı veriyle iki kez çalışırsa' senaryosu D14'ün adımıyla yazılır.`,
    `her işin 'aynı veriyle iki kez çalışırsa' senaryosu D14'ün adımıyla yazılır. Çok işli kuyruk partiIsleyici ve parti ayarıyla; zamanlamalı iş ölçüsünü çıktı şemasıyla döndürebilir.`);
  const d12 = rq('D12');
  d12.istek = `PostgreSQL timezone 'UTC'; yoklama_goc, yoklama_api, yoklama_isci rolleri; db:migrate sırası Drizzle göçleri, pg-boss migrate, worker.ts kur; test sıfırlaması pgboss şemasına yalnız D14'ün isKuyrugunuBosalt'ı (deleteAllJobs) üzerinden dokunur; eposta_gonderimleri göçü tabloYardimcilari ile ve tablo haritası denetiminden geçer; veritabaniIsleri tanımına isteğe bağlı sureAsimiSaniye (yoksa D14 1.800 saniye kullanır); bağlantı bütçesinde işçi satırı 'pg-boss 2 + Drizzle 3, Drizzle'ın 2'si devam_hesapla partileri'.`;
  rep(rq('D13'), 'istek', `IS_KUYRUGU_ kodları hatalar.ts birleştirmesine girsin.`, `IS_KUYRUGU_HATA_KODLARI hataKodlariTanimla biçiminde (http 500, genel metin) hatalar.ts birleştirmesine girsin.`);
  rq('D15').istek = `compose.yaml: API, işçi ve göç kaplarında TZ=UTC; işçide stop_grace_period 40 saniye; smtp_parolasi ve eposta_ozeti anahtarı API kopyalarına ve işçiye koşulsuz (işçi isletim_uyarisi ve isletim_ozeti gönderir; e-posta ayarı eksikse işçi açılmaz). apps/server/package.json: pg-boss 12 tam sabit (en az 12.36.0), nodemailer tam sabit, cron-parser tam sabit (pg-boss'un kullandığı sürüm), tlds tam sabit (bağlantı denetiminin IANA listesi); db:migrate'e kur adımı. Biome noRestrictedImports: pg-boss ve nodemailer yalnız infra/is-kuyrugu ve infra/eposta içinde. Ayar şeması: EPOSTA_SMTP_SUNUCU, EPOSTA_SMTP_PORT, EPOSTA_SMTP_GUVENLIK, EPOSTA_SMTP_KULLANICI, EPOSTA_GONDEREN_ADRES, EPOSTA_GONDEREN_AD, EPOSTA_URUN_ADI, EPOSTA_GUNLUK_SINIR, işçi ve göç bağlantı adresleri. server.ts açılışta isKuyruguKur({ rol: 'api', saat }) ve epostaKur({ saat, ... })'u app.ts'ten önce çağırır; saat D04'ün Saat nesnesidir, uyarlayıcı gerekmez; kapanış sırası app.close, eposta.kapat(10 sn), iş kuyruğu durdur, havuz kapat. Bağlantı bütçesi satırı: işçi 5 = pg-boss 2 + Drizzle 3, Drizzle'ın 2'si devam_hesapla partileri. isletim.devam_tutarlilik_farki kuralı IsSagligi'nda devam_tutarlilik_denetimi kuyruğunun zamanlama.sonCikti.farkSayisi > 0 koşulunu okur; haftalık özet isletim_ozeti türüyle gider. Test dünyası kancası her senaryodan önce isKuyrugunuBosalt'ı çağırır.`;
  S.requests.push(
    { modul: 'D08', istek: `devam_hesapla tanımı partiIsleyici ve parti { boyut: 50, esZamanli: 2 } ile, sureAsimiSaniye bütün parti için; devam_tutarlilik_denetimi kuyruğuna çıktı şeması { dersSayisi, ogrenciSayisi, farkSayisi: açık sınırlı z.int; farkTurleri: z.enum dizisi } ve işleyici bu nesneyi döndürür; çizelge kuralı gereği 04:10 yerine 03:00-05:00 dışında bir saat (D14 önerisi 05:35, D09'un sıralamasından önce).` },
    { modul: 'Mimari (contracts.json)', istek: `D14 dış yüz satırı 'epostaSiniriDenetle(tx, adres, tur)' olsun (adresOzeti değil; özet D14 içinde hesaplanır); D14 reads_from listesine D04 (Saat tipi) ve D13 (istek kimliği, hataKodlariTanimla) eklensin; worker.ts bileşim kökü olarak D15'i (ayarlariYukle, logOlustur, gizliAnahtar, isletimIsleri), D13'ü (app.ts kurucusu, yayinBilgisiYukle) ve D12'yi (veritabaniKur, veritabaniIsleri) bağlar. Dosya haritasına apps/server/test/support/is-kuyrugu* D14'e eklenirse destek.ts oraya taşınır.` },
  );

  // ------------------------------------------------------------ worker start-up table (new key)
  S.worker_acilisi = [
    { adim: '1', ne: `ayarlar = ayarlariYukle({ surec: 'isci' }) (D15)`, hata: `AyarHatasi (ISLETIM_AYAR_GECERSIZ, ISLETIM_SAAT_DILIMI): stderr'e yalnız ad listesi`, cikis: '78' },
    { adim: '2', ne: `log = logOlustur({ ayarlar }) (D15); bundan sonra her hata koduyla ve sınıfıyla loglanır`, hata: `kaydedici kurulamadı`, cikis: '1' },
    { adim: '3', ne: `TZ denetimi: süreç saat farkı 0 (ayarlariYukle denetimine ikinci güvence)`, hata: `IS_KUYRUGU_SAAT_DILIMI`, cikis: '78' },
    { adim: '4', ne: `veritabani = veritabaniKur({ rol: 'yoklama_isci', parola: yoklama_isci_parolasi, havuzBoyutu: 3, havuzBeklemeMs: 30000, uygulamaAdi: 'iu-yoklama-isci' }) (D12); semaDurumu hazır olana kadar en çok 120 saniye, geride ise hemen`, hata: `ulaşılamıyor ya da şema geride`, cikis: '1' },
    { adim: '5', ne: `yayinBilgisiYukle(ayarlar.yayinBilgisiYolu) (D13): işçideki D07 kodu hatalı sürüm listesini görür`, hata: `dosya yok ya da şemaya uymuyor`, cikis: '78' },
    { adim: '6', ne: `saat = sistemSaati() (D04)`, hata: `yok`, cikis: '1' },
    { adim: '7', ne: `eposta = epostaKur({ tasiyici: smtpTasiyicisi(ayar), gonderen, urunAdi, ozetAnahtari: gizliAnahtar('eposta_ozeti').deger, veritabani, saat, log, gunlukSinir })`, hata: `IS_KUYRUGU_EPOSTA_AYAR_EKSIK`, cikis: '78' },
    { adim: '8', ne: `app = app.ts kurucusu({ surec: 'isci', ayarlar, log, veritabani, saat, eposta, ... }) (D13); app.ready(), dinleme yok: modül kayıtları (dinleyiciler, D12 saklama işleyicileri) işçide de kurulur`, hata: `kayıt ya da eklenti hatası`, cikis: '1' },
    { adim: '9', ne: `tanimlar = 15 modülün jobs/<modül>/index.ts isler dizileri + altyapiIsleriniUyarla([...isletimIsleri(bag), ...veritabaniIsleri({ veritabani, simdi: () => new Date(saat.simdi()) })]); bag = { veritabani, isSagligi, epostaGonder, saat, ayarlar, log }`, hata: `IS_KUYRUGU_TANIM_GECERSIZ, IS_KUYRUGU_YINELENEN_AD, IS_KUYRUGU_ZAMANLAMA_KURALI`, cikis: '1' },
    { adim: '10', ne: `isKuyrugu = isKuyruguKur({ rol: 'isci', veritabani, baglantiAdresi, tanimlar, saat, log, zamanlamaAcik: true, bakimAcik: true }): şema sürümü, kayıtlı kuyruklar ve kurallar denetlenir, pg-boss başlar`, hata: `IS_KUYRUGU_SEMA_SURUMU, IS_KUYRUGU_KUYRUK_EKSIK`, cikis: '1' },
    { adim: '11', ne: `work kayıtları (tek işli ve parti ayarlarıyla) ve zamanlama açılır; isci.hazir logu (tanım sayısı, yayın sırası)`, hata: `pg-boss hatası`, cikis: '1' },
    { adim: 'Kapanış', ne: `SIGTERM ya da SIGINT: eposta.kapat(5000) ile isKuyrugu.durdur() (pg-boss stop, graceful, 30 sn) birlikte; sonra app.close(); sonra veritabani.kapat(); log flush`, hata: `ikinci sinyal ya da 38 saniye aşımı`, cikis: '0 (aşımda 1)' },
    { adim: 'Çökme', ne: `unhandledRejection ve uncaughtException: hata sınıfı ve yığın fatal düzeyde (değer yok), flush`, hata: `her biri`, cikis: '1' },
  ];

  // ------------------------------------------------------------ link-check rule table (new key)
  S.baglanti_kurali = [
    { kural: `Belirteç: boşlukla ayrılan parça; baştaki ve sondaki ( ) [ ] , ; : . ! ? " ' ayıklanır, büyük küçük harf duyarsız`, yakalar: `(www.x.com).`, gecer: `` },
    { kural: `Şema: belirteçte '://' ya da http:, https:, ftp:, mailto: başlangıcı`, yakalar: `http://x, HTTPS://X.COM, ftp://y, mailto:z`, gecer: `saat 02:15 (iki nokta şema değil)` },
    { kural: `'www.' ile başlayan belirteç`, yakalar: `www.x.com`, gecer: `` },
    { kural: `'@' içeren belirteç`, yakalar: `a@b.co`, gecer: `` },
    { kural: `Ana makine biçimi: noktayla ayrılmış en az iki etiket (ASCII harf, rakam, tire; alt çizgi yok), isteğe bağlı /yol; son etiket IANA kök listesinde (tlds paketi, tam sabit) ya da RFC 6761 özel adlarından (example, invalid, localhost, test) ya da local, onion, internal`, yakalar: `ornek.example, istanbul.edu.tr, x.com/yol`, gecer: `isletim.wal_arsivi (alt çizgi), chrony.json (json alan adı sonu değil), 12.37.0 (son etiket sayı), D14-B05, /durum/saat, oturum_pencere_kapat` },
    { kural: `Sonuç: ürün türünde IS_KUYRUGU_EPOSTA_BAGLANTI (şablon hatası); ürün dışı türde belirteç [adres] olur, log yalnız tür ve sayıyı yazar; cihaz etiketinde 'Bilinmeyen cihaz'`, yakalar: ``, gecer: `` },
  ];
};
