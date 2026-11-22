import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';

const origin=process.env.KUIKUIZ_ORIGIN||'https://192.168.1.23:4180';
// CDP par le débogage autorisé. Le navigateur du téléphone reste ouvert à la sortie.
const pixel=await chromium.connectOverCDP('http://127.0.0.1:9222');
const context=pixel.contexts()[0];
const player=context.pages().find(page=>page.url().startsWith(origin+'/joueur'))||await context.newPage();
let local;
try{
  local=await chromium.launch({executablePath:process.env.KUIKUIZ_CHROME||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',headless:true});
  // Exception limitée au contexte de test PC, sans modification du magasin de confiance Windows.
  const host=await (await local.newContext({ignoreHTTPSErrors:true})).newPage();
  await host.goto(origin+'/animateur');await host.locator('#create').click();
  await host.locator('#room-code').waitFor({state:'visible'});const code=await host.locator('#room-code').innerText();
  await player.goto(origin+'/joueur?code='+code);
  await player.locator('#name').fill('Pixel 7');await player.locator('#name').press('Enter');
  await host.waitForFunction(()=>document.getElementById('participant-count').textContent==='(1)');
  await host.locator('#start').click();
  for(const [number,choice] of [[1,'Mars'],[2,'Pacifique'],[3,'Six']]){
    await player.waitForFunction(n=>document.getElementById('question-number').textContent===`Question ${n} / 3`,number);
    const radio=player.getByRole('radio',{name:choice,exact:true});
    await radio.focus();await radio.press('Space');assert.equal(await radio.isChecked(),true);
    await player.locator('#submit-answer').press('Enter');
    await player.waitForFunction(()=>document.getElementById('receipt').textContent==='Réponse confirmée et enregistrée.');
    await host.waitForFunction(()=>document.getElementById('answer-count').textContent==='1 / 1 réponses confirmées');
    await player.locator('#results').waitFor({state:'visible'});
    assert.match(await player.locator('#ranking').innerText(),new RegExp(`${number}[\\s\\u202f\\u00a0]?000`));
    if(number<3)await host.locator('#next').click();
  }
  await mkdir('artifacts/mock-preview',{recursive:true});
  await player.screenshot({path:'artifacts/mock-preview/pixel-joueur-final.png',fullPage:true});
  const report={date:new Date().toISOString(),origin,scenario:`Pixel joueur, hôte ${process.env.KUIKUIZ_HOST_KIND||'Node'}, trois questions`,
    secureContext:await player.evaluate(()=>isSecureContext),userAgent:await player.evaluate(()=>navigator.userAgent),
    score:3000,result:'PASS',inputMethod:'Clavier via CDP (Entrée et Espace), sans clic forcé ni soumission directe par JavaScript',
    notes:'PC de test : exception TLS dans le contexte Playwright seulement. Chrome Pixel : aucun contournement TLS par le script.'};
  await writeFile('artifacts/mock-preview/pixel-player-report.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify(report));
}finally{if(local)await local.close();}
process.exit(0);
