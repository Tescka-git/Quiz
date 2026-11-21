import { performance } from 'node:perf_hooks';

const endpoint = process.argv[2];
if (!endpoint) {
  console.error('Usage : node tooling/ping-websocket.mjs ws://ADRESSE_WIFI:8787');
  process.exitCode = 1;
} else {
  try {
    const url = new URL(endpoint);
    if (!['ws:', 'wss:'].includes(url.protocol) || url.username || url.password) throw new Error('Adresse WebSocket sans identifiants requise.');
    const socket = new WebSocket(url);
    let completed = false;
    let started;
    const timeout = setTimeout(() => finish(new Error('Aucune réponse valide dans le délai de diagnostic de 10 secondes.')), 10000);
    function finish(error) {
      if (completed) return;
      completed = true;
      clearTimeout(timeout);
      socket.close();
      if (error) { console.error(error.message); process.exitCode = 1; }
    }
    socket.addEventListener('open', () => {
      started = performance.now();
      socket.send(JSON.stringify({ type: 'ping', id: 'probe-1' }));
    });
    socket.addEventListener('message', ({ data }) => {
      try {
        const message = JSON.parse(data);
        if (message.type !== 'pong' || message.id !== 'probe-1') throw new Error('Réponse inattendue.');
        console.log(JSON.stringify({ endpoint: url.href, result: 'pong', roundTripMs: performance.now() - started,
          scope: 'Transport depuis Node.js uniquement ; ne valide pas les restrictions navigateur ou HTTPS.' }, null, 2));
        finish();
      } catch (error) { finish(error); }
    });
    socket.addEventListener('error', () => finish(new Error('Échec de connexion WebSocket.')));
    socket.addEventListener('close', () => { if (!completed) finish(new Error('Connexion fermée avant le pong.')); });
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
