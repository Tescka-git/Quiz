/** Commandes et projection pures communes aux adaptateurs Node et Android. */
function kuikuizCommand(identity,message,started) {
  if(message.type==='sync')return {type:'sync'};
  if(message.type==='answer'){
    if(identity.role!=='player')return {error:'forbidden'};
    if(!started)return {error:'not-started'};
    return {type:'answer',playerId:identity.playerId,submissionId:message.submissionId,option:message.option};
  }
  if(identity.role!=='host')return {error:'forbidden'};
  if(message.type==='start')return started?{error:'already-started'}:{type:'start'};
  if(!started)return {error:'not-started'};
  return {type:message.type==='reveal'?'close':message.type};
}
function kuikuizAdmission(started){return started?{error:'already-started'}:{allowed:true};}

/** Jamais d'état moteur brut au client. */
function kuikuizSnapshot(quiz,room,players,identity,now,presence={},revealedAt=null) {
  const state=quiz?quiz.current:null;
  const question=room.questions[quiz?quiz.completed.length:0];
  const visiblePlayers=players.map(player=>identity.role==='host'?{...player,connection:presence[player.id]||'disconnected'}:player);
  const output={v:1,type:'state',role:identity.role,roomId:room.id,code:room.code,players:visiblePlayers,
    phase:'lobby',answered:0,total:players.length,remainingMs:question.durationMs,ownAnswer:null,
    questionId:state?state.question.id:null,questionNumber:(quiz?quiz.completed.length:0)+1,questionCount:room.questions.length,final:false};
  if(identity.role==='player')output.playerName=players.find(player=>player.id===identity.playerId)?.name||'';
  if(!state)return output;
  const elapsed=state.elapsedMs+(state.phase==='open'?Math.max(0,now-state.lastNowMs):0);
  output.phase=state.phase==='open'&&elapsed>=state.question.durationMs?'expired':state.phase;
  output.remainingMs=Math.max(0,state.question.durationMs-elapsed);
  output.answered=state.answers.length;
  output.question={text:question.text,choices:question.choices};
  const own=state.answers.find(a=>a.playerId===identity.playerId);
  if(own)output.ownAnswer={submissionId:own.submissionId,option:own.option};
  if(state.phase==='closed'){
    output.revealRemainingMs=revealedAt===null?0:Math.max(0,3500-Math.max(0,now-revealedAt));
    output.final=quiz.completed.length+1===quiz.questions.length;
    output.correctOption=state.question.correctOption;
    if(own)output.ownAnswer.points=own.points;
    output.ranking=KuikuizEngine.quizRanking(quiz).map(row=>({...row,name:players.find(p=>p.id===row.playerId).name}));
  }
  return output;
}
