const $=id=>document.getElementById(id);
const role=location.pathname==='/animateur'?'host':location.pathname==='/joueur'?'player':null;
const key=role?`kuikuiz.mock.${role}`:null;
const params=new URLSearchParams(location.search),requestedCode=params.get('code')?.toUpperCase();
let credentials;try{credentials=key?JSON.parse(localStorage.getItem(key)):null;}catch{}
if(role==='player'&&(params.get('new')==='1'||requestedCode&&credentials?.code!==requestedCode))credentials=null;
let socket,connected=false,identified=false,retry,stopped=false,generation=0,snapshot,selected='',pending=null,accepted=null,anchor=0,joinDetails=null,ackTimeout;
let connectionError=false,closedKey='',revealUntil=0,animateCorrection=false,presentationReady=false,podiumMode='ready',podiumStart=0,podiumStep=-1;
const messages={'invalid-message':'Message non reconnu. Rechargez la page.','unknown-room':'Cette partie est introuvable. Rejoignez une autre salle.',unauthorized:'Cet accès à la partie n’est plus valide.',forbidden:'Cette action est réservée à l’animateur.','already-started':'La partie a déjà commencé. Seuls les joueurs inscrits peuvent revenir.','no-players':'Un joueur doit rejoindre avant le lancement.','not-started':'La question n’a pas encore commencé.','storage-failed':'La sauvegarde n’a pas abouti. Aucune nouvelle réponse n’est confirmée. Réessayez ou reconnectez-vous.'};
function error(message,network=false){connectionError=network;$('error').textContent=message;$('error').hidden=!message;}
function save(value){credentials=value;try{localStorage.setItem(key,JSON.stringify(value));}catch{error('Cet onglet ne peut pas conserver votre accès après fermeture.');}
  if(role==='player'){const url=new URL(location.href);url.searchParams.delete('new');history.replaceState(null,'',url.pathname+url.search+url.hash);}}
function remember(key,value){try{sessionStorage.setItem(key,value);}catch{}}
function remembered(key){try{return sessionStorage.getItem(key);}catch{return null;}}
function send(message){if(!connected||socket?.readyState!==WebSocket.OPEN)return false;socket.send(JSON.stringify({v:1,...message}));return true;}
function ownAnswer(){return snapshot?.ownAnswer||accepted;}
function revealKey(){return `kuikuiz.reveal:${snapshot.roomId}:${snapshot.questionId}`;}
function podiumKey(){return `kuikuiz.podium:${snapshot.roomId}:${snapshot.questionId}`;}
function remaining(){return snapshot?Math.max(0,snapshot.remainingMs-(snapshot.phase==='open'?performance.now()-anchor:0)):0;}
function setHidden(id,hidden){$(id).hidden=hidden;}
function navigate(panel){
  if($(panel).hidden)return;
  if($('device').classList.contains('compact'))$('game').scrollTo({top:$(panel).offsetTop-$('play-panel').offsetTop,behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});
  for(const button of $('panel-nav').querySelectorAll('button'))button.setAttribute('aria-current',String(button.dataset.panel===panel));
}
function resetPresentation(){closedKey='';revealUntil=0;animateCorrection=false;presentationReady=false;podiumMode='ready';podiumStep=-1;}
async function connect(){
  clearTimeout(retry);stopped=false;const attempt=++generation;identified=false;
  const previous=socket;socket=null;previous?.close();connected=false;
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),2500);
  try{
    const response=await fetch('/connection.json',{signal:controller.signal});if(!response.ok)throw Error();
    const config=await response.json();if(typeof config.socketPath!=='string')throw Error();
    const endpoint=new URL(config.socketPath,location.href);endpoint.protocol=endpoint.protocol==='https:'?'wss:':endpoint.protocol==='http:'?'ws:':endpoint.protocol;
    if(!['ws:','wss:'].includes(endpoint.protocol))throw Error();
    if(stopped||attempt!==generation)return;socket=new WebSocket(endpoint);
  }catch{
    if(attempt!==generation)return;
    $('host-status').textContent='Hôte injoignable, déconnecté. La partie attend sa connexion.';
    error('Impossible de joindre l’hôte. Vérifiez le réseau et que la maquette est démarrée.',true);
    $('join-form').querySelector('button').disabled=false;
    if(snapshot)render();if(!stopped&&credentials)retry=setTimeout(connect,2000);return;
  }finally{clearTimeout(timeout);}
  if(stopped||attempt!==generation)return;
  socket.onopen=()=>{
    if(attempt!==generation)return;connected=true;
    $('host-status').textContent='Hôte joint — identification en cours…';
    if(credentials)send({...credentials,type:role});else if(joinDetails)send({type:'join',...joinDetails});
    if(snapshot)render();
  };
  socket.onmessage=({data})=>{
    if(attempt!==generation)return;
    let message;try{message=JSON.parse(data);}catch{error('Réponse du serveur non reconnue.');return;}
    if(message.type==='credentials'){save(message);joinDetails=null;}
    if(message.type==='state'){
      identified=true;$('host-status').textContent='Connecté à la partie.';if(connectionError)error('');
      const changed=!snapshot||snapshot.roomId!==message.roomId||snapshot.questionId!==message.questionId;
      if(changed){selected='';pending=null;accepted=null;clearTimeout(ackTimeout);resetPresentation();$('choices').replaceChildren();error('');}
      snapshot=message;anchor=performance.now();
      if(message.ownAnswer){accepted=message.ownAnswer;selected=accepted.option;pending=null;clearTimeout(ackTimeout);}
      if(message.phase==='closed'){
        const identity=`${message.roomId}:${message.questionId}`;
        const left=Math.max(0,Number(message.revealRemainingMs)||0);
        if(closedKey!==identity){
          closedKey=identity;revealUntil=performance.now()+left;animateCorrection=left>0&&!remembered(revealKey());
          if(animateCorrection)remember(revealKey(),'seen');
          const saved=remembered(podiumKey());podiumMode=saved==='full'?'full':saved?'podium':'ready';podiumStep=saved?3:-1;
        }else revealUntil=Math.min(revealUntil,performance.now()+left);
      }
      render();if(changed)navigate('play-panel');
      if(message.podium){if(podiumMode==='ready')startPodium();else if(changed)navigate('ranking-panel');}
    }
    if(message.type==='answer-result'){
      if(message.questionId!==snapshot?.questionId||message.submissionId!==pending?.id)return;
      const submitted=pending;clearTimeout(ackTimeout);pending=null;
      if(message.confirmed){accepted={submissionId:submitted.id,option:submitted.option};error('');}
      else error(({paused:'La partie est en pause.',late:'Le temps est écoulé.',closed:'La question est terminée.','stale-question':'Cette réponse concerne une question précédente.','already-answered':'Votre première réponse est définitive.','submission-conflict':'Identifiant de réponse déjà utilisé.'})[message.status]||'La réponse n’a pas été acceptée.');
      if(snapshot)render();
    }
    if(message.type==='error'){
      error(messages[message.code]||'Impossible de terminer cette action.');
      if(['unauthorized','unknown-room','already-started'].includes(message.code)){stopped=true;socket.close();if(credentials)setHidden('reset-access',false);}
      if(pending)pending.sending=false;clearTimeout(ackTimeout);$('join-form').querySelector('button').disabled=false;if(snapshot)render();
    }
  };
  socket.onclose=()=>{
    if(attempt!==generation)return;connected=false;identified=false;
    $('host-status').textContent='Hôte déconnecté. Les commandes sont indisponibles jusqu’à la reconnexion.';
    if(pending)pending.sending=false;clearTimeout(ackTimeout);if(snapshot)render();else $('join-form').querySelector('button').disabled=false;
    if(!stopped&&credentials)retry=setTimeout(connect,2000);else if(!credentials&&joinDetails)error('Connexion interrompue. Réessayez de rejoindre la salle.',true);
  };
  socket.onerror=()=>{if(attempt===generation)error('Connexion interrompue. Vérifiez le serveur et le réseau.',true);};
}
function buildChoices(){
  const existing=$('choices').querySelector('.choice');if(existing||!snapshot.question)return;
  snapshot.question.choices.forEach((choice,index)=>{
    const label=document.createElement('label');label.className='choice';label.dataset.option=choice.id;
    const input=document.createElement('input');input.type='radio';input.name='answer';input.value=choice.id;
    input.onchange=()=>{if(pending||ownAnswer())return;selected=choice.id;submitAnswer();};
    const letter=document.createElement('span');letter.className='choice-letter';letter.textContent=String.fromCharCode(65+index);letter.setAttribute('aria-hidden','true');
    const text=document.createElement('span');text.textContent=choice.text;
    const mark=document.createElement('span');mark.className='choice-mark';mark.setAttribute('aria-hidden','true');
    label.append(input,letter,text,mark);$('choices').append(label);
  });
}
function renderConnection(){
  const status=connected&&identified?'connected':stopped?'disconnected':'reconnecting';
  $('connection').dataset.state=status;$('connection').textContent=({connected:'✓ Connecté',reconnecting:'… Reconnexion',disconnected:'✕ Déconnecté'})[status];
  if(role!=='host')return;
  const offline=snapshot.players.filter(player=>player.connection!=='connected').length;
  $('players-summary').classList.toggle('warning',offline>0||!connected||!identified);
  $('players-summary').textContent=!connected||!identified?'⚠ Connexion des joueurs à vérifier':!snapshot.total?'Aucun joueur inscrit':offline?`⚠ ${offline} joueur${offline>1?'s':''} déconnecté${offline>1?'s':''}`:'✓✓ Tous les joueurs sont connectés';
}
function renderPlayers(){
  $('participant-count').textContent=`(${snapshot.total})`;$('players').replaceChildren();
  for(const player of snapshot.players){
    const row=document.createElement('li');row.className='participant';
    const avatar=document.createElement('span');avatar.className='avatar';avatar.textContent=player.name.slice(0,1).toUpperCase();avatar.setAttribute('aria-hidden','true');
    const name=document.createElement('span');name.className='participant-name';name.textContent=player.name;
    const status=document.createElement('span');const online=connected&&identified&&player.connection==='connected';status.className=`presence ${online?'':'off'}`;
    status.textContent=!connected||!identified?'… À vérifier':online?'✓ Connecté':'✕ Déconnecté';row.append(avatar,name,status);$('players').append(row);
  }
}
function renderPodium(){
  const rank=snapshot.ranking||[];
  $('podium-steps').replaceChildren();
  for(const place of [2,1,3]){
    const winners=rank.filter(player=>player.rank===place),visible=[3,2,1].slice(0,podiumStep).includes(place);
    const step=document.createElement('div');step.className=`podium-step ${visible?'revealed':'unrevealed'}`;step.dataset.place=place;step.setAttribute('aria-hidden',String(!visible));
    const names=document.createElement('div');names.className='podium-people';
    if(winners.length)winners.forEach((player,i)=>{if(i)names.append(document.createElement('br'));names.append(document.createTextNode(player.name));});
    else{names.textContent=rank.length>=place?`Pas de ${place}e place (ex æquo)`:`Pas de ${place}e place`;names.classList.add('podium-empty');}
    const block=document.createElement('div');block.className='podium-block';
    const ordinal=document.createElement('strong');ordinal.textContent=String(place);const points=document.createElement('span');points.className='small';points.textContent=winners.length?`${winners[0].points.toLocaleString('fr-FR')} pts`:'';
    block.append(ordinal,points);step.append(names,block);$('podium-steps').append(step);
  }
  $('podium-status').textContent=podiumStep===3?'Bravo à tous les participants !':podiumStep?`Place ${[3,2,1][podiumStep-1]} dévoilée`:'Le podium va se dévoiler…';
}
function startPodium(){
  if(!snapshot?.final||!presentationReady)return;
  if(podiumMode!=='podium'){podiumMode='podium';podiumStart=performance.now();podiumStep=remembered(podiumKey())?3:0;remember(podiumKey(),'seen');renderPodium();}
  renderPresentation();navigate('ranking-panel');
}
function renderPresentation(){
  if(!snapshot)return;
  const closed=snapshot.phase==='closed';presentationReady=closed&&performance.now()>=revealUntil;
  const feedback=closed&&animateCorrection&&!presentationReady&&role==='player';
  setHidden('feedback',!feedback);
  const own=snapshot.ownAnswer,correct=Boolean(closed&&own&&own.option===snapshot.correctOption);
  $('feedback').className=`feedback ${!own?'neutral':correct?'':'bad'}`;
  $('feedback-title').textContent=!own?'Pas de réponse':correct?'Bien joué !':'Dommage';
  $('feedback-points').textContent=correct?`+ ${Number(own.points||0).toLocaleString('fr-FR')} points`:'';setHidden('feedback-points',!correct);
  for(const label of $('choices').querySelectorAll('.choice')){
    const isCorrect=closed&&label.dataset.option===snapshot.correctOption;
    label.classList.toggle('correct',isCorrect);label.classList.toggle('wrong',closed&&label.dataset.option===selected&&!isCorrect);
    label.classList.toggle('reveal-flash',isCorrect&&animateCorrection&&!presentationReady);
    const chosen=label.dataset.option===selected,mark=label.querySelector('.choice-mark');mark.textContent=isCorrect?'✓':chosen?(closed?'✕':'✓'):'';
  }
  setHidden('results',!presentationReady);setHidden('ranking-locked',presentationReady);
  setHidden('show-ranking',role!=='host'||!presentationReady);$('show-ranking').textContent=snapshot.final?'Voir le podium':'Voir le classement';
  $('show-ranking').disabled=!connected||!identified;
  setHidden('next',role!=='host'||!presentationReady||snapshot.final);$('next').disabled=!connected||!identified;
  const isPodium=snapshot.final&&presentationReady&&podiumMode==='podium';
  const full=!snapshot.final||podiumMode==='full';
  setHidden('podium-ready',!snapshot.final||!presentationReady||podiumMode!=='ready');
  setHidden('podium',!isPodium);setHidden('ranking-table',!full);
  $('ranking-panel').classList.toggle('podium-view',isPodium);
  setHidden('show-podium',!snapshot.final||!presentationReady||podiumMode!=='ready');
  setHidden('full-ranking',!isPodium||podiumStep<3);
  const hasAction=presentationReady&&(role==='host'&&!snapshot.final||snapshot.final&&podiumMode!=='full');
  setHidden('ranking-dock',!hasAction);
  $('ranking-title').textContent=snapshot.final?(full?'Classement final':'Le podium'):'Classement cumulé';
}
function render(){
  if(!snapshot)return;
  setHidden('welcome',true);setHidden('setup',true);setHidden('game',false);setHidden('panel-nav',false);setHidden('connection',false);setHidden('forget',false);
  $('game').dataset.phase=snapshot.phase;$('room-code').textContent=snapshot.code;
  $('role-label').textContent=role==='host'?'Espace animateur':snapshot.playerName||'Joueur';
  $('device').dataset.role=role;
  setHidden('room-panel',role!=='host');setHidden('players-summary',role!=='host');setHidden('host-dock',role!=='host');setHidden('answer-count',role!=='host');setHidden('host-controls',role!=='host');
  setHidden('new-room',role!=='host');setHidden('join-another',role!=='player');
  const lobby=snapshot.phase==='lobby';setHidden('lobby-content',!lobby);setHidden('question-content',lobby);setHidden('lobby-code',role!=='host');
  $('lobby-instruction').textContent=role==='host'?'Partagez le code. Lancez la première question quand tout le monde est prêt.':'Vous êtes inscrit. La question apparaîtra ici dès son lancement.';
  $('answer-count').textContent=lobby?`${snapshot.total} participant${snapshot.total>1?'s':''}`:`${snapshot.answered} / ${snapshot.total} réponses confirmées`;
  $('question-number').textContent=`Question ${snapshot.questionNumber} / ${snapshot.questionCount}`;
  $('phase-title').textContent=snapshot.final?'Partie terminée':snapshot.phase==='paused'?'⌛ Jeu en pause':'Question en cours';
  $('phase-title').dataset.active=String(snapshot.phase==='paused');$('phase-title').setAttribute('aria-hidden',String(snapshot.phase!=='paused'));
  for(const id of ['start','pause','resume','reveal']){
    setHidden(id,id==='start'?!lobby:id==='pause'?snapshot.phase!=='open':id==='resume'?snapshot.phase!=='paused':['lobby','closed'].includes(snapshot.phase));
    $(id).disabled=!connected||!identified||id==='start'&&!snapshot.total;
  }
  if(snapshot.question){$('question-title').textContent=snapshot.question.text;buildChoices();}
  const own=ownAnswer();
  for(const input of $('choices').querySelectorAll('input')){
    input.checked=input.value===selected;input.disabled=role!=='player'||!connected||!identified||snapshot.phase!=='open'||remaining()<=0||Boolean(own)||Boolean(pending);
    input.closest('.choice').classList.toggle('selected',input.checked);
  }
  const closed=snapshot.phase==='closed';
  $('receipt').textContent=own?'Réponse confirmée et enregistrée.':pending?(pending.sending?'Envoi en cours…':'Confirmation non reçue. Vous pouvez renvoyer la même réponse.'):'';
  $('receipt').className=own?'receipt sr-only':'receipt pending';setHidden('receipt',closed||!own&&!pending);
  setHidden('submit-answer',role!=='player'||closed||Boolean(own)||!pending||pending.sending);
  $('submit-answer').disabled=!connected||!identified||snapshot.phase!=='open'||remaining()<=0;
  $('question-kind').textContent=own?'Réponse envoyée':pending?(pending.sending?'Envoi en cours…':'Réponse non confirmée'):'Touchez pour répondre';
  const hideInstruction=role!=='player'||closed||snapshot.phase==='paused';
  $('question-kind').dataset.hidden=String(hideInstruction);$('question-kind').setAttribute('aria-hidden',String(hideInstruction));
  $('timer-group').dataset.hidden=String(closed);$('timer-group').setAttribute('aria-hidden',String(closed));
  $('time-progress').dataset.hidden=String(closed);$('time-progress').setAttribute('aria-hidden',String(closed));
  renderConnection();if(role==='host')renderPlayers();setHidden('empty-players',snapshot.total>0);setHidden('player-link',role!=='host');$('player-link').href=`/joueur?code=${encodeURIComponent(snapshot.code)}`;
  if(closed){
    $('ranking').replaceChildren();
    for(const row of snapshot.ranking){const tr=document.createElement('tr');if(row.playerId===credentials?.playerId)tr.className='mine';for(const value of [row.rank,row.name,`${row.points.toLocaleString('fr-FR')} pts`]){const td=document.createElement('td');td.textContent=value;tr.append(td);}$('ranking').append(tr);}
    if(podiumMode==='podium'&&podiumStep>=0&&!$('podium-steps').children.length)renderPodium();
  }else{$('ranking').replaceChildren();$('podium-steps').replaceChildren();}
  renderPresentation();tick();
}
function submitAnswer(){
  if(role!=='player'||!selected||!connected||!identified||snapshot.phase!=='open'||remaining()<=0||ownAnswer()||pending?.sending)return;
  if(!pending){const bytes=new Uint8Array(16);crypto.getRandomValues(bytes);pending={id:Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join(''),option:selected,sending:false};}
  pending.sending=true;
  if(!send({type:'answer',questionId:snapshot.questionId,submissionId:pending.id,option:pending.option})){pending.sending=false;render();return;}
  render();clearTimeout(ackTimeout);
  ackTimeout=setTimeout(()=>{if(pending){pending.sending=false;send({type:'sync'});render();}},8000);
}
function tick(){
  if(!snapshot)return;
  const left=remaining();$('timer').textContent=`${Math.ceil(left/1000)} s`;$('time-progress').value=left;
  if(snapshot.phase==='closed'&&!presentationReady&&performance.now()>=revealUntil)renderPresentation();
  if(snapshot.phase==='open'&&left<=0){for(const input of $('choices').querySelectorAll('input'))input.disabled=true;$('submit-answer').disabled=true;}
  if(podiumMode==='podium'&&podiumStep<3){const step=Math.min(3,Math.floor((performance.now()-podiumStart)/1200));if(step!==podiumStep){podiumStep=step;renderPodium();renderPresentation();}}
}
function leave(){stopped=true;++generation;clearTimeout(retry);clearTimeout(ackTimeout);socket?.close();}
$('join-form').onsubmit=event=>{event.preventDefault();error('');joinDetails={code:$('code').value.trim().toUpperCase(),name:$('name').value.trim()};if(!joinDetails.name)return;event.submitter.disabled=true;connect();};
$('create').onclick=async()=>{error('');$('create').disabled=true;try{const response=await fetch('/api/rooms',{method:'POST'});if(!response.ok)throw Error();save(await response.json());connect();}catch{error('Impossible de créer la partie. Vérifiez le serveur.');}finally{$('create').disabled=false;}};
for(const id of ['start','pause','resume','reveal','next'])$(id).onclick=()=>{error('');send({type:id,questionId:snapshot?.questionId});};
$('submit-answer').onclick=submitAnswer;
$('show-ranking').onclick=()=>snapshot.final?send({type:'podium',questionId:snapshot.questionId}):navigate('ranking-panel');
$('show-podium').onclick=()=>role==='host'?send({type:'podium',questionId:snapshot.questionId}):startPodium();
$('full-ranking').onclick=()=>{podiumMode='full';remember(podiumKey(),'full');renderPresentation();};
$('players-summary').onclick=()=>navigate('room-panel');
$('forget').onclick=()=>{leave();location.href='/';};
$('join-another').onclick=()=>{leave();location.href='/joueur?new=1';};
$('new-room').onclick=()=>{leave();localStorage.removeItem(key);location.reload();};
$('reset-access').onclick=()=>{leave();if(role==='player'){location.href='/joueur?new=1';return;}localStorage.removeItem(key);location.reload();};
function layout(){const desktop=matchMedia('(min-width:1000px)').matches;$('device').dataset.layout=desktop?'desktop':'phone';$('device').classList.toggle('compact',!desktop);}
layout();matchMedia('(min-width:1000px)').addEventListener('change',layout);
if(role){
  setHidden('welcome',true);setHidden('setup',false);setHidden('forget',false);$('role-label').textContent=role==='host'?'Espace animateur':'Joueur';
  $('setup-eyebrow').textContent=role==='host'?'Culture générale':'Rejoindre la salle';$('setup-title').textContent=role==='host'?'Une nouvelle partie ?':'Prêt à jouer ?';
  setHidden('create-panel',role!=='host');setHidden('join-form',role!=='player');if(role==='player')$('reset-access').textContent='Rejoindre une autre partie';$('code').value=requestedCode||'';
  const tabs=role==='host'?[['play-panel','Pilotage'],['ranking-panel','Classement'],['room-panel','Participants']]:[['play-panel','Question'],['ranking-panel','Classement']];
  for(const [panel,title] of tabs){const button=document.createElement('button');button.dataset.panel=panel;button.textContent=title;button.setAttribute('aria-current',String(panel==='play-panel'));button.onclick=()=>navigate(panel);$('panel-nav').append(button);}
  if(credentials)connect();
}
const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting&&entry.intersectionRatio>.6)for(const button of $('panel-nav').querySelectorAll('button'))button.setAttribute('aria-current',String(button.dataset.panel===entry.target.id));},{root:$('game'),threshold:.65});
for(const panel of document.querySelectorAll('.scene'))observer.observe(panel);
setInterval(tick,200);
