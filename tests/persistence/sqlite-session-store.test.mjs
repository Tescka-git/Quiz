import { before, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { spawnSync } from 'node:child_process';
import { createContext, runInContext } from 'node:vm';
import { buildEngine } from '../../tooling/engine-build.mjs';
import { SqliteSessionStore } from '../../apps/server-node/persistence/sqlite-session-store.mjs';

let engine, artifact;
before(async () => {
  artifact = await buildEngine();
  const context = createContext(Object.create(null));
  runInContext(await readFile(artifact.output, 'utf8'), context);
  engine = context.KuikuizEngine;
});
const question = { id:'q1', options:['a','b'], correctOption:'a', durationMs:10000, maxPoints:1000, scoring:'fixed' };
const answer = { type:'answer', playerId:'p1', submissionId:'s1', option:'a' };
async function setup(t) {
  const directory = await mkdtemp(join(tmpdir(), 'kuikuiz-sqlite-'));
  const filename = join(directory, 'session.sqlite');
  const store = new SqliteSessionStore(filename, engine);
  store.create('session', question, ['p1','p2'], 1000);
  store.close();
  return filename;
}
function cleanup(t, file, store) {
  t.after(async () => {
    store.close();
    const directory = resolve(dirname(file));
    assert.ok(directory.startsWith(resolve(tmpdir()) + '\\kuikuiz-sqlite-')
      || directory.startsWith(resolve(tmpdir()) + '/kuikuiz-sqlite-'));
    await rm(directory, { recursive:true, force:true });
  });
}
function openLive(file) {
  const store = new SqliteSessionStore(file, engine);
  store.recover('session', 1000);
  store.dispatch('session', { type:'resume' }, 1000);
  return store;
}
test('réponse confirmée conservée après fermeture et retransmise une seule fois', async t => {
  const file = await setup(t);
  let store = openLive(file);
  assert.equal(store.dispatch('session', answer, 2000).confirmed, true);
  store.close();
  store = openLive(file); cleanup(t, file, store);
  const repeated = store.dispatch('session', answer, 3000);
  assert.equal(repeated.status, 'duplicate'); assert.equal(repeated.confirmed, true);
  assert.equal(repeated.state.answers.length, 1); assert.equal(repeated.answer.points, 1000);
  const conflicting = store.dispatch('session', {...answer, option:'b'}, 3000);
  assert.equal(conflicting.confirmed, false); assert.equal(conflicting.status, 'submission-conflict');
});
test('échec SQL : pas de confirmation ni mise à jour partielle ; session encore utilisable', async t => {
  const file = await setup(t);
  const db = new DatabaseSync(file);
  const store = openLive(file); cleanup(t, file, store);
  // Panne déterministe entre insertion de la réponse et mise à jour de l'état.
  db.exec("CREATE TRIGGER simulate_disk_failure BEFORE UPDATE ON sessions BEGIN SELECT RAISE(ABORT,'injected-write-failure'); END");
  let result;
  assert.throws(() => { result = store.dispatch('session', answer, 2000); }, /injected-write-failure/);
  assert.equal(result, undefined); assert.equal(store.read('session').answers.length, 0);
  assert.equal(db.prepare('SELECT count(*) AS n FROM answers').get().n, 0);
  db.exec('DROP TRIGGER simulate_disk_failure'); db.close();
  assert.equal(store.dispatch('session', answer, 2000).confirmed, true);
});
test('deux instances relisent le dernier état ; contraintes d’unicité et isolation des sessions', async t => {
  const file = await setup(t);
  const first = openLive(file);
  const second = openLive(file);
  t.after(() => { first.close(); second.close(); });
  // Enregistrement du nettoyage après la fermeture des deux connexions.
  t.after(async () => {
    const directory = resolve(dirname(file));
    assert.ok(directory.startsWith(resolve(tmpdir()) + '\\kuikuiz-sqlite-') || directory.startsWith(resolve(tmpdir()) + '/kuikuiz-sqlite-'));
    await rm(directory, { recursive:true, force:true });
  });
  first.create('other', question, ['p1','p2'], 1000);
  second.recover('other', 1000);
  second.dispatch('other', {type:'resume'}, 1000);
  assert.equal(first.dispatch('session', answer, 2000).confirmed, true);
  assert.equal(second.dispatch('session', answer, 2500).status, 'duplicate');
  const refused = second.dispatch('session', {...answer, submissionId:'new'}, 3000);
  assert.equal(refused.status, 'already-answered'); assert.equal(refused.confirmed, false);
  assert.equal(second.dispatch('other', answer, 2000).confirmed, true);
  assert.equal(first.read('session').answers.length, 1);
  assert.equal(first.read('other').answers.length, 1);
  const db = new DatabaseSync(file);
  try {
    assert.throws(() => db.prepare('INSERT INTO answers VALUES (?,?,?,?)')
      .run('session','new','p1','{}'), /UNIQUE/);
    assert.throws(() => db.prepare('INSERT INTO answers VALUES (?,?,?,?)')
      .run('session','s1','p2','{}'), /UNIQUE/);
  } finally { db.close(); }
});

test('pause et fermeture sont conservées ; réponse refusée sans confirmation', async t => {
  const file = await setup(t);
  let store = openLive(file);
  store.dispatch('session', {type:'pause'}, 2000); store.close();
  store = new SqliteSessionStore(file, engine); cleanup(t, file, store);
  store.recover('session', 500);
  const refused = store.dispatch('session', answer, 9000);
  assert.equal(refused.status, 'paused'); assert.equal(refused.confirmed, false);
  assert.equal(refused.state.elapsedMs, 1000);
  store.dispatch('session', {type:'resume'}, 10000);
  const accepted = store.dispatch('session', answer, 11000);
  assert.equal(accepted.answer.elapsedMs, 2000); assert.equal(accepted.confirmed, true);
  store.dispatch('session', {type:'close'}, 12000);
  assert.equal(store.read('session').phase, 'closed');
  assert.equal(store.dispatch('session', answer, 13000).status, 'duplicate');
});
test('commit bloqué par un lecteur : aucune confirmation et rollback avant nouvel essai', async t => {
  const file = await setup(t);
  const store = openLive(file);
  const reader = new DatabaseSync(file);
  cleanup(t, file, store);
  try {
    reader.exec('BEGIN');
    reader.prepare('SELECT state_json FROM sessions').all();
    let result;
    assert.throws(() => { result = store.dispatch('session', answer, 2000); }, /locked|busy/i);
    assert.equal(result, undefined);
    reader.exec('ROLLBACK');
    assert.equal(store.read('session').answers.length, 0);
    assert.equal(reader.prepare('SELECT count(*) AS n FROM answers').get().n, 0);
    assert.equal(store.dispatch('session', answer, 2000).confirmed, true);
  } finally {
    if (reader.isTransaction) reader.exec('ROLLBACK');
    reader.close();
  }
});

for (const [mode, code, count, confirmed] of [
  ['before-commit',42,0,false], ['after-commit',44,1,false], ['after-confirmation',43,1,true]
]) test(`arrêt du processus ${mode} : reprise cohérente et sans doublon`, async t => {
  const file = await setup(t);
  const child = spawnSync(process.execPath, [fileURLToPath(new URL('./crash-worker.mjs', import.meta.url)), file, mode, artifact.output],
    {encoding:'utf8',timeout:15000,windowsHide:true});
  assert.equal(child.status, code, child.stderr || child.error?.message);
  assert.equal(child.stdout.includes('CONFIRMED'), confirmed);
  const store = openLive(file); cleanup(t, file, store);
  assert.equal(store.read('session').answers.length, count);
  const result = store.dispatch('session', answer, 3000);
  assert.equal(result.status, count ? 'duplicate' : 'accepted-in-memory');
  assert.equal(result.confirmed, true); assert.equal(result.state.answers.length, 1);
  const db = new DatabaseSync(file);
  assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
  assert.equal(db.prepare('SELECT count(*) AS n FROM answers').get().n, 1); db.close();
});
