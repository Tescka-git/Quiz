# Kuikuiz — Cahier des charges et décisions de conception (v0.2)

**Sauvegarde : 21 novembre 2026**
**Nom du produit :** Kuikuiz (favori provisoire, disponibilité juridique et commerciale à confirmer)
**Statut :** décisions fonctionnelles et principes d'architecture validés ; faisabilités techniques encore à éprouver.

## 1. Principes généraux
- Les créateurs disposent d'un compte ; les joueurs peuvent participer sans compte.
- Créateur et animateur d'une session peuvent être deux personnes différentes.
- Un quiz comporte des manches et des questions isolées, librement alternées.
- Types de questions : QCM, vrai/faux, texte libre ; médias image, audio et vidéo facultatifs, y compris blind tests.
- Durée de réponse et points maximum configurables par question, y compris 0 point.
- Une réponse soumise est définitive ; réponse tardive ou absente : 0.
- Sessions indépendantes et illimitées pour un même quiz ; chacune fige la version exacte du quiz à son lancement.

## 2. Déroulement, résultats et scores
- Correction révélée après chaque question. Pendant une manche, scores et classement restent masqués ; affichage animé des scores de manche et du classement cumulé en fin de manche.
- Une question isolée affiche sa correction et ses résultats immédiatement. Classement final animé en fin de quiz.
- L'animateur choisit animation automatique (intervalle paramétrable) ou progression manuelle, synchronisée avec les écrans joueurs.
- Égalités : ex aequo et classement de compétition (1er, 1er, 3e).
- Avancement manuel ou automatique paramétrable par manche. Décision du 22 novembre 2026 : la question est clôturée et sa correction révélée dès que tous les joueurs admis au démarrage de la partie ont une réponse enregistrée, correcte ou incorrecte. Cette liste reste figée malgré les déconnexions ; aucun délai de grâce supplémentaire lorsque tous ont répondu. Si une réponse manque, la clôture automatique ne se déclenche pas ; l'échéance et la clôture manuelle restent disponibles. La maquette conserve le lancement de la question suivante par l'animateur.
- En individuel : points fixes ou dégressifs selon la rapidité. Pour réponse entièrement correcte dans les délais, score = Pmax × (1 − 0,7 × t/T), puis 0 après expiration. Coefficient de justesse C entre 0 et 1 pour crédit partiel : score = Pmax × C × (1 − 0,7 × t/T). Le temps de réception côté hôte/serveur fait foi.
- QCM multiréponses : crédit partiel avec pénalités pour mauvaises sélections ; formule proposée C = max(0, bonnes sélectionnées / bonnes totales − mauvaises sélectionnées / mauvaises totales), à préciser pour les cas limites.
- En équipe : aucun bonus de rapidité, score fondé sur la justesse.
- Texte libre : correction automatique normalisée, par IA avec possibilité de modification par l'animateur, ou manuelle. Mode de secours sans IA en cas d'indisponibilité.
- Toutes les corrections doivent être achevées avant publication des scores/classements.
- Une correction peut être révisée après publication : recalcul automatique, notification discrète, journal des modifications, sans animation imposée.

## 3. Mode équipe
- Mode individuel ou équipe fixé pour l'ensemble du quiz.
- Constitution des équipes avant la partie : choix des joueurs, répartition automatique ou affectation par l'animateur ; tailles inégales possibles ; composition figée au démarrage.
- Espace collaboratif privé : propositions multiples par joueur, limite paramétrable ; nuage de mots en temps réel par défaut, visibilité différable par le créateur.
- Regroupement des propositions équivalentes (casse, accents, espaces, petites fautes) ; regroupement sémantique IA facultatif, arbitrage des cas douteux par l'animateur, conservation des propositions originales et fonctionnement sans IA.
- Une personne compte une fois par proposition équivalente.
- Vote secret : une voix par joueur pour une proposition regroupée, durée paramétrable, clôture anticipée si tous les éligibles ont voté avec grâce de 5 secondes.
- Majorité relative ; abstentions ignorées ; égalité : second vote rapide entre propositions ex aequo, puis tirage au sort si nouvelle égalité. Aucun vote : 0 point.
- Résultats collectifs visibles, jamais les votes individuels, même dans le rapport final.

## 4. Participation et médias
- Chaque joueur choisit « Sur place » ou « À distance » en rejoignant ; changement uniquement entre questions. Équipes mixtes possibles.
- Sur place : son sur le seul appareil de l'animateur et diffusion collective ; images/vidéos sur écran commun et téléphones, vidéos locales muettes.
- À distance : médias et son sur le téléphone du joueur. Synchronisation légère avec chronomètre commun ; priorité à la fluidité plutôt qu'à la synchronisation à la milliseconde ou à l'anti-triche.
- Préchargement de l'ensemble des questions et médias sur les téléphones depuis la salle d'attente ; barre de progression et état « prêt ».
- Pas de nouveau joueur après lancement ; reconnexion autorisée pour les joueurs déjà admis.
- L'animateur peut exclure les joueurs dont le préchargement est incomplet avant le lancement ; ils ne peuvent plus rejoindre après le début.
- Ambiances prédéfinies et effets sonores facultatifs, uniquement sur l'appareil de l'animateur ; coupure possible à tout moment.

### 4.1. Projection sur un PC connecté au réseau d'entreprise

**Besoin et principe validés le 21 novembre 2026 ; faisabilité technique à démontrer.**

- En salle de réunion, les joueurs se connectent au point d'accès Wi-Fi du téléphone Android de l'animateur, qui héberge le serveur de jeu local. Le PC reste connecté au réseau d'entreprise et projette une page web de résultats en lecture seule.
- Les réponses passent par le réseau local ; le téléphone reste l'autorité pour le chronomètre, les réponses et les scores. Le Wi-Fi commun évite de dépendre des connexions mobiles individuelles, sans garantir des délais identiques entre joueurs.
- Un relais distant transmet au navigateur du PC l'état destiné à la projection. Le téléphone utilise sa connexion Internet mobile pour alimenter ce relais ; le PC y accède via le réseau autorisé par l'entreprise.
- La projection respecte les règles de révélation : aucun score ou classement masqué pendant une manche ne doit être transmis prématurément à la page de projection.
- Le relais ne traite pas les réponses des joueurs et ne calcule pas les scores. Sa disponibilité ne conditionne pas le déroulement local de la partie.
- En cas de coupure Internet ou du relais, la partie locale continue ; la page signale un affichage non actualisé. Au rétablissement, elle récupère le dernier état de projection autorisé.
- Cette variante nécessite Internet pour la projection distante, mais conserve le jeu local autonome. La page ne commande pas la session ; le pilotage depuis le PC via le relais reste hors du périmètre validé.
- Aucun contournement des règles réseau de l'entreprise, aucune installation de serveur sur le PC. Le choix et le déploiement du relais nécessitent un accord explicite distinct.

## 5. Robustesse et contrôle de session
- Sur déconnexion : avertissement visible côté joueur, tentatives de reconnexion, chronomètre continuant sauf pause ; côté animateur : notification avec identité et durée, nombre de connectés et notification de retour.
- Identifiant de session conservé localement, réponses acceptées et scores préservés.
- Brouillon de réponse conservé pendant déconnexion ; envoi seulement après reconnexion et avant échéance, jamais automatiquement.
- Pause manuelle possible à tout instant : gel des chronomètres et médias à leur position ; blocage des réponses, propositions et votes ; brouillons et réponses acceptées conservés. Reprise à l'état exact.
- Déconnexion animateur : si son téléphone héberge, pause du jeu (à valider techniquement) ; si serveur indépendant, questions automatiques continuent et phases manuelles attendent.
- Seul l'animateur initial contrôle la session en v1 ; pas de reprise de contrôle par un autre animateur.
- Sauvegarde persistante automatique aux événements importants ; restauration après plantage/redémarrage avec temps gelé : reprendre la question interrompue ou la recommencer (effacement de ses réponses, remise à zéro du temps, conservation des scores précédents), en avertissant les joueurs.
- Contenu et paramètres du quiz figés au démarrage. L'animateur peut annuler ou rejouer une question même après publication : effacement des réponses/points concernés, recalcul des classements, historique conservé.

## 6. Rapports et personnalisation
- Rapport détaillé de fin de partie : classement, scores totaux et par manche/question isolée, réponses, corrections, statistiques ; en équipe, seulement réponses collectives, jamais votes individuels.
- Rapport enregistré localement sur l'appareil du joueur et consultable hors ligne ; comptes joueurs et historique multi-appareils envisageables ultérieurement, avec import éventuel des résultats locaux.
- Carte de résultat partageable en image, personnalisable par le créateur (logo, couleurs, nom de l'événement). Identité visuelle commune pour interfaces, classements et cartes ; thème par défaut.

## 7. Collaboration sur les quiz — priorité basse
- Rôles envisagés : propriétaire (tous droits), éditeur (modifie), animateur (consulte et lance), lecteur (consulte).
- Seul le propriétaire invite, change les droits, révoque et restaure les anciennes versions.
- Verrou d'édition par question, libéré en fin d'édition ou après délai d'inactivité/déconnexion ; indication de l'éditeur actif.
- Historique auteur/date/modifications ; restauration d'une ancienne version sans suppression de l'historique ni modification des sessions passées.
- Méthode d'invitation des collaborateurs encore à décider.

## 15. Statut et règles de lecture du document
- **Validé** : choix fonctionnels explicitement décidés lors des échanges.
- **À valider techniquement** : hypothèses d'architecture et comportements non encore démontrés sur appareils réels.
- **À approfondir** : choix reportés, notamment l'hébergement distant et les certificats HTTPS/WSS locaux.
- Les exemples de technologies (Kotlin, SQLite, PostgreSQL, etc.) ne constituent **pas** des choix imposés lorsqu'ils sont présentés comme pistes.
- La conception fonctionnelle est considérée comme **suffisamment définie pour lancer les prototypes**, sans être figée définitivement.
