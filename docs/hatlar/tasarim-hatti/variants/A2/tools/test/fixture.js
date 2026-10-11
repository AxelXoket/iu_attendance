// Test fixture: a throwaway copy of this variant (sources, data, tools; no screenshots, work/, node_modules or built
// pages) next to copies of ../../color.js and ../../spring.js, so a build or a check in it never reads the live
// fragments and never writes into the live variant. Its default fragment folder (doc/sections) is empty. Owner: F1a.
const fs = require('fs'), os = require('os'), path = require('path');
const { execFileSync } = require('child_process');
const A = path.join(__dirname, '..', '..');
const SKIP = new Set(['work', 'node_modules', 'tasarim.html', 'specimen.html']);

function variantCopy() {
  const T = fs.mkdtempSync(path.join(os.tmpdir(), 'a2-test-'));
  for (const f of ['color.js', 'spring.js']) fs.copyFileSync(path.join(A, '..', '..', f), path.join(T, f));
  const V = path.join(T, 'variants', 'A2');
  fs.cpSync(A, V, { recursive: true, filter: src => !SKIP.has(path.basename(src)) && !/^shots-/.test(path.relative(A, src)) });
  fs.mkdirSync(path.join(T, 'doc', 'sections'), { recursive: true });
  let n = 0;
  return {
    root: V,
    tmp: T,
    // Runs tools/<tool> inside the copy; never throws, returns the exit code and everything it printed.
    run(tool, args = []) {
      try { return { code: 0, out: execFileSync(process.execPath, [path.join(V, 'tools', tool), ...args], { cwd: V, encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] }) }; }
      catch (e) { return { code: e.status, out: String(e.stdout || '') + String(e.stderr || '') }; }
    },
    read: f => fs.readFileSync(path.join(V, f), 'utf8'),
    write: (f, s) => fs.writeFileSync(path.join(V, f), s),
    // A fragment folder of its own (with a doc/ parent for includes), filled with the given files.
    fragDir(files) {
      const d = path.join(T, 'frag' + ++n, 'sections');
      fs.mkdirSync(d, { recursive: true });
      for (const [f, h] of Object.entries(files)) fs.writeFileSync(path.join(d, f), h);
      return d;
    },
    remove: () => fs.rmSync(T, { recursive: true, force: true })
  };
}

module.exports = { variantCopy };
