import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { mkdtemp,rm,mkdir,writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join,resolve } from 'node:path';
import { once } from 'node:events';
import { buildEngine } from './engine-build.mjs';
import { createMockServer } from '../apps/server-node/mock-server.mjs';

await buildEngine();
let clockOffset=0;
const directory=await mkdtemp(join(tmpdir(),'kuikuiz-browser-'));
const app=process.env.KUIKUIZ_ORIGIN?null:await createMockServer({filename:join(directory,'game.sqlite'),clock:()=>performance.now()+clockOffset});
let browser;
try{
  if(app){app.server.listen(0,'127.0.0.1');await once(app.server,'listening');}
  const origin=process.env.KUIKUIZ_ORIGIN||`http://127.0.0.1:${app.server.address().port}`;
  const labTlsException=process.env.KUIKUIZ_LAB_IGNORE_HTTPS_ERRORS==='1';
  if(labTlsException&&!origin.startsWith('https:'))throw new Error('Exception de laboratoire réservée à une origine HTTPS explicite.');
  browser=await chromium.launch({executablePath:process.env.KUIKUIZ_CHROME||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',headless:true});
  const hostContext=await browser.newContext({viewport:{width:1280,height:900},ignoreHTTPSErrors:labTlsException});
  const playerContext=await browser.newContext({viewport:{width:390,height:844},ignoreHTTPSErrors:labTlsException});
  const otherContext=await browser.newContext({viewport:{width:900,height:800},ignoreHTTPSErrors:labTlsException});
  await playerContext.addInitScript(()=>{
    const NativeWebSocket=window.WebSocket;
    window.WebSocket=class extends NativeWebSocket {
      constructor(...args){super(...args);window.testSocket=this;}
    };
  });
  const host=await hostContext.newPage(),player=await playerContext.newPage(),other=await otherContext.newPage();
  const errors=[];for(const page of [host,player,other])page.on('pageerror',e=>errors.push(e.message));
  const outsideRequests=[];
  for(const context of [hostContext,playerContext,otherContext])context.on('request',request=>{
    if(!request.url().startsWith(origin+'/'))outsideRequests.push(request.url());
  });
  await host.goto(origin+'/animateur');await host.getByRole('button',{name:'Créer une partie',exact:true}).click();
  await host.locator('#room-code').waitFor({state:'visible'});const code=await host.locator('#room-code').innerText();
  for(const [page,name] of [[player,'Camille'],[other,'Alex']]){
    await page.goto(origin+'/joueur');await page.locator('#code').fill(code);await page.locator('#name').fill(name);
    await page.getByRole('button',{name:'Rejoindre la salle'}).click();await page.locator('#room-code').waitFor({state:'visible'});
  }
  await host.waitForFunction(()=>document.getElementById('participant-count').textContent==='(2)');
  await host.getByRole('button',{name:'Lancer la question'}).click();
  await player.locator('#question-title').waitFor({state:'visible'});
  assert.equal(await player.locator('#answer-count').isHidden(),true);
  assert.equal(await host.locator('#answer-count').isVisible(),true);
  assert.equal(await player.locator('#results').isHidden(),true);
  await host.getByRole('button',{name:'Mettre en pause'}).click();
  await player.waitForFunction(()=>document.getElementById('phase-title').textContent==='On fait une pause.');
  assert.equal(await player.getByRole('radio',{name:'Mars',exact:true}).isDisabled(),true);
  await host.getByRole('button',{name:'Reprendre',exact:true}).click();
  await player.waitForFunction(()=>document.getElementById('phase-title').textContent==='À vous de jouer !');
  await mkdir('artifacts/mock-preview',{recursive:true});
  await host.screenshot({path:'artifacts/mock-preview/animateur-question.png',fullPage:true});
  await player.getByRole('radio',{name:'Mars',exact:true}).check();await player.getByRole('button',{name:'Confirmer ma réponse'}).click();
  await player.waitForFunction(()=>document.getElementById('receipt').textContent==='Réponse confirmée et enregistrée.');
  assert.equal(await player.locator('#answer-wait').isVisible(),true);
  await player.reload();await player.waitForFunction(()=>document.getElementById('receipt').textContent==='Réponse confirmée et enregistrée.');
  assert.equal(await player.locator('#answer-count').isHidden(),true);
  assert.equal(await player.getByRole('radio',{name:'Mars',exact:true}).isChecked(),true);
  assert.equal(await player.getByRole('radio',{name:'Mars',exact:true}).isDisabled(),true);
  await other.getByRole('radio',{name:'Vénus',exact:true}).check();await other.getByRole('button',{name:'Confirmer ma réponse'}).click();
  await host.waitForFunction(()=>document.getElementById('answer-count').textContent==='2 / 2 réponses confirmées');
  await player.locator('#results').waitFor({state:'visible'});
  assert.equal(await player.locator('#ranking tr').count(),2);
  assert.match(await player.locator('#ranking tr').first().innerText(),/Camille/);
  assert.match(await player.locator('#correction').innerText(),/Mars/);
  assert.equal(await player.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await player.screenshot({path:'artifacts/mock-preview/joueur-resultats.png',fullPage:true});
  for(const [number,choice] of [[2,'Pacifique'],[3,'Six']]){
    await host.getByRole('button',{name:'Question suivante',exact:true}).click();
    await player.waitForFunction(n=>document.getElementById('question-number').textContent===`Question ${n} / 3`,number);
    assert.equal(await player.locator('#results').isHidden(),true);
    await player.getByRole('radio',{name:choice,exact:true}).check();
    await player.getByRole('button',{name:'Confirmer ma réponse'}).click();
    await host.waitForFunction(()=>document.getElementById('answer-count').textContent==='1 / 2 réponses confirmées');
    await host.getByRole('button',{name:'Révéler les résultats'}).click();
    await player.locator('#results').waitFor({state:'visible'});
    assert.match(await player.locator('#ranking tr').first().innerText(),new RegExp(`${number}[\\s\\u202f\\u00a0]?000`));
  }
  await player.waitForFunction(()=>document.getElementById('phase-title').textContent==='La partie est terminée !');
  // Garder le même écran : une alerte réseau doit disparaître après un état serveur frais.
  await playerContext.setOffline(true);
  await player.evaluate(()=>window.testSocket.close());
  await player.waitForFunction(()=>!document.getElementById('error').hidden);
  await playerContext.setOffline(false);
  await player.waitForFunction(()=>document.getElementById('host-status').textContent==='Connecté à la partie.'&&document.getElementById('error').hidden);
  assert.equal(await player.locator('#answer-count').isHidden(),true);
  assert.match(await player.locator('#ranking tr').first().innerText(),/3[\s\u202f\u00a0]?000/);
  // Une erreur métier ne doit pas disparaître au prochain simple rafraîchissement d'état.
  await player.evaluate(()=>window.testSocket.send(JSON.stringify({v:1,type:'start'})));
  await player.waitForFunction(()=>document.getElementById('error').textContent==='Cette action est réservée à l’animateur.');
  await player.evaluate(()=>new Promise(resolve=>{
    const ws=window.testSocket;
    const receive=event=>{if(JSON.parse(event.data).type==='state'){ws.removeEventListener('message',receive);resolve();}};
    ws.addEventListener('message',receive);ws.send(JSON.stringify({v:1,type:'sync'}));
  }));
  await player.waitForFunction(()=>document.getElementById('host-status').textContent==='Connecté à la partie.');
  assert.equal(await player.locator('#error').isVisible(),true);
  await player.reload();
  await player.waitForFunction(()=>document.getElementById('phase-title').textContent==='La partie est terminée !');
  assert.equal(await host.locator('#next').isHidden(),true);
  await player.screenshot({path:'artifacts/mock-preview/joueur-final.png',fullPage:true});
  await host.getByRole('button',{name:'Créer une nouvelle partie'}).click();
  await host.getByRole('button',{name:'Créer une partie',exact:true}).click();
  await host.locator('#room-code').waitFor({state:'visible'});const nextCode=await host.locator('#room-code').innerText();
  assert.notEqual(nextCode,code);
  await player.goto(origin+'/joueur?code='+nextCode);
  await player.locator('#join-form').waitFor({state:'visible'});
  await player.locator('#name').fill('Camille');await player.getByRole('button',{name:'Rejoindre la salle'}).click();
  await player.locator('#room-code').waitFor({state:'visible'});assert.equal(await player.locator('#room-code').innerText(),nextCode);
  // Quitter une question en pause pour une autre salle doit préserver l'ancienne.
  await host.locator('#start').click();
  await player.waitForFunction(()=>document.getElementById('phase-title').textContent==='À vous de jouer !');
  await player.getByRole('radio',{name:'Mars',exact:true}).check();await player.locator('#submit-answer').click();
  await player.locator('#results').waitFor({state:'visible'});
  await host.locator('#next').click();
  await host.locator('#pause').click();
  await player.waitForFunction(()=>document.getElementById('phase-title').textContent==='On fait une pause.');
  assert.equal(await player.locator('#new-room').isHidden(),true);
  await host.locator('#new-room').click();
  await host.locator('#create').click();await host.locator('#room-code').waitFor({state:'visible'});
  assert.notEqual(await host.locator('#room-code').innerText(),nextCode);
  await player.reload();
  await player.waitForFunction(()=>document.getElementById('phase-title').textContent==='On fait une pause.');
  assert.equal(await player.locator('#room-code').innerText(),nextCode);
  assert.equal(await player.locator('#question-number').innerText(),'Question 2 / 3');
  const thirdCode=await host.locator('#room-code').innerText();
  const savedAccess=await player.evaluate(()=>localStorage.getItem('kuikuiz.mock.player'));
  await player.locator('#forget').click();await player.locator('.player-entry').click();
  await player.locator('#join-form').waitFor({state:'visible'});
  assert.equal(await player.locator('#error').isHidden(),true);
  assert.equal(await player.evaluate(()=>localStorage.getItem('kuikuiz.mock.player')),savedAccess);
  await player.reload();await player.locator('#join-form').waitFor({state:'visible'});
  await player.locator('#code').fill(thirdCode);await player.locator('#name').fill('Camille');await player.locator('#join-form button').click();
  await player.locator('#room-code').waitFor({state:'visible'});
  assert.equal(new URL(player.url()).searchParams.has('new'),false);
  await player.reload();await player.locator('#room-code').waitFor({state:'visible'});
  assert.equal(await player.locator('#room-code').innerText(),thirdCode);
  await other.goto(origin+'/joueur?code='+thirdCode);await other.locator('#name').fill('Sans réponse');await other.locator('#join-form button').click();
  await host.waitForFunction(()=>document.getElementById('participant-count').textContent==='(2)');
  await host.locator('#start').click();await player.getByRole('radio',{name:'Mars',exact:true}).check();await player.locator('#submit-answer').click();
  await player.locator('#answer-wait').waitFor({state:'visible'});
  if(app)clockOffset+=31000;
  await player.locator('#results').waitFor({state:'visible',timeout:45000});
  assert.equal(await player.locator('#answer-wait').isHidden(),true);
  assert.match(await player.locator('#ranking tr').first().innerText(),/1[\s\u202f\u00a0]?000/);
  await player.evaluate(()=>localStorage.setItem('kuikuiz.mock.player',JSON.stringify({roomId:'inexistante',token:'ancien-acces',code:'00000000'})));
  await player.goto(origin+'/');await player.locator('.player-entry').click();
  await player.locator('#join-form').waitFor({state:'visible'});
  assert.equal(await player.locator('#error').isHidden(),true);
  assert.deepEqual(errors,[]);
  assert.deepEqual(outsideRequests,[]);
  await writeFile('artifacts/mock-preview/browser-report.json',JSON.stringify({date:new Date().toISOString(),origin,result:'PASS',
    scenario:'3 questions, 2 joueurs, pause/reprise, rechargement, cumul et nouvelle salle',score:3000,outsideRequests,
    tlsVerification:labTlsException?'Exception TLS limitée aux contextes Playwright PC ; ne valide pas la confiance normale du navigateur':'Vérifications normales du navigateur'},null,2));
  console.log('PASS : trois questions, score cumulé 3000 points, deux joueurs, pause/reprise, rechargement et nouvelle partie.');
}finally{
  if(browser)await browser.close();if(app)await app.stop();
  const path=resolve(directory);assert.ok(path.startsWith(resolve(tmpdir())+'\\kuikuiz-browser-')||path.startsWith(resolve(tmpdir())+'/kuikuiz-browser-'));
  await rm(directory,{recursive:true,force:true});
}
