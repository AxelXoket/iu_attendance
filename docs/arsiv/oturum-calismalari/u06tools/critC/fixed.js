// Estimate words that no rewrite may touch: headings, labels, formula/code, verbatim messages, quoted UI strings, bkz. pointers.
const fs=require('fs');const t=fs.readFileSync(process.argv[2],'utf8');
const W=s=>s.replace(/<[^>]+>/g,' ').split(/\s+/).filter(Boolean).length;let tot=0;const out=[];
const add=(k,arr)=>{const n=arr.reduce((s,x)=>s+W(x),0);tot+=n;out.push(k+': '+n)};
add('headings+summary',[...t.matchAll(/<(h2|h3|summary)>([\s\S]*?)<\/\1>/g)].map(m=>m[2]));
add('row labels',[...t.matchAll(/<strong>([\s\S]*?)<\/strong>/g)].map(m=>m[1]));
add('formula p + inline code',[...t.matchAll(/<code>([\s\S]*?)<\/code>/g)].map(m=>m[1]).filter(x=>!x.includes('lang=')));
const ol=t.match(/<ol>([\s\S]*?)<\/ol>/)[1];
add('message list (ol, verbatim parts)',["Hakkının yarısını kullandın.","Bir ders daha kaçırırsan hakkın biter.","Bir ders daha kaçırırsan devamsız kalırsın","Hakkın kalmadı.","Hakkını aştın. Kesin durum AKSİS'te ilan edilir."]);
const body=t.replace(/<ol>[\s\S]*?<\/ol>/,'');
add('quoted UI/calendar strings',[...body.matchAll(/"([^"<>]+)"/g)].map(m=>m[1]).filter(x=>x!=='tr'));
add('bkz. pointers',[...body.matchAll(/bkz\. [^).]+/g)].map(m=>m[0]));
console.log(out.join('\n'));console.log('fixed total',tot);
