// Evidence check: each review finding must leave its marker(s) in spec/D15.json and frag/D15.html,
// and the stale text it named must be gone. Prints one line per finding; exits 1 on any miss.
'use strict';
const fs = require('fs'), path = require('path');
const B = path.join(__dirname, '..', '..');
const spec = fs.readFileSync(path.join(B, 'spec', 'D15.json'), 'utf8');
const frag = fs.readFileSync(path.join(B, 'frag', 'D15.html'), 'utf8');
const S = JSON.parse(spec);
const has = (t) => spec.includes(t) && frag.includes(t.replace(/</g, '&lt;').replace(/>/g, '&gt;'));
const lacks = (t) => !spec.includes(t);
const job = (n) => S.jobs.find((j) => j.name === n);
const test = (n) => S.tests.some((t) => t.name === n);
const kat = (tur) => S.uyari_kurallari.find((u) => u.tur === tur);
const checks = {
  F01_projeksiyon_yuk: () => has('GET /v1/projeksiyon/kodlar p95 < 200 ms') && S.files.includes('apps/server/test/yuk/ortak/kursu.ts'),
  F02_kosul_degerlendiren: () => kat('isletim.sertifika_bitiyor').degerlendiren.startsWith('sertifika_bitis_denetimi') && test('Okunamayan girdi açık uyarıyı kapatmaz') && test('Sertifika uyarısını işletim denetimi kapatmaz') && lacks('gözlenmeyen KOSUL uyarıları kapanır'),
  F03_girdi_ve_kalp_atisi: () => !!kat('isletim.denetim_girdisi') && job('isletim_kalp_atisi').does.includes('sonBasariAni') && test('Bir girdi bozukken öbür kuralların uyarıları açılır'),
  F04_xprem_ana_anahtar: () => has('DB_KEYS_MASTER_KEY_B64') && lacks('D12 (yedek)') && test('Çevrimdışı yedek xprem ana anahtarını kapsar'),
  F05_iki_adimli_dondurme: () => S.state_machines.some((m) => m.states.includes('HAZIR')) && has('isci, api-1 ve api-2') && test('Anahtar döndürme iki adımda ve bütün süreçlerde'),
  F06_silinmis_hesap: () => has('hesapSilindiMi') && test('Silinmiş hesabın gecikmiş sayaç öğesi yazılmaz'),
  F07_gun_atlanir: () => has('gunAtlanirMi') && test('Sıfır gün kuralı tek işlevden gelir') && lacks('Bütün sayaçları sıfır olan gün gönderilmez'),
  F08_caddy_xprem: () => has('@xprem_protokol') && has('max_size 64MB') && has('127.0.0.1:${XPREM_YONETIM_PORT}') && lacks('handle /guncelleme/* { reverse_proxy'),
  F09_bildirim_butcesi: () => job('isletim_denetimi').does.includes('120 saniyelik bütçesi') && test('Bildirim adımı süre bütçesine uyar'),
  F10_ota_kova: () => job('ota_yayin_denetimi').does.includes('460') && lacks('40 farklı rastgele') && test('OTA denetimi küçük yüzdeli yayını kaçırmaz'),
  F11_inceleme_kodu_isci: () => has('incelemeSabitKoduVar') && S.sirlar.find((x) => x.ad === 'inceleme_sabit_kodu').servisler.includes('isci'),
  F12_projeksiyon_ayari: () => S.ayar_semasi.some((a) => a.env === 'ASAMA2_QR_ACIK') && has('projeksiyonAyarSemasi'),
  F13_ekran_tavani: () => has('EKRAN_SURESI_TAVANI') && test('Ekran süresi kişi ve gün tavanı'),
  F14_saat_dilimi: () => has('OnCalendar=*-*-* 03:15:00 Europe/Istanbul') && has('Etc/UTC') && test('Ana makine zamanlayıcıları İstanbul saatiyle tetiklenir'),
  F15_yedek_esikleri: () => kat('isletim.yedek_eski').seviye.includes('pgbackrest_tam_yedek > 8 gün') && !!kat('isletim.yedek_atlandi') && has('ardisikAtlanan'),
  F16_olgun_kohort: () => job('haftalik_olcum_ozeti').does.includes('olgun kohort'),
  F17_suphe_ani: () => has('eleGecirilmeAni') && has('--supheden') && test('Ele geçirilen anahtarın şüphe anından sonraki kayıtları yeniden değerlendirilir'),
  F18_oom_olay: () => has('--filter event=oom') && has('oomArtisi') && lacks('bellekTasti'),
  F19_yayin_gecisleri: () => { const m = S.state_machines.find((x) => x.name.startsWith('Sunucu yayını')); return m.states.includes('XPREM_YENI') && m.transitions.filter((t) => t.to === 'GERI_DONULDU').length >= 5 && has('bakim.json') && has('cosign-sunucu.pub'); },
  F20_telefonda_kayip: () => S.olcum_gorunumleri.some((v) => v.ad === 'olcum_telefonda_kayip') && test('Telefonda kalan kayıplar üç ayrı oranla sayılır'),
  F21_kisa_kimlik: () => has('son 8 onaltılık karakteri'),
  F22_olculen_sonuc: () => frag.includes('en geç 10 dakika') && frag.includes('en geç 35 dakika') && !frag.includes('Kesinti en geç 15 dakikada'),
  F23_durum_ucu_testi: () => S.tests.find((t) => t.name.startsWith('Durum ucu')).asserts.includes('çağrı sayısı 0') && lacks('bu rotadan sorgu'),
  F24_govde_siniri: () => has('govdeSiniri 32768') && has('govdeEnBuyukBayt 49152') && lacks('16384'),
  F25_deneme_koku: () => S.ayar_semasi.some((a) => a.env === 'ISLETIM_SERTIFIKA_KOK_DOSYASI'),
  F26_cli_ve_olcum_yazici: () => has('olcumYazici') && has('--user 1000'),
  F27_yigin_ilk_satir: () => spec.includes("yığının ilk satırını '<sınıf> [<kod>]'") && frag.includes('yığının ilk satırı dahil'),  // dış yüz ayrıntısı yalnız spec'te çizilir
  F28_su_seviyesi: () => S.tables[0].columns.some((c) => c.name === 'yazma_ani') && has('retSuSeviyesi'),
  F29_node_surumu: () => has('.node-version, apps/server/Dockerfile') && has("'node-taban'"),
  F30_uyari_kesme: () => spec.includes("'... ve N satır daha'") && frag.includes('ve fırlatılmaz') && test('Uyarı satırında numara maskelenir, uzun metin kesilir'),
  F31_isaretli_ve_onceki_sahip: () => has('gecerli = true ve kesinlesti_ani dolu') && has('onceki_sahip_kisi_idleri'),
};
let bad = 0;
for (const [k, f] of Object.entries(checks)) { let ok = false; try { ok = !!f(); } catch (e) { ok = false; } if (!ok) bad++; console.log((ok ? 'OK   ' : 'EKSIK') + ' ' + k); }
if (/[–—]/.test(spec + frag)) { bad++; console.log('EKSIK dash'); }
process.exit(bad ? 1 : 0);
