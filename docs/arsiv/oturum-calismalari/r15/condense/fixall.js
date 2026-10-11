// Applies audit fixes leniently: node fixall.js fixes.json  -> applies every entry whose "from" occurs exactly once at its turn,
// reports the rest (missing or ambiguous) without writing them. Works on out/plan.html and out/teknik.html.
const fs=require('fs');const list=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));const files={};let ok=0;const skipped=[];
for(const [i,x] of list.entries()){const f='out/'+x.file;files[f]=files[f]??fs.readFileSync(f,'utf8');const n=files[f].split(x.from).length-1;
 if(n!==1){skipped.push('#'+i+' '+(x.key||'')+' '+x.file+' found '+n+'x: '+x.from.slice(0,70).replace(/\s+/g,' '));continue}
 if(/[–—]/.test(x.to)){skipped.push('#'+i+' dash in to');continue}
 files[f]=files[f].replace(x.from,x.to);ok++}
for(const [f,s] of Object.entries(files))fs.writeFileSync(f,s);
console.log('applied',ok,'of',list.length);if(skipped.length)console.log('SKIPPED:\n'+skipped.join('\n'));
