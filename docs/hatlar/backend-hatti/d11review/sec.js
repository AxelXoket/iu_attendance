// usage: node sec.js <file> <id> [<id>...]  -> prints text of element with id until next element with id of same or higher heading level (approx: until next id= in a heading or section)
const fs=require('fs');
const [,,file,...ids]=process.argv;
const html=fs.readFileSync(file,'utf8');
function strip(s){return s.replace(/<script[\s\S]*?<\/script>/g,'').replace(/<style[\s\S]*?<\/style>/g,'').replace(/<br\s*\/?>/g,'\n').replace(/<\/(p|li|tr|h\d|div|pre|summary)>/g,'\n').replace(/<[^>]+>/g,'').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').replace(/\n{3,}/g,'\n\n');}
// collect positions of all id= attributes
const re=/<(\w+)[^>]*\sid="([^"]+)"[^>]*>/g; let m; const pos=[];
while((m=re.exec(html))){pos.push({tag:m[1],id:m[2],i:m.index});}
for(const id of ids){
  const k=pos.findIndex(p=>p.id===id);
  if(k<0){console.log('### '+id+' NOT FOUND');continue;}
  // end = next id whose tag is section/h2/h3/h4 (anything with id)
  const end = k+1<pos.length?pos[k+1].i:html.length;
  console.log('### '+id+'\n'+strip(html.slice(pos[k].i,end)).trim()+'\n');
}
