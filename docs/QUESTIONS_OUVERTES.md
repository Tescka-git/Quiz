# Kuikuiz — Questions ouvertes

Référence : 25 novembre 2026. Ce document regroupe les inconnues actuelles ; les décisions fonctionnelles validées sont dans [le cahier des charges](SPECIFICATIONS.md), les contraintes techniques dans [l'architecture](ARCHITECTURE.md). L'ordre de travail se lit dans [l'état des lieux](ETAT_DES_LIEUX.md).

Les résultats intermédiaires et anciennes attentes sont conservés dans [l'archive](archives/QUESTIONS_OUVERTES_HISTORIQUE_2026-11-25.md) et [les expériences](experiments/README.md). Une réussite sur un appareil ne vaut pas validation générale.

## Recettes à compléter

| Sujet | Acquis à conserver | Question ou essai restant |
|---|---|---|
| Podium partagé 0.18 | Tests automatiques et compilation Android réussis | Recette au toucher Pixel/Redmi différée ; 0.17 seulement validée manuellement |
| Navigateurs | Chrome Pixel/Redmi ; Firefox Redmi positif avec confiance de laboratoire | Nouvelle interface, cache, reconnexion et hors Internet Firefox ; incident historique Firefox Pixel ; Samsung Browser et navigateurs iOS |
| iPhone joueur | Participation PWA prévue, distincte de l'hébergement | Safari, Chrome et Firefox, stockage/cache, permissions réseau et HTTPS/WSS ; appareil indisponible actuellement |
| Hors Internet | Parcours locaux positifs documentés avec leurs conditions | Répéter les parcours sur chaque navigateur/version en relevant les accès réseau ; ne pas extrapoler une recette déclarative à une mesure indépendante |
| Hôte appartenant à un joueur | Rôles animateur et hôte séparés | Endurance avec jeu simultané, changements d'application, batterie et écran verrouillé |
| Cycle de vie Android | Reprise et reconnexions testées sur Pixel/Redmi dans les scénarios consignés | Veille prolongée de l'hôte, diversité des appareils et restrictions système ; priorité différée |

Le suivi détaillé des navigateurs reste dans [la checklist](experiments/CHECKLIST_NAVIGATEURS.md). Définir les versions minimales et la fenêtre de support avant toute déclaration de compatibilité.

## HTTPS/WSS et préparation hors ligne

Étude initiale et protocole comparatif dans [P25](experiments/P25_HTTPS_WSS_HORS_LABORATOIRE.md). Premier contrôle sur PC seulement : HTTP/IP privée permet ws mais pas une origine PWA sécurisée. Résolution locale d'un domaine certifié et permissions depuis une origine HTTPS restent à démontrer sur téléphones.

- Choisir un parcours de confiance utilisable hors laboratoire : certificat reconnu, adressage, changement d'IP et renouvellement, sans installer manuellement une autorité sur chaque appareil joueur.
- Vérifier les contraintes de contexte sécurisé, permissions réseau local et service workers sur les navigateurs visés. Installer une PWA ne résout pas à lui seul ces contraintes.
- Clarifier l'expérience de mise à jour du cache et le diagnostic d'ancienne version ; distinguer interface disponible hors ligne et partie jouable avec son hôte.
- Le certificat actuel et les réglages Firefox sont des moyens de laboratoire, pas une décision de distribution.

## Fiabilité, portabilité et capacité

- Moteur partagé sans Node.js exécuté sur Pixel : élargir la compatibilité appareil/runtime et maintenir les contrôles d'imports, de dépendances transitives et d'artefact. Ne pas rouvrir ce jalon comme s'il n'avait jamais été testé.
- SQLite et confirmation réseau sont intégrés aux adaptateurs. Compléter les scénarios d'interruption en pleine transaction Android et les limites en cas de panne matérielle ; quantifier coût, fréquence et précision des checkpoints. La reprise durable ne promet pas le gel à l'instant exact de mort du processus.
- Mesurer latence, jitter, pertes/retards, synchronisation et reconnexion avant de fixer des objectifs chiffrés. Aucune réponse confirmée perdue ou comptabilisée deux fois reste un invariant.
- Trente clients simulés ne prouvent pas trente téléphones. Progresser vers quelques appareils, environ dix accessibles, puis trente physiques lorsque le prototype et la disponibilité le permettent. Mesurer notamment la limite réelle du point d'accès Android.
- Conventions de score à finaliser pour les futurs types : arrondi et frontière d'expiration (prototype : t >= T refusé), crédit partiel QCM et cas sans mauvaise option.

## Buzzer — règles décidées, conception à préparer

Le mode est validé dans [les spécifications](SPECIFICATIONS.md#mode-buzzer--règles-validées-le-25-novembre-2026), mais non implémenté. Le réarmement ne comporte aucun délai automatique ; ce choix n'est plus ouvert.

Restent à concevoir : commandes et états, collecte des buzz suivants en mode autonome, signal explicite de proposition orale, conservation des exclusions après reconnexion, points des quiz buzzer, pause/reprise des médias et signal sonore configurable. Commencer par une expérience autonome, puis relier le mécanisme au quiz. L'ordre retenu est la réception serveur, sans promesse d'égalité parfaite de latence.

## Relais de projection et hébergement distant — différés

- Relais de projection en lecture seule pour une partie locale : choisir protocole sécurisé, association et droits ; ne publier que l'état révélable. La projection ne calcule pas les scores et sa panne ne doit pas arrêter le jeu local.
- Valider simultanément point d'accès Android, serveur local et connexion mobile sortante ; mesurer batterie et stabilité. Tester l'accès et la resynchronisation du navigateur d'entreprise, sans contourner ses politiques. Pilotage via relais non inclus.
- Aucun hébergeur choisi ni déploiement autorisé. PC personnel pour le développement ; identifier le Raspberry Pi disponible (3 ou 4, mémoire/OS), comparer sa capacité et son accès HTTPS/WSS avec un petit hébergement cloud. Synology DS212j 256 Mo écarté.
- Un serveur Internet hébergeant une partie et un relais de projection restent deux rôles distincts. Le PC professionnel est un client navigateur, pas un hôte serveur local.

## Autres fonctions différées

- Hébergement iOS/iPhone : runtime du même moteur, serveur local, cycle de vie et chaîne Apple à étudier ; aucune faisabilité validée. Aucun choix Next.js associé.
- Création de quiz, autres types de questions et médias, vrai QR code, statistiques et comptes : découper les prochaines étapes du produit après les expériences prioritaires.
- Sélecteur d'historique des parties et parcours d'accès final : préciser le besoin avant développement.
- Collaboration : invitation par compte, lien ou combinaison ; priorité basse.
- Nom public Kuikuiz : vérifier marques, stores et domaines avant adoption. Publication éventuelle : PWA bêta d'abord, stores selon intérêt et faisabilité ; pas de publication autorisée par ce document.

Toute nouvelle technologie structurante ou transformation d'une hypothèse en exigence demande une validation explicite.
