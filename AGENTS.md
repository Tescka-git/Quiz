# Instructions aux agents de développement — Kuikuiz

## Références
1. Lire `docs/SPECIFICATIONS.md` pour les règles fonctionnelles validées.
2. Lire `docs/ARCHITECTURE.md` pour les orientations techniques et leurs réserves.
3. Lire `docs/QUESTIONS_OUVERTES.md` avant toute décision sur une technologie non encore validée.

## Priorités
- **Priorité n° 1 : faisabilité technique**, notamment moteur TypeScript partagé, serveur Node.js, hôte Android, communication WebSocket, PWA hors ligne et robustesse.
- Commencer par un prototype minimal (session, question, chronomètre, réponses, score) ; ne pas construire toutes les fonctionnalités d'un coup.
- Séparer la logique métier des adaptateurs réseau, stockage et environnement Android/Node.js.
- Prévoir tests automatisés de charge à 30 joueurs simulés, puis validation sur 30 téléphones réels.
- Mesurer les performances avant de proposer des seuils chiffrés ; aucune réponse confirmée ne doit être perdue.

## Règles de travail
- Avant une modification significative, proposer un plan court, les fichiers concernés, les risques et les tests.
- Ne pas supposer qu'Android peut héberger Node.js nativement ou qu'une PWA HTTPS peut utiliser un WebSocket local non sécurisé : tester ces hypothèses.
- Ne pas contourner les politiques de sécurité des PC d'entreprise : animateur en navigateur, serveur distant.
- Préférer des changements petits, testables et documentés ; mettre à jour la documentation si une décision est validée.
- Ne pas introduire d'infrastructure (Docker, PostgreSQL, cloud, comptes joueurs) sans besoin démontré ou accord.
- Signaler clairement les inconnues et demander validation pour les choix structurants.
- Ne pas publier, déployer ni modifier des secrets sans accord explicite.
