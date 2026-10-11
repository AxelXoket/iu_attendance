const B=process.argv[2]; const m=process.argv[3]; const pats=process.argv.slice(4);
const j=require(B+'/spec/'+m+'.json');
for(const e of j.endpoints){ if(pats.some(p=>(e.method+' '+e.path).includes(p))) console.log(JSON.stringify(e,null,0)); }
