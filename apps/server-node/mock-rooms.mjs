import { DatabaseSync } from 'node:sqlite';
import { randomBytes, createHash } from 'node:crypto';
const token = () => randomBytes(24).toString('hex');
const hash = value => createHash('sha256').update(value).digest('hex');
export const question = {
  id:'planete',text:'Quelle planète est surnommée la planète rouge ?',
  choices:[{id:'mars',text:'Mars'},{id:'venus',text:'Vénus'},{id:'jupiter',text:'Jupiter'},{id:'saturne',text:'Saturne'}],
  correctOption:'mars',durationMs:30000,maxPoints:1000,scoring:'fixed'
};
export const questions=[question,
  {id:'ocean',text:'Quel est le plus grand océan ?',choices:[{id:'pacifique',text:'Pacifique'},{id:'atlantique',text:'Atlantique'},{id:'indien',text:'Indien'},{id:'arctique',text:'Arctique'}],correctOption:'pacifique',durationMs:30000,maxPoints:1000,scoring:'fixed'},
  {id:'hexagone',text:'Combien de côtés possède un hexagone ?',choices:[{id:'six',text:'Six'},{id:'cinq',text:'Cinq'},{id:'huit',text:'Huit'},{id:'dix',text:'Dix'}],correctOption:'six',durationMs:30000,maxPoints:1000,scoring:'fixed'}];
export class MockRooms {
  constructor(filename, store, engine, engineHash, clock,project) {
    this.store=store;this.engine=engine;this.clock=clock;this.engineHash=engineHash;
    this.project=project;
    this.db=new DatabaseSync(filename);
    this.db.exec(`PRAGMA foreign_keys=ON; PRAGMA synchronous=EXTRA;
      CREATE TABLE IF NOT EXISTS mock_rooms(id TEXT PRIMARY KEY,code TEXT UNIQUE NOT NULL,host_hash TEXT NOT NULL,engine_hash TEXT NOT NULL,question_json TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS mock_players(id TEXT PRIMARY KEY,room_id TEXT NOT NULL REFERENCES mock_rooms(id),name TEXT NOT NULL,token_hash TEXT UNIQUE NOT NULL);`);
    try {
      for(const room of this.db.prepare('SELECT * FROM mock_rooms').all()) {
        if(room.engine_hash!==engineHash) throw new Error('Base de maquette liée à un autre moteur ; migration non prise en charge');
        if(this.state(room.id)) store.recover(room.id,clock());
      }
    } catch(error) {this.db.close();throw error;}
  }
  state(id) {try{return this.store.read(id);}catch(error){if(error.message==='Unknown session')return null;throw error;}}
  room(id) {const row=this.db.prepare('SELECT * FROM mock_rooms WHERE id=?').get(id);if(!row)throw new Error('unknown-room');return row;}
  create() {
    const id=token(),secret=token(),code=randomBytes(4).toString('hex').toUpperCase();
    this.db.prepare('INSERT INTO mock_rooms VALUES (?,?,?,?,?)').run(id,code,hash(secret),this.engineHash,JSON.stringify(questions));
    return {role:'host',roomId:id,token:secret,code};
  }
  authenticate(role,id,secret) {
    const room=this.room(id);
    if(role==='host') {if(hash(secret)!==room.host_hash)throw new Error('unauthorized');return {role,roomId:id};}
    const player=this.db.prepare('SELECT * FROM mock_players WHERE room_id=? AND token_hash=?').get(id,hash(secret));
    if(!player)throw new Error('unauthorized');return {role:'player',roomId:id,playerId:player.id};
  }
  join(code,name) {
    const room=this.db.prepare('SELECT * FROM mock_rooms WHERE code=?').get(code);
    if(!room)throw new Error('unknown-room');
    const admission=this.project.admission(Boolean(this.state(room.id)));if(admission.error)throw new Error(admission.error);
    const id=token(),secret=token();
    this.db.prepare('INSERT INTO mock_players VALUES (?,?,?,?)').run(id,room.id,name,hash(secret));
    return {role:'player',roomId:room.id,playerId:id,token:secret,code};
  }
  players(id) {return this.db.prepare('SELECT id,name FROM mock_players WHERE room_id=? ORDER BY rowid').all(id);}
  command(identity,message) {
    const id=identity.roomId;const frozenQuestion=JSON.parse(this.room(id).question_json);
    const command=this.project.command(identity,message,Boolean(this.state(id)));if(command.error)throw new Error(command.error);
    if(command.type==='sync')return;
    if(command.type==='start') {
      const roster=this.players(id);if(!roster.length)throw new Error('no-players');
      return this.store.create(id,frozenQuestion.map(q=>({id:q.id,options:q.choices.map(c=>c.id),correctOption:q.correctOption,
        durationMs:q.durationMs,maxPoints:q.maxPoints,scoring:q.scoring})),roster.map(p=>p.id),this.clock());
    }
    return this.store.dispatch(id,command,this.clock(),message.questionId);
  }
  snapshot(identity) {
    const room=this.room(identity.roomId);
    return this.project.snapshot(this.state(room.id),{id:room.id,code:room.code,questions:JSON.parse(room.question_json)},
      this.players(room.id),identity,this.clock());
  }
  checkpoint() {
    for(const room of this.db.prepare('SELECT id FROM mock_rooms').all()) {
      const state=this.state(room.id)?.current;
      if(state?.phase==='open'&&state.elapsedMs<state.question.durationMs)
        this.store.dispatch(room.id,{type:'checkpoint'},this.clock(),state.question.id);
    }
  }
  close(){this.db.close();}
}
