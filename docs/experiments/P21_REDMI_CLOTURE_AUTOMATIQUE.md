# P21 — Deuxième téléphone et clôture automatique

**22 novembre 2026.**

## Essai manuel avant modification

Redmi Note 11, Android 13 et HyperOS « 1.05.0 » selon les indications de l'utilisateur ; adresse Wi-Fi `192.168.1.32`. Chrome mis à jour, version exacte non relevée. Le Pixel 7 héberge à `https://192.168.1.21:8443` sur le Wi-Fi habituel.

Après accord explicite, l'utilisateur installe la seule autorité publique **Kuikuiz Local Test CA** sur le Redmi. Le téléchargement temporaire HTTP ne sert que le certificat public, jamais les conteneurs ou mots de passe privés. L'utilisateur confirme l'ouverture de Kuikuiz sans alerte, puis répond « c'est parfait » après la consigne de jouer les trois questions avec Pixel animateur et Redmi joueur. Aucun score chiffré indépendant n'a été fourni. Ce retour valide ce parcours manuel limité, pas l'ensemble des navigateurs Android ni l'absence d'Internet. L'autorité de laboratoire devra être retirée après la campagne.

## Règle ajoutée à la demande de l'utilisateur

La liste des joueurs est celle du démarrage de la partie, conservée pour chaque question. Dès que tous ont une réponse acceptée, correcte ou incorrecte, le moteur partagé `applyQuiz` clôture la question. La correction et le classement de cette maquette de questions isolées deviennent visibles après commit. L'animateur lance toujours la question suivante ; il peut aussi révéler manuellement si des réponses manquent. Une déconnexion ne réduit pas l'effectif et un doublon ne constitue pas une nouvelle réponse. Sans toutes les réponses, cette règle ne déclenche aucune clôture ; le comportement existant à l'échéance est conservé.

La dernière réponse et l'état clôturé sont sauvegardés dans la même transaction SQLite par les adaptateurs existants. Aucun changement de protocole ou API d'environnement dans le moteur. L'API historique `apply` de question isolée conserve sa clôture explicite pour les sondes.

## Version et conservation des données

APK **0.9-experiment**, moteur SHA-256 `0657bb128f2c027d72b0257b56f62fdc2ef25298e39ac14bf10bfa91169a44c1`. Les assets Android embarquent les mêmes octets que l'artefact Node, vérifiés par Gradle. Base Android `kuikuiz-playable-v3.db` et base du serveur Node CLI `quiz-v3.sqlite` : les anciennes bases v2 sont conservées sans migration ni suppression. Créer une nouvelle partie ; les anciens codes ne sont pas repris. Aucun certificat modifié pour cette évolution.

## Vérifications effectuées

- `npm.cmd test` : 33 tests positifs, dont clôture après toutes les réponses, réponse incorrecte, doublon, joueur absent, déconnexion/reconnexion, restauration fermée et rollback de la dernière réponse. Charge Node : 30 joueurs simulés, 90 réponses, sans commande de révélation.
- Une exécution pendant les opérations Android a dépassé le délai de garde de 2 secondes du test de charge. La relance complète a réussi ; aucune garantie de latence n'en est déduite.
- `npm.cmd run test:tls` : 5 tests positifs, dont transfert public sans exposition de fichiers privés.
- `test:mock:browser` : parcours Chrome PC positif, révélation automatique à deux joueurs sur la première question et progression manuelle. Les autres questions gardent aussi une vérification de clôture manuelle avec réponse manquante.
- `test:mock:offline` : positif ; un second joueur volontairement sans réponse maintient la question incomplète pour tester la reprise gelée.
- Préparation des assets, compilation Gradle et installation conservant les données réussies. Au premier démarrage, erreur de liaison du port WSS ; arrêt complet de la seule application puis redémarrage HTTPS résolvent l'incident. Cause de cette occupation non établie ; ne pas considérer la transition à chaud comme validée par cet essai.
- `test:mock:live` sur Pixel, HTTPS/WSS strict : trois clôtures sans commande `reveal`, 3 000 points, doublons et reconnexion positifs. Confirmations observées : environ 201, 60 et 149 ms (trois échantillons seulement). Rapport local `artifacts/mock-preview/live-android-autoclose.json`.

## À compléter

Rejouer au toucher sur Redmi avec APK 0.9 côté Pixel pour observer la nouvelle clôture automatique. Les harnais Pixel/cache et arrêt forcé ont été adaptés avec un deuxième joueur sans réponse pour conserver les scénarios de reprise en pause, mais n'ont pas été rejoués sur téléphone dans ce lot. Pas de nouvelle preuve hors Internet, de cache Redmi, d'iOS/Firefox, d'endurance ou de charge physique.

L'adresse actuelle du point d'accès doit être relevée avant le prochain essai : elle peut changer et le certificat historique ne couvre que les adresses explicitement préparées en P20.

## Complément du 23 novembre — Redmi sur point d'accès sans Internet

**Essai manuel positif confirmé par l'utilisateur.** Pixel 7 hôte et animateur, Redmi Note 11 joueur, Chrome sur les deux appareils. Version exacte de Chrome Redmi toujours non relevée. APK Pixel `0.9-experiment` vérifié par ADB avant la coupure.

Avant coupure, ADB relève `192.168.1.21` sur le Wi-Fi habituel et `10.186.21.94/24` sur l'interface du point d'accès. HTTPS sur le Wi-Fi habituel répond 200 avec autorité et adresse vérifiées par le client Node. L'adresse du point d'accès correspond au profil de laboratoire existant : aucun certificat ni secret modifié.

Le Redmi rejoint le point d'accès et ouvre `https://10.186.21.94:8443` sans alerte selon l'utilisateur. La préparation affiche « Écrans disponibles hors ligne. L'hôte reste nécessaire pour jouer. » ; ce statut ne prouve pas encore un rechargement après arrêt réel de l'hôte. Une nouvelle salle est créée sur cette même origine, puis rejointe sur le Redmi.

L'utilisateur confirme ensuite explicitement : Wi-Fi habituel et données mobiles du Pixel coupés, point d'accès maintenu, données mobiles du Redmi coupées ; trois questions terminées (Mars, Pacifique, Six), révélation automatique et **3 000 points**. Le PC conserve Internet pour la conversation ; il ne joue aucun rôle de serveur dans ce parcours. Les coupures et le résultat reposent sur le retour manuel, sans télémétrie ADB ou mesure de connectivité publique après coupure. Ne pas présenter cet essai comme une mesure d'isolement du PC ni une nouvelle campagne TLS négative automatisée.

Ce résultat complète la preuve de jeu local sécurisé sur un téléphone joueur distinct et la recette tactile de clôture automatique. Reconnexion du Redmi, rechargement après interruption, veille, arrêt de l'hôte, installation PWA, endurance, iOS/Firefox et charge physique restent à tester.

### Retours d'interface à traiter ensuite

- Éviter le doublon entre le statut du cache et « Connexion à l'hôte nécessaire pour jouer », perçu comme un blocage alors que la préparation est réussie.
- Prévoir un code de salle simplifié en mode laboratoire (exemple demandé : `1234`). Non implémenté ; conserver la distinction entre salles et ne pas modifier les accès animateur.
- Masquer le code de salle sur l'écran participant après son entrée. Non implémenté ; reprise à prévoir dans le travail de maquette.

### Reconnexion, rechargement et veille — retours manuels du 23 novembre

Après coupure puis réactivation du Wi-Fi du Redmi, celui-ci rejoint automatiquement le Wi-Fi domestique au lieu du point d'accès. L'utilisateur observe une erreur réseau et le formulaire code/pseudo après rechargement. Après sélection du point d'accès du Pixel, sans ressaisie de ces accès, la partie terminée et les 3 000 points reviennent. Un nouveau rafraîchissement conserve le classement final. Ce premier incident correspond au mauvais réseau, pas à une perte d'accès démontrée.

Le Redmi reste ensuite verrouillé pendant la pause repas (durée non chronométrée). Au retour dans Chrome, classement et 3 000 points sont visibles, avec l'alerte « Connexion interrompue. Vérifiez le serveur et le réseau. » encore présente après dix secondes. Après rafraîchissement, le classement final à 3 000 points est retrouvé. L'affichage antérieur au rafraîchissement ne prouve pas une liaison active. La reprise après rechargement est positive ; la reconnexion automatique après veille reste à confirmer.

### Correctif de l'alerte réseau — sources uniquement

L'inspection du client révèle que les alertes réseau étaient effacées lors d'un changement de question, mais pouvaient rester affichées après réception d'un état de la même question. Le correctif distingue ces alertes des erreurs métier et les efface seulement à réception d'un état serveur valide. Il ne démontre pas à lui seul la cause de la notification pendant la veille Redmi et n'ajoute aucun mécanisme de réveil réseau.

Cache de l'interface porté de `kuikuiz-mock-shell-v1` à `kuikuiz-mock-shell-v2`. Pas d'activation forcée pendant une partie : fermer les onglets de cette origine sera nécessaire pour activer la mise à jour une fois servie. Aucun nouveau build ou déploiement Android réalisé dans ce lot ; APK installé toujours 0.9 avec l'ancienne interface.

Tests Chrome PC : coupure simulée, nouvelle tentative réseau, reconnexion sans rechargement sur le même classement à 3 000 points et disparition de l'alerte ; erreur métier conservée malgré un nouvel état. Recettes de cache hôte arrêté et cycle de mise à jour positifs. Ces tests ne remplacent pas la recette de veille sur le Redmi. Les autres retours d'ergonomie et le code labo restent différés.

### Réserve réseau après les essais

L'utilisateur constate ensuite que le Pixel est revenu sur le Wi-Fi habituel sans avoir identifié quand ni par quelle action. Après reconnexion ADB, le relevé montre simultanément `192.168.1.21` (Wi-Fi habituel), `10.186.21.94` (point d'accès), `wifi_on=1` et `mobile_data=1` (réglage activé, sans preuve de trafic mobile). Ce relevé ne date pas le retour des accès amont et ne permet pas de reconstituer leur état pendant la veille.

Le quiz initial reste un résultat manuel avec coupures explicitement confirmées à ce moment par l'utilisateur, sans mesure indépendante d'isolement. Pour reconnexion, rechargement et veille ultérieurs, ne pas revendiquer l'absence d'Internet. Une nouvelle recette avec relevés réseau est nécessaire pour lever cette incertitude. L'installation de la version 0.10 est autorisée par l'utilisateur pour retester le correctif, avec moteur, base v3 et certificats conservés.

### Installation de la correction — 23 novembre

Compilation Gradle positive, puis arrêt de la seule application et installation par `adb install -r` réussie. Le paquet annonce **0.10-experiment**, versionCode 10. Moteur inchangé : `0657bb128f2c027d72b0257b56f62fdc2ef25298e39ac14bf10bfa91169a44c1`. Base v3 conservée ; aucun certificat modifié. L'installation de l'APK ne prouve pas que Chrome a activé le cache v2 : il faut servir la mise à jour, attendre sa préparation, fermer les onglets Kuikuiz de cette origine et rouvrir. Ne pas effacer les données du site, afin de conserver l'accès à la partie.

Le démarrage automatisé via le bouton natif est interrompu car l'écran système masque l'application ; démarrage manuel demandé. Contrôle du serveur et recette Redmi après mise à jour encore à faire.

Après confirmation du démarrage manuel, le client Node vérifie HTTPS sur `192.168.1.21:8443` avec autorité et adresse contrôlées : `/connection.json`, `/app.js` et `/sw.js` répondent 200. Le script servi contient la correction de l'alerte et le service worker annonce `kuikuiz-mock-shell-v2`. Cela vérifie les ressources du serveur, pas encore l'activation du cache dans Chrome Redmi.

### Recette manuelle après installation de 0.10

Après préparation de la mise à jour, fermeture des onglets Kuikuiz puis réouverture sur Redmi, l'utilisateur retrouve les 3 000 points sans alerte. L'activation du cache v2 n'a pas été inspectée directement dans ce navigateur.

Après une nouvelle coupure Wi-Fi puis retour au point d'accès, l'utilisateur confirme « Connecté à la partie » sans rafraîchissement manuel. Puis, après une veille demandée d'environ une minute (durée non mesurée), il observe l'alerte pendant environ une seconde, suivie d'un état correct rétabli automatiquement. Retours manuels positifs de reconnexion et de veille courte ; aucune mesure de latence, preuve de veille prolongée ou d'isolement Internet ajoutée. L'essai d'arrêt de l'hôte après réponse confirmée est l'étape suivante.

### Arrêt forcé avec une réponse confirmée — incident WSS

Nouvelle partie à deux joueurs : Redmi répond Mars, le joueur secondaire « Tutu » sur le Pixel ne répond pas. L'utilisateur confirme la réponse enregistrée puis la pause manuelle avant l'arrêt. L'agent exécute `am force-stop fr.kuikuiz.probe` et relance l'application et le mode HTTPS : PID passé de 9279 à 11553. Cet essai porte sur une question déjà en pause, pas sur le gel d'un chronomètre interrompu en marche.

HTTPS répond 200 avec certificat vérifié, mais le Redmi conserve une alerte et l'écran de pause. Le contrôle séparé de WSS sur 8789 échoue `ECONNREFUSED`, et le journal de l'application affiche `BindException` tout en annonçant HTTPS/WSS actif. La réception d'un nouvel état n'est donc pas validée à ce stade ; l'écran conservé ne prouve pas la restauration de la réponse.

Correction de l'adaptateur dans APK **0.11-experiment** : réutilisation de l'adresse du socket activée avant démarrage, attente explicite du démarrage WebSocket (ou propagation de son erreur) avant lancement HTTP et annonce du service. Moteur, base v3 et certificats inchangés. Compilation et installation conservant les données positives. La cause exacte de l'occupation du port n'est pas mesurée ; la réutilisation vise notamment les redémarrages avec connexions précédentes encore en fermeture. Le harnais de modes vérifie désormais une vraie connexion WS/WSS et propose `--force-stop` pour trois redémarrages HTTPS/WSS.

Le premier lancement du harnais ne démarre pas le service : l'appui arrive avant que l'écran natif soit prêt. Après vérification du bouton sur un nouvel arbre UI à chaque relance, **trois arrêts forcés et redémarrages consécutifs réussissent**, HTTPS et ouverture WSS avec autorité explicite vérifiés. Rapport local `artifacts/mock-preview/android-force-stop-report.json`. Le mode HTTP alternatif est vérifié indisponible à chaque tour ; aucun effacement de base ni modification de certificat. La restauration de la réponse sur le Redmi reste à confirmer manuellement après ce test ; les autres modes rapides HTTP/HTTPS n'ont pas été rejoués dans ce lot.

Au retour sur Redmi, l'utilisateur confirme connexion et pause, mais voit Mars sélectionné avec « Votre réponse sera définitive après confirmation », et non une confirmation durable. Inspection en lecture seule d'une copie de la base Android après relance : dernière salle à deux joueurs Titi/Tutu, question `planete`, phase `paused`, temps logique 16 140 ms ; aucune réponse dans le snapshot ni dans le registre SQL pour cette salle. Une partie antérieure terminée conserve ses trois réponses et ses scores. Copie locale exclue de Git dans `artifacts/recovery-inspection/` ; aucun jeton publié.

**La conservation de réponse n'est pas validée par cet essai.** Il n'existe pas de relevé de base ni d'accusé réseau capturé avant le premier arrêt pour cette salle : impossible de distinguer sur ces seules données une réponse non confirmée initialement d'une perte. Ne pas attribuer l'écart à une erreur utilisateur ni conclure à la perte démontrée d'une réponse confirmée. Refaire une soumission explicite après reprise, contrôler sa présence durable avant arrêt, puis comparer après arrêt/redémarrage.

### Nouvelle soumission vérifiée avant arrêt

L'utilisateur reprend la question et confirme Mars sur Redmi ; il voit « Réponse confirmée et enregistrée », puis le temps expire avant la mise en pause. Il signale aussi une alerte réseau sur le Pixel animateur malgré la reprise : cet affichage côté animateur reste à investiguer séparément.

Lecture d'une copie de la base **avant** le nouvel arrêt : réponse Titi/Mars présente dans le snapshot et le registre SQL, acceptée à 25 360 ms pour 1 000 points ; question encore en phase interne `open`, checkpoint à 30 197 ms donc expirée à l'affichage. Le joueur Tutu n'a pas répondu.

Nouvel arrêt forcé puis relance HTTPS/WSS sur APK 0.11 : PID 12687 → 13304. Comparaison des copies avant/après : tableaux de réponses du snapshot et lignes du registre strictement identiques, une réponse Mars à 1 000 points ; phase restaurée `paused`, temps logique conservé à 30 197 ms. HTTPS et ouverture WSS vérifiés avec autorité explicite. Rapport local `artifacts/recovery-inspection/confirmed-recovery-report.json`, copies privées exclues de Git.

**Conservation durable après arrêt validée pour cette réponse dont la présence avant arrêt est mesurée.** La question était déjà expirée : cette expérience ne prouve pas le gel d'un chronomètre avant échéance et ne doit pas redonner du temps pour répondre. Réception de la confirmation restaurée et publication du score sur Redmi à confirmer manuellement ; utiliser la révélation, pas une reprise pour répondre à cette question expirée.

Après consigne de vérifier la confirmation restaurée puis de révéler les résultats (1 000 points pour Titi, 0 pour Tutu), l'utilisateur confirme « Ouais, c'est bon ». Retour manuel positif qui complète la comparaison SQL avant/après ; aucune mesure de délai de reconnexion ni nouvelle preuve d'isolement Internet.

### Préparation du prochain essai — nouvelle salle en cours de partie

Le retour à l'accueil puis « J'anime » réutilise l'accès animateur local et rouvre l'ancienne partie. Le bouton « Créer une nouvelle partie » était uniquement disponible à la fin, dans le panneau des résultats : l'instruction initiale de passer par l'accueil ne permettait pas de créer une autre salle.

Interface 0.12 : bouton déplacé hors des résultats, disponible à tout moment pour l'animateur seulement. Il quitte l'accès animateur local courant puis affiche la création d'une nouvelle salle. Ce n'est ni l'arrêt de l'ancienne session, ni son effacement ; ses joueurs peuvent y rester. L'interface ne fournit pas de sélecteur pour reprendre l'ancien accès animateur après l'avoir quitté. Une véritable commande d'arrêt de partie reste hors de ce correctif.

Cache porté à `kuikuiz-mock-shell-v3` ; fermer les onglets après préparation pour activer la mise à jour, sans effacer les données du site. Test Chrome PC positif : trois questions, nouvelle salle, question suivante en pause, création d'une troisième salle avec code distinct ; l'ancien joueur retrouve encore son ancienne question en pause après rechargement. Bouton caché aux joueurs. Recettes du cache et de son cycle de mise à jour positives. Moteur, base v3 et certificats conservés ; essai d'arrêt pendant chronomètre actif toujours à réaliser.

APK 0.12 compilé et installé avec `install -r`, hôte relancé par le bouton natif vérifié. Client HTTPS avec autorité explicite : ressources servies contenant un seul bouton `new-room`, visibilité animateur sans condition de fin et cache v3. Activation de ce cache sur les téléphones encore à effectuer par fermeture/réouverture des onglets après préparation.

### Interruption automatique avant échéance — salle 9D16BFBF

L'utilisateur confirme le nouveau bouton côté animateur. Côté Redmi, le retour accueil/participation rouvre l'ancienne salle ; rejoindre une autre salle reste masqué hors fin de partie. Contournement de recette : ouvrir `/joueur?code=NOUVEAU_CODE`, ce qui propose l'inscription sur la nouvelle salle sans effacer les données du site. Accessibilité du changement de salle joueur à corriger ultérieurement.

`tooling/test-android-live-interruption.mjs` est armé sur la nouvelle salle à deux joueurs avant lancement. Après la réponse Mars, il vérifie un snapshot et une ligne de registre SQL concordants, exige une marge d'au moins cinq secondes avant échéance, puis arrête de force la seule application et redémarre HTTPS/WSS par le bouton natif vérifié. Les copies de laboratoire en lecture seule restent locales et exclues de Git ; ce n'est pas une API de sauvegarde en production.

**Résultat automatisé positif le 23 novembre :** temps estimé avant arrêt 2 675 ms sur 30 000 ms, PID 14706 → 16449 ; réponse et registre strictement identiques après relance, 1 000 points ; phase restaurée `paused`, checkpoint à 2 389 ms, donc **27 611 ms restants**. Un second relevé après 1,2 seconde retrouve le même temps en pause. HTTPS et ouverture WSS vérifiés avec autorité explicite. Rapport local `artifacts/recovery-inspection/live-interruption-report.json`.

La reprise se fait au dernier checkpoint : l'écart observé entre estimation avant arrêt et checkpoint restauré est de 286 ms, auquel le temps entre mesure et mort effective du processus n'est pas quantifié. Ne pas annoncer un gel exact à la milliseconde ou une absence de recul du chronomètre. L'arrêt ne consomme pas le temps restant, et la durée totale n'est pas remise à zéro. Ce test ne couvre ni panne pendant commit ni isolement Internet. Observation de l'écran Redmi et reprise du chronomètre après cette interruption encore à confirmer manuellement.
