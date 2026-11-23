import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,mkdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {once} from 'node:events';
import {buildEngine} from './engine-build.mjs';
import {createMockServer} from '../apps/server-node/mock-server.mjs';

await buildEngine();
const directory=await mkdtemp(join(tmpdir(),'kuikuiz-cache-lifecycle-'));
const executablePath=process.env.KUIKUIZ_CHROME||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
let app,context,port=0,version='v1';
async function start(){
  app=await createMockServer({filename:join(directory,'game.sqlite'),assetReader:async url=>{
    let body=(await readFile(url)).toString();
    if(version==='v2')body=body.replaceAll('kuikuiz-mock-shell-v2','kuikuiz-mock-shell-v3');
    if(url.pathname.endsWith('/index.html'))body=body.replace('<body>',`<body data-shell-version="${version}">`);
    return Buffer.from(body);
  }});
  app.server.listen(port,'127.0.0.1');await once(app.server,'listening');port=app.server.address().port;
}
const launch=()=>chromium.launchPersistentContext(join(directory,'browser-profile'),{executablePath,headless:true});
const ready=page=>page.waitForFunction(()=>document.getElementById('offline-status').dataset.ready==='true');
const checks=[];
try{
  await start();const origin=`http://127.0.0.1:${port}`;
  context=await launch();let page=await context.newPage();
  await page.goto(origin+'/animateur');await ready(page);
  await page.locator('#create').click();await page.locator('#room-code').waitFor({state:'visible'});
  const saved=await page.evaluate(()=>localStorage.getItem('kuikuiz.mock.host'));
  assert.ok(saved);
  await page.evaluate(async()=>{const cache=await caches.open('kuikuiz-diagnostic-keep');await cache.put('/keep',new Response('conserver'));});
  await app.stop();app=null;await context.close();context=null;

  context=await launch();page=await context.newPage();
  await page.goto(origin+'/animateur');await ready(page);
  await page.waitForFunction(()=>document.getElementById('host-status').textContent.includes('déconnecté'));
  assert.equal(await page.evaluate(()=>localStorage.getItem('kuikuiz.mock.host')),saved);
  assert.equal(await page.locator('#game').isHidden(),true);
  assert.equal(await page.locator('#results').isHidden(),true);
  checks.push('Navigateur entièrement fermé puis rouvert avec profil conservé et serveur arrêté : interface et accès local retrouvés, aucun faux état de partie');

  await start();await page.locator('#game').waitFor({state:'visible'});
  assert.equal(await page.locator('#room-code').innerText(),JSON.parse(saved).code);
  checks.push('Retour du serveur : même salle et même accès animateur récupérés');

  version='v2';
  await page.evaluate(async()=>{const registration=await navigator.serviceWorker.getRegistration();await registration.update();});
  await page.waitForFunction(async()=>Boolean((await navigator.serviceWorker.getRegistration()).waiting));
  assert.equal(await page.locator('body').getAttribute('data-shell-version'),'v1');
  await page.reload();await ready(page);
  assert.equal(await page.locator('body').getAttribute('data-shell-version'),'v1');
  assert.ok(await page.evaluate(async()=>Boolean(await caches.has('kuikuiz-mock-shell-v2'))));
  checks.push('Mise à jour complète en attente : onglet existant et rechargement restent sur v1');

  // Tous les clients contrôlés sont fermés, sans commande skipWaiting.
  for(const open of context.pages())await open.close();
  let activated=false;const deadline=Date.now()+15000;
  while(Date.now()<deadline&&!activated){
    for(const worker of context.serviceWorkers())try{
      activated=await worker.evaluate(async()=>CACHE==='kuikuiz-mock-shell-v3'&&!(await caches.has('kuikuiz-mock-shell-v2'))&&await caches.has('kuikuiz-mock-shell-v3'));
      if(activated)break;
    }catch{}
    if(!activated)await new Promise(resolve=>setTimeout(resolve,100));
  }
  assert.ok(activated,'Activation de v2 après fermeture des onglets attendue');
  await app.stop();app=null;
  page=await context.newPage();await page.goto(origin+'/joueur?code=ABCDEF12');await ready(page);
  assert.equal(await page.locator('body').getAttribute('data-shell-version'),'v2');
  assert.equal(await page.locator('#code').inputValue(),'ABCDEF12');
  assert.deepEqual(await page.evaluate(async()=>(await caches.keys()).sort()),['kuikuiz-diagnostic-keep','kuikuiz-mock-shell-v3']);
  assert.equal(await page.evaluate(async()=>await (await (await caches.open('kuikuiz-diagnostic-keep')).match('/keep')).text()),'conserver');
  checks.push('Après fermeture des onglets : v2 activée, v1 supprimée, cache étranger conservé ; nouvelle page v2 disponible serveur arrêté');
  await context.close();context=null;
  context=await launch();page=await context.newPage();await page.goto(origin+'/');await ready(page);
  assert.equal(await page.locator('body').getAttribute('data-shell-version'),'v2');
  checks.push('Nouveau redémarrage complet du navigateur : v2 reste disponible sans serveur');
  const report={date:new Date().toISOString(),result:'PASS',browser:context.browser()?.version(),checks,
    scope:'Chrome PC, profil de test temporaire conservé entre fermetures, arrêt réel du serveur, mise à jour simulée sans modification des sources',
    limits:['Fermetures normales, pas de coupure matérielle ni effacement des données','Aucune validation physique Pixel/iOS ou installation PWA ajoutée']};
  await mkdir('artifacts/mock-preview',{recursive:true});await writeFile('artifacts/mock-preview/offline-lifecycle-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{
  if(context)await context.close();if(app)await app.stop();
  const path=resolve(directory);assert.ok(path.startsWith(resolve(tmpdir())+'\\kuikuiz-cache-lifecycle-')||path.startsWith(resolve(tmpdir())+'/kuikuiz-cache-lifecycle-'));
  await rm(directory,{recursive:true,force:true});
}
