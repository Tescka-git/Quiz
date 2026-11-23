// Changer cette version à chaque modification des ressources de l'interface.
const CACHE='kuikuiz-mock-shell-v5';
const FILES=['/','/app.js','/offline.js','/style.css','/manifest.webmanifest','/icon.svg','/connection.json'];
const PAGES=['/','/animateur','/joueur'];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES.map(path=>new Request(path,{cache:'reload'})))));
  // Pas de skipWaiting : ne pas remplacer l'interface d'une partie en cours.
});
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  for(const name of await caches.keys())if(name.startsWith('kuikuiz-mock-shell-')&&name!==CACHE)await caches.delete(name);
  await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin)return;
  if(url.pathname==='/connection.json'){
    event.respondWith((async()=>{
      const cache=await caches.open(CACHE),controller=new AbortController();
      const timeout=setTimeout(()=>controller.abort(),1500);
      try{
        const response=await fetch(request,{cache:'no-store',signal:controller.signal});
        if(!response.ok)throw new Error('Configuration indisponible');
        const config=await response.clone().json();
        if(typeof config.socketPath!=='string')throw new Error('Configuration invalide');
        await cache.put('/connection.json',response.clone());return response;
      }catch{return await cache.match('/connection.json')||Response.error();}
      finally{clearTimeout(timeout);}
    })());return;
  }
  const path=request.mode==='navigate'&&PAGES.includes(url.pathname)?'/':url.pathname;
  if(!FILES.includes(path)||path==='/connection.json')return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE),cached=await cache.match(path);
    if(cached)return cached;
    const response=await fetch(path,{cache:'no-store'});
    if(response.ok)await cache.put(path,response.clone());return response;
  })());
});
