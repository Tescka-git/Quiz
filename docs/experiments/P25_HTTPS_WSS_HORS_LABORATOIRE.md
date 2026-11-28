# P25 — Accès local sécurisé sans autorité de laboratoire

Étude du 25 novembre 2026. Statut : comparaison et première sonde réalisées ; aucune solution de distribution sélectionnée, aucun domaine acheté ou configuré, aucun certificat créé ou remplacé, aucun service déployé.

## Besoin et distinctions

Les joueurs utilisent leur navigateur, le moteur et les réponses restent sur Android. Le réseau de jeu doit pouvoir fonctionner sans Internet. Une préparation initiale avec Internet est acceptée ; installer une autorité de certificat sur chaque joueur n'est pas le parcours final souhaité. Hôte et animateur restent distincts.

Distinguer : Internet pour préparer/renouveler ; Internet pendant la partie ; réseau Wi-Fi local ; interface préchargée ; serveur de jeu disponible. Un cache PWA ne remplace ni le DNS ni une négociation TLS, et ne transforme pas une IP privée en origine de confiance. localhost sur le joueur désigne le joueur, pas le Pixel hôte.

## Comparaison

| Option | Préparation | Partie sans Internet | Limites et conclusion |
|---|---|---|---|
| Autorité privée actuelle, HTTPS/WSS | Autorité approuvée sur chaque joueur, certificat couvrant l'adresse | Déjà éprouvée dans les conditions de laboratoire consignées | Base de comparaison conservée, pas le parcours grand public |
| HTTP/ws sur IP privée | Aucune autorité | Transport local possible | Pas de contexte sécurisé ni service worker sur cette origine, trafic non chiffré ; ne satisfait pas la PWA sécurisée |
| Domaine contrôlé + certificat public par hôte + WSS local | Domaine, émission/renouvellement en ligne, clé propre à chaque hôte | Candidat si nom résolu localement, certificat valide et chaîne complète | Piste prioritaire pour conserver le chiffrement ; résolution DNS hors Internet et exploitation des certificats à démontrer |
| PWA HTTPS publique préchargée + ws local avec permission navigateur | Charger et mettre en cache l'origine publique | Candidat pour les navigateurs autorisant cette communication | Transport ws non chiffré ; compatibilité, autorisation persistante et reprise hors Internet à tester. Ce n'est pas du WSS |
| PWA publique + WebRTC DataChannel local | Signalisation et association à concevoir, par exemple par échange local | Potentiellement, avec ICE local sans dépendance TURN/STUN distante | Transport chiffré possible, mais nouvel adaptateur Android et complexité importante ; piste secondaire non testée |
| Relais/tunnel Internet pour les échanges joueurs | Service distant et accès Internet | Non | Ne remplace pas notre jeu local autonome ; le relais de projection demeure distinct |
| Application installée aussi chez les joueurs | Installation par joueur et enveloppes Android/iOS | Candidat à étudier si le navigateur devient bloquant | Change le parcours PWA retenu ; pas de décision dans ce sens |

Les possibilités conditionnelles de cette table sont des hypothèses d'architecture, pas des preuves sur téléphones.

## Domaine et certificat public : ce que cela résout et ce qui reste

DNS-01 permet d'obtenir un certificat de domaine même si le serveur web n'est pas exposé publiquement [S2]. Cela ne fournit pas automatiquement la résolution du nom depuis le point d'accès Android sans Internet.

Schéma envisagé : un nom propre à l'hôte, un certificat et une clé générée/conservée pour cet hôte, puis HTTPS/WSS vers l'adresse locale résolue. Ne jamais distribuer une même clé privée avec toutes les installations : ce danger est explicitement décrit par Let's Encrypt [S3]. Aucun jeton DNS général ne doit être embarqué dans l'APK ; un éventuel mécanisme de provisionnement serait une décision structurante séparée.

À tester avant de retenir cette piste : résolution d'un vrai domaine public vers l'IP locale, accès depuis Chrome/Firefox/Safari avec leurs réglages normaux, DNS privé/DoH, filtrage contre le rebinding, réseau invité, IP du hotspot changeante et nouveau démarrage navigateur sans Internet. Un QR code peut transporter l'adresse ou le nom ; il ne crée ni confiance TLS ni résolution DNS. Un suffixe .local ne remplace pas un domaine public certifiable.

Un routeur maîtrisé avec DNS local rend cette expérience plus contrôlable ; sa réussite ne prouverait pas que le hotspot Android standard fournit les mêmes possibilités. Ne pas présumer une configuration DNS du hotspot possible sans restriction.

Les certificats IP publics proposés par Let's Encrypt sont désormais disponibles et de courte durée [S4], mais les exigences publiques interdisent les IP réservées [S5] : cela ne permet pas de certifier directement nos 192.168.x.x ou 10.x.x. Une IP publique et un tunnel auraient d'autres contraintes et ne résolvent pas notre autonomie locale.

## Accès réseau local soumis à permission

La documentation Chrome décrit les demandes de permission et l'exception de contenu mixte pour un WebSocket ws ciblant une IP privée explicite ou un nom .local [S1]. Mozilla documente également les permissions réseau local et l'extension des protections aux WebSockets [S6]. Ces sources ne suffisent pas à annoncer une compatibilité Firefox Android ou Safari dans notre montage.

La PWA publique pourrait être préchargée, puis ouvrir un canal local depuis une action utilisateur. À vérifier avec un profil neuf : autorisation, refus puis nouvelle autorisation, fermeture complète, redémarrage, changement d'IP, coupure des accès Internet et reconnexion. Distinguer le cas page publique vers LAN de deux services sur localhost ; ne pas utiliser de drapeau désactivant la sécurité comme preuve.

Même fonctionnelle, cette option transmettrait les échanges ws sans TLS : elle ne respecte pas à elle seule l'objectif de communication chiffrée. Une adaptation éventuelle du niveau de sécurité doit être discutée explicitement, pas introduite comme un simple correctif navigateur.

## Première sonde exécutée

Commande : node tooling/probe-local-context.mjs. Aucun ajout de dépendance ; serveur isolé ne servant qu'une page fixe et ping/pong, arrêté en fin de test. Aucun changement de l'application ou des certificats.

Résultat Chrome PC 158.0.8127.37 : sur HTTP via IPv4 privée 172.18.176.1 (interface choisie automatiquement, potentiellement virtuelle), isSecureContext=false, API serviceWorker absente, WebSocket local ping/pong positif. Rapport local : artifacts/local-context/report.json, hors Git.

Cette preuve minimale élimine HTTP sur IP privée comme remplacement direct de notre PWA sécurisée. Elle ne prouve aucun accès depuis une origine publique HTTPS, aucune permission mobile, aucune confiance publique TLS, aucun trajet physique vers le Pixel ni aucune coupure Internet. Le serveur n'utilise pas localhost pour éviter de confondre son exception de développement avec une vraie IP LAN.

## Expériences suivantes, bornées et comparables

1. Relever versions Chrome/Firefox Android et Safari disponible ce week-end ; fixer pour chaque essai origine de page, endpoint, permission, chiffrement et état des accès Internet.
2. Permission réseau local : petite page HTTPS préchargée, bouton de connexion, ping/pong vers Android indépendant du quiz. Observer autorisation/refus et reprise sans Internet, sans désactiver les contrôles. Pour simuler une origine publique sur PC, un drapeau de classement d'espace réseau peut aider au diagnostic, mais ne vaut pas preuve sur mobile.
3. Domaine/WSS : avec un domaine dont le contrôle est établi, préparer une proposition concrète d'émission par hôte, puis faire valider la configuration DNS et les opérations de certificat avant exécution. Tester sur un client sans autorité de laboratoire, chaîne normale et aucune exception ; refaire entièrement hors Internet après fermeture du navigateur.
4. Comparer les deux : nombre de gestes pour rejoindre, succès avec cache froid/chaud, IP modifiée, certificat expiré, dépendances réseau et sécurité. Ne fixer des seuils de temps qu'après mesures.

Pour la piste domaine, l'étude documentaire est réalisable immédiatement ; la preuve représentative attend le contrôle d'un domaine et d'un mécanisme de résolution locale. Pour la piste permissions, un test de navigateur est plus court, mais ne résout ni le chiffrement ni l'universalité. L'intégration produit (provisionnement, renouvellement, diagnostics et multi-navigateurs) est un lot distinct, pas une correction de quelques lignes.

## Recommandation proposée, à valider

Conserver HTTPS/WSS de laboratoire pour continuer à développer. Étudier en priorité domaine/certificat propre à l'hôte + résolution locale, car cela préserve le chiffrement et les clients navigateur. Tester en parallèle les permissions modernes comme expérience comparative, sans les choisir comme remplacement sécurisé. Ne pas annoncer encore une solution universelle, ni lancer un relais Internet ou une installation joueur par défaut.

## Sources officielles consultées le 25 novembre 2026

- [S1 — Chrome : Local Network Access](https://developer.chrome.com/docs/modern-web-guidance/guides/security/local-network-access), notamment WebSocket et permissions ; comportements dépendants des versions.
- [S2 — Let's Encrypt : types de challenges](https://letsencrypt.org/docs/challenge-types/), DNS-01.
- [S3 — Let's Encrypt : certificats localhost et risque des clés distribuées](https://letsencrypt.org/docs/certificates-for-localhost/). Le passage historique sur les contenus mixtes ne décrit pas à lui seul les nouvelles exceptions Chrome.
- [S4 — Let's Encrypt : certificats IP et courte durée](https://letsencrypt.org/2026/01/15/6day-and-ip-general-availability).
- [S5 — CA/Browser Forum : exigences publiques](https://cabforum.org/working-groups/server/baseline-requirements/requirements/), restrictions sur les Reserved IP Addresses.
- [S6 — Mozilla : permissions réseau local](https://support.mozilla.org/en-US/kb/control-personal-device-local-network-permissions-firefox) et [suivi WebSocket](https://bugzilla.mozilla.org/show_bug.cgi?id=2042339).
- [S7 — W3C : Service Workers](https://www.w3.org/TR/service-workers/), contexte sécurisé.

## Complément du 28 novembre — permissions PC et préparation Android

Nouvelle sonde : node tooling/probe-local-permission.mjs. Elle réutilise la page de diagnostic Android/PWA, sans moteur ni données de quiz. Le serveur de page est HTTPS sur loopback ; sa classification réseau est simulée « public » avec le drapeau Chrome documenté ip-address-space-overrides. Le serveur cible est ws sur loopback, donc l'essai porte sur public simulé vers loopback, pas sur un trajet Wi-Fi.

Le certificat PC existant n'est pas approuvé dans le profil Chrome neuf : navigation normale rejetée avec ERR_CERT_AUTHORITY_INVALID. Pour isoler les permissions, le lancement de test ajoute une exception TLS limitée au SPKI de ce certificat (ignore-certificate-errors-spki-list). Aucun magasin de confiance ni certificat modifié. Cette exception et la classification simulée font partie des limites ; cet essai ne valide pas une origine publique réelle ni sa confiance TLS.

Chrome PC 158.0.8127.37 : permissions local-network et loopback-network injectées par CDP dans le contexte navigateur exact. Refus : ERR_BLOCKED_BY_LOCAL_NETWORK_ACCESS_CHECKS et aucun canal ouvert. Autorisation : canal ouvert et pong reçu. Aucun clic humain sur l'invite de permission n'a été testé. Rapport local artifacts/local-permission/report.json. La sonde enregistre le rapport avant ses assertions afin de conserver les blocages éventuels.

La page de diagnostic présente maintenant « Sonde permissions v1 » et un bouton de lecture des deux permissions, avec journal exportable. Une API inconnue est signalée sans être interprétée comme un refus d'accès. Cache de cette sonde seulement passé à kuikuiz-diagnostic-v2 ; cache du quiz inchangé. Après actualisation, fermer les anciens onglets de diagnostic pour activer le nouveau service worker.

### Recette Android à compléter

Pixel et Redmi disponibles ; iPhone non disponible pour cette séance. Pixel reconnecté à l'adresse habituelle ; aucun résultat mobile de cette nouvelle sonde encore acquis.

1. Sur le Pixel, démarrer la sonde séparée « Démarrer le serveur », port 8787 ; ne pas confondre avec l'hébergement du quiz 8443/8789.
2. Sur Redmi Chrome, ouvrir la page diagnostic HTTPS du PC à son IP actuelle, port 4174 (au relevé : 192.168.1.23). L'autorité existante reste nécessaire pour cette page de laboratoire. Ne pas accepter une exception à une alerte inattendue ; relever l'erreur.
3. Vérifier « Sonde permissions v1 », lire les permissions, saisir ws://192.168.1.21:8787, puis toucher Connecter. Relever toute invite et son choix ; envoyer un ping si le bouton devient disponible et exporter le rapport.
4. Répéter dans Firefox, sans considérer un succès comme une preuve de public vers LAN : la page PC et le Pixel sont tous deux dans l'espace local.
5. Après ces contrôles, préparer le cache, fermer/réouvrir le navigateur et refaire une recette contrôlée sans Internet en conservant le Wi-Fi local. Tester refus puis réautorisation si le navigateur présente une permission pertinente.

Cette sonde utilise le service ping/pong historique, sans secrets de jeu et sur réseau de confiance uniquement ; son acceptation d'origines n'est pas une politique de production. Aucun endpoint de quiz n'est exposé par elle. Elle ne teste ni le chiffrement de ws ni une nouvelle solution de certificats publics.

### Recette Chrome Redmi — 28 novembre 2026

Page ouverte sur https://192.168.1.23:4174/ avec la confiance de laboratoire existante ; mention « Sonde permissions v1 » visible. Première tentative en HTTP vers le port HTTPS : ERR_EMPTY_RESPONSE ; accès rétabli après saisie explicite de https://. Le PC est en Ethernet et le Redmi sur le Wi-Fi de la maison.

L'utilisateur relève local-network=prompt et loopback-network=prompt, puis ouvre ws://192.168.1.21:8787 depuis le bouton Connecter. Aucune invite réseau n'apparaît ; ping envoyé et pong reçu. Résultat manuel positif pour le transport HTTPS local vers ws local dans Chrome Redmi, sans nouvelle exception de certificat rapportée. Version exacte de Chrome à relever dans l'export JSON.

Ne pas interpréter l'absence d'invite comme une permission accordée : la page et la cible sont toutes deux dans l'espace réseau local. Ce résultat n'établit ni accès public vers local, ni comportement Firefox/Safari, ni chiffrement du canal ws, ni reprise sans Internet. Le protocole P25 reste à compléter sur ces points.

### Recette Firefox Redmi — 28 novembre 2026

Pour la même page HTTPS PC et la même cible ws Pixel, l'utilisateur relève local-network=prompt et loopback-network=prompt. Connecter produit socket-error puis close code 1006, reason vide ; aucun pong. Aucun refus explicite par une invite n'est rapporté. Version exacte à relever, ne pas réutiliser implicitement celle des anciens essais.

Lecture du journal de la sonde Pixel après l'essai : une connexion du PC et une du Redmi (192.168.1.32), chacune avec ping/pong. Aucune nouvelle connexion supplémentaire visible attribuable à Firefox. Le journal n'identifie pas le navigateur : ce relevé est cohérent avec l'absence de handshake Firefox terminé, sans prouver la cause du blocage.

Conclusion limitée : le montage HTTPS local vers ws local n'est pas validé dans Firefox Redmi, contrairement à Chrome dans cet essai. Le code 1006 seul ne distingue pas blocage navigateur, contenu mixte, politique réseau ou autre échec. Il faut un diagnostic console/réseau Firefox pour attribuer une cause ; aucune préférence de sécurité modifiée pour contourner le résultat. Cette observation ne remet pas en cause les parcours HTTPS/WSS du quiz déjà validés dans Firefox.

### Cache et retour réseau Chrome Redmi — 28 novembre 2026

Préparation initialement signalée en échec par l'utilisateur (cause et message non relevés), puis « Ressources présentes » après connexion WebSocket. Aucun lien causal établi : le WebSocket n'est pas requis pour la préparation du cache.

Sur Redmi Chrome, Wi-Fi et données mobiles coupés selon la manipulation demandée : après recharge, page de diagnostic toujours affichée. Wi-Fi de la maison réactivé, données mobiles laissées coupées, nouvelle connexion à ws://192.168.1.21:8787 puis ping : pong reçu selon l'utilisateur.

Validation limitée : interface préchargée rechargeable hors réseau et retour du canal local après reconnexion Wi-Fi. Le Wi-Fi de la maison conservant un accès Internet, ce résultat ne démontre pas la communication PWA vers Android sans Internet. Ni fermeture complète/redémarrage navigateur, ni espace public réel vers LAN, ni chiffrement ws, ni équivalence Firefox validés.

## Inventaire Quizcotte — 28 novembre 2026

L'utilisateur met à disposition Quizcotte (deux t), 192.168.1.34, compte quiz. Accès SSH par clé dédiée vérifié, clé privée locale hors Git et non copiée sur le Raspberry. Permissions locales Windows corrigées pour le compte utilisateur exécutant SSH. Aucun mot de passe collecté et aucun accès sudo sans mot de passe ajouté.

Inventaire distant en lecture seule : Raspberry Pi 3 Model B Rev 1.2, aarch64, Debian GNU/Linux 13.8 trixie ; 904 Mio de RAM dont environ 754 disponibles au relevé, 25 Go disponibles sur la partition racine. Node v24.22.3 et npm 11.19.1 présents, git et Python 3 présents. Test node:sqlite sur base en mémoire positif. Aucun écouteur TCP/UDP 53 observé, systemd-resolved inactif, dnsmasq/unbound non trouvés dans PATH. Résolution actuelle via NetworkManager et la box ; interface wlan1 à l'adresse fournie. Ces relevés ne constituent pas une mesure de charge.

Le Raspberry peut servir de candidat pour serveur de jeu et DNS local sur le même appareil ; sa capacité réelle doit être mesurée. Aucun logiciel ni service installé, aucun changement DNS/DHCP effectué lors de cet inventaire. sudo exige un mot de passe. Une installation future de service système devra être préparée avant sa validation et son exécution dans le terminal utilisateur.

Prochaine étape proposée : démarrer le jeu dans un dossier utilisateur séparé et éprouver une sonde de résolution sur port non privilégié avant d'envisager un DNS système sur 53. Ne pas modifier le DNS de toute la maison pour le premier essai. Ce montage avec Raspberry ne démontre pas le fonctionnement avec le seul point d'accès Pixel ; le domaine public et la confiance TLS publique restent un jalon distinct.
