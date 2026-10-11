const fs=require('fs');const orig=fs.readFileSync;
fs.readFileSync=function(p,...a){ if(typeof p==='string' && /backend[\\/]contracts\.json$/.test(p) && process.env.ALT_C) p=process.env.ALT_C; return orig.call(fs,p,...a);};
