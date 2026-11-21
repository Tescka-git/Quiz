import { DatabaseSync } from 'node:sqlite';
import { randomBytes, createHash } from 'node:crypto';
const token = () => randomBytes(24).toString('hex');
const hash = value => createHash('sha256').update(value).digest('hex');
export const question = {
  id:'planete',text:'Quelle planète est surnommée la planète rouge ?',
  choices:[{id:'mars',text:'Mars'},{id:'venus',text:'Vénus'},{id:'jupiter',text:'Jupiter'},{id:'saturne',text:'Saturne'}],
  correctOption:'mars',durationMs:30000,maxPoints:1000,scoring:'fixed'
};
export class MockRooms {
  constructor(filename, store, engine, engineHash, clock) {
    this.store=store;this.engine=engine;this.clock=clock;this.engineHash=engineHash;
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
    this.db.prepare('INSERT INTO mock_rooms VALUES (?,?,?,?,?)').run(id,code,hash(secret),this.engineHash,JSON.stringify(question));
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
    if(this.state(room.id))throw new Error('already-started');
    const id=token(),secret=token();
    this.db.prepare('INSERT INTO mock_players VALUES (?,?,?,?)').run(id,room.id,name,hash(secret));
    return {role:'player',roomId:room.id,playerId:id,token:secret,code};
  }
  players(id) {return this.db.prepare('SELECT id,name FROM mock_players WHERE room_id=? ORDER BY rowid').all(id);}
  command(identity,message) {
    const id=identity.roomId;const frozenQuestion=JSON.parse(this.room(id).question_json);
    if(message.type==='sync')return;
    if(message.type==='answer') {
      if(identity.role!=='player')throw new Error('forbidden');
      if(!this.state(id))throw new Error('not-started');
      return this.store.dispatch(id,{type:'answer',playerId:identity.playerId,submissionId:message.submissionId,option:message.option},this.clock());
    }
    if(identity.role!=='host')throw new Error('forbidden');
    if(message.type==='start') {
      if(this.state(id))throw new Error('already-started');
      const roster=this.players(id);if(!roster.length)throw new Error('no-players');
      return this.store.create(id,{id:frozenQuestion.id,options:frozenQuestion.choices.map(c=>c.id),correctOption:frozenQuestion.correctOption,
        durationMs:frozenQuestion.durationMs,maxPoints:frozenQuestion.maxPoints,scoring:frozenQuestion.scoring},roster.map(p=>p.id),this.clock());
    }
    if(!this.state(id))throw new Error('not-started');
    const type=message.type==='reveal'?'close':message.type;
    if(!['pause','resume','close'].includes(type))throw new Error('invalid-message');
    return this.store.dispatch(id,{type},this.clock());
  }
  snapshot(identity) {
    const room=this.room(identity.roomId),state=this.state(room.id),players=this.players(room.id),frozenQuestion=JSON.parse(room.question_json);
    const snapshot={v:1,type:'state',role:identity.role,roomId:room.id,code:room.code,players,
      phase:'lobby',answered:0,total:players.length,remainingMs:frozenQuestion.durationMs,ownAnswer:null};
    if(!state)return snapshot;
    const elapsed=state.elapsedMs+(state.phase==='open'?Math.max(0,this.clock()-state.lastNowMs):0);
    snapshot.phase=state.phase==='open'&&elapsed>=state.question.durationMs?'expired':state.phase;
    snapshot.remainingMs=Math.max(0,state.question.durationMs-elapsed);
    snapshot.answered=state.answers.length;
    snapshot.question={text:frozenQuestion.text,choices:frozenQuestion.choices};
    const own=state.answers.find(a=>a.playerId===identity.playerId);
    if(own)snapshot.ownAnswer={submissionId:own.submissionId,option:own.option};
    if(state.phase==='closed') {
      snapshot.correctOption=state.question.correctOption;
      snapshot.ranking=this.engine.ranking(state).map(row=>({...row,name:players.find(p=>p.id===row.playerId)?.name}));
    }
    return snapshot;
  }
  checkpoint() {
    for(const room of this.db.prepare('SELECT id FROM mock_rooms').all()) {
      const state=this.state(room.id);
      if(state?.phase==='open'&&state.elapsedMs<state.question.durationMs)
        this.store.dispatch(room.id,{type:'checkpoint'},this.clock());
    }
  }
  close(){this.db.close();}
}
