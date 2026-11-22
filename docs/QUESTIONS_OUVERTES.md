# Kuikuiz — Questions ouvertes et pistes à explorer (v0.2)

Les points ci-dessous ne sont pas des décisions techniques définitives.

## Faisabilité prioritaire
- **Point d'accès HTTPS/WSS au 22 novembre** : [P20](experiments/P20_WSS_POINT_ACCES_SANS_INTERNET.md) est positif en laboratoire sur Pixel 7 : PC isolé mesuré, contrôles TLS stricts et quiz, puis retour tactile Pixel à 3 000 points. Certificat de test à deux adresses et autorité déjà installée ; adresser encore changements d'IP, renouvellement et confiance sans préparation sur les appareils joueurs. Ne pas extrapoler à un deuxième téléphone, iOS/Firefox ou endurance.
- **Cache Pixel au 22 novembre** : [P19](experiments/P19_RECETTE_CACHE_PIXEL.md) apporte une preuve automatisée Chrome sur le Pixel hôte en HTTPS : chargement après arrêt du serveur, reprise gelée avec réponse conservée et réparation ciblée du cache. L'utilisateur a terminé le parcours tactile ; ergonomie à retravailler ensuite, en donnant la priorité aux risques techniques et aux seuls défauts bloquant les essais. Pas de validation WSS du point d'accès sans Internet, iOS/Firefox ou deuxième téléphone.
- **Cache de l'interface au 22 novembre** : [P18](experiments/P18_CACHE_INTERFACE_PC.md) valide sur Chrome PC le rechargement après arrêt du serveur, la préparation incomplète, la réparation et la reprise de connexion. Ne pas extrapoler à Pixel/iOS, à une installation PWA ou à HTTPS/WSS hors Internet sur le point d'accès. Les données de jeu et les confirmations restent sur l'hôte.
- **TLS Android au 22 novembre** : [P17](experiments/P17_HTTPS_WSS_ANDROID.md) valide HTTPS/WSS en laboratoire sur le Wi-Fi habituel, y compris Chrome Pixel sans contournement TLS côté téléphone. Le certificat de test exige une autorité approuvée et couvre une IP fixe ; adresses du point d'accès, renouvellement et confiance sans installation pour les joueurs restent ouverts. Cache PWA et client sur un autre téléphone non validés.
- **Assemblage jouable au 22 novembre** : trois questions sur Node et Pixel hôte, cumul, droits, réponses réseau confirmées et reprise après arrêt forcé positifs dans [P16](experiments/P16_MAQUETTE_TROIS_QUESTIONS.md). HTTP/ws sur Android seulement ; WSS, PWA complète hors ligne, endurance et capacité sur téléphones physiques restent ouverts. NanoHTTPD 2.3.1 reste limité à l'adaptateur HTTP expérimental.
- **Android hôte** : comment exécuter le moteur TypeScript commun avec un serveur WebSocket local ? Comparer les adaptateurs/environnements possibles et les restrictions du système.
- **PWA préchargée et réseau local** : vérifier les restrictions HTTPS/WSS, certificats, contenus mixtes, service workers, Android et iOS ; ne pas supposer que la seule installation de la PWA suffit.
- **Compatibilité navigateurs** : recette suivie dans `docs/experiments/CHECKLIST_NAVIGATEURS.md` : Chrome, Firefox et Samsung Browser sur Android ; Safari, Chrome et Firefox sur iOS. Firefox reste une cible, son incident TLS Pixel est différé mais doit être résolu avant déclaration de compatibilité. Versions minimales et fenêtre de support restent à définir.
- **Point d'accès Android** : vérifier expérimentalement le nombre de clients admis et la stabilité avec 30 téléphones.
- **Hôte Android distinct de l'animateur** : tester le cas d'un téléphone hôte appartenant à un joueur, y compris écran verrouillé, batterie, veille et bascule d'applications.
- **Fiabilité** : persistance des réponses confirmées, pause/reprise, reconnexion, restauration après interruption et cohérence des classements.
- **Tests** : 30 clients simulés ; progression physique avec Pixel + PC, quelques Android/iPhone puis une dizaine d'appareils accessibles. Un essai éventuel à 30 téléphones avec des collègues est reporté après maturité suffisante et ne bloque pas le développement initial. Ne pas annoncer 30 appareils réels validés à partir de dix. Instrumenter latence, jitter, pertes, synchronisation et reconnexion avant de définir les seuils.
- **Organisation validée** : expériences Android/PWA et portabilité du moteur dès le départ, indépendamment du prototype Node.js. Leur réalisation et leurs résultats restent à produire.
- **Runtime Android sans Node.js** : expérience AndroidX JavaScriptEngine 1.1.1 positive sur Pixel 7 / Android 17, même artefact et trace de sept étapes identiques à Node (voir `docs/experiments/P11_MOTEUR_ANDROID.md`). Compatibilité multi-appareils, intégration au service et choix final restent ouverts.
- **Preuve de portabilité** : exécuter exactement le même artefact JavaScript autonome sur Node.js et Android, vérifier son empreinte et les résultats métier attendus. Cette preuve ne couvre ni réseau, ni durabilité, ni arrière-plan, ni fonctionnement PWA hors ligne.
- **Contrôles du moteur** : sélectionner les outils d'analyse syntaxique et de graphe pour appliquer l'absence de dépendances d'exécution et d'API d'environnement, y compris via alias, réexportations, helpers ou polyfills.
- **SQLite** : adaptateur Node transactionnel (P12), reprise gelée (P13), puis première preuve SQLite Android positive sur Pixel après arrêt forcé post-commit et erreur d'écriture injectée (P14). Vérifier encore interruption en pleine transaction Android, fréquence/précision des checkpoints, intégration au réseau/service, coût et pannes matérielles. Voir `docs/experiments/P14_SQLITE_ANDROID.md`.

## Hébergement distant — non bloquant
- **Relais de projection pour une partie locale** : besoin validé le 21 novembre 2026. Choisir l'hébergement, le protocole sécurisé, l'association à la session et les droits de lecture ; aucun déploiement encore autorisé. Distinguer ce relais du serveur qui héberge une partie Internet.
- **Connectivité simultanée Android** : vérifier point d'accès Wi-Fi pour les joueurs, serveur local et connexion mobile sortante vers le relais ; mesurer les effets sur batterie, stabilité et charge.
- **Projection depuis l'entreprise** : vérifier les accès autorisés, la signalisation d'un affichage non actualisé et la resynchronisation après coupure. Une panne Internet ne doit pas interrompre la partie locale.
- **Périmètre projection** : lecture seule validée ; pilotage de la session depuis le PC via le relais non inclus. Vérifier que seuls les résultats déjà révélables sont publiés.
- Aucun hébergeur retenu. Tester d'abord sur PC personnel.
- Identifier le Raspberry Pi disponible (3 ou 4), sa mémoire, son OS et sa capacité à exécuter le serveur.
- Étudier un accès Internet sécurisé en HTTPS/WSS sans exposer imprudemment le réseau domestique ; comparer à un hébergement cloud économique.
- Synology DS212j 256 Mo : écarté pour cet usage.
- PC professionnel : navigateur + serveur distant uniquement, sous réserve des politiques réseau.

## Fonctionnalités différées / choix ouverts
- **Conventions du premier moteur** : confirmer la frontière exacte d'expiration (prototype : `t >= T` refusé) et la politique d'arrondi des scores (prototype : formule conservée sans arrondi). La cible ES2017 et le format script autonome restent expérimentaux jusqu'au test du runtime Android. Voir `packages/engine/README.md`.
- **Hébergement local sur iOS / iPhone — différé** : Android reste la cible du premier prototype hôte. Étudier ultérieurement une enveloppe serveur iOS, l'exécution du même moteur compilé, le réseau local, le cycle de vie/arrière-plan et la chaîne de construction Apple. Aucune faisabilité ni implémentation iOS hôte n'est validée. Cette piste est distincte de la participation des joueurs sur iPhone via la PWA, qui reste prévue et à tester. Aucun choix du framework Next.js n'est introduit.
- Méthode d'invitation des collaborateurs (compte, lien ou combinaison) : collaboration de priorité basse.
- Formule de crédit partiel QCM : gérer les cas limites, notamment zéro mauvaise option possible.
- Définir le périmètre précis du MVP jouable après validation des prototypes.
- Nom public : Kuikuiz favori provisoire ; vérifier marques, stores et domaines avant adoption.
- Publication publique éventuelle : PWA bêta d'abord ; stores ensuite selon intérêt et faisabilité.

## Registre des décisions
Les décisions validées sont documentées dans `SPECIFICATIONS.md` et `ARCHITECTURE.md`. Ne pas transformer une hypothèse de cette liste en exigence sans validation explicite.
