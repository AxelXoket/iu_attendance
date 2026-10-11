// usage: node specq.js DIR MOD kind pattern  (kind: ep|ex|job|any)
const fs=require('fs'),path=require('path');
const [D,M,kind,pat]=process.argv.slice(2);
const s=JSON.parse(fs.readFileSync(path.join(D,'spec',M+'.json'),'utf8'));
const re=new RegExp(pat);
const out=[];
if(kind==='ep'||kind==='any') for(const e of s.endpoints||[]) if(re.test(e.method+' '+e.path)) out.push(e);
if(kind==='ex'||kind==='any') for(const e of s.exports||[]) if(re.test(e.name)) out.push(e);
if(kind==='job'||kind==='any') for(const e of s.jobs||[]) if(re.test(e.name)) out.push(e);
console.log(JSON.stringify(out,null,1));
