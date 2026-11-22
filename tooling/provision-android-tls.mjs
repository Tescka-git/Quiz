import {spawn} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {createHash,randomBytes,X509Certificate} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {hotspotPlan} from './prepare-hotspot-tls.mjs';
const adb=process.env.KUIKUIZ_ADB,device=process.env.KUIKUIZ_DEVICE;
if(!adb||!device)throw new Error('Définir KUIKUIZ_ADB et KUIKUIZ_DEVICE. Utilise uniquement le certificat de test existant.');
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const args=process.argv.slice(2);let hotspot,replace=false,restore=false;
for(let i=0;i<args.length;i++){
  if(args[i]==='--hotspot'){hotspot=args[++i];if(!hotspot)throw new Error('Adresse requise après --hotspot.');}
  else if(args[i]==='--replace-certificate')replace=true;
  else if(args[i]==='--restore-wifi')restore=true;
  else throw new Error('Argument de préparation TLS inconnu.');
}
if((replace||restore)&&!hotspot)throw new Error('Remplacement ou restauration exige --hotspot IP et un profil vérifié.');
if(restore&&!replace)throw new Error('Restauration exige --replace-certificate explicite.');
const base=fileURLToPath(new URL('../.tools/tls/',import.meta.url));let source=base,expectedInstalled;
if(hotspot){
  const rootInfo=JSON.parse(await readFile(join(base,'info.json'),'utf8'));
  const plan=hotspotPlan(rootInfo.androidIp,hotspot);
  const info=JSON.parse(await readFile(join(plan.directory,'info.json'),'utf8'));
  if(info.wifiIp!==rootInfo.androidIp||info.hotspotIp!==hotspot)throw new Error('Profil ne correspondant pas aux adresses demandées.');
  source=restore?base:plan.directory;expectedInstalled=restore?info.pfxSha256:info.expectedInstalledSha256;
  const expectedSource=restore?info.expectedInstalledSha256:info.pfxSha256;
  if(digest(await readFile(join(source,'android.p12')))!==expectedSource)throw new Error('Conteneur différent du profil validé.');
  const ca=new X509Certificate(await readFile(join(base,'ca.pem'))),leaf=new X509Certificate(await readFile(join(source,'android.pem')));
  if(ca.fingerprint256!==info.caFingerprint256||!leaf.verify(ca.publicKey)||leaf.checkIP(info.wifiIp)!==info.wifiIp||(!restore&&leaf.checkIP(hotspot)!==hotspot))throw new Error('Signature ou adresses du profil invalides.');
  if(digest(await readFile(join(source,'password.txt')))!==digest(await readFile(join(base,'password.txt'))))throw new Error('Changement de mot de passe interdit dans ce remplacement de certificat.');
}
function call(args,input){return new Promise((resolve,reject)=>{
  const child=spawn(adb,['-s',device,...args],{windowsHide:true});const chunks=[];let stderr='';
  child.stdout.on('data',chunk=>chunks.push(chunk));child.stderr.on('data',chunk=>stderr+=chunk);
  child.on('error',reject);child.stdin.on('error',()=>{});
  child.on('close',code=>resolve({code,bytes:Buffer.concat(chunks),stderr}));child.stdin.end(input);
});}
async function checked(args,input){const result=await call(args,input);if(result.code!==0)throw new Error('Échec ADB pendant la préparation privée TLS. Aucun secret affiché.');return result;}
await checked(['shell','run-as','fr.kuikuiz.probe','mkdir','-p','files/tls']);
await checked(['shell','run-as','fr.kuikuiz.probe','chmod','700','files/tls']);
// adb push transporte les octets sans le mode texte du stdin Windows.
// Le répertoire temporaire shell est 0700 ; le transfert vers run-as reste sur Android.
// Aucune clé de l'autorité, aucun fichier Download, aucun secret dans les arguments.
const staging='/data/local/tmp/kuikuiz-tls-'+randomBytes(12).toString('hex');
await checked(['shell','mkdir',staging]);await checked(['shell','chmod','700',staging]);
async function remoteHash(path){const result=await checked(['shell','run-as','fr.kuikuiz.probe','sha256sum',path]);
  const hash=result.bytes.toString('utf8').match(/^[a-f0-9]{64}/);if(!hash)throw new Error('Empreinte privée illisible.');return hash[0];}
try { for(const name of ['android.p12','password.txt']){
  const bytes=await readFile(join(source,name));let previous;
  const exists=await call(['shell','run-as','fr.kuikuiz.probe','test','-e','files/tls/'+name]);
  if(exists.code===0){
    previous=await remoteHash('files/tls/'+name);
    if(previous===digest(bytes))continue;
    if(name!=='android.p12'||!replace||previous!==expectedInstalled)throw new Error('Fichier TLS privé déjà présent et différent : remplacement refusé.');
    await checked(['shell','run-as','fr.kuikuiz.probe','mkdir','-p','files/tls/backups']);
    await checked(['shell','run-as','fr.kuikuiz.probe','chmod','700','files/tls/backups']);
    const backup='files/tls/backups/'+previous+'.p12';
    const backupExists=await call(['shell','run-as','fr.kuikuiz.probe','test','-e',backup]);
    if(backupExists.code===1)await checked(['shell','run-as','fr.kuikuiz.probe','cp','files/tls/android.p12',backup]);
    else if(backupExists.code!==0)throw new Error('Impossible de vérifier la sauvegarde privée.');
    if(await remoteHash(backup)!==previous)throw new Error('Sauvegarde privée non identique : remplacement refusé.');
    await checked(['shell','run-as','fr.kuikuiz.probe','chmod','600',backup]);
  }
  if(exists.code!==0&&exists.code!==1)throw new Error('Impossible de vérifier les fichiers TLS privés.');
  await checked(['push',join(source,name),staging+'/'+name]);
  await checked(['shell',`cat ${staging}/${name} | run-as fr.kuikuiz.probe sh -c 'umask 077; cat > files/tls/${name}.pending'`]);
  if(await remoteHash('files/tls/'+name+'.pending')!==digest(bytes))throw new Error('Copie TLS non identique : fichier final non installé.');
  if(previous&&await remoteHash('files/tls/'+name)!==previous)throw new Error('Le fichier privé a changé pendant la préparation : remplacement refusé.');
  await checked(['shell','run-as','fr.kuikuiz.probe','mv','files/tls/'+name+'.pending','files/tls/'+name]);
}} finally {
  // Seulement les deux fichiers de ce répertoire aléatoire créé ci-dessus.
  await checked(['shell','rm','-f',staging+'/android.p12',staging+'/password.txt']);
  await checked(['shell','rmdir',staging]);
}
console.log('Certificat serveur Android et mot de passe existants vérifiés dans les fichiers privés. Aucun secret dans l’APK ; aucune confiance système modifiée.');
