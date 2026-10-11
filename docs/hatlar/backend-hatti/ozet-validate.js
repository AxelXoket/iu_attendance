// Gate for one phase summary: ozet/asama-NN.json = { asama, baslik, paragraflar: [one or two strings] }.
// Usage: node ozet-validate.js 7   |   node ozet-validate.js --all
const fs = require('fs'), path = require('path');
const D = __dirname;
const phases = JSON.parse(fs.readFileSync(path.join(D, 'ozet', 'asamalar.json'), 'utf8'));
const pad = n => String(n).padStart(2, '0');
const check = n => {
  const errs = [];
  const f = path.join(D, 'ozet', `asama-${pad(n)}.json`);
  if (!fs.existsSync(f)) return [`asama-${pad(n)}.json missing`];
  let o; try { o = JSON.parse(fs.readFileSync(f, 'utf8').replace(/^﻿/, '')); } catch (e) { return ['not JSON: ' + e.message]; }
  if (o.asama !== n) errs.push('asama must be ' + n);
  if (typeof o.baslik !== 'string' || o.baslik.split(/\s+/).length < 2 || o.baslik.split(/\s+/).length > 8) errs.push('baslik: 2 to 8 words');
  const ps = o.paragraflar;
  if (!Array.isArray(ps) || ps.length < 1 || ps.length > 2) errs.push('paragraflar: one or two paragraphs');
  const text = [o.baslik, ...(ps || [])].join(' ');
  const words = (ps || []).join(' ').split(/\s+/).filter(Boolean).length;
  if (words < 100 || words > 320) errs.push(`paragraflar: ${words} words, keep 100 to 320`);
  for (const p of ps || []) if (/<|>|\n/.test(p)) errs.push('plain text only: no markup, no line breaks');
  if (/[–—]/.test(text)) errs.push('contains U+2013 or U+2014');
  if (/sahi[pb]/i.test(text)) errs.push('contains the sahip stem');
  if (/\b(kullanıcı|onayınız|istendi)\b/i.test(text)) errs.push('no third-person or addressing words (kullanıcı, onayınız, istendi)');
  const ids = new Set(phases[n - 1].paketler.map(p => p.id));
  for (const m of text.matchAll(/D\d\d-P\d\d/g)) if (!ids.has(m[0])) errs.push(`names ${m[0]}, which is not in phase ${n}`);
  const missing = [...ids].filter(id => !text.includes(id));
  if (missing.length) errs.push(`every package of the phase must be named at least once; missing ${missing.join(', ')}`);
  return errs;
};
const list = process.argv[2] === '--all' ? phases.map(p => p.asama) : [Number(process.argv[2])];
let bad = 0;
for (const n of list) { const e = check(n); if (e.length) { bad++; console.log(`phase ${n}: ` + e.join('; ')); } }
if (bad) { console.log('ERRORS in ' + bad + ' phase(s)'); process.exit(1); }
console.log('OK ' + list.length + ' phase summar' + (list.length > 1 ? 'ies' : 'y'));
