// Diagnostic: loads the specimen in headless Chrome at a width and evaluates an expression (default: overflow finder).
// Usage: node tools/diag.js <width> [expression-file.js] [--reduced]
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path'), os = require('os');
const CHROME = ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'].find(p => fs.existsSync(p));
const width = +(process.argv[2] || 390);
const exprFile = process.argv[3] && !process.argv[3].startsWith('--') ? process.argv[3] : null;
const reduced = process.argv.includes('--reduced');
const file = path.join(__dirname, '..', 'specimen.html');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const DEFAULT = `(() => {
  const cw = document.documentElement.clientWidth, out = [];
  for (const e of document.querySelectorAll('body *')) {
    const r = e.getBoundingClientRect();
    const sw = e.scrollWidth, ow = e.clientWidth;
    const cs = getComputedStyle(e);
    if (r.right > cw + 1 || (sw > ow + 1 && cs.overflowX === 'visible' && ow > 0)) out.push({ tag: e.tagName.toLowerCase(), cls: String(e.className && e.className.baseVal !== undefined ? e.className.baseVal : e.className).slice(0, 40), id: e.id, right: Math.round(r.right), w: Math.round(r.width), sw, ow, text: (e.textContent || '').trim().slice(0, 40) });
  }
  return { cw, sw: document.documentElement.scrollWidth, out: out.slice(0, 40) };
})()`;
(async () => {
  const port = 9900 + (process.pid % 90);
  const udd = fs.mkdtempSync(path.join(os.tmpdir(), 'diag-'));
  const proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${udd}`, '--disable-gpu', '--hide-scrollbars', '--mute-audio', '--no-first-run', 'about:blank'], { stdio: 'ignore', windowsHide: true });
  let ws, wsUrl;
  for (let i = 0; i < 100 && !wsUrl; i++) { try { const l = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); const p = l.find(t => t.type === 'page'); if (p) wsUrl = p.webSocketDebuggerUrl; } catch {} if (!wsUrl) await sleep(150); }
  ws = new WebSocket(wsUrl); await new Promise(r => (ws.onopen = r));
  let seq = 0; const pend = new Map(); const events = [];
  ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d.result || d.error); pend.delete(d.id); } else if (d.method) events.push(d); };
  const send = (method, params = {}) => new Promise(res => { const id = ++seq; pend.set(id, res); ws.send(JSON.stringify({ id, method, params })); });
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 600 });
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: reduced ? 'reduce' : 'no-preference' }] });
  await send('Page.navigate', { url: 'file:///' + file.replace(/\\/g, '/') });
  for (let i = 0; i < 60 && !events.some(e => e.method === 'Page.loadEventFired'); i++) await sleep(100);
  await sleep(1200);
  const expr = exprFile ? fs.readFileSync(exprFile, 'utf8') : DEFAULT;
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  console.log(JSON.stringify(r.result ? r.result.value : r, null, 1));
  ws.close(); proc.kill(); try { fs.rmSync(udd, { recursive: true, force: true }); } catch {}
})();
