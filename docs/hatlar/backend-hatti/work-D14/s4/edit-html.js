// One-shot edit of the fragment generator in build-d14.js (each anchor must occur exactly once).
'use strict';
const fs = require('fs');
const path = require('path');
const F = path.join(__dirname, 'build-d14.js');
let b = fs.readFileSync(F, 'utf8');
const NL = String.fromCharCode(92) + 'n'; // the two characters backslash and n, as written in the generator source
const rb = (a, c) => { const n = b.split(a).length - 1; if (n !== 1) throw new Error('anchor count ' + n + ': ' + a.slice(0, 70)); b = b.replace(a, () => c); };

// 1. reads row
rb("H.push(row('Okuduğu modül', `Yalnız D12: ${code('islem(fn)')}, ${code('veritabani')}, ${code('kisitAdi')}, ${code('testVeritabaniHazirla()')}. Saat, ayarlar, gizli anahtarlar ve log bileşim kökünden parametreyle gelir (${a('teknik', 'sunucu-mimari', 'Mimari')}); ${code('worker.ts')} bileşim kökü olarak D04 saatini, D15 ayarlarını, D13'ün ${code('app.ts')} kurucusunu ve 15 modülün ${code('jobs/<modül>/index.ts')} listesini bağlar.`));",
  "H.push(row('Okuduğu modül', `D12: ${code('islem(fn)')}, ${code('veritabani')}, ${code('kisitAdi')}, ${code('tabloYardimcilari')}, ${code('testVeritabaniHazirla()')}. D04: ${code('Saat')} tipi (${code('{ simdi(): number }')}). D13: ${code('hataKodlariTanimla')} ve istek kimliği. Ayarlar, gizli anahtarlar ve log bileşim kökünden parametreyle gelir (${a('teknik', 'sunucu-mimari', 'Mimari')}). ${code('worker.ts')} bileşim kökü olarak D15'i (${code('ayarlariYukle')}, ${code('logOlustur')}, ${code('gizliAnahtar')}, ${code('isletimIsleri')}), D12'yi (${code('veritabaniKur')}, ${code('veritabaniIsleri')}), D13'ü (${code('app.ts')} kurucusu, ${code('yayinBilgisiYukle')}), D04'ü (${code('sistemSaati')}) ve 15 modülün ${code('jobs/<modül>/index.ts')} listesini bağlar (İşçi açılışı tablosu).`));");

// 2. endpoints paragraph
rb("Kurucular yalnız bileşim köklerine ve teste açıktır.</p>`);",
  "Kurucular yalnız bileşim köklerine ve teste açıktır; test desteği (${code('isKuyrugunuBosalt')}, ${code('isiCalistirVeBekle')}, ${code('kuyruktakiIsler')}, ${code('zamanlamaliOrnekAc')}, ${code('sahtePostaKutusu')}) yalnız teste.</p>`);");

// 3. link rule table after the templates details
const constTail = "+ '" + NL + "' + table(['Sabit', 'Değer', 'Kaynak'], S.constants.map(c => [code(c.ad), esc(c.deger), esc(c.kaynak)]))));";
rb(constTail, constTail + "\nH.push(det('Bağlantı denetimi: kural ve örnekler (ürün türünde ret, ürün dışı türde [adres])', `<p>Kural ${code('infra/eposta/baglanti-denetimi.ts')} içinde; örnekler aynı tablodan teste içe alınır. Dayanak: ${a('plan', 'kararlar-e-posta-gonderimi', 'E-posta gönderimi')} (bağlantı yok).</p>" + NL + "` + table(['Kural', 'Yakalar', 'Geçer'], S.baglanti_kurali.map(k => [esc(k.kural), esc(k.yakalar), esc(k.gecer)]))));");

// 4. worker start-up table after the queue policy details
const qpLine = "H.push(det('Kuyruk politikası: her kuyruğun ayarı açık, pg-boss varsayılanına bırakılmaz', table(['Ayar', 'Değer', 'Not'], S.queue_policy.map(p => [code(p.ayar), esc(p.deger), esc(p.not)]))));";
rb(qpLine, qpLine + "\nH.push(det('İşçi açılışı ve kapanışı: worker.ts sırası ve çıkış kodları (78 yapılandırma, 1 öbür hata)', `<p>Sıra ${code('worker.ts')} içindeki ${code('ISCI_ACILIS_ADIMLARI')} sabitidir; test çağrı kaydını bununla karşılaştırır. Kapanma bekleme süresi 40 saniye (${a('teknik', 'altyapi-imaj', 'İmaj ve kapanış')}).</p>" + NL + "` + table(['Adım', 'Ne yapar', 'Hata', 'Çıkış'], S.worker_acilisi.map(w => [esc(w.adim), esc(w.ne), esc(w.hata), esc(w.cikis)]))));");

// 5. schedule summary
rb('"Gece çizelgesi: pg-boss işleri İstanbul saatiyle, 03:00-05:00 yedek penceresi boş (öneri yerleşim; kuralları test denetler)"',
  '"Gece çizelgesi: pg-boss işleri İstanbul saatiyle, 03:00-05:00 penceresi pg-boss işlerine kapalı (öneri yerleşim; kuralları test denetler)"');

// 6. error codes
rb("HTTP ucu olmadığından hepsi iç hatadır: istemciye yalnız genel hata ve istek kimliği döner (${a('teknik', 'sunucu', 'Sunucu, Çatı')}).</p>`);",
  "HTTP ucu olmadığından hepsi iç hatadır: D13 kataloğu için her kod http 500 ve ${code('IS_KUYRUGU_GENEL_HATA_METNI')} taşır, istemciye yalnız genel hata ve istek kimliği döner (${a('teknik', 'sunucu', 'Sunucu, Çatı')}).</p>`);");
rb("table(['Kod', 'Ne zaman', 'Sonuç'], S.error_codes.map(e => [code(e.kod), esc(e.ne_zaman), esc(e.sonuc)]))));",
  "table(['Kod', 'HTTP', 'Ne zaman', 'Sonuç'], S.error_codes.map(e => [code(e.kod), esc(e.http), esc(e.ne_zaman), esc(e.sonuc)]))));");

// 7. resolved gap summary count
rb("H.push(det(`${S.resolved_gaps.length} boşluk kararla kapandı (üçünün kalan parçası açık noktada)`,",
  "const acikBagli = S.resolved_gaps.filter(g => /D14-A\\d\\d/.test(g.decision)).length;\nH.push(det(`${S.resolved_gaps.length} boşluk kararla kapandı (${acikBagli} tanesinin kalan parçası açık noktada)`,");

fs.writeFileSync(F, b);
console.log('edited');
