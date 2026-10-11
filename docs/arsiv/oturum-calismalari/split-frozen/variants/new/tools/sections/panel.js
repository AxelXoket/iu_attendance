// Section 'Panel ekranı' (#panel): the instructor's attendance table for one lesson, with live selection, Turkish sort
// and filters. Every figure is counted from the roster (tools/screens/roster.js). Owner: F1b.
const { esc, doc, TEK } = require('../lib/format');
const { I } = require('../lib/icons');
const { ATT, att, dec } = require('../lib/marks');
const { brand } = require('../lib/page');
const { covBar } = require('../lib/coverage');
const { section, sub } = require('../lib/section');
const { ROWS, N, cnt, cntDec, cntFin, RECORDS, HEAD, DIFF, FLAGGED, GROUPS } = require('../screens/roster');

const vh = t => '<span class="vh">' + t + '</span>';

function panelScreen() {
  let firstVar = true;
  const rows = ROWS.map(r => {
    const exc = k => (k === 'yok' || k === 'ret' ? 'exc' : '');
    const finCell = r.fin ? att(r.fin, 'ind', exc(r.fin)) : '';
    let finHtml = finCell;
    if (r.fin === 'var' && firstVar) { finHtml = finCell.replace('class="ind st-var"', 'class="ind st-var" data-xr="7"'); firstVar = false; }
    return '<tr data-f="' + r.f + '" data-name="' + esc(r.name) + '"' + (r.sel ? ' class="sel"' : '') + '>' +
      '<td class="c-cb"' + (r.sel ? ' data-xr="4"' : '') + '><label class="cb"' + (r.sel ? ' data-xr="5"' : '') + '><input type="checkbox"' + (r.sel ? ' checked' : '') + ' aria-label="Seç: ' + esc(r.name) + '"></label></td>' +
      '<td class="c-no">' + r.no + '</td><td class="c-nm">' + esc(r.name) + '</td>' +
      '<td class="num">' + (r.t || vh('kayıt yok')) + '</td>' +
      '<td><span class="tags">' + (r.tags.length ? '<span class="tagx">' + esc(r.tags[0]) + '</span>' + (r.tags.length > 1 ? '<span class="tagx more" title="' + esc(r.tags.slice(1).join(', ')) + '" aria-label="' + (r.tags.length - 1) + ' etiket daha: ' + esc(r.tags.slice(1).join(', ')) + '">+' + (r.tags.length - 1) + '</span>' : '') : vh('etiket yok')) + '</span></td>' +
      '<td>' + (r.dec ? dec(r.dec, 'ind', exc(r.dec)) : vh('kayıt yok')) + '</td>' +
      '<td>' + finHtml + '</td>' +
      '<td class="c-more"><button class="btn btn-ghost btn-icon btn-sm" type="button" aria-label="Diğer: ' + esc(r.name) + '">' + I('more_vert', 20) + '</button></td></tr>';
  }).join('');
  const nav = [['menu_book', 'Dersler', 1], ['description', 'Raporlar'], ['edit_note', 'Düzeltmeler'], ['fact_check', 'Onaylar', 0, String(cntDec('incelemede') + cntDec('beklemede'))], ['summarize', 'AKSİS özeti']];
  const fig = (cls, icon, label, n, sub, xr) => '<div class="pfig"><p class="k' + (cls ? ' ' + cls : '') + '">' + I(icon, 16) + label + '</p><p class="n num' + (xr ? ' ink" data-xr="6' : '') + '">' + n + '</p><p class="s">' + sub + '</p></div>';
  return '<div class="panel-frame"><div class="panel-chrome" aria-hidden="true"><i></i><i></i><i></i><span>panel.yoklama.istanbul.edu.tr/dersler/bil301/yoklama/2026-10-06</span></div>' +
    '<div class="pnl" id="scr-panel">' +
    '<aside class="pnl-nav"><div class="pnl-brand">' + brand() + '<span>İÜ Yoklama</span><button class="btn btn-ghost btn-icon pnl-menu" type="button" aria-label="Menü">' + I('menu', 20) + '</button></div><nav class="pnl-links" aria-label="Panel">' +
    nav.map(([ic, l, cur, c]) => '<a class="pnl-link" href="#panel"' + (cur ? ' aria-current="page"' : '') + '>' + I(ic, 20) + l + (c ? '<span class="count">' + c + '</span>' : '') + '</a>').join('') +
    '</nav><div class="pnl-nav-foot"><button class="pnl-link" type="button">' + I('logout', 20) + 'Çıkış</button></div></aside>' +
    '<div class="pnl-main">' +
    '<div class="pnl-top"><p class="crumb">Dersler <span>/</span> BİL 301 Veri Yapıları <span>/</span> <b>6 Ekim 2026</b></p><p class="pnl-user"><span class="av">SA</span><span class="nm">S. Aksoy</span></p></div>' +
    '<div class="pnl-head"><div><h4>Yoklama</h4><p>BİL 301 Veri Yapıları · Teori · D-204 · 6 Ekim 2026 Salı, 10:00</p></div>' +
    '<div class="pnl-actions"><button class="btn btn-secondary" type="button">' + I('edit_note', 20) + 'Düzeltme ekle</button><button class="btn btn-primary" type="button" data-xr="1">' + I('download', 20) + 'Excel olarak indir</button></div></div>' +
    '<div class="pnl-figs">' +
    fig('st-var', 'check', 'Var', cnt('var'), N + ' öğrenciden', true) +
    fig('st-yok', 'close', 'Yok', cnt('yok'), cntDec('ret') + ' kayıt reddedildi') +
    fig('', 'schedule', 'Karar bekleyen', cnt('bekleyen'), 'İncelemede ' + cntDec('incelemede') + ', Beklemede ' + cntDec('beklemede')) +
    fig('', 'edit_note', 'Düzeltme ve muaf', cnt('diger'), ['gorevli', 'belgeli', 'elle', 'muaf'].map(k => ATT[k].label + ' ' + cntFin(k)).join(', ')) +
    fig('', 'groups', 'Kafa sayısı', HEAD, 'Kayıt ' + RECORDS + ', fark ' + DIFF + (FLAGGED ? ' (işaretli)' : ' (sınır içinde)')) +
    '</div>' +
    '<div class="pnl-bar"><div class="tabs" role="tablist" aria-label="Süz" id="pnl-tabs">' +
    [['all', 'Tümü', N]].concat(GROUPS.map(([f, l]) => [f, l, cnt(f)])).map(([f, l, n], i) => '<button type="button" role="tab" aria-selected="' + (i === 0) + '"' + (i ? ' tabindex="-1"' : '') + ' data-filter="' + f + '">' + l + '<span class="cnt">' + n + '</span></button>').join('') +
    '<span class="tabs-ind" aria-hidden="true"></span></div></div>' +
    '<div class="pnl-tools"><div class="search">' + I('search', 16) + '<input class="input" type="search" placeholder="Ad ya da numara" aria-label="Öğrenci ara"></div><span class="lbl" data-selcount></span><button class="btn btn-secondary btn-sm" type="button">' + I('filter_list', 20) + 'Süz</button></div>' +
    '<div class="tbl-wrap" tabindex="0" role="region" aria-label="Yoklama tablosu, ' + N + ' öğrenci"><table class="tbl" id="pnl-table"><thead><tr>' +
    '<th class="c-cb"><label class="cb"><input type="checkbox" data-all aria-label="Görünen bütün satırları seç"></label></th>' +
    '<th>Öğrenci no</th><th aria-sort="ascending"><button class="sort" type="button" data-sort aria-pressed="false">Ad soyad' + I('arrow_upward', 16) + '</button></th><th>Kayıt</th><th>Etiketler</th><th>Sunucu kararı</th><th>Son durum</th><th class="c-more"><span class="vh">Eylemler</span></th>' +
    '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
    '<div class="pnl-foot"><span>Gösterilen <b data-shown>' + N + '</b> / ' + N + ' öğrenci</span><span data-total-line>' + N + ' öğrenci: ' + GROUPS.map(([f, l]) => cnt(f) + ' ' + (f === 'var' || f === 'yok' ? l : l.toLocaleLowerCase('tr-TR'))).join(', ') + '. Sayımı etiket değil sunucu kararı belirler.</span></div>' +
    '</div></div></div>';
}

function panel() {
  return section('panel', 'Hocanın bir dersin yoklamasını gördüğü tablo. Tarayıcının kendi öğeleri (table, button, input) üzerine kurulur (' + doc(TEK, 'panel-cati', 'teknik.html#panel-cati') + '); satır seçimi, Türkçe sıralama ve süzme canlıdır. Dar ekranda kenar çubuğu üst çubuğa döner, yalnız tablo kendi içinde kayar.',
    sub('Yoklama tablosu', 'P2 · P8 · ' + N + ' öğrenci', panelScreen() + '<div class="panel-cap">' + covBar('#scr-panel', 'panel') + '</div>' +
      '<div class="flow-note"><p class="help">Tek birincil eylem Excel olarak indir. Anahtar rakam Var sayısı. Seçili satır gri zeminli, solunda 2 px mürekkep. Bütün sayılar aynı ' + N + ' satırdan sayılır: ' + GROUPS.map(([f, l]) => l + ' ' + cnt(f)).join(' + ') + ' = ' + N + '.</p><p class="help">Yoğun tabloda yalnız Yok ve Ret gül zemin alır; Var beyaz kalır. Satır hover yalnız imleçli cihazda neutral.4; onay kutusu 16 px çizilir, tıklama alanı 40x40 px; seçili satırdaki kutu kenarı neutral.10 (3,42:1).</p><p class="help">Ad soyad sütunu Türkçe harf sırasıyla sıralanır (Intl.Collator tr; ' + doc(TEK, 'veritabani', 'teknik.html#veritabani') + '); sıralama ve süzme animasyonsuzdur.</p></div>'));
}
panel.title = 'Panel ekranı';
module.exports = panel;
