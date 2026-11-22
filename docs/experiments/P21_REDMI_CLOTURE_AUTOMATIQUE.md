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
