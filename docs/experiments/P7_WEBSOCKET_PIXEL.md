# P7 — Transport WebSocket PC vers Pixel

**Date :** 21 novembre 2026. **Verdict :** échange minimal positif, périmètre limité.

## Configuration observée

- Téléphone physique : Google Pixel 7, Android 17 (version relevée par ADB).
- PC et téléphone sur le réseau local existant ; le téléphone n'assure pas encore le point d'accès.
- Débogage ADB associé par Wi-Fi, sans USB. Codes d'association non conservés dans le dépôt.
- Sonde `fr.kuikuiz.probe`, version `0.1-experiment`, serveur Java-WebSocket 1.6.0.
- Compilation réussie : JDK local 17.0.21.1, Gradle 8.11.1, AGP 8.9.2, plateforme SDK 35, Build Tools 35.0.0.
- APK debug installé avec succès ; application ouverte, serveur observé en écoute au premier plan sur le port 8787.

## Essai exécuté

Depuis le PC : `npm.cmd run probe:ping -- ws://192.168.1.21:8787`.

Le client Node.js a envoyé `{"type":"ping","id":"probe-1"}` et vérifié la réponse `pong` avec le même identifiant. Commande terminée avec code 0. Aller-retour observé : environ **13,33 ms sur un seul échange**. Cette mesure n'est ni un seuil ni une caractérisation de performance.

## Portée et limites

L'essai démontre un échange WebSocket non chiffré entre Node.js sur le PC et une application serveur Android physique au premier plan. Il ne dépend pas d'un serveur Node.js sur le téléphone.

Il ne valide pas une connexion depuis navigateur, HTTPS/WSS et certificats, PWA Android, fonctionnement sans Internet, téléphone en point d'accès, veille/arrière-plan, stockage durable, exécution du moteur TypeScript ou capacité à 30 joueurs. Aucun relais distant n'a été déployé.

Prochain essai : sonde navigateur PC vers la même adresse, en consignant origine et erreurs éventuelles, puis préparer séparément le parcours HTTPS sur téléphone.
