# HTTPS local — préparation de l'expérience

## Périmètre autorisé

**Complément P20 du 22 novembre 2026 :** l'utilisateur a autorisé une nouvelle feuille de laboratoire pour `192.168.1.21` et `10.186.21.94`, signée par la même autorité et avec la même clé serveur. Les fichiers source de ce dossier restent inchangés ; le profil est dans `.tools/tls/profiles/hotspot-10-186-21-94/` et l'ancien conteneur Android a une sauvegarde privée. Voir [P20](P20_WSS_POINT_ACCES_SANS_INTERNET.md) pour les commandes de profil et de retour arrière. L'installateur par défaut continue de refuser un fichier différent : ne pas contourner ce garde-fou par un écrasement manuel.

L'utilisateur a autorisé la création des clés et certificats de test, puis l'installation du certificat public de l'autorité sur son Pixel personnel pour cette expérience. La confirmation et l'authentification Android sont effectuées par l'utilisateur. Le 21 novembre 2026, l'utilisateur confirme avoir terminé l'installation sur le Pixel ; l'acceptation HTTPS dans le navigateur reste à tester. Aucune confiance Windows n'est autorisée ou modifiée. Aucun certificat public, hébergement ou déploiement Internet n'est créé.

## Fichiers et protection

Le script `tooling/prepare-local-tls.mjs` crée dans `.tools/tls/` :

- `ca.cer` et `ca.pem` : certificat public de l'autorité, seuls fichiers destinés à une éventuelle installation de confiance.
- `ca.p12` : clé privée de l'autorité ; ne pas transférer sur les appareils clients.
- `pc.p12` et `android.p12` : clés privées et chaînes des serveurs de test, pour leurs hôtes respectifs.
- `password.txt` : mot de passe des conteneurs locaux ; ne pas partager ni afficher.
- `info.json` : adresses couvertes, empreinte de l'autorité et expiration.

Le dossier `.tools` est exclu de Git. Cette exclusion ne chiffre pas les fichiers et ne remplace pas les protections du compte Windows. Le mot de passe est transmis à keytool par variable d'environnement, pas dans les arguments affichés. Aucun secret ne doit être ajouté à l'APK ou au code source.

La génération refuse d'écraser un dossier TLS existant. En cas de génération interrompue, ne pas relancer en supprimant aveuglément les clés ; vérifier l'état du dossier et convenir d'une nouvelle génération.

## Préparer puis tester

Les adresses dépendent du réseau actuel : PC `192.168.1.23`, Pixel `192.168.1.21`. Leur changement impose des certificats adaptés avant l'essai correspondant.

```powershell
# Seulement lors de la première génération autorisée :
npm.cmd run prepare:tls -- 192.168.1.23 192.168.1.21

# Après fin de génération :
npm.cmd test
npm.cmd run test:tls
```

Le test TLS utilise explicitement l'autorité locale uniquement pour sa propre connexion Node.js ; il ne modifie pas la confiance du système. Il vérifie succès avec la bonne autorité, refus d'une autorité non reconnue, refus d'un mauvais nom et absence d'accès HTTP aux clés.

## Démarrer HTTPS

```powershell
npm.cmd run dev:diagnostic:https
```

Le serveur écoute sur les interfaces du PC, port 4174, et ne sert que les ressources de la sonde. L'adresse pour le téléphone est `https://192.168.1.23:4174`. L'accès peut nécessiter une autorisation de pare-feu, à décider sans désactiver ce dernier. Aucun réglage du pare-feu n'est effectué automatiquement.

Le navigateur doit reconnaître l'autorité avant de considérer cette origine comme correctement sécurisée. Ne pas ignorer une alerte TLS pour conclure à un succès. Après accord distinct, comparer l'empreinte de `ca.cer` avec `info.json`, puis installer **le certificat public uniquement** sur l'appareil personnel de test. Relever l'installation pour pouvoir retirer cette autorité à la fin des essais.

## Ce qui reste à réaliser

### Diagnostic Chrome Pixel — 21 novembre 2026

L'utilisateur observe `ERR_TOO_MANY_RETRIES` vers le serveur HTTPS local. Une connexion TCP depuis le Pixel au port 4174 du PC réussit. Le serveur écoute sur `0.0.0.0` ; aucun changement du pare-feu effectué. Le journal TLS observe des alertes `UNKNOWN_CA` et des connexions TLS établies, sans pouvoir attribuer chaque connexion à une tentative précise.

Chrome 157.0.8103.80 sur Android 17 déclare `ACCESS_LOCAL_NETWORK` avec `granted=true` mais le drapeau `REVOKED_COMPAT`. Cette combinaison correspond à une piste de problème de permission locale documentée dans [le suivi Chromium](https://issues.chromium.org/issues/585631949). C'est une hypothèse étayée, pas encore une cause confirmée. Prochaine manipulation proposée : vérifier puis réautoriser manuellement l'accès réseau local de Chrome et le relancer, sans désactiver TLS ni changer de flags. L'ouverture HTTPS réussie reste à confirmer.

- Installation de confiance explicitement validée, puis essai navigateur HTTPS sur téléphone.
- Éventuelle permission d'accès au réseau local et tentative HTTPS vers `ws://` selon la version navigateur.
- Intégration du certificat `android.p12` dans le stockage privé de la sonde Android et ajout de son mode WSS. La sonde Android existante reste en **ws uniquement**.
- Vérification du démarrage hors Internet et des échanges sur un autre téléphone client.

Ces certificats de laboratoire n'établissent pas une solution utilisable par 30 joueurs sans installation. La stratégie de certificats du produit reste ouverte.

Sources : [keytool JDK 17](https://docs.oracle.com/en/java/javase/17/docs/specs/man/keytool.html), [TLS Node.js](https://github.com/nodejs/node/blob/main/doc/api/tls.md).
