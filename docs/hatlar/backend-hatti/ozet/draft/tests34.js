const a=require("../asamalar.json");
const n=Number(process.argv[2]);
const ids=a[n-1].paketler.map(p=>p.id);
for (const id of ids){const m=id.slice(0,3); const P=require("../../packages/"+m+".json").packages.find(p=>p.id===id);
 const S=require("../../spec/"+m+".json");
 console.log("=== "+id+" "+P.title);
 for (const t of P.tests){const st=S.tests.find(x=>x.name===t); console.log(" * "+t+": "+(st?st.asserts:"(no spec match)"));}
}
