# P9 — Gel de la sonde Android en arrière-plan

## Observations du 21 novembre 2026

Sur Pixel 7 / Android 17, l'utilisateur ouvre la sonde web HTTPS en cache dans Chrome puis tente `ws://192.168.1.21:8787`. Seul `connection-attempt` apparaît, sans `open`, erreur ni fermeture pendant l'attente rapportée. Le bouton ping reste désactivé.

Le client Node.js du PC ne reçoit pas non plus de pong dans son délai de diagnostic de 10 secondes. L'inspection ADB du processus `fr.kuikuiz.probe` relève `isFrozen=true` et un état de processus en cache pendant que l'application native est en arrière-plan.

Après remise de l'activité native au premier plan par ADB, sans modification du réseau ni du certificat, un nouveau ping Node.js reçoit un pong (aller-retour unique d'environ 44,94 ms). Le serveur n'a pas été redémarré pour cette vérification.

## Conclusion limitée

Le gel du processus explique l'indisponibilité observée du serveur natif en arrière-plan sur cette configuration. La sonde actuelle ne permet pas de valider durablement le cas hôte et navigateur joueur sur le même téléphone. Ce test ne conclut pas sur l'autorisation HTTPS vers ws dans Chrome : il faut le refaire avec un hôte maintenu actif.

## Suites

- Étudier et expérimenter un service de premier plan Android visible par notification, démarré par l'utilisateur, avec arrêt explicite du serveur et respect des restrictions Android. Type de service et conditions d'utilisation à vérifier avant implémentation.
- Tester bascule d'application, verrouillage, retour à la sonde et arrêt du service ; ne pas assimiler un succès bref à une preuve de maintien durable.
- Prévoir un délai de connexion dans la sonde web : la tentative ne doit pas rester indéfiniment sans indication.
- Refaire ensuite le test depuis la PWA HTTPS et depuis un second appareil, puis sans Internet.

Aucun réglage d'économie de batterie ni mécanisme de gel n'a été désactivé.

## Adaptation 0.2 — validation en cours

Le serveur a été déplacé dans `ProbeService`, service de premier plan `connectedDevice` avec notification et action d'arrêt. Démarrage depuis l'activité visible après autorisation de notification ; pas de démarrage automatique après arrêt du processus. L'activité ne possède plus le serveur et ne l'arrête plus lors de sa destruction.

La compilation Gradle et l'installation de cette version ont réussi. Prochains contrôles : autorisation de notification par l'utilisateur, démarrage, pings pendant utilisation de Chrome, puis arrêt explicite et refus de connexion. La veille prolongée et les autres appareils restent à tester. Cette adaptation n'est pas encore une preuve de maintien durable.

## Résultat manuel après adaptation

L'utilisateur confirme avoir envoyé un ping depuis la page de diagnostic dans Chrome sur le Pixel et reçu un pong, avec affichage du temps d'aller-retour. L'écran natif de la sonde n'est donc plus au premier plan lors de cet échange. Valeur exacte, nombre d'échanges et durée non relevés ; visibilité de la notification non confirmée explicitement.

Le parcours de cette séquence utilise la page HTTPS mise en cache et le serveur local `ws://192.168.1.21:8787`, sur le même Pixel. Aucun contournement TLS ou désactivation de protection navigateur n'a été demandé. **Verdict : échange ponctuel positif après passage au service de premier plan.**

Après un court verrouillage, l'utilisateur observe une déconnexion du navigateur, puis confirme le retour d'un pong après reconnexion manuelle, sans redémarrer le serveur Android. Durée exacte et valeur d'aller-retour non relevées. Le court parcours verrouillage / retour / reconnexion est positif ; le maintien continu de la connexion navigateur n'est pas démontré.

Ne pas extrapoler à un maintien durable, à un autre navigateur ou appareil, à WSS, à un téléphone client distinct ni au fonctionnement sans Internet. L'arrêt explicite du service et la veille prolongée restent à vérifier.
