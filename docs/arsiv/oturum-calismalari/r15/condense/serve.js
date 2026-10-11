// Read-only static server for a visual check of the two plan files: node serve.js <dir> <port>
const http=require('http'),fs=require('fs'),path=require('path');const dir=process.argv[2],port=+process.argv[3];
http.createServer((q,r)=>{const f=path.join(dir,decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/,''));if(!f.startsWith(dir)||!/\.html$/.test(f)||!fs.existsSync(f)){r.writeHead(404);return r.end()}r.writeHead(200,{'content-type':'text/html; charset=utf-8'});fs.createReadStream(f).pipe(r)}).listen(port,'127.0.0.1',()=>console.log('serving',dir,'on',port));
