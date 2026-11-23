# P22 — Échéance automatique et parcours joueur

**23 novembre 2026.** Suite des retours manuels positifs de reprise P21.

## Comportement

- Le moteur partagé clôture aussi la question à l'échéance autoritaire. Un checkpoint arrivé à la limite ferme l'état, persisté avant affichage de la correction et du classement. Une réponse absente vaut 0 ; une réponse tardive est refusée. Le lancement de la question suivante reste manuel.
- La pause gèle le temps ; aucune révélation ne dépend d'un chronomètre du navigateur. L'affichage attend le checkpoint hôte et sa diffusion, sans garantie de latence chiffrée. La clôture après toutes les réponses reste disponible.
- Après confirmation, le joueur voit aussi « En attente des autres joueurs ou de la fin du temps… » tant que la question est ouverte. Le reçu durable demeure distinct et le message d'attente disparaît en pause ou après clôture.
- « Rejoindre une autre partie » est accessible au joueur même pendant une partie. Il quitte l'accès local courant et ouvre le formulaire ; il ne supprime pas les réponses sur l'hôte. Aucun sélecteur d'anciens accès ni arrêt de session ajouté.

## Versions et données

Préparation APK **0.13-experiment**, cache `kuikuiz-mock-shell-v4`. Moteur modifié pour la règle d'échéance, toujours sans API d'environnement. Nouvelle base Android `kuikuiz-playable-v4.db` et base Node CLI `quiz-v4.sqlite` ; bases précédentes conservées sans migration ni effacement. Les anciens codes ne sont pas repris dans cette base. Certificats inchangés. Fermer les onglets après préparation de la mise à jour pour activer le cache, sans effacer les données du site.

## Validation

35 tests moteur/réseau/persistance positifs : échéance exacte, pause/reprise, doublon après clôture, rollback d'une clôture à l'échéance, nouvelle tentative et récupération de l'état fermé. Charge Node à 30 joueurs simulés conservée ; pas de nouvelle preuve de charge physique.

Le parcours navigateur vérifie le message après confirmation, le changement de salle joueur depuis une question en pause et la révélation à l'échéance avec un joueur sans réponse. En exécution locale, l'horloge injectée de l'hôte est avancée pour ce cas ; sur hôte externe, le test attend la vraie échéance. Cela ne remplace pas la recette tactile Android.

Compilation/installation Android, activation du cache et essai Pixel/Redmi de cette nouvelle règle restent à consigner après exécution. Les preuves P21 restent attachées à leur moteur et version précédents.

## Installation et premiers contrôles Android

Préparation de l'artefact `0bf772f90d20bb846f8b00981a52a5817bb477ffa08fe08a3de84758b3390f10`, compilation Gradle et installation `install -r` positives. Hôte HTTPS/WSS relancé par bouton natif vérifié. Parcours Node strict sur l'hôte Pixel : trois questions, 3 000 points, doublons et reconnexion positifs ; confirmations observées environ 59, 76 et 121 ms, sans seuil déduit. Rapport local `artifacts/mock-preview/live-android-p22.json`. Le manifeste de build reste `androidValidated: false` : les preuves d'exécution sont attachées aux recettes, pas au seul build.

Le test navigateur sur hôte externe utilise uniquement une exception TLS limitée aux contextes Playwright PC, sans modification du magasin Windows. Le parcours Node vérifie séparément la chaîne et l'adresse avec l'autorité de laboratoire. Cela ne démontre pas une confiance normale sur Chrome PC non préparé ni une recette tactile Redmi.

Recette navigateur PC sur **hôte Android réel** positive : message d'attente, changement de salle joueur depuis une question en pause, puis vraie échéance de 30 secondes avec un joueur sans réponse, résultats affichés sans commande de révélation et score 1 000 points pour la réponse confirmée. Rapport local `artifacts/mock-preview/browser-report.json` (origine Android, exception TLS de contexte explicitée). Le téléphone exécute le même artefact compilé ; aucune règle métier réécrite dans l'adaptateur. Activation du cache et validation tactile Pixel/Redmi restantes.

## Correction du parcours depuis l'accueil — 0.14

Retour utilisateur : devoir choisir « Oublier cet accès » pour rejoindre une nouvelle partie depuis l'accueil n'est pas acceptable. « Je participe » ouvre désormais explicitement le formulaire code/pseudo, sans tentative de retour automatique dans l'ancienne salle. « Rejoindre une autre partie » suit le même parcours. L'accès local précédent reste enregistré tant que la nouvelle inscription n'a pas réussi ; les données du site ne sont pas effacées.

Le simple rafraîchissement de la page d'une partie continue à restaurer son accès. L'intention de rejoindre une nouvelle salle est portée par l'URL pendant l'inscription, puis retirée après réception des nouveaux accès : le rafraîchissement retrouve alors la nouvelle partie. Un accès périmé ouvert directement propose « Rejoindre une autre partie » côté joueur, pas une consigne d'oubli de données. Ce mécanisme n'ajoute pas de sélection d'historique ni de comptes.

APK **0.14-experiment**, cache `kuikuiz-mock-shell-v5`. Moteur, base v4 et certificats identiques à 0.13 ; aucune nouvelle base pour cette correction d'interface. Régression navigateur : ancien accès valide conservé pendant l'affichage du formulaire, formulaire maintenu au rafraîchissement avant inscription, nouvelle salle récupérée après inscription et rafraîchissement ; menu accessible sans erreur avec un ancien accès périmé. Installation et contrôle des ressources à consigner après exécution.

Tests navigateur, cache et cycle de mise à jour positifs sur PC. Compilation Gradle et installation `install -r` positives ; hôte HTTPS relancé. Client Node avec autorité explicite : page d'accueil servie avec parcours de nouvelle inscription, script avec distinction de cette intention et service worker cache v5. Activation du cache et vérification tactile de ce parcours sur Redmi encore à confirmer.

## Validation manuelle Pixel/Redmi — 0.14

Après préparation puis fermeture/réouverture des onglets, l'utilisateur confirme que le menu « Je participe » ouvre correctement le formulaire sans demander d'oublier l'accès précédent. Le cache actif n'a pas été inspecté directement sur le Redmi ; le parcours corrigé est observé manuellement.

L'essai demandé comporte deux joueurs : Redmi répond Mars et confirme, Tutu ne répond pas. Consigne de vérifier le message d'attente puis de laisser le temps expirer sans commande de révélation, avec résultats attendus de 1 000 points pour le joueur Redmi et 0 pour Tutu. L'utilisateur répond « C'est parfait ». Retour manuel positif pour ce parcours complet sur hôte Pixel et client Redmi, après les contrôles automatisés. Aucun nouvel isolement Internet ni mesure de délai de révélation documentés par cet essai.
