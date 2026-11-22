import {chromium} from 'playwright-core';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {request} from 'node:https';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const adb=process.env.KUIKUIZ_ADB,device=process.env.KUIKUIZ_DEVICE;
if(!adb||!device)throw new Error('KUIKUIZ_ADB et KUIKUIZ_DEVICE requis. Ce test arrête puis relance uniquement la maquette.');
const origin=process.env.KUIKUIZ_ORIGIN||'https://192.168.1.21:8443';
const cacheName='kuikuiz-mock-shell-v1',execute=promisify(execFile);
const shell=(...args)=>execute(adb,['-s',device,'shell',...args]);
const ca=await readFile(new URL('../.tools/tls/ca.pem',import.meta.url));
function probe(){return new Promise((resolve,reject)=>{
  const req=request(origin+'/connection.json',{ca,timeout:1500},response=>{response.resume();response.on('end',()=>resolve(response.statusCode));});
  req.on('error',reject);req.on('timeout',()=>req.destroy(new Error('timeout')));req.end();
});}
async function nativeButton(label){
  await shell('am','start','-n','fr.kuikuiz.probe/.MainActivity');
  let dumpError;
  for(let attempt=0;attempt<3;attempt++){
    try{await shell('uiautomator','dump','--compressed','/sdcard/kuikuiz-window.xml');dumpError=null;break;}
    catch(error){dumpError=error;await new Promise(resolve=>setTimeout(resolve,750));}
  }
  if(dumpError)throw new Error('Écran natif non disponible après trois essais : '+label);
  const xml=(await shell('cat','/sdcard/kuikuiz-window.xml')).stdout;
  const node=xml.match(new RegExp(`<node[^>]*text="${label}"[^>]*bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`));
  if(!node)throw new Error('Commande native non repérée : '+label);
  await shell('input','tap',String(Math.round((+node[1]+ +node[3])/2)),String(Math.round((+node[2]+ +node[4])/2)));
}
async function waitHost(available){
  const deadline=Date.now()+40000;
  while(Date.now()<deadline){let actual=false;try{actual=await probe()===200;}catch{}
    if(actual===available)return;await new Promise(resolve=>setTimeout(resolve,250));}
  throw new Error(available?'Hôte HTTPS non prêt':'Hôte encore joignable après arrêt');
}
let stopped=false;
async function stop(){await nativeButton('ARRÊTER LA MAQUETTE DE QUIZ');await waitHost(false);stopped=true;}
async function start(){await nativeButton('HÉBERGER EN HTTPS/WSS DE TEST');await waitHost(true);stopped=false;}
async function chrome(page){await shell('am','start','-a','android.intent.action.VIEW','-d',origin+'/','com.android.chrome');if(page)await page.bringToFront();}
const checks=[];let local,pixel,page,report={result:'FAIL',origin,checks};
try{
  const pkg=(await shell('dumpsys','package','fr.kuikuiz.probe')).stdout;
  const version=pkg.match(/versionName=([^\s]+)/)?.[1];assert.equal(version,'0.8-experiment');
  await stop();await start();await chrome();
  const chromeDeadline=Date.now()+30000;let chromeError;
  while(Date.now()<chromeDeadline&&!pixel){
    try{const response=await fetch('http://127.0.0.1:9222/json/version',{signal:AbortSignal.timeout(1500)});
      const target=await response.json();pixel=await chromium.connectOverCDP(target.webSocketDebuggerUrl,{timeout:3000});}
    catch(error){chromeError=error;await new Promise(resolve=>setTimeout(resolve,500));}
  }
  if(!pixel)throw new Error('Débogage Chrome non prêt : '+chromeError?.message);
  const context=pixel.contexts()[0];page=await context.newPage();await page.bringToFront();
  await page.goto(origin+'/');
  const ready=()=>page.waitForFunction(()=>document.getElementById('offline-status').dataset.ready==='true');
  await ready();assert.equal(await page.evaluate(()=>isSecureContext),true);
  const entries=await page.evaluate(async name=>(await (await caches.open(name)).keys()).map(r=>new URL(r.url).pathname).sort(),cacheName);
  assert.deepEqual(entries,['/','/app.js','/connection.json','/icon.svg','/manifest.webmanifest','/offline.js','/style.css']);
  checks.push('Préparation HTTPS normale sur Chrome Pixel : sept ressources présentes et contexte sécurisé');

  local=await chromium.launch({executablePath:process.env.KUIKUIZ_CHROME||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',headless:true});
  const host=await (await local.newContext({ignoreHTTPSErrors:true})).newPage();
  await host.goto(origin+'/animateur');await host.locator('#create').click();await host.locator('#room-code').waitFor({state:'visible'});
  const code=await host.locator('#room-code').innerText();
  await page.goto(origin+'/joueur?code='+code);await page.locator('#name').fill('Pixel Cache');await page.locator('#name').press('Enter');
  await host.waitForFunction(()=>document.getElementById('participant-count').textContent==='(1)');await host.locator('#start').click();
  const answer=async choice=>{const radio=page.getByRole('radio',{name:choice,exact:true});await radio.focus();await radio.press('Space');assert.equal(await radio.isChecked(),true);
    await page.locator('#submit-answer').press('Enter');await page.waitForFunction(()=>document.getElementById('receipt').textContent==='Réponse confirmée et enregistrée.');};
  await answer('Mars');await page.reload();await page.waitForFunction(()=>document.getElementById('receipt').textContent==='Réponse confirmée et enregistrée.');
  checks.push('Réponse confirmée retrouvée après rechargement avec hôte actif');
  await stop();await chrome(page);await page.reload();await ready();
  await page.waitForFunction(()=>document.getElementById('host-status').textContent.includes('déconnecté'));
  assert.equal(await page.locator('#game').isHidden(),true);assert.equal(await page.locator('#receipt').innerText(),'');
  checks.push('Hôte réellement arrêté : page joueur rechargeable, cache prêt, aucune confirmation reconstruite');
  await start();await chrome(page);
  await page.waitForFunction(()=>document.getElementById('phase-title').textContent==='On fait une pause.',null,{timeout:20000});
  assert.equal(await page.getByRole('radio',{name:'Mars',exact:true}).isChecked(),true);
  assert.equal(await page.locator('#receipt').innerText(),'Réponse confirmée et enregistrée.');
  checks.push('Retour de l’hôte : question en pause et réponse confirmée retrouvées');
  for(const [number,choice] of [[1,null],[2,'Pacifique'],[3,'Six']]){
    if(choice){await host.locator('#next').click();await page.waitForFunction(n=>document.getElementById('question-number').textContent===`Question ${n} / 3`,number);await answer(choice);}
    await host.waitForFunction(()=>document.getElementById('answer-count').textContent==='1 / 1 réponses confirmées');
    await host.locator('#reveal').click();await page.locator('#results').waitFor({state:'visible'});
    assert.match(await page.locator('#ranking').innerText(),new RegExp(`${number}[\\s\\u202f\\u00a0]?000`));
  }
  checks.push('Fin du quiz après reprise : 3 000 points, sans double comptage');

  await page.evaluate(async name=>(await caches.open(name)).delete('/connection.json'),cacheName);
  await page.locator('#check-offline').press('Enter');
  await page.waitForFunction(async name=>Boolean(await (await caches.open(name)).match('/connection.json')),cacheName);await ready();
  checks.push('Seule entrée de configuration supprimée du cache Kuikuiz puis réparée explicitement');

  await stop();await chrome(page);
  await page.goto(origin+'/animateur');await ready();await page.locator('#create').press('Enter');
  await page.locator('#error').waitFor({state:'visible'});assert.match(await page.locator('#error').innerText(),/Impossible de créer/);
  await page.goto(origin+'/');await ready();assert.equal(await page.locator('#welcome').isVisible(),true);
  await page.goto(origin+'/joueur?code=ABCDEF12');await ready();assert.equal(await page.locator('#code').inputValue(),'ABCDEF12');
  checks.push('Accueil, animateur et joueur rechargeables sans hôte ; création refusée et paramètre de code conservé');
  await page.close();page=await context.newPage();await page.bringToFront();await page.goto(origin+'/');await ready();
  checks.push('Onglet de test fermé puis rouvert : interface encore disponible sans serveur ; autres onglets conservés');
  const userAgent=await page.evaluate(()=>navigator.userAgent);
  await mkdir('artifacts/mock-preview',{recursive:true});await page.screenshot({path:'artifacts/mock-preview/pixel-cache-sans-hote.png',fullPage:true});
  report={date:new Date().toISOString(),result:'PASS',origin,apkVersion:version,userAgent,cacheName,entries,checks,score:3000,
    inputMethod:'Clavier CDP ; gestes tactiles manuels à valider séparément',
    network:process.env.KUIKUIZ_NETWORK_LABEL||'Wi-Fi habituel avec Internet disponible ; arrêt du seul hôte',
    limits:['La disponibilité Internet doit être relevée séparément ; ce test arrête le seul hôte','Même Pixel hôte et client, pas de deuxième téléphone',
      'Fermeture du seul onglet de test, pas arrêt forcé de Chrome','Exception TLS limitée au contexte PC automatisé ; aucune désactivation TLS sur le Pixel','Pas de validation iOS/Firefox, installation PWA ou point d’accès WSS hors Internet']};
}catch(error){report={...report,date:new Date().toISOString(),error:error.message};process.exitCode=1;}
finally{
  if(local)await local.close();
  if(stopped)try{await start();if(page&&!page.isClosed())await chrome(page);}catch(error){report.result='FAIL';report.restoreError=error.message;process.exitCode=1;}
  await mkdir('artifacts/mock-preview',{recursive:true});await writeFile('artifacts/mock-preview/pixel-cache-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}
process.exit(process.exitCode||0);
