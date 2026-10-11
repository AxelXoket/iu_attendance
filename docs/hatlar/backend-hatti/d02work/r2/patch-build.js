// Applies the r2 narrative changes to build.js. Each search string must occur exactly once; otherwise the patch stops.
const fs = require('fs'), path = require('path');
const f = path.join(__dirname, 'build.js');
let s = fs.readFileSync(f, 'utf8');
const rep = (from, to) => {
  const n = s.split(from).length - 1;
  if (n !== 1) { console.log(`BULUNAMADI ya da tekil değil (${n}): ${from.slice(0, 90)}`); process.exit(1); }
  s = s.replace(from, () => to);
};
const lineStarting = (prefix) => { const i = s.indexOf(prefix); if (i < 0) { console.log('satır yok: ' + prefix); process.exit(1); } const j = s.indexOf('\n', i); return s.slice(i, j); };

// summary
rep(lineStarting('  summary: "D02 (dersler)'), '  summary: "D02 (dersler) birimi, bölümü, genel dönemi, birim takvimini, birim ve dönem kilidini, dersi, şubeyi ve haftalık programı tutar; oturumları programdan dönemin tamamı için önceden üretir ve her değişiklikte yalnız başlamamış oturumları saf bir plan fonksiyonuyla yeniden hesaplayıp farkı yazar. Oturum bir program saatinin tek buluşmasıdır ve hiç silinmez: iptal, taşıma, telafi, tek oturum düzenlemesi ve \\"Ders yapıldı mı?\\" cevabı oturum satırında ve değişiklik geçmişinde iz bırakır, sayımı D08 ve D10 oturum durumundan okur. Yerel program saati UTC ana PostgreSQL\'in saat dilimi verisiyle (AT TIME ZONE \'Europe/Istanbul\') çevrilir; kilit dahil kural taşıyan her an bileşim kökünün verdiği saat arayüzünden gelir, kilit anı son günün ertesi 00:00 İstanbul\'dur. Pencere hesabı (D04) üretim dinleyicisi, kilit kapanışı (D07) kilit adımı olarak D02\'ye kaydolur; telefona inen beş tablo işlem başına tek D06 sürümüyle damgalanır ve D06\'nın kapsamına göre beş genel kaynaktan iner, personel kapsam kaynağı D02\'nindir. Deneme dersini D02 kendisi kurar (çekme modeli); inceleme hesabı deneme dersi dışında hiçbir şey yazamaz. Ürün kararı isteyen 11 soru önerilen varsayılanla açık noktada bekliyor; 3 sözleşme eki (liste kaynağı, deneme dersi, dönem arası) contracts.json\'a, 4 komşu eki (D14 çizelgesi, D04 dinleyicisi, D07 ile D08 ile D09 ile D10 adları, D03 kapsamı) ilgili modüllere işlenmeli.",');
rep('  open_points: P4.open_points,\n', '  open_points: P4.open_points,\n  denetim_olaylari: P4.denetim_olaylari,\n');

// Amaç ve sınırlar
rep(lineStarting("P(row('Çağırdığı dış yüzler'"), "P(row('Çağırdığı dış yüzler', esc('D01 kisiGetir, personelRolleri, yetkiDenetle, incelemeHesaplari, kimlikOlayiDinleyicisiKaydet; D06 surumAl [yaprak], indirmeKaynagiKaydet; D08 devamHesaplaIsiKoy [yaprak] ve DEVAM_NEDENLERI (sözleşme sabiti); D09 denetimeYaz [yaprak]; D12 islem, kisitAdi, tabloYardimcilari, testVeritabaniHazirla, veritabani_degismez_sutun (SQL işlevi); D13 rotalariKaydet, uygulamaHatasi, hizSinifi; D14 isGonder, isTanimla. D03, D04, D05 ve D07 içe aktarılmaz; yaprak.ts yalnız D06, D08, D09 yapraklarını ve D12\\'yi içe aktarır.')));");
rep(lineStarting("P(row('Ona kaydolanlar'"), "P(row('Ona kaydolanlar', esc('D04 pencereleriHesapla (oturumUretimDinleyicisiKaydet, OturumUretimOlayi uyarlayıcısıyla, D02-A16), D07 donemKilidiKararKapanisi sarmalayıcısı (kilitAdimiKaydet), D03 liste kaynağı (listeKaynagiKaydet, yalnız etkinSatirlar, sözleşme eki D02-A12). D02 de kendi eklentisinde D06\\'ya beş genel kaynak ve personel kapsam kaynağı, D01\\'e kimlik olayı dinleyicisi olarak kaydolur; kayıtlar app.ts ve worker.ts\\'te aynıdır.')));");
rep(lineStarting("P(row('Kod yeri'"), "P(row('Kod yeri', esc('apps/server/src/modules/dersler/ (dış yüz index.ts; D01\\'in içe aktardığı okuma işlevleri yaprak.ts içinde; kuyruk tanımları kuyruklar.ts, kapsam kaynağı kapsam.ts, D01 dinleyicisi dinleyiciler.ts), jobs/dersler/ (export const isler), packages/core/src/dersler/ (saf üretim planı ve takvim kuralları), packages/contracts/src/dersler.ts (şemalar, rota listesi, DERSLER_ hata kodları, OTURUM_TURLERI ve öbür değer sabitleri, OturumUretimOlayi, dersler.* denetim olay şemaları). Dosya döngüsü yok: dersler/tablolar.ts D01\\'in tablo tanımını içe aktarmaz, kisiler yabancı anahtarları yalnız göç SQL\\'inde kurulur ve şema testi denetler; bu yüzden yaprak.ts ve tablolar.ts\\'ten modules/kimlik\\'e yol yoktur (dependency-cruiser no-circular, X24). Göçler apps/server/migrations/<UTC zaman>_dersler_<açıklama>/ altında, yalnız D02 tablolarına dokunur.')));");
rep(lineStarting("P(row('Ölçülen sonuç'"), "P(row('Ölçülen sonuç', lnk('Program kaydından sonra oluşan planlı oturum sayısı takvimden gün gün sayılanla eşittir (davranış ve özellik testi); takvim işinin gece onarımının dersler.yenileme.fark log satırı sıfır kalmalı. Cevapsız oturum oranı (oturumlar.yapildi, D15\\'in ölçüm görünümü okur) dönem sonu çıktısı engelini önceden gösterir. Toplu cevapla \"Ders yapıldı mı?\" ekranı ders başına 2 dakika hedefinde kalır (plan.html#hedefler). Her üretim dersler.uretim log satırı yazar: dersId, eklenen, güncellenen, iptal, geri alınan, süre; numara ve isim yok. Deneme işi her çalışmada dersler.deneme log satırı (kuruldu, sahip değişti, eklenen oturum) ya da dersler.deneme.hoca_yok uyarısı yazar.')));");

// endpoints intro
rep("Bir istek uçun kendi kurallarına göre birden çok nedenle reddedilecekse dönen kodu bu sıra belirler: kimlik ve rol (D13), kaynak yetkisi (404), dönem kilidi (DERSLER_DONEM_KILITLI), arşiv (DERSLER_DERS_ARSIVDE), deneme dersi, alan kuralları;",
    "Oluşturan uçlar yeni kayıtta da tekrarda da 200 döner (D13-B12). Durum çakışmaları 409, gövde ve şema hataları 400, sonucu 2000 satırı aşan liste 422 API_SONUC_COK_BUYUK (D13-B02, D13-B13). Bir istek uçun kendi kurallarına göre birden çok nedenle reddedilecekse dönen kodu bu sıra belirler: kimlik ve rol (D13), inceleme hesabı (403 DERSLER_INCELEME_HESABI), kaynak yetkisi (404), dönem kilidi (DERSLER_DONEM_KILITLI), arşiv (DERSLER_DERS_ARSIVDE), deneme dersi, alan kuralları;");

// production rule
rep("  '       silinmemiş program saatleri ve şube kümeleri, ders ayarı (süre, QR),',",
    "  '       silinmemiş ve en az bir etkin şubesi olan program saatleri ve şube kümeleri, ders ayarı (süre, QR),',");
rep("  '   anahtarı istenende, m iptal (program, takvim, tatil, sinav_haftasi) -> geri al',",
    "  '   anahtarı istenende, m iptal (program, takvim, tatil, sinav_haftasi) -> geri al (güncel program değerleriyle,',\n  '                                                                         elle düzenlenmişse kendi değerleri)',");
rep("  'istenende olup mevcutta olmayan başlamamış her oluşum                  -> ekle',",
    "  'istenende olup mevcutta olmayan, başlangıcı şimdiden sonra olan oluşum  -> ekle',\n  'güncellemeyle yeni başlangıcı şimdiye eşit ya da geçmişte kalacak m     -> dokunulmaz (BUGUNKU_OTURUM_KORUNDU)',");
rep("  'uygula (tek işlem): ders FOR UPDATE, plan, INSERT ve UPDATE (anlar AT TIME ZONE ile),',\n  '   oturum_degisiklikleri, dinleyiciler (D04), denetim (D09), D08 işi, en son surumAl (D06)',",
    "  'uygula (tek işlem): ders FOR UPDATE ve sahip yeniden denetimi, plan, INSERT ve UPDATE (surum 0, anlar AT TIME ZONE ile),',\n  '   oturum_degisiklikleri, dinleyiciler (D04; satır yazar, surumAl çağırmaz, damgasını surumleDamgala ile bırakır),',\n  '   denetim (D09), D08 işi (DEVAM_NEDENLERI.PROGRAM), en son tek surumAl (D06): D02 satırları ve dinleyici damgaları aynı sürümle',");

// download section
const indirmeBas = s.indexOf("P('<p><strong>İndirme kaynağı</strong>");
const indirmeSon = s.indexOf("].map(x => `<li>${lnk(x)}</li>`).join('') + '</ul>');", indirmeBas);
if (indirmeBas < 0 || indirmeSon < 0) { console.log('indirme bölümü yok'); process.exit(1); }
const indirmeYeni = `P('<p><strong>İndirme kaynakları</strong> (D06.indirmeKaynagiKaydet ile kayıtlı; zarf, imleç, sayfa kesme ve baştan indirme kararı D06\\'nındır, D06-B15):</p>');
P('<ul>' + [
  'Beş genel kaynak: dersler, program_saatleri, oturumlar, takvim_tatilleri, kilit (GenelKaynak, roller OGRENCI ve PERSONEL). Her biri degisenler(tx, { kapsam, surumden, surumeKadar, adet }) ile sürümü (surumden, surumeKadar] aralığındaki satırları sürüm sırasıyla en çok adet kadar döner; surumden null tam indirmedir; imleçten eski sürüm hiç dönmez, böylece D06\\'nın sayfa kesmesi her sayfada ilerler. Satır biçimi IndirilenSatir { id, surum, silindi, veri }; kilit satırının kimliği birimId:donemId.',
  'Süzgeç D06\\'nın Kapsam nesnesidir: dersler kapsam.dersler; program saati ve oturum, ders kapsamda ve şube kümesi kapsam.subeler ile kesişiyorsa; kilit, kapsamdaki derslerin (birim, dönem) çiftleri; tatil, bu birim dönemlerine bağlı takvimlerin tatilleri. Tatilin indirme sürümü GREATEST(tatil sürümü, bağlı birim dönemi sürümü): bağ değişince ya da ders yeni birime taşınınca birim dönemi damgalanır ve yeni takvimin eski tatilleri aralığa girer.',
  'Kapsam kaynakları: öğrenci kapsamı D03\\'ün (liste satırının şubesi; pasif satırda ders telefonda kalır, D03-B13); personel kapsamı D02\\'nin KapsamKaynagi(PERSONEL): kapsam() sahip olunan etkin derslerin ve kilitle ya da sahipsiz arşivlenip kilit anından 180 gün geçmemiş derslerin şube, ders ve birim kümeleri; degistiMi(kisi, kapsamSurumu, surumeKadar) kişinin sahip ya da önceki sahip olduğu bir dersin kapsam_degisim_surumu (kapsamSurumu, surumeKadar] içindeyse true (açılış, devir, hoca arşivi, sahipsiz arşiv, birim değişikliği, kilitten dönüş). Kapsam değişince D06 baştan indirir; kapsam olayı ya da sanal satır yoktur.',
  'silindi yalnız imleçten sonra değişip kullanıcının görme kapsamından çıkan satırda kullanılır: öğrencide şubesi kümeden çıkarılan program saati ve oturum { id, silindi: true } olarak gider (telefon elindeyse siler, hiç almamışsa yok sayar, şubesi çıkarılan öğrencinin telefonu o oturumda pencere açmaz); hocanın arşivlediği dersin yalnız ders satırı silindi: true olarak gider, öbür satırları dönmez. Kaldırılan program saati ve tatil silinme_ani\\'nden türeyen silindi: true ile, iptal oturum durumuyla iner. Tam indirmede silindi satırı gönderilmez.',
  'Arşiv: kilitle ya da sahipsiz arşivlenen ders kilit anından 180 gün sonrasına kadar kapsamda kalır (telefonda Dönem kapandı; başlangıç değeri, telefon aynı kuralla yerel dersi siler).',
  'Sütunlar: kafa sayısı ve yapıldı hiçbir telefona inmez (hoca çevrimiçi uçlardan okur); ders satırında birimId, donemId ve takipBaslangici iner; hocanın görünen adı sayfa başına sahip başına bir kez D01.kisiGetir ile.',
`;
s = s.slice(0, indirmeBas) + indirmeYeni + s.slice(indirmeSon);

// exports summary and audit events
rep("P(`<details><summary>Dış yüz (${spec.exports.length} işlev): sözleşmedeki 16, sözleşme eki 3, bileşim kökü 2</summary>`);",
    "P(`<details><summary>Dış yüz (${spec.exports.length} işlev): sözleşmedeki 16, sözleşme eki 6 (liste kaynağı, deneme dersi, dönem arası, hocanın dersleri, oturum sayfası; denemeDersiniKur kaldırıldı), bileşim kökü 3</summary>`);");
rep("P(`<p>Denetim olay türleri (D09.denetimeYaz, önceki ve sonraki değerle, numara ve isim yok): ${P4.denetim_olaylari.map(code).join(', ')}.</p>`);",
    "P(`<details><summary>${P4.denetim_olaylari.length} denetim olay türü (D09.denetimeYaz; şemalar packages/contracts/src/dersler.ts\\'te, alan adları D09\\'un yasak adlarıyla çakışmaz, her olay 8 KB altında)</summary>`);\nP('<table>');\nP(th(['Tür', 'Önceki', 'Sonraki', 'Ayrıntı']));\nfor (const x of P4.denetim_olaylari) P(tr([code(x.tur), esc(x.onceki), esc(x.sonraki), esc(x.ayrinti)]));\nP('</table>');\nP('</details>');");

// error code intro
rep("Başka hocanın kaynağı varlığı sızdırmamak için 404 döner; 409 yalnız çevrimiçi panel işlemlerinde.",
    "Başka hocanın kaynağı varlığı sızdırmamak için 404 döner; 403 yalnız ilke düzeyi red (inceleme hesabı); 409 sunucu durumuyla çakışma ve beklenen numara uyuşmazlığı; 400 yalnız gövdeden anlaşılan hata; sonuç büyüklüğü D13\\'ün 422 API_SONUC_COK_BUYUK kodudur (D13-B02).");

// open points callout
rep("${spec.open_points.filter(o => !o.needs_owner).length} sözleşme eki contracts.json'a işlenmeli.",
    "${spec.open_points.filter(o => !o.needs_owner).length} sözleşme ya da komşu eki contracts.json\\'a ve ilgili modüle işlenmeli.");
rep("${o.needs_owner ? 'sahip kararı' : 'sözleşme eki'}", "${o.needs_owner ? 'sahip kararı' : 'sözleşme ya da komşu eki'}");

fs.writeFileSync(f, s, 'utf8');
console.log('build.js yamandı');
