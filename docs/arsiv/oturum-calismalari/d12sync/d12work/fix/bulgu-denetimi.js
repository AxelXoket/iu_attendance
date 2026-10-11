// Deterministic ledger for the D12 finding round: each finding gets must-have and must-not-have probes
// against the built spec/D12.json + frag/D12.html. Ground control: run against fix/D12.orig.* and expect most to fail.
'use strict';
const fs = require('fs');
const path = require('path');
const B = path.resolve(__dirname, '..', '..');
const [specPath, fragPath] = process.argv[2] === 'orig'
  ? [path.join(__dirname, 'D12.orig.json'), path.join(__dirname, 'D12.orig.html')]
  : [path.join(B, 'spec', 'D12.json'), path.join(B, 'frag', 'D12.html')];
const S = JSON.parse(fs.readFileSync(specPath, 'utf8'));
const html = fs.readFileSync(fragPath, 'utf8').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const all = JSON.stringify(S) + '\n' + html;
const g = id => (S.resolved_gaps.find(x => x.gap === id) || {});
const gtxt = id => (g(id).decision || '') + ' ' + (g(id).why || '');
const exp = n => S.exports.find(e => e.name.startsWith(n)) || {};
const job = n => S.jobs.find(j => j.name === n) || {};
const sm = n => S.state_machines.find(m => m.name.startsWith(n)) || {};
const test = re => S.tests.some(t => re.test(t.name + ' ' + t.asserts));
const has = (s, ...res) => res.every(r => (r instanceof RegExp ? r.test(s) : s.includes(r)));
const not = (s, ...res) => res.every(r => !(r instanceof RegExp ? r.test(s) : s.includes(r)));

const F = {
  'F01 D06: B08 kilit analizi ertelenmiş sayaç, B19 D01-B33': () => has(gtxt('D12-B08'), 'ertelenmiş damga', 'son adımında bir kez', 'D06-B19') && has(gtxt('D12-B19'), 'D01-B33') && not(gtxt('D12-B19'), 'D06 süzgeci', 'aynı satırın silinme_ani boşaltılır'),
  'F02 D08: yalitim secenegi': () => has(exp('islem').signature, "yalitim?: 'read_committed' | 'repeatable_read'") && has(exp('islem').purpose, 'REPEATABLE READ') && test(/Yalıtım seçeneği/) && S.requests.some(r => /D13/.test(r.modul) && /yalitim/.test(r.istek)),
  'F03 D10: RR testi ve 40001': () => test(/repeatable_read.*görünmez.*read_committed/s) && has(exp('islem').purpose, '40001', 'SET TRANSACTION yazılmaz'),
  'F04 D11: temizlik saati kuralı D14': () => has(gtxt('D12-B24'), 'D14-B05', '03:00 ile 05:00 arasında başlamaz', 'en az 5 dakika') && not(all, '04:00 ile 05:00'),
  'F05 parola: SCRAM, track_utility, test': () => has(gtxt('D12-B04'), 'track_utility = off', 'SCRAM-SHA-256$4096', 'tutmuyorsa') && test(/pg_stat_statements'ta hiçbir sır/) && test(/track_utility açık oturumda düz ALTER ROLE/) && not(gtxt('D12-B04'), 'parolalarını sır dosyasından yeniler'),
  'F06 hata kodları: API_ ve ayrı işletim sabiti': () => not(all, 'VERITABANI_HAVUZ_DOLU', 'VERITABANI_KILITLENME', 'VERITABANI_SALT_OKUNUR', 'VERITABANI_BAGLANTI_SINIRI', 'VERITABANI_NESIL_BELIRSIZ', /VERITABANI_ZAMAN_ASIMI(?!_)/, 'http: 400 | 503 | null', 'VeritabaniHatasi\'na çevirir (kod, SQLSTATE') && has(all, 'VERITABANI_ISLETIM_KODLARI', "hataKodlariTanimla('veritabani'", '55P03', '25P03', '57P01', '08 sınıfı', 'cause') && test(/Retry-After/) && S.requests.some(r => r.modul === 'D13' && /55P03/.test(r.istek)),
  'F07 veritabani: db, havuz, Islem': () => has(exp('veritabani').signature, 'readonly db: NodePgDatabase', 'readonly havuz: Pool') && has(exp('Islem').signature, 'export type Islem') && has(exp('veritabani').purpose, 'Biome') && S.requests.some(r => r.modul === 'contracts.json' && /db, havuz/.test(r.istek)) && not(all, 'Drizzle istemcisi dışarı verilmez'),
  'F08 pg_hba: göç adresi, bakım vt, test ve deneme dosyaları': () => has(gtxt('D12-B05'), '172.30.12.20/32', 'pg_hba.test.conf', 'pg_hba.deneme.conf', 'ip_range') && not(all, 'postgres her ikisine') && test(/Kurulum boş kümede, üretim pg_hba ile/) && S.files.includes('docker/postgres/pg_hba.test.conf'),
  'F09 postgres-test tanımı': () => has(html, 'POSTGRES_PASSWORD_FILE', 'POSTGRES_INITDB_ARGS', 'pg_hba.test.conf:ro', 'hba_file', 'pg_isready, -h, 127.0.0.1', '<<: *ortak') && test(/up --wait postgres-test.*testVeritabaniHazirla/s) && has(gtxt('D12-B07'), 'API 5, işçi 3'),
  'F10 oncesi-concurrently: hedef denetimi, eski geçersiz dizin': () => has(JSON.stringify(sm('goc_adimi')), 'atlanır ve loglanır', 'önceden var', 'önceki başarısız çalışmadan kalmış') && test(/Boş veritabanında 1\. göç tabloyu açar/) && test(/aynı adla kalmış geçersiz dizin/),
  'F11 deneme diski ve bellek': () => has(job('geri_yukleme_denemesi').does, '2 kat veritabanı boyutu', 'max_wal_size', 'yüzde 85', 'shared_buffers=256MB', '1 GB ve 1 çekirdek', 'tek deneme kümesi') && has(job('geri_yukleme_denemesi').schedule, '15 GB') && not(all, '1,5 çekirdek', 'dökümün iki katı'),
  'F12 geri yükleme iptalleri': () => has(JSON.stringify(sm('geri_yukleme')), 'iptaller_uygulandi', "oturumlariKapat(tx, { istemci: 'panel' }, 'geri_yukleme')", 'hesabiSil', 'log arşivinden') && test(/Geri yükleme iptalleri/) && S.files.some(f => /geri-yukleme-iptaller/.test(f)),
  'F13 pg-boss saatleri 05:00 ve 06:25': () => has(job('saklama_suresi_isi').schedule, '05:00') && has(job('donem_bolumu_denetimi').schedule, '06:25') && not(all, '04:45', '04:50', '03:00 ile 04:00 arası boş'),
  'F14 saklama kataloğu': () => has(all, 'SAKLAMA_VERI_SINIFLARI', 'VERITABANI_SAKLAMA_SINIF_BILINMIYOR', 'VERITABANI_SAKLAMA_SINIF_SAHIBI', 'oncesinde', 'hesap_silindi') && has(gtxt('D12-B22'), 'esitleme.donem_verisi', 'kimlik.kisi_bagi', 'raporlar.donem_verisi', 'projeksiyon.donem_verisi') && not(exp('saklamaIsleyicisiKaydet').signature, 'oncekiSiniflar'),
  'F15 tablo işaretleri': () => not(all, '@yalniz-ekleme', '@istemci-kimligi', '@donem-bolunebilir', '@dizinsiz-kabul') && has(gtxt('D12-B11'), 'TABLO_ISARETLERI', 'istemci_kimligi:id pencere_degisiklikleri', 'tekil_satir degisiklik_sayaci', 'donem_bolunebilir yoklama_kayitlari', 'COMMENT ON') && test(/Ters yön/),
  'F16 göç sahipliği': () => has(html, 'GOC_BELIRTECLERI', 'conrelid', 'tgisinternal', 'tablo-haritasi.ts') && has(all, 'VERITABANI_GOC_DEGISTI') && not(html, 'tanımlandığı tablolar.ts klasöründen') && test(/infra\/izleme\/tablolar\.ts/) && test(/ana dalda bulunan bir göç klasöründe|Ana dalda bulunan bir göç klasöründe/),
  'F17 veritabaniIsleri isTanimla biçimi': () => has(exp('veritabaniIsleri').signature, "politika: 'exclusive'", 'sureAsimiSaniye: 2400 | 120', 'tetiklemeAni', 'iptal: AbortSignal', 'beklemeSaniye: 300') && has(job('saklama_suresi_isi').does, 'ay sonu kırpılarak') && test(/ay kırpma/i),
  'F18 yetkiler: pgboss, diziler, saklama USAGE': () => has(gtxt('D12-B03'), 'ON SEQUENCES TO yoklama_api, yoklama_isci', 'pgboss\'ta yalnız şema USAGE') && has(gtxt('D12-B02'), 'varsayılan yetki tanımlanmaz') && not(all, "pgboss'ta veri yetkisi") && test(/nextval/),
  'F19 saklama işleyici sözleşmesi ve ayrı giriş': () => has(exp('saklamaIsleyicisiKaydet').purpose, 'INSERT yapmaz', 'denetim yazmaz') && has(exp('saklamaIsleyicisiniCalistir').signature, 'saklamaIsleyicisiniCalistir(') && not(all, 'SET LOCAL ROLE') && has(S.invariants.join(' '), 'saklama kapsamındaki veri sınıflarında') && S.requests.some(r => /D04, D05/.test(r.modul) && /sahip rolle/.test(r.istek)),
  'F20 havuz bekleme kapsamı': () => has(S.invariants.join(' '), 'API süreçlerinde (yoklama_api)', '30 saniyedir') && test(/30 saniye sonra aynı hatayı/),
  'F21 danismaKilidi tek çağrı': () => has(exp('danismaKilidi').purpose, 'işlem başına tek çağrı', 'ikinci çağrı') && test(/ikinci danismaKilidi çağrısı testte hata atar/) && S.requests.some(r => r.modul === 'D14' && /danismaKilidi/.test(r.istek)),
  'F22 YedekIsDurumu şeması': () => has(exp('Sözleşme').purpose, 'sonBasariAni', "sonuc: 'basarili' | 'basarisiz' | 'atlandi'", 'atlandi 26 saat kuralında basarisiz gibi') && test(/basarili, basarisiz ve atlandi için birer örnek/),
  'F23 geri_yukleme_kayitlari süre, kayıp pencere, tekil': () => { const t = S.tables.find(x => x.name === 'geri_yukleme_kayitlari'); return t.columns.some(c => c.name === 'kayip_pencere_sonu_ani') && !t.columns.some(c => c.name === 'kayip_pencere_sonu') && has(JSON.stringify(t), 'geri_yukleme_kayitlari_yeni_nesil_uq', 'trafik_kapali anından kaydedildi') && test(/kaydet iki kez çalışınca tek satır/); },
  'F24 geri yükleme kilidi': () => has(JSON.stringify(sm('geri_yukleme')), 'ortak kilidini (flock)', 'geri yükleme sürüyor işaretini') && has(all, 'VERITABANI_YEDEK_GERI_YUKLEME_SURUYOR') && test(/Geri yükleme sırasında makine işi atlanır/),
  'F25 saklama sınırı 35 gün': () => has(gtxt('D12-B25'), 'repo1-retention-full-type=time', '34 günden eski', 'forget --prune', 'en geç 35 günde') && has(job('pgbackrest_fark_yedek').idempotency, '7 günden eskiyse') && not(job('gecelik_pg_dump').does, 'forget --keep-daily 35 uygular') && has(S.open_points.find(o => o.id === 'D12-A04').recommendation, '14 günü geçmez') && test(/saklama-secimi\.sh/),
  'F26 stanza ve geliştirme arşivi': () => has(job('pgbackrest_dogrulama').does, 'stanza-create') && has(gtxt('D12-B29'), 'archive_mode=off') && has(JSON.stringify(sm('geri_yukleme')), 'stanza-upgrade ve check geçti', 'PITR tabanı yoktur'),
  'F27 kisitAdi tg, ek, NOT NULL': () => has(exp('kisitAdi').signature, "'tg'", 'ek?: string') && has(S.invariants.join(' '), 'contype n') && test(/contype n dışlaması/),
  'F28 log gizliliği': () => has(S.invariants.join(' '), 'log_min_messages log', 'yer tutucularla', 'sql.raw') && test(/22P02/) && test(/600 ms/) && has(gtxt('D12-B05'), 'log_min_messages log'),
  'F29 zaman sütunu tipten': () => test(/Ada değil tipe bakar/) && test(/olusma_zamani/) && has(S.invariants[2], '_ani_alt'),
  'F30 B19, C03, B23 D01 ile hizalı': () => has(gtxt('D12-B19'), 'geri çekildi', 'D01-A15') && has(S.contradictions_resolved.find(c => c.id === 'D12-C03').resolution, 'D01-B33') && has(gtxt('D12-B23'), 'ogrenci_hesaplari', 'liste_satirlari') && not(gtxt('D12-B23'), 'kişi satırındaki'),
  'F31 hedefli ON CONFLICT': () => has(S.invariants.join(' '), 'ON CONFLICT her zaman hedef adlandırır') && has(gtxt('D12-B34'), 'ON CONFLICT (id) DO NOTHING') && test(/ON CONFLICT hedefli/) && !/ON CONFLICT ile/.test(all),
  'F32 5432 yayımı ve süper kullanıcı': () => not(html, '127.0.0.1:5432:5432') && has(html, 'compose.gelistirme.yaml') && test(/hiçbir kapı yayımlamaz/),
  'F33 zamanlayıcı saat dilimi ve adlar': () => ['gecelik_pg_dump', 'pgbackrest_tam_yedek', 'pgbackrest_fark_yedek', 'pgbackrest_dogrulama', 'geri_yukleme_denemesi'].every(n => has(job(n).schedule, 'Europe/Istanbul, Persistent=true') || has(job(n).schedule, 'Europe/Istanbul, Persistent=true)')) && has(job('gecelik_pg_dump').idempotency, 'tam UTC zaman damgası') && test(/systemd-analyze calendar/) && not(all, 'Dün geceki'),
  'F34 bölüm yolu': () => has(gtxt('D12-B14'), 'SECURITY DEFINER', 'DETACH PARTITION CONCURRENTLY işlem bloğunda', 'bolum_kaldirma', 'gonderim_defteri, PRIMARY KEY') && has(exp('saklamaIsleyicisiKaydet').signature, 'bolumluTablo') && not(gtxt('D12-B14'), '(ör. gonderim_defteri)'),
  'F35 B07 20 s gerekçesi': () => has(gtxt('D12-B07'), '20 s, D13-B26', '30 saniyelik') && not(all, '25 saniyelik istek süresinin altında'),
  'F36 25006 ayrımı': () => has(exp('islem').purpose, 'salt okunur işlemde 25006 dahil (programlama hatası)', 'pg_is_in_recovery()') && test(/500 API_SUNUCU_HATASI'na düşer/),
  'F37 eklenti öneksiz': () => has(exp('veritabaniEklentisi').purpose, 'öneksiz') && not(all, '/v1/veritabani önekiyle'),
  'F38 sıfırlama testi pg-boss API': () => test(/getQueues, getSchedules ve schemaVersion/) && not(all, 'pgboss şemasındaki satır sayısı değişmemiş'),
  'F39 değişmez testleri': () => test(/drizzle şemasında yalnız SELECT/) && test(/repo1-type s3 ya da sftp/) && test(/compose\.deneme\.yaml kümeleri archive_mode=off/),
  'F40 göç merdiveni işçi süresinden uzun': () => has(JSON.stringify(sm('goc_adimi')), '382 saniye', '5 dakikalık statement_timeout') && test(/toplamı 300 saniyeden uzun/),
  'F41 D13 göç klasörü sahipliği': () => has(html, '??????????????_<belirteç>_*') && S.requests.some(r => r.modul === 'contracts.json' && /_api_ > D13/.test(r.istek)),
  'F42 D14: pgboss yalnız USAGE': () => has(gtxt('D12-B02'), 'pgboss şemasında uygulama rollerine yalnız USAGE', 'REVOKE ALL') && test(/varsayılan yetki yok/),
  'F43 D14: değişmez geçici temizlik istisnası': () => has(S.invariants.join(' '), 'geçici veri temizlikleri', 'Temizlik ve saklama kararı'),
  'F44 D15: olcum_ görünümleri': () => has(html, "olcum_')} önekli görünüm") || (has(all, 'olcum_ önekli görünüm', 'pg_depend') && test(/olcum_ önekli görünüm açınca geçer/)),
};
let fail = 0;
for (const [k, fn] of Object.entries(F)) { let ok; try { ok = !!fn(); } catch (e) { ok = false; } if (!ok) fail++; console.log((ok ? 'OK   ' : 'FAIL ') + k); }
console.log(`${Object.keys(F).length - fail}/${Object.keys(F).length} OK`);
process.exitCode = fail ? 1 : 0;
