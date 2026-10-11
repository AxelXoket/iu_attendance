// Review fixes, round 1. Each replacement must match exactly once or the script reports it.
'use strict';
const fs = require('fs');
const path = require('path');
let bad = 0;
function rep(file, a, b) {
  const p = path.join(__dirname, file);
  let t = fs.readFileSync(p, 'utf8');
  const n = t.split(a).length - 1;
  if (n !== 1) { console.log(`MATCH ${n} in ${file}: ${a.slice(0, 90)}`); bad++; return; }
  fs.writeFileSync(p, t.replace(a, () => b));
}

// 1) API-level X-Forwarded-For guard dropped (Caddy rule and CI Caddy test stay)
rep('data1.js',
  "Caddy /health/* yolunu dışarıdan 404 ile keser; X-Forwarded-For taşıyan (vekil üzerinden gelmiş) istek API'de de 404 API_UC_BULUNAMADI alır.\";",
  "API portu yayımlanmaz; Caddy /health/* yolunu dışarıdan 404 ile keser (CI Caddy senaryosu sınar). API'de vekil başlığına bakan ikinci bir bekçi yoktur: Caddy'nin kendi sağlık isteklerini yanlışlıkla kesip iki kopyayı birden devreden çıkarabilirdi.\";");
rep('data1.js', "      '404 API_UC_BULUNAMADI: istek vekil üzerinden geldi (X-Forwarded-For var)',\n", '');
rep('data1.js', "      '404 API_UC_BULUNAMADI: vekil üzerinden geldi',\n", '');
rep('data3.js',
  "  t('Vekil üzerinden gelen sağlık isteği 404 alır', 'behavior', \"X-Forwarded-For başlıklı GET /health/live ve /health/ready 404 API_UC_BULUNAMADI; başlıksız istek 204 (pozitif kontrol).\"),\n",
  '');
rep('data3.js',
  "\"Test veritabanı bağlantısı semaDurumu ulasilamiyor döndürecek şekilde kesilmişken GET /health/live 204 ve gövdesiz; aynı anda /health/ready 503 ISLETIM_HAZIR_DEGIL_VERITABANI (zemin: bağlantı açıkken ikisi de 204).\"",
  "\"Eklenti, semaDurumu ulasilamiyor döndüren ve her islem çağrısında hata fırlatan sahte veritabanı nesnesiyle kurulur: GET /health/live 204 ve gövdesiz, sahte nesneye hiç çağrı yok; /health/ready 503 ISLETIM_HAZIR_DEGIL_VERITABANI (zemin: gerçek test veritabanıyla ikisi de 204).\"");

// 2) process type comes only from ayarlariYukle({ surec }); env var removed
rep('data5.js', "  ['ISLETIM_SUREC', 'genel.surec', 'api | isci | goc | cli; ayarlariYukle bağımsız değişkeniyle aynı olmalı', 'Compose verir', 'hepsi', 'D15'],\n", '');
rep('data5.js',
  "  ['ISLETIM_KOPYA_ADI', 'genel.kopyaAdi', '^[a-z0-9-]{1,32}$', 'surec adı', 'api (uretim ve hazirlik zorunlu)', 'D15'],",
  "  ['ISLETIM_KOPYA_ADI', 'genel.kopyaAdi', '^[a-z0-9-]{1,32}$; süreç türü ortamdan değil ayarlariYukle({ surec }) bağımsız değişkeninden gelir', 'süreç türünün adı', 'api (uretim ve hazirlik zorunlu)', 'D15'],");
rep('data5.js',
  "  ['ALAN_ADI', 'genel.alanAdi', 'küçük harf ana makine adı', 'yok', 'api, isci', 'D15'],",
  "  ['ALAN_ADI', 'genel.alanAdi', 'küçük harf ana makine adı', 'yok', 'isci (sertifika denetimi ve uyarı metni; Caddy kendi ortamından okur)', 'D15'],");
rep('data5.js',
  "  ['PANEL_ADRESI', 'genel.panelAdresi', \"https kökeni (yol yok); http yalnız gelistirme\", 'yok', 'api, isci', 'D13, D01'],",
  "  ['PANEL_ADRESI', 'genel.panelAdresi', \"https kökeni (yol yok); http yalnız gelistirme\", 'yok', 'api', 'D13 (Origin), D01 (çerez)'],");

// 3) worker joins onyuz so the certificate check reaches caddy:443
rep('data5.js',
  "'aynı sunucu imajı; komut node src/worker.ts (D14)', 'veritabani (dışarı çıkış açık)',",
  "'aynı sunucu imajı; komut node src/worker.ts (D14)', 'onyuz (caddy:443 sertifika denetimi için), veritabani; dışarı çıkış açık',");

// 4) startup refuses a database behind the image's migrations
rep('data2.js',
  "{ from: 'VERITABANI_BEKLENIYOR', to: 'HAZIR', by: 'server.ts', when: 'semaDurumu ulasilamiyor dışında bir sonuç verdi; iş kuyruğu (D14, rol api) ve e-posta kuruldu, app.ts uygulamayı kurdu, listen başladı. /health/live 204.' },",
  "{ from: 'VERITABANI_BEKLENIYOR', to: 'HAZIR', by: 'server.ts', when: 'semaDurumu hazir döndü; iş kuyruğu (D14, rol api) ve e-posta kuruldu, app.ts uygulamayı kurdu, listen başladı. /health/live 204.' },\n      { from: 'VERITABANI_BEKLENIYOR', to: 'KAPANDI', by: 'server.ts', when: 'semaDurumu geride: imajın beklediği göç uygulanmamış; ISLETIM_SEMA_GERIDE loglanır, çıkış kodu 1. Yeni şemayı bekleyen kod trafiğe çıkmaz; yayın betiği göçü API\\'den önce çalıştırır.' },");
rep('data2.js',
  "when: '120 saniye içinde veritabanına ulaşılamadı (1, 2, 4, 8, 10 saniye aralıkla denendi): çıkış kodu 1, Docker yeniden başlatır.' },",
  "when: '120 saniye içinde semaDurumu ulasilamiyor ya da nesil_belirsiz durumundan çıkmadı (1, 2, 4, 8, 10 saniye aralıkla denendi): çıkış kodu 1, Docker yeniden başlatır.' },");
rep('data5.js',
  "semaDurumu ulasilamiyor dışında bir şey dönene kadar en çok 120 saniye bekle.\",",
  "semaDurumu hazir dönene kadar en çok 120 saniye bekle (ulasilamiyor ve nesil_belirsiz beklenir; geride hemen çıkış 1, ISLETIM_SEMA_GERIDE).\",");
rep('data5.js',
  "  ['ISLETIM_YUK_TOHUMU_YASAK', 'süreç', 'test/yuk/tohum.ts', 'Tohum betiği uretim ortamında çalıştırıldı.'],",
  "  ['ISLETIM_YUK_TOHUMU_YASAK', 'süreç', 'test/yuk/tohum.ts', 'Tohum betiği uretim ortamında çalıştırıldı.'],\n  ['ISLETIM_SEMA_GERIDE', 'süreç', 'server.ts açılışı', 'Veritabanı imajın beklediği göçün gerisinde; süreç açılmaz.'],");

// 5) measurement views exclude the demo course and review accounts
rep('build.js',
  "çıktıda kişi kimliği, numara, isim yoktur. Bir modül",
  "çıktıda kişi kimliği, numara, isim yoktur. Deneme dersinin (dersler.deneme_dersi) oturumları ve kayıtları ile inceleme hesaplarının (kisiler.inceleme_hesabi) sayaçları ve ekran süreleri hiçbir görünüme girmez (plan.html#kararlar-inceleme-hesaplari). Bir modül");

// 6) wording and file list
rep('data4.js',
  "(2) D15 okuduklarına bileşim kökü yoluyla D01 (kimlikOlayiDinleyicisiKaydet, oturumlariKapat; D01-A14), D03 (LISTELER_GIZLI_ALANLAR, sözleşme sabiti) ve D04 (saat arayüzü simdi ve test saati) ekli; infra/izleme bunları içe aktarmaz.",
  "(2) D15'in okuduklarına bileşim kökü yoluyla D01 (kimlikOlayiDinleyicisiKaydet, oturumlariKapat; D01-A14), D03 (LISTELER_GIZLI_ALANLAR, sözleşme sabiti) ve D04 (saat arayüzü simdi ve test saati) eklensin; infra/izleme bunları içe aktarmaz.");
rep('build.js',
  "C('compose.yaml'), C('docker/caddy/Caddyfile'), C('docker/xprem/'), C('.github/workflows/'),",
  "C('compose.yaml'), C('docker/caddy/Caddyfile'), C('docker/xprem/'), C('.github/workflows/ (kalite, guvenlik, haftalik, yayin-sunucu, yayin-ota)'), C('.github/dependabot.yml'),");

if (bad) { console.log(bad + ' replacement(s) failed'); process.exit(1); }
console.log('patch1 ok');
