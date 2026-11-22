# Matrice et checklist de compatibilité des navigateurs

**Référence :** 22 novembre 2026. Document vivant : compléter les résultats à chaque essai, sans transformer un test partiel en compatibilité générale.

**Complément P16 :** Chrome 157 sur Pixel 7 a joué les trois questions depuis le serveur Node PC en HTTPS/WSS local, sans contournement TLS par le script côté téléphone. L'autorité de laboratoire était déjà installée ; `isSecureContext=true`, 3 000 points attendus. Cela valide ce parcours client, sans valider l'hôte Android WSS, Firefox, iOS ou le cache PWA de la maquette. Voir [le rapport](P16_MAQUETTE_TROIS_QUESTIONS.md).

## Périmètre de recette

Ce socle de test vise un nombre limité de navigateurs usuels. Il définit les configurations à éprouver, pas une promesse de support déjà démontrée. Firefox reste une cible : son problème TLS actuel est différé, pas abandonné.

| ID | Système | Navigateur | Place dans la recette | État actuel |
|---|---|---|---|---|
| A-CHR | Android | Chrome stable | Socle prioritaire | Pixel 7 : HTTPS et cache partiellement validés, voir relevé ci-dessous |
| A-FF | Android | Firefox stable | Socle prioritaire ; résolution requise avant déclaration de compatibilité | Pixel 7 : erreur TLS avec exception manuelle ; non validé |
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
