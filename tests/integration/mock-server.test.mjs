import {before,test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {once} from 'node:events';
import {DatabaseSync} from 'node:sqlite';
import WebSocket from 'ws';
import {buildEngine} from '../../tooling/engine-build.mjs';
import {createMockServer} from '../../apps/server-node/mock-server.mjs';

before(()=>buildEngine());
async function environment(t){
  const directory=await mkdtemp(join(tmpdir(),'kuikuiz-game-'));
  const filename=join(directory,'game.sqlite');let now=1000;const apps=[];
  t.after(async()=>{for(const app of apps)await app.stop();const path=resolve(directory);
    assert.ok(path.startsWith(resolve(tmpdir())+'\\kuikuiz-game-')||path.startsWith(resolve(tmpdir())+'/kuikuiz-game-'));await rm(directory,{recursive:true,force:true});});
  async function start(){
    const app=await createMockServer({filename,clock:()=>now,timers:false});apps.push(app);
    app.server.listen(0,'127.0.0.1');await once(app.server,'listening');
    app.origin=`http://127.0.0.1:${app.server.address().port}`;return app;
  }
  return{filename,start,setNow:value=>{now=value;}};
}
async function client(t,app,hello){
  const ws=new WebSocket(app.origin.replace('http:','ws:')+'/socket',{origin:app.origin});
  const queue=[],listeners=[];
  ws.on('message',data=>{const message=JSON.parse(data);const index=listeners.findIndex(x=>x.predicate(message));
    if(index>=0){const listener=listeners.splice(index,1)[0];clearTimeout(listener.timeout);listener.resolve(message);}else queue.push(message);});
  ws.on('error',()=>{});t.after(()=>ws.terminate());await once(ws,'open');
  const result={ws,send:message=>ws.send(JSON.stringify({v:1,...message})),next(predicate){
    const index=queue.findIndex(predicate);if(index>=0)return Promise.resolve(queue.splice(index,1)[0]);
    return new Promise((resolve,reject)=>{const listener={predicate,resolve};listener.timeout=setTimeout(()=>{
      const index=listeners.indexOf(listener);if(index>=0)listeners.splice(index,1);reject(new Error('Message attendu absent'));},2000);listeners.push(listener);});
  }};
  if(hello)result.send(hello);return result;
}
const state=(phase,answered)=>message=>message.type==='state'&&message.phase===phase&&(answered===undefined||message.answered===answered);
async function room(t,app){
  const response=await fetch(app.origin+'/api/rooms',{method:'POST',headers:{Origin:app.origin}});assert.equal(response.status,201);
  const credentials=await response.json();const host=await client(t,app,{type:'host',...credentials});
  await host.next(state('lobby'));return{credentials,host};
}
async function joinPlayer(t,app,code,name='Camille'){
  const connection=await client(t,app,{type:'join',code,name});
  const credentials=await connection.next(m=>m.type==='credentials');await connection.next(state('lobby'));
  return{connection,credentials};
}

test('partie réseau complète : droits, pause, réponses durables, classement révélé au bon moment',async t=>{
  const env=await environment(t),app=await env.start(),{host,credentials}=await room(t,app);
  const {connection:p1}=await joinPlayer(t,app,credentials.code,'Camille');
  const {connection:p2}=await joinPlayer(t,app,credentials.code,'Alex');
  p1.send({type:'start'});assert.equal((await p1.next(m=>m.type==='error')).code,'forbidden');
  host.send({type:'start'});const opened=await p1.next(state('open'));
  assert.equal(opened.correctOption,undefined);assert.equal(opened.ranking,undefined);assert.equal(opened.ownAnswer,null);
  env.setNow(2000);host.send({type:'pause',questionId:'planete'});await p2.next(state('paused'));
  p2.send({type:'answer',questionId:'planete',submissionId:'p2',option:'venus'});
  assert.equal((await p2.next(m=>m.type==='answer-result')).confirmed,false);
  env.setNow(3000);host.send({type:'resume',questionId:'planete'});await p1.next(state('open'));
  p1.send({type:'answer',questionId:'planete',submissionId:'p1',option:'mars',playerId:'someone-else',points:999999});
  const accepted=await p1.next(m=>m.type==='answer-result');assert.equal(accepted.confirmed,true);assert.equal(accepted.answer,undefined);
  await host.next(state('open',1));
  p1.send({type:'answer',questionId:'planete',submissionId:'p1',option:'mars'});assert.equal((await p1.next(m=>m.type==='answer-result')).status,'duplicate');
  p2.send({type:'answer',questionId:'planete',submissionId:'p2',option:'venus'});assert.equal((await p2.next(m=>m.type==='answer-result')).confirmed,true);
  const revealed=await p1.next(state('closed',2));
  assert.equal(revealed.correctOption,'mars');assert.deepEqual(revealed.ranking.map(r=>r.points),[1000,0]);
  assert.deepEqual(revealed.ranking.map(r=>r.name),['Camille','Alex']);
});

test('reconnexion et redémarrage : réponse retrouvée, pause restaurée et aucun doublon',async t=>{
  const env=await environment(t);let app=await env.start();const {host,credentials}=await room(t,app);
  const {connection:player,credentials:identity}=await joinPlayer(t,app,credentials.code);
  await joinPlayer(t,app,credentials.code,'Second joueur');
  host.send({type:'start'});await player.next(state('open'));
  env.setNow(2500);player.send({type:'answer',questionId:'planete',submissionId:'stable',option:'mars'});
  await host.next(state('open',1));player.ws.terminate();
  await app.stop();env.setNow(10);app=await env.start();
  const returning=await client(t,app,{type:'player',roomId:identity.roomId,token:identity.token});
  const restored=await returning.next(state('paused',1));assert.equal(restored.ownAnswer.submissionId,'stable');
  assert.equal(restored.remainingMs,28500);assert.equal(restored.ranking,undefined);
  returning.send({type:'answer',questionId:'planete',submissionId:'stable',option:'mars'});
  assert.equal((await returning.next(m=>m.type==='answer-result')).status,'duplicate');
  const hostAgain=await client(t,app,{type:'host',roomId:credentials.roomId,token:credentials.token});
  await hostAgain.next(state('paused'));
  hostAgain.send({type:'reveal',questionId:'planete'});const final=await returning.next(state('closed',1));assert.equal(final.ranking[0].points,1000);
});

test('échec transactionnel : aucune confirmation réseau, puis retransmission explicite acceptée',async t=>{
  const env=await environment(t),app=await env.start(),{host,credentials}=await room(t,app);
  const {connection:player}=await joinPlayer(t,app,credentials.code);
  host.send({type:'start'});await player.next(state('open'));
  const db=new DatabaseSync(env.filename);
  try {
  db.exec("CREATE TRIGGER fail_mock BEFORE UPDATE ON quiz_sessions BEGIN SELECT RAISE(ABORT,'injected'); END");
  player.send({type:'answer',questionId:'planete',submissionId:'retry',option:'mars'});
  assert.equal((await player.next(m=>m.type==='error')).code,'storage-failed');
  assert.equal(db.prepare('SELECT count(*) AS n FROM quiz_answers').get().n,0);
  assert.equal(JSON.parse(db.prepare('SELECT state_json FROM quiz_sessions').get().state_json).current.phase,'open');
  db.exec('DROP TRIGGER fail_mock');player.send({type:'answer',questionId:'planete',submissionId:'retry',option:'mars'});
  assert.equal((await player.next(m=>m.type==='answer-result')).confirmed,true);
  await player.next(state('closed',1));
  assert.equal(JSON.parse(db.prepare('SELECT state_json FROM quiz_sessions').get().state_json).current.phase,'closed');
  }finally{db.close();}
});

test('protocole et entrées : origine, accès animateur, arrivée tardive et échéance',async t=>{
  const env=await environment(t),app=await env.start();
  assert.equal((await fetch(app.origin+'/api/rooms',{method:'POST'})).status,403);
  assert.equal((await fetch(app.origin+'/.tools/mock/game.sqlite')).status,404);
  assert.equal((await fetch(app.origin+'/animateur')).status,200);
  const crossOrigin=new WebSocket(app.origin.replace('http:','ws:')+'/socket',{origin:'http://autre-origine.invalid'});
  t.after(()=>crossOrigin.terminate());
  const [originError]=await once(crossOrigin,'error');assert.match(originError.message,/403/);
  const {host,credentials}=await room(t,app);
  const thief=await client(t,app,{type:'host',roomId:credentials.roomId,token:'wrong'});
  assert.equal((await thief.next(m=>m.type==='error')).code,'unauthorized');
  const {connection:player}=await joinPlayer(t,app,credentials.code);
  player.ws.send('{');assert.equal((await player.next(m=>m.type==='error')).code,'invalid-message');
  host.send({type:'start'});await player.next(state('open'));
  const late=await client(t,app,{type:'join',code:credentials.code,name:'Tardif'});
  assert.equal((await late.next(m=>m.type==='error')).code,'already-started');
  env.setNow(31000);player.send({type:'answer',questionId:'planete',submissionId:'too-late',option:'mars'});
  const result=await player.next(m=>m.type==='answer-result');assert.equal(result.status,'late');assert.equal(result.confirmed,false);
});

test('trois questions : cumul durable, anciennes commandes refusées et reprise à la deuxième',async t=>{
  const env=await environment(t);let app=await env.start();const {host,credentials}=await room(t,app);
  const {connection:player,credentials:identity}=await joinPlayer(t,app,credentials.code);
  await joinPlayer(t,app,credentials.code,'Second joueur');
  host.send({type:'start'});await player.next(state('open'));
  host.send({type:'next',questionId:'planete'});host.send({type:'sync'});
  assert.equal((await host.next(m=>m.type==='state'&&m.questionId==='planete')).questionNumber,1);
  player.send({type:'answer',questionId:'planete',submissionId:'stable',option:'mars'});
  assert.equal((await player.next(m=>m.type==='answer-result')).confirmed,true);
  host.send({type:'reveal',questionId:'planete'});await player.next(state('closed'));
  host.send({type:'next',questionId:'planete'});await player.next(m=>m.type==='state'&&m.questionId==='ocean');
  player.send({type:'answer',questionId:'planete',submissionId:'delayed',option:'mars'});
  const stale=await player.next(m=>m.type==='answer-result'&&m.submissionId==='delayed');assert.equal(stale.status,'stale-question');assert.equal(stale.confirmed,false);
  player.send({type:'answer',questionId:'ocean',submissionId:'stable',option:'pacifique'});
  assert.equal((await player.next(m=>m.type==='answer-result'&&m.questionId==='ocean')).confirmed,true);
  await app.stop();env.setNow(1);app=await env.start();
  const returning=await client(t,app,{type:'player',roomId:identity.roomId,token:identity.token});
  const restored=await returning.next(state('paused',1));assert.equal(restored.questionNumber,2);assert.equal(restored.ownAnswer.option,'pacifique');
  const hostAgain=await client(t,app,{type:'host',roomId:credentials.roomId,token:credentials.token});await hostAgain.next(state('paused'));
  hostAgain.send({type:'reveal',questionId:'ocean'});assert.equal((await returning.next(state('closed'))).ranking[0].points,2000);
  hostAgain.send({type:'next',questionId:'ocean'});await returning.next(m=>m.type==='state'&&m.questionId==='hexagone');
  returning.send({type:'answer',questionId:'hexagone',submissionId:'stable',option:'six'});
  assert.equal((await returning.next(m=>m.type==='answer-result')).confirmed,true);
  hostAgain.send({type:'reveal',questionId:'hexagone'});const final=await returning.next(state('closed'));assert.equal(final.final,true);assert.equal(final.ranking[0].points,3000);
  const db=new DatabaseSync(env.filename);try{assert.equal(db.prepare('SELECT count(*) AS n FROM quiz_answers').get().n,3);}finally{db.close();}
});

test('déconnexion : effectif initial conservé, dernière réponse clôturée durablement après retour',async t=>{
  const env=await environment(t);let app=await env.start();const {host,credentials}=await room(t,app);
  const {connection:p1}=await joinPlayer(t,app,credentials.code,'Premier');
  const {connection:p2,credentials:identity}=await joinPlayer(t,app,credentials.code,'Second');
  host.send({type:'start'});await p1.next(state('open'));
  p2.ws.terminate();
  p1.send({type:'answer',questionId:'planete',submissionId:'first',option:'mars'});
  assert.equal((await p1.next(m=>m.type==='answer-result')).confirmed,true);
  const pending=await host.next(state('open',1));assert.equal(pending.total,2);
  p1.send({type:'answer',questionId:'planete',submissionId:'first',option:'mars'});
  assert.equal((await p1.next(m=>m.type==='answer-result')).status,'duplicate');
  const returning=await client(t,app,{type:'player',roomId:identity.roomId,token:identity.token});
  await returning.next(state('open',1));
  returning.send({type:'answer',questionId:'planete',submissionId:'last',option:'venus'});
  assert.equal((await returning.next(m=>m.type==='answer-result')).confirmed,true);
  await host.next(state('closed',2));
  await app.stop();env.setNow(0);app=await env.start();
  const restored=await client(t,app,{type:'player',roomId:identity.roomId,token:identity.token});
  const closed=await restored.next(state('closed',2));assert.equal(closed.ownAnswer.option,'venus');
  assert.deepEqual(closed.ranking.map(row=>row.points),[1000,0]);
});

test('échéance : clôture et résultats durables sans réponse de tous, rollback puis reconnexion',async t=>{
  const env=await environment(t);let app=await env.start();const {host,credentials}=await room(t,app);
  const {connection:player,credentials:identity}=await joinPlayer(t,app,credentials.code);
  await joinPlayer(t,app,credentials.code,'Sans réponse');
  host.send({type:'start'});await player.next(state('open'));
  player.send({type:'answer',questionId:'planete',submissionId:'kept',option:'mars'});
  assert.equal((await player.next(m=>m.type==='answer-result')).confirmed,true);
  env.setNow(31000);
  const db=new DatabaseSync(env.filename);
  try{
    db.exec("CREATE TRIGGER fail_expiry BEFORE UPDATE ON quiz_sessions BEGIN SELECT RAISE(ABORT,'injected'); END");
    assert.throws(()=>app.rooms.checkpoint());
    assert.equal(JSON.parse(db.prepare('SELECT state_json FROM quiz_sessions').get().state_json).current.phase,'open');
    db.exec('DROP TRIGGER fail_expiry');app.rooms.checkpoint();
  }finally{db.close();}
  host.send({type:'sync'});const closed=await host.next(state('closed',1));
  assert.deepEqual(closed.ranking.map(row=>row.points),[1000,0]);
  player.send({type:'answer',questionId:'planete',submissionId:'kept',option:'mars'});
  assert.equal((await player.next(m=>m.type==='answer-result')).status,'duplicate');
  await app.stop();env.setNow(0);app=await env.start();
  const returning=await client(t,app,{type:'player',roomId:identity.roomId,token:identity.token});
  assert.equal((await returning.next(state('closed',1))).ownAnswer.option,'mars');
});

test('30 joueurs simulés : trois questions et 90 réponses confirmées sans doublon',async t=>{
  const env=await environment(t),app=await env.start(),{host,credentials}=await room(t,app);
  const players=[];for(let i=0;i<30;i++)players.push((await joinPlayer(t,app,credentials.code,`Joueur ${i+1}`)).connection);
  host.send({type:'start'});await players[0].next(state('open'));
  const durations=[];
  for(const [questionId,option] of [['planete','mars'],['ocean','pacifique'],['hexagone','six']]){
    await Promise.all(players.map(async(player,i)=>{
      const start=performance.now();player.send({type:'answer',questionId,submissionId:`answer-${i}`,option});
      assert.equal((await player.next(m=>m.type==='answer-result'&&m.questionId===questionId)).confirmed,true);
      durations.push(performance.now()-start);
    }));
    const result=await players[0].next(state('closed',30));
    assert.equal(result.ranking.length,30);assert.ok(result.ranking.every(r=>r.rank===1&&r.points===result.questionNumber*1000));
    if(!result.final){host.send({type:'next',questionId});await players[0].next(m=>m.type==='state'&&m.phase==='open'&&m.questionId!==questionId);}
  }
  const db=new DatabaseSync(env.filename);try{assert.equal(db.prepare('SELECT count(*) AS n FROM quiz_answers').get().n,90);}finally{db.close();}
  durations.sort((a,b)=>a-b);t.diagnostic(`Confirmation boucle locale (90 réponses) : médiane ${durations[45].toFixed(1)} ms, p95 ${durations[85].toFixed(1)} ms, max ${durations[89].toFixed(1)} ms ; aucune garantie sur téléphones physiques.`);
});

test('échec SQL pendant la progression : question et score précédents conservés',async t=>{
  const env=await environment(t),app=await env.start(),{host,credentials}=await room(t,app);
  const {connection:player}=await joinPlayer(t,app,credentials.code);
  host.send({type:'start'});await player.next(state('open'));
  player.send({type:'answer',questionId:'planete',submissionId:'kept',option:'mars'});assert.equal((await player.next(m=>m.type==='answer-result')).confirmed,true);
  host.send({type:'reveal',questionId:'planete'});await player.next(state('closed'));
  const db=new DatabaseSync(env.filename);
  try{
    db.exec("CREATE TRIGGER fail_next BEFORE UPDATE ON quiz_sessions BEGIN SELECT RAISE(ABORT,'injected'); END");
    host.send({type:'next',questionId:'planete'});assert.equal((await host.next(m=>m.type==='error')).code,'storage-failed');
    const stored=JSON.parse(db.prepare('SELECT state_json FROM quiz_sessions').get().state_json);
    assert.equal(stored.current.question.id,'planete');assert.equal(stored.current.answers[0].points,1000);assert.equal(stored.completed.length,0);
    db.exec('DROP TRIGGER fail_next');host.send({type:'next',questionId:'planete'});
    const next=await player.next(m=>m.type==='state'&&m.questionId==='ocean');assert.equal(next.answered,0);
    host.send({type:'next',questionId:'planete'});host.send({type:'reveal',questionId:'ocean'});
    const revealed=await player.next(m=>m.type==='state'&&m.questionId==='ocean'&&m.phase==='closed');assert.equal(revealed.ranking[0].points,1000);
  }finally{db.close();}
});
