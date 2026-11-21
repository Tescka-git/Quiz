# P8 — Navigateur PC vers serveur Android

**Verdict :** positif selon le retour manuel de l'utilisateur.

La sonde web sur PC a reçu plusieurs pongs du serveur WebSocket du Pixel 7. L'utilisateur rapporte des allers-retours entre **80 et 250 ms**. Le parcours proposé était `http://localhost:4173` vers `ws://192.168.1.21:8787`, sur le Wi-Fi existant.

Navigateur/version, nombre d'échantillons, export JSON, éventuelles permissions et conditions radio non recueillis. Les valeurs sont des observations, pas des seuils ni des mesures comparables directement au ping Node.js unique de P7.

Ce résultat ne valide ni une page HTTPS distante, ni WSS, ni la PWA sur téléphone, ni le réseau sans Internet, ni Android en point d'accès. La source de ce compte rendu est le retour utilisateur, pas une exécution automatisée.
