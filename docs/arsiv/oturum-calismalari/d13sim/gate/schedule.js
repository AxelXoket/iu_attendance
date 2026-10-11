// Work breakdown gate and scheduler.
// node schedule.js --check D05       check one module's packages/D05.json against its spec and contracts.json
// node schedule.js [--html out.html] check all, resolve cross-module needs, schedule into phases of at most 15, write schedule.json
// Package: { id: "D05-P01", title, files, tables, endpoints, jobs, exports: [own export names], needs: ["D12.danismaKilidi"],
//            tests: [..], depends_on: [own module package ids], size: "S"|"M"|"L", notes }
const fs = require('fs'), path = require('path');
const D = __dirname, CAP = 15;
const argv = process.argv.slice(2);
const read = f => JSON.parse(fs.readFileSync(f, 'utf8').replace(/^﻿/, ''));
const C = read(path.join(D, 'contracts.json'));
const norm = s => String(s).toLowerCase().replace(/[^a-z0-9_/{}:.]/g, '');
const nm = e => String(typeof e === 'string' ? e : (e.name || e.ad || '')).trim();
const tok = m => (String(m.migration_dir || '').match(/_([a-z_]+?)_<açıklama>/) || [])[1];
const specCache = new Map();
const spec = id => { if (!specCache.has(id)) specCache.set(id, read(path.join(D, 'spec', id + '.json'))); return specCache.get(id); };
const errs = [];
const checkModule = id => {
  const P = read(path.join(D, 'packages', id + '.json'));
  const S = spec(id);
  const mod = C.modules.find(m => m.id === id);
  const globs = C.file_ownership.filter(g => g.owner === id).map(g => g.glob.replace(/\*+$/, ''));
  const mig = new RegExp('^apps/server/migrations/\\d{14}_' + tok(mod) + '_');
  if (/[–—]/.test(JSON.stringify(P))) errs.push(`${id}: contains U+2013 or U+2014`);
  const own = { file: new Map(), table: new Map(), endpoint: new Map(), job: new Map(), export: new Map() };
  const ids = new Set((P.packages || []).map(p => p.id));
  const exportNames = new Set((S.exports || []).map(nm));
  for (const p of P.packages || []) {
    if (!new RegExp(`^${id}-P\\d\\d$`).test(p.id || '')) errs.push(`${id}: bad package id ${p.id}`);
    for (const k of ['title', 'files', 'tests', 'depends_on', 'size', 'exports', 'needs']) if (p[k] === undefined) errs.push(`${p.id}: missing ${k}`);
    if (!['S', 'M', 'L'].includes(p.size)) errs.push(`${p.id}: size must be S, M or L`);
    if (!(p.tests || []).length) errs.push(`${p.id}: ships without tests`);
    for (const d of p.depends_on || []) if (!ids.has(d)) errs.push(`${p.id}: depends_on ${d} is not a package of ${id} (use needs for other modules)`);
    for (const [k, list, ok] of [
      ['file', p.files, f => globs.some(g => f.startsWith(g)) || mig.test(f)],
      ['table', p.tables, t => mod.owns_tables.map(norm).includes(norm(t))],
      ['endpoint', p.endpoints, e => mod.owns_endpoints.map(norm).includes(norm(e))],
      ['job', p.jobs, j => mod.owns_jobs.map(norm).includes(norm(j))],
      ['export', p.exports, x => exportNames.has(x)]]) for (const x of list || []) {
      const key = k === 'file' || k === 'export' ? x : norm(x);
      if (own[k].has(key)) errs.push(`${id}: ${k} ${x} in ${own[k].get(key)} and ${p.id}`);
      own[k].set(key, p.id);
      if (!ok(x)) errs.push(`${p.id}: ${k} not owned by ${id}: ${x}`);
    }
    for (const n of p.needs || []) {
      const m = /^(D\d\d)\.(.+)$/.exec(n);
      if (!m) { errs.push(`${p.id}: need ${n} is not Dxx.exportName`); continue; }
      if (m[1] === id) { errs.push(`${p.id}: need ${n} is own module (use depends_on)`); continue; }
      if (!(spec(m[1]).exports || []).map(nm).includes(m[2])) errs.push(`${p.id}: need ${n}: ${m[1]} spec exports no ${m[2]}`);
    }
  }
  for (const f of S.files || []) { const fp = typeof f === 'string' ? f : f.path; if (!own.file.has(fp)) errs.push(`${id}: spec file in no package: ${fp}`); }
  for (const t of mod.owns_tables) if (!own.table.has(norm(t))) errs.push(`${id}: table in no package: ${t}`);
  for (const e of mod.owns_endpoints) if (!own.endpoint.has(norm(e))) errs.push(`${id}: endpoint in no package: ${e}`);
  for (const j of mod.owns_jobs) if (!own.job.has(norm(j))) errs.push(`${id}: job in no package: ${j}`);
  for (const x of exportNames) if (!own.export.has(x)) errs.push(`${id}: export in no package: ${x}`);
  return P;
};
const fail = () => { console.log('ERRORS (' + errs.length + '):\n' + [...new Set(errs)].slice(0, 50).join('\n')); process.exit(1); };
if (argv[0] === '--check') {
  checkModule(argv[1]);
  if (errs.length) fail();
  console.log('OK ' + argv[1]); process.exit(0);
}
const all = [];
for (const m of C.modules) all.push(...checkModule(m.id).packages.map(p => ({ ...p, module: m.id })));
const byId = new Map(all.map(p => [p.id, p]));
const provider = new Map();
for (const p of all) for (const x of p.exports || []) provider.set(p.module + '.' + x, p.id);
for (const p of all) p.deps = [...new Set([...(p.depends_on || []), ...(p.needs || []).map(n => provider.get(n)).filter(Boolean)])];
for (const p of all) for (const n of p.needs || []) if (!provider.has(n)) errs.push(`${p.id}: need ${n} has no providing package`);
const seen = { file: new Map(), table: new Map(), endpoint: new Map(), job: new Map() };
for (const p of all) for (const [k, list] of [['file', p.files], ['table', p.tables], ['endpoint', p.endpoints], ['job', p.jobs]]) for (const x of list || []) {
  const key = k === 'file' ? x : norm(x);
  if (seen[k].has(key)) errs.push(`${k} ${x} in ${seen[k].get(key)} and ${p.id}`);
  seen[k].set(key, p.id);
}
// cycle check
const state = new Map(), dependents = new Map(all.map(p => [p.id, []]));
for (const p of all) for (const d of p.deps) dependents.get(d).push(p.id);
const visit = (id, stack) => {
  if (state.get(id) === 2) return;
  if (state.get(id) === 1) { errs.push('dependency cycle: ' + [...stack.slice(stack.indexOf(id)), id].join(' > ')); return; }
  state.set(id, 1); for (const d of byId.get(id).deps) visit(d, [...stack, id]); state.set(id, 2);
};
all.forEach(p => visit(p.id, []));
if (errs.length) fail();
// critical path: the longest chain of work that waits on this package, itself included
const W = { S: 1, M: 2, L: 3 }, tail = new Map();
const cp = id => { if (tail.has(id)) return tail.get(id); const v = W[byId.get(id).size] + Math.max(0, ...dependents.get(id).map(cp)); tail.set(id, v); return v; };
all.forEach(p => cp(p.id));
// list scheduling: each phase takes up to CAP ready packages, longest critical path first
const phaseOf = new Map(), phases = [];
while (phaseOf.size < all.length) {
  const ready = all.filter(p => !phaseOf.has(p.id) && p.deps.every(d => phaseOf.has(d))).sort((a, b) => cp(b.id) - cp(a.id) || a.id.localeCompare(b.id));
  const take = ready.slice(0, CAP);
  if (!take.length) { errs.push('no package is ready: unresolved dependency'); fail(); }
  take.forEach(p => phaseOf.set(p.id, phases.length));
  phases.push(take.map(p => p.id));
}
for (const p of all) for (const d of p.deps) if (phaseOf.get(d) >= phaseOf.get(p.id)) errs.push(`${p.id} runs before or with ${d}`);
for (const [i, ph] of phases.entries()) {
  if (ph.length > CAP) errs.push(`phase ${i + 1} has ${ph.length}`);
  const used = new Set();
  for (const id of ph) for (const f of byId.get(id).files) { if (used.has(f)) errs.push(`phase ${i + 1} shares ${f}`); used.add(f); }
}
if (errs.length) fail();
fs.writeFileSync(path.join(D, 'schedule.json'), JSON.stringify({ phases, packages: all.map(({ deps, ...p }) => ({ ...p, after: deps })) }, null, 1));
const sz = all.reduce((o, p) => (o[p.size] = (o[p.size] || 0) + 1, o), {});
console.log(`OK ${all.length} packages (${JSON.stringify(sz)}) in ${phases.length} phases (sizes ${phases.map(p => p.length).join(', ')}); files ${seen.file.size}, tables ${seen.table.size}, endpoints ${seen.endpoint.size}, jobs ${seen.job.size}; every phase at most ${CAP} packages, no shared file, table, endpoint or job, every dependency in an earlier phase`);
const out = argv[argv.indexOf('--html') + 1];
if (argv.includes('--html') && out) {
  const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const mod = Object.fromEntries(C.modules.map(m => [m.id, m]));
  const boy = { S: 'küçük', M: 'orta', L: 'büyük' };
  const codes = (label, list) => list && list.length ? label + ' ' + list.map(t => '<code>' + esc(t) + '</code>').join(', ') : '';
  let h = `<section id="is-bolumu">\n  <h2>İş bölümü</h2>\n  <p>${all.length} paket, ${phases.length} aşama. Her aşamada en çok ${CAP} paket aynı anda yapılır ve birbirine dokunmaz: hiçbir dosya, tablo, uç nokta ya da iş iki pakette yoktur. Bir paket, beklediği paketlerin hepsi önceki aşamalarda bitince başlar; bekleme, başka modülün dışa açtığı işleve ihtiyaçtan ya da aynı modülün önceki paketinden doğar. Her aşamaya, arkasında en uzun bekleme zinciri olan hazır paketler önce alınır. Her paket kendi testleriyle biter. Bu bölüm betikle üretildi ve denetlendi.</p>\n  <p>Boy: küçük yarım güne kadar, orta bir gün, büyük bir günden biraz fazla iş.</p>\n`;
  phases.forEach((ph, i) => {
    const mods = [...new Set(ph.map(id => byId.get(id).module))];
    h += `  <h3 id="asama-${i + 1}">Aşama ${i + 1} · ${ph.length} paket</h3>\n  <p class="meta">${mods.map(m => esc(mod[m].title)).join(', ')}</p>\n  <div class="rows">\n`;
    for (const id of ph) {
      const p = byId.get(id);
      const parts = [`<strong>${esc(p.title)}</strong> (${esc(mod[p.module].title)}, ${boy[p.size]})`];
      if (p.deps.length) parts.push('Bekler: ' + p.deps.map(esc).join(', '));
      const own = [codes('tablolar', p.tables), codes('uç noktalar', p.endpoints), codes('işler', p.jobs)].filter(Boolean);
      if (own.length) parts.push('Yapar: ' + own.join('; '));
      parts.push(`${p.files.length} dosya, ${p.tests.length} test`);
      if (p.notes) parts.push(esc(String(p.notes).replace(/\.\s*$/, '')));
      h += `    <div class="row"><div class="k">${esc(id)}</div><div>${parts.join('. ')}.</div></div>\n`;
    }
    h += '  </div>\n';
  });
  h += '  <details>\n    <summary>Paketlerin dosyaları</summary>\n    <div class="rows">\n' + all.map(p => `      <div class="row"><div class="k">${esc(p.id)}</div><div>${p.files.map(f => '<code>' + esc(f) + '</code>').join(', ')}</div></div>`).join('\n') + '\n    </div>\n  </details>\n';
  fs.writeFileSync(out, h + '</section>\n');
  console.log('wrote ' + out);
}
