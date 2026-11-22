import {spawn} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const secure=process.argv.includes('--https');
if(process.argv.slice(2).some(arg=>arg!=='--https'))throw new Error('Seule option autorisée : --https');
const output=new URL(`../artifacts/mock-preview/offline-quiz${secure?'-tls':''}-report.json`,import.meta.url);
await mkdir(new URL('../artifacts/mock-preview/',import.meta.url),{recursive:true});
function run(executable,args,env=process.env){return new Promise((resolve,reject)=>{
  const child=spawn(executable,args,{cwd:root,env,windowsHide:true});let stdout='',stderr='';
  child.stdout.on('data',data=>stdout+=data);child.stderr.on('data',data=>stderr+=data);
  child.on('error',reject);child.on('exit',code=>resolve({code,stdout,stderr}));
});}
const node=script=>run(process.execPath,[script]);
const status=async()=>{
  const result=await run('powershell.exe',['-NoProfile','-Command',
    "[PSCustomObject]@{ethernet=(Get-NetAdapter -Name Ethernet).Status.ToString();wifiGateway=(Get-NetRoute -AddressFamily IPv4 -DestinationPrefix '0.0.0.0/0' -InterfaceAlias 'Wi-Fi' | Select-Object -First 1).NextHop} | ConvertTo-Json -Compress"]);
  if(result.code!==0)throw new Error(result.stderr);return JSON.parse(result.stdout.trim());
};
const report={startedAt:new Date().toISOString(),result:'WAITING',note:'Attente Ethernet déconnecté et destinations publiques injoignables ; aucun changement de configuration réseau par ce script.'};
await writeFile(output,JSON.stringify(report,null,2));
console.log('READY : attente de la coupure Ethernet, délai maximal 10 minutes. Le test tourne localement, sans API ni accès Internet.');
try{
  const deadline=Date.now()+600000;let network;
  while(Date.now()<deadline){
    network=await status();
    if(network.ethernet!=='Up'&&network.wifiGateway){
      const check=await node('tooling/check-offline-network.mjs');
      if(check.code===0)break;
    }
    await new Promise(resolve=>setTimeout(resolve,2000));network=null;
  }
  if(!network)throw new Error('Isolement non observé dans les 10 minutes ; aucun succès hors Internet annoncé.');
  report.network=network;report.isolatedAt=new Date().toISOString();
  report.before=JSON.parse(await readFile(new URL('../artifacts/mock-preview/pc-network-check.json',import.meta.url),'utf8'));
  report.origin=`${secure?'https':'http'}://${network.wifiGateway}:${secure?8443:8080}`;
  const env={...process.env,KUIKUIZ_ORIGIN:report.origin,...(secure?{KUIKUIZ_HOST_KIND:'android-hotspot-tls',KUIKUIZ_LAB_IGNORE_HTTPS_ERRORS:'1'}:{})};
  if(secure){
    report.tls=await run(process.execPath,['tooling/test-android-tls.mjs'],env);
    if(report.tls.code!==0)throw new Error('Vérification stricte TLS/WSS échouée : '+report.tls.stderr);
    report.browserTlsScope='Contextes Playwright PC avec exception TLS locale ; clients Node stricts avec autorité explicite, aucune confiance Windows modifiée';
  }
  report.protocol=await run(process.execPath,['tooling/test-live-quiz.mjs'],env);
  if(report.protocol.code!==0)throw new Error('Parcours réseau échoué : '+report.protocol.stderr);
  report.browser=await run(process.execPath,['tooling/test-mock-browser.mjs'],env);
  if(report.browser.code!==0)throw new Error('Parcours navigateur échoué : '+report.browser.stderr);
  const after=await node('tooling/check-offline-network.mjs');
  report.after=JSON.parse(await readFile(new URL('../artifacts/mock-preview/pc-network-check.json',import.meta.url),'utf8'));
  report.networkAfter=await status();
  if(after.code!==0||report.networkAfter.ethernet==='Up')throw new Error('Accès Internet ou Ethernet rétabli avant la fin ; essai à refaire.');
  report.result='PASS';report.finishedAt=new Date().toISOString();
}catch(error){report.result='FAIL';report.error=error.message;report.finishedAt=new Date().toISOString();process.exitCode=1;}
await writeFile(output,JSON.stringify(report,null,2));
console.log(JSON.stringify(report));
