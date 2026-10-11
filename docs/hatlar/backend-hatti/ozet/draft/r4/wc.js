// usage: node wc.js file.json -> words per paragraph, phase mentions, ids
const o=JSON.parse(require('fs').readFileSync(process.argv[2],'utf8'));
let tot=0;o.paragraflar.forEach((p,i)=>{const w=p.split(/\s+/).filter(Boolean).length;tot+=w;console.log('p'+(i+1),w);});
console.log('total',tot);
const t=o.paragraflar.join(' ');
console.log('phase mentions:',(t.match(/Aşama \d+|\d+\. aşama|sonraki aşama|önceki aşama|aşamada|aşamalarda/gi)||[]));
console.log('sentences:',t.split(/(?<=[.;])\s/).length);
