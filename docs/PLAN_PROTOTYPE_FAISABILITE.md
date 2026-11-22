# Kuikuiz — Plan du premier prototype de faisabilité

**Date :** 16 novembre 2026  
**Statut :** organisation validée pour préparer l'implémentation ; technologies candidates à vérifier avant sélection.  
**Références :** `AGENTS.md`, `docs/SPECIFICATIONS.md`, `docs/ARCHITECTURE.md`, `docs/QUESTIONS_OUVERTES.md`.

**Complément P17, 22 novembre :** [HTTPS/WSS Android de laboratoire](experiments/P17_HTTPS_WSS_ANDROID.md) est implémenté avec le certificat existant. Les contrôles TLS et le parcours Chrome Pixel sont positifs sur le Wi-Fi habituel ; le cache PWA et le mode sécurisé du point d'accès ne sont pas validés par cet essai.

**Avancement au 22 novembre 2026 :** [P16](experiments/P16_MAQUETTE_TROIS_QUESTIONS.md) apporte la maquette de trois questions avec cumul, le Pixel joueur du serveur Node HTTPS/WSS, puis l'hôte Android avec SQLite et reprise après arrêt forcé. Les étapes « trois questions », « client Pixel » et « assemblage Android sans Internet » de la progression vers une maquette sont réalisées. Ne pas confondre cette numérotation de séance avec les tâches du plan initial ci-dessous. Le jeu local HTTP/ws sans Internet est positif avec le PC client du Pixel ; WSS Android/PWA, navigateurs supplémentaires et endurance restent ouverts.

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

Les seuils de latence, de reconnexion et de capacité seront proposés après les premières mesures. Les essais automatisés restent prévus à 30 joueurs simulés. La validation physique progresse de Pixel + PC vers quelques Android/iPhone, puis environ dix téléphones disponibles. Un essai éventuel à 30 téléphones avec des collègues est différé après maturité suffisante, sans bloquer le développement initial. Aucun de ces objectifs ne constitue une capacité déjà démontrée.

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
| **3a. Expérience de portabilité du moteur** | Isoler l'exécution des mêmes règles sans Node.js sur Android. | Artefact JavaScript unique et autonome, enveloppes Node.js/Android, empreintes et scénarios JSON. | Mêmes octets vérifiés par SHA-256 ; résultats identiques et conformes aux attentes après chaque commande. Aucune règle réécrite en Kotlin. |
| **3b. Expérience de stockage Android** | Vérifier séparément la compatibilité et la durabilité SQLite. | Écritures transactionnelles sur Node.js et Android, tests d'interruption et rapport. | État validé retrouvé après arrêt du processus ; erreurs de commit sans confirmation. Ce résultat ne découle pas de la réussite de 3a. |
| **4. Initialiser le dépôt modulaire** | Créer les frontières de dépendances et commandes communes. | Workspaces, configurations TypeScript, compilation, tests et contrôles d'import/graphe/artefact. | Compilation réussie ; moteur sans dépendance d'exécution externe ; tests négatifs faisant échouer les imports directs et indirects interdits. |
| **5. Définir le protocole minimal** | Préparer connexion, commandes, confirmations et resynchronisation. | Schémas des messages, identifiants de session/joueur/soumission/tentative de question et tests. | Messages invalides rejetés ; retransmissions identifiables ; un joueur ne peut pas envoyer de commande d'animateur. |
| **6. Implémenter le moteur minimal** | Valider les règles indépendamment du transport. | Session, QCM unique, pause/reprise, correction, score et classement. | Tests déterministes des limites temporelles, réponses définitives, pauses, scores et ex aequo. |
| **7. Réaliser le stockage transactionnel** | Garantir conservation et unicité des réponses acceptées. | Schéma SQLite minimal, adaptateur Node.js et tests de conformité. | Réponse confirmée conservée au redémarrage ; retransmission sans réponse ni points supplémentaires ; aucun échec de commit ne produit de confirmation d'acceptation. |
| **8. Assembler le prototype Node.js et web** | Obtenir une première partie complète et observable. | Hôte Node.js, interfaces joueur/animateur, quiz de test et journal de diagnostic. | Deux appareils jouent une session ; pause et reconnexion fonctionnent ; l'animateur contrôle la partie depuis un appareil distinct. |
| **9. Intégrer l'hôte Android** | Porter le parcours minimal sur la solution retenue après expérimentation. | Adaptateur Android utilisant moteur et protocole partagés. | Un téléphone héberge et participe comme joueur tandis qu'un autre anime. Effets du verrouillage, de la veille et des changements d'application établis. |
| **10. Éprouver les pannes et la charge** | Vérifier les invariants et établir les premières performances. | Scénarios automatisés avec 30 joueurs, injections de panne et rapport de mesures. | Aucun cas testé ne perd ni ne double une réponse confirmée. Latence, reconnexion, ressources et capacité observée sont rapportées sans seuil inventé. |
| **11. Valider progressivement sur téléphones réels** | Confronter les résultats aux réseaux et appareils réels : quelques appareils, puis environ dix, avant un éventuel essai à 30 une fois le prototype mûr. | Rapport par effectif réel sur point d'accès Android, routeur local et Internet/LTE. | Chaque mode dispose d'un verdict documenté, avec effectif, limites et incidents ; aucune capacité à 30 annoncée sans essai correspondant. L'essai distant dépend d'un accord préalable sur son hébergement. |

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

### Extension validée le 21 novembre 2026 : projection via un relais

Le jeu reste hébergé sur Android et les joueurs utilisent son point d'accès Wi-Fi. Un PC connecté au réseau d'entreprise projette les résultats via un relais distant alimenté par la connexion mobile du téléphone. La page est en lecture seule ; les règles de révélation restent applicables. Voir `SPECIFICATIONS.md`, section 4.1, et `ARCHITECTURE.md`, section 12.

Cette extension ne retarde pas les expériences prioritaires de portabilité et de PWA locale. Elle ajoute les tâches suivantes après un parcours local minimal ; les essais réseau peuvent être préparés plus tôt si un environnement autorisé est disponible.

| Tâche | Objectif | Livrable | Critère de validation |
|---|---|---|---|
| **12. Définir le contrat de projection** | Isoler l'affichage des règles métier et du contrôle de session. | État de projection versionné, filtrage des résultats non révélés, rôles de lecture/publication et règles de reconnexion. | Aucun score masqué ni droit de commande exposé à l'écran ; aucune dépendance du moteur au relais. |
| **13. Expérimenter le relais et la projection** | Relier les deux réseaux sans exposer directement le serveur Android. | Adaptateur de publication Android, relais minimal et page web de projection dans un environnement autorisé. | Résultats locaux affichés sur le PC ; messages anciens ignorés ; panne du relais sans effet sur les réponses locales ; reprise sur le dernier état autorisé. Hébergement et déploiement soumis à accord explicite. |
| **14. Valider le montage en salle** | Vérifier la connectivité et la robustesse simultanées. | Rapport de tests point d'accès + serveur + données mobiles, PC sur réseau d'entreprise et projection, puis essai avec 30 joueurs. | Coupures mobiles, réseau entreprise et relais signalées côté projection ; jeu local continu ; aucune réponse confirmée perdue ou doublée ; délais et ressources mesurés avant fixation de seuils. |

Prévoir un adaptateur de publication côté hôte, un composant de relais distinct du serveur de jeu et une vue de projection web. L'emplacement précis dans l'arborescence, les dépendances et l'hébergement seront proposés avant leur implémentation. Aucun service distant n'est créé par cette décision documentaire.

## 13. Complément validé : portabilité Android sans Node.js

### Dépendances et frontières

Le moteur ne possède aucune dépendance d'exécution externe, directe ou transitive. Il définit les commandes et résultats métier sans importer le protocole réseau. Les adaptateurs traduisent les messages réseau vers ces commandes. Les outils de développement ne sont pas inclus dans l'artefact.

| Élément | Position | Compatibilité attendue |
|---|---|---|
| Règles TypeScript compilées et fonctions internes | Moteur | À démontrer sur le runtime Android retenu |
| Objets, tableaux, chaînes, nombres, JSON et collections standard utilisées | Moteur | Dépend du support ECMAScript à vérifier |
| Types métier | Moteur, effacés à la compilation | Aucune dépendance d'exécution |
| TypeScript, Vite, Vitest, Playwright | Développement uniquement | Non nécessaires à l'exécution Android du moteur |
| Zod et validation des messages | Adaptateurs d'entrée | Hors moteur ; compatibilité embarquée à vérifier seulement si l'adaptateur l'utilise |
| `ws` | Adaptateur Node.js | Non requis sur Android |
| SQLite et pilotes | Adaptateurs de stockage Node.js/Android | Compatibilité et durabilité à tester séparément |
| Kotlin et pont JavaScript | Enveloppe Android | Runtime et pont encore à choisir |

Contrat du moteur : **état + commande métier + contexte déterministe → nouvel état + résultat métier**. L'environnement fournit le temps logique autoritaire, les identifiants et, si nécessaire, une source de hasard contrôlée. Le moteur ne lit pas directement l'horloge et ne programme aucun temporisateur.

Les API `process`, `Buffer`, `require`, `node:*`, `window`, `document`, `fetch`, `WebSocket`, stockage navigateur et ponts Android sont exclues du moteur, ainsi que les appels directs à `Date.now()` et `Math.random()`. Les états restent sérialisables, sans fonction ni objet natif. Les calculs et tris ne dépendent pas implicitement de la locale.

L'orchestrateur sérialise les commandes d'une session. Un résultat métier admissible ne constitue pas encore une confirmation durable : celle-ci est envoyée après commit. Les droits d'animation dépendent de l'identité autorisée, jamais de la possession de l'appareil hôte.

### Contrôles automatiques

1. Compiler le moteur avec une configuration dédiée sans DOM ni types Node.js.
2. Analyser syntaxiquement les imports et références globales ; refuser imports hors moteur, imports dynamiques, `require`, chargements construits et API interdites.
3. Résoudre le graphe complet, alias et réexportations compris ; vérifier manifeste et verrouillage pour exclure les dépendances d'exécution externes directes et transitives.
4. Inspecter le JavaScript produit : aucun import résiduel, helper ou polyfill externe implicite.
5. Tester les contrôles avec des violations directes et indirectes pour vérifier leur échec effectif.
6. Compléter ces contrôles statiques par l'exécution de l'artefact sur Android.

Les outils précis de ces contrôles restent à sélectionner. Une recherche textuelle des imports `node:` ne suffit pas.

### Expérience minimale 3a

1. Compiler une seule fois le moteur en JavaScript autonome, sans chargeur Node.js ni dépendance externe.
2. Calculer son empreinte SHA-256 et vérifier que les mêmes octets sont chargés sur les deux plateformes.
3. Exécuter l'artefact sur Node.js et dans un runtime embarqué Android sans Node.js, sur appareil physique.
4. Fournir les mêmes scénarios JSON, avec temps, identifiants et ordre des commandes imposés.
5. Comparer les états et résultats normalisés après chaque commande avec les résultats attendus.

Les enveloppes chargent l'artefact et transmettent entrées/sorties ; aucune règle métier n'est réécrite en Kotlin. Couvrir ouverture de question, réponses correcte/incorrecte/tardive, seconde soumission, retransmission, pause/refus/reprise, score, ex aequo et sérialisation/rechargement/poursuite.

Critère : empreintes identiques, résultats identiques et corrects. Deux résultats identiques mais erronés ne valident pas le test. Cette sérialisation logique ne constitue pas une preuve de stockage durable.

### Portée de la preuve et validations indépendantes

| Validé par 3a si réussite | Reste à démontrer |
|---|---|
| Même moteur compilé sur les deux environnements testés | Compatibilité sur d'autres versions et appareils Android |
| Absence de dépendance Node.js nécessaire aux scénarios exécutés | Serveur WebSocket et connexions simultanées |
| Déterminisme et justesse des règles couvertes | HTTPS/WSS local, certificats et restrictions navigateur |
| Passage des données via le pont Android | Durabilité SQLite et restauration après panne |
| Sérialisation logique de l'état | Arrière-plan, verrouillage et veille |
| Compatibilité des fonctionnalités JavaScript utilisées | PWA sans Internet et capacité à 30 joueurs |

L'expérience 2 de PWA préchargée connectée sans Internet à un serveur Android reste indépendante et prioritaire. Les tâches 3a et 3b distinguent désormais portabilité du calcul et durabilité. L'intégration Android définitive dépend des conclusions de 2, 3a et 3b.

### Décisions susceptibles de bloquer la portabilité

- Runtime Android, pont natif et niveau ECMAScript cible non sélectionnés.
- API standard manquantes : transformer la syntaxe ne les fournit pas automatiquement.
- Format d'artefact imposant un chargeur spécifique ou deux compilations différentes.
- Dépendances natives, API Node.js, helpers ou polyfills implicitement ajoutés.
- État non sérialisable ou comportements dépendant de la locale et d'un ordre implicite.
- Couplage du moteur à une WebView : une réussite au premier plan ne prouve pas la continuité en arrière-plan.

Tout ajout futur d'une dépendance d'exécution du moteur exige une révision explicite de la contrainte et une nouvelle vérification. La portabilité demeure une hypothèse à démontrer, pas un résultat acquis.
