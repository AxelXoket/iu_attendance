// p1-tablolar.js: architect alignment (I010, I011, I019, I027, I055, I063, I071, I093 and A1 context).
const { load, save, rep, repLine, J } = require('./lib.js');
let s = load('p1-tablolar.js');

s = repLine(s, '// Naming: every constraint', '// Naming: every constraint, index and trigger name is kisitAdi(tablo, sutunlar, tur, ek?) (D12-B01, I063): <tablo>_<sutunlar>_<ek>_<tur>, column-less names <tablo>_<ek>_<tur>.');

s = repLine(s, "const SURUM = c('surum'", `const SURUM = c('surum', 'bigint', false, '0', ${J("Telefona inen satırın değişiklik sürümü. Satır 0 ile yazılır; D02 işlemin yazdığı inen satırlar için tek damgayı D06.surumDamgasiIste(tx, damga) ile bırakır, işlemin sahibi son adımda D06.surumAl(tx)'ı bir kez çağırır ve damga aynı sürümü bu satırlara tek UPDATE ile yazar (satırlar işlemin kilidinde olduğundan sayaçtan sonra yeni satır kilidi alınmaz; ortak kural Sürüm damgası, I019). 0 sürümlü satır hiçbir indirme aralığına girmez, işlem dışında da görünmez.")});`);

// donemler: inceleme dönemi denemeDersiniKur açar
s = repLine(s, "c('yariyil', 'text', false, ''", `      c('yariyil', 'text', false, '', ${J("guz, bahar, yaz; inceleme yalnız denemeDersiniKur'un açtığı süresiz ve kilitsiz dönem için (metin ve D12 durumKisiti).")}),`);
s = rep(s, "(tek inceleme dönemi; deneme işinin ON CONFLICT hedefi)", "(tek inceleme dönemi; denemeDersiniKur'un ON CONFLICT hedefi)");

// takvimler: beklenenSurumNo ve ek biçimli CHECK adı
s = repLine(s, "c('surum_no', 'integer', false, '1'", `      c('surum_no', 'integer', false, '1', ${J('İyimser eşzamanlılık numarası; her PUT bir artırır, istek beklenen numarayı ortak beklenenSurumNoSemasi alanı beklenenSurumNo ile taşır (D13, I071; D02-B48). Takvim telefona inmediği için D06 sürümü almaz.')}),`);
s = rep(s, "'kisitAdi(takvimler, [ders_baslangic, ders_bitis, ekle_birak_bitis, devamsizlik_son_gun], ck) (63 baytı aşar, gövdeyi kisitAdi kısaltır): ", "'takvimler_tarihler_ck (kisitAdi(takvimler, [], ck, tarihler)): ");

// birim_donemleri: uygulanmış kilit okuyucuları
s = repLine(s, "c('kilit_uygulandi_ani', TS, true, ''", `      c('kilit_uygulandi_ani', TS, true, '', ${J("donem_kilidi işinin yan etkileri uyguladığı an; boşsa henüz uygulanmadı. Son gün kilitten sonra ileri alınırsa boşa döner ve kilitle arşivlenen dersler aynı işlemde etkin olur; iş yeni anda yeniden uygular (D02-A05). kilitliBirimDonemleri(..., { uygulanmis: true }) ve denetlenecekDersler bu sütunu okur (I038, I049).")}),`);

// dersler
s = repLine(s, "c('donem_id', 'uuid', false, '', 'Genel dönem; sonradan değişmez", `      c('donem_id', 'uuid', false, '', ${J('Genel dönem; sonradan değişmez (dersler_degismez_tg tetikleyicisi, D12-B13).')}),`);
s = repLine(s, "c('onceki_sahip_kisi_idleri'", `      c('sahiplik_gecmisi', 'jsonb', false, '', ${J("Sahiplik geçmişi, dizi: [{ kisiId, baslangicAni, bitisAni }] (anlar UTC ISO 8601, milisaniyeli ve Z ile). Açılışta tek öğe { sahip, açılış anı, null }; devirde aynı işlemde son öğenin bitisAni devir anıyla kapanır ve sonuna { yeni sahip, devir anı, null } eklenir, şimdiki sahip hep sondadır. Yeni tablo yoktur (I027, I055). dersGetir DersBilgisi.sahiplikGecmisi olarak verir: D05 önceki sahibin okutmasını okutma anı onun bitisAni'sinden önceyse, D11 önceki sahibi dilim başı onun bitisAni'sinden önceyse kabul eder. Şeması packages/contracts/src/dersler.ts'te Zod ile; telefona inmez.")}),`);
s = repLine(s, "c('sahip_hesap_durumu', 'text', false", `      c('sahip_hesap_durumu', 'text', false, "'aktif'", ${J("aktif, pasif, silindi (metin ve D12 durumKisiti). derslerKimlikDinleyicisi (D01'in kimlik olayı abonesi) yazar: hesap_durumu_degisti olayında aktif dışındaki durum pasif, hesap_silindi olayında silindi; devirde aktif olur. Yönetici ders listesinin sahipDurumu süzgeci için kopyadır, D01 tablosu okunmaz.")}),`);
s = repLine(s, "c('duzenleme_no', 'integer', false, '1'", `      c('duzenleme_no', 'integer', false, '1', ${J('Ders ayarı, program ve şube için iyimser eşzamanlılık numarası; PATCH ve program PUT beklenen numarayı ortak beklenenSurumNoSemasi alanı beklenenSurumNo ile taşır (D13, I071); ders ayarı, program ve şube yazımı (şube program kümelerini değiştirdiği için) bir artırır.')}),`);
s = rep(s, "(tek etkin deneme dersi; deneme işinin ON CONFLICT hedefi)", "(tek etkin deneme dersi; denemeDersiniKur\\'un ON CONFLICT hedefi)");
s = repLine(s, "'dersler_onceki_sahip_kisi_idleri_idx USING gin", `      ${J("dersler_sahiplik_gecmisi_idx USING gin (sahiplik_gecmisi jsonb_path_ops) (personel degistiMi: kişinin önceki sahip olduğu dersler, sahiplik_gecmisi @> '[{\"kisiId\": ...}]')")},`);
s = repLine(s, "\"dersler_sahip_hesap_durumu_ck: sahip_hesap_durumu IN", `      "dersler_sahip_hesap_durumu_ck: sahip_hesap_durumu IN ('aktif','pasif','silindi')",\n      ${J("dersler_sahiplik_gecmisi_ck: jsonb_typeof(sahiplik_gecmisi) = 'array' AND jsonb_array_length(sahiplik_gecmisi) BETWEEN 1 AND 100 AND (sahiplik_gecmisi -> -1 ->> 'kisiId')::uuid = sahip_kisi_id AND sahiplik_gecmisi -> -1 -> 'bitisAni' = 'null'::jsonb (şimdiki sahip sonda ve açık)")},`);
s = repLine(s, "\"dersler_donem_id_ck: BEFORE UPDATE tetikleyicisi", `      ${J("dersler_degismez_tg (kisitAdi(dersler, [], tg, degismez)): BEFORE UPDATE tetikleyicisi, uygulama.veritabani_degismez_sutun('donem_id') (D12 ortak işlevi, D12-B13)")},`);

// subeler: kilit sırası ve liste kaynağı
s = repLine(s, "c('pasif_ani', TS, true, '', 'Doluysa şube pasif", `      c('pasif_ani', TS, true, '', ${J("Doluysa şube pasif (D12-B16); cevaptaki durum bundan türer. Pasifleştirme önce ders, sonra şube satırını FOR UPDATE ile kilitler ve liste kaynağını (etkinSatirlar) kilitten sonra sorar; D03 bu şubeye satır yazmadan önce aynı sırayla dersGetir ve subeGetir(..., { kilitle: 'paylasimli' }) ile FOR SHARE alır, böylece pasif şubede etkin öğrenci kalmaz (I010, I011).")}),`);

// oturumlar
s = rep(s, "programdan (normal), telafiden ya da deneme dersi işinden üretilir, hiç silinmez.", "programdan (normal), telafiden ya da deneme dersinin üretiminden (denemeDersiniKur ve deneme_dersi_oturumlari) üretilir, hiç silinmez.");
s = repLine(s, "\"oturumlar_ders_id_tarih_uq UNIQUE (ders_id, tarih) WHERE tur = 'deneme'", `      ${J("oturumlar_ders_id_tarih_deneme_uq UNIQUE (ders_id, tarih) WHERE tur = 'deneme' (kisitAdi(oturumlar, [ders_id, tarih], uq, deneme); deneme oturumu üretiminin ON CONFLICT hedefi)")},`);
s = repLine(s, "\"oturumlar_ders_id_bitis_ani_idx (ders_id, bitis_ani) WHERE", `      ${J("oturumlar_onaysiz_idx (ders_id, bitis_ani) WHERE durum = 'planlandi' AND yapildi IS NULL (kisitAdi(oturumlar, [], idx, onaysiz); onaysız liste)")},`);
s = rep(s, '"kisitAdi(oturumlar, [durum, iptal_nedeni, iptal_ani, iptal_eden_kisi_id], ck): ', '"oturumlar_iptal_ck (kisitAdi(oturumlar, [], ck, iptal)): ');
s = rep(s, '"kisitAdi(oturumlar, [yapildi, yapildi_kaynagi, yapildi_ani, yapildi_celiskili], ck): ', '"oturumlar_yapildi_ck (kisitAdi(oturumlar, [], ck, yapildi)): ');
s = rep(s, '"kisitAdi(oturumlar, [ders_id, donem_id, program_saati_id, tur, tarih, kisa_kod], ck): BEFORE UPDATE tetikleyicisi, ', '"oturumlar_degismez_tg (kisitAdi(oturumlar, [], tg, degismez)): BEFORE UPDATE tetikleyicisi, ');
s = rep(s, '"oturumlar_durum_id_ck: ertelenmiş kısıt tetikleyicisi', '"oturumlar_planli_sube_tg (kisitAdi(oturumlar, [], tg, planli_sube)): ertelenmiş kısıt tetikleyicisi');
s = rep(s, "'oturum_subeleri_oturum_id_ck: ertelenmiş kısıt tetikleyicisi (AFTER DELETE), oturumlar_durum_id_ck ile aynı işlev", "'oturum_subeleri_planli_sube_tg (kisitAdi(oturum_subeleri, [], tg, planli_sube)): ertelenmiş kısıt tetikleyicisi (AFTER DELETE), oturumlar_planli_sube_tg ile aynı işlev");

// oturum_degisiklikleri: üretim olayının anı ve önceki süre (I018)
s = repLine(s, "c('diger_alanlar', 'jsonb', false", `      c('diger_alanlar', 'jsonb', false, "'{}'", ${J('Önceki ve yeni derslik, saat sayıları, süre, iptal nedeni, şube kümesi ve yapıldı cevabı; önceki süre oturumGetir().degisiklikler[].oncekiYoklamaSuresiDk olarak okunur (I018). Şeması packages/contracts/src/dersler.ts içinde Zod ile (numara ve isim yok).')}),`);
s = repLine(s, "c('degisiklik_ani', TS, false, '', 'Saat arayüzünden.')", `      c('degisiklik_ani', TS, false, '', ${J('Saat arayüzünden; aynı yazımın üretim olayındaki an alanı bu değerdir (I018).')}),`);

save('p1-tablolar.js', s);
require('../r17/backend/d02work/r2/p1-tablolar.js');
console.log('p1 tamam');
