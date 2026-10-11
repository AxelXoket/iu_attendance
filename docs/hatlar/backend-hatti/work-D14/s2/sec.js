// Print the text of the element with the given id from plan/teknik/tasarim.html (tags stripped), up to the next element with an id of same or higher level.
const fs=require('fs');
const [doc,id,max]=process.argv.slice(2);
const html=fs.readFileSync('C:/Users/USER/Desktop/iu_attendance/'+doc+'.html','utf8');
const i=html.indexOf(' id="'+id+'"');
if(i<0){console.log('NOT FOUND',id);process.exit(1);}
const start=html.lastIndexOf('<',i);
const tag=html.slice(start+1).match(/^[a-z0-9]+/)[0];
// find matching close tag by counting
let depth=0,pos=start,re=new RegExp("<(/?)"+tag+"(?=[ >])[^>]*>","g");re.lastIndex=start;let m,end=html.length;
while((m=re.exec(html))){ if(m[1]) {depth--; if(depth===0){end=m.index+m[0].length;break;}} else depth++; }
let t=html.slice(start,end).replace(/<(script|style)[\s\S]*?<\/\1>/g,'').replace(/<br\s*\/?>/g,'\n').replace(/<\/(p|li|div|h\d|tr|summary)>/g,'\n').replace(/<[^>]+>/g,'').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/\n\s*\n+/g,'\n');
console.log('['+tag+'] '+id+' '+t.length+' chars');
console.log(t.slice(0, max? +max : 20000));
