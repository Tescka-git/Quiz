import {request as httpRequest} from 'node:http';
import {request as httpsRequest} from 'node:https';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import WebSocket from 'ws';
import assert from 'node:assert/strict';
import {once} from 'node:events';

const origin=process.env.KUIKUIZ_ORIGIN||'http://192.168.1.21:8080';
const secure=origin.startsWith('https:');
const ca=secure?await readFile(new URL('../.tools/tls/ca.pem',import.meta.url)):undefined;
async function http(path,method='GET',headers={}){
  return new Promise((resolve,reject)=>{
    const req=(secure?httpsRequest:httpRequest)(new URL(path,origin),{method,headers,ca,timeout:15000},res=>{
      let text='';res.setEncoding('utf8');res.on('data',chunk=>text+=chunk);res.on('end',()=>resolve({status:res.statusCode,text}));
    });req.on('error',reject);req.on('timeout',()=>req.destroy(new Error('HTTP timeout')));req.end();
  });
}
const sockets=[];
let endpoint;
async function client(hello){
  const socket=new WebSocket(endpoint,{origin,ca});sockets.push(socket);
  const queue=[],waiters=[];
  socket.on('message',raw=>{const message=JSON.parse(raw);const i=waiters.findIndex(w=>w.match(message));
    if(i<0)queue.push(message);else{const w=waiters.splice(i,1)[0];clearTimeout(w.timer);w.resolve(message);}});
  socket.on('error',()=>{});await once(socket,'open');
  const result={send:message=>socket.send(JSON.stringify({v:1,...message})),socket,next(match){
    const i=queue.findIndex(match);if(i>=0)return Promise.resolve(queue.splice(i,1)[0]);
    return new Promise((resolve,reject)=>{const waiter={match,resolve};waiter.timer=setTimeout(()=>{waiters.splice(waiters.indexOf(waiter),1);reject(new Error('Message réseau attendu absent'));},15000);waiters.push(waiter);});
  }};result.send(hello);return result;
}
const state=(question,phase)=>m=>m.type==='state'&&m.questionId===question&&m.phase===phase;
try{
  assert.equal((await http('/api/rooms','POST')).status,403);
  assert.equal((await http('/.tools/mock/quiz-v2.sqlite')).status,404);
  const config=JSON.parse((await http('/connection.json')).text);
  const url=new URL(config.socketPath,origin);if(url.protocol==='http:')url.protocol='ws:';if(url.protocol==='https:')url.protocol='wss:';endpoint=url.href;
  const response=await http('/api/rooms','POST',{Origin:origin});assert.equal(response.status,201);
  const credentials=JSON.parse(response.text);
  const host=await client({type:'host',...credentials});await host.next(m=>m.type==='state'&&m.phase==='lobby');
  const player=await client({type:'join',code:credentials.code,name:'Test réseau'});
  const access=await player.next(m=>m.type==='credentials');await player.next(m=>m.type==='state'&&m.phase==='lobby');
  player.send({type:'start'});assert.equal((await player.next(m=>m.type==='error')).code,'forbidden');
  host.send({type:'start'});
  const measurements=[];let final;
  for(const [questionId,option] of [['planete','mars'],['ocean','pacifique'],['hexagone','six']]){
    const opened=await player.next(state(questionId,'open'));assert.equal(opened.ranking,undefined);assert.equal(opened.correctOption,undefined);
    const start=performance.now();player.send({type:'answer',questionId,submissionId:'same-id-per-question',option});
    assert.equal((await player.next(m=>m.type==='answer-result'&&m.questionId===questionId)).confirmed,true);
    measurements.push(performance.now()-start);
    player.send({type:'answer',questionId,submissionId:'same-id-per-question',option});
    assert.equal((await player.next(m=>m.type==='answer-result'&&m.questionId===questionId)).status,'duplicate');
    final=await player.next(state(questionId,'closed'));
    assert.equal(final.ranking[0].points,final.questionNumber*1000);
    if(!final.final){host.send({type:'next',questionId});}
  }
  assert.equal(final.final,true);assert.equal(final.ranking[0].points,3000);
  player.socket.terminate();
  const returning=await client({type:'player',roomId:access.roomId,token:access.token});
  const restored=await returning.next(state('hexagone','closed'));assert.equal(restored.ownAnswer.option,'six');assert.equal(restored.ranking[0].points,3000);
  const report={date:new Date().toISOString(),origin,result:'PASS',scenario:'3 questions, droits, masquage, commit, doublons, reconnexion',score:3000,confirmationMs:measurements};
  const kind=process.env.KUIKUIZ_HOST_KIND|| (secure?'node':'android');
  await mkdir('artifacts/mock-preview',{recursive:true});await writeFile(`artifacts/mock-preview/live-${kind}.json`,JSON.stringify(report,null,2));
  console.log(JSON.stringify(report));
}finally{for(const socket of sockets)socket.terminate();}
