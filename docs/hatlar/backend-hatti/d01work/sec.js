// Print the text of an element by id from plan/teknik/tasarim html: from the id'd tag to its matching close tag (approximate by tag depth).
const fs=require('fs');
const [doc,id,maxLen]=process.argv.slice(2);
const h=fs.readFileSync('C:/Users/USER/Desktop/iu_attendance/'+doc+'.html','utf8');
const i=h.indexOf(" id=\""+id+"\"");
if(i<0){console.log('NOT FOUND '+id);process.exit(0);}
const start=h.lastIndexOf('<',i);
const tag=h.slice(start+1).match(/^[a-zA-Z0-9]+/)[0];
// walk to matching close
let depth=0,pos=start;const re=new RegExp("<(/?)"+tag+"([ \t\r\n][^>]*)?>","g");re.lastIndex=start;let m;
while((m=re.exec(h))){ if(m[1]==='/'){depth--; if(depth===0){pos=re.lastIndex;break;}} else depth++; }
let t=h.slice(start,pos).replace(/<(br|\/p|\/li|\/div|\/h[1-6]|\/summary|\/tr)\s*\/?>/gi,'\n').replace(/<td[^>]*>/gi,' | ').replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/\n\s*\n+/g,'\n');
console.log('=== '+doc+'#'+id+' <'+tag+'> len '+t.length);
console.log(t.slice(0, +maxLen||8000));
