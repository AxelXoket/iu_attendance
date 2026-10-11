// Builds blind review folders: each critic sees the three directions under shuffled labels, without rationale files.
// Usage: node blind.js   -> blind/c1, blind/c2, blind/c3 and blind/key.json (the mapping, never shown to critics)
const fs = require('fs'), path = require('path');
const D = __dirname;
const PERMS = { c1: { A: 'X', B: 'Y', C: 'Z' }, c2: { A: 'Z', B: 'X', C: 'Y' }, c3: { A: 'Y', B: 'Z', C: 'X' } };
const copyDir = (src, dst, skip) => {
  fs.mkdirSync(dst, { recursive: true });
  for (const f of fs.readdirSync(src)) {
    if (skip(f)) continue;
    const s = path.join(src, f), d = path.join(dst, f);
    if (fs.statSync(s).isDirectory()) copyDir(s, d, skip); else fs.copyFileSync(s, d);
  }
};
fs.rmSync(path.join(D, 'blind'), { recursive: true, force: true });
for (const [critic, map] of Object.entries(PERMS)) {
  for (const [variant, label] of Object.entries(map)) {
    const src = path.join(D, 'variants', variant);
    if (!fs.existsSync(src)) { console.log('missing variant ' + variant); continue; }
    copyDir(src, path.join(D, 'blind', critic, label), f => /rationale|\.md$|^tmp|node_modules|^work$|^tools$|^src$|^fonts$|\.js$/i.test(f));
    // Rewrite absolute paths inside report.json so they point at the blind copy, not the variant folder.
    const rep = path.join(D, 'blind', critic, label, 'shots', 'report.json');
    if (fs.existsSync(rep)) fs.writeFileSync(rep, fs.readFileSync(rep, 'utf8').split(src.replace(/\\/g, '\\\\')).join(path.join(D, 'blind', critic, label).replace(/\\/g, '\\\\')));
  }
}
fs.writeFileSync(path.join(D, 'blind-key.json'), JSON.stringify(PERMS, null, 2));
console.log('blind folders ready:', Object.keys(PERMS).join(', '));
