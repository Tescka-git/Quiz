import { before, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createContext, runInContext } from 'node:vm';
import { buildEngine, checkSource } from '../../tooling/engine-build.mjs';

let engine;
let artifact;
before(async () => {
  artifact = await buildEngine();
  const context = createContext(Object.create(null));
  runInContext(await readFile(artifact.output, 'utf8'), context);
  engine = context.KuikuizEngine;
});
const question = { id: 'q1', options: ['a', 'b'], correctOption: 'a', durationMs: 10000,
  maxPoints: 1000, scoring: 'speed' };
const answer = (playerId = 'p1', submissionId = 's1', option = 'a') => ({ type: 'answer', playerId, submissionId, option });
const fresh = (q = question) => engine.create(q, ['p1', 'p2', 'p3'], 1000);

test('quiz : progression immuable, questions distinctes, cumul et fin sans réouverture', () => {
  const questions=['q1','q2','q3'].map(id=>({...question,id,scoring:'fixed'}));
  assert.throws(()=>engine.createQuiz([],['p1'],0));
  assert.throws(()=>engine.createQuiz([questions[0],questions[0]],['p1'],0));
  let state=engine.createQuiz(questions,['p1','p2','p3'],0);
  const input=state;
  const original=JSON.stringify(state);
  assert.equal(engine.applyQuiz(state,{type:'next'},0,'q1').status,'invalid-phase');
  for(let i=0;i<3;i++){
    const id=questions[i].id;
    const stale=engine.applyQuiz(state,answer(),i,'previous');assert.equal(stale.status,'stale-question');assert.equal(stale.state,state);
    state=engine.applyQuiz(state,answer('p1','same-id'),i,id).state;
    state=engine.applyQuiz(state,answer('p2','tie-id'),i,id).state;
    state=engine.applyQuiz(state,{type:'close'},i,id).state;
    const ranking=JSON.parse(JSON.stringify(engine.quizRanking(state)));
    assert.deepEqual(ranking.map(row=>[row.rank,row.points]),[[1,(i+1)*1000],[1,(i+1)*1000],[3,0]]);
    if(i<2)state=engine.applyQuiz(state,{type:'next'},i,id).state;
  }
  assert.equal(engine.applyQuiz(state,{type:'next'},3,'q3').status,'invalid-phase');
  const recovered=engine.recoverQuiz(JSON.parse(JSON.stringify(state)),0);assert.equal(recovered.current.phase,'closed');assert.equal(recovered.completed.length,2);
  assert.equal(JSON.stringify(input),original);
  assert.equal(questions[0].options.length,2);
});

test('artefact autonome : score attendu, aucun effet sur les entrées', () => {
  const input = fresh(); const snapshot = JSON.stringify(input);
  const result = engine.apply(input, answer(), 6000);
  assert.equal(result.status, 'accepted-in-memory');
  assert.equal(result.answer.points, 650);
  assert.equal(JSON.stringify(input), snapshot);
  assert.match(artifact.sha256, /^[a-f0-9]{64}$/);
});
test('pause : temps gelé et réponses refusées ; reprise sans bonus de pause', () => {
  const paused = engine.apply(fresh(), { type: 'pause' }, 3000).state;
  assert.equal(engine.apply(paused, answer(), 8000).status, 'paused');
  const resumed = engine.apply(paused, { type: 'resume' }, 9000).state;
  const result = engine.apply(resumed, answer(), 10000);
  assert.equal(result.answer.elapsedMs, 3000);
  assert.equal(result.answer.points, 790);
});
test('réponse définitive et retransmission idempotente après clôture et sérialisation', () => {
  const first = engine.apply(fresh(), answer(), 2000);
  assert.equal(engine.apply(first.state, answer('p1', 's2', 'b'), 2100).status, 'already-answered');
  const closed = engine.apply(first.state, { type: 'close' }, 2500).state;
  const restored = JSON.parse(JSON.stringify(closed));
  const replay = engine.apply(restored, answer(), 20000);
  assert.equal(replay.status, 'duplicate'); assert.equal(replay.state.answers.length, 1);
  assert.ok(Math.abs(replay.answer.points - 930) < 1e-10);
  assert.equal(engine.apply(restored, answer('p2'), 20000).status, 'submission-conflict');
});
test('échéance exacte refusée ; instant précédent accepté', () => {
  assert.equal(engine.apply(fresh(), answer(), 11000).status, 'late');
  assert.equal(engine.apply(fresh(), answer(), 10999).status, 'accepted-in-memory');
});
test('temps invalide et configurations incohérentes refusés', () => {
  for (const time of [NaN, Infinity, -1, 999]) assert.throws(() => engine.apply(fresh(), answer(), time));
  for (const q of [{...question,durationMs:0},{...question,maxPoints:-1},{...question,options:['a','a']}])
    assert.throws(() => fresh(q));
});
test('joueur inconnu, mauvaise option et mauvaise réponse', () => {
  assert.equal(engine.apply(fresh(), answer('absent'), 2000).status, 'unknown-player');
  assert.equal(engine.apply(fresh(), answer('p1','s1','absent'), 2000).status, 'invalid-answer');
  assert.equal(engine.apply(fresh(), answer('p1','s1','b'), 2000).answer.points, 0);
});
test('points fixes, zéro point et classement de compétition', () => {
  let state = fresh({...question,scoring:'fixed'});
  state = engine.apply(state, answer(), 2000).state;
  state = engine.apply(state, answer('p2','s2'), 3000).state;
  const ranks = JSON.parse(JSON.stringify(engine.ranking(state)));
  assert.deepEqual(ranks.map(r=>r.rank), [1,1,3]);
  assert.equal(engine.apply(fresh({...question,maxPoints:0}),answer(),2000).answer.points,0);
});
test('contrôles négatifs : imports, réexportations, API directes et alias interdits', () => {
  for (const source of ["import x from './helper'", "export * from './helper'", "import('node:fs')",
    'const x = Date.now', 'const clock = globalThis', 'const random = Math.random',
    'const x = process', 'fetch("/")', 'const x = window', 'const x = new Function("return 1")']) {
    assert.throws(() => checkSource(source), undefined, source);
  }
});

test('scénario JSON transférable vers Android avec résultats métier attendus', async () => {
  const fixture = JSON.parse(await readFile(new URL('../fixtures/engine-portability.json', import.meta.url), 'utf8'));
  let state = engine.create(fixture.question, fixture.players, fixture.startNowMs);
  for (const step of fixture.steps) {
    if (step.restoreBefore) state = JSON.parse(JSON.stringify(state));
    const result = engine.apply(state, step.command, step.nowMs);
    assert.equal(result.status, step.expectedStatus);
    assert.equal(result.state.elapsedMs, step.expectedElapsedMs);
    if (step.expectedPoints !== undefined) assert.ok(Math.abs(result.answer.points - step.expectedPoints) < 1e-10);
    state = result.state;
  }
  assert.equal(state.answers.length, fixture.expectedAnswerCount);
  assert.deepEqual(Array.from(engine.ranking(state), e => e.rank), fixture.expectedRanks);
});

test('harnais commun : scénario de restauration avec temps recalé et échéance conservée', async () => {
  const context = createContext(Object.create(null));
  runInContext(await readFile(artifact.output, 'utf8'), context);
  runInContext(await readFile(new URL('../../experiments/engine-portability/scenario.js', import.meta.url), 'utf8'), context);
  const fixture = JSON.parse(await readFile(new URL('../fixtures/engine-recovery-portability.json', import.meta.url), 'utf8'));
  const result = JSON.parse(context.runKuikuizScenario(fixture));
  assert.equal(result.trace.length,9);
  assert.equal(result.trace[2].state.phase,'paused');
  assert.deepEqual(result.ranking.map(r=>r.points),[860,650,0]);
});
