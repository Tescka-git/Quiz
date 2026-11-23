# P23 — Firefox Android et codes de laboratoire

**23 novembre 2026.** Priorité convenue : Firefox Android, puis étude de la connexion sécurisée sans autorité à installer. iPhone et essais à plusieurs téléphones indisponibles ; veille prolongée de l'hôte différée.

## Firefox Redmi — résultat manuel

Redmi Note 11, Android 13/HyperOS selon le relevé P21 ; **Firefox 160.0.1**, version communiquée par l'utilisateur. Hôte Pixel, APK 0.15, origine `https://192.168.1.21:8443`, Wi-Fi habituel de la maison. Autorité Kuikuiz de laboratoire déjà installée dans Android lors de P21.

Premier accès : échec de connexion sécurisée. L'utilisateur voit un avertissement de certificat dans « Avancé », sans code d'erreur relevé ; aucune exception de certificat acceptée dans cette recette. L'agent vérifie séparément la réponse HTTPS 200 avec autorité explicite et nom d'hôte contrôlé sur le client Node.

L'utilisateur active le menu de diagnostic Firefox depuis « À propos », trouve puis active **Use third-party CA certificates**. Sur consigne de relancer Firefox et d'ouvrir la même origine, il confirme la page sans exception. Le réglage autorise Firefox à utiliser les autorités ajoutées dans Android ; la validation TLS n'est pas désactivée. Le comportement observé est compatible avec un défaut de confiance envers l'autorité locale avant activation ; le code d'erreur initial n'ayant pas été relevé, ne pas attribuer une cause TLS exacte non mesurée.

Consigne suivante : Pixel animateur dans Chrome, Firefox Redmi joueur, Mars/Pacifique/Six et 3 000 points attendus. L'utilisateur confirme « c'est bon, ça marche ». Parcours manuel de quiz positif, donc communication WSS fonctionnelle pour cette configuration. Pas de capture automatisée du score ni de mesure de latence. Ce résultat ne prouve pas Firefox sans préparation de confiance, cache après arrêt de l'hôte, point d'accès sans Internet, reconnexion, veille ou installation PWA Firefox. L'ancien incident Firefox du Pixel est distinct et n'a pas été rejoué.

Références consultées : [gestion des autorités Mozilla](https://support.mozilla.org/en-US/kb/setting-certificate-authorities-firefox), [documentation du menu de diagnostic, décrite pour Nightly](https://firefox-source-docs.mozilla.org/mobile/android/fenix/Secret-settings-debug-menu-instructions.html), [suivi de la confiance Android et de son réglage](https://bugzilla.mozilla.org/show_bug.cgi?id=2090777). Les versions et interfaces varient ; l'existence de l'option sur 160.0.1 est ici observée par l'utilisateur, pas déduite de la seule documentation générale.

## Codes courts demandés pour le laboratoire

Le code long restait un irritant pendant les essais. Préparation 0.16 : les adaptateurs de **maquette** Node et Android allouent `1234`, puis le prochain code libre à quatre chiffres (`1235`, etc.). Ils examinent les salles conservées, même terminées ; aucun code existant n'est réattribué. Après `9999`, recherche des autres combinaisons à quatre chiffres ; si les 10 000 possibilités sont occupées, la création échoue plutôt que d'écraser une salle. Le code effectif doit toujours être celui affiché par l'animateur, pas systématiquement `1234`.

Le formulaire accepte quatre chiffres et les anciens codes hexadécimaux à huit caractères, afin de conserver l'accès aux salles existantes. Les codes sont des chaînes pour conserver les zéros initiaux. Les identifiants et jetons secrets d'accès restent aléatoires et inchangés ; le code court n'autorise pas les commandes animateur. Ce mécanisme prévisible est réservé à la maquette de laboratoire, sans choix de génération pour un service publié.

Moteur, base v4 et certificats inchangés ; préparation APK 0.16, cache `kuikuiz-mock-shell-v7`. Régression Node : codes distincts, réouverture de la base sans réutilisation et accès conservé à l'ancienne salle. Parcours navigateur avec code à quatre chiffres. Compilation, installation et résultats à compléter après exécution.

36 tests moteur/réseau/persistance positifs, dont création `1234`/`1235`, jetons distincts, inscription dans la bonne salle, code suivant `1236` après réouverture et ancienne salle toujours accessible. Parcours Chrome PC à quatre chiffres positif. Préparation des assets et compilation Gradle positives ; l'empreinte du moteur reste `0bf772f90d20bb846f8b00981a52a5817bb477ffa08fe08a3de84758b3390f10`.

Installation `install -r` positive sur Pixel ; démarrage HTTPS manuel après impossibilité de repérer le bouton dans l'écran courant. `test:mock:live` sur Android avec chaîne/adresse TLS vérifiées positif : code à quatre chiffres explicitement contrôlé, trois questions à 3 000 points, droits, doublons et reconnexion. Rapport local `artifacts/mock-preview/live-android-lab-codes.json`. Le test crée une salle : le prochain code manuel peut donc déjà être `1235` ou le suivant.

Recette de cache PC : un premier passage dépasse le délai en attendant le libellé de préparation incomplète après suppression de la configuration ; la relance du seul scénario est positive. Cause non établie, ne pas annoncer absence de flakiness. Cycle complet de mise à jour du cache positif. Aucun nouveau quiz tactile requis pour ce code ; activation du cache v7 à faire à la prochaine ouverture (préparer puis fermer/réouvrir les onglets) afin que le formulaire accepte les quatre chiffres.
