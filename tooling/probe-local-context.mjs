// Sonde isolée : aucun certificat, compte, donnée de quiz ou réglage système modifié.
import {createServer} from 'node:http';
import {networkInterfaces} from 'node:os';
import {once} from 'node:events';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright-core';
import {WebSocketServer} from 'ws';
const address=Object.values(networkInterfaces()).flat().find(a=>a.family==='IPv4'&&!a.internal&&/^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(a.address))?.address;
if(!address)throw Error('Adresse IPv4 privée nécessaire pour distinguer LAN et localhost');
const server=createServer((req,res)=>{if(req.url!=='/'){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end('<!doctype html><title>Sonde contexte local Kuikuiz</title><p>Sonde isolée sans données de jeu</p>');});
const wss=new WebSocketServer({server});let browser;
try{
  server.listen(0,address);await once(server,'listening');const port=server.address().port,origin='http://'+address+':'+port;
  wss.on('connection',(socket,req)=>{if(req.headers.origin!==origin){socket.close(1008);return;}socket.on('message',data=>{if(data.toString()==='ping')socket.send('pong');else socket.close(1008);});});
  browser=await chromium.launch({executablePath:process.env.KUIKUIZ_CHROME||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',headless:true});
  const context=await browser.newContext(),page=await context.newPage();await page.goto(origin);
  const result=await page.evaluate(async()=>({secureContext:isSecureContext,serviceWorkerAvailable:'serviceWorker' in navigator,websocket:await new Promise(resolve=>{let ws;const finish=value=>{clearTimeout(timer);ws?.close();resolve(value);};const timer=setTimeout(()=>finish('timeout'),4000);ws=new WebSocket(location.origin.replace('http:','ws:'));ws.onopen=()=>ws.send('ping');ws.onmessage=e=>finish(e.data);ws.onerror=()=>finish('error');})}));
  const report={date:new Date().toISOString(),browser:browser.version(),origin,result,scope:'Chrome PC neuf, HTTP/ws sur IPv4 privée ; aucune exception de sécurité',limits:['Ne teste pas une origine publique HTTPS vers le LAN','Ne valide ni permissions sur mobile ni confiance TLS ni fonctionnement sans Internet']};
  if(result.secureContext||result.serviceWorkerAvailable||result.websocket!=='pong')throw Error(JSON.stringify(report));
  await mkdir('artifacts/local-context',{recursive:true});await writeFile('artifacts/local-context/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{if(browser)await browser.close();for(const socket of wss.clients)socket.terminate();await new Promise(r=>wss.close(r));if(server.listening)await new Promise(r=>server.close(r));}
