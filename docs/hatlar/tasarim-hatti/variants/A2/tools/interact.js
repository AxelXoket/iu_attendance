// Behavioural test of tasarim.html in headless Chrome (no window, no sound). Every check prints PASS or FAIL; exit code 1 on any FAIL.
// It drives the page like a user (real mouse and keyboard events over the DevTools protocol), saves evidence frames to
// shots-int/, and checks: sheet (choice rows, no circles), offline band, menu, dialogs, tabs, e-mail code, toasts, scan, the
// success moment frame by frame (with a built-in mutation that must be caught), receipt timeline, Turkish sort, filters and
// totals, the table cross-fade, checkbox hit area, exception chips, the Röntgen switch (keyboard, pins, measured share
// unchanged, every other hue gone), hover, press and release timing, the focus ring, the loading button (width kept, nothing
// shown under time.gosterge), the loading mark, accordions, the component anatomy (every live demo measured against the
// Bileşenler table), copy rules, the reduced-motion token swap and preview (computed motion of every element equals the
// operating-system setting), and the side navigation at 390 px and at 1440 x 768.
// Usage: node tools/interact.js [--file <html>]
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path'), os = require('os');
const CHROME = ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'].find(p => fs.existsSync(p));
const A = path.join(__dirname, '..');
const fileArg = process.argv.indexOf('--file');
const FILE = fileArg > 0 ? path.resolve(process.argv[fileArg + 1]) : path.join(A, 'tasarim.html');
const OUT = path.join(A, 'shots-int');
const COVJS = require(path.join(A, '..', '..', 'coverage.js'));
const C = require(path.join(A, '..', '..', 'color.js'));
const T = JSON.parse(fs.readFileSync(path.join(A, 'tokens.json'), 'utf8'));
const COV = JSON.parse(fs.readFileSync(path.join(A, 'coverage.json'), 'utf8'));
const motion = require('./lib/motion');
// Single sources the page draws from (never retyped here): the plan's Devamdan muaf sentence, the offline sentence and the
// deletion lines of Telefon ekranları.
const { MUAF_HELP } = require('./sections/bilesenler');
const { OFFLINE_SEND, DELETION } = require('./sections/ekranlar');
// plan.html of the repository, when it is where the owner keeps it (or IU_REPO says): the help line is compared with it.
const REPO = process.env.IU_REPO || 'C:\\Users\\USER\\Desktop\\iu_attendance';
const PLAN_TEXT = fs.existsSync(path.join(REPO, 'plan.html')) ? fs.readFileSync(path.join(REPO, 'plan.html'), 'utf8').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ') : null;
fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = [];
const check = (name, ok, detail) => { results.push({ name, ok: !!ok, detail }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail !== undefined ? '  ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : '')); };
const info = (name, detail) => console.log('INFO ' + name + (detail !== undefined ? '  ' + JSON.stringify(detail) : ''));
const rgbHex = s => { const m = String(s).match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/); if (!m) return null; if (m[4] !== undefined && +m[4] < 0.01) return 'transparent'; return '#' + [m[1], m[2], m[3]].map(x => Math.round(+x).toString(16).padStart(2, '0')).join('').toUpperCase(); };
const hexOf = ref => { if (/^#/.test(ref)) return ref.toUpperCase(); const [n, s] = ref.split('.'); return T.color[n].find(x => x.step === +s).hex; };
// A token path the anatomy measures against: component.<key>.<size path> (size, number or mark), type.<where>.<name>.
function tokenValue(p) {
  const [g, key, ...rest] = p.split('.');
  if (g === 'component') {
    const c = T.components.find(x => x.key === key);
    for (const src of [c.size, c.number, rest[0] === 'mark' ? { mark: c.mark } : null]) { let v = src; for (const r of rest) v = v && v[r]; if (typeof v === 'number') return v; }
    throw new Error('interact: no token ' + p);
  }
  if (g === 'type') { const s = T.type[key].find(x => x.name === rest.join('.')); if (!s) throw new Error('interact: no type ' + p); return s; }
  throw new Error('interact: no token ' + p);
}
// The scan frame's four corners: each corner's outer point against the matching corner of the QR's box, in the phone's
// own pixels (the phone may be zoomed), plus the frame's box, whether a corner is still moving, the lock and the hint.
const SCAN_CORNERS = `(() => { const ph = document.querySelector('#ph-scan'), f = ph.querySelector('.scan-frame'), sc = ph.closest('.device-screen') || ph, z = sc.getBoundingClientRect().width / sc.offsetWidth, q = ph.querySelector('.cam-qr').getBoundingClientRect(), fr = f.getBoundingClientRect(), pr = ph.getBoundingClientRect(); const c = [...f.children].map(i => i.getBoundingClientRect()); const pt = [[c[0].left, c[0].top], [c[1].right, c[1].top], [c[2].left, c[2].bottom], [c[3].right, c[3].bottom]], want = [[q.left, q.top], [q.right, q.top], [q.left, q.bottom], [q.right, q.bottom]]; return { z, frame: [fr.left - pr.left, fr.top - pr.top, fr.width, fr.height].map(v => Math.round(v / z)), off: pt.map((p, k) => [(want[k][0] - p[0]) / z, (want[k][1] - p[1]) / z].map(v => Math.round(Math.abs(v) * 10) / 10)), moving: [...f.children].some(i => i.getAnimations().some(a => a.playState === 'running')), lock: f.classList.contains('lock'), hint: ph.querySelector('.scan-hint').textContent.trim() }; })()`;

(async () => {
  const port = 9600 + (process.pid % 90);
  const udd = fs.mkdtempSync(path.join(os.tmpdir(), 'int-'));
  const proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${udd}`, '--disable-gpu', '--hide-scrollbars', '--mute-audio', '--no-first-run', '--force-color-profile=srgb', '--disable-lcd-text', 'about:blank'], { stdio: 'ignore', windowsHide: true });
  let wsUrl;
  for (let i = 0; i < 100 && !wsUrl; i++) { try { const l = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); const p = l.find(t => t.type === 'page'); if (p) wsUrl = p.webSocketDebuggerUrl; } catch {} if (!wsUrl) await sleep(150); }
  const ws = new WebSocket(wsUrl); await new Promise(r => (ws.onopen = r));
  let seq = 0; const pend = new Map(); const events = [];
  ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d.result || d.error); pend.delete(d.id); } else if (d.method) events.push(d); };
  const send = (method, params = {}) => new Promise(res => { const id = ++seq; pend.set(id, res); ws.send(JSON.stringify({ id, method, params })); });
  const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error('page error: ' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text) + '\n' + expr.slice(0, 200)); return r.result ? r.result.value : r; };
  const box = async sel => ev(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height }; })()`);
  const shot = async (name, sel, pad = 0) => {
    await ev(`document.querySelector(${JSON.stringify(sel)}).scrollIntoView({ block: 'center' })`); await sleep(60);
    const b = await box(sel);
    const s = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: Math.max(0, b.x - pad), y: Math.max(0, b.y - pad), width: b.w + 2 * pad, height: b.h + 2 * pad, scale: 1 } });
    const f = path.join(OUT, name + '.png'); fs.writeFileSync(f, Buffer.from(s.data, 'base64')); return f;
  };
  const key = async (k, code, kc, text) => { await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, windowsVirtualKeyCode: kc, ...(text ? { text } : {}) }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: kc }); };
  const SPACE = () => key(' ', 'Space', 32, ' '), ENTER = () => key('Enter', 'Enter', 13, '\r'), ESC = () => key('Escape', 'Escape', 27);
  const center = async sel => ev(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height }; })()`);
  const mouse = async (type, x, y) => send('Input.dispatchMouseEvent', { type, x, y, button: type === 'mouseMoved' ? 'none' : 'left', clickCount: type === 'mouseMoved' ? 0 : 1 });
  // A real mouse click (move, press, release over the protocol) at the centre of the element the expression names.
  const realClick = async expr => { const p = await ev(`(() => { const e = ${expr}; e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`); await mouse('mouseMoved', p.x, p.y); await mouse('mousePressed', p.x, p.y); await mouse('mouseReleased', p.x, p.y); };
  const load = async (width, reduce, height = 900) => {
    events.length = 0;
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 600 });
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: reduce ? 'reduce' : 'no-preference' }] });
    await send('Page.navigate', { url: 'file:///' + FILE.replace(/\\/g, '/') });
    for (let i = 0; i < 80 && !events.some(e => e.method === 'Page.loadEventFired'); i++) await sleep(100);
    await ev('document.fonts ? document.fonts.ready.then(() => true) : true');
    await sleep(500);
  };
  await send('Page.enable'); await send('Runtime.enable');
  await load(1440, false);
  // Token values the checks expect, read from tokens.json (never retyped): curves, durations, a list of computed timings.
  const bez = n => 'cubic-bezier(' + T.motion.easing.find(e => e.name === n).bezier.join(', ') + ')';
  const msOf = n => T.motion.duration.find(d => d.name === n).ms;
  const normEase = s => (s === 'ease' ? 'cubic-bezier(0.25, 0.1, 0.25, 1)' : s);
  const part = (s, k, i) => normEase(s[k].split(/,(?![^(]*\))/).map(x => x.trim())[i]);
  // One step of a motion pattern (Etkileşim tablosu): its duration as getComputedStyle prints it (d), in ms, and its curve
  // (e). With red, the reduced-motion step where the pattern names one, else the step itself.
  const step = (key, track = 'main', phase = 'enter', red = false) => {
    const p = motion.pattern(key), r = red && p.reduced && p.reduced.timing && p.reduced.timing[track];
    const s = (r && r[phase]) || p.timing[track][phase];
    const dn = motion.durOfStep(s), en = motion.easeOfStep(s);
    const ms = dn.startsWith('time.') ? T.motion.timing.find(t => t.name === dn.slice(5)).ms : msOf(dn.slice(4));
    return { ms, d: ms / 1000 + 's', e: bez(en.slice(5)), name: dn + ', ' + en };
  };
  const scaleOf = n => T.motion.scale.find(x => x.name === n).value;

  /* 1. Bottom sheet (a drawing of the system sheet): report copy follows the rule, choice rows without circles, error,
        send, focus return; the scrim dims the offline band; it plays with the side panel's tokens, never a spring */
  {
    const bc = await ev(`(() => { const b = document.querySelector('#ph-records .pbanner'); b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { cls: e && (e.closest('.pbanner') ? 'pbanner' : e.className), x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
    check('offline band is hit-testable before the sheet opens (ground control)', bc.cls === 'pbanner', bc.cls);
    await ev(`document.querySelector('.device-ctl [data-sheet-open]').click()`);
    const motion = await ev(`(() => { const cs = getComputedStyle(document.querySelector('#ph-records .sheet')); return { p: cs.transitionProperty, d: cs.transitionDuration, e: cs.transitionTimingFunction }; })()`);
    await sleep(160); await shot('01-sheet-mid', '#scr-records');
    await sleep(500); await shot('02-sheet-open', '#scr-records');
    const DR = step('drawer', 'main', 'enter');
    check('sheet drawing: enters with the side panel\'s entry step (' + DR.name + '), no spring curve (the phone sheet moves as the system decides)', part(motion, 'd', 0) === DR.d && part(motion, 'e', 0) === DR.e && !/linear\(/.test(motion.e), motion);
    const st = await ev(`(() => { const s = document.querySelector('#ph-records .sheet'); const b = document.querySelector('#ph-records .pbanner'); const r = b.getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { focus: document.activeElement.textContent.trim(), rec: s.querySelector('[data-sheet-rec]').textContent, rule: s.querySelector('[data-sheet-rule]').textContent, top: e && e.className, rows: [...s.querySelectorAll('.opt')].map(o => ({ marks: o.querySelectorAll('svg.opt-ic').length, svgs: o.querySelectorAll('svg').length, circle: !!o.querySelector('use[href*="radio_button"]'), radius: getComputedStyle(o).borderTopLeftRadius })) }; })()`);
    check('sheet: focus enters the first reason (short choice list)', /Telefonum yoktu/.test(st.focus), st.focus);
    check('sheet: record line and 3-day rule for a decided record', st.rec === 'Fizik II, 3 Ekim 09:05' && /Karar telefonuna ulaştıktan sonraki 3 gün içinde bildirebilirsin\. Bildirim hocanın listesine düşer\./.test(st.rule), st.rule);
    check('sheet: the scrim covers (dims) the offline band', st.top === 'sheet-scrim', st.top);
    check('sheet: every reason is a square row with one check mark and no circle', st.rows.length === 3 && st.rows.every(r => r.marks === 1 && r.svgs === 1 && !r.circle && r.radius === '0px'), st.rows);
    await ev(`document.querySelector('[data-sheet-send]').click()`); await sleep(250);
    await shot('03-sheet-error', '#scr-records');
    check('sheet: sending without a reason shows the error', await ev(`document.querySelector('#ph-records .sheet .msg').textContent`) === 'Bir neden seç.');
    const rest = await ev(`(() => { const o = document.querySelectorAll('#ph-records .opt')[1]; return { mark: getComputedStyle(o.querySelector('.opt-ic')).opacity, bar: getComputedStyle(o, '::before').transform }; })()`);
    await ev(`document.querySelectorAll('#ph-records .opt')[1].focus()`); await SPACE(); await sleep(250);
    const sel = await ev(`(() => { const o = document.querySelectorAll('#ph-records .opt')[1]; return { checked: o.getAttribute('aria-checked'), mark: getComputedStyle(o.querySelector('.opt-ic')).opacity, bar: getComputedStyle(o, '::before').transform, bg: getComputedStyle(o).backgroundColor, others: [...document.querySelectorAll('#ph-records .opt')].filter(x => x.getAttribute('aria-checked') === 'true').length }; })()`);
    check('sheet: ground control, an unchosen row shows no check and no selection mark', rest.mark === '0' && /matrix\(1, 0, 0, 0,/.test(rest.bar), rest);
    check('sheet: keyboard chooses one reason; its row shows the check, the 2 px selection mark and bg.selected', sel.checked === 'true' && sel.mark === '1' && /matrix\(1, 0, 0, 1,/.test(sel.bar) && rgbHex(sel.bg) === hexOf(T.color.roles['bg.selected']) && sel.others === 1, sel);
    await ev(`document.querySelector('[data-sheet-send]').click()`); await sleep(700);
    await shot('04-sheet-sent-toast', '#scr-records');
    check('sheet: focus returns to the opener after sending', /Sorun bildir/.test(await ev(`document.activeElement.textContent.trim()`)));
    const pt = await ev(`(() => { const t = document.querySelector('#ph-records .ptoast'); if (!t) return null; const e = t.querySelector('.icon-btn'), b = e.getBoundingClientRect(), z = b.width / e.offsetWidth; return { w: Math.round(b.width / z * 10) / 10, h: Math.round(b.height / z * 10) / 10 }; })()`);
    const PC = tokenValue('component.toast.phone.close');
    check('sheet: confirmation toast appears in the phone; its close button is component.toast.phone.close square', pt && pt.w === PC && pt.h === PC, { got: pt, want: PC });
    await ev(`document.querySelector('#ph-records .rec-row [data-sheet-open]').click()`); await sleep(400);
    const pend = await ev(`({ rec: document.querySelector('[data-sheet-rec]').textContent, rule: document.querySelector('[data-sheet-rule]').textContent })`);
    check('sheet: rule for a record whose decision has not arrived', pend.rec === 'Veri Yapıları, 6 Ekim 10:03' && /^Süre, sunucu kararı telefonuna ulaşınca başlar; o andan sonraki 3 gün içinde bildirebilirsin\./.test(pend.rule), pend);
    await ESC(); await sleep(300);
    check('sheet: Escape closes it', await ev(`!document.querySelector('#ph-records').classList.contains('sheet-open')`));
    const times = await ev(`(() => { const clock = document.querySelector('#ph-records .ph-status .num').textContent; const toMin = s => { const m = s.match(/(\\d+) Ekim, (\\d\\d):(\\d\\d)/); return +m[1] * 1440 + +m[2] * 60 + +m[3]; }; return { clock, rows: [...document.querySelectorAll('#ph-records .rec-row .s')].map(s => s.textContent), now: 6 * 1440 + +clock.slice(0, 2) * 60 + +clock.slice(3) }; })()`);
    const mins = times.rows.map(s => { const m = s.match(/(\d+) Ekim, (\d\d):(\d\d)/); return +m[1] * 1440 + +m[2] * 60 + +m[3]; });
    check('records: newest first, and no record is later than the phone clock (6 Ekim ' + times.clock + ')', mins.every((m, i) => m <= times.now && (i === 0 || m <= mins[i - 1])), times.rows);
  }

  /* 2. Offline band: light neutral.3, readable, never the inverse band; toggles */
  {
    const b = await ev(`(() => { const p = document.querySelector('#ph-records .pbanner'), cs = getComputedStyle(p); return { bg: cs.backgroundColor, fg: cs.color, small: getComputedStyle(p.querySelector('small')).color, text: p.textContent }; })()`);
    const bg = rgbHex(b.bg), fg = rgbHex(b.fg), sm = rgbHex(b.small);
    check('offline band background is neutral.3, not the inverse band', bg === hexOf('neutral.3') && bg !== hexOf('neutral.12'), bg);
    check('offline band text at least 4.5:1', C.wcagRatio(fg, bg) >= 4.5 && C.wcagRatio(sm, bg) >= 4.5, [C.wcagRatio(fg, bg).toFixed(2), C.wcagRatio(sm, bg).toFixed(2)]);
    // decisions-r2 E8: sending happens when the app is opened with internet; the band says that and promises no background send.
    check('offline band copy: the one offline sentence (Telefon ekranları), no promise of a background send (E8)', b.text.includes(OFFLINE_SEND) && !/kendiliğinden gönderilir|Uygulamayı kapatabilirsin/.test(b.text), b.text);
    const bar = `(() => { const s = document.querySelector('#ph-records .ph-status'); const vis = c => [...s.querySelectorAll(c + ' use')].filter(u => u.closest(c).offsetParent !== null).map(u => u.getAttribute('href')); return { on: vis('.sys-on'), off: vis('.sys-off') }; })()`;
    const sbOff = await ev(bar);
    await ev(`document.querySelector('[data-offline]').click()`); await sleep(120); await shot('05-online-mid', '#scr-records');
    await sleep(600); await shot('06-online', '#scr-records');
    const sbOn = await ev(bar);
    check('offline band hides when the internet returns', await ev(`getComputedStyle(document.querySelector('#ph-records .pbanner')).visibility === 'hidden'`));
    check('status bar follows the screen: no-internet icons while offline, signal and Wi-Fi when online', sbOff.off.length === 2 && sbOff.on.length === 0 && sbOff.off.every(h => /nodata|wifi_off/.test(h)) && sbOn.on.length === 2 && sbOn.off.length === 0, { sbOff, sbOn });
    await ev(`document.querySelector('[data-offline]').click()`); await sleep(600); await shot('07-offline-again', '#scr-records');
    check('offline band returns', await ev(`getComputedStyle(document.querySelector('#ph-records .pbanner')).visibility === 'visible'`));
  }

  /* 3. Menu, 4. dialog, 5. tabs, 6. e-mail code, 7. toasts */
  {
    await ev(`document.querySelector('#m1-b').click()`); await sleep(80); await shot('08-menu-mid', '.menu-wrap', 260);
    await sleep(300); await shot('09-menu-open', '.menu-wrap', 260);
    const items = await ev(`[...document.querySelectorAll('#m1 [role=menuitem]')].map(i => i.textContent.trim())`);
    check('menu: plan features only (Oturumlarım, Çıkış yap, Hesabımı sil last); no record deletion, no browser shortcut', items.join('|') === 'Oturumlarım|Çıkış yap|Hesabımı sil' && !/Kaydı sil|Ctrl/.test(await ev(`document.querySelector('#katmanlar').textContent + document.querySelector('#bilesenler').textContent`)), items);
    await key('ArrowDown', 'ArrowDown', 40); await key('ArrowDown', 'ArrowDown', 40);
    check('menu: arrow keys move through items', /Hesabımı sil/.test(await ev(`document.activeElement.textContent.trim()`)));
    await ESC(); await sleep(300);
    check('menu: Escape closes and focus returns to the trigger', await ev(`document.querySelector('#m1').dataset.open === 'false' && document.activeElement.id === 'm1-b'`));
    await ev(`document.querySelector('#b-danger').click()`); await sleep(90); await shot('10-dialog-mid', 'body');
    await sleep(300);
    check('dialog: opens with focus on Vazgeç; the title asks in Turkish', await ev(`document.querySelector('#dlg-del').open && document.activeElement.textContent.trim() === 'Vazgeç' && document.querySelector('#dlg-del h4').textContent === 'Hesabın silinsin mi?'`));
    // plan.html#kararlar-hesap-silme: what is deleted, what stays, why and for how long; the lines of the app's screen.
    const facts = await ev(`[...document.querySelectorAll('#dlg-del .dlg-dl dt')].map(t => [t.textContent, t.nextElementSibling.textContent])`);
    check('deletion dialog: Silinir, Kalır, Neden, Ne kadar, with the instructor lines Telefon ekranları draws', JSON.stringify(facts) === JSON.stringify([['Silinir', DELETION.hoca.silinir], ['Kalır', DELETION.hoca.kalir], ['Neden', DELETION.hoca.neden], ['Ne kadar', DELETION.hoca.sure]]), facts);
    const s = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(OUT, '11-dialog-open.png'), Buffer.from(s.data, 'base64'));
    await ESC(); await sleep(80);
    const s2 = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(OUT, '12-dialog-closing.png'), Buffer.from(s2.data, 'base64'));
    await sleep(300);
    check('dialog: Escape closes it and focus returns to the opener', await ev(`!document.querySelector('#dlg-del').open && document.activeElement.id === 'b-danger'`));
    await ev(`document.querySelector('#m1-b').click()`); await sleep(250);
    await ev(`document.querySelector('#m1 [data-dialog]').click()`); await sleep(300);
    const fromMenu = await ev(`({ open: document.querySelector('#dlg-del').open, menu: document.querySelector('#m1').dataset.open })`);
    await ESC(); await sleep(300);
    check('dialog opened from a menu item: the menu closes, and focus returns to the menu trigger', fromMenu.open && fromMenu.menu === 'false' && await ev(`document.activeElement.id === 'm1-b'`), fromMenu);
    check('early-close dialog (instructor phone): the title asks in Turkish', await ev(`document.querySelector('#dlg-close h4').textContent === 'Yoklama erken kapatılsın mı?'`));
    // Tabs (Etkileşim tablosu, sekme): a pointer click slides the indicator with the tab pattern's indicator timing and
    // fades the content in with its content timing; the arrow keys move it at once (Hareket, Kurallar).
    const tabState = `(() => { const ind = document.querySelector('[aria-label="Dönem"] .tabs-ind'), cs = getComputedStyle(ind), p = [...document.querySelectorAll('.tabpanel')].find(x => !x.hidden); return { tf: cs.transform, want: ind.style.transform, d: cs.transitionDuration, e: cs.transitionTimingFunction, panel: p && p.id, fade: p && p.getAnimations().map(a => a.animationName + ' ' + (a.effect.getTiming().duration)).join(), fe: p && getComputedStyle(p).animationTimingFunction }; })()`;
    const tc = await center('[aria-label="Dönem"] [role=tab]:nth-of-type(3)');
    await mouse('mouseMoved', tc.x, tc.y); await mouse('mousePressed', tc.x, tc.y); await mouse('mouseReleased', tc.x, tc.y); await sleep(40);
    const byPointer = await ev(tabState);
    await shot('13-tabs-mid', '[aria-label="Dönem"]', 4);
    await sleep(320); await shot('14-tabs-done', '[aria-label="Dönem"]', 4);
    await mouse('mouseMoved', 1, 1);
    const TI = step('tab', 'indicator', 'enter'), TC = step('tab', 'content', 'enter');
    check('tabs: a pointer click shows the panel, slides the indicator (' + TI.name + ') and fades the content in (' + TC.name + ')', byPointer.panel === 'tp3' && part(byPointer, 'd', 0) === TI.d && part(byPointer, 'e', 0) === TI.e && byPointer.tf !== 'none' && /fadeIn/.test(byPointer.fade) && byPointer.fade.includes(String(TC.ms)) && normEase(byPointer.fe) === TC.e, byPointer);
    await ev(`document.querySelector('#t-tp3').focus()`); await key('ArrowRight', 'ArrowRight', 39); await sleep(16);
    const byKey = await ev(tabState);
    const keyMatrix = await ev(`(() => { const ind = document.querySelector('[aria-label="Dönem"] .tabs-ind'); const probe = document.createElement('div'); probe.style.transform = ind.style.transform; document.body.appendChild(probe); const m = getComputedStyle(probe).transform; probe.remove(); return m; })()`);
    check('tabs: the arrow key moves the indicator at once (it already stands at its new place) and shows the content without a fade', byKey.panel === 'tp4' && byKey.tf === keyMatrix && !byKey.fade, { byKey, keyMatrix });
    await ev(`(() => { const i = document.querySelector('#otp-in'); i.focus(); i.value = '246 81 0x'; i.dispatchEvent(new Event('input')); })()`); await sleep(600);
    const mid = await ev(`document.querySelector('#otp-msg').textContent`);
    await sleep(500); await shot('15-otp-ok', '[data-otp]', 4);
    check('e-mail code: a check shorter than time.gosterge shows no indicator', mid === '', mid);
    check('e-mail code: pasted text is cleaned to digits and accepted', await ev(`document.querySelector('#otp-in').value === '246810' && document.querySelector('[data-otp]').dataset.st === 'ok'`));
    await ev(`document.querySelector('[data-toast="ok"]').click()`); await ev(`document.querySelector('[data-toast="err"]').click()`); await sleep(400);
    const s3 = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(OUT, '16-toasts.png'), Buffer.from(s3.data, 'base64'));
    check('toasts: success in the role=status region, error in the role=alert region', await ev(`!!document.querySelector('.toasts [role=status] .toast') && !!document.querySelector('.toasts [role=alert] .toast')`));
    // Toasts are fixed to the viewport; close them so they never sit over the screen shots that follow.
    await ev(`[...document.querySelectorAll('.toasts .toast button')].forEach(b => b.click())`); await sleep(300);
    check('toasts: the Kapat button closes them, the error one included', await ev(`document.querySelectorAll('.toasts .toast').length === 0`));
    // A success toast lives time.bildirim, stopped while the pointer is on it, then goes on from where it stopped.
    const life = T.motion.timing.find(t => t.name === 'bildirim').ms;
    await ev(`document.querySelector('[data-toast="ok"]').click()`); await sleep(150);
    const tp = await ev(`(() => { const r = document.querySelector('.toasts .toast').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
    await mouse('mouseMoved', tp.x, tp.y);
    await sleep(life + 400);
    const held = await ev(`document.querySelectorAll('.toasts .toast:not(.out)').length`);
    await mouse('mouseMoved', 1, 1);
    await sleep(life + 600);
    const gone = await ev(`document.querySelectorAll('.toasts .toast').length`);
    check('toast: time.bildirim stops while the pointer is on the toast and runs on after it leaves', held === 1 && gone === 0, { held, gone });
  }

  /* 8. Scan: copy and lock (the 1x and 2x control is gone: not a plan decision, G2 finding 26) */
  {
    const t = await ev(`({ scan: document.querySelector('#ph-scan').textContent, all: document.body.textContent })`);
    check('scan: no developer copy on the student screen', !/Kamera ana \(1x\)/.test(t.scan) && /QR'ı çerçevenin içine al/.test(t.scan), t.scan.slice(0, 120));
    check('backup code: one term (Yedek kodu gir, Yedek kod; never Kodla gir)', /Yedek kodu gir/.test(t.scan) && !/Kodla gir/.test(t.all));
    // On capture each corner moves onto the QR's measured edges, component.scanframe.qrInset outside them (motion pattern
    // scan); the frame itself stays. Measured once the corners stop, in the phone's own pixels (its zoom divided out).
    await ev(`document.querySelector('#ph-scan').scrollIntoView({ block: 'center' })`); await sleep(60);
    const rest = await ev(SCAN_CORNERS);
    await ev(`document.querySelector('[data-scan]').click()`);
    const t0 = Date.now(); let lock = await ev(SCAN_CORNERS);
    while ((lock.moving || !lock.lock) && Date.now() - t0 < 1200) { await sleep(30); lock = await ev(SCAN_CORNERS); }
    await shot('17-scan-lock', '#scr-scan');
    const QI = tokenValue('component.scanframe.qrInset');
    check('scan: frame locks on detection and the hint changes', lock.lock && lock.hint !== rest.hint, lock.hint);
    check('scan: every corner sits component.scanframe.qrInset outside the QR\'s edges, the frame stays', !lock.moving && lock.off.every(p => p.every(v => Math.abs(v - QI) <= 0.6)) && JSON.stringify(lock.frame) === JSON.stringify(rest.frame), { off: lock.off, want: QI, frame: [rest.frame, lock.frame] });
    check('scan: ground control, at rest the corners are not on the QR', !rest.off.every(p => p.every(v => Math.abs(v - QI) <= 0.6)), rest.off);
    await sleep(1800);
  }

  /* 9. Success moment, frame by frame. Animations are paused at exact times with the Web Animations API.
        An empty box = an element whose box is painted (background or border) and visible, while none of its text is. */
  {
    const detector = `(() => {
      const ok = document.querySelector('#ph-success .ok-body');
      const eff = el => { let o = 1; for (let e = el; e && e !== document.body; e = e.parentElement) { const cs = getComputedStyle(e); o *= +cs.opacity; if (cs.visibility === 'hidden') return 0; } return o; };
      const painted = el => { const cs = getComputedStyle(el); const bg = cs.backgroundColor; const hasBg = bg && !/rgba\\(\\s*0,\\s*0,\\s*0,\\s*0\\s*\\)|transparent/.test(bg); const hasBd = ['Top', 'Right', 'Bottom', 'Left'].some(s => parseFloat(cs['border' + s + 'Width']) > 0 && !/rgba\\(\\s*0,\\s*0,\\s*0,\\s*0\\s*\\)/.test(cs['border' + s + 'Color'])); return hasBg || hasBd; };
      const empties = [];
      for (const el of ok.querySelectorAll('*')) {
        if (!painted(el) || eff(el) < 0.05) continue;
        const r = el.getBoundingClientRect(); if (r.width * r.height < 400) continue;
        const texts = [...el.querySelectorAll('*')].filter(c => [...c.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()));
        if (texts.length && texts.every(c => eff(c) < 0.05)) empties.push((el.className && el.className.baseVal === undefined ? el.className : el.tagName) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
      }
      return empties;
    })()`;
    const frameAt = async t => {
      await ev(`(() => { const ok = document.querySelector('#ph-success'); ok.classList.remove('play'); void ok.offsetWidth; ok.classList.add('play'); ok.getAnimations({ subtree: true }).forEach(a => { a.pause(); a.currentTime = ${t}; }); return true; })()`);
      await sleep(40);
      return ev(detector);
    };
    await ev(`document.querySelector('#scr-success').scrollIntoView({ block: 'center' })`); await sleep(300);
    for (const t of [60, 150, 300]) {
      const empties = await frameAt(t);
      await shot('19-success-' + t + 'ms', '#scr-success');
      check('success moment at ' + t + ' ms: no empty frame', empties.length === 0, empties);
    }
    // Built-in mutation: give the receipt a framed surface (the old defect). The detector must catch it, or it proves nothing.
    await ev(`(() => { const s = document.createElement('style'); s.id = 'mut'; s.textContent = '#ph-success .rcpt { background: #FEFEFF; border: 1px solid #D3D7E0; }'; document.head.appendChild(s); return true; })()`);
    const mut = await frameAt(150);
    check('mutation: a framed receipt arriving before its steps is caught at 150 ms', mut.length > 0, mut);
    await ev(`document.getElementById('mut').remove()`);
    const end = await ev(`(() => { const ok = document.querySelector('#ph-success'); ok.getAnimations({ subtree: true }).forEach(a => a.finish()); const steps = [...ok.querySelectorAll('.rsteps[data-v=on] .rs')]; return { n: steps.length, op: steps.map(s => getComputedStyle(s).opacity), done: steps.map(s => s.classList.contains('done')), times: steps.map(s => s.querySelector('.rs-time').textContent), titles: steps.map(s => s.querySelector('.rs-t').textContent), node: getComputedStyle(steps[0].querySelector('.rs-m')).backgroundColor, dec: steps[2].querySelector('.rs-s').textContent.trim() }; })()`);
    await shot('20-success-end', '#scr-success');
    check('receipt timeline: three steps with times, filled accent.11 nodes, decision Var', end.n === 3 && end.op.every(o => o === '1') && end.done.every(Boolean) && end.titles.join('|') === 'Telefonda kayıtlı|Sunucuya ulaştı|Sunucu kararı' && end.times.every(t => /^\d\d:\d\d:\d\d$/.test(t)) && rgbHex(end.node) === hexOf('accent.11') && end.dec === 'Var', end);
    const gap = await ev(`(() => { const s = document.querySelector('#ph-success'); const h = s.querySelector('.ok-help').getBoundingClientRect(), b = s.querySelector('.ph-actions .btn-primary').getBoundingClientRect(); return Math.round(b.top - h.bottom); })()`);
    check('success screen: no dead band above Tamam (gap at most 64 px)', gap <= 64, gap + ' px');
    await ev(`document.querySelector('[data-receipt]').click()`); await sleep(300); await shot('21-success-offline', '#scr-success');
    const off = await ev(`(() => { const l = document.querySelector('#ph-success .rsteps[data-v=off]'); const st = [...l.querySelectorAll('.rs')]; const m = st[1].querySelector('.rs-m'), cs = getComputedStyle(m); return { visible: getComputedStyle(l).visibility, wait: st.map(s => s.classList.contains('wait')), time: st[1].querySelector('.rs-time').textContent, bg: cs.backgroundColor, bd: cs.boxShadow, help: document.querySelector('#ph-success .ok-help [data-v=off]').textContent }; })()`);
    check('receipt offline: hollow pending nodes and "bekliyor"', off.visible === 'visible' && off.wait.join() === 'false,true,true' && off.time === 'bekliyor' && rgbHex(off.bg) === hexOf('neutral.2') && rgbHex(off.bd) === hexOf('neutral.9'), off);
    check('receipt offline copy: the one offline sentence (E8)', off.help === OFFLINE_SEND, off.help);
    await ev(`document.querySelector('[data-receipt]').click()`); await sleep(200);
  }

  /* 10. Panel: Turkish sort, totals, filters, Son durum names, exception chips, checkbox hit area */
  {
    const P = await ev(`(() => { const rows = [...document.querySelectorAll('#pnl-table tbody tr')]; const names = rows.map(r => r.dataset.name); const coll = new Intl.Collator('tr'); return { names, coll: [...names].sort(coll.compare), naive: [...names].sort(), head: document.querySelector('[data-sort]').textContent.trim(), aria: document.querySelector('[data-sort]').closest('th').getAttribute('aria-sort') }; })()`);
    check('sort: ground control, Turkish order differs from code-point order for these names', P.coll.join() !== P.naive.join());
    check('sort: rows start in Turkish order under "Ad soyad" (ascending)', P.names.join() === P.coll.join() && P.head === 'Ad soyad' && P.aria === 'ascending', P.names.slice(0, 12).join(', '));
    await ev(`document.querySelector('[data-sort]').click()`); await sleep(100);
    const desc = await ev(`[...document.querySelectorAll('#pnl-table tbody tr')].map(r => r.dataset.name)`);
    check('sort: click gives descending Turkish order', desc.join() === [...P.coll].reverse().join() && await ev(`document.querySelector('[data-sort]').closest('th').getAttribute('aria-sort') === 'descending'`));
    await ev(`document.querySelector('[data-sort]').click()`); await sleep(100);
    check('sort: second click restores ascending', (await ev(`[...document.querySelectorAll('#pnl-table tbody tr')].map(r => r.dataset.name)`)).join() === P.coll.join());
    // Sorting and filtering by pointer cross-fade the table body with the table pattern's timing (Etkileşim tablosu,
    // tablo): a copy of the table as it was fades out over the new rows; its head is hidden so the real head stays; it
    // carries no id; it is gone after the fade; nothing else animates the real body. A change made with the keyboard is
    // instant (Hareket, Kurallar): no copy, no animation. Real mouse clicks and real key presses over the protocol.
    const ghostNow = `new Promise(res => requestAnimationFrame(() => requestAnimationFrame(() => { const other = document.querySelector('#pnl-table tbody').getAnimations().filter(a => a.playState === 'running').length; const g = document.querySelector('#scr-panel .xf-ghost'); if (!g) return res(other ? { other } : null); const a = g.getAnimations()[0]; res({ head: getComputedStyle(g.querySelector('thead')).visibility, d: a && a.effect.getTiming().duration, e: a && a.effect.getTiming().easing, k: a && a.effect.getKeyframes().map(f => String(f.opacity)).join(), ids: g.querySelectorAll('[id]').length + (g.id ? 1 : 0), hidden: g.getAttribute('aria-hidden'), other }); })))`;
    const [tDur, tEase] = T.motion.patterns.find(p => p.key === 'table').timing.main.enter;
    const want = { d: T.motion.duration.find(x => x.name === tDur.split('.')[1]).ms, e: 'cubic-bezier(' + T.motion.easing.find(x => x.name === tEase.split('.')[1]).bezier.join(', ') + ')' };
    const names = () => ev(`[...document.querySelectorAll('#pnl-table tbody tr')].map(r => r.dataset.name).join()`);
    await realClick(`document.querySelector('[data-sort]')`);
    const xs = await ev(ghostNow);
    await sleep(want.d + 200);
    const xsGone = await ev(`!document.querySelector('#scr-panel .xf-ghost')`) && await names() === [...P.coll].reverse().join();
    check('table cross-fade on a sort click: the old body fades out with the table pattern\'s timing, the head stays, nothing else animates the body, then the copy is gone', xs && xs.head === 'hidden' && xs.d === want.d && xs.e === want.e && xs.k === '1,0' && xs.ids === 0 && xs.hidden === 'true' && xs.other === 0 && xsGone, { got: xs, want });
    await ev(`document.querySelector('[data-sort]').focus()`); await ENTER();
    const xk = await ev(ghostNow);
    check('table: a sort made with the keyboard (Enter) is instant, no copy and no animation on the body (Hareket, Kurallar)', xk === null && await names() === P.coll.join(), xk);
    await realClick(`document.querySelectorAll('#pnl-tabs [role=tab]')[1]`);
    const xf = await ev(ghostNow);
    await sleep(want.d + 200);
    check('table cross-fade on a filter tab click, the same fade', xf && xf.d === want.d && xf.e === want.e && xf.other === 0 && await ev(`!document.querySelector('#scr-panel .xf-ghost')`), xf);
    await realClick(`document.querySelectorAll('#pnl-tabs [role=tab]')[1]`);
    check('table cross-fade: ground control, a tab click that changes nothing leaves no copy behind', (await ev(ghostNow)) === null);
    await key('ArrowRight', 'ArrowRight', 39);
    const xa = await ev(ghostNow);
    const tabNow = await ev(`[...document.querySelectorAll('#pnl-tabs [role=tab]')].findIndex(t => t.getAttribute('aria-selected') === 'true')`);
    check('table: a filter changed with the arrow keys is instant, no copy and no animation on the body', tabNow === 2 && xa === null, { tab: tabNow, xa });
    await key('Home', 'Home', 36); await sleep(60); await mouse('mouseMoved', 1, 1);
    await ev(`document.querySelectorAll('#pnl-tabs [role=tab]')[0].click()`); await sleep(60);
    const tot = await ev(`(() => { const tabs = [...document.querySelectorAll('#pnl-tabs [role=tab]')].map(t => ({ f: t.dataset.filter, n: +t.querySelector('.cnt').textContent })); const figs = [...document.querySelectorAll('#scr-panel .pfig')].map(f => ({ k: f.querySelector('.k').textContent.trim(), n: +f.querySelector('.n').textContent })); const rows = [...document.querySelectorAll('#pnl-table tbody tr')]; const by = f => rows.filter(r => r.dataset.f === f).length; return { tabs, figs, rows: rows.length, by: { var: by('var'), yok: by('yok'), bekleyen: by('bekleyen'), diger: by('diger') }, foot: document.querySelector('[data-total-line]').textContent }; })()`);
    const all = tot.tabs.find(t => t.f === 'all').n, parts = tot.tabs.filter(t => t.f !== 'all');
    check('totals: one class size everywhere (rows, Tümü, figure)', tot.rows === all && tot.figs[0].n + tot.figs[1].n + tot.figs[2].n + tot.figs[3].n === all && new RegExp('^' + all + ' öğrenci:').test(tot.foot), { rows: tot.rows, all, figs: tot.figs });
    check('totals: groups partition the class and match the rows', parts.reduce((a, t) => a + t.n, 0) === all && parts.every(t => t.n === tot.by[t.f]), { parts, by: tot.by });
    check('totals: figures equal the filter counts', tot.figs[0].n === tot.by.var && tot.figs[1].n === tot.by.yok && tot.figs[2].n === tot.by.bekleyen && tot.figs[3].n === tot.by.diger, tot.figs);
    for (const [i, t] of tot.tabs.entries()) {
      await ev(`document.querySelectorAll('#pnl-tabs [role=tab]')[${i}].click()`); await sleep(60);
      const vis = await ev(`({ n: [...document.querySelectorAll('#pnl-table tbody tr')].filter(r => !r.hidden).length, shown: +document.querySelector('[data-shown]').textContent })`);
      check('filter "' + t.f + '": visible rows equal its count', vis.n === t.n && vis.shown === t.n, vis);
    }
    await ev(`document.querySelectorAll('#pnl-tabs [role=tab]')[0].click()`); await sleep(60);
    const fin = await ev(`[...document.querySelectorAll('#pnl-table tbody tr')].map(r => r.children[6].textContent.trim())`);
    const NAMES = ['Var', 'Yok', 'Görevli', 'Belgeli düzeltme', 'Elle eklendi', 'Devamdan muaf'];
    // A row still waiting for its decision carries only the hidden words the table row token names (Erişilebilirlik:
    // an empty cell is announced, never silent).
    const PENDING = /"([^"]+)"/.exec(T.components.find(c => c.key === 'tablerow').states.other)[1];
    check('Son durum: only the brief\'s names; a pending row carries only the hidden "' + PENDING + '"', fin.every(x => x === PENDING || NAMES.includes(x)) && fin.includes(PENDING) && NAMES.every(n => fin.includes(n)), [...new Set(fin)]);
    check('panel: "Karar bekleniyor" and "Onayını bekliyor" are gone', await ev(`!/Karar bekleniyor|Onayını bekliyor/.test(document.querySelector('#scr-panel').textContent)`));
    const chips = await ev(`(() => { const bg = s => getComputedStyle(s).backgroundColor; return { yok: [...document.querySelectorAll('#pnl-table .ind.st-yok')].map(bg), ret: [...document.querySelectorAll('#pnl-table .ind.st-ret')].map(bg), var: [...document.querySelectorAll('#pnl-table .ind.st-var')].map(bg), yokInk: getComputedStyle(document.querySelector('#pnl-table .ind.st-yok')).color }; })()`);
    const rose = hexOf(T.color.status.danger.subtle);
    check('exception chips: only Yok and Ret get the rose ground, Var stays white', chips.yok.length > 0 && chips.ret.length > 0 && chips.yok.concat(chips.ret).every(c => rgbHex(c) === rose) && chips.var.every(c => rgbHex(c) === 'transparent'), { rose, yok: chips.yok[0], var: chips.var[0] });
    check('exception chips: red ink on rose at least 4.5:1, rose hue 0 to 30', C.wcagRatio(rgbHex(chips.yokInk), rose) >= 4.5 && C.hexToOklch(rose).H <= 30, [C.wcagRatio(rgbHex(chips.yokInk), rose).toFixed(2), C.hexToOklch(rose).H]);
    // Hit area (component.checkbox): the drawn box and the floor of the hit area come from the token file. The panel is
    // drawn at its own width and zoomed to the column, so sizes are divided by that zoom and the probe offsets multiplied
    // by it. Hit testing at the corners of a square one pixel inside the floor, then a real mouse click inside it.
    const BOX = tokenValue('component.checkbox.box.panel'), HIT = tokenValue('component.checkbox.hit.panel');
    const cb = await ev(`(() => { const r = document.querySelectorAll('#pnl-table tbody tr')[1]; r.scrollIntoView({ block: 'center' }); const l = r.querySelector('label.cb'), i = r.querySelector('input'); const lr = l.getBoundingClientRect(), ir = i.getBoundingClientRect(), pz = document.querySelector('#scr-panel .pnl') || document.querySelector('#scr-panel'), z = pz.getBoundingClientRect().width / pz.offsetWidth; const cx = ir.left + ir.width / 2, cy = ir.top + ir.height / 2, h = (${HIT} / 2 - 1) * z; const pts = [[-h, -h], [h, -h], [-h, h], [h, h]].map(([dx, dy]) => { const e = document.elementFromPoint(cx + dx, cy + dy); return !!e && (e === i || e.closest('label') === l); }); return { lw: Math.round(lr.width / z * 10) / 10, lh: Math.round(lr.height / z * 10) / 10, iw: Math.round(ir.width / z * 10) / 10, z, cx, cy, pts, checked: i.checked }; })()`);
    check('checkbox: drawn component.checkbox.box.panel, hit area at least component.checkbox.hit.panel square', cb.iw === BOX && cb.lw >= HIT && cb.lh >= HIT, { label: cb.lw + 'x' + cb.lh, box: cb.iw, want: [BOX, HIT], zoom: +cb.z.toFixed(3) });
    check('checkbox: hit test reaches one pixel inside the hit floor in every direction', cb.pts.every(Boolean), cb.pts);
    const off = (HIT / 2 - 2) * cb.z;
    await mouse('mouseMoved', cb.cx + off, cb.cy + off); await mouse('mousePressed', cb.cx + off, cb.cy + off); await mouse('mouseReleased', cb.cx + off, cb.cy + off); await sleep(80);
    const after = await ev(`document.querySelectorAll('#pnl-table tbody tr')[1].querySelector('input').checked`);
    check('checkbox: a real click two pixels inside the hit floor\'s corner toggles it', after === !cb.checked);
    await mouse('mousePressed', cb.cx - 40, cb.cy); await mouse('mouseReleased', cb.cx - 40, cb.cy); await sleep(60);
    check('checkbox: ground control, a click outside the hit area does nothing', await ev(`document.querySelectorAll('#pnl-table tbody tr')[1].querySelector('input').checked`) === after);
    await mouse('mousePressed', cb.cx + off, cb.cy + off); await mouse('mouseReleased', cb.cx + off, cb.cy + off); await sleep(60);
    await mouse('mouseMoved', 1, 1);
    await shot('22-panel', '#scr-panel');
  }

  /* 11. Röntgen: keyboard toggle, every drawn screen swapped, pins on what remains, measured share unchanged, no other hue left */
  {
    // Every screen measure.js measures (coverage.json), so a screen added there is checked here too.
    const SEL = Object.keys(COV['1440']);
    await ev(`document.querySelector('[data-xray]').scrollIntoView({ block: 'center' })`); await sleep(100);
    await ev(`document.querySelector('[data-xray]').focus()`); await SPACE(); await sleep(250);
    const on = await ev(`(() => { const t = [...document.querySelectorAll('.device-screen, .pnl')]; return { checked: document.querySelector('[data-xray]').getAttribute('aria-checked'), all: t.length, on: t.filter(s => s.classList.contains('xray')).length, pins: Object.fromEntries(${JSON.stringify(SEL)}.map(s => [s, [...document.querySelectorAll(s + ' .xr-pin')].map(p => p.textContent).sort().join('')])), tags: [...document.querySelectorAll('.xr-tag')].length }; })()`);
    check('Röntgen: Space on the switch turns it on for every drawn screen and the panel', on.checked === 'true' && on.all >= 7 && on.on === on.all, on);
    check('Röntgen: numbered pins on what stays midnight blue', on.pins['#scr-home'] === '148' && on.pins['#scr-success'] === '17' && on.pins['#scr-records'] === '47' && on.pins['#scr-scan'] === '' && on.pins['#scr-qr'] === '' && on.pins['#scr-panel'].length >= 4 && (!('#scr-delete' in on.pins) || on.pins['#scr-delete'] === ''), on.pins);
    for (const [i, sel] of SEL.entries()) {
      const f = await shot('23-xray-' + sel.slice(5), sel);
      const p = COVJS.coverage(f).pct, ref = COV['1440'][sel]['gece mavisi'];
      check('Röntgen ' + sel + ': midnight-blue share unchanged and every other hue gone', Math.abs(p['gece mavisi'] - ref) <= 0.6 && p['mor'] === 0 && p['kırmızı'] === 0 && p['yasak'] === 0, { blue: p['gece mavisi'], ref, mor: p['mor'], kirmizi: p['kırmızı'] });
    }
    await ev(`document.querySelector('[data-xray]').focus()`); await ENTER(); await sleep(250);
    const offx = await ev(`({ checked: document.querySelector('[data-xray]').getAttribute('aria-checked'), on: document.querySelectorAll('.xray').length, pins: document.querySelectorAll('.xr-pin, .xr-tag').length })`);
    check('Röntgen: Enter turns it off; classes and pins are removed', offx.checked === 'false' && offx.on === 0 && offx.pins === 0, offx);
    const f = await shot('24-home-normal', '#scr-home');
    check('Röntgen ground control: with it off the home screen shows violet again', COVJS.coverage(f).pct['mor'] > 0);
    const bars = await ev(`[...document.querySelectorAll('.sbar[data-cov-sel]')].map(b => ({ sel: b.dataset.covSel, v: +b.dataset.cov, v390: b.dataset.cov390 === undefined ? null : +b.dataset.cov390, text: b.textContent }))`);
    check('budget bars under every screen come from coverage.json', bars.length === SEL.length && bars.every(b => b.v === COV['1440'][b.sel]['gece mavisi'] && (b.v390 === null || b.v390 === COV['390'][b.sel]['gece mavisi'])), bars.map(b => b.sel + ' ' + b.v));
    check('every measured screen within its budget', Object.entries(COV['1440']).concat(Object.entries(COV['390'])).every(([s, p]) => p['gece mavisi'] <= (s === '#scr-panel' ? T.coverageBudget.panel : T.coverageBudget.phone) && p['yasak'] === 0), T.coverageBudget);
  }

  /* 12. Hover, press and release (real pointer): colors come in and leave with the hover pattern's steps; the press scales
         to scale.basma and darkens with the press pattern's step, and the release goes back with the same timing */
  {
    const H = { in: step('hover', 'main', 'enter'), out: step('hover', 'main', 'exit') }, Pr = step('press', 'main', 'enter'), Re = step('press', 'main', 'exit');
    const S = scaleOf('basma');
    const c = await center('#b-primary');
    const read = `(() => { const cs = getComputedStyle(document.querySelector('#b-primary')); return { p: cs.transitionProperty, d: cs.transitionDuration, e: cs.transitionTimingFunction, t: cs.transform, bg: cs.backgroundColor }; })()`;
    const rest = await ev(read);
    await mouse('mouseMoved', c.x, c.y); await sleep(200);
    const hov = await ev(read);
    await mouse('mousePressed', c.x, c.y); await sleep(200);
    const prs = await ev(read);
    await mouse('mouseReleased', c.x, c.y); await sleep(30);
    const relNow = await ev(read);
    await sleep(250);
    const relLater = await ev(read);
    await mouse('mouseMoved', 1, 1); await sleep(300);
    const fill = r => hexOf(T.color.roles[r]);
    check('hover: colors leave with the hover exit step (' + H.out.name + ', at rest); the outline is never a transition', part(rest, 'd', 0) === H.out.d && part(rest, 'e', 0) === H.out.e && !/outline/.test(rest.p), rest);
    check('hover: colors come in with the hover entry step (' + H.in.name + ') and change the fill to accent.fillHover', part(hov, 'd', 0) === H.in.d && part(hov, 'e', 0) === H.in.e && rgbHex(hov.bg) === fill('accent.fillHover'), hov);
    check('press: scale.basma and fill accent.fillPressed; color and scale with the press step (' + Pr.name + ')', new RegExp('^matrix\\(' + S + ', 0, 0, ' + S + ',').test(prs.t) && part(prs, 'd', 0) === Pr.d && part(prs, 'd', 3) === Pr.d && part(prs, 'e', 0) === Pr.e && part(prs, 'e', 3) === Pr.e && rgbHex(prs.bg) === fill('accent.fillPressed'), prs);
    check('release: back with the press exit step (' + Re.name + '), then the hover timing again', part(relNow, 'd', 0) === Re.d && part(relNow, 'e', 0) === Re.e && part(relLater, 'd', 0) === H.in.d, { now: [part(relNow, 'd', 0), part(relNow, 'e', 0)], later: part(relLater, 'd', 0) });
  }

  /* 12b. Focus ring: a keyboard focus draws it with the focus pattern's entry step (ringIn: color from transparent, offset
          from focus.offsetFrom to focus.offset); a ring drawn inside its element only changes color; a mouse click draws none */
  const SHIFT_TAB = async () => { await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, modifiers: 8 }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, modifiers: 8 }); };
  const ring = `(() => { const e = document.activeElement, cs = getComputedStyle(e); return { id: e.id, name: cs.animationName, d: cs.animationDuration, f: cs.animationTimingFunction, style: cs.outlineStyle, color: cs.outlineColor, off: cs.outlineOffset, from: cs.getPropertyValue('--ring-from').trim() }; })()`;
  {
    await ev(`(() => { const b = document.querySelector('#b-secondary'); b.scrollIntoView({ block: 'center' }); b.focus(); return true; })()`);
    await SHIFT_TAB(); await sleep(30);
    const kb = await ev(ring);
    await sleep(200);
    const end = await ev(ring);
    const F = step('focus', 'main', 'enter');
    check('focus ring: a keyboard focus draws it with the focus entry step (' + F.name + ')', kb.id === 'b-primary' && kb.name === 'ringIn' && kb.d === F.d && normEase(kb.f) === F.e && kb.style === 'solid', kb);
    check('focus ring: it settles focus.offset away in focus.ring', rgbHex(end.color) === hexOf(T.color.roles['focus.ring']) && end.off === T.shape.focus.offset + 'px', end);
    await ev(`document.querySelector('#t-tp2').focus()`); await sleep(30);
    const inner = await ev(ring);
    check('focus ring: a ring drawn inside its element (tab) starts where it ends, so only its color changes', inner.name === 'ringIn' && inner.off === T.shape.focus.offsetInset + 'px' && inner.from === T.shape.focus.offsetInset + 'px', inner);
    const g = await center('#b-ghost');
    await mouse('mouseMoved', g.x, g.y); await mouse('mousePressed', g.x, g.y); await mouse('mouseReleased', g.x, g.y); await sleep(60);
    const click = await ev(ring);
    await mouse('mouseMoved', 1, 1);
    check('focus ring: ground control, a mouse click focuses without a ring', click.id === 'b-ghost' && click.style === 'none' && click.name === 'none', click);
  }

  /* 12c. Loading button: busy at once, nothing shown before time.gosterge, then three squares and the busy word; the width
          never changes; in the state table every cell of a row has the same width */
  {
    await sleep(1900); // the job started by the press test ends first
    // "cell": the resting and busy layers share one place inside the button (same top and left, both inside its box).
    const w = `(() => { const b = document.querySelector('#b-primary'), cs = getComputedStyle(b), br = b.getBoundingClientRect(), r = b.querySelector('.btn-rest').getBoundingClientRect(), q = b.querySelector('.btn-wait').getBoundingClientRect(); const inside = x => x.top >= br.top - 0.5 && x.bottom <= br.bottom + 0.5 && x.left >= br.left - 0.5 && x.right <= br.right + 0.5; return { w: br.width, cell: Math.abs(r.top - q.top) < 0.5 && Math.abs(r.left - q.left) < 0.5 && inside(r) && inside(q), busy: b.getAttribute('aria-busy'), wait: b.hasAttribute('data-wait'), rest: getComputedStyle(b.querySelector('.btn-rest')).opacity, show: getComputedStyle(b.querySelector('.btn-wait')).opacity, name: [...b.querySelectorAll(':scope .btn-c > :not([aria-hidden=true])')].map(x => x.textContent).join(), bg: cs.backgroundColor }; })()`;
    const before = await ev(w);
    await ev(`document.querySelector('#b-primary').click()`); await sleep(400);
    const early = await ev(w);
    await sleep(T.motion.timing.find(t => t.name === 'gosterge').ms - 400 + 300);
    const late = await ev(w);
    await sleep(1000);
    const after = await ev(w);
    check('loading: at the press the button is busy at once and looks the same (no indicator before time.gosterge)', early.busy === 'true' && !early.wait && early.rest === '1' && early.show === '0' && early.bg === before.bg, early);
    check('loading: after time.gosterge the three squares and "Gönderiliyor" show, and the accessible name follows', late.wait && late.show === '1' && late.rest === '0' && late.name === 'Gönderiliyor', late);
    check('loading: the button keeps its width (rest, busy, busy shown, done); both labels share one place inside it', [early, late, after].every(s => Math.abs(s.w - before.w) < 0.5) && [before, late].every(s => s.cell) && after.busy === null && after.name === 'Kodu gönder', { before: before.w, early: early.w, late: late.w, after: after.w, cell: [before.cell, late.cell] });
    const rows = await ev(`[...document.querySelectorAll('.state-table tbody tr')].map(r => [...r.querySelectorAll('.btn')].map(b => b.offsetWidth))`);
    check('loading: in the state table every button of a row has one width (the busy cell included)', rows.length === 4 && rows.every(r => r.length >= 5 && Math.max(...r) - Math.min(...r) < 0.5), rows);
  }

  /* 12d. Loading mark (component.spinner): three filled squares of component.spinner.square, no outlined square that looks
          like a box. They light up in turn over the loading loop step only where the mark shows (a busy button, a busy
          message, the demo); the hidden mark inside a resting button runs nothing */
  {
    const SQ = tokenValue('component.spinner.square');
    await ev(`(() => { document.querySelector('.spin-demo').scrollIntoView({ block: 'center' }); return true; })()`); await sleep(60);
    const sp = await ev(`[...document.querySelectorAll('.spin')].map(s => ({ live: !!s.closest('.btn[data-wait], .msg.busy, .spin-demo'), rects: s.querySelectorAll('rect').length, fills: [...s.querySelectorAll('rect')].map(r => getComputedStyle(r).fill !== 'none'), sizes: [...s.querySelectorAll('rect')].map(r => r.getAttribute('width') + 'x' + r.getAttribute('height')), anim: [...s.querySelectorAll('rect')].map(r => { const cs = getComputedStyle(r); return cs.animationName + ' ' + cs.animationDuration + ' ' + cs.animationDelay; }) }))`);
    const L = step('loading', 'loop', 'enter'), d = L.ms / 1000;
    const RUN = ['dots ' + d + 's 0s', 'dots ' + d + 's ' + +(d / 3).toFixed(4) + 's', 'dots ' + d + 's ' + +(2 * d / 3).toFixed(4) + 's'].join('|');
    const live = sp.filter(s => s.live), idle = sp.filter(s => !s.live);
    check('loading mark: every one is three filled squares of component.spinner.square', sp.length >= 3 && sp.every(s => s.rects === 3 && s.fills.every(Boolean) && s.sizes.every(z => z === SQ + 'x' + SQ)), sp[0]);
    check('loading mark: where it shows, the squares light in turn over the loading loop step (' + L.name + ')', live.length >= 1 && live.every(s => s.anim.join('|') === RUN), live.map(s => s.anim.join('|')));
    check('loading mark: the hidden mark inside a resting button runs no animation', idle.length >= 1 && idle.every(s => s.anim.every(a => a.startsWith('none '))), idle.length + ' idle, first: ' + (idle[0] && idle[0].anim.join('|')));
  }

  /* 12e. Accordion (every details element, decisions-r2 E10): the body grows from 0fr to 1fr (grid-template-rows) with the
          accordion pattern's entry step while its content fades in with the content step; closing keeps it open while
          the body shrinks with the exit step, then closes. Under reduced motion the height is instant (block 14). */
  const ACC = `(() => { const d = document.querySelector('#anat-button'), b = d.querySelector(':scope > .det'), i = b && b.firstElementChild, cb = b && getComputedStyle(b), ci = i && getComputedStyle(i); return { open: d.open, shut: d.hasAttribute('data-shut'), wrapped: !!(b && i && i.classList.contains('det-i') && i.firstElementChild && i.firstElementChild.classList.contains('det-c')), h: b ? Math.round(b.getBoundingClientRect().height) : -1, full: i && i.firstElementChild ? Math.round(i.firstElementChild.getBoundingClientRect().height) : -1, bt: cb && [cb.transitionProperty, cb.transitionDuration, cb.transitionTimingFunction].join(' / '), ct: ci && [ci.transitionProperty, ci.transitionDuration, ci.transitionTimingFunction].join(' / '), op: ci ? +ci.opacity : -1, grow: b ? b.getAnimations().filter(a => a.transitionProperty === 'grid-template-rows' && a.playState === 'running').length : 0 }; })()`;
  // A transition read as "property / duration / curve", with the curve keyword ease written out as its cubic-bezier.
  const ctN = t => String(t).split(' / ').map((x, i) => (i === 2 ? normEase(x) : x)).join(' / ');
  const accClick = () => ev(`(() => { const d = document.querySelector('#anat-button'); d.scrollIntoView({ block: 'center' }); d.querySelector(':scope > summary').click(); return true; })()`);
  {
    const A_IN = step('accordion', 'main', 'enter'), A_OUT = step('accordion', 'main', 'exit'), C_IN = step('accordion', 'content', 'enter'), C_OUT = step('accordion', 'content', 'exit');
    const tr = (prop, s) => ctN(prop + ' / ' + s.d + ' / ' + s.e);
    const shut = await ev(ACC);
    await accClick(); await sleep(80);
    const opening = await ev(ACC);
    await sleep(A_IN.ms + 150);
    const opened = await ev(ACC);
    await accClick(); await sleep(40);
    const closing = await ev(ACC);
    await sleep(A_OUT.ms + 200);
    const closed = await ev(ACC);
    check('accordion: the script wraps the content (.det > .det-i > .det-c) and it starts closed', shut.wrapped && !shut.open && !shut.shut, shut);
    check('accordion: opening grows the body with grid-template-rows (' + A_IN.name + ') and fades the content in (' + C_IN.name + ')', opening.open && !opening.shut && opening.grow === 1 && opening.h < opening.full && ctN(opening.bt) === tr('grid-template-rows', A_IN) && ctN(opening.ct) === tr('opacity', C_IN), opening);
    check('accordion: once open the body is as tall as its content', opened.open && opened.grow === 0 && opened.h === opened.full && opened.full > 0 && opened.op === 1, opened);
    check('accordion: closing keeps it open while the body shrinks (' + A_OUT.name + ') and the content fades (' + C_OUT.name + '), then closes', closing.open && closing.shut && closing.grow === 1 && ctN(closing.bt) === tr('grid-template-rows', A_OUT) && ctN(closing.ct) === tr('opacity', C_OUT) && !closed.open && !closed.shut && closed.h === 0, { closing, closed });
  }

  /* 12f. Anatomy (decisions-r2 E1): every live demo measures what its component token says. components[].measure maps a
          selector to CSS properties and the token path each must equal (component.<key>.<size>), '@type' to a type
          style (its size, line height and weight) and '@top' to the offset from the parent box; a plain string is a
          literal. The values are resolved here from tokens.json, so the anatomy table and this check read one source.
          '@top' is measured on screen, so it is divided by the zoom of the drawing it sits in. */
  const resolveMeasure = M => Object.fromEntries(Object.entries(M).map(([sel, props]) => [sel, Object.entries(props).flatMap(([p, want]) => {
    if (p === '@type') { const s = tokenValue(want); return [['fontSize', s.size, want], ['lineHeight', s.line, want], ['fontWeight', String(s.weight), want]]; }
    if (/^(component|type)\./.test(want)) return [[p, tokenValue(want), want]];
    return [[p, want, 'sabit']];
  })]));
  const measureIn = M => ev(`(() => { const M = ${JSON.stringify(M)}, out = []; for (const [sel, props] of Object.entries(M)) { const el = document.querySelector(sel); if (!el) { out.push(sel + ': yok'); continue; } const cs = getComputedStyle(el); for (const [p, want, from] of props) { let v; if (p === '@top') { const z = el.offsetWidth ? el.getBoundingClientRect().width / el.offsetWidth : 1; v = (el.getBoundingClientRect().top - el.parentElement.getBoundingClientRect().top) / z; } else v = cs[p]; const ok = typeof want === 'number' ? Math.abs(parseFloat(v) - want) < 0.5 : String(v) === want; if (!ok) out.push(sel + ' ' + p + ': ' + v + ' (' + from + ' = ' + want + ')'); } } return out; })()`);
  let measured = 0;
  for (const comp of T.components.filter(c => c.measure)) {
    if (comp.open) { await ev(`document.querySelector(${JSON.stringify(comp.open)}).click()`); await sleep(450); }
    const M = resolveMeasure(comp.measure);
    measured += Object.values(M).reduce((a, l) => a + l.length, 0);
    const got = await measureIn(M);
    if (comp.key === 'dialog') { await ESC(); await sleep(300); }
    if (comp.key === 'toast') { await ev(`[...document.querySelectorAll('.toasts .toast button')].forEach(b => b.click())`); await sleep(300); }
    check('anatomy ' + comp.name + ': the live demo measures what its component token says', got.length === 0, got);
  }
  // Ground control: the same measurement with the button's height one grid step off must report it.
  const planted = await measureIn({ '#b-primary': [['height', tokenValue('component.button.height.panel') + 4, 'planted']] });
  check('anatomy: ground control, a planted wrong height is reported (' + measured + ' values measured above)', planted.length === 1 && measured >= 60, planted);

  /* 13. Copy and color rules on the whole page */
  {
    const txt = await ev(`document.body.innerText`);
    const ranges = txt.match(/\b\d{1,2}[:.]\d{2}\s*[-\u2010-\u2015]\s*\d{1,2}[:.]\d{2}\b/g) || [];
    check('time ranges use "ile", never a hyphen', ranges.length === 0 && /10:00 ile 11:50/.test(txt), ranges.slice(0, 5));
    const ink = await ev(`(() => { const s = document.createElement('span'); document.body.appendChild(s); const out = {}; for (const k of ['gorevli', 'belgeli', 'elle', 'muaf', 'var', 'yok']) { s.className = 'st-' + k; out[k] = getComputedStyle(s).color; } s.remove(); return out; })()`);
    const H = k => C.hexToOklch(rgbHex(ink[k]));
    // Violet means attention only (a warning); Görevli is a neutral ink (Renk, Durum renkleri). Every ink is the token's.
    const attFg = k => hexOf(T.color.attendance.find(a => a.key === k).fg);
    check('status inks are the token file\'s (Görevli neutral, not violet), each at least 4.5:1 on the surface', Object.keys(ink).every(k => rgbHex(ink[k]) === attFg(k) && C.wcagRatio(rgbHex(ink[k]), hexOf(T.color.roles['bg.surface'])) >= 4.5) && H('gorevli').C < 0.04, Object.fromEntries(Object.keys(ink).map(k => [k, rgbHex(ink[k]) + ' / ' + attFg(k)])));
    check('no status ink in hue 220 to 290 except Var', ['gorevli', 'belgeli', 'elle', 'muaf', 'yok'].every(k => H(k).C < 0.04 || H(k).H < 220 || H(k).H > 290) && H('var').H >= 220 && H('var').H <= 290, Object.fromEntries(Object.keys(ink).map(k => [k, H(k)])));
    const muaf = await ev(`getComputedStyle(document.querySelector('.st-grid .stamp.st-muaf')).borderTopStyle`);
    check('Devamdan muaf stamp has a dashed frame', muaf === 'dashed', muaf);
    const lv = await ev(`(() => { const rows = [...document.querySelectorAll('.warn-row')]; const bars = [...document.querySelectorAll('.lvl-bar i')]; return { bg: rows.map(r => getComputedStyle(r).backgroundColor), minH: Math.min(...bars.map(b => { const sc = b.closest('.device-screen'); const z = sc ? sc.getBoundingClientRect().width / sc.offsetWidth : 1; return Math.round(b.getBoundingClientRect().height / z * 10) / 10; })), home: [...document.querySelectorAll('#ph-home .lvl-t')].map(x => x.textContent) }; })()`);
    check('warning level 4 is the only filled red banner', rgbHex(lv.bg[3]) === hexOf(T.color.status.danger.solid) && lv.bg.slice(0, 3).every(b => rgbHex(b) === 'transparent'), lv.bg);
    const MH = tokenValue('component.meter.height');
    check('level meter: labelled "Seviye n/4" (the plan word, D6), segments component.meter.height tall', lv.minH >= MH && lv.home.join() === 'Seviye 2/4,Seviye 1/4', { ...lv, want: MH });
    const home = await ev(`getComputedStyle(document.querySelector('#ph-home .now-fig .n')).color`);
    check('home: the countdown numeral is text.primary (only one filled blue area)', rgbHex(home) === hexOf(T.color.roles['text.primary']), home);
    // Devamdan muaf: the switch's help is the plan's own sentence (one source: bilesenler.js MUAF_HELP), word for word.
    const muafHelp = await ev(`document.querySelector('#sw1-h').textContent`);
    check('Devamdan muaf help: the plan\'s sentence word for word, as the page prints it', muafHelp === MUAF_HELP && (PLAN_TEXT === null || PLAN_TEXT.includes(MUAF_HELP.replace(/\.$/, ''))), { page: muafHelp === MUAF_HELP, plan: PLAN_TEXT === null ? 'plan.html not found' : PLAN_TEXT.includes(MUAF_HELP.replace(/\.$/, '')) });
    if (PLAN_TEXT === null) info('Devamdan muaf help: plan.html not found under IU_REPO, compared with the page only');
    // The word "sahip" never appears on the page (decisions-r2 E9); the pattern itself is shown to match.
    const SAHIP = /sahip|sahib/i;
    check('page: the word "sahip" never appears (ground control: the pattern finds "Sahibin")', !SAHIP.test(txt) && SAHIP.test('Sahibin kararı'), (txt.match(/.{0,30}(sahip|sahib).{0,30}/i) || [''])[0]);
    // No text set below 12 px. Hard in the system sections and the page frame (F1a's), reported for the others.
    const SYSTEM = ['renk', 'kontrast', 'bilesenler', 'katmanlar', 'hareket', 'etkilesim', 'tokenlar', 'chrome'];
    const SMALL = `(() => { const shut = [...document.querySelectorAll('details')].filter(d => !d.open); shut.forEach(d => { d.open = true; }); const out = []; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { const t = n.textContent.trim(); const el = n.parentElement; if (!t || !el || el.closest('script, style, template, .vh, .sr-only')) continue; const b = el.getBoundingClientRect(); if (b.width <= 1 || b.height <= 1) continue; const cs = getComputedStyle(el); if (cs.visibility !== 'visible' || cs.display === 'none') continue; const size = parseFloat(cs.fontSize); if (size >= 12) continue; let s = el.closest('section[id], header[id]'), top = s; while (s) { top = s; s = s.parentElement && s.parentElement.closest('section[id], header[id]'); } out.push({ sec: top ? top.id : 'chrome', size, text: t.slice(0, 40), el: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : '') }); } shut.forEach(d => { d.open = false; }); return out; })`;
    const small = await ev('(' + SMALL + ')()');
    const hard = small.filter(x => SYSTEM.includes(x.sec)), soft = small.filter(x => !SYSTEM.includes(x.sec));
    check('text: nothing below 12 px in the system sections and the page frame', hard.length === 0, hard.slice(0, 8));
    if (soft.length) info('text below 12 px in other owners\' sections (' + soft.length + ')', Object.entries(soft.reduce((a, x) => { (a[x.sec] = a[x.sec] || []).push(x.el + ' ' + x.size + 'px "' + x.text + '"'); return a; }, {})).map(([k, v]) => k + ': ' + [...new Set(v)].slice(0, 4).join(' | ')));
    const probe = await ev(`(() => { const p = document.createElement('p'); p.style.fontSize = '11px'; p.textContent = 'yoklama-deneme'; document.querySelector('#renk').appendChild(p); const r = (${SMALL})().filter(x => x.text === 'yoklama-deneme'); p.remove(); return r; })()`);
    check('text: ground control, an 11 px line planted in Renk is found and placed in renk', probe.length === 1 && probe[0].sec === 'renk', probe);
    const src = fs.readFileSync(FILE, 'utf8');
    const cs = await ev(`Object.fromEntries([...document.querySelectorAll('[data-case]')].map(e => [e.dataset.case, e.textContent]))`);
    check('Turkish casing demo is computed by the page (results not in the source)', cs['upper-tr'] === 'İSTANBUL ILIK IĞDIR' && cs.upper === 'ISTANBUL ILIK IĞDIR' && cs['lower-tr'] === 'ışık' && cs.lower === 'işik' && !src.includes('İSTANBUL ILIK IĞDIR'), cs);
    check('page: CRLF line endings, lang tr, title', /\r\n/.test(src) && !/[^\r]\n/.test(src) && /<html lang="tr">/.test(src) && /<title>İÜ Yoklama · Tasarım<\/title>/.test(src));
  }

  /* 14. Reduced-motion preview: with the switch on (no OS setting), every element's computed motion equals the OS setting */
  {
    const sig = `(() => {
      const out = {}; let i = 0;
      // transform and opacity are compared at rest; while an animation runs they depend on the sampling moment, so only its name and timing count.
      // Inline transforms are live data set by scripts (countdown bar, tab indicator, zoom), compared through their transition rules only.
      const pick = (cs, inl) => [cs.transitionProperty, cs.transitionDuration, cs.transitionTimingFunction, cs.animationName, cs.animationDuration, cs.animationDelay, cs.animationIterationCount, cs.animationName !== 'none' ? 'running' : (inl ? 'script' : cs.transform) + '|' + cs.opacity].join('|');
      for (const el of document.querySelectorAll('body *')) {
        i++;
        if (el.closest('#rm-sw')) continue;
        out[i] = pick(getComputedStyle(el), !!el.style.transform) + '#' + pick(getComputedStyle(el, '::before')) + '#' + pick(getComputedStyle(el, '::after'));
      }
      return out;
    })()`;
    const durs = `Object.fromEntries(${JSON.stringify(T.motion.duration.map(d => d.name))}.map(n => [n, getComputedStyle(document.documentElement).getPropertyValue('--dur-' + n).trim()]))`;
    // Reduced motion changes motion pattern by pattern (decisions-r2 E3): the duration tokens keep their values and each
    // pattern variable (--motion-<pattern>[-<track>]-<phase>-dur/-ease) points at the reduced step the token file names.
    const wantDur = Object.fromEntries(T.motion.duration.map(d => [d.name, d.ms + 'ms']));
    const parseVars = l => Object.fromEntries(l.map(x => { const m = x.match(/^(--[\w-]+): var\((--[\w-]+)\);$/); if (!m) throw new Error('interact: motion variable ' + x); return [m[1], m[2]]; }));
    const MV = motion.cssVars(), NORMAL = parseVars(MV.root), REDUCED = { ...NORMAL, ...parseVars(MV.reduced) };
    const pv = map => `(() => { const cs = getComputedStyle(document.documentElement), M = ${JSON.stringify(map)}; return Object.entries(M).filter(([k, r]) => cs.getPropertyValue(k).trim() !== cs.getPropertyValue(r).trim()).map(([k, r]) => k + ' ' + cs.getPropertyValue(k).trim() + ' (' + r + ' ' + cs.getPropertyValue(r).trim() + ')'); })()`;
    await load(1440, true);
    const A1 = await ev(sig);
    const redOs = await ev(durs), redVars = await ev(pv(REDUCED)), redVsNormal = await ev(pv(NORMAL));
    await load(1440, false);
    const C1 = await ev(sig);
    const normal = await ev(durs), normVars = await ev(pv(NORMAL));
    check('reduced motion: the duration tokens keep their values (no duration-level remap, decisions-r2 E3)', JSON.stringify(redOs) === JSON.stringify(wantDur) && JSON.stringify(normal) === JSON.stringify(wantDur), { redOs, normal });
    check('reduced motion: every pattern variable takes the reduced step the token file names (' + Object.keys(REDUCED).length + ' variables), the normal step otherwise', redVars.length === 0 && normVars.length === 0 && Object.keys(REDUCED).length >= 60, { reduced: redVars.slice(0, 4), normal: normVars.slice(0, 4) });
    check('reduced motion: ground control, under reduce many pattern variables leave their normal step', redVsNormal.length >= 10, redVsNormal.length + ' differ');
    await ev(`document.querySelector('#rm-sw').click()`); await sleep(700); // let the switch's own transitions settle (the hidden sheet glides to its reduced rest position)
    const rmOn = await ev(`document.documentElement.classList.contains('rm') && document.querySelector('#rm-sw').getAttribute('aria-checked') === 'true'`);
    const B1 = await ev(sig);
    const keys = Object.keys(A1);
    const diffAB = keys.filter(k => A1[k] !== B1[k]), diffAC = keys.filter(k => A1[k] !== C1[k]);
    check('reduced preview: switch sets html.rm', rmOn);
    check('reduced preview: ground control, the OS setting changes the motion of many elements', diffAC.length >= 20, diffAC.length + ' elements differ');
    check('reduced preview: every element moves exactly as under prefers-reduced-motion', diffAB.length === 0 && keys.length > 1000, diffAB.length ? diffAB.slice(0, 3).map(k => A1[k] + ' VS ' + B1[k]) : keys.length + ' elements compared');
    check('reduced preview: the pattern variables take their reduced steps too, the duration tokens stay', (await ev(pv(REDUCED))).length === 0 && JSON.stringify(await ev(durs)) === JSON.stringify(wantDur));
    // The scan demo under the preview: the corners stay where they are and only the hint changes (motion pattern scan).
    const rest2 = await ev(SCAN_CORNERS);
    await ev(`document.querySelector('#ph-scan').scrollIntoView({ block: 'center' }); document.querySelector('[data-scan]').click()`); await sleep(60);
    const lock2 = await ev(SCAN_CORNERS);
    check('reduced: on capture the scan corners stay and only the hint changes', lock2.lock && lock2.hint !== rest2.hint && JSON.stringify(lock2.off) === JSON.stringify(rest2.off) && !lock2.moving, { rest: rest2.off, lock: lock2.off });
    // Reduced motion, pattern by pattern (the preview reproduces the OS setting, checked above).
    await realClick(`document.querySelector('[data-sort]')`);
    const g = await ev(`new Promise(res => requestAnimationFrame(() => requestAnimationFrame(() => res({ ghost: !!document.querySelector('#scr-panel .xf-ghost'), body: document.querySelector('#pnl-table tbody').getAnimations().filter(a => a.playState === 'running').length, order: document.querySelector('[data-sort]').closest('th').getAttribute('aria-sort') }))))`);
    await realClick(`document.querySelector('[data-sort]')`); await mouse('mouseMoved', 1, 1);
    check('reduced: a sort click changes the table at once (no cross-fade copy, no animation on the body)', !g.ghost && g.body === 0 && g.order === 'descending', g);
    const sp = await ev(`[...document.querySelectorAll('.spin rect')].map(r => getComputedStyle(r).animationName + ' ' + getComputedStyle(r).opacity)`);
    check('reduced: the loading mark stands still, its squares fully drawn', sp.length >= 9 && sp.every(x => x === 'none 1'), sp.slice(0, 3));
    await ev(`(() => { const b = document.querySelector('#b-secondary'); b.scrollIntoView({ block: 'center' }); b.focus(); return true; })()`);
    await SHIFT_TAB(); await sleep(30);
    const rr = await ev(ring);
    const RF = step('focus', 'main', 'enter', true);
    check('reduced: the focus ring appears at once (' + RF.name + ')', rr.id === 'b-primary' && rr.d === RF.d && RF.ms === 0 && rr.style === 'solid' && rgbHex(rr.color) === hexOf(T.color.roles['focus.ring']), rr);
    // Accordion: the height and the arrow change at once; the content fades in with the reduced content step; closing is instant.
    const RC = step('accordion', 'content', 'enter', true);
    await accClick(); await sleep(100);
    const rOpen = await ev(ACC);
    await sleep(RC.ms + 100);
    await accClick(); await sleep(20);
    const rClosed = await ev(ACC);
    check('reduced: an accordion opens to its full height at once and its content fades in (' + RC.name + ')', rOpen.open && rOpen.grow === 0 && rOpen.h === rOpen.full && rOpen.full > 0 && ctN(rOpen.ct) === ctN('opacity / ' + RC.d + ' / ' + RC.e), rOpen);
    check('reduced: an accordion closes at once', !rClosed.open && !rClosed.shut, rClosed);
    // Switch: the knob is in its new place at once (no transform transition); the track color changes with the reduced step.
    const RT = step('toggle', 'main', 'enter', true);
    const swr = await ev(`(() => { const s = document.querySelector('#bilesenler .sw'), k = s.querySelector('.sw-thumb'), a = getComputedStyle(s), b = getComputedStyle(k); return { track: [a.transitionProperty, a.transitionDuration].join(' / '), knob: b.transitionProperty }; })()`);
    check('reduced: a switch\'s knob does not slide; its track color changes with the reduced step (' + RT.name + ')', !/transform/.test(swr.knob) && swr.track === 'background-color, border-color / ' + RT.d + ', ' + RT.d, swr);
    // Dialog: opacity only, with the reduced step; sampled half way through its entry, it has no transform.
    const RD = step('dialog', 'main', 'enter', true);
    await ev(`(() => { const b = document.querySelector('#b-danger'); b.scrollIntoView({ block: 'center' }); b.click(); return true; })()`);
    const dl = await ev(`(() => { const d = document.querySelector('#dlg-del'), a = d.getAnimations().find(x => x.animationName === 'dlgIn'); if (!a) return null; const t = a.effect.getTiming().duration; a.pause(); a.currentTime = t / 2; const cs = getComputedStyle(d); const r = { d: t, tf: cs.transform, op: +cs.opacity }; a.finish(); return r; })()`);
    await ESC(); await sleep(300);
    check('reduced: a dialog only fades (no slide, no scale), with the reduced step (' + RD.name + ')', dl && dl.d === RD.ms && (dl.tf === 'none' || /^matrix\(1, 0, 0, 1, 0, 0\)$/.test(dl.tf)) && dl.op > 0 && dl.op < 1, dl);
  }

  /* 15. Side navigation: at 390 px the current link stays inside the bar (not under the brand); at 1440 x 700 the side bar
         scrolls, keeps the current link in view and reaches the last links */
  {
    await load(390, false);
    const seen = [];
    for (const id of ['ozet', 'renk', 'panel', 'hareket', 'tokenlar', 'acik']) {
      await ev(`document.getElementById('${id}').scrollIntoView({ block: 'start' })`); await sleep(900);
      seen.push(await ev(`(() => { const a = document.querySelector('.side-nav a[aria-current="true"]'), n = document.querySelector('.side-nav'); const ar = a.getBoundingClientRect(), nr = n.getBoundingClientRect(); return { id: a.getAttribute('href'), left: Math.round(ar.left - nr.left), right: Math.round(nr.right - ar.right) }; })()`));
    }
    check('nav at 390 px: the current link is the section in view and is fully inside the bar, never under the brand', seen.every((s, i) => s.id === '#' + ['ozet', 'renk', 'panel', 'hareket', 'tokenlar', 'acik'][i] && s.left >= 0 && s.right >= 0), seen);
    await load(1440, false, 700);
    const side = await ev(`(() => { const s = document.querySelector('.side'); return { oy: getComputedStyle(s).overflowY, sh: s.scrollHeight, ch: s.clientHeight }; })()`);
    check('nav at 1440 x 700: ground control, the list is taller than the window and the side bar scrolls', side.oy === 'auto' && side.sh > side.ch, side);
    await ev(`document.getElementById('acik').scrollIntoView({ block: 'start' })`); await sleep(900);
    const last = await ev(`(() => { const a = document.querySelector('.side-nav a[aria-current="true"]'), s = document.querySelector('.side'); const ar = a.getBoundingClientRect(), sr = s.getBoundingClientRect(); return { id: a.getAttribute('href'), top: Math.round(ar.top - sr.top), bottom: Math.round(sr.bottom - ar.bottom) }; })()`);
    check('nav at 1440 x 700: the current link (Açık noktalar, the last section) is scrolled into view', last.id === '#acik' && last.top >= 0 && last.bottom >= 0, last);
    const ext = await ev(`(() => { const s = document.querySelector('.side'); s.scrollTop = s.scrollHeight; const t = [...document.querySelectorAll('.side-nav a.ext')].pop().getBoundingClientRect(), sr = s.getBoundingClientRect(); return { bottom: Math.round(sr.bottom - t.bottom), h: Math.round(t.height) }; })()`);
    check('nav at 1440 x 700: the Plan and Teknik links can be reached', ext.bottom >= 0 && ext.h >= 24, ext);
  }

  const failed = results.filter(r => !r.ok);
  console.log('\n' + (results.length - failed.length) + '/' + results.length + ' checks passed. Evidence frames: ' + OUT);
  console.log(failed.length ? 'FAIL: ' + failed.map(f => f.name).join('; ') : 'PASS: all interaction checks');
  ws.close(); proc.kill(); try { fs.rmSync(udd, { recursive: true, force: true }); } catch {}
  process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error('interact failed', e); process.exit(1); });
