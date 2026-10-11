// query helper: node q.js D13 regex  -> prints any string fields (with path) matching regex
const fs=require('fs'),path=require('path');
const [,,id,re,max]=process.argv;
const S=JSON.parse(fs.readFileSync(path.join(__dirname,'..','spec',id+'.json'),'utf8').replace(/^\uFEFF/,''));
const R=new RegExp(re,'i');let n=0;
(function walk(o,p){ if(typeof o==='string'){ if(R.test(o)){ console.log('['+p+'] '+o); n++; } return;} if(o&&typeof o==='object') for(const k of Object.keys(o)) walk(o[k],p+'.'+k); })(S,id);
