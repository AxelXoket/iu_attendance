// Applies critic fixes: node fix.js fixes.json  (each "from" must occur exactly once in its file)
const fs=require('fs');const list=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));const files={};
for(const x of list){const f='out/'+x.file;files[f]=files[f]??fs.readFileSync(f,'utf8');const n=files[f].split(x.from).length-1;if(n!==1)throw new Error(x.file+': "'+x.from.slice(0,60)+'" found '+n+' times');files[f]=files[f].replace(x.from,x.to)}
for(const [f,s] of Object.entries(files))fs.writeFileSync(f,s);console.log('applied',list.length,'fixes to',Object.keys(files).join(', '));
