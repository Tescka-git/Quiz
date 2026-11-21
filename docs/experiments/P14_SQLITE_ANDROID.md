# P14 — SQLite Android et arrêt forcé de la sonde

## Périmètre

Sonde 0.5, données fictives, base privée `kuikuiz-durability-v1.db`. SQLite utilise les API natives Android ; aucun serveur SQL ni nouvelle bibliothèque de stockage n'est installé. Le moteur compilé reste l'autorité des règles via AndroidX JavaScriptEngine, sans réécriture des scores en Java.

L'adaptateur `AndroidSessionStore` enregistre l'état JSON et la réponse dans une même transaction, avec unicité session/soumission et session/joueur. Il vérifie l'empreinte du moteur avant de relire une session et exige une restauration avant les commandes d'une session existante.

La confirmation est ajoutée au résultat seulement après le retour réussi de `endTransaction()`. `setTransactionSuccessful()` prépare le commit mais n'est pas à lui seul une confirmation durable. Référence : [transactions SQLite Android](https://developer.android.com/reference/android/database/sqlite/SQLiteDatabase).

Les réglages sont relevés sur l'appareil : journal DELETE, synchronisation EXTRA et clés étrangères activées. Sans WAL, l'expérience utilise une connexion principale ; sur API 30+, les pragmas de connexion sont appliqués par `execPerConnectionSQL`. Le comportement sur les anciennes API reste à tester.

## Parcours en deux phases

1. Préparer les ressources avec `npm.cmd run prepare:recovery-probe`, compiler puis installer la sonde.
2. Ouvrir **Tester SQLite après arrêt forcé**, puis **1. Préparer une session fictive**.
3. La sonde crée une session avec identifiant unique, enregistre une réponse à 2000 ms (860 points) puis un checkpoint à 4000 ms. Elle affiche `PRÉPARÉ` après les commits et conserve la connexion SQLite ouverte.
4. Forcer l'arrêt de `fr.kuikuiz.probe` par ADB (`am force-stop`), sans effacer les données et sans désinstaller. Vérifier la disparition du processus.
5. Rouvrir la sonde puis le test SQLite et choisir **2. Vérifier après arrêt forcé**, sans préparer une autre session.
6. Le test exige un nouveau PID et la même session que le témoin de préparation. Il restaure en pause avec une nouvelle origine de temps, retrouve la réponse, refuse une réponse pendant pause et confirme la retransmission sans doublon.
7. Après reprise explicite, une panne d'écriture est injectée par déclencheur SQLite : aucun résultat confirmé ne doit revenir et les écritures partielles doivent être annulées. Le déclencheur est retiré, puis un nouvel envoi réussit (650 points à 5000 ms de jeu).
8. Vérifier deux réponses uniques et `integrity_check=ok`, relever la version SQLite et enregistrer le rapport privé `durability-result.json`.

Chaque préparation crée une nouvelle session fictive ; elle ne détruit pas les précédentes. Cette expérience n'est pas un éditeur de quiz ou une interface animateur finale. Le témoin JSON sert au contrôle du test, pas de stockage alternatif des réponses.

## État des résultats

**Essai positif le 21 novembre 2026 sur Pixel 7 / Android 17**, sonde 0.5, moteur SHA-256 `0872b5a0ce435b0a1b1e31ceed2a187810e785061f54bbe113783cbc9274ec02`.

- Préparation : processus 29872, réponse confirmée et checkpoint à 4000 ms ; connexion SQLite conservée ouverte.
- Arrêt forcé exécuté ; `pidof fr.kuikuiz.probe` ne trouve plus de processus.
- Récupération : nouveau processus 30454, même identifiant de session et même empreinte moteur.
- Réponse initiale conservée à 860 points ; état restauré en pause à 4000 ms ; réponse pendant pause refusée.
- Retransmission confirmée comme doublon, sans réponse supplémentaire.
- Erreur SQL injectée : rollback vérifié ; après retrait de l'erreur et reprise, seconde réponse à 650 points, deux réponses uniques.
- `integrity_check` vérifié dans le test. SQLite relevé : **3.50.6**, journal **delete**, synchronisation **3 (EXTRA)**.

Le rapport a été récupéré et contrôlé une seconde fois sur PC : statut, identifiant de session, différence des PID, empreinte, pause, scores et nombre de réponses concordent. Voir [P14_PIXEL7.json](results/P14_PIXEL7.json). La préparation et la vérification sont déclenchées via les boutons par ADB ; les assertions métier passent dans l'application.

L'adaptateur est exécuté par un worker unique dans cette expérience ; il n'est pas une API concurrente multijoueur prête à intégrer sans orchestration.

## Limites

- L'arrêt forcé est exécuté après les commits de réponse et de checkpoint : il ne teste pas encore un arrêt au milieu d'une transaction Android.
- Le témoin et le résultat affiché représentent une confirmation locale après commit ; aucun accusé WebSocket n'est délivré à un joueur.
- La base Android n'est pas comparée octet pour octet à la base Node ; les invariants fonctionnels visés sont identiques, avec deux adaptateurs distincts.
- Une erreur SQL injectée ne remplace pas une panne disque ou un disque plein réel.
- Ni coupure électrique, redémarrage du système, charge à 30 joueurs, fonctionnement prolongé, migration de schéma ou intégration du stockage au service réseau ne sont validés par ce test.
- La restauration repart du dernier checkpoint, pas de l'instant exact de l'arrêt, comme dans P13.
