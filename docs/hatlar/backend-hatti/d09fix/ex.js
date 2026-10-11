const fs=require('fs');const names=process.argv.slice(2);
for(const f of fs.readdirSync(__dirname+'/../spec')){if(!/^D\d+\.json$/.test(f))continue;const S=JSON.parse(fs.readFileSync(__dirname+'/../spec/'+f,'utf8').replace(/^\uFEFF/,''));
for(const x of S.exports||[]){if(names.some(n=>x.name.includes(n)||(x.signature||'').includes(n+'(')))console.log('['+f+'] '+x.name+'\n  SIG: '+x.signature+'\n  '+x.purpose+'\n');}}
