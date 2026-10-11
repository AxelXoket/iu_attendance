// Every "bkz." target part must match a heading, row label, summary or bold label: node pointers.js new.html
const fs=require('fs');const t=fs.readFileSync(process.argv[2],'utf8').replace(/<!--[\s\S]*?-->/g,'');
const strip=s=>s.replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim();const low=s=>s.toLocaleLowerCase('tr');
const labels=new Set();
for(const re of [/<h[23][^>]*>([\s\S]*?)<\/h[23]>/g,/<div class="k">([\s\S]*?)<\/div>/g,/<summary>([\s\S]*?)<\/summary>/g,/<strong>([\s\S]*?)<\/strong>/g])for(const m of t.matchAll(re)){const l=low(strip(m[1]).replace(/[:.]$/,''));if(l)labels.add(l)}
const bad=[];let n=0;
for(const m of strip(t).matchAll(/bkz\.\s*([^)]*?)(?=\)|\.\s|\.$|;)/g)){for(const part of m[1].split(/,\s*/)){n++;const p=low(part.trim());if(!p)continue;const ok=[...labels].some(l=>l===p||l.startsWith(p)||p.startsWith(l)&&l.length>3||l.includes(p));if(!ok)bad.push(part.trim())}}
console.log('pointer parts',n,'unmatched',bad.length?bad:'none');
