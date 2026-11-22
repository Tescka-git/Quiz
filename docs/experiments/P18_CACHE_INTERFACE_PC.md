# P18 — Cache de l'interface, premier lot sur PC

**22 novembre 2026.** Premier lot après [P17](P17_HTTPS_WSS_ANDROID.md) : rendre les écrans rechargeables lorsque le serveur est arrêté, sans simuler un hôte ni des confirmations dans le navigateur.

## Résultat et portée

Le scénario automatisé passe dans **Chrome PC 157.0.8103.79**, sur une origine HTTP de boucle locale, contexte sécurisé spécial de développement. Le serveur Node est réellement arrêté, puis relancé à la même adresse avec la même base SQLite.

- Accueil, animateur et joueur préparés sont rechargeables après l'arrêt du serveur, y compris une URL joueur avec code en paramètre.
- Une absence d'hôte est visible ; aucune création de partie, correction ou réponse fictive n'est produite.
- Après rechargement, le navigateur attend l'état autoritaire de l'hôte. Au retour de celui-ci, la réponse précédemment confirmée est retrouvée et la question est restaurée en pause.
- Un profil neuf non préparé ne peut pas charger la page avec serveur arrêté.
- Une première préparation incomplète n'est pas déclarée prête ; sa récupération est testée.
- Une ressource supprimée est réparable explicitement avec l'hôte disponible.
- Une mise à jour dont une ressource manque échoue sans supprimer l'ancienne interface fonctionnelle.
- Complément autonome : après fermeture complète de Chrome puis réouverture du même profil de test, les écrans et l'accès local sont conservés avec le serveur arrêté.
- Une mise à jour complète attend la fermeture des anciens onglets ; la nouvelle version fonctionne ensuite sans serveur, y compris après un nouveau redémarrage du navigateur. Le cache témoin d'un autre préfixe est conservé.

Rapport : [P18_CHROME_PC.json](results/P18_CHROME_PC.json). Capture et rapport détaillé dans `artifacts/mock-preview/`, exclus de Git.

Rapport complémentaire : [P18_LIFECYCLE_CHROME_PC.json](results/P18_LIFECYCLE_CHROME_PC.json). Les versions v1/v2 de ce test sont simulées dans les réponses du serveur de test, sans modifier les fichiers de l'interface. Le profil Chrome est temporaire et isolé du profil personnel ; les fermetures sont normales, pas des coupures matérielles ou un effacement des données.

**Ce lot ne valide pas le Pixel, iOS, l'installation sur l'écran d'accueil, ni HTTPS/WSS sur le point d'accès sans Internet.** Les résultats P16/P17 gardent leur portée propre. L'APK expérimental 0.8 est compilé pour préparer le prochain essai, sans installation sur le Pixel dans ce lot.

## Organisation et contenu du cache

| Élément | Rôle |
|---|---|
| `apps/web/mock/sw.js` | Installation de l'interface, réponses aux navigations et stratégie de cache. |
| `apps/web/mock/offline.js` | Contrôle visible des ressources et réparation explicite du cache incomplet. |
| `manifest.webmanifest`, `icon.svg` | Métadonnées de la maquette ; installabilité physique non déclarée validée. |
| `app.js` | Démarrage des écrans indépendant de la disponibilité de la configuration ; statut de l'hôte et reconnexion. |
| Adaptateurs Node et Android | Routes statiques explicites et types MIME correspondants. |
| `tooling/test-mock-offline.mjs` | Recette sur vrai serveur, arrêt/reprise et pannes de ressources injectées. |
| `tooling/test-offline-lifecycle.mjs` | Profil conservé entre fermetures de Chrome et cycle de mise à jour complète, sans activation forcée. |

Le moteur TypeScript, le protocole métier et les schémas SQLite ne changent pas. Aucune dépendance ajoutée.

Le cache **`kuikuiz-mock-shell-v1`** contient uniquement :

```text
/
/app.js
/offline.js
/style.css
/manifest.webmanifest
/icon.svg
/connection.json
```

Le HTML commun est réutilisé pour `/animateur` et `/joueur`. Les paramètres de navigation sont lus depuis l'URL courante, sans créer une copie de cache pour chaque code. Les URL inconnues ne reçoivent pas arbitrairement l'accueil.

`connection.json` contient seulement l'adresse WebSocket de cet hôte. Il est demandé au réseau en priorité, avec retour à la dernière configuration préparée en cas d'échec. La configuration reste propre à son origine : changer adresse, port ou protocole signifie changer d'origine et nécessite une préparation correspondante.

**Aucune réponse, score, correction, clé ou réponse d'API de création ne va dans ce cache.** Les requêtes POST et les URL API ne sont pas interceptées. Les accès animateur/joueur restent dans le stockage local préexistant ; aucune file d'envoi de réponses hors ligne n'est créée. La confirmation reste émise après commit côté hôte.

Les ressources de l'interface sont servies depuis le cache de la version active. Une ressource manquante est récupérée si le réseau le permet. L'installation groupe les ressources avec `Cache.addAll` ; une ressource en erreur empêche la nouvelle version d'être prête.

Le service worker ne force pas `skipWaiting` : une nouvelle version attend que l'ancienne ne soit plus utilisée. L'activation supprime uniquement les anciens caches du préfixe de cette maquette, pas les autres données du navigateur ni les diagnostics indépendants. La préparation ne garantit pas que le navigateur conservera indéfiniment ses données.

Références API : [cycle de vie des service workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers), [Cache.addAll](https://developer.mozilla.org/en-US/docs/Web/API/Cache/addAll).

## Utilisation

```powershell
npm.cmd run dev:mock
```

1. Ouvrir `http://localhost:4180` avec l'hôte disponible.
2. Attendre **Écrans disponibles hors ligne. L'hôte reste nécessaire pour jouer.**
3. Au besoin, utiliser **Préparer / vérifier l'accès hors ligne**. Un état incomplet reste signalé ; une réparation nécessite les ressources encore disponibles sur l'hôte.
4. Arrêter le serveur puis recharger la **même origine**, l'accueil ou les pages animateur/joueur. L'interface doit rester lisible ; le jeu attend l'hôte.
5. Relancer le serveur avec sa base conservée : les accès précédents se reconnectent et récupèrent l'état sauvegardé.

Une page préparée n'implique ni hôte joignable ni partie récupérée. Le statut du cache et celui de la connexion sont donc distincts. Aucun résultat d'une ancienne page n'est reconstruit comme une confirmation après rechargement hors ligne.

Sur une adresse HTTP de réseau local ordinaire, la préparation par service worker n'est pas disponible ; le jeu HTTP connecté reste utilisable. Le futur essai Pixel utilisera l'origine HTTPS du laboratoire, sous réserve de ses certificats et permissions.

## Tests

```powershell
npm.cmd run test:mock:offline
npm.cmd run test:mock:offline-lifecycle
npm.cmd run test:mock:browser
npm.cmd test
npm.cmd run test:tls
```

La recette dédiée utilise le véritable adaptateur Node ; seul le chargement de fichiers est injectable pour provoquer une ressource indisponible et une mise à jour incomplète. Aucun point d'API de panne n'est exposé. Le scénario existant de trois questions vérifie la régression du jeu avec le service worker présent.

Les délais de repli configuration (1,5 seconde), de démarrage client (2,5 secondes) et de réparation explicite (3 secondes) sont des réglages du prototype, pas des objectifs de performance validés. La coupure de ce test est un arrêt du serveur ; il ne s'agit pas d'une certification d'absence de tout accès Internet sur la machine.

## Maintenance et suite

À chaque changement des fichiers de l'interface, modifier ensemble la version dans `sw.js` et `offline.js`, puis actualiser les attentes de `test-mock-offline.mjs`. Fermer les anciens onglets pour permettre l'activation d'une mise à jour en attente. Ne pas forcer son activation au milieu d'une partie.

Le prochain lot consiste à installer et tester ces ressources sur le Pixel : premier chargement HTTPS, préparation, arrêt de l'hôte, rechargement, retour du service et parcours tactile. Ensuite seulement, combiner avec le réseau sans Internet et résoudre le certificat de l'adresse du point d'accès. Une réussite sur localhost PC ne suffit pas pour ces configurations.

La [recette P19](P19_RECETTE_CACHE_PIXEL.md) est prête pour le retour de l'utilisateur. Ses cases restent non exécutées ; la préparation et les tests complémentaires ci-dessus n'ont nécessité aucun accès au Pixel.
