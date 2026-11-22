import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {once} from 'node:events';
import {createTestCaServer} from '../../tooling/serve-test-ca.mjs';
test('transfert de laboratoire : certificat public exact, aucun fichier privé ni écriture',async t=>{
  const bytes=await readFile(new URL('../../.tools/tls/ca.cer',import.meta.url));
  const server=createTestCaServer(bytes);server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>new Promise(resolve=>server.close(resolve)));
  const origin=`http://127.0.0.1:${server.address().port}`;
  const certificate=await fetch(origin+'/Kuikuiz-Test-CA.cer');assert.equal(certificate.status,200);
  assert.deepEqual(Buffer.from(await certificate.arrayBuffer()),bytes);
  for(const path of ['/ca.p12','/password.txt','/android.p12','/.tools/tls/ca.p12','/../password.txt'])assert.equal((await fetch(origin+path)).status,404);
  assert.equal((await fetch(origin+'/Kuikuiz-Test-CA.cer',{method:'POST'})).status,404);
});
