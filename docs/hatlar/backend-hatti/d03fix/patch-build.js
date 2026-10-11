// One-time patch of build-d03.js (fragment prose and checks) for the review round. Fails loudly if a marker is missing.
'use strict';
const fs = require('fs');
let s = fs.readFileSync('build-d03.js', 'utf8');
const rep = (a, b) => { if (s.split(a).length !== 2) throw new Error('not unique: ' + a.slice(0, 80)); s = s.replace(a, () => b); };
const lineStarting = (p, b) => {
  const L = s.split('\n'); const i = L.findIndex(l => l.startsWith(p));
  if (i < 0 || L.findIndex((l, j) => j > i && l.startsWith(p)) >= 0) throw new Error('line ' + p);
  L[i] = b; s = L.join('\n');
};
// 1. exports check: contract exports must be present; extras must be marked as contract additions
rep("sameSet(K.exports_.map(e => e.name), mod.exports.map(s => s.split('(')[0].trim()), 'exports');",
  "{ const have = new Set(K.exports_.map(e => e.name)); const want = mod.exports.map(s => s.split('(')[0].trim());\n  for (const n of want) ok(have.has(n), `exports: missing ${n}`);\n  for (const e of K.exports_) if (!want.includes(e.name)) ok(/^Sözleşme eki \\(/.test(e.purpose), `exports: extra ${e.name} not marked 'Sözleşme eki'`); }");
// 2. spec gets kayitlar
rep("  exports: K.exports_,\n", "  exports: K.exports_,\n  kayitlar: K.kayitlar,\n");
// 3. Amaç ve sınırlar rows
lineStarting("H.push(row('Çağırdığı dış yüzler'", "H.push(row('Çağırdığı dış yüzler', `D02 ${c('subeGetir')} ve ${c('dersGetir')} (yazmada paylaşımlı kilitle, D03-A07), ${c('dersYetkisi')}, ${c('dersSubeleri')}, ${c('oturumlariGetir')}, ${c('kilitDurumu')}, ${c('kilitliBirimDonemleri')}, ${c('takvimGetir')}, ${c('listeKaynagiKaydet')}; D06 ${c('surumAl')}, ${c('indirmeKaynagiKaydet')}; D09 ${c('denetimeYaz')}; D12 ${c('islem')}, ${c('saklamaIsleyicisiKaydet')}, ${c('kisitAdi')}; D13 ${c('rotalariKaydet')}, ${c('uygulamaHatasi')}, ${c('istekKimligi')}, ${c('hizSinifi')}, ortak şemalar (${c('kimlikSemasi')}, ${c('ogrenciNoSemasi')}, ${c('sayfaSorgusuSemasi')}).`));");
lineStarting("H.push(row('Onu çağıranlar'", "H.push(row('Onu çağıranlar', `D01 (${c('numaraIleEslestir')}, ${c('ogrencininEtkinSatirlari')}, ${c('denemeListesiniKur')}; ESLESTIRME dinleyicisi), D02 (kayıtlı liste kaynağı: ${c('etkinSatirlar')}, ${c('pasiflesenSatirlar')}), D04 (${c('ogrencininEtkinSatirlari')}), D06 (indirme ve öğrenci kapsam kaynağı), D07 (${c('uyelikDenetle')}, ${c('satirGetir')}; KARAR dinleyicisi), D08 (${c('listeSatirlari')}, ${c('satirGetir')}, ${c('muafIsaretle')}; HESAP dinleyicisi), D09 (${c('listeSatirlari')}, ${c('satirGetir')}, ${c('ogrencininEtkinSatirlari')}, ${c('ogrencininSatirlari')}), D12 (saklama işleyicisi), D15 (${c('LISTELER_GIZLI_ALANLAR')}, log biçimlendiricisi). D05 D03'ü çağırmaz. D10 tabloları yalnız okur (${L('teknik', 'sunucu-mimari', 'Mimari')} istisnası).`));");
lineStarting("H.push(row('Kayıt deseni'", "H.push(row('Kayıt deseni', `D03 öbür alan modüllerini içe aktarmaz: liste değişikliği ${c('listeDegisikligiDinleyicisiKaydet')} ile kayıtlı dinleyicilere gider (uyarlayıcılar karşı modüllerde, D03-A11). D03 kendisi ${c('eklenti.ts')} içinde şunlara kaydolur:` + ul(K.kayitlar.map(t))));");
// 4. Tablolar intro
rep("<p>Üç tablo; adlar ve kısıtlar D12-B01 kuralıyla,", "<p>Üç tablo; kısıt ve dizin adlarının hepsi ${c('kisitAdi(tablo, gerçek sütun listesi, tür)')} çıktısıdır (D12-B01; çok sütunlu CHECK'te bütün sütunlar adda, hepsi 63 baytın altında); dizinsiz yabancı anahtarlar ${c('@dizinsiz-kabul')} yorumlu (D12-B15);");
// 5. Uç noktalar intro
rep("yazmalar ${c('beklenenListeSurumu')} taşır.</p>`);", "${c('satirlar')} ve PATCH ${c('beklenenListeSurumu')}, uygula önizlemenin ${c('farkOzeti')} değerini taşır; hata sırası her yazma ucunun açıklamasında.</p>`);");
// 6. İşler
lineStarting("H.push(`<p>D03'ün zamanlanmış işi ve kuyruk öğesi yok.", "H.push(`<p>D03'ün zamanlanmış işi ve kuyruk öğesi yok. Liste uygulaması eşzamanlı, tek işlemdedir; bekleyen kayıt eşleşmesi aynı işlemde dinleyiciyle yürür, karar yenilemeyi D07'nin, devam hesabını D08'in dinleyicisi aynı işlemde kendi işiyle kuyruğa koyar. ${c('apps/server/src/jobs/listeler/index.ts')} iskeletin ${c('worker.ts')} toplaması için boş liste döner.</p>`);");
lineStarting("H.push(row('İndirme kaynağı'", [
  "H.push(row('İndirme kaynağı', `D06'ya ${c(\"indirmeKaynagiKaydet('liste_satirlari', { tur: 'genel', roller: ['OGRENCI', 'PERSONEL'], degisenler })\")}: ${c('degisiklik_surumu')} aralığı (surumden, surumeKadar], surum ve id artan, en çok adet; tek sürümlük aralıkta adet uygulanmaz (D06 sayfa kesme); surumden null tam indirme. Personele Kapsam.subeler'in satırları sira dahil, öğrenciye yalnız kendi numarasının satırları; teyitsiz öğrencide adSoyad null. Pasif satır ${c('pasifAni')} ile, personelde anonim satır ${c('silindi')} true ve veri null ile iner (${L('plan', 'kararlar-indirme', 'İndirme')}). Ayrıntı D03-B27.`));",
  "H.push(row('Öğrenci kapsam kaynağı', `D06'ya ${c(\"indirmeKaynagiKaydet('ogrenci_liste_kapsami', { tur: 'kapsam', rol: 'OGRENCI', kapsam, degistiMi })\")}: kapsam numaranın anonim olmayan satırlarının şube, ders ve birim kümesi; degistiMi yalnız ${c('uyelik_surumu')} (kapsamSurumu, surumeKadar] içindeyse ya da arada bir anonimleştirme olduysa true. Ad ve sıra değişikliği öğrencilere baştan indirme yaptırmaz; devirde D03 ${c('sahipAtamaSurumu')} okumaz. Sahiplik ve teyit değişimi D03-A09'da.`));",
  "H.push(row('Liste kaynağı (D02)', `D02'ye ${c('listeKaynagiKaydet({ etkinSatirlar, pasiflesenSatirlar })')}: şube pasifleştirme denetimi ve çakışma ucu için; ayrıntı Kayıt deseni satırında. Kayıt yoksa D02'nin eklentisi açılmaz; açılış testi app.ts ve worker.ts'i kurup denetler.`));"
].join('\n'));
lineStarting("H.push(row('Saklama işleyicisi'", "H.push(row('Saklama işleyicisi', `D12'ye ${c(\"saklamaIsleyicisiKaydet('listeler.liste_satirlari', { islem: 'anonimlestirme', partiIsle })\")}. ${c('partiIsle({ tx, sinirAni, partiBoyutu })')}: ${c('D02.kilitliBirimDonemleri(tx)')} ile kilit anı ${c('sinirAni')}'ye eşit ya da önce olan (birim, dönem) çiftleri kilit anı sırasıyla alınır (D12-B22: saklama birim döneminin kilit anından başlar); ilk çiftin ${c('silinme_ani IS NULL')} satırlarından en çok partiBoyutu tanesi ${c('liste_satirlari_birim_id_donem_id_idx')} ile seçilir; numara ve ad NULL, ${c('silinme_ani')} işlem anı; son adımda tek ${c('surumAl')}, ${c('degisiklik_surumu')} ve ${c('uyelik_surumu')} bu değer; dönüş ${c('{ satirSayisi, donemId, bitti }')}, seçilen partiBoyutu'ndan azsa ve başka çift kalmadıysa bitti true. Birimsiz deneme dersi seçilmez. Kova kilidi almaz (kilitli dönemin satırı eşleşmeye girmez). D12 işleyiciyi ayrı işlemde çağırır, kanıtı ${c('saklama_islemleri')}'ne kendisi yazar (D12-B23). ${c('liste_yuklemeleri')} ve ${c('sube_listeleri')} kişisel veri taşımadığından dokunulmaz.`));");
// 7. Uygula steps
const i0 = s.indexOf("H.push('<p><strong>Uygula işlemi adım adım</strong>");
const i1 = s.indexOf("H.push('</div>');", s.indexOf("Kilit sırası her yazmada aynıdır"));
if (i0 < 0 || i1 < 0) throw new Error('steps');
const steps = fs.readFileSync('parca-adimlar.txt', 'utf8');
s = s.slice(0, i0) + steps + s.slice(i1);
// 8. okuma hattı: şube süzme
rep("tamamen boş ve dipnot satırları atlanır, 2.000'den çok dolu satır COK_FAZLA_SATIR.`,", "tamamen boş ve dipnot satırları atlanır; şube sütunu varsa satırlar core ${c('sube.ts')} anahtarıyla seçilen şubeye göre süzülür, dışarıda kalanlar ayrı gösterilir (D03-B15); süzmeden sonra 2.000'den çok dolu satır COK_FAZLA_SATIR.`,");
fs.writeFileSync('build-d03.js', s);
console.log('patched');
