import { createServer } from 'node:http';
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

export function createDiagnosticServer() {
  return createServer(async (request, response) => {
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
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  createDiagnosticServer().listen(4173, '127.0.0.1', () => {
    console.log('Diagnostic : http://localhost:4173 — PC uniquement, aucun hôte Android démarré.');
  });
}
