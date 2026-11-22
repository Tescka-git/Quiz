import {spawn} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {createHash,randomBytes} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const adb=process.env.KUIKUIZ_ADB,device=process.env.KUIKUIZ_DEVICE;
if(!adb||!device)throw new Error('Définir KUIKUIZ_ADB et KUIKUIZ_DEVICE. Utilise uniquement le certificat de test existant.');
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
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
  const bytes=await readFile(new URL('../.tools/tls/'+name,import.meta.url));
  const exists=await call(['shell','run-as','fr.kuikuiz.probe','test','-e','files/tls/'+name]);
  if(exists.code===0){
    if(await remoteHash('files/tls/'+name)!==digest(bytes))throw new Error('Fichier TLS privé déjà présent et différent : remplacement refusé.');continue;
  }
  if(exists.code!==1)throw new Error('Impossible de vérifier les fichiers TLS privés.');
  await checked(['push',fileURLToPath(new URL('../.tools/tls/'+name,import.meta.url)),staging+'/'+name]);
  await checked(['shell',`cat ${staging}/${name} | run-as fr.kuikuiz.probe sh -c 'umask 077; cat > files/tls/${name}.pending'`]);
  if(await remoteHash('files/tls/'+name+'.pending')!==digest(bytes))throw new Error('Copie TLS non identique : fichier final non installé.');
  await checked(['shell','run-as','fr.kuikuiz.probe','mv','files/tls/'+name+'.pending','files/tls/'+name]);
}} finally {
  // Seulement les deux fichiers de ce répertoire aléatoire créé ci-dessus.
  await checked(['shell','rm','-f',staging+'/android.p12',staging+'/password.txt']);
  await checked(['shell','rmdir',staging]);
}
console.log('Certificat serveur Android et mot de passe existants vérifiés dans les fichiers privés. Aucun secret dans l’APK ; aucune confiance système modifiée.');
