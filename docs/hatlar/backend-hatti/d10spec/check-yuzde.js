// Deterministic check: integer per-mille percent vs integer hak rule.
// hak = T - ceil(T*p/100) = T - (T*p + 99) div 100 ; DEVAMSIZ iff devamsiz > hak
// yuzdeOnda = floor((T - devamsiz) * 1000 / T); claim: yuzdeOnda < 10*p  <=>  DEVAMSIZ
let cases = 0, bad = 0, floatBad = 0;
for (let p = 1; p <= 100; p++) {
  for (let T = 1; T <= 1000; T++) {
    const hak = T - Math.floor((T * p + 99) / 100);
    for (let d = 0; d <= T; d++) {
      cases++;
      const devamsiz = d > hak;
      const onda = Math.floor(((T - d) * 1000) / T); // exact: integer numerator, JS division then floor is exact for these magnitudes? verify with BigInt below on mismatch
      const ondaExact = Number((BigInt(T - d) * 1000n) / BigInt(T));
      if (onda !== ondaExact) floatBad++;
      if ((ondaExact < 10 * p) !== devamsiz) bad++;
    }
  }
}
console.log({ cases, bad, floatDivisionMismatches: floatBad });
// yuzdeMetni reference (no Intl): 695 -> "%69,5"
const yuzdeMetni = n => n === null ? '-' : '%' + Math.floor(n / 10) + ',' + (n % 10);
console.log([0, 5, 695, 700, 999, 1000].map(yuzdeMetni).join(' '));
// constraint name lengths
const names = [
  'aksis_ozet_anliklari_id_pk',
  'aksis_ozet_anliklari_sube_id_uq',
  'aksis_ozet_anliklari_cikti_kimligi_uq',
  'aksis_ozet_anliklari_sube_id_kaynak_alinma_ani_idx',
  'aksis_ozet_anliklari_donem_id_birim_id_idx',
  'aksis_ozet_anliklari_donem_id_fk', 'aksis_ozet_anliklari_birim_id_fk', 'aksis_ozet_anliklari_ders_id_fk', 'aksis_ozet_anliklari_sube_id_fk', 'aksis_ozet_anliklari_alan_kisi_id_fk',
  'aksis_ozet_anliklari_kaynak_ck', 'aksis_ozet_anliklari_cikti_turu_ck', 'aksis_ozet_anliklari_kaynak_alan_kisi_id_ck', 'aksis_ozet_anliklari_kaynak_alinma_ani_ck',
  'aksis_ozet_anliklari_ozet_ozeti_ck', 'aksis_ozet_anliklari_gecici_nedenleri_ck', 'aksis_ozet_anliklari_sayim_tabani_ck', 'aksis_ozet_anliklari_teori_p_ck', 'aksis_ozet_anliklari_uygulama_p_ck',
  'aksis_ozet_anligi_satirlari_aksis_ozet_anligi_id_liste_satiri_id_pk',
  'aksis_ozet_anligi_satirlari_aksis_ozet_anligi_id_fk',
  'aksis_ozet_anligi_satirlari_liste_satiri_id_fk',
  'aksis_ozet_anligi_satirlari_liste_satiri_id_idx',
  'aksis_ozet_anligi_satirlari_sonuc_ck', 'aksis_ozet_anligi_satirlari_karar_bekliyor_nedeni_ck',
  'aksis_ozet_anligi_satirlari_teori_ck', 'aksis_ozet_anligi_satirlari_uygulama_ck', 'aksis_ozet_anligi_satirlari_ogrenci_no_ck',
];
for (const n of names) if (Buffer.byteLength(n) > 63) console.log('TOO LONG', Buffer.byteLength(n), n);
console.log('names checked', names.length);
