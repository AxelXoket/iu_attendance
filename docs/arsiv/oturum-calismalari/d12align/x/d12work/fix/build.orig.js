// Builds spec/D12.json and frag/D12.html from spec-data.js. Deterministic: same data, same bytes.
'use strict';
const fs = require('fs');
const path = require('path');
const D = require('./spec-data.js');

const B = path.resolve(__dirname, '..');
fs.mkdirSync(path.join(B, 'spec'), { recursive: true });
fs.mkdirSync(path.join(B, 'frag'), { recursive: true });

// ---------- spec JSON ----------
const spec = {
  id: 'D12',
  module: 'veritabani',
  summary: D.summary,
  tables: D.tables,
  endpoints: D.endpoints,
  jobs: D.jobs.map(j => ({ name: j.name, schedule: j.schedule, idempotency: j.idempotency, does: j.does })),
  state_machines: D.state_machines,
  invariants: D.invariants,
  exports: D.exportsList,
  files: D.files,
  tests: D.tests,
  resolved_gaps: D.resolved_gaps,
  contradictions_resolved: D.contradictions_resolved,
  open_points: D.open_points,
};
fs.writeFileSync(path.join(B, 'spec', 'D12.json'), JSON.stringify(spec, null, 2) + '\n', 'utf8');

// ---------- fragment ----------
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const code = s => `<code>${esc(s)}</code>`;
const link = (href, text) => `<a href="${href}">${esc(text)}</a>`;
const row = (k, v) => `    <div class="row"><div class="k">${esc(k)}</div><div>${v}</div></div>`;
const table = (head, rows) => [
  '    <div style="overflow-x:auto"><table>',
  '      <tr>' + head.map(h => `<th>${esc(h)}</th>`).join('') + '</tr>',
  ...rows.map(r => '      <tr>' + r.map(c => `<td>${c}</td>`).join('') + '</tr>'),
  '    </table></div>',
].join('\n');
const details = (summary, inner) => `  <details>\n    <summary>${esc(summary)}</summary>\n${inner}\n  </details>`;

const h = [];
h.push('<section id="veritabani">');
h.push(`  <h2>Veritabanı ve veri yaşam döngüsü <span class="tag mute">D12</span></h2>`);
h.push(`  <p>${esc(D.summary)}</p>`);

// Amaç ve sınırlar
h.push('  <h3>Amaç ve sınırlar</h3>');
h.push('  <div class="rows">');
h.push(row('Sahip olduğu', `Üç tablo (${code('__drizzle_migrations')}, ${code('geri_yukleme_kayitlari')}, ${code('saklama_islemleri')}), bir uç (${code('GET /v1/veritabani/yonetim/geri-yuklemeler')}), sekiz iş. PostgreSQL kabı ve imajı, ayar dosyaları, roller, şemalar, kurulum adımı, tek göç klasörünün kuralı ve CI denetimi, havuz ve ${code('islem')}, nesil, yedek, geri yükleme, saklama mekanizması, test veritabanı ve sıfırlama.`));
h.push(row('Sahip olmadığı', `Alan tabloları ve onların göç içeriği (her göç alt klasörü adındaki modülün); ${code('compose.yaml')}, ${code('apps/server/package.json')} ve ${code('/health/ready')} (D15); ${code('worker.ts')} ve pgboss şeması (D14); giriş oturumları ve hesap silme akışı (D01); saklama süresinin kendisi (İÜ'nün cevabı).`));
h.push(row('Konuşma yolu', `D12 hiçbir modülü içe aktarmaz (${code('reads_from')} boş). Modüller dış yüzünü çağırır ve saklama işleyicisini ona kaydeder; bağlantı ayarlarını ve saati bileşim kökleri verir. Uç rotası sözleşme dosyasından D13'ün rota tablosuna girer, eklentiyi ${code('app.ts')} kaydeder. Makine işlerinin sonucu D15'e durum dosyasıyla gider.`));
h.push(row('Dayandığı kararlar', [
  link('teknik.html#veritabani', 'Veritabanı'), link('teknik.html#veritabani-donem-alani', 'Dönem alanı ve bağlantı havuzu'),
  link('teknik.html#veritabani-yedek', 'Yedek'), link('teknik.html#sunucu-mimari', 'Veritabanı erişimi ve göç akışı'),
  link('teknik.html#kod-veri-modeli', 'Veri modeli ve nesil'), link('teknik.html#testler-veritabani-sifirlama', 'Veritabanı sıfırlama'),
  link('teknik.html#altyapi-imaj', 'İmaj ve göç servisi'), link('plan.html#kararlar-hesap-silme', 'Hesap silme'),
  link('plan.html#gun-kenar-durumlar', 'Yedekten dönüş'), link('plan.html#teknoloji-olceklenme-yolu', 'Ölçeklenme yolu'),
].join(', ') + '.'));
h.push('  </div>');
h.push(details(`Dış yüz: contracts'taki altı giriş, yedi ek giriş ve sözleşme dosyası`,
  table(['Ad', 'İmza', 'Amaç'], D.exportsList.map(e => [esc(e.name), code(e.signature), esc(e.purpose)]))));
h.push(details(`Dosyalar: ${D.files.length} dosya, hepsi D12'nin klasörlerinde`,
  '    <ul>\n' + D.files.map(f => `      <li>${code(f)}</li>`).join('\n') + '\n    </ul>'));

// Tablolar
h.push('  <h3>Tablolar</h3>');
h.push(`  <p>Üçü de alan tablosu değildir. Göç defteri drizzle şemasında, öbür ikisi uygulama şemasındadır; ikisi de ${code('@yalniz-ekleme')} işaretlidir ve hiç silinmez.</p>`);
for (const t of D.tables) {
  const inner = [
    `    <p>${esc(t.purpose)}</p>`,
    table(['Sütun', 'Tip', 'Boş olabilir', 'Varsayılan', 'Not'], t.columns.map(c => [code(c.name), code(c.type), c.null ? 'evet' : 'hayır', c.default ? code(c.default) : '', esc(c.note)])),
    '    <p>Dizinler:</p>',
    '    <ul>\n' + t.indexes.map(x => `      <li>${esc(x)}</li>`).join('\n') + '\n    </ul>',
    '    <p>Kısıtlar ve yetkiler:</p>',
    '    <ul>\n' + t.constraints.map(x => `      <li>${esc(x)}</li>`).join('\n') + '\n    </ul>',
  ].join('\n');
  const one = { '__drizzle_migrations': `__drizzle_migrations: Drizzle'ın göç defteri, D12 yalnız okur`, 'geri_yukleme_kayitlari': 'geri_yukleme_kayitlari: her gerçek dönüşün yöntemi, kayıp penceresi ve nesli', 'saklama_islemleri': 'saklama_islemleri: saklama süresi işinin silinmeyen kanıtı' }[t.name];
  h.push(details(one, inner));
}

// Uç noktalar
const e = D.endpoints[0];
h.push('  <h3>Uç noktalar</h3>');
h.push('  <div class="rows">');
h.push(row(`${e.method} ${e.path}`, `İstemci ${esc(e.client)}. ${esc(e.auth)}`));
h.push(row('İstek', Object.entries(e.request).map(([k, v]) => `${code(k)}: ${esc(v)}`).join('<br>')));
h.push(row('Tekrar ve sınır', `${esc(e.idempotency)} ${esc(e.rate_limit)}`));
h.push(row('Hatalar', e.errors.map(x => esc(x)).join('; ') + '.'));
h.push('  </div>');
h.push(details('Cevap: yeniden eskiye geri yüklemeler ve sonraki sayfanın imleci',
  table(['Alan', 'Tip'], Object.entries(e.response).map(([k, v]) => [code(k), esc(v)]))));

// İşler
h.push('  <h3>İşler</h3>');
h.push(`  <p>Saatler Europe/Istanbul. İki iş pg-boss'ta, işçide çalışır; altısı makine işidir: ana makinedeki systemd zamanlayıcısıyla, tek kilitte sırayla, API ve işçi düşmüşken de çalışır ve sonucunu ${code('/var/lib/iu-yoklama/durum/veritabani/<iş>.json')} dosyasına yazar (şema ${code('YedekIsDurumu')}, D15 okur ve uyarır). 03:00 ile 04:00 arası boş kalır (D14-B05), modüllerin temizlik işleri 04:00 ile 05:00 arasındadır.</p>`);
h.push(table(['İş', 'Nerede', 'Ne zaman'], D.jobs.map(j => [code(j.name), esc(j.yer), esc(j.zaman)])));
h.push(details('Her işin ne yaptığı, tekrar kuralı ve zamanlaması',
  table(['İş', 'Ne yapar', 'Tekrar', 'Zamanlama'], D.jobs.map(j => [code(j.name), esc(j.does), esc(j.idempotency), esc(j.schedule)]))));

// Durumlar ve kurallar
h.push('  <h3>Durumlar ve kurallar</h3>');
h.push('  <div class="rows">');
h.push(row('PostgreSQL kabı', `PostgreSQL 18.6, kendi imajı ${code('iu-attendance-postgres:18.6-pgbackrest2.59.3')} (${link('teknik.html#veritabani-yedek', 'Yedek')}). Servis tanımları D12'nin Compose parçasında: ${code('docker/postgres/compose.yaml')}; D15'in ${code('compose.yaml')} dosyası onu ${code('include')} ile bir kez alır, API, işçi, göç servisi ve xprem ${code('veritabani')} ağına katılır. Veri birimi ${code('/var/lib/postgresql')} yoluna bağlanır, adı ${code('IU_POSTGRES_BIRIMI')} değişkeninden gelir (döküm dönüşü yeni birim açar). initdb builtin C.UTF-8 (${link('teknik.html#veritabani-donem-alani', 'Zaman ve sıralama')}).`));
h.push(row('Şemalar ve roller', `Şemalar ${code('uygulama')}, ${code('drizzle')}, ${code('pgboss')}. Rolleri, veritabanlarını, eklentiyi ve varsayılan yetkileri kurulum adımı açar; parolalar Compose sırrıyla yalnız gereken servise (${link('teknik.html#sunucu-ayarlar', 'Ayarlar')}). Ayrıntı aşağıdaki tabloda.`));
h.push(row('Ad ve sütun kuralları', `Bağlayıcı ad kuralı; kısıt ve dizin adını yalnız ${code('kisitAdi')} verir. Kimlik ${code('uuid')} ve ${code('uuidv7()')}, an ${code('timestamptz(3)')}, gün ${code('date')}, saat ${code('time')}; durum metin ve adlı CHECK; etiket ayrı evet/hayır sütunu (${link('teknik.html#sunucu-mimari', 'Veritabanı erişimi')}, ${link('teknik.html#veritabani', 'Kısıtlar')}). Yaşam sütunları ${code('silinme_ani')}, ${code('pasif_ani')}, ${code('arsiv_ani')}; kısmi dizin koşulu IS NULL. Yorum işaretleri ${code('@yalniz-ekleme')}, ${code('@istemci-kimligi')}, ${code('@donem-bolunebilir')}, ${code('@dizinsiz-kabul')}; şema testi bunlara bakar, ortak liste yok.`));
h.push(row('Zaman', `Sunucu ve roller UTC; an milisaniye hassasiyetli ve değeri saat arayüzünden gelir, kural için SQL ${code('now()')} yok; gün ve saat metin okunur; İstanbul gün sınırı SQL'de açık ${code("AT TIME ZONE 'Europe/Istanbul'")} ile; Türkçe sıralama yalnız sorguda ve dizinsiz (${link('teknik.html#testler-veritabani-sifirlama', 'Saat ve sahteler')}).`));
h.push(row('İşlem ve hata', `Her sorgu ${code('islem')} içinden geçer; READ COMMITTED; sayaç kurallarında ${code('danismaKilidi')} (sıralı anahtar); kilitlenmede tek yeniden deneme; dış yüz tx alır (${link('teknik.html#sunucu-mimari', 'Mimari')}). Havuz beklemesi 2 saniye, sonra 503. İşlemden çıkan hata yalnız SQLSTATE, kısıt ve tablo taşır; PostgreSQL logu terse ve parametresizdir (${link('teknik.html#sunucu-ayarlar', 'Loglar')}).`));
h.push(row('Göç akışı', `Tek klasör ${code('apps/server/migrations/')}; her göç ${code('<UTC zaman>_<modül>_<açıklama>/')} altında ${code('migration.sql')}, ${code('snapshot.json')} ve gerekirse ${code('oncesi-concurrently.sql')}. ${code('db:migrate')}: önce D12'nin ${code('veritabani:goc')} adımı (kurulum, CONCURRENTLY dizinler, Drizzle göçleri), sonra D14'ün pg-boss migrate ve kuyruk adımı; göç servisi, geliştirme ve test koordinatörü aynı betiği çalıştırır (${link('teknik.html#altyapi-imaj', 'İmaj ve kapanış')}). CI denetimi ${code('veritabani:goc-denetimi')}: ad ve modül, zaman sırası, yeniden üretme farkı, Squawk, katalog farkıyla sahiplik (tablonun sahibi tanımlandığı ${code('tablolar.ts')} klasöründen, işlevin sahibi ad önekinden okunur), deyim düzeyinde satır yazma yakalama, zaman aşımı ayarı; ayrıca ${code('surum-denetimi.sh')}. CONCURRENTLY adımı ${code('db:migrate')} içindedir, yayın betiği ayrıca çağırmaz.`));
h.push(row('Nesil', `${code('nesilOku')}: ${code('system_identifier')} ve ${code('timeline_id')}; zaman çizelgesi WAL dosya adıyla çapraz denetlenir (${link('teknik.html#kod-veri-modeli', 'Veri modeli')}, ${link('plan.html#kararlar-indirme', 'İndirme')}). Geri yüklemede nesil değişmeden trafik açılmaz.`));
h.push(row('Saklama', `Kayıt deseni: modül ${code('saklamaIsleyicisiKaydet')} ile kaydolur, satırı kendi kodu siler ya da anonimleştirir, D12 kanıtı aynı işlemde yazar. Süreler ${code('saklama/sureler.ts')}'te ve bugün boş: hiçbir şey silinmez (${link('plan.html#acik-saklama-suresi', 'Saklama süresi')}, ${link('plan.html#kararlar-hesap-silme', 'Hesap silme')}).`));
h.push(row('Yedek', `pgBackRest ile PITR, restic ile gecelik döküm ve xprem birimi; depolar sunucu dışında, yurt içinde, şifreli (${link('teknik.html#veritabani-yedek', 'Yedek')}, ${link('plan.html#teknoloji-sunucu-yeri', 'Sunucu yeri')}); parolalar çevrimdışı yedeklenir (${link('teknik.html#dagitim-ayrinti-korunacak-anahtarlar', 'Korunacak anahtarlar')}, ${link('teknik.html#dagitim-ayrinti-guncelleme-sunucusu', 'xprem birimi')}). Compose dosya sırlarında uid ve mode yok sayıldığından sır dosyaları makinede 0400 izinli durur, pgBackRest sırrı kap içindeki postgres kullanıcısına (uid 999) aittir.`));
h.push(row('Geri yükleme', `Yalnız işletmecinin SSH ile başlattığı ${code('docker/postgres/yedek/geri-yukle.sh')}; adımlar aşağıdaki durum makinesinde, kılavuz ${code('docker/postgres/geri-yukleme-kilavuzu.md')}. Telefonlar kuyruklarını yeniden gönderir, program ve listeler baştan iner (${link('plan.html#gun-kenar-durumlar', 'Kenar durumlar')}).`));
h.push(row('Test veritabanı', `${code('postgres-test')}: aynı imaj, tmpfs; fsync, synchronous_commit, full_page_writes ve archive_mode kapalı; ${code('127.0.0.1:5433')} (${link('teknik.html#testler-veritabani-sifirlama', 'Veritabanı sıfırlama')}). Koordinatörde ${code('testVeritabaniHazirla')}, her senaryodan önce ${code('senaryoOncesiSifirla')}; geliştirme ve CI sırlarını ${code('gelistirme-gizli-uret.sh')} üretir.`));
h.push('  </div>');

h.push(details('Roller ve yetkiler: dört giriş rolü, bir geçiş rolü, süper kullanıcı', table(['Rol', 'Giriş', 'Kim kullanır', 'Yetki ve ayar'], [
  [code('postgres'), 'yerel soket (peer); ağdan scram-sha-256, parolası yalnız göç servisinde', 'kurulum adımı, pgBackRest, gece dökümü, geri yükleme betiği', 'süper kullanıcı'],
  [code('yoklama_sahip'), 'ağ, scram-sha-256', 'göç servisi, test sıfırlaması, veri kurucular, cli/geri-yukleme', 'bütün nesnelerin sahibi; DDL; SECURITY DEFINER işlevlerin sahibi'],
  [code('yoklama_api'), 'ağ, scram-sha-256', 'API kopyaları, yonetici-ekle', 'uygulama: SELECT, INSERT, UPDATE, DELETE (yalnız ekleme tablolarında UPDATE ve DELETE yok); drizzle: SELECT; pgboss: veri; nesil işlevleri EXECUTE; statement_timeout 5 s, lock_timeout 2 s, boşta işlem 30 s'],
  [code('yoklama_isci'), 'ağ, scram-sha-256', 'işçi', 'API ile aynı; ayrıca pg_monitor ve yoklama_saklama üyeliği (INHERIT FALSE, SET TRUE); statement_timeout 5 dk, lock_timeout 30 s, boşta işlem 5 dk'],
  [code('yoklama_saklama'), 'giriş yok', 'yalnız saklama_suresi_isi, işlem içinde SET LOCAL ROLE', 'uygulama: SELECT, UPDATE, DELETE; saklama_islemleri: INSERT'],
  [code('xprem'), 'ağ, scram-sha-256', 'xprem', 'yalnız xprem veritabanının sahibi'],
])));
h.push(details('Bağlantı bütçesi: 63 bağlantı, sınır 80, max_connections 100', table(['Bileşen', 'Bağlantı'], [
  ['API kopyası, 2 kopya ve kopya başına 20', '40'], ['İşçi', '5'], ['xprem', '10'], ['Göç servisi', '2'], ['pgBackRest', '2'], ['Gece dökümü', '1'], ['Süper kullanıcıya ayrılan', '3'], ['Toplam (üçüncü API kopyasına yer var)', '63'],
])));
const yaml = `# docker/postgres/compose.yaml (D12). D15'in compose.yaml dosyası: include: [docker/postgres/compose.yaml]
services:
  postgres:                    # profilsiz
    build: .
    image: iu-attendance-postgres:18.6-pgbackrest2.59.3
    command: [postgres, -c, config_file=/etc/postgresql/postgresql.conf]
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/postgres_parolasi
      POSTGRES_INITDB_ARGS: --locale-provider=builtin --builtin-locale=C.UTF-8 --locale=C.UTF-8 --encoding=UTF8
    volumes:
      - veri:/var/lib/postgresql
      - ./postgresql.conf:/etc/postgresql/postgresql.conf:ro
      - ./pg_hba.conf:/etc/postgresql/pg_hba.conf:ro
      - ./pgbackrest.conf:/etc/pgbackrest/pgbackrest.conf:ro
    secrets:
      - postgres_parolasi
      - { source: pgbackrest_gizli, target: /etc/pgbackrest/conf.d/gizli.conf }
    shm_size: 256mb
    ports: ["127.0.0.1:5432:5432"]
    healthcheck: { test: [CMD, pg_isready, -h, /var/run/postgresql], interval: 5s, retries: 12 }
    restart: unless-stopped
    networks: [veritabani]
  postgres-test:
    profiles: [test]
    build: .
    image: iu-attendance-postgres:18.6-pgbackrest2.59.3
    command: [postgres, -c, config_file=/etc/postgresql/postgresql.conf, -c, fsync=off,
              -c, synchronous_commit=off, -c, full_page_writes=off, -c, archive_mode=off,
              -c, shared_buffers=512MB, -c, logging_collector=on]
    volumes: [{ type: tmpfs, target: /var/lib/postgresql, tmpfs: { size: 2147483648 } }]
    ports: ["127.0.0.1:5433:5432"]
  yedek:                       # tek seferlik: docker compose --profile yedek run --rm yedek ...
    profiles: [yedek]
    image: restic/restic:0.19.1
    secrets: [restic_gizli]
volumes:
  veri: { name: "\${IU_POSTGRES_BIRIMI:-iu-yoklama-postgres-veri}" }
networks:
  veritabani: { ipam: { config: [{ subnet: 172.30.12.0/24 }] } }
secrets:                       # dosyalar \${IU_GIZLI_DIZIN} altında: postgres, yoklama_sahip, yoklama_api,
                               # yoklama_isci, xprem parolaları; pgbackrest_gizli; restic_gizli`;
h.push(details('Compose parçasının iskeleti: postgres, postgres-test ve yedek servisleri', `    <pre><code>${esc(yaml)}</code></pre>`));

h.push(details(`Durum makineleri: göç adımı, saklama sınıfı, geri yükleme, hazırlık, yedek işi`,
  D.state_machines.map(m => [
    `    <p><strong>${esc(m.name)}</strong>. Durumlar: ${m.states.map(code).join(', ')}.</p>`,
    table(['Nereden', 'Nereye', 'Kim', 'Ne zaman'], m.transitions.map(t => [code(t.from), code(t.to), esc(t.by), esc(t.when)])),
  ].join('\n')).join('\n')));
h.push(details(`Değişmezler: ${D.invariants.length} kural, her biri bir testle korunur`,
  '    <ol>\n' + D.invariants.map(x => `      <li>${esc(x)}</li>`).join('\n') + '\n    </ol>'));

// Hata kodları
h.push('  <h3>Hata kodları</h3>');
h.push(`  <p>Kodlar ${code('packages/contracts/src/veritabani.ts')} içinde, ${code('VERITABANI_')} önekli; D13'ün kataloğu birleştirir. 503'lerde Retry-After ve hata zarfı D13'ündür. İşletim kodları HTTP'ye çıkmaz, çıkış kodu, log ve durum dosyasında görünür.</p>`);
h.push(details(`${D.errorCodes.length} satır: ${D.errorCodes.filter(r => /^VERITABANI_/.test(r[0]) && /^[0-9]/.test(r[1])).length} kod istemciye görünür, beklenmeyen hata D13'ün 500'üne düşer, kalanı işletim, CI ve test kodu`,
  table(['Kod', 'HTTP ya da yer', 'Ne zaman'], D.errorCodes.map(([k, s, w]) => [code(k), esc(s), esc(w)]))));

// Testler
h.push('  <h3>Testler</h3>');
h.push(`  <p>Davranış senaryoları ${code('apps/server/test/features/veritabani/')} altında gerçek ${code('postgres-test')} veritabanında koşar; saf kurallar (kisitAdi, nesil kararı, saklama sırası, göç denetimi ayrıştırıcısı) Vitest ve fast-check ile. Yokluk iddia eden her test bir yer kontrolüyle önce varlığı gösterir.</p>`);
h.push(details(`${D.tests.length} test: şema, yetki, göç, işlem, nesil, saklama, uç, sıfırlama, yedek, yük ve mutasyon`,
  table(['Test', 'Tür', 'Ne denetler'], D.tests.map(t => [esc(t.name), code(t.kind), esc(t.asserts)]))));

// Netleştirilenler
h.push('  <h3>Netleştirilenler</h3>');
h.push(`  <p>Envanterdeki ${D.resolved_gaps.length} boşluğun ve ${D.contradictions_resolved.length} çelişkinin her biri ya bir kararla ya da bir açık noktayla kapandı; ürün kararı gerektirenler aşağıdaki açık noktalara bağlıdır.</p>`);
h.push(details(`Boşluklar: D12-B01 ile D12-B35 arası, karar ve gerekçe`,
  table(['Boşluk', 'Karar', 'Neden'], D.resolved_gaps.map(g => [code(g.gap), esc(g.decision), esc(g.why)]))));
h.push(details(`Çelişkiler: D12-C01 ile D12-C05 arası, nasıl çözüldü`,
  table(['Çelişki', 'Çözüm'], D.contradictions_resolved.map(c => [code(c.id), esc(c.resolution)]))));

// Açık noktalar
h.push('  <h3>Açık noktalar</h3>');
h.push('  <div class="callout warn">');
h.push('    <ul>');
for (const o of D.open_points) h.push(`      <li><strong>${esc(o.id)}</strong> <span class="tag ${o.needs_owner ? 'warn' : 'mute'}">${o.needs_owner ? 'sahip' : 'modüller'}</span> ${esc(o.question)} Öneri: ${esc(o.recommendation)}</li>`);
h.push('    </ul>');
h.push('  </div>');
h.push('</section>');

fs.writeFileSync(path.join(B, 'frag', 'D12.html'), h.join('\n') + '\n', 'utf8');
console.log('wrote spec/D12.json and frag/D12.html');
