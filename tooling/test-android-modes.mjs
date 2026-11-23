import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {request as httpRequest} from 'node:http';
import {request as httpsRequest} from 'node:https';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import WebSocket from 'ws';
const adb=process.env.KUIKUIZ_ADB,device=process.env.KUIKUIZ_DEVICE;
if(!adb||!device)throw new Error('KUIKUIZ_ADB et KUIKUIZ_DEVICE requis. Le test change le mode de la maquette.');
const host=process.env.KUIKUIZ_ANDROID_IP||'192.168.1.21';
const execute=promisify(execFile),shell=(...args)=>execute(adb,['-s',device,'shell',...args]);
const ca=await readFile(new URL('../.tools/tls/ca.pem',import.meta.url));
await shell('am','start','-n','fr.kuikuiz.probe/.MainActivity');
await shell('uiautomator','dump','/sdcard/kuikuiz-window.xml');
const xml=(await shell('cat','/sdcard/kuikuiz-window.xml')).stdout;
function bounds(label){
  const node=xml.match(new RegExp(`<node[^>]*text="${label}"[^>]*bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`));
  if(!node)throw new Error('Commande non repérée : '+label);
  return [String(Math.round((+node[1]+ +node[3])/2)),String(Math.round((+node[2]+ +node[4])/2))];
}
const stop=bounds('ARRÊTER LA MAQUETTE DE QUIZ');
const buttons={http:bounds('HÉBERGER LA MAQUETTE DE QUIZ'),https:bounds('HÉBERGER EN HTTPS/WSS DE TEST')};
function get(url){return new Promise((resolve,reject)=>{
  const request=(url.startsWith('https:')?httpsRequest:httpRequest)(url,{ca,timeout:2000},response=>{
    let body='';response.setEncoding('utf8');response.on('data',chunk=>body+=chunk);response.on('end',()=>resolve({status:response.statusCode,body}));
  });request.on('error',reject);request.on('timeout',()=>request.destroy(new Error('timeout')));request.end();
});}
const trace=[];
const forced=process.argv.includes('--force-stop');
for(const mode of forced?['https','https','https']:['http','https','http','https']){
  let startButton=buttons[mode];
  if(forced){
    await shell('am','force-stop','fr.kuikuiz.probe');
    await shell('am','start','-n','fr.kuikuiz.probe/.MainActivity');
    await shell('uiautomator','dump','--compressed','/sdcard/kuikuiz-window.xml');
    const screen=(await shell('cat','/sdcard/kuikuiz-window.xml')).stdout;
    const match=screen.match(/<node[^>]*text="HÉBERGER EN HTTPS\/WSS DE TEST"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
    if(!match)throw new Error('Bouton HTTPS non visible après arrêt forcé');
    startButton=[String(Math.round((+match[1]+ +match[3])/2)),String(Math.round((+match[2]+ +match[4])/2))];
  }else await shell('input','tap',...stop);
  // Pas de délai ajouté entre les deux commandes : reproduire le changement rapide.
  await shell('input','tap',...startButton);
  const origin=`${mode}://${host}:${mode==='https'?8443:8080}`;
  let ready;const deadline=Date.now()+45000;
  while(Date.now()<deadline){try{const response=await get(origin+'/connection.json');if(response.status===200){ready=JSON.parse(response.body);break;}}catch{}
    await new Promise(resolve=>setTimeout(resolve,250));}
  assert.ok(ready,'Mode non prêt : '+mode);
  assert.equal(new URL(ready.socketPath).protocol,mode==='https'?'wss:':'ws:');
  await new Promise((resolve,reject)=>{
    const socket=new WebSocket(ready.socketPath,{origin,ca,handshakeTimeout:5000});
    socket.on('error',reject);
    socket.on('open',()=>{socket.close();resolve();});
  });
  const other=`${mode==='https'?'http':'https'}://${host}:${mode==='https'?8080:8443}/connection.json`;
  await assert.rejects(get(other));trace.push({mode,origin,result:'PASS'});
}
const report={date:new Date().toISOString(),result:'PASS',trace,scenario:forced?'Trois arrêts forcés puis redémarrages HTTPS/WSS vérifiés':'Arrêt puis redémarrage rapide : HTTP, HTTPS, HTTP, HTTPS ; un seul mode actif, WebSocket vérifié'};
await mkdir('artifacts/mock-preview',{recursive:true});await writeFile(`artifacts/mock-preview/android-${forced?'force-stop':'modes'}-report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
