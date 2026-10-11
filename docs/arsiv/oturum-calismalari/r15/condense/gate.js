// Deterministic no-loss gate: node gate.js src.html new.html
const fs=require('fs');
const [A,B]=process.argv.slice(2).map(f=>fs.readFileSync(f,'utf8'));
const body=s=>s.replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>|<!--[\s\S]*?-->/g,'');
const ent=s=>s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/&quot;/g,'"');
const text=s=>ent(body(s).replace(/<[^>]+>/g,'\n')).replace(/[ \t]+/g,' ');
const words=s=>text(s).split(/\s+/).filter(Boolean).length;
const tA=text(A), tB=text(B), lB=tB.toLocaleLowerCase('tr');
let fail=0; const rep=(name,miss)=>{console.log(name+':',miss.length?('MISSING '+miss.length+' -> '+miss.slice(0,60).join(' | ')):'ok'); if(miss.length) fail++;};
// 1 tag balance
const tags=['div','ul','ol','li','details','summary','section','p','pre','code','a','strong','span','h2','h3'];
const bad=[];for(const g of tags){const o=B.split('<'+g+'>').length-1+B.split('<'+g+' ').length-1;const c=B.split('</'+g+'>').length-1;if(o!==c)bad.push(g+' '+o+'/'+c)}
rep('tag balance',bad);
// 2 anchors resolve, 3 ids kept, 4 hrefs kept
const ids=s=>new Set([...s.matchAll(/id="([^"]+)"/g)].map(m=>m[1]));
const idB=ids(B); rep('anchors',[...B.matchAll(/href="#([^"]+)"/g)].map(m=>m[1]).filter(x=>!idB.has(x)));
rep('ids kept',[...ids(A)].filter(x=>!idB.has(x)));
const hrefs=s=>new Set([...s.matchAll(/href="([^"]+)"/g)].map(m=>m[1]));
const hB=hrefs(B); rep('hrefs kept',[...hrefs(A)].filter(x=>!hB.has(x)));
// 5 code tokens kept
const codes=s=>new Set([...body(s).matchAll(/<code>([\s\S]*?)<\/code>/g)].map(m=>ent(m[1]).replace(/\s+/g,' ').trim()));
const cB=codes(B); rep('code kept',[...codes(A)].filter(x=>!cB.has(x)));
// 6 numbers kept
const nums=t=>new Set(t.match(/\d+(?:[.,]\d+)*/g)||[]);
const nB=nums(tB); rep('numbers kept',[...nums(tA)].filter(x=>!nB.has(x)));
// 7 technical tokens kept (camel/upper, digits, internal @/._+-)
const stem=w=>w.replace(/[’'].*$/,'').replace(/^[("“"«]+|[)"”»,.;:!?]+$/g,'');
const tech=t=>new Set(t.split(/\s+/).map(stem).filter(w=>w.length>1&&(/^.+\p{Lu}/u.test(w)||/\d/.test(w)&&/\p{L}/u.test(w)||/\p{L}[@\/._+-]\p{L}|^@/u.test(w))));
rep('tech tokens kept',[...tech(tA)].filter(w=>!tB.includes(w)));
// 8 proper nouns kept (capitalised, not sentence or element start)
const proper=t=>{const s=new Set();for(const sen of t.split(/[.!?:;]\s+|\n/)){const ws=sen.trim().split(/\s+/);for(let i=1;i<ws.length;i++){const w=stem(ws[i]);if(/^\p{Lu}\p{Ll}+$/u.test(w))s.add(w)}}return s};
rep('proper nouns kept',[...proper(tA)].filter(w=>!tB.includes(w)));
// 9 dashes
rep('no en/em dash',[...B].filter(c=>c==='–'||c==='—'));
// 10 content words: report only (noisy)
const cw=t=>new Set(t.toLocaleLowerCase('tr').match(/\p{L}{6,}/gu)||[]);
const lost=[...cw(tA)].filter(w=>!lB.includes(w)); fs.writeFileSync('lostwords.txt',lost.join('\n'));
console.log('content words of src not in new (review, noisy):',lost.length,'-> lostwords.txt');
// word counts
const sec=s=>Object.fromEntries([...s.matchAll(/<section id="([^"]+)">([\s\S]*?)<\/section>/g)].map(m=>[m[1],words(m[2])]));
const sA=sec(A),sB=sec(B);
for(const k of Object.keys(sA))console.log(k.padEnd(12),String(sA[k]).padStart(5),'->',String(sB[k]??'GONE').padStart(5),sB[k]?((100*(sB[k]-sA[k])/sA[k]).toFixed(0)+'%'):'');
console.log('TOTAL words',words(A),'->',words(B),((100*(words(B)-words(A))/words(A)).toFixed(1))+'%','| gate',fail?'FAIL ('+fail+')':'PASS');
