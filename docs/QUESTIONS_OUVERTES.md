# Kuikuiz — Questions ouvertes et pistes à explorer (v0.2)

Les points ci-dessous ne sont pas des décisions techniques définitives.

## Faisabilité prioritaire
- **Android hôte** : comment exécuter le moteur TypeScript commun avec un serveur WebSocket local ? Comparer les adaptateurs/environnements possibles et les restrictions du système.
- **PWA préchargée et réseau local** : vérifier les restrictions HTTPS/WSS, certificats, contenus mixtes, service workers, Android et iOS ; ne pas supposer que la seule installation de la PWA suffit.
- **Point d'accès Android** : vérifier expérimentalement le nombre de clients admis et la stabilité avec 30 téléphones.
- **Hôte Android distinct de l'animateur** : tester le cas d'un téléphone hôte appartenant à un joueur, y compris écran verrouillé, batterie, veille et bascule d'applications.
- **Fiabilité** : persistance des réponses confirmées, pause/reprise, reconnexion, restauration après interruption et cohérence des classements.
- **Tests** : 30 clients simulés et 30 téléphones physiques ; instrumenter latence, jitter, pertes, synchronisation et temps de reconnexion avant de définir les seuils.
- **Organisation** : décider de l'ordre des prototypes Node.js et Android ; les deux doivent partager les règles métier.

## Hébergement distant — non bloquant
- Aucun hébergeur retenu. Tester d'abord sur PC personnel.
- Identifier le Raspberry Pi disponible (3 ou 4), sa mémoire, son OS et sa capacité à exécuter le serveur.
- Étudier un accès Internet sécurisé en HTTPS/WSS sans exposer imprudemment le réseau domestique ; comparer à un hébergement cloud économique.
- Synology DS212j 256 Mo : écarté pour cet usage.
- PC professionnel : navigateur + serveur distant uniquement, sous réserve des politiques réseau.

## Fonctionnalités différées / choix ouverts
- Méthode d'invitation des collaborateurs (compte, lien ou combinaison) : collaboration de priorité basse.
- Formule de crédit partiel QCM : gérer les cas limites, notamment zéro mauvaise option possible.
- Définir le périmètre précis du MVP jouable après validation des prototypes.
- Nom public : Kuikuiz favori provisoire ; vérifier marques, stores et domaines avant adoption.
- Publication publique éventuelle : PWA bêta d'abord ; stores ensuite selon intérêt et faisabilité.

## Registre des décisions
Les décisions validées sont documentées dans `SPECIFICATIONS.md` et `ARCHITECTURE.md`. Ne pas transformer une hypothèse de cette liste en exigence sans validation explicite.
