// Checks that each D12 quote lies between its anchor id and the next id in the raw HTML (nearest id above).
const fs = require('fs');
const REPO = require('path').join(__dirname, '..', '..', 'belgeler').split(require('path').sep).join('/') + '/';
const strip = h => h.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ');
const norm = s => String(s).replace(/\s+/g, ' ').replace(/[“”]/g, '"').replace(/[‘’]/g, "'").trim();
const files = {};
for (const f of ['plan.html', 'teknik.html']) {
  const html = fs.readFileSync(REPO + f, 'utf8');
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(m => ({ id: m[1], pos: m.index }));
  files[f] = { html, ids };
}
const j = JSON.parse(fs.readFileSync('inv/D12.json', 'utf8'));
let bad = 0;
for (const d of j.decided) {
  const [f, id] = d.anchor.split('#');
  const { html, ids } = files[f];
  const i = ids.findIndex(x => x.id === id);
  const start = ids[i].pos, end = i + 1 < ids.length ? ids[i + 1].pos : html.length;
  const seg = strip(html.slice(start, end));
  if (!seg.includes(norm(d.quote))) {
    // find which id region actually holds it
    let where = '?';
    for (let k = 0; k < ids.length; k++) {
      const s2 = strip(html.slice(ids[k].pos, k + 1 < ids.length ? ids[k + 1].pos : html.length));
      if (s2.includes(norm(d.quote))) { where = ids[k].id; break; }
    }
    console.log(`${d.id}: anchor ${d.anchor} not nearest; quote sits under #${where}`);
    bad++;
  }
}
console.log(bad ? `${bad} anchor(s) not nearest` : 'all anchors are nearest-above');
