# Préparer l'expérience HTTPS et réseau local

**Statut :** protocole préparé ; aucune origine HTTPS déployée, aucun certificat créé ou installé pour cet essai.

## Séparer les deux questions

1. La PWA est-elle chargée depuis une origine reconnue comme sécurisée, puis disponible sans réseau ?
2. Cette PWA peut-elle joindre le serveur Android local, avec les protections normales du navigateur ?

Le succès du navigateur PC sur localhost (P8) ne répond pas à ces deux questions sur téléphone.

## Évolution des permissions navigateur

Chrome documente une autorisation d'accès au réseau local, étendue aux WebSockets à partir de Chrome 147. Certaines connexions HTTPS vers une adresse locale explicite en `ws://` peuvent bénéficier d'une exception aux contrôles de contenu mixte, sous contrôle de permission. Il faut relever la version et tester ce comportement ; il ne s'applique pas implicitement aux autres navigateurs.

Sources primaires : [Chrome 147](https://developer.chrome.com/release-notes/147), [guide Chrome sur l'accès local](https://developer.chrome.google.cn/docs/modern-web-guidance/guides/security/local-network-access?hl=en).

Cette permission normale n'est pas une désactivation des protections. Ne changer ni flags expérimentaux, ni politiques entreprise pour obtenir artificiellement un succès.

## Choix d'origine à valider avant préparation

| Option | Ce qu'elle permet | Limite et accord nécessaire |
|---|---|---|
| Origine HTTPS existante autorisée par l'utilisateur | Charger la sonde avec une confiance publique normale | Mise en ligne explicite à autoriser ; aucune destination actuellement choisie |
| HTTPS local avec autorité de test | Essais sans hébergement distant, puis WSS local avec certificat approprié | Création de clés et installation explicite d'une autorité sur les appareils personnels de test ; ne démontre pas un parcours sans installation pour les joueurs |
| Localhost via redirection ADB | Préparer un test sur navigateur Android sans certificat | Origine spéciale de développement ; ne démontre pas HTTPS public, accès depuis un autre joueur ni absence d'ADB |

Ne pas assimiler l'acceptation manuelle d'une alerte de certificat à une validation TLS normale. Un futur essai WSS devra vérifier nom/adresse du certificat, chaîne de confiance et expiration, sans exception de validation.

## Séquence prévue

1. Choisir et autoriser l'origine de préparation ; ne pas publier ni créer de clés avant cet accord.
2. Charger la sonde avec Internet sur un téléphone client ; relever navigateur/version et origine.
3. Depuis cette origine, essayer le serveur Android en `ws://` : noter permission proposée, choix et résultat. Un échec est un résultat utile.
4. Tester séparément WSS avec une configuration TLS validée, lorsque préparée.
5. Vérifier le cache, fermer/recharger l'application après suppression effective d'Internet, puis refaire les échanges locaux.
6. Répéter sur un autre téléphone : un client exécuté sur le téléphone hôte ne suffit pas à valider le parcours joueur.

Si le Pixel est le seul téléphone disponible, les essais sur celui-ci restent préparatoires. Point d'accès, routeur externe, veille et 30 joueurs sont des validations distinctes.
