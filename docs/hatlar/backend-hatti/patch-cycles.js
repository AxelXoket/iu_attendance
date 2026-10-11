// One-shot patch of build-contracts.js: removes avoidable two-way module calls. Each old string must occur exactly once.
const fs = require('fs'), f = __dirname + '/build-contracts.js';
let s = fs.readFileSync(f, 'utf8');
const rep = (a, b) => { const n = s.split(a).length - 1; if (n !== 1) throw new Error(`expected 1 match, got ${n}: ${a.slice(0, 70)}`); s = s.replace(a, () => b); };

s = s.replace(/const READS = \{[\s\S]*?\n\};\n/, () => `const READS = {
  D01: ['D02', 'D03', 'D07', 'D09', 'D12', 'D13', 'D14', 'D15'],
  D02: ['D01', 'D06', 'D08', 'D09', 'D12', 'D13', 'D14'],
  D03: ['D02', 'D06', 'D09', 'D12', 'D13'],
  D04: ['D01', 'D02', 'D03', 'D06', 'D09', 'D12', 'D13', 'D14', 'D15'],
  D05: ['D01', 'D02', 'D03', 'D04', 'D06', 'D07', 'D08', 'D09', 'D11', 'D12', 'D13'],
  D06: ['D01', 'D12', 'D13'],
  D07: ['D01', 'D02', 'D03', 'D04', 'D05', 'D06', 'D08', 'D09', 'D11', 'D12', 'D13', 'D14', 'D15'],
  D08: ['D02', 'D03', 'D04', 'D05', 'D06', 'D09', 'D12', 'D13', 'D14'],
  D09: ['D01', 'D02', 'D03', 'D05', 'D06', 'D07', 'D08', 'D10', 'D12', 'D13', 'D14'],
  D10: ['D01', 'D02', 'D06', 'D08', 'D12', 'D13', 'D14'],
  D11: ['D01', 'D02', 'D04', 'D06', 'D09', 'D12', 'D13', 'D14', 'D15'],
  D12: [],
  D13: [],
  D14: ['D12'],
  D15: ['D06', 'D12', 'D13', 'D14'],
};
`);
rep(`'oranlariYaz(tx, dersId, oranlar)'],`, `'oranlariYaz(tx, dersId, oranlar)', 'oturumUretimDinleyicisiKaydet(dinleyici)', 'kilitAdimiKaydet(adim)'],`);
rep(`'muafIsaretle(tx, satirId, muaf)'],`, `'muafIsaretle(tx, satirId, muaf)', 'listeDegisikligiDinleyicisiKaydet(dinleyici)'],`);
rep(`'kesintiAraliklari(tx, aralik)'],`, `'kesintiAraliklari(tx, aralik)', 'oturumKapandiDinleyicisiKaydet(dinleyici)', 'kesintiKapandiDinleyicisiKaydet(dinleyici)'],`);
rep(`'epostaSiniriDenetle(tx, adresOzeti)'],`, `'epostaSiniriDenetle(tx, adresOzeti)', 'isSagligi(tx): kuyruk ve zamanlama sağlığı'],`);
rep(`'denetimeYaz(tx, olay)',`, `'denetimeYaz(tx, olay) [yaprak]',`);
rep(`'surumAl(tx)',`, `'surumAl(tx) [yaprak]',`);
rep(`'ogrenciDurumuDegisti(tx, ogrenciId)',`, `'ogrenciDurumuDegisti(tx, ogrenciId) [yaprak]',`);
rep(`'devamHesaplaIsiKoy(tx, dersId, ogrenciId, neden)',`, `'devamHesaplaIsiKoy(tx, dersId, ogrenciId, neden) [yaprak]',`);
rep(`D14: ['pgboss_bakimi', 'eposta_gonderim_temizligi', 'isletim_denetimi'],`, `D14: ['pgboss_bakimi', 'eposta_gonderim_temizligi'],`);
rep(`D15: ['dis_erisim_denetimi',`, `D15: ['isletim_denetimi', 'dis_erisim_denetimi',`);
rep(`'Oturum üretimi ve yeniden üretimi aynı işlemde D04.pencereleriHesapla çağırır.'`, `'Oturum üretimi ve yeniden üretimi aynı işlemde kayıtlı üretim dinleyicilerini çağırır; D04 pencereleriHesapla işlevini oturumUretimDinleyicisiKaydet ile kaydeder, D02 D04ü içe aktarmaz.'`);
rep(`'donem_kilidi işi aynı işlemde D07.donemKilidiKararKapanisi adımını çağırır.'`, `'donem_kilidi işi aynı işlemde kayıtlı kilit adımlarını sırayla çağırır; D07 donemKilidiKararKapanisi adımını kilitAdimiKaydet ile kaydeder.'`);
rep(`'Liste uygulanınca aynı işlemde D01.bekleyenKayitlariEslestir, D07.yenidenDegerlendir ve D08.devamHesaplaIsiKoy çağrılır.'`, `'Liste uygulanınca aynı işlemde kayıtlı liste dinleyicileri çağrılır: D01 bekleyenKayitlariEslestir, D07 yenidenDegerlendir, D08 devamHesaplaIsiKoy (listeDegisikligiDinleyicisiKaydet ile); D03 bu modülleri içe aktarmaz.'`);
rep(`belgeyi D04 üretir.'],`, `belgeyi D04 üretir.', 'oturum_pencere_kapat ve kesinti kapanışı kayıtlı dinleyicileri çağırır: D07 (pencere_beklemede_kesinlestir, yenidenDegerlendir), D08 (devam_hesapla), D11 (projeksiyon_baglanti_kapat); D04 bu modülleri içe aktarmaz.'],`);
rep(`şemaları packages/contracts/src/esitleme.ts.'],`, `şemaları packages/contracts/src/esitleme.ts.', 'İkinci çapa ve paket imzası packages/core/src/saat saf işlevi ve D01in açık anahtarıyla doğrulanır; D06 D04ün sunucu dış yüzünü çağırmaz.'],`);
rep(`X-Saat-Belgesi başlığı (D04ün işlevi).'`, `X-Saat-Belgesi başlığı (D04ün işlevi). Bu işlevleri bileşim kökü app.ts verir; infra/api alan modülü içe aktarmaz.'`);
rep(`'İş işleyicileri apps/server/src/jobs/<modül>/ altında sahibi modülündür; D14 yalnız kuyruk, zamanlama ve politika altyapısını tutar.'`, `'İş işleyicileri apps/server/src/jobs/<modül>/ altında sahibi modülündür; worker.ts tanımları jobs/<modül>/index.ts dosyalarından toplar, D14 kuyruk, zamanlama ve politika altyapısını tutar.', 'Kuyruk sağlığını isSagligi ile verir; eşik ve uyarı işi isletim_denetimi D15indir.'`);
rep(`'xprem ayrı veritabanında çalışır; işletimi D15in, yedeği D12nin.'`, `'xprem ayrı veritabanında çalışır; işletimi D15in, yedeği D12nin.', 'isletim_denetimi D15indir: D14.isSagligi ve eşiklerle zamanlanmış işleri, ölü mektup kuyruğunu ve art arda e-posta hatalarını denetler, isletim_uyarilari tablosuna yazar.'`);
rep(`roller yoklama_sahip, yoklama_api, yoklama_isci (D12-B03).'`, `roller yoklama_sahip, yoklama_api, yoklama_isci (D12-B03).', 'Bağlantı ayarlarını server.ts ve worker.ts verir; D12 başka modül içe aktarmaz.'`);
rep(`'Kayıt deseni: altyapı ve dağıtıcı modüller alan modülünü içe aktarmaz. Alan modülü kendi eklentisinde kaydolur: kuyruk öğesi işleyicisi ve indirme kaynağı D06ya (ogeTuruKaydet, indirmeKaynagiKaydet), iş tanımı D14e (isTanimla), saklama işleyicisi D12ye (saklamaIsleyicisiKaydet), rota listesi D13ün rota tablosuna.',`,
 `'Kayıt deseni: altyapı ve dağıtıcı modüller alan modülünü içe aktarmaz, alt modül üst modülü çağırmak yerine dinleyici kaydı açar. Alan modülü kendi eklentisinde kaydolur: kuyruk öğesi işleyicisi ve indirme kaynağı D06ya, saklama işleyicisi D12ye, rota listesi D13ün rota tablosuna, oturum üretimi ve kilit adımı D02ye, liste değişikliği D03e, oturum ve kesinti kapanışı D04e. İş tanımları jobs/<modül>/index.ts dosyasından worker.ts ile toplanır; bileşim kökleri app.ts, server.ts ve worker.ts altyapıyı parametreyle verir.', 'Yaprak işlevler: çok modülün çağırdığı ve başka modül çağırmayan işlevler (dış yüzde [yaprak] işaretli: D09 denetimeYaz, D06 surumAl ve ogrenciDurumuDegisti, D08 devamHesaplaIsiKoy) modülün ayrı giriş dosyasında (modules/<ad>/yaprak.ts) durur; bunlara giden çağrı dosya düzeyinde döngü kurmaz. Kalan iki yönlü çağrılarda index.ts yüklenirken başka modülü çağırmaz.',`);
rep(`const C = { modules: mods,`, `decisions.push(
  { topic: 'İki yönlü çağrılar', decision: 'Alt modülün üst modülü çağırdığı yerde dinleyici kaydı kullanılır: D02 (oturum üretimi, kilit adımı), D03 (liste değişikliği), D04 (oturum ve kesinti kapanışı). Kesen modüller birbirini içe aktarmaz, bileşim kökleri bağlar; çok modülün çağırdığı yaprak işlevler ayrı giriş dosyasındadır. Yaprak dışı kalan iki yönlü çiftler alanın doğasından gelir: D01 ile D02 (birim ve yetki, devir hedefi), D01 ile D07 (cihaz kanıtı ve cihaz okuma), D05 ile D07 (karar ve kayıt), D08 ile D09 (düzeltme ve sonuç).', why: 'İlk taslakta 27 iki yönlü modül çifti vardı; dosya düzeyinde döngü dependency-cruiser no-circular kuralını kırar ve bir modülün testini öbürünün koduna bağlar.' },
  { topic: 'İşletim denetimi işi', decision: 'isletim_denetimi D15e geçti: D14.isSagligi ile zamanlanmış işlerin son başarısını, ölü mektup kuyruğunu ve art arda e-posta hatalarını okur, D15in eşikleriyle isletim_uyarilari tablosuna yazar.', why: 'Eşikler ve uyarı tablosu D15in (D15-B20); iş D14te kalınca D14 ile D15 birbirini çağırıyordu.' },
);
const C = { modules: mods,`);
fs.writeFileSync(f, s, 'utf8');
console.log('patched');
