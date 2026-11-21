# Contrat de persistance — première expérience

Le moteur ne connaît pas SQLite. L'adaptateur expérimental Node est dans `apps/server-node/persistence/sqlite-session-store.mjs` et reçoit le moteur par injection. Aucune dépendance `node:sqlite` n'est introduite dans `packages/engine`.

Le contrat actuel couvre une session à une seule question :

| Opération | Résultat / invariant |
|---|---|
| `create(sessionId, question, players, nowMs)` | Crée un état initial figé, transaction validée avant retour ; identifiant existant refusé. |
| `read(sessionId)` | Retourne une copie désérialisée du dernier état enregistré ; session inconnue refusée. |
| `dispatch(sessionId, command, nowMs)` | Lit l'état, applique le moteur et sauvegarde atomiquement l'état et l'éventuelle réponse. |
| `close()` | Libère la connexion ; réutiliser une instance fermée n'est pas prévu. |

`dispatch` réunit pour l'expérience l'orchestration transactionnelle et l'adaptateur SQLite ; aucun réseau ni authentification n'y est implémenté. Le moteur garde les règles métier. Le futur hôte doit valider les messages et les droits animateur avant d'appeler l'adaptateur.

L'objet retourne `confirmed: true` uniquement après un commit réussi et pour une réponse nouvellement acceptée ou déjà enregistrée à l'identique. Une exception interrompt le retour ; aucune confirmation ne doit être envoyée. Le statut métier peut encore être `accepted-in-memory` : c'est le drapeau post-commit qui distingue la confirmation de stockage. Cette interface est interne au prototype, pas encore le protocole réseau public.

Une implémentation Android devra satisfaire les mêmes cas de conformité avec son adaptateur SQLite natif. Ce contrat ne permet pas d'utiliser le pilote Node sur Android et ne suppose pas que les réglages ou garanties de fichiers seront identiques.
