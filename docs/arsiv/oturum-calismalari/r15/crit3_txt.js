const fs=require('fs');
function txt(s){
  s=s.replace(/<style[\s\S]*?<\/style>/g,'').replace(/<script[\s\S]*?<\/script>/g,'');
  s=s.replace(/<(section|h[1-6]|div class="row"|li|p|tr|summary|details|table)\b([^>]*)>/g,(m,tag,attrs)=>{const id=(attrs.match(/id="([^"]+)"/)||(m.match(/id="([^"]+)"/))||[])[1];return '\n'+(id?'{#'+id+'} ':'')+'';});
  s=s.replace(/<div class="row" id="([^"]+)">/g,'\n{#$1} ');
  s=s.replace(/<a href="([^"]+)">/g,'[->$1 ');
  s=s.replace(/<\/a>/g,']');
  s=s.replace(/<div class="k">/g,'K: ').replace(/<\/div><div>/g,' | ');
  s=s.replace(/<[^>]+>/g,'');
  s=s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/&quot;/g,'"');
  s=s.replace(/[ \t]+/g,' ').replace(/\r/g,'').replace(/\n\s*\n+/g,'\n');
  return s;
}
for(const [a,b] of [['out/plan.html','../c3_plan.txt'],['out/teknik.html','../c3_teknik.txt'],['snap/plan.r2.html','../c3_plan0.txt'],['snap/teknik.r2.html','../c3_teknik0.txt']]) fs.writeFileSync(b,txt(fs.readFileSync(a,'utf8')));
