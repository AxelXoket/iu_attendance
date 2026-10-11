const fs=require('fs');
const f=process.argv[2];
const html=fs.readFileSync(f,'utf8');
// keep ids as markers
let t=html.replace(/<style[\s\S]*?<\/style>/g,'').replace(/<script[\s\S]*?<\/script>/g,'').replace(/<svg[\s\S]*?<\/svg>/g,'');
t=t.replace(/<([a-z0-9]+)[^>]*\sid="([^"]+)"[^>]*>/gi,(m,tag,id)=>`\n[#${id}] `);
t=t.replace(/<\/(p|li|div|h[1-6]|tr|section|summary|details)>/gi,'\n').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>');
t=t.split('\n').map(s=>s.replace(/\s+/g,' ').trim()).filter(Boolean).join('\n');
process.stdout.write(t);
