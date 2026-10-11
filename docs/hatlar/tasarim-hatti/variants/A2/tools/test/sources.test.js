// Gate tests for tools/lib/sources.js: how the per-owner source files merge into one stylesheet and one page script.
// Run: node --test "tools/test/*.test.js" (or npm test in tools/)   Owner: F1a.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs'), os = require('os'), path = require('path'), vm = require('vm');
const { ROOT, SETS, chunksOf, assembleFiles, assemble, MARKER } = require('../lib/sources');

const M = key => '/* @order ' + key + ' */\n';
// Writes the given files into a fresh folder and merges them in the given (or listed) order.
function merge(map, order = Object.keys(map)) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'a2-src-'));
  try {
    for (const [f, t] of Object.entries(map)) fs.writeFileSync(path.join(d, f), t);
    return assembleFiles(order, d);
  } finally { fs.rmSync(d, { recursive: true, force: true }); }
}

test('chunks from several files are joined in marker order; markers and the note are not emitted', () => {
  const r = merge({ 'a.css': '/* note */\n' + M('0100') + '.a{}\n' + M('0300') + '.c{}\n', 'b.css': M('0200') + '.b{}\n' + M('0400') + '.d{}\n' });
  assert.equal(r.text, '.a{}\n.b{}\n.c{}\n.d{}\n');
  assert.deepEqual(r.chunks.map(c => c.key + ' ' + c.file + ':' + c.line), ['0100 a.css:2', '0200 b.css:1', '0300 a.css:4', '0400 b.css:3']);
});

test('the numbers decide the order, not the order of the files', () => {
  assert.equal(merge({ 'a.css': M('0500') + '.late{}\n', 'b.css': M('0050') + '.early{}\n' }).text, '.early{}\n.late{}\n');
});

test('code above the first marker is refused; a comment there is a note and is dropped', () => {
  assert.throws(() => merge({ 'a.css': '.lost{}\n' + M('0100') + '.a{}\n' }), /a\.css: content above the first @order marker/);
  assert.equal(merge({ 'a.css': '/* note */\n' + M('0100') + '.a{}\n' }).text, '.a{}\n');
  assert.throws(() => merge({ 'a.js': '// note\nlost();\n' + M('0100') + 'a();\n' }), /a\.js: content above the first @order marker/);
  assert.equal(merge({ 'a.js': '// note\n/* more */\n' + M('0100') + 'a();\n' }).text, 'a();\n');
});

test('a number used twice is refused, naming both places', () => {
  assert.throws(() => merge({ 'a.css': M('0100') + '.a{}\n', 'b.css': M('0200') + '.b{}\n' + M('0100') + '.c{}\n' }), /b\.css:3: @order 0100 is already used by a\.css:1/);
});

test('a line that starts like a marker but is not exactly one is refused; prose about markers is not', () => {
  for (const bad of ['  /* @order 0300 */', '/*@order 0300*/', '/* @order 300 */', '/* @order 03000 */', '/* @order 0300 */ .x{}']) {
    assert.throws(() => merge({ 'a.css': M('0050') + '.a{}\n' + bad + '\n.b{}\n' }), /a\.css:3: malformed marker/, bad);
  }
  const prose = '/* the "@order" markers sort these chunks */\n.a{}\n';
  assert.equal(merge({ 'a.css': M('0050') + prose }).text, prose);
  assert.ok(MARKER.test('/* @order 0300 */'), 'control: the exact form is a marker');
});

test('a file without a marker is refused (nothing in it would be emitted)', () => {
  assert.throws(() => merge({ 'a.css': '.a{}\n' }), /a\.css: no "\/\* @order NNNN \*\/" marker/);
});

test('a stylesheet chunk must hold whole rules; braces in comments and strings do not count', () => {
  assert.throws(() => merge({ 'a.css': M('0100') + '@media (x) {\n.a{}\n' + M('0200') + '}\n' }), /a\.css:1: chunk @order 0100 leaves 1 block\(s\) open/);
  assert.throws(() => merge({ 'a.css': M('0100') + '.a{}\n}\n' }), /closes 1 block\(s\) it did not open/);
  const ok = '/* { */\n.a::after { content: "}"; }\n';
  assert.equal(merge({ 'a.css': M('0100') + ok }).text, ok);
});

test('a chunk without a final newline cannot swallow the next chunk', () => {
  const r = merge({ 'a.js': M('0100') + 'a();\n// end', 'b.js': M('0200') + 'b();\n' });
  assert.equal(r.text, 'a();\n// end\nb();\n');
  const calls = [];
  vm.runInNewContext(r.text, { a: () => calls.push('a'), b: () => calls.push('b') });
  assert.deepEqual(calls, ['a', 'b']);
});

test('a byte order mark and CRLF line ends are accepted', () => {
  assert.equal(merge({ 'a.css': '\uFEFF/* note */\r\n/* @order 0100 */\r\n.a{}\r\n' }).text, '.a{}\r\n');
});

test('the real sources: every file contributes, the numbers rise, no marker reaches the output', () => {
  for (const kind of Object.keys(SETS)) {
    const r = assemble(kind);
    assert.ok(r.text.length > 10000, kind + ' merged text is suspiciously short');
    for (const f of SETS[kind]) assert.ok(r.chunks.some(c => c.file === f), f + ' contributes no chunk');
    r.chunks.forEach((c, i) => { if (i) assert.ok(c.key > r.chunks[i - 1].key, 'keys out of order at ' + c.key); });
    assert.equal(r.text.split('\n').some(l => MARKER.test(l)), false, kind + ': a marker line reached the output');
  }
});

test('the real page script compiles, and each script file holds whole statements', () => {
  assert.doesNotThrow(() => new vm.Script(assemble('js').text));
  const own = f => chunksOf(f, fs.readFileSync(path.join(ROOT, f), 'utf8')).map(c => c.text).join('');
  const base = SETS.js.find(f => /\/base\.js$/.test(f));
  assert.doesNotThrow(() => new vm.Script(own(base)), base + ' should open and close the IIFE around whole statements');
  for (const f of SETS.js.filter(x => x !== base)) assert.doesNotThrow(() => new Function(own(f)), f + ' should hold whole statements');
});
