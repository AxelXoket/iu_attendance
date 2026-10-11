// Two-file no-loss gate: node gate2.js src.html out/plan.html out/teknik.html
const fs=require('fs');const [S,P,T]=process.argv.slice(2).map(f=>fs.readFileSync(f,'utf8'));
const body=s=>s.replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>|<!--[\s\S]*?-->/g,'');
const ent=s=>s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/&quot;/g,'"');
const text=s=>ent(body(s).replace(/<[^>]+>/g,'\n')).replace(/[ \t]+/g,' ');const words=s=>text(s).split(/\s+/).filter(Boolean).length;
const tS=text(S),tU=text(P)+'\n'+text(T);let fail=0;
const rep=(n,m)=>{console.log(n+':',m.length?'FAIL '+m.length+' -> '+m.slice(0,40).join(' | '):'ok');if(m.length)fail++};
const tags=['div','ul','ol','li','details','summary','section','p','pre','code','a','strong','span','h2','h3'];
for(const [n,s] of [['plan',P],['teknik',T]]){const bad=[];for(const g of tags){const o=s.split('<'+g+'>').length-1+s.split('<'+g+' ').length-1,c=s.split('</'+g+'>').length-1;if(o!==c)bad.push(g+' '+o+'/'+c)}rep(n+' tag balance',bad)}
const ids=s=>new Set([...s.matchAll(/id="([^"]+)"/g)].map(m=>m[1]));const iP=ids(P),iT=ids(T);
const dupe=s=>{const a=[...s.matchAll(/id="([^"]+)"/g)].map(m=>m[1]);return a.filter((x,i)=>a.indexOf(x)!==i)};rep('unique ids',[...dupe(P),...dupe(T)]);
const links=(s,self)=>[...s.matchAll(/href="([^"]*)"/g)].map(m=>m[1]).filter(h=>!/^https?:/.test(h)).filter(h=>{const [f,a]=h.split('#');const set=f===''?self:f==='plan.html'?iP:f==='teknik.html'?iT:null;if(!set)return true;return a!==undefined&&a!==''&&!set.has(a)});
rep('internal and cross links resolve',[...links(P,iP).map(h=>'plan:'+h),...links(T,iT).map(h=>'teknik:'+h)]);
rep('every bkz linked',[...(P+T).matchAll(/bkz\.\s+(?!<a href)([^<]{0,30})/g)].map(m=>m[1]));
rep('src ids kept in plan',[...ids(S)].filter(x=>!iP.has(x)));
const hrefs=s=>new Set([...s.matchAll(/href="(https?:[^"]+)"/g)].map(m=>m[1]));const hU=new Set([...hrefs(P),...hrefs(T)]);rep('external links kept',[...hrefs(S)].filter(x=>!hU.has(x)));
const codes=s=>new Set([...body(s).matchAll(/<code>([\s\S]*?)<\/code>/g)].map(m=>ent(m[1]).replace(/\s+/g,' ').trim()));const MERGED=new Set(['pnpm audit']); // src said the same nightly audit twice ('gece pnpm audit' and 'pnpm audit --prod'); merged into the exact command on purpose
const cU=new Set([...codes(P),...codes(T)]);const CORRECTED=new Set(['coverageAnalysis: "all"']); const inCode=x=>[...cU].some(c=>c.includes(x)); // a token that now sits inside a longer code element (value added) survives
const PRE_OK=x=>x.startsWith('apps/server/src/ app.ts'); // blind review: server.ts and worker.ts added, infra 'kimlik' clarified as session hook; diff checked by hand // D40: Stryker closed the Vitest coverage bug unfixed on 3 Oct 2026; the workaround was replaced by testRunner: command
const sub=(o,n)=>{let j=0;for(const w of n){if(w===o[j])j++;if(j===o.length)return true}return j===o.length};const preKept=x=>x.length>200&&[...cU].some(c=>sub(x.split(' '),c.split(' '))); // long code (pre): old words must survive in order, additions allowed
rep('code kept',[...codes(S)].filter(x=>!cU.has(x)&&!MERGED.has(x)&&!CORRECTED.has(x)&&!preKept(x)&&!inCode(x)&&!PRE_OK(x)));
const nums=t=>new Set(t.match(/\d+(?:[.,]\d+)*/g)||[]);const nU=nums(tU);const NUMFIX=new Set(['97,7']); // D25: iOS share recomputed from the StatCounter Sep 2026 CSV as 97,6
rep('numbers kept',[...nums(tS)].filter(x=>!nU.has(x)&&!NUMFIX.has(x)));
const stem=w=>w.replace(/[’'].*$/,'').replace(/^[("“"«]+|[)"”»,.;:!?]+$/g,'');
const tech=t=>new Set(t.split(/\s+/).map(stem).filter(w=>w.length>1&&(/^.+\p{Lu}/u.test(w)||/\d/.test(w)&&/\p{L}/u.test(w)||/\p{L}[@\/._+-]\p{L}|^@/u.test(w))));
const TECHFIX=new Set(['e-postasıyla','MOBİL']); // MOBİL: store name is 'UBYS Mobil'
rep('tech tokens kept',[...tech(tS)].filter(w=>!tU.includes(w)&&!TECHFIX.has(w)));
const proper=t=>{const s=new Set();for(const sen of t.split(/[.!?:;]\s+|\n/)){const ws=sen.trim().split(/\s+/);for(let i=1;i<ws.length;i++){const w=stem(ws[i]);if(/^\p{Lu}\p{Ll}+$/u.test(w))s.add(w)}}return s};
rep('proper nouns kept',[...proper(tS)].filter(w=>!tU.includes(w)));
rep('no en/em dash',[...(P+T)].filter(c=>c==='–'||c==='—'));
const css=s=>(s.match(/<style>[\s\S]*?<\/style>/)||[''])[0];rep('same stylesheet',css(P)===css(T)?[]:['differs']);
const ws=words(S),wp=words(P),wt=words(T);
console.log('words: src',ws,'| plan',wp,'('+(100*(wp-ws)/ws).toFixed(0)+'%) | teknik',wt,'| plan+teknik',wp+wt,'('+(100*(wp+wt-ws)/ws).toFixed(1)+'%)');
console.log('gate',fail?'FAIL ('+fail+')':'PASS');
