# Premier moteur portable — question isolée

Ce module expérimental contient les règles d'une seule question QCM à réponse unique, avec liste de joueurs figée, points fixes ou dégressifs, pause/reprise, clôture et classement de compétition. Il ne constitue pas encore un serveur de jeu ni l'ensemble du moteur final.

## Utilisation et vérification

Depuis la racine du dépôt, avec Node.js 24 et les dépendances de développement installées :

```text
npm ci
npm run build:engine
npm run test:engine
npm test
```

`artifacts/engine/engine.js` expose `KuikuizEngine` dans le contexte JavaScript où il est chargé. `manifest.json` contient son SHA-256, la version du compilateur et la mention Android non validé. Ces fichiers générés sont exclus de Git. Le test Node charge cet artefact, pas une version alternative des règles.

## Contrat

- `create(question, players, nowMs)` fige une copie de la configuration initiale.
- `apply(state, command, nowMs)` retourne un nouvel état et un résultat sans modifier ses entrées. Le temps monotone autoritaire est fourni par l'appelant ; aucun accès à l'horloge du système.
- `ranking(state)` retourne le classement de cette question. L'adaptateur devra appliquer les règles de visibilité et ne pas exposer ce classement prématurément.
- `createQuiz(questions, players, nowMs)`, `applyQuiz(state, command, nowMs, questionId)` et `recoverQuiz(state, nowMs)` ajoutent la progression entre questions isolées et la reprise gelée de la question courante. `quizRanking(state)` cumule les réponses conservées avec classement de compétition. Une commande d'une autre question est refusée ; `next` exige une correction publiée et une question restante.
- `recover(state, nowMs)` restaure le dernier état sauvegardé en pause et remplace l'origine de temps ; réponses et scores restent conservés. Une session clôturée ne se rouvre pas. L'instant fourni appartient à la nouvelle horloge autoritaire et peut être inférieur au précédent.
- La commande `checkpoint` actualise le temps sans changer la phase ; son enregistrement durable appartient à l'adaptateur. En pause ou après clôture, elle n'ajoute pas de temps.
- L'appelant est responsable de la validation des données réseau, de l'authentification des commandes animateur, de la sérialisation des commandes et des transactions.

`accepted-in-memory` signifie uniquement que la règle a accepté la réponse dans l'état retourné. Ce résultat n'autorise pas une confirmation durable au joueur : celle-ci exige un commit dans un adaptateur de stockage. Les adaptateurs expérimentaux sont désormais présents sur Node et Android ; voir [P16](../../docs/experiments/P16_MAQUETTE_TROIS_QUESTIONS.md).

Une retransmission strictement identique retrouve sa réponse dans la question courante, même après clôture et sérialisation. Réutiliser son identifiant pour un autre joueur ou une autre option est un conflit. Les identifiants de soumission sont uniques à leur instance de question ; le registre des quiz les indexe par session et question. Après progression, un message de l'ancienne question est refusé sans modifier la nouvelle. Annulation et nouvelle tentative d'une même question restent hors périmètre.

## Conventions expérimentales à confirmer

- Le temps exactement égal à la durée est considéré expiré (`t >= T`). La frontière exacte reste une convention du prototype, à faire valider avant intégration finale.
- Les scores conservent la formule numérique sans arrondi ; l'affichage et une éventuelle politique d'arrondi restent ouverts. Les tests numériques tiennent compte de la représentation décimale JavaScript.
- La cible de compilation ES2017 est provisoire tant que le runtime Android n'est pas choisi et testé.
- Un namespace fournit un artefact script autonome, sans chargeur de modules. Aucun import, même interne ou de type, n'est autorisé dans ce premier fichier. Une modularisation interne future demandera un véritable graphe d'imports autorisés et des tests adaptés.

## Contrôles de portabilité

Le compilateur TypeScript 6.0.3 est verrouillé comme outil de développement pour utiliser son API JavaScript d'analyse. Il n'est pas inclus dans le moteur exécuté.

Le build refuse les dépendances npm d'exécution du manifeste moteur, les imports/réexportations/références externes et des API d'environnement ou de non-déterminisme. Il compile avec la bibliothèque ECMAScript uniquement, sans DOM ni types Node. Il vérifie les sources effectivement résolues et inspecte aussi l'artefact pour détecter les constructions interdites.

L'absence d'import et de dépendance directe exclut ici toute chaîne de dépendances d'exécution transitives. Les bibliothèques du compilateur restent des outils de développement. Ces contrôles servent de garde-fous d'architecture, pas de bac à sable pour du code hostile.

## Preuves encore absentes

Au 22 novembre, [P16](../../docs/experiments/P16_MAQUETTE_TROIS_QUESTIONS.md) vérifie également le parcours de trois questions sur le Pixel hôte, sans Node.js, avec l'empreinte `672ba13691f39a3411f540f21e92b975d9e8ac084cd04ac7c8db62e7c5a5d11e`. Le scénario réseau attend les mêmes scores et vérifie doublons/reconnexion ; la comparaison de traces P11/P13 reste attachée à ses scénarios historiques. Le manifeste de compilation garde `androidValidated: false` : un build seul ne certifie jamais Android ; les rapports documentent les essais réellement faits.

AndroidX JavaScriptEngine 1.1.1 a exécuté avec succès le même artefact sur Pixel 7 / Android 17 : empreinte identique et trace du scénario commun identique à Node.js. Le choix définitif reste ouvert. Ce résultat ne prouve ni persistance SQLite, ni charge de 30 joueurs, ni maintien en arrière-plan du futur moteur. Voir [P11](../../docs/experiments/P11_MOTEUR_ANDROID.md).

`tests/fixtures/engine-portability.json` fournit une première séquence transférable, avec attentes explicites (pause, refus, reprise, réponses, clôture, restauration et doublon). Elle est exécutée sur l'artefact par les tests Node et a réussi sur le Pixel dans l'expérience P11. Les autres cas limites sont couverts séparément par les tests du moteur et restent à transférer à la recette Android.

Le moteur a depuis évolué pour la reprise gelée : la preuve historique P11 reste attachée à son ancienne empreinte. `npm.cmd run prepare:recovery-probe` prépare le scénario `engine-recovery-portability.json` et une nouvelle référence Node pour retester l'artefact modifié sur Android ; voir [P13](../../docs/experiments/P13_REPRISE_GELEE.md). La restauration après panne n'est plus une simple désérialisation : elle exige explicitement `recover`, puis `resume` pour continuer.
