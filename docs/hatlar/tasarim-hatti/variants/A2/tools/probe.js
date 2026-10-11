// Evaluates JavaScript expressions on tasarim.html in headless Chrome and prints the JSON results (read-only helper).
// Usage: node tools/probe.js <width> "<expression>" ["<expression>" ...]   (add --reduced for prefers-reduced-motion)
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path'), os = require('os');
const CHROME = ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'].find(p => fs.existsSync(p));
const A = path.join(__dirname, '..');
const args = process.argv.slice(2).filter(a => a !== '--reduced');
const reduced = process.argv.includes('--reduced');
const width = +args[0], exprs = args.slice(1);
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const port = 9800 + (process.pid % 150);
  const udd = fs.mkdtempSync(path.join(os.tmpdir(), 'probe-'));
  const proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${udd}`, '--disable-gpu', '--hide-scrollbars', '--mute-audio', '--no-first-run', '--force-color-profile=srgb', '--disable-lcd-text', 'about:blank'], { stdio: 'ignore', windowsHide: true });
  let wsUrl;
  for (let i = 0; i < 100 && !wsUrl; i++) { try { const l = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); const p = l.find(t => t.type === 'page'); if (p) wsUrl = p.webSocketDebuggerUrl; } catch {} if (!wsUrl) await sleep(150); }
  const ws = new WebSocket(wsUrl); await new Promise(r => (ws.onopen = r));
  let seq = 0; const pend = new Map(); const events = [];
  ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d.result || d.error); pend.delete(d.id); } else if (d.method) events.push(d); };
  const send = (method, params = {}) => new Promise(res => { const id = ++seq; pend.set(id, res); ws.send(JSON.stringify({ id, method, params })); });
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 600 });
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: reduced ? 'reduce' : 'no-preference' }] });
  await send('Page.navigate', { url: 'file:///' + path.join(A, 'tasarim.html').replace(/\\/g, '/') });
  for (let i = 0; i < 60 && !events.some(e => e.method === 'Page.loadEventFired'); i++) await sleep(100);
  await sleep(900);
  for (const ex of exprs) {
    const r = await send('Runtime.evaluate', { expression: ex, returnByValue: true, awaitPromise: true });
    console.log(JSON.stringify(r.result ? r.result.value : r, null, 1));
  }
  ws.close(); proc.kill(); try { fs.rmSync(udd, { recursive: true, force: true }); } catch {}
})().catch(e => { console.error('probe failed', e); process.exit(1); });
