> Archive au 25 novembre 2026, avant simplification du document d'architecture. Les statuts ci-dessous sont historiques et peuvent se contredire au fil des essais. Pour la situation actuelle, lire [l'architecture](../ARCHITECTURE.md) et [l'état des lieux](../ETAT_DES_LIEUX.md). Aucune ancienne attente n'est une nouvelle tâche implicite.

# Kuikuiz — Architecture technique (v0.2)

**25 novembre — podium partagé (préparation 0.18) :** commande animateur après clôture finale, état durable dans la table additive `mock_podium` des deux adaptateurs ; bascule des joueurs au classement et animation locale. Moteur et scores inchangés. 39 tests Node et parcours navigateur positifs, compilation Android réussie ; recette physique différée. Voir [état des lieux](../ETAT_DES_LIEUX.md).

> Ce document sépare les orientations validées des solutions encore expérimentales. La faisabilité n'est pas démontrée à ce stade.

**P24 — interface intégrée :** la structure validée de l'atelier est appliquée au vrai quiz, avec soumission au toucher, présence WebSocket réservée à l'animateur, révélation et podium. Moteur et base v4 inchangés ; Android 0.17 compilé, recette physique restante. Voir [P24](../experiments/P24_INTERFACE_INTEGREE.md).

**24 novembre — maquettes de structure :** [atelier autonome téléphone/PC](../MAQUETTES_INTERFACE.md), servi localement sur 4181. Vues animateur/joueur, panneaux, réponse au toucher, révélation et podium avec ex æquo. Données et connexions simulées ; aucune modification du moteur ni preuve de présence/synchronisation réelle ajoutée. Quiz technique sur 4180 conservé.

**P23 — Firefox Redmi :** [recette manuelle](../experiments/P23_FIREFOX_ANDROID.md) positive sur Firefox 160.0.1 / Wi-Fi maison après activation explicite de la confiance envers les autorités ajoutées dans Android. Page sans exception puis quiz positif ; cache et hors Internet Firefox encore à tester. Codes de maquette à quatre chiffres en préparation 0.16, jetons secrets et moteur inchangés. La stratégie HTTPS/WSS sans installation d'autorité reste ouverte.

**P22 — parcours local 0.14 terminé :** trois questions, révélation automatique avec Tutu sans réponse, reconnexion Redmi sans rafraîchissement et classement final 3 000/0 positifs selon l'utilisateur. Coupures des accès amont des téléphones confirmées avant et après, PC en ligne ; pas de mesure indépendante du trafic. La préparation 0.15 masque le compteur joueur dans les sources, sans installation pendant cet essai. Voir [P22](../experiments/P22_ECHEANCE_ET_PARCOURS_JOUEUR.md).

**P22 — 0.14 sans Internet, recette déclarative :** première question sur Redmi joueur/Pixel hôte, Tutu sans réponse, révélation automatique à 1 000/0 points positive. L'utilisateur vérifie les coupures Wi-Fi amont/données mobiles Pixel et données mobiles Redmi avant et après ; PC maintenu en ligne. Pas de télémétrie indépendante après coupure. Compteur de réponses réservé à l'animateur dans les sources de préparation 0.15, non installé sur téléphone. Voir [P22](../experiments/P22_ECHEANCE_ET_PARCOURS_JOUEUR.md).

**P22 — recette manuelle 0.14 confirmée :** sur Pixel hôte et Redmi joueur, menu de nouvelle inscription, message d'attente après réponse et révélation automatique à l'échéance avec un joueur sans réponse positifs selon l'utilisateur : 1 000 points et 0 pour Tutu. Pas de nouvelle preuve d'isolement Internet dans ce lot. Voir [P22](../experiments/P22_ECHEANCE_ET_PARCOURS_JOUEUR.md).

**P22 — parcours d'accueil corrigé en 0.14 :** « Je participe » exprime une nouvelle inscription et ouvre le formulaire sans utiliser l'ancien accès. L'accès précédent n'est remplacé qu'après inscription réussie ; rafraîchir une page de partie conserve la reprise automatique. Même moteur et base v4 que 0.13, cache v5 ; tests navigateur et cache positifs. Voir [P22](../experiments/P22_ECHEANCE_ET_PARCOURS_JOUEUR.md).

**P22 — échéance et parcours joueur :** [nouvelle règle partagée](../experiments/P22_ECHEANCE_ET_PARCOURS_JOUEUR.md) de clôture à l'échéance autoritaire, persistée par les adaptateurs avant révélation. Message d'attente après confirmation et changement de salle joueur accessibles. 35 tests Node et parcours navigateur/cache positifs ; préparation Android 0.13, base v4 séparée conservant les anciennes bases, cache v4. La reprise manuelle P21 depuis le temps restant et les scores attendus a été confirmée avant ce changement de moteur.

**P21 — interruption avant échéance sur 0.12 :** contrôle automatique après une réponse SQL vérifiée, arrêt forcé estimé à 2,675 s, reprise en pause au checkpoint 2,389 s avec 27,611 s restantes. Réponse et registre inchangés, 1 000 points, temps de pause stable ; HTTPS/WSS vérifiés. L'écart de checkpoint observé est de 286 ms, sans mesure de l'instant exact de mort du processus. Reprise au dernier point durable, pas gel exact à la milliseconde. Confirmation visuelle et reprise depuis Redmi encore attendues ; voir P21.

**Résultat P21 après correction 0.11 :** réponse Redmi/Mars à 1 000 points mesurée dans le snapshot et le registre SQL avant arrêt forcé, puis retrouvée identique après redémarrage HTTPS/WSS. L'utilisateur confirme la récupération et les résultats attendus. Question déjà expirée avant l'arrêt : le gel avant échéance reste à tester. Reconnexion et veille courte Redmi également positives sur 0.10 ; conditions sans Internet non établies pour ces derniers essais. Les compléments ci-dessous conservent la chronologie.

**Suite P21 — redémarrage de l'hôte :** APK 0.11 corrige le démarrage partiel observé après arrêt forcé (HTTPS actif, WSS refusé avec `BindException`) : adresse réutilisable et attente du WebSocket prêt avant lancement HTTP. Trois arrêts forcés/redémarrages HTTPS et WSS vérifiés sur Pixel, même moteur et base v3. Réponse du Redmi après cette interruption encore à confirmer ; voir [P21](../experiments/P21_REDMI_CLOTURE_AUTOMATIQUE.md).

**Suite du 23 novembre :** P21 retrouve manuellement le classement Redmi à 3 000 points après retour sur le bon point d'accès et rechargement, puis après veille et rechargement. Reconnexion automatique après veille non établie. Le client pouvait conserver une alerte réseau malgré un état reçu sur la même question : correctif testé sur Chrome PC et cache versionné v2, non encore installé sur Pixel. Voir [le détail P21](../experiments/P21_REDMI_CLOTURE_AUTOMATIQUE.md).

**Complément du 23 novembre 2026 :** [P21](../experiments/P21_REDMI_CLOTURE_AUTOMATIQUE.md) est aussi positif en recette manuelle avec Redmi joueur sur le point d'accès du Pixel, accès Internet des téléphones coupés selon confirmation utilisateur : trois questions, clôture automatique et 3 000 points. PC maintenu en ligne pour l'échange, sans rôle de serveur. Autorité de laboratoire existante ; pas de nouvelle preuve de cache hôte arrêté, de reconnexion ou d'endurance Redmi.

**Complément P21, 22 novembre 2026 :** [Redmi et clôture automatique](../experiments/P21_REDMI_CLOTURE_AUTOMATIQUE.md). Premier retour manuel positif avec Redmi joueur et Pixel hôte sur Wi-Fi habituel, autorité de laboratoire installée. APK 0.9 : clôture dans le moteur commun après les réponses de tous les joueurs initiaux, persistée avec la dernière réponse ; question suivante manuelle. Tests Node et parcours WSS strict Pixel positifs, contrôle tactile de cette évolution encore à faire. Bases v3 séparées, anciennes bases v2 conservées sans migration.

**État expérimental au 22 novembre 2026 :** [P16](../experiments/P16_MAQUETTE_TROIS_QUESTIONS.md) assemble trois questions sur Node et Pixel hôte avec le même moteur compilé, SQLite et commandes partagées. Le client Chrome Pixel a aussi joué sur Node HTTPS/WSS. L'hôte Android sert pour l'instant en HTTP/ws sur réseau de test ; cela ne valide ni WSS Android ni le parcours PWA HTTPS préchargé sans Internet. Les choix d'enveloppe restent expérimentaux et le relais distant n'est pas implémenté.

Le parcours HTTP/ws complet depuis le PC client du point d'accès Android a réussi sans Internet après coupure des accès amont et désactivation Ethernet. Cette preuve d'autonomie du jeu local ne remplace pas les essais PWA sécurisée, téléphones clients supplémentaires, veille prolongée ou charge physique.

**Complément P17, même date :** [HTTPS/WSS Android de laboratoire](../experiments/P17_HTTPS_WSS_ANDROID.md) est positif sur le Wi-Fi habituel, avec clients Node stricts et Chrome du Pixel. Le certificat existant couvre `192.168.1.21` seulement ; pas de validation WSS du point d'accès ni de cache PWA par cette expérience. Clés hors APK dans les fichiers privés de l'application, aucun changement de confiance Windows ; aucune solution de certificats pour les utilisateurs finaux sélectionnée.

**Complément P18, même date :** [cache de l'interface sur PC](../experiments/P18_CACHE_INTERFACE_PC.md) testé avec arrêt réel du serveur. Le service worker conserve uniquement l'interface et la configuration de connexion, jamais les réponses ou confirmations. Le jeu reste sous l'autorité de l'hôte ; un retour de celui-ci récupère la réponse durable et l'état en pause. Ressources manquantes, réparation et mise à jour incomplète sont testées. Android 0.8 compile ces ressources ; validation physique du cache encore à faire.

Le complément P18 vérifie la réouverture complète de Chrome PC avec son profil de test conservé et serveur arrêté. Une mise à jour complète reste en attente tant que l'ancienne interface est ouverte, puis remplace son cache après fermeture des clients, sans supprimer les autres caches.

**Complément P19, même date :** [cache sur Pixel](../experiments/P19_RECETTE_CACHE_PIXEL.md) positif par automatisation Chrome en HTTPS, avec l'hôte sur ce même téléphone : rechargement serveur arrêté, réponse confirmée retrouvée après reprise gelée, 3 000 points et réparation ciblée. APK 0.8 installé ; parcours tactile terminé selon l'utilisateur. L'ergonomie sera retravaillée après les risques techniques, hors défauts bloquant les essais. Pas de deuxième téléphone, d'arrêt forcé de Chrome, d'installation PWA ou de test WSS hors Internet ajoutés par ce résultat.

## 8. Architecture et modes réseau — décisions récentes

**Complément P20, 22 novembre :** [HTTPS/WSS sur point d'accès sans Internet](../experiments/P20_WSS_POINT_ACCES_SANS_INTERNET.md) est positif dans le laboratoire. Une nouvelle feuille signée par la même autorité couvre le Wi-Fi habituel et l'adresse du point d'accès, avec clé serveur conservée et anciens fichiers source intacts. Tests stricts Node et jeu réussis sur le PC isolé ; parcours Chrome Pixel manuel terminé à 3 000 points après correction de l'adresse. Les mesures PC et le retour utilisateur sur le téléphone restent distingués. La stratégie d'adressage et de confiance pour les utilisateurs finaux reste ouverte : cette méthode exige une autorité de laboratoire approuvée et des adresses explicitement couvertes.
- Moteur de jeu commun écrit en **TypeScript**, indépendant du mode d'hébergement ; partage des règles métier et du protocole, avec adaptateurs spécifiques selon l'environnement.
- Hébergement distant sur serveur **Node.js** pour les joueurs connectés par LTE/4G/5G et Internet.
- Hébergement local visé sur **téléphone Android de l'animateur**, avec composant serveur/adaptateur approprié ; faisabilité à vérifier expérimentalement.
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

## 14. Portabilité du moteur — contraintes validées, faisabilité à démontrer

- Le moteur TypeScript ne possède **aucune dépendance d'exécution externe**, directe ou transitive. TypeScript et les outils de compilation/test sont des dépendances de développement, absentes de l'artefact exécuté.
- Le moteur utilise un sous-ensemble explicite de JavaScript standard dont le support sera vérifié sur le runtime Android retenu. Ni le runtime ni le niveau ECMAScript cible ne sont encore sélectionnés.
- Il définit ses commandes et résultats métier et ne dépend pas du protocole réseau. Les adaptateurs traduisent les messages vers les commandes métier. Zod, `ws`, SQLite, les pilotes natifs et les outils web restent hors du moteur.
- Son contrat est une transformation : état + commande + contexte déterministe → nouvel état + résultat métier. Le temps logique autoritaire et les identifiants sont fournis ; tout hasard nécessaire est explicitement contrôlé.
- Les API Node.js, navigateur et Android restent dans les adaptateurs. Le moteur n'utilise pas `process`, `Buffer`, `require`, `node:*`, `window`, `document`, `fetch`, `WebSocket`, les stockages navigateur ou les ponts Android. Il ne lit pas directement `Date.now()`, `Math.random()` et ne programme pas de temporisateur.
- Les états sont des données sérialisables, sans fonction ni objet natif. Les tris, départages et calculs définissent leurs règles sans dépendre implicitement de la locale ou de l'ordre des données.
- L'orchestrateur sérialise les commandes d'une session et distingue résultat métier et confirmation durable : une réponse n'est confirmée au joueur qu'après commit. SQLite transactionnel est privilégié, avec adaptateurs Node.js et Android à vérifier ; pas d'event sourcing général.
- Premier adaptateur Node expérimental : `node:sqlite`, état JSON et réponses dans une transaction, contraintes d'unicité, confirmation après commit. Les tests de réouverture, d'arrêt applicatif et d'échec de commit sont positifs sur PC ; voir `experiments/P12_SQLITE_NODE.md`. SQLite Android et confirmation réseau de bout en bout restent à valider.
- Depuis P13, la reprise gelée au dernier checkpoint est testée sur Node/SQLite et les mêmes règles sont exécutées sur Pixel via le même artefact. Une nouvelle instance SQLite exige `recover` avant les commandes ; `resume` reste explicite. Précision/fréquence des checkpoints, SQLite Android et confirmation réseau de bout en bout restent ouverts. Voir `experiments/P13_REPRISE_GELEE.md`.
- Depuis P14, un adaptateur SQLite natif Android a conservé une réponse après arrêt forcé post-commit de la sonde sur Pixel 7. Pause restaurée, retransmission unique et rollback après erreur SQL injectée sont vérifiés. Cette preuve isolée n'intègre pas le stockage au serveur WebSocket et ne couvre pas un arrêt en pleine transaction Android ni une coupure électrique. Voir `experiments/P14_SQLITE_ANDROID.md`.

### Contrôles automatiques à implémenter

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

Runtime et pont Android, support réel des API ECMAScript, format de l'artefact et dépendances implicitement ajoutées restent à vérifier. Transformer la syntaxe ne fournit pas les API standard manquantes. Deux compilations différentes ne prouvent pas l'exécution du même artefact. Une réussite dans une WebView au premier plan ne prouve pas la continuité en arrière-plan. Tout futur ajout de dépendance d'exécution impose une révision explicite de cette contrainte et une nouvelle vérification.

