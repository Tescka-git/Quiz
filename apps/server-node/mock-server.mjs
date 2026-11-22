import { createServer } from 'node:http';
import { createServer as createHttpsServer } from 'node:https';
import { WebSocketServer, WebSocket } from 'ws';
import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { createContext, runInContext } from 'node:vm';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { SqliteQuizStore } from './persistence/sqlite-quiz-store.mjs';
import { MockRooms } from './mock-rooms.mjs';
import { parseClientMessage } from '../../packages/protocol/mock.mjs';

export async function createMockServer({filename,clock=()=>performance.now(),timers=true,tls,assetReader=readFile}={}) {
  const bytes=await readFile(new URL('../../artifacts/engine/engine.js',import.meta.url));
  const manifest=JSON.parse(await readFile(new URL('../../artifacts/engine/manifest.json',import.meta.url),'utf8'));
  if(createHash('sha256').update(bytes).digest('hex')!==manifest.sha256)throw new Error('Invalid engine hash');
  const context=createContext(Object.create(null));runInContext(bytes.toString(),context);
  runInContext(await readFile(new URL('../../packages/protocol/mock-presentation.js',import.meta.url),'utf8'),context);
  const store=new SqliteQuizStore(filename,context.KuikuizEngine);
  let rooms;
  try {rooms=new MockRooms(filename,store,context.KuikuizEngine,manifest.sha256,clock,
    {snapshot:context.kuikuizSnapshot,command:context.kuikuizCommand,admission:context.kuikuizAdmission});}catch(error){store.close();throw error;}
  const routes=new Map([['/','index.html'],['/animateur','index.html'],['/joueur','index.html'],['/app.js','app.js'],['/style.css','style.css'],
    ['/offline.js','offline.js'],['/sw.js','sw.js'],['/manifest.webmanifest','manifest.webmanifest'],['/icon.svg','icon.svg']]);
  const trustedOrigin=request=>request.headers.origin===`${tls?'https':'http'}://${request.headers.host}`;
  const handler=async(request,response)=>{
    try {
      const path=new URL(request.url,'http://localhost').pathname;
      if(path==='/connection.json'&&request.method==='GET'){
        response.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'}).end(JSON.stringify({socketPath:'/socket'}));return;
      }
      if(path==='/api/rooms'&&request.method==='POST') {
        if(!trustedOrigin(request)){response.writeHead(403).end();return;}
        const created=rooms.create();response.writeHead(201,{'Content-Type':'application/json','Cache-Control':'no-store'}).end(JSON.stringify(created));return;
      }
      if(request.method!=='GET'||!routes.has(path)){response.writeHead(404).end();return;}
      const name=routes.get(path);const body=await assetReader(new URL(`../web/mock/${name}`,import.meta.url));
      response.writeHead(200,{'Content-Type':name.endsWith('.js')?'text/javascript; charset=utf-8':name.endsWith('.css')?'text/css; charset=utf-8':name.endsWith('.webmanifest')?'application/manifest+json':name.endsWith('.svg')?'image/svg+xml':'text/html; charset=utf-8',
        'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',
        'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'"}).end(body);
    }catch{response.writeHead(500).end('Service indisponible');}
  };
  const server=tls?createHttpsServer({...tls,minVersion:'TLSv1.2'},handler):createServer(handler);
  const wss=new WebSocketServer({noServer:true,maxPayload:4096});
  server.on('upgrade',(request,socket,head)=>{
    if(request.url!=='/socket'||!trustedOrigin(request)){socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');return;}
    wss.handleUpgrade(request,socket,head,ws=>wss.emit('connection',ws,request));
  });
  const send=(socket,data)=>{if(socket.readyState===WebSocket.OPEN)socket.send(JSON.stringify(data));};
  const publish=()=>{
    for(const socket of wss.clients)if(socket.identity) {
      try {send(socket,rooms.snapshot(socket.identity));}catch{send(socket,{v:1,type:'error',code:'storage-failed'});}
    }
  };
  const knownErrors=new Set(['invalid-message','unknown-room','unauthorized','already-started','forbidden','no-players','not-started']);
  wss.on('connection',socket=>{
    let count=0,windowStart=clock();
    const authenticationTimeout=setTimeout(()=>{if(!socket.identity)socket.close(1008,'Identification requise');},10000);
    socket.on('close',()=>clearTimeout(authenticationTimeout));
    socket.on('error',()=>{});
    socket.on('message',raw=>{
      try {
        const time=clock();if(time-windowStart>1000){windowStart=time;count=0;}
        if(++count>40){socket.close(1008,'Trop de messages');return;}
        const message=parseClientMessage(raw.toString());
        if(!socket.identity) {
          if(message.type==='join') {
            const credentials=rooms.join(message.code,message.name);
            socket.identity=rooms.authenticate('player',credentials.roomId,credentials.token);send(socket,{v:1,type:'credentials',...credentials});
          }else if(message.type==='host'||message.type==='player')socket.identity=rooms.authenticate(message.type,message.roomId,message.token);
          else throw new Error('unauthorized');
          clearTimeout(authenticationTimeout);publish();return;
        }
        if(['host','player','join'].includes(message.type))throw new Error('forbidden');
        const result=rooms.command(socket.identity,message);
        if(message.type==='answer')send(socket,{v:1,type:'answer-result',questionId:message.questionId,submissionId:message.submissionId,
          confirmed:result.confirmed,status:result.status});
        publish();
      }catch(error){send(socket,{v:1,type:'error',code:knownErrors.has(error.message)?error.message:'storage-failed'});}
    });
  });
  const intervals=[];
  if(timers) {
    intervals.push(setInterval(publish,500));
    intervals.push(setInterval(()=>{try{rooms.checkpoint();}catch{for(const socket of wss.clients)send(socket,{v:1,type:'error',code:'storage-failed'});}},1000));
  }
  let stopping;
  return {server,rooms,stop(){return stopping??=(async()=>{intervals.forEach(clearInterval);for(const socket of wss.clients)socket.terminate();await new Promise(r=>wss.close(r));
    if(server.listening)await new Promise(r=>server.close(r));rooms.close();store.close();})();}};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const directory=new URL('../../.tools/mock/',import.meta.url);await mkdir(directory,{recursive:true});
  const secure=process.argv.includes('--https');
  const tls=secure?{pfx:await readFile(new URL('../../.tools/tls/pc.p12',import.meta.url)),
    passphrase:(await readFile(new URL('../../.tools/tls/password.txt',import.meta.url),'utf8')).trim()}:undefined;
  const app=await createMockServer({filename:fileURLToPath(new URL('quiz-v3.sqlite',directory)),tls});
  app.server.listen(4180,secure?'0.0.0.0':'127.0.0.1',()=>console.log(secure?'Kuikuiz HTTPS local : port 4180. Certificat de test existant.':'Kuikuiz : http://localhost:4180'));
  for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>app.stop().then(()=>process.exit(0)));
}
