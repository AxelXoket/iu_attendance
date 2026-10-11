const fs=require('fs');
const cache={};
function doc(d){ return cache[d] ||= fs.readFileSync('C:/Users/USER/Desktop/iu_attendance/'+d+'.html','utf8'); }
function etiket(d,id){
  const h=doc(d); const i=h.indexOf(' id="'+id+'"'); if(i<0) return null;
  const start=h.indexOf('>',i)+1;
  const seg=h.slice(start,start+600).replace(/<(script|style)[\s\S]*?<\/\1>/g,'').replace(/<\/(p|li|div|h\d|tr|summary|span|strong|b)>/g,'\n').replace(/<[^>]+>/g,'').replace(/&amp;/g,'&');
  const line=seg.split('\n').map(s=>s.trim()).find(s=>s.length>0)||id;
  return line.length>48? line.slice(0,48).replace(/\s+\S*$/,'')+'…' : line;
}
module.exports={etiket};
if (require.main===module){ for (const a of process.argv.slice(2)){ const [d,id]=a.split('#'); console.log(a,'=>',etiket(d,id)); } }
