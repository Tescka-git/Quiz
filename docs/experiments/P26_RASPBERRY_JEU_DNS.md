# P26 — Jeu et sonde DNS sur Quizcotte

28 novembre 2026. Essai local autorisé sur Raspberry Pi 3 Model B Rev 1.2, Debian 13.8 aarch64, Node 24.22.3. Aucun service système installé ni DNS/DHCP de la maison changé. Aucun certificat transféré ou créé.

## Installation de laboratoire

Dossier utilisateur distant : ~/kuikuiz-lab/p26-20261128. Copie explicite de apps/server-node, apps/web/mock, packages/protocol, moteur compilé et manifeste, package.json et du paquet ws déjà utilisé. Pas de SDK, de clés privées ou de bases du PC/Pixel. Archive de transfert p26-kuikuiz-lab.tar dans le dossier utilisateur. Dépendances existantes reprises, aucune installation npm distante.

Lanceur : tooling/serve-rpi-lab.mjs, variable KUIKUIZ_LAB_ADDRESS=192.168.1.34. Processus utilisateur temporaire lancé avec nohup ; pas de redémarrage automatique au boot. Journal server.log et identifiant server.pid dans le dossier d'essai. Base propre .tools/rpi-lab/quiz.sqlite ; données de l'hôte Android inchangées.

- Jeu : http://192.168.1.34:4180, HTTP/ws non chiffré, contexte non sécurisé sur IP privée ; ce n'est pas la preuve PWA/HTTPS recherchée.
- DNS expérimental : UDP 192.168.1.34:53535, seul nom quizcotte.test renvoyant 192.168.1.34 ; aucune résolution récursive ni redirection Internet. Code minimal limité aux questions non compressées IN/A et réponses négatives, pas un serveur DNS de production. Ne pas le configurer comme DNS de la maison.
- Nom .test réservé à cette sonde, pas un domaine public et pas un nom pour certificat publiquement reconnu.

Pour arrêter : se placer dans le dossier d'essai, lire server.pid et vérifier avec ps que l'identifiant correspond à node tooling/serve-rpi-lab.mjs ; envoyer ensuite SIGTERM à ce processus uniquement. Ne pas supprimer la base pour arrêter le serveur. Pour relancer depuis un terminal distant : KUIKUIZ_LAB_ADDRESS=192.168.1.34 node tooling/serve-rpi-lab.mjs.

## Vérifications réalisées

- Empreinte moteur distante identique au projet : 0bf772f90d20bb846f8b00981a52a5817bb477ffa08fe08a3de84758b3390f10.
- Depuis le PC, KUIKUIZ_ORIGIN=http://192.168.1.34:4180 npm run test:mock:live : PASS, trois questions, 3 000 points, droits, masquage des corrections, confirmation durable, doublons et reconnexion. Confirmations observées environ 40/118/38 ms pour cet essai unique ; aucune garantie de performance.
- node tooling/probe-rpi-dns.mjs : PASS, A correct, AAAA sans donnée (ENODATA), nom inconnu NXDOMAIN, accès HTTP avec résolution explicite par cette sonde. Un premier essai UDP avec une seule tentative a expiré sur le nom inconnu ; répétition positive avec retransmission, sans diagnostic certain de la perte initiale.
- Processus jeu + DNS : environ 65 Mo RSS au relevé, sans test de charge ni endurance. Ports 4180/TCP et 53535/UDP actifs.

## Ce qui reste à démontrer

Recette navigateur sur téléphones et charge réelle sur Raspberry. Le DNS non privilégié a été interrogé explicitement : cela ne démontre pas que Chrome/Firefox utilisent ce résolveur, ni une modification du DNS Android. Pour cette suite, préparer un vrai DNS de test sur port 53 avec configuration contrôlée et validation des opérations administrateur ; le compte demande un mot de passe sudo, jamais collecté par l'assistant. Aucun ajout de sudo sans mot de passe prévu.

Domaine public et certificat reconnu, chaîne de confiance normale, résolution locale après redémarrage sans Internet, DNS privé/DoH et fonctionnement avec le seul hotspot Pixel restent des questions séparées. Le Raspberry peut assurer jeu et DNS dans ce montage, sans remplacer les preuves Android. Voir [P25](P25_HTTPS_WSS_HORS_LABORATOIRE.md).

## Recette manuelle — 28 novembre 2026

L’utilisateur confirme l’accueil sur Redmi à http://192.168.1.34:4180, puis le parcours demandé avec animateur PC et joueur Redmi : trois questions, 3 000 points et podium partagé, résultat positif. Serveur hébergé sur Quizcotte. Aucun relevé de charge, de fonctionnement sans Internet ou de résolution par nom dans les navigateurs ajouté par cette recette HTTP/ws sur IP.

## DNS standard — préparation du 28 novembre

Inventaire approfondi : dnsmasq-base 2.91-1+deb13u2 était déjà installé, binaire /usr/sbin/dnsmasq hors du PATH utilisateur. Aucune installation nécessaire. La première recherche command -v n'avait donc pas établi son absence.

Configuration dédiée experiments/raspberry-dns/dnsmasq-lab.conf, copiée dans le dossier distant de l'essai. DNS seulement, écoute 192.168.1.34:53, aucun DHCP, aucun fichier système hosts/resolv lu, aucun redirecteur, enregistrement exact quizcotte.test et zone locale .test. Les autres noms ne bénéficient pas d'une résolution Internet : ne pas présenter ce DNS comme un DNS général.

Syntaxe validée avec dnsmasq --test. Copie de contrôle sur 53536 : A correct, AAAA sans donnée et NXDOMAIN pour nom inconnu positifs ; processus de contrôle arrêté après vérification. La première tentative de surcharge par --port n'avait pas remplacé le port du fichier et a échoué sans privilège ; la copie dédiée a corrigé le protocole de test.

Script préparé : experiments/raspberry-dns/start-dns-lab.sh. Il refuse un port 53 occupé, teste la syntaxe et lance une unité systemd transitoire kuikuiz-dns-lab sous quiz:quiz, avec uniquement CAP_NET_BIND_SERVICE et NoNewPrivileges. Pas de enable ni de configuration du DNS/DHCP système. Démarrage administrateur encore à exécuter et valider par l'utilisateur : sudo sh /home/quiz/kuikuiz-lab/p26-20261128/start-dns-lab.sh. Arrêt : sudo systemctl stop kuikuiz-dns-lab.

Le démarrage sur 53 et la résolution depuis un navigateur mobile restent à confirmer. Aucun changement réseau à l'échelle de la maison.

### Port 53 actif et contrôlé

Après démarrage manuel par l’utilisateur, unité active/running, User=quiz, Group=quiz, AmbientCapabilities=cap_net_bind_service et NoNewPrivileges=yes vérifiés. Écoute TCP/UDP sur 192.168.1.34:53. Requêtes explicites depuis le PC : A correct, AAAA ENODATA, nom inconnu NXDOMAIN, résultat positif. Résolution via le DNS système du Redmi encore à essayer ; aucun réglage DHCP de la box modifié.
