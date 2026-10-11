const s=require('../spec/D15.json');
const txt=JSON.stringify(s);
const want=process.argv.slice(2);
for (const f of s.files) {
  const b=f.split('/').pop();
  if (want.length && !want.some(w=>f.includes(w))) continue;
  let i=txt.indexOf(b), c=0, out=[];
  while(i>=0 && c<4){ out.push(txt.slice(Math.max(0,i-200),i+250)); i=txt.indexOf(b,i+b.length+250); c++; }
  const n=txt.split(b).length-1;
  console.log('## '+f+' ('+n+')'); for (const o of out) console.log('  ~ '+o);
}
