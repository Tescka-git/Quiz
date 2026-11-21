import { createServer } from 'node:http';
import { createServer as createHttpsServer } from 'node:https';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = new URL('../experiments/android-local-pwa/web/', import.meta.url);
const routes = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/sw.js', ['sw.js', 'text/javascript; charset=utf-8']],
  ['/manifest.webmanifest', ['manifest.webmanifest', 'application/manifest+json']],
  ['/icon.svg', ['icon.svg', 'image/svg+xml']],
]);

export function createDiagnosticServer(tls) {
  const handler = async (request, response) => {
    const route = routes.get(new URL(request.url, 'http://localhost').pathname);
    if (!route || !['GET', 'HEAD'].includes(request.method)) {
      response.writeHead(404).end();
      return;
    }
    try {
      const body = await readFile(new URL(route[0], root));
      response.writeHead(200, { 'Content-Type': route[1], 'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff' });
      response.end(request.method === 'HEAD' ? undefined : body);
    } catch {
      response.writeHead(500).end('Ressource indisponible');
    }
  };
  return tls ? createHttpsServer({ ...tls, minVersion: 'TLSv1.2' }, handler) : createServer(handler);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const secure = process.argv.includes('--https');
  const tlsDirectory = new URL('../.tools/tls/', import.meta.url);
  const tls = secure ? {
    pfx: await readFile(new URL('pc.p12', tlsDirectory)),
    passphrase: (await readFile(new URL('password.txt', tlsDirectory), 'utf8')).trim(),
  } : undefined;
  const port = secure ? 4174 : 4173;
  const host = secure ? '0.0.0.0' : '127.0.0.1';
  const server = createDiagnosticServer(tls);
  if (secure) {
    server.on('tlsClientError', (error) => console.log('Échec TLS client :', error.code || error.name));
    server.on('secureConnection', () => console.log('Connexion TLS établie.'));
  }
  server.listen(port, host, () => {
    console.log(secure
      ? 'Diagnostic HTTPS sur le réseau local, port 4174. Autorité de test à approuver séparément ; aucun magasin de confiance modifié.'
      : 'Diagnostic : http://localhost:4173 — PC uniquement, aucun hôte Android démarré.');
  });
}
