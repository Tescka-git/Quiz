import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createDiagnosticServer } from '../../tooling/serve-diagnostic.mjs';

test('serve toutes les ressources du diagnostic sans exposer le dépôt', async (t) => {
  const server = createDiagnosticServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const origin = `http://127.0.0.1:${server.address().port}`;
  for (const path of ['/', '/index.html', '/app.js', '/sw.js', '/manifest.webmanifest', '/icon.svg']) {
    const response = await fetch(origin + path);
    assert.equal(response.status, 200, path);
    assert.ok((await response.text()).length > 0);
    assert.equal(response.headers.get('cache-control'), 'no-store');
  }
  const manifest = await (await fetch(origin + '/manifest.webmanifest')).json();
  assert.equal(manifest.start_url, './');
  for (const path of ['/package.json', '/AGENTS.md', '/docs/SPECIFICATIONS.md', '/absent']) {
    assert.equal((await fetch(origin + path)).status, 404);
  }
  assert.equal((await fetch(origin, { method: 'POST' })).status, 404);
});
