// Assembles the page stylesheet and the page script from their per-owner source files (src/css/*.css, src/js/*.js).
// Every source file is a run of chunks. A chunk starts with a marker line "/* @order NNNN */" (four digits) and runs to
// the next marker or the end of the file. The chunks of all files of one set are joined in marker order, so one
// sequence (the cascade, the statements of the page script) runs across the files. Marker lines are never emitted, and
// neither is the note above a file's first marker. Deterministic and read-only; a malformed set throws, it never guesses.
// Owner: F1a.
const fs = require('fs'), path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const SETS = {
  css: ['src/css/base.css', 'src/css/system.css', 'src/css/screens.css'],
  js: ['src/js/base.js', 'src/js/system.js', 'src/js/screens.js']
};
const MARKER = /^\/\* @order (\d{4}) \*\/[ \t]*$/;
// Anything that starts like a marker but is not exactly one (indented, no spaces, three digits, code after it) is an error.
const NEAR_MARKER = /^\s*\/\*\s*@order\b/;

// The note above the first marker may hold comments only: a rule or a statement there would silently never be emitted.
function stripNote(text, isJs) {
  let t = text.replace(/\/\*[\s\S]*?\*\//g, '');
  if (isJs) t = t.replace(/^[ \t]*\/\/.*$/gm, '');
  return t.trim();
}

// Splits one source file into its chunks: [{ key, file, line, text }]. `line` is the 1-based line of the marker.
function chunksOf(file, raw) {
  const text = raw.replace(/^\uFEFF/, '');
  const lines = text.match(/[^\n]*\n|[^\n]+$/g) || [];
  const out = [];
  let note = '', cur = null;
  lines.forEach((ln, i) => {
    const bare = ln.replace(/\r?\n$/, '').replace(/\r$/, '');
    const m = MARKER.exec(bare);
    if (m) { cur = { key: m[1], file, line: i + 1, text: '' }; out.push(cur); return; }
    if (NEAR_MARKER.test(bare)) throw new Error(file + ':' + (i + 1) + ': malformed marker, write exactly "/* @order NNNN */" (four digits) on its own line');
    if (cur) cur.text += ln; else note += ln;
  });
  if (!out.length) throw new Error(file + ': no "/* @order NNNN */" marker, so nothing in it would be emitted');
  if (stripNote(note, /\.js$/.test(file))) throw new Error(file + ': content above the first @order marker would never be emitted; move it into a chunk');
  // A chunk always ends with a line break, so an editor that drops the final newline cannot glue two chunks together.
  for (const c of out) if (c.text && !c.text.endsWith('\n')) c.text += '\n';
  // A stylesheet chunk holds whole rules: a marker inside a block would let the sort move half of that block.
  if (/\.css$/.test(file)) for (const c of out) {
    const depth = braceDepth(c.text);
    if (depth) throw new Error(file + ':' + c.line + ': chunk @order ' + c.key + (depth > 0 ? ' leaves ' + depth + ' block(s) open' : ' closes ' + -depth + ' block(s) it did not open') + '; a marker may only sit between whole rules');
  }
  return out;
}

// Net { minus } of a stylesheet text, outside comments and quoted strings.
function braceDepth(css) {
  let d = 0;
  for (let i = 0; i < css.length; i++) {
    const ch = css[i];
    if (ch === '/' && css[i + 1] === '*') { const e = css.indexOf('*/', i + 2); i = e < 0 ? css.length : e + 1; continue; }
    if (ch === '"' || ch === "'") { i++; while (i < css.length && css[i] !== ch) { if (css[i] === '\\') i++; i++; } continue; }
    if (ch === '{') d++; else if (ch === '}') d--;
  }
  return d;
}

// Joins the chunks of the given files (paths relative to root) in marker order. Keys are unique across the set.
function assembleFiles(files, root = ROOT) {
  const all = [];
  const seen = new Map();
  for (const f of files) {
    for (const c of chunksOf(f, fs.readFileSync(path.join(root, f), 'utf8'))) {
      if (seen.has(c.key)) throw new Error(f + ':' + c.line + ': @order ' + c.key + ' is already used by ' + seen.get(c.key) + '; pick a free number between the neighbouring chunks');
      seen.set(c.key, f + ':' + c.line);
      all.push(c);
    }
  }
  all.sort((a, b) => Number(a.key) - Number(b.key));
  return { text: all.map(c => c.text).join(''), chunks: all.map(({ key, file, line }) => ({ key, file, line })) };
}

const assemble = kind => {
  if (!SETS[kind]) throw new Error('unknown source set: ' + kind);
  return assembleFiles(SETS[kind]);
};
const pageCss = () => assemble('css').text;
const pageJs = () => assemble('js').text;

module.exports = { ROOT, SETS, MARKER, chunksOf, assembleFiles, assemble, pageCss, pageJs };
