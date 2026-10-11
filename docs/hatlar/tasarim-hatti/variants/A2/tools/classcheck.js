// Lists classes used in the built page (markup and script strings) that have no CSS rule, and CSS classes no markup uses.
// Read-only: it never edits a file. Run after build: node tools/classcheck.js
const fs = require('fs'), path = require('path');
const A = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(A, 'tasarim.html'), 'utf8');
const { pageCss, pageJs } = require('./lib/sources');
const css = pageCss().replace(/\/\*[\s\S]*?\*\//g, '');
const js = pageJs();
const markup = html.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<script[\s\S]*?<\/script>/g, '');
const used = new Set();
for (const m of markup.matchAll(/class="([^"]*)"/g)) m[1].split(/\s+/).filter(Boolean).forEach(c => used.add(c));
for (const m of js.matchAll(/class="([^"]*)"/g)) m[1].split(/\s+/).filter(Boolean).forEach(c => used.add(c));
for (const m of js.matchAll(/classList\.(?:add|remove|toggle|contains)\('([\w-]+)'/g)) used.add(m[1]);
for (const m of js.matchAll(/restart\([^,]+,\s*'([\w-]+)'\)/g)) used.add(m[1]);
for (const m of js.matchAll(/className = '([^']+)'/g)) m[1].split(/\s+/).forEach(c => used.add(c));
const defined = new Set();
for (const m of css.matchAll(/\.([a-zA-Z][\w-]*)/g)) defined.add(m[1]);
const ignoreUndefined = new Set(['n', 's', 't', 'k', 'v', 'd', 'u', 'r', 'sys', 'code', 'room', 'lv', 'tx', 'why', 'cnt', 'kbd', 'danger', 'sel-ic', 'btn-label', 'btn-ic', 'meta', 'desc', 'ax', 'chips', 'off', 'on', 'w', 'lbl', 'b']);
const missing = [...used].filter(c => !defined.has(c) && !ignoreUndefined.has(c)).sort();
const unused = [...defined].filter(c => !used.has(c)).sort();
console.log('used but not styled:', missing.join(', ') || 'none');
console.log('styled but not used:', unused.join(', ') || 'none');
