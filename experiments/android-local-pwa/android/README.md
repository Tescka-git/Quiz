# Sonde Android expérimentale

Application expérimentale Java, sans Node.js. Elle conserve les sondes isolées et héberge depuis la version 0.6 une maquette de trois questions avec le moteur TypeScript compilé commun, SQLite et des interfaces web. Ces choix ne sélectionnent pas une enveloppe définitive.

## Construction

**Actualisation P20 :** le même APK 0.8 charge désormais le certificat de laboratoire couvrant aussi l'adresse du point d'accès. Le renouvellement autorisé conserve clé et autorité, avec sauvegarde privée ; ni nouveau build ni clé dans l'APK. HTTPS/WSS et jeu réussissent sur le réseau isolé dans [P20](../../../docs/experiments/P20_WSS_POINT_ACCES_SANS_INTERNET.md). Utiliser le profil TLS nommé pour la préparation ; l'installateur sans profil refuse d'écraser ce conteneur différent.

**Actualisation P19 :** la version 0.8 est maintenant installée sur le Pixel. Cache HTTPS et arrêt/reprise de l'hôte sont positifs par automatisation Chrome ; les détails et la portée sont dans [P19](../../../docs/experiments/P19_RECETTE_CACHE_PIXEL.md). L'utilisateur a aussi terminé le parcours tactile ; l'ergonomie reste à retravailler. Les lignes P18 ci-dessous décrivent le premier lot, limité au PC.

La version **0.8**, compilée mais non installée lors du premier lot P18, embarque les routes du service worker, du manifeste, de l'icône et du contrôle du cache. Le cache n'est disponible que sur une origine reconnue comme sécurisée ; HTTP local ordinaire garde le jeu connecté. La preuve de rechargement serveur arrêté concerne pour l'instant Chrome PC, voir [P18](../../../docs/experiments/P18_CACHE_INTERFACE_PC.md). Les essais physiques de 0.7 restent les relevés historiques P17.

Depuis la version **0.7**, **Héberger en HTTPS/WSS de test** utilise HTTPS 8443 et WSS 8789 avec le certificat de laboratoire déjà créé, préparé dans les fichiers privés de l'application. Arrêter la maquette avant de changer de mode. Aucun secret n'est embarqué ; aucun certificat n'est créé ni installé dans un magasin système par ce bouton. Voir [P17](../../../docs/experiments/P17_HTTPS_WSS_ANDROID.md) pour `prepare:android-tls`, les contrôles et les limites d'adresse/cache PWA.

Pour la version actuelle, préparer depuis la racine avec **`npm.cmd run prepare:mock-android`**, puis compiler. Gradle vérifie les empreintes du moteur et des ressources communes avant construction. Le bouton **Héberger la maquette de quiz** démarre un service distinct : HTTP 8080, WebSocket 8788 et base privée `kuikuiz-playable-v2.db`. Ouvrir `http://ADRESSE_DU_PIXEL:8080` depuis le PC personnel sur le même réseau. Voir [P16](../../../docs/experiments/P16_MAQUETTE_TROIS_QUESTIONS.md) pour la recette et ses limites HTTPS/PWA.

L'adaptateur HTTP emploie NanoHTTPD 2.3.1 ; WebSocket reste Java-WebSocket 1.6.0 et le runtime AndroidX JavaScriptEngine 1.1.1. Aucune de ces dépendances n'entre dans le moteur. Les anciennes bases de diagnostic ne sont pas remplacées. **Arrêter la maquette de quiz** coupe uniquement ce nouveau service.

Depuis la version 0.5, le bouton **Tester SQLite après arrêt forcé** ouvre une expérience native en deux phases, indépendante du serveur ping. Elle prépare des données fictives et conserve la connexion SQLite ouverte ; après arrêt forcé et relance, elle vérifie restauration gelée, doublon et rollback. Premier résultat positif sur Pixel 7 : voir [P14](../../../docs/experiments/P14_SQLITE_ANDROID.md). Ne pas utiliser cette base de diagnostic comme une session réelle.

Depuis la version 0.3, préparer d'abord les ressources du moteur depuis la racine du dépôt avec `npm.cmd run prepare:engine-probe`. Le bouton **Tester le moteur JavaScript** lance une expérience indépendante, sans serveur WebSocket. La dépendance AndroidX JavaScriptEngine 1.1.1 reste dans l'enveloppe Android, jamais dans le moteur. Voir [P11](../../../docs/experiments/P11_MOTEUR_ANDROID.md).

Prérequis : JDK 17, Gradle 8.11.1, SDK Android plateforme 35 et Build Tools 35.0.0. Le projet utilise Android Gradle Plugin 8.9.2. Définir `ANDROID_HOME` vers le SDK et `JAVA_HOME` vers le JDK. Depuis ce dossier :

```text
gradle assembleDebug
```

Un wrapper Gradle n'est pas encore fourni. L'APK attendu est `app/build/outputs/apk/debug/app-debug.apk`. L'absence de compilation réussie doit rester explicite dans les rapports.

La première compilation, l'installation et un échange depuis Node.js ont réussi sur Pixel 7 : voir [le rapport P7](../../../docs/experiments/P7_WEBSOCKET_PIXEL.md). Les essais navigateur et HTTPS restent distincts.

Sur ce PC, les outils téléchargés sont isolés dans `.tools` à la racine du dépôt. Pour les réutiliser sans changer le PATH permanent : `powershell -File tooling/build-android-probe.ps1` depuis la racine. Ce script restaure les variables d'environnement après compilation et ne télécharge pas lui-même le SDK.

Installer sur le téléphone de test avec `adb install -r` puis ouvrir **Kuikuiz — Sonde réseau**. Démarrer le serveur et relever l'adresse Wi-Fi affichée. Dans la sonde web, saisir `ws://ADRESSE_WIFI:8787`, connecter puis envoyer un ping. Le téléphone et le client doivent pouvoir communiquer sur le réseau local.

Pour isoler le transport depuis le PC, utiliser aussi `npm.cmd run probe:ping -- ws://ADRESSE_WIFI:8787` à la racine. Une réponse depuis Node.js ne valide pas les règles de sécurité navigateur.

## Limites

- Depuis la version 0.2, serveur dans un service de premier plan `connectedDevice`, avec notification et arrêt explicite. Autoriser les notifications puis appuyer de nouveau sur Démarrer. Aucun réglage de batterie ni mécanisme de gel désactivé ; maintien prolongé et verrouillage restent à mesurer.
- `ws://` uniquement. Une connexion depuis HTTPS peut être bloquée : relever l'erreur, ne pas désactiver les protections. Une réussite PC localhost ne valide pas la PWA HTTPS Android.
- Écoute sur toutes les interfaces ; utiliser un réseau de confiance, arrêter après l'essai. Pas d'authentification ni de filtrage d'origine dans cette sonde jetable. Aucun contenu de quiz ni secret à transmettre.
- Le contrôle de longueur des messages applicatifs n'est pas une protection complète contre un client hostile.
- WSS et certificats, stockage durable, réseau sans Internet et 30 téléphones restent à tester.

Références : [compatibilité AGP 8.9](https://developer.android.com/build/releases/agp-8-9-0-release-notes), [Java-WebSocket 1.6.0](https://github.com/TooTallNate/Java-WebSocket/tree/v1.6.0).

## Service expérimental 0.2

`MainActivity` ne possède plus le serveur ; elle démarre et arrête `ProbeService`. Fermer l'activité n'arrête pas le service. La notification fournit une action Arrêter ; le service n'est pas exporté et ne redémarre pas automatiquement après arrêt du processus (`START_NOT_STICKY`). Aucun démarrage au boot.

Le type `connectedDevice` correspond ici aux échanges réseau avec les appareils clients. Les permissions `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_CONNECTED_DEVICE` et `CHANGE_NETWORK_STATE` sont déclarées ; cette dernière satisfait un prérequis documenté du type de service, sans modification effective de la configuration réseau dans la sonde. `POST_NOTIFICATIONS` est demandée à l'utilisateur pour rendre la notification visible. Référence : [types de services Android](https://developer.android.com/develop/background-work/services/fgs/service-types).

Compilation et installation de la version 0.2 réussies sur le Pixel ; la validation des échanges lorsque Chrome est visible reste à exécuter. Le résultat initial P7 concerne la version 0.1.
