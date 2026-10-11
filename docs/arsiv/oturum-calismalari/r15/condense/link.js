// Turns every "bkz. X[, Y]" in out/plan.html and out/teknik.html into a link to its target; adds ids to targets.
// node link.js [--write]   (without --write: prints the mapping only)
const fs=require('fs');const W=process.argv.includes('--write');
const F={plan:fs.readFileSync('out/plan.html','utf8'),teknik:fs.readFileSync('out/teknik.html','utf8')};const FN={plan:'plan.html',teknik:'teknik.html'};
const low=s=>s.toLocaleLowerCase('tr');
const norm=s=>low(s.replace(/<[^>]+>/g,'').replace(/[?:.\s]+$/,'').replace(/\s+/g,' ').trim());
const slug=s=>low(s).replace(/ç/g,'c').replace(/ğ/g,'g').replace(/ı/g,'i').replace(/ö/g,'o').replace(/ş/g,'s').replace(/ü/g,'u').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const OVR={ // pointer last part -> [file, section] when the label alone is ambiguous
 'gönderme':['plan','kararlar'],'testler':['teknik','testler'],'sürdürülebilirlik':['plan','teknoloji'],'hedefler':['plan','hedefler'],
 'aşama 2':['plan','asama23'],'aşama 3':['plan','asama23'],'dağıtım':['plan','dagitim'],'altyapı':['teknik','altyapi'],'devamsızlık':['plan','devam']};
function elements(f){const s=F[f],out=[];
 const secAt=p=>{const i=s.lastIndexOf('<section id="',p);return i<0?'':s.slice(i+13,s.indexOf('"',i+13))};
 const add=(kind,label,at,hasId)=>out.push({f,kind,label:norm(label),at,sec:secAt(at),hasId});
 for(const m of s.matchAll(/<section id="([^"]+)">\s*<h2>([\s\S]*?)<\/h2>/g))out.push({f,kind:'h2',label:norm(m[2]),at:m.index,sec:m[1],id:m[1]});
 for(const m of s.matchAll(/<h3( id="[^"]*")?>([\s\S]*?)<\/h3>/g))add('h3',m[2],m.index,!!m[1]);
 for(const m of s.matchAll(/<div class="row"( id="[^"]*")?><div class="k">([\s\S]*?)<\/div>/g))add('row',m[2],m.index,!!m[1]);
 for(const m of s.matchAll(/<li( id="[^"]*")?><strong>([^<]*?)<\/strong>/g))add('li',m[2],m.index,!!m[1]);
 for(const m of s.matchAll(/<p( id="[^"]*")?><strong>([^<]*?)<\/strong>/g))add('p',m[2],m.index,!!m[1]);
 for(const m of s.matchAll(/<details( id="[^"]*")?>\s*<summary>([^<]*)<\/summary>/g))add('details',m[2],m.index,!!m[1]);
 const ic=s.indexOf('<li>İkinci çapa');if(ic>=0)out.push({f,kind:'li',label:'ikinci çapa',at:ic,sec:secAt(ic)});
 return out}
const EL=[...elements('plan'),...elements('teknik')];
const score=(l,p)=>l===p?2:(l.startsWith(p)&&/^[\s:(·,]/.test(l.slice(p.length)))?1:0;
function resolve(text,from){const parts=text.split(/,\s*/).map(norm).filter(Boolean),last=parts[parts.length-1];
 let c=EL.filter(e=>score(e.label,last));
 if(OVR[last])c=c.filter(e=>e.f===OVR[last][0]&&e.sec===OVR[last][1]&&(e.kind==='h2'||parts.length>1||e.kind!=='row'||true));
 if(parts.length>1){const sc=EL.filter(e=>score(e.label,parts[0]));const ok=c.filter(e=>sc.some(s=>s.f===e.f&&s.sec===e.sec));if(ok.length)c=ok}
 if(c.length>1){const x=c.filter(e=>score(e.label,last)===2);if(x.length)c=x}
 if(c.length>1){const x=c.filter(e=>e.sec!=='sozluk');if(x.length)c=x}
 if(c.length>1){const x=c.filter(e=>e.kind==='h2');if(x.length)c=x}
 if(c.length>1){const x=c.filter(e=>e.f===from);if(x.length)c=x}
 return c}
const edits={plan:[],teknik:[]},used={plan:new Set(),teknik:new Set()};let bad=0;const table=[];
for(const f of ['plan','teknik'])for(const m of F[f].matchAll(/<[^>]*>|[^<]+/g))used[f];// noop
for(const f of ['plan','teknik']){const s=F[f];
 for(const m of s.matchAll(/id="([^"]+)"/g))used[f].add(m[1]);}
for(const f of ['plan','teknik']){const s=F[f];
 for(const m of s.matchAll(/bkz\.\s+([^<>();]*?)(?=\)|;|\.(?=\s|<|$)|<|$)/g)){
  const text=m[1].trim(),pos=m.index+m[0].indexOf(text);const DIR={'benzer sistemler':['plan','benzer']}[norm(text)];const c=DIR?EL.filter(e=>e.f===DIR[0]&&e.kind==='h2'&&e.sec===DIR[1]):resolve(text,f);
  if(c.length!==1){bad++;table.push('AMBIGUOUS '+f+' "'+text+'" -> '+c.map(e=>e.f+':'+e.sec+':'+e.kind+':'+e.label).join(' | '));continue}
  const t=c[0];if(!t.id){const base=t.sec+'-'+slug(norm(text).split(/,\s*/).pop());let id=base,k=2;while(used[t.f].has(id)&&!t.idAssigned)id=base+'-'+k++;if(!t.idAssigned){t.id=id;t.idAssigned=true;used[t.f].add(id);if(!t.hasId)edits[t.f].push({at:t.at,kind:t.kind,id})}}
  const href=(t.f===f?'':FN[t.f])+'#'+t.id;edits[f].push({at:pos,len:text.length,wrap:'<a href="'+href+'">'+text+'</a>'});
  table.push(f.padEnd(6)+' "'+text+'" -> '+href)}}
console.log(table.join('\n'));console.log('pointers',table.length,'ambiguous',bad);
if(W&&!bad){for(const f of ['plan','teknik']){let s=F[f];
 for(const e of edits[f].sort((a,b)=>b.at-a.at)){if(e.wrap){s=s.slice(0,e.at)+e.wrap+s.slice(e.at+e.len)}else{const tag={row:'<div class="row"',h3:'<h3',li:'<li',p:'<p',details:'<details'}[e.kind];if(!s.startsWith(tag,e.at))throw new Error('tag mismatch '+e.kind+' at '+e.at);s=s.slice(0,e.at)+tag+' id="'+e.id+'"'+s.slice(e.at+tag.length)}}
 fs.writeFileSync('out/'+FN[f],s)}console.log('written')}
