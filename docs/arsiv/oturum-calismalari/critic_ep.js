// usage: node critic_ep.js MOD "METHOD path" ...
const base=process.cwd();
const [mod,...eps]=process.argv.slice(2);
const s=require(base+"/spec/"+mod+".json");
for(const e of eps){const [m,p]=e.split(" ");const x=s.endpoints.find(y=>y.method===m&&y.path===p);console.log("#### "+e);console.log(JSON.stringify(x,null,1));}
