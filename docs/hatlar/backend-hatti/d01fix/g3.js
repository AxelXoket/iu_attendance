const usedCodes = new Set(endpoints.flatMap(e => e.errors));
for (const c of usedCodes) if (!hatalar.find(h => h[0] === c)) throw new Error('error code missing from catalog: ' + c);

// ---------------------------------------------------------------- html
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const a = (doc, id, label) => `<a href="${doc}.html#${id}">${esc(label)}</a>`;
const code = s => `<code>${esc(s)}</code>`;
const row = (k, v) => `<div class="row"><div class="k">${k}</div><div>${v}</div></div>`;
const tableHtml = (head, rows) => `<table><tr>${head.map(h => `<th>${esc(h)}</th>`).join('')}</tr>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</table>`;

const grupAd = { giris: 'Giriş ve oturum', basvuru: 'Hoca başvurusu', ogrenci: 'Öğrenci kaydı, cihaz ve kayıt kodu', silme: 'Hesap silme', yonetim: 'Yönetim' };
const fmtObj = o => Object.keys(o).length ? '<ul>' + Object.entries(o).map(([k, v]) => `<li>${code(k)}: ${esc(v)}</li>`).join('') + '</ul>' : '<p>Gövde yok.</p>';

let h = '';
h += '<section id="kimlik">\n';
h += '<h2>Kimlik, giriş ve yetki</h2>\n';
h += `<p>${esc(spec.summary)}</p>\n`;

// Amaç ve sınırlar
h += '<h3>Amaç ve sınırlar</h3>\n<div class="rows">\n';
h += row('Amaç', `Hoca ve yönetici girişi (${a('plan', 'kararlar-roller', 'Roller, Hoca girişi, Hoca oturumu')}, ${a('plan', 'kararlar-tek-etkenli-giris', 'Tek etkenli giriş')}), öğrenci kaydı ve tek telefona bağlama (${a('plan', 'kararlar-e-posta-gonderimi', 'Öğrenci kaydı, İlk kayıt teyidi')}, ${a('plan', 'kararlar-ogrenci-telefonu', 'Öğrenci telefonu')}), hesap silme (${a('plan', 'kararlar-hesap-silme', 'Hesap silme')}) ve inceleme hesapları (${a('plan', 'kararlar-inceleme-hesaplari', 'İnceleme hesapları')}). Yöntem ve anahtarlar ${a('teknik', 'sunucu-kimlik', 'teknik: Kimlik')} ve ${a('teknik', 'sunucu-ilk-yonetici', 'İlk yönetici')} satırlarında.`) + '\n';
h += row('Sahip olduğu', `11 tablo, 28 uç, 5 iş; kökteki oturum kancası ${code('oturumDogrula')} (kökte D13 kaydeder), ${code('apps/server/src/cli/yonetici-ekle.ts')} komutu ve Caddy\'nin sunduğu ${code('docker/caddy/sayfalar/hesap-silme.html')} sayfası. Göç ${code('apps/server/migrations/<UTC zaman>_kimlik_<açıklama>/')} altında; klasör D12\'nin, içerik yalnız bu tablolar.`) + '\n';
h += row('Yapmadığı', 'Cihaz kanıtını doğrulamaz ve kayıt kararı vermez (D07); ilk kayıt teyidi listesini ve uçlarını tutmaz (D09, teyit alanlarını D01 yazar); e-postayı göndermez ve gönderim sınırını saymaz (D14); denetim tablosu D09\'un; rota kaydı, rol ve kimlik türü beyanının denetimi (API_KIMLIK_GEREKLI, API_ROL_YETKISIZ), hata zarfı, köken kuralı ve çerez ile Bearer seçimi D13\'ün; ortak Kimlik tipi ve çerez adı D13\'ün packages/contracts/src/ortak dosyalarında; kuyruk öğesinin hesap denetimi D06\'nın; birim ve bölüm listesi, deneme dersi D02\'nin; deneme listesi D03\'ün.') + '\n';
h += row('Hesap silme sayfası', `Girişsiz, durağan, API düşse de açılır. Rolüne göre dört satır yazar: ne silinir, ne kalır, neden kalır ve ne kadar kalır (silinen ve kalan alanlar: Durumlar ve kurallar; süre ${a('plan', 'acik-saklama-suresi', 'Saklama süresi')} açık noktasına bağlı). Hocaya: panele e-posta koduyla gir, Hesabım ekranından sil; hesabı pasifse paneldeki kodla silme ekranından (e-posta koduyla, oturumsuz). Öğrenciye: uygulamada Hesabımı sil; telefonu yoksa, hesabı reddedildiyse ya da kapandıysa hocasına kimliğiyle yüz yüze başvur (reddedilen ve kapanan hesapta yazdığın isim ve telefon bilgisi o anda silinmiştir, numara ve teyit bilgisi kalır). Onaylanmamış başvuru sahibine: paneldeki kodla silme ekranı (e-posta koduyla). Bağlantı yalnız aynı adresteki panele verilir; Play\'in veri güvenliği formuna bu adres yazılır.`) + '\n';
h += row('Çağırdığı dış yüzler', [
  'D02: birimGetir, subeGetir, dersYetkisi, kilitliBirimDonemleri, denemeDersiniKur',
  'D03: numaraIleEslestir, ogrencininEtkinSatirlari, listeSatirlari, listeDegisikligiDinleyicisiKaydet, denemeListesiniKur',
  'D06: ogrenciDurumuDegisti (modules/esitleme/yaprak.ts)',
  'D07: dogrulamaDegeriniTuket, cihazKanitiniDogrula, yenidenDegerlendir',
  'D09: denetimeYaz (modules/duzeltmeler/yaprak.ts)',
  'D12: islem, danismaKilidi, saklamaIsleyicisiKaydet, kisitAdi, testVeritabaniHazirla',
  'D13: rotalariKaydet, uygulamaHatasi, istekKimligi, hizSinifi (girissiz, oturum, agir); ortak Kimlik tipi ve CEREZLER',
  'D14: isGonder, isTanimla, epostaGonder, epostaSiniriDenetle',
  'D15: ayarlar, gizliAnahtar (giris_kodu_ozeti, kayit_kodu_ozeti), log, uyariAc',
  'Saat: D04\'ün simdi() arayüzü, bileşim kökünden parametreyle (D01-A14)',
  'Abone olanlar (D01 bunları içe aktarmaz, bileşim kökü kimlikDinleyicileriniKur ile verir): D11 projeksiyon, D15 isletim, D06 esitleme',
].map(esc).join('<br>')) + '\n';
h += row('Dış yüz', exportsList.map(x => code(x.name)).join(', ') + `. İmzalar aşağıdaki ayrıntıda; [yaprak] işaretliler başka modül çağırmaz ve ${code('apps/server/src/modules/kimlik/yaprak.ts')} dosyasındadır, çağıranlar onları oradan içe aktarır (D07 ile dosya döngüsü kurulmaz). Sözleşmeye eklenecekler ve adı değişenler D01-A14'te.`) + '\n';
h += '</div>\n';
h += `<details><summary>Dış yüz imzaları: ${exportsList.length} işlev. tx alanlar çağıranın işleminde çalışır; oturumDogrula son kullanımı kendi kısa işleminde yazar, yetkiDenetle, kimlikDinleyicileriniKur ve epostaNormallestir veritabanına dokunmaz</summary>\n<div class="rows">\n`;
for (const x of exportsList) h += row(code(x.name), `<p>${code(x.signature)}</p><p>${esc(x.purpose)}</p>`) + '\n';
h += '</div></details>\n';

// Tablolar
h += '<h3>Tablolar</h3>\n';
h += `<p>Adlar ASCII Türkçe ve çoğul, kimlikler ${code('uuidv7()')}, anlar ${code('timestamptz')} ve saat arayüzünden, durum listeleri metin ve CHECK (${a('teknik', 'veritabani', 'teknik: Veritabanı')}, ${a('teknik', 'kod-veri-modeli', 'Veri modeli')}). Kısmi tekil dizinler kuralın kendisidir: teyitli ve silinmemiş numara, öğrencide tek etkin cihaz, cihazda tek açık talep, tek açık kayıt kodu, tek sıradaki silme isteği.</p>\n`;
for (const t of tables) {
  h += `<details><summary>${code(t.name)}: ${esc(t.purpose.split('. ')[0].replace(/\.$/, ''))}</summary>\n`;
  h += `<p>${esc(t.purpose)}</p>\n`;
  h += tableHtml(['Sütun', 'Tür', 'Boş', 'Varsayılan', 'Not'], t.columns.map(c => [code(c.name), esc(c.type), c.null ? 'evet' : 'hayır', c.default ? code(c.default) : '', esc(c.note)])) + '\n';
  h += `<p>Dizinler:</p><ul>${t.indexes.map(i => `<li>${code(i)}</li>`).join('')}</ul>\n`;
  h += `<p>Kısıtlar:</p><ul>${t.constraints.map(i => `<li>${code(i)}</li>`).join('')}</ul>\n`;
  h += '</details>\n';
}

// Uç noktalar
h += '<h3>Uç noktalar</h3>\n';
h += `<p>Hepsi ${code('/v1/kimlik')} önekli; yönetici uçları ${code('/v1/kimlik/yonetim')} altında. Numara, e-posta, kod ve isim yalnız gövdede, adres satırında yalnız UUID. Yanıt zarfı, sayfalama ve hız sınıfları D13\'ün; giriş uçları en düşük sürüm denetimine takılmaz (${a('plan', 'dagitim-guncelleme-ilkesi', 'Güncelleme ilkesi')}). Çerez ve Bearer kuralı ${a('teknik', 'sunucu-kimlik', 'teknik: Kimlik')}, IP sınırının yalnız girişsiz uçlarda olması ${a('teknik', 'sunucu-guvenlik', 'teknik: Güvenlik')}. Her rota kimlik ve rol beyanıyla kaydedilir; değişim bekleyen kısıtlı oturum yalnız degisim_bekleyen rolünü taşır. Oturum rotalarında şu kodlar her uçta geçerlidir ve uç listelerine yazılmaz: D13'ün API_KIMLIK_GEREKLI, API_ROL_YETKISIZ ve API_KOKEN_GECERSIZ kodları, D01 kancasının KIMLIK_OTURUM_YOK ve KIMLIK_OTURUM_BITTI kodları (nedeni zarfın ayrıntısında).</p>\n`;
h += '<details><summary>28 uç tek tabloda: yöntem, yol, istemci ve kim çağırır</summary>\n';
h += tableHtml(['Yöntem', 'Yol', 'İstemci', 'Yetki'], endpoints.map(e => [esc(e.method), code(e.path), esc(e.client), esc(e.auth)])) + '\n';
h += '</details>\n';
for (const g of Object.keys(grupAd)) {
  const list = endpoints.filter(e => e.grup === g);
  h += `<details><summary>${esc(grupAd[g])}: ${list.length} ucun isteği, cevabı, hatası ve tekrarı</summary>\n<div class="rows">\n`;
  for (const e of list) {
    h += row(code(e.method + ' ' + e.path),
      `<p>${esc(e.auth)} İstemci: ${esc(e.client)}.</p><p>İstek:</p>${fmtObj(e.request)}<p>Cevap:</p>${fmtObj(e.response)}<p>Hatalar: ${e.errors.length ? e.errors.map(code).join(', ') : 'yalnız kanca ve D13 kodları'}.</p><p>Tekrar: ${esc(e.idempotency)}</p><p>Sınır: ${esc(e.rate_limit)}</p>`) + '\n';
  }
  h += '</div></details>\n';
}

// İşler
h += '<h3>İşler</h3>\n';
h += `<p>İş adı kuyruk adıdır, işleyiciler ${code('apps/server/src/jobs/kimlik/')} altında, ${code('jobs/kimlik/index.ts')} tanımları D14.isTanimla ile verir. İş verisi yalnız iç kimlik taşır, iki kez çalışan iş aynı sonucu verir; e-posta hiçbir zaman kuyruğa girmez (${a('plan', 'kararlar-roller', 'Hoca girişi')}).</p>\n<div class="rows">\n`;
for (const j of jobs) h += row(code(j.name), `<p>${esc(j.does)}</p><p>Zaman: ${esc(j.schedule)}</p><p>Tekrar: ${esc(j.idempotency)}</p>`) + '\n';
h += row(`${code('yonetici-ekle')} <span class="tag mute">Komut</span>`, `<p>İş değil, sunucu makinesinde SSH ile girenin göç servisinin imajından ${code('docker compose run --rm')} ile çalıştırdığı komut (${a('teknik', 'sunucu-ilk-yonetici', 'İlk yönetici')}). Bağımsız değişkenler: ${code('--eposta')} (zorunlu, @istanbul.edu.tr), ${code('--ad-soyad')} (yeni hesapta zorunlu), isteğe bağlı ${code('--hoca')} (hoca rolünü de verir). Adres yoksa aktif personel açar, varsa hesabı aktif yapar; tüm kapsamlı yönetici rolünü verir; iş başlamadan kimlikDinleyicileriniKur çağırır, dinleyiciler kurulamazsa çalışmaz; kimlik.komut_satiri_yonetici denetimi yapan komut_satiri. Kod ya da şifre üretmez, aynı girdiyle ikinci çalıştırma satır eklemez. Çıktı yalnız iç kimlik ve "yeni hesap" ya da "var olan hesap".</p>`) + '\n';
h += '</div>\n';

// Durumlar ve kurallar
h += '<h3>Durumlar ve kurallar</h3>\n';
h += '<div class="rows">\n';
h += row('Kod', `6 rakam, 300 saniye, tek kullanım; kişinin aday açık kodlarında ortak 3 yanlışta düşer. Özet: HMAC-SHA256, giriş kodu özet anahtarı, kişiye ve amaca bağlı; karşılaştırma ${code('timingSafeEqual')}. Bekleme 3. yanlıştan sonra 30 saniye, ikişer katlanır, en çok 900 saniye, 24 saatte sıfırlanır; beklemede yalnız bekleme başladıktan sonra üretilmiş kod denenebilir, böylece adresi bilen yabancı sahibi dışarıda tutamaz (D01-B07, D01-A24). Kayıt kodu ayrı anahtarla (${a('teknik', 'sunucu-ayarlar', 'teknik: Ayarlar')}, her anahtar tek iş).`) + '\n';
h += row('Oturum', 'Anahtar 256 bit rastgele, veritabanında SHA-256 özeti. Telefon 30 gün, panel 24 saat ve 1 saat işlemsizlik; öğrencide bitiş yok, cihaz kapanınca oturum da düşer. En çok 3 etkin personel oturumu; 4. girişte en eski panel, yoksa en eski telefon kapanır; telefon yenilemesi kendi oturumunun yerine geçer. Personel akışlarının kilit sırası: kisiler, eposta_giris_durumlari, giris_kodlari, giris_oturumlari.') + '\n';
h += row('Yetki', 'Kanca kimliği ekler; rol ve kimlik türünü D13 rota beyanı denetler (401 API_KIMLIK_GEREKLI, 403 API_ROL_YETKISIZ); yönetici kapsamını modüller yetkiDenetle ile, kaynak sahipliğini modül servisi denetler (404). Yönetici kapsamı hedefin birimiyle, hedef yöneticiyse onun rol kapsamıyla karşılaştırılır. Değişim bekleyen oturum yalnız degisim_bekleyen rolünü taşır, bu yüzden yalnız /ben, /cikis ve değişim uçlarına girer.') + '\n';
h += row('Öğrenci', `Kayıtta cihaz ve anahtar satırları yazılır, sonra D07 kanıtı doğrular (sonuç etikettir, ${a('plan', 'kararlar-cihaz-dogrulamasi', 'Cihaz doğrulaması')}), D03 eşleştirir; numarada teyitli hesap varsa kayıt cihaz başına bir değişim talebine döner, kapanmış cihazın anahtarı yeniden oturum alamaz. Teyit öğrencinin etkin liste satırı olan dersin hocasında; toplu yol yalnız eşleşmiş, doğrulanmış, çakışmasız hesapta (${a('plan', 'kararlar-e-posta-gonderimi', 'İlk kayıt teyidi')}).`) + '\n';
h += row('Silmede silinen', 'Personel: e-posta, giriş kodları, oturum satırları; roller geri alınır (adres bekleme satırı yalnız HMAC taşır, 24 saatte kendiliğinden gider). Öğrenci: oturum satırları, girilen isim, cihazların etkinliği ve ayrıntıları (model, son görülme, sürüm, kanal, güvenlik düzeyi, doğrulanmış açılış, iOS alanları); telefon sayaçlarını D15 hesap_silindi olayıyla siler. Reddedilen ve kapanan öğrenci hesabında girilen isim ve cihaz ayrıntıları o anda silinir.') + '\n';
h += row('Silmede kalan', `Kişi satırı silindi işaretiyle (hocada ad-soyad ve bölüm, öğrencide numara ve teyit bilgisi), cihaz platformu, doğrulama özeti ve isSystemUser, açık anahtarlar; liste satırı, yoklama kayıtları, düzeltmeler ve denetim kaydı öbür modüllerde (${a('plan', 'kararlar-hesap-silme', 'Hesap silme')}). Saklama süresi dolunca numara ve isim D12\'nin saklama işiyle, D01\'in kaydettiği işleyiciyle silinir (${a('plan', 'acik-saklama-suresi', 'Saklama süresi')}).`) + '\n';
h += '</div>\n';
h += '<details><summary>' + akislar.length + ' akışın adım sırası: kilit sırası ve işlem sınırı buradan okunur</summary>\n<div class="rows">\n';
for (const [ad, adimlar] of akislar) h += row(esc(ad), `<ol>${adimlar.map(s => `<li>${esc(s)}</li>`).join('')}</ol>`) + '\n';
h += '</div></details>\n';
for (const sm of state_machines) {
  h += `<details><summary>${code(sm.name)}: ${esc(sm.states.join(', '))}</summary>\n<ul>`;
  for (const t of sm.transitions) h += `<li>${esc(t.from)} → ${esc(t.to)} (${esc(t.by)}): ${esc(t.when)}</li>`;
  h += '</ul></details>\n';
}
h += '<div class="callout"><p><strong>Her zaman doğru kalanlar</strong></p><ul>';
for (const i of invariants) h += `<li>${esc(i)}</li>`;
h += '</ul></div>\n';

// Hata kodları
h += '<h3>Hata kodları</h3>\n';
h += `<p>Kodlar ${code('packages/contracts/src/kimlik.ts')} içinde, her biri tek HTTP durumuna bağlı; ${code('hatalar.ts')} birleştirir (D13). Kimlik bilgisi yokluğu, rol ve köken için D13'ün API_ kodları döner, D01 bunların kopyasını tanımlamaz. Ayrıntı yalnız anahtarın sahibine döner; kaynak görülmemeliyse 404.</p>\n`;
h += `<details><summary>${hatalar.length} kod: 401 oturum, 403 ilke, 400 girdi, 404 görülmeyen, 409 durum, 429 bekleme</summary>\n`;
h += tableHtml(['Kod', 'HTTP', 'Ne zaman'], hatalar.map(([k, s, n]) => [code(k), String(s), esc(n)])) + '\n';
h += '</details>\n';

// Testler
h += '<h3>Testler</h3>\n';
h += `<p>Türkçe davranış senaryoları ${code('apps/server/test/features/kimlik/')}, adımlar ${code('steps/kimlik/')}, veri kurucusu ${code('support/kurucular/kimlik.ts')}; saat D04\'ün sahte saati, posta D14\'ün sahte postası, kanıt doğrulayıcısı sahte. Yetki ve hile senaryoları ret beklentisiyle önce kırmızı yazılır (${a('plan', 'baslangic', 'Başlangıç')}); sabitler sözleşmeden içe alınır, yokluk iddiası pozitif kontrolle birlikte.</p>\n`;
h += `<details><summary>${tests.length} test: davranış, özellik, sözleşme, mutasyon ve yük</summary>\n`;
h += tableHtml(['Test', 'Tür', 'Doğruladığı'], tests.map(t => [esc(t.name), esc(t.kind), esc(t.asserts)])) + '\n';
h += '</details>\n';

// Netleştirilenler
h += '<h3>Netleştirilenler</h3>\n';
h += `<details><summary>${resolved_gaps.length} boşluğun kararı ve gerekçesi</summary>\n`;
h += tableHtml(['Boşluk', 'Karar', 'Neden'], resolved_gaps.map(g => [code(g.gap), esc(g.decision), esc(g.why)])) + '\n';
h += '</details>\n';
h += `<details><summary>${contradictions_resolved.length} çelişkinin çözümü</summary>\n`;
h += tableHtml(['Çelişki', 'Çözüm'], contradictions_resolved.map(c => [code(c.id), esc(c.resolution)])) + '\n';
h += '</details>\n';

// Açık noktalar
h += '<h3>Açık noktalar</h3>\n';
h += `<p>Sahip kararı gerekenler tasarımda en dar ve geri alınabilir yolla kuruldu; sözleşme notları modüller arası eklemelerdir. Planın kendi açık noktaları: ${a('plan', 'acik', 'Açık noktalar')}.</p>\n<div class="rows">\n`;
for (const o of open_points) {
  const tag = o.needs_owner ? '<span class="tag warn">Sahip kararı</span>' : '<span class="tag mute">Sözleşme</span>';
  h += row(`${code(o.id)} ${tag}`, `<p>${esc(o.question)}</p><p>Öneri: ${esc(o.recommendation)}</p>`) + '\n';
}
h += '</div>\n';
h += '</section>\n';

// ---------------------------------------------------------------- guards and write
const all = JSON.stringify(spec) + h;
if (/[–—]/.test(all)) throw new Error('contains U+2013 or U+2014');
if (/KVKK/.test(all)) throw new Error('contains KVKK');
fs.writeFileSync(path.join(OUT, 'spec', 'D01.json'), JSON.stringify(spec, null, 2) + '\n', 'utf8');
fs.writeFileSync(path.join(OUT, 'frag', 'D01.html'), h, 'utf8');
console.log('written', { tables: tables.length, endpoints: endpoints.length, jobs: jobs.length, exports: exportsList.length, files: files.length, tests: tests.length, gaps: resolved_gaps.length, contradictions: contradictions_resolved.length, open: open_points.length, errors: hatalar.length, htmlBytes: Buffer.byteLength(h) });
