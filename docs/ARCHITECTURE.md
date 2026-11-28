# Kuikuiz — Architecture technique

État de référence : 25 novembre 2026. Ce document décrit les orientations et contraintes actuelles, pas le journal des essais.

- [État des lieux et reste à faire](ETAT_DES_LIEUX.md)
- [Cahier des charges](SPECIFICATIONS.md) : règles fonctionnelles validées, dont le buzzer à développer.
- [Questions ouvertes](QUESTIONS_OUVERTES.md) : inconnues actuelles regroupées ; chronologie conservée dans une archive séparée.
- [Historique archivé de l'architecture](archives/ARCHITECTURE_HISTORIQUE_2026-11-25.md) et [index des expériences](experiments/README.md) : preuves, incidents et limites détaillés.

## Étude de distribution sécurisée

[P25](experiments/P25_HTTPS_WSS_HORS_LABORATOIRE.md) compare les options hors laboratoire. Domaine et certificat public propres à l'hôte avec résolution locale sont proposés à l'étude ; les permissions réseau local modernes méritent une sonde distincte mais ne chiffrent pas ws. Aucun achat, déploiement ni changement des certificats existants effectué.

## Composants actuels

| Composant | Responsabilité |
|---|---|
| Moteur TypeScript | Règles déterministes, état sérialisable ; aucune dépendance d'exécution externe |
| Protocole et projection communs | Validation des messages, traduction des commandes, vues autorisées selon le rôle |
| Adaptateur Node.js | Serveur WebSocket/HTTP, orchestration et stockage SQLite sur PC de développement |
| Adaptateur Android | Runtime JavaScript embarqué, serveur local et SQLite natif ; même artefact moteur |
| Interface web jouable | Vues animateur/joueur, accès mémorisés, reconnexion et cache de l'interface |
| Atelier visuel | Simulation autonome pour discuter les écrans ; ne prouve pas de capacité métier supplémentaire |
| Tests et sondes | Portabilité, transactions, reprise, charge simulée et recettes sur appareils |

Le prototype joue trois questions à choix unique. SQLite conserve les scores et réponses ; les confirmations suivent le commit. La reprise se fait au dernier checkpoint durable, en pause. Le cache PWA ne remplace pas le serveur et ne confirme aucune réponse.

La présence provient des connexions authentifiées, avec un retard possible de détection. Le podium partagé est un état de présentation durable dans une table additive, sans changement des règles de score. La version 0.17 est validée manuellement sur Pixel/Redmi Chrome ; la 0.18 est compilée et testée automatiquement, recette physique différée. HTTPS/WSS et certificats restent une solution de laboratoire. Aucun relais distant ni buzzer n'est encore implémenté.

Les numéros de sections ci-dessous sont conservés pour faciliter la continuité avec les références existantes.

## 8. Architecture et modes réseau — décisions récentes

**Complément P20, 22 novembre :** [HTTPS/WSS sur point d'accès sans Internet](experiments/P20_WSS_POINT_ACCES_SANS_INTERNET.md) est positif dans le laboratoire. Une nouvelle feuille signée par la même autorité couvre le Wi-Fi habituel et l'adresse du point d'accès, avec clé serveur conservée et anciens fichiers source intacts. Tests stricts Node et jeu réussis sur le PC isolé ; parcours Chrome Pixel manuel terminé à 3 000 points après correction de l'adresse. Les mesures PC et le retour utilisateur sur le téléphone restent distingués. La stratégie d'adressage et de confiance pour les utilisateurs finaux reste ouverte : cette méthode exige une autorité de laboratoire approuvée et des adresses explicitement couvertes.
- Moteur de jeu commun écrit en **TypeScript**, indépendant du mode d'hébergement ; partage des règles métier et du protocole, avec adaptateurs spécifiques selon l'environnement.
- Hébergement distant sur serveur **Node.js** pour les joueurs connectés par LTE/4G/5G et Internet.
- Hébergement local du prototype sur **Android**, via une application hôte native et un runtime JavaScript embarqué sans Node.js. L'hôte peut appartenir à l'animateur ou à un joueur ; l'endurance et la diversité des appareils restent à valider.
- Android reste la cible hôte du premier prototype. L'hébergement local sur iOS/iPhone est une piste différée, sans solution sélectionnée ni faisabilité démontrée. Les joueurs sur iPhone restent visés par la PWA ; ils n'ont pas besoin de l'application hôte Android. Voir `QUESTIONS_OUVERTES.md`.
- Trois configurations : (1) point d'accès Wi-Fi du téléphone Android animateur sans Internet ; (2) routeur Wi-Fi externe sans Internet avec téléphone Android hébergeur ; (3) LTE/Internet avec serveur distant.
- Communication temps réel par **WebSocket** ; attention aux restrictions des navigateurs pour une PWA HTTPS vers une adresse locale ws:// et à l'exigence de contexte sécurisé pour les service workers.
- Les joueurs acceptent de **charger Kuikuiz une première fois avec Internet** avant une partie locale hors ligne. **Installation PWA recommandée mais facultative** ; contrôle automatique de préparation hors ligne.
- Rejoindre une session locale via **QR code**, avec saisie manuelle en secours ; fonctionnement inter-navigateurs à valider.
- En salle d'attente, préchargement des médias et contenus de la session depuis le serveur local ; état « prêt ».
- Le diagnostic réseau est **non bloquant** : mesure de la latence, de la stabilité, des pertes/retards et des déconnexions, avant et pendant la partie ; avertissement explicite, suggestion d'un autre mode de connexion si pertinent, décision finale laissée à l'animateur.

## 9. Stratégie de MVP et validation
- Priorité à la **validation de l'autonomie locale, de la connectivité et du temps réel**, et non à une simple réduction du périmètre fonctionnel.
- Tests de charge automatisés avec **30 joueurs simulés**. Validation physique progressive : Pixel + PC, quelques Android/iPhone, puis environ **dix téléphones** accessibles. Un essai éventuel avec **30 téléphones physiques** est différé jusqu'à maturité suffisante et disponibilité des collègues ; il ne bloque pas le développement initial. Tester les trois modes réseau et ne pas extrapoler les capacités physiques non mesurées.
- Mesurer d'abord les performances réelles avant de fixer les seuils d'acceptation de latence et de reconnexion.
- Mesures : latence, jitter, pertes de messages, écarts de synchronisation, temps de reconnexion, stabilité, comportement en pause et après restauration.
- Invariants de fiabilité : **aucune réponse confirmée ne doit être perdue ni comptabilisée deux fois**. Ces invariants sont distincts des objectifs de performance à fixer après mesure.
- Une expérience Android/PWA locale indépendante et une expérience de portabilité du moteur commencent dès le départ, sans attendre la fin du prototype Node.js. Voir `PLAN_PROTOTYPE_FAISABILITE.md`.
- Risques à valider : nombre réel de clients admis par le point d'accès Android, exécution du moteur TypeScript sur Android, cycle de vie/veille Android, accès HTTPS/WSS local et cache PWA sur Android/iOS, fonctionnement hors Internet.

## 11. Séparation hôte technique / animateur — décision validée
- **Hôte technique** : appareil Android qui exécute le serveur local et le moteur de jeu.
- **Animateur** : personne qui pilote la session depuis son propre téléphone ou un PC ; seul l'animateur initial détient les commandes en v1.
- Les deux rôles peuvent être portés par **deux appareils et deux personnes distincts**.
- Héberger la session ne donne aucun droit d'animation ; les permissions dépendent de l'identité autorisée de la commande.
- L'hôte technique peut être le téléphone **d'un joueur**, à condition de vérifier que son interface joueur et le serveur peuvent fonctionner simultanément et durablement.
- En mode routeur Wi-Fi externe, le téléphone hôte n'a pas besoin d'assurer lui-même le point d'accès.
- Points de validation : maintien du serveur pendant l'utilisation de l'interface joueur, verrouillage de l'écran, veille, coupure réseau, batterie et restauration de la partie.

## 12. Animation depuis un PC professionnel — décision validée
- Un PC d'entreprise fortement verrouillé n'est **pas destiné à héberger le serveur de jeu localement**.
- L'animateur y utilise **une interface web dans le navigateur**, connectée à un **serveur distant** via le réseau autorisé par l'entreprise.
- Aucun besoin prévu d'installer Node.js, Docker ou un exécutable serveur sur ce PC.
- L'accès au serveur distant reste soumis aux règles de filtrage réseau de l'entreprise ; aucun contournement de ces règles n'est prévu.
- L'idée d'un serveur Windows portable sur PC d'entreprise est **écartée du périmètre retenu**.

### Variante validée : jeu local et projection via un relais distant

Le PC peut aussi servir uniquement d'écran de projection pour une partie hébergée localement sur Android. Ce relais de projection est distinct du serveur distant qui héberge une partie Internet.

```text
Téléphones joueurs -- Wi-Fi du point d'accès --> Android : moteur et serveur local
                                                        |
                                                  Internet mobile
                                                        |
                                                        v
                                                Relais de projection
                                                        ^
                                                        |
                                              Internet entreprise
                                                        |
                                                PC web --> Projecteur
```

- L'hôte publie uniquement l'état autorisé pour l'écran commun ; pas de réponses individuelles destinées à être traitées par le relais, pas de règles métier ni de calcul des scores dans le relais.
- Les échanges de projection sont sécurisés en HTTPS/WSS ; mécanismes d'accès, association à la session et protocole restent à choisir. Le rôle de projection ne donne aucun droit d'animation.
- L'adaptateur de publication et le relais sont séparés du moteur. Une panne de publication ne bloque ni traitement local ni confirmation des réponses.
- Prévoir un état de projection versionné et une resynchronisation vers le dernier état autorisé après reconnexion, sans réaffichage d'un état ancien reçu en retard. Signaler la perte de connexion côté écran.
- Valider simultanément point d'accès Wi-Fi, serveur Android, connexion mobile sortante et accès depuis le navigateur d'entreprise, sans contournement des politiques réseau.
- Ce scénario ajoute un relais Internet au besoin démontré, sans choisir d'hébergeur ni autoriser de déploiement. Il ne remplace pas les essais locaux sans Internet et ne garantit pas l'égalité des latences entre joueurs.

## 13. Hébergement distant de test — à approfondir
- Aucun hébergeur ni serveur distant définitif n'est choisi à ce stade.
- Le NAS personnel **Synology DS212j (256 Mo)** n'est **pas retenu** comme serveur de test : plateforme trop ancienne et limitée, particulièrement pour une exposition sur Internet.
- Vérifier ultérieurement si le Raspberry Pi disponible est un **modèle 3 ou 4**, puis tester sa capacité à héberger le serveur Node.js et une trentaine de joueurs.
- Étudier l'accès Internet sécurisé (HTTPS/WSS, nom DNS, connectivité et protection du réseau domestique) et comparer avec un petit hébergement cloud.
- Ce choix **ne bloque pas** le développement initial sur PC personnel.

## 14. Portabilité du moteur — contraintes permanentes

- Le moteur TypeScript ne possède **aucune dépendance d'exécution externe**, directe ou transitive. TypeScript et les outils de compilation/test sont des dépendances de développement, absentes de l'artefact exécuté.
- Le moteur utilise un sous-ensemble explicite de JavaScript standard dont le support sera vérifié sur le runtime Android retenu. Le prototype utilise AndroidX JavaScriptEngine ; les versions et paramètres effectifs sont décrits par les fichiers de compilation. La preuve sur Pixel ne couvre pas tous les appareils Android.
- Il définit ses commandes et résultats métier et ne dépend pas du protocole réseau. Les adaptateurs traduisent les messages vers les commandes métier. Zod, `ws`, SQLite, les pilotes natifs et les outils web restent hors du moteur.
- Son contrat est une transformation : état + commande + contexte déterministe → nouvel état + résultat métier. Le temps logique autoritaire et les identifiants sont fournis ; tout hasard nécessaire est explicitement contrôlé.
- Les API Node.js, navigateur et Android restent dans les adaptateurs. Le moteur n'utilise pas `process`, `Buffer`, `require`, `node:*`, `window`, `document`, `fetch`, `WebSocket`, les stockages navigateur ou les ponts Android. Il ne lit pas directement `Date.now()`, `Math.random()` et ne programme pas de temporisateur.
- Les états sont des données sérialisables, sans fonction ni objet natif. Les tris, départages et calculs définissent leurs règles sans dépendre implicitement de la locale ou de l'ordre des données.
- L'orchestrateur sérialise les commandes d'une session et distingue résultat métier et confirmation durable : une réponse n'est confirmée au joueur qu'après commit. SQLite transactionnel est privilégié, avec adaptateurs Node.js et Android à vérifier ; pas d'event sourcing général.

### Contrôles automatiques à conserver

- Configuration TypeScript du moteur sans DOM ni types Node.js.
- Analyse syntaxique des imports et références globales : refus des imports hors moteur, imports dynamiques, `require`, chargements construits et API interdites.
- Analyse du graphe résolu, incluant alias et réexportations, et contrôle du manifeste/fichier de verrouillage : aucune dépendance d'exécution externe directe ou transitive.
- Inspection de l'artefact pour détecter imports résiduels, helpers et polyfills implicitement ajoutés.
- Tests négatifs prouvant qu'une violation directe ou indirecte fait échouer les contrôles.
- Exécution sur Android du même artefact en complément des contrôles statiques.

### Jalon : même artefact sur Node.js et Android

Compiler une seule fois un artefact JavaScript autonome, puis charger exactement les mêmes octets sur Node.js et dans un runtime JavaScript Android **sans Node.js**. Comparer les empreintes SHA-256 et exécuter les mêmes scénarios JSON avec temps, identifiants et ordre des commandes imposés. Les enveloppes chargent le moteur et échangent les données, sans réécrire les règles en Kotlin.

Les résultats après chaque commande doivent être identiques après normalisation et conformes aux résultats métier attendus. Les scénarios couvrent réponses correctes/incorrectes/tardives, secondes soumissions et retransmissions, pause/reprise, score, ex aequo, sérialisation et poursuite après rechargement de l'état.

Ce jalon démontre l'exécution des règles testées, leur déterminisme et le passage des données sur l'appareil/runtime testés. Il **ne démontre pas** WebSocket, HTTPS/WSS local, stockage durable, maintien en arrière-plan, PWA hors ligne ou capacité à 30 joueurs. Ces validations restent indépendantes.

### Risques de portabilité encore ouverts

Les essais sur Pixel valident le runtime et le pont retenus pour les scénarios exécutés. Le support sur d'autres appareils et les dépendances implicitement ajoutées lors de futures évolutions restent à vérifier. Transformer la syntaxe ne fournit pas les API standard manquantes. Deux compilations différentes ne prouvent pas l'exécution du même artefact. Une réussite dans une WebView au premier plan ne prouve pas la continuité en arrière-plan. Tout futur ajout de dépendance d'exécution impose une révision explicite de cette contrainte et une nouvelle vérification.

