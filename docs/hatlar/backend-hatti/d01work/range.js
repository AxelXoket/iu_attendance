const fs=require('fs');
const [doc,a,b]=process.argv.slice(2);
const h=fs.readFileSync('C:/Users/USER/Desktop/iu_attendance/'+doc+'.html','utf8');
const i=h.indexOf(' id="'+a+'"'); const j=b? h.indexOf(' id="'+b+'"') : h.length;
let t=h.slice(h.lastIndexOf('<',i), j>i? h.lastIndexOf('<',j): i+20000);
t=t.replace(/<div class="k">([^<]*)<\/div>/g,'\n[$1] ').replace(/<(br|\/p|\/li|\/div|\/h[1-6]|\/summary|\/tr)\s*\/?>/gi,'\n').replace(/<td[^>]*>/gi,' | ').replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/\r/g,'').replace(/\n\s*\n+/g,'\n');
console.log('=== '+doc+' '+a+' .. '+b+' len '+t.length); console.log(t);
