// D14 alignment (r17 stage 4b): applies the architect's align/D14.json instructions to the spec object S
// after patch-d14.js. Every edit asserts its anchor, so a stale anchor fails loudly instead of silently skipping.
'use strict';

module.exports = function align(S) {
  const must = (v, what) => { if (v === undefined || v === null || v === -1) throw new Error('align anchor missing: ' + what); return v; };
  const ex = n => must(S.exports.find(e => e.name === n), 'export ' + n);
  const exi = n => must(S.exports.findIndex(e => e.name === n), 'export ' + n);
  const gap = id => must(S.resolved_gaps.find(g => g.gap === id), 'gap ' + id);
  const tst = n => must(S.tests.find(t => t.name === n), 'test ' + n);
  const rep = (o, k, from, to) => { must(o[k].includes(from) ? 1 : undefined, `${k}: ${from.slice(0, 60)}`); o[k] = o[k].replace(from, () => to); };
  const sm = n => must(S.state_machines.find(m => m.name === n), 'state machine ' + n);
  const tr = (m, from, to) => must(m.transitions.find(t => t.from === from && t.to === to), `transition ${from}->${to}`);
  const DESTEK = 'apps/server/test/support/is-kuyrugu.ts';

  // ------------------------------------------------------------ summary
  rep(S, 'summary', `HTTP ucu yoktur;`,
    `worker.ts işçinin bileşim köküdür: D15'in ayarları ve logu, D12'nin iki veritabanı girişi (yoklama_isci, yoklama_saklama) ve işleri, D13'ün uygulamaKur'u ve modüllerin iş tanımları orada bağlanır. HTTP ucu yoktur;`);

  // ------------------------------------------------------------ exports: plain names, remarks into not (instruction 4)
  const yeniAd = (eski, ad, not) => { const e = ex(eski); e.name = ad; if (not) e.not = not; return e; };
  for (const n of ['isGonder', 'isTanimla', 'epostaGonder', 'epostaSiniriDenetle', 'isSagligi']) ex(n).not = 'dış yüz (contracts.json)';
  yeniAd('IsSagligi (tip)', 'IsSagligi', 'tip');
  yeniAd('KuyrukTanimi (tip, sözleşme)', 'KuyrukTanimi', 'tip; sözleşme dosyası packages/contracts/src/is-kuyrugu.ts');
  yeniAd('IsBaglami (tip)', 'IsBaglami', 'tip');
  yeniAd('isKuyruguKur (bileşim kökü)', 'isKuyruguKur', 'bileşim kökü');
  yeniAd('kuyruklariKur (bileşim kökü)', 'kuyruklariKur', 'bileşim kökü (yayın adımı, worker.ts kur)');
  yeniAd('epostaKur (bileşim kökü)', 'epostaKur', 'bileşim kökü');
  yeniAd('smtpTasiyicisi (bileşim kökü)', 'smtpTasiyicisi', 'bileşim kökü');
  yeniAd('epostaGonderimleriniTemizle (D14 içi)', 'epostaGonderimleriniTemizle', 'D14 içi');
  yeniAd('epostaSagligi (D14 içi)', 'epostaSagligi', 'D14 içi');
  yeniAd('IS_KUYRUGU_HATA_KODLARI (sözleşme)', 'IS_KUYRUGU_HATA_KODLARI', 'sözleşme; packages/contracts/src/is-kuyrugu.ts');
  yeniAd('baglantiDenetle (D14 içi)', 'baglantiDenetle', 'D14 içi');
  yeniAd('altyapiIsleriniUyarla (D14 içi, worker.ts)', 'altyapiIsleriniUyarla', 'D14 içi; yalnız worker.ts çağırır');
  yeniAd('sahtePostaKutusu (test desteği)', 'sahtePostaKutusu', 'test desteği; apps/server/test/support/sahte-posta.ts');
  yeniAd('isKuyrugunuBosalt (test desteği)', 'isKuyrugunuBosalt', 'test desteği; ' + DESTEK);
  yeniAd('zamanlamaliOrnekAc (test desteği)', 'zamanlamaliOrnekAc', 'test desteği; ' + DESTEK);

  // PartiIsi ve PartiBaglami (tip): two entries
  {
    const i = exi('PartiIsi ve PartiBaglami (tip)');
    const e = S.exports[i];
    const [sigIs, sigBag] = e.signature.split('; type PartiBaglami');
    must(sigBag ? 1 : undefined, 'PartiBaglami signature');
    S.exports.splice(i, 1,
      { name: 'PartiIsi', signature: sigIs, purpose: e.purpose, not: 'tip' },
      { name: 'PartiBaglami', signature: 'type PartiBaglami' + sigBag, purpose: `Parti işleyicisinin bağlamı: kuyruk adı, kuyruk adıyla açılmış alt kaydedici ve pg-boss'un süre aşımı ya da kapanış iptal sinyali. Tek işli tanımın IsBaglami'sinden farkı iş başına alanların (isId, deneme, tetiklemeAni, istekKimligi) PartiIsi'nde durmasıdır.`, not: 'tip' });
  }

  // EPOSTA_TURLERI ve EpostaVerisi: two entries
  {
    const i = exi('EPOSTA_TURLERI ve EpostaVerisi');
    const e = S.exports[i];
    const [sigTur, sigVeri] = e.signature.split('; type EpostaVerisi');
    must(sigVeri ? 1 : undefined, 'EpostaVerisi signature');
    const kes = 'bağlantı belirteci [adres] olur.';
    const k = must(e.purpose.indexOf(kes), 'EPOSTA_TURLERI purpose split');
    S.exports.splice(i, 1,
      { name: 'EPOSTA_TURLERI', signature: sigTur + '  // apps/server/src/infra/eposta/turler.ts', purpose: e.purpose.slice(0, k + kes.length), not: 'sabit' },
      { name: 'EpostaVerisi', signature: 'type EpostaVerisi' + sigVeri, purpose: `Her türün şablon verisi; Zod şeması EPOSTA_TURLERI'nin aynı satırından gelir, epostaGonder satıra dokunmadan doğrular (IS_KUYRUGU_EPOSTA_SABLON_VERISI_GECERSIZ). ` + e.purpose.slice(k + kes.length).trim(), not: 'tip' });
  }

  // epostaGonder: EpostaHataTuru becomes its own entry
  {
    const e = ex('epostaGonder');
    const [sig, tip] = e.signature.split('; type EpostaHataTuru');
    must(tip ? 1 : undefined, 'EpostaHataTuru signature');
    e.signature = sig;
    S.exports.splice(exi('epostaGonder') + 1, 0,
      { name: 'EpostaHataTuru', signature: 'type EpostaHataTuru' + tip, purpose: `epostaGonder sonucundaki hataTuru ve eposta_gonderimleri.hata_turu değerleri; CHECK listesi buradan. kapanis, kapasite ve veritabani teslim denemesi tamamlanmadan süreç tarafında biten gönderimdir ve sınıra sayılmaz; D15 art arda başarısız sayısını yalnız SMTP denemesi tamamlanmış türlerden okur (isSagligi).`, not: 'tip' });
  }

  // isiCalistirVeBekle ve kuyruktakiIsler (test desteği): two entries
  {
    const i = exi('isiCalistirVeBekle ve kuyruktakiIsler (test desteği)');
    const e = S.exports[i];
    const [sigCal, sigKuy] = e.signature.replace(/\s*\/\/ destek\.ts$/, '').split('; kuyruktakiIsler(');
    must(sigKuy ? 1 : undefined, 'kuyruktakiIsler signature');
    const kes = ` kuyruktakiIsler 'kuyrukta N iş bekler'`;
    const k = must(e.purpose.indexOf(kes), 'kuyruktakiIsler purpose split');
    S.exports.splice(i, 1,
      { name: 'isiCalistirVeBekle', signature: `${sigCal}  // ${DESTEK}`, purpose: e.purpose.slice(0, k).trim(), not: 'test desteği; ' + DESTEK },
      { name: 'kuyruktakiIsler', signature: `kuyruktakiIsler(${sigKuy}  // ${DESTEK}`, purpose: e.purpose.slice(k).trim(), not: 'test desteği; ' + DESTEK });
  }

  // test support moved: steps/is-kuyrugu/destek.ts -> test/support/is-kuyrugu.ts (I079, I123)
  for (const n of ['isKuyrugunuBosalt', 'zamanlamaliOrnekAc']) {
    const e = ex(n);
    e.signature = e.signature.replace(/\s*\/\/ (apps\/server\/test\/steps\/is-kuyrugu\/)?destek\.ts$/, `  // ${DESTEK}`);
    must(e.signature.endsWith(DESTEK) ? 1 : undefined, 'support path in ' + n);
  }
  rep(ex('isKuyrugunuBosalt'), 'purpose', `Test sürecinin ortak pg-boss örneğinde deleteAllJobs çağırır`,
    `Test sürecinin ortak pg-boss örneğinde pg-boss'un deleteAllJobs işlevini çağırır`);

  // isKuyruguKur: Veritabani.db, IsKuyrugu return, isleriBaslat (I060, I071)
  {
    const e = ex('isKuyruguKur');
    e.signature = `isKuyruguKur(secenek: { rol: 'api' | 'isci'; veritabani: Veritabani /* D12: { islem, semaDurumu, kapat, db, havuz } */; baglantiAdresi?: string; tanimlar?: readonly IsTanimi<unknown>[]; saat: Saat /* D04 */; log: Logger; testSaati?: TestClock; casus?: boolean; zamanlamaAcik?: boolean; bakimAcik?: boolean }): Promise<IsKuyrugu>`;
    e.purpose = `Yalnız server.ts, worker.ts ve test desteği çağırır. API: pg-boss kendi havuzunu açmaz; kurucunun db seçeneğine D12 Veritabani'nın db alanıyla fromDrizzle(veritabani.db, sql) verilir; bağdaştırıcı işlem dışı nesneyle çalışmazsa veritabani.havuz.query'yi çağıran executeSql nesnesi verilir (sözleşme testi hangisinin çalıştığını sabitler); yalnız gönderir. İşçi: doğrudan bağlantı (havuz 2), bakım ve zamanlama; zamanlamaAcik ve bakimAcik yayında hep true, test sürecinin ortak işçisinde false. İkisi de şema sürümünü denetler; işçi ayrıca kayıtlı kuyrukların varlığını ve tanım kurallarını denetler. saat D04'ün Saat nesnesidir; testte D04'ün pgBossSaati(testClock) nesnesi aynı TestClock'u yürütür, bileşim kökü ayrı uyarlayıcı yazmaz. Dış yüz işlevlerini bu örneğe bağlar ve IsKuyrugu döndürür; bileşim kökü onu uygulamaKur'a isKuyrugu olarak verir. İşçide work kayıtları kurulumda açılmaz: worker.ts uygulamaKur'dan sonra isKuyrugu.isleriBaslat() çağırır, böylece ilk iş alındığında modül dinleyicileri, saklama işleyicileri ve yayın bilgisi yüklüdür. İkinci kurulum durdur'dan önce hata verir (test desteğindeki zamanlamaliOrnekAc dış yüzü bağlamadığından bu kurala girmez).`;
    S.exports.splice(exi('isKuyruguKur') + 1, 0, {
      name: 'IsKuyrugu',
      signature: `type IsKuyrugu = { readonly rol: 'api' | 'isci'; isleriBaslat(): Promise<void>; durdur(): Promise<void> }`,
      purpose: `isKuyruguKur'un döndürdüğü nesne; server.ts ve worker.ts D13'ün uygulamaKur bağımlılıklarına isKuyrugu olarak verir. isleriBaslat yalnız işçide: work kayıtlarını tek işli ve parti ayarlarıyla açar ve isci.hazir logunu yazar; API'de IS_KUYRUGU_YANLIS_SUREC verir, ikinci çağrı işlem yapmaz. durdur API'de gönderimi kapatır, işçide pg-boss stop({ graceful: true, timeout: 30000 }) çağırır.`,
      not: 'tip; D13 UygulamaBagimliliklari.isKuyrugu',
    });
  }

  // epostaKur returns Eposta (D13 UygulamaBagimliliklari.eposta)
  {
    const e = ex('epostaKur');
    rep(e, 'signature', `): { kapat(sureMs: number): Promise<void> }`, `): Eposta`);
    S.exports.splice(exi('epostaKur') + 1, 0, {
      name: 'Eposta',
      signature: `type Eposta = { kapat(sureMs: number): Promise<void> }`,
      purpose: `epostaKur'un döndürdüğü nesne; bileşim kökleri uygulamaKur'a eposta olarak verir ve kapanışta kapat'ı çağırır (API 10, işçi 5 saniye). Gönderim dış yüz işleviyle (epostaGonder) yapılır, nesne gönderim yüzü taşımaz.`,
      not: 'tip; D13 UygulamaBagimliliklari.eposta',
    });
  }

  // epostaSiniriDenetle: D12.danismaKilidi, katman 1, ek anahtarlar (I060, I014, I079)
  {
    const e = ex('epostaSiniriDenetle');
    e.signature = `epostaSiniriDenetle(tx: Tx /* READ COMMITTED */, adres: string, tur: 'giris_kodu' | 'basvuru_kodu' | 'basvuru_silme_kodu' | 'onay_bekliyor', s?: { ekAnahtarlar?: readonly DanismaAnahtari /* D12 */[] }): Promise<{ izinli: true; gonderimId: string } | { izinli: false; sebep: 'DAKIKA' | 'SAAT' | 'GUN' }>`;
    e.purpose = `Çağıranın işleminde, işlemin ilk danışma kilidi çağrısı olarak D12.danismaKilidi(tx, ['is-kuyrugu:eposta:<özet>', ...ekAnahtarlar]) ile adres kilidini alır (katman 1, ortak kural 'Danışma kilidi katmanları'; elle pg_advisory_xact_lock yazılmaz). Özet normalleştirilmiş adresin 'eposta_ozeti' anahtarlı HMAC'idir ve D14 içinde hesaplanır; anahtar metninde adres yoktur (anahtar D14'ten çıkmaz). ekAnahtarlar çağıranın aynı işlemde gereken danışma anahtarlarıdır; D12 hepsini aynı çağrıda katman ve metin sırasıyla alır, böylece çağıran sırada geride kalan anahtar için ikinci çağrı yapmaz. Sonra son 60, 3.600 ve 86.400 saniyedeki sayılan gönderimleri sayar (sınıra giren türlerde sinirda olmayan ve kapasite, kapanis ya da veritabani hata türlü olmayan satırlar; kısmi dizinden). İzinliyse bekliyor satırı yazar; değilse özetin son 24 saatte sinirda satırı yoksa bir tane yazar, varsa yalnız loglar. Ön koşul: çağıranın işlemi READ COMMITTED (D12.islem'in varsayılanı); current_setting('transaction_isolation') başka değer dönerse IS_KUYRUGU_EPOSTA_YALITIM (programlama hatası), çünkü daha yüksek yalıtımda görüntü kilitten önce alınmış olabilir ve yarışan iki istek 0 sayar. Kod üretilmeden ve işlemdeki başka danışma kilidinden önce çağrılır; önce başka anahtar tutan işlemde D12'nin sıra denetimi geliştirmede ve testte hata atar.`;
  }

  // IsSagligi: sonCikti readers (I082)
  rep(ex('IsSagligi'), 'purpose', `sonCikti onun output'u (çıktı şeması yoksa null).`,
    `sonCikti onun output'u (çıktı şeması ya da altyapı çıktısı yoksa null); D15 iki yerde okur: isletim.devam_tutarlilik_farki kuralı devam_tutarlilik_denetimi'nin farkSayisi'ni, isletim_denetimi kendi önceki çalışmasının retSuSeviyesi'ni (I082).`);

  // KuyrukTanimi: output leaves include ISO an and ISO tarih (needed for D15 retSuSeviyesi)
  rep(ex('KuyrukTanimi'), 'purpose', `cikti isteğe bağlıdır: yalnız açık sınırlı z.int, z.boolean, z.enum ve bunlardan strict nesne ya da açık max'lı dizi;`,
    `cikti isteğe bağlıdır: yalnız açık sınırlı z.int, z.boolean, z.enum, z.iso.datetime, z.iso.date ve bunlardan strict nesne ya da açık max'lı dizi;`);

  // isTanimla: infrastructure definitions pass through it too
  rep(ex('isTanimla'), 'purpose', `(IS_KUYRUGU_TANIM_GECERSIZ, _YINELENEN_AD, _ZAMANLAMA_KURALI).`,
    `(IS_KUYRUGU_TANIM_GECERSIZ, _YINELENEN_AD, _ZAMANLAMA_KURALI). Altyapı işleri de buradan geçer: D12'nin veritabaniIsleri öğeleri doğrudan (sureAsimiSaniye vermeyen öğeye worker.ts ALTYAPI_IS_VARSAYILANI'ndaki 1.800'ü koyar), D15'in isletimIsleri tanımları altyapiIsleriniUyarla ile.`);

  // altyapiIsleriniUyarla: only D15 now; isle output written as job output (I060, I080, I082)
  {
    const e = ex('altyapiIsleriniUyarla');
    rep(e, 'signature', `isle(b: { isKimligi: string; tetiklemeAni: Date; iptal: AbortSignal; log: Logger }): Promise<void> }`,
      `isle(b: { isKimligi: string; tetiklemeAni: Date; iptal: AbortSignal; log: Logger }): Promise<Readonly<Record<string, unknown>> | void> }`);
    e.purpose = `D15'in isletimIsleri(bag) tanımlarını (IsletimIsTanimi, yapısal olarak AltyapiIsTanimi) isTanimla biçimine çevirir: { kuyruk: { ad, veri, politika, cikti: ALTYAPI_CIKTI_SEMASI }, isleyici: (veri, baglam) => isle({ isKimligi: baglam.isId, tetiklemeAni: baglam.tetiklemeAni, iptal: baglam.iptal, log: baglam.log }), sureAsimiSaniye, deneme, zamanlama: { cron } }. isle'nin döndürdüğü küçük nesne iş çıktısıdır (isletim_denetimi { retSuSeviyesi }): Date değerleri ISO ana çevrilir, nesne ALTYAPI_CIKTI_SEMASI'ndan geçer, pg-boss output'una yazılır ve isSagligi onu sonCikti olarak verir; uymayan değer (serbest metin, sınır dışı sayı, milisaniye cinsinden an) IS_KUYRUGU_CIKTI_GECERSIZ ile işi başarısız sayar, bu yüzden an Date ya da ISO metin olarak döner. Eksik alanlar ALTYAPI_IS_VARSAYILANI'ndan: politika exclusive, veri boş strict nesne, sureAsimiSaniye 1.800, deneme { sayi: 3, beklemeSaniye: 30 }. saatDilimi 'Europe/Istanbul' değilse IS_KUYRUGU_TANIM_GECERSIZ; kacirilan D14'ün sıklık kuralıyla (aralığı 1 günden kısa iş skip, günlük ve daha seyrek iş once) uyuşmazsa IS_KUYRUGU_ZAMANLAMA_KURALI; iki durumda işçi açılmaz. D12'nin veritabaniIsleri öğeleri zaten isTanimla girdisi biçimindedir ve uyarlayıcıdan geçmez (İşçi açılışı, adım 8). Böylece jobs/isletim ve jobs/veritabani infra/is-kuyrugu'yu içe aktarmaz.`;
  }

  // IS_KUYRUGU_HATA_KODLARI: http per code (I071, I076)
  const API_KODLARI = ['IS_KUYRUGU_KURULMADI', 'IS_KUYRUGU_YANLIS_SUREC', 'IS_KUYRUGU_TANIM_GECERSIZ', 'IS_KUYRUGU_VERI_GECERSIZ', 'IS_KUYRUGU_VERI_BUYUK',
    'IS_KUYRUGU_TEKILLIK_ANAHTARI_GECERSIZ', 'IS_KUYRUGU_BASLAMA_ANI_GECERSIZ', 'IS_KUYRUGU_EPOSTA_ADRES_GECERSIZ', 'IS_KUYRUGU_EPOSTA_SINIR_ATLANDI',
    'IS_KUYRUGU_EPOSTA_YALITIM', 'IS_KUYRUGU_EPOSTA_SABLON_VERISI_GECERSIZ', 'IS_KUYRUGU_EPOSTA_BAGLANTI'];
  {
    for (const k of API_KODLARI) must(S.error_codes.find(e => e.kod === k), 'error ' + k);
    for (const e of S.error_codes) {
      if (API_KODLARI.includes(e.kod)) { e.http = 500; e.hoca = 'IS_KUYRUGU_GENEL_HATA_METNI'; e.ogrenci = 'IS_KUYRUGU_GENEL_HATA_METNI'; }
      else { e.http = null; e.hoca = null; e.ogrenci = null; }
    }
    must(S.error_codes.length === 20 && S.error_codes.filter(e => e.http === null).length === 8 ? 1 : undefined, 'error code split 12 + 8');
    const tg = must(S.error_codes.find(e => e.kod === 'IS_KUYRUGU_TANIM_GECERSIZ'), 'TANIM_GECERSIZ');
    tg.sonuc = `İşçi ve kur açılmaz; sözleşme testi kırmızı. API'de ilk isGonder'deki tanım denetiminde de doğar ve çağıranın işlemini geri aldırır.`;
    const ys = must(S.error_codes.find(e => e.kod === 'IS_KUYRUGU_YANLIS_SUREC'), 'YANLIS_SUREC');
    ys.ne_zaman = `İşçiye özgü işlev (isSagligi, isKuyrugu.isleriBaslat) API sürecinde çağrıldı.`;
    const ex1 = ex('IS_KUYRUGU_HATA_KODLARI');
    ex1.signature = `const IS_KUYRUGU_HATA_KODLARI = hataKodlariTanimla('is-kuyrugu', { IS_KUYRUGU_KURULMADI: { http: 500, hoca: IS_KUYRUGU_GENEL_HATA_METNI, ogrenci: IS_KUYRUGU_GENEL_HATA_METNI }, ..., IS_KUYRUGU_KUYRUK_EKSIK: { http: null, hoca: null, ogrenci: null }, ... })  // packages/contracts/src/is-kuyrugu.ts`;
    ex1.purpose = `Modülün 20 kodu (Hata kodları bölümü), D13'ün hataKodlariTanimla biçiminde; http değeri koddan koda (ortak kural 'Birleşim'; I071, I076). API isteğinde de doğabilen 12 kod (API sürecinde çağrılan isGonder, epostaSiniriDenetle, epostaGonder, isSagligi ve isleriBaslat hataları; ör. IS_KUYRUGU_KURULMADI) http 500 ve hoca, öğrenci metni IS_KUYRUGU_GENEL_HATA_METNI taşır; D13'ün kökü 5xx'te yalnız API_SUNUCU_HATASI zarfını ve sabit mesajını döndürdüğünden metin istemciye çıkmaz. Yalnız işçide, kur'da ya da süreç açılışında doğan 8 kod http null ve metinsizdir (işletim kodu), hiçbir rotanın hatalar listesine girmez. hatalar.ts birleştirmesine (TUM_HATALAR) girer.`;
  }

  // ------------------------------------------------------------ files (I079, I123)
  {
    const i = must(S.files.indexOf('apps/server/test/steps/is-kuyrugu/destek.ts'), 'file destek.ts');
    S.files.splice(i, 1);
    const j = must(S.files.indexOf('apps/server/test/support/sahte-posta.ts'), 'file sahte-posta.ts');
    S.files.splice(j + 1, 0, DESTEK);
  }

  // ------------------------------------------------------------ tables (A1, I060)
  {
    const et = must(S.tables.find(t => t.name === 'eposta_gonderimleri'), 'table eposta_gonderimleri');
    rep(et, 'purpose', `göç drizzle-kit generate ile apps/server/migrations/<UTC zaman>_is_kuyrugu_eposta_gonderimleri/ alt klasörüne (contracts.json migration_dir).`,
      `göç drizzle-kit generate ile apps/server/migrations/<14 haneli UTC>_is_kuyrugu_eposta_gonderimleri/ klasörüne (glob apps/server/migrations/??????????????_is_kuyrugu_* D14'ün; göç dosyaları spec dosya listesine değil iş paketine yazılır, klasör kuralı ve CI denetimi D12'nindir; A1).`);
    const pt = must(S.tables.find(t => t.name === 'pgboss_semasi'), 'table pgboss_semasi');
    const yi = must(pt.constraints.findIndex(c => c.startsWith('Yetki:')), 'pgboss yetki constraint');
    pt.constraints[yi] = `Yetki: yoklama_api yalnız iş eklemeye yeten en dar küme; yoklama_isci SELECT, INSERT, UPDATE, DELETE ve MAINTAIN; şemayı kuran rol yoklama_goc. D12 rollere pgboss şemasında yalnız USAGE verir; tablo, dizi ve işlev yetkilerinin tamamını yayın adımındaki kur verir (I060).`;
    const out = must(pt.columns.find(c => c.name === 'output'), 'column output');
    rep(out, 'note', `geçmiş küçük değer, en çok 1 KiB; şema yoksa boş.`,
      `(altyapı işinde ALTYAPI_CIKTI_SEMASI'ndan) geçmiş küçük değer, en çok 1 KiB; şema yoksa boş.`);
  }

  // ------------------------------------------------------------ state machines
  {
    const es = sm('eposta_gonderimleri.sonuc');
    rep(tr(es, '(yok)', 'bekliyor'), 'when', `adres özeti başına işlem kilidi alındıktan sonra`,
      `D12.danismaKilidi ile 'is-kuyrugu:eposta:<özet>' kilidi (katman 1, işlemin ilk danışma kilidi çağrısı, çağıranın ek anahtarlarıyla birlikte) alındıktan sonra`);
    const is = sm('İşçi süreci (worker.ts)');
    tr(is, 'baslatiliyor', 'acilmadi').when = `İşçi açılışı tablosundaki bir adım hata verdi: ayar ya da sır eksik, TZ UTC değil (IS_KUYRUGU_SAAT_DILIMI), e-posta ayarı eksik (IS_KUYRUGU_EPOSTA_AYAR_EKSIK), yayın bilgisi bozuk (uygulamaKur içindeki yayinBilgisiYukle) çıkış 78; veritabanı ya da saklama bağlantısı 120 saniyede hazır değil ya da şema geride, pgboss şema sürümü uyuşmuyor (IS_KUYRUGU_SEMA_SURUMU), kayıtlı kuyruk yok (IS_KUYRUGU_KUYRUK_EKSIK), tanım ya da zamanlama kuralı bozuk, uygulamaKur hazır olmadı çıkış 1. Compose yeniden kaldırır.`;
    tr(is, 'baslatiliyor', 'calisiyor').when = `Açılış sırası bitti (İşçi açılışı tablosu): ayarlar, log, TZ, iki veritabanı (yoklama_isci havuz 3, yoklama_saklama havuz 1), saat, e-posta, tanımlar (modül işleri; D12 veritabaniIsleri doğrudan isTanimla ile; D15 isletimIsleri altyapiIsleriniUyarla ile), isKuyruguKur (dış yüz bağlı, work yok), uygulamaKur({ surec: 'isci' }) dinleme açmadan (yayın bilgisi, kimlik dinleyicileri ve kayıt desenindeki dinleyiciler işçide de kurulu); en son isKuyrugu.isleriBaslat() work kayıtlarını açtı, isci.hazir logu yazıldı.`;
    rep(tr(is, 'durduruluyor', 'durdu'), 'when', `(3) havuz kapanır;`, `(3) veritabani ve saklamaVeritabani havuzları kapanır;`);
  }

  // ------------------------------------------------------------ invariants
  {
    const i3 = must(S.invariants.findIndex(v => v.includes('Tamamlanan iş çıktısı yalnız kuyruğun çıktı şemasına uyan')), 'invariant output');
    S.invariants[i3] = S.invariants[i3].replace(`Tamamlanan iş çıktısı yalnız kuyruğun çıktı şemasına uyan açık sınırlı tam sayı, mantıksal değer ve sabit liste değeridir, en çok 1 KiB.`,
      `Tamamlanan iş çıktısı yalnız kuyruğun çıktı şemasına (altyapı işinde ALTYAPI_CIKTI_SEMASI) uyan açık sınırlı tam sayı, mantıksal değer, sabit liste değeri, ISO an ve ISO tarihtir, en çok 1 KiB.`);
    must(S.invariants[i3].includes('ALTYAPI_CIKTI_SEMASI') ? 1 : undefined, 'invariant output replaced');
    const i5 = must(S.invariants.findIndex(v => v.startsWith('Kuyruk, ölü kuyruk, zamanlama ve pgboss yetkilerini')), 'invariant yetki');
    S.invariants[i5] = `Kuyruk, ölü kuyruk, zamanlama ve pgboss tablo, dizi ve işlev yetkilerini yalnız yayın adımındaki kur komutu şemayı kuran yoklama_goc rolüyle verir ve değiştirir (D12 rollere pgboss şemasında yalnız USAGE verir); API rolü pgboss şemasında yalnız iş ekler.`;
    S.invariants.push(
      `D14 danışma kilidini yalnız D12.danismaKilidi ile alır: adres kilidi 'is-kuyrugu:eposta:<özet>' (katman 1) epostaSiniriDenetle'nin işlemindeki ilk danışma kilidi çağrısıdır, çağıranın ek anahtarları aynı çağrıya katılır; anahtar metninde adres yoktur.`,
      `İşçide work kayıtları uygulamaKur bittikten sonra açılır: ilk iş alındığında modül dinleyicileri, saklama işleyicileri, kimlik dinleyicileri ve yayın bilgisi yüklüdür.`,
      `API isteğinde de doğabilen her D14 hata kodu http 500 ve genel metin taşır; yalnız işçide, kur'da ya da açılışta doğan kod http null'dır ve hiçbir rotanın hatalar listesine girmez.`,
    );
  }

  // ------------------------------------------------------------ queue policy, constants
  {
    const qp = must(S.queue_policy.find(p => p.ayar === 'cikti (KuyrukTanimi)'), 'queue policy cikti');
    qp.deger = 'isteğe bağlı Zod şeması (açık sınırlı tam sayı, mantıksal, sabit liste, ISO an, ISO tarih), en çok 1 KiB';
    qp.not = `tamamlanan işin output alanı; parti kuyruğunda yok; altyapı işinde (D15 isletimIsleri) uyarlayıcının ALTYAPI_CIKTI_SEMASI'dır`;
    const c = n => must(S.constants.find(k => k.ad === n), 'constant ' + n);
    c('ISCI_HAVUZU').deger = '{ pgBoss: 2, drizzle: 3, saklama: 1, beklemeMs: 30000 }';
    c('ISCI_HAVUZU').kaynak = 'D14-B10, I060 (saklama: D12 yoklama_saklama girişi, bütçede ayrı satır)';
    c('ALTYAPI_IS_VARSAYILANI').kaynak = 'D14-B25; D15 tanımlarının eksik alanları ve D12 öğesinin eksik sureAsimiSaniye değeri';
    const ai = S.constants.indexOf(c('ALTYAPI_IS_VARSAYILANI'));
    S.constants.splice(ai + 1, 0, {
      ad: 'ALTYAPI_CIKTI_SEMASI',
      deger: `en çok 8 alanlı kayıt; alan adı ^[a-z][A-Za-z0-9]{0,39}$; değer z.int (mutlak değer en çok 100.000), z.boolean, z.iso.datetime ya da z.iso.date; Date değeri önce ISO ana çevrilir; en kötü durum 1 KiB altında`,
      kaynak: 'D14-B23, I082',
    });
  }

  // ------------------------------------------------------------ worker start-up (I060, I071, I080, I082)
  S.worker_acilisi = [
    { adim: '1', ne: `ayarlar = ayarlariYukle({ surec: 'isci' }) (D15)`, hata: `AyarHatasi (ISLETIM_AYAR_GECERSIZ, ISLETIM_SAAT_DILIMI): stderr'e yalnız ad listesi`, cikis: '78' },
    { adim: '2', ne: `log = logOlustur({ ayarlar }) (D15); bundan sonra her hata koduyla ve sınıfıyla loglanır`, hata: `kaydedici kurulamadı`, cikis: '1' },
    { adim: '3', ne: `TZ denetimi: süreç saat farkı 0 (ayarlariYukle denetimine ikinci güvence)`, hata: `IS_KUYRUGU_SAAT_DILIMI`, cikis: '78' },
    { adim: '4', ne: `veritabani = veritabaniKur({ rol: 'yoklama_isci', havuzBoyutu: 3, havuzBeklemeMs: 30000, uygulamaAdi: 'iu-yoklama-isci', adres ve parola ayarlardan }) (D12); semaDurumu hazır olana kadar en çok 120 saniye, geride ise hemen`, hata: `ulaşılamıyor ya da şema geride`, cikis: '1' },
    { adim: '5', ne: `saklamaVeritabani = veritabaniKur({ rol: 'yoklama_saklama', havuzBoyutu: 1, uygulamaAdi: 'iu-yoklama-saklama', adres ve parola ayarlardan }) (D12); yalnız D12'nin saklama işleri kullanır`, hata: `ulaşılamıyor`, cikis: '1' },
    { adim: '6', ne: `saat = sistemSaati() (D04)`, hata: `yok`, cikis: '1' },
    { adim: '7', ne: `eposta = epostaKur({ tasiyici: smtpTasiyicisi(ayar), gonderen, urunAdi, ozetAnahtari: gizliAnahtar('eposta_ozeti').deger, veritabani, saat, log, gunlukSinir })`, hata: `IS_KUYRUGU_EPOSTA_AYAR_EKSIK`, cikis: '78' },
    { adim: '8', ne: `tanimlar = 15 modülün jobs/<modül>/index.ts isler dizileri + veritabaniIsleri({ veritabani, saklamaVeritabani, saat }) öğeleri isTanimla'dan (D12; sureAsimiSaniye yoksa 1.800) + altyapiIsleriniUyarla(isletimIsleri(bag)) (D15); bag = { veritabani, isSagligi, epostaGonder, saat, ayarlar, log }`, hata: `IS_KUYRUGU_TANIM_GECERSIZ, IS_KUYRUGU_YINELENEN_AD, IS_KUYRUGU_ZAMANLAMA_KURALI`, cikis: '1' },
    { adim: '9', ne: `isKuyrugu = isKuyruguKur({ rol: 'isci', veritabani, baglantiAdresi, tanimlar, saat, log, zamanlamaAcik: true, bakimAcik: true }): şema sürümü, kayıtlı kuyruklar ve kurallar denetlenir, pg-boss başlar, dış yüz bağlanır; work kaydı henüz yok`, hata: `IS_KUYRUGU_SEMA_SURUMU, IS_KUYRUGU_KUYRUK_EKSIK`, cikis: '1' },
    { adim: '10', ne: `app = uygulamaKur({ surec: 'isci', ayarlar, log, veritabani, islem: veritabani.islem, saat, isKuyrugu, eposta }) (D13); app.ready(), dinleme yok. Yayın bilgisini (yayinBilgisiYukle) ve kimlik dinleyicilerini (D01.kimlikDinleyicileriniKur) uygulamaKur kurar, worker.ts ayrıca çağırmaz; modül kayıtları (dinleyiciler, D12 saklama işleyicileri) işçide de kurulur`, hata: `yayın bilgisi dosyası yok ya da bozuk 78; öbür kayıt ya da eklenti hatası 1`, cikis: '78 ya da 1' },
    { adim: '11', ne: `isKuyrugu.isleriBaslat(): work kayıtları (tek işli ve parti ayarlarıyla) açılır; isci.hazir logu (tanım sayısı, yayın sırası)`, hata: `pg-boss hatası`, cikis: '1' },
    { adim: 'Kapanış', ne: `SIGTERM ya da SIGINT: eposta.kapat(5000) ile isKuyrugu.durdur() (pg-boss stop, graceful, 30 sn) birlikte; sonra app.close(); sonra veritabani.kapat() ve saklamaVeritabani.kapat(); log flush`, hata: `ikinci sinyal ya da 38 saniye aşımı`, cikis: '0 (aşımda 1)' },
    { adim: 'Çökme', ne: `unhandledRejection ve uncaughtException: hata sınıfı ve yığın fatal düzeyde (değer yok), flush`, hata: `her biri`, cikis: '1' },
  ];

  // ------------------------------------------------------------ schedule (I007, I036, I049, I054, I110, I060, I080, I082)
  {
    const sp = S.schedule_plan;
    const spi = n => must(sp.findIndex(p => p.is === n), 'schedule ' + n);
    const row = n => sp[spi(n)];
    const chk = (n, saat, not) => { const r = row(n); must(r.saat === saat ? 1 : undefined, `${n} at ${saat}`); if (not !== undefined) r.not = not; return r; };
    chk('donem_kilidi', '00:05', `D07 karar kapanışı ve D10'un kilit adımı (sira 20; gün sonu anlığı işini kuyruğa koyar) aynı işlemde`);
    chk('bekleyen_kayit_kapatma (gecelik denetim)', '00:15', 'sonra: donem_kilidi');
    const ak = chk('aksis_gun_sonu_anligi', '00:25', 'sonra: donem_kilidi; asıl yol kilit adımının kilit işleminde koyduğu iş');
    ak.is = 'aksis_gun_sonu_anligi (güvenlik ağı)';
    chk('deneme_dersi_oturumlari', '00:35');
    chk('inceleme_hesaplari_kurulumu', '00:45', 'yayın adımında da (acilistaBirKez)');
    chk('pgbackrest_dogrulama', '01:30 çarşamba', 'fark yedeği sürüyorsa kilitte bekler; saat D12\'den aynen');
    sp.splice(spi('pgbackrest_dogrulama') + 1, 0,
      { saat: '01:55', is: 'takvim_oturumlarini_yenile (gece onarımı)', modul: 'D02', yer: 'pg-boss', not: `cron '55 1 * * *', missed: once; olay tetiklemesi de var (olayla satırı)` });
    chk('gecelik_pg_dump ve ardından xprem_birimi_yedegi', '02:15', `systemd zamanlayıcısı, pg-boss dışında; saat D12'den aynen`);
    sp.splice(spi('pencere_beklemede_kesinlestir (gecelik süpürme)'), 1);
    chk('bekleyen_kararlari_coz', '05:25', 'pencere_beklemede_kesinlestir işlerini koyar (olayla satırı)');
    chk('devam_tutarlilik_denetimi', '05:35', `çıktı { dersSayisi, ogrenciSayisi, farkSayisi, farkTurleri }; D15 sonCikti.farkSayisi'ni okur`);
    chk('gece_inceleme_siralamasi', '05:50', 'sonra: bekleyen_kararlari_coz, devam_tutarlilik_denetimi; 02:15 dökümünden 3 saat 35 dakika sonra, ilk dersten önce');
    chk('sertifika_bitis_denetimi', '06:35');
    chk('haftalik_olcum_ozeti', 'pazartesi 07:10', `ders başı yoğunluğundan önce; ota_yayin_denetimi GitHub Actions'ta (D15), çizelgede yok`);
    const ol = sp[must(sp.findIndex(p => p.saat === 'olayla'), 'schedule olayla')];
    ol.is = 'takvim_oturumlarini_yenile, esitleme_sonrasi_yeniden_degerlendir, pencere_beklemede_kesinlestir, devam_hesapla, projeksiyon_baglanti_kapat, projeksiyon_bekleyen_yeniden_hesapla';
    ol.modul = 'D02, D04, D07, D08, D11, D11';
    ol.not = `Tetikleyen işlemde isGonder ile ya da D04'ün kapanış dinleyicisiyle. pencere_beklemede_kesinlestir (D07): yalnız bekleyen_kararlari_coz koyar, stately, tekillikAnahtari oturumId. projeksiyon_bekleyen_yeniden_hesapla (D11): gösterim ve öğrenci kaydı işlemi yeniden_hesap_bekliyor satırı bırakınca isGonder ile 5 saniye sonraya (baslamaAni), stately, tekillikAnahtari oturumId; 02:35 güvenlik ağı kalır. saat_esitleme_denetimi (D04) her API sürecinde süreç içi zamanlayıcıdır, pg-boss işi değil.`;
    must(sp.some(p => /ota_yayin_denetimi/.test(p.is)) ? undefined : 1, 'ota_yayin_denetimi absent');
    must(sp.some(p => p.saat === '05:15') ? undefined : 1, '05:15 removed');
  }

  // ------------------------------------------------------------ resolved gaps
  rep(gap('D14-B03'), 'decision', `kendi havuzu yok (kurucunun db seçeneğine Drizzle havuzu üstünde bağdaştırıcı: fromDrizzle(veritabani, sql); belge yalnız işlem nesnesini örneklediğinden çalışmazsa havuzun query'sini çağıran executeSql nesnesi)`,
    `kendi havuzu yok (kurucunun db seçeneğine D12 Veritabani'nın db alanıyla fromDrizzle(veritabani.db, sql); belge yalnız işlem nesnesini örneklediğinden çalışmazsa veritabani.havuz.query'yi çağıran executeSql nesnesi; I060)`);
  rep(gap('D14-B04'), 'decision', `(liste en az yetki testiyle sabit);`,
    `(liste en az yetki testiyle sabit); pgboss yetkilerinin tamamı bu adımdadır, D12 rollere pgboss şemasında yalnız USAGE verir (I060);`);
  rep(gap('D14-B05'), 'decision', `(ör. gece_inceleme_siralamasi 05:50, pencere_beklemede_kesinlestir 05:15, bekleyen_kararlari_coz 05:25 ve devam_tutarlilik_denetimi 05:35'ten sonra).`,
    `(ör. gece_inceleme_siralamasi 05:50, bekleyen_kararlari_coz 05:25 ve devam_tutarlilik_denetimi 05:35'ten sonra; bekleyen_kayit_kapatma 00:15 ve aksis_gun_sonu_anligi güvenlik ağı 00:25, donem_kilidi 00:05'ten sonra). Saati işin sorumlu modülü belirler: çizelge sorumlu modüllerin cron'unu aynen kopyalar, makine işlerinin saatini D12 ve D15 verir. sonra listesi yalnız zamanlamalı işi gösterir; olayla çalışan iş (ör. pencere_beklemede_kesinlestir) orada durmaz.`);
  rep(gap('D14-B10'), 'decision', `yazılır (istek).`,
    `yazılır (I075, I077 ile kabul). D12'nin saklama işleri ayrı yoklama_saklama girişli Veritabani'yla (havuz 1) çalışır; bu bağlantıyı worker.ts kurar ve bütçede ayrı satırdır (saklama bağlantısı 1).`);
  rep(gap('D14-B13'), 'decision', `Test desteği apps/server/test/steps/is-kuyrugu/destek.ts'te:`,
    `Test desteği ${DESTEK}'te (öbür modüllerin adımları ve D15'in test dünyası buradan içe aktarır; I079):`);
  rep(gap('D14-B17'), 'decision', `sonra app.close, sonra havuz: deneme`, `sonra app.close, sonra iki veritabanı havuzu: deneme`);
  rep(gap('D14-B19'), 'decision', `Sayma ve ekleme çağıranın READ COMMITTED işleminde, özet başına pg_advisory_xact_lock ile (iki anahtarlı biçim: sınıf 14, özetin ilk 4 baytı); aynı anda gelen iki istek sınırı aşamaz, çakışan iki özet yalnız sırayla bekler;`,
    `Sayma ve ekleme çağıranın READ COMMITTED işleminde; adres kilidi D12.danismaKilidi ile 'is-kuyrugu:eposta:<özet>' anahtarıyla (katman 1, ortak kural 'Danışma kilidi katmanları'), işlemin ilk danışma kilidi çağrısı olarak, çağıranın ek anahtarları aynı çağrıda (s.ekAnahtarlar); elle pg_advisory_xact_lock yazılmaz. Aynı anda gelen iki istek sınırı aşamaz, 64 bitlik karması çakışan iki özet yalnız sırayla bekler;`);
  gap('D14-B23 (gözden geçirmeden)').decision += ` Altyapı işinde (D15 isletimIsleri) çıktı şeması uyarlayıcının ALTYAPI_CIKTI_SEMASI'dır: isletim_denetimi { retSuSeviyesi } (ISO an) döndürür, D14 onu output'a yazar ve sonCikti'de verir (I082); bu yüzden çıktı yaprakları veri kuralındaki gibi ISO an ve ISO tarihi de kapsar.`;
  {
    const g = gap('D14-B25 (gözden geçirmeden)');
    g.decision = `worker.ts açılış sırası ve her adımın çıkış kodu İşçi açılışı tablosunda: ayarlar (D15 ayarlariYukle({ surec: 'isci' })), log (logOlustur), TZ, veritabanı (yoklama_isci, havuz 3, bekleme 30 sn), saklama veritabanı (yoklama_saklama, havuz 1; D12 veritabaniIsleri'ne saklamaVeritabani), sistemSaati (D04), epostaKur, tanımlar (modül isler dizileri; D12 veritabaniIsleri öğeleri doğrudan isTanimla ile; D15 isletimIsleri altyapiIsleriniUyarla ile, isle'nin küçük nesnesi iş çıktısı), isKuyruguKur (dış yüz bağlanır, work yok), uygulamaKur({ surec: 'isci', ... }) (D13; yayın bilgisi ve kimlik dinleyicileri onun içinde, dinleme yok; worker.ts yayinBilgisiYukle'yi ayrıca çağırmaz), en son isKuyrugu.isleriBaslat() (work kayıtları). Yapılandırma hatası çıkış 78 (D15'in ayar çıkış koduyla aynı; yayın bilgisi hatası dahil), öbürleri 1.`;
    g.why = `Sıra yazılmazsa işçideki D07 kodu yayinBilgisi() çağrısında hata fırlatır, D15'in dört işi ve D12'nin iki işi kaydolmaz; uygulamaKur isKuyrugu ve eposta bağımlılığını ister, bu yüzden kurulumlar ondan önce gelir, work kayıtları ise modül kayıtlarından sonra açılır. Çıkış kodu Compose ve işletim için yapılandırma hatasını geçici hatadan ayırır.`;
  }
  rep(must(S.contradictions_resolved.find(c => c.id === 'D14-C01'), 'contradiction D14-C01'), 'resolution', `(kurucuya fromDrizzle(veritabani, sql))`, `(kurucuya fromDrizzle(veritabani.db, sql))`);

  S.resolved_gaps.push(
    {
      gap: 'I014, I060 (hizalama)',
      decision: `Adres kilidi D12.danismaKilidi(tx, ['is-kuyrugu:eposta:<özet>', ...ekAnahtarlar]) ile, epostaSiniriDenetle'nin işlemindeki ilk danışma kilidi çağrısı olarak alınır (katman 1, ortak kural 'Danışma kilidi katmanları'); elle pg_advisory_xact_lock ve iki anahtarlı biçim kalktı. İmza epostaSiniriDenetle(tx, adres, tur, s?: { ekAnahtarlar?: readonly DanismaAnahtari[] }): çağıranın (D01) aynı işlemde gereken anahtarları aynı çağrıya katılır, D12 katman ve metin sırasıyla alır. Özet D14 içinde hesaplanır, anahtar metninde adres yoktur.`,
      why: `Tek genel kilit sırası ancak bütün danışma kilitleri tek işlevden geçerse denetlenir; elle alınan kilit D12'nin sıra izlemesine görünmezdi ve çağıranın işleminde ters sıralı bekleme kurabilirdi. Ek anahtar seçeneği çağıranın ikinci bir çağrıda sırada geride kalan anahtar istemesini gereksiz kılar.`,
    },
    {
      gap: 'I071, I076 (hizalama)',
      decision: `IS_KUYRUGU_HATA_KODLARI'nda http koddan koda: API isteğinde de doğabilen 12 kod (isGonder, epostaSiniriDenetle, epostaGonder, isSagligi ve isleriBaslat hataları; ör. IS_KUYRUGU_KURULMADI) http 500 ve IS_KUYRUGU_GENEL_HATA_METNI; yalnız işçide, kur'da ya da açılışta doğan 8 kod http null ve metinsiz. Önceki 'her kod http 500' kuralı kalktı.`,
      why: `Ortak kural 'Birleşim' http null'ı işletim kodlarına ayırır ve böyle bir kod hiçbir rotanın hatalar listesine giremez; API'de doğabilen kod ise istemciye genel 500 olarak dönmelidir.`,
    },
    {
      gap: 'I060, I071, I080, I082 (hizalama)',
      decision: `worker.ts bileşimi: ayarlariYukle({ surec: 'isci' }) ve logOlustur ile açılır; yoklama_isci (havuz 3) ve yoklama_saklama (havuz 1) girişli iki Veritabani kurar; D12.veritabaniIsleri({ veritabani, saklamaVeritabani, saat }) öğelerini doğrudan isTanimla'dan, D15.isletimIsleri(bag) tanımlarını altyapiIsleriniUyarla ile geçirir ve isle'nin döndürdüğü küçük nesneyi iş çıktısı yazar; isKuyruguKur'dan sonra uygulamaKur({ surec: 'isci', ..., isKuyrugu, eposta }) çağırır (yayın bilgisi ve kimlik dinleyicileri onun içinde); en son isKuyrugu.isleriBaslat() work kayıtlarını açar.`,
      why: `uygulamaKur isKuyrugu ve eposta bağımlılığını ister, bu yüzden kurulum ondan önce gelir; work kayıtları ondan sonra açılmazsa ilk iş modül dinleyicileri ve saklama işleyicileri kaydolmadan alınabilirdi. Saklama işi yalnız yoklama_saklama girişiyle çalışır (D12); bu bağlantıyı bileşim kökü kurar.`,
    },
    {
      gap: 'I007, I036, I049, I054, I110 (hizalama)',
      decision: `Çizelge: 01:55 takvim_oturumlarini_yenile gece onarımı (D02) eklendi; 05:15 pencere_beklemede_kesinlestir satırı kalktı, iş olayla satırında (yalnız bekleyen_kararlari_coz koyar, stately, tekillikAnahtari oturumId); projeksiyon_bekleyen_yeniden_hesapla (D11) olayla satırında (isGonder ile 5 saniye sonraya, stately, tekillikAnahtari oturumId). donem_kilidi 00:05, bekleyen_kayit_kapatma 00:15 ve aksis_gun_sonu_anligi güvenlik ağı 00:25 (ikisi de sonra: donem_kilidi; anlığın asıl yolu kilit adımının kilit işleminde koyduğu iş), deneme_dersi_oturumlari 00:35, inceleme_hesaplari_kurulumu 00:45; gece_inceleme_siralamasi sonra listesinden pencere_beklemede_kesinlestir çıktı.`,
      why: `Saati işin sorumlu modülü belirler, çizelge sorumlu modüllerin cron'unu aynen kopyalar. Olayla çalışan iş zamanlama kuralına girmez ve sonra listesinde duramaz. 00:15 ve 00:25, 00:05'ten 10 dakikadan fazla sonradır.`,
    },
    {
      gap: 'A1, I079, I123 (hizalama)',
      decision: `eposta_gonderimleri göçü apps/server/migrations/<14 haneli UTC>_is_kuyrugu_<açıklama>/ klasöründe (glob apps/server/migrations/??????????????_is_kuyrugu_* D14'ün); göç dosyaları spec dosya listesine değil iş paketine yazılır, klasör kuralı ve CI denetimi D12'nindir; pgboss şeması pg-boss migrate ile. Test yardımcıları (isKuyrugunuBosalt, isiCalistirVeBekle, kuyruktakiIsler, zamanlamaliOrnekAc) ${DESTEK}'e taşındı. contracts.json: epostaSiniriDenetle(tx, adres, tur, s?) satırı; reads_from D04 (Saat tipi), D12, D13 (istek kimliği, hataKodlariTanimla) ve worker.ts bileşim kökü için D15.`,
      why: `Paralel paketler ortak dergi olmadan yalnız kendi önekli klasörlerini açar (A1). Test desteği başka modüllerin adımlarından ve D15'in test dünyasından içe aktarıldığından steps/ altında değil support/ altında durur.`,
    },
  );

  // ------------------------------------------------------------ tests
  {
    tst('API rolü pgboss şemasında yalnız iş ekler').asserts += ` Yetkiler kur'dan gelir: göçlerden sonra kur çalışmadan önce yoklama_isci iş tablosunu okuyamaz (D12 yalnız şema USAGE verir; zemin), kur'dan sonra okur.`;
    rep(tst('Yarışan istekler sınırı aşamaz'), 'asserts', `(işlem kilidi)`, `(D12.danismaKilidi ile alınan 'is-kuyrugu:eposta:<özet>' kilidi)`);
    tst('İşçi açılış sırası ve çıkış kodları').asserts = `Açılış adımlarının çağrı sırası kayıttan okunur ve worker.ts'teki ISCI_ACILIS_ADIMLARI sabitiyle (İşçi açılışı tablosu) aynıdır: isKuyruguKur uygulamaKur'dan önce, isKuyrugu.isleriBaslat uygulamaKur'dan sonra; uygulamaKur bitmeden kuyruğa konan test işi alınmaz, isleriBaslat'tan sonra alınır (zemin). Süreç saat dilimi UTC değilken IS_KUYRUGU_SAAT_DILIMI ve çıkış 78; yayın bilgisi dosyası yokken uygulamaKur hatasıyla çıkış 78; e-posta özet anahtarı 32 bayttan kısayken IS_KUYRUGU_EPOSTA_AYAR_EKSIK ve çıkış 78; kayıtlı kuyruk yokken IS_KUYRUGU_KUYRUK_EKSIK ve çıkış 1. Doğru ortamda açılır, uygulamaKur surec 'isci' ile çağrılır ve dinleme açmaz (sunucu adresi yok); işçide yayinBilgisi() değer döner (artı denetim: yüklenmeden çağrı hata fırlatır) ve yayın bilgisi çağrı kaydında bir kez yüklenir (worker.ts ayrıca yüklemez).`;
    rep(tst('İşçi kapanışında e-posta önce kapanır, uyarı iki kez gitmez'), 'asserts', `sonra app.close, sonra havuz.`, `sonra app.close, sonra iki veritabanı havuzu (veritabani ve saklamaVeritabani).`);
    tst('Hata kataloğu D13 biçimine uyar').asserts = `IS_KUYRUGU_HATA_KODLARI hataKodlariTanimla'dan geçer ve TUM_HATALAR'a çift kodsuz girer. API sürecinde isGonder, epostaSiniriDenetle, epostaGonder, isSagligi ve isleriBaslat'ı hatalı girdiyle çağıran tablo sürüşlü senaryoda fırlatılan her D14 kodunun katalog değeri http 500 ve hoca, öğrenci metni içe alınan IS_KUYRUGU_GENEL_HATA_METNI'dir (12 kod); katalogdaki kalan 8 kodda http null ve metin null'dır, hiçbir rotanın hatalar listesinde yoktur. Kurulmamış iş kuyruğunda isGonder çağıran test rotası 500 API_SUNUCU_HATASI döner, gövdede D14 kodu geçmez (artı denetim: yakalanan logda IS_KUYRUGU_KURULMADI vardır).`;
    tst('Altyapı iş fabrikaları isTanimla\'ya uyarlanır').asserts = `worker.ts'in topladığı kayıtta isletim_denetimi, isletim_kalp_atisi, sertifika_bitis_denetimi ve haftalik_olcum_ozeti (D15, altyapiIsleriniUyarla ile) ile saklama_suresi_isi ve donem_bolumu_denetimi (D12, doğrudan isTanimla ile) kuyrukları exclusive ve Europe/Istanbul ile vardır; sureAsimiSaniye vermeyen örnek D12 öğesi ALTYAPI_IS_VARSAYILANI'ndan içe alınan 1.800'ü alır. D12 işlerine verilen saklamaVeritabani'nda current_user yoklama_saklama ve havuz boyutu 1, veritabani'nda yoklama_isci'dir (zemin). kacirilan 'once' verilen 10 dakikalık örnek iş IS_KUYRUGU_ZAMANLAMA_KURALI, saatDilimi 'UTC' verilen örnek IS_KUYRUGU_TANIM_GECERSIZ ile açılışı durdurur; uyarlanan işleyici isle'ye isKimligi, tetiklemeAni ve iptal'i aynen geçirir. isle { retSuSeviyesi: Date } döndürünce iş çıktısında ve isSagligi sonCikti'de aynı an ISO biçimde görünür; { not: 'metin' } ya da milisaniye cinsinden an döndürünce iş IS_KUYRUGU_CIKTI_GECERSIZ ile başarısız olur (artı denetim).`;
    rep(tst('Koruyucu testler kasıtlı bozmada kırmızıya döner'), 'asserts', `işlem kilidi kaldırılınca 'Yarışan istekler'`, `danışma kilidi kaldırılınca 'Yarışan istekler'`);
    rep(tst('Koruyucu testler kasıtlı bozmada kırmızıya döner'), 'asserts', `'İşçi kapanışında' kırmızı olur.`,
      `'İşçi kapanışında'; danismaKilidi çağrısı yerine elle pg_advisory_xact_lock yazılınca 'Adres kilidi danışma kilidi kuralıyla alınır'; isleriBaslat uygulamaKur'dan önceye alınınca 'İşçi açılış sırası'; IS_KUYRUGU_KURULMADI http null yapılınca 'Hata kataloğu'; altyapı çıktısı ALTYAPI_CIKTI_SEMASI'ndan geçmeden yazılınca 'Altyapı iş fabrikaları' kırmızı olur.`);
    const yi = must(S.tests.findIndex(t => t.name === 'Sınır denetimi READ COMMITTED dışında reddedilir'), 'test READ COMMITTED');
    S.tests.splice(yi + 1, 0, {
      name: 'Adres kilidi danışma kilidi kuralıyla alınır',
      kind: 'behavior',
      asserts: `A işleminde epostaSiniriDenetle(tx, adres, 'giris_kodu', { ekAnahtarlar: [katman 3 test anahtarı] }) çağrılıp işlem açık beklerken B işleminde D12.danismaKilidiDene 'is-kuyrugu:eposta:<özet>' ve ek anahtar için false döner, A bitince true (zemin); başka adresin anahtarı A açıkken de true. Anahtar metni ozet.ts'teki anahtar işlevinden içe alınır. A işleminde önce katman 3 anahtarı alınıp sonra epostaSiniriDenetle çağrılınca D12'nin sıra hatası fırlar ve satır yazılmaz (artı denetim: aynı çağrı işlemin ilk kilidiyken izinli). Hata iletisinde ve loglarda adres geçmez, 'is-kuyrugu:eposta:' öneki geçer.`,
    });
  }

  // ------------------------------------------------------------ requests: all settled (I073 to I079)
  {
    const rq = m => must(S.requests.find(r => r.modul === m), 'request ' + m);
    const kapat = (m, karar, sonuc) => { const r = rq(m); r.durum = 'sonuclandi'; r.karar = karar; r.sonuc = sonuc; };
    kapat('D01', 'I073', `Kabul. D01 epostaSiniriDenetle'yi kod üretmeden ve işleminin ilk kilidi olarak çağırır (D14 'is-kuyrugu:eposta:<özet>' anahtarını katman 1'de alır), e-postayı cevaptan sonra gönderir, BASARISIZ giriş bildiriminde bildirim_gonderilemedi yazar; inceleme_hesaplari_kurulumu acilistaBirKez: true taşır.`);
    kapat('İş tanımlayan modüller', 'I074', `Kabul. İşler jobs/<modül>/index.ts isler dizisinde isTanimla ile, KuyrukTanimi modules/<ad>/ içinde, çizelge kurallarına uygun ve her iş için 'aynı veriyle iki kez çalışırsa' senaryosuyla; altyapı işleri (D12 veritabaniIsleri, D15 isletimIsleri) worker.ts uyarlamasıyla istisnadır.`);
    kapat('D12', 'I075', `Kabul: timezone UTC, uygulama rolleri (ve yoklama_saklama), db:migrate sırası, test sıfırlaması isKuyrugunuBosalt ile, tablo haritası denetimi, isteğe bağlı sureAsimiSaniye ve bütçe satırı. D12'nin D14'ten istedikleri (I060) bu tasarımda: fromDrizzle(veritabani.db, sql), saklamaVeritabani, pgboss yetkileri kur'da, adres kilidi danismaKilidi ile, makine işi saatleri aynen.`);
    kapat('D13', 'I076', `Kabul, http kuralı değişti: uygulamaKur dinleme açmadan ve süreç türüyle çağrılır, zamanlayıcılar yalnız api'de kurulur; IS_KUYRUGU_HATA_KODLARI hataKodlariTanimla ile birleşir ama http koddan koda verilir (I071): API isteğinde de doğabilen kod 500 ve genel metin, yalnız işçide doğan kod null.`);
    kapat('D15', 'I077', `Kabul: compose, paket, Biome, ayar, server.ts açılış ve kapanış sırası, bağlantı bütçesi, devam tutarlılık uyarısı, haftalık özet ve test dünyası kancası aynen uygulanır. D15'in D14'ten istedikleri (I082) bu tasarımda.`);
    kapat('D08', 'I078', `Kabul: devam_hesapla partiIsleyici ve parti { boyut: 50, esZamanli: 2 } ile, devam_tutarlilik_denetimi çıktı şemasıyla ve 05:35'te.`);
    kapat('Mimari (contracts.json)', 'I079, I123', `Kabul: contracts.json'da epostaSiniriDenetle(tx, adres, tur, s?) satırı, reads_from D04, D12, D13 ve worker.ts bileşim kökü için D15, apps/server/test/support/is-kuyrugu* globu D14'ün; test yardımcıları oraya taşındı. İstekteki worker.ts listesinden bir fark (I071, contracts.json notu): worker.ts D13'ten yalnız uygulamaKur'u bağlar, yayinBilgisiYukle onun içindedir.`);
    must(S.requests.every(r => r.durum === 'sonuclandi') ? 1 : undefined, 'every request settled');
  }
};
