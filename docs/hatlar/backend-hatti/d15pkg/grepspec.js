const path=require('path');
const txt=JSON.stringify(require(path.join(__dirname,'..','spec','D15.json')));
const [w,n='3',wid='220']=process.argv.slice(2);
let i=txt.indexOf(w),c=0; while(i>=0&&c<+n){console.log('~ '+txt.slice(Math.max(0,i-+wid),i+ +wid)); i=txt.indexOf(w,i+w.length); c++;}
console.log('count', txt.split(w).length-1);
