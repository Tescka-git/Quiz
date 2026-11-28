# État des lieux — 25 novembre 2026

## Ce qui fonctionne

Prototype de faisabilité : même moteur TypeScript compilé pour Node et Android, serveur local HTTP/WebSocket ou HTTPS/WSS de laboratoire, SQLite transactionnel, PWA préchargée. Trois questions à choix unique, pause, chronomètre autoritaire, réponses définitives, scores cumulés, récupération et reconnexion. Invariant : accusé après transaction, dédoublonnage par identifiant.

Le 25 novembre, l'utilisateur valide la 0.17 sur Pixel hôte/animateur et Redmi joueur dans Chrome, sur Wi-Fi maison : nouvelles interfaces, soumission au toucher, correction, classement, 3 000 points et podium animateur ; coupure Wi-Fi courte du Redmi puis reconnexion avec points conservés. Ce test n'établit pas de nouvelles conditions sans Internet. Ancien formulaire initialement conservé en cache, mise à jour obtenue après rétablissement de la connexion.

## Essai Raspberry du 28 novembre

[P26](experiments/P26_RASPBERRY_JEU_DNS.md) : jeu Node/SQLite et DNS de sonde démarrés dans un dossier utilisateur séparé sur Quizcotte, sans installation système ni changement réseau. Parcours automatisé à 3 000 points et résolution explicite positifs ; recette utilisateur PC animateur/Redmi joueur positive, podium partagé compris. HTTP/ws seulement ; DNS sur port 53535, pas encore utilisé par les navigateurs. Domaine public et HTTPS/WSS hors laboratoire non résolus.

## Dernier ajustement

Préparation 0.20 : version de l’interface et cache visibles dans Diagnostic ; navigation vers le classement calculée depuis la position réelle des panneaux. Le test navigateur couvre une demande de podium pendant la correction et vérifie le panneau effectivement visible. La cause de l’absence de podium rapportée sur le Redmi reste à confirmer avec la version affichée ; recette physique validée le 25 novembre sur Pixel/Redmi Chrome : version affichée correcte, accès animateur immédiat et bascule automatique du joueur vers le podium après correction.


Préparation 0.19 : accès immédiat au classement côté animateur dès la clôture ; les 3,5 secondes de correction restent côté joueur. Une demande de podium reçue pendant cette animation est prise en compte après sa fin. Cache v10 remplacé par v11 en 0.20 ; correction validée manuellement dans la recette 0.20.

### Podium partagé

Préparation 0.18 : commande podium réservée à l'animateur après clôture finale. Déclenchement enregistré dans une petite table SQLite additive mock_podium, commune aux deux adaptateurs, sans migration des scores ni changement du moteur. Tous les clients reçoivent cet état : passage automatique au classement et animation locale. Un doublon ne relance pas une animation déjà vue ; reconnexion et redémarrage conservent la demande. Les animations ne sont pas synchronisées à la milliseconde. Cache v9. Recette physique de ce changement différée à la demande de l'utilisateur.

## Limites actuelles

Pas encore de création de quiz, comptes, médias, QCM multiple/texte dans le moteur, vrai QR code ou statistiques détaillées. Les types supplémentaires de l'atelier visuel sont des simulations. Certificats et installation d'autorité restent une solution de laboratoire. iOS hôte non validé ; recette iPhone joueur indisponible. Firefox Redmi validé auparavant, nouvelle interface/cache à retester. Charge automatisée de 30 joueurs distincte des essais physiques à plusieurs téléphones. Veille prolongée de l'hôte encore ouverte.

## Reste à faire — ordre retenu le 25 novembre

1. **Terminé en 0.20** : podium partagé validé sur Pixel/Redmi Chrome, avec bouton animateur immédiat et animation joueur conservée.
2. **Firefox Redmi 0.20 validé** : quiz, podium, reconnexion et cache de l’interface après coupure/recharge. Pas de nouvelle preuve de partie jouable sans Internet avec réseau local conservé. Notification réseau corrigée en préparation 0.21 ; recette physique restante. L’essai iPhone reste séparé.
3. **Étude initiale réalisée — [P25](experiments/P25_HTTPS_WSS_HORS_LABORATOIRE.md)** : comparaison domaine/certificat public, permissions réseau local et autres options ; première sonde HTTP/ws sur IP privée positive pour le transport, négative pour le contexte sécurisé/service worker. Aucun choix de distribution arrêté. Complément du 28 novembre : contrôle PC de permissions refusée/accordée positif dans une simulation public vers loopback, avec exception TLS ciblée de laboratoire ; page diagnostic prête ; le 28 novembre, Chrome Redmi reçoit un pong du Pixel depuis la page HTTPS locale sans invite, permissions lues à prompt. Firefox Redmi échoue dans le même montage (1006, raison vide, permissions prompt), cause non établie. Cela ne valide pas une origine publique vers le LAN et ne fournit pas une solution inter-navigateurs. Chrome Redmi recharge la page diagnostic après coupure Wi-Fi/données mobiles, puis reçoit de nouveau un pong après retour au Wi-Fi maison ; cette reprise ne démontre pas une communication sans Internet. Prochaine preuve : permissions sur téléphones puis domaine/WSS avec résolution locale, après validation des moyens nécessaires.
4. Développer une expérience de buzzer autonome suivant [les règles validées](SPECIFICATIONS.md#mode-buzzer--règles-validées-le-25-novembre-2026), puis l'intégration au quiz et aux médias. Ce lot n'est pas commencé.
5. Élargir les essais à quelques téléphones, puis environ dix ; garder les 30 téléphones physiques pour un prototype suffisamment mature. Veille prolongée de l'hôte à garder au programme sans en faire le prochain blocage.

**Essai iPhone joueur prévu ce week-end (28–29 novembre 2026), sous réserve de disponibilité** : commencer par Safari, vérifier l'accès sécurisé, l'inscription, le quiz, puis cache et reconnexion. Cet essai ne concerne pas l'hébergement sur iOS. Aucune validation iPhone n'est acquise à ce stade. Les étapes 1 à 3 peuvent avancer sans cet appareil.

Création de quiz, types de questions supplémentaires, vrai QR code, statistiques, comptes et relais de projection restent des développements fonctionnels distincts à ordonner selon les besoins. La priorité demeure la fiabilité et la portabilité.

## Ménage documentaire effectué

L'architecture présente désormais les composants et contraintes actuels ; son ancien contenu est conservé intégralement dans [une archive datée](archives/ARCHITECTURE_HISTORIQUE_2026-11-25.md), avec liens ajustés. Un [index des expériences](experiments/README.md) permet de retrouver les preuves. Les règles du buzzer sont ajoutées au cahier des charges sans implémentation. Les questions ouvertes sont maintenant regroupées par risque et fonction ; leur ancienne chronologie est conservée dans [une seconde archive](archives/QUESTIONS_OUVERTES_HISTORIQUE_2026-11-25.md). Les limites résolues ne sont plus présentées comme des tâches à reprendre.

## Rangement technique différé — facultatif

Le rangement documentaire est terminé. Ces propositions techniques ne bloquent ni les essais ni le reste à faire :

| Ensemble | Proposition différée | Précaution |
|---|---|---|
| Chemin jouable apps/web/mock, serveur et protocole | Clarifier les noms « mock » | Renommage séparé, avec mise à jour des références et tests |
| tooling | Classer les scripts par rôle : tests courants, outils Android, sondes historiques | Vérifier les appels dans package.json et la documentation avant déplacement |
| Application Android | Séparer l'écran d'hébergement des boutons de sondes | Garder les diagnostics utiles pendant la faisabilité |

L'atelier apps/web/layout est conservé pour discuter les écrans. L'actualisation des synthèses après les essais relève de l'entretien documentaire habituel. Aucun nettoyage immédiat de .tools ou artifacts n'est prévu ; ces dossiers restent hors Git et contiennent notamment SDK, certificats et bases locales.

Aucun code, script, certificat ni base locale supprimé ou déplacé. Toute réorganisation technique sera un lot indépendant et vérifiable.
