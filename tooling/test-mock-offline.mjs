import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {once} from 'node:events';
import {buildEngine} from './engine-build.mjs';
import {createMockServer} from '../apps/server-node/mock-server.mjs';

await buildEngine();
const directory=await mkdtemp(join(tmpdir(),'kuikuiz-offline-'));
const cacheName='kuikuiz-mock-shell-v12';
let app,browser,port=0,badStyle=false,badUpdate=false;
async function start(){
  app=await createMockServer({filename:join(directory,'game.sqlite'),assetReader:async url=>{
    if(badStyle&&url.pathname.endsWith('/style.css'))throw new Error('Ressource indisponible injectée');
    const bytes=await readFile(url);
    if(badUpdate&&url.pathname.endsWith('/sw.js'))return Buffer.from(bytes.toString().replace('kuikuiz-mock-shell-v12','kuikuiz-mock-shell-v13').replace("'/icon.svg'","'/absent.svg'"));
    return bytes;
  }});
  app.server.listen(port,'127.0.0.1');await once(app.server,'listening');port=app.server.address().port;
}
const ready=page=>page.waitForFunction(()=>document.getElementById('offline-status').dataset.ready==='true');
const checks=[];
try{
  await start();const origin=`http://127.0.0.1:${port}`;
  browser=await chromium.launch({executablePath:process.env.KUIKUIZ_CHROME||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',headless:true});
  const context=await browser.newContext();const host=await context.newPage(),player=await context.newPage();
  const errors=[];for(const page of [host,player])page.on('pageerror',error=>errors.push(error.message));
  await host.goto(origin+'/animateur');await ready(host);
  await host.locator('#create').click();await host.locator('#room-code').waitFor({state:'visible'});
  const code=await host.locator('#room-code').innerText();await player.goto(origin+'/joueur?code='+code);
  await player.locator('#name').fill('Hors ligne');await player.locator('#join-form button').click();
  const waitingContext=await browser.newContext();
  const waiting=await waitingContext.newPage();await waiting.goto(origin+'/joueur?code='+code);
  await waiting.locator('#name').fill('Joueur en attente');await waiting.locator('#join-form button').click();
  await waiting.locator('#game').waitFor({state:'visible'});
  await host.waitForFunction(()=>document.getElementById('participant-count').textContent==='(2)');
  await host.locator('#start').click();await player.getByRole('radio',{name:'Mars',exact:true}).check();
  await player.waitForFunction(()=>document.getElementById('receipt').textContent==='Réponse confirmée et enregistrée.');
  const cached=await player.evaluate(async name=>(await (await caches.open(name)).keys()).map(request=>new URL(request.url).pathname).sort(),cacheName);
  assert.deepEqual(cached,['/','/app.js','/connection.json','/icon.svg','/manifest.webmanifest','/offline.js','/style.css']);
  checks.push('Interface préparée ; aucun état, réponse ou accès API dans le cache');

  await app.stop();app=null;
  await player.reload();await ready(player);
  await player.waitForFunction(()=>document.getElementById('host-status').textContent.includes('déconnecté'));
  assert.equal(await player.locator('#game').isHidden(),true);
  assert.equal(await player.locator('#results').isHidden(),true);
  assert.equal(await player.locator('#receipt').innerText(),'');
  assert.ok((await player.locator('#code').inputValue())===code);
  await host.reload();await ready(host);
  await host.waitForFunction(()=>document.getElementById('host-status').textContent.includes('déconnecté'));
  await host.locator('#create').click();await host.locator('#error').waitFor({state:'visible'});
  assert.match(await host.locator('#error').innerText(),/Impossible de créer/);
  await host.goto(origin+'/');await ready(host);assert.equal(await host.locator('#welcome').isVisible(),true);
  await host.evaluate(async name=>(await caches.open(name)).delete('/connection.json'),cacheName);
  await host.locator('#diagnostics').evaluate(el=>el.open=true);await host.locator('#check-offline').click();await host.locator('#diagnostics').evaluate(el=>el.open=false);
  await host.waitForFunction(()=>document.getElementById('offline-status').dataset.ready==='false'&&document.getElementById('offline-status').textContent.includes('Préparation incomplète'));
  const cold=await browser.newContext();const coldPage=await cold.newPage();
  await assert.rejects(coldPage.goto(origin+'/joueur'));await cold.close();
  checks.push('Serveur réellement arrêté : accueil, animateur et joueur rechargeables ; aucun faux résultat ni création hors ligne ; profil neuf indisponible');
  checks.push('Ressource supprimée hors ligne : préparation signalée incomplète, sans fausse réparation');

  await start();
  await player.waitForFunction(()=>document.getElementById('phase-title').textContent==='⌛ Jeu en pause',null,{timeout:15000});
  assert.equal(await player.getByRole('radio',{name:'Mars',exact:true}).isChecked(),true);
  assert.equal(await player.getByRole('radio',{name:'Mars',exact:true}).isDisabled(),true);
  assert.equal(await player.locator('#receipt').innerText(),'Réponse confirmée et enregistrée.');
  checks.push('Retour de l’hôte : réponse confirmée retrouvée et reprise gelée, sans soumission automatique');

  await host.evaluate(async name=>{const cache=await caches.open(name);await cache.delete('/connection.json');},cacheName);
  await host.locator('#diagnostics').evaluate(el=>el.open=true);await host.locator('#check-offline').click();await host.locator('#diagnostics').evaluate(el=>el.open=false);
  await host.waitForFunction(async name=>Boolean(await (await caches.open(name)).match('/connection.json')),cacheName);
  await ready(host);
  assert.ok(await host.evaluate(async name=>Boolean(await (await caches.open(name)).match('/connection.json')),cacheName));
  checks.push('Ressource supprimée : préparation explicite répare le cache avec hôte disponible');

  badUpdate=true;
  await host.evaluate(async()=>{
    const registration=await navigator.serviceWorker.getRegistration();
    await new Promise(async(resolve,reject)=>{
      const timeout=setTimeout(()=>reject(new Error('Mise à jour attendue absente')),10000);
      registration.addEventListener('updatefound',()=>{const worker=registration.installing;
        worker.addEventListener('statechange',()=>{if(worker.state==='redundant'){clearTimeout(timeout);resolve();}});},{once:true});
      try{await registration.update();}catch(error){clearTimeout(timeout);reject(error);}
    });
  });
  await ready(host);
  assert.ok(await host.evaluate(async name=>Boolean(await (await caches.open(name)).match('/app.js')),cacheName));
  badUpdate=false;
  checks.push('Mise à jour incomplète refusée ; ancienne interface conservée');

  const incomplete=await browser.newContext();const incompletePage=await incomplete.newPage();
  badStyle=true;await incompletePage.goto(origin+'/joueur');
  await incompletePage.waitForFunction(()=>document.getElementById('offline-status').dataset.ready==='false');
  assert.equal(await incompletePage.evaluate(()=>Boolean(navigator.serviceWorker.controller)),false);
  assert.equal(await incompletePage.evaluate(async name=>(await (await caches.open(name)).keys()).length,cacheName),0);
  badStyle=false;await incompletePage.reload();await ready(incompletePage);await incomplete.close();
  checks.push('Première préparation incomplète non annoncée prête ; récupération après retour de la ressource');

  assert.deepEqual(errors,[]);await mkdir('artifacts/mock-preview',{recursive:true});
  await player.screenshot({path:'artifacts/mock-preview/pwa-reprise.png',fullPage:true});
  const report={date:new Date().toISOString(),result:'PASS',browser:await browser.version(),originType:'HTTP loopback, contexte sécurisé de développement',cacheName,checks,
    limits:['PC Chrome uniquement ; aucun essai Pixel ou iOS dans ce lot','Cache des écrans, sans hôte de jeu hors ligne dans le navigateur','Aucune validation HTTPS/WSS sans Internet ajoutée']};
  await writeFile('artifacts/mock-preview/offline-shell-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{
  if(browser)await browser.close();if(app)await app.stop();
  const path=resolve(directory);assert.ok(path.startsWith(resolve(tmpdir())+'\\kuikuiz-offline-')||path.startsWith(resolve(tmpdir())+'/kuikuiz-offline-'));
  await rm(directory,{recursive:true,force:true});
}
