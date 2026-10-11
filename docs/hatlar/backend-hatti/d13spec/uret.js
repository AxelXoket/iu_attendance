// veri.js'ten spec/D13.json ve frag/D13.html üretir, sonra kendi bekçilerini koşar.
'use strict';
const fs = require('fs'), path = require('path');
const V = require('./veri.js');
const B = path.resolve(__dirname, '..');
const C = JSON.parse(fs.readFileSync(path.join(B, 'contracts.json'), 'utf8'));
const INV = JSON.parse(fs.readFileSync(path.join(B, 'inv', 'D13.json'), 'utf8'));
const mod = C.modules.find(m => m.id === 'D13');

// ---------- JSON ----------
const duz = s => String(s).replace(/`/g, '');
const derin = x => Array.isArray(x) ? x.map(derin) : (x && typeof x === 'object') ? Object.fromEntries(Object.entries(x).map(([k, v]) => [duz(k), derin(v)])) : (typeof x === 'string' ? duz(x) : x);
const spec = derin({
  id: 'D13', module: mod.name, summary: V.summary, tables: V.tables, endpoints: V.endpoints, jobs: V.jobs,
  state_machines: V.state_machines, invariants: V.invariants, exports: V.exports_, files: V.files, tests: V.tests,
  resolved_gaps: V.resolved_gaps, contradictions_resolved: V.contradictions_resolved, open_points: V.open_points,
});
fs.mkdirSync(path.join(B, 'spec'), { recursive: true });
fs.writeFileSync(path.join(B, 'spec', 'D13.json'), JSON.stringify(spec, null, 2) + '\n', 'utf8');

// ---------- HTML ----------
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const ic = s => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\b(plan|teknik|tasarim)\.html#([a-z0-9-]+)/g, '<a href="$1.html#$2">$1.html#$2</a>');
const kod = s => '<code>' + esc(s) + '</code>';
const tablo = (basliklar, satirlar) => '<table><thead><tr>' + basliklar.map(b => '<th>' + esc(b) + '</th>').join('') + '</tr></thead><tbody>\n' +
  satirlar.map(r => '<tr>' + r.map(h => '<td>' + h + '</td>').join('') + '</tr>').join('\n') + '\n</tbody></table>';
const ayrinti = (ozet, ic_) => '<details><summary>' + ic(ozet) + '</summary>\n' + ic_ + '\n</details>';
const satir = (k, v) => '<div class="row"><div class="k">' + ic(k) + '</div><div>' + v + '</div></div>';
const liste = xs => '<ul>\n' + xs.map(x => '<li>' + ic(x) + '</li>').join('\n') + '\n</ul>';

const t = V.tables[0];
const e = V.endpoints[0];
const turSay = V.tests.reduce((a, x) => (a[x.kind] = (a[x.kind] || 0) + 1, a), {});
const turAd = { behavior: 'davranış', property: 'özellik', contract: 'sözleşme', load: 'yük', mutation: 'mutasyon' };
const sahipSay = V.open_points.filter(o => o.needs_owner).length;

const h = [];
h.push('<section id="' + mod.name + '">');
h.push('<h2>API yüzeyi ve sözleşmeler <span class="tag">D13</span> <span class="tag mute">infra/api</span></h2>');
h.push('<p>' + ic(V.summary) + '</p>');

// Amaç ve sınırlar
h.push('<h3>Amaç ve sınırlar</h3>');
h.push('<div class="rows">');
h.push(satir('Sahip olduğu', ic("Bileşim kökü `apps/server/src/app.ts`; `apps/server/src/infra/api/` (kök kancalar, rota kaydı, hata yakalayıcı, hız sınıfları, aşırı yük, OpenAPI üretimi, sürüm eşiği); packages/contracts'ın ortak kısmı (`ortak/`, `rotalar.ts`, `hatalar.ts`, `istemci.ts`, `api.ts`, `openapi/`, `package.json`, `tsconfig`); `istemci_surum_esikleri` tablosu; `GET /v1/surum`; iki CI işi ve `.github/workflows/sozlesme.yml`. Kararın dayanağı: teknik.html#sunucu, teknik.html#sunucu-mimari, teknik.html#sunucu-guvenlik.")));
h.push(satir('Sahip olmadığı', ic("Oturumun doğrulanması ve çerezin kurulması (D01), saat belgesinin içeriği ve eşitleme sağlığı (D04), dönem arası hesabı (D02), cihaz imzası (D06) ve projeksiyon anahtarı (D11) doğrulaması, havuz ve deyim süreleri (D12), ayar şeması, logger, Caddy, sağlık ve durum uçları ve yük testi (D15), modüllerin kendi sözleşme dosyaları, rota listeleri ve hata kodları.")));
h.push(satir('Bağımlılık yönü', ic("`infra/api` hiçbir modülü içe aktarmaz; D01, D02, D04 işlevleri ve D12 bağlantısı `app.ts`'ten `apiKur` parametresiyle gelir, tipler drizzle-orm kütüphanesinden. Tek tanım düzeyi bağ `tablolar.ts`'in, bütün tablo dosyaları gibi, D12'nin `uygulama` şema nesnesini almasıdır (teknik.html#sunucu-mimari'deki tablo dosyası istisnasının aynısı; çalışma zamanı çağrısı değil). Alan modülleri `infra/api/index.ts`'i ve packages/contracts'ı kullanır; infra/api'yi alamayan D12 ortak `UygulamaHatasi` sınıfını packages/contracts'tan kurar.")));
h.push(satir('app.ts kayıt sırası', ic("1) Fastify: logger D15'ten, `genReqId` randomUUID, `requestIdHeader: false`, `requestIdLogLabel: 'istekKimligi'`, `disableRequestLogging: true` (istek logunu D13 rota kalıbıyla yazar), `trustProxy` yalnız Caddy'nin sabit iç adresi (teknik.html#altyapi-caddy), `bodyLimit` 64 KiB, `requestTimeout` 20 s, proto ve constructor zehirlenmesinde error. 2) Zod doğrulayıcı ve serileştirici derleyicileri (fastify-type-provider-zod). 3) `apiKur` kökte, bu sırayla: ilk kanca @fastify/under-pressure; @fastify/cookie, @fastify/helmet, @fastify/rate-limit (global kapalı), yalnız application/json ayrıştırıcısı, veritabanına dokunmayan kök kancalar, oturum kancası, onSend kancaları, yakalayıcılar, rota bekçisi. Böylece aşırı yükte istek veritabanına gitmeden düşer; /health/live ve /v1/durum `baskiDisi` beyanıyla geçer. 4) Modüllerin `eklenti`'leri (D15'inki dahil) ve D13'ün sürüm eklentisi. 5) onReady: rota tamlık denetimi, `yayinBilgisiYukle` ve eşik alımı. Belge üretim kipinde 3'ten önce @fastify/swagger kaydedilir, yayın bilgisi okunmaz, bütün eklentiler açıktır.")));
h.push(satir('Göç', ic("`apps/server/migrations/<UTC zaman>_api_istemci_surum_esikleri/`: klasörün kuralı ve CI denetimi D12'nin, içeriği D13'ün. Harita globu bu alt klasörü D13'e listelemediği için dosya listesinde yer almaz.")));
h.push(satir('Ölçülebilir sonuç ve iz', ic("Hata cevaplarının tamamı zarfa uyar (ortak test kancası her senaryoda denetler); kırılma kapısı her değişiklikte koşar ve önce kendini sınar; dönem içinde en düşük sürüm yükselmesi sıfırdır (tablo tarihçesi gösterir); ders çıkışı yük testinde 429 oranı sıfır ve her 503 Retry-After'lıdır. İz: istek logunda istekKimligi, rota kalıbı, durum, süre, istemci sürümü ve hata kodu; `istemci_surum_esikleri` kararları; CI'da oasdiff çıktısı.")));
h.push('</div>');
h.push(ayrinti('Dış yüz: ' + V.exports_.length + ' işlev, tip ve şema; başka modül D13ile yalnız bunlarla konuşur'.replace('D13ile', "D13'le"),
  tablo(['Ad', 'İmza', 'Amaç'], V.exports_.map(x => [ic(x.name), kod(x.signature), ic(x.purpose)]))));
h.push(ayrinti('Dosyalar: ' + V.files.length + " dosya, hepsi D13'ün globlarında", '<ul>\n' + V.files.map(f => '<li>' + kod(f) + '</li>').join('\n') + '\n</ul>'));

// Tablolar
h.push('<h3>Tablolar</h3>');
h.push('<p>' + ic(t.purpose) + '</p>');
h.push(ayrinti('istemci_surum_esikleri: ' + t.columns.length + ' sütun, yalnız eklenir, geçerli karar tek tekil dizinle bulunur',
  tablo(['Sütun', 'Tip', 'Boş', 'Varsayılan', 'Not'], t.columns.map(c => [kod(c.name), kod(c.type), c.null ? 'evet' : 'hayır', c.default ? kod(c.default) : '', ic(c.note)])) +
  '\n<p>Dizinler</p>\n' + liste(t.indexes) + '\n<p>Kısıtlar</p>\n' + liste(t.constraints)));

// Uç noktalar
h.push('<h3>Uç noktalar</h3>');
h.push('<p>' + ic("D13'ün tek ucu modülsüz kök istisnalardan biridir (contracts.json bağlayıcı önek kararı). Öteki bütün uçlar sahiplerinin eklentisinde ama D13'ün rota tablosu biçimiyle ve `rotalariKaydet` ile kaydolur.") + '</p>');
h.push('<div class="rows">');
h.push(satir(e.method + ' ' + e.path, ic('İstemci: ' + e.client + '. ' + e.auth)));
h.push(satir('İstek', liste(Object.entries(e.request).map(([k, v]) => k + ': ' + v))));
h.push(satir('Cevap 200', liste(Object.entries(e.response).map(([k, v]) => k + ': ' + v))));
h.push(satir('Hatalar', e.errors.map(kod).join(' ')));
h.push(satir('Tekrar', ic(e.idempotency)));
h.push(satir('Sınır', ic(e.rate_limit)));
h.push(satir('Akış', ic("1) Başlıkları şemayla oku. 2) Çiftin geçerli kararını süreç önbelleğinden al; önbellek bir dakikadan eskiyse ve son karar ertelendi ise donemArasiMi'ye sor, true ise uygulandi satırını ekle, tabloyu yeniden oku. 3) GitHub'da kademe yüzdesini takvimden, kovayı kurulum kimliğinden hesapla. 4) guncellemeVar ve guncellemeGerekli'yi `surumKarsilastir` ile hesapla.")));
h.push('</div>');
h.push(ayrinti('Rota tablosu biçimi: her uç bu ' + V.rotaAlanlari.length + ' alanı beyan eder, eksik beyan açılışı durdurur',
  tablo(['Alan', 'Değer', 'Kural'], V.rotaAlanlari.map(r => [kod(r[0]), ic(r[1]), ic(r[2])]))));
h.push(ayrinti("Başlıklar ve çerezler: tek liste packages/contracts/src/ortak/basliklar.ts'te",
  tablo(['Ad', 'Yön', 'Kim', 'Kural'], V.basliklarTablosu.map(r => [kod(r[0]), ic(r[1]), ic(r[2]), ic(r[3])]))));

// İşler
h.push('<h3>İşler</h3>');
h.push('<p>' + ic("İkisi de CI işidir, pg-boss işi değildir; `apps/server/src/jobs/api/index.ts` worker.ts'e boş iş listesi verir. Sözleşme kırılma denetimi kalite kapılarındandır (teknik.html#testler-kalite).") + '</p>');
h.push('<div class="rows">');
for (const j of V.jobs) h.push(satir(j.name, ic(j.does) + '<br>' + ic('Ne zaman: ' + j.schedule) + '<br>' + ic('Tekrar: ' + j.idempotency)));
h.push('</div>');

// Durumlar ve kurallar
h.push('<h3>Durumlar ve kurallar</h3>');
for (const sm of V.state_machines) {
  h.push(ayrinti(sm.name + ': ' + sm.states.length + ' durum, ' + sm.transitions.length + ' geçiş',
    '<p>' + sm.states.map(kod).join(' ') + '</p>\n' + tablo(['Nereden', 'Nereye', 'Kim', 'Ne zaman'], sm.transitions.map(x => [kod(x.from), kod(x.to), ic(x.by), ic(x.when)]))));
}
h.push('<div class="callout"><p><strong>Köken ve çerez kuralı (tek yerde, kökte)</strong></p>' + liste([
  "Yazma isteğinde (POST, PUT, PATCH, DELETE) Origin varsa panel adresine birebir eşit olmalı; değilse 403 API_KOKEN_GECERSIZ, girişsiz giriş uçları dahil.",
  "Yazma isteğinde Origin yoksa çerez okunmaz: istek çerezsiz sayılır (telefon). Bearer varsa çerez hiç okunmaz.",
  "GET ve HEAD çerezi okur ve iş verisini değiştirmez. Gövdeli yazma isteğinde yalnız application/json; Content-Encoding 415.",
  "CORS kurulmaz (teknik.html#panel-sunulma), CSRF jetonu yok: aynı köken, SameSite=Lax, yalnız JSON ve Origin yeter (teknik.html#sunucu-kimlik).",
]) + '</div>');
h.push(ayrinti('Hız sınıfları: altı sınıf, her birinin tek sayaç tablosu; değerler yük testinden sonra kesinleşir',
  tablo(['Sınıf', 'Anahtar', 'Dakikada', 'Kanca', 'Tablo', 'Kullanım'], V.hizTablosu.map(r => [kod(r[0]), ic(r[1]), ic(r[2]), ic(r[3]), ic(r[4]), ic(r[5])]))));
h.push(ayrinti('Biçimler: zaman, sayı, kimlik ve imzalı metin packages/contracts/src/ortak/ içinde tek tanımdan',
  tablo(['Değer', 'Şema', 'Örnek', 'Kural'], V.bicimTablosu.map(r => [ic(r[0]), kod(r[1]), kod(r[2]), ic(r[3])]))));
h.push('<p>' + ic('Gövde sınırları: genel 64 KiB, rota başına beyan en çok 2 MiB (öneriler: gönderim 1 MiB, liste yükleme 2 MiB, toplu işlemler 256 KiB). Toplu işlemlerde istek {ogeler} en çok 200, cevap 200 {sonuclar: [{kimlik, sonuc, kod}]} istek sırasıyla. Büyüyen listelerde imlec ve adet, cevap {ogeler, sonrakiImlec}.') + '</p>');
h.push('<p>Değişmezler</p>');
h.push(liste(V.invariants));

// Hata kodları
h.push('<h3>Hata kodları</h3>');
h.push('<p>' + ic("Bütün 4xx ve 5xx cevapları tek zarftır; alanların hepsi her zaman vardır. kod cevapta x-extensible-enum'dur: eski istemci yeni kodu tanımasa da sunucunun mesajını gösterir (D13-B01, D13-B03).") + '</p>');
h.push('<pre><code>' + esc(JSON.stringify({ hata: { kod: 'API_ISTEK_GECERSIZ', mesaj: 'İstekteki bazı alanlar geçersiz.', istekKimligi: '0b5e8f1c-3c1a-4c6e-9d0e-6f1d2a7b9c41', alanlar: [{ konum: 'govde', yol: 'ogrenciNo', kod: 'invalid_format' }], beklemeSaniye: null, ayrinti: null } }, null, 2)) + '</code></pre>');
h.push(ayrinti("API_ kodları: " + V.hatalarTablosu.length + " kod; telefon sınıfı teknik.html#telefon-gonderme-protokolu tablosundan",
  tablo(['Kod', 'HTTP', 'Telefon', 'Ne zaman', 'Hoca metni (öneri)'], V.hatalarTablosu.map(r => [kod(r[0]), ic(r[1]), kod(r[2]), ic(r[3]), ic(r[4])])) +
  '\n<p>' + ic("Öğrenci metni ayrı tutulur; sen ya da siz kararı tasarim.html#acik-hitap açık noktasına bağlı.") + '</p>'));
h.push('<div class="rows">');
h.push(satir('400, 413, 415, 422', ic('İstek bozuk, büyük, JSON değil ya da sonuç sınırı aşıyor. Telefon bunları böler (öteki 4xx de 400 gibi işlenir).')));
h.push(satir('401', ic("Yalnız kimlik yok ya da geçersiz: API_KIMLIK_GEREKLI ve D01'in oturum kodları. Telefonda gönderim durur.")));
h.push(satir('403', ic('Yalnız ilke düzeyi red: rol (API_ROL_YETKISIZ), köken (API_KOKEN_GECERSIZ), hesap durumu (D01). Kuyruk ucunda öğe reddi 403 olmaz, öğe sonucudur.')));
h.push(satir('404', ic("Yol yok (API_UC_BULUNAMADI) ya da kaynak yok veya kişinin değil (<MODÜL>_BULUNAMADI); varlık sızdırılmaz.")));
h.push(satir('409', ic('Yalnız çevrimiçi uçlarda durum çakışması ve beklenen sürüm uyuşmazlığı (<MODÜL>_SURUM_DEGISTI, ayrinti güncel sürüm).')));
h.push(satir('429, 503, 500', ic('Geçici: telefon Retry-After ve kendi rastgele payıyla yeniden dener; 500 de geçicidir. Uygulama 408 üretmez, 502 ve 504 Caddy\'nindir.')));
h.push('</div>');

// Testler
h.push('<h3>Testler</h3>');
h.push('<p>' + ic('Davranış senaryoları `apps/server/test/features/api/` altında Türkçe Gherkin; adımlar uygulamayı app.ts\'in deneme seçenekleriyle (dönem arası, saat belgesi, baskı ve küçük hız sınırları sahte; veritabanı D12\'nin test kurulumundan) kurar ve kancaları modüllerden bağımsız sınamak için deneme rotaları ekler. Özellik testleri fast-check ile, sözleşme testleri şema nesnelerinden ve üretilen OpenAPI belgesinden (kaynak metin aranmaz); mutasyon testleri bekçiyi bilerek bozar, kırmızıyı görür, özgün baytları geri yazıp md5 ile doğrular.') + '</p>');
h.push(ayrinti(V.tests.length + ' test: ' + Object.entries(turSay).map(([k, v]) => v + ' ' + turAd[k]).join(', '),
  tablo(['Ad', 'Tür', 'Doğrular'], V.tests.map(x => [ic(x.name), esc(turAd[x.kind]), ic(x.asserts)]))));

// Netleştirilenler
h.push('<h3>Netleştirilenler</h3>');
h.push('<p>' + ic("Envanterin " + V.resolved_gaps.length + " boşluğu ve " + V.contradictions_resolved.length + " çelişkisi kararlaştırıldı; ürün kararı ya da sahip onayı gerekenler aşağıda açık nokta. Başka modüllerin envanteriyle uzlaştırılanlar: D01-B16, D01-B49, D01-B53, D02-B35, D02-B48, D06-B03, D06-B10, D06-B21, D06-B24, D06-B29, D15-B17, D15-B26, D15-B42.") + '</p>');
h.push(ayrinti(V.resolved_gaps.length + ' boşluk: karar ve neden',
  tablo(['Boşluk', 'Karar', 'Neden'], V.resolved_gaps.map(g => [kod(g.gap), ic(g.decision), ic(g.why)]))));
h.push(ayrinti(V.contradictions_resolved.length + ' çelişki: hangi yorum geçerli',
  tablo(['Çelişki', 'Çözüm'], V.contradictions_resolved.map(c => [kod(c.id), ic(c.resolution)]))));

// Açık noktalar
h.push('<h3>Açık noktalar</h3>');
h.push('<p>' + ic(V.open_points.length + ' açık nokta; ' + sahipSay + ' tanesi sahibin kararını bekliyor, öbürleri modüller arası eşleşme.') + '</p>');
for (const o of V.open_points) {
  h.push('<div class="callout' + (o.needs_owner ? ' warn' : '') + '"><p><strong>' + esc(o.id) + '</strong> ' + (o.needs_owner ? '<span class="tag warn">sahip kararı</span>' : '<span class="tag mute">modüller arası</span>') + ' ' + ic(o.question) + '</p><p>' + ic('Öneri: ' + o.recommendation) + '</p></div>');
}
h.push('</section>');
fs.mkdirSync(path.join(B, 'frag'), { recursive: true });
fs.writeFileSync(path.join(B, 'frag', 'D13.html'), h.join('\n') + '\n', 'utf8');

// ---------- Bekçiler ----------
const hatalar = [];
const hepsi = JSON.stringify(spec) + h.join('\n');
const gapIds = INV.gaps.map(g => g.id), cIds = INV.contradictions.map(c => c.id);
const cozulen = new Set(V.resolved_gaps.map(g => g.gap));
for (const g of gapIds) if (!cozulen.has(g)) hatalar.push('boşluk çözülmemiş: ' + g);
for (const g of cozulen) if (!gapIds.includes(g)) hatalar.push('envanterde olmayan boşluk: ' + g);
const cc = new Set(V.contradictions_resolved.map(c => c.id));
for (const c of cIds) if (!cc.has(c)) hatalar.push('çelişki çözülmemiş: ' + c);
if (/[–—]/.test(hepsi)) hatalar.push('U+2013 ya da U+2014 var');
for (const yasak of [/KVKK/i, /sponsor/i]) if (yasak.test(hepsi)) hatalar.push('yasak sözcük: ' + yasak);
const kodlar = new Set(V.hatalarTablosu.map(r => r[0]));
for (const k of e.errors) if (!kodlar.has(k)) hatalar.push('uç hatası katalogda yok: ' + k);
const apiImza = V.exports_.find(x => x.name.startsWith('API_HATALARI')).signature;
for (const k of kodlar) if (!apiImza.includes(k + ':')) hatalar.push('API_HATALARI imzasında eksik: ' + k);
const sinifImza = V.exports_.find(x => x.name === 'hizSinifi').signature;
for (const r of V.hizTablosu) if (!sinifImza.includes("'" + r[0] + "'")) hatalar.push('hız sınıfı imzada yok: ' + r[0]);
const ozgun = new Set(V.tests.map(x => x.name)); if (ozgun.size !== V.tests.length) hatalar.push('aynı adlı test var');
for (const m of V.tests.filter(x => x.kind === 'mutation')) {
  const hedefler = [...m.asserts.matchAll(/"([^"]+)"/g)].map(x => x[1]);
  if (!hedefler.length) hatalar.push('mutasyon testi hedef test adı vermiyor: ' + m.name);
  for (const r of hedefler) if (!ozgun.has(r)) hatalar.push('mutasyon testinin hedefi yok: ' + r);
}
const refler = new Set(hepsi.match(/D13-[ABC]\d\d/g));
const tanimli = new Set([...V.resolved_gaps.map(g => g.gap), ...V.contradictions_resolved.map(c => c.id), ...V.open_points.map(o => o.id)]);
for (const r of refler) if (!tanimli.has(r)) hatalar.push('tanımsız D13 başvurusu: ' + r);
const contractExports = mod.exports.map(x => x.split('(')[0]);
for (const ce of contractExports) if (!V.exports_.some(x => x.name === ce)) hatalar.push('contracts.json dış yüzü spec\'te yok: ' + ce);
if (hatalar.length) { console.log('BEKÇİ HATALARI:\n' + hatalar.join('\n')); process.exit(1); }
console.log('üretildi: ' + V.files.length + ' dosya, ' + V.tests.length + ' test, ' + V.resolved_gaps.length + ' boşluk, ' + V.open_points.length + ' açık nokta; bekçiler temiz');
