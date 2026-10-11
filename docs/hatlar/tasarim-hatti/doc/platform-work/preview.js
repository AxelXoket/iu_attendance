// Builds preview.html: the specimen with this fragment in place of its platform section and,
// like the planned build (fixlist 6.4), kutuphaneler right after it. Read-only use of sibling fragments.
const fs = require('fs'), path = require('path');
const design = path.join(__dirname, '..', '..');
const spec = fs.readFileSync(path.join(design, 'variants', 'A', 'specimen.html'), 'utf8');
const sections = path.join(design, 'doc', 'sections');
const frag = n => { const p = path.join(sections, n); return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : ''; };
const i = spec.indexOf('<section id="platform"');
const j = spec.indexOf('</section>', i) + '</section>'.length;
const mine = frag('platform.html').replace('{{no}}', '15');
const lib = frag('kutuphaneler.html').replace('{{no}}', '16');
fs.writeFileSync(path.join(__dirname, 'preview.html'), spec.slice(0, i) + mine + '\n' + lib + spec.slice(j));
console.log('preview.html written; kutuphaneler included:', Boolean(lib));
