// Owners and the files they own, read from OWNERS.md: an "## F1a" or "## F1b" heading, then one "- `path`" line per
// owned file (paths relative to the variant folder). Prose and other headings are ignored. Owner: F1a.
const fs = require('fs'), path = require('path');

function readOwners(root = path.join(__dirname, '..', '..')) {
  const map = {};
  let cur = null;
  for (const line of fs.readFileSync(path.join(root, 'OWNERS.md'), 'utf8').split(/\r?\n/)) {
    const h = /^## (\S+)/.exec(line);
    if (h) { cur = /^F\d\w*$/.test(h[1]) ? h[1] : null; if (cur) map[cur] = []; continue; }
    const m = cur && /^- `([^`]+)`/.exec(line);
    if (m) map[cur].push(m[1]);
  }
  return map;
}
const ownerOf = (owners, file) => Object.keys(owners).find(o => owners[o].includes(file));
const sectionsOf = (owners, owner) => owners[owner].map(f => (/^tools\/sections\/([\w-]+)\.js$/.exec(f) || [])[1]).filter(Boolean);

module.exports = { readOwners, ownerOf, sectionsOf };
