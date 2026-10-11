// Alignment gate (round 4b): every instruction in align/D04.json leaves a checkable trace in spec/D04.json and
// frag/D04.html, and the text it replaced is gone. Run after build.js. Exit 1 on any miss.
// D04_ROOT points the gate at another copy (mutation runs, ground control on the pre-align backup).
'use strict';
const fs = require('fs'), path = require('path');
const B = process.env.D04_ROOT || path.join(__dirname, '..');
const C = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'contracts.json'), 'utf8'));
const A = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'align', 'D04.json'), 'utf8'));
const S = JSON.parse(fs.readFileSync(path.join(B, 'spec', 'D04.json'), 'utf8'));
const H = fs.readFileSync(path.join(B, 'frag', 'D04.html'), 'utf8');
const J = JSON.stringify(S);
const ex = n => (S.exports || []).find(e => e.name === n) || {};
const sig = n => ex(n).signature || '';
const pur = n => ex(n).purpose || '';
const job = n => (S.jobs || []).find(j => j.name === n) || {};
const gap = id => (S.resolved_gaps || []).find(g => g.gap === id) || {};
const op = id => (S.open_points || []).find(o => o.id === id);
const hasTest = n => (S.tests || []).some(t => t.name === n);
const reg = re => (S.registrations || []).some(r => re.test(r));
const errs = [], seen = new Set();
const must = (ref, cond, what) => { seen.add(ref); if (!cond) errs.push(`${ref}: ${what}`); };

// ground: the instruction file is the one this gate was written for
const refs = A.instructions.map(i => i.refs.join('+'));
const BEKLENEN = ['I016', 'I017+A1', 'I018+I023', 'I019+I008+I092', 'I030', 'A4', 'I064+I025+I023', 'I071', 'I014', 'I009', 'I074', 'I045', 'I070'];
must('ground', JSON.stringify(refs) === JSON.stringify(BEKLENEN), 'align/D04.json changed: ' + refs.join(' '));

// I016: D04-A05 closed, single-name exports, contracts face present
const mod = C.modules.find(m => m.id === 'D04');
const ad = s => String(s).match(/^[A-Za-z_][A-Za-z0-9_]*/)[0];
for (const e of mod.exports) must('I016', !!ex(ad(e)).name, 'contracts export missing from spec: ' + ad(e));
for (const n of ['simdi', 'istanbulTarihi', 'istanbulAni', 'istanbulGunSonuAni', 'pencereDegistiDinleyicisiKaydet', 'saatSonucu', 'capaAraligi', 'pencereHesapla', 'pencereIcindeMi', 'pencereDurumu', 'belgeCoz', 'belgeImzaGirdisi', 'KAYMA_PPM', 'BELGE_EN_COK_YAS_MS', 'BELGE_ISTEK_EN_COK_MS', 'BELGE_BAYT', 'BELGE_KARAKTER', 'DEGER_BAYT', 'saatEklentisi']) must('I016', !!ex(n).name, 'single export missing: ' + n);
must('I016', (S.exports || []).every(e => /^[A-Za-z_][A-Za-z0-9_]*$/.test(e.name)), 'export names are plain identifiers');
must('I016', !op('D04-A05') && /kesinleşmeyi D07 izler/.test(gap('D04-A05').decision), 'D04-A05 closed into resolved_gaps');
must('I016', !mod.reads_from.includes('D03') && !(S.dis_yuz_kullanimi || []).some(x => /^D03:/.test(x)), 'D03 not read');
must('I016', /D07 \(güvenlik ağı yeniden değerlendirme, iş koymaz\) ve D11 \(projeksiyon_baglanti_kapat\)/.test(pur('oturumKapandiDinleyicisiKaydet')) && !/D08/.test(pur('oturumKapandiDinleyicisiKaydet')), 'oturumKapandi listeners D07 and D11 only');
must('I016', /taşıma anı/.test(S.tables[0].purpose) && /şubeler/.test(S.tables[0].purpose) && /D07 izler/.test(S.tables[0].purpose), 'oturum_pencereleri purpose');
must('I016', /anlar Date/.test(gap('D04-A05').decision) && /: Date/.test(sig('pencereSonucu')) && /anMs: number/.test(sig('istanbulTarihi')), 'Date in module face, ms in core and infra helpers');

// I017 + A1: D04-A06 closed, migration folder goes to the work package
must('I017', !op('D04-A06') && /iş paketine/.test(gap('D04-A06').decision) && /D12/.test(gap('D04-A06').decision), 'D04-A06 closed');
must('I017', !(S.files || []).some(f => f.startsWith('apps/server/migrations/')), 'no migration file in spec.files');
must('I017', H.includes('apps/server/migrations/??????????????_saat_*') && /iş paketine/.test(H), 'section names the glob and the package');

// I018 + I023: D04-A09 closed
const yok = sig('IKINCI_CAPA_YOK_NEDENLERI');
must('I018', /'BASKA_CIHAZ_GONDERDI'/.test(yok) && /'OKUTMA_YOLU'/.test(yok) && !/KURULMADI/.test(yok + sig('IKINCI_CAPA_DURUMLARI') + S.tables[1].constraints.join(' ')), 'IKINCI_CAPA_YOK_NEDENLERI values');
must('I018', pur('saatBelgesiVer').includes('yalnız saat çapası içindir; ulaşma kanıtı ya da makbuz olarak kullanılamaz'), 'saatBelgesiVer purpose sentence');
must('I018', /kaynak: 'YOK'; aralik: null; tahminMs: null/.test(sig('saatSonucu')) && /tahminMs yalnız kaynak YOK iken boştur/.test(pur('saatSonucu')) && hasTest('Tahmin yalnız kaynak YOK iken boş'), 'tahminMs empty only for YOK');
must('I018', !op('D04-A09') && /saatOznesiKur/.test(gap('D04-A09').decision) && /yenidenDegerlendir dış imzası değişmez/.test(gap('D04-A09').decision), 'D04-A09 closed');
must('I018', !(S.files || []).some(f => /cihaz-imzasi/.test(f)) && !/cihazAnahtariGetir/.test(J) && !/D07 yenidenDegerlendir'e adet/.test(J), 'withdrawn requests gone');
must('I018', /D07\.yenidenDegerlendir dış imzası değişmez/.test(pur('kesintiKapandiDinleyicisiKaydet')), 'D07 batches inside its listener');

// I019 + I008 + I092: D04-A10 closed, one stamp mechanism
must('I019', !op('D04-A10') && gap('D04-A10').decision.includes('D06.surumDamgasiIste(tx: Islem, damga: (surum: bigint) => Promise<void>): void'), 'D04-A10 closed with the decided signature');
must('I019', reg(/D02\.oturumUretimDinleyicisiKaydet\(\(tx, olay\) => pencereleriHesapla\(tx, olay\.oturumlar\)\)/), 'adapter registration');
must('I019', /OturumPlani = Pick<OturumUretimOgesi,/.test(sig('pencereleriHesapla')), 'OturumPlani is a subset of OturumUretimOgesi');
must('I019', /D06\.surumDamgasiIste\(tx, damga\)/.test(pur('pencereleriHesapla')) && /surumAl çağrılmaz/.test(pur('pencereleriHesapla')), 'listener stamps, no surumAl');
for (const n of ['oturum_pencere_kapat', 'esitleme_sonrasi_yeniden_degerlendir']) must('I019', /D06\.surumAl\(tx\) bir kez/.test(job(n).does), n + ' calls surumAl once as owner');
must('I019', /baglam\.surumlaDamgala/.test(H) && reg(/baglam\.surumlaDamgala/), 'item handler stamps through baglam.surumlaDamgala');
must('I019', !(S.registrations || []).concat((S.exports || []).map(e => e.signature + e.purpose)).some(x => /olay\.surumleDamgala|surumleDamgala\(/.test(x)), 'D02 callback gone');

// I030: pencereSonucu owned by D04, kesintiAraliklari reliability, listener names
must('I030', /sonuc: 'ICINDE' \| 'DEGISIM_DILIMI' \| 'ESKI_PROGRAM' \| 'DISINDA'; kayitAnindaSureSecildi: boolean; ayarDegisikligiVar: boolean; pencere: Pencere; eskiProgram:/.test(sig('pencereSonucu')) && /Biçimi yalnız D04 tanımlar/.test(pur('pencereSonucu')), 'pencereSonucu shape and owner');
must('I030', /ulasmaAnlariGuvenilir: boolean \| null/.test(sig('kesintiAraliklari')) && /açık kesintide null/.test(pur('kesintiAraliklari')) && /KesintiKapandiOlayi\.ulasmaAnlariGuvenilir ile aynı/.test(pur('kesintiAraliklari')), 'kesintiAraliklari reliability');
must('I030', pur('pencereDegistiDinleyicisiKaydet').includes("{ ad: 'dogrulama.pencere_degisti', calistir }") && /aynı işlemde/.test(pur('pencereDegistiDinleyicisiKaydet')), 'D07 pencereDegisti registration');
must('I030', /parti: \{ imlec: KesintiImleci \| null; adet: number \}/.test(sig('kesintiKapandiDinleyicisiKaydet')), 'kesintiKapandi stays batched');

// A4: D04-A08 closed, teknik.html unchanged
must('A4', !op('D04-A08') && gap('D04-A08').why.includes('teknik.html#altyapi-sunucu-makinesi') && /teknik\.html değişmez/.test(gap('D04-A08').decision), 'D04-A08 closed with the reason');
must('A4', H.includes('href="teknik.html#altyapi-sunucu-makinesi"') && !/D04-A08 ile sahibe/.test(J + H), 'section links the anchor, no owner wording');

// I064 + I025 + I023: one retention handler for saat.donem_verisi
const sak = (S.registrations || []).filter(r => /saklamaIsleyicisiKaydet\(/.test(r));
must('I064', sak.length === 1 && /saklamaIsleyicisiKaydet\('saat\.donem_verisi', \{ modul: 'saat', islem: 'silme', partiIsle/.test(sak[0]), 'single saat.donem_verisi handler');
must('I064', sak.length === 1 && /SELECT, UPDATE ve DELETE/.test(sak[0]) && !/kilitDurumu|D02\./.test(sak[0]) && !/oncekiSiniflar: \[/.test(sak[0]), 'own tables only, no order list');
must('I064', !reg(/saklamaIsleyicisiKaydet\('(saat\.pencere_degisiklikleri|yoklama_kayitlari)'/) && (S.tests || []).some(t => /D12\.saklamaIsleyicisiniCalistir\(saklamaVeritabani, 'saat\.donem_verisi'/.test(t.asserts)), 'old names gone, tested through saklamaIsleyicisiniCalistir');

// I071: belge route declaration and item schemas
const e0 = (S.endpoints || [])[0] || {};
must('I071', /kimlik \['oturum'\], kimlikKaynaklari \['bearer'\], roller \['ogrenci', 'personel'\], hiz 'saat'/.test(e0.auth) && /saatOznesiKur\(kimlik\)/.test(e0.auth) && !e0.request.cihazImzasi, 'belge route declaration');
must('I071', (e0.errors || []).some(x => /SAAT_ESITLEME_BOZUK/.test(x) && /bekleme \{ sabit: 60 \}/.test(x)) && /bekleme \{ sabit: 60 \}/.test(sig('SAAT_ROTALARI') + pur('SAAT_ROTALARI')), 'SAAT_ESITLEME_BOZUK wait 60');
must('I071', ex('PENCERE_SURESI_OGESI').yer === 'contracts' && /ogeTuruTanimla\('pencere_suresi'/.test(sig('PENCERE_SURESI_OGESI')) && /ogeTuruTanimla\('erken_kapatma'/.test(sig('ERKEN_KAPATMA_OGESI')), 'item body schemas through ogeTuruTanimla');

// I014: no advisory keys, window row lock before record and student version
must('I014', (S.invariants || []).some(i => /D04 danışma anahtarı almaz/.test(i)) && !/danismaKilidi\(/.test(J), 'D04 takes no advisory key');
must('I014', /FOR KEY SHARE/.test(pur('pencereSonucu')) && /kayıt satırı ve öğrenci sürümü kilitlerinden önce/.test(pur('pencereSonucu')) && /oturum kimliği sırasıyla/.test(pur('pencereSonucu')), 'pencereSonucu lock order');
must('I014', /kilitAnahtarlari kancası yok/.test(S.registrations[0] || ''), 'item handler gives no keys');

// I009: three-argument dersYetkisi, D02 constants imported
must('I009', H.includes('D02.dersYetkisi(tx, baglam.kimlik, oturum.dersId)') && /D02\.dersYetkisi\(tx, istek\.kimlik, dersId\)/.test((S.endpoints[1] || {}).auth), 'three-argument calls');
must('I009', !/YoneticiKapsami|personelRolleri|OturumKisisi/.test(J + H), 'no hand-built scope or person object');
must('I009', (S.dis_yuz_kullanimi || []).some(x => /^D02:/.test(x) && /OTURUM_TURLERI/.test(x) && /OTURUM_DURUMLARI/.test(x) && /IPTAL_NEDENLERI/.test(x)), 'D02 constants imported');

// I074: jobs defined through isTanimla in jobs/saat/index.ts, queues in modules/saat, twice scenario
for (const n of ['oturum_pencere_kapat', 'esitleme_sonrasi_yeniden_degerlendir']) {
  must('I074', /export const isler/.test(job(n).schedule) && /D14\.isTanimla/.test(job(n).schedule) && /modules\/saat\/kuyruklar\.ts/.test(job(n).schedule), n + ' defined through isTanimla with its queue in modules/saat');
  must('I074', /'aynı veriyle iki kez çalışırsa'/.test(job(n).idempotency), n + ' twice scenario');
}
must('I074', /pg-boss işi değil/.test(job('saat_esitleme_denetimi').schedule), 'in-process timer is not a pg-boss job');
must('I074', ['apps/server/src/jobs/saat/index.ts', 'apps/server/src/modules/saat/kuyruklar.ts'].every(f => S.files.includes(f)) && hasTest('İş tanımları D14 kurallarına uyar') && hasTest('Yeniden değerlendirme işi aynı veriyle iki kez'), 'files and tests');
for (const j of S.jobs || []) for (const m of String(j.schedule).matchAll(/cron: '([^']+)'/g)) { const saat = m[1].split(' ')[1]; must('I074', !/^\d+$/.test(saat) || +saat < 3 || +saat >= 5, `${j.name} daily run between 03:00 and 05:00`); }

// I045: audit event types in SAAT_DENETIM_OLAYLARI, birimId wherever dersId
const den = sig('SAAT_DENETIM_OLAYLARI');
const olaylar = [...den.matchAll(/'(saat\.[a-z_]+)' \{([^}]*)\}/g)];
must('I045', olaylar.length === 5 && olaylar.every(m => !/dersId/.test(m[2]) || /birimId/.test(m[2])), 'five event types, birimId with dersId');
const d09 = (S.dis_yuz_kullanimi || []).find(x => /^D09:/.test(x)) || '';
must('I045', olaylar.every(m => d09.includes(m[1])) && reg(/D09\.denetimOlaylariniKaydet\('saat', SAAT_DENETIM_OLAYLARI\)/), 'registered and listed');

// I070: plugin and option type
must('I070', /FastifyPluginAsync<SaatEklentisiSecenekleri>/.test(sig('saatEklentisi')) && /extends EklentiTemelSecenekleri/.test(sig('SaatEklentisiSecenekleri')), 'saatEklentisi and its option type');
for (const p of ['kayıt sırasında veritabanına dokunmaz', "yalnız surec 'api' iken", 'D13.rotalariKaydet', 'setErrorHandler ve setNotFoundHandler kullanmaz', 'SAAT_BULUNAMADI', 'API_ROL_YETKISIZ']) must('I070', pur('saatEklentisi').includes(p), 'plugin rule: ' + p);
must('I070', !/SAAT_PENCERE_BULUNAMADI/.test(J + H) && (S.endpoints[1].errors || []).some(x => /^404 SAAT_BULUNAMADI/.test(x)), 'resource 404 is SAAT_BULUNAMADI');
const hataBolumu = H.slice(H.indexOf('<h3>Hata kodları</h3>'), H.indexOf('<h3>Testler</h3>'));
const kodlar = [...hataBolumu.matchAll(/<tr><td><code>([A-Za-z_]+)<\/code><\/td>/g)].map(m => m[1]);
must('I070', hataBolumu.length > 0 && kodlar.length >= 10 && kodlar.every(k => k.startsWith('SAAT_')), 'module error codes prefixed SAAT_ (' + kodlar.filter(k => !k.startsWith('SAAT_')).join(' ') + ')');

// closing rules of the round
must('close', (S.open_points || []).every(o => o.needs_owner === true), 'no open point without an owner decision');
must('close', ['D04-A01', 'D04-A02', 'D04-A03', 'D04-A04', 'D04-A07'].every(id => op(id) && op(id).needs_owner === true), 'owner points kept');
must('close', !/bütünleştirme notu \d/.test(H), 'section has no integration-note count');
for (const r of BEKLENEN.map(x => x.split('+')[0])) if (!seen.has(r)) errs.push('instruction without a check: ' + r);

console.log(errs.length ? 'ALIGN GATE RED (' + errs.length + '):\n' + errs.join('\n') : `align gate green: ${seen.size - 2} instructions checked`);
process.exit(errs.length ? 1 : 0);
