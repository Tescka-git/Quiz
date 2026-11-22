import {chromium} from 'playwright-core';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const execute=promisify(execFile);
const adb=process.env.KUIKUIZ_ADB;
const device=process.env.KUIKUIZ_DEVICE;
if(!adb||!device)throw new Error('Définir KUIKUIZ_ADB et KUIKUIZ_DEVICE explicitement. Ce test arrête de force uniquement fr.kuikuiz.probe.');
const shell=(...args)=>execute(adb,['-s',device,'shell',...args]);
await shell('pidof','fr.kuikuiz.probe'); // Vérifier ADB avant de créer la partie du test.
const origin=process.env.KUIKUIZ_ORIGIN||'http://192.168.1.21:8080';
const browser=await chromium.launch({executablePath:process.env.KUIKUIZ_CHROME||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',headless:true});
try{
  const host=await (await browser.newContext()).newPage(),player=await (await browser.newContext()).newPage();
  await host.goto(origin+'/animateur');await host.locator('#create').click();await host.locator('#room-code').waitFor({state:'visible'});
  const code=await host.locator('#room-code').innerText();await player.goto(origin+'/joueur?code='+code);await player.locator('#name').fill('Reprise Pixel');await player.locator('#join-form button').click();
  const waitingContext=await browser.newContext();
  const waiting=await waitingContext.newPage();await waiting.goto(origin+'/joueur?code='+code);
  await waiting.locator('#name').fill('Joueur en attente');await waiting.locator('#join-form button').click();
  await waiting.locator('#room-code').waitFor({state:'visible'});
  await host.waitForFunction(()=>document.getElementById('participant-count').textContent==='(2)');await host.locator('#start').click();
  for(const [number,choice] of [[1,'Mars'],[2,'Pacifique']]){
    await player.waitForFunction(n=>document.getElementById('question-number').textContent===`Question ${n} / 3`,number);
    await player.getByRole('radio',{name:choice,exact:true}).check();await player.locator('#submit-answer').click();
    await player.waitForFunction(()=>document.getElementById('receipt').textContent==='Réponse confirmée et enregistrée.');
    if(number===1){await host.locator('#reveal').click();await host.locator('#results').waitFor({state:'visible'});await host.locator('#next').click();}
  }
  const oldPid=(await shell('pidof','fr.kuikuiz.probe')).stdout.trim();
  await shell('am','force-stop','fr.kuikuiz.probe');
  await host.waitForFunction(()=>document.getElementById('connection').textContent.startsWith('Déconnecté'));
  await shell('am','start','-n','fr.kuikuiz.probe/.MainActivity');
  await shell('uiautomator','dump','/sdcard/kuikuiz-window.xml');
  const xml=(await shell('cat','/sdcard/kuikuiz-window.xml')).stdout;
  const button=xml.match(/<node[^>]*text="HÉBERGER LA MAQUETTE DE QUIZ"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
  if(!button)throw new Error('Commande de démarrage non trouvée ; aucun appui approximatif effectué.');
  await shell('input','tap',String(Math.round((+button[1]+ +button[3])/2)),String(Math.round((+button[2]+ +button[4])/2)));
  await player.waitForFunction(()=>document.getElementById('phase-title').textContent==='On fait une pause.',null,{timeout:45000});
  assert.equal(await player.getByRole('radio',{name:'Pacifique',exact:true}).isChecked(),true);
  assert.equal(await player.getByRole('radio',{name:'Pacifique',exact:true}).isDisabled(),true);
  assert.equal(await player.locator('#results').isHidden(),true);
  const newPid=(await shell('pidof','fr.kuikuiz.probe')).stdout.trim();assert.notEqual(newPid,oldPid);
  await host.locator('#reveal').click();await player.locator('#results').waitFor({state:'visible'});assert.match(await player.locator('#ranking').innerText(),/2[\s\u202f\u00a0]?000/);
  await host.locator('#next').click();await player.getByRole('radio',{name:'Six',exact:true}).check();await player.locator('#submit-answer').click();
  await host.waitForFunction(()=>document.getElementById('answer-count').textContent==='1 / 2 réponses confirmées');await host.locator('#reveal').click();
  await player.waitForFunction(()=>document.getElementById('phase-title').textContent==='La partie est terminée !');assert.match(await player.locator('#ranking').innerText(),/3[\s\u202f\u00a0]?000/);
  const report={date:new Date().toISOString(),origin,result:'PASS',oldPid,newPid,questionAtStop:2,score:3000,
    scenario:'Arrêt forcé après confirmation réseau, reprise gelée en question 2, score précédent et réponse retrouvés, fin de partie'};
  await mkdir('artifacts/mock-preview',{recursive:true});await writeFile('artifacts/mock-preview/android-quiz-recovery.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser.close();}
