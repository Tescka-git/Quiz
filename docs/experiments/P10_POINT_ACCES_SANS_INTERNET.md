# P10 — PC client et Pixel hôte sur point d'accès sans Internet

**Date :** 21 novembre 2026. **Verdict :** positif pour le parcours PC client / Android hôte, selon les observations ci-dessous.

## Configuration

- Hôte : Pixel 7, sonde Android 0.2 avec service de premier plan, serveur `ws://` sur le port 8787.
- Point d'accès Wi-Fi du Pixel activé ; connexion au Wi-Fi habituel désactivée et données mobiles coupées selon les manipulations confirmées par l'utilisateur.
- PC connecté au point d'accès par sa carte Wi-Fi ; adresse relevée `10.186.21.232`, passerelle Pixel `10.186.21.94`.
- Sonde navigateur PC : `http://localhost:4173`, cible `ws://10.186.21.94:8787`. Version exacte du navigateur non relevée.
- Ethernet d'abord conservé pour préparer l'essai, puis physiquement débranché par l'utilisateur pendant la séquence hors Internet.

## Résultats

1. Préparation, Ethernet encore actif : ping Node.js exécuté par l'agent, pong reçu, aller-retour unique d'environ 17,14 ms. Ce résultat seul ne démontre pas l'absence d'Internet.
2. Avant coupure Ethernet : l'utilisateur confirme recevoir un pong dans le navigateur PC.
3. Ethernet débranché, données mobiles du Pixel coupées : l'utilisateur confirme que les pings passent.
4. Après rechargement de la même page localhost, l'utilisateur envoie trois nouveaux pings et confirme trois retours pong.

Les étapes 2 à 4 sont des observations manuelles rapportées, sans export JSON recueilli. L'absence d'Internet repose sur la configuration décrite ; aucun relevé de routes ou capture réseau n'a été réalisé pendant la coupure. Aucun seuil de performance n'est déduit.

## Ce qui est démontré et limites

L'essai est positif pour des échanges locaux entre un navigateur PC et le serveur Android via le point d'accès, dans la configuration sans accès Internet décrite. Le téléphone héberge effectivement le serveur sans Node.js.

Le rechargement de localhost a réussi. L'état du serveur local de fichiers PC n'a pas été vérifié à cette étape : ce rechargement ne constitue pas à lui seul une preuve de cache service worker. La page a été chargée via l'origine spéciale localhost, pas via HTTPS mobile.

Restent à démontrer : PWA HTTPS sur un téléphone client distinct, WSS, iOS, autres navigateurs, fermeture complète et réouverture, stabilité prolongée, capacité à 30 joueurs, durabilité et moteur TypeScript partagé. Les certificats précédemment générés ne couvrent pas automatiquement la nouvelle adresse du point d'accès.
