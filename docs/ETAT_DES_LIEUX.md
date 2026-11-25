# État des lieux — 25 novembre 2026

## Ce qui fonctionne

Prototype de faisabilité : même moteur TypeScript compilé pour Node et Android, serveur local HTTP/WebSocket ou HTTPS/WSS de laboratoire, SQLite transactionnel, PWA préchargée. Trois questions à choix unique, pause, chronomètre autoritaire, réponses définitives, scores cumulés, récupération et reconnexion. Invariant : accusé après transaction, dédoublonnage par identifiant.

Le 25 novembre, l'utilisateur valide la 0.17 sur Pixel hôte/animateur et Redmi joueur dans Chrome, sur Wi-Fi maison : nouvelles interfaces, soumission au toucher, correction, classement, 3 000 points et podium animateur ; coupure Wi-Fi courte du Redmi puis reconnexion avec points conservés. Ce test n'établit pas de nouvelles conditions sans Internet. Ancien formulaire initialement conservé en cache, mise à jour obtenue après rétablissement de la connexion.

## Dernier ajustement

Préparation 0.18 : commande podium réservée à l'animateur après clôture finale. Déclenchement enregistré dans une petite table SQLite additive mock_podium, commune aux deux adaptateurs, sans migration des scores ni changement du moteur. Tous les clients reçoivent cet état : passage automatique au classement et animation locale. Un doublon ne relance pas une animation déjà vue ; reconnexion et redémarrage conservent la demande. Les animations ne sont pas synchronisées à la milliseconde. Cache v9. Recette physique de ce changement différée à la demande de l'utilisateur.

## Limites actuelles

Pas encore de création de quiz, comptes, médias, QCM multiple/texte dans le moteur, vrai QR code ou statistiques détaillées. Les types supplémentaires de l'atelier visuel sont des simulations. Certificats et installation d'autorité restent une solution de laboratoire. iOS hôte non validé ; recette iPhone joueur indisponible. Firefox Redmi validé auparavant, nouvelle interface/cache à retester. Charge automatisée de 30 joueurs distincte des essais physiques à plusieurs téléphones. Veille prolongée de l'hôte encore ouverte.

## Ménage proposé

| Ensemble | Proposition | Précaution |
|---|---|---|
| apps/web/mock, serveur, moteur, protocole | Conserver comme chemin jouable principal ; clarifier progressivement les noms « mock » | Renommage séparé avec tests et mise à jour des scripts |
| apps/web/layout | Conserver comme atelier pour les prochains échanges visuels | Éviter de maintenir deux interfaces produit ; reporter les décisions dans le vrai quiz |
| docs/experiments | Conserver les preuves historiques ; ajouter un index avec statut, résultat et limites | Ne pas supprimer les échecs utiles à la compréhension des risques |
| ARCHITECTURE, QUESTIONS_OUVERTES | Remplacer à terme les longs préambules chronologiques par une synthèse actuelle et des liens | Préserver les décisions validées et les inconnues |
| tooling | Classer les scripts par rôle : tests courants, outils Android, sondes historiques | Identifier leurs appels dans package.json et les docs avant déplacement |
| Application Android | Distinguer progressivement l'écran d'hébergement des boutons de sondes | Garder les tests moteur, stockage et récupération accessibles pendant la faisabilité |
| .tools et artifacts | Laisser hors Git ; inventorier avant tout nettoyage | Contiennent notamment SDK, certificats et bases locales : aucune suppression automatique |

Aucune suppression ni réorganisation globale effectuée dans ce lot. Prochaine étape recommandée : recueillir les nouvelles remarques fonctionnelles, mettre à jour les spécifications, puis faire un petit lot documentaire (index et synthèse) avant les renommages techniques. Garder chaque lot indépendant et vérifiable.
