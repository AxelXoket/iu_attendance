// Headless Chrome harness over the DevTools protocol (no window, no sound, no installs).
// Usage: node shot.js <html file> <out dir> [--widths 390,1440] [--sections] [--hover "sel1|sel2"] [--reduced] [--full]
// Writes PNG screenshots and report.json: console errors, exceptions, external requests,
// horizontal overflow, and a motion audit of interactive elements (transition and animation timing).
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path'), os = require('os');

const CHROME = ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'].find(p => fs.existsSync(p));
const argv = process.argv.slice(2);
const file = path.resolve(argv[0]);
const outDir = path.resolve(argv[1] || 'shots');
const opt = n => { const i = argv.indexOf(n); return i < 0 ? null : (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true); };
const widths = String(opt('--widths') || '390,1440').split(',').map(Number);
const hoverSel = opt('--hover') ? String(opt('--hover')).split('|') : [];
const sleep = ms => new Promise(r => setTimeout(r, ms));
fs.mkdirSync(outDir, { recursive: true });

async function main() {
  const port = 9300 + (process.pid % 600);
  const udd = fs.mkdtempSync(path.join(os.tmpdir(), 'shot-'));
  const proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${udd}`, '--disable-gpu', '--hide-scrollbars', '--mute-audio', '--no-first-run', '--no-default-browser-check', '--force-color-profile=srgb', '--disable-lcd-text', 'about:blank'], { stdio: 'ignore', windowsHide: true });
  let wsUrl;
  for (let i = 0; i < 100 && !wsUrl; i++) {
    try { const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); const p = list.find(t => t.type === 'page'); if (p) wsUrl = p.webSocketDebuggerUrl; } catch {}
    if (!wsUrl) await sleep(150);
  }
  if (!wsUrl) throw new Error('Chrome did not start');
  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let seq = 0; const pending = new Map(); const events = [];
  ws.onmessage = m => {
    const d = JSON.parse(typeof m.data === 'string' ? m.data : m.data.toString());
    if (d.id && pending.has(d.id)) { const { res, rej } = pending.get(d.id); pending.delete(d.id); d.error ? rej(new Error(d.error.message)) : res(d.result); }
    else if (d.method) events.push(d);
  };
  const send = (method, params = {}) => new Promise((res, rej) => { const id = ++seq; pending.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params })); });
  const evalJs = async expr => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result.value;

  await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable'); await send('Network.enable');
  const report = { file, chrome: CHROME, runs: [] };

  for (const reduced of opt('--reduced') ? [false, true] : [false]) {
    for (const w of widths) {
      events.length = 0;
      await send('Emulation.setDeviceMetricsOverride', { width: w, height: 900, deviceScaleFactor: 1, mobile: w < 600 });
      await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: reduced ? 'reduce' : 'no-preference' }, { name: 'prefers-color-scheme', value: 'light' }] });
      await send('Page.navigate', { url: 'file:///' + file.replace(/\\/g, '/') });
      for (let i = 0; i < 60 && !events.some(e => e.method === 'Page.loadEventFired'); i++) await sleep(100);
      await sleep(1200);
      const tag = `${w}${reduced ? '-reduced' : ''}`;
      const run = { width: w, reduced };
      Object.assign(run, await evalJs(`({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth, height: document.documentElement.scrollHeight, title: document.title, fontsReady: document.fonts ? document.fonts.status : 'n/a', families: document.fonts ? [...document.fonts].filter(f=>f.status==='loaded').map(f=>f.family+' '+f.weight) : [] })`));
      run.horizontalOverflow = run.scrollWidth > run.clientWidth + 1;
      if (run.horizontalOverflow) run.overflowOffenders = await evalJs(`(() => {
        const cw = document.documentElement.clientWidth, out = [];
        for (const e of document.querySelectorAll('body *')) {
          const r = e.getBoundingClientRect();
          if (r.right <= cw + 1 || r.width === 0) continue;
          let p = e.parentElement, clipped = false;
          while (p && p !== document.body) { const o = getComputedStyle(p).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden' || o === 'clip') { clipped = true; break; } p = p.parentElement; }
          if (!clipped) out.push({ tag: e.tagName.toLowerCase(), id: e.id, cls: String(e.className).slice(0, 40), right: Math.round(r.right), text: (e.textContent || '').trim().slice(0, 50) });
          if (out.length > 12) break;
        }
        return out;
      })()`);
      // Motion audit: every interactive element should declare a transition or animation (unless reduced motion).
      run.motion = await evalJs(`(() => {
        const sel = 'button, a[href], [role=button], [role=tab], [role=switch], [role=menuitem], input, select, textarea, summary, [tabindex]:not([tabindex="-1"])';
        const els = [...document.querySelectorAll(sel)].filter(e => e.offsetParent !== null || e.getClientRects().length);
        const ms = v => v.split(',').map(s => s.trim().endsWith('ms') ? parseFloat(s) : parseFloat(s) * 1000);
        const rows = els.map(e => { const cs = getComputedStyle(e); const td = Math.max(...ms(cs.transitionDuration)); const ad = Math.max(...ms(cs.animationDuration)); return { tag: e.tagName.toLowerCase(), cls: (e.className && e.className.baseVal === undefined ? e.className : '').toString().slice(0, 40), text: (e.textContent || e.value || '').trim().slice(0, 30), td, ad, prop: cs.transitionProperty.slice(0, 60), radius: cs.borderRadius } });
        const still = rows.filter(r => !(r.td > 0) && !(r.ad > 0));
        const maxRadius = rows.reduce((m, r) => Math.max(m, ...r.radius.split(' ').map(parseFloat).filter(x => !isNaN(x))), 0);
        return { interactive: rows.length, withMotion: rows.length - still.length, still: still.slice(0, 25), maxRadiusPx: maxRadius };
      })()`);
      // Section screenshots or one full page.
      const shots = [];
      if (opt('--sections')) {
        const boxes = await evalJs(`[...document.querySelectorAll('header, section[id], footer')].map(s => { const r = s.getBoundingClientRect(); return { id: s.id || s.tagName.toLowerCase(), x: 0, y: r.top + scrollY, h: r.height } })`);
        for (const b of boxes) {
          if (b.h < 4) continue;
          const h = Math.min(b.h, 6000);
          const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: b.y, width: w, height: h, scale: 1 } });
          const f = path.join(outDir, `${tag}-${b.id}.png`); fs.writeFileSync(f, Buffer.from(shot.data, 'base64')); shots.push(f);
        }
      }
      if (opt('--full') || !opt('--sections')) {
        const h = Math.min(run.height, 16000);
        const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: w, height: h, scale: 1 } });
        const f = path.join(outDir, `${tag}-full.png`); fs.writeFileSync(f, Buffer.from(shot.data, 'base64')); shots.push(f);
      }
      // Hover probes (pointer widths only): style before and after a real mouse move.
      run.hover = [];
      if (w >= 600) for (const sel of hoverSel) {
        const box = await evalJs(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; e.scrollIntoView({block:'center'}); const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return { x: r.left + r.width/2, y: r.top + r.height/2, dx: scrollX, dy: scrollY, before: cs.backgroundColor + ' | ' + cs.transform + ' | ' + cs.borderColor + ' | ' + cs.color } })()`);
        if (!box) { run.hover.push({ sel, found: false }); continue; }
        await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: box.x, y: box.y });
        await sleep(450);
        const after = await evalJs(`(() => { const cs = getComputedStyle(document.querySelector(${JSON.stringify(sel)})); return cs.backgroundColor + ' | ' + cs.transform + ' | ' + cs.borderColor + ' | ' + cs.color })()`);
        // The hover frame is taken from the visible viewport: capturing beyond it lays the page out again and drops :hover.
        const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false, clip: { x: Math.max(0, box.dx + box.x - 160), y: Math.max(0, box.dy + box.y - 60), width: 320, height: 120, scale: 2 } });
        const f = path.join(outDir, `${tag}-hover-${run.hover.length}.png`); fs.writeFileSync(f, Buffer.from(shot.data, 'base64'));
        run.hover.push({ sel, found: true, before: box.before, after, changed: after !== box.before, shot: f });
        await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 1, y: 1 });
      }
      // Element shots with color-family coverage (for the midnight-blue budget).
      run.elements = [];
      const elSel = opt('--elements') ? String(opt('--elements')).split('|') : [];
      for (const [i, sel] of elSel.entries()) {
        const box = await evalJs(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height } })()`);
        if (!box || box.w < 2 || box.h < 2) { run.elements.push({ sel, found: false }); continue; }
        const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: box.x, y: box.y, width: box.w, height: box.h, scale: 1 } });
        const f = path.join(outDir, `${tag}-el-${i}.png`); fs.writeFileSync(f, Buffer.from(shot.data, 'base64'));
        run.elements.push({ sel, found: true, shot: f, coverage: require('./coverage.js').coverage(f).pct });
      }
      run.consoleErrors = events.filter(e => e.method === 'Runtime.consoleAPICalled' && ['error', 'assert'].includes(e.params.type)).map(e => e.params.args.map(a => a.value ?? a.description).join(' '));
      run.exceptions = events.filter(e => e.method === 'Runtime.exceptionThrown').map(e => e.params.exceptionDetails.exception?.description || e.params.exceptionDetails.text);
      run.logErrors = events.filter(e => e.method === 'Log.entryAdded' && e.params.entry.level === 'error').map(e => e.params.entry.text + ' ' + (e.params.entry.url || ''));
      run.externalRequests = [...new Set(events.filter(e => e.method === 'Network.requestWillBeSent').map(e => e.params.request.url).filter(u => !/^(file|data|blob|about):/.test(u)))];
      run.shots = shots;
      report.runs.push(run);
    }
  }
  fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
  for (const r of report.runs) {
    console.log(`${r.width}${r.reduced ? ' reduced' : ''}: overflow=${r.horizontalOverflow} errors=${r.consoleErrors.length + r.exceptions.length + r.logErrors.length} external=${r.externalRequests.length} interactive=${r.motion.interactive} withMotion=${r.motion.withMotion} maxRadius=${r.motion.maxRadiusPx}px shots=${r.shots.length} hover=${r.hover.map(h => h.changed ? 'Y' : 'N').join('')}`);
    for (const e of r.elements || []) console.log(`  ${e.sel}: ${e.found ? Object.entries(e.coverage).map(([k, v]) => `${k} ${v}%`).join(', ') : 'NOT FOUND'}`);
    for (const o of r.overflowOffenders || []) console.log(`  overflow: <${o.tag}${o.id ? '#' + o.id : ''}${o.cls ? '.' + o.cls.split(' ')[0] : ''}> right=${o.right}px "${o.text}"`);
  }
  ws.close(); proc.kill();
  try { fs.rmSync(udd, { recursive: true, force: true }); } catch {}
}
main().catch(e => { console.error('shot.js failed:', e.message); process.exit(1); });
