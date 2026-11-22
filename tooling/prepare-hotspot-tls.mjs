import {access,readFile,mkdir,writeFile,copyFile,readdir} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {isIP} from 'node:net';
import {createHash,X509Certificate} from 'node:crypto';
import {createSecureContext} from 'node:tls';
import {spawnSync} from 'node:child_process';
import {constants} from 'node:fs';

const root=fileURLToPath(new URL('../',import.meta.url));
export function hotspotPlan(wifiIp,hotspotIp){
  const privateIp=ip=>isIP(ip||'')===4&&(/^(10\.|192\.168\.)/.test(ip)||(/^172\.(\d+)\./.test(ip)&&+ip.split('.')[1]>=16&&+ip.split('.')[1]<=31));
  if(!privateIp(wifiIp)||!privateIp(hotspotIp)||wifiIp===hotspotIp)throw new Error('Deux adresses IPv4 privées distinctes requises : Wi-Fi et point d’accès.');
  return {wifiIp,hotspotIp,directory:join(root,'.tools','tls','profiles','hotspot-'+hotspotIp.replaceAll('.','-')),
    san:`ip:${wifiIp},ip:${hotspotIp}`};
}
export async function prepareHotspotTls(wifiIp,hotspotIp){
  const plan=hotspotPlan(wifiIp,hotspotIp),source=join(root,'.tools','tls');
  try{await access(plan.directory);throw new Error('Profil déjà présent : refus de remplacer un certificat.');}catch(error){if(error.code!=='ENOENT')throw error;}
  const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
  const original={};for(const name of ['ca.p12','android.p12','password.txt'])original[name]=hash(await readFile(join(source,name)));
  const ca=new X509Certificate(await readFile(join(source,'ca.pem'))),old=new X509Certificate(await readFile(join(source,'android.pem')));
  const now=Date.now();if(now<Date.parse(ca.validFrom)||now>=Date.parse(ca.validTo))throw new Error('Autorité de laboratoire hors période de validité.');
  if(!old.verify(ca.publicKey)||old.checkIP(wifiIp)!==wifiIp)throw new Error('Le certificat source ne correspond pas au Wi-Fi ou à l’autorité attendus.');
  const jdks=await readdir(join(root,'.tools','jdk17'));
  const keytool=join(root,'.tools','jdk17',jdks.find(name=>name.startsWith('jdk-'))||'', 'bin',process.platform==='win32'?'keytool.exe':'keytool');await access(keytool);
  const password=(await readFile(join(source,'password.txt'),'utf8')).trim();
  const env={...process.env,KUIKUIZ_TLS_PASSWORD:password};
  await mkdir(join(source,'profiles'),{recursive:true,mode:0o700});
  await mkdir(plan.directory,{mode:0o700});
  await copyFile(join(source,'android.p12'),join(plan.directory,'android.p12'),constants.COPYFILE_EXCL);
  await writeFile(join(plan.directory,'password.txt'),await readFile(join(source,'password.txt')),{mode:0o600,flag:'wx'});
  const run=args=>{const result=spawnSync(keytool,[...args,'-storepass:env','KUIKUIZ_TLS_PASSWORD'],{cwd:plan.directory,env,windowsHide:true});
    if(result.error||result.status!==0)throw new Error('Échec keytool ; profil incomplet conservé pour diagnostic, aucun secret affiché.');};
  run(['-certreq','-alias','server','-keystore','android.p12','-file','android.csr']);
  // Même clé serveur et même autorité ; nouvelle feuille uniquement dans une copie.
  run(['-gencert','-alias','ca','-keystore',join(source,'ca.p12'),'-infile','android.csr','-outfile','android.pem','-rfc',
    '-validity','30','-ext','bc:critical=ca:false','-ext','ku:critical=digitalSignature,keyEncipherment','-ext','eku=serverAuth','-ext','san='+plan.san]);
  run(['-importcert','-alias','server','-keystore','android.p12','-file','android.pem']);
  const leaf=new X509Certificate(await readFile(join(plan.directory,'android.pem')));
  if(!leaf.verify(ca.publicKey)||leaf.checkIP(wifiIp)!==wifiIp||leaf.checkIP(hotspotIp)!==hotspotIp)throw new Error('Signature ou adresses du certificat produit incohérentes.');
  const exportKey=cert=>cert.publicKey.export({type:'spki',format:'der'});
  if(!exportKey(leaf).equals(exportKey(old)))throw new Error('La clé serveur a changé ; installation refusée.');
  const pfx=await readFile(join(plan.directory,'android.p12'));createSecureContext({pfx,passphrase:password});
  for(const [name,digest] of Object.entries(original))if(hash(await readFile(join(source,name)))!==digest)throw new Error('Un fichier source a changé : contrôle manuel nécessaire.');
  const info={wifiIp,hotspotIp,caFingerprint256:ca.fingerprint256,leafFingerprint256:leaf.fingerprint256,expires:leaf.validTo,
    expectedInstalledSha256:original['android.p12'],pfxSha256:hash(pfx),sameServerKey:true,sourcesUnchanged:true,
    purpose:'Certificat de laboratoire pour les deux adresses relevées ; aucune confiance système modifiée.'};
  await writeFile(join(plan.directory,'info.json'),JSON.stringify(info,null,2));return info;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const [wifiIp,hotspotIp,...extra]=process.argv.slice(2);
  if(extra.length)throw new Error('Usage : node tooling/prepare-hotspot-tls.mjs IP_WIFI IP_POINT_ACCES');
  console.log(JSON.stringify(await prepareHotspotTls(wifiIp,hotspotIp)));
}
