# Kuikuiz

Application de quiz multijoueur, conviviale et personnalisable, avec modes individuel et équipe, animation de sessions et objectif de fonctionnement local sans Internet.

**Statut :** premier outillage de diagnostic PWA disponible ; faisabilité Android encore à démontrer. **Kuikuiz** est un nom provisoire. Aucune disponibilité juridique n'est garantie.

## Documentation
- [`docs/COMPRENDRE_GRADLE.md`](<docs/pour l'humain/COMPRENDRE_GRADLE.md>) : explication de la fabrication de l'application Android.
- [`docs/SCHEMAS_ARCHITECTURE.md`](<docs/pour l'humain/SCHEMAS_ARCHITECTURE.md>) : schémas commentés de l'existant et de la cible.
- [`docs/SPECIFICATIONS.md`](docs/SPECIFICATIONS.md) : fonctionnalités et règles du jeu.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) : architecture, modes d'hébergement et stratégie de validation.
- [`docs/QUESTIONS_OUVERTES.md`](docs/QUESTIONS_OUVERTES.md) : risques, hypothèses et travaux à explorer.
- [`AGENTS.md`](AGENTS.md) : instructions de travail pour Codex.
- [`docs/PLAN_PROTOTYPE_FAISABILITE.md`](docs/PLAN_PROTOTYPE_FAISABILITE.md) : organisation et critères de validation.
- [`docs/experiments/PROTOCOLE_ANDROID_PWA.md`](docs/experiments/PROTOCOLE_ANDROID_PWA.md) : première expérience et état réel des essais.
- [`docs/experiments/CHECKLIST_NAVIGATEURS.md`](docs/experiments/CHECKLIST_NAVIGATEURS.md) : matrice Android/iOS, checklist et incidents de compatibilité.

## Première étape

La [première maquette jouable](docs/experiments/P15_MAQUETTE_JOUABLE.md) relie maintenant animateur, joueurs, moteur et SQLite sur le PC personnel : `npm.cmd run dev:mock`, puis **http://localhost:4180**. Elle propose une question, pause/reprise et classement ; l'accès depuis un téléphone vient ensuite.

L'[expérience SQLite Android](docs/experiments/P14_SQLITE_ANDROID.md) est positive sur Pixel 7 pour l'arrêt forcé après commit, la reprise gelée, la retransmission sans doublon et une erreur SQL injectée. Le serveur WebSocket n'est pas encore assemblé avec ce stockage.

La première [expérience de persistance SQLite Node](docs/experiments/P12_SQLITE_NODE.md) ajoute des transactions et des tests de redémarrage : `npm.cmd run test:persistence`. La durabilité sur Android et les confirmations réseau restent à valider.

Le premier [moteur TypeScript expérimental](packages/engine/README.md) est disponible : `npm.cmd run build:engine` produit un artefact autonome et son empreinte, `npm.cmd run test:engine` vérifie les règles et contrôles de portabilité sur Node.js. Son exécution Android reste à démontrer.
Expériences Android/PWA et portabilité du même moteur compilé dès le départ, indépendamment du serveur de jeu Node.js. Les choix précis d'implémentation Android restent ouverts.

Avec Node.js 24 ou supérieur, sans installation de dépendances :

```powershell
npm.cmd test
npm.cmd run dev:diagnostic
```

Ouvrir `http://localhost:4173`. Ce serveur prépare la sonde sur le PC uniquement ; il ne démontre pas la connexion d'une PWA HTTPS à un hôte Android. Voir le protocole d'expérience avant tout essai téléphone.

**Date de référence :** 16 novembre 2026 — documentation v0.2.
