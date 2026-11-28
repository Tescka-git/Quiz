// Diagnostic PC isolé : TLS existant, aucun changement des magasins de confiance.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {chromium} from 'playwright-core';
import {WebSocketServer} from 'ws';
import assert from 'node:assert/strict';
import {X509Certificate,createHash} from 'node:crypto';
import {createDiagnosticServer} from './serve-diagnostic.mjs';

const tls={pfx:await readFile(new URL('../.tools/tls/pc.p12',import.meta.url)),passphrase:(await readFile(new URL('../.tools/tls/password.txt',import.meta.url),'utf8')).trim()};
const cert=new X509Certificate(await readFile(new URL('../.tools/tls/pc.pem',import.meta.url)));
const spki=createHash('sha256').update(cert.publicKey.export({type:'spki',format:'der'})).digest('base64');
const pageServer=createDiagnosticServer(tls),target=createServer((req,res)=>res.writeHead(404).end());
const wss=new WebSocketServer({server:target,maxPayload:1024});
let origin,browser;
const observations=[];
try{
  pageServer.listen(0,'127.0.0.1');await once(pageServer,'listening');
  target.listen(0,'127.0.0.1');await once(target,'listening');
  origin=`https://127.0.0.1:${pageServer.address().port}`;
  const endpoint=`ws://127.0.0.1:${target.address().port}`;
  wss.on('connection',(socket,req)=>{
    if(req.headers.origin!==origin){socket.close(1008);return;}
    socket.on('message',data=>{try{const m=JSON.parse(data);if(m.type==='ping'&&typeof m.id==='string')socket.send(JSON.stringify({type:'pong',id:m.id}));else socket.close(1008);}catch{socket.close(1008);}});
  });
  // Le classement public est simulé ; aucun drapeau ne désactive TLS ou les contrôles web.
  browser=await chromium.launch({executablePath:process.env.KUIKUIZ_CHROME||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',headless:true,args:[`--ignore-certificate-errors-spki-list=${spki}`,`--ip-address-space-overrides=127.0.0.1:${pageServer.address().port}=public`]});
  for(const setting of ['denied','granted']){
    const context=await browser.newContext(),page=await context.newPage();
    const cdp=await context.newCDPSession(page);
    const permissions=[],consoleMessages=[];page.on('console',m=>consoleMessages.push({type:m.type(),text:m.text()}));
    const {targetInfo}=await cdp.send('Target.getTargetInfo');
    for(const name of ['local-network','loopback-network']){
      try{await cdp.send('Browser.setPermission',{origin,permission:{name},setting,browserContextId:targetInfo.browserContextId});permissions.push({name,setting,applied:true});}
      catch(error){permissions.push({name,setting,applied:false,error:error.message});}
    }
    await page.goto(origin);assert.equal(await page.evaluate(()=>isSecureContext),true);
    await page.locator('#permissions').click();
    await page.waitForFunction(()=>document.getElementById('permission-status').textContent.includes('loopback-network'));
    await page.locator('#endpoint').fill(endpoint);await page.locator('#connect').click();
    const opened=await page.locator('#ping').waitFor({state:'visible',timeout:1000}).then(async()=>{
      try{await page.waitForFunction(()=>!document.getElementById('ping').disabled,null,{timeout:3500});return true;}catch{return false;}
    });
    let pong=false;
    if(opened){await page.locator('#ping').click();await page.waitForFunction(()=>document.getElementById('log').textContent.includes('"pong"'));pong=true;}
    const log=await page.locator('#log').innerText();
    observations.push({setting,permissions,opened,pong,log,consoleMessages});
    // Un refus navigateur est un résultat à consigner, pas une raison de masquer le rapport.
    await context.close();
  }
  const report={date:new Date().toISOString(),browser:browser.version(),origin,endpoint,observations,scope:'PC loopback, origine HTTPS de laboratoire classée public par drapeau de diagnostic ; décisions de permission injectées par CDP, aucune invite humaine testée',limits:['Pas une origine publique réellement déployée','Exception TLS ciblée SPKI du certificat PC, aucun magasin de confiance modifié ; ne valide pas TLS public ou mobile','Pas de test sans Internet ; ws non chiffré']};
  await mkdir('artifacts/local-permission',{recursive:true});await writeFile('artifacts/local-permission/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
  assert.ok(observations.every(o=>o.permissions.every(p=>p.applied)),'Permissions non prises en charge : lire le rapport, aucune preuve générale');
  assert.equal(observations[0].opened,false,'Le refus doit bloquer le WebSocket');
  assert.equal(observations[1].pong,true,'Permission accordée : pong attendu');
}finally{
  if(browser)await browser.close();for(const socket of wss.clients)socket.terminate();await new Promise(r=>wss.close(r));
  for(const server of [target,pageServer])if(server.listening)await new Promise(r=>server.close(r));
}
