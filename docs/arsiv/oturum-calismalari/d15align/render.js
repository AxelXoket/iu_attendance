// Builds spec/D15.json and frag/D15.html from data1..data5. Deterministic: same data, same bytes.
'use strict';
const fs = require('fs');
const path = require('path');

const BASE = process.env.D15_OUT || 'C:/Users/USER/AppData/Local/Temp/claude/C--Users-USER-Desktop-iu-attendance/7abdd45e-faba-44fe-954e-90155d6bca30/scratchpad/r17/backend';
const REPO = 'C:/Users/USER/Desktop/iu_attendance/';
const SPEC_PATH = process.env.D15_SPEC || path.join(BASE, 'spec', 'D15.json');
const spec = JSON.parse(fs.readFileSync(SPEC_PATH, 'utf8'));

// ---------- HTML helpers ----------
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const DOCS = {};
for (const d of ['plan', 'teknik', 'tasarim']) DOCS[d] = fs.readFileSync(REPO + d + '.html', 'utf8');
const ELLE = { 'tasarim#tipografi': 'Tipografi', 'plan#acik-asama1': 'Açık noktalar, Aşama 1' };
const ONEK = { plan: 'plan', teknik: 'teknik', tasarim: 'tasarım' };
function baslik(d, id) {
  if (ELLE[d + '#' + id]) return ELLE[d + '#' + id];
  const s = DOCS[d];
  const i = s.indexOf('id="' + id + '"');
  if (i < 0) return id;
  const rest = s.slice(i);
  const parca = rest.slice(rest.indexOf('>') + 1, rest.indexOf('>') + 800).replace(/<[^>]+>/g, '|').split('|').map((x) => x.trim()).filter(Boolean)[0] || id;
  const temiz = parca.split(':')[0].replace(/\s*\([^)]*\)\s*$/, '').replace(/[.]$/, '').trim();
  return d === 'plan' && id.startsWith('acik-') ? 'Açık noktalar, ' + temiz : temiz;
}
const linkify = (html) => html.replace(/\b(plan|teknik|tasarim)\.html#([a-z0-9-]+)/g, (m, d, a) => `<a href="${d}.html#${a}">${ONEK[d]}, ${esc(baslik(d, a))}</a>`);
const T = (s) => linkify(esc(s)); // text
const C = (s) => `<code>${esc(s)}</code>`; // code
const table = (head, rows) =>
  `<div class="tablo"><table>\n<tr>${head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr>\n` +
  rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('\n') + '\n</table></div>';
const details = (summary, body) => `<details>\n<summary>${esc(summary)}</summary>\n${body}\n</details>`;
const ul = (items) => `<ul>\n${items.map((i) => `<li>${i}</li>`).join('\n')}\n</ul>`;
const row = (k, v) => `<div class="row"><div class="k">${esc(k)}</div><div>${v}</div></div>`;

const out = [];
out.push('<section id="isletim">');
out.push('<h2>İşletim, güvenlik ve test <span class="tag">D15</span> <span class="tag mute">isletim</span></h2>');
out.push(`<p class="lead">${T(spec.summary)}</p>`);

// ---------- Amaç ve sınırlar ----------
out.push('<h3>Amaç ve sınırlar</h3>');
out.push('<div class="rows">');
out.push(row('Yapar', T("Ortam ayarlarının ve gizli anahtar dosyalarının doğrulanması (teknik.html#sunucu-ayarlar); pino kaydedicisi ve log gizliliği; sağlık ve durum uçları; telefon sayaçları ve hoca ekran süreleri; uyarı defteri, bildirim ve dış kalp atışı; makinedeki saat eşitleme, makine denetimi ve log arşivi; Compose, Caddy, imaj, yayın ve geri dönüş adımları (teknik.html#altyapi); CI kalite kapıları, gece güvenlik denetimi, haftalık iş, Dependabot (teknik.html#altyapi-imaj, teknik.html#altyapi-guncellemeler); yük testi (teknik.html#testler-kalite); ortak test dünyası ve kancaları (teknik.html#testler); Hedefler'in ölçümü (plan.html#kararlar-olcum, plan.html#hedefler); tehdit modeli ve olay müdahalesi.")));
out.push(row('Yapmaz', T("Göç klasörü, yedek, geri yükleme, saklama işi ve veritabanı rolleri (D12); rota kaydı, hata zarfı, hız sınıfları, under-pressure kurulumu, helmet ve istek log satırı (D13); iş kuyruğu altyapısı ve e-posta gönderimi (D14); saat belgesi kuralı ve eşitleme kesintisi (D04); gönderim ucu, sıra ve boşluk raporu (D06); haksız devamsız ve dönem sonu raporu (D10); telefon ve panel kodu (harita dışı). Gizlilik politikasının metni sahibin kararıdır (plan.html#acik-gizlilik-politikasi); D15 yalnız sunar.")));
out.push(row('Ölçülen sonuç', T("Kesinti sahibe SMTP düşükken de şu sürelerde ulaşır (dış hizmetin kendi gecikmesi hariç; hizmetin ayarı bu sayılarla denetlenir): API, Caddy, alan adı ya da sertifika kesintisi en geç 10 dakika (dış denetim 5 dakikada bir, art arda 2 başarısızlık); işçi, PostgreSQL ya da dışarı çıkış kesintisi en geç 25 dakika (kalp atışı susar, hizmet son kalp atışından 25 dakika sonra bildirir); SMTP düşükken açılan uyarı en geç 15 dakika (uyarı denetimi 10 dakikada bir, kalp atışı 5 dakika sonra sorun adresine); izlemenin kendisi kırılırsa (isletim_denetimi başarısız) son başarılı denetimden en geç 35 dakika. Hedefler tablosu her pazartesi e-postayla gelir (plan.html#hedefler). Yük testi geçme ölçütleri her tetikte otomatik verilir. Kırmızı kalite kapısı birleştirmeyi, kırmızı haftalık iş yayını durdurur. İz: isletim.denetim log satırı, isletim_uyarilari defteri, CI koşu sonuçları, yük testi raporu, /var/log/iu-yoklama/yayinlar.log.")));
out.push(row('Kod yeri', [
  C('apps/server/src/infra/ayarlar/'), C('apps/server/src/infra/izleme/'), C('apps/server/src/jobs/isletim/'), C('apps/server/src/server.ts'),
  C('apps/server/src/cli/anahtar-uret.ts'), C('apps/server/src/cli/olay.ts'), C('apps/server/src/cli/olcum-raporu.ts'), C('packages/contracts/src/isletim.ts'),
  C('apps/server/test/support/dunya.ts'), C('apps/server/test/support/kancalar.ts'), C('apps/server/test/yuk/'),
  C('compose.yaml'), C('compose.gelistirme.yaml'), C('docker/isletim/'), C('docker/caddy/Caddyfile'), C('docker/xprem/'), C('.github/workflows/ (kalite, guvenlik, haftalik, yayin-sunucu, yayin-ota, yayin-telefon)'), C('.github/dependabot.yml'), C('.node-version'), C('.gitignore'),
].join(', ') + T(". Ana makine betikleri ve systemd birimleri docker/isletim/ altındadır, uygulama koduna girmez (I080). Göçler apps/server/migrations/<14 haneli UTC>_isletim_<açıklama>/ klasörlerindedir (dosya haritasında apps/server/migrations/??????????????_isletim_* globu; klasör kuralı ve CI göç denetimi D12'nin): yalnız üç tabloya ve olcum_ görünümlerine dokunur, olcum_ görünümleri başka tabloları okuyabilir (denetimin tek istisnası). Göç dosyaları dosya listesine değil iş paketine yazılır (A1, I083).")));
out.push(row('Bağımlılık yönü', T("infra/izleme, infra/ayarlar ve jobs/isletim hiçbir alan modülünü ve öbür kesen modülleri içe aktarmaz: D06, D12, D13 ve D14 işlevleri bileşim köklerinden (app.ts, server.ts, worker.ts) parametreyle gelir; tipler import type ile ya da packages/contracts'tan. D15'in dosyalarından D01, D02, D03, D04 ve D07'yi yalnız server.ts ve cli/ girişleri (anahtar-uret, olay, olcum-raporu) ile test desteği çağırır; app.ts (D13) eklentiye seçenek verir (yaprak kuralı, A2). Kimlik olaylarına D15 kendisi kaydolmaz: kimlikOlayiDinleyicisi D01.kimlikDinleyicileriniKur'un isletim abonesidir, kurulumu bileşim kökleri yapar (I050). Hiçbir modül D15'in iç dosyasını almaz; alan modülleri yalnız infra/ayarlar ve infra/izleme index.ts'ini kullanır (D01, D04, D07, D11).")));
out.push(row('Okuduğu dış yüzler', ul(spec.dis_yuz_kullanimi.map(T))));
out.push(row('Kaydoldukları', ul(spec.registrations.map(T))));
out.push(row('Verdiği dış yüz', spec.exports.map((e) => C(e.name)).join(', ')));
out.push(row('Harita dışı istekler', ul(spec.harita_disi_istekler.map((h) => `${esc(h.istemci)}: ${T(h.istek)} Sözleşme: ${T(h.sozlesme)}. Karar: ${esc(h.sonuc)}.`))));
out.push(row('Paylaşılan tek dosyalar', T("Kök package.json, pnpm-workspace.yaml (katalog dahil), pnpm-lock.yaml, biome.json, tsconfig.base.json, .node-version, .gitignore, apps/server/package.json, tsconfig ve cucumber ayarı, Dockerfile, packages/core paket ayarları, compose.yaml, compose.gelistirme.yaml, Caddyfile, .github iş akışları (sözleşme iş akışı D13'ün) ve .env.example D15'indir: yeni paket, Biome kuralı ya da Compose ayarı isteği D15'e gelir (contracts.json, Paylaşılan tek dosyalar).")));
out.push('</div>');

// ---------- Tablolar ----------
out.push('<h3>Tablolar</h3>');
for (const t of spec.tables) {
  out.push(`<p>${C(t.name)}: ${T(t.purpose)}</p>`);
  const rows = t.columns.map((c) => [C(c.name), esc(c.type), c.null ? 'evet' : 'hayır', c.default ? C(c.default) : '', T(c.note)]);
  const body =
    table(['Sütun', 'Tip', 'Boş olabilir', 'Varsayılan', 'Not'], rows) +
    '\n<p>Dizinler:</p>\n' + ul(t.indexes.map(T)) + '\n<p>Kısıtlar:</p>\n' + ul(t.constraints.map(T));
  out.push(details(`${t.name}: ${t.columns.length} sütun, ${t.indexes.length} dizin, ${t.constraints.length} kısıt`, body));
}
out.push(`<p>${T("olcum_ önekli görünümler D15'indir ve başka tabloları yalnız okur (contracts.json istisnası); security_invoker true, now() kullanmaz, çıktıda kişi kimliği, numara, isim yoktur. Deneme dersinin (dersler.deneme_dersi) oturumları ve kayıtları ile inceleme hesaplarının (kisiler.inceleme_hesabi) sayaçları ve ekran süreleri hiçbir görünüme girmez (plan.html#kararlar-inceleme-hesaplari). Bir modül bu görünümlerin okuduğu bir sütunu kaldıracaksa ya da adını değiştirecekse önce D15 görünümü günceller (önce genişlet, sonra daralt). Görünüm göçleri D15'in <14 haneli UTC>_isletim_<açıklama> klasörlerindedir (A1, I083).")}</p>`);
out.push(details(`olcum_ görünümleri: ${spec.olcum_gorunumleri.length} görünüm, Hedefler'in her satırı tek sorgu`,
  table(['Görünüm', 'Okur', 'Sütunlar', 'Kural'], spec.olcum_gorunumleri.map((v) => [C(v.ad), T(v.okur), T(v.sutunlar), T(v.kural)]))));
out.push(details(`Komşu sütunlar: görünümlerin son adlarıyla okuduğu ${spec.olcum_komsu_sutunlari.length} modülün sütunları, sahipleri adları korur`,
  table(['Modül', 'Tablo', 'Sütunlar', 'Okuyan görünümler', 'Karar'], spec.olcum_komsu_sutunlari.map((k) => [esc(k.modul), C(k.tablo), T(k.sutunlar), T(k.gorunumler), esc(k.karar)]))));

// ---------- Uç noktalar ----------
out.push('<h3>Uç noktalar</h3>');
out.push(`<p>${T("Dört uç; ikisi /v1 dışında ve yalnız iç ağda, /v1/durum modülsüz kök uç (contracts.json, Uç yolu öneki). Rota tanımları packages/contracts/src/isletim.ts'te rotaTanimla ile; kayıt D13'ün rotalariKaydet'iyle. Cevaplara Cache-Control: no-store ve X-Istek-Kimligi D13 ekler.")}</p>`);
for (const e of spec.endpoints) {
  const req = Object.entries(e.request).map(([k, v]) => [C(k), T(v)]);
  const res = Object.entries(e.response).map(([k, v]) => [C(k), T(v)]);
  const body = '<div class="rows">\n' + [
    row('İstemci', esc(e.client)),
    row('Kimlik', T(e.auth)),
    row('İstek', table(['Alan', 'Tip ve kural'], req)),
    row('Cevap', table(['Alan', 'Tip'], res)),
    row('Hatalar', ul(e.errors.map(T))),
    row('Tekrar', T(e.idempotency)),
    row('Hız sınırı', T(e.rate_limit)),
  ].join('\n') + '\n</div>';
  const ozet = {
    '/health/live': 'iç ağdan canlılık: veritabanısız 204, kapanışta 503, aşırı yük dışında',
    '/health/ready': 'iç ağdan hazırlık: D12.semaDurumu 2 saniyede hazırsa 204, değilse nedenli 503',
    '/v1/durum': 'herkese açık dış denetim: gövdesiz 204, veritabanısız, aşırı yük dışında',
    '/v1/isletim/ekran-sureleri': 'panelin oturum ve ekran başına günlük ekran süresi toplamı, en büyük değer kalır',
  }[e.path];
  out.push(details(`${e.method} ${e.path}: ${ozet}`, body));
}
const q = spec.queue_items[0];
out.push(details(`Kuyruk öğesi ${q.tur}: ortak gönderim ucundan, iki rol, oturumsuz, en çok 48 KiB`,
  '<div class="rows">\n' + [
    row('Geliş', T(q.gelis)),
    row('Kimlik', T(q.kimlik)),
    row('Gövde', table(['Alan', 'Tip ve kural'], Object.entries(q.govde).map(([k, v]) => [C(k), T(v)]))),
    row('Sonuçlar', T(q.sonuclar)),
    row('Kilit', T(q.kilit)),
    row('Sınır', T(q.sinir)),
  ].join('\n') + '\n</div>'));
out.push(details('Caddy yolları: panel, API, güncelleme ve durağan sayfalar tek adda; sağlık uçları dışarıya kapalı',
  table(['Yol', 'Hedef', 'Not'], spec.caddy_yollari.map((c) => [C(c.yol), C(c.hedef), T(c.not)])) +
  '\n<pre><code>' + esc([
    '{',
    '  email {$ACME_EPOSTA}',
    '  acme_ca {$ACME_CA}',
    '  servers {',
    '    trusted_proxies static {$GUVENILEN_AG_GECIDI:127.0.0.1/32}',
    '    client_ip_headers {$ISTEMCI_ADRES_BASLIGI:X-Forwarded-For}',
    '    timeouts { read_header 10s read_body 30s idle 2m }',
    '  }',
    '}',
    '{$ALAN_ADI} {',
    '  encode zstd gzip',
    '  # xprem yolları ilk kurulumda xprem belgesinden yazılır; joker /guncelleme/* hiçbir zaman iletilmez',
    '  @xprem_protokol path /guncelleme/<protokol yolları>      # Expo Updates manifest ve varlık yolları',
    '  @xprem_yayin path /guncelleme/<yayın API yolları>        # eoas yükleme yolları',
    '  @genel_govde not path /guncelleme/<yayın API yolları>',
    '  request_body @genel_govde { max_size 4MB }   # iç içe iki sınırda küçüğü geçerli olacağından yayın yolu hariç',
    '  header -Server',
    '  handle /health/* { respond 404 }',
    '  @api path /v1 /v1/*',
    '  handle @api {',
    '    reverse_proxy api-1:3000 api-2:3000 {',
    '      lb_policy header X-Kurulum-Kimligi { fallback client_ip_hash }   # başlık yoksa istemci adresi (I069)',
    '      lb_try_duration 5s',
    '      health_uri /health/live',
    '      health_interval 2s',
    '      health_timeout 1s',
    '      health_fails 2',
    '      health_passes 2',
    '      transport http { dial_timeout 2s response_header_timeout 25s keepalive 60s }   # boşta bağlantı 60 sn: API keepAliveTimeout 72 sn, ondan kısa',
    '    }',
    '  }',
    '  handle /guncelleme/* {   # iç içe: içteki handle blokları yazıldığı sırayla, eşleyicisiz olan en sonda',
    '    handle @xprem_protokol { uri strip_prefix /guncelleme; reverse_proxy xprem:{$XPREM_PORT} }',
    '    handle @xprem_yayin { request_body { max_size 64MB }; uri strip_prefix /guncelleme; reverse_proxy xprem:{$XPREM_PORT} }',
    '    handle { respond 404 }   # yönetim paneli yolu dahil kalan her güncelleme yolu',
    '  }',
    '  handle /gizlilik { root * /srv/sayfalar; rewrite * /gizlilik.html; file_server }',
    '  handle /hesap-silme { root * /srv/sayfalar; rewrite * /hesap-silme.html; file_server }',
    '  handle /assets/* { root * /srv/panel; header Cache-Control "public, max-age=31536000, immutable"; file_server }',
    '  handle {',
    '    root * /srv/panel',
    '    import panel_basliklari   # CSP, Permissions-Policy, Referrer-Policy, nosniff, HSTS, Cache-Control no-cache',
    '    try_files {path} /index.html',
    '    file_server',
    '  }',
    '}',
  ].join('\n')) + '</code></pre>'));

// ---------- İşler ----------
out.push('<h3>İşler</h3>');
out.push(`<p>${T("On dört iş: dördü pg-boss'ta işçide (D14 çizelge kurallarına uyar: tz Europe/Istanbul, 03:00-05:00 arası günlük iş yok), üçü ana makinede systemd zamanlayıcısıyla, beşi GitHub'da (dört iş akışı ve Dependabot), biri dış izleme hizmetinde, biri elle. Her iş aynı girdiyle iki kez çalışınca aynı sonucu verir; pg-boss işlerinin iş verisi boştur.")}</p>`);
out.push(details('14 işin zamanlaması, tekrar güvenliği ve yaptığı',
  table(['İş', 'Zamanlama', 'Tekrar güvenliği', 'Yaptığı'], spec.jobs.map((j) => [C(j.name), T(j.schedule), T(j.idempotency), T(j.does)]))));

// ---------- Durumlar ve kurallar ----------
out.push('<h3>Durumlar ve kurallar</h3>');
for (const sm of spec.state_machines) {
  const body = `<p>Durumlar: ${sm.states.map(C).join(', ')}.</p>\n` +
    table(['Nereden', 'Nereye', 'Kim', 'Ne zaman'], sm.transitions.map((tr) => [C(tr.from), C(tr.to), T(tr.by), T(tr.when)]));
  out.push(details(`${sm.name}: ${sm.states.length} durum, ${sm.transitions.length} geçiş`, body));
}
out.push('<p>Değişmezler:</p>');
out.push(ul(spec.invariants.map(T)));
const envSay = spec.ayar_semasi.filter((x) => !x.env.startsWith('(')).length;
out.push(details(`Ayar şeması: ${envSay} ortam değişkeni ve ${spec.ayar_semasi.length - envSay} türetilen ya da isteğe bağlı alan, açılışta Zod ile, eksikte süreç açılmaz`,
  `<p>${T("Değerler ortamdan (geliştirmede Node --env-file ile .env, teknik.html#sunucu-ayarlar), sırlar GIZLI_DIZIN'den gelir. Eşikler ve listeler ortam değişkeni değildir, packages/contracts/src/isletim.ts'te koddadır. Ayarlar.projeksiyon isteğe bağlı bölümdür ve ortamdan okunmaz: D11 sözleşmesindeki varsayılanlarla projeksiyonAyarSemasi.parse({}) sonucudur (I052); ASAMA2_QR_ACIK D02 ile D11'in ortak tek bayrağıdır. (türetilir) satırları ortam değişkeni değildir, ayarlardan ve sırdan kurulur. Başka modül yeni ayar isterse D15'e ister; şema tek dosyadır, tek sahibi vardır.")}</p>\n` +
  table(['Ortam değişkeni', 'Alan', 'Tip ve kural', 'Varsayılan', 'Süreçler', 'İsteyen'],
    spec.ayar_semasi.map((a) => [C(a.env), C(a.alan), T(a.kural), T(a.varsayilan), T(a.surecler), esc(a.isteyen)]))));
out.push(details(`Sırlar matrisi: ${spec.sirlar.length} satır, her sır yalnız gereken servise (Compose sırrı)`,
  table(['Sır', 'Tür', 'Servisler', 'Kullanan'], spec.sirlar.map((s) => [C(s.ad), T(s.tur), T(s.servisler), T(s.kullanan)]))));
out.push(details(`Uyarı türleri ve kuralları: ${spec.uyari_kurallari.length} satır, eşikler ISLETIM_ESIKLERI'nde, her türün değerlendiren işi ve girdisi yazılı`,
  `<p>${T("KOSUL kapanışı yalnız Değerlendiren sütunundaki iş, o çalışmada Girdi sütunundaki girdiyi başarıyla okuyup koşulu yanlış bulunca uygulanır (yedek ve API ölçüsünde anahtarın kendi dosyası). Girdisi okunamayan uyarı ne kapanır ne yenilenir; okunamayan durum dosyası kendi türünde, okunamayan veritabanı girdisi ya da Caddy bağlantısı isletim.denetim_girdisi olarak uyarı açar. Böylece okunamayan dosya hiçbir zaman sağlıklı sayılmaz ve bir girdinin hatası öbür kuralları durdurmaz.")}</p>
` +
  table(['Tür', 'Anahtar', 'Seviye', 'Kapanma', 'Koşul', 'Değerlendiren', 'Girdi'],
    spec.uyari_kurallari.map((u) => [C(u.tur), T(u.anahtar), T(u.seviye), esc(u.kapanma), T(u.kosul), T(u.degerlendiren), T(u.girdi)]))));
out.push(details('Durum dosyaları: ana makine ve kaplar arasındaki tek yol, hepsi geçici dosya ve rename ile',
  table(['Dosya', 'Biçim', 'Yazan ve okuyan'], spec.dosya_semalari.map((f) => [C(f.dosya), T(f.bicim), T(f.kim)]))));
out.push(details('Compose servisleri: prod, dev ve test profilleri; iki API kopyası; ağ ve sırlar',
  table(['Servis', 'Profil', 'İmaj', 'Ağ', 'Ayrıntı'], spec.compose_servisleri.map((c) => [C(c.servis), esc(c.profil), T(c.imaj), T(c.ag), T(c.ayrinti)])) +
  '\n<pre><code>' + esc([
    '# compose.yaml (D15); docker/postgres/compose.yaml D12\'nin',
    'include: [docker/postgres/compose.yaml]',
    'x-sunucu: &sunucu',
    '  image: ghcr.io/${IU_DEPO}/iu-yoklama-sunucu@${IU_SUNUCU_OZETI}',
    '  init: true',
    '  user: node',
    '  read_only: true',
    '  tmpfs: [/tmp]',
    '  cap_drop: [ALL]',
    '  security_opt: [no-new-privileges:true]',
    '  env_file: ["${IU_AYAR_DOSYASI:-/opt/iu-yoklama/yayin.env}"]',
    '  environment: { TZ: UTC, NODE_ENV: production }',
    '  logging: { driver: local, options: { max-size: 50m, max-file: "5" } }',
    'x-api: &api',
    '  <<: *sunucu',
    '  profiles: [prod]',
    '  command: [node, src/server.ts]',
    '  restart: unless-stopped',
    '  mem_limit: 1g',
    '  stop_grace_period: 30s',
    '  logging: { driver: local, options: { max-size: 100m, max-file: "10" } }',
    '  healthcheck:',
    '    test: [CMD, node, -e, "fetch(\'http://127.0.0.1:3000/health/live\').then(r => process.exit(r.status === 204 ? 0 : 1), () => process.exit(1))"]',
    '    interval: 10s',
    '    timeout: 3s',
    '    retries: 3',
    '    start_period: 60s',
    '  secrets: [yoklama_api_parolasi, saat_belgesi, qr_anahtar_kaynagi, giris_kodu_ozeti, eposta_ozeti, ulasma_makbuzu, inceleme_sabit_kodu, smtp_parolasi]',
    '  volumes: [/var/lib/iu-yoklama/durum/saat:/durum/saat:ro, api-durum:/durum/api]',
    '  networks: [onyuz, veritabani]',
    '  depends_on: { goc: { condition: service_completed_successfully }, postgres: { condition: service_healthy } }',
    'services:',
    '  api-1: { <<: *api, environment: { TZ: UTC, NODE_ENV: production, ISLETIM_KOPYA_ADI: api-1 } }',
    '  api-2: { <<: *api, environment: { TZ: UTC, NODE_ENV: production, ISLETIM_KOPYA_ADI: api-2 } }',
    '  isci:',
    '    <<: *sunucu',
    '    profiles: [prod]',
    '    command: [node, src/worker.ts]',
    '    restart: unless-stopped',
    '    mem_limit: 512m',
    '    stop_grace_period: 40s',
    '    secrets: [yoklama_isci_parolasi, yoklama_saklama_parolasi, saat_belgesi, qr_anahtar_kaynagi, eposta_ozeti, smtp_parolasi, kalp_atisi, inceleme_sabit_kodu]   # sonuncusunun yalnız varlığı okunur',
    '    volumes: [/var/lib/iu-yoklama/durum/saat:/durum/saat:ro, /var/lib/iu-yoklama/durum/makine:/durum/makine:ro,',
    '              /var/lib/iu-yoklama/durum/veritabani:/durum/veritabani:ro, api-durum:/durum/api:ro]',
    '    networks: [onyuz, veritabani]',
    '    depends_on: { goc: { condition: service_completed_successfully } }',
    '  goc:',
    '    <<: *sunucu',
    '    profiles: [prod]',
    '    command: [node, --run, db:migrate]',
    '    restart: "no"',
    '    secrets: [postgres_parolasi, yoklama_sahip_parolasi, yoklama_api_parolasi, yoklama_isci_parolasi, yoklama_saklama_parolasi, xprem_parolasi]',
    '    networks: { veritabani: { ipv4_address: 172.30.12.20 } }   # D12 pg_hba postgres satırı yalnız bu adres',
    '    depends_on: { postgres: { condition: service_healthy } }',
    '  caddy:',
    '    image: ghcr.io/${IU_DEPO}/iu-yoklama-caddy@${IU_CADDY_OZETI}',
    '    profiles: [prod]',
    '    restart: unless-stopped',
    '    read_only: true',
    '    tmpfs: [/tmp]',
    '    ports: ["80:80", "443:443", "443:443/udp"]',
    '    environment: [ALAN_ADI, ACME_EPOSTA, ACME_CA, HSTS_DEGERI, GUVENILEN_AG_GECIDI, ISTEMCI_ADRES_BASLIGI, XPREM_PORT]',
    '    volumes: [caddy-veri:/data, caddy-ayar:/config]',
    '    networks: { onyuz: { ipv4_address: 172.30.11.10 } }',
    '  xprem:   # imaj ve ayar docker/xprem; kök yolda çalışır, Caddy /guncelleme önekini atar',
    '    profiles: [prod]',
    '    restart: unless-stopped',
    '    networks: [onyuz, veritabani]',
    '    ports: ["127.0.0.1:${XPREM_YONETIM_PORT}:${XPREM_YONETIM_IC_PORT}"]   # yönetim paneli yalnız geri döngüde, SSH -L tüneliyle',
    '  mailpit: { profiles: [dev], ports: ["127.0.0.1:1025:1025", "127.0.0.1:8025:8025"] }',
    'networks:',
    '  onyuz: { ipam: { config: [{ subnet: 172.30.11.0/24 }] } }',
    'volumes: { api-durum: {}, caddy-veri: {}, caddy-ayar: {}, xprem-dosyalari: {} }',
    'secrets:   # dosyalar ${IU_GIZLI_DIZIN} altında, uid 1000, 0400',
    '  saat_belgesi: { file: "${IU_GIZLI_DIZIN}/saat_belgesi.json" }',
    '  # qr_anahtar_kaynagi, giris_kodu_ozeti, eposta_ozeti, ulasma_makbuzu, inceleme_sabit_kodu, smtp_parolasi, kalp_atisi aynı biçimde; veritabanı parolaları D12 parçasında',
    '# compose.gelistirme.yaml (D15, yalnız geliştirme): include: [docker/postgres/compose.gelistirme.yaml]; sunucuya kopyalanmaz',
  ].join('\n')) + '</code></pre>'));
out.push(details('Paylaşılan tek dosyalar: paket sürümleri, pnpm ayarları, Biome kuralları, betikler', ul(spec.paketler.map(T))));
out.push(details('İmaj: tek Dockerfile, iki hedef (sunucu ve caddy), özetle sabit tabanlar', ul(spec.imaj.map(T))));
out.push(details('Yayın iş akışları: sunucu imajı ve uzaktan güncelleme, ikisi de onaylı ortamda', ul(spec.yayin_is_akislari.map(T))));
out.push(details('Süreç açılışı ve kapanışı (server.ts): sıra sabit, her adım tek yerde',
  `<ol>\n${spec.surec_akisi.map((s) => `<li>${T(s.replace(/^\d+\.\s*/, ''))}</li>`).join('\n')}\n</ol>`));
out.push(details('Yük testi: tetikler, profiller ve geçme ölçütleri (k6, hazırlık makinesi)',
  '<p>Tetikler:</p>\n' + ul(spec.yuk_testi.tetikler.map(T)) + '\n<p>Profiller:</p>\n' + ul(spec.yuk_testi.profiller.map(T)) + '\n<p>Geçme ölçütleri:</p>\n' + ul(spec.yuk_testi.olcutler.map(T))));
out.push(details('Tehdit modeli: varlıklar, saldırganlar, güven sınırları, önlemler, kabul edilen riskler',
  '<div class="rows">\n' + [
    row('Varlıklar', T(spec.tehdit_modeli.varliklar)),
    row('Saldırganlar', T(spec.tehdit_modeli.saldirganlar)),
    row('Güven sınırları', T(spec.tehdit_modeli.sinirlar)),
    row('Önlemler', T(spec.tehdit_modeli.onlemler)),
    row('Kabul edilen riskler', T(spec.tehdit_modeli.kabul_edilen_riskler)),
  ].join('\n') + '\n</div>\n' + `<p>${T('ASVS 5.0 seviye 2 eşlemesi: apps/server/test/features/isletim/asvs-eslemesi.json; eksiksizliğini asvs.test.ts denetler (teknik.html#sunucu-guvenlik).')}</p>`));
out.push(details('Olay müdahalesi: altı durum, her biri için komut ve sıra; sorumlu sahip',
  table(['Durum', 'Adımlar'], spec.olay_mudahalesi.map((o) => [T(o.durum), T(o.adimlar)]))));
out.push(details(`Başka modüllerden beklenenler: ${spec.istekler.length} satır, hepsi mimar kararıyla sonuçlandı`,
  table(['Modül', 'Beklenen', 'Sonuç'], spec.istekler.map((i) => [esc(i.modul), T(i.istek), T(i.sonuc)]))));

// ---------- Hata kodları ----------
out.push('<h3>Hata kodları</h3>');
out.push(`<p>${T("HTTP kodları ve süreç düzeyindeki kodlar ISLETIM_HATALARI'nda hataKodlariTanimla ile D13 kataloğuna girer (ISLETIM_ önekli): HTTP kodları hoca ve öğrenci metniyle, süreç kodları http null ve metinsiz, HTTP'ye çıkmaz; ISLETIM_KAPANIYOR'un bekleme kuralı { sabit: 5 } (Retry-After 5; I069). Öğe RET gerekçeleri ISLETIM_OGE_GEREKCELERI'ndedir.")}</p>`);
const kodSay = (f) => spec.hata_kodlari.filter(f).length;
out.push(details(`${spec.hata_kodlari.length - 1} ISLETIM_ kodu: ${kodSay((h) => /^\d+$/.test(h.http))} HTTP, ${kodSay((h) => h.http === 'öğe RET')} öğe RET gerekçesi, ${kodSay((h) => h.http === 'null (süreç)')} süreç kodu (http null); D13 kök kodları her rotada örtük`,
  table(['Kod', 'HTTP ya da tür', 'Nerede', 'Anlam'], spec.hata_kodlari.map((h) => [C(h.kod), esc(h.http), T(h.nerede), T(h.anlam)]))));

// ---------- Testler ----------
out.push('<h3>Testler</h3>');
const kinds = {};
for (const t of spec.tests) kinds[t.kind] = (kinds[t.kind] || 0) + 1;
out.push(`<p>${T(`Davranış senaryoları apps/server/test/features/isletim/, adımları steps/isletim/, birim ve özellik testleri kaynağın yanında (Vitest, fast-check deneme sayısı açık). Her yokluk iddiasının yer kontrolü vardır; koruyucu testler bilerek bozulup kırmızıya döndüğü görülerek kabul edilir, dosya md5 ile geri yazılır.`)}</p>`);
const turAdi = { behavior: 'davranış', property: 'özellik', contract: 'sözleşme', load: 'yük', mutation: 'mutasyon' };
out.push(details(`${spec.tests.length} test: ` + Object.entries(kinds).map(([k, n]) => `${n} ${turAdi[k] || k}`).join(', '),
  table(['Ad', 'Tür', 'Doğruladığı'], spec.tests.map((t) => [T(t.name), esc(t.kind), T(t.asserts)]))));
out.push(details(`Planlanan dosyalar: ${spec.files.length} dosya, hepsi D15'in dosya haritasında`, ul(spec.files.map(C))));

// ---------- Netleştirilenler ----------
out.push('<h3>Netleştirilenler</h3>');
const bosluk = spec.resolved_gaps.filter((x) => /^D15-B/.test(x.gap)).length;
out.push(`<p>${T(`Envanterdeki ${bosluk} boşluğun her biri karara bağlandı; sahibe kalanlar karar yerine açık noktaya gönderildi ve o güne kadar tasarımın varsaydığı yol yazıldı. Mimari açık nokta D15-A12 mimar kararlarıyla (I080 ile I086, A1, A2) kapandı ve son satırdadır.`)}</p>`);
out.push(details(`${bosluk} boşluk ve ${spec.resolved_gaps.length - bosluk} kapanan açık nokta: karar ve gerekçe`,
  table(['Boşluk', 'Karar', 'Gerekçe'], spec.resolved_gaps.map((g) => [esc(g.gap), T(g.decision), T(g.why)]))));
out.push(details(`${spec.contradictions_resolved.length} çelişki: ekran süresi oturum başına günlük toplam; sıra boşluğu bütün öğe türlerinin birleşiminde`,
  table(['Çelişki', 'Çözüm'], spec.contradictions_resolved.map((c) => [esc(c.id), T(c.resolution)]))));

// ---------- Açık noktalar ----------
out.push('<h3>Açık noktalar</h3>');
const sahip = spec.open_points.filter((o) => o.needs_owner).length;
if (sahip !== spec.open_points.length) throw new Error('open point without needs_owner');
out.push(`<p>${T(`${spec.open_points.length} açık nokta, hepsi sahibin kararı; mimariye kalan açık nokta yok (D15-A12 kapandı, Netleştirilenler).`)}</p>`);
out.push('<div class="callout warn">\n' + ul(spec.open_points.map((o) =>
  `<strong>${esc(o.id)}</strong> ${o.needs_owner ? '<span class="tag warn">sahip</span>' : '<span class="tag mute">mimari</span>'} ${T(o.question)} <em>Öneri:</em> ${T(o.recommendation)}`)) + '\n</div>');
out.push('</section>');

const html = out.join('\n') + '\n';

// ---------- self checks ----------
const errs = [];
const all = JSON.stringify(spec) + html;
if (/[\u2013\u2014]/.test(all)) errs.push('dash found');
if (/KVKK/i.test(all)) errs.push('KVKK found');
for (const doc of ['plan', 'teknik', 'tasarim']) {
  const ids = new Set([...fs.readFileSync(REPO + doc + '.html', 'utf8').matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  for (const m of all.matchAll(new RegExp(`\\b${doc}\\.html#([a-z0-9-]+)`, 'g'))) if (!ids.has(m[1])) errs.push(`broken ${doc}.html#${m[1]}`);
}
if (errs.length) { console.log('BUILD ERRORS:\n' + [...new Set(errs)].join('\n')); process.exit(1); }

fs.writeFileSync(process.env.D15_FRAG_OUT || path.join(BASE, 'frag', 'D15.html'), html);
console.log(`built: spec ${JSON.stringify(spec).length} bytes, frag ${html.length} bytes, tests ${spec.tests.length}, gaps ${spec.resolved_gaps.length}, files ${spec.files.length}`);
