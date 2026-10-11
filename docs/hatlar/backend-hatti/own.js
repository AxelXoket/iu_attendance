// Merges stage 1 inventories into an ownership draft and lists every overlap for arbitration.
// Usage: node own.js            -> ownership-draft.json, overlaps.txt, gaps-owner.txt
const fs = require('fs'), path = require('path');
const D = __dirname;
const inv = fs.readdirSync(path.join(D, 'inv')).filter(f => /^D\d\d\.json$/.test(f)).sort().map(f => JSON.parse(fs.readFileSync(path.join(D, 'inv', f), 'utf8')));
const norm = s => String(s).toLowerCase().replace(/[^a-z0-9_/{}:]/g, '');
const pathKey = (m, p) => m + ' ' + String(p).replace(/\{[^}]+\}|:[a-z_]+/gi, '{x}').replace(/\/+$/, '').toLowerCase();
const merge = (kind, keyOf) => {
  const map = new Map();
  for (const d of inv) for (const x of d[kind] || []) {
    const k = keyOf(x);
    const e = map.get(k) || { key: k, proposals: [] };
    e.proposals.push({ from: d.id, owner: x.proposed_owner || d.id, item: x });
    map.set(k, e);
  }
  const out = [];
  for (const e of map.values()) {
    const owners = [...new Set(e.proposals.map(p => p.owner))];
    out.push({ key: e.key, owners, from: [...new Set(e.proposals.map(p => p.from))], purpose: e.proposals.map(p => p.item.purpose).filter(Boolean)[0] || '', conflict: owners.length > 1 });
  }
  return out.sort((a, b) => a.key.localeCompare(b.key));
};
const entities = merge('entities', x => norm(x.name));
const endpoints = merge('endpoints', x => pathKey(x.method, x.path));
const jobs = merge('jobs', x => norm(x.name));
fs.writeFileSync(path.join(D, 'ownership-draft.json'), JSON.stringify({ entities, endpoints, jobs }, null, 1));
const lines = [];
for (const [kind, list] of [['TABLE', entities], ['ENDPOINT', endpoints], ['JOB', jobs]])
  for (const e of list.filter(x => x.conflict)) lines.push(`${kind} ${e.key}: owners ${e.owners.join(' / ')} (proposed by ${e.from.join(', ')}) :: ${e.purpose.slice(0, 120)}`);
fs.writeFileSync(path.join(D, 'overlaps.txt'), lines.join('\n') + '\n');
const g = [];
for (const d of inv) for (const x of (d.gaps || []).filter(x => x.needs_owner)) g.push(`${x.id} ${x.question} => ${x.recommendation}`);
fs.writeFileSync(path.join(D, 'gaps-owner.txt'), g.join('\n') + '\n');
const c = inv.reduce((n, d) => n + (d.contradictions || []).length, 0);
console.log(`domains ${inv.length}; entities ${entities.length} (${entities.filter(x => x.conflict).length} overlaps); endpoints ${endpoints.length} (${endpoints.filter(x => x.conflict).length} overlaps); jobs ${jobs.length} (${jobs.filter(x => x.conflict).length} overlaps); gaps ${inv.reduce((n, d) => n + (d.gaps || []).length, 0)} (owner ${g.length}); contradictions ${c}`);
