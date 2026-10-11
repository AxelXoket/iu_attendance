// r17 finding gate for D10: one or more concrete assertions per finding, against a spec file (default spec/D10.json)
// and the rendered fragment. Ground control: run with the r16 backup (d10fix/orig/D10.r16.json); it must fail.
// Usage: node findings-check.js [specPath] [fragPath]
const fs = require('fs'), path = require('path');
const B = path.join(__dirname, '..');
const specPath = process.argv[2] || path.join(B, 'spec', 'D10.json');
const fragPath = process.argv[3] || path.join(B, 'frag', 'D10.html');
const S = JSON.parse(fs.readFileSync(specPath, 'utf8'));
const H = fs.readFileSync(fragPath, 'utf8');
const ALL = JSON.stringify(S);
const res = [];
const ok = (f, cond, what) => res.push({ f, pass: !!cond, what });
const ep = p => S.endpoints.find(e => e.path === p) || {};
const test = n => S.tests.find(t => t.name === n);
const testLike = re => S.tests.find(t => re.test(t.name + ' ' + t.asserts));
const gap = g => (S.resolved_gaps.find(x => x.gap === g) || {});
const op = id => (S.open_points.find(x => x.id === id) || {});
const t0 = S.tables.find(t => t.name === 'aksis_ozet_anliklari'), t1 = S.tables.find(t => t.name === 'aksis_ozet_anligi_satirlari');
const cols = new Set([...t0.columns, ...t1.columns].map(c => c.name));
const job = S.jobs[0];
const POST = ep('/v1/raporlar/subeler/{subeId}/aksis-ozeti/ciktilar'), OZET = ep('/v1/raporlar/subeler/{subeId}/aksis-ozeti'), DERS = ep('/v1/raporlar/dersler/{dersId}'), DS = ep('/v1/raporlar/donem-sonu');

ok(1, /kilitUygulandiAni dolu/.test(job.does) && testLike(/kilit işlemi geri alınınca/), 'scan filters applied kilits; kilit-step failure test');
ok(2, !/hesapGuncel|HESAP_SURUYOR|hesapBekliyor/.test(ALL + H), 'no hesap-wait field, engel or code anywhere');
ok(2, !S.state_machines.some(m => m.states.includes('BEKLIYOR')) && !test('Hesap sürerken dönem sonu anlığı alınmaz') && !test('Gün sonu anlığı hesap bitmeden alınmaz'), 'BEKLIYOR state and two tests removed');
ok(2, /contracts\.json'daki D10 notu/.test(op('D10-A10').recommendation || '') && op('D10-A10').needs_owner === false, 'A10 closed and names contracts.json and D02 text to fix');
ok(3, S.invariants.some(i => /D08 kuyruğu boşken/.test(i)) && DERS.response && DERS.response.hucreHesapAni, 'invariant narrowed, hucreHesapAni in response');
ok(3, /iş gecikmesinden/.test(gap('D10-B24').why || '') && testLike(/iş çalışmadan/), 'B24 reason fixed; immediate-after-write test');
// F4: every canonical content field must be a stored column
const b29 = gap('D10-B29').decision || '';
const hdr = (b29.match(/Başlık dizisi, bu sırayla: ([^.]+)\./) || [])[1] || '';
const row = (b29.match(/bu alan sırasıyla: ([^.]+)\./) || [])[1] || '';
const fields = (hdr + ', ' + row).split(',').map(s => s.trim().replace(/ \(1\)$/, '')).filter(Boolean);
const missing = fields.filter(f => !cols.has(f));
ok(4, fields.length >= 30 && missing.length === 0, `canonical fields all stored (${fields.length} fields, missing: ${missing.join(' ') || 'none'})`);
ok(4, ['ders_kodu', 'ders_adi', 'sube_etiketi', 'son_yapilan_ders_gunu', 'takip_baslangici', 'gecici_neden_sayilari'].every(c => cols.has(c)) && t1.columns.some(c => c.name === 'kaynak'), 'printed fields stored');
ok(4, /NFC/.test(b29) && /LF/.test(b29) && /KURUCULAR/.test(b29) && testLike(/içerik dışı alan/), 'serialization rules and per-field property test');
ok(5, /14 gün/.test(job.does) && gap('D10-B30').decision && /saklamaSuresiDoldu/.test(DERS.response['(tip) DersRaporuSatiri']) && testLike(/Eski anlıklar yeniden alınmaz/), 'scan window, retention rule, anonymized row handling, test');
ok(6, /kilitAdimiKaydet/.test(job.schedule) && /sonra: \['donem_kilidi'\]/.test(job.schedule) && !/bekletme/.test(S.exports[0].purpose) && testLike(/İşçi kesintisinden/), 'kilit step, sonra, no D09 wait, outage test');
ok(7, t0.constraints.some(c => /'EKRAN','ONAY'/.test(c)) && cols.has('son_oturum_bitis_ani') && test('Ekrandan okunan özet taban olur'), 'EKRAN/ONAY capture, stored window start, test');
ok(8, /satirId -> listeSatiriId/.test(gap('D10-B06').decision) && /turSonucu -> karar/.test(gap('D10-B06').decision) && !S.files.some(f => /telafi/.test(f)) && t1.constraints.some(c => /teori_karar IN \('DEVAMLI','DEVAMSIZ'\)\)/.test(c)), 'D08 mapping, telafi.ts gone, tür kararı D08 values');
ok(9, /tasindi/.test(gap('D10-B19').decision) && testLike(/telafisiz hoca iptali/), 'telafi rule includes taşıma; test');
ok(10, S.invariants.some(i => /\(ders, numara\)/.test(i) && /bütün şubelerdeki/.test(i)) && /oncekiSubeler/.test(DERS.response['(tip) DersRaporuSatiri']) && testLike(/şube değişimi/), 'per (ders, numara) invariant, flag, generator');
ok(11, !t0.constraints.some(c => /NOT gecici/.test(c)) && S.contradictions_resolved.some(c => c.id === 'D10-C04') && /Kilitten sonra yalnız/.test(op('D10-A03').recommendation), 'kilit geçicilik per reason');
ok(12, /politika: 'stately'/.test(job.schedule) && /sureAsimiSaniye: 1800/.test(job.schedule) && /kalpAtisiSaniye: 60/.test(job.schedule) && /tekillikAnahtari/.test(job.does) && /baslamaAni/.test(job.does) && !/startAfter|singletonKey/.test(ALL) && testLike(/art arda üç tekrarı/), 'D14 signature and stately chain');
ok(13, S.endpoints.every(e => /agir/.test(e.rate_limit)) && !/dakikada 120/.test(ALL) && testLike(/hız sınıfı agir/), 'all routes agir');
ok(14, !S.error_codes.some(e => /RAPOR_COK_BUYUK|SORGU_ZAMAN_ASIMI/.test(e.kod)) && /API_SONUC_COK_BUYUK/.test(DERS.errors.join(' ')) && /API_ISTEK_GECERSIZ/.test(ALL), 'D13 codes used');
ok(15, /yenidenDene: true/.test(POST.idempotency) && /40001/.test(POST.idempotency) && testLike(/eşzamanlı iki POST/) && /5 sn/.test(POST.rate_limit), 'concurrent POST path, test, 5 s budget');
ok(16, /min\(takvim\.sonGun, bugün\)/.test(JSON.stringify(DERS.request)) && testLike(/sonGun'den bir gün önce/), 'clip range uses sonGun; test');
ok(17, /=== 'sahip'/.test(DERS.auth) && testLike(/hoca ve yönetici rollü/), 'sahip only; two-role test');
ok(18, /anlık \| null/.test(OZET.response.kilitAni) && /tarih \| null/.test(OZET.response.sonGun) && testLike(/Takvimsiz birimde/), 'nullable kilit fields; scenario');
const cons = S.consumes.map(c => c.uses).join(' ');
ok(19, /oturumlariGetir\(tx, \{/.test(cons) && /roller: \['yonetici'\]/.test(cons) && /'raporlar\.aksis_ozet_anliklari'/.test(cons) && /devamsizlikSonGunu/.test(cons) && /duzeltmeler\/katalog\.ts/.test(cons) && t0.constraints.some(c => /@yalniz-ekleme/.test(c)) && t1.constraints.some(c => /@yalniz-ekleme/.test(c)) && !/sahip rolle/.test(ALL), 'published signatures');
ok(20, /yuzdeBinde/.test(ALL) && /mazeretliDonusOraniBinde/.test(ALL) && !/OraniOnda/.test(ALL) && S.error_codes.some(e => e.kod === 'RAPORLAR_KIMLIK_CAKISMASI') && S.error_codes.every(e => e.hoca && e.ogrenci) && /20 saniyelik/.test(gap('D10-B22').decision) && /yonetim\/donem-sonu/.test(op('D10-A13').recommendation || ''), 'naming, hoca text, 20 s, path request');
ok(21, /acikSaat/.test(DERS.response['(tip) TurHucresi']) && /NOT derste/.test(ALL) && gap('D10-B31').decision, 'acikSaat and KAFA predicate');
ok(22, t0.constraints.some(c => /kaynak = 'GUN_SONU' AND alan_kisi_id IS NULL AND cikti_kimligi IS NULL AND cikti_turu IS NULL/.test(c)) && testLike(/iki dalı/), 'two-branch CHECK; test');
ok(23, testLike(/istekKimligi dışında/) && testLike(/yalnız \.\/tablolar\.ts/) && testLike(/istanbulSaatiMetni/), 'three test fixes');
ok(24, DS.response && DS.response.enEskiSonucHesabi && DS.response.kilitSonrasiHesapTamam, 'dönem sonu staleness fields');
ok(25, /yalnız DONEM_ICI/.test(op('D10-A03').recommendation) && OZET.response.gondermeSuresiSurenOturum, 'gönderme süresi only in DONEM_ICI; info field');
ok(0, !/[–—]/.test(ALL + H), 'no U+2013 or U+2014');
ok(0, H.includes('Kilitten sonra') && H.includes('Hoca metni') && H.includes('raporlar.aksis_ozet_anliklari'), 'fragment carries new prose');

const failed = res.filter(r => !r.pass);
for (const r of res) console.log((r.pass ? 'PASS' : 'FAIL') + ' F' + r.f + ': ' + r.what);
console.log(`${res.length - failed.length}/${res.length} pass; findings covered: ${new Set(res.filter(r => r.f).map(r => r.f)).size}`);
process.exit(failed.length ? 1 : 0);
