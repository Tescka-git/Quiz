# Kuikuiz — Architecture technique (v0.2)

> Ce document sépare les orientations validées des solutions encore expérimentales. La faisabilité n'est pas démontrée à ce stade.

## 8. Architecture et modes réseau — décisions récentes
- Moteur de jeu commun écrit en **TypeScript**, indépendant du mode d'hébergement ; partage des règles métier et du protocole, avec adaptateurs spécifiques selon l'environnement.
- Hébergement distant sur serveur **Node.js** pour les joueurs connectés par LTE/4G/5G et Internet.
- Hébergement local visé sur **téléphone Android de l'animateur**, avec composant serveur/adaptateur approprié ; faisabilité à vérifier expérimentalement.
- Trois configurations : (1) point d'accès Wi-Fi du téléphone Android animateur sans Internet ; (2) routeur Wi-Fi externe sans Internet avec téléphone Android hébergeur ; (3) LTE/Internet avec serveur distant.
- Communication temps réel par **WebSocket** ; attention aux restrictions des navigateurs pour une PWA HTTPS vers une adresse locale ws:// et à l'exigence de contexte sécurisé pour les service workers.
- Les joueurs acceptent de **charger Kuikuiz une première fois avec Internet** avant une partie locale hors ligne. **Installation PWA recommandée mais facultative** ; contrôle automatique de préparation hors ligne.
- Rejoindre une session locale via **QR code**, avec saisie manuelle en secours ; fonctionnement inter-navigateurs à valider.
- En salle d'attente, préchargement des médias et contenus de la session depuis le serveur local ; état « prêt ».
- Le diagnostic réseau est **non bloquant** : mesure de la latence, de la stabilité, des pertes/retards et des déconnexions, avant et pendant la partie ; avertissement explicite, suggestion d'un autre mode de connexion si pertinent, décision finale laissée à l'animateur.

## 9. Stratégie de MVP et validation
- Priorité à la **validation de l'autonomie locale, de la connectivité et du temps réel**, et non à une simple réduction du périmètre fonctionnel.
- Tests de charge automatisés avec **30 joueurs simulés**, puis essais réels avec **30 téléphones physiques**, sur les trois modes réseau.
- Mesurer d'abord les performances réelles avant de fixer les seuils d'acceptation de latence et de reconnexion.
- Mesures : latence, jitter, pertes de messages, écarts de synchronisation, temps de reconnexion, stabilité, comportement en pause et après restauration.
- Invariant de fiabilité : **aucune réponse confirmée enregistrée ne doit être perdue**.
- Prototypes techniques envisagés pour confronter serveur Node.js et hébergement Android ; leur ordre de réalisation reste à décider.
- Risques à valider : nombre réel de clients admis par le point d'accès Android, exécution du moteur TypeScript sur Android, cycle de vie/veille Android, accès HTTPS/WSS local et cache PWA sur Android/iOS, fonctionnement hors Internet.

## 11. Séparation hôte technique / animateur — décision validée
- **Hôte technique** : appareil Android qui exécute le serveur local et le moteur de jeu.
- **Animateur** : personne qui pilote la session depuis son propre téléphone ou un PC ; seul l'animateur initial détient les commandes en v1.
- Les deux rôles peuvent être portés par **deux appareils et deux personnes distincts**.
- L'hôte technique peut être le téléphone **d'un joueur**, à condition de vérifier que son interface joueur et le serveur peuvent fonctionner simultanément et durablement.
- En mode routeur Wi-Fi externe, le téléphone hôte n'a pas besoin d'assurer lui-même le point d'accès.
- Points de validation : maintien du serveur pendant l'utilisation de l'interface joueur, verrouillage de l'écran, veille, coupure réseau, batterie et restauration de la partie.

## 12. Animation depuis un PC professionnel — décision validée
- Un PC d'entreprise fortement verrouillé n'est **pas destiné à héberger le serveur de jeu localement**.
- L'animateur y utilise **une interface web dans le navigateur**, connectée à un **serveur distant** via le réseau autorisé par l'entreprise.
- Aucun besoin prévu d'installer Node.js, Docker ou un exécutable serveur sur ce PC.
- L'accès au serveur distant reste soumis aux règles de filtrage réseau de l'entreprise ; aucun contournement de ces règles n'est prévu.
- L'idée d'un serveur Windows portable sur PC d'entreprise est **écartée du périmètre retenu**.

## 13. Hébergement distant de test — à approfondir
- Aucun hébergeur ni serveur distant définitif n'est choisi à ce stade.
- Le NAS personnel **Synology DS212j (256 Mo)** n'est **pas retenu** comme serveur de test : plateforme trop ancienne et limitée, particulièrement pour une exposition sur Internet.
- Vérifier ultérieurement si le Raspberry Pi disponible est un **modèle 3 ou 4**, puis tester sa capacité à héberger le serveur Node.js et une trentaine de joueurs.
- Étudier l'accès Internet sécurisé (HTTPS/WSS, nom DNS, connectivité et protection du réseau domestique) et comparer avec un petit hébergement cloud.
- Ce choix **ne bloque pas** le développement initial sur PC personnel.

