import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { get } from 'node:https';
import { once } from 'node:events';
import { X509Certificate } from 'node:crypto';
import { createDiagnosticServer } from '../../tooling/serve-diagnostic.mjs';

const directory = new URL('../../.tools/tls/', import.meta.url);
function request(url, ca, servername) {
  return new Promise((resolve, reject) => {
    get(url, { ca, servername, agent: false }, (response) => {
      response.resume(); response.on('end', () => resolve(response.statusCode));
    }).on('error', reject);
  });
}
test('TLS local : autorité et nom vérifiés, secrets inaccessibles par HTTP', async (t) => {
  const ca = await readFile(new URL('ca.pem', directory));
  const server = createDiagnosticServer({ pfx: await readFile(new URL('pc.p12', directory)),
    passphrase: (await readFile(new URL('password.txt', directory), 'utf8')).trim() });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const origin = `https://127.0.0.1:${server.address().port}`;
  assert.equal(await request(origin, ca, 'localhost'), 200);
  assert.equal(await request(origin + '/.tools/tls/password.txt', ca, 'localhost'), 404);
  await assert.rejects(request(origin, ca, 'incorrect.invalid'), { code: 'ERR_TLS_CERT_ALTNAME_INVALID' });
  await assert.rejects(request(origin), /certificate|issuer|self.signed/i);
  const leaf = new X509Certificate(await readFile(new URL('android.pem', directory)));
  const info = JSON.parse(await readFile(new URL('info.json', directory), 'utf8'));
  assert.equal(leaf.checkIP(info.androidIp), info.androidIp);
  assert.ok(leaf.verify(new X509Certificate(ca).publicKey));
});
