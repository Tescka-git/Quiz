import { DatabaseSync } from 'node:sqlite';

/** Adaptateur expérimental : une session contient une seule question du moteur. */
export class SqliteSessionStore {
  #database;
  #engine;
  #closed = false;
  #readySessions = new Set();
  constructor(filename, engine) {
    this.#engine = engine;
    this.#database = new DatabaseSync(filename);
    try {
      this.#database.exec(`
        PRAGMA foreign_keys = ON;
        PRAGMA busy_timeout = 3000;
        PRAGMA journal_mode = DELETE;
        PRAGMA synchronous = EXTRA;
        CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY NOT NULL,
          state_json TEXT NOT NULL
        ) STRICT;
        CREATE TABLE IF NOT EXISTS answers (
          session_id TEXT NOT NULL REFERENCES sessions(id),
          submission_id TEXT NOT NULL,
          player_id TEXT NOT NULL,
          answer_json TEXT NOT NULL,
          PRIMARY KEY (session_id, submission_id),
          UNIQUE (session_id, player_id)
        ) STRICT;
      `);
    } catch (error) { this.#database.close(); throw error; }
  }
  #transaction(operation) {
    this.#database.exec('BEGIN IMMEDIATE');
    try {
      const result = operation();
      this.#database.exec('COMMIT');
      return result;
    } catch (error) {
      if (this.#database.isTransaction) this.#database.exec('ROLLBACK');
      throw error;
    }
  }
  create(sessionId, question, players, nowMs) {
    if (typeof sessionId !== 'string' || sessionId.length === 0) throw new Error('Invalid session id');
    const state = this.#engine.create(question, players, nowMs);
    this.#transaction(() => this.#database.prepare('INSERT INTO sessions(id,state_json) VALUES (?,?)')
      .run(sessionId, JSON.stringify(state)));
    this.#readySessions.add(sessionId);
    return state;
  }
  read(sessionId) {
    const row = this.#database.prepare('SELECT state_json FROM sessions WHERE id=?').get(sessionId);
    if (!row) throw new Error('Unknown session');
    return JSON.parse(row.state_json);
  }
  recover(sessionId, nowMs) {
    this.#readySessions.delete(sessionId);
    const state = this.#transaction(() => {
      const restored = this.#engine.recover(this.read(sessionId), nowMs);
      this.#database.prepare('UPDATE sessions SET state_json=? WHERE id=?').run(JSON.stringify(restored), sessionId);
      return restored;
    });
    this.#readySessions.add(sessionId);
    return state;
  }
  dispatch(sessionId, command, nowMs) {
    if (!this.#readySessions.has(sessionId)) throw new Error('Recovery required before dispatch');
    // Pas de cache mémoire : même la décision métier part de l'état transactionnel.
    return this.#transaction(() => {
      const result = this.#engine.apply(this.read(sessionId), command, nowMs);
      if (result.status === 'accepted-in-memory') {
        const answer = result.answer;
        this.#database.prepare('INSERT INTO answers(session_id,submission_id,player_id,answer_json) VALUES (?,?,?,?)')
          .run(sessionId, answer.submissionId, answer.playerId, JSON.stringify(answer));
      }
      this.#database.prepare('UPDATE sessions SET state_json=? WHERE id=?')
        .run(JSON.stringify(result.state), sessionId);
      const confirmed = result.status === 'accepted-in-memory' || result.status === 'duplicate';
      if (confirmed) {
        const stored = this.#database.prepare('SELECT answer_json FROM answers WHERE session_id=? AND submission_id=?')
          .get(sessionId, result.answer.submissionId);
        if (!stored || stored.answer_json !== JSON.stringify(result.answer)) throw new Error('Inconsistent stored answer');
      }
      // Cet objet ne sort de #transaction qu'après COMMIT. Aucune émission réseau ici.
      return { ...result, confirmed };
    });
  }
  close() {
    if (!this.#closed) { this.#database.close(); this.#closed = true; }
  }
}
