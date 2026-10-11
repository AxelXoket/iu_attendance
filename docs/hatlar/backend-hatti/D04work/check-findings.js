// Round-2 gate: every review finding owned by D04 leaves a checkable trace in spec/D04.json and frag/D04.html,
// and the stale text the finding named is gone. Run after build.js. Exit 1 on any miss.
'use strict';
const fs = require('fs'), path = require('path');
const B = process.env.D04_ROOT || path.join(__dirname, '..');
const S = JSON.parse(fs.readFileSync(path.join(B, 'spec', 'D04.json'), 'utf8'));
const H = fs.readFileSync(path.join(B, 'frag', 'D04.html'), 'utf8');
const J = JSON.stringify(S);
const tbl = n => S.tables.find(t => t.name === n);
const col = (t, c) => (tbl(t) ? tbl(t).columns.find(x => x.name === c) : null) || {};
const hasCol = (t, c) => !!(tbl(t) && tbl(t).columns.some(x => x.name === c));
const exp = n => S.exports.find(e => e.name.startsWith(n)) || {};
const job = n => S.jobs.find(j => j.name === n) || {};
const test = n => S.tests.find(t => t.name === n) || {};
const hasTest = n => S.tests.some(t => t.name === n);
const op = id => S.open_points.find(o => o.id === id) || {};
const gap = id => S.resolved_gaps.find(g => g.gap === id) || {};
const errs = [];
const must = (id, cond, what) => { if (!cond) errs.push(`${id}: ${what}`); };
const absent = (id, re, what) => { const m = J.match(re) || H.match(re); if (m) errs.push(`${id}: stale text still present (${what}): ${m[0]}`); };

// F1 race: lock contract
must('F1', /FOR KEY SHARE/.test(exp('pencereSonucu').purpose), 'pencereSonucu takes FOR KEY SHARE');
must('F1', /FOR UPDATE/.test(exp('pencereleriHesapla').purpose), 'pencereleriHesapla takes FOR UPDATE');
must('F1', S.invariants.some(i => /önce pencere, sonra kayıt ve öğrenci/.test(i)), 'lock order invariant');
must('F1', /Kilit sözleşmesi/.test(H), 'frag lock contract paragraph');
must('F1', hasTest('Öğrenci kaydı ile ders içi değişiklik yarışmaz') && /kilitsiz/.test(test('Öğrenci kaydı ile ders içi değişiklik yarışmaz').asserts), 'race test with control');
must('F1', /FOR NO KEY UPDATE SKIP LOCKED/.test(job('oturum_pencere_kapat').does), 'close job does not block readers');
// F2 ESKI_PROGRAM
must('F2', /'ICINDE' \| 'DEGISIM_DILIMI' \| 'ESKI_PROGRAM' \| 'DISINDA'/.test(exp('pencereSonucu').signature), 'four result names');
// I018: D04-A09 closed, the D02 request is now recorded as a resolved gap
must('F2', /oncekiYoklamaSuresiDk/.test(exp('pencereSonucu').purpose) && /oncekiYoklamaSuresiDk/.test(gap('D04-A09').decision) && !op('D04-A09').id, 'previous duration requested from D02 (closed, I018)');
must('F2', /ESKI_PROGRAM/.test(gap('D04-B23').decision), 'B23 rewritten');
must('F2', hasTest('Eski programla gelen kayıt'), 'old program boundary test');
absent('F2', /'dilimde'|'icinde'|'disinda'/, 'lowercase window results');
// F3 Kendi beyanı
must('F3', /kayitAnindaSureSecildi: boolean/.test(exp('pencereSonucu').signature), 'record-time setting returned');
must('F3', /D07-B20/.test(gap('D04-B11').decision) && !/pencereGetir\(\)\.sureSecildi false ise/.test(gap('D04-B11').decision), 'B11 follows D07-B20');
must('F3', /kayıttan sonra süre seçildi/.test(test('Kayıt anındaki süre ayarı').asserts) && /kayıttan sonra süre kaldırıldı/.test(test('Kayıt anındaki süre ayarı').asserts), 'both boundary rows');
// F4 + D06(1) kurulum FK
absent('F4', /REFERENCES kurulumlar/, 'kurulum foreign key');
must('F4', /Yabancı anahtar yok/.test(col('pencere_degisiklikleri', 'kurulum_id').note), 'kurulum_id note');
must('F4', hasTest('Hoca hesabı silinince değişiklik izi kalır'), 'account deletion test');
// F5 adapter and D02 decides
// I008/I019: adapter is (tx, olay) => pencereleriHesapla(tx, olay.oturumlar); OturumUretimOgesi is a superset of OturumPlani
must('F5', S.registrations.some(r => /\(tx, olay\) => pencereleriHesapla\(tx, olay\.oturumlar\)\)/.test(r)) && !S.registrations.some(r => /olay\.oturumlar\.map/.test(r)), 'adapter registration (I008)');
must('F5', /OturumPlani = Pick<OturumUretimOgesi,/.test(exp('pencereleriHesapla').signature), 'type derived from D02 by Pick (I008)');
absent('F5', /açılmış pencerenin planına dokunmaz/, 'own clock decision');
must('F5', /1 ms önce/.test(test('D02 olayındaki oturum baştan hesaplanır').asserts), '1 ms boundary test');
must('F5', /D02 oturum üretim dinleyicisi/.test(test('Dinleyiciler iki süreçte aynı').asserts) && /pencereDegisti/.test(test('Dinleyiciler iki süreçte aynı').asserts), 'listener parity test');
// F6 + D06(2) GenelKaynak
must('F6', S.registrations.some(r => /tur: 'genel'/.test(r) && /kapsam, surumden, surumeKadar, adet/.test(r)), 'GenelKaynak registration');
must('F6', tbl('oturum_pencereleri').indexes.some(i => /ders_id_surum_idx: \(ders_id, surum\)/.test(i)), '(ders_id, surum) index');
absent('F6', /ogrenciHesabiGetir|ogrencininEtkinSatirlari|dizinsiz, bilerek/, 'own scope rebuild or unindexed FK');
must('F6', hasCol('oturum_pencereleri', 'sube_idleri'), 'branch filter column');
must('F6', /sorgu süresi ayrı ölçülür/.test(test('Ders çıkışı yükü').asserts), 'load measures source');
// F7 + D06(3) version last
absent('F7', /telefona inen alan değiştiyse <code>D06\.surumAl|Bir çağrıda tek sürüm alır/, 'surumAl in the middle');
// I019: D04-A10 closed; the stamp goes through D06.surumDamgasiIste
must('F7', /surumAl çağrılmaz/.test(H) && !op('D04-A10').id && /surumDamgasiIste/.test(gap('D04-A10').decision) && /surumDamgasiIste/.test(exp('pencereleriHesapla').purpose), 'deferred stamp (I019)');
must('F7', /TEKRAR_DENE oranı/.test(test('Ders çıkışı yükü').asserts), 'retry rate threshold');
must('F7', hasTest('Sürüm işlemin son adımında'), 'version order test');
// F8 kilitDurumu
must('F8', /D02\.kilitDurumu\(tx, oturum\.birimId/.test(H), 'handler uses kilitDurumu');
must('F8', hasTest('Deneme dersi ve takvimsiz birim'), 'trial and calendarless scenarios');
// F9 outage gaps
must('F9', /bekleyen açılış/.test(job('saat_esitleme_denetimi').does) && /LEAST/.test(job('saat_esitleme_denetimi').idempotency), 'pending open instant');
must('F9', /her okumada/.test(col('saat_esitleme_kesintileri', 'son_bozuk_okuma_ani').note), 'write every read');
must('F9', S.state_machines.find(m => /Saat eşitlemesi/.test(m.name)).transitions.some(t => t.from === 'SAGLIKLI' && t.to === 'SAGLIKLI'), 'SAGLIKLI->SAGLIKLI');
must('F9', /önceki kesintinin bitişi|önce kapanmış son kesintinin bitis_ani/.test(job('esitleme_sonrasi_yeniden_degerlendir').does), 'evaluation lower bound');
for (const n of ['Bozuk süreç varken kesinti kapanmaz', 'Tek süreçte kesinti sonraki sağlıklı okumada kapanır', 'Yazılamayan açılış kaybolmaz']) must('F9', hasTest(n), 'test ' + n);
absent('F9', /en çok 10 saniyede bir/, 'write throttle');
// F10 jump size
must('F10', hasCol('saat_esitleme_kesintileri', 'en_buyuk_sicrama_ms'), 'jump column');
must('F10', /sıçrama 500 ms: false/.test(test('Kesinti sonrası güvenilirlik bilgisi').asserts), 'jump test');
// F11 batches
must('F11', hasCol('saat_esitleme_kesintileri', 'yeniden_degerlendirme_imleci'), 'cursor column');
must('F11', /parti: \{ imlec/.test(exp('kesintiKapandiDinleyicisiKaydet').signature), 'batched listener');
must('F11', hasTest('Yeniden değerlendirme partili ve kaldığı yerden'), 'batch test');
absent('F11', /ile tek işlemde çağırır/, 'single transaction re-evaluation');
// F12 savepoint per row
must('F12', /SAVEPOINT/.test(job('oturum_pencere_kapat').does) && /saat\.pencere_kapanamadi/.test(job('oturum_pencere_kapat').does), 'per-row savepoint and alert');
absent('F12', /Bir dinleyici hata verirse parti geri alınır|Dinleyici hatası kapanışı geri alır/, 'batch rollback');
// F13 retention
// I064/I025: one handler for the catalog class saat.donem_verisi, own tables only
must('F13', S.registrations.some(r => /saklamaIsleyicisiKaydet\('saat\.donem_verisi', \{ modul: 'saat', islem: 'silme', partiIsle/.test(r)) && !S.registrations.some(r => /saklamaIsleyicisiKaydet\('saat\.pencere_degisiklikleri'/.test(r)), 'class name and partiIsle (I064)');
must('F13', !S.registrations.some(r => /saklamaIsleyicisiKaydet/.test(r) && /kilitDurumu/.test(r)), 'retention handler reads no other module (I064)');
must('F13', tbl('pencere_degisiklikleri').constraints.some(x => /yoklama_saklama/.test(x) && /@yalniz-ekleme/.test(x)), 'grant row');
absent('F13', /saklamaIsleyicisiKaydet\('yoklama_kayitlari'|sahip rolle siler/, 'old class and role');
// F14 lists
must('F14', /BASKA_CIHAZ_GONDERDI/.test(exp('saatSonucu').signature) && tbl('pencere_degisiklikleri').constraints.some(x => /BASKA_CIHAZ_GONDERDI/.test(x)), 'other-device code');
must('F14', /çiftidir/.test(exp('saatSonucu').purpose), 'reason derived from pair');
must('F14', /D05 ve D11/.test(test('Komşu CHECK listeleri D04 sabitleriyle aynı').asserts), 'neighbour CHECK test');
// F15 casing
absent('F15', /'kabul'|'zaten_var'|'ret'|sure_kaynagi IN \('ders'|'son_gun_gecti'|'iki_capa'|'dosya_yok'|'sure_doldu'/, 'lowercase code values');
must('F15', /BÜYÜK_HARF/.test(test('Kod değerleri BÜYÜK_HARF ve genişleyen enum').asserts), 'casing test');
// F16 item handler contract
must('F16', /roller: \['PERSONEL'\], oturumGerekli: true, govdeEnBuyukBayt: 512/.test(S.registrations[0]), 'OgeIsleyici fields');
must('F16', /KABUL \{ ulasmaAni, ayrinti: \{ uygulandi, gerekce\?: 'SAAT_DEGISIKLIK_SAKLANDI' \} \}/.test(S.queue_items[0].sonuclar) && /ZATEN_VAR \{ ulasmaAni: saklı ulasma_ani \}/.test(S.queue_items[0].sonuclar), 'result shapes');
must('F16', /GelenOge\.esitlemeSaglikli/.test(col('pencere_degisiklikleri', 'esitleme_bozukken_ulasti').note), 'flag from GelenOge');
absent('F16', /farklıysa D06 tekrar_dene verir/, 'wrong identity line');
// F17 compromised key
must('F17', /ANAHTAR_ELE_GECIRILDI/.test(tbl('pencere_degisiklikleri').constraints.join(' ')) && !/eleGecmisAnahtar/.test(J), 'compromised key code');
must('F17', hasTest('Ele geçirilmiş anahtarla belge çapa kurmaz'), 'compromised key test');
// F18 signed belge request
// I018/I071 superseded F18: the belge route is Bearer session only, the old phone sends without a second anchor
must('F18', /kimlik \['oturum'\], kimlikKaynaklari \['bearer'\]/.test(S.endpoints[0].auth) && !S.endpoints[0].request.cihazImzasi && !/'cihazImzasi'\]/.test(S.endpoints[0].auth), 'Bearer-only belge route (I071)');
must('F18', hasTest('Belge ucu yalnız Bearer oturumuyla') && !hasTest('Oturumu kapanmış eski telefon imzalı istekle belge alır') && /ikinci çapasız/.test(gap('D04-B13').decision), 'old phone path recorded (I018)');
// F19 open points
// A4: D04-A08 is not a product decision and is closed
must('F19', op('D04-A07').needs_owner === true && !op('D04-A08').id && /altyapi-sunucu-makinesi/.test(gap('D04-A08').why), 'A07 owner point, A08 closed (A4)');
for (const g of ['D04-B02', 'D04-B03', 'D04-B24']) must('F19', /D07-A03/.test(gap(g).decision), g + ' links D07-A03');
absent('F19', /3 ürün sorusu \(B07, B08, B09\)/, 'old count sentence');
// F20 composite FKs
must('F20', tbl('oturum_pencereleri').constraints.some(x => /FOREIGN KEY \(oturum_id, donem_id\) REFERENCES oturumlar \(id, donem_id\)/.test(x)) && tbl('oturum_pencereleri').constraints.some(x => /FOREIGN KEY \(oturum_id, ders_id\) REFERENCES oturumlar \(id, ders_id\)/.test(x)), 'window composite FKs');
must('F20', tbl('pencere_degisiklikleri').constraints.some(x => /FOREIGN KEY \(oturum_id, donem_id\) REFERENCES oturum_pencereleri \(oturum_id, donem_id\)/.test(x)) && tbl('oturum_pencereleri').indexes.some(x => /UNIQUE \(oturum_id, donem_id\)/.test(x)), 'change composite FK and target');
absent('F20', /REFERENCES donemler|REFERENCES dersler/, 'single-column FKs');
// F21 monotone press
must('F21', /p' = en büyük\(p, aynı kurulumda/.test(gap('D04-B05').decision) && hasTest('Aynı kurulumun değişiklikleri sıra düzeninde'), 'monotone rule and property');
// F22 handler order and authority
// I009: dersYetkisi(tx, kimlik, dersId), no hand-built OturumKisisi or scope object
must('F22', /\(2\) aynı kimlik/.test(H) && /\(4\) yetki/.test(H) && /oncekiHocaKisiIdleri/.test(H) && /D02\.dersYetkisi\(tx, baglam\.kimlik, oturum\.dersId\)/.test(H) && !/OturumKisisi|YoneticiKapsami/.test(J + H), 'order, previous owners, three-argument dersYetkisi (I009)');
must('F22', /saat\.yetkisiz_pencere_degisikligi/.test(S.dis_yuz_kullanimi.join(' ')), 'audit event type');
// F23 query count test
must('F23', /kancasından sonra sıfırlanır/.test(test('Belge servisi veritabanına dokunmaz').asserts), 'counter after root hook');
absent('F23', /tam 1 sorgu/, 'exact one query claim');
// F24 Istanbul
must('F24', /2015-12-01T10:00:00\.000Z/.test(test('Saat dilimi bağımsızlığı ve İstanbul yardımcıları').asserts) && hasTest('İstanbul çevirisi D02 SQL çevirisiyle aynı'), 'DST vectors and SQL parity');
absent('F24', /D14-B09 için tek İstanbul dönüşüm yardımcısı/, 'single helper claim');
// F25 small items
absent('F25', /hizSinifi\('saat_belgesi'\)|singletonKey|D08 \(devam_hesapla\)|istekteki tur, kisiId, oturumId/, 'small interface drift');
must('F25', /simdiTarih\(\): Date/.test(exp('simdi').signature), 'simdiTarih');
must('F25', /sureAsimiSaniye: 300/.test(job('oturum_pencere_kapat').schedule) && /sureAsimiSaniye: 1800/.test(job('esitleme_sonrasi_yeniden_degerlendir').schedule) && /stately/.test(job('esitleme_sonrasi_yeniden_degerlendir').schedule), 'job policies');
// I071: the cookie is refused by kimlikKaynaklari at the root, the module has no hook of its own
must('F25', /saatBelgesi: false/.test(S.endpoints[0].rate_limit) && /kimlikKaynaklari \['bearer'\]/.test(S.endpoints[0].auth) && !/oncekiKancalar/.test(S.endpoints[0].auth), 'route flag and cookie refusal (I071)');
must('F25', /işaretsiz/.test(col('saat_esitleme_kesintileri', 'ilk_sapma_ms').note), 'unsigned deviation');
// I070: the option type extends EklentiTemelSecenekleri ({ surec })
must('F25', /FastifyPluginAsync<SaatEklentisiSecenekleri>/.test(exp('saatEklentisi').signature) && /extends EklentiTemelSecenekleri/.test(exp('SaatEklentisiSecenekleri').signature) && /surec: 'api' \| 'isci'/.test(exp('SaatEklentisiSecenekleri').signature), 'plugin process option (I070)');
// I016: D04-A05 closed, contracts.json carries the purpose fix
must('F25', !op('D04-A05').id && /kesinleşmeyi D07 izler/.test(gap('D04-A05').decision), 'contracts purpose fix applied (I016)');
// F26 moved session ignores earlier changes
must('F26', hasCol('oturum_pencereleri', 'tasima_ani') && hasTest('Taşınan oturumda önceki erken kapatma etkisiz'), 'move rule');
// D06 (4) re-stamp on D02 event
must('D06-4', /değeri değişmese de/.test(exp('pencereleriHesapla').purpose) && hasTest('Şube eklenen oturumun penceresi yeni şubeye iner'), 're-stamp');

console.log(errs.length ? 'FINDINGS GATE RED:\n' + errs.join('\n') : 'findings gate green: ' + 27 + ' finding groups checked');
process.exit(errs.length ? 1 : 0);
