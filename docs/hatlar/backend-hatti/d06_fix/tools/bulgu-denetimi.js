// One deterministic check per review finding against the built spec/D06.json (and frag). Exit 1 if any fails.
const fs = require('fs'), path = require('path');
const B = path.join(__dirname, '..', '..');
const S = JSON.parse(fs.readFileSync(path.join(B, 'spec', 'D06.json'), 'utf8'));
const H = fs.readFileSync(path.join(B, 'frag', 'D06.html'), 'utf8');
const J = JSON.stringify(S);
const has = (o, s) => (typeof o === 'string' ? o : JSON.stringify(o)).includes(s);
const gap = id => S.resolved_gaps.find(g => g.gap === id);
const tbl = n => S.tables.find(t => t.name === n);
const exp = n => S.exports.find(e => e.name === n);
const test = n => S.tests.find(t => t.name === n);
const kod = k => S.hata_kodlari.find(x => x.kod === k);
const checks = [
  ['F01 D01 key shape + hesap_silindi', () => has(S.kayitlar, "'hesap_silindi'") && has(gap('D06-B02'), "'android_p256'") && !has(S.beklenenler, 'acikAnahtarSpki')],
  ['F02 owner per-role columns', () => has(gap('D06-B15'), 'D02-B29') && has(gap('D06-B15'), 'kafa sayısı ve yapıldı öğrenciye inmez')],
  ['F03 birimDonemi null / field name', () => has(exp('gondermeSuresiSonu').signature, 'kilitAni: Date | null') && has(exp('gondermeSuresiSonu').purpose, 'BirimDonemiBilgisi.kilitAni')],
  ['F04 gap CHECK + reset + job lock + test', () => !has(tbl('kurulumlar').constraints, 'ilk_eksik_sira > kesintisiz_son_sira') && has(S.akislar.gonderim, "ilk_eksik_sira boş") && has(S.jobs[0].does, 'FOR UPDATE SKIP LOCKED') && /Mutasyon/.test(test('Boşluk raporlandıktan sonra eksik sıra gelir').asserts)],
  ['F05 identity preHandler', () => has(S.endpoints[0].auth, 'oncekiKancalar') && S.endpoints[0].errors.some(e => e.includes('API_KIMLIK_GEREKLI')) && !J.includes('ESITLEME_KIMLIK_YOK') && S.contradictions_resolved.some(c => c.id === 'D06-C04') && !!test('Kapanmış Bearer ve pasif cihaz imzası kökten geçer')],
  ['F06 kurulum backoff + regression', () => has(S.state_machines[1], 'öğeler değil kurulum bekler') && has(S.telefon_sozlesmesi, 'gerileme') && has(test('Gönderim durum makinesi').asserts, 'paket düzeyinde hatalar') && has(test('Gönderim durum makinesi').asserts, 'bekleme sırasında oluşan öğeler')],
  ['F07 request-level 4xx', () => kod('ESITLEME_KURULUM_KIMLIGI_GECERSIZ').sonuc === '403' && has(S.endpoints[0].request.yerelRetler, 'gevşek zarf') && S.contradictions_resolved.some(c => c.id === 'D06-C05') && has(S.telefon_sozlesmesi, 'yarılarına konmaz') && has(S.telefon_sozlesmesi, 'UUID olmayan öğe kimliği null')],
  ['F08 KararSurumu', () => has(S.tipler, 'KararSurumuSemasi') && has(S.tipler, 'kararSurumu: KararSurumu') && !!test('Karar sürümü telefondan sorun bildirimine aynen döner')],
  ['F09 scope owner + range rule', () => has(exp('indirmeKaynagiKaydet').purpose, 'iki kapsam kaynağını da D02 kaydeder') && has(test('İndirme kaynağı sözleşme denetimi').asserts, "surumden'e eşit ya da küçük sürüm kırmızı")],
  ['F10 account deletion via D01 listener, no FK on kurulumlar', () => has(tbl('kurulumlar').purpose, 'yabancı anahtar koymaz') && !has(tbl('karar_teslimleri').constraints, 'REFERENCES yoklama_kayitlari') && has(S.akislar.gonderim, "Kişi silinmişse")],
  ['F11 duplicate sira, null yerel ret id, LEAST', () => has(tbl('gonderim_defteri').constraints, "'ESITLEME_YEREL_RET'") && has(S.akislar.gonderim, 'istekte tekrar eden sıranın ikincisi') && has(S.akislar.gonderim, 'LEAST(..., 100000)')],
  ['F12 rate limit after identity', () => has(S.endpoints[0].rate_limit, "'gonderim'") && has(S.endpoints[0].rate_limit, 'girissiz IP') && !J.includes('IP sınırı yok')],
  ['F13 key type mapping', () => has(gap('D06-B02'), "'app_attest' anahtarı paket imzasında hiç geçmez") && has(test('İkinci çapa bağlamı').asserts, 'Anahtar türü uyuşmazlığı')],
  ['F14 counter seed', () => has(exp('surumAl').purpose, 'ON CONFLICT') && has(tbl('degisiklik_sayaci').constraints, 'Göç satır yazmaz') && !!exp('enEskiGecerliSurumuYukselt')],
  ['F15 deferred stamp', () => has(S.tipler, 'surumlaDamgala') && has(S.akislar.gonderim, 'surumAl bir kez') && !!test('Sayaç gönderimde bir kez ve en sonda alınır')],
  ['F16 student-state ack after groups', () => has(S.akislar.gonderim, 'SKIP LOCKED') && has(S.kurallar.find(k => k.ad === 'Kilit sırası').metin, 'öğrenci durum onayı (SKIP LOCKED)')],
  ['F17 transaction_timeout + pre-commit reply check', () => has(gap('D06-B30'), "transaction_timeout '20s'") && has(S.akislar.gonderim, 'cevap şemasıyla doğrulanır') && !!test('İşlem süresi sınırı')],
  ['F18 first-send jitter', () => has(S.telefon_sozlesmesi, 'İlk gönderim: yoklama anında') && has(test('Ders çıkışı yük testi').asserts, 'ilk gönderim kaydırma')],
  ['F19 full-download number', () => has(S.telefon_sozlesmesi, 'tam indirme numarası') && !!test('Tam indirme yarıda kalınca bayat satır kalmaz')],
  ['F20 body hash + server hold time', () => tbl('gonderim_defteri').columns.some(c => c.name === 'govde_ozeti') && has(S.tipler, 'ilkGorulmeAni') && has(S.tipler, 'sunucuBekletmeAni') && S.kurallar.some(k => k.ad === 'Ulaşma anı')],
  ['F21 receipt kid + compromised key', () => has(S.kurallar.find(k => k.ad === 'Ulaşma makbuzu').metin, 'kid uzunluğu 1 bayt') && has(S.kurallar.find(k => k.ad === 'Ulaşma makbuzu').metin, 'ELE_GECIRILDI') && has(S.kurallar.find(k => k.ad === 'Ulaşma makbuzu').metin, '67 karakter')],
  ['F22 install limit lock + live count', () => has(S.kurallar.find(k => k.ad === 'Kurulum sayımı').metin, 'danismaKilidi') && has(S.kurallar.find(k => k.ad === 'Kurulum sayımı').metin, '180 gün') && !!kod('ESITLEME_KURULUM_ACILAMAZ') && has(test('Kişi başına kurulum sınırı').asserts, 'eşzamanlı')],
  ['F23 other-account kurulum is 403', () => kod('ESITLEME_KURULUM_BASKA_HESABIN').sonuc === '403' && kod('ESITLEME_KIMLIK_UYUSMUYOR').sonuc === '403' && has(S.telefon_sozlesmesi, 'yeni kurulum açmaz')],
  ['F24 teyit in cursor', () => has(S.kurallar.find(k => k.ad === 'İmleç biçimi').metin, 'teyit') && has(S.beklenenler, 'Teyit ve teyit reddi aynı işlemde ogrenciDurumuDegisti')],
  ['F25 teslim info + open point', () => has(exp('kararTeslimAni').signature, 'ilkSunulmaAni') && S.open_points.some(o => o.id === 'D06-A02' && o.needs_owner)],
  ['F26 pure gondermeSuresiSonu', () => has(exp('gondermeSuresiSonu').purpose, 'Intl ve infra kullanmaz') && !J.includes('istanbulGunSonuAni')],
  ['F27 no module cycles', () => has(test('Modül sınırı').asserts, 'D01 ve D04 işlevleri esitlemeEklentisi seçeneğiyle') && has(exp('kurulumSonTemasi').signature, '[yaprak]') && has(exp('kararTeslimAni').signature, '[yaprak]')],
  ['F28 pending yoklama only', () => has(exp('kurulumSonTemasi').signature, 'bekleyenYoklamaVar') && !!S.endpoints[0].request.bekleyenYoklamaSayisi && !J.includes('bekleyenOgeSayisi')],
  ['F29 handler shapes', () => has(S.tipler, 'GelenOge<T extends OgeTuru') && has(S.tipler, 'OgeSonucuKodu') && has(S.tipler, 'log: Logger') && has(S.tipler, 'esitlemeSaglikli') && has(exp('ogeTuruKaydet').signature, 'ilkCapaVar') && has(S.beklenenler, "D11 ('gosterim_kaydi'")],
  ['F30 dependent rows re-stamped', () => has(S.beklenenler, 'yeniden damgalanır')],
  ['F31 D13/D14 names', () => has(S.kayitlar, "kimlik: ['cihazImzasi', 'oturum']") && has(S.kayitlar, 'saatBelgesi: true') && has(S.jobs[0].schedule, 'politika exclusive') && has(S.jobs[0].idempotency, 'tetiklemeAni') && !J.includes('cihaz-imzasi')],
  ['F32 per-chunk invariant + sira exception', () => S.invariants.some(i => i.includes('parça başına bir SAVEPOINT')) && S.contradictions_resolved.some(c => c.id === 'D06-C06')],
  ['F33 closed device RET', () => !!kod('ESITLEME_OTURUM_KAPALI') && has(gap('D06-B10'), 'RET ESITLEME_OTURUM_KAPALI')],
  ['F34 D12 retention class not used', () => !J.includes("saklamaIsleyicisiKaydet('hesap_silme'") && has(gap('D06-B26'), 'kimlikOlayiDinleyicisiKaydet')],
  ['HTML renders new pieces', () => H.includes('ESITLEME_KURULUM_BASKA_HESABIN') && H.includes('D06-A02') && H.includes('D06-C06') && H.includes('Kurallar: su seviyesi')]
];
let bad = 0;
for (const [ad, f] of checks) { let ok = false; try { ok = !!f(); } catch (e) { ok = false; } if (!ok) bad++; console.log((ok ? 'OK   ' : 'FAIL ') + ad); }
console.log(`${checks.length - bad}/${checks.length} checks pass`);
process.exit(bad ? 1 : 0);
