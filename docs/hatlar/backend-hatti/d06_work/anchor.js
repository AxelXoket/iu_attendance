// Usage: node anchor.js <file> "<quote>" ... : prints nearest id above each quote's first occurrence
const fs=require('fs');
const f=process.argv[2];
const html=fs.readFileSync('C:/Users/USER/Desktop/iu_attendance/'+f,'utf8');
// build text with offset map: strip style/script, tags -> space, entities, collapse whitespace
let text='', map=[]; let i=0;
const skip=(re)=>{};
while(i<html.length){
  if(html.startsWith('<style',i)){const e=html.indexOf('</style>',i);i=e+8;text+=' ';map.push(i);continue;}
  if(html.startsWith('<script',i)){const e=html.indexOf('</script>',i);i=e+9;text+=' ';map.push(i);continue;}
  if(html[i]==='<'){const e=html.indexOf('>',i);text+=' ';map.push(i);i=e+1;continue;}
  if(html.startsWith('&nbsp;',i)){text+=' ';map.push(i);i+=6;continue;}
  if(html.startsWith('&amp;',i)){text+='&';map.push(i);i+=5;continue;}
  if(html.startsWith('&quot;',i)){text+='"';map.push(i);i+=6;continue;}
  if(html.startsWith('&#39;',i)){text+="'";map.push(i);i+=5;continue;}
  text+=html[i];map.push(i);i++;
}
// collapse whitespace keeping map
let t2='',m2=[];let prevSpace=false;
for(let k=0;k<text.length;k++){const c=text[k];if(/\s/.test(c)){if(!prevSpace){t2+=' ';m2.push(map[k]);}prevSpace=true;}else{t2+=c;m2.push(map[k]);prevSpace=false;}}
const ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(m=>({id:m[1],pos:m.index}));
for(const q of process.argv.slice(3)){
  const nq=q.replace(/\s+/g,' ').replace(/[“”]/g,'"').replace(/[‘’]/g,"'").trim();
  const p=t2.indexOf(nq);
  if(p<0){console.log('NOT FOUND: '+q.slice(0,70));continue;}
  const hp=m2[p];
  let best=null;for(const x of ids){if(x.pos<hp)best=x;else break;}
  const count=t2.split(nq).length-1;
  console.log((best?best.id:'(none)')+'  | occurrences='+count+' | '+q.slice(0,70));
}
