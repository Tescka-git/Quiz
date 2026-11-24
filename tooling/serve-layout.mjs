import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
const routes=new Map([['/','index.html'],['/app.js','app.js'],['/style.css','style.css']]);
const server=createServer(async(req,res)=>{
  const name=routes.get(new URL(req.url,'http://localhost').pathname);
  if(req.method!=='GET'||!name){res.writeHead(404).end();return;}
  try{const body=await readFile(new URL(`../apps/web/layout/${name}`,import.meta.url));res.writeHead(200,{
    'Content-Type':name.endsWith('.js')?'text/javascript; charset=utf-8':name.endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8',
    'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',
    'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'none'; img-src 'self'; frame-ancestors 'none'; base-uri 'none'"
  }).end(body);}catch{res.writeHead(500).end('Maquette indisponible');}
});
server.listen(4181,'127.0.0.1',()=>console.log('Maquette visuelle : http://localhost:4181'));
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>server.close(()=>process.exit(0)));
