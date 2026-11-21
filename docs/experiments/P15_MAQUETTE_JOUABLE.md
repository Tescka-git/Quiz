# P15 — Première question jouable sur PC personnel

## Parcours disponible

Une salle d'attente, une question QCM isolée, deux interfaces web, 30 secondes, réponse définitive, 1000 points fixes si correcte, pause/reprise, révélation manuelle et classement final. La question et son contenu sont copiés à la création de la salle ; les joueurs admis sont figés au lancement.

Cette maquette assemble pour la première fois moteur partagé, SQLite et serveur WebSocket Node. Elle est volontairement limitée à une question, pas encore au quiz de trois questions envisagé ensuite.

## Démarrer et essayer

Depuis la racine du dépôt, Node.js 24 avec dépendances installées :

```powershell
npm.cmd run dev:mock
```

Ouvrir **http://localhost:4180** sur le PC personnel.

1. Choisir **J'anime la partie**, puis **Créer une partie**.
2. Ouvrir le lien **Ouvrir un onglet joueur** ou `/joueur` dans un autre onglet.
3. Saisir le code et un pseudo, puis rejoindre la salle.
4. Depuis l'animateur, lancer la question ; répondre dans l'onglet joueur.
5. Tester pause et reprise, puis révéler les résultats. Une réponse confirmée ne peut plus être modifiée.

Les accès animateur et joueur sont distincts et conservés localement par le navigateur. Revenir à l'accueil ne les efface pas. Pour plusieurs joueurs indépendants sur le même PC, utiliser des profils/contextes de navigateur différents ; plusieurs onglets d'un même profil retrouvent le même joueur. Le code de salle autorise une inscription avant lancement, pas un contrôle animateur.

L'animateur peut créer une autre partie après les résultats. La maquette ne propose pas encore de liste pour retrouver toutes les anciennes salles : elle mémorise le dernier accès par rôle. Une remise à zéro explicite de l'accès est proposée lorsqu'il est devenu invalide.

Le serveur est limité à `127.0.0.1:4180` : cette étape ne permet pas encore à un téléphone de rejoindre. Aucun serveur n'est installé sur un PC professionnel ; aucun déploiement ni relais distant.

## Organisation

| Élément | Fichiers |
|---|---|
| Validation des messages v1 | `packages/protocol/mock.mjs` |
| Adaptateur HTTP/WebSocket | `apps/server-node/mock-server.mjs` |
| Salles, identités et projection de l'état | `apps/server-node/mock-rooms.mjs` |
| Stockage des réponses | `apps/server-node/persistence/sqlite-session-store.mjs` |
| Interfaces locales | `apps/web/mock/` |
| Tests réseau | `tests/integration/mock-server.test.mjs` |
| Essai Chrome automatisé | `tooling/test-mock-browser.mjs` |

`ws` appartient au serveur, Playwright Core aux outils de test ; aucune dépendance d'exécution n'est ajoutée au moteur. Chrome installé est utilisé sans téléchargement d'un navigateur. L'artefact moteur est vérifié par SHA-256 avant chargement.

## Fiabilité et reprise

- Les commandes réseau sont validées ; le serveur associe la réponse à l'identité authentifiée de la connexion, et ignore un éventuel joueur ou score fourni par le client.
- Seul l'accès animateur de la salle peut lancer, mettre en pause, reprendre et révéler.
- Correction et classement ne sont pas transmis avant révélation. Les clients ne reçoivent pas l'état interne complet du moteur.
- Le résultat de réponse est envoyé après le retour du stockage, donc après commit. En cas d'erreur SQLite, aucune réponse n'est annoncée confirmée.
- Une reconnexion retrouve l'état et la réponse enregistrée. Une réponse non confirmée peut être renvoyée explicitement avec le même identifiant ; un brouillon n'est pas soumis automatiquement.
- Au redémarrage du serveur, les sessions déjà lancées sont restaurées en pause au dernier point sauvegardé, sauf celles déjà clôturées. L'animateur initial retrouve son accès et reprend explicitement.

Une diffusion toutes les 500 ms, un checkpoint toutes les 1000 ms, un délai de confirmation UI de 8 secondes, une reconnexion à 2 secondes et une limite de 40 messages/seconde par connexion sont des réglages opérationnels expérimentaux. Ils ne constituent pas des seuils de performance validés et seront réévalués par les mesures. La reprise reste limitée au dernier checkpoint.

## Tests

```powershell
npm.cmd run test:mock
npm.cmd run test:mock:browser
npm.cmd test
```

Les tests WebSocket utilisent un vrai serveur et de vrais clients, avec un temps autoritaire contrôlé : partie complète, droits, masquage des résultats, pause, échéance, refus d'arrivée tardive, erreur SQL sans confirmation, reconnexion et redémarrage avec réponse unique. Le redémarrage de ce test réseau est une fermeture/réouverture du serveur ; les arrêts brutaux restent couverts séparément par P12/P14.

Le scénario Chrome joue avec un animateur et deux contextes joueurs distincts, dont un viewport mobile. Il vérifie aussi le rechargement du joueur après confirmation et l'absence de débordement horizontal sur ce viewport. Ce viewport ne remplace pas un téléphone physique. Captures générées dans `artifacts/mock-preview`, non versionnées.

Résultat au 21 novembre 2026 : **27 tests Node positifs**, test TLS séparé positif et parcours Chrome automatisé positif. Le scénario navigateur vérifie également le passage à une nouvelle salle depuis le même profil joueur. L'accueil du serveur manuel sur localhost a répondu HTTP 200.

## Limites

Pas encore de trois questions, éditeur, comptes, équipes, médias ou rapport final hors ligne. Le navigateur affiche un compte à rebours indicatif ; seule l'heure de réception serveur décide. Le classement correspond à une question isolée, pas à une manche dont il faudrait masquer les scores.

Les accès sont des jetons locaux dont seule l'empreinte est conservée côté serveur. HTTP/ws sur boucle locale, contrôle d'origine WebSocket, limites de messages et taille maximale de 4096 octets servent à cette maquette locale ; ce n'est pas une solution d'authentification ou de sécurité pour une exposition Internet. Ne pas publier ce serveur tel quel ni réutiliser des informations personnelles réelles.

La base `.tools/mock/game.sqlite` contient salles, inscriptions et réponses fictives ; elle est exclue de Git. Le moteur associé est figé par empreinte et les migrations de schéma ou de version ne sont pas implémentées. Le prototype reste à mesurer sous charge, et le stockage synchrone peut bloquer les échanges pendant un commit ou une attente de verrou.

Prochaines étapes : essai manuel de cette question, extension à trois questions avec score cumulé, client sur Pixel, puis assemblage de ce parcours sur l'hôte Android et validation hors Internet.
