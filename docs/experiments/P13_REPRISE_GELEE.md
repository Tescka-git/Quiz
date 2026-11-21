# P13 — Reprise gelée après interruption

## Comportement implémenté

Le moteur expose `recover(state, nowMs)` sans API d'environnement. Il recopie le dernier état sauvegardé, conserve réponses, scores et temps logique, remplace l'origine de temps et place toute question non clôturée en pause. Une question clôturée reste clôturée.

L'adaptateur SQLite exige une restauration explicite pour toute session existante ouverte par une nouvelle instance. Il enregistre la restauration dans une transaction ; `dispatch` reste bloqué si cette transaction échoue. Il ne confirme aucune nouvelle réponse pendant la pause. Une retransmission identique retrouve une réponse déjà enregistrée, sans nouveau score.

La reprise nécessite ensuite une commande `resume` de l'animateur. L'adaptateur n'authentifie pas encore cette identité : ce contrôle sera fait par l'hôte réseau avant `dispatch`. L'opération `recover` est réservée au démarrage/restauration de l'hôte ; elle ne doit pas devenir une commande joueur.

## Origine du temps et limite du checkpoint

Exemple testé : ancien hôte démarré à `100000`, checkpoint à `104000` après 4000 ms de jeu. Nouvel hôte à `10` : après restauration et attente, le chronomètre reste à 4000 ms écoulées. Reprise à `7000`, réponse à `8000` : 5000 ms de jeu au total. La durée d'arrêt et l'attente de l'animateur ne sont pas décomptées.

La commande `checkpoint` permet de sauvegarder un temps logique plus récent. Aucun ordonnanceur ni intervalle de sauvegarde n'est encore installé. Le prototype reprend au **dernier point durable**, et ne peut reconstituer l'intervalle entre ce point et le crash. La précision de reprise et le coût des checkpoints devront être mesurés avant de fixer une fréquence. Ne pas présenter cette expérience comme une reprise à l'instant exact d'un crash arbitraire.

Les anciennes valeurs d'horloge ne doivent pas être réutilisées par le futur hôte : il doit horodater les commandes reçues selon sa nouvelle origine. Aucun horodatage client ne fait autorité.

## Vérifications Node

- Recalage sur une origine inférieure à l'ancienne, pause maintenue malgré l'attente et refus des nouvelles réponses.
- Réponses et scores conservés, doublon confirmé sans double comptage pendant la pause.
- Temps repris uniquement après `resume` ; question expirée sans temps supplémentaire offert.
- Session clôturée impossible à rouvrir par restauration ou reprise.
- Restauration répétée sans consommation de temps et entrées non modifiées.
- Erreur de sauvegarde lors de la restauration : aucun état partiel ni autorisation de commande.
- Tests de persistance et d'arrêt de processus P12 adaptés à la restauration obligatoire.

`npm.cmd test` : **23 tests positifs** sur PC au 21 novembre 2026. Le moteur et les contrôles de portabilité compilent sans nouvelle dépendance d'exécution.

## Scénario Android préparé

```text
npm.cmd run prepare:recovery-probe
```

Le harnais commun accepte une restauration avec nouvelle origine avant une étape. Le scénario de neuf étapes couvre acceptation, checkpoint, rechargement/restauration, refus pendant pause, doublon, reprise, réponse, expiration et maintien de clôture. Il vérifie les résultats attendus puis compare la trace Android à Node.

Empreinte préparée : `0872b5a0ce435b0a1b1e31ceed2a187810e785061f54bbe113783cbc9274ec02`.

**Android : essai physique positif le 21 novembre 2026 sur Pixel 7 / Android 17, AndroidX JavaScriptEngine 1.1.1.** Sonde 0.4 compilée et installée avec succès ; l'écran affiche `PASS`, neuf étapes vérifiées et l'empreinte ci-dessus. Le rapport récupéré a été comparé une seconde fois sur PC à l'empreinte et à la trace Node : concordance exacte. Voir [P13_PIXEL7.json](results/P13_PIXEL7.json).

Cette preuve porte sur la reprise dans le moteur JavaScript avec rechargement d'état JSON, pas sur une base SQLite Android ou un arrêt système réel du téléphone. La preuve SQLite et les interruptions applicatives restent exécutées côté Node dans ce lot.

## Suite et inconnues

Recommencer la question avec effacement ciblé, révision/annulation et historique restent hors du lot. Aucun écran de choix ou notification de restauration aux joueurs n'est encore implémenté. Migrations de version, multi-hôte, fréquence des checkpoints, durabilité Android et réseau complet restent à éprouver.
