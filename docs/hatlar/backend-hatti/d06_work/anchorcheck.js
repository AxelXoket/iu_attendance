// For every decided fact, recompute the nearest element id above the quote and compare with the anchor.
const fs=require('fs');
const j=JSON.parse(fs.readFileSync('../inv/D06.json','utf8'));
const cache={};
function load(f){ if(cache[f]) return cache[f];
  const html=fs.readFileSync('C:/Users/USER/Desktop/iu_attendance/'+f,'utf8');
  let text='',map=[],i=0;
  while(i<html.length){
    if(html.startsWith('<style',i)){i=html.indexOf('</style>',i)+8;text+=' ';map.push(i);continue;}
    if(html.startsWith('<script',i)){i=html.indexOf('</script>',i)+9;text+=' ';map.push(i);continue;}
    if(html[i]==='<'){const e=html.indexOf('>',i);text+=' ';map.push(i);i=e+1;continue;}
    const ents=[['&nbsp;',' '],['&amp;','&'],['&quot;','"'],['&#39;',"'"]];let hit=false;
    for(const [e,r] of ents){ if(html.startsWith(e,i)){text+=r;map.push(i);i+=e.length;hit=true;break;} }
    if(hit) continue;
    text+=html[i];map.push(i);i++;
  }
  let t='',m=[],sp=false;
  for(let k=0;k<text.length;k++){const c=text[k];if(/\s/.test(c)){if(!sp){t+=' ';m.push(map[k]);}sp=true;}else{t+=c;m.push(map[k]);sp=false;}}
  const ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(x=>({id:x[1],pos:x.index}));
  return cache[f]={t,m,ids};
}
let bad=0;
for(const d of j.decided){
  const [f,id]=d.anchor.split('#'); const L=load(f);
  const q=d.quote.replace(/\s+/g,' ').replace(/[“”]/g,'"').replace(/[‘’]/g,"'").trim();
  const p=L.t.indexOf(q); const occ=L.t.split(q).length-1;
  let best=null; for(const x of L.ids){ if(x.pos<L.m[p]) best=x; else break; }
  if(!best||best.id!==id||occ!==1){bad++;console.log(d.id,'anchor',id,'nearest',best&&best.id,'occ',occ);}
}
console.log('checked',j.decided.length,'mismatches',bad);
