// Fragment gate: node secgate.js in.html out.html
// PASS needs: same tag structure counts, every number, <code>, href, technical token and proper noun of IN present in OUT, no en/em dash.
const fs=require('fs');
const [A,B]=process.argv.slice(2).map(f=>fs.readFileSync(f,'utf8'));
const body=s=>s.replace(/<!--[\s\S]*?-->/g,'');
const ent=s=>s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/&quot;/g,'"');
const text=s=>ent(body(s).replace(/<[^>]+>/g,'\n')).replace(/[ \t]+/g,' ');
const words=s=>text(s).split(/\s+/).filter(Boolean).length;
const tA=text(A),tB=text(B);let fail=0;
const rep=(n,m)=>{console.log(n+':',m.length?'MISSING '+m.length+' -> '+m.slice(0,40).join(' | '):'ok');if(m.length)fail++};
const tags=['div','ul','ol','li','details','summary','section','p','pre','code','a','strong','span','h2','h3'];
const cnt=(s,g)=>(s.split('<'+g+'>').length-1+s.split('<'+g+' ').length-1)+'/'+(s.split('</'+g+'>').length-1);
rep('same tag counts',tags.filter(g=>g!=='code'&&g!=='strong'&&cnt(A,g)!==cnt(B,g)).map(g=>g+' in '+cnt(A,g)+' out '+cnt(B,g)));
const codes=s=>new Set([...body(s).matchAll(/<code>([\s\S]*?)<\/code>/g)].map(m=>ent(m[1]).replace(/\s+/g,' ').trim()));
const cB=codes(B);rep('code kept',[...codes(A)].filter(x=>!cB.has(x)));
const hrefs=s=>new Set([...s.matchAll(/href="([^"]+)"/g)].map(m=>m[1]));const hB=hrefs(B);rep('hrefs kept',[...hrefs(A)].filter(x=>!hB.has(x)));
const nums=t=>new Set(t.match(/\d+(?:[.,]\d+)*/g)||[]);const nB=nums(tB);rep('numbers kept',[...nums(tA)].filter(x=>!nB.has(x)));
const stem=w=>w.replace(/[’'].*$/,'').replace(/^[("“"«]+|[)"”»,.;:!?]+$/g,'');
const tech=t=>new Set(t.split(/\s+/).map(stem).filter(w=>w.length>1&&(/^.+\p{Lu}/u.test(w)||/\d/.test(w)&&/\p{L}/u.test(w)||/\p{L}[@\/._+-]\p{L}|^@/u.test(w))));
rep('tech tokens kept',[...tech(tA)].filter(w=>!tB.includes(w)));
const proper=t=>{const s=new Set();for(const sen of t.split(/[.!?:;]\s+|\n/)){const ws=sen.trim().split(/\s+/);for(let i=1;i<ws.length;i++){const w=stem(ws[i]);if(/^\p{Lu}\p{Ll}+$/u.test(w))s.add(w)}}return s};
rep('proper nouns kept',[...proper(tA)].filter(w=>!tB.includes(w)));
rep('no en/em dash',[...B].filter(c=>c==='–'||c==='—'));
const wa=words(A),wb=words(B);
console.log('words',wa,'->',wb,'ratio',(wb/wa).toFixed(2),'| gate',fail?'FAIL':'PASS');
