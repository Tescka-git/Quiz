# P17 — Hôte Android HTTPS/WSS de laboratoire

**22 novembre 2026 — version Android 0.7 expérimentale.** Prolonge [P16](P16_MAQUETTE_TROIS_QUESTIONS.md), dont le parcours Android HTTP/ws sans Internet reste une preuve distincte.

## Résultat et configuration

Le Pixel 7 héberge désormais la maquette en **HTTPS sur 8443** et **WSS sur 8789**, sur le Wi-Fi habituel à `192.168.1.21`. Le certificat de laboratoire existant est réutilisé. Les clients Node vérifient sa chaîne et son adresse ; Chrome du Pixel utilise l'autorité déjà installée pendant les essais précédents.

Les trois questions, le classement à 3 000 points, les retransmissions et la reconnexion passent contre cet hôte sécurisé. Le moteur reste l'artefact de P16, sans nouvelle dépendance ni règle native :

```text
672ba13691f39a3411f540f21e92b975d9e8ac084cd04ac7c8db62e7c5a5d11e
```

Le scénario navigateur a un animateur Chrome sur PC et un joueur Chrome sur le Pixel. Le téléphone exécute donc simultanément le service hôte et son interface joueur. **Ce n'est pas un deuxième téléphone physique.** Le contexte Chrome automatisé du PC accepte le certificat uniquement pour ce test ; le script ne désactive pas TLS côté Pixel. Aucun certificat n'est installé dans Windows.

La recette finale utilise Entrée/Espace via CDP, avec les événements clavier standards des formulaires et radios. Un essai de clics avait rencontré un décalage de coordonnées du pilote sur Android ; aucun clic forcé ni appel direct à la fonction d'envoi n'est utilisé pour le contourner. Ce parcours automatisé au clavier ne remplace pas une recette tactile manuelle.

Rapport : [P17_PIXEL7.json](results/P17_PIXEL7.json). Les captures et rapports intermédiaires restent dans `artifacts/mock-preview/`, exclus de Git.

## Changements

| Fichier | Rôle |
|---|---|
| `LocalTls.java` | Charge la clé et la chaîne PKCS12 privées, contrôle la validité temporelle du certificat et les adresses IP de ses SAN. |
| `QuizHost.java` | Sélectionne HTTP/ws ou HTTPS/WSS ; adapte ports, origine autorisée, configuration client et CSP. |
| `QuizService.java` | Notification correspondant au mode ; changement de mode exigeant l'arrêt du service courant. |
| `MainActivity.java` | Bouton **Héberger en HTTPS/WSS de test**. |
| `tooling/provision-android-tls.mjs` | Copie les fichiers de laboratoire existants dans le stockage privé de l'application debug et vérifie leurs empreintes. |
| `tooling/test-android-tls.mjs` | Vérifie TLS et ses refus sur le vrai serveur Android. |
| `tooling/test-android-modes.mjs` | Enchaîne quatre démarrages HTTP/HTTPS rapides et vérifie qu'un seul mode reste actif. |

Un premier changement rapide a révélé `Binding to already bound service`. Le nettoyage de l'ancien sandbox était placé dans une tâche que l'arrêt du `ScheduledThreadPoolExecutor` pouvait annuler. Le service utilise maintenant une file de cycle de vie commune aux instances successives, et l'arrêt attend explicitement la tâche fermant SQLite et le pont JavaScript **avant** de terminer l'exécuteur. Les actions restent hors du thread d'interface.

Les bibliothèques existantes fournissent les adaptateurs TLS : [Java-WebSocket 1.6.0, fabrique SSL](https://github.com/TooTallNate/Java-WebSocket/blob/v1.6.0/src/main/java/org/java_websocket/server/DefaultSSLWebSocketServerFactory.java) et [NanoHTTPD 2.3.1, `makeSecure`](https://github.com/NanoHttpd/nanohttpd/blob/nanohttpd-project-2.3.1/core/src/main/java/fi/iki/elonen/NanoHTTPD.java). Pas de nouvelle dépendance d'exécution.

## Clés et confiance : limites du laboratoire

Les fichiers `.tools/tls/android.p12` et `.tools/tls/password.txt` existent déjà sur le PC. La préparation ne crée aucune clé, ne remplace pas des fichiers privés différents et ne transfère jamais `ca.p12`, la clé de l'autorité. Seule la clé du serveur Android va sur son hôte.

La copie passe par un répertoire aléatoire sous `/data/local/tmp`, protégé en mode `0700`, puis par un flux local Android vers `run-as fr.kuikuiz.probe`. Les fichiers finaux sont dans `files/tls/`, privé à l'application, avec permissions restrictives. Les empreintes sont comparées avant installation et le répertoire temporaire est nettoyé. Aucune donnée secrète n'est passée dans les arguments ou affichée. La méthode utilise `adb push` pour éviter les conversions du flux binaire Windows.

Gradle refuse les conteneurs `.p12` et `password.txt` présents dans les répertoires d'assets. Les fichiers privés ne sont pas inclus dans l'APK ; la préparation doit être refaite après désinstallation ou effacement des données. Une mise à jour `adb install -r` les conserve.

Le certificat couvre **uniquement `192.168.1.21`** et expire le **21 décembre 2026**. Le mode TLS refuse un certificat expiré au démarrage. Une autre adresse, notamment `10.186.21.94` sur le point d'accès, ne devient pas valide grâce au chiffrement : l'application la signale comme hors certificat. Aucun nouveau certificat n'a été créé pour le point d'accès.

La confiance de Chrome Pixel dépend de l'autorité de laboratoire précédemment approuvée. Ce n'est pas une solution d'accès sans installation pour de futurs joueurs. Le navigateur normal du PC n'acquiert pas cette confiance ; ne pas accepter une alerte pour annoncer une validation TLS. Le choix de certificats et d'adresses pour les utilisateurs finaux reste ouvert.

## Reproduire

1. Reconnecter le Pixel au Wi-Fi habituel, vérifier son adresse et réactiver si nécessaire le débogage sans fil. Utiliser le port de **connexion**, pas le port d'association.
2. Préparer les ressources avec `npm.cmd run prepare:mock-android`, compiler et installer l'APK debug avec `adb install -r`. Les outils JDK/SDK/Gradle sont ceux de P16.
3. Définir `KUIKUIZ_ADB` vers l'exécutable ADB et `KUIKUIZ_DEVICE` vers le téléphone connecté, puis exécuter `npm.cmd run prepare:android-tls`. Cette opération réutilise uniquement les fichiers locaux déjà autorisés.
4. Dans l'application : **Arrêter la maquette de quiz**, puis **Héberger en HTTPS/WSS de test**. Si les fichiers privés manquent, le démarrage est refusé ; aucun retour automatique vers HTTP.
5. Tester :

```powershell
$env:KUIKUIZ_ORIGIN='https://192.168.1.21:8443'
npm.cmd run test:mock:android-tls
$env:KUIKUIZ_HOST_KIND='android-tls'
npm.cmd run test:mock:live
```

Les clients Node chargent explicitement `.tools/tls/ca.pem`. Ne pas utiliser `NODE_TLS_REJECT_UNAUTHORIZED=0`.

Pour le parcours Chrome Pixel, ouvrir `/joueur` sur cette origine, préparer la redirection ADB locale 9222 vers `localabstract:chrome_devtools_remote`, puis exécuter `npm.cmd run test:mock:pixel` avec la même origine et `KUIKUIZ_HOST_KIND='Android TLS'`. Le script laisse Chrome du téléphone ouvert.

Le mode HTTP reste disponible avec le bouton initial après arrêt du mode HTTPS. Les modes sont exclusifs pour garder un seul adaptateur actif sur la même base ; les parties et le moteur ne changent pas avec le transport.

Avec les mêmes variables ADB, `npm.cmd run test:mock:android-modes` vérifie les changements rapides et termine en HTTPS. Les anciennes sondes moteur/SQLite sont indépendantes : les lancer après arrêt de la maquette.

## Contrôles réellement exécutés

- Compilation Android positive, 31 tests Node et test TLS local existant positifs.
- Quatre démarrages rapides HTTP → HTTPS → HTTP → HTTPS positifs après correction du nettoyage ; un seul mode actif à la fois. Parcours HTTP antérieur retesté positivement.
- APK final inspecté : aucun conteneur P12 ni fichier `password.txt` embarqué.
- Démarrage HTTPS sans fichiers privés refusé ; copie incomplète non installée ; nouvelle préparation avec fichiers identiques positive.
- HTTPS et WSS : chaîne de confiance et adresse correctes acceptées, TLS 1.3 observé.
- HTTPS et WSS : autorité non reconnue refusée ; mauvais nom/adresse refusé.
- Origine WSS étrangère : fermeture 1008 ; fichiers privés inaccessibles par HTTPS.
- Parcours réseau : trois questions, droits animateur, masquage avant correction, confirmation après stockage, doublons et reconnexion positifs.
- Chrome Pixel : trois réponses, 3 000 points, `isSecureContext=true`, pas de contournement TLS côté téléphone.

## Ce qui reste à démontrer

Le test HTTPS/WSS actuel utilise le Wi-Fi habituel avec le certificat de laboratoire correspondant. **Aucune validation WSS sans Internet sur le point d'accès n'est ajoutée par P17.** L'autonomie HTTP/ws de P16 ne peut pas être transposée automatiquement à TLS.

La maquette ne possède pas encore de service worker/cache PWA. Préchargement, démarrage avec serveur de fichiers indisponible, URL de connexion locale après préparation, renouvellement de certificats, Firefox, iOS, client sur un deuxième téléphone, veille prolongée et charge Android restent à éprouver. Le maintien du service pendant ce court parcours Chrome ne vaut pas un essai d'endurance.
