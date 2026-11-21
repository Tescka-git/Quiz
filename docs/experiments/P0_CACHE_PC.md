# P0 — Cache de la sonde sur PC

## Observation manuelle rapportée par l'utilisateur

- Origine : `http://localhost:4173`.
- Cache préparé depuis la sonde, puis serveur arrêté selon les instructions.
- Page rechargée à la même URL : l'utilisateur confirme qu'elle s'affiche.
- Le texte initial « Cache non vérifié » est réapparu : il correspond à une remise à zéro de l'interface, pas à une disparition des ressources.
- Nouvelle vérification du cache, serveur toujours arrêté : résultat positif confirmé par l'utilisateur.

## Verdict et limites

P0 positif sur ce navigateur PC, d'après le retour utilisateur. Navigateur/version, export JSON et capture non recueillis. Le test n'a pas isolé le cache HTTP du cache du service worker ; il établit le parcours observé, pas une attribution exclusive à un mécanisme de cache.

Ce résultat ne valide ni l'origine HTTPS sur téléphone, ni WebSocket local, ni Android hôte, ni durabilité des réponses, ni arrière-plan. Il ne prouve pas la disponibilité du cache après éviction par le navigateur.
