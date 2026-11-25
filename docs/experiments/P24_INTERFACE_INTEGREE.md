# P24 — Interface intégrée au prototype

Date : 24 novembre 2026. Sources Android préparées en 0.17-experiment ; cache web kuikuiz-mock-shell-v8.

## Périmètre

La structure validée dans [les maquettes](../MAQUETTES_INTERFACE.md) est appliquée à la vraie interface apps/web/mock, utilisée par les adaptateurs Node.js et Android. Le moteur TypeScript, ses règles, les trois questions à choix unique et la base SQLite v4 restent inchangés. Aucun paquet supplémentaire ni migration de données.

- Animateur : Pilotage, Classement, Participants, en colonnes sur grand écran et panneaux sur téléphone. Pause et révélation restent accessibles ; le classement défile dans sa propre zone avec le bouton suivant fixe.
- Joueur : question et classement séparés, réponses A/B/C/D, soumission au toucher. Sélection bleue ; vert réservé à la correction. Le libellé « Réponse envoyée » suit l'accusé durable, pas le seul clic. Une erreur conserve le choix verrouillé ; le renvoi explicite utilise le même identifiant.
- Révélation : animation personnelle pendant environ 3,5 secondes, correction sur la question, puis classement accessible sur action de l'animateur. Aucun passage forcé au classement.
- Fin : podium du troisième au premier avec ex æquo, puis classement complet. Cette animation est locale à chaque navigateur ; son lancement manuel n'est pas une commande métier synchronisée entre clients.
- Présence : l'animateur voit les connexions WebSocket authentifiées, avec résumé collectif et détail par joueur. Plusieurs onglets d'un joueur comptent comme une présence. La fermeture est observée par le transport : une rupture physique peut être détectée avec retard ; ce n'est pas une preuve instantanée de connectivité.
- Diagnostic de cache et connexion rangé dans le menu « Diagnostic ». Les accès mémorisés et la reprise de partie sont conservés.

Les QCM multiples, texte et autres types restent illustrés seulement dans l'atelier autonome : ils ne sont pas ajoutés au moteur dans ce lot. Le QR code est un emplacement réservé non scannable.

## Séparation technique

La projection commune packages/protocol/mock-presentation.js expose la présence à l'animateur, les points personnels après clôture et le temps de présentation restant. Chaque adaptateur conserve en mémoire l'instant de révélation uniquement après validation de la transaction. Un doublon ne relance pas ce délai ; après redémarrage, les résultats durables sont présentés sans rejouer une animation. Ces métadonnées de présentation ne changent ni les règles ni le registre de réponses.

Le client conserve aussi un marqueur de présentation par salle/question dans sessionStorage pour éviter de rejouer la révélation au rafraîchissement. Aucune persistance d'animation n'est requise pour garantir les scores.

## Vérifications

- 38 tests Node réussis, dont 30 joueurs simulés, présence multi-connexions, délai de révélation non relancé par doublon et récupération après redémarrage.
- Parcours Chrome PC : trois questions, deux joueurs, 3 000 points, pause/reprise, recharge, reconnexion et nouvelle salle. Échec SQL injecté : aucun renvoi automatique, choix verrouillé et renvoi explicite avec identifiant conservé.
- Cache hors ligne et cycle de mise à jour : serveur réellement arrêté, navigateur fermé puis rouvert, récupération après retour du serveur et activation de la nouvelle version après fermeture des onglets.
- Rendu intégré vérifié à 390 × 844 et 320 × 640 : réponses dans la zone question, commandes visibles, aucun débordement horizontal ; podium et bouton de classement complet accessibles sur une seule fenêtre.
- Compilation Android assembleDebug réussie ; même moteur partagé, aucune dépendance métier ajoutée.

## Recette physique restante

Le Pixel n'était pas connecté lors de cette intégration : la version 0.17 n'est pas encore installée ni validée au toucher. Reprendre le parcours Pixel hôte / Redmi joueur sur Chrome puis Firefox, contrôler le cache v8, la reprise après coupure et les boutons sur petit écran. Les preuves précédentes de réseau local et de persistance ne remplacent pas cette recette de la nouvelle interface. iOS, veille prolongée de l'hôte, charge sur téléphones physiques et stratégie HTTPS/WSS de production restent ouverts.

## Actualisation du 25 novembre

Recette utilisateur 0.17 positive sur Pixel/Redmi Chrome : parcours complet, 3 000 points, podium animateur et reconnexion après coupure Wi-Fi courte. Wi-Fi maison, sans nouvelle preuve d’isolement Internet. Synchronisation du podium ajoutée en préparation 0.18 ; test physique différé. Voir [état des lieux](../ETAT_DES_LIEUX.md). Les mentions de recette restante ci-dessus décrivent la situation du 24 novembre.
