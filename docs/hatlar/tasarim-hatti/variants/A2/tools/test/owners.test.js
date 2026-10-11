// Gate tests for the ownership split: OWNERS.md gives every source file exactly one owner, and tools/ownercheck.js
// passes on the real sources and catches each kind of leak between the owners' files. Planted leaks are written into a
// throwaway copy of the variant (fixture.js), never into the live files. Run: node --test "tools/test/*.test.js" (or npm test in tools/)   Owner: F1a.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs'), path = require('path');
const { readOwners, sectionsOf } = require('../lib/owners');
const { SETS } = require('../lib/sources');
const { variantCopy } = require('./fixture');

const A = path.join(__dirname, '..', '..');
const GENERATED = ['tasarim.html', 'specimen.html', 'tasarim.tokens.json']; // written by tools/build.js, owned by nobody (OWNERS.md)
function sourceFiles() {
  const out = [];
  // node_modules is skipped by name: installed packages, whether a folder or a link to one.
  const walk = d => { for (const e of fs.readdirSync(path.join(A, d), { withFileTypes: true })) { const p = d + '/' + e.name; if (e.name === 'node_modules') continue; if (e.isDirectory()) walk(p); else out.push(p); } };
  walk('tools'); walk('src'); walk('fonts');
  for (const f of fs.readdirSync(A)) if (/\.(json|css|html)$/.test(f) && !GENERATED.includes(f) && fs.statSync(path.join(A, f)).isFile()) out.push(f);
  return out;
}

test('every source file of the build has exactly one owner, and every listed file exists', () => {
  const owners = readOwners(A);
  assert.deepEqual(Object.keys(owners).sort(), ['F1a', 'F1b']);
  const listed = Object.values(owners).flat();
  assert.deepEqual(listed.filter((f, i) => listed.indexOf(f) !== i), [], 'listed twice');
  assert.deepEqual(listed.filter(f => !fs.existsSync(path.join(A, f))), [], 'listed but missing');
  const files = sourceFiles();
  assert.ok(files.length > 60, 'control: the walk found the sources');
  assert.deepEqual(files.filter(f => !listed.includes(f)), [], 'no owner');
});

test('the two owners split the section modules and the merged source files between them', () => {
  const owners = readOwners(A);
  const modules = fs.readdirSync(path.join(A, 'tools', 'sections')).map(f => f.replace(/\.js$/, '')).sort();
  assert.deepEqual([...sectionsOf(owners, 'F1a'), ...sectionsOf(owners, 'F1b')].sort(), modules);
  for (const f of [...SETS.css, ...SETS.js]) assert.ok(owners.F1a.includes(f) !== owners.F1b.includes(f), f);
});

test('ownercheck passes on the real sources and fails on every kind of leak between owners', () => {
  const v = variantCopy();
  try {
    assert.equal(v.run('build.js').code, 0);
    const pass = v.run('ownercheck.js');
    assert.equal(pass.code, 0, pass.out);
    assert.match(pass.out, /PASS/);
    const plant = (file, text) => { const orig = v.read(file); v.write(file, orig + text); return () => { v.write(file, orig); assert.equal(v.read(file), orig); }; };
    const leaks = [
      // a rule in screens.css that also styles system sections (buttons live in bilesenler too)
      [[['src/css/screens.css', '/* @order 9900 */\n.btn-primary { outline: 0; }\n']], /src\/css\/screens\.css:\d+: "\.btn-primary" also matches [^\n]*bilesenler/],
      // a rule in system.css that styles a screen section only (the home screen card)
      [[['src/css/system.css', '/* @order 9910 */\n.now { outline: 0; }\n']], /src\/css\/system\.css:\d+: "\.now" also matches [^\n]*ekranlar/],
      // a class the page-level script adds at run time (toast icons), styled in screens.css
      [[['src/css/screens.css', '/* @order 9920 */\n.st-danger { outline: 0; }\n']], /"\.st-danger" also matches [^\n]*page/],
      // a rule in screens.css on the page frame itself (side navigation)
      [[['src/css/screens.css', '/* @order 9930 */\n.side-nav a { outline: 0; }\n']], /"\.side-nav a" also matches page/],
      // a document-wide lookup in screens.js of an element that only a system section has (the e-mail code)
      [[['src/js/screens.js', "/* @order 9940 */\n  $$('[data-otp]');\n"]], /src\/js\/screens\.js:\d+: looks up "\[data-otp\]", which also matches bilesenler/],
      // keyframes defined in screens.css and used by a rule in base.css
      [[['src/css/screens.css', '/* @order 9950 */\n@keyframes zz { to { opacity: 0; } }\n'], ['src/css/base.css', '/* @order 9960 */\n.vh { animation: zz 1s; }\n']], /src\/css\/base\.css:\d+: uses @keyframes zz, which src\/css\/screens\.css defines/]
    ];
    for (const [plants, expect] of leaks) {
      const undo = plants.map(([f, t]) => plant(f, t));
      try {
        const r = v.run('ownercheck.js');
        assert.equal(r.code, 1, 'not caught: ' + plants.map(p => p[1].trim()).join(' + ') + '\n' + r.out);
        assert.match(r.out, expect);
      } finally { undo.forEach(u => u()); }
    }
    // controls: a screen-only rule in screens.css and a lookup of a screen-only element in screens.js are fine
    const undo = [plant('src/css/screens.css', '/* @order 9970 */\n.now .now-top { outline: 0; }\n'), plant('src/js/screens.js', "/* @order 9980 */\n  $$('[data-case]');\n")];
    try { const ok = v.run('ownercheck.js'); assert.equal(ok.code, 0, ok.out); } finally { undo.forEach(u => u()); }
  } finally { v.remove(); }
});
