# P19 — Recette du cache sur Pixel : à exécuter

**Préparée le 22 novembre 2026 pendant l'absence de l'utilisateur. Aucun essai Pixel effectué dans cette préparation.**

Cette fiche prolonge [P18, cache sur PC](P18_CACHE_INTERFACE_PC.md). Elle sépare disponibilité de l'interface, présence de l'hôte et fonctionnement tactile. Elle ne requiert pas de second téléphone pour ces premiers contrôles, sans remplacer une recette avec plusieurs appareils.

## Préparation au retour de l'utilisateur

- Reconnecter le Pixel au Wi-Fi habituel et vérifier son adresse. Le certificat de laboratoire actuel couvre `192.168.1.21`, pas l'adresse du point d'accès.
- Réactiver le débogage sans fil et relever **Adresse IP et port**, sans ouvrir l'association par code. L'association précédente est réutilisée si encore valide.
- Installer l'APK **0.8** avec `adb install -r`, après vérification de la version construite et de ses ressources. Ne pas désinstaller ni effacer les données : le certificat serveur et les accès locaux sont conservés.
- Ouvrir l'application hôte, arrêter une éventuelle maquette active, puis choisir **Héberger en HTTPS/WSS de test**.
- Sur Chrome Pixel normal, ouvrir `https://192.168.1.21:8443`. Aucune exception de certificat ne doit être nécessaire. Si une alerte apparaît, arrêter la validation TLS et relever l'erreur.

L'autorité de laboratoire est celle déjà approuvée sur le Pixel lors des expériences précédentes. Aucune nouvelle clé, autorité ou confiance Windows n'est nécessaire pour cette recette. Une autre adresse ou un certificat expiré nécessite une préparation distincte, pas une acceptation de risque dans le navigateur.

## A — Préparer puis recharger sans hôte

1. Avec le service hôte actif, attendre **Écrans disponibles hors ligne. L'hôte reste nécessaire pour jouer.** Utiliser au besoin **Préparer / vérifier l'accès hors ligne**.
2. Ouvrir également `/animateur` et `/joueur?code=ABCDEF12`. Le code fictif sert uniquement à vérifier la conservation du paramètre dans le formulaire, sans rejoindre une salle inexistante.
3. Revenir à l'application Android et toucher **Arrêter la maquette de quiz**. Garder le Wi-Fi actif : cette phase arrête le serveur, pas le réseau.
4. Revenir à Chrome et recharger les mêmes URL. Vérifier les textes, styles, formulaires et le code prérempli. L'accueil n'essaie pas de joindre l'hôte ; son statut générique de connexion nécessaire ne prouve donc pas une connexion active.
5. Essayer de créer une partie ou de rejoindre : un échec visible est attendu. Aucun état de partie ni message de confirmation ne doit être inventé.
6. Fermer les onglets puis rouvrir la même URL dans le même profil Chrome, sans effacer les données. Consigner précisément la méthode de fermeture ; une fermeture d'onglets n'est pas un arrêt forcé du processus Chrome.
7. Relancer l'hôte HTTPS, puis vérifier la connexion depuis les pages préparées.

Critère : interface disponible sans serveur après préparation ; impossibilité de jouer sans hôte clairement indiquée ; retour de la connexion sans perte des accès locaux. Cette phase ne prouve pas encore l'absence d'Internet ni le démarrage après redémarrage complet d'Android.

## B — Parcours tactile et réponse confirmée

On peut utiliser **deux onglets du Pixel**, un animateur et un joueur, pour éviter toute installation de confiance sur le PC. Le service Android reste l'hôte technique ; les accès des deux rôles restent distincts.

1. Dans `/animateur`, créer une salle. Dans l'autre onglet `/joueur`, saisir son code et un pseudo fictif.
2. Dans l'onglet animateur, lancer la première question. Dans l'onglet joueur, choisir **Mars au toucher**, puis confirmer au toucher.
3. Attendre **Réponse confirmée et enregistrée**. Recharger cet onglet avec l'hôte actif : la réponse doit être retrouvée et rester définitive.
4. Arrêter l'hôte depuis son application Android, puis recharger l'onglet joueur. Les écrans restent disponibles, mais aucune confirmation ancienne ne doit être affichée comme un nouvel état reçu de l'hôte.
5. Relancer l'hôte HTTPS. Retrouver la question **en pause** et la réponse confirmée. Le temps ne doit pas compter l'arrêt comme une période de réponse autorisée.
6. Révéler la correction depuis l'onglet animateur : 1 000 points. Poursuivre avec **Pacifique**, puis **Six**, et vérifier 3 000 points au classement final.

Critère : gestes tactiles utilisables sans décalage ou élément masquant les boutons ; aucun double comptage ; réponse confirmée retrouvée après rechargement et arrêt/reprise de l'hôte. Le scénario de clavier automatisé P17 ne remplace pas ces gestes.

## C — Contrôle d'une préparation manquante

Utiliser un profil de test isolé si disponible. **Ne pas effacer le profil personnel ni toutes les données Chrome.** L'automatisation peut supprimer une entrée du seul cache `kuikuiz-mock-shell-v1`, puis vérifier l'état incomplet et sa réparation au retour de l'hôte. Cette manipulation sera préparée avec l'utilisateur ; les cases ci-dessous restent non exécutées.

Critère : pas de statut « prêt » lorsque des ressources nécessaires manquent ; message compréhensible et réparation explicite quand l'hôte est disponible. Un cache entièrement effacé avec serveur absent peut empêcher tout chargement : il faut alors se reconnecter pour préparer à nouveau.

## Relevé à remplir après les essais

| Champ | Observation |
|---|---|
| Date, version du code et APK réellement installé | À relever |
| Android, Chrome, profil et mode onglet/écran d'accueil | À relever |
| Origine HTTPS et empreinte du certificat | À relever |
| Méthode de préparation et état affiché | À relever |
| Méthode d'arrêt du service et de fermeture des onglets/navigateur | À relever |
| A : rechargement sans serveur, retour de l'hôte | Non testé |
| B : touchers, confirmation, restauration et classement | Non testé |
| C : cache incomplet et réparation ciblée | Non testé |
| Captures, erreurs et rapports associés | À produire |

## Hors périmètre de cette recette

Pas de validation iOS/Firefox, d'installation PWA, de veille prolongée, de 30 téléphones ou de certificat pour le point d'accès. La configuration HTTPS/WSS hors Internet sur le point d'accès viendra après : elle doit résoudre la différence d'adresse et de certificat au lieu de transposer automatiquement le résultat HTTP de P16.
