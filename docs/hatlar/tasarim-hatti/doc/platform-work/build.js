// Splices the generated progressive enhancement table into the fragment source and writes doc/sections/platform.html.
const fs = require('fs'), path = require('path');
const { execFileSync } = require('child_process');
const here = __dirname;
const table = execFileSync(process.execPath, [path.join(here, 'pe.js')], { encoding: 'utf8' }).trimEnd();
const src = fs.readFileSync(path.join(here, 'platform.src.html'), 'utf8');
const marker = '<!--PE-->';
if (src.split(marker).length !== 2) throw new Error('marker must occur exactly once');
const out = src.replace(marker, table);
const dest = path.join(here, '..', 'sections', 'platform.html');
fs.writeFileSync(dest, out);
fs.writeFileSync(path.join(here, 'pe-table.html'), table + '\n');
console.log('wrote', dest, out.length, 'bytes');
