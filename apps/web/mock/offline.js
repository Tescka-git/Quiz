const status=document.getElementById('offline-status'),button=document.getElementById('check-offline');
const CACHE='kuikuiz-mock-shell-v5';
const FILES=['/','/app.js','/offline.js','/style.css','/manifest.webmanifest','/icon.svg','/connection.json'];
async function check(){
  try{
    if(!isSecureContext||!('serviceWorker' in navigator)||!('caches' in globalThis)){
      status.dataset.ready='false';status.textContent='Préparation hors ligne indisponible sur cette adresse. Le jeu nécessite un hôte joignable.';button.hidden=true;return;
    }
    if(!navigator.serviceWorker.controller){status.textContent='Préparation hors ligne en cours…';return;}
    const names=await caches.keys();
    const cache=names.includes(CACHE)?await caches.open(CACHE):null;
    const complete=cache&&(await Promise.all(FILES.map(path=>cache.match(path)))).every(response=>response?.ok);
    status.textContent=complete?'Écrans disponibles hors ligne. L’hôte reste nécessaire pour jouer.':'Cache incomplet : utilisez Préparer / vérifier avec l’hôte disponible.';
    status.dataset.ready=String(Boolean(complete));
  }catch{status.dataset.ready='false';status.textContent='Cache non vérifié. Rechargez avec l’hôte disponible.';}
}
button.onclick=async()=>{
  button.disabled=true;
  await check();
  if(status.dataset.ready==='true'||!navigator.serviceWorker?.controller){button.disabled=false;return;}
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),3000);
  try{
    const cache=await caches.open(CACHE),missing=[];
    for(const path of FILES)if(!(await cache.match(path))?.ok)missing.push(new Request(path,{cache:'reload',signal:controller.signal}));
    await cache.addAll(missing);await check();
  }catch{status.dataset.ready='false';status.textContent='Préparation incomplète. Réessayez lorsque l’hôte est disponible.';}
  finally{clearTimeout(timeout);button.disabled=false;}
};
if(isSecureContext&&'serviceWorker' in navigator){
  navigator.serviceWorker.addEventListener('controllerchange',check);
  navigator.serviceWorker.register('/sw.js').then(registration=>{
    const worker=registration.installing;
    if(!worker&&!registration.active&&!registration.waiting){status.dataset.ready='false';status.textContent='Préparation incomplète. Rechargez avec l’hôte disponible.';return;}
    worker?.addEventListener('statechange',()=>{if(worker.state==='redundant'){status.textContent='Préparation incomplète. Rechargez avec l’hôte disponible.';status.dataset.ready='false';}});
    return check();
  }).catch(()=>{status.textContent='Préparation hors ligne impossible. Rechargez avec l’hôte disponible.';status.dataset.ready='false';});
}
check();
