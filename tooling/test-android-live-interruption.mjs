// Recette physique : attendre une réponse durable, interrompre l'hôte, vérifier la reprise.
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import {request} from 'node:https';
import assert from 'node:assert/strict';
import WebSocket from 'ws';

const adb=process.env.KUIKUIZ_ADB,device=process.env.KUIKUIZ_DEVICE;
if(!adb||!device)throw Error('KUIKUIZ_ADB et KUIKUIZ_DEVICE requis ; arrêt forcé de la seule maquette.');
const origin=process.env.KUIKUIZ_ORIGIN||'https://192.168.1.21:8443';
const execute=promisify(execFile);
const run=(...args)=>execute(adb,['-s',device,...args],{encoding:'utf8',timeout:20000});
const directory='artifacts/recovery-inspection';await mkdir(directory,{recursive:true});
const ca=await readFile(new URL('../.tools/tls/ca.pem',import.meta.url));
async function snapshot(name,roomId){
  const {stdout}=await execute(adb,['-s',device,'exec-out','run-as','fr.kuikuiz.probe','cat','databases/kuikuiz-playable-v3.db'],{encoding:'buffer',maxBuffer:20*1024*1024,timeout:10000});
  const filename=`${directory}/${name}.sqlite`;await writeFile(filename,stdout);
  const db=new DatabaseSync(filename,{readOnly:true});
  try{
    const room=roomId?db.prepare('SELECT id,code FROM mock_rooms WHERE id=?').get(roomId):db.prepare('SELECT id,code FROM mock_rooms ORDER BY rowid DESC LIMIT 1').get();
    assert.ok(room,'Salle absente');
    const row=db.prepare('SELECT state_json FROM quiz_sessions WHERE id=?').get(room.id);
    const ledger=db.prepare('SELECT question_id,player_id,submission_id,answer_json FROM quiz_answers WHERE session_id=? ORDER BY question_id,player_id').all(room.id);
    const players=db.prepare('SELECT count(*) AS n FROM mock_players WHERE room_id=?').get(room.id).n;
    return {room,state:row?JSON.parse(row.state_json):null,ledger,players};
  }finally{db.close();}
}
async function health(){return new Promise((resolve,reject)=>{
  const req=request(origin+'/connection.json',{ca},res=>{let body='';res.on('data',b=>body+=b);res.on('end',()=>{try{assert.equal(res.statusCode,200);resolve(JSON.parse(body));}catch(e){reject(e);}});});
  const timer=setTimeout(()=>req.destroy(Error('HTTPS timeout')),1500);req.on('close',()=>clearTimeout(timer));req.on('error',reject);req.end();
});}

let report={result:'FAIL',origin};
try{
  const initial=await snapshot('live-initial');
  assert.equal(initial.players,2,'Deux joueurs sont nécessaires');
  assert.equal(initial.state,null,'Préparer une nouvelle salle sans lancer la question');
  report.code=initial.room.code;
  console.log(`ARMED : salle ${initial.room.code}, deux joueurs. Lancer puis confirmer Mars ; ne pas mettre en pause.`);
  const deadline=Date.now()+180000;let before;
  while(Date.now()<deadline){
    const candidate=await snapshot('live-before',initial.room.id),current=candidate.state?.current;
    if(current?.answers.length){
      assert.equal(current.phase,'open','Question déjà clôturée ou en pause');
      assert.equal(current.answers.length,1);
      const answer=current.answers[0];
      assert.equal(answer.option,'mars');
      assert.equal(candidate.ledger.length,1);
      assert.deepEqual(JSON.parse(candidate.ledger[0].answer_json),answer);
      const uptime=Number((await run('shell','cat','/proc/uptime')).stdout.split(' ')[0])*1000;
      const elapsed=current.elapsedMs+uptime-current.lastNowMs;
      assert.ok(uptime>=current.lastNowMs&&elapsed>=current.elapsedMs,'Horloge Android incohérente');
      assert.ok(elapsed<current.question.durationMs-5000,'Trop près de l’échéance ; aucun arrêt effectué');
      report.elapsedBeforeStopMs=elapsed;before=candidate;break;
    }
    await new Promise(resolve=>setTimeout(resolve,400));
  }
  assert.ok(before,'Aucune réponse durable reçue dans le délai de recette');
  report.oldPid=(await run('shell','pidof','fr.kuikuiz.probe')).stdout.trim();
  await run('shell','am','force-stop','fr.kuikuiz.probe');
  console.log('STOPPED : réponse durable vérifiée ; relance de la maquette.');
  await run('shell','am','start','-n','fr.kuikuiz.probe/.MainActivity');
  await run('shell','uiautomator','dump','--compressed','/sdcard/kuikuiz-window.xml');
  const xml=(await run('shell','cat','/sdcard/kuikuiz-window.xml')).stdout;
  const button=xml.match(/text="[^"]*HTTPS\/WSS DE TEST"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
  assert.ok(button,'Bouton HTTPS non visible ; relancer manuellement');
  await run('shell','input','tap',String(Math.round((+button[1]+ +button[3])/2)),String(Math.round((+button[2]+ +button[4])/2)));
  const readyDeadline=Date.now()+30000;let config;
  while(Date.now()<readyDeadline){try{config=await health();break;}catch{}await new Promise(resolve=>setTimeout(resolve,500));}
  assert.ok(config,'HTTPS non prêt');
  await new Promise((resolve,reject)=>{const ws=new WebSocket(config.socketPath,{origin,ca,handshakeTimeout:5000});ws.on('error',reject);ws.on('open',()=>{ws.close();resolve();});});
  const after=await snapshot('live-after',initial.room.id);
  assert.equal(after.state.current.phase,'paused');
  assert.deepEqual(after.state.current.answers,before.state.current.answers);
  assert.deepEqual(after.ledger,before.ledger);
  assert.ok(after.state.current.elapsedMs>=before.state.current.elapsedMs);
  assert.ok(after.state.current.elapsedMs<after.state.current.question.durationMs);
  await new Promise(resolve=>setTimeout(resolve,1200));
  const frozen=await snapshot('live-frozen',initial.room.id);
  assert.equal(frozen.state.current.phase,'paused');
  assert.equal(frozen.state.current.elapsedMs,after.state.current.elapsedMs);
  report={...report,result:'PASS',newPid:(await run('shell','pidof','fr.kuikuiz.probe')).stdout.trim(),
    restoredElapsedMs:after.state.current.elapsedMs,remainingMs:after.state.current.question.durationMs-after.state.current.elapsedMs,
    answersUnchanged:true,ledgerUnchanged:true,pausedTimeFrozen:true,points:after.state.current.answers[0].points,
    limits:'Copies de laboratoire en lecture seule ; pas de panne pendant commit ni preuve sans Internet. Reprise au dernier checkpoint, pas mesure du temps exact de mort du processus.'};
}catch(error){report.error=error.message;process.exitCode=1;}
report.date=new Date().toISOString();await writeFile(`${directory}/live-interruption-report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
