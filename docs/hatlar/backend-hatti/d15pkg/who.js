const fs=require('fs'), path=require('path');
const S=path.join(__dirname,'..','spec');
const names=require(path.join(S,'D15.json')).exports.map(e=>e.name);
for (const f of fs.readdirSync(S)) {
  if(!/^D\d\d\.json$/.test(f)||f==='D15.json') continue;
  const t=fs.readFileSync(path.join(S,f),'utf8');
  const hits=names.filter(n=>new RegExp('(^|[^A-Za-z0-9_])'+n+'([^A-Za-z0-9_]|$)').test(t));
  if(hits.length) console.log(f, hits.join(', '));
}
