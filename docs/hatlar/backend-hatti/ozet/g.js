// usage: node g.js D06 regex [width] [max]
const s=JSON.stringify(require('../spec/'+process.argv[2]+'.json'));
const re=new RegExp(process.argv[3],'gi');const w=+process.argv[4]||200;const mx=+process.argv[5]||5;let m,i=0;
while((m=re.exec(s))&&i<mx){console.log('>>',s.slice(Math.max(0,m.index-w),m.index+w).replace(/\\"/g,'"'));i++;}
