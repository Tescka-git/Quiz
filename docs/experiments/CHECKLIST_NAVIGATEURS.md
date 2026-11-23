# Matrice et checklist de compatibilité des navigateurs

**Référence :** 23 novembre 2026. Document vivant : compléter les résultats à chaque essai, sans transformer un test partiel en compatibilité générale.

**Complément P16 :** Chrome 157 sur Pixel 7 a joué les trois questions depuis le serveur Node PC en HTTPS/WSS local, sans contournement TLS par le script côté téléphone. L'autorité de laboratoire était déjà installée ; `isSecureContext=true`, 3 000 points attendus. Cela valide ce parcours client, sans valider l'hôte Android WSS, Firefox, iOS ou le cache PWA de la maquette. Voir [le rapport](P16_MAQUETTE_TROIS_QUESTIONS.md).

**Complément P17 :** le même Chrome Pixel a aussi joué les trois questions sur **l'hôte Android HTTPS/WSS**, à `192.168.1.21` sur le Wi-Fi habituel : 3 000 points et contexte sécurisé. Hôte et joueur sont sur le même Pixel, animateur automatisé sur PC. Pas de deuxième téléphone, cache PWA, WSS du point d'accès, Firefox ou iOS validés par ce résultat. Voir [P17](P17_HTTPS_WSS_ANDROID.md).

## Périmètre de recette

**P23 — Firefox 160.0.1 sur Redmi :** avertissement TLS initial, puis activation de « Use third-party CA certificates » dans le menu de diagnostic ; page HTTPS sans exception et quiz confirmés manuellement sur le Wi-Fi maison, Pixel hôte 0.15. Autorité Android de laboratoire installée, aucune désactivation TLS. Cache, reconnexion et point d'accès sans Internet Firefox non validés. Incident Pixel historique séparé. Voir [P23](P23_FIREFOX_ANDROID.md).

**P22 — résultat final local 0.14 :** utilisateur confirme les trois questions, reconnexion Redmi sans rafraîchissement, révélations automatiques, 3 000 points pour son joueur et 0 pour Tutu. Coupures amont des téléphones confirmées avant/après, PC maintenu en ligne. Résultat manuel sans mesure indépendante de trafic ; aucune nouvelle veille ni charge physique. Les résultats limités à la première question ci-dessous sont des étapes intermédiaires. Compteur joueur masqué en préparation 0.15 non installée.

**P22 — 0.14, première question locale répétée :** utilisateur confirme message d'attente, révélation à l'échéance et 1 000/0 points sur Pixel/Redmi, puis Wi-Fi amont/données mobiles Pixel et données mobiles Redmi toujours coupés, après confirmation identique avant lancement. Source manuelle, PC en ligne, pas de télémétrie après coupure. Nouvelle reconnexion et veille non testées dans ce lot ; compteur joueur masqué en sources 0.15 seulement. Voir P22.

**P22 — recette tactile 0.14 :** l'utilisateur confirme sur Redmi le menu participant ouvrant le formulaire sans oubli d'accès, puis le parcours à deux joueurs avec message d'attente et révélation automatique à l'échéance, 1 000 points pour Mars et 0 pour Tutu sans réponse. Source manuelle, pas de nouvelle mesure d'isolement Internet ; version exacte de Chrome Redmi non relevée. Voir [P22](P22_ECHEANCE_ET_PARCOURS_JOUEUR.md).

**P22 — nouvelle version à recetter :** APK 0.13 installé, moteur de clôture à l'échéance et interface modifiée (attente après réponse, changement de salle joueur). Tests Node/Chrome PC positifs et parcours WSS strict sur l'hôte Android à 3 000 points. Ces résultats ne valident pas encore la nouvelle interface au toucher sur Redmi ni l'activation de son cache v4 ; les preuves P21 restent liées aux versions précédentes. Voir [P22](P22_ECHEANCE_ET_PARCOURS_JOUEUR.md).

**Résultat actualisé P21 / 0.11 :** réponse Mars à 1 000 points du Redmi vérifiée dans le snapshot et le registre SQL avant/après arrêt forcé Pixel ; reprise HTTPS/WSS et résultats attendus confirmés manuellement. Question expirée avant arrêt, donc pas de preuve de gel avant échéance. Sur 0.10, reconnexion sans rafraîchissement et veille courte avec disparition de l'alerte également positives selon l'utilisateur. Réseau non isolé de façon démontrée dans ces essais.

**Réserve réseau P21 :** Pixel retrouvé ensuite sur le Wi-Fi habituel et réglage données mobiles activé ; instant du retour inconnu. Ne pas qualifier reconnexion/rechargement/veille ultérieurs d'essais sans Internet. Le quiz initial garde sa source déclarative explicite ; aucun isolement rétroactif démontré.

**Suite Redmi du 23 novembre :** après reconnexion au bon point d'accès, classement final et 3 000 points retrouvés, puis conservés après rafraîchissement. Après veille pendant la pause repas, affichage conservé avec alerte réseau ; rafraîchissement positif à 3 000 points. Reconnexion automatique après veille non établie. Correctif d'alerte testé sur Chrome PC mais non installé sur téléphone. Voir P21.

**23 novembre — complément P21 :** Chrome Redmi sur `https://10.186.21.94:8443`, point d'accès du Pixel, APK hôte 0.9 vérifié. L'utilisateur confirme affichage sans alerte, puis trois questions, révélation automatique et 3 000 points avec Wi-Fi habituel/données mobiles du Pixel et données mobiles du Redmi coupés. PC resté en ligne pour l'échange. Source manuelle pour les coupures et résultats ; version Chrome Redmi non relevée. La préparation du cache est affichée, mais rechargement hôte arrêté, reconnexion, veille et installation PWA Redmi restent non testés. Voir [P21](P21_REDMI_CLOTURE_AUTOMATIQUE.md).

**P21 — Redmi Note 11 :** utilisateur : Android 13, HyperOS « 1.05.0 », Chrome mis à jour (version non relevée). Autorité de laboratoire installée avec accord ; page HTTPS sans alerte et retour positif après consigne du quiz Pixel animateur / Redmi joueur sur Wi-Fi habituel. Score chiffré non relevé. Clôture automatique ajoutée ensuite dans APK 0.9 : recette tactile Redmi encore à compléter. Voir [P21](P21_REDMI_CLOTURE_AUTOMATIQUE.md). Cache, point d'accès sans Internet et compatibilité générale non validés par ce retour.

**P20 — Point d'accès en laboratoire :** HTTPS/WSS strict et jeu positifs depuis le PC avec Ethernet désactivé et destinations publiques injoignables. Chrome Pixel a préparé normalement l'origine `https://10.186.21.94:8443`, puis l'utilisateur a terminé le parcours tactile à 3 000 points après correction de l'adresse. Le certificat à deux adresses est signé par l'autorité de laboratoire déjà approuvée ; pas de confiance Windows ajoutée. Le navigateur PC automatisé utilise une exception TLS de contexte, documentée séparément des clients Node stricts. Voir [P20](P20_WSS_POINT_ACCES_SANS_INTERNET.md) pour les limites d'isolement et de mesure ; aucun essai iOS/Firefox ou deuxième téléphone ajouté.

**P19 — Pixel physique :** APK 0.8 et Chrome 157, onglet normal à `https://192.168.1.21:8443` : préparation de sept ressources, rechargement hôte arrêté, reconnexion et réponse durable, 3 000 points et réparation ciblée positifs par clavier automatisé. L'utilisateur confirme le parcours tactile terminé, sans total chiffré ; ergonomie à retravailler. Hôte et joueur sur le même Pixel ; ni le point d'accès WSS sans Internet ni un deuxième téléphone ne sont validés. Voir [P19](P19_RECETTE_CACHE_PIXEL.md).

**P18 — PC seulement :** cache de l'interface, rechargement serveur arrêté, ressources manquantes et mise à jour incomplète testés dans Chrome PC. Cela ne coche aucune nouvelle case physique Android/iOS de cette matrice. Voir [P18](P18_CACHE_INTERFACE_PC.md).

Ce socle de test vise un nombre limité de navigateurs usuels. Il définit les configurations à éprouver, pas une promesse de support déjà démontrée. Firefox reste une cible : son problème TLS actuel est différé, pas abandonné.

| ID | Système | Navigateur | Place dans la recette | État actuel |
|---|---|---|---|---|
| A-CHR | Android | Chrome stable | Socle prioritaire | Pixel 7 : HTTPS et cache partiellement validés ; Redmi : quiz sur point d'accès sans Internet confirmé manuellement, voir P21 |
| A-FF | Android | Firefox stable | Socle prioritaire ; résolution requise avant déclaration de compatibilité | Redmi 160.0.1 : HTTPS/WSS et quiz positifs avec confiance Android explicitement activée ; cache/hors Internet restants. Pixel : ancien incident non rejoué |
| A-SAM | Android | Samsung Browser / Samsung Internet stable | Socle, à tester sur un Galaxy physique | Non testé |
| I-SAF | iOS | Safari fourni avec iOS | Socle prioritaire | Non testé |
| I-CHR | iOS | Chrome stable | Socle complémentaire | Non testé |
| I-FF | iOS | Firefox stable | Socle complémentaire ; compatibilité Firefox à vérifier séparément | Non testé |

Les versions exactes sont relevées lors des essais. Commencer sur les appareils disponibles ; les versions minimales d'OS et la fenêtre de support seront définies après mesures. Ne pas déduire la compatibilité d'un navigateur de celle d'un autre, même lorsque des composants sont partagés. Noter aussi la région de distribution si elle influe sur la configuration.

Les navigateurs intégrés aux applications de messagerie et le mode privé restent hors du socle initial. Les ajouts Edge/Brave ou autres seront motivés par les usages réels.

Références éditeurs : [Safari iPhone](https://support.apple.com/guide/iphone/browse-the-web-iph1fbef4daa/ios), [Firefox Android et iOS](https://support.mozilla.org/en-US/kb/install-firefox-your-phone-or-tablet), [Samsung Browser Android](https://developer.samsung.com/browser/android/overview.html).

## Règles de remplissage

- Une case cochée signifie un essai exécuté et positif dans la configuration décrite, avec une observation ou un rapport associé.
- Une case vide signifie non validé : préciser « non testé », « échec », « bloqué » ou « non applicable » dans les observations. Une fonctionnalité indispensable indisponible est un échec de ce parcours, pas un « non applicable ».
- Distinguer résultat manuel et automatisé. Un navigateur simulé sur PC ne remplace pas un téléphone réel.
- Tester séparément navigation en onglet et lancement depuis l'écran d'accueil lorsque cette possibilité existe ; documenter les possibilités d'installation au lieu de supposer un parcours identique.
- Toute acceptation d'une alerte de certificat invalide le critère TLS normal. Un certificat de laboratoire installé ne prouve pas le parcours final sans installation d'autorité.

## Fiche à copier pour chaque configuration

### Configuration : ID / appareil / OS / navigateur / version

| Champ | Valeur à renseigner |
|---|---|
| Date, opérateur et source des observations | |
| Modèle physique, version OS et navigateur exactes | |
| Onglet ou écran d'accueil ; procédure d'installation | |
| Version du code / commit et version du service worker | |
| Origine exacte de la PWA et adresse du serveur Android | |
| Réseau : point d'accès Android, routeur ou Internet | |
| Certificat public ou autorité de laboratoire ; empreinte et expiration | |
| Permissions navigateur et système accordées/refusées | |
| Comment l'accès Internet a réellement été supprimé | |
| Rapport JSON, erreurs exactes et pièces associées | |

### Chargement et sécurité

- [ ] Page ouverte en HTTPS sans alerte ni exception de certificat.
- [ ] `isSecureContext` vaut `true`.
- [ ] Origine, adresse et période de validité du certificat vérifiées.
- [ ] Permissions réseau local comprises et accordables via les réglages normaux.
- [ ] Refus de permission signalé clairement, puis nouvel essai après autorisation.

### Cache et lancement

- [ ] Ressources de la sonde présentes dans le cache vérifié.
- [ ] Même URL rechargeable après arrêt du serveur de fichiers.
- [ ] Application fermée puis rouverte avec serveur de fichiers indisponible.
- [ ] Démarrage sans Internet, Wi-Fi local toujours actif.
- [ ] Même parcours vérifié depuis l'écran d'accueil si proposé.
- [ ] Cache manquant/incomplet signalé ; récupération vérifiée une fois le serveur disponible.

### Échanges avec l'hôte Android

- [ ] Client sur un téléphone distinct de l'hôte.
- [ ] HTTPS vers `ws://` essayé séparément : résultat et permissions consignés, succès non présumé.
- [ ] WSS essayé avec certificat accepté normalement ; aucun contournement TLS.
- [ ] Pings/pongs identifiés ; nombre d'échantillons et allers-retours conservés.
- [ ] Connexion et échanges vérifiés sans Internet.
- [ ] Déconnexion visible et reconnexion vérifiée après retour du Wi-Fi.
- [ ] Bascule d'application et verrouillage du téléphone client testés.
- [ ] Point d'accès Android puis routeur externe testés séparément.

### Parcours de jeu — à exécuter lorsque implémentés

- [ ] Salle d'attente, préchargement et état « prêt ».
- [ ] Questions, chronomètre, réponse définitive et correction.
- [ ] Pause/reprise et refus des réponses pendant la pause.
- [ ] Brouillon conservé sans soumission automatique au retour réseau.
- [ ] Réponse confirmée conservée, jamais doublée après retransmission/reconnexion.
- [ ] Scores cohérents avec l'hôte et règles de révélation respectées.
- [ ] Médias, geste utilisateur requis pour l'audio et comportement après reprise.
- [ ] Rapport final consultable hors ligne.

**Verdict :** non testé / partiel / bloqué / validé pour ce parcours.  
**Observations, incidents ouverts et prochain essai :** à compléter.

## Relevé actuel — A-CHR, Pixel 7

Android 17, Chrome 157.0.8103.80 relevé pendant le diagnostic. Navigation en onglet, réseau local existant, page `https://192.168.1.23:4174`. Autorité locale de laboratoire installée par l'utilisateur ; pas de confiance publique démontrée.

- [x] Page HTTPS accessible sans avertissement selon le retour utilisateur.
- [x] Contexte sécurisé `true` confirmé par l'utilisateur.
- [x] Ressources présentes après préparation du cache.
- [x] Même page rechargée après arrêt effectif du serveur HTTPS par l'agent ; contexte sécurisé toujours `true`, selon le retour utilisateur.
- [x] Accès local rétabli après autorisation Android « Appareils à proximité » pour Chrome.
- [ ] Démarrage après fermeture complète du navigateur.
- [ ] Internet réellement coupé tout en conservant le réseau local.
- [x] Échange ponctuel depuis cette page HTTPS vers le serveur Android local en ws, sur le même Pixel, après adaptation du service ; voir [P9](P9_GEL_SONDE_ANDROID.md).
- [ ] WSS, écran d'accueil et second téléphone client.

Le rechargement observé n'a pas isolé le cache HTTP du cache du service worker. Aucun export de cette séquence n'a encore été recueilli. **Verdict : partiel**, et non validation complète P1/P2.

## Essai réseau complémentaire — PC client / Pixel point d'accès

Voir [P10](P10_POINT_ACCES_SANS_INTERNET.md) : pings navigateur PC réussis avec données mobiles Pixel coupées et Ethernet PC débranché, puis trois pongs après rechargement de localhost. Ce résultat complète les essais réseau, sans cocher les cases Android/iOS d'un téléphone client distinct. L'état du serveur de fichiers localhost lors du rechargement n'a pas été vérifié ; aucun succès supplémentaire de cache n'est revendiqué.

## Incident ouvert — A-FF, Pixel 7

Firefox affiche un échec de connexion sécurisée. L'utilisateur a accepté une exception pour afficher la page. Le code d'erreur et la version exacte ne sont pas relevés. **TLS normal non validé**, aucun succès de cache revendiqué.

À reprendre : retrouver l'erreur sans exception, relever la version, vérifier les règles de confiance Firefox pour l'autorité de laboratoire et retester sans désactiver les protections. Un éventuel problème propre à notre autorité locale doit être distingué d'un problème avec un certificat public de production. Retirer l'exception de laboratoire avant la recette TLS normale.

## Entretien

Après correction d'un incident ou changement significatif du navigateur, de l'OS, du cache ou du protocole, refaire les étapes touchées et conserver l'ancien résultat daté. Une recette complète sur ce socle, puis une session mixte de 30 téléphones, sera nécessaire avant de déclarer le périmètre de compatibilité. Aucun seuil de latence ou de reconnexion n'est fixé par cette checklist.
