// Embeds an open-licensed font from a Fontsource npm package as base64 @font-face rules.
// Usage: node fontget.js <npm package> "<CSS family name>" <out.css> [subsets=latin,latin-ext] [weights=400,500,600]
// Variable packages (@fontsource-variable/*) embed the wght axis file; static packages embed one file per weight.
const fs = require('fs'), path = require('path'), os = require('os');
const { execFileSync } = require('child_process');
const [pkg, family, outCss, subsetsArg, weightsArg] = process.argv.slice(2);
if (!pkg || !family || !outCss) { console.log('usage: node fontget.js <npm package> "<family>" <out.css> [subsets] [weights]'); process.exit(1); }
const subsets = (subsetsArg || 'latin,latin-ext').split(',');
const weights = (weightsArg || '400,500,600').split(',');
(async () => {
  const meta = await (await fetch('https://registry.npmjs.org/' + pkg.replace('/', '%2F') + '/latest')).json();
  if (!meta.dist) throw new Error('package not found: ' + pkg);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'font-'));
  const tgz = path.join(tmp, 'p.tgz');
  fs.writeFileSync(tgz, Buffer.from(await (await fetch(meta.dist.tarball)).arrayBuffer()));
  execFileSync('tar', ['-xzf', 'p.tgz'], { cwd: tmp, stdio: 'ignore', windowsHide: true });
  const files = fs.readdirSync(path.join(tmp, 'package', 'files'));
  const variable = pkg.startsWith('@fontsource-variable/');
  const rules = [];
  let bytes = 0;
  for (const sub of subsets) {
    const pick = variable
      ? files.filter(f => new RegExp(`-${sub}-wght-normal\\.woff2$`).test(f))
      : weights.map(w => files.find(f => new RegExp(`-${sub}-${w}-normal\\.woff2$`).test(f))).filter(Boolean);
    if (!pick.length) console.log(`warning: no ${sub} file in ${pkg}`);
    for (const f of pick) {
      const buf = fs.readFileSync(path.join(tmp, 'package', 'files', f));
      bytes += buf.length;
      const w = variable ? `${weights[0]} ${weights[weights.length - 1] === weights[0] ? 900 : 900}` : f.match(/-(\d{3})-normal/)[1];
      const range = sub === 'latin'
        ? 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD'
        : 'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF';
      rules.push(`@font-face{font-family:"${family}";font-style:normal;font-display:swap;font-weight:${variable ? '100 900' : w};src:url(data:font/woff2;base64,${buf.toString('base64')}) format("woff2");unicode-range:${range}}`);
    }
  }
  fs.writeFileSync(outCss, `/* ${pkg}@${meta.version}, license ${meta.license}, embedded by fontget.js */\n` + rules.join('\n') + '\n');
  console.log(`${pkg}@${meta.version} (${meta.license}): ${rules.length} faces, ${Math.round(bytes / 1024)} KB of woff2 -> ${outCss}`);
  fs.rmSync(tmp, { recursive: true, force: true });
})().catch(e => { console.error('fontget failed: ' + e.message); process.exit(1); });
