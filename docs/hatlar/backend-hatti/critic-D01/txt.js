// Usage: node txt.js file.html startLine endLine -> prints stripped text for the line range
const fs=require('fs');
const [,,file,a,b]=process.argv;
const lines=fs.readFileSync(file,'utf8').split(/\r?\n/);
const s=+a, e=+b;
for(let i=s;i<=e && i<=lines.length;i++){
  let t=lines[i-1];
  const ids=[...t.matchAll(/id="([^"]+)"/g)].map(m=>m[1]);
  t=t.replace(/<br\s*\/?>/g,' ').replace(/<\/(p|li|tr|h\d|div|section)>/g,'\n').replace(/<[^>]+>/g,'').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'");
  t=t.split('\n').map(x=>x.trim()).filter(Boolean).join('\n    ');
  if(t||ids.length) console.log(i+(ids.length?' ['+ids.join(',')+']':'')+': '+t);
}
