# P20 — HTTPS/WSS sur le point d'accès, sans Internet

**22 novembre 2026. Essai autonome positif depuis le PC isolé et parcours manuel Chrome Pixel réussi à 3 000 points après correction de l'adresse utilisée.**

Cette expérience combine le transport sécurisé P17, le cache P18/P19 et le réseau isolé P16. Le téléphone reste hôte technique ; les permissions animateur viennent des accès de salle.

## Résultat observé

Le test autonome est positif : de **18:44:16 à 18:44:33, heure de Paris**, Ethernet est relevé `Disabled` et la passerelle Wi-Fi est `10.186.21.94`. Les rapports JSON gardent leurs horodatages UTC. Deux destinations TCP publiques sont injoignables avant et après les scénarios. Les clients Node valident strictement HTTPS/WSS en TLS 1.3 avec le nouveau certificat, et vérifient les refus de mauvaise autorité, mauvaise adresse et origine WSS étrangère.

Le scénario réseau atteint 3 000 points, sans double comptage après retransmission, et retrouve la réponse à la reconnexion. Le parcours Chrome PC à deux joueurs passe également avec l'exception TLS du seul contexte automatisé décrite plus bas. Trois confirmations réseau ont été mesurées à environ 132, 50 et 51 ms : pas de seuil déduit de trois échantillons.

Avant la coupure, Chrome Pixel a préparé normalement l'origine du point d'accès avec sept ressources en cache, puis réussi le scénario de cache/reprise et ses 3 000 points. Après la coupure, l'utilisateur observe d'abord une erreur de connexion animateur : il indique ensuite avoir utilisé une mauvaise adresse. Avec **`https://10.186.21.94:8443`**, il confirme le quiz sans problème et **3 000 points**. L'URL erronée exacte n'a pas été relevée ; elle n'est pas présentée comme un échec WSS sur l'origine correcte.

Le contrôle manuel a été demandé en laissant les accès amont du téléphone coupés et après rétablissement de l'Ethernet du PC. Ces conditions côté téléphone reposent sur les consignes et le retour utilisateur, sans télémétrie ADB après coupure. L'isolement du PC est, lui, enregistré avant et après le scénario autonome. Ne pas fusionner ces deux sources de preuve ni qualifier l'Ethernet de désactivé pendant le retour manuel.

Rapport public synthétique : [P20_POINT_ACCES_TLS.json](results/P20_POINT_ACCES_TLS.json). Rapports détaillés et captures dans `artifacts/mock-preview/`, exclus de Git. Régression : 31 tests Node, 4 tests TLS et parcours navigateur PC positifs.

## Préparation du certificat autorisée

L'utilisateur a explicitement autorisé, pour cet essai, la création et l'installation d'une feuille de certificat couvrant **192.168.1.21** et **10.186.21.94**, signée par l'autorité existante. Les interfaces relevées sont `wlan0` pour le Wi-Fi habituel et `wlan2` pour le point d'accès. L'adresse mobile `rmnet1` n'est pas utilisée.

Le profil de laboratoire est dans `.tools/tls/profiles/hotspot-10-186-21-94/`, exclu de Git. Il contient une copie du conteneur serveur avec sa nouvelle feuille, le même mot de passe et les métadonnées de vérification. Aucune nouvelle clé serveur ni autorité n'est générée. Les empreintes des fichiers source `ca.p12`, `android.p12` et `password.txt` sont vérifiées inchangées après signature ; la clé publique serveur est comparée à celle du certificat précédent.

| Élément public | Valeur |
|---|---|
| Autorité SHA-256, inchangée | `A5:78:E9:DE:CB:56:71:4D:E4:57:7F:33:EE:B7:81:FD:CB:07:F5:6B:34:F0:47:DD:36:63:80:DD:06:50:C4:2C` |
| Nouvelle feuille SHA-256 | `12:D8:49:59:5E:3F:6D:13:C5:F8:E1:C9:EF:10:12:B8:69:73:A2:87:6D:F9:97:FA:2F:4C:B6:99:7F:3F:3F:FD` |
| Expiration de la feuille | 22 décembre 2026 |
| Origine de l'essai | `https://10.186.21.94:8443` |
| WebSocket | `wss://10.186.21.94:8789/socket` |

L'ancien conteneur Android est sauvegardé dans les fichiers privés de l'application avant remplacement. L'installation compare son empreinte à celle attendue : un fichier différent ou modifié pendant l'opération est refusé. Le mot de passe n'est pas changé. Aucun secret n'est ajouté à l'APK, aucune clé d'autorité n'est transférée et aucune confiance Windows n'est installée. L'APK reste 0.8 ; le moteur et le code Android ne changent pas dans cette étape.

## Outils et reproduction

```powershell
# Seulement après autorisation de préparer le certificat de laboratoire :
npm.cmd run prepare:tls:hotspot -- 192.168.1.21 10.186.21.94

# Avec KUIKUIZ_ADB et KUIKUIZ_DEVICE explicitement définis :
npm.cmd run prepare:android-tls -- --hotspot 10.186.21.94 --replace-certificate
```

Le générateur refuse un profil déjà présent. Il n'est pas nécessaire de le régénérer pour le même essai. L'installateur accepte de façon idempotente un fichier déjà identique, et conserve son refus par défaut de remplacer un fichier différent. Le remplacement n'est possible qu'avec le profil vérifié et l'option explicite.

Après installation, arrêter puis relancer le service HTTPS/WSS pour charger le nouveau certificat. Vérifier les deux adresses avant la coupure. Une nouvelle adresse non couverte doit échouer normalement ; aucun repli HTTP ou désactivation TLS n'est utilisé pour faire réussir le contrôle strict.

Retour au certificat Wi-Fi initial, si nécessaire et explicitement décidé :

```powershell
npm.cmd run prepare:android-tls -- --hotspot 10.186.21.94 --restore-wifi --replace-certificate
```

Cette restauration vérifie que le fichier actif correspond au profil connu avant remplacement, conserve aussi une sauvegarde privée et nécessite le redémarrage du service. **La restauration n'est pas exécutée par cette préparation.** Relancer l'installateur sans profil alors que le certificat à deux adresses est actif doit refuser de l'écraser.

## Essai autonome avec coupure de la conversation

1. Garder l'Ethernet du PC et les accès Internet du téléphone actifs pendant la préparation.
2. Activer le point d'accès et connecter le Wi-Fi du PC dessus. Relever la passerelle réellement attribuée.
3. Tester HTTPS/WSS strict avec l'autorité explicite et préparer Chrome Pixel sur la **nouvelle origine**. Un cache de `192.168.1.21` ne prépare pas automatiquement celui de `10.186.21.94`.
4. Lancer `npm.cmd run test:mock:hotspot-offline` avant la coupure. Le script attend Ethernet non actif et deux destinations TCP publiques injoignables, puis découvre la passerelle Wi-Fi.
5. Couper données mobiles et Wi-Fi amont du Pixel, sans arrêter son point d'accès ni le service hôte. Débrancher/désactiver l'Ethernet du PC.
6. Le script local exécute les contrôles stricts HTTPS/WSS, le scénario de trois questions et la recette navigateur PC, puis recontrôle l'isolement. Il n'utilise pas l'API de l'agent ni ADB pendant cette phase et ne change aucune interface réseau.
7. Attendre environ une minute avant de rétablir l'Ethernet. Lire `artifacts/mock-preview/offline-quiz-tls-report.json`. Une restauration anticipée d'Internet invalide le verdict ; une adresse différente non couverte entraîne un refus TLS.

Les clients Node vérifient normalement chaîne, adresse et expiration avec l'autorité locale. Les contextes Playwright PC utilisent, pour le laboratoire uniquement, une exception TLS locale afin de ne pas installer l'autorité dans Windows. Ce scénario navigateur **ne prouve donc pas la confiance TLS normale d'un Chrome PC non préparé**. Ce périmètre est inscrit dans son rapport ; les contrôles TLS stricts précèdent le jeu et sont indispensables à son succès.

La confiance normale de Chrome Pixel est contrôlée séparément, sans cette exception, avec l'autorité de laboratoire déjà approuvée. Le parcours tactile après coupure a été terminé selon le retour utilisateur ; voir les limites de mesure ci-dessus.

## Vérifications et limites

Les nouveaux tests du profil refusent les adresses publiques, identiques et mal formées ; ils vérifient les deux SAN, la signature, la conservation de la clé et celle du conteneur source. Les tests stricts exécutés avant coupure passent sur les deux adresses avec TLS 1.3 et refusent mauvaise autorité, mauvaise adresse et origine WSS étrangère.

Le point d'accès peut changer d'adresse lors d'une reconfiguration : le profil est attaché aux adresses relevées, pas à tous les futurs réseaux. Cette méthode reste un **laboratoire avec autorité installée**, pas le parcours final de joueurs sans préparation de confiance. Certificats/adressage de production, Firefox/iOS, client mobile distinct, installation PWA, endurance et capacité réelle du point d'accès restent ouverts. Deux destinations publiques injoignables ne suffisent pas seules : les interfaces observées et la coupure amont déclarée doivent aussi être consignées.
