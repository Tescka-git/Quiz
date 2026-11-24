import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const origin=process.env.KUIKUIZ_LAYOUT_ORIGIN||'http://localhost:4181';
const browser=await chromium.launch({executablePath:process.env.KUIKUIZ_CHROME||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',headless:true});
const checks=[];await mkdir('artifacts/layout',{recursive:true});
try{
  const context=await browser.newContext({viewport:{width:1440,height:1050}}),page=await context.newPage();
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  const violations=[];await page.addInitScript(()=>{window.cspErrors=[];document.addEventListener('securitypolicyviolation',e=>window.cspErrors.push(e.violatedDirective));});
  await page.goto(origin);
  assert.equal(await page.getByText('On vous attend',{exact:true}).count(),0);
  await page.getByRole('button',{name:'PC',exact:true}).click();
  await page.locator('#scene-picker').selectOption('open');
  await page.screenshot({animations:'disabled',path:'artifacts/layout/animateur-pc.png',fullPage:true});
  await page.getByRole('button',{name:'Joueur',exact:true}).click();
  assert.equal(await page.locator('#room-panel').isHidden(),true);
  await page.getByRole('button',{name:'Téléphone',exact:true}).click();
  await page.locator('[data-choice="0"]').click();
  await page.waitForFunction(()=>document.getElementById('play').textContent.includes('Réponse enregistrée'));
  assert.equal(await page.getByRole('button',{name:'Valider ma réponse'}).count(),0);
  assert.equal(await page.locator('[data-choice="1"]').isDisabled(),true);
  assert.equal(await page.locator('.receipt').evaluate(el=>el.getBoundingClientRect().height),1);
  assert.equal(await page.locator('#play .question-kind').innerText(),'Réponse envoyée');
  assert.equal(await page.locator('[data-choice="0"]').evaluate(el=>getComputedStyle(el).borderTopColor),'rgb(53, 118, 208)');
  assert.equal(await page.locator('[data-choice="0"] .choice-letter').evaluate(el=>getComputedStyle(el).color),'rgb(23, 63, 119)');
  assert.equal(await page.locator('.choice.correct').count(),0);
  checks.push('Choix unique : envoi au toucher et verrouillage ; pas de participants joueur');
  await page.screenshot({animations:'disabled',path:'artifacts/layout/joueur-telephone.png',fullPage:true});
  await page.locator('#scene-picker').selectOption('reveal');
  await page.locator('.feedback').waitFor({state:'visible'});
  assert.match(await page.locator('.feedback').innerText(),/Bien joué/);
  assert.doesNotMatch(await page.locator('.feedback').innerText(),/bonne réponse|Mars/i);
  assert.equal(await page.locator('.rank-row').count(),0);
  assert.equal(await page.locator('[data-choice="0"] .choice-letter').evaluate(el=>getComputedStyle(el).color),'rgb(11, 105, 71)');
  await page.screenshot({animations:'disabled',path:'artifacts/layout/joueur-revelation.png',fullPage:true});
  await page.waitForFunction(()=>document.querySelectorAll('.rank-row').length===4);
  assert.equal(await page.locator('.feedback').count(),0);
  assert.equal(await page.locator('#play .correction').count(),0);
  assert.equal(await page.locator('#play .receipt').count(),0);
  assert.equal(await page.locator('.question').isVisible(),true);
  checks.push('Correction personnelle puis classement différé ; question conservée');
  await page.locator('#scene-picker').selectOption('open');await page.locator('[data-choice="1"]').click();
  await page.waitForFunction(()=>document.querySelector('.receipt')?.textContent.includes('Réponse enregistrée'));
  await page.locator('#scene-picker').selectOption('reveal');
  assert.match(await page.locator('.feedback').innerText(),/Dommage/);
  assert.doesNotMatch(await page.locator('.feedback').innerText(),/Mars|bonne réponse/i);
  assert.match(await page.locator('.choice.correct').innerText(),/Mars/);
  assert.equal(await page.locator('[data-choice="1"] .choice-letter').evaluate(el=>getComputedStyle(el).color),'rgb(23, 63, 119)');
  assert.equal(await page.locator('[data-choice="1"] .choice-mark').innerText(),'✕');
  checks.push('Sélection en bleu sans présumer de la justesse ; vert réservé à la correction');
  await page.locator('#scene-picker').selectOption('ranking');
  assert.equal(await page.locator('#play .correction').count(),0);
  checks.push('QCM : choix verrouillé sans reçu visuel persistant ; correction en vert sans texte répété');
  await page.locator('#type-picker').selectOption('multi');
  await page.locator('[data-choice="0"]').click();await page.locator('[data-choice="1"]').click();
  assert.equal((await page.locator('.receipt').innerText()).trim(),'');
  await page.getByRole('button',{name:'Valider ma réponse'}).click();
  await page.waitForFunction(()=>document.querySelector('.receipt')?.textContent.includes('Réponse enregistrée'));
  await page.locator('#type-picker').selectOption('text');
  await page.locator('#free-answer').fill('Lisbonne');await page.getByRole('button',{name:'Valider ma réponse'}).click();
  await page.waitForFunction(()=>document.querySelector('.receipt')?.textContent.includes('Réponse enregistrée'));
  checks.push('QCM multiple et texte : validation explicite conservée');
  await page.locator('#type-picker').selectOption('single');await page.locator('[data-choice="0"]').click();
  await page.locator('#network-picker').selectOption('disconnected');
  await page.waitForFunction(()=>document.querySelector('.receipt')?.textContent.includes('Confirmation non reçue'));
  assert.equal(await page.locator('#play .question-kind').innerText(),'Réponse non confirmée');
  await page.locator('#network-picker').selectOption('connected');
  assert.equal(await page.locator('[data-choice="1"]').isDisabled(),true);
  await page.getByRole('button',{name:'Renvoyer la même réponse'}).click();
  await page.waitForFunction(()=>document.querySelector('.receipt')?.textContent.includes('Réponse enregistrée'));
  checks.push('Coupure simulée : aucun faux reçu et renvoi explicite du même choix');
  await page.getByRole('button',{name:'Animateur',exact:true}).click();await page.locator('#scene-picker').selectOption('paused');
  assert.equal(await page.getByText('Jeu en pause',{exact:false}).count(),1);
  await page.locator('#ties').check();await page.locator('#scene-picker').selectOption('podium');
  await page.waitForFunction(()=>document.querySelector('[data-place="3"]').classList.contains('revealed'));
  assert.equal(await page.locator('[data-place="1"]').getAttribute('aria-hidden'),'true');
  await page.waitForFunction(()=>document.querySelector('[data-place="1"]').classList.contains('revealed'));
  assert.match(await page.locator('[data-place="2"]').innerText(),/Alex[\s\S]*Noa/);
  assert.match(await page.locator('[data-place="3"]').innerText(),/Pas de 3e place/);
  await page.screenshot({animations:'disabled',path:'artifacts/layout/podium-ex-aequo.png',fullPage:true});
  await page.getByRole('button',{name:'Voir le classement complet'}).click();
  assert.deepEqual(await page.locator('.rank-number').allTextContents(),['1','2','2','4']);
  checks.push('Podium 3 → 2 → 1, ex æquo 1/2/2/4, classement final');
  for(const viewport of [{width:390,height:844},{width:320,height:640}]){
    await page.setViewportSize(viewport);await page.getByRole('button',{name:'Joueur',exact:true}).click();await page.locator('#scene-picker').selectOption('open');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.getByRole('button',{name:'Classement',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('[data-panel="ranking-panel"]').getAttribute('aria-current')==='true');
    await page.locator('#scene-picker').selectOption('reveal');
    await page.locator('.feedback').waitFor({state:'visible'});
    await page.waitForFunction(()=>{
      const feedback=document.querySelector('.feedback'),rect=feedback.getBoundingClientRect();
      return document.elementFromPoint(rect.x+rect.width/2,rect.y+rect.height/2)?.closest('.feedback')===feedback;
    });
  }
  checks.push('Téléphones 390 et 320 px : aucun débordement horizontal, panneaux navigables');
  for(const viewport of [{width:390,height:844},{width:320,height:640}]){
    await page.setViewportSize(viewport);
    await page.getByRole('button',{name:'Animateur',exact:true}).click();
    await page.locator('#scene-picker').selectOption('lobby');
    assert.equal(await page.locator('.qr-placeholder').count(),1);
    assert.match(await page.locator('.qr-placeholder').getAttribute('aria-label'),/non scannable/);
    await page.locator('#type-picker').selectOption('single');
    await page.waitForFunction(()=>document.getElementById('panels').scrollTop<1);
    assert.ok(await page.locator('#play').evaluate(el=>el.scrollHeight<=el.clientHeight+1),'Le QCM exemple doit tenir sans scroll');
    const reveal=page.locator('#host-dock [data-action="reveal"]');
    const questionBefore=await page.locator('.question').boundingBox(),timerBefore=await page.locator('.timer').boundingBox(),choiceBefore=await page.locator('#play .choice').first().boundingBox();
    await page.locator('#host-dock [data-action="pause"]').click();
    assert.equal(await page.locator('.question-meta .pause-label').isVisible(),true);
    assert.equal((await page.locator('.question').boundingBox()).y,questionBefore.y);
    assert.equal((await page.locator('#play .choice').first().boundingBox()).y,choiceBefore.y);
    assert.equal((await page.locator('.timer').boundingBox()).x,timerBefore.x);
    assert.equal((await page.locator('.timer').boundingBox()).y,timerBefore.y);
    await page.locator('#host-dock [data-action="resume"]').click();
    const bounds=await reveal.boundingBox();assert.ok(bounds.y+bounds.height<=viewport.height);
    await page.waitForFunction(()=>{const button=document.querySelector('#host-dock [data-action="reveal"]'),r=button.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('button')===button;});
    await page.screenshot({animations:'disabled',path:`artifacts/layout/host-compact-${viewport.width}.png`,fullPage:true});
    await page.locator('.question').evaluate(el=>el.textContent='Une question volontairement très longue pour éprouver le défilement et la disponibilité des commandes. '.repeat(12));
    await page.locator('#play').evaluate(el=>el.scrollTop=el.scrollHeight);
    assert.equal((await reveal.boundingBox()).y,bounds.y,'Les commandes ne doivent pas défiler avec la question');
    await page.locator('#host-dock [data-action="pause"]').click();
    await page.locator('#host-dock [data-action="resume"]').waitFor({state:'visible'});
  }
  checks.push('QR réservé ; QCM sans scroll à 390/320 px ; commandes fixes même avec une question longue');
  checks.push('Pause près du chronomètre : positions de la question, des réponses et du temps inchangées');
  for(const viewport of [{width:390,height:844},{width:320,height:640}]){
    await page.setViewportSize(viewport);await page.locator('#reset').click();
    await page.locator('#scene-picker').selectOption('ranking');
    await page.waitForFunction(()=>{const panel=document.getElementById('ranking-panel'),root=document.getElementById('panels');return Math.abs(root.scrollTop-(panel.offsetTop-document.getElementById('play-panel').offsetTop))<1;});
    const next=page.locator('#ranking-dock [data-action="next"]');
    const initial=await next.boundingBox();assert.ok(initial.y+initial.height<=viewport.height);
    await page.locator('.ranking-list').evaluate(list=>{const row=list.firstElementChild;for(let i=0;i<30;i++)list.append(row.cloneNode(true));});
    await page.locator('#ranking-scroll').evaluate(el=>el.scrollTop=el.scrollHeight);
    assert.equal((await next.boundingBox()).y,initial.y);
    await page.waitForFunction(()=>{const button=document.querySelector('#ranking-dock button'),r=button.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('button')===button;});
    await next.click();assert.match(await page.locator('.question-number').innerText(),/Question 2/);
    await page.locator('#scene-picker').selectOption('ranking');await page.locator('#ranking-dock [data-action="next"]').click();
    await page.locator('#scene-picker').selectOption('ranking');
    assert.equal(await page.locator('#ranking-dock button').innerText(),'Afficher le podium');
  }
  checks.push('Classement long : action suivante fixe et cliquable, puis accès au podium, à 390/320 px');
  await page.setViewportSize({width:390,height:844});await page.locator('#reset').click();
  await page.locator('#scene-picker').selectOption('open');
  await page.waitForFunction(()=>document.getElementById('panels').scrollTop<1);
  await page.locator('#host-dock [data-action="reveal"]').click();
  assert.match(await page.locator('#play .choice.correct').innerText(),/Mars/);
  assert.equal(await page.locator('#play .reveal-flash').count(),1);
  await page.locator('#host-dock [data-action="show-ranking"]').waitFor({state:'visible'});
  assert.ok(await page.locator('#panels').evaluate(el=>el.scrollTop<1),'La révélation ne doit pas changer de panneau');
  await page.locator('#host-dock [data-action="show-ranking"]').click();
  await page.waitForFunction(()=>document.querySelector('[data-panel="ranking-panel"]').getAttribute('aria-current')==='true');
  checks.push('Révélation animateur : option correcte animée, classement ouvert seulement sur action');
  for(const viewport of [{width:390,height:844},{width:320,height:640}]){
    await page.setViewportSize(viewport);
    for(const role of ['host','player']){
      await page.locator(`button[data-role="${role}"]`).click();
      for(const kind of ['single','boolean','blind','multi','text']){
        await page.locator('#type-picker').selectOption(kind);
        assert.ok(await page.locator('#play').evaluate(el=>el.scrollHeight<=el.clientHeight+1),`${role}/${kind} doit tenir sur ${viewport.width}px`);
      }
    }
  }
  // Le choix PC sur un navigateur étroit doit garder la disposition téléphone.
  await page.getByRole('button',{name:'PC',exact:true}).click();
  assert.equal(await page.locator('#device').evaluate(el=>el.classList.contains('compact')),true);
  assert.ok(await page.locator('#play').evaluate(el=>el.scrollHeight<=el.clientHeight+1));
  checks.push('Tous les exemples sur une page : deux rôles, cinq types, 390/320 px et repli mobile');
  for(const viewport of [{width:390,height:844},{width:320,height:640}]){
    await page.setViewportSize(viewport);await page.getByRole('button',{name:'Téléphone',exact:true}).click();
    await page.locator('button[data-role="player"]').click();await page.locator('#type-picker').selectOption('multi');
    await page.waitForFunction(()=>document.getElementById('panels').scrollTop<1);
    const q=await page.locator('.question').boundingBox(),choice=await page.locator('[data-choice="0"]').boundingBox();
    const last=await page.locator('[data-choice="3"]').boundingBox(),submit=await page.locator('#play [data-action="submit"]').boundingBox();
    assert.equal(submit.y-(last.y+last.height),10);
    await page.locator('[data-choice="0"]').click();await page.locator('[data-choice="1"]').click();
    await page.locator('#play [data-action="submit"]').click();
    await page.waitForFunction(()=>document.querySelector('.receipt')?.textContent.includes('Réponse enregistrée'));
    assert.equal((await page.locator('.question').boundingBox()).y,q.y);
    assert.equal((await page.locator('[data-choice="0"]').boundingBox()).y,choice.y);
    await page.locator('#scene-picker').selectOption('reveal');
    assert.equal(await page.locator('.question-meta .question-kind').isVisible(),false);
    assert.equal((await page.locator('.question').boundingBox()).y,q.y);
    assert.equal((await page.locator('[data-choice="0"]').boundingBox()).y,choice.y);
  }
  checks.push('Consigne dans le bandeau : choix stables à l’envoi et à la révélation ; validation espacée de 10 px');
  for(const viewport of [{width:390,height:844},{width:320,height:640}]){
    await page.setViewportSize(viewport);await page.getByRole('button',{name:'Téléphone',exact:true}).click();
    for(const role of ['host','player']){
      await page.locator(`button[data-role="${role}"]`).click();
      await page.locator('#ties').uncheck();await page.locator('#scene-picker').selectOption('podium');
      assert.ok(await page.locator('#ranking-scroll').evaluate(el=>el.scrollHeight<=el.clientHeight+1));
      await page.waitForFunction(()=>document.querySelector('[data-place="1"]').classList.contains('revealed'));
      for(const tied of [false,true]){
        await page.locator('#ties').setChecked(tied);
        assert.ok(await page.locator('#ranking-scroll').evaluate(el=>el.scrollHeight<=el.clientHeight+1),`Podium ${role}/${viewport.width}/${tied} sans scroll`);
        const button=page.locator('#ranking-dock [data-action="full-ranking"]'),box=await button.boundingBox();
        assert.ok(box.y+box.height<=viewport.height);
        for(const place of [1,2,3]){
          const bounds=await page.locator(`[data-place="${place}"] .podium-block`).boundingBox();
          assert.ok(bounds.y+bounds.height<=box.y,'Les marches doivent rester au-dessus de l’action');
        }
      }
      await page.screenshot({animations:'disabled',path:`artifacts/layout/podium-${role}-${viewport.width}.png`,fullPage:true});
      await page.locator('#ranking-dock [data-action="full-ranking"]').click();
      assert.equal(await page.locator('.rank-row').count(),4);
    }
  }
  checks.push('Podium sans scroll sur 390/320 px : deux rôles, avec/sans ex æquo, action finale visible');
  await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.scene').first().evaluate(el=>getComputedStyle(el).scrollBehavior),'auto');
  violations.push(...await page.evaluate(()=>window.cspErrors));assert.deepEqual(violations,[]);assert.deepEqual(errors,[]);
  await writeFile('artifacts/layout/report.json',JSON.stringify({date:new Date().toISOString(),result:'PASS',checks,limits:'Simulation autonome ; aucune intégration moteur, présence réseau, stockage durable ou synchronisation réelle.'},null,2));
  console.log(JSON.stringify({result:'PASS',checks}));
}finally{await browser.close();}
