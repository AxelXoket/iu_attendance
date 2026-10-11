// Section 'Panel ekranı' (#panel): the instructor's attendance table for one lesson. The panel is drawn at a chosen
// window width (the breakpoints of Biçim ve boşluk) and scaled to the column, like the phones; selection, Turkish sort,
// search, filters, the narrow layout's menu drawer and the state before the head count are live. Every figure is counted
// from the roster (tools/screens/roster.js). Owner: F1b.
const { esc, doc, PLAN, TEK } = require('../lib/format');
const { I } = require('../lib/icons');
const { ATT, att, dec } = require('../lib/marks');
const { brand } = require('../lib/page');
const { covBar } = require('../lib/coverage');
const { switchRow } = require('../lib/controls');
const { section, sub, ref } = require('../lib/section');
const { ROWS, N, cnt, cntDec, cntFin, RECORDS, HEAD, DIFF, FLAGGED, GROUPS } = require('../screens/roster');
const { panelBreak } = require('./bicim');
const { fragLink } = require('./ekranlar');
const { printView } = require('./bilesenler');

const P = (id, name) => doc(PLAN, id, 'plan.html, ' + name);
const K = (id, name) => doc(TEK, id, 'teknik.html, ' + name);
const vh = t => '<span class="vh">' + t + '</span>';
const WORDS = ['sıfır', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı'];
const EACH = { 1: 'birer', 2: 'ikişer', 3: 'üçer', 4: 'dörder' };
// Window widths the panel can be drawn at: one per layout of the breakpoint table (side bar, top bar, menu button).
function widths() {
  const bp = panelBreak();
  const W = [{ w: bp.side, l: 'kenar çubuğu' }, { w: 1024, l: 'üst çubuk' }, { w: 390, l: 'menü düğmesi' }];
  if (!(W[1].w >= bp.narrow && W[1].w < bp.side && W[2].w < bp.narrow)) throw new Error('panel sample widths no longer fall in the breakpoint ranges');
  return W;
}

const NAV = [['menu_book', 'Dersler', 1], ['description', 'Raporlar'], ['edit_note', 'Düzeltmeler'], ['fact_check', 'Onaylar', 0, String(cntDec('incelemede') + cntDec('beklemede'))], ['summarize', 'AKSİS özeti']];
const navLinks = () => NAV.map(([ic, l, cur, c]) => '<a class="pnl-link" href="#panel"' + (cur ? ' aria-current="page"' : '') + '>' + I(ic, 20) + l + (c ? '<span class="count">' + c + '</span>' : '') + '</a>').join('');

function panelScreen() {
  let firstVar = true;
  const rows = ROWS.map(r => {
    const exc = k => (k === 'yok' || k === 'ret' ? 'exc' : '');
    let finHtml = r.fin ? att(r.fin, 'ind', exc(r.fin)) : vh('son durum henüz yok');
    if (r.fin === 'var' && firstVar) { finHtml = finHtml.replace('class="ind st-var"', 'class="ind st-var" data-xr="7"'); firstVar = false; }
    return '<tr data-f="' + r.f + '" data-name="' + esc(r.name) + '" data-no="' + r.no + '"' + (r.sel ? ' class="sel"' : '') + '>' +
      '<td class="c-cb"' + (r.sel ? ' data-xr="4"' : '') + '><label class="cb"' + (r.sel ? ' data-xr="5"' : '') + '><input type="checkbox"' + (r.sel ? ' checked' : '') + ' aria-label="Seç: ' + esc(r.name) + '"></label></td>' +
      '<td class="c-no">' + r.no + '</td><td class="c-nm">' + esc(r.name) + '</td>' +
      '<td class="num">' + (r.t || vh('kayıt yok')) + '</td>' +
      '<td><span class="tags">' + (r.tags.length ? '<span class="tagx">' + esc(r.tags[0]) + '</span>' + (r.tags.length > 1 ? '<span class="tagx more" title="' + esc(r.tags.slice(1).join(', ')) + '" aria-label="' + (r.tags.length - 1) + ' etiket daha: ' + esc(r.tags.slice(1).join(', ')) + '">+' + (r.tags.length - 1) + '</span>' : '') : vh('ek etiket yok')) + '</span></td>' +
      '<td>' + (r.dec ? dec(r.dec, 'ind', exc(r.dec)) + (r.why ? '<span class="why">' + esc(r.why) + '</span>' : '') : vh('kayıt yok')) + '</td>' +
      '<td>' + finHtml + '</td></tr>';
  }).join('');
  const fig = (cls, icon, label, n, s, xr) => '<div class="pfig"><p class="k' + (cls ? ' ' + cls : '') + '">' + I(icon, 16) + '<span>' + label + '</span></p><p class="n num' + (xr ? ' ink" data-xr="6' : '') + '">' + n + '</p><p class="s">' + s + '</p></div>';
  const open = GROUPS.find(g => g[0] === 'bekleyen')[1];
  const kinds = ['gorevli', 'belgeli', 'elle', 'muaf'], per = kinds.map(cntFin);
  const otherDesc = per.every(x => x === per[0]) && EACH[per[0]] ? WORDS[kinds.length] + ' tür, ' + EACH[per[0]] + ' kayıt' : kinds.map((k, i) => ATT[k].label + ' ' + per[i]).join(', ');
  const W = widths();
  return '<div class="panel-view"><div class="panel-fit" data-narrow="' + panelBreak().narrow + '"><div class="panel-frame" style="--pw:' + W[0].w + 'px"><div class="panel-chrome" aria-hidden="true"><i></i><i></i><i></i><span>yoklama.ornek/dersler/bil301/yoklama/2026-10-06</span></div>' +
    '<div class="pnl" id="scr-panel" data-head="girildi">' +
    '<aside class="pnl-nav"><div class="pnl-brand">' + brand() + '<span>İÜ Yoklama</span><button class="btn btn-ghost btn-icon pnl-menu" type="button" aria-label="Menü" aria-expanded="false" aria-controls="pnl-drawer">' + I('menu', 20) + '</button></div><nav class="pnl-links" aria-label="Panel">' + navLinks() +
    '</nav><div class="pnl-nav-foot"><button class="pnl-link" type="button">' + I('logout', 20) + 'Çıkış yap</button></div></aside>' +
    '<div class="pnl-main">' +
    '<div class="pnl-top"><nav class="crumb" aria-label="Konum"><a href="#panel">Dersler</a><span aria-hidden="true">/</span><a href="#panel">BİL 301 Veri Yapıları</a><span aria-hidden="true">/</span><b aria-current="page">6 Ekim 2026</b></nav><p class="pnl-user"><span class="av">SA</span><span class="nm">S. Aksoy</span></p></div>' +
    '<div class="pnl-head"><div><h4>Yoklama</h4><p>BİL 301 Veri Yapıları · Teori · D-204 · 6 Ekim 2026 Salı, 10:00 ile 11:50</p></div>' +
    '<div class="pnl-actions"><button class="btn btn-secondary" type="button">' + I('edit_note', 20) + 'Düzeltme ekle</button><button class="btn btn-primary" type="button" data-xr="1">' + I('download', 20) + 'Excel olarak indir</button></div></div>' +
    '<div class="pnl-wait" role="status"><p class="k">' + I('groups', 20) + 'Kafa sayısı</p><p class="v">Henüz girilmedi</p><p class="s">Kayıtlar ve sayılar, kafa sayısı uygulamadan girildikten sonra görünür.</p></div>' +
    '<div class="pnl-figs">' +
    fig('st-var', 'check', 'Var', cnt('var'), N + ' öğrenciden', true) +
    fig('st-yok', 'close', 'Yok', cnt('yok'), cntDec('ret') + ' kayıt reddedildi') +
    fig('', 'schedule', open, cnt('bekleyen'), 'İncelemede ' + cntDec('incelemede') + ', Beklemede ' + cntDec('beklemede')) +
    fig('', 'edit_note', 'Düzeltme ve muaf', cnt('diger'), otherDesc) +
    fig('', 'groups', 'Kafa sayısı', HEAD, 'Kayıt ' + RECORDS + ', fark ' + DIFF + (FLAGGED ? ' (işaretli)' : ' (sınır içinde)')) +
    '</div>' +
    '<p class="st-note pnl-note">' + I('info', 20) + '<span>Kayıtların bir kısmı henüz gelmemiş olabilir.</span></p>' +
    '<div class="pnl-bar"><div class="tabs" role="tablist" aria-label="Süz" id="pnl-tabs">' +
    [['all', 'Tümü', N]].concat(GROUPS.map(([f, l]) => [f, l, cnt(f)])).map(([f, l, n], i) => '<button type="button" role="tab" aria-selected="' + (i === 0) + '"' + (i ? ' tabindex="-1"' : '') + ' data-filter="' + f + '">' + l + '<span class="cnt">' + n + '</span></button>').join('') +
    '<span class="tabs-ind" aria-hidden="true"></span></div></div>' +
    '<div class="pnl-tools"><div class="search">' + I('search', 16) + '<input class="input" type="search" placeholder="Ad ya da numara" aria-label="Öğrenci ara" aria-controls="pnl-table" data-search></div><span class="lbl" data-selcount></span></div>' +
    '<div class="tbl-wrap" tabindex="0" role="region" aria-label="Yoklama tablosu, ' + N + ' öğrenci"><table class="tbl" id="pnl-table"><thead><tr>' +
    '<th class="c-cb"><label class="cb"><input type="checkbox" data-all aria-label="Görünen bütün satırları seç"></label></th>' +
    '<th>Öğrenci no</th><th aria-sort="ascending"><button class="sort" type="button" data-sort aria-pressed="false">Ad soyad' + I('arrow_upward', 16) + '</button></th><th>Kayıt</th><th>Etiketler</th><th>Sunucu kararı</th><th>Son durum</th>' +
    '</tr></thead><tbody>' + rows + '</tbody></table><p class="pnl-empty" data-empty hidden>Aramaya uyan öğrenci yok.</p></div>' +
    '<div class="pnl-foot"><span>Gösterilen <b data-shown>' + N + '</b> / ' + N + ' öğrenci</span><span data-total-line>' + N + ' öğrenci: ' + GROUPS.map(([f, l]) => cnt(f) + ' ' + (f === 'var' || f === 'yok' ? l : l.toLocaleLowerCase('tr-TR'))).join(', ') + '. Sayımı etiket değil sunucu kararı belirler.</span></div>' +
    '</div>' +
    // The narrow layout's navigation: a side panel from the right edge (Etkileşim tablosu, yan panel).
    '<div class="pnl-scrim" data-drawer-close aria-hidden="true"></div>' +
    '<div class="pnl-drawer" id="pnl-drawer" role="dialog" aria-modal="true" aria-label="Gezinme"><div class="pnl-drawer-h"><span>Gezinme</span><button class="btn btn-ghost btn-icon" type="button" aria-label="Kapat" data-drawer-close>' + I('close', 20) + '</button></div>' +
    '<nav class="pnl-drawer-links" aria-label="Panel">' + navLinks() + '</nav><div class="pnl-drawer-foot"><button class="pnl-link" type="button">' + I('logout', 20) + 'Çıkış yap</button></div></div>' +
    '</div></div></div></div>';
}

function controls() {
  const W = widths();
  return '<div class="ctl-plate two pnl-ctl"><div class="set-row pw-row"><div><p class="t" id="pw-l">Pencere genişliği</p><p class="help" id="pw-h">Panel bu genişlikte çizilir ve sütuna sığacak kadar küçültülür; ölçeği çerçevenin altında yazar.</p></div>' +
    '<div class="seg" role="group" aria-labelledby="pw-l" aria-describedby="pw-h">' + W.map((x, i) => '<button class="btn btn-ghost btn-sm" type="button" data-pw="' + x.w + '" aria-pressed="' + (i === 0) + '">' + x.w + ' px<span class="seg-s">' + x.l + '</span></button>').join('') + '</div></div>' +
    switchRow('head-sw', 'Kafa sayısından önce', 'Kafa sayısı girilene kadar sayfa kayıtları ve sayıları göstermez.', 'data-head-sw') + '</div>';
}

function panel() {
  const bp = panelBreak();
  const target = fragLink('erisilebilirlik', 'erisilebilirlik-hedef', 'Erişilebilirlik, Hedef boyu');
  return section('panel', 'Hocanın bir dersin yoklamasını gördüğü tablo, tarayıcının kendi öğeleriyle (' + K('panel-cati', 'Web paneli, Çatı') + '). Panel seçilen pencere genişliğinde çizilir ve sütuna sığacak kadar küçültülür; kenar çubuğu ' + bp.side + ' px\'ten, menü düğmesi ' + bp.narrow + ' px\'in altında görünür (' + ref('bicim', 'Biçim ve boşluk') + ', Kırılma noktaları). Satır seçimi, Türkçe sıralama, arama, süzme ve menü canlıdır.',
    sub('Yoklama tablosu', N + ' öğrenci · ' + P('gun-kayit-etiketleri', 'Kayıt etiketleri'), controls() + panelScreen() + '<div class="panel-cap"><p class="ph-scale pnl-scale" hidden></p>' + covBar('#scr-panel', 'panel') + '</div>' +
      '<div class="flow-note"><p class="help">Tek birincil eylem Excel olarak indir: Raporlar sayfasını bu ders ve tarihle açar, dosyayı orada SheetJS hazırlar (' + K('panel-excel', 'Excel ve baskı') + '). Anahtar rakam Var sayısı. Kafa sayısı girilene kadar sayfa yalnız kafa sayısı satırını gösterir; kayıt sütunları ve sayılar ondan sonra gelir (' + P('kararlar-kafa-sayisi', 'Kafa sayısı') + ').</p>' +
      '<p class="help">Doğrulanmış olağan etikettir, tabloda yazılmaz; Etiketler sütununda yalnız öbürleri durur. Var dışındaki kararın ve hoca onaylı Var\'ın gerekçesi kararın yanında yazar; planda adı geçen tek gerekçe "yoklamada sınıfta değil", öbür gerekçe adları örnektir. Kararı açık satırın Son durum hücresi boştur; ekran okuyucu "son durum henüz yok" duyar.</p>' +
      '<p class="help">Ad soyad sütunu Türkçe harf sırasıyla sıralanır (Intl.Collator tr; ' + K('panel-cati', 'Web paneli, Çatı') + '). Sıralama ve süzmede tablo gövdesi çapraz geçer (' + ref('etkilesim', 'Etkileşim tablosu') + ', tablo). Menü düğmesi gezinmeyi sağdan açılan yan panelde açar (aynı tablo, yan panel). Yol satırındaki bağlantıların tıklama alanı da en az hedef boyundadır' + (target ? ' (' + target + ')' : '') + '.</p></div>') +
    sub('Baskı görünümü', 'rapor ve AKSİS özeti', printView()));
}
panel.title = 'Panel ekranı';
module.exports = panel;
