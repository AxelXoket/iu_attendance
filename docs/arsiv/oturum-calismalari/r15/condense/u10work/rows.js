// Per-row word counts: node rows.js in.html [out.html]
const fs=require('fs');
const f=process.argv.slice(2).map(p=>fs.readFileSync(p,'utf8'));
const ent=s=>s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/&quot;/g,'"');
const w=s=>ent(s.replace(/<!--[\s\S]*?-->/g,'').replace(/<[^>]+>/g,'\n')).split(/\s+/).filter(Boolean).length;
const units=s=>{const out=[];const re=/<summary>([\s\S]*?)<\/summary>|<div class="row"><div class="k">([\s\S]*?)<\/div><div>([\s\S]*?)<\/div><\/div>|<h3>([\s\S]*?)<\/h3>|<li>([\s\S]*?)<\/li>/g;let m;while((m=re.exec(s))){if(m[1])out.push(['S',m[1],0]);else if(m[2]!==undefined)out.push(['R',m[2],w(m[3])]);else if(m[4])out.push(['H',m[4],0]);else out.push(['L',m[5].slice(0,40).replace(/<[^>]+>/g,''),w(m[5])])}return out};
const a=units(f[0]),b=f[1]?units(f[1]):null;let ta=0,tb=0;
a.forEach((x,i)=>{ta+=x[2];let line=x[0]+' '+String(x[2]).padStart(4);if(b){const y=b[i];tb+=y?y[2]:0;line+=' -> '+String(y?y[2]:'?').padStart(4)+(x[2]?' '+(100*(y[2])/x[2]).toFixed(0)+'%':'')+(y&&y[1].slice(0,20)!==x[1].slice(0,20)&&x[0]!=='L'?' LABEL MISMATCH':'')}console.log(line+'  '+x[1])});
console.log('rows total',ta,b?'-> '+tb:'');
