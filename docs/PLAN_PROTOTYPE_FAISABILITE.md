# Kuikuiz — Plan du premier prototype de faisabilité

**Date :** 16 novembre 2026  
**Statut :** organisation validée pour préparer l'implémentation ; technologies candidates à vérifier avant sélection.  
**Références :** `AGENTS.md`, `docs/SPECIFICATIONS.md`, `docs/ARCHITECTURE.md`, `docs/QUESTIONS_OUVERTES.md`.

## 1. Objectif et priorités

Démontrer la faisabilité technique d'une session minimale, en donnant la priorité à l'hébergement Android, à la connexion locale sécurisée d'une PWA préchargée et à la fiabilité des réponses.

Deux chantiers démarrent dès le départ :

- Une expérimentation Android/PWA indépendante du serveur de jeu Node.js.
- Un socle TypeScript modulaire et testable pour préparer le prototype jouable.

L'expérimentation locale n'attend pas la fin du prototype Node.js. Aucun choix de runtime Android ni de parcours HTTPS/WSS local n'est considéré comme acquis.

## 2. Périmètre fonctionnel minimal

- Quiz de test figé au lancement, composé de quelques QCM à réponse unique et de questions isolées.
- Salle d'attente, identité joueur conservée localement et état de préparation.
- Progression manuelle par l'animateur : lancement, pause, reprise et révélation de la correction.
- Chronomètre commun, réponse définitive et score individuel.
- Reconnexion des joueurs déjà admis et restauration après arrêt de l'hôte.
- Petit média de test pour éprouver le préchargement.

Sont différés : équipes, IA, éditeur de quiz, comptes, collaboration, animations et QCM multiréponses dont les cas limites restent à préciser. Ce périmètre expérimental ne remplace pas les exigences fonctionnelles du produit.

## 3. Invariants et objectifs de performance

### Invariants fonctionnels

- Aucune réponse confirmée ne doit être perdue après redémarrage.
- Une soumission ne doit être comptabilisée qu'une fois, y compris après retransmission.
- Une réponse soumise est définitive ; les réponses pendant la pause ou hors délai sont refusées.
- Le temps de réception côté hôte fait foi.
- La reconnexion restitue l'état accepté ; un brouillon n'est jamais envoyé automatiquement.
- Les droits d'animation sont indépendants du rôle d'hôte technique.

### Mesures avant fixation des seuils

Mesurer latence, variabilité des échanges, retard de confirmation, écarts du chronomètre affiché, messages manquants ou dupliqués, reconnexion, restauration, mémoire, processeur, batterie et capacité observée.

Les seuils de latence, de reconnexion et de capacité seront proposés après les premières mesures. Les essais prévus portent sur 30 joueurs simulés, puis 30 téléphones physiques ; ils ne constituent pas une capacité déjà démontrée.

## 4. Arborescence proposée

```text
Kuikuiz/
├── AGENTS.md
├── package.json                 # Commandes communes et workspaces
├── package-lock.json
├── tsconfig.base.json
├── docs/
│   ├── SPECIFICATIONS.md
│   ├── ARCHITECTURE.md
│   ├── QUESTIONS_OUVERTES.md
│   ├── PLAN_PROTOTYPE_FAISABILITE.md
│   └── experiments/              # Protocoles, appareils, mesures, conclusions
├── packages/
│   ├── engine/                   # Règles métier TypeScript pures
│   ├── protocol/                 # Messages réseau et validation
│   └── persistence/              # Contrat de stockage et tests communs
├── apps/
│   ├── server-node/              # WebSocket, orchestration et SQLite Node.js
│   ├── web/                      # Interfaces joueur et animateur, PWA
│   └── android-host/             # Enveloppe Android et adaptateurs natifs
├── experiments/
│   └── android-local-pwa/
│       ├── web/                  # PWA minimale : cache, connexion, ping
│       └── android/              # Serveur WebSocket Android expérimental
├── tests/
│   ├── integration/              # Moteur, protocole et stockage assemblés
│   ├── browser/                  # Parcours navigateur
│   ├── load/                     # Joueurs simulés et scénarios réseau
│   └── fixtures/                 # Quiz et jeux de données minimaux
└── tooling/                      # Collecte et synthèse des mesures
```

Cette arborescence est une cible de préparation, pas la description de fichiers déjà créés. Les tests unitaires restent à proximité des modules. Le dossier `tests/` accueille les vérifications qui traversent plusieurs modules.

L'expérience Android est petite et jetable : elle prouve la connexion locale avant une éventuelle intégration au produit.

## 5. Responsabilités des modules

| Module | Responsabilité et limites |
|---|---|
| `engine` | Transitions, chronomètre logique, admissibilité des réponses, scores et classement. Aucun accès réseau, stockage ou Android. L'heure et les commandes sont fournies explicitement. |
| `protocol` | Messages versionnés, identifiants de commande, validation et erreurs. Ne dépend pas du moteur. |
| `persistence` | Contrat de transaction, sauvegarde et restauration ; tests de conformité applicables aux adaptateurs. |
| `server-node` | Contrôle des rôles de session, réception des commandes, transactions SQLite, confirmation après validation du commit et diffusion de l'état. |
| `web` | Interfaces joueur et animateur distinctes, cache PWA, état de connexion et brouillons locaux. |
| `android-host` | Exécution du moteur partagé, serveur local, stockage et cycle de vie Android. Solution d'exécution à valider. |
| `tests/load` | Simulation de joueurs via le protocole public, sans appel direct aux fonctions internes du serveur. |

L'identité de l'animateur est indépendante de l'appareil hôte. Héberger une session ne donne pas les droits d'animation. Le téléphone hôte peut afficher une interface joueur pendant qu'un autre appareil pilote la partie.

## 6. Dépendances techniques envisagées

Les versions exactes seront vérifiées et verrouillées au début de l'implémentation.

| Besoin | Proposition | Statut |
|---|---|---|
| Organisation du dépôt | Workspaces npm | Proposition simple, sans orchestrateur supplémentaire |
| Langage partagé | TypeScript en mode strict | Orientation validée |
| Serveur de référence | Node.js, version LTS compatible avec les dépendances retenues | Orientation validée |
| WebSocket Node.js | `ws` | Candidat |
| Validation des messages | Zod | Candidat aux frontières réseau |
| Interfaces et compilation web | Vite + TypeScript, HTML/CSS simples | Proposition ; pas de framework UI nécessaire au prototype |
| PWA expérimentale | Service worker minimal et manifeste | Proposition pour observer directement le cache |
| Persistance | SQLite avec transactions | Option privilégiée, à éprouver sur Node.js et Android |
| Tests unitaires et intégration | Vitest | Candidat |
| Tests navigateur | Playwright | Candidat ; ne remplace pas les appareils réels |
| Enveloppe Android | Kotlin + Gradle | Candidat pour réseau, stockage et cycle de vie |
| Runtime TypeScript sur Android | JavaScript compilé exécuté dans un runtime à sélectionner | Question structurante ouverte |

Le pilote SQLite Node.js, la bibliothèque WebSocket Android et le runtime JavaScript Android feront l'objet d'une vérification ciblée avant sélection. Le moteur n'importera aucun de ces composants.

Aucun besoin initial de Docker, PostgreSQL, comptes joueurs ou infrastructure cloud. Aucun serveur local n'est prévu sur un PC professionnel : celui-ci utilise un navigateur et un serveur distant autorisé.

## 7. Premières tâches de développement

| Tâche | Objectif | Livrable | Critère de validation |
|---|---|---|---|
| **1. Formaliser les expériences et invariants** | Rendre les essais reproductibles avant d'implémenter. | Matrice appareils/navigateurs/réseaux, scénarios de panne et format de mesures. | Chaque essai précise état initial, manipulations et observations attendues. Invariants et mesures de performance sont séparés. |
| **2. Expérience PWA ↔ Android sans Internet** | Vérifier immédiatement le principal risque de connectivité. | PWA préchargée avec Internet et serveur WebSocket Android minimal, sans moteur de quiz. | Sans accès Internet, la PWA démarre et tente un échange bidirectionnel. Chaque configuration est conclue par réussite, échec ou blocage identifié, avec preuves. Une réussite exige les protections normales du navigateur. |
| **3. Expérience runtime et stockage Android** | Vérifier que le même code métier peut tourner sur Android et conserver un état. | Petit module TypeScript partagé exécuté sur Node.js et Android ; écriture SQLite transactionnelle sur les deux environnements. | Les mêmes entrées produisent les mêmes résultats ; un état validé est retrouvé après arrêt du processus. Contraintes de compilation et d'intégration documentées. |
| **4. Initialiser le dépôt modulaire** | Créer les frontières de dépendances et commandes communes. | Workspaces, configurations TypeScript, compilation et commande de tests. | Tous les modules compilent ; le moteur fonctionne sans dépendance à Node.js, au navigateur ou à Android. |
| **5. Définir le protocole minimal** | Préparer connexion, commandes, confirmations et resynchronisation. | Schémas des messages, identifiants de session/joueur/soumission/tentative de question et tests. | Messages invalides rejetés ; retransmissions identifiables ; un joueur ne peut pas envoyer de commande d'animateur. |
| **6. Implémenter le moteur minimal** | Valider les règles indépendamment du transport. | Session, QCM unique, pause/reprise, correction, score et classement. | Tests déterministes des limites temporelles, réponses définitives, pauses, scores et ex aequo. |
| **7. Réaliser le stockage transactionnel** | Garantir conservation et unicité des réponses acceptées. | Schéma SQLite minimal, adaptateur Node.js et tests de conformité. | Réponse confirmée conservée au redémarrage ; retransmission sans réponse ni points supplémentaires ; aucun échec de commit ne produit de confirmation d'acceptation. |
| **8. Assembler le prototype Node.js et web** | Obtenir une première partie complète et observable. | Hôte Node.js, interfaces joueur/animateur, quiz de test et journal de diagnostic. | Deux appareils jouent une session ; pause et reconnexion fonctionnent ; l'animateur contrôle la partie depuis un appareil distinct. |
| **9. Intégrer l'hôte Android** | Porter le parcours minimal sur la solution retenue après expérimentation. | Adaptateur Android utilisant moteur et protocole partagés. | Un téléphone héberge et participe comme joueur tandis qu'un autre anime. Effets du verrouillage, de la veille et des changements d'application établis. |
| **10. Éprouver les pannes et la charge** | Vérifier les invariants et établir les premières performances. | Scénarios automatisés avec 30 joueurs, injections de panne et rapport de mesures. | Aucun cas testé ne perd ni ne double une réponse confirmée. Latence, reconnexion, ressources et capacité observée sont rapportées sans seuil inventé. |
| **11. Valider sur 30 téléphones** | Confronter les résultats aux réseaux et appareils réels. | Rapport sur point d'accès Android, routeur local et Internet/LTE. | Chaque mode dispose d'un verdict documenté, avec limites et incidents. L'essai distant dépend d'un accord préalable sur son hébergement. |

### Ordre et dépendances

- La tâche 1 prépare les essais ; les tâches 2 et 3 commencent dès le départ, sans attendre le prototype Node.js.
- Les tâches 4 à 8 construisent le socle minimal pendant l'investigation Android.
- La tâche 9 dépend des conclusions des tâches 2 et 3 et du socle partagé. Aucune intégration Android définitive avant validation du runtime et du parcours réseau.
- Les injections de panne commencent dès que le stockage et le serveur existent ; la tâche 10 rassemble ensuite les essais complets de charge.
- La tâche 11 confronte les résultats aux trois modes réseau réels.

## 8. Stratégie de persistance

Privilégier SQLite et des transactions simples. Conserver l'état de session, la version figée du quiz, les joueurs admis, les réponses et les résultats nécessaires à la restauration. Un historique ciblé couvre annulations et reprises ; il ne sert pas à reconstruire systématiquement tout l'état par event sourcing.

L'acceptation d'une réponse suit une transaction : vérifier son admissibilité, enregistrer la soumission et son résultat, valider la transaction, puis confirmer au joueur. Les contraintes d'unicité assurent l'idempotence.

Les tests couvrent notamment :

- Coupure avant enregistrement, après enregistrement et avant réception de la confirmation.
- Retransmission après perte de confirmation : récupération de l'acceptation existante.
- Échec de transaction et arrêt brutal du processus.
- Réponse dupliquée, retardée ou reçue après expiration.
- Restauration avec temps gelé, reprise ou recommencement explicite de la question.
- Distinction des tentatives de question pour refuser une ancienne réponse après recommencement.

La compatibilité des adaptateurs SQLite, les garanties de durabilité et les paramètres nécessaires seront vérifiés dans les environnements ciblés.

## 9. Protocole d'expérience locale et hors ligne

1. Charger la PWA une première fois avec Internet.
2. Vérifier les ressources disponibles hors ligne.
3. Passer sur le réseau local sans Internet.
4. Rejoindre par QR code, puis tester la saisie manuelle.
5. Tester l'échange WebSocket et le préchargement depuis l'hôte.
6. Vérifier l'état « prêt », la déconnexion et le retour.

La matrice couvre Android et iOS, avec et sans installation PWA. Chaque résultat précise appareils, systèmes, navigateurs, origines, certificats et permissions réseau.

Une page HTTP locale peut servir au diagnostic, mais ne démontre pas à elle seule le fonctionnement de la PWA prévue. Désactiver une protection du navigateur ne constitue pas une validation acceptable. Une réussite sur un seul appareil ne permet pas de généraliser.

## 10. Validation réseau et charge

Les scénarios simulés couvrent réponses simultanées, reconnexions groupées, pauses et redémarrage de l'hôte. Les essais physiques couvrent :

1. Point d'accès Android sans Internet.
2. Routeur Wi-Fi sans Internet avec hôte Android.
3. Internet/LTE avec serveur distant.

La capacité du point d'accès doit être mesurée sur les appareils disponibles. Les limites d'admission et la stabilité sont deux observations distinctes.

L'hébergement distant et tout déploiement nécessitent un accord explicite. Le développement initial reste sur PC personnel, sans contournement des politiques des PC d'entreprise.

## 11. Risques et décisions à prendre

| Risque | Conséquence | Décision après expérimentation |
|---|---|---|
| Runtime Android inadapté | Moteur partagé difficile à exécuter ou maintenir | Choisir l'intégration sur preuves |
| Restrictions HTTPS/WSS locales | PWA incapable de joindre l'hôte hors ligne | Valider le parcours réseau avant intégration |
| Limite du point d'accès | 30 joueurs impossibles dans ce mode | Documenter la limite et évaluer le routeur externe |
| Suspension Android | Interruption du serveur ou des échanges | Définir conditions d'exécution et restauration |
| Confirmation prématurée | Réponse annoncée acceptée puis perdue | Vérifier stockage avant confirmation par injection de pannes |
| Cache incomplet ou évincé | Application ou médias indisponibles | Contrôler la préparation et signaler les ressources manquantes |
| Incompatibilité SQLite/runtime | Adaptation du stockage nécessaire | Valider les adaptateurs avant intégration définitive |

Il faut distinguer la déconnexion de l'animateur et l'arrêt de l'hôte technique, puisqu'ils peuvent être deux appareils différents. Le comportement précis doit être vérifié et documenté en cohérence avec les spécifications.

Les premières décisions structurantes à faire valider sont le parcours sécurisé PWA–Android, le runtime Android et les adaptateurs SQLite. Un échec sur ces points entraîne une révision explicite de l'architecture avant poursuite de l'intégration.

## 12. Livrable final du prototype

Un prototype minimal, des essais reproductibles et des mesures permettant un verdict par configuration : démontrée, utilisable sous conditions ou encore bloquée.

Les décisions validées et leurs limites seront reportées dans les documents d'architecture et les questions ouvertes. La réalisation de toutes les fonctionnalités du produit n'est pas un critère de réussite de ce prototype.
