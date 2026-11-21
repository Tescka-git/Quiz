# Première expérience — Android et PWA locale

## État réel

La sonde web et son serveur de préparation PC sont disponibles. P0 est positif selon le retour manuel de l'utilisateur : voir [le compte rendu](P0_CACHE_PC.md). La [sonde serveur Android](../../experiments/android-local-pwa/android/README.md), avec Java-WebSocket 1.6.0, a été compilée, installée et testée sur Pixel 7 : un ping/pong depuis Node.js sur PC est positif, voir [P7](P7_WEBSOCKET_PIXEL.md). Le runtime du moteur, le stockage durable et le parcours HTTPS restent ouverts. Les essais P1 à P6 sont **non exécutés**.

## Démarrage sur PC personnel

Prérequis : Node.js 24 ou supérieur. Aucune dépendance npm à télécharger.

```powershell
npm.cmd test
npm.cmd run dev:diagnostic
```

Ouvrir `http://localhost:4173`. Préparer le cache, arrêter le serveur, puis recharger exactement la même URL. Un succès démontre seulement le fonctionnement du cache sur ce navigateur PC.

Le serveur écoute exclusivement la boucle locale. Il n'est ni un serveur Android ni un serveur HTTPS. Pour charger la PWA sur un téléphone, un environnement HTTPS autorisé sera nécessaire ; aucun déploiement n'est effectué. Ne pas désactiver les protections du navigateur ni traiter une IP locale HTTP comme une preuve PWA.

Références : [service workers et contexte sécurisé](https://www.w3.org/TR/service-workers/#secure-context), [contextes sécurisés](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Secure_Contexts), [contenus mixtes](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Mixed_content).

## Contrat du serveur Android expérimental à réaliser

- Recevoir un message texte JSON `{"type":"ping","id":"1"}` et répondre `{"type":"pong","id":"1"}` sur la même connexion WebSocket.
- Ne contenir aucune règle de quiz. Documenter bibliothèque, version Android, origine reçue, adresse d'écoute et conditions TLS.
- Tester `ws://` et `wss://` comme expériences distinctes, sans présumer leur autorisation depuis une origine HTTPS.
- Aucun accès Internet entrant vers le téléphone et aucune ouverture de port domestique nécessaires à ce test local.

Le délai de 10 secondes de la sonde borne une tentative de diagnostic ; ce n'est pas un seuil de performance validé. Le temps mesuré est un aller-retour, pas une latence aller simple.

## Matrice minimale

La [checklist des navigateurs](CHECKLIST_NAVIGATEURS.md) définit le socle Android/iOS et les fiches à compléter. Chrome sur Pixel a réussi le chargement HTTPS avec autorité de laboratoire et le rechargement serveur arrêté ; cela ne valide pas encore P1/P2 sans Internet. Firefox reste à résoudre et à tester sans exception TLS.

| ID | Configuration | Observation attendue | État |
|---|---|---|---|
| P0 | PC localhost, serveur arrêté après cache | Même URL rechargeable hors ligne | Positif, retour utilisateur ; navigateur/version non relevés |
| P1 | Android Chrome, PWA HTTPS préchargée, Wi-Fi local sans Internet | Démarrage et échange avec Android, ou blocage expliqué | Non exécuté |
| P2 | Même configuration avec installation PWA | Comparer à P1 sans présumer que l'installation suffit | Non exécuté |
| P3 | iPhone Safari, avec et sans ajout à l'écran d'accueil | Démarrage et échange, ou blocage expliqué | Non exécuté |
| P4 | Routeur sans Internet, hôte Android | Distinguer problème navigateur et problème du point d'accès | Non exécuté |
| P5 | Écran Android hôte verrouillé et bascule d'application | Relever interruption et reconnexion | Non exécuté |
| P6 | Point d'accès + serveur + données mobiles | Vérifier connectivité simultanée, sans relais déployé | Non exécuté |
| P7 | Client Node.js PC → serveur ws:// sur Pixel 7 au premier plan | Ping/pong local, indépendamment du navigateur | Positif ; voir compte rendu P7 |
| P8 | Navigateur PC → serveur ws:// sur Pixel | Ping/pong depuis la sonde web PC | Positif selon retour utilisateur, 80 à 250 ms ; voir [P8](P8_NAVIGATEUR_PC_PIXEL.md) |
| P9 | Sonde Android en arrière-plan pendant usage de Chrome | Vérifier maintien du serveur | Gel observé, retour des pongs au premier plan ; voir [P9](P9_GEL_SONDE_ANDROID.md) |
| P10 | PC navigateur localhost → Pixel en point d'accès, données mobiles coupées et Ethernet PC débranché | Pings avant et après rechargement sans Internet | Positif selon retour utilisateur ; voir [P10](P10_POINT_ACCES_SANS_INTERNET.md) |

Pour la suite HTTPS, consulter [la préparation de l'essai](PREPARATION_HTTPS_LOCAL.md), notamment les permissions récentes d'accès local de Chrome et le choix d'origine encore à valider.

Pour chaque essai : noter appareils, OS, navigateur/version, installation, origine PWA, adresse WebSocket, certificats et permissions. Précharger avec Internet, vérifier le cache, supprimer réellement l'accès Internet des clients, recharger la même URL et tenter plusieurs pings. Ne pas confondre `navigator.onLine` et une preuve d'accès Internet. Exporter le rapport JSON et relever aussi les erreurs console, car l'API WebSocket ne détaille pas toujours la cause.

Le rapport exporté contient adresses et informations de navigateur : le conserver localement et le relire avant partage. Un échec est un résultat d'expérience utile ; un cache présent n'est pas encore une preuve de démarrage hors ligne.

## Jalon indépendant : portabilité du moteur

Premier résultat positif sur Pixel 7 avec AndroidX JavaScriptEngine : même artefact et mêmes résultats sur le scénario commun, voir [P11](P11_MOTEUR_ANDROID.md). Ce résultat est limité à l'appareil/runtime et aux sept étapes testés ; il ne clôt pas les validations réseau et de durabilité.

Créer ensuite un moteur TypeScript sans dépendance d'exécution et compiler un artefact unique. Exécuter les mêmes octets sur Node.js et dans un runtime Android sans Node.js ; comparer SHA-256 et résultats attendus après chaque commande. Le runtime est encore ouvert et son choix structurant devra être validé avant intégration définitive.

Scénarios : réponse correcte/incorrecte/tardive, doublon, pause/reprise, score, ex aequo, sérialisation et poursuite. Temps et identifiants imposés. Aucune réécriture métier dans l'enveloppe native.

Cette preuve ne valide ni WebSocket, ni SQLite durable, ni arrière-plan, ni fonctionnement PWA hors Internet. Les réponses confirmées non perdues et non doublées seront testées au jalon transactionnel, pas revendiquées par la sonde ping.
