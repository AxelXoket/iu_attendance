// Builds new.html = src head + p1..p5 + src from Kaynaklar (verbatim) to end.
const fs=require('fs');
const src=fs.readFileSync('src.html','utf8');
const eol=src.includes('\r\n')?'\r\n':'\n';
const i1=src.indexOf('<!-- Tek bakışta -->'), i2=src.indexOf('<!-- Kaynaklar -->');
if(i1<0||i2<0) throw new Error('marker missing');
const parts=['p1','p2','p3','p4','p5'].map(p=>fs.readFileSync(p+'.html','utf8').trim().replace(/\r?\n/g,eol));
fs.writeFileSync('new.html',src.slice(0,i1)+parts.join(eol+eol)+eol+eol+src.slice(i2));
console.log('eol',JSON.stringify(eol),'written new.html');
