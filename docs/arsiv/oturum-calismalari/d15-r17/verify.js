// Extra checks beyond the gate: every spec test name exactly once, no unknown test names, no dash chars, file list vs old.
const fs=require('fs'),path=require('path');
const B='C:/Users/USER/AppData/Local/Temp/claude/C--Users-USER-Desktop-iu-attendance/7abdd45e-faba-44fe-954e-90155d6bca30/scratchpad/r17/backend';
const f=process.argv[2]||path.join(__dirname,'D15.new.json');
const N=JSON.parse(fs.readFileSync(f,'utf8')), S=JSON.parse(fs.readFileSync(path.join(B,'spec/D15.json'),'utf8'));
const O=JSON.parse(fs.readFileSync(path.join(B,'packages/r1/D15.json'),'utf8'));
const errs=[];
const names=new Map();for(const p of N.packages)for(const t of p.tests)names.set(t,(names.get(t)||[]).concat(p.id));
for(const t of S.tests){const w=names.get(t.name);if(!w)errs.push('test missing: '+t.name);else if(w.length>1)errs.push('test twice: '+t.name+' '+w);}
const spn=new Set(S.tests.map(t=>t.name));for(const n of names.keys())if(!spn.has(n))errs.push('unknown test: '+n);
if(/[\u2013\u2014]/.test(JSON.stringify(N)))errs.push('dash');
const nf=new Set(N.packages.flatMap(p=>p.files)), of=new Set(O.packages.flatMap(p=>p.files));
console.log('files new-only:',[...nf].filter(x=>!of.has(x)).join(' '));
console.log('files old-only:',[...of].filter(x=>!nf.has(x)).join(' '));
for(const p of N.packages){ if(p.depends_on.includes(p.id))errs.push('self dep '+p.id); }
console.log(errs.length?errs.join('\n'):'tests OK ('+S.tests.length+')');
