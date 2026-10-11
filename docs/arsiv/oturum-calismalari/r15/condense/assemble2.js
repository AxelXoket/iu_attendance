// new.html = src head + units/u01..u11.out.html + src from Kaynaklar (verbatim) to end.
const fs=require('fs');
const src=fs.readFileSync('src.html','utf8');const eol=src.includes('\r\n')?'\r\n':'\n';
const i1=src.indexOf('<!-- Tek bakışta -->'),i2=src.indexOf('<!-- Kaynaklar -->');
const parts=[];for(let k=1;k<=11;k++){const f='units/u'+String(k).padStart(2,'0')+'.out.html';if(!fs.existsSync(f))throw new Error('missing '+f);parts.push(fs.readFileSync(f,'utf8').trim().replace(/\r?\n/g,eol))}
fs.writeFileSync('new.html',src.slice(0,i1)+parts.join(eol+eol)+eol+eol+src.slice(i2));console.log('new.html written');
