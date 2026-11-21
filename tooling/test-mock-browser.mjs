import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { mkdtemp,rm,mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join,resolve } from 'node:path';
import { once } from 'node:events';
import { buildEngine } from './engine-build.mjs';
import { createMockServer } from '../apps/server-node/mock-server.mjs';

await buildEngine();
const directory=await mkdtemp(join(tmpdir(),'kuikuiz-browser-'));
const app=await createMockServer({filename:join(directory,'game.sqlite')});
let browser;
try{
  app.server.listen(0,'127.0.0.1');await once(app.server,'listening');
  const origin=`http://127.0.0.1:${app.server.address().port}`;
  browser=await chromium.launch({executablePath:process.env.KUIKUIZ_CHROME||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',headless:true});
  const hostContext=await browser.newContext({viewport:{width:1280,height:900}});
  const playerContext=await browser.newContext({viewport:{width:390,height:844}});
  const otherContext=await browser.newContext({viewport:{width:900,height:800}});
  const host=await hostContext.newPage(),player=await playerContext.newPage(),other=await otherContext.newPage();
  const errors=[];for(const page of [host,player,other])page.on('pageerror',e=>errors.push(e.message));
  await host.goto(origin+'/animateur');await host.getByRole('button',{name:'Créer une partie',exact:true}).click();
  await host.locator('#room-code').waitFor({state:'visible'});const code=await host.locator('#room-code').innerText();
  for(const [page,name] of [[player,'Camille'],[other,'Alex']]){
    await page.goto(origin+'/joueur');await page.locator('#code').fill(code);await page.locator('#name').fill(name);
    await page.getByRole('button',{name:'Rejoindre la salle'}).click();await page.locator('#room-code').waitFor({state:'visible'});
  }
  await host.waitForFunction(()=>document.getElementById('participant-count').textContent==='(2)');
  await host.getByRole('button',{name:'Lancer la question'}).click();
  await player.locator('#question-title').waitFor({state:'visible'});
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
  await player.reload();await player.waitForFunction(()=>document.getElementById('receipt').textContent==='Réponse confirmée et enregistrée.');
  assert.equal(await player.getByRole('radio',{name:'Mars',exact:true}).isChecked(),true);
  assert.equal(await player.getByRole('radio',{name:'Mars',exact:true}).isDisabled(),true);
  await other.getByRole('radio',{name:'Vénus',exact:true}).check();await other.getByRole('button',{name:'Confirmer ma réponse'}).click();
  await host.waitForFunction(()=>document.getElementById('answer-count').textContent==='2 / 2 réponses confirmées');
  await host.getByRole('button',{name:'Révéler les résultats'}).click();await player.locator('#results').waitFor({state:'visible'});
  assert.equal(await player.locator('#ranking tr').count(),2);
  assert.match(await player.locator('#ranking tr').first().innerText(),/Camille/);
  assert.match(await player.locator('#correction').innerText(),/Mars/);
  assert.equal(await player.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await player.screenshot({path:'artifacts/mock-preview/joueur-resultats.png',fullPage:true});
  await host.getByRole('button',{name:'Créer une nouvelle partie'}).click();
  await host.getByRole('button',{name:'Créer une partie',exact:true}).click();
  await host.locator('#room-code').waitFor({state:'visible'});const nextCode=await host.locator('#room-code').innerText();
  assert.notEqual(nextCode,code);
  await player.goto(origin+'/joueur?code='+nextCode);
  await player.locator('#join-form').waitFor({state:'visible'});
  await player.locator('#name').fill('Camille');await player.getByRole('button',{name:'Rejoindre la salle'}).click();
  await player.locator('#room-code').waitFor({state:'visible'});assert.equal(await player.locator('#room-code').innerText(),nextCode);
  assert.deepEqual(errors,[]);
  console.log('PASS : deux joueurs, pause/reprise, réponses confirmées, rechargement, correction et classement. Captures dans artifacts/mock-preview.');
}finally{
  if(browser)await browser.close();await app.stop();
  const path=resolve(directory);assert.ok(path.startsWith(resolve(tmpdir())+'\\kuikuiz-browser-')||path.startsWith(resolve(tmpdir())+'/kuikuiz-browser-'));
  await rm(directory,{recursive:true,force:true});
}
