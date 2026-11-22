import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {X509Certificate} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

/** Transfert LAN limité au seul certificat public, jamais au dossier TLS. */
export function createTestCaServer(bytes){
  const certificate=new X509Certificate(bytes);
  if(!certificate.ca)throw new Error('Le fichier doit être un certificat public d’autorité.');
  const page=`<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Kuikuiz — Certificat de laboratoire</title><h1>Certificat public de laboratoire Kuikuiz</h1><p>Autorité : Kuikuiz Local Test CA</p><p>Vérifier cette empreinte SHA-256 avec celle communiquée séparément avant de faire confiance au certificat :</p><pre>${certificate.fingerprint256}</pre><p><a href="/Kuikuiz-Test-CA.cer">Télécharger le certificat public</a></p><p>L’ajout aux autorités de confiance se fait manuellement dans les réglages Android, pour cet essai uniquement.</p></html>`;
  return createServer((request,response)=>{
    const path=new URL(request.url,'http://localhost').pathname;
    if(!['GET','HEAD'].includes(request.method)||!['/','/Kuikuiz-Test-CA.cer'].includes(path)){response.writeHead(404).end();return;}
    const download=path!=='/';
    response.writeHead(200,{'Content-Type':download?'application/pkix-cert':'text/html; charset=utf-8','Cache-Control':'no-store',
      'X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
      ...(download?{'Content-Disposition':'attachment; filename="Kuikuiz-Test-CA.cer"'}:{})});
    response.end(request.method==='HEAD'?undefined:download?bytes:page);
  });
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const host=process.argv[2];if(!host||!/^192\.168\.\d{1,3}\.\d{1,3}$/.test(host))throw new Error('Indiquer explicitement l’adresse LAN 192.168.x.x du PC.');
  const bytes=await readFile(new URL('../.tools/tls/ca.cer',import.meta.url));
  const certificate=new X509Certificate(bytes);
  const info=JSON.parse(await readFile(new URL('../.tools/tls/info.json',import.meta.url),'utf8'));
  if(certificate.fingerprint256!==info.caFingerprint256)throw new Error('Le certificat public ne correspond pas à l’autorité de laboratoire attendue.');
  const server=createTestCaServer(bytes);
  server.listen(4182,host,()=>console.log(`Certificat public uniquement : http://${host}:4182 — aucun secret servi.`));
  for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>server.close(()=>process.exit(0)));
}
