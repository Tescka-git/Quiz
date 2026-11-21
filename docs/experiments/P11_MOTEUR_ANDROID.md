# P11 — Même moteur sur Node.js et AndroidX JavaScriptEngine

## Choix expérimental autorisé

AndroidX JavaScriptEngine est retenu pour cette expérience uniquement, version stable 1.1.1. Le choix définitif du runtime reste ouvert selon les résultats. La disponibilité dépend du fournisseur WebView et doit être testée avec `JavaScriptSandbox.isSupported()` ; Android compatible en version ne suffit pas.

Sources : [guide Android](https://developer.android.com/develop/ui/views/layout/webapps/jsengine), [versions de la bibliothèque](https://developer.android.com/jetpack/androidx/releases/javascriptengine).

## Chaîne de preuve

1. `npm.cmd run prepare:engine-probe` compile le moteur, calcule son SHA-256 et produit la référence Node à partir du scénario JSON et du harnais commun.
2. Le projet Android embarque `artifacts/engine` comme ressources, sans autre compilation des règles. Une vérification Gradle refuse les fichiers manquants et les différences de SHA-256.
3. L'activité expérimentale vérifie le support Android, calcule le SHA-256 des octets effectivement embarqués et le compare au manifeste.
4. Elle charge le script moteur inchangé dans un isolate, puis charge séparément le harnais et le scénario.
5. Le harnais vérifie les résultats métier attendus après chaque commande et produit une trace complète. Android exige en plus une égalité exacte avec la référence JSON produite sur Node.
6. Un rapport de diagnostic est enregistré dans le stockage privé de l'application après succès. Ce petit fichier n'est pas une implémentation du stockage durable des réponses du jeu.

L'enveloppe Java ne calcule aucun score et ne réécrit aucune règle de pause ou de réponse. Le harnais commun contient uniquement les appels, assertions et collecte de résultats. Les délais de 20 secondes dans l'enveloppe bornent le diagnostic ; ils ne sont pas des objectifs de performance.

## Exécution

Préparer les ressources puis compiler la sonde Android (voir son README). Installer l'APK, ouvrir **Kuikuiz — Sonde réseau**, puis **Tester le moteur JavaScript**. L'expérience est indépendante du démarrage du serveur WebSocket.

Un résultat `PASS` exige support du sandbox, empreinte identique, attentes métier satisfaites et trace identique à Node. Un manque de support doit être rapporté comme tel, sans fallback silencieux vers WebView ou Node.js.

## État de validation

- Référence Node produite et tests Node réussis.
- Compilation Android 0.3 réussie, y compris la tâche `verifyEngineProbeAssets` ; installation et essai physique réussis.
- Pixel 7, Android 17, fournisseur WebView `com.google.android.webview` version `157.0.8103.52`.

### Résultat physique du 21 novembre 2026

L'activité affiche `PASS`. SHA-256 de l'artefact effectivement chargé :

```text
9e97b9b4816a137bb94bb88edf7f519b459b5e0b26dc3d5fa0590c239779066c
```

Les sept étapes du scénario ont satisfait les attentes métier et produit une trace identique à Node.js. Le rapport privé a été récupéré par ADB puis comparé à nouveau sur le PC : statut, empreinte et trace concordent. Copie des résultats synthétiques : [P11_PIXEL7.json](results/P11_PIXEL7.json).

**Verdict : positif sur cette configuration et ce scénario**, sans Node.js sur Android ni réécriture des règles métier. Le test est lancé dans une activité dédiée, pas dans le service réseau. Le choix définitif du runtime reste ouvert ; le support sur d'autres appareils et son fonctionnement prolongé restent à mesurer.

## Limites

Le scénario commun couvre une question, pause, refus pendant pause, reprise, deux réponses correctes, clôture, sérialisation et retransmission, avec classement ex aequo. Les autres cas limites sont testés sur Node mais ne sont pas tous encore transférés au scénario Android.

Même un succès ne démontrera pas : compatibilité sur tous les appareils Android, arrêt du runtime et récupération après panne, SQLite durable, fonctionnement prolongé dans le service, performance à 30 joueurs, WSS ou parcours PWA hors ligne. La prochaine étape après succès sera d'élargir les scénarios et les appareils avant l'intégration au serveur.
