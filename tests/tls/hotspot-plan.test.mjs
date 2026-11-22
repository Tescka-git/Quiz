import {test} from 'node:test';
import assert from 'node:assert/strict';
import {hotspotPlan} from '../../tooling/prepare-hotspot-tls.mjs';
import {readFile,readdir} from 'node:fs/promises';
import {createHash,X509Certificate} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

test('profil TLS de laboratoire : seules deux IPv4 privées distinctes sont autorisées',()=>{
  const plan=hotspotPlan('192.168.1.21','10.186.21.94');
  assert.equal(plan.san,'ip:192.168.1.21,ip:10.186.21.94');
  assert.match(plan.directory,/profiles[\\/]hotspot-10-186-21-94$/);
  for(const bad of ['127.0.0.1','0.0.0.0','8.8.8.8','172.15.1.1','172.32.1.1','::1','10.1.1.1,ip:8.8.8.8','../cert','192.168.1.21'])
    assert.throws(()=>hotspotPlan('192.168.1.21',bad));
  assert.throws(()=>hotspotPlan('8.8.8.8','10.1.1.1'));
});

test('préparation privée : argument de profil incomplet refusé avant tout appel ADB',()=>{
  const result=spawnSync(process.execPath,[fileURLToPath(new URL('../../tooling/provision-android-tls.mjs',import.meta.url)),'--hotspot'],
    {env:{...process.env,KUIKUIZ_ADB:'unused',KUIKUIZ_DEVICE:'unused'},encoding:'utf8',windowsHide:true});
  assert.notEqual(result.status,0);assert.match(result.stderr,/Adresse requise après --hotspot/);
});

test('profils produits : deux adresses, même clé serveur, même autorité et source conservée',async t=>{
  const root=new URL('../../.tools/tls/',import.meta.url);let names;
  try{names=await readdir(new URL('profiles/',root));}catch(error){if(error.code==='ENOENT'){t.skip('Aucun profil de laboratoire préparé');return;}throw error;}
  const ca=new X509Certificate(await readFile(new URL('ca.pem',root)));
  const old=new X509Certificate(await readFile(new URL('android.pem',root)));
  const originalHash=createHash('sha256').update(await readFile(new URL('android.p12',root))).digest('hex');
  for(const name of names){
    if(!/^hotspot-(\d+-){3}\d+$/.test(name))continue;
    const directory=new URL('profiles/'+name+'/',root);
    const info=JSON.parse(await readFile(new URL('info.json',directory),'utf8'));
    const leaf=new X509Certificate(await readFile(new URL('android.pem',directory)));
    assert.equal(leaf.checkIP(info.wifiIp),info.wifiIp);assert.equal(leaf.checkIP(info.hotspotIp),info.hotspotIp);
    assert.ok(leaf.verify(ca.publicKey));assert.equal(info.caFingerprint256,ca.fingerprint256);
    assert.equal(info.expectedInstalledSha256,originalHash);
    assert.deepEqual(leaf.publicKey.export({type:'spki',format:'der'}),old.publicKey.export({type:'spki',format:'der'}));
  }
});
