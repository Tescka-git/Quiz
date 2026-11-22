# Kuikuiz

Application de quiz multijoueur, conviviale et personnalisable, avec modes individuel et équipe, animation de sessions et objectif de fonctionnement local sans Internet.

**Statut :** maquette de trois questions jouable sur Node et Pixel 7 hôte, avec moteur partagé et SQLite. HTTPS/WSS Android fonctionne en laboratoire ; la PWA complète hors ligne reste à démontrer. **Kuikuiz** est un nom provisoire. Aucune disponibilité juridique n'est garantie.

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

La [maquette de trois questions](docs/experiments/P16_MAQUETTE_TROIS_QUESTIONS.md) relie animateur, joueurs, moteur et SQLite : `npm.cmd run dev:mock`, puis **http://localhost:4180**. Pause/reprise, progression manuelle, cumul et classement final sont disponibles. Le Pixel a été testé comme joueur Chrome du serveur Node HTTPS/WSS, puis comme hôte du même parcours pour les navigateurs du PC.

Le parcours hébergé sur le Pixel a aussi réussi **sans Internet**, PC connecté à son point d'accès, Ethernet désactivé et accès amont du téléphone coupés. Cet essai utilise HTTP/ws.

[P17 — HTTPS/WSS Android](docs/experiments/P17_HTTPS_WSS_ANDROID.md) ajoute un mode sécurisé de laboratoire sur le Wi-Fi habituel, avec le certificat de test existant, trois questions et Chrome Pixel. Le mode WSS du point d'accès et le cache PWA restent à valider séparément.

[P18 — Cache de l'interface sur PC](docs/experiments/P18_CACHE_INTERFACE_PC.md) permet maintenant de recharger les écrans après arrêt du serveur et de retrouver l'état de jeu à son retour. Le contrôle de préparation, les ressources manquantes et les mises à jour incomplètes sont testés dans Chrome PC : `npm.cmd run test:mock:offline`. Cette version est compilée pour Android, sans nouvel essai Pixel dans ce lot.

Le complément `npm.cmd run test:mock:offline-lifecycle` vérifie aussi la réouverture complète de Chrome sans serveur et l'activation d'une mise à jour après fermeture des anciens onglets. La [recette Pixel P19](docs/experiments/P19_RECETTE_CACHE_PIXEL.md) regroupe la procédure physique et ses résultats.

Depuis [P19](docs/experiments/P19_RECETTE_CACHE_PIXEL.md), le cache est aussi testé automatiquement sur le Pixel en HTTPS : rechargement hôte arrêté, réponse durable retrouvée, classement à 3 000 points et réparation ciblée. APK 0.8 installé ; l'utilisateur a aussi terminé le parcours tactile. L'ergonomie reste à retravailler après les risques techniques. Ces essais ne valident pas le mode WSS du point d'accès sans Internet.

L'[expérience SQLite Android](docs/experiments/P14_SQLITE_ANDROID.md) reste la preuve isolée de durabilité. [P16](docs/experiments/P16_MAQUETTE_TROIS_QUESTIONS.md) assemble maintenant stockage et réseau : reprise en deuxième question après arrêt forcé, réponses confirmées conservées, puis fin du quiz à 3 000 points.

La première [expérience de persistance SQLite Node](docs/experiments/P12_SQLITE_NODE.md) ajoute des transactions et des tests de redémarrage : `npm.cmd run test:persistence`. Les essais réseau complémentaires sont décrits dans P15/P16 ; ils ne démontrent pas une résistance à toute panne matérielle.

Le [moteur TypeScript expérimental](packages/engine/README.md) est disponible : `npm.cmd run build:engine` produit un artefact autonome et son empreinte, `npm.cmd run test:engine` vérifie les règles et contrôles de portabilité sur Node.js. Le même artefact s'exécute sur le Pixel sans Node.js.
Expériences Android/PWA et portabilité du même moteur compilé dès le départ, indépendamment du serveur de jeu Node.js. Les choix précis d'implémentation Android restent ouverts.

Avec Node.js 24 ou supérieur :

```powershell
npm.cmd ci
npm.cmd test
npm.cmd run dev:diagnostic
```

Ouvrir `http://localhost:4173`. Ce serveur prépare la sonde sur le PC uniquement ; il ne démontre pas la connexion d'une PWA HTTPS à un hôte Android. Voir le protocole d'expérience avant tout essai téléphone.

**Date de référence :** 22 novembre 2026 — prototype expérimental.
