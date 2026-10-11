// Per-section word counts. Usage: node sections.js file.html
const fs=require('fs');const t=fs.readFileSync(process.argv[2],'utf8');
const words=s=>s.replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>|<!--[\s\S]*?-->/g,'').replace(/<[^>]+>/g,' ').split(/\s+/).filter(Boolean).length;
const parts=[...t.matchAll(/<section id="([^"]+)">([\s\S]*?)<\/section>/g)];
let sum=0;for(const m of parts){const w=words(m[2]);sum+=w;const h3=(m[2].match(/<h3/g)||[]).length,tr=(m[2].match(/<tr/g)||[]).length;console.log(m[1].padEnd(12),String(w).padStart(5),'h3',h3,'tr',tr)}
console.log('sections total',sum,'page total',words(t));
const L=t.split('\n').map(l=>l.length);console.log('max line len',Math.max(...L));
