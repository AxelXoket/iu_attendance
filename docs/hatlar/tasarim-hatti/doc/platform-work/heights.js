// Prints the rendered height of every section (headless Chrome, no window).
const { spawn } = require('child_process'); const fs = require('fs'), path = require('path'), os = require('os');
const CHROME = ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'].find(p => fs.existsSync(p));
const file = path.resolve(process.argv[2]); const w = Number(process.argv[3] || 1440);
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const port = 9800 + (process.pid % 90); const udd = fs.mkdtempSync(path.join(os.tmpdir(), 'h-'));
  const proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${udd}`, '--disable-gpu', '--hide-scrollbars', '--mute-audio', '--no-first-run', 'about:blank'], { stdio: 'ignore', windowsHide: true });
  let wsUrl; for (let i = 0; i < 100 && !wsUrl; i++) { try { const l = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); const p = l.find(t => t.type === 'page'); if (p) wsUrl = p.webSocketDebuggerUrl; } catch {} if (!wsUrl) await sleep(150); }
  const ws = new WebSocket(wsUrl); await new Promise(r => { ws.onopen = r; });
  let seq = 0; const pending = new Map(); const ev = [];
  ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d.result); pending.delete(d.id); } else ev.push(d); };
  const send = (method, params = {}) => new Promise(r => { const id = ++seq; pending.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: 900, deviceScaleFactor: 1, mobile: w < 600 });
  await send('Page.navigate', { url: 'file:///' + file.split(path.sep).join('/') });
  for (let i = 0; i < 60 && !ev.some(e => e.method === 'Page.loadEventFired'); i++) await sleep(100);
  await sleep(1000);
  const r = await send('Runtime.evaluate', { expression: "[...document.querySelectorAll('section[id]')].map(s => s.id + ' ' + Math.round(s.getBoundingClientRect().height)).join('\\n')", returnByValue: true });
  console.log(r.result.value); ws.close(); proc.kill();
})();
