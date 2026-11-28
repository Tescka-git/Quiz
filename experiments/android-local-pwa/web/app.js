const element = (id) => document.getElementById(id);
const report = { version: 1, startedAt: new Date().toISOString(),
  origin: location.origin, userAgent: navigator.userAgent,
  secureContext: isSecureContext, events: [] };
let socket;
let pending;
let sequence = 0;
function log(type, detail = {}) {
  report.events.push({ at: new Date().toISOString(), type, ...detail });
  element('log').textContent = JSON.stringify(report.events.slice(-40), null, 2);
}
function environment() {
  element('environment').textContent = `Origine : ${location.origin} ; contexte sécurisé : ${isSecureContext} ; indicateur réseau : ${navigator.onLine} (ne prouve pas un accès Internet).`;
}
environment();
element('permissions').onclick = async () => {
  const observations = [];
  for (const name of ['local-network', 'loopback-network']) {
    try {
      const permission = await navigator.permissions.query({ name });
      observations.push({ name, state: permission.state });
    } catch {
      observations.push({ name, state: 'API non prise en charge ; ne prouve pas un refus réseau' });
    }
  }
  element('permission-status').textContent = observations.map(p => `${p.name} : ${p.state}`).join(' ; ');
  log('permissions', { observations });
};
for (const name of ['online', 'offline']) addEventListener(name, () => { environment(); log(name); });
element('prepare').onclick = async () => {
  try {
    if (!isSecureContext || !('serviceWorker' in navigator)) throw new Error('Service worker indisponible dans ce contexte.');
    await navigator.serviceWorker.register('./sw.js');
    const registration = await navigator.serviceWorker.ready;
    const channel = new MessageChannel();
    const result = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Vérification du cache expirée.')), 10000);
      channel.port1.onmessage = ({ data }) => { clearTimeout(timeout); channel.port1.close(); resolve(data); };
      registration.active.postMessage({ type: 'CHECK_CACHE' }, [channel.port2]);
    });
    log('cache-check', result);
    element('cache').textContent = result.ready
      ? 'Ressources présentes. Coupez le réseau puis rechargez cette même URL pour vérifier réellement le démarrage hors ligne.'
      : 'Cache incomplet : ' + result.missing.join(', ');
  } catch (error) { element('cache').textContent = error.message; log('cache-error', { message: error.message }); }
};
element('connect').onclick = () => {
  try {
    const url = new URL(element('endpoint').value);
    if (!['ws:', 'wss:'].includes(url.protocol) || url.username || url.password || url.hash) throw new Error('Adresse ws:// ou wss:// sans identifiants ni fragment requise.');
    if (socket && socket.readyState < WebSocket.CLOSING) throw new Error('Déconnectez la tentative précédente.');
    log('connection-attempt', { endpoint: url.href });
    socket = new WebSocket(url);
    element('connect').disabled = true;
    element('disconnect').disabled = false;
    socket.onopen = () => { element('ping').disabled = false; log('open'); };
    socket.onerror = () => log('socket-error', { message: 'Cause à relever aussi dans la console navigateur ; erreur réseau non détaillée par cette API.' });
    socket.onclose = ({ code, reason, wasClean }) => {
      if (pending) { clearTimeout(pending.timeout); pending = undefined; }
      element('connect').disabled = false; element('disconnect').disabled = true; element('ping').disabled = true;
      log('close', { code, reason, wasClean });
    };
    socket.onmessage = ({ data }) => {
      try {
        const message = JSON.parse(data);
        if (pending && message.type === 'pong' && message.id === pending.id) {
          log('pong', { id: message.id, roundTripMs: performance.now() - pending.start });
          clearTimeout(pending.timeout); pending = undefined;
        } else log('unexpected-message');
      } catch { log('invalid-json'); }
    };
  } catch (error) { log('connection-exception', { message: error.message }); }
};
element('disconnect').onclick = () => socket?.close(1000, 'Fin du test');
element('ping').onclick = () => {
  if (pending || socket?.readyState !== WebSocket.OPEN) return;
  const id = String(++sequence);
  pending = { id, start: performance.now(), timeout: setTimeout(() => { log('ping-timeout', { id }); pending = undefined; }, 10000) };
  socket.send(JSON.stringify({ type: 'ping', id }));
  log('ping', { id });
};
element('export').onclick = () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = 'kuikuiz-diagnostic.json'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
log('loaded', { controlledByServiceWorker: Boolean(navigator.serviceWorker?.controller) });
