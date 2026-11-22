import {request} from 'node:https';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import WebSocket from 'ws';
import assert from 'node:assert/strict';
const origin=process.env.KUIKUIZ_ORIGIN||'https://192.168.1.21:8443';
if(new URL(origin).protocol!=='https:')throw new Error('Origine HTTPS requise.');
const ca=await readFile(new URL('../.tools/tls/ca.pem',import.meta.url));
function get(path,options={ca}){return new Promise((resolve,reject)=>{
  const req=request(new URL(path,origin),{...options,timeout:5000},response=>{
    const socket=response.socket;let body='';response.setEncoding('utf8');response.on('data',chunk=>body+=chunk);
    const peer=socket.getPeerCertificate();const tls={authorized:socket.authorized,protocol:socket.getProtocol(),
      fingerprint256:peer.fingerprint256,subjectAltName:peer.subjectaltname,expires:peer.valid_to};
    response.on('end',()=>resolve({status:response.statusCode,body,tls}));
  });req.on('error',reject);req.on('timeout',()=>req.destroy(new Error('TLS timeout')));req.end();
});}
const valid=await get('/connection.json');assert.equal(valid.status,200);assert.equal(valid.tls.authorized,true);
const endpoint=JSON.parse(valid.body).socketPath;assert.equal(new URL(endpoint).protocol,'wss:');
const unknownCodes=['SELF_SIGNED_CERT_IN_CHAIN','UNABLE_TO_GET_ISSUER_CERT_LOCALLY','UNABLE_TO_VERIFY_LEAF_SIGNATURE','DEPTH_ZERO_SELF_SIGNED_CERT'];
await assert.rejects(get('/connection.json',{}),error=>unknownCodes.includes(error.code));
await assert.rejects(get('/connection.json',{ca,servername:'autre-adresse.invalid'}),error=>error.code==='ERR_TLS_CERT_ALTNAME_INVALID');
for(const path of ['/android.p12','/password.txt','/files/tls/android.p12'])assert.equal((await get(path)).status,404);
async function websocket(options,accept){
  return new Promise((resolve,reject)=>{
    const socket=new WebSocket(endpoint,{origin,...options});let settled=false;
    const finish=(error,value)=>{if(settled)return;settled=true;clearTimeout(timer);socket.terminate();error?reject(error):resolve(value);};
    const timer=setTimeout(()=>finish(new Error('WSS timeout')),5000);
    socket.on('error',error=>finish(error));socket.on('open',()=>{if(accept==='open')finish(null,{authorized:socket._socket.authorized,protocol:socket._socket.getProtocol()});});
    socket.on('close',code=>{if(accept==='close')finish(null,code);});
  });
}
const wss=await websocket({ca},'open');assert.equal(wss.authorized,true);
await assert.rejects(websocket({},'open'),error=>unknownCodes.includes(error.code));
await assert.rejects(websocket({ca,servername:'autre-adresse.invalid'},'open'),error=>error.code==='ERR_TLS_CERT_ALTNAME_INVALID');
assert.equal(await websocket({ca,origin:'https://autre-origine.invalid'},'close'),1008);
const report={date:new Date().toISOString(),origin,result:'PASS',https:valid.tls,wss,
  checks:['Chaîne et adresse vérifiées en HTTPS et WSS','Autorité inconnue refusée en HTTPS et WSS',
    'Mauvaise adresse refusée en HTTPS et WSS','Origine WSS étrangère fermée avec code 1008','Fichiers privés inaccessibles par HTTPS'],
  trust:'Autorité locale fournie uniquement aux clients Node de test ; aucun magasin système modifié'};
await mkdir('artifacts/mock-preview',{recursive:true});await writeFile('artifacts/mock-preview/android-tls-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
