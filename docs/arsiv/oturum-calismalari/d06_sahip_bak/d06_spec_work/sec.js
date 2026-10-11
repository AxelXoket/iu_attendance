// Print plain text of the part of a doc between id="X" and the next id="..."
const fs=require('fs');
const [doc, ...ids]=process.argv.slice(2);
const h=fs.readFileSync('C:/Users/USER/Desktop/iu_attendance/'+doc+'.html','utf8');
for (const id of ids){
  const i=h.indexOf(' id="'+id+'"'); if(i<0){console.log('NOID '+id);continue;}
  const start=h.lastIndexOf('<',i);
  let j=h.indexOf(' id="',i+5); if(j<0)j=h.length;
  const seg=h.slice(start,j);
  const txt=seg.replace(/<(script|style)[\s\S]*?<\/\1>/g,'').replace(/<br\s*\/?>/g,'\n').replace(/<\/(p|li|div|h\d|tr|summary|pre)>/g,'\n').replace(/<[^>]+>/g,'').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/\n\s*\n+/g,'\n');
  console.log('=== '+doc+'#'+id+'\n'+txt.trim()+'\n');
}
