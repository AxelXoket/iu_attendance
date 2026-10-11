// Headless Chrome (no window, no sound): screenshots one element in tiles so long sections can be read.
// Usage: node tiles.js <html> <selector> <outDir> [--widths 390,1440] [--tile 1500] [--reduced]
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path'), os = require('os');
const CHROME = ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'].find(p => fs.existsSync(p));
const [fileArg, selector, outArg] = process.argv.slice(2);
const opt = n => { const i = process.argv.indexOf(n); return i < 0 ? null : process.argv[i + 1]; };
const widths = String(opt('--widths') || '390,1440').split(',').map(Number);
const tileH = Number(opt('--tile') || 1500);
const reduced = process.argv.includes('--reduced');
const file = path.resolve(fileArg), outDir = path.resolve(outArg);
fs.mkdirSync(outDir, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const port = 9900 + (process.pid % 90);
  const udd = fs.mkdtempSync(path.join(os.tmpdir(), 'tiles-'));
  const proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${udd}`, '--disable-gpu', '--hide-scrollbars', '--mute-audio', '--no-first-run', '--no-default-browser-check', '--force-color-profile=srgb', '--disable-lcd-text', 'about:blank'], { stdio: 'ignore', windowsHide: true });
  let wsUrl;
  for (let i = 0; i < 100 && !wsUrl; i++) { try { const l = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); const p = l.find(t => t.type === 'page'); if (p) wsUrl = p.webSocketDebuggerUrl; } catch {} if (!wsUrl) await sleep(150); }
  const ws = new WebSocket(wsUrl); await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let seq = 0; const pending = new Map(); const events = [];
  ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { const { res, rej } = pending.get(d.id); pending.delete(d.id); d.error ? rej(new Error(d.error.message)) : res(d.result); } else if (d.method) events.push(d); };
  const send = (method, params = {}) => new Promise((res, rej) => { const id = ++seq; pending.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params })); });
  const evalJs = async expr => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result.value;
  await send('Page.enable'); await send('Runtime.enable');
  const report = [];
  for (const w of widths) {
    events.length = 0;
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: 900, deviceScaleFactor: 1, mobile: w < 600 });
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: reduced ? 'reduce' : 'no-preference' }] });
    await send('Page.navigate', { url: 'file:///' + file.replace(/\\/g, '/') });
    for (let i = 0; i < 60 && !events.some(e => e.method === 'Page.loadEventFired'); i++) await sleep(100);
    await sleep(1200);
    const box = await evalJs(`(() => { const e = document.querySelector(${JSON.stringify(selector)}); const r = e.getBoundingClientRect(); return { y: r.top + scrollY, h: r.height, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth } })()`);
    const metrics = await evalJs(`(() => { const out = {}; for (const sel of ['#platform-ios','#platform-android','#platform-web','.pf-pe']) { const e = document.querySelector(sel); if (e) { const r = e.getBoundingClientRect(); out[sel] = { h: Math.round(r.height), w: Math.round(r.width) }; } } const sx = document.querySelector('.pf-pe-wrap'); if (sx) out.peScroll = { scrollW: sx.scrollWidth, clientW: sx.clientWidth }; return out; })()`);
    report.push({ width: w, sectionHeight: Math.round(box.h), overflow: box.sw > box.cw + 1, metrics });
    let n = 0;
    for (let y = box.y; y < box.y + box.h; y += tileH) {
      const h = Math.min(tileH, box.y + box.h - y);
      const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y, width: w, height: h, scale: 1 } });
      fs.writeFileSync(path.join(outDir, `${w}${reduced ? '-r' : ''}-${String(++n).padStart(2, '0')}.png`), Buffer.from(shot.data, 'base64'));
    }
  }
  console.log(JSON.stringify(report, null, 1));
  ws.close(); proc.kill();
})().catch(e => { console.error(e); process.exit(1); });
