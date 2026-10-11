// Builds variants/A2/tasarim.html, the design document of İÜ Yoklama, from tokens.json, tokens.css, contrast.html,
// icons.json, qr.json, the embedded fonts, src/specimen.css, src/specimen.js, coverage.json (when present) and the
// section fragments in ../../doc/sections/ (when present; a missing fragment never breaks the build).
// Deterministic: the same inputs give the same page. Output uses CRLF line endings. Run: node tools/build.js
const fs = require('fs'), path = require('path');
const A = path.join(__dirname, '..');
const rd = f => fs.readFileSync(path.join(A, f), 'utf8');
const T = JSON.parse(rd('tokens.json'));
const CHK = JSON.parse(rd('tokens.check.json'));
const ICONS = JSON.parse(rd('icons.json'));
const QR = JSON.parse(rd('qr.json'));
const COV = fs.existsSync(path.join(A, 'coverage.json')) ? JSON.parse(rd('coverage.json')) : null;
const C = require(path.join(A, '..', '..', 'color.js'));
const { springInfo } = require(path.join(A, '..', '..', 'spring.js'));
const argv = process.argv.slice(2);
const optArg = n => { const i = argv.indexOf(n); return i < 0 ? null : argv[i + 1]; };
// --frag-dir <dir> reads fragments from another folder (an empty one proves the fallback); --out <file> writes elsewhere.
const FRAG_DIR = optArg('--frag-dir') ? path.resolve(optArg('--frag-dir')) : path.join(A, '..', '..', 'doc', 'sections');
const OUT = optArg('--out') ? path.resolve(optArg('--out')) : path.join(A, 'tasarim.html');
const REPORT = { fragDir: FRAG_DIR, fragments: [], warnings: [] };

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const tr = (x, d = 1) => Number(x).toFixed(d).replace('.', ',');
const scale = {};
T.color.neutral.forEach(s => { scale['neutral.' + s.step] = s.hex; });
T.color.accent.forEach(s => { scale['accent.' + s.step] = s.hex; });
const resolve = v => (/^#/.test(v) ? v.toUpperCase() : scale[v] || (T.color.roles[v] ? resolve(T.color.roles[v]) : null));
const cssVar = ref => (/^#/.test(ref) ? ref : 'var(--' + ref.replace(/\./g, '-') + ')');
const durOf = n => T.motion.duration.find(d => d.name === n).ms;
const PLAN = 'plan.html', TEK = 'teknik.html';
const doc = (file, id, label) => '<a href="' + file + '#' + id + '">' + (label || file + '#' + id) + '</a>';

/* ---------- icons ---------- */
const used = new Map();
const need = (name, kind) => { if (!ICONS[name]) throw new Error('icon missing: ' + name); used.set(kind + ':' + name, { name, kind }); };
['error', 'check', 'close', 'cloud_done', 'smartphone'].forEach(n => need(n, 'o20'));
const I = (name, size = 24, filled = false, cls = '') => {
  const kind = filled ? 'f24' : size >= 24 ? 'o24' : 'o20';
  need(name, kind);
  const id = (kind === 'f24' ? 'if-' : kind === 'o24' ? 'i-' : 'i20-') + name;
  return '<svg class="ic' + (size === 24 ? '' : ' ic' + size) + (cls ? ' ' + cls : '') + '" aria-hidden="true"><use href="#' + id + '"></use></svg>';
};
const sprite = () => '<svg class="vh" aria-hidden="true" focusable="false"><defs>' + [...used.values()].map(({ name, kind }) => {
  const id = (kind === 'f24' ? 'if-' : kind === 'o24' ? 'i-' : 'i20-') + name;
  return '<symbol id="' + id + '" viewBox="0 -960 960 960"><path d="' + ICONS[name][kind] + '"></path></symbol>';
}).join('') + '</defs></svg>';

/* ---------- statuses ---------- */
const ATT = Object.fromEntries(T.color.attendance.map(a => [a.key, a]));
const stamp = (key, label, icon, extra = '') => '<span class="stamp st-' + key + (extra ? ' ' + extra : '') + '">' + I(icon, 16) + '<span>' + esc(label) + '</span></span>';
const ind = (key, label, icon, extra = '') => '<span class="ind st-' + key + (extra ? ' ' + extra : '') + '">' + I(icon, 16) + esc(label) + '</span>';
const att = (k, kind = 'stamp', extra = '') => (kind === 'stamp' ? stamp(k, ATT[k].label, ATT[k].icon, extra) : ind(k, ATT[k].label, ATT[k].icon, extra));
const DEC = { var: ['Var', 'check'], beklemede: ['Beklemede', 'schedule'], incelemede: ['İncelemede', 'search'], ret: ['Ret', 'block'] };
const dec = (k, kind = 'stamp', extra = '') => (kind === 'stamp' ? stamp(k, DEC[k][0], DEC[k][1], extra) : ind(k, DEC[k][0], DEC[k][1], extra));
// Warning level: written level plus a four-step scale (8 px high); it shows the warning level, never the remaining rights.
const lvl = (n, cls) => '<span class="lvl l' + n + ' ' + cls + '"><span class="lvl-t">Düzey ' + n + '/4</span><span class="lvl-bar" aria-hidden="true"><i></i><i></i><i></i><i></i></span></span>';
const brand = (cls = 'brand-mark') => '<svg class="' + cls + '" viewBox="0 0 28 28" aria-hidden="true"><rect x="1" y="1" width="26" height="26"></rect><path d="M8 14.5l4 4 8.5-9"></path></svg>';
const vh = t => '<span class="vh">' + t + '</span>';

/* ---------- phone partials ---------- */
const statusBar = (t = '10:03') => '<div class="ph-status"><span class="num">' + t + '</span><span class="sys">' + I('signal_cellular_4_bar', 16) + I('wifi', 16) + I('battery_full', 16) + '</span></div>';
const device = (id, inner) => '<div class="device"><div class="device-screen" id="' + id + '"><i class="device-notch" aria-hidden="true"></i>' + inner + '</div></div>';
const tabbar = (active, xr) => '<nav class="ph-tabbar" aria-label="Öğrenci">' + [['today', 'Bugün'], ['history', 'Kayıtlar'], ['person', 'Hesap']].map(([ic, l]) =>
  '<button class="ph-tab" type="button"' + (l === active ? ' aria-current="page"' + (xr ? ' data-xr="4"' : '') : '') + '>' + I(ic, 24, l === active) + l + '</button>').join('') + '</nav>';

function homeScreen(map) {
  const P = (n, st) => (map ? '<span class="pin" style="' + st + '" aria-hidden="true">' + n + '</span>' : '');
  const X = n => (map ? '' : ' data-xr="' + n + '"');
  return '<div class="ph" id="ph-home' + (map ? '-map' : '') + '">' + statusBar() +
    '<div class="ph-top"><p class="ph-date">6 Ekim 2026 Salı</p><h4 class="ph-title">Bugün</h4></div>' +
    '<div class="ph-scroll">' +
    '<div class="ph-card now">' +
    '<div class="now-top"><span class="code">BİL 301</span><span>Teori</span><span class="room">' + I('meeting_room', 16) + 'D-204</span></div>' +
    '<p class="now-name">Veri Yapıları</p><p class="now-time">10:00 ile 11:50 · Dr. Öğr. Üyesi S. Aksoy</p>' +
    '<div class="now-win"><p class="now-state">' + I('timer', 20) + 'Yoklama açık</p>' +
    '<p class="now-fig"><span class="n num"' + (map ? '' : ' data-countdown="702" data-total="900"') + ' aria-label="11 dakika 42 saniye kaldı">11:42</span><span class="u">kaldı</span></p></div>' +
    '<div class="pinwrap">' + P(8, 'right:-10px;top:-8px') + '<div class="prog"' + X(8) + ' role="progressbar" aria-label="Yoklama penceresinin kalan süresi" aria-valuemin="0" aria-valuemax="100" aria-valuenow="78"><span style="transform:scaleX(0.78)"></span></div></div>' +
    '<div class="pinwrap">' + P(1, 'left:-10px;top:-10px') + '<button class="btn btn-primary btn-lg btn-block" type="button"' + X(1) + '>' + I('check', 24) + 'Yoklamamı ver</button></div>' +
    '</div>' +
    '<div class="ph-sec"><span>Hakların</span><span class="pinwrap">' + P(2, 'left:-26px;top:4px') + '<button class="btn btn-ghost btn-sm" type="button"' + (map ? ' data-state="focus"' : '') + '>Tümü</button></span></div>' +
    '<div class="rights">' +
    '<div class="right"><div class="right-top"><div><p class="right-t">Veri Yapıları</p><p class="right-s">Teori · 1 hak kaldı</p></div>' + lvl(2, 'st-warn') + '</div><p class="right-w st-warn">' + I('warning', 16) + 'Bir ders daha kaçırırsan hakkın biter.</p></div>' +
    '<div class="right"><div class="right-top"><div><p class="right-t">Fizik II</p><p class="right-s">Uygulama · 3 hak kaldı</p></div>' + lvl(1, 'st-info') + '</div><p class="right-w st-info">' + I('info', 16) + 'Hakkının yarısını kullandın.</p></div>' +
    '</div></div>' +
    tabbar('Bugün', !map).replace('<button class="ph-tab" type="button" aria-current="page">', '<button class="ph-tab pinwrap" type="button" aria-current="page">' + P(4, 'left:calc(50% + 22px);top:-12px')) +
    '</div>';
}

const qrSvg = (code, attrs = '') => '<svg viewBox="-4 -4 ' + (code.size + 8) + ' ' + (code.size + 8) + '"' + attrs + '><rect class="qr-bg" x="-4" y="-4" width="' + (code.size + 8) + '" height="' + (code.size + 8) + '"></rect><path class="qr-m" d="' + code.d + '"></path></svg>';

// Camera scene seen from a back row: a dark classroom, blurred ceiling lights, the projection high on the wall carrying
// only the attendance QR (the projector page shows nothing else), in perspective, and out-of-focus heads in front.
// The attendance QR is read at 2x (plan.html#asama23-okutma), so the scene opens zoomed; 1x shows the whole room.
// Neutral tokens and black only (0 percent midnight blue), no photo, no network.
const camScene = () => '<div class="cam" aria-hidden="true" style="transform:scale(2)"><div class="cam-room"></div><div class="cam-lights"><i></i><i></i><i></i></div><div class="cam-spill"></div>' +
  '<div class="cam-wall"><div class="cam-board"><div class="cam-qr">' + qrSvg(QR[3], ' class="qr-svg"') + '</div></div></div>' +
  '<div class="cam-heads"><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="cam-vig"></div></div>';

function scanScreen() {
  return '<div class="ph dark" id="ph-scan">' + camScene() +
    '<div class="scan-ui">' + statusBar('10:03') +
    '<div class="scan-top"><button class="icon-btn" type="button" aria-label="Kapat">' + I('close') + '</button><div class="scan-tt"><p class="t">QR\'ı okut</p><p class="s">Veri Yapıları · <span class="num" data-countdown="702" data-total="900">11:42</span> kaldı</p></div><button class="icon-btn" type="button" aria-label="Fener" aria-pressed="false" data-press>' + I('flashlight_on') + '</button></div>' +
    '<div class="scan-mid"><div class="scan-frame"><i></i><i></i><i></i><i></i></div></div>' +
    '<p class="scan-hint" role="status"><span>Tahtadaki QR\'ı çerçevenin içine al</span></p>' +
    '<div class="zoom" role="radiogroup" aria-label="Yakınlaştırma"><button type="button" role="radio" aria-checked="false" tabindex="-1" data-zoom="1">1x</button><button type="button" role="radio" aria-checked="true" data-zoom="2">2x</button></div>' +
    '<div class="scan-bot"><button class="btn btn-inv btn-lg" type="button">' + I('dialpad', 20) + 'Yedek kodu gir</button></div>' +
    '</div></div>';
}

// Receipt timeline (graft from direction B, redrawn in this system's ink): each step brings its node, line, text and time.
const step = (cls, t, s, time) => '<li class="rs ' + cls + '"><span class="rs-m" aria-hidden="true"></span><div class="rs-x"><p class="rs-t">' + t + '</p><p class="rs-s">' + s + '</p></div><p class="rs-time num">' + time + '</p></li>';
function successScreen() {
  const on = '<ol class="rsteps" data-v="on" aria-label="Makbuz adımları">' +
    step('done lit', 'Telefonda kayıtlı', 'İmzalandı, telefona yazıldı', '10:03:21') +
    step('done lit', 'Sunucuya ulaştı', 'İnternet vardı, hemen gönderildi', '10:03:23') +
    step('done', 'Sunucu kararı', ind('var', 'Var', 'check'), '10:03:24') + '</ol>';
  const off = '<ol class="rsteps" data-v="off" data-off aria-label="Makbuz adımları">' +
    step('done', 'Telefonda kayıtlı', 'İmzalandı, telefona yazıldı', '10:03:21') +
    step('wait', 'Sunucuya ulaştı', 'İnternet yok', 'bekliyor') +
    step('wait', 'Sunucu kararı', 'Gönderimden sonra gelir', '') + '</ol>';
  return '<div class="ph" id="ph-success">' + statusBar() +
    '<div class="ok-body"><div class="ok-in">' +
    '<svg class="ok-mark" viewBox="0 0 64 64" aria-hidden="true" data-xr="7"><rect x="1" y="1" width="62" height="62" pathLength="1"></rect><path d="M17 33l10 10 20-21" pathLength="1"></path></svg>' +
    '<h4 class="ph-title ok-t">Yoklaman kaydedildi</h4><p class="ok-meta">Veri Yapıları · Teori · D-204</p>' +
    '<div class="rcpt"><p class="rcpt-h"><span>Makbuz</span><span>6 Ekim 2026 Salı</span></p><div class="swap">' + on + off + '</div></div>' +
    '<p class="ok-help swap"><span data-v="on">Makbuz Kayıtlar ekranında da durur.</span><span data-v="off" data-off>İnternet gelince kendiliğinden gönderilir. Uygulamayı kapatabilirsin.</span></p>' +
    '</div></div>' +
    '<div class="ph-actions"><button class="btn btn-primary btn-lg btn-block" type="button" data-xr="1">Tamam</button><button class="btn btn-ghost btn-lg btn-block" type="button">' + I('qr_code_2', 24) + 'Makbuz QR\'ını göster</button></div>' +
    '</div>';
}

function qrScreen() {
  return '<div class="ph" id="ph-qr">' + statusBar() +
    '<div class="qr-top"><div><p class="qr-course">BİL 301 Veri Yapıları</p><p class="qr-meta">Teori · D-204 · 10:00 ile 11:50</p></div><button class="icon-btn" type="button" aria-label="Kapat">' + I('close') + '</button></div>' +
    '<div class="qr-plate">' + qrSvg(QR[0], ' data-qr="qr-left" role="img" aria-label="Yoklama QR kodu, 5 saniyede bir değişir"') + '</div>' +
    '<div class="qr-info"><div><p class="k">Yeni kod</p><p class="v num"><span id="qr-left">5</span> sn</p></div><div><p class="k">Yoklama</p><p class="v num">11:42 kaldı</p></div></div>' +
    '<p class="qr-note">' + I('brightness_high', 16) + 'Ekran açık tutuluyor · İnternetsiz çalışır</p>' +
    '<p class="qr-help">Okutamayan öğrenciye yedek kodu göster ya da listeden elle ekle.</p>' +
    '<div class="ph-actions two" style="margin-top:auto"><button class="btn btn-secondary btn-lg" type="button">' + I('dialpad', 20) + 'Yedek kod</button><button class="btn btn-ghost btn-lg" type="button" data-dialog="dlg-close">Erken kapat</button></div>' +
    '</div>';
}

const REPORT_RULE = { karar: 'Karar telefonuna ulaştıktan sonraki 3 gün içinde bildirebilirsin. Bildirim hocanın listesine düşer.', bekliyor: 'Süre, sunucu kararı telefonuna ulaşınca başlar; o andan sonraki 3 gün içinde bildirebilirsin. Bildirim hocanın listesine düşer.' };
function recordsScreen() {
  const pend = () => '<span class="swap" data-pending><span data-v="pending">' + stamp('tel', 'Telefonda kayıtlı, gönderilmedi', 'smartphone') + '</span><span data-v="sent" data-off>' + stamp('ulasti', 'Sunucuya ulaştı', 'cloud_done') + '</span></span>';
  const row = (t, s, rec, karar, st) => '<div class="rec-row"><div><p class="t">' + t + '</p><p class="s">' + s + '</p></div>' +
    '<button class="btn btn-ghost btn-icon btn-lg" type="button" aria-label="Sorun bildir: ' + rec + '" data-sheet-open data-rec="' + rec + '" data-karar="' + (karar ? 1 : 0) + '">' + I('flag', 24) + '</button>' +
    '<div class="rec-st">' + st + '</div></div>';
  return '<div class="ph offline" id="ph-records">' + statusBar() +
    '<div class="pbanner" role="status">' + I('cloud_off', 20) + '<p><b>İnternet yok.</b> İnternet gelince kendiliğinden gönderilir. Uygulamayı kapatabilirsin.<small>2 kayıt telefonda bekliyor</small></p></div>' +
    '<div class="ph-main push"><div class="ph-top"><p class="ph-date">Ekim 2026</p><h4 class="ph-title">Kayıtlar</h4></div>' +
    '<div class="ph-scroll"><div class="rec">' +
    row('Algoritmalar', '6 Ekim, 13:04 · Teori', 'Algoritmalar, 6 Ekim 13:04', false, pend()) +
    row('Veri Yapıları', '6 Ekim, 10:03 · Teori', 'Veri Yapıları, 6 Ekim 10:03', false, pend()) +
    row('Ayrık Matematik', '5 Ekim, 15:02 · Teori', 'Ayrık Matematik, 5 Ekim 15:02', true, stamp('ulasti', 'Sunucuya ulaştı', 'cloud_done') + dec('var').replace('class="stamp st-var"', 'class="stamp st-var" data-xr="7"')) +
    row('Fizik II', '3 Ekim, 09:05 · Uygulama', 'Fizik II, 3 Ekim 09:05', true, stamp('ulasti', 'Sunucuya ulaştı', 'cloud_done') + dec('incelemede')) +
    '</div></div></div>' + tabbar('Kayıtlar', true) +
    '<div class="sheet-scrim" aria-hidden="true"></div>' +
    '<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sh-t" aria-describedby="sh-d" aria-hidden="true" inert>' +
    '<div class="sheet-grab" aria-hidden="true"></div>' +
    '<div class="sheet-h"><h4 id="sh-t">Sorun bildir</h4><button class="icon-btn" type="button" aria-label="Kapat" data-sheet-close>' + I('close') + '</button></div>' +
    '<div class="sheet-d" id="sh-d"><p class="sheet-rec" data-sheet-rec>Fizik II, 3 Ekim 09:05</p><p data-sheet-rule data-karar-text="' + esc(REPORT_RULE.karar) + '" data-bekliyor-text="' + esc(REPORT_RULE.bekliyor) + '">' + REPORT_RULE.karar + '</p></div>' +
    '<div class="opt-list" role="radiogroup" aria-labelledby="sh-t">' +
    ['Telefonum yoktu ya da çalışmadı', "QR'ı okutamadım", 'Kaydım yanlış derse düştü'].map((o, i) => '<button class="opt" type="button" role="radio" aria-checked="false" tabindex="' + (i ? -1 : 0) + '">' + I('radio_button_unchecked', 20, false, 'r-off') + I('radio_button_checked', 20, false, 'r-on') + '<span>' + o + '</span></button>').join('') +
    '</div><p class="msg" role="status"></p>' +
    '<div class="sheet-f"><button class="btn btn-primary btn-lg btn-block" type="button" data-sheet-send>Bildir</button></div>' +
    '</div></div>';
}

/* ---------- panel screen: one class of 53 students; every figure on the screen is counted from these rows ---------- */
const FIRST = ['Ayşe', 'Berk', 'Burak', 'Can', 'Cem', 'Ceren', 'Çağla', 'Çınar', 'Defne', 'Deniz', 'Doruk', 'Ece', 'Ege', 'Elif', 'Emre', 'Eren', 'Esra', 'Fatma', 'Furkan', 'Gizem', 'Gökçe', 'Hakan', 'Hande', 'Ilgın', 'Irmak', 'İlayda', 'İrem', 'İsmail', 'Kaan', 'Kerem', 'Kübra', 'Melike', 'Mehmet', 'Merve', 'Nehir', 'Oğuz', 'Onur', 'Ömer', 'Özge', 'Pelin', 'Rana', 'Selin', 'Sena', 'Serkan', 'Şeyma', 'Şule', 'Tuna', 'Tuğba', 'Umut', 'Ümran', 'Yasin', 'Zehra', 'Zeynep'];
const LAST = ['Yılmaz', 'Kaya', 'Demir', 'Şahin', 'Çelik', 'Yıldız', 'Yıldırım', 'Öztürk', 'Aydın', 'Özdemir', 'Arslan', 'Doğan', 'Kılıç', 'Aslan', 'Çetin', 'Kara', 'Koç', 'Kurt', 'Özkan', 'Şimşek', 'Polat', 'Özcan', 'Korkmaz', 'Çakır', 'Erdoğan', 'Yavuz', 'Acar', 'Şen', 'Aktaş', 'Güler', 'Yalçın', 'Güneş', 'Bozkurt', 'Bulut', 'Keskin', 'Ünal', 'Turan', 'Gül', 'Özer', 'Işık', 'Kaplan', 'Avcı', 'Tekin', 'Taş', 'Uysal', 'Ateş', 'Çiftçi', 'Karaca', 'Tunç', 'Erdem', 'Duman', 'Uçar', 'Akın'];
if (FIRST.length !== 53 || LAST.length !== 53 || new Set(LAST).size !== 53 || new Set(FIRST).size !== 53) throw new Error('name lists must hold 53 distinct names');
const COLL = new Intl.Collator('tr');
const STUDENTS = FIRST.map((f, i) => ({ name: f + ' ' + LAST[(i * 17 + 5) % 53], no: '0412230' + String(100 + ((i * 37) % 53) * 17).padStart(3, '0') })).sort((a, b) => COLL.compare(a.name, b.name));
// Exceptions by position in the sorted list (so the first screenful shows every state); everyone else is Var.
const SPECIAL = { 2: { fin: 'gorevli' }, 4: { dec: 'incelemede', tags: ['Saat doğrulanamadı', 'İkinci profil'], sel: true }, 6: { fin: 'yok' }, 7: { dec: 'beklemede', tags: ['Kendi beyanı'] }, 9: { dec: 'ret', fin: 'yok', tags: ['İkinci profil'] }, 11: { fin: 'elle' }, 23: { fin: 'belgeli' }, 31: { fin: 'muaf' }, 40: { dec: 'incelemede', tags: ['Cihaz doğrulanmadı'] }, 47: { fin: 'yok' } };
const VARTAGS = { 1: ["QR'sız"], 15: ['Yedek kodlu'], 28: ["QR'sız"], 36: ['Saat doğrulanamadı'] };
const GROUP = { var: 'var', yok: 'yok', gorevli: 'diger', belgeli: 'diger', elle: 'diger', muaf: 'diger' };
const ROWS = STUDENTS.map((s, k) => {
  const sp = SPECIAL[k] || { dec: 'var', fin: 'var', tags: VARTAGS[k] || [] };
  const hasRecord = !!sp.dec;
  return { ...s, dec: sp.dec || null, fin: sp.fin || null, tags: sp.tags || [], sel: !!sp.sel, t: hasRecord ? '10:' + String(1 + ((k * 7) % 14)).padStart(2, '0') : '', f: sp.fin ? GROUP[sp.fin] : 'bekleyen' };
});
const N = ROWS.length;
const cnt = f => ROWS.filter(r => r.f === f).length;
const cntDec = d => ROWS.filter(r => r.dec === d).length;
const cntFin = d => ROWS.filter(r => r.fin === d).length;
const RECORDS = ROWS.filter(r => r.t).length, HEAD = 46, DIFF = RECORDS - HEAD;
const FLAGGED = DIFF > 3 && DIFF > HEAD * 0.05; // plan.html#hile-otomatik-kabul-kurali: more than 3 people and more than 5 percent
const GROUPS = [['var', 'Var'], ['yok', 'Yok'], ['bekleyen', 'Karar bekleyen'], ['diger', 'Düzeltme ve muaf']];
if (GROUPS.reduce((a, [f]) => a + cnt(f), 0) !== N) throw new Error('panel groups do not add up to ' + N);

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

/* ---------- coverage ---------- */
const SCREENS = [
  { sel: '#scr-home', name: 'Öğrenci ana ekranı', sub: 'Bugün, yoklama açık', kind: 'phone' },
  { sel: '#scr-scan', name: 'QR okutma', sub: 'Kamera, Aşama 2', kind: 'phone' },
  { sel: '#scr-success', name: 'Yoklama kaydedildi', sub: 'Makbuz ve karar', kind: 'phone' },
  { sel: '#scr-qr', name: 'Hoca QR ekranı', sub: 'İnternetsiz QR', kind: 'phone' },
  { sel: '#scr-records', name: 'Kayıtlar', sub: 'Çevrimdışı şeridi açık', kind: 'phone' },
  { sel: '#scr-panel', name: 'Panel yoklama tablosu', sub: '1440 ve 390 px', kind: 'panel' }
];
const covOf = (sel, w = '1440') => COV && COV[w] && COV[w][sel];
const budget = k => (k === 'panel' ? T.coverageBudget.panel : T.coverageBudget.phone);
const mixBar = p => '<span class="m-zemin" style="flex:' + p.zemin + '"></span><span class="m-gri" style="flex:' + p.gri + '"></span><span class="m-mavi" style="flex:' + p['gece mavisi'] + '"></span><span class="m-mor" style="flex:' + p.mor + '"></span><span class="m-kirmizi" style="flex:' + p['kırmızı'] + '"></span>';
function coverageBlock() {
  if (!COV) return '<p class="body">Ölçüm henüz alınmadı: <code>node tools/measure.js</code></p>';
  const max = 10;
  let lastKind = '';
  return '<div class="cov"><div class="cov-axis" aria-hidden="true"><span>Ekran</span><span class="ax"><span>%0</span><span>%5</span><span>%10</span></span><span style="text-align:right">gece mavisi</span></div>' + SCREENS.map(s => {
    const p = covOf(s.sel), p390 = covOf(s.sel, '390');
    if (!p) return '';
    const v = p['gece mavisi'], b = budget(s.kind), ok = v <= b && (!p390 || p390['gece mavisi'] <= b);
    const first = s.kind !== lastKind; lastKind = s.kind;
    return '<div class="cov-row"><p class="cov-name">' + s.name + '<small>' + s.sub + '</small></p>' +
      '<div class="cov-bars"><div class="cov-track" role="img" aria-label="Gece mavisi payı yüzde ' + tr(v, 2) + ', bütçe yüzde ' + b + '"><span class="cov-fill" style="width:' + Math.min(100, (v / max) * 100) + '%"></span><span class="cov-budget' + (b / max > 0.5 ? ' l' : '') + '"' + (first ? ' data-l="bütçe %' + b + '"' : '') + ' style="left:' + (b / max) * 100 + '%"></span></div>' +
      '<div class="cov-mix">' + mixBar(p) + '</div></div>' +
      '<p class="cov-val">%' + tr(v, 2) + '<small>' + (ok ? 'bütçe içinde' : 'bütçe aşıldı') + '</small>' + (p390 ? '<small>390 px\'te %' + tr(p390['gece mavisi'], 2) + '</small>' : '') + '</p></div>';
  }).join('') + '</div>' +
    '<p class="help" style="margin-top:12px;max-width:none">Ölçek %0 ile %10 arası; siyah dikey çizgi bütçe. İnce şerit ekranın bütün renk dağılımı (kırık beyaz, gri, gece mavisi, mor, kırmızı); sarı ve yeşil ailesi her ekranda %0. Yazı gri tonlu kenar yumuşatmayla ölçüldü: telefonlar böyle çizer, masaüstünün alt piksel renk saçakları tasarım rengi değildir. Kaynak: shot.js --elements, coverage.js (' + esc(COV.date) + ').</p>';
}
// Measured share and budget under each drawn screen (values come from coverage.json, never typed).
function covBar(sel, kind) {
  const p = covOf(sel), p390 = covOf(sel, '390');
  if (!p) return '';
  const v = p['gece mavisi'], b = budget(kind), max = 10;
  return '<div class="sbar" data-cov-sel="' + sel + '" data-cov="' + v + '"' + (p390 ? ' data-cov390="' + p390['gece mavisi'] + '"' : '') + '><div class="sbar-track" role="img" aria-label="Ölçülen gece mavisi payı yüzde ' + tr(v, 2) + ', bütçe yüzde ' + b + '"><span class="sbar-fill" style="width:' + Math.min(100, v / max * 100).toFixed(2) + '%"></span><span class="sbar-b" style="left:' + (b / max * 100) + '%"></span></div>' +
    '<p class="sbar-t"><span>gece mavisi <b>%' + tr(v, 2) + '</b>' + (p390 ? ' · 390 px\'te %' + tr(p390['gece mavisi'], 2) : '') + '</span><span>bütçe %' + b + '</span></p></div>';
}

/* ---------- color tables ---------- */
const ramp = (name, usedSteps) => '<div class="ramp" role="img" aria-label="' + (name === 'neutral' ? 'Nötr' : 'Gece mavisi') + ' ölçeği, 12 adım">' + T.color[name].map(s => {
  const dark = C.wcagRatio(resolve('text.onInverse'), s.hex) > C.wcagRatio(resolve('text.primary'), s.hex);
  if (Math.max(C.wcagRatio(resolve('text.onInverse'), s.hex), C.wcagRatio(resolve('text.primary'), s.hex)) < 3) throw new Error('ramp label contrast below 3:1 on ' + s.hex);
  const off = usedSteps && !usedSteps.includes(s.step);
  return '<div class="' + (dark ? 'dark' : '') + (off ? ' off' : '') + '" style="background-color:var(--' + name + '-' + s.step + ')"><b>' + s.step + '</b></div>';
}).join('') + '</div>';
const scaleTable = (name, usedSteps) => '<div class="scroll-x" style="margin-top:16px"><table class="tbl-doc ramp-tbl"><thead><tr><th>Token</th><th>Hex</th><th class="r">L</th><th class="r">C</th><th class="r">H</th><th>Görev</th></tr></thead><tbody>' +
  T.color[name].map(s => {
    const off = usedSteps && !usedSteps.includes(s.step);
    return '<tr><td class="mono"><span class="role-chip"><i style="background:var(--' + name + '-' + s.step + ')"></i>' + name + '.' + s.step + '</span></td><td class="mono">' + s.hex + '</td><td class="r mono">' + tr(s.L, 4) + '</td><td class="r mono">' + tr(s.C, 4) + '</td><td class="r mono">' + tr(s.H, 1) + '</td><td' + (off ? ' class="u-off"' : '') + '>' + esc(s.use) + '</td></tr>';
  }).join('') + '</tbody></table></div>';
const ROLE_GROUPS = [['Zemin', 'bg.'], ['Metin', 'text.'], ['İkon', 'icon.'], ['Kenar', 'border.'], ['Mürekkep ve sinyal', 'accent.'], ['Tehlike', 'danger.'], ['Odak ve bağlantı', 'focus.'], ['QR ve örtü', 'qr.']];
function rolesTable() {
  const all = Object.entries(T.color.roles);
  return '<div class="roles">' + ROLE_GROUPS.map(([g, pre]) => {
    const list = all.filter(([k]) => k.startsWith(pre) || (pre === 'focus.' && k === 'link') || (pre === 'qr.' && k === 'scrim'));
    return '<div class="role-g"><h4>' + g + '</h4>' + list.map(([k, v]) => '<div class="role-r"><i style="background:' + cssVar(k) + '"></i><p class="n">' + k + '</p><p class="v">' + (/^#/.test(v) ? v : v + ' · ' + resolve(v)) + '</p></div>').join('') + '</div>';
  }).join('') + '</div>';
}
function statusTable() {
  const f = ['solid', 'onSolid', 'text', 'subtle', 'border'];
  const names = { success: 'Başarı (gece mavisi)', warning: 'Uyarı (mor)', danger: 'Tehlike (kırmızı)', info: 'Bilgi (grafit)' };
  return '<div class="scroll-x"><table class="tbl-doc"><thead><tr><th>Durum</th>' + f.map(x => '<th>' + x + '</th>').join('') + '</tr></thead><tbody>' +
    Object.entries(T.color.status).map(([k, v]) => '<tr><td>' + names[k] + '</td>' + f.map(x => '<td><span class="role-chip"><i style="background:var(--status-' + k + '-' + x + ')"></i>' + resolve(v[x]) + '</span></td>').join('') + '</tr>').join('') +
    '</tbody></table></div>';
}

/* ---------- type ---------- */
const PHONE_SAMPLE = { rakam: '11:42', 'baslik-1': 'Bugün', 'baslik-2': 'Sorun bildir', 'baslik-3': 'Veri Yapıları', govde: 'Pencere ders saatinde kendiliğinden açılır; süre dolunca düğme kapanır.', dugme: 'Yoklamamı ver', 'govde-kucuk': 'Bu kodu yalnız uygulamaya ya da panele gir.', etiket: 'Belgeli düzeltme', mini: 'Kayıtlar · 10:03', kod: '246 810', numara: '0412230017' };
const PANEL_SAMPLE = { 'etiket-01': 'Son değişiklik 6 Ekim 2026 Salı, 14:05', 'govde-kompakt-01': 'İrem Aydın · İkinci profil', 'govde-01': 'Değişiklikler uygulanmadan önce gösterilir.', 'govde-02': 'Muaf öğrenciye hak uyarısı gitmez.', 'baslik-kompakt-01': 'Sunucu kararı', 'baslik-kompakt-02': 'Öğrenci listesi', 'baslik-03': 'Bugünkü dersler', 'baslik-04': 'Yoklama, BİL 301', 'baslik-05': 'Giriş', rakam: String(cnt('var')), 'kod-01': '--accent-fill', 'kod-02': '0412230017' };
const MONO = new Set(['kod', 'numara', 'kod-01', 'kod-02']);
const tsRows = (list, samples, unit, inkFigure) => list.map(s => {
  const fam = MONO.has(s.name) ? 'var(--font-mono)' : 'var(--font-sans)';
  const ink = s.name === 'rakam' && inkFigure ? ';color:var(--text-figure)' : '';
  return '<div class="ts-row"><p class="ts-meta"><b>' + s.name + '</b>' + s.size + '/' + s.line + ' ' + unit + ' · ' + s.weight + ' · ' + String(s.tracking).replace('.', ',') + (MONO.has(s.name) ? ' · Mono' : '') + '</p>' +
    '<div class="ts-sample"><p style="font:' + s.weight + ' ' + s.size + 'px/' + s.line + 'px ' + fam + ';letter-spacing:' + s.tracking + 'px' + ink + '">' + esc(samples[s.name] || s.use) + '</p><span class="ts-use">' + esc(s.use) + '</span></div></div>';
}).join('');

/* ---------- corner macro ---------- */
function cornerMacro() {
  const u = 24, W = 30 * u, H = 10 * u;
  let grid = '';
  for (let x = u; x < W; x += u) grid += 'M' + x + ' 0V' + H;
  for (let y = u; y < H; y += u) grid += 'M0 ' + y + 'H' + W;
  const lab = (y, k, v) => '<path class="dim" d="M' + (W + 4) + ' ' + y + 'H' + (W + 20) + '"></path><text x="' + (W + 28) + '" y="' + (y + 4) + '"><tspan class="k">' + k + '</tspan>' + v + '</text>';
  return '<svg viewBox="0 -8 ' + (W + 340) + ' ' + (H + 44) + '" role="img" aria-label="Kontrol köşesi 16 kat büyütülmüş: 1 px kenar, 2 px boşluk, 2 px odak halkası, köşe yarıçapı 0">' +
    '<rect class="page" x="0" y="0" width="' + W + '" height="' + H + '"></rect>' +
    '<path class="ring" d="M0 0H' + W + 'V' + 2 * u + 'H' + 2 * u + 'V' + H + 'H0Z"></path>' +
    '<path class="bd" d="M' + 4 * u + ' ' + 4 * u + 'H' + W + 'V' + 5 * u + 'H' + 5 * u + 'V' + H + 'H' + 4 * u + 'Z"></path>' +
    '<rect class="in" x="' + 5 * u + '" y="' + 5 * u + '" width="' + (W - 5 * u) + '" height="' + (H - 5 * u) + '"></rect>' +
    '<path class="px" d="' + grid + '"></path>' +
    lab(u, 'Odak halkası ', '2 px · accent.9') + lab(3 * u, 'Boşluk ', '2 px · zemin') + lab(4.5 * u, 'Kenar ', '1 px · neutral.9') + lab(8.5 * u, 'Köşe ', '0 px') +
    '<text x="0" y="' + (H + 28) + '">1 kare = 1 CSS px · halka da köşesiz, öğenin dış çizgisini izler</text></svg>';
}

/* ---------- motion ---------- */
function curveSvg(b) {
  const S = 200, P = (x, y) => (x * S).toFixed(1) + ' ' + ((1 - y) * S).toFixed(1);
  let g = '';
  for (let i = 1; i < 4; i++) g += '<path class="grid" d="M' + (i * S / 4) + ' 0V' + S + 'M0 ' + (i * S / 4) + 'H' + S + '"></path>';
  return '<svg viewBox="-8 -8 216 216" role="img" aria-label="cubic-bezier(' + b.join(', ') + ')">' + g + '<path class="ax" d="M0 0V200H200"></path>' +
    '<path class="hd" d="M' + P(0, 0) + 'L' + P(b[0], b[1]) + 'M' + P(1, 1) + 'L' + P(b[2], b[3]) + '"></path>' +
    '<path class="cv" d="M' + P(0, 0) + 'C' + P(b[0], b[1]) + ' ' + P(b[2], b[3]) + ' ' + P(1, 1) + '"></path>' +
    '<rect class="cp" x="' + (b[0] * S - 3) + '" y="' + ((1 - b[1]) * S - 3) + '" width="6" height="6"></rect><rect class="cp" x="' + (b[2] * S - 3) + '" y="' + ((1 - b[3]) * S - 3) + '" width="6" height="6"></rect></svg>';
}
function springSvg(s) {
  const k = s.stiffness, c = s.damping, m = s.mass, dt = 1 / 2000; let x = 0, v = 0, t = 0; const pts = [];
  const info = springInfo(c, k, m);
  const T0 = info.settleMs / 1000;
  while (t <= T0) { const a = (-k * (x - 1) - c * v) / m; v += a * dt; x += v * dt; t += dt; pts.push([t, x]); }
  const S = 200, st = Math.max(1, Math.floor(pts.length / 80));
  const d = pts.filter((_, i) => i % st === 0).map((p, i) => (i ? 'L' : 'M') + ((p[0] / T0) * S).toFixed(1) + ' ' + ((1 - p[1] / 1.1) * S).toFixed(1)).join('');
  let g = '';
  for (let i = 1; i < 4; i++) g += '<path class="grid" d="M' + (i * S / 4) + ' 0V' + S + '"></path>';
  const one = ((1 - 1 / 1.1) * S).toFixed(1);
  return { info, svg: '<svg viewBox="-8 -8 216 216" role="img" aria-label="Yay eğrisi">' + g + '<path class="ov" d="M0 ' + one + 'H200"></path><path class="ax" d="M0 0V200H200"></path><path class="cv" d="M0 200' + d.replace(/^M/, 'L') + '"></path></svg>' };
}

/* ---------- navigation, fragments and section numbers ---------- */
// Fragments written by other agents into ../../doc/sections/. A missing (or unusable) fragment leaves this page's own
// section in place, or nothing, so the build never breaks. "{{no}}" in a fragment becomes its number in the navigation.
const FRAGS = {
  ozet: { file: 'ozet.html', title: 'Özet' },
  ilkeler: { file: 'ilkeler.html', title: 'İlkeler' },
  erisilebilirlik: { file: 'erisilebilirlik.html', title: 'Erişilebilirlik' },
  platform: { file: 'platform.html', title: 'Platform' },
  kutuphaneler: { file: 'kutuphaneler.html', title: 'Kütüphaneler' },
  acik: { file: 'acik.html', title: 'Açık noktalar' },
  kaynaklar: { file: 'kaynaklar.html', title: 'Kaynaklar' }
};
const OWN = { 'gece-mavisi': 'Gece mavisi nerede', dogru: 'Doğru ve yanlış', ekranlar: 'Telefon ekranları', panel: 'Panel ekranı', renk: 'Renk', kontrast: 'Kontrast', durumlar: 'Durumlar', tipografi: 'Tipografi', bicim: 'Biçim ve boşluk', ikonlar: 'İkonlar', bilesenler: 'Bileşenler', katmanlar: 'Katmanlar', hareket: 'Hareket', etkilesim: 'Etkileşim tablosu', platform: 'Platform', kaynaklar: 'Kaynaklar' };
const ORDER = ['ozet', 'ilkeler', 'gece-mavisi', 'dogru', 'ekranlar', 'panel', 'renk', 'kontrast', 'durumlar', 'tipografi', 'bicim', 'ikonlar', 'bilesenler', 'katmanlar', 'erisilebilirlik', 'hareket', 'etkilesim', 'platform', 'kutuphaneler', 'acik', 'kaynaklar'];
const stripTags = s => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
function loadFragment(id) {
  const f = FRAGS[id];
  const p = path.join(FRAG_DIR, f.file);
  if (!fs.existsSync(p)) { REPORT.fragments.push({ id, file: f.file, used: false, why: 'yok' }); return null; }
  let h = fs.readFileSync(p, 'utf8').replace(/^﻿/, '').trim();
  // Include markers a fragment may carry: <!--@lib-tables--> (the generated library tables, doc/kutuphaneler.html)
  // and <!--@include path--> (path relative to doc/, as in assemble.js). A missing target leaves the marker and is reported.
  const DOC_DIR = path.join(FRAG_DIR, '..');
  h = h.replace(/<!--@lib-tables-->/g, '<!--@include kutuphaneler.html-->').replace(/<!--@include ([^>]+?)-->/g, (m, rel) => {
    const t = path.join(DOC_DIR, rel.trim());
    if (!fs.existsSync(t)) { REPORT.warnings.push(f.file + ': içe alınacak dosya yok: ' + rel.trim()); return m; }
    const inc = fs.readFileSync(t, 'utf8').replace(/^﻿/, '').trim();
    REPORT.fragments.push({ id: id + ' > ' + rel.trim(), file: rel.trim(), used: true, bytes: inc.length, included: true });
    return inc;
  });
  const why = [];
  if (/[–—]/.test(h)) why.push('U+2013 ya da U+2014 içeriyor');
  if (!h) why.push('boş');
  if (why.length) { REPORT.fragments.push({ id, file: f.file, used: false, why: why.join('; ') }); REPORT.warnings.push(f.file + ' kullanılmadı: ' + why.join('; ')); return null; }
  const h2 = h.match(/<h2[^>]*>([\s\S]*?)<\/h2>/);
  const title = h2 ? stripTags(h2[1]) || f.title : f.title;
  REPORT.fragments.push({ id, file: f.file, used: true, bytes: h.length, title });
  return { title, html: h };
}
const FRAG_HTML = {};
const NAV = [];
for (const id of ORDER) {
  const fr = FRAGS[id] ? loadFragment(id) : null;
  if (fr) { FRAG_HTML[id] = fr.html; NAV.push({ id, title: fr.title, frag: true }); }
  else if (OWN[id]) NAV.push({ id, title: OWN[id], frag: false });
}
const NO = Object.fromEntries(NAV.map((n, i) => [n.id, String(i + 1).padStart(2, '0')]));
const has = id => !!NO[id];
const ref = (id, text) => (has(id) ? '<a href="#' + id + '">' + text + '</a>' : text);
function fragSection(id) {
  let h = FRAG_HTML[id].split('{{no}}').join(NO[id]);
  const m = h.match(/^<section\b([^>]*)>/);
  if (m) {
    const attrs = m[1];
    if (!new RegExp('\\sid="' + id + '"').test(attrs)) REPORT.warnings.push(FRAGS[id].file + ': kök section kimliği "' + id + '" değil');
    const withCls = /\sclass="/.test(attrs) ? attrs.replace(/\sclass="([^"]*)"/, (x, c) => ' class="' + c + (/\bsec\b/.test(c) ? '' : ' sec') + ' frag"') : attrs + ' class="sec frag"';
    return h.replace(/^<section\b[^>]*>/, '<section' + withCls + '>');
  }
  return '<section id="' + id + '" class="sec frag">' + secHead(id, NAV.find(n => n.id === id).title, '') + h + '</section>';
}
const secHead = (id, title, lead) => '<div class="sec-h"><p class="sec-no">' + NO[id] + '</p><div><h2>' + title + '</h2>' + (lead ? '<p class="lead">' + lead + '</p>' : '') + '</div></div>';
const sub = (title, note, body, id) => '<div class="sub"' + (id ? ' id="' + id + '"' : '') + '><div class="sub-h"><h3>' + title + '</h3>' + (note ? '<p class="note">' + note + '</p>' : '') + '</div>' + body + '</div>';
const section = (id, lead, body) => '<section id="' + id + '" class="sec">' + secHead(id, OWN[id], lead) + body + '</section>';

/* ---------- header ---------- */
const homeCov = covOf('#scr-home');
const MINI = ['<span class="mini-btn"></span>', '<span class="mini-ring"></span>', '<span class="mini-link">bağlantı</span>', '<span class="mini-mark"></span>', '<span class="mini-ctl"><span class="b"></span><span class="s"></span></span>', '<span class="mini-fig num">' + cnt('var') + '</span>', stamp('var', 'Var', 'check'), '<span class="mini-prog"></span>'];
const ON_HOME = [1, 1, 0, 1, 0, 0, 0, 1];
const units = p => {
  const keys = [['zemin', 'u-z', 'Kırık beyaz'], ['gri', 'u-g', 'Gri'], ['gece mavisi', 'u-m', 'Gece mavisi'], ['mor', 'u-v', 'Mor'], ['kırmızı', 'u-r', 'Kırmızı']];
  const raw = keys.map(([k]) => p[k]), base = raw.map(Math.floor);
  let left = 100 - base.reduce((a, c) => a + c, 0);
  raw.map((v, i) => [v - Math.floor(v), i]).sort((a, c) => c[0] - a[0]).forEach(([, i]) => { if (left > 0) { base[i]++; left--; } });
  const cells = keys.map(([, cls], i) => ('<i class="' + cls + '"></i>').repeat(base[i])).join('');
  return { cells, legend: keys.map(([k, cls, l]) => '<span><i class="' + cls + '"></i>' + l + ' <b>%' + tr(p[k]) + '</b></span>').join('') };
};
const U = homeCov ? units(homeCov) : null;
const durMin = Math.min(...T.motion.duration.filter(d => d.ms > 0 && d.name !== 'imza').map(d => d.ms));
const durMax = Math.max(...T.motion.duration.filter(d => d.name !== 'imza').map(d => d.ms));
const header = '<header class="cover" id="ust">' +
  '<h1>İÜ Yoklama</h1>' +
  '<p class="lead">Uygulamanın ve web panelinin görünüşü: renk, yazı, biçim, hareket ve bileşenler.</p>' +
  '<p class="meta">Tasarım kararları · Son güncelleme 6 Ekim 2026 · Plan: <a href="plan.html">plan.html</a> · Teknik ayrıntılar: <a href="teknik.html">teknik.html</a></p>' +
  '<p class="meta">Bu dosya görünüş ve etkileşim kararlarını ve bunları kuran kütüphaneleri gerekçeleriyle anlatır; ürün kararları plan.html\'de, teknik ayrıntılar teknik.html\'dedir. Her bilgi tek yerde durur, öbür dosya bağlantı verir. R ve L ile başlayan kimlikler depo dışındaki tasarım araştırmasına aittir.</p>' +
  '<div class="cover-grid"><div>' +
  '<p class="thesis-lead">Kâğıt ve mürekkep. Zemin kırık beyaz ve gri; gece mavisi yalnız bir karar verildiği yerde, mürekkep gibi görünür.</p>' +
  '<p class="lead2">IBM Plex Sans, 0 köşe, ince çizgi, 4 ve 8 ızgarası, kısa ve aşmasız hareket. Bu sayfadaki her renk, ölçü ve süre tokens.json dosyasından gelir; oranlar ve paylar betikle ölçüldü.</p></div>' +
  (U ? '<figure class="units"><div class="units-grid" role="img" aria-label="Öğrenci ana ekranı 100 kareye bölündü: kırık beyaz yüzde ' + tr(homeCov.zemin) + ', gri yüzde ' + tr(homeCov.gri) + ', gece mavisi yüzde ' + tr(homeCov['gece mavisi']) + '">' + U.cells + '</div>' +
    '<figcaption><p class="units-t">Öğrenci ana ekranı, ölçülen</p><p class="units-leg">' + U.legend + '</p><p class="units-s">1 kare = ekranın yüzde 1\'i · coverage.js</p></figcaption></figure>' : '') +
  '</div>' +
  '<div class="facts"><div class="fact"><p class="k">Zemin</p><p class="v">' + resolve('bg.page') + '</p><p class="s">neutral.2, kırık beyaz; b* ' + tr(C.hexToLab(resolve('bg.page')).b, 2) + '</p></div>' +
  '<div class="fact"><p class="k">Mürekkep</p><p class="v ink">' + resolve('accent.fill') + '</p><p class="s">accent.11; bütçe telefon %' + T.coverageBudget.phone + ', panel %' + T.coverageBudget.panel + '</p></div>' +
  '<div class="fact"><p class="k">Köşe</p><p class="v">0 px</p><p class="s">bütün bileşenler, ' + Object.keys(T.shape.radius).length + ' kalem</p></div>' +
  '<div class="fact"><p class="k">Hareket</p><p class="v">' + durMin + ' ile ' + durMax + ' ms</p><p class="s">tek imza anı ' + durOf('imza') + ' ms</p></div></div>' +
  '</header>';

/* ---------- 'Bir ders boyunca gece mavisi' (graft from direction C, drawn with this system's roles) ---------- */
const LESSON = { from: '10:00', to: '11:50' };
const mins = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const pos = t => ((mins(t) - mins(LESSON.from)) / (mins(LESSON.to) - mins(LESSON.from)) * 100).toFixed(3) + '%';
const LANES = [
  { name: 'Öğrencinin telefonu', sub: 'Bugün, QR okut, kaydedildi (Ö2, Ö3)', bands: [['10:00', '10:15', 'ink']], ticks: ['10:03'],
    ev: [['10:00', [1, 8], 'Pencere açılır: Yoklamamı ver düğmesi ve kalan süre çubuğu'], ['10:03', [7, 1], 'Kayıt anı: kare ve onay işareti, Var ve Tamam; Tamam\'a basılınca kapanır'], ['10:15', [4], 'Pencere kapanır, düğme devre dışı kalır; ekranda yalnız alt sekme işareti']] },
  { name: 'Hocanın telefonu', sub: 'QR gösterme, kafa sayısı (H14, H5)', bands: [['10:00', '10:15', 'none']], ticks: ['11:45'],
    ev: [['10:00', [], 'QR ekranı açık: saf siyah ve beyaz, gece mavisi yok'], ['11:45', [1], 'Kafa sayısı girilir: Kaydet birincil eylemi']] },
  { name: 'Web paneli', sub: 'Projeksiyon sayfası, yoklama tablosu (P12, P2)', bands: [['10:00', '10:15', 'none']], ticks: ['11:50'],
    ev: [['10:00', [], 'Projeksiyon sayfası yalnız QR\'ı gösterir: gece mavisi yok'], ['11:50', [6, 4, 5, 1], 'Yoklama tablosu: Var sayısı, seçim işareti, işaretli kutu, Excel olarak indir']] }
];
const rolePins = ns => ns.map(n => '<span class="tl-pin" title="' + esc(T.accentUsage[n - 1].role) + '">' + n + '</span>').join('');
function lessonTimeline() {
  const inkMin = LANES[0].bands.filter(b => b[2] === 'ink').reduce((a, b) => a + mins(b[1]) - mins(b[0]), 0);
  const total = mins(LESSON.to) - mins(LESSON.from);
  const axis = ['10:00', '10:15', '10:30', '11:00', '11:30', '11:50'];
  return '<div class="tl plate"><p class="plate-cap"><b>Veri Yapıları, 6 Ekim 2026 Salı</b><span>' + LESSON.from + ' ile ' + LESSON.to + '</span></p><div class="plate-body">' +
    LANES.map(l => '<div class="tl-lane"><p class="tl-name"><b>' + l.name + '</b><span>' + l.sub + '</span></p><div class="tl-main">' +
      '<div class="tl-track" aria-hidden="true"><span class="tl-base"></span>' +
      l.bands.map(([a, b, k]) => '<span class="tl-band ' + k + '" style="left:' + pos(a) + ';width:calc(' + pos(b) + ' - ' + pos(a) + ')"></span>').join('') +
      l.ticks.map(t => '<span class="tl-tick" style="left:' + pos(t) + '"></span>').join('') + '</div>' +
      '<ol class="tl-ev">' + l.ev.map(([t, ns, d]) => '<li><span class="tl-t num">' + t + '</span><span class="tl-pins">' + (ns.length ? rolePins(ns) : '<span class="tl-none">yok</span>') + '</span><span class="tl-d">' + d + '</span></li>').join('') + '</ol></div></div>').join('') +
    '<div class="tl-axis num" aria-hidden="true">' + axis.map(t => '<span style="left:' + pos(t) + '">' + t + '</span>').join('') + '</div>' +
    '<div class="tl-key"><span><i class="k-ink"></i>gece mavisi ekranda</span><span><i class="k-none"></i>ekran açık, gece mavisi yok</span><span><i class="k-tick"></i>tek an</span><span><span class="tl-pin">1</span>kullanım haritasındaki rol</span></div>' +
    '<p class="help" style="margin-top:12px;max-width:none">Öğrencinin ekranında dolu gece mavisi derste ' + inkMin + ' dakika durur (' + total + ' dakikalık dersin %' + tr(inkMin / total * 100, 1) + '\'i). Odak halkası (2) yalnız klavyeyle, satır içi bağlantı (3) yalnız gövde metninde görünür; zaman çizgisinde yer almazlar.</p></div></div>';
}

/* ---------- section 'Gece mavisi nerede' ---------- */
const sGece = section('gece-mavisi', 'Gece mavisi bu tasarımda boya değil mürekkeptir: zemine sürülmez, karar verilen yere yazılır. Nötr ölçek aynı ailenin H 270 tonunu taşıdığı için alt ton her gri yüzeyde hissedilir; renk olarak yalnız aşağıdaki sekiz rolde görünür.',
  '<div class="thesis"><p class="thesis-q">Bir ekranda gece mavisi nereye düşüyorsa, kullanıcının <em>yapacağı ya da yaptığı şey</em> oradadır.</p>' +
  '<ol class="rules-3"><li><span class="k">01</span><p><b>Tek dolgu.</b> Her ekranda en çok bir dolu gece mavisi alan vardır: birincil eylem. Ana ekranda kalan süre rakamı bile mavi değildir. İkincil düğmeler gri çerçeveli, hayalet düğmeler çerçevesizdir.</p></li>' +
  '<li><span class="k">02</span><p><b>Seçim işaretle gösterilir.</b> Seçili satır, etkin sekme ve etkin menü öğesi gri kalır; seçimi 2 px mürekkep çizgi anlatır.</p></li>' +
  '<li><span class="k">03</span><p><b>Renkli zemin yoktur.</b> accent.1 ile accent.8 bu tasarımda kullanılmaz: açık mavi seçim, pastel kart, mavi başlık çubuğu olmaz. Durumlar da zeminsizdir; tek istisna yoğun tablodaki Yok ve Ret (gül zemin).</p></li></ol></div>' +
  sub('Kullanım haritası', 'accentUsage · ' + T.accentUsage.length + ' rol', '<div class="usage"><div class="u-list">' + T.accentUsage.map((u, i) =>
    '<div class="u-row"><span class="u-pin">' + (i + 1) + '</span><div class="u-demo">' + MINI[i] + '</div><div><p class="u-role">' + esc(u.role) + '<span class="u-step">' + u.step + ' · ' + resolve(u.step) + '</span></p><p class="u-where">' + esc(u.where) + '</p><p class="u-why">' + esc(u.why) + (ON_HOME[i] ? '' : ' Ana ekran örneğinde yok.') + '</p></div></div>').join('') +
    '</div><div class="device-fig">' + device('scr-home-map', homeScreen(true)) + '<div class="device-cap"><p class="t">Ana ekranda roller<span>' + ON_HOME.map((v, i) => (v ? i + 1 : 0)).filter(Boolean).join(', ') + '</span></p><p class="d">Odak halkası (2) burada gösterim için sürekli çizildi; gerçekte yalnız klavyeyle odaklanınca görünür. Kalan süre rakamı birincil metin renginde: ekranın tek dolu mavi alanı düğmedir.</p></div></div></div>') +
  sub('Hiçbir zaman', 'accentNever', '<ul class="never">' + T.accentNever.map(n => '<li>' + I('block', 20) + '<p>' + esc(n) + '</p></li>').join('') + '</ul>') +
  sub('Bir ders boyunca gece mavisi', 'ne zaman, hangi rol', '<p class="body" style="margin-bottom:16px">Haritadaki rollerin bir ders içinde hangi ekranda ve ne zaman göründüğü. Doygun mavi yalnız iki kısa anda toplanır: pencere açıkken öğrencinin ekranında ve ders sonunda panelde.</p>' + lessonTimeline()) +
  sub('Ölçülen pay', 'bütçe: telefon %' + T.coverageBudget.phone + ', panel %' + T.coverageBudget.panel, '<p class="body" style="margin-bottom:24px">Her ekranın görüntüsü 390 ve 1440 px genişlikte alındı ve gece mavisi ailesindeki pikseller sayıldı (OKLCH tonu 220 ile 290, kroma en az 0,04). ' + ref('ekranlar', 'Telefon ekranları') + ' bölümündeki Röntgen anahtarı aynı ekranlarda yalnız bu pikselleri bırakır.</p>' + coverageBlock()));

const sDogru = section('dogru', 'Aynı içerik, iki karar. Soldaki bu tasarımın çizdiği, sağdaki hiç çizmediği biçim.',
  sub('Üç karar', 'gece mavisinin yeri', '<div class="dd">' +
    '<div class="dd-pair"><p class="dd-title">Seçili satır</p><div class="dd-cell"><div class="mk-rows"><p class="mk-row">BİL 301</p><p class="mk-row sel">MAT 207</p><p class="mk-row">FİZ 102</p></div><p class="dd-verdict v-ok">' + I('check', 16) + 'Doğru</p></div><div class="dd-cell"><div class="mk-rows"><p class="mk-row">BİL 301</p><p class="mk-row bad">MAT 207</p><p class="mk-row">FİZ 102</p></div><p class="dd-verdict v-no">' + I('close', 16) + 'Yanlış</p></div><p class="dd-why">Gri zemin ve 2 px işaret; açık mavi zemin ve mavi yazı değil.</p></div>' +
    '<div class="dd-pair"><p class="dd-title">Birincil eylem</p><div class="dd-cell"><div class="mk-btns"><span class="mk-b p">Yoklamamı ver</span><span class="mk-b">Makbuzu göster</span></div><p class="dd-verdict v-ok">' + I('check', 16) + 'Doğru</p></div><div class="dd-cell"><div class="mk-btns"><span class="mk-b p">Yoklamamı ver</span><span class="mk-b p">Makbuzu göster</span></div><p class="dd-verdict v-no">' + I('close', 16) + 'Yanlış</p></div><p class="dd-why">Ekranda tek dolu düğme; ikinci eylem gri çerçeveli.</p></div>' +
    '<div class="dd-pair"><p class="dd-title">Başlık çubuğu</p><div class="dd-cell"><div class="mk-screen"><p class="mk-bar">Kayıtlar</p><div class="mk-body"><i></i><i></i></div></div><p class="dd-verdict v-ok">' + I('check', 16) + 'Doğru</p></div><div class="dd-cell"><div class="mk-screen"><p class="mk-bar bad">Kayıtlar</p><div class="mk-body"><i></i><i></i></div></div><p class="dd-verdict v-no">' + I('close', 16) + 'Yanlış</p></div><p class="dd-why">Çubuk sayfa zemininde; gece mavisi geniş yüzeye sürülmez.</p></div>' +
    '</div>'));

/* ---------- section 'Telefon ekranları' ---------- */
const capFor = (sel, t, code, d, kind = 'phone') => '<div class="device-cap"><p class="t">' + t + '<span>' + code + '</span></p>' + covBar(sel, kind) + '<p class="d">' + d + '</p></div>';
const switchRow = (id, label, help, attrs) => '<div class="set-row"><div><p class="t" id="' + id + '-l">' + label + '</p><p class="help" id="' + id + '-h">' + help + '</p></div><button class="sw" type="button" role="switch" aria-checked="false" aria-labelledby="' + id + '-l" aria-describedby="' + id + '-h" id="' + id + '" ' + attrs + '><span class="sw-thumb"></span></button></div>';
const sEkranlar = section('ekranlar', 'Öğrencinin yoklama akışı ve hocanın QR ekranı. Telefon ekranları 360 dp için çizildi; Türkiye\'de telefonların çoğu Android (' + doc(PLAN, 'benzer', 'plan.html#benzer') + '). Ekranlar canlıdır: sayaç işler, QR beş saniyede bir değişir.',
  '<div class="ctl-plate">' + switchRow('xr-sw', 'Röntgen: yalnız gece mavisi', 'Bütün telefon ekranlarında ve panel ekranında gece mavisi olmayan her şeyi griye çeker; kalanlar kullanım haritasındaki numaralarıyla işaretlenir. Ekranların altındaki çubuk ölçülen payı ve bütçeyi gösterir.', 'data-xray') + '</div>' +
  '<div class="devices">' +
  '<div class="device-fig">' + device('scr-home', homeScreen(false)) + capFor('#scr-home', 'Bugün', 'Ö2, Ö5', 'Yoklama penceresi açık; kalan süre birincil metin renginde, tek mavi alan düğme. Hak uyarısı düzey yazısı, ikon ve cümleyle.') + '</div>' +
  '<div class="device-fig">' + device('scr-scan', scanScreen()) + capFor('#scr-scan', 'QR okut', 'Ö13', 'Kamera ana (1x) kamerayla açılır; uzaktan okutulan yoklama QR\'ında 2x yakınlaştırılır, yakından okutulan makbuz QR\'ında 1x kalır (' + doc(PLAN, 'asama23-okutma', 'plan.html#asama23-okutma') + '). Çerçeve ve yazılar beyaz, gece mavisi yok; tarama çizgisi gibi boşta hareket yok.') +
  '<div class="device-ctl"><button class="btn btn-secondary btn-sm" type="button" data-scan="ph-scan">' + I('qr_code_scanner', 20) + 'Okutmayı dene</button></div></div>' +
  '<div class="device-fig">' + device('scr-success', successScreen()) + capFor('#scr-success', 'Yoklaman kaydedildi', 'Ö3', 'Tek imza anı: kare ve onay çizilir (400 ms); makbuzun üç adımı içerikleriyle birlikte 60 ms arayla gelir. Ekran kendiliğinden kapanmaz.') +
  '<div class="device-ctl"><button class="btn btn-secondary btn-sm" type="button" data-replay>' + I('replay', 20) + 'Tekrar oynat</button><button class="btn btn-ghost btn-sm" type="button" data-receipt aria-pressed="false"><span class="btn-label">Çevrimdışı makbuz</span></button></div></div>' +
  '<div class="device-fig">' + device('scr-qr', qrScreen()) + capFor('#scr-qr', 'QR gösterme', 'H14', 'QR saf siyah ve beyaz, her yanda dört modül boşluk; beş saniyede bir animasyonsuz değişir. Ekran açık tutulur (' + doc(TEK, 'telefon-arka-plan', 'teknik.html#telefon-arka-plan') + '). Ekranda gece mavisi yok.') + '</div>' +
  '<div class="span2"><div class="plate"><p class="plate-cap"><b>Akış</b><span>öğrenci, Aşama 2</span></p><div class="plate-body"><ol class="rules-list rules-2">' +
  '<li><p><b>Bugün.</b> Pencere İstanbul saatiyle açılır. Tek birincil eylem: Yoklamamı ver (Aşama 2\'de kamerayı açar; bağlantı belgede yazılmamış).</p></li>' +
  '<li><p><b>QR okut.</b> Kamera yerel yığın geçişiyle, 2x yakınlaştırmayla açılır. Üstte ders ve kalan süre, altta yedek kod yolu. QR yakalanınca köşeler 110 ms\'de oturur; kamera kapanır.</p></li>' +
  '<li><p><b>Kaydedildi.</b> CONFIRM titreşimi kamera kapandıktan sonra. Ekran okuyucu odağı başlığa taşınır; makbuz adımları sözcük ve saatle yazılır.</p></li>' +
  '<li><p><b>Çevrimdışı.</b> Aynı ekran; makbuzun ikinci adımı bekliyor, düğümü boş. Kırmızı yok: bu bir hata değil.</p></li></ol></div></div>' +
  '<div class="plate"><p class="plate-cap"><b>QR kuralları</b><span>' + doc(PLAN, 'asama23', 'plan.html#asama23') + '</span></p><div class="plate-body"><ol class="rules-list rules-2">' +
  '<li><p>Modül #000000, zemin #FFFFFF (21:1): tasarımdaki tek saf siyah ve saf beyaz, işlevsel istisna. Tema rengi almaz, ters çevrilmez.</p></li>' +
  '<li><p>Her kenarda en az 4 modül boşluk. Kenar uzunluğu en az okuma uzaklığının onda biri.</p></li>' +
  '<li><p>Beş saniyede bir anında değişir; geçiş, solma, kayma yok.</p></li>' +
  '<li><p>Ders etiketi QR\'ın dışında. Projeksiyon sayfasında da aynı kural; panelin olası koyu teması QR\'a uygulanmaz.</p></li></ol></div></div>' +
  '<div class="plate"><p class="plate-cap"><b>Bu ekranlarda gece mavisi</b><span>ölçülen pay</span></p><div class="plate-body"><ol class="rules-list rules-2">' +
  [['#scr-home', 'Bugün', 'birincil eylem, ilerleme çubuğu, alt sekme işareti; kalan süre gri mürekkep'], ['#scr-scan', 'QR okut', 'yok; kamera üstünde yalnız beyaz çizgi ve yazı'], ['#scr-success', 'Kaydedildi', 'kare ve onay işareti, Tamam, Var ve makbuzun dolu düğümleri'], ['#scr-qr', 'QR gösterme', 'yok; QR tek odak, yalnız klavye odağında halka']]
    .map(([sel, n, d]) => { const p = covOf(sel); return '<li><p><b>' + n + (p ? ' · %' + tr(p['gece mavisi'], 2) : '') + '.</b> ' + d + '</p></li>'; }).join('') +
  '</ol></div></div></div>' +
  '</div>');

const sPanel = section('panel', 'Hocanın bir dersin yoklamasını gördüğü tablo. Tarayıcının kendi öğeleri (table, button, input) üzerine kurulur (' + doc(TEK, 'panel-cati', 'teknik.html#panel-cati') + '); satır seçimi, Türkçe sıralama ve süzme canlıdır. Dar ekranda kenar çubuğu üst çubuğa döner, yalnız tablo kendi içinde kayar.',
  sub('Yoklama tablosu', 'P2 · P8 · ' + N + ' öğrenci', panelScreen() + '<div class="panel-cap">' + covBar('#scr-panel', 'panel') + '</div>' +
    '<div class="flow-note"><p class="help">Tek birincil eylem Excel olarak indir. Anahtar rakam Var sayısı. Seçili satır gri zeminli, solunda 2 px mürekkep. Bütün sayılar aynı ' + N + ' satırdan sayılır: ' + GROUPS.map(([f, l]) => l + ' ' + cnt(f)).join(' + ') + ' = ' + N + '.</p><p class="help">Yoğun tabloda yalnız Yok ve Ret gül zemin alır; Var beyaz kalır. Satır hover yalnız imleçli cihazda neutral.4; onay kutusu 16 px çizilir, tıklama alanı 40x40 px; seçili satırdaki kutu kenarı neutral.10 (3,42:1).</p><p class="help">Ad soyad sütunu Türkçe harf sırasıyla sıralanır (Intl.Collator tr; ' + doc(TEK, 'veritabani', 'teknik.html#veritabani') + '); sıralama ve süzme animasyonsuzdur.</p></div>'));

/* ---------- color, contrast ---------- */
const contrastRows = CHK.contrast.length;
const sRenk = section('renk', 'Nötr ve gece mavisi ölçekleri sahibin kilidiyle sabittir. Bu tasarım gece mavisinin yalnız 9 ile 12. adımlarını kullanır; 1 ile 8 arası taralı gösterildi.',
  sub('Nötr ölçek', 'H 270 · kilitli', ramp('neutral') + scaleTable('neutral')) +
  sub('Gece mavisi ölçeği', 'H 262 · kilitli · 9 ile 12. adımlar', ramp('accent', [9, 10, 11, 12]) + scaleTable('accent', [9, 10, 11, 12])) +
  sub('Anlam rolleri', Object.keys(T.color.roles).length + ' rol', '<p class="body" style="margin-bottom:12px">Bileşenler yalnız rol adını kullanır; koyu tema ya da başka alt ton bir değer değişimidir. Örtü (scrim) neutral.12 yüzde 48 opaklıkla, gölge rengi de neutral.12.</p><p class="body" style="margin-bottom:24px">Saf beyaz #FFFFFF ve saf siyah #000000 yalnız QR\'da kullanılır (modüller #000000, zemin #FFFFFF, her yanda dört modül boşluk): tasarımdaki tek işlevsel istisna. Dolu düğme, şerit ve uyarının üstündeki yazı neutral.1 (#FEFEFF).</p>' + rolesTable()) +
  sub('Durum renkleri', 'zeminsiz durumlar', '<p class="body" style="margin-bottom:16px">' + esc(T.color.statusNote) + '</p>' + statusTable()));
const sKontrast = section('kontrast', 'Tokenların tanımladığı her ön plan ve arka plan çifti tcheck.js ile ölçüldü; sayfadaki tablo betiğin çıktısıdır. Hedef WCAG 2.2 AA kararı ' + doc(PLAN, 'hoca', 'plan.html#hoca') + ' içindedir.',
  sub('Ölçülen çiftler', contrastRows + ' çift · tcheck.js PASS', '<p class="body" style="margin-bottom:16px">Yazı en az 4,5:1, arayüz öğesi ve odak en az 3:1 (WCAG 2.2, 1.4.3 ve 1.4.11). Süs çizgileri ve devre dışı öğeler "süs" türünde, eşiksiz gösterildi. Oran yuvarlanmadan karşılaştırılır.</p><div class="contrast-wrap" tabindex="0" role="region" aria-label="Kontrast tablosu">' + rd('contrast.html') + '</div>'));

/* ---------- statuses ---------- */
const cvdPairs = CHK.cvd.filter(x => x.part === 'fg');
const chromatic = T.color.attendance.filter(a => C.hexToOklch(resolve(a.fg)).C >= 0.04).map(a => a.key);
const cvdChrom = cvdPairs.filter(x => chromatic.includes(x.a) || chromatic.includes(x.b));
const cvdMin = cvdChrom.reduce((m, x) => (x.min < m.min ? x : m), cvdChrom[0]);
const LBL = Object.fromEntries(T.color.attendance.map(a => [a.key, a.label]));
const MEAN = {
  var: 'Sunucu kararı Var olan kayıt.', yok: "Kayıt yok ya da sebep kodu 'yoklamada sınıfta değil'.",
  gorevli: 'Sebep kodu görevlendirme; belge numarası zorunlu.', belgeli: 'Öğrenci işlerinin yazısı ya da kurul kararı; belge numarası zorunlu.',
  elle: "Beyana dayalı: 'telefonu yok ya da çalışmıyor', 'QR okutamadı'.", muaf: 'Ders düzeyinde. Muaf öğrenciye hak uyarısı gitmez.'
};
const STATE_TEXTS = [
  { k: 'Bağlantı bekleniyor', where: 'P12 · projeksiyon sayfası', d: 'Eşleştirme QR\'ı okutulup ders onaylanana kadar. Sayfa hareketsizdir; bekleme göstergesi dönmez.',
    demo: '<div class="st-proj"><div class="st-proj-qr">' + qrSvg(QR[1]) + '</div><div><p class="st-proj-t">' + I('link', 20) + 'Bağlantı bekleniyor</p><p class="st-proj-s">Bu kodu hocanın telefonundaki uygulamayla okut.</p></div></div>' },
  { k: 'Kayıtların bir kısmı henüz gelmemiş olabilir', where: 'Panel · yoklama tablosu', d: 'İnternetsiz telefonların kayıtları bağlantı gelince düşer; not tablonun üstünde, kapatılamaz, renksizdir.',
    demo: '<p class="st-note">' + I('info', 20) + '<span>Kayıtların bir kısmı henüz gelmemiş olabilir.</span></p>' },
  { k: 'Onay bekliyor', where: 'H1, P1 · hoca hesabı', d: 'E-postadaki kod doğrulandıktan sonra, yönetici onaylayana kadar hesabın durumu.',
    demo: '<div class="st-acct"><span class="av">SA</span><div><p class="t">S. Aksoy</p><p class="s">s.aksoy@istanbul.edu.tr</p></div>' + stamp('tel', 'Onay bekliyor', 'hourglass_top') + '</div>' },
  { k: 'Bluetooth yok', where: 'Ö15 · Aşama 3', d: 'Tarama başlamadan önce; düğme Bluetooth açma isteğini gösterir.',
    demo: '<div class="st-ble">' + I('bluetooth_disabled', 24) + '<div><p class="t">Bluetooth yok</p><p class="s">Yoklama için Bluetooth\'u aç.</p></div><button class="btn btn-secondary btn-sm" type="button">Aç</button></div>' },
  { k: 'Konum yok', where: 'Ö15 · Aşama 3', d: 'Konum izni ya da konum kapalıysa; iPhone\'da geçici kesin konum istenir.',
    demo: '<div class="st-ble">' + I('location_off', 24) + '<div><p class="t">Konum yok</p><p class="s">Yoklama için konumu aç.</p></div><button class="btn btn-secondary btn-sm" type="button">Aç</button></div>' },
  { k: 'Sen değilsen Oturumlarım ekranından kapat', where: 'D1 · giriş bildirimi e-postası', d: 'Her girişte giden bildirim e-postasında; altında her e-postadaki sabit uyarı cümlesi durur. E-postada bağlantı yok, yalnız yazı (' + doc(PLAN, 'kararlar-e-posta-gonderimi', 'plan.html#kararlar-e-posta-gonderimi') + ').',
    demo: '<div class="st-mail"><p class="h">' + I('mail', 16) + 'İÜ Yoklama · Giriş bildirimi</p><p>Hesabına 6 Ekim 2026 Salı, 09:58\'de giriş yapıldı.</p><p class="b">Sen değilsen Oturumlarım ekranından kapat.</p><p class="f">Bu kodu yalnız uygulamaya ya da panele gir; uygulama kodu e-postayla, telefonla ya da başka bir yolla asla istemez.</p></div>' }
];
const sDurumlar = section('durumlar', 'Her durum önce ikonun biçimi ve sözcükle, sonra mürekkebin rengiyle okunur. Zemin yalnız yoğun tabloda ve yalnız Yok ile Ret için renklenir. Adlar ' + doc(PLAN, 'gun-son-durumlar', 'plan.html#gun-son-durumlar') + ' ile aynı.',
  sub('Son durumlar', 'rapor harfleri V, Y, G, B, E, M', '<div class="st-grid">' + T.color.attendance.map(a => '<div class="st-cell">' + att(a.key) + '<p class="desc">' + MEAN[a.key] + '</p><p class="meta"><span class="letter">' + a.letter + '</span><span>' + a.icon + '</span><span>' + resolve(a.fg) + (a.borderStyle === 'dashed' ? ' · kesik çerçeve' : '') + '</span></p></div>').join('') + '</div>' +
    '<p class="help" style="margin-top:12px">Damga: 1 px durum renginde çerçeve (Devamdan muafta kesik), 16 px ikon, 13 px yazı. Tabloda çerçevesiz biçim (ikon ve sözcük) kullanılır; Yok ve Ret orada gül zemin alır.</p>') +
  sub('Sunucu kararları ve makbuz', doc(PLAN, 'gun-kayit-etiketleri', 'plan.html#gun-kayit-etiketleri'), '<div class="st-grid">' +
    '<div class="st-cell">' + dec('var') + '<p class="desc">Kayıt sayıma girer.</p></div>' +
    '<div class="st-cell">' + dec('beklemede') + '<p class="desc">Karar henüz verilmedi; renk grafit, alarm değil.</p></div>' +
    '<div class="st-cell">' + dec('incelemede') + '<p class="desc">2\'lik ortak sınırı aşan kayıt; hocanın onay ekranına düşer.</p></div>' +
    '<div class="st-cell">' + dec('ret') + '<p class="desc">Gerekçe koduyla. Makbuz QR\'ı ile yeniden denenebilir.</p></div>' +
    '<div class="st-cell">' + stamp('tel', 'Telefonda kayıtlı, gönderilmedi', 'smartphone') + '<p class="desc">Kayıt imzalandı, telefonda duruyor. Kırmızı değil: çevrimdışı olağan durum.</p></div>' +
    '<div class="st-cell">' + stamp('ulasti', 'Sunucuya ulaştı', 'cloud_done') + '<p class="desc">Sunucu aldı; karar ayrıca gösterilir.</p></div>' +
    '<div class="st-cell"><div class="exc-demo">' + ind('yok', 'Yok', 'close', 'exc') + ind('ret', 'Ret', 'block', 'exc') + ind('var', 'Var', 'check') + '</div><p class="desc">Yoğun tabloda istisna önce: yalnız Yok ve Ret gül zemin (' + resolve('#FCECEB') + ') alır, Var beyaz kalır.</p></div>' +
    '</div>') +
  sub('Kayıt etiketleri', 'renksiz', '<div class="live-row">' + T.durumlar.etiketler.map(e => '<span class="tagx">' + esc(e) + '</span>').join('') + '</div><p class="help" style="margin-top:12px">' + esc(T.durumlar.note) + '</p>') +
  sub('Uyarı düzeyleri', doc(PLAN, 'devam-uyari-seviyeleri', 'plan.html#devam-uyari-seviyeleri'), '<div class="warn-list">' + T.durumlar.uyari.map(u => {
    const cls = u.level === 1 ? 'st-info' : u.level === 2 ? 'st-warn' : 'st-danger';
    return '<div class="warn-row ' + cls + (u.banner ? ' banner' : '') + '"><p class="lv">Düzey ' + u.level + '</p><div class="wi">' + I(u.icon, 20) + '</div><div><p class="tx">' + esc(u.text) + '</p>' + (u.variant ? '<p class="why">Kalan hak sonraki oturumun saatinden azsa: "' + esc(u.variant) + '"</p>' : '') + '</div><div>' + lvl(u.level, u.banner ? 'on-solid' : cls) + '</div></div>';
  }).join('') + '</div><p class="help" style="margin-top:12px">Düzey 1 grafit, 2 mor, 3 kırmızı mürekkep; düzey 4 tek dolu kırmızı şerit, yazısı neutral.1 (' + tr(C.wcagRatio(resolve('neutral.1'), resolve(T.color.status.danger.solid)), 2) + ':1). Gece mavisi uyarı anlamı taşımaz.</p>') +
  sub('Durum metinleri', 'bileşen düzeyinde, aynen', '<p class="body" style="margin-bottom:16px">Ürün özetinde adı geçen ama ekranı çizilmemiş durumların metni ve biçimi. Sözcükler plan.html\'deki gibi; hiçbiri gece mavisi taşımaz.</p><div class="stt">' + STATE_TEXTS.map(s => '<div class="plate stt-c"><p class="plate-cap"><b>' + s.k + '</b><span>' + s.where + '</span></p><div class="plate-body"><div class="stt-demo">' + s.demo + '</div><p class="help">' + s.d + '</p></div></div>').join('') + '</div>') +
  sub('AKSİS özeti', 'büyük harf metinde hazırlanır (tr-TR)', '<div class="aksis">' + T.durumlar.aksis.map(a => '<span>' + esc(a) + '</span>').join('') + '<span>geçici</span></div><p class="help" style="margin-top:12px">Yüzde aşağı yuvarlanır, tek ondalık: %69,5 (' + doc(PLAN, 'devam', 'plan.html#devam') + '). "KARAR BEKLİYOR" içindeki İ, toLocaleUpperCase(\'tr-TR\') ile doğru büyür; canlı örnek ' + ref('tipografi', 'Tipografi') + ' bölümünde.</p>') +
  sub('Renk körlüğü denetimi', 'tcheck.js · Machado 2009', '<div><div class="cvd-row"><p class="k">renkli</p><div class="chips">' + T.color.attendance.map(a => att(a.key)).join('') + '</div></div>' +
    '<div class="cvd-row"><p class="k">renksiz</p><div class="chips" style="filter:grayscale(1)">' + T.color.attendance.map(a => att(a.key)).join('') + '</div></div></div>' +
    '<p class="body" style="margin-top:16px">Renk tamamen kalksa da altı durum ikonun biçimi ve sözcükle ayrılır; Devamdan muaf ayrıca kesik çerçeveyle. Protan, deutan ve tritan benzetimi sayıyla yapıldı (sayfada benzetim görüntüsü yok: kırmızının benzetimi sarıya kayar, sahibin kilidi belgede de sarı istemiyor). Renkli üç mürekkebin (' + chromatic.map(k => LBL[k]).join(', ') + ') en yakın çifti ' + LBL[cvdMin.a] + ' ile ' + LBL[cvdMin.b] + ', OKLab uzaklığı ' + tr(cvdMin.min, 3) + ' (eşik 0,02). Nötr üç durum bilerek renksizdir: Belgeli düzeltme ile Devamdan muaf aynı mürekkebi (neutral.11) taşır, onları ikon, sözcük ve kesik çerçeve ayırır; tcheck bunu uyarı olarak yazar. Zeminler de bilerek aynıdır.</p>' +
    '<div class="scroll-x" style="margin-top:16px"><table class="tbl-doc"><thead><tr><th>Çift</th><th class="r">normal</th><th class="r">protan</th><th class="r">deutan</th><th class="r">tritan</th><th class="r">en az</th></tr></thead><tbody>' +
    cvdPairs.map(x => '<tr><td>' + LBL[x.a] + ' · ' + LBL[x.b] + '</td><td class="r mono">' + tr(x.normal, 3) + '</td><td class="r mono">' + tr(x.protan, 3) + '</td><td class="r mono">' + tr(x.deutan, 3) + '</td><td class="r mono">' + tr(x.tritan, 3) + '</td><td class="r mono">' + tr(x.min, 3) + '</td></tr>').join('') + '</tbody></table></div>'));

/* ---------- typography ---------- */
const CASES = [
  ['upper-tr', "toLocaleUpperCase('tr-TR')", 'istanbul ılık ığdır', 'Türkçe kural: i büyürken İ, ı büyürken I olur.'],
  ['upper', 'toUpperCase()', 'istanbul ılık ığdır', 'Yerelsiz: İstanbul\'un İ\'si noktasını yitirir.'],
  ['lower-tr', "toLocaleLowerCase('tr-TR')", 'IŞIK', 'Türkçe kural: I küçülürken ı olur.'],
  ['lower', 'toLowerCase()', 'IŞIK', 'Yerelsiz: ışık yerine işik çıkar; eşleştirme de bozulur.']
];
const sTipo = section('tipografi', 'Tek aile: IBM Plex Sans. Kodlar ve öğrenci numarası IBM Plex Mono. Küçük boyda Carbon\'un Plex için ayarladığı harf aralığı, büyük rakamda sıkı aralık. Büyük harf dönüşümü yok.',
  '<div class="type-hero"><div class="plate"><p class="plate-cap"><b>IBM Plex Sans</b><span>SIL OFL 1.1 · IBM</span></p><div class="plate-body"><p class="glyph">Ağ</p><p class="body" style="margin-top:16px">' + esc(T.type.version) + '. Ağırlıklar 400, 500, 600; 700 yalnız Kalın Metin ayarında.</p><p class="body" style="margin-top:8px">Neden Plex: rakamları varsayılan olarak eşit genişlikli, I ile l ayrışık, keskin uçları bu tasarımın çizgisine uyuyor ve Carbon küçük boylar için harf aralığını Plex\'e göre ayarlamış (R06-F14, R06-F21). Bedeli biraz küçük x yüksekliği (0,516; Inter 0,546): telefonda gövde 16 pt, anahtar rakam 40 pt ile karşılandı.</p></div></div>' +
  '<div class="plate"><p class="plate-cap"><b>Türkçe harf takımı</b><span>latin + latin-ext</span></p><div class="plate-body"><p class="charset">A B C Ç D E F G Ğ H I İ J K L M N O Ö P R S Ş T U Ü V Y Z<br>a b c ç d e f g ğ h ı i j k l m n o ö p r s ş t u ü v y z<br>0 1 2 3 4 5 6 7 8 9 % , : · ( )</p><p class="pangram">Pijamalı hasta yağız şoföre çabucak güvendi.</p><p class="charset mono" style="margin-top:16px">IBM Plex Mono 0412230017 · 246 810</p></div></div></div>' +
  sub('Türkçe büyük ve küçük harf', 'canlı, sayfanın betiğiyle hesaplanır', '<div class="case">' + CASES.map(([k, fn, src, why]) => '<div class="case-row ' + (k.endsWith('-tr') ? 'ok' : 'no') + '"><p class="case-fn"><code>' + esc(fn) + '</code></p><p class="case-src">' + esc(src) + '</p><p class="case-out" data-case="' + k + '" data-src="' + esc(src) + '">' + esc(src) + '</p><p class="case-why">' + (k.endsWith('-tr') ? I('check', 16) : I('close', 16)) + '<span>' + why + '</span></p></div>').join('') + '</div>' +
    '<p class="help" style="margin-top:12px">Sağdaki sonuçlar bu sayfanın betiği tarayıcıda çalıştırınca yazılır, elle yazılmadı. Webde lang="tr" zorunlu; sunucu adları da Türkçe kuralla eşleştirir (' + doc(PLAN, 'kararlar', 'plan.html#kararlar') + ').</p>') +
  sub('f ile i bağı kapalı', 'R06-F06', '<div class="liga"><div><p class="lbl st-danger">' + I('close', 16) + 'Bağ açık (Plex varsayılanı)</p><p class="w on">fiyat · fikir · fıstık</p></div><div><p class="lbl st-var">' + I('check', 16) + 'Bağ kapalı (bu tasarım)</p><p class="w">fiyat · fikir · fıstık</p></div></div>' +
    '<p class="body" style="margin-top:12px">Plex Sans\'ın liga özelliğinde fi bağı var, Türkçe dil sistemi yok; bağ Türkçe metinde de açılır ve f\'nin kolu i\'ye bitişir. Türkçe dizgi bu bağı kullanmaz: f ve i ayrı çizilince "fi" ile "fı" aynı ritimde, karıştırılmadan okunur. Panelde font-variant-ligatures: no-common-ligatures; telefonda fontTools alt kümesinde liga özelliği çıkarılır.</p>') +
  sub('Telefon ölçeği', 'pt · letterSpacing pt', '<div class="ts">' + tsRows(T.type.phone, PHONE_SAMPLE, 'pt', false) + '</div>') +
  sub('Panel ölçeği', 'px · Carbon üretken seti', '<div class="ts">' + tsRows(T.type.panel, PANEL_SAMPLE, 'px', true) + '</div>') +
  sub('Rakam ve kod', 'eşit genişlikli rakam', '<div class="numset"><div><p class="k">Öğrenci numarası · Plex Mono</p><p class="v mono">0412230017</p></div><div><p class="k">Devam yüzdesi · tr-TR</p><p class="v num">%69,5</p></div><div><p class="k">Kalan süre</p><p class="v num">11:42</p></div><div><p class="k">E-posta kodu · Plex Mono</p><p class="v mono">246 810</p></div><div><p class="k">Tablo tarihi</p><p class="v num">06.10.2026</p></div><div><p class="k">Metin tarihi</p><p class="v">6 Ekim 2026 Salı</p></div></div>') +
  sub('Kurallar', '', '<ol class="rules-list">' + T.type.rules.map(r => '<li><p>' + esc(r) + '</p></li>').join('') + '</ol>'));

/* ---------- shape and space ---------- */
const sBicim = section('bicim', 'Köşe 0, çizgi 1 px, odak 2 px. Yüzeyler gölgeyle değil ton farkı ve ince çizgiyle ayrılır; gölge yalnız içeriğin üstünde açılan katmanda. Bütün ölçüler 4\'ün katı.',
  sub('Köşe', Object.keys(T.shape.radius).length + ' bileşen · hepsi 0', '<div class="macro">' + cornerMacro() + '</div><ul class="radius-list" style="margin-top:24px">' + Object.entries(T.shape.radius).map(([k, v]) => '<li><span>' + k + '</span><span>' + v + ' px</span></li>').join('') + '</ul><p class="body" style="margin-top:12px">' + esc(T.shape.radiusNote) + '</p>') +
  sub('Çizgiler', 'kalınlık ve ton', '<div class="lines">' + [['ince', 'ln-ince', 'ince'], ['kontrol', 'ln-kontrol', 'kontrol'], ['kontrol, renkli satırda', 'ln-tint', null], ['odak', 'ln-odak', 'odak'], ['işaret', 'ln-isaret', 'isaret'], ['damga', 'ln-damga', 'damga'], ['tablo', 'ln-ince', 'tablo']].map(([k, c, key]) =>
    '<div class="line-row"><p class="k">' + k + '</p><div class="ln ' + c + '"></div><p class="d">' + esc(key ? T.shape.border[key] : 'neutral.4 ve neutral.5 zemininde border.strongOnTint (neutral.10): 3,68:1 ve 3,42:1') + '</p></div>').join('') + '</div>') +
  sub('Yükselti', '4 düzey', '<div class="elev">' + T.shape.elevation.map((e, i) => '<div class="elev-card e' + i + '"><p class="k">' + esc(e.name) + '</p><p class="d">' + esc(e.use) + '</p></div>').join('') + '</div><p class="help" style="margin-top:12px">' + esc(T.shape.elevationNote) + '</p>' +
    '<div class="scroll-x" style="margin-top:16px"><table class="tbl-doc"><thead><tr><th>Düzey</th><th>CSS</th><th>React Native</th></tr></thead><tbody>' + T.shape.elevation.map(e => '<tr><td>' + esc(e.name) + '</td><td class="mono">' + esc(e.shadow) + '</td><td class="mono">' + esc(e.rn) + '</td></tr>').join('') + '</tbody></table></div>') +
  sub('Boşluk', 'taban 4 · ritim 8', '<div class="g2"><div class="space-list">' + T.space.scale.map((v, i) => '<div class="space-row"><span>--space-' + i + '</span><span>' + v + ' px</span><span class="bar" style="width:' + (v / 96 * 100).toFixed(2) + '%"></span></div>').join('') + '</div>' +
    '<div><div class="grid-demo" aria-hidden="true"><div class="base"></div><div class="cols"><i></i><i></i><i></i><i></i></div><div class="blk" style="top:16px;height:56px">ekran kenarı 16 · üst çubuk 56</div><div class="blk" style="top:88px;height:120px">kart içi 16 · öğe arası 8</div><div class="blk" style="top:216px;height:48px">düğme 48</div><div class="blk" style="top:272px;height:32px">satır aralığı 8</div></div>' +
    '<div class="scroll-x" style="margin-top:16px"><table class="tbl-doc compact"><thead><tr><th>Telefon (dp)</th><th class="r">değer</th><th>Panel (px)</th><th class="r">değer</th></tr></thead><tbody>' +
    (() => { const a = Object.entries(T.space.phone), b = Object.entries(T.space.panel), n = Math.max(a.length, b.length); let h = ''; for (let i = 0; i < n; i++) h += '<tr><td>' + (a[i] ? a[i][0] : '') + '</td><td class="r mono">' + (a[i] ? a[i][1] : '') + '</td><td>' + (b[i] ? b[i][0] : '') + '</td><td class="r mono">' + (b[i] ? b[i][1] : '') + '</td></tr>'; return h; })() +
    '</tbody></table></div><p class="help" style="margin-top:12px">' + esc(T.space.targetsNote) + '</p></div></div>'));

const ICON_LIST = ['check', 'close', 'work', 'description', 'edit', 'do_not_disturb_on', 'schedule', 'search', 'block', 'smartphone', 'cloud_done', 'cloud_off', 'info', 'warning', 'error', 'report', 'qr_code_scanner', 'qr_code_2', 'today', 'history', 'person', 'more_vert', 'chevron_right', 'arrow_upward', 'download', 'upload_file', 'filter_list', 'flashlight_on', 'dialpad', 'logout', 'menu', 'menu_book', 'edit_note', 'fact_check', 'summarize', 'groups', 'timer', 'brightness_high', 'flag', 'meeting_room', 'delete', 'radio_button_unchecked', 'radio_button_checked', 'hourglass_top', 'link', 'mail', 'bluetooth_disabled', 'location_off'];
const sIkon = section('ikonlar', esc(T.icons.why),
  sub('Kullanılan ikonlar', T.icons.set + ' · ' + ICON_LIST.length + ' ikon', '<div class="icon-grid">' + ICON_LIST.map(n => '<div class="icon-cell">' + I(n, 24) + '<span>' + n + '</span></div>').join('') + '</div>') +
  sub('Boy ve dolgu', T.icons.sizes, '<div class="g2"><div class="scroll-x"><table class="isz"><thead><tr><th>ad</th><th>16 · opsz 20</th><th>20 · opsz 20</th><th>24 · opsz 24</th><th>24 · dolu</th></tr></thead><tbody>' +
    ['today', 'history', 'person', 'qr_code_scanner'].map(n => '<tr><td>' + n + '</td><td>' + I(n, 16) + '</td><td>' + I(n, 20) + '</td><td>' + I(n, 24) + '</td><td>' + I(n, 24, true) + '</td></tr>').join('') + '</tbody></table></div>' +
    '<div><p class="body">' + esc(T.icons.style) + ' ' + esc(T.icons.stroke) + '. Dolu biçim yalnız etkin alt sekmede: seçimi ikonun dolgusu ve 2 px mürekkep çizgi birlikte anlatır.</p><p class="body">Kaynak: ' + esc(T.icons.source) + '. Lisans: ' + esc(T.icons.license) + '.</p><p class="body">Durum ikonlarının biçimleri ayrı ayrı seçildi: onay, çarpı, çanta, belge, kalem, eksi daire, saat, büyüteç, yasak işareti. Renk kalksa da ayrılırlar. Daire biçimi yalnız ikonun kendi çiziminde kalır: seçenek düğmesinin işareti de bir ikondur (radio_button).</p></div></div>'));

/* ---------- components and layers ---------- */
const btnStates = [['varsayılan', ''], ['hover', 'hover'], ['basılı', 'pressed'], ['odak', 'focus'], ['devre dışı', 'disabled'], ['yükleniyor', 'busy']];
const spinSvg = '<svg class="spin" viewBox="0 0 16 16" aria-hidden="true"><rect class="t0" x="1" y="1" width="14" height="14"></rect><rect class="t1" x="1" y="1" width="14" height="14" pathLength="56"></rect></svg>';
const btnCell = (v, st, label) => {
  const attr = st === 'disabled' ? ' disabled' : st === 'busy' ? ' aria-busy="true"' : st ? ' data-state="' + st + '" tabindex="-1"' : '';
  return '<td><button class="btn btn-' + v + '" type="button"' + attr + '>' + spinSvg + '<span class="btn-label">' + (st === 'busy' ? 'Gönderiliyor' : label) + '</span></button></td>';
};
const sBilesen = section('bilesenler', 'Hepsi canlı. Hover yalnız imleçli cihazda, basma :active ile, odak :focus-visible ile. Panel bileşenleri tarayıcının kendi öğeleri üzerine kurulur (' + doc(TEK, 'panel-cati', 'teknik.html#panel-cati') + ').',
  sub('Düğmeler', 'panel 40 · telefon 48 · küçük 32', '<div class="plate"><p class="plate-cap"><b>Durum tablosu</b><span>durumlar sabitlendi, tıklanamaz</span></p><div class="plate-body scroll-x"><table class="state-table"><thead><tr><th></th>' + btnStates.map(s => '<th>' + s[0] + '</th>').join('') + '</tr></thead><tbody>' +
    [['primary', 'Birincil', 'Kodu gönder'], ['secondary', 'İkincil', 'Düzeltme ekle'], ['ghost', 'Hayalet', 'Vazgeç'], ['danger', 'Tehlike', 'Kaydı sil']].map(([v, n, l]) => '<tr><td>' + n + '</td>' + btnStates.map(s => btnCell(v, s[1], l)).join('') + '</tr>').join('') +
    '</tbody></table></div></div>' +
    '<div class="plate" style="margin-top:24px"><p class="plate-cap"><b>Canlı</b><span>imleçle gel, bas, Tab ile odaklan</span></p><div class="plate-body"><div class="live-row">' +
    '<button class="btn btn-primary" type="button" id="b-primary" data-busy="Gönderiliyor">' + spinSvg + '<span class="btn-label">Kodu gönder</span></button>' +
    '<button class="btn btn-secondary" type="button" id="b-secondary">' + I('edit_note', 20) + '<span class="btn-label">Düzeltme ekle</span></button>' +
    '<button class="btn btn-ghost" type="button" id="b-ghost">Vazgeç</button>' +
    '<button class="btn btn-danger" type="button" id="b-danger" data-dialog="dlg-close">Yoklamayı kapat</button>' +
    '<button class="btn btn-secondary btn-icon" type="button" aria-label="Yazdır">' + I('print', 20) + '</button>' +
    '</div><div class="live-row" style="margin-top:16px"><button class="btn btn-primary btn-lg" type="button">' + I('check', 24) + 'Yoklamamı ver</button><button class="btn btn-secondary btn-sm" type="button">Küçük</button></div>' +
    '<p class="help" style="margin-top:16px">Hover rengi girişte ' + durOf('hover') + ' ms, çıkışta ' + durOf('mikro') + ' ms. Basma 0,97 ölçek, ' + durOf('mikro') + ' ms; hareket azaltmada ölçek yok, yalnız renk. Odak halkası geçişsiz. Birincil düğmeye basınca 1,8 sn yükleniyor durumu gösterilir: genişlik korunur, kare iz 1200 ms döner, yazı değişir.</p></div></div>') +
  sub('Metin alanı', 'dış çizgili · içi beyaz', '<div class="g3">' +
    '<div class="field"><label class="lbl" for="f1">E-posta</label><input class="input" id="f1" type="email" autocomplete="email" autocapitalize="off" spellcheck="false" placeholder="ad.soyad@istanbul.edu.tr"><p class="help">Yalnız @istanbul.edu.tr adresi.</p></div>' +
    '<div class="field"><label class="lbl" for="f2">E-posta · hata</label><input class="input" id="f2" type="email" value="ad.soyad@gmail.com" aria-invalid="true" aria-describedby="f2-m"><p class="msg err" id="f2-m">' + I('error', 16) + '<span>Adres @istanbul.edu.tr ile bitmeli.</span></p></div>' +
    '<div class="field"><label class="lbl" for="f3">Belge numarası · devre dışı</label><input class="input" id="f3" type="text" value="2026/114" disabled><p class="help">Yalnız Görevli ve Belgeli düzeltmede zorunlu.</p></div>' +
    '<div class="field"><p class="lbl">Sabit hover</p><input class="input" type="text" value="Veri Yapıları" data-state="hover" tabindex="-1" aria-label="Sabit hover örneği"></div>' +
    '<div class="field"><p class="lbl">Sabit odak</p><input class="input" type="text" value="BİL 301" data-state="focus" tabindex="-1" aria-label="Sabit odak örneği"></div>' +
    '<div class="field"><label class="lbl" for="f6">Saat sayısı</label><input class="input num" id="f6" type="text" inputmode="numeric" pattern="[0-9]*" value="2"><p class="help">Blok derste saat sayısı seçilir.</p></div>' +
    '</div>') +
  sub('E-posta kodu', 'tek alan · altı kutu', '<div class="g2"><div class="otp" data-otp><label class="lbl" for="otp-in">E-postana gelen 6 haneli kod</label><div class="otp-box"><input class="otp-in" id="otp-in" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" aria-describedby="otp-help otp-msg"><div class="otp-cells" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span><span></span></div></div><p class="help" id="otp-help">Bu kodu yalnız uygulamaya ya da panele gir; uygulama kodu e-postayla, telefonla ya da başka bir yolla asla istemez.</p><p class="msg" id="otp-msg" role="status"></p></div>' +
    '<div><p class="body">Kod tek bir alana yazılır: yapıştırma ve otomatik doldurma açık (autocomplete one-time-code, inputmode numeric). Altı kutu alanın arkasına çizilir; sıradaki kutunun altında 2 px mürekkep işaret. Altı rakam tamamlanınca denetlenir.</p><p class="body">Denemek için <code>246810</code> yaz; başka bir kod hata durumunu gösterir.</p></div></div>') +
  sub('Seçim', 'onay kutusu · anahtar · liste satırı', '<div class="g3">' +
    '<div class="plate"><p class="plate-cap"><b>Onay kutusu</b><span>16 px</span></p><div class="plate-body" style="display:grid;gap:16px"><label class="cb"><input type="checkbox">İkinci profil göster</label><label class="cb"><input type="checkbox" checked>Yalnız İncelemede</label><label class="cb"><input type="checkbox" data-ind>Bütün satırlar</label><label class="cb" style="color:var(--text-disabled)"><input type="checkbox" disabled>Dönem kilitli</label></div></div>' +
    '<div class="plate"><p class="plate-cap"><b>Anahtar</b><span>40 x 24</span></p><div class="plate-body"><div class="set-row"><div><p class="t" id="sw1-l">Devamdan muaf</p><p class="help" id="sw1-h">Muaf öğrenciye hak uyarısı gitmez.</p></div><button class="sw" type="button" role="switch" aria-checked="true" aria-labelledby="sw1-l" aria-describedby="sw1-h"><span class="sw-thumb"></span></button></div>' +
    '<div class="set-row"><div><p class="t" id="sw2-l">Bildirimler</p><p class="help">Gönderilmemiş kayda günde bir hatırlatma.</p></div><button class="sw" type="button" role="switch" aria-checked="false" aria-labelledby="sw2-l"><span class="sw-thumb"></span></button></div>' +
    '<div class="set-row"><div><p class="t" id="sw3-l" style="color:var(--text-disabled)">Dönem sonu kilidi</p><p class="help">Yalnız yönetici.</p></div><button class="sw" type="button" role="switch" aria-checked="false" aria-labelledby="sw3-l" disabled><span class="sw-thumb"></span></button></div></div></div>' +
    '<div class="plate"><p class="plate-cap"><b>Liste satırı</b><span>64 dp · seçmek için dokun</span></p><div class="lrow-list" data-pick-group style="border:0">' +
    [['Veri Yapıları', 'Teori · BİL 301', 'false'], ['Ayrık Matematik', 'Teori · MAT 207', 'true'], ['Fizik II', 'Uygulama · FİZ 102', 'false']].map(([t, s, p]) => '<button class="lrow" type="button" data-pick aria-pressed="' + p + '"><span><span class="t">' + t + '</span><span class="s">' + s + '</span></span><span class="sel-ic">' + I('check', 20) + '</span></button>').join('') +
    '<button class="lrow" type="button" disabled><span><span class="t">Algoritmalar</span><span class="s">Dönem kapandı</span></span>' + I('chevron_right', 20) + '</button></div></div>' +
    '</div>') +
  sub('Sekmeler', 'gösterge ' + durOf('uzun') + ' ms · içerik ' + durOf('hizli') + ' ms', '<div class="plate"><div class="plate-body"><div class="tabs" role="tablist" aria-label="Dönem">' +
    [['Bugün', 'tp1'], ['Bu hafta', 'tp2'], ['Dönem', 'tp3'], ['Raporlar ve AKSİS özeti', 'tp4']].map(([l, id], i) => '<button type="button" role="tab" id="t-' + id + '" aria-controls="' + id + '" aria-selected="' + (i === 0) + '"' + (i ? ' tabindex="-1"' : '') + '>' + l + '</button>').join('') +
    '<span class="tabs-ind" aria-hidden="true"></span></div>' +
    [['tp1', 'Bugün 3 ders var. Yoklama penceresi Veri Yapıları için açık.'], ['tp2', 'Bu hafta 11 ders, 2 telafi dersi programda.'], ['tp3', 'Dönem: 14 hafta; ekle-bırak 17 Ekim\'de bitiyor.'], ['tp4', 'Raporlar yalnız Excel olarak iner; AKSİS özeti geçici.']].map(([id, t], i) => '<div class="tabpanel" role="tabpanel" id="' + id + '" aria-labelledby="t-' + id + '"' + (i ? ' hidden' : '') + '><p class="body">' + t + '</p></div>').join('') +
    '<p class="help" style="margin-top:16px">Ok tuşları sekmeyi değiştirir, Home ve End uçlara gider. Hareket azaltmada gösterge kaymaz: yeni yerinde ' + durOf('mikro') + ' ms solarak belirir.</p></div></div>'));

const sKatman = section('katmanlar', 'İçeriğin üstünde açılan her şey: menü, diyalog, alt sayfa, çevrimdışı şeridi, bildirim ve bekleme. Gölge yalnız burada var; her katman tetikleyicisinden açılır ve oraya kapanır.',
  sub('Menü ve diyalog', 'tetikleyiciden açılır, odak geri döner', '<div class="g2"><div class="plate"><p class="plate-cap"><b>Menü</b><span>giriş ' + durOf('kisa') + ' ms · çıkış ' + durOf('hizli') + ' ms</span></p><div class="plate-body" style="min-height:280px"><div class="menu-wrap"><button class="btn btn-secondary" type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="m1" id="m1-b">' + I('more_vert', 20) + 'Kayıt işlemleri</button>' +
    '<div class="menu" role="menu" id="m1" aria-labelledby="m1-b" data-open="false" style="left:0;right:auto;transform-origin:0 0">' +
    '<button type="button" role="menuitem" tabindex="-1">' + I('edit_note', 20) + 'Düzeltme ekle</button><button type="button" role="menuitem" tabindex="-1">' + I('qr_code_scanner', 20) + 'Makbuzu okut</button><button type="button" role="menuitem" tabindex="-1">' + I('download', 20) + 'Excel olarak indir<span class="kbd">Ctrl E</span></button><hr><button type="button" role="menuitem" tabindex="-1" class="danger">' + I('delete', 20) + 'Kaydı sil</button></div></div>' +
    '<p class="help" style="margin-top:16px">Aşağı ok açar, ok tuşları gezinir, Escape ve dışarı tıklama kapatır. Silme gibi yıkıcı öğe en sonda, kırmızı.</p></div></div>' +
    '<div class="plate"><p class="plate-cap"><b>Diyalog</b><span>giriş ' + durOf('orta') + ' ms · çıkış ' + durOf('kisa') + ' ms</span></p><div class="plate-body" style="min-height:280px"><button class="btn btn-danger" type="button" data-dialog="dlg-close">Yoklamayı erken kapat</button><p class="help" style="margin-top:16px">Yerel dialog öğesi. Açılış @keyframes ile, kapanış data-closing ile oynar, sonra close(). Escape ve örtüye tıklama aynı yoldan kapatır; odak açan düğmeye döner.</p></div></div></div>') +
  sub('Telefon katmanları', 'alt sayfa · çevrimdışı şeridi · bildirim', '<div class="devices" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr))"><div class="device-fig">' + device('scr-records', recordsScreen()) + capFor('#scr-records', 'Kayıtlar', 'Ö3, Ö6, Ö7', 'Çevrimdışı şeridi açık gri (neutral.3); alttaki içerik FLIP ile transform olarak itilir. Alt sayfa açılınca örtü şeridi de karartır.') +
    '<div class="device-ctl"><button class="btn btn-secondary btn-sm" type="button" data-sheet-open data-rec="Fizik II, 3 Ekim 09:05" data-karar="1">' + I('flag', 20) + 'Sorun bildir</button><button class="btn btn-secondary btn-sm" type="button" data-offline><span class="btn-label">İnterneti aç</span></button></div></div>' +
    '<div><ol class="rules-list"><li><p><b>Alt sayfa.</b> Telefonda TrueSheet (iOS UISheetPresentationController, Android Material BottomSheet), cornerRadius 0, zemin neutral.1' + (has('kutuphaneler') ? ' (sürüm ve gerekçe: ' + ref('kutuphaneler', 'Kütüphaneler') + ')' : '') + '. Giriş yay orta (384 ms, aşma yok); burada linear() yedeğiyle. Çıkış 200 ms. Görünür Kapat düğmesi, geri hareketi, Escape; aynı anda tek sayfa.</p></li>' +
    '<li><p><b>Sorun bildir.</b> Seçenekler tek seçimlidir: her satırda görünen seçenek işareti. Öğrenci 3 gün içinde bildirir; süre kaydı varsa sunucu kararı telefonuna ulaşınca, kaydı yoksa ders bitince başlar (' + doc(PLAN, 'kararlar', 'plan.html#kararlar') + '). Bildirim hocanın listesine düşer.</p></li>' +
    '<li><p><b>Çevrimdışı şeridi.</b> Kapatılamaz, kalıcı. Hata değil: kırmızı yok, gece mavisi yok; açık gri zemin, yazı ' + tr(C.wcagRatio(resolve('text.primary'), resolve('bg.sunken')), 2) + ':1. Verinin nerede beklediğini ve kaç kayıt beklediğini söyler. Giriş ' + durOf('orta') + ' ms, çıkış ' + durOf('kisa') + ' ms.</p></li>' +
    '<li><p><b>Bildirim.</b> Bağlantı dönünce "Bağlantı geri geldi. Bekleyen 2 kayıt gönderildi." Başarı 5 sn sonra kapanır; Kapat düğmesi her zaman var. Android\'de canlı bölge, iOS\'ta duyuru.</p></li>' +
    '<li><p><b>Odak.</b> Sayfa açılınca odak seçili seçeneğe ya da ilkine girer, Tab içeride döner, kapanınca açan öğeye döner; arka plan inert.</p></li></ol></div></div>') +
  sub('Panel bildirimi', 'tarayıcının canlı bölgesi · kütüphane yok', '<div class="live-row"><button class="btn btn-secondary" type="button" data-toast="ok">' + I('check', 20) + 'Başarı bildirimi</button><button class="btn btn-secondary" type="button" data-toast="err">' + I('error', 20) + 'Hata bildirimi</button></div><p class="help" style="margin-top:12px">Sağ altta, en çok üç tane. Başarı role="status" bölgesine yazılır ve 5 sn sonra kapanır; hata role="alert" bölgesine yazılır ve kapatılana kadar kalır. Giriş ' + durOf('orta') + ' ms alttan, çıkış ' + durOf('kisa') + ' ms. Hazır bildirim kütüphanesi kullanılmaz (' + doc(TEK, 'panel-cati', 'teknik.html#panel-cati') + ').</p>') +
  sub('Yükleniyor', '1 sn altı gösterge yok', '<div class="g3"><div class="plate"><p class="plate-cap"><b>Kare iz</b><span>1200 ms doğrusal</span></p><div class="plate-body" style="display:flex;gap:24px;align-items:center">' + spinSvg + '<span style="transform:scale(1.5)">' + spinSvg + '</span><span class="msg busy">' + spinSvg + '<span>Gönderiliyor</span></span></div></div>' +
    '<div class="plate"><p class="plate-cap"><b>İskelet</b><span>durağan</span></p><div class="plate-body" style="display:grid;gap:8px"><span style="height:16px;width:60%;background:var(--neutral-4)"></span><span style="height:12px;width:90%;background:var(--neutral-4)"></span><span style="height:12px;width:75%;background:var(--neutral-4)"></span></div></div>' +
    '<div class="plate"><p class="plate-cap"><b>İlerleme</b><span>10 sn üstü işler</span></p><div class="plate-body"><p class="body">Öğrenci listesi yükleniyor · %64</p><div class="prog" style="margin:8px 0 0" role="progressbar" aria-label="Liste yükleme" aria-valuemin="0" aria-valuemax="100" aria-valuenow="64"><span style="transform:scaleX(0.64)"></span></div></div></div></div>'));

/* ---------- motion ---------- */
const durRows = T.motion.duration.map(d => '<div class="dur-row"><p class="k">' + d.name + '</p><p class="ms">' + d.ms + ' ms</p><div><div class="lane" id="ln-d-' + d.name + '" data-ms="' + d.ms + '" data-ease="var(--ease-standart)"><span class="bar" style="width:' + (d.ms / 4) + '%"></span><span class="dot"></span></div><span class="use">' + esc(d.use) + '</span></div><button class="btn btn-ghost btn-sm play-btn" type="button" data-run="ln-d-' + d.name + '" aria-label="Oynat: ' + d.name + '">' + I('replay', 20) + '</button></div>').join('');
const curveDur = { standart: durOf('uzun'), giris: durOf('orta'), cikis: durOf('kisa'), mikro: durOf('hover'), imza: durOf('imza'), dogrusal: 1200 };
const curves = T.motion.easing.map(e => '<div class="curve"><div class="curve-plot">' + curveSvg(e.bezier) + '</div><div class="curve-meta"><p class="k">' + e.name + '<code>--ease-' + e.name + '</code></p><p class="v">cubic-bezier(' + e.bezier.join(', ') + ')</p><p class="u">' + esc(e.use) + '</p></div>' +
  '<div class="curve-run"><div class="lane" id="ln-e-' + e.name + '" data-ms="' + curveDur[e.name] + '" data-ease="var(--ease-' + e.name + ')"><span class="dot"></span></div><button class="btn btn-ghost btn-sm play-btn" type="button" data-run="ln-e-' + e.name + '" aria-label="Oynat: ' + e.name + '">' + I('replay', 20) + '</button></div></div>').join('');
const springs = T.motion.spring.map(s => {
  const { info, svg } = springSvg(s);
  return '<div class="curve"><div class="curve-plot">' + svg + '</div><div class="curve-meta"><p class="k">' + s.name + '<code>--spring-' + s.name + '</code></p><p class="v">withSpring({ mass: ' + s.mass + ', stiffness: ' + s.stiffness + ', damping: ' + s.damping + ' })</p>' +
    '<div class="spring-nums"><div><b>' + tr(info.zeta, 3) + '</b>sönüm oranı</div><div><b>' + info.settleMs + ' ms</b>oturma</div><div><b>%' + tr(info.overshootPct, 2) + '</b>aşma</div></div><p class="u">' + esc(s.use) + '</p></div>' +
    '<div class="curve-run"><div class="lane" id="ln-s-' + s.name + '" data-ms="' + info.settleMs + '" data-ease="var(--spring-' + s.name + ')"><span class="dot"></span></div><button class="btn btn-ghost btn-sm play-btn" type="button" data-run="ln-s-' + s.name + '" aria-label="Oynat: ' + s.name + '">' + I('replay', 20) + '</button></div></div>';
}).join('');
const sHareket = section('hareket', 'Üretken hareket: kısa, aşmasız, kesilebilir. Yalnız transform ve opacity canlanır; renk geçişi serbest. Tek ifadeci an yoklamanın kaydedildiği an. Panele özgü açılış ve kapanış animasyonları sahiple ayrıca konuşulacak' + (has('acik') ? ' (' + ref('acik', 'Açık noktalar') + ')' : '') + '; buradaki genel kurallar şimdiden geçerli.',
  '<div class="ctl-plate two">' + switchRow('slow-sw', '4 kat yavaş oynat', 'Eğrileri ve başarı anını gözle incelemek için; ürün davranışı değildir.', '') +
  switchRow('rm-sw', 'Hareketi azalt önizlemesi', 'Sayfanın tamamı, işletim sisteminde hareketi azalt açıkmış gibi davranır: konum ve ölçek kalkar, renk ve opaklık kalır.', 'data-rm') + '</div>' +
  sub('Süreler', T.motion.duration.length + ' adım · ms', '<div id="durs"><div class="dur-list">' + durRows + '</div><div class="live-row" style="margin-top:16px"><button class="btn btn-secondary btn-sm" type="button" data-run-all="durs">' + I('replay', 20) + 'Hepsini oynat</button><p class="help">Aynı yol, farklı süre: hepsi standart eğriyle.</p></div></div>') +
  sub('Eğriler', 'cubic-bezier · Carbon üretken', '<div class="curves">' + curves + '</div>') +
  sub('Yaylar', 'Reanimated withSpring · spring.js', '<p class="body" style="margin-bottom:16px">' + esc(T.motion.springNote) + '</p><div class="curves c4">' + springs + '</div>') +
  sub('Kurallar', '', '<ol class="rules-list rules-2">' + T.motion.rules.map(r => '<li><p>' + esc(r) + '</p></li>').join('') + '</ol>'));
const sEtkilesim = section('etkilesim', 'Her etkileşim kalıbının ne canlandırdığı, süresi, eğrisi, kökeni ve hareket azaltma karşılığı. Değerler tokens.json içindeki patterns dizisinden gelir.',
  sub('Kalıplar', T.motion.patterns.length + ' kalıp', '<div class="pats"><div class="pat pat-head" aria-hidden="true"><span>Kalıp</span><span>Ne canlanır</span><span>Süre, eğri, köken</span><span>Hareket azaltma</span></div>' + T.motion.patterns.map(p =>
    '<div class="pat"><div class="pat-n"><b>' + esc(p.pattern) + '</b><span class="pat-pl">' + esc(p.platforms) + '</span></div>' +
    '<dl class="pat-c"><dt>Özellik</dt><dd>' + esc(p.properties) + '</dd><dt>Giriş</dt><dd>' + esc(p.enter) + '</dd><dt>Çıkış</dt><dd>' + esc(p.exit) + '</dd></dl>' +
    '<dl class="pat-c"><dt>Süre</dt><dd>' + esc(p.duration) + '</dd><dt>Eğri</dt><dd>' + esc(p.curve) + '</dd><dt>Köken</dt><dd>' + esc(p.origin) + '</dd></dl>' +
    '<dl class="pat-c"><dt>Azaltılmış</dt><dd>' + esc(p.reduced) + '</dd></dl></div>').join('') + '</div>'));

/* ---------- own platform and sources sections (used only when the fragment is missing) ---------- */
const PLAT = [
  ['Alt sayfa', 'TrueSheet: UISheetPresentationController, cornerRadius 0, backgroundColor neutral.1 (iOS 26.1 ve üstünde cam kapanır)', 'TrueSheet: Material BottomSheet, cornerRadius 0', 'dialog ya da yan panel; ayrıntısı panel çalışmasında'],
  ['Basma', 'onPressIn anında 0,97 ölçek ve bir adım koyu ton, ' + durOf('mikro') + ' ms (Reanimated, UI iş parçacığı)', 'Aynı; dalga efekti kapalı', ':active 0,97 ölçek, renk ' + durOf('mikro') + ' ms'],
  ['Hover', 'Yok; iPad imlecinde sistem efekti', 'Yok', 'Yalnız (hover: hover) and (pointer: fine); renk girişte ' + durOf('hover') + ' ms, çıkışta ' + durOf('mikro') + ' ms'],
  ['Odak', 'VoiceOver odağı sistemin; donanım klavyesinde 2 px halka', 'TalkBack odağı sistemin; klavyede 2 px halka', ':focus-visible, 2 px halka, 2 px boşluk, geçişsiz'],
  ['Geri', 'Kenardan kaydırma, yerel yığın', 'predictiveBackGestureEnabled kapalı, sistem geri; açık sayfa ve diyalog önce kapanır', 'Tarayıcı geri; Escape açılır katmanı kapatır'],
  ['Haptik', 'notificationAsync(Success), kamera kapandıktan sonra', 'performAndroidHapticsAsync(Confirm); API 30 altında Long_Press yedeği', 'Yok'],
  ['Hareket azaltma', 'Reduce Motion: ReduceMotion.System ve canlı dinleyen kanca', 'Animasyonları kaldır: anında', 'prefers-reduced-motion: --mv 0, yalnız opaklık'],
  ['Sistem yüzeyleri', 'Liquid Glass sistem parçalarında kalır (uyarı, izin, klavye); içerik katmanı opak ve köşeli', 'Kenardan kenara; koyu durum çubuğu simgeleri (Android 7\'de sistem şeridi)', 'Yerel select ve tarih kutusunun açılan parçasını işletim sistemi çizer'],
  ['Yazı', 'Statik TTF, Dynamic Type açık, AX5\'te kesilme yok', 'Statik TTF, fontDefinitions, %200 ölçek', 'Değişken WOFF2, lang="tr", liga kapalı']
];
const sPlatformOwn = () => section('platform', 'Aynı tokenlar üç yüzeyde. Sistemin çizdiği parçalar (izin pencereleri, klavye, tarih seçicinin açılan parçası) olduğu gibi kabul edilir; köşeli ve opak olan bizim içerik katmanımızdır. En düşük sürümler ' + doc(PLAN, 'dagitim-desteklenen-surumler', 'plan.html#dagitim-desteklenen-surumler') + ' içindedir.',
  '<div class="scroll-x"><table class="tbl-doc plat"><thead><tr><th>Konu</th><th>iOS</th><th>Android</th><th>Web paneli</th></tr></thead><tbody>' + PLAT.map(r => '<tr>' + r.map(c => '<td>' + esc(c) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>');
const sKaynakOwn = () => section('kaynaklar', 'Her kararın araştırma dosyasındaki karşılığı. R kimlikleri tasarım araştırmasına, L kimlikleri kütüphane araştırmasına aittir; ikisi de depo dışında.',
  '<div class="scroll-x"><table class="tbl-doc"><thead><tr><th>Karar</th><th>Araştırma</th></tr></thead><tbody>' + Object.entries(T.sources).map(([k, v]) => '<tr><td>' + esc(k) + '</td><td><span class="src-ids">' + v.map(x => '<code>' + x + '</code>').join('') + '</span></td></tr>').join('') + '</tbody></table></div>' +
  '<p class="help" style="margin-top:16px">Kontrolden geçen kapılar: tcheck.js (' + contrastRows + ' kontrast çifti, ' + CHK.cvd.length + ' durum karşılaştırması), dgate.js, shot.js (konsol hatası, taşma, hareket denetimi, köşe), coverage.js (gece mavisi payı).</p>');

const OWN_BUILT = { 'gece-mavisi': sGece, dogru: sDogru, ekranlar: sEkranlar, panel: sPanel, renk: sRenk, kontrast: sKontrast, durumlar: sDurumlar, tipografi: sTipo, bicim: sBicim, ikonlar: sIkon, bilesenler: sBilesen, katmanlar: sKatman, hareket: sHareket, etkilesim: sEtkilesim };
const body = NAV.map(n => (n.frag ? fragSection(n.id) : n.id === 'platform' ? sPlatformOwn() : n.id === 'kaynaklar' ? sKaynakOwn() : OWN_BUILT[n.id])).join('\n');

const dialog = '<dialog class="dlg" id="dlg-close" aria-labelledby="dlg-t" aria-describedby="dlg-d"><div class="dlg-h"><h4 id="dlg-t">Yoklamayı erken kapat?</h4><button class="btn btn-ghost btn-icon" type="button" aria-label="Kapat" data-close>' + I('close', 20) + '</button></div>' +
  '<div class="dlg-b" id="dlg-d"><p>BİL 301 Veri Yapıları için pencere şimdi kapanır.</p><p class="help">İnternetsiz telefonlar bunu bilemez; o telefonlardaki kayıtlar beklemede kalır.</p></div>' +
  '<div class="dlg-f"><button class="btn btn-secondary" type="button" data-close autofocus>Vazgeç</button><button class="btn btn-danger" type="button" data-close data-confirm>Yoklamayı kapat</button></div></dialog>';

const side = '<aside class="side"><a class="brand" href="#ust">' + brand() + '<span><span class="brand-t">İÜ Yoklama</span><br><span class="brand-s">Tasarım</span></span></a><nav class="side-nav" aria-label="Bölümler">' +
  NAV.map(n => '<a href="#' + n.id + '"><span class="n">' + NO[n.id] + '</span>' + n.title + '</a>').join('') +
  '<span class="side-sep" aria-hidden="true"></span><a class="ext" href="plan.html">' + I('description', 16) + 'Plan</a><a class="ext" href="teknik.html">' + I('description', 16) + 'Teknik</a>' +
  '</nav></aside>';

/* ---------- generated CSS: Röntgen token swap and the reduced-motion preview ---------- */
// Röntgen: every color token that is not a midnight-blue step (accent.1 to 12) and not paper (neutral.1 to 5, QR white)
// becomes a flat light gray, so only the measured ink remains. It is a value swap on the role tokens, like a theme.
function xrayCss() {
  const tok = rd('tokens.css');
  const accent = new Set(T.color.accent.map(s => s.hex.toUpperCase()));
  const paper = new Set(T.color.neutral.filter(s => s.step <= 5).map(s => s.hex.toUpperCase()).concat(['#FFFFFF']));
  const XR = { paper: resolve('neutral.3'), line: resolve('neutral.5'), ink: resolve('neutral.6') };
  const decl = [];
  for (const m of tok.matchAll(/--([\w-]+):\s*(#[0-9A-Fa-f]{6});/g)) {
    const hex = m[2].toUpperCase();
    if (accent.has(hex) || paper.has(hex)) continue;
    const o = C.hexToOklch(hex);
    decl.push('--' + m[1] + ': ' + (o.L >= 0.9 ? XR.paper : o.L >= 0.75 ? XR.line : XR.ink) + ';');
  }
  return '/* generated by tools/build.js: Röntgen token swap */\n.xray { ' + decl.join(' ') + ' --scrim-a: rgba(220, 222, 230, 0.55); --cam-scrim: transparent; --shadow-2: none; --shadow-3: none; }\n';
}
// Reduced-motion preview: every rule inside @media (prefers-reduced-motion: reduce) is copied under html.rm,
// so the switch reproduces the operating-system setting exactly (interact.js compares the two on every element).
function splitSel(s) { const out = []; let d = 0, cur = ''; for (const ch of s) { if (ch === '(') d++; if (ch === ')') d--; if (ch === ',' && !d) { out.push(cur); cur = ''; } else cur += ch; } out.push(cur); return out.map(x => x.trim()).filter(Boolean); }
function rmCss(css) {
  const src = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const out = [];
  const re = /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{/g; let m;
  while ((m = re.exec(src))) {
    let depth = 1, i = re.lastIndex;
    for (; i < src.length && depth; i++) { if (src[i] === '{') depth++; else if (src[i] === '}') depth--; }
    const inner = src.slice(re.lastIndex, i - 1);
    for (const r of inner.matchAll(/([^{}]+)\{([^{}]*)\}/g)) out.push(splitSel(r[1]).map(s => (s === ':root' ? 'html.rm' : 'html.rm ' + s)).join(', ') + ' {' + r[2] + '}');
  }
  if (!out.length) throw new Error('no reduced-motion rules found');
  return '/* generated by tools/build.js: Hareketi azalt önizlemesi (html.rm) */\n' + out.join('\n') + '\n';
}

const pageCss = rd('src/specimen.css');
// Fragments may carry their own <style>; their reduced-motion rules are copied under html.rm as well.
const fragCss = Object.values(FRAG_HTML).map(h => [...h.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n')).join('\n');
const bodyHtml = '<a class="skip" href="#ana">İçeriğe geç</a><div class="shell">' + side + '<main id="ana"><div class="wrap">' + header + body +
  '<footer class="foot"><p>İÜ Yoklama · Tasarım · 6 Ekim 2026</p><p>' + (COV ? 'Gece mavisi ölçümü: ' + esc(COV.date) : 'Ölçüm bekleniyor') + ' · tokens.json, tcheck.js, coverage.js</p></footer></div></main></div>' +
  dialog + '<div class="toasts" aria-label="Bildirimler"><div class="toast-list" role="status" aria-live="polite"></div><div class="toast-list" role="alert" aria-live="assertive"></div></div>';

const html = '<!doctype html>\n<html lang="tr">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<title>İÜ Yoklama · Tasarım</title>\n' +
  '<meta name="description" content="İÜ Yoklama tasarım belgesi: kırık beyaz ve gri zemin, gece mavisi mürekkep; renk, yazı, biçim, hareket ve bileşenler.">\n<style>\n' + rd('fonts/plex-sans.css') + rd('fonts/plex-mono.css') + '\n' + rd('tokens.css') + '\n' + pageCss + '\n' + xrayCss() + rmCss(pageCss + '\n' + fragCss) + '</style>\n</head>\n<body>\n' +
  sprite() + '\n' + bodyHtml + '\n<script>window.QR_CODES = ' + JSON.stringify(QR.map(q => q.d)) + ';</script>\n<script>\n' + rd('src/specimen.js') + '\n</script>\n</body>\n</html>\n';
if (/[–—]/.test(html)) throw new Error('dash found in output');
if (html.includes('{{no}}')) throw new Error('unreplaced {{no}} in output');
// Fragment health, reported (never edited): internal links that point nowhere and ids that collide with this page.
{
  const strip = h => h.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '');
  const idList = [...strip(html).matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);
  const pageIds = new Set(idList);
  const dup = [...new Set(idList.filter((x, i) => idList.indexOf(x) !== i))];
  if (dup.length) REPORT.warnings.push('yinelenen kimlik: ' + dup.join(', '));
  for (const id of Object.keys(FRAG_HTML)) {
    const missing = [...new Set([...strip(FRAG_HTML[id]).matchAll(/href="#([^"]*)"/g)].map(m => m[1]).filter(x => !pageIds.has(x)))];
    if (missing.length) REPORT.warnings.push(FRAGS[id].file + ': hedefi olmayan iç bağlantı ' + missing.map(x => '#' + x).join(', '));
  }
}
const crlf = s => s.replace(/\r?\n/g, '\r\n');
fs.writeFileSync(OUT, crlf(html));
if (OUT === path.join(A, 'tasarim.html')) fs.writeFileSync(path.join(A, 'specimen.html'), crlf('<!doctype html>\n<html lang="tr">\n<head>\n<meta charset="utf-8">\n<title>İÜ Yoklama · Tasarım</title>\n<meta http-equiv="refresh" content="0; url=tasarim.html">\n</head>\n<body>\n<p>Bu sayfa tasarim.html adını aldı: <a href="tasarim.html">tasarim.html</a></p>\n</body>\n</html>\n'));
fs.mkdirSync(path.join(A, 'work'), { recursive: true });
fs.writeFileSync(path.join(A, 'work', 'build-report.json'), JSON.stringify({ ...REPORT, out: OUT, nav: NAV.map(n => ({ no: NO[n.id], id: n.id, title: n.title, frag: n.frag })) }, null, 1));
console.log(path.basename(OUT), Math.round(html.length / 1024) + ' KB', used.size + ' icon symbols', COV ? 'with coverage' : 'without coverage');
console.log('sections: ' + NAV.map(n => NO[n.id] + ' ' + n.id + (n.frag ? ' (parça)' : '')).join(', '));
for (const f of REPORT.fragments) console.log('fragment ' + (f.included ? f.id + ' (doc/' + f.file + ')' : f.file) + ': ' + (f.included ? 'içe alındı' : f.used ? 'eklendi' : 'yok' + (f.why && f.why !== 'yok' ? ' (' + f.why + ')' : '')));
for (const w of REPORT.warnings) console.log('warning: ' + w);
