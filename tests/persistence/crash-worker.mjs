import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { SqliteSessionStore } from '../../apps/server-node/persistence/sqlite-session-store.mjs';

const [filename, mode, artifact] = process.argv.slice(2);
const context = createContext(Object.create(null));
runInContext(readFileSync(artifact, 'utf8'), context);
const engine = context.KuikuizEngine;
const command = { type: 'answer', playerId: 'p1', submissionId: 's1', option: 'a' };
if (mode === 'before-commit') {
  const db = new DatabaseSync(filename);
  db.exec('PRAGMA foreign_keys=ON; BEGIN IMMEDIATE');
  const state = JSON.parse(db.prepare('SELECT state_json FROM sessions WHERE id=?').get('session').state_json);
  const result = engine.apply(state, command, 2000);
  db.prepare('INSERT INTO answers VALUES (?,?,?,?)').run('session', 's1', 'p1', JSON.stringify(result.answer));
  db.prepare('UPDATE sessions SET state_json=? WHERE id=?').run(JSON.stringify(result.state), 'session');
  // Pas de close ni rollback : termine pendant la transaction non validée.
  process.exit(42);
}
const store = new SqliteSessionStore(filename, engine);
const result = store.dispatch('session', command, 2000);
if (!result.confirmed) throw new Error('Answer not committed');
if (mode === 'after-confirmation') process.stdout.write('CONFIRMED\n', () => process.exit(43));
else process.exit(44); // Commit réussi, mais aucune confirmation délivrée.
