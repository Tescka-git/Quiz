# P12 — Réponses transactionnelles sur SQLite Node.js

## Périmètre

Expérience sur PC personnel avec Node.js 24.22.1 et SQLite 3.53.4 relevés localement. Le pilote intégré `node:sqlite` évite une dépendance npm native supplémentaire. Il est classé « release candidate » dans cette version de Node et reste un choix expérimental d'adaptateur, pas une dépendance du moteur.

Sources : [pilote Node.js utilisé](https://nodejs.org/download/release/v24.22.1/docs/api/sqlite.html), [garanties et réglages SQLite](https://www.sqlite.org/pragma.html).

## Implémentation

- Une table `sessions` conserve le dernier état JSON du moteur ; aucune reconstruction par event sourcing.
- Une table `answers` conserve les réponses acceptées, avec unicité session/soumission et session/joueur et clé étrangère vers la session.
- `BEGIN IMMEDIATE` protège la lecture, la décision métier et les écritures dans une seule transaction. Chaque appel relit l'état, sans copie mémoire autoritaire partagée entre instances.
- `COMMIT` précède le retour `confirmed: true`. Une retransmission doit correspondre à la réponse effectivement enregistrée.
- Une erreur SQL provoque un rollback ; insertion de réponse et mise à jour d'état ne peuvent pas être confirmées séparément.
- Réglages expérimentaux : `journal_mode=DELETE`, `synchronous=EXTRA`, clés étrangères actives, attente bornée de verrou de 3000 ms. Ce dernier délai est un réglage de diagnostic, pas un objectif de performance.

`synchronous=EXTRA` ajoute une synchronisation de répertoire en mode DELETE selon SQLite. Cela ne dispense pas de tester la plateforme, le système de fichiers et les pannes matérielles ; aucune promesse générale de résistance à une coupure électrique n'est déduite de ces essais.

## Tests reproductibles

```text
npm.cmd run test:persistence
npm.cmd test
```

Les tests utilisent des fichiers temporaires dédiés et le véritable artefact compilé du moteur. Les scénarios couvrent :

1. Réponse confirmée, fermeture/réouverture et retransmission : réponse conservée, un seul comptage.
2. Erreur SQL injectée par déclencheur entre insertion et mise à jour : aucune confirmation, aucun état partiel ; nouvel essai possible.
3. Deux instances d'adaptateur, lecture du dernier état, unicité et isolation entre deux sessions. Ce test séquentiel ne prouve pas une charge concurrente multi-processus.
4. Pause, reprise, refus pendant pause et clôture enregistrés.
5. Arrêt immédiat d'un processus enfant sans fermeture SQLite avant commit : retour à l'état précédent et nouvelle soumission possible.
6. Arrêt après commit, avant notification simulée : la retransmission retrouve la réponse.
7. Arrêt après notification simulée : réponse toujours présente à la réouverture.
8. Commit bloqué par une transaction de lecture : expiration de l'attente de verrou, absence de confirmation, rollback intégral puis nouvel essai réussi une fois le verrou libéré.

Les arrêts du processus enfant utilisent `process.exit`, sans fermeture SQLite ni rollback applicatif ; ils simulent un arrêt applicatif brutal, pas une coupure électrique ni un crash du système. La notification est une ligne de test reçue par le parent ; aucun échange WebSocket n'est encore assemblé. Les bases rouvertes sont contrôlées avec `integrity_check`.

## Limites et suite

**Résultat du 21 novembre 2026 :** les huit tests de persistance passent sur ce PC, et la suite globale compte 18 tests réussis. Le test TLS séparé passe également. Ces résultats sont automatisés et limités aux scénarios décrits ci-dessus.

- Adaptateur synchrone pour l'expérience ; coût et blocage de la boucle Node à mesurer sous charge avant de choisir son usage final.
- Une question par session, pas encore de manches, révision, annulation/rejeu ou migration de schéma.
- Lors de la campagne initiale P12, seule la relecture était implémentée. Le lot [P13](P13_REPRISE_GELEE.md) ajoute depuis une restauration explicite obligatoire, en pause et avec nouvelle origine de temps. L'intervalle entre dernier point sauvegardé et panne reste non reconstitué ; l'intégration jouable reste à faire.
- L'adaptateur suppose un fichier du prototype géré uniquement par lui ; pas de protection contre modification extérieure, panne disque réelle, manque d'espace réel ou changement incompatible de version moteur. Ces validations restent à ajouter.
- Aucune validation SQLite Android ni serveur réseau complet. Le succès Node ne prouve pas l'invariant de bout en bout sur téléphone.

Voir le [contrat expérimental](../../packages/persistence/README.md). La prochaine étape sera la reprise gelée et la conformité Android, puis l'assemblage réseau avec confirmation après commit.
