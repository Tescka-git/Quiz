const $=id=>document.getElementById(id);
const role=location.pathname==='/animateur'?'host':location.pathname==='/joueur'?'player':null;
const key=role?`kuikuiz.mock.${role}`:null;
let credentials;try{credentials=key?JSON.parse(localStorage.getItem(key)):null;}catch{}
const requestedCode=new URLSearchParams(location.search).get('code')?.toUpperCase();
if(role==='player'&&requestedCode&&credentials?.code!==requestedCode)credentials=null;
let socket,connected=false,retry,stopped=false,snapshot,selected='',pending=null,anchor=0,joinDetails=null,ackTimeout;
const errors={'invalid-message':'Message non reconnu. Rechargez la page.','unknown-room':'Cette partie est introuvable. Vérifiez le code.',
  unauthorized:'Cet accès à la partie n’est plus valide. Revenez à l’accueil.',forbidden:'Cette action est réservée à l’animateur.',
  'already-started':'La partie a déjà commencé. Seuls les joueurs inscrits peuvent revenir.', 'no-players':'Un joueur doit rejoindre avant le lancement.',
  'not-started':'La question n’a pas encore commencé.','storage-failed':'La sauvegarde n’a pas abouti. Aucune nouvelle réponse n’est confirmée. Réessayez ou reconnectez-vous.'};
let connectionError=false;
function error(message,network=false){connectionError=network;$('error').textContent=message;$('error').hidden=!message;}
function save(value){credentials=value;try{localStorage.setItem(key,JSON.stringify(value));}catch{error('Cet onglet ne peut pas conserver votre accès après fermeture.');}}
function send(message){if(!connected)return false;socket.send(JSON.stringify({v:1,...message}));return true;}
async function connect(){
  clearTimeout(retry);stopped=false;
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),2500);
  try{
    const response=await fetch('/connection.json',{signal:controller.signal});if(!response.ok)throw new Error();
    const configuration=await response.json();if(typeof configuration.socketPath!=='string')throw new Error();
    const endpoint=new URL(configuration.socketPath,location.href);endpoint.protocol=endpoint.protocol==='https:'?'wss:':endpoint.protocol==='http:'?'ws:':endpoint.protocol;
    if(!['ws:','wss:'].includes(endpoint.protocol))throw new Error();
    if(stopped)return;
    socket=new WebSocket(endpoint);
  }
  catch{
    $('host-status').textContent='Hôte injoignable. Les écrans restent accessibles ; la partie attend sa connexion.';
    error('Impossible de joindre l’hôte. Vérifiez le réseau et que la maquette est démarrée.',true);
    $('join-form').querySelector('button').disabled=false;
    if(!stopped&&credentials)retry=setTimeout(connect,2000);return;
  }finally{clearTimeout(timeout);}
  if(stopped)return;
  socket.onopen=()=>{
    connected=true;
    $('host-status').textContent='Hôte joint — identification en cours…';
    if(credentials)send({...credentials,type:role});
    else if(joinDetails)send({type:'join',...joinDetails});
    if(snapshot)render();
  };
  socket.onmessage=({data})=>{
    const message=JSON.parse(data);
    if(message.type==='credentials'){save(message);joinDetails=null;}
    if(message.type==='state'){
      $('host-status').textContent='Connecté à la partie.';
      if(connectionError)error('');
      if(snapshot?.questionId!==message.questionId){selected='';pending=null;clearTimeout(ackTimeout);$('choices').querySelectorAll('.choice').forEach(node=>node.remove());error('');}
      snapshot=message;anchor=performance.now();
      if(message.ownAnswer){selected=message.ownAnswer.option;pending=null;clearTimeout(ackTimeout);}
      render();
    }
    if(message.type==='answer-result'){
      if(message.questionId!==snapshot?.questionId||message.submissionId!==pending?.id)return;
      pending=null;clearTimeout(ackTimeout);
      if(message.confirmed){$('receipt').textContent='Réponse confirmée et enregistrée.';error('');}
      else error(({paused:'La partie est en pause.',late:'Le temps est écoulé.',closed:'La question est terminée.',
        'stale-question':'Cette réponse concerne une question précédente.','already-answered':'Votre première réponse est définitive.','submission-conflict':'Identifiant de réponse déjà utilisé.'})[message.status]||'La réponse n’a pas été acceptée.');
      if(snapshot)render();
    }
    if(message.type==='error'){
      error(errors[message.code]||'Impossible de terminer cette action.');
      if(['unauthorized','unknown-room','already-started'].includes(message.code)){stopped=true;socket.close();if(credentials)$('reset-access').hidden=false;}
      if(pending)pending.sending=false;clearTimeout(ackTimeout);$('join-form').querySelector('button').disabled=false;if(snapshot)render();
    }
  };
  socket.onclose=()=>{connected=false;$('host-status').textContent='Hôte déconnecté. Les commandes sont indisponibles jusqu’à la reconnexion.';if(pending)pending.sending=false;clearTimeout(ackTimeout);if(snapshot)render();else $('join-form').querySelector('button').disabled=false;
    if(!stopped&&credentials)retry=setTimeout(connect,2000);
    else if(!credentials&&joinDetails)error('Connexion interrompue. Réessayez de rejoindre la salle.',true);};
  socket.onerror=()=>error('Connexion interrompue. Vérifiez le serveur et le réseau.',true);
}
function remaining(){return snapshot?Math.max(0,snapshot.remainingMs-(snapshot.phase==='open'?performance.now()-anchor:0)):0;}
function tick(){if(!snapshot)return;const left=remaining();$('timer').textContent=snapshot.phase==='closed'?'Terminé':`${Math.ceil(left/1000)} s`;$('time-progress').value=left;$('time-progress').hidden=snapshot.phase==='closed';
  $('submit-answer').disabled=!connected||snapshot.phase!=='open'||left<=0||Boolean(snapshot.ownAnswer)||Boolean(pending?.sending)||!selected;
  $('submit-answer').textContent=pending&&!pending.sending?'Renvoyer ma réponse':'Confirmer ma réponse';}
function render(){
  $('welcome').hidden=true;$('setup').hidden=true;$('game').hidden=false;$('forget').hidden=false;
  $('room-code').textContent=snapshot.code;$('role-label').textContent=role==='host'?'Espace animateur':'Vous êtes dans la partie';
  $('phase-title').textContent=snapshot.final?'La partie est terminée !':({lobby:'On vous attend.',open:'À vous de jouer !',paused:'On fait une pause.',expired:'Le temps est écoulé.',closed:'Les résultats sont là.'})[snapshot.phase];
  $('question-number').textContent=`Question ${snapshot.questionNumber} / ${snapshot.questionCount}`;
  $('ranking-title').textContent=snapshot.final?'Le classement final':'Le classement cumulé';
  $('connection').textContent=connected?'Connecté à la partie':'Déconnecté — tentative de reconnexion…';
  $('answer-count').textContent=snapshot.phase==='lobby'?`${snapshot.total} participant${snapshot.total>1?'s':''}`:`${snapshot.answered} / ${snapshot.total} réponses confirmées`;
  $('lobby-content').hidden=snapshot.phase!=='lobby';$('question-content').hidden=snapshot.phase==='lobby';
  $('lobby-instruction').textContent=role==='host'?'Partagez le code. Quand tout le monde est là, lancez la question.':'Vous êtes inscrit. La question apparaîtra quand l’animateur la lancera.';
  $('participant-count').textContent=`(${snapshot.total})`;$('players').replaceChildren();
  snapshot.players.forEach(player=>{const row=document.createElement('li'),avatar=document.createElement('span'),name=document.createElement('span');avatar.className='avatar';avatar.textContent=player.name.slice(0,1).toUpperCase();name.textContent=player.name;row.append(avatar,name);$('players').append(row);});
  $('empty-players').hidden=snapshot.total>0;$('player-link').hidden=role!=='host';
  $('player-link').href=`/joueur?code=${encodeURIComponent(snapshot.code)}`;
  if(snapshot.question){
    $('question-title').textContent=snapshot.question.text;
    if(!$('choices').querySelector('.choice'))snapshot.question.choices.forEach(choice=>{
      const label=document.createElement('label');label.className='choice';label.dataset.option=choice.id;
      const input=document.createElement('input');input.type='radio';input.name='answer';input.value=choice.id;
      input.onchange=()=>{selected=choice.id;tick();};const text=document.createElement('span');text.textContent=choice.text;
      label.append(input,text);$('choices').append(label);
    });
    $('choices').querySelectorAll('input').forEach(input=>{input.checked=input.value===selected;input.disabled=role==='host'||!connected||snapshot.phase!=='open'||Boolean(snapshot.ownAnswer)||Boolean(pending);});
    $('choices').querySelectorAll('.choice').forEach(label=>label.classList.toggle('correct',snapshot.phase==='closed'&&label.dataset.option===snapshot.correctOption));
  }
  $('submit-answer').hidden=role!=='player'||snapshot.phase==='closed';
  $('receipt').textContent=snapshot.ownAnswer?'Réponse confirmée et enregistrée.':pending?(pending.sending?'Envoi en cours…':'Confirmation non reçue. Vous pouvez renvoyer la même réponse.'):
    role==='player'?'Votre réponse sera définitive après confirmation.':'';
  $('host-controls').hidden=role!=='host';
  for(const id of ['start','pause','resume','reveal','next']){
    $(id).hidden=id==='next'?snapshot.phase!=='closed'||snapshot.final:id==='start'?snapshot.phase!=='lobby':id==='pause'?snapshot.phase!=='open':id==='resume'?snapshot.phase!=='paused':['lobby','closed'].includes(snapshot.phase);
    $(id).disabled=!connected||(id==='start'&&!snapshot.total);
  }
  $('results').hidden=snapshot.phase!=='closed';$('new-room').hidden=role!=='host'||!snapshot.final;
  $('join-another').hidden=role!=='player'||!snapshot.final;
  if(snapshot.phase==='closed'){
    $('correction').textContent=`La bonne réponse : ${snapshot.question.choices.find(c=>c.id===snapshot.correctOption).text}.`;
    $('ranking').replaceChildren();snapshot.ranking.forEach(row=>{const tr=document.createElement('tr');[row.rank,row.name,`${row.points.toLocaleString('fr-FR')} pts`].forEach(value=>{const td=document.createElement('td');td.textContent=value;tr.append(td);});$('ranking').append(tr);});
  }
  tick();
}
$('join-form').onsubmit=event=>{event.preventDefault();error('');joinDetails={code:$('code').value.trim().toUpperCase(),name:$('name').value.trim()};
  if(!joinDetails.name)return;event.submitter.disabled=true;connect();};
$('create').onclick=async()=>{error('');$('create').disabled=true;try{const response=await fetch('/api/rooms',{method:'POST'});if(!response.ok)throw new Error();save(await response.json());connect();}catch{error('Impossible de créer la partie. Vérifiez le serveur.');}finally{$('create').disabled=false;}};
for(const id of ['start','pause','resume','reveal','next'])$(id).onclick=()=>{error('');send({type:id,questionId:snapshot?.questionId});};
$('submit-answer').onclick=()=>{
  if(!selected||!connected||pending?.sending)return;
  if(!pending){const bytes=new Uint8Array(16);crypto.getRandomValues(bytes);const id=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');pending={id,option:selected,sending:false};}
  pending.sending=true;send({type:'answer',questionId:snapshot.questionId,submissionId:pending.id,option:pending.option});render();
  ackTimeout=setTimeout(()=>{if(pending){pending.sending=false;send({type:'sync'});render();}},8000);
};
$('forget').onclick=()=>{stopped=true;clearTimeout(retry);socket?.close();location.href='/';};
$('reset-access').onclick=()=>{stopped=true;clearTimeout(retry);socket?.close();localStorage.removeItem(key);location.reload();};
$('join-another').onclick=()=>{stopped=true;clearTimeout(retry);socket?.close();localStorage.removeItem(key);location.href='/joueur';};
$('new-room').onclick=()=>{stopped=true;clearTimeout(retry);socket?.close();localStorage.removeItem(key);location.reload();};
if(role){$('welcome').hidden=true;$('setup').hidden=false;$('forget').hidden=false;
  $('setup-eyebrow').textContent=role==='host'?'À vous de mener le jeu':'Bienvenue dans la salle';
  $('setup-title').textContent=role==='host'?'On lance une partie ?':'Prêt à jouer ?';
  $('create-panel').hidden=role!=='host';$('join-form').hidden=role!=='player';
  $('code').value=new URLSearchParams(location.search).get('code')||'';
  if(credentials)connect();
}
setInterval(tick,200);
