# Sonde Android expérimentale

Application native Java isolée, sans Node.js et sans moteur de quiz. Java est utilisé uniquement pour cette petite sonde ; il ne sélectionne ni le langage de l'enveloppe définitive ni le runtime du moteur TypeScript.

## Construction

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

- Serveur au premier plan, écran maintenu allumé pendant l'essai ; aucun service d'arrière-plan démontré.
- `ws://` uniquement. Une connexion depuis HTTPS peut être bloquée : relever l'erreur, ne pas désactiver les protections. Une réussite PC localhost ne valide pas la PWA HTTPS Android.
- Écoute sur toutes les interfaces ; utiliser un réseau de confiance, arrêter après l'essai. Pas d'authentification ni de filtrage d'origine dans cette sonde jetable. Aucun contenu de quiz ni secret à transmettre.
- Le contrôle de longueur des messages applicatifs n'est pas une protection complète contre un client hostile.
- WSS et certificats, stockage durable, réseau sans Internet et 30 téléphones restent à tester.

Références : [compatibilité AGP 8.9](https://developer.android.com/build/releases/agp-8-9-0-release-notes), [Java-WebSocket 1.6.0](https://github.com/TooTallNate/Java-WebSocket/tree/v1.6.0).
