import { before, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createContext, runInContext } from 'node:vm';
import { DatabaseSync } from 'node:sqlite';
import { buildEngine } from '../../tooling/engine-build.mjs';
import { SqliteSessionStore } from '../../apps/server-node/persistence/sqlite-session-store.mjs';

let engine;
before(async () => {
  const { output } = await buildEngine(); const context = createContext(Object.create(null));
  runInContext(await readFile(output, 'utf8'), context); engine = context.KuikuizEngine;
});
const question = {id:'q1',options:['a','b'],correctOption:'a',durationMs:10000,maxPoints:1000,scoring:'speed'};
const answer = (playerId, submissionId) => ({type:'answer',playerId,submissionId,option:'a'});
async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(),'kuikuiz-recovery-'));
  const filename = join(directory,'test.sqlite'); const stores = [];
  const open = () => {const store = new SqliteSessionStore(filename,engine); stores.push(store); return store;};
  t.after(async () => {
    stores.forEach(s=>s.close());
    assert.ok(resolve(directory).startsWith(resolve(tmpdir())+'\\kuikuiz-recovery-') || resolve(directory).startsWith(resolve(tmpdir())+'/kuikuiz-recovery-'));
    await rm(directory,{recursive:true,force:true});
  });
  return {filename,open};
}
test('restauration : nouvelle origine, temps et scores conservés, attente de reprise explicite', async t => {
  const {open} = await fixture(t); let store = open();
  store.create('s',question,['p1','p2'],100000);
  const accepted = store.dispatch('s',answer('p1','a1'),102000);
  store.dispatch('s',{type:'checkpoint'},104000); store.close();
  store = open();
  assert.throws(()=>store.dispatch('s',answer('p2','a2'),10),/Recovery required/);
  const recovered = store.recover('s',10);
  assert.equal(recovered.phase,'paused'); assert.equal(recovered.elapsedMs,4000);
  assert.equal(recovered.lastNowMs,10); assert.equal(recovered.answers[0].points,accepted.answer.points);
  assert.equal(store.dispatch('s',answer('p2','a2'),5000).status,'paused');
  const duplicate = store.dispatch('s',answer('p1','a1'),6000);
  assert.equal(duplicate.confirmed,true); assert.equal(duplicate.status,'duplicate');
  assert.equal(duplicate.state.elapsedMs,4000);
  store.dispatch('s',{type:'resume'},7000);
  const next = store.dispatch('s',answer('p2','a2'),8000);
  assert.equal(next.answer.elapsedMs,5000); assert.equal(next.answer.points,650);
  assert.equal(next.state.answers.length,2);
});
test('état clôturé non rouvert ; restauration répétée et checkpoints en pause sans temps ajouté', () => {
  const initial = engine.create(question,['p1'],100);
  const checkpoint = engine.apply(initial,{type:'checkpoint'},600).state;
  const snapshot = JSON.stringify(checkpoint);
  const recovered = engine.recover(checkpoint,1);
  assert.equal(JSON.stringify(checkpoint),snapshot);
  assert.equal(engine.recover(recovered,10000).elapsedMs,500);
  assert.equal(engine.apply(recovered,{type:'checkpoint'},1000).state.elapsedMs,500);
  const closed = engine.apply(checkpoint,{type:'close'},700).state;
  const restored = engine.recover(closed,0);
  assert.equal(restored.phase,'closed'); assert.equal(restored.elapsedMs,600);
  assert.equal(engine.apply(restored,{type:'resume'},10).status,'invalid-phase');
  for(const now of [NaN,Infinity,-1]) assert.throws(()=>engine.recover(checkpoint,now));
});
test('restauration non validée : aucune commande autorisée et état SQLite inchangé', async t => {
  const {filename,open} = await fixture(t); const store=open(); store.create('s',question,['p1'],1000);
  const db = new DatabaseSync(filename);
  db.exec("CREATE TRIGGER fail_recovery BEFORE UPDATE ON sessions BEGIN SELECT RAISE(ABORT,'recovery-failed'); END");
  try {
    assert.throws(()=>store.recover('s',1),/recovery-failed/);
    assert.equal(store.read('s').phase,'open'); assert.equal(store.read('s').lastNowMs,1000);
    assert.throws(()=>store.dispatch('s',{type:'resume'},1),/Recovery required/);
    db.exec('DROP TRIGGER fail_recovery');
    store.recover('s',1); assert.equal(store.read('s').phase,'paused');
  } finally {db.close();}
});
test('restaurer une question expirée ne recrée pas de temps disponible', () => {
  let state=engine.create(question,['p1'],1000);
  state=engine.apply(state,{type:'checkpoint'},12000).state;
  state=engine.recover(state,0);
  state=engine.apply(state,{type:'resume'},50).state;
  assert.equal(engine.apply(state,answer('p1','a1'),51).status,'late');
});
