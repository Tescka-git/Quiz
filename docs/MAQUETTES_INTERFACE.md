# Maquettes de structure — 24 novembre 2026

**Première version de structure validée par l'utilisateur le 24 novembre 2026.** Cette validation porte sur la disposition et les interactions illustrées, pas sur une intégration fonctionnelle, une recette physique complète ou une identité graphique définitive. La structure est désormais appliquée au quiz technique, avec présence réelle côté animateur ; voir [P24 — interface intégrée](experiments/P24_INTERFACE_INTEGREE.md) pour les preuves et limites. L'atelier décrit ici reste une simulation autonome.

## Ouvrir la maquette

Depuis la racine : `npm.cmd run dev:layout`, puis **http://localhost:4181**.

Fichiers : `apps/web/layout/index.html`, `style.css`, `app.js`. Le serveur n'expose que ces trois ressources sur l'interface locale. Aucun compte, dépendance, police distante ou service tiers ajouté. Le quiz technique reste séparé sur http://localhost:4180 ; ni le moteur ni les adaptateurs Android ne sont modifiés par cette maquette.

La barre « Atelier » permet de choisir rôle, format téléphone/PC, scène, type de réponse, état de connexion simulé et cas d'ex æquo. Elle sert à la revue, pas au produit final. Les deux rôles sont des vues d'une même simulation dans un onglet, pas des clients synchronisés entre navigateurs.

## Structure à examiner

| Vue | Téléphone | PC |
|---|---|---|
| Animateur | Pilotage, classement, participants : trois panneaux verticaux avec onglets | Trois colonnes dans ce même ordre lorsque la largeur le permet |
| Joueur | Question et classement : deux panneaux ; aucune liste de participants ni compteur collectif | Question et classement dans des colonnes distinctes |

Le défilement utilise un alignement souple sur les panneaux. Les onglets offrent une autre navigation. Chaque panneau conserve un défilement interne si son contenu dépasse l'espace : une longue question ou une grande liste ne doit jamais être tronquée. Les fenêtres étroites passent à la disposition téléphone même si le format PC est sélectionné. Ajustement sur vrais appareils encore à effectuer ; aucun format ne garantit toutes les questions sans défilement.

Le rôle et un indicateur de connexion court occupent l'en-tête. La connexion combine symbole, texte et couleur, avec un état intermédiaire « Reconnexion ». Pour l'animateur, les participants portent chacun le même type de repère ; les données sont fictives. « On vous attend » est retiré ; « Jeu en pause » est factuel et « Partie terminée » réservé à la fin du quiz. Aucun titre d'ambiance supplémentaire sous « Espace animateur ».

Le numéro de question n'apparaît qu'au-dessus de son énoncé ; son doublon en bas à droite est supprimé pour les deux rôles.

### Ajustement après revue — priorité téléphone

Salle d'attente animateur : petit symbole et nom du quiz regroupés, code `1234` à côté d'un emplacement QR réservé. Le cadre porte explicitement la mention d'emplacement et n'est pas un QR scannable. La génération du lien et du vrai QR sera ajoutée lors de l'intégration.

Question animateur : compteur et commandes déplacés dans une barre fixe à l'intérieur du panneau, hors de la zone défilante. « Révéler les résultats » est en rouge ; « Mettre en pause » est distinct et reste lisible. Question, espacement et réponses A/B/C/D compactés, avec réponses en deux colonnes côté animateur. Le QCM d'exemple tient sans défilement à 390 × 844 et 320 × 640 ; les contenus plus longs conservent un défilement interne sans déplacer les commandes. Aucun texte n'est tronqué pour forcer artificiellement une page unique. L'atelier de réglages peut défiler séparément sur petit écran ; il ne fait pas partie de l'interface cible.

Pause : sablier et « Jeu en pause » intégrés à côté du chronomètre, dans un emplacement réservé sur sa ligne. Aucun bloc ajouté sous le temps ; question, réponses et chronomètre gardent leur position entre lecture et pause. Les tests comparent ces coordonnées sur les deux petits formats.

Classement : titre et action suivante restent fixes dans le panneau. Seule la zone des lignes et de leurs compléments défile ; « Question suivante » reste accessible en bas. Après la dernière question, le même emplacement accueille « Afficher le podium ». Après le dévoilement du podium, « Voir le classement complet » utilise également cette barre. Le bouton de pilotage n'est pas proposé au joueur. Test sur liste artificiellement allongée à 390 × 844 et 320 × 640, avec vérification du clic après défilement.

Podium téléphone : une seule fenêtre, avec titre compact et marches dimensionnées dans l'espace restant. Les rappels redondants et la note sur les futures statistiques sont retirés de ce panneau. Le bouton de classement complet reste fixe et visible. Tests de hauteur avant/après dévoilement sur les deux rôles et les formats 390 × 844/320 × 640, avec et sans ex æquo. Pas de découpage ou de masquage des noms pour simuler artificiellement cette tenue ; les vrais noms longs et les groupes d'ex æquo plus nombreux restent à examiner à l'intégration.

Dernier ajustement de navigation : après révélation, l'animateur reste sur la question corrigée. La bonne option bénéficie de la même animation de surlignage vert pour les deux rôles. À la fin de la courte animation, « Voir le classement » est proposé ; aucun défilement automatique vers ce panneau. Les onglets et le geste vertical restent d'autres actions explicites pour le consulter.

Présentation compacte généralisée aux deux rôles et à tous les types illustrés, y compris le repli sur écran étroit quand le format PC a été choisi. Choix en deux colonnes, label du champ texte disponible aux lecteurs d'écran, pas d'espace de reçu vide. Le blind test réserve un repère sonore dans la ligne du numéro de question plutôt qu'un bloc audio fictif encombrant ; il n'intègre toujours aucun son ni contrôle de lecture réel. Les dix exemples (deux rôles, cinq types) tiennent sans défilement interne à 390 × 844 et 320 × 640 dans Chrome. Questions longues, zoom, clavier logiciel et médias réels restent à examiner ; aucun contenu n'est coupé pour tenir.

## Réponse et révélation

- Choix repérés A/B/C/D. Choix unique et vrai/faux : toucher = envoi, puis confirmation simulée. QCM multiple et texte : validation explicite. Le blind test illustre uniquement le choix unique ; aucun son réel.
- « Envoi en cours » est distinct de « Réponse enregistrée ». Le menu Connexion peut interrompre l'envoi simulé ; le même choix est alors conservé et renvoyé uniquement sur action explicite. Cette illustration ne prouve aucune durabilité réelle.
- Au déclenchement manuel ou à l'échéance simulée, la question reste visible, avec la correction et une notification personnelle « Bien joué », « Dommage » ou « Pas de réponse ».
- Après retour de revue : si le joueur a juste, « Bien joué ! » et les points suffisent ; pas de rappel textuel de la bonne réponse dans la notification ni après sa disparition. Le choix reste visuellement indiqué. En cas d'erreur ou d'absence, le rappel de correction reste illustré ; l'éventuelle révélation réservée à l'animateur est une décision encore ouverte. L'animateur conserve son rappel de correction.
- Le classement reste indisponible pendant les **3,5 secondes** de révélation. L'animateur reste ensuite sur la correction et choisit « Voir le classement » ; son action suivante reste fixe dans le panneau de classement. Le joueur reste également sur la correction et peut consulter son classement séparément.
- Le podium final dévoile les places **3, puis 2, puis 1**. Le cas ex æquo utilise 1/2/2/4 : les deux seconds partagent leur place et aucune troisième place n'est inventée. Le classement complet suit ; les statistiques ne sont pas implémentées.
- Les animations sont supprimées avec `prefers-reduced-motion`, en conservant l'ordre et la lisibilité des étapes.

Les scores sont des exemples destinés à la composition, pas le calcul des réponses de la démonstration. La maquette illustre des questions isolées ; les classements de manche masqués devront rester sous l'autorité de l'hôte lors de l'intégration.

### Allègement du retour joueur après revue

La dernière revue remplace le reçu visible persistant par le choix coché et verrouillé après enregistrement ; l'annonce « Réponse enregistrée » reste disponible aux lecteurs d'écran. « Envoi en cours » et les incidents restent visibles tant que nécessaire. Après révélation, aucun message d'attente ne subsiste.

La consigne au-dessus des choix change avec l'état de soumission : consigne initiale avant sélection, « Envoi en cours… » pendant l'attente, puis « Réponse envoyée » une fois la confirmation simulée reçue. En cas d'échec, « Réponse non confirmée » remplace la consigne et le renvoi explicite reste possible. Ce libellé occupe l'emplacement existant ; pas de nouveau reçu persistant en bas.

À la révélation, la consigne est supprimée : animation et réponses colorées suffisent. Aucun libellé de soumission ou de saisie n'est maintenu au-dessus des choix après la clôture.

Affinement du bandeau : la consigne et l'état de soumission occupent l'espace central entre le numéro de question et le temps ; en pause, cet emplacement affiche le sablier et « Jeu en pause ». Sa hauteur et celle de la barre de temps sont réservées, y compris à la révélation lorsque les libellés deviennent invisibles. La question et les choix gardent ainsi leur position avant sélection, après envoi et après révélation. L'écart entre les choix du QCM multiple et « Valider ma réponse » est de 10 px, comme l'espacement des choix en présentation compacte.

Pour les QCM/vrai-faux/blind test à choix, la bonne option est surlignée en vert : pas de répétition « Bonne réponse : A · Mars » dans un paragraphe ou dans la notification, correcte ou incorrecte. La notification conserve « Bien joué » et les points ou « Dommage »/« Pas de réponse ». Le texte libre conserve une correction textuelle en cas d'erreur, car il n'a aucune option à surligner. Les descriptions précédentes de reçus visibles rendent compte des premières itérations.

Couleurs : avant révélation, un choix sélectionné ou enregistré a un contour bleu, une lettre bleu foncé et un repère bleu. Le vert est réservé aux bonnes options révélées. Le choix erroné apparaît en rouge avec une croix lors de la correction, tout en conservant sa lettre bleu foncé comme repère de sélection initiale. Symboles et libellés accessibles complètent les couleurs.

## Limites et intégration ultérieure

Pas de connexion WebSocket, persistance, présence réseau réelle, audio, reprise après panne ou certification d'accessibilité par cette maquette. La temporisation de révélation, le passage au classement et le podium sont locaux : la synchronisation avec l'hôte et le comportement à la reconnexion restent à développer. Aucun rechargement de page ne reprend cette simulation ; « Recommencer » la réinitialise.

Avant intégration : valider la disposition et les libellés avec l'utilisateur, puis relier les composants aux états autorisés de l'hôte sans révélation prématurée. La présence doit être mesurée côté serveur, pas déduite de cette liste fictive. Pour le vrai quiz, une réponse restera confirmée uniquement après commit, et une reconnexion ne devra pas rejouer systématiquement les animations.

## Vérification locale

Serveur de maquette actif : `npm.cmd run test:layout`.

Le test Chrome parcourt choix unique, QCM multiple, texte, coupure simulée, révélation différée, podium avec ex æquo et navigation à 390 et 320 px. Il contrôle les erreurs JavaScript et CSP, et produit captures et rapport dans `artifacts/layout/` (fichiers générés exclus de Git). Cela ne remplace pas une recette tactile Android/iOS.
