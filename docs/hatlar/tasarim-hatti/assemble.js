// Assembles tasarim.html from doc/skeleton.html by replacing include markers with file contents.
// Markers: <!--@include path-->  (HTML fragment, path relative to doc/)
//          /*@include path*/     (inside <style> or <script>, path relative to doc/)
// Usage: node assemble.js <out.html>
const fs = require('fs'), path = require('path');
const DOC = path.join(__dirname, 'doc');
let html = fs.readFileSync(path.join(DOC, 'skeleton.html'), 'utf8');
const used = [], missing = [];
const load = p => { const f = path.join(DOC, p.trim()); if (!fs.existsSync(f)) { missing.push(p.trim()); return `<!-- MISSING ${p.trim()} -->`; } used.push(p.trim()); return fs.readFileSync(f, 'utf8').replace(/^﻿/, ''); };
for (let pass = 0; pass < 3; pass++) {
  html = html.replace(/<!--@include ([^>]+?)-->/g, (_, p) => load(p)).replace(/\/\*@include ([^*]+?)\*\//g, (_, p) => load(p));
}
html = html.replace(/\r?\n/g, '\r\n');
fs.writeFileSync(process.argv[2], html);
console.log(`assembled ${process.argv[2]}: ${Math.round(html.length / 1024)} KB from ${used.length} parts${missing.length ? '; MISSING: ' + missing.join(', ') : ''}`);
if (missing.length) process.exit(1);
