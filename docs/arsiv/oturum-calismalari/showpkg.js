const B=process.argv[2]; const ids=process.argv.slice(3);
for(const id of ids){const m=id.slice(0,3); const j=require(B+'/packages/'+m+'.json'); const p=j.packages.find(x=>x.id===id);
const o={id:p.id,title:p.title,notes:p.notes,tables:p.tables,endpoints:p.endpoints,jobs:p.jobs,exports:p.exports,tests:p.tests};
console.log(JSON.stringify(o,null,1));}
