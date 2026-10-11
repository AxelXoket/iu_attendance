// Structural identity: tag sequence (minus code/strong), attributes, row labels, summaries, headings, comments, pre blocks.
const fs=require('fs');const [a,b]=process.argv.slice(2).map(f=>fs.readFileSync(f,'utf8'));
const seq=s=>[...s.matchAll(/<\/?([a-z0-9]+)([^>]*)>/g)].filter(m=>!['code','strong'].includes(m[1])).map(m=>m[0]);
const lab=s=>[...s.matchAll(/<div class="k">([^<]*)<\/div>/g)].map(m=>m[1]);
const hd=s=>[...s.matchAll(/<(h2|h3|summary)>([\s\S]*?)<\/\1>/g)].map(m=>m[0]);
const com=s=>s.match(/<!--[\s\S]*?-->/g)||[];
const pre=s=>s.match(/<pre[\s\S]*?<\/pre>/g)||[];
const same=(n,x,y)=>{const ok=JSON.stringify(x)===JSON.stringify(y);console.log(n.padEnd(14),ok?'same':'DIFF',x.length,y.length);if(!ok){for(let i=0;i<Math.max(x.length,y.length);i++)if(x[i]!==y[i]){console.log('  first diff at',i,JSON.stringify(x[i]),JSON.stringify(y[i]));break}}};
same('tag sequence',seq(a),seq(b));same('row labels',lab(a),lab(b));same('headings',hd(a),hd(b));same('comments',com(a),com(b));same('pre blocks',pre(a),pre(b));
const ozet=s=>s.split('<h3>Özet</h3>')[1].split('</div>\n\n')[0];console.log('Özet block    ',ozet(a)===ozet(b)?'byte-identical':'DIFF');
