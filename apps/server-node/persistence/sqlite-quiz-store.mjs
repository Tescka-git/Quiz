import { DatabaseSync } from 'node:sqlite';

/** Snapshot de quiz et registre de réponses dans la même transaction. */
export class SqliteQuizStore {
  constructor(filename,engine){
    this.engine=engine;this.ready=new Set();this.db=new DatabaseSync(filename);
    this.db.exec(`PRAGMA foreign_keys=ON; PRAGMA busy_timeout=3000; PRAGMA journal_mode=DELETE; PRAGMA synchronous=EXTRA;
      CREATE TABLE IF NOT EXISTS quiz_sessions(id TEXT PRIMARY KEY,state_json TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS quiz_answers(session_id TEXT NOT NULL REFERENCES quiz_sessions(id),question_id TEXT NOT NULL,
        submission_id TEXT NOT NULL,player_id TEXT NOT NULL,answer_json TEXT NOT NULL,
        PRIMARY KEY(session_id,question_id,submission_id),UNIQUE(session_id,question_id,player_id));`);
  }
  transaction(operation){
    this.db.exec('BEGIN IMMEDIATE');
    try{const result=operation();this.db.exec('COMMIT');return result;}
    catch(error){if(this.db.isTransaction)this.db.exec('ROLLBACK');throw error;}
  }
  create(id,questions,players,now){
    const state=this.engine.createQuiz(questions,players,now);
    this.transaction(()=>this.db.prepare('INSERT INTO quiz_sessions VALUES (?,?)').run(id,JSON.stringify(state)));
    this.ready.add(id);return state;
  }
  read(id){const row=this.db.prepare('SELECT state_json FROM quiz_sessions WHERE id=?').get(id);
    if(!row)throw new Error('Unknown session');return JSON.parse(row.state_json);}
  save(id,state){this.db.prepare('UPDATE quiz_sessions SET state_json=? WHERE id=?').run(JSON.stringify(state),id);}
  recover(id,now){
    this.ready.delete(id);
    const result=this.transaction(()=>{const state=this.engine.recoverQuiz(this.read(id),now);this.save(id,state);return state;});
    this.ready.add(id);return result;
  }
  dispatch(id,command,now,questionId){
    if(!this.ready.has(id))throw new Error('Recovery required before dispatch');
    return this.transaction(()=>{
      const result=this.engine.applyQuiz(this.read(id),command,now,questionId);
      if(result.status==='accepted-in-memory')this.db.prepare('INSERT INTO quiz_answers VALUES (?,?,?,?,?)')
        .run(id,questionId,result.answer.submissionId,result.answer.playerId,JSON.stringify(result.answer));
      this.save(id,result.state);
      const confirmed=['accepted-in-memory','duplicate'].includes(result.status);
      if(confirmed){const stored=this.db.prepare('SELECT answer_json FROM quiz_answers WHERE session_id=? AND question_id=? AND submission_id=?')
        .get(id,questionId,result.answer.submissionId);
        if(stored?.answer_json!==JSON.stringify(result.answer))throw new Error('Inconsistent stored answer');}
      return {...result,confirmed};
    });
  }
  close(){if(!this.closed){this.closed=true;this.db.close();}}
}
