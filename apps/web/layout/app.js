const $=id=>document.getElementById(id);
const questions={
  single:{title:'Quelle planète est surnommée la planète rouge ?',kind:'Touchez pour répondre',choices:['Mars','Vénus','Jupiter','Saturne'],correct:[0]},
  boolean:{title:'Les pieuvres ont trois cœurs. Vrai ou faux ?',kind:'Touchez Vrai ou Faux',choices:['Vrai','Faux'],correct:[0]},
  blind:{title:'Quel instrument reconnaissez-vous ?',kind:'Touchez pour répondre',choices:['Piano','Violon','Trompette','Guitare'],correct:[0]},
  multi:{title:'Quelles sont les planètes rocheuses ?',kind:'Sélectionnez plusieurs réponses, puis validez',choices:['Mercure','Vénus','Neptune','Saturne'],correct:[0,1]},
  text:{title:'Quelle est la capitale du Portugal ?',kind:'Saisissez puis validez',correctText:'Lisbonne'}
};
let role='host',layout='phone',phase='lobby',type='single',network='connected',questionNumber=1;
let selected=[],text='',pending=false,confirmed=false,lockedAnswer=false,receipt='',timeLeft=30,visiblePodium=0,fullRanking=false;
let rankingAllowed=false,feedbackVisible=false,ackTimer,revealTimer,podiumTimer;
const revealedPlaces=new Set();
const people=[{name:'Camille',initial:'C',status:'connected'},{name:'Alex',initial:'A',status:'connected'},{name:'Noa',initial:'N',status:'reconnecting'},{name:'Sam',initial:'S',status:'disconnected'}];
const statusNames={connected:'Connecté',reconnecting:'Reconnexion',disconnected:'Déconnecté'};
const statusIcons={connected:'✓',reconnecting:'…',disconnected:'✕'};
const esc=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
function clearTimers(){clearTimeout(ackTimer);clearTimeout(revealTimer);clearInterval(podiumTimer);}
function isCorrect(){const q=questions[type];return confirmed&&(type==='text'?text.trim().toLocaleLowerCase('fr')==='lisbonne':selected.length===q.correct.length&&selected.every(i=>q.correct.includes(i)));}
function rows(){
  const tie=$('ties').checked;
  const data=[{name:'Camille',points:3000},{name:'Alex',points:tie?2200:2400},{name:'Noa',points:tie?2200:1900},{name:'Sam',points:1000}];
  return data.map((p,i)=>({...p,points:Math.round(p.points*(phase==='podium'?1:questionNumber/3)),rank:i&&p.points===data[i-1].points?data.slice(0,i).findIndex(other=>other.points===p.points)+1:i+1}));
}
function resetAnswer(){clearTimeout(ackTimer);selected=[];text='';pending=false;confirmed=false;lockedAnswer=false;receipt='';timeLeft=30;}
function setPhase(next){
  clearTimers();phase=next;feedbackVisible=false;rankingAllowed=false;fullRanking=false;
  if(pending){pending=false;receipt='Confirmation non reçue.';}
  if(next==='lobby'||next==='open'){resetAnswer();}
  if(next==='ranking')rankingAllowed=true;
  if(next==='reveal'){
    feedbackVisible=true;
    revealTimer=setTimeout(()=>{feedbackVisible=false;rankingAllowed=true;phase='ranking';render();},3500);
  }
  if(next==='podium')startPodium();
  $('scene-picker').value=next;render();showPanel(next==='podium'||next==='ranking'?'ranking-panel':'play-panel');
}
function startPodium(){
  rankingAllowed=true;visiblePodium=0;revealedPlaces.clear();
  podiumTimer=setInterval(()=>{
    const place=[3,2,1][visiblePodium++];revealedPlaces.add(place);renderRanking();
    if(visiblePodium===3)clearInterval(podiumTimer);
  },1200);
}
function showPanel(id){
  const element=$(id);if(element.hidden)return;
  const panels=$('panels');
  if(layout==='phone'||matchMedia('(max-width:700px)').matches)panels.scrollTo({top:element.offsetTop-$('play-panel').offsetTop,behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});
  for(const button of $('panel-nav').querySelectorAll('button'))button.setAttribute('aria-current',String(button.dataset.panel===id));
}
function connectionMarkup(status){return `<span aria-hidden="true">${statusIcons[status]}</span> ${statusNames[status]}`;}
function rankList(){return `<ol class="ranking-list">${rows().map(p=>`<li class="rank-row ${role==='player'&&p.name==='Camille'?'mine':''}"><span class="rank-number">${p.rank}</span><span class="avatar" aria-hidden="true">${p.name[0]}</span><span class="rank-name">${p.name}${role==='player'&&p.name==='Camille'?'<small>Vous</small>':''}${rows().filter(other=>other.rank===p.rank).length>1?'<small>Ex æquo</small>':''}</span><span class="points">${p.points.toLocaleString('fr-FR')} <small>pts</small></span></li>`).join('')}</ol>`;}
function dockRankingAction(){
  const button=$('ranking-content').querySelector('[data-action="next"],[data-action="full-ranking"]');
  if(button){$('ranking-dock').append(button);$('ranking-dock').hidden=false;}
}
function renderRanking(){
  $('ranking-panel').classList.toggle('podium-view',phase==='podium'&&!fullRanking);
  $('ranking-dock').replaceChildren();$('ranking-dock').hidden=true;
  $('ranking-title').textContent=phase==='podium'?(fullRanking?'Classement final':'Le podium'):'Classement cumulé';
  if(!rankingAllowed){$('ranking-content').innerHTML='<div class="locked"><span class="lock-symbol" aria-hidden="true">◇</span><h2>Classement non publié</h2><p>Le classement apparaîtra après la révélation.<br>Pendant une manche, il attendra la fin de celle-ci.</p></div>';return;}
  if(phase==='podium'&&!fullRanking){
    $('ranking-content').innerHTML=`<span class="finish-label">Partie terminée</span><p class="podium-status" role="status">${visiblePodium===0?'Le podium va se dévoiler…':visiblePodium<3?`Place ${[3,2,1][visiblePodium-1]} dévoilée`:'Bravo à tous les participants !'}</p><div class="podium">${[2,1,3].map(place=>{
      const winners=rows().filter(p=>p.rank===place),visible=revealedPlaces.has(place);
      return `<div class="podium-step ${visible?'revealed':'unrevealed'}" data-place="${place}" aria-hidden="${!visible}"><div class="podium-people">${winners.length?winners.map(p=>esc(p.name)).join('<br>'):'<span class="podium-empty">Pas de 3e place<br>(ex æquo)</span>'}</div><div class="podium-block"><strong>${place}</strong><span class="small">${winners.length?`${winners[0].points.toLocaleString('fr-FR')} pts`:''}</span></div></div>`;
    }).join('')}</div>${visiblePodium===3?`<button class="secondary full" data-action="full-ranking">Voir le classement complet</button><p class="ranking-note">Les statistiques de partie seront conçues dans une prochaine étape.</p>`:''}`;
    dockRankingAction();return;
  }
  $('ranking-content').innerHTML=`${rankList()}<p class="ranking-note">Données de démonstration. Les points présentés illustrent la mise en page.</p>${phase==='podium'?'<p class="hint">Partie terminée. Merci à tous !</p>':role==='host'?`<button class="primary full" data-action="next">${questionNumber===3?'Afficher le podium':'Question suivante'}</button>`:'<p class="hint">La prochaine question apparaîtra sur votre écran principal.</p>'}`;
  dockRankingAction();
}
function renderRoom(){
  $('room-summary').textContent='4 inscrits · 2 connectés · 1 en reconnexion';
  $('participants').innerHTML=people.map(p=>`<li class="participant"><span class="avatar" aria-hidden="true">${p.initial}</span><span class="participant-name">${p.name}</span><span class="presence ${p.status==='disconnected'?'off':p.status==='reconnecting'?'wait':''}"><b aria-hidden="true">${statusIcons[p.status]}</b>${statusNames[p.status]}</span></li>`).join('');
}
function renderPlay(){
  $('host-dock').replaceChildren();$('host-dock').hidden=true;
  if(phase==='lobby'){
    $('play').innerHTML=role==='host'?`<div class="lobby-copy"><div class="lobby-heading"><div class="lobby-art" aria-hidden="true">✦</div><div><p class="eyebrow">Le quiz</p><h1>Culture générale</h1></div></div><div class="code join-card"><div class="join-code"><span>Code de la partie</span><strong>1234</strong></div><div class="qr-space"><div class="qr-placeholder" role="img" aria-label="Emplacement réservé au QR code, non scannable">QR</div><span>Emplacement réservé</span></div></div><p class="muted">Partagez le code ou le QR code pour rejoindre.</p><button class="primary full" data-action="start">Lancer la partie</button><p class="hint">4 participants inscrits</p></div>`:`<div class="lobby-copy"><div class="lobby-art" aria-hidden="true">✓</div><h1>Vous êtes dans la partie.</h1><p class="muted">Camille, votre place est réservée.<br>La question apparaîtra ici dès son lancement.</p><div class="avatar lobby-art" aria-hidden="true">C</div><p class="hint">Culture générale · 3 questions</p><button class="quiet" data-action="start">Simuler le lancement</button></div>`;
    return;
  }
  const q=questions[type],closed=['reveal','ranking','podium'].includes(phase),disabled=role==='host'||phase!=='open'||lockedAnswer||network!=='connected';
  const answerText=type==='text'?q.correctText:q.correct.map(i=>`${String.fromCharCode(65+i)} · ${q.choices[i]}`).join(' et ');
  let choices=type==='text'?`<label class="sr-only" for="free-answer">Votre réponse</label><input id="free-answer" class="text-answer" placeholder="Saisissez votre réponse" value="${esc(text)}" ${disabled?'disabled':''}>`:`<div class="choices">${q.choices.map((choice,i)=>`<button class="choice ${closed&&q.correct.includes(i)?'correct':''} ${feedbackVisible&&q.correct.includes(i)?'reveal-flash':''} ${closed&&selected.includes(i)&&!q.correct.includes(i)?'wrong':''}" data-choice="${i}" aria-pressed="${selected.includes(i)}" ${disabled?'disabled':''}><span class="choice-letter" aria-hidden="true">${String.fromCharCode(65+i)}</span><span>${esc(choice)}</span>${selected.includes(i)||closed&&q.correct.includes(i)?`<span class="choice-mark" aria-label="${closed?(q.correct.includes(i)?'Réponse correcte':'Réponse incorrecte'):'Réponse sélectionnée'}">${closed&&!q.correct.includes(i)?'✕':'✓'}</span>`:''}</button>`).join('')}</div>`;
  if(role==='host')choices=`<div class="choices">${q.choices?.map((choice,i)=>`<div class="choice ${closed&&q.correct.includes(i)?'correct':''} ${feedbackVisible&&q.correct.includes(i)?'reveal-flash':''}"><span class="choice-letter">${String.fromCharCode(65+i)}</span>${esc(choice)}${closed&&q.correct.includes(i)?'<span class="choice-mark" aria-label="Réponse correcte">✓</span>':''}</div>`).join('')||'<p class="muted">Les joueurs saisissent leur réponse sur leur téléphone.</p>'}</div>`;
  const needsValidation=['multi','text'].includes(type);
  const validation=role==='player'&&needsValidation&&!lockedAnswer&&!closed?`<button class="primary full" data-action="submit" ${disabled||!(type==='text'?text.trim():selected.length)?'disabled':''}>Valider ma réponse</button>`:role==='player'&&lockedAnswer&&!pending&&!confirmed&&!closed?`<button class="secondary full" data-action="submit" ${network!=='connected'?'disabled':''}>Renvoyer la même réponse</button>`:'';
  const feedback=closed&&feedbackVisible&&role==='player'?`<div class="feedback ${!confirmed?'neutral':isCorrect()?'':'bad'}" role="status"><strong>${!confirmed?'Pas de réponse':isCorrect()?'Bien joué !':'Dommage'}</strong>${isCorrect()?'<p>+ 1 000 points</p>':type==='text'?`<p>La bonne réponse : ${answerText}.</p>`:''}</div>`:'';
  $('play').innerHTML=`<div class="question-meta"><span class="question-number">Question ${questionNumber} / 3${type==='blind'?' <span class="audio-marker" title="Extrait sonore fictif, aucun audio dans cette maquette" aria-label="Extrait sonore simulé">♫</span>':''}</span><div class="meta-message"><p class="question-kind" data-hidden="${closed||phase==='paused'}" aria-hidden="${closed||phase==='paused'}">${role==='player'?(confirmed?'Réponse envoyée':pending?'Envoi en cours…':lockedAnswer?'Réponse non confirmée':q.kind):''}</p><span class="pause-label" data-active="${phase==='paused'}" aria-hidden="${phase!=='paused'}"><span aria-hidden="true">⌛</span> Jeu en pause</span></div><span class="timer-group" data-hidden="${closed}" aria-hidden="${closed}"><span class="timer" aria-label="Temps restant">${timeLeft} s</span></span></div><progress class="progress" max="30" value="${timeLeft}" data-hidden="${closed}" aria-hidden="${closed}" aria-label="Temps restant"></progress><h1 class="question">${q.title}</h1>${choices}${validation}${role==='player'&&!closed?`<p class="receipt ${confirmed?'sr-only':pending?'pending':''}" role="status" ${receipt?'':'hidden'}>${receipt||' '}</p>`:''}${feedback}${closed&&type==='text'&&(role==='host'||(!feedbackVisible&&!isCorrect()))?`<p class="correction ${feedbackVisible?'reveal-flash':''}">Bonne réponse : <strong>${answerText}</strong></p>`:''}${role==='host'?`<p class="host-count">${confirmed?'1':'0'} / 4 réponses confirmées</p><div class="host-controls">${phase==='open'?'<button data-action="pause">Mettre en pause</button><button class="primary" data-action="reveal">Révéler les résultats</button>':phase==='paused'?'<button class="primary" data-action="resume">Reprendre</button><button data-action="reveal">Révéler les résultats</button>':phase==='reveal'?'<p class="hint">Révélation en cours… Le classement apparaîtra dans quelques instants.</p>':phase==='ranking'?'<button class="secondary" data-action="show-ranking">Voir le classement</button>':''}</div>`:''}`;
  if(role==='host'&&phase!=='podium'){
    $('host-dock').append(...$('play').querySelectorAll('.host-count,.host-controls'));
    $('host-dock').hidden=false;
  }
}
function render(){
  $('device').dataset.role=role;$('device').dataset.layout=layout;
  $('device').classList.toggle('compact',layout==='phone'||matchMedia('(max-width:700px)').matches);
  $('role-label').textContent=role==='host'?'Espace animateur':'Camille';
  $('connection').innerHTML=connectionMarkup(network);$('connection').dataset.state=network;
  $('room-panel').hidden=role!=='host';
  const tabs=role==='host'?[['play-panel','Pilotage'],['ranking-panel','Classement'],['room-panel','Participants']]:[['play-panel','Question'],['ranking-panel','Classement']];
  const active=$('panel-nav').querySelector('[aria-current=true]')?.dataset.panel||'play-panel';
  $('panel-nav').innerHTML=tabs.map(([id,label])=>`<button data-panel="${id}" aria-current="${id===active}">${label}</button>`).join('');
  for(const button of document.querySelectorAll('[data-role]'))if(button.tagName==='BUTTON')button.setAttribute('aria-pressed',String(button.dataset.role===role));
  for(const button of document.querySelectorAll('[data-layout]'))if(button.tagName==='BUTTON')button.setAttribute('aria-pressed',String(button.dataset.layout===layout));
  $('footer-state').textContent=phase==='lobby'?'Salle d’attente · 1234':phase==='podium'?'Partie terminée':'';
  renderPlay();renderRoom();renderRanking();
}
function submit(){
  if(role!=='player'||phase!=='open'||network!=='connected'||confirmed||pending)return;
  if(!selected.length&&!text.trim())return;
  lockedAnswer=true;pending=true;receipt='Envoi en cours…';render();
  ackTimer=setTimeout(()=>{
    if(network!=='connected'){pending=false;receipt='Confirmation non reçue. Renvoyez la même réponse.';render();return;}
    pending=false;confirmed=true;receipt='Réponse enregistrée.';render();
  },550);
}
document.addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button||button.disabled)return;
  if(button.dataset.role){role=button.dataset.role;render();showPanel(phase==='podium'?'ranking-panel':'play-panel');return;}
  if(button.dataset.layout){layout=button.dataset.layout;render();showPanel('play-panel');return;}
  if(button.dataset.panel){showPanel(button.dataset.panel);return;}
  if(button.dataset.choice!==undefined){
    const i=Number(button.dataset.choice);
    if(type==='multi'){selected=selected.includes(i)?selected.filter(v=>v!==i):[...selected,i];render();}else{selected=[i];submit();}
    return;
  }
  switch(button.dataset.action){
    case 'start':setPhase('open');break;
    case 'pause':phase='paused';$('scene-picker').value=phase;render();break;
    case 'resume':phase='open';$('scene-picker').value=phase;render();break;
    case 'submit':submit();break;
    case 'reveal':setPhase('reveal');break;
    case 'show-ranking':showPanel('ranking-panel');break;
    case 'next':if(questionNumber===3){setPhase('podium');}else{questionNumber++;type=['single','multi','text'][questionNumber-1];$('type-picker').value=type;setPhase('open');}break;
    case 'full-ranking':fullRanking=true;renderRanking();break;
  }
});
document.addEventListener('input',event=>{if(event.target.id==='free-answer'){text=event.target.value;const button=$('play').querySelector('[data-action=submit]');if(button)button.disabled=!text.trim()||network!=='connected';}});
$('scene-picker').onchange=event=>setPhase(event.target.value);
$('type-picker').onchange=event=>{type=event.target.value;setPhase('open');};
$('network-picker').onchange=event=>{network=event.target.value;render();};
$('ties').onchange=()=>renderRanking();
$('reset').onclick=()=>{questionNumber=1;type='single';network='connected';$('type-picker').value=type;$('network-picker').value=network;setPhase('lobby');};
setInterval(()=>{if(phase!=='open')return;timeLeft--;if(timeLeft<=0){timeLeft=0;setPhase('reveal');}else{const timer=$('play').querySelector('.timer');if(timer)timer.textContent=`${timeLeft} s`;const progress=$('play').querySelector('progress');if(progress)progress.value=timeLeft; }},1000);
const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting&&entry.intersectionRatio>.6)for(const button of $('panel-nav').querySelectorAll('button'))button.setAttribute('aria-current',String(button.dataset.panel===entry.target.id));},{root:$('panels'),threshold:.65});
for(const panel of document.querySelectorAll('.scene'))observer.observe(panel);
matchMedia('(max-width:700px)').addEventListener('change',render);
render();
