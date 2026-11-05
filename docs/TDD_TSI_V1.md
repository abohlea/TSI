# TSI — Technical Design Document (TDD V1)

Document technique de référence pour la préproduction. Version 1.0 — 5 novembre 2026.

Firebase Authentication, Cloud Firestore et Cloudinary sont retenus. Render est exclu. Les quotas gratuits sont privilégiés pendant la préproduction. PlayCanvas Engine est retenu pour le prototype web ; le serveur de combat reste soumis à une preuve technique.


## 0. Statut et gouvernance

Ce document explique comment TSI doit être construit, testé et exploité. Il ne signifie pas que les systèmes sont déjà développés : le dépôt contient aujourd'hui la documentation de conception, pas encore une version compilée et testée sur appareils réels, un serveur multijoueur en production ou le backend.

Légende : **RETENU** = choix approuvé ; **PROPOSÉ** = recommandation ; **À PROTOTYPER** = décision conditionnée par une mesure ; **POST-LANCEMENT** = élément différé.

Règles :
1. Toute modification d'une décision structurante est consignée dans un ADR (Architecture Decision Record).
2. Une fonctionnalité n'est pas terminée parce qu'elle marche sur le PC d'un développeur ; elle doit passer ses critères de test.
3. Les quotas gratuits sont des limites d'utilisation, pas une capacité ou une disponibilité garantie.
4. Aucun secret, clé privée ou jeton n'est enregistré dans Git.
5. Aucune donnée de combat à haute fréquence n'est envoyée à Firestore.
6. Pas de bêta publique sans serveur autoritaire, règles de données testées et capacité opérationnelle validée.

## 1. Décisions structurantes

| Domaine | Décision | Statut |
|---|---|---|
| Moteur | PlayCanvas Engine 2.23.3 pour le prototype web ; validation mobile avant production | Prototype en cours |
| Langage gameplay | TypeScript côté client ; TypeScript/Node.js pour serveur candidat | Proposé |
| Plateformes prioritaires | Android et iOS | Retenu dans le GDD |
| Comptes | Firebase Authentication | Retenu |
| Base persistante | Cloud Firestore | Retenu |
| Médias | Cloudinary | Retenu |
| Protection des services | Firebase App Check en complément des règles | Proposé |
| Simulation | Colyseus 0.18.10 ; room locale de déplacement implémentée, production à valider | Prototype en cours |
| API sensible | Service serveur de confiance, hébergeur non choisi | À prototyper |
| Render | Exclu | Retenu |
| Préproduction | Émulateurs, quotas gratuits et serveurs locaux | Retenu |
| Production gratuite illimitée | Ne peut pas être promise | Limite à accepter |

Firebase, Firestore et Cloudinary ne sont pas des serveurs de combat. Firestore ne doit pas recevoir les positions à chaque frame, les tirs continus ou chaque variation de santé. Cloudinary ne remplace pas la base de données ni un serveur de simulation.

## 2. Architecture générale

TSI est divisé en quatre plans :

1. **Client :** client PlayCanvas web, testé d'abord dans un navigateur mobile, rendu, commandes, interface et prédiction visuelle.
2. **Simulation :** serveur de session autoritaire qui détient l'état officiel de chaque partie.
3. **Contrôle et persistance :** Firebase Authentication, API de confiance et Firestore.
4. **Médias :** Cloudinary pour les images, portraits, bannières et vidéos promotionnelles.

Schéma logique :

    CLIENT PLAYCANVAS
       | HTTPS : identité, profil, lobby
       v
    FIREBASE AUTHENTICATION
       | jeton vérifié
       v
    API DE CONTRÔLE TSI  ------> CLOUD FIRESTORE
       |                          profils, progression,
       |                          inventaire, résultats
       +----> MATCHMAKING / ALLOCATION
                      |
                      | ticket temporaire
                      v
               SERVEUR DE SESSION AUTORITAIRE
                      ^
                      | WebSocket / trafic de partie (premier prototype)
                      |
                    CLIENTS

    CLIENT / ADMINISTRATION ------> CLOUDINARY
              médias visuels et promotionnels

Le serveur de partie décide des combats. Firestore conserve les données persistantes. Cloudinary diffuse les médias.

### 2.1 Flux complet d'une session

1. Le joueur s'authentifie avec Firebase Authentication.
2. Le client obtient un ID token et l'envoie à l'API TSI.
3. L'API vérifie identité, expiration et état du compte.
4. Le matchmaking trouve une partie et demande une allocation.
5. Le backend remet un ticket court lié au joueur et à la session.
6. Le client rejoint le serveur de session autoritaire.
7. Le serveur valide le ticket et refuse les tickets expirés ou réutilisés.
8. La partie se déroule sur le serveur dédié.
9. Le serveur produit le résultat officiel.
10. Le service de confiance valide et enregistre ce résultat dans Firestore.
11. Le client affiche le résumé.

Le client ne choisit jamais lui-même une victoire, un rang ou une récompense.

## 3. Client PlayCanvas Engine

### 3.1 Moteur et chaîne de compilation

**Retenu pour le prototype : PlayCanvas Engine 2.23.3**, utilisé directement depuis son package npm. Le moteur est publié sous licence MIT et prend en charge WebGL 2 et WebGPU. Le projet est organisé en TypeScript avec Vite ; le code est suivi dans GitHub et l'éditeur visuel en ligne n'est pas nécessaire pour compiler ou modifier les scènes.

Versions déclarées dans les manifestes actuels :
- PlayCanvas Engine 2.23.3 ;
- SDK Colyseus client 0.18.9 ;
- TypeScript client : plage `^5.9.3` ;
- Vite : plage `^7.1.12` ;
- Node.js 22 recommandé pour les workflows CI ;
- Colyseus serveur 0.18.10 et `@colyseus/schema` 5.0.44 ;
- TypeScript serveur : plage `^5.9.3`.

Les plages semver côté TypeScript/Vite/Node doivent être figées dans des fichiers `package-lock.json` avant une release candidate. Les versions ci-dessus décrivent les manifestes, pas nécessairement les versions exactes résolues dans chaque installation.

Le rendu WebGL 2 est le chemin de compatibilité de base ; WebGPU peut être activé progressivement quand le navigateur et l'appareil le prennent en charge. Aucune fonction WebGPU ne doit être obligatoire pour lancer le jeu sur les appareils compatibles uniquement WebGL 2.

**Important :** PlayCanvas est un moteur web. Un jeu exécuté dans un navigateur mobile ou une WebView n'est pas automatiquement équivalent à une application 3D native. Les performances, le chauffage, la mémoire, le son et les limites du navigateur devront être mesurés sur de vrais téléphones Android et iOS. Le prototype actuel ne prouve pas encore qu'il peut soutenir le Battle Royale final.

Le projet peut être développé sans souscrire à l'éditeur PlayCanvas. L'éditeur gratuit en ligne a ses propres conditions (notamment projets publics et limite de stockage) ; notre source principale reste GitHub.

Documentation : [PlayCanvas Engine standalone](https://developer.playcanvas.com/user-manual/engine/standalone/), [PlayCanvas Engine API](https://api.playcanvas.com/engine/).

### 3.2 Langages et responsabilités

- **TypeScript :** gameplay client, caméra, contrôles, interface, chargement de ressources et communication réseau.
- **JavaScript :** uniquement pour les scripts de compatibilité ou d'outillage qui ne nécessitent pas de typage spécifique.
- **JSON / données typées :** paramètres d'armes, objets, profils de qualité, modes et configuration de niveaux.
- **Outils de build :** Vite pour le serveur de développement et la génération du bundle de production.

Le client peut prédire localement son déplacement pour la réactivité, mais ne décide jamais des dégâts, éliminations, récompenses ou résultats compétitifs.

### 3.3 Modules logiques

- TSI.Core : types partagés, identifiants et interfaces.
- TSI.Gameplay : déplacement, caméra et interactions.
- TSI.Weapons : armes, munitions, recul, cadence et feedback.
- TSI.Match : HUD, état visible de la partie et objectifs.
- TSI.Online : connexion, tickets et événements synchronisés.
- TSI.Persistence : interface vers les données persistantes.
- TSI.UI : menus, HUD et accessibilité.
- TSI.Mobile : commandes tactiles, orientation et profils graphiques.
- TSI.Security : validation des entrées et limites côté client.
- TSI.Assets : chargement et gestion des ressources 3D.

Les frontières de module doivent rester simples au début. Nous ne créerons pas de couche d'abstraction ou de plugin sans besoin réel.

### 3.4 Organisation du prototype

La base de code se trouve dans `game-client/` :
- `src/main.ts` : initialisation de PlayCanvas et connexion locale facultative ;
- `src/game/arena.ts` : terrain, bâtiments, balises, cibles et blocages procéduraux ;
- `src/game/PlayerController.ts` : déplacement, caméra, commandes tactiles, tir et rechargement ;
- `src/game/NetworkClient.ts` : connexion facultative à la room Colyseus locale ;
- `src/game/GameHUD.ts` et `src/style.css` : interface et affichage du HUD.

Le modèle du personnage et les structures sont volontairement des blocs 3D procéduraux. Ils ne sont pas des modèles AAA finaux, ne possèdent pas encore de squelette animé et servent à valider les dimensions et la boucle de jeu.

## 4. Serveur de jeu et réseau temps réel

### 4.1 Candidat serveur

**Colyseus 0.18.10 / Node.js / TypeScript est le candidat de référence pour les sessions de jeu autoritaires, les rooms et le matchmaking.** Une première room locale de test est présente dans le dépôt ; le SDK client est épinglé sur 0.18.9. Cette preuve ne valide pas encore la charge, le transport ou la capacité du Battle Royale final. Colyseus est publié sous licence MIT.

Ce choix n'est pas encore validé pour 60 joueurs de shooter. Il devra être mesuré sur le type de combat, le nombre d'acteurs, la fréquence des inputs et la qualité réseau cible.

Documentation : [Colyseus — framework et rooms](https://docs.colyseus.io/), [State Synchronization](https://docs.colyseus.io/state), [Client SDK TypeScript](https://docs.colyseus.io/getting-started).

### 4.2 Autorité serveur

Les parties publiques doivent fonctionner dans des rooms contrôlées par le serveur. Le serveur valide :
- l'identité et le ticket de session ;
- les entrées de déplacement et leur fréquence ;
- les vitesses, accélérations et transitions possibles ;
- la cadence de tir et les munitions ;
- les impacts, les dégâts et la santé ;
- les éliminations, réanimations et interactions ;
- le butin, les objectifs du Réseau de Front et la zone ;
- la fin de partie, les placements et les résultats.

Le client envoie une intention d'action. Il ne transmet jamais une instruction disant quel dégât appliquer à un adversaire.

### 4.3 Transport et limites du navigateur

Le transport par défaut documenté de Colyseus est WebSocket. Ce transport est pratique pour la première version et le test du matchmaking, mais fonctionne au-dessus de TCP et n'est pas automatiquement optimal pour un shooter rapide soumis à pertes de paquets.

Le navigateur n'expose pas un socket UDP brut comme une application native. WebTransport est une piste à évaluer selon le support des navigateurs et des appareils ; WebRTC DataChannels peuvent également être étudiés si le modèle de connexion le justifie. Le transport choisi doit être testé sur les réseaux mobiles réels. Le premier prototype local utilise WebSocket et ne valide pas encore le comportement d'un shooter compétitif sur réseau mobile.

**Décision :** débuter avec WebSocket/Colyseus pour le test en petit groupe. Si les mesures de latence, gigue, pertes et sensation de tir ne satisfont pas les exigences, réévaluer le transport avant de construire le Battle Royale complet. Ne pas promettre un netcode compétitif tant que cette porte n'est pas passée.

### 4.4 Synchronisation et boucle serveur

- Le serveur conserve l'état officiel des joueurs et des objets.
- Les clients envoient des inputs horodatés et numérotés ; le serveur vérifie leur ordre et leur fréquence.
- Le serveur publie des changements d'état limités aux informations nécessaires.
- Le client interpole les états distants et peut prédire son mouvement local.
- Les tirs et dégâts sont validés côté serveur.
- Les résultats persistants sont écrits après le match, pas à chaque tick.

Une fréquence de 20 à 30 mises à jour/s peut servir de plage d'expérimentation, mais ce n'est pas une valeur finale. Elle dépend des mesures du serveur et de l'expérience ressentie.

### 4.5 Capacité et tests de charge

Commencer avec 2 à 8 clients. Augmenter ensuite par paliers de 20, 40 et viser 60 joueurs uniquement si chaque étape passe les tests prolongés.

Mesurer :
- CPU et mémoire par room et par processus ;
- bande passante entrante et sortante ;
- fréquence des mises à jour ;
- latence médiane et percentiles élevés ;
- gigue et pertes de messages ;
- stabilité en cas de déconnexion ;
- cohérence des résultats ;
- temps de simulation dans les pires scénarios.

Les 60 joueurs du GDD sont un objectif de conception, pas une capacité démontrée.

### 4.6 Intérêt réseau et réduction des données

- N'envoyer à chaque client que les états utiles à sa partie.
- Réduire la fréquence des informations éloignées ou non pertinentes.
- Prioriser les états qui influencent directement les combats.
- Éviter la duplication de messages et les mises à jour sans changement.
- Tester plusieurs combats simultanés et les moments de forte activité.

### 4.7 Déconnexion et reprise

Prévoir une fenêtre de reconnexion configurable. Le serveur conserve temporairement l'état si le mode le permet. Les tickets expirés ou réutilisés sont rejetés. Les résultats et récompenses sont enregistrés une seule fois. Une déconnexion ne donne pas automatiquement la victoire à une autre équipe sans règle définie.

## 5. Firebase Authentication

Firebase Authentication gère l'identité du compte. Les méthodes de connexion exactes seront choisies selon Android/iOS et les pays visés. La connexion téléphonique ne sera pas le seul choix : elle peut entraîner des coûts et des abus.

L'UID est l'identifiant technique stable ; le pseudonyme public est séparé du compte d'authentification.

Flux :
1. Le client s'authentifie auprès de Firebase.
2. Il obtient un ID token.
3. L'API TSI vérifie signature, expiration et audience.
4. Le backend vérifie l'état du compte.
5. Pour rejoindre une partie, le backend crée un ticket court à usage limité.

Ne jamais enregistrer les mots de passe ou jetons dans les logs. Les rôles administratifs ne sont jamais définis par le client.

### 5.1 App Check

App Check est proposé comme couche complémentaire pour les services Firebase compatibles. Il aide à limiter les accès venant de clients non authentiques, mais ne remplace ni authentification, ni règles Firestore, ni autorité serveur, ni système anti-triche.

Documentation : [Firebase App Check](https://firebase.google.com/docs/app-check).

## 6. Cloud Firestore — modèle de données

### 6.1 Utilisation autorisée

Firestore conserve les données persistantes : profils, préférences, pseudonymes, inventaires cosmétiques, progression, résultats validés, classements, configuration de saisons et signalements.

Firestore ne stocke pas les positions à chaque image, la rotation de caméra continue, chaque tir, les projectiles ou les variations de santé pendant le combat. Ces informations restent dans la simulation en mémoire sur le serveur dédié ; seuls les événements et résultats nécessaires sont persistés.

### 6.2 Schéma logique proposé

**users/{uid}**
- createdAt, displayName, displayNameNormalized, accountStatus, schemaVersion, privacySettings.

**playerProfiles/{uid}**
- publicName, avatarMediaId, level, experience, selectedCosmeticIds, preferredLanguage, controlPresetVersion, updatedAt.

**inventories/{uid}/items/{itemId}**
- itemDefinitionId, quantity, acquiredAt, source, state.

**progression/{uid}**
- level, experience, challenges, weaponMastery, seasonId, schemaVersion, updatedAt.

**matchSummaries/{matchId}**
- matchId, modeId, mapId, startedAt, endedAt, serverRegion, playerResults, resultVersion, integrityStatus.

**seasons/{seasonId}**
- startAt, endAt, contentVersion, rulesVersion, rewardsDefinition, status.

**reports/{reportId}**
- reporterUid, targetUid, matchId, category, createdAt, reviewStatus, reviewerId, actionTaken.

**auditEvents/{eventId}**
- journal des opérations sensibles et administratives, accessible uniquement aux services de confiance.

Les champs sont une base conceptuelle et seront affinés avec le premier prototype backend.

### 6.3 Règles de sécurité

- Refus par défaut.
- Un joueur accède uniquement aux données qui lui sont destinées.
- Les champs modifiables par le client sont explicitement listés.
- Le client ne peut modifier niveau, expérience, inventaire, solde, rang, sanction ou résultat.
- Les signalements et journaux sont strictement restreints.
- Les règles sont testées avec des comptes autorisés et non autorisés.
- Les SDK Admin et comptes de service ne sont jamais intégrés à l'application mobile.

Les récompenses sont idempotentes : une même partie ne peut pas être créditée deux fois.

### 6.4 Quotas et discipline d'utilisation

Le quota gratuit Standard publié par Firestore est actuellement de 1 Gio de stockage, 50 000 lectures/jour, 20 000 écritures/jour, 20 000 suppressions/jour et 10 Gio de transfert sortant/mois, pour une base éligible. Vérifier les quotas officiels avant le lancement : [Firestore Pricing](https://firebase.google.com/docs/firestore/pricing).

Mesures d'économie :
- charger le profil à la connexion et lors d'une action explicite ;
- éviter les écouteurs en temps réel sur de grandes collections ;
- ne pas modifier un même document à haute fréquence ;
- paginer les historiques ;
- indexer les requêtes utiles ;
- agréger les événements côté serveur ;
- limiter les données dupliquées ;
- surveiller lectures, écritures, stockage et transfert.

Attention : sur Spark, certains dépassements de quotas arrêtent le service concerné jusqu'au cycle suivant. Il ne faut pas supposer que l'application continue automatiquement en mode payant.


## 7. API de confiance TSI

L'API de confiance vérifie les ID tokens, contrôle l'état du compte, applique les sanctions, gère les pseudonymes, crée les tickets de matchmaking, sélectionne les serveurs, signe les tickets, vérifie la provenance des résultats, écrit les données dans Firestore et applique l'idempotence.

Contrats logiques prévus :
- initialiser et lire un profil autorisé ;
- créer et consulter un ticket de matchmaking ;
- recevoir un résultat depuis un serveur de confiance ;
- enregistrer un signalement ;
- produire une signature Cloudinary pour un upload autorisé.

Ces opérations ne sont pas encore implémentées. Chaque action sensible doit vérifier l'identité, l'autorisation, le format et la fréquence des appels.

### Limite du plan gratuit Firebase

Cloud Functions for Firebase nécessite actuellement le plan Blaze. Les quotas gratuits disponibles sur Blaze ne signifient donc pas que le déploiement est possible sur Spark sans compte de facturation. Voir [Firebase Pricing Plans](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans) et [Cloud Functions FAQ](https://firebase.google.com/docs/functions/faq-and-troubleshooting).

Pendant la préproduction, exécuter l'API localement et utiliser les émulateurs lorsque possible. Avant une bêta publique, sélectionner une solution serveur de confiance. Ne jamais contourner ce besoin en accordant trop de droits au client.



## 8. Cloudinary — stratégie média

Cloudinary sert aux portraits, avatars, bannières, actualités, visuels de boutique, médias communautaires modérés et vidéos promotionnelles.

Ne pas utiliser Cloudinary comme base de données, serveur de match ou stockage principal des ressources de jeu (géométries, textures, sons ou paquets de contenu). Les ressources nécessaires au gameplay sont intégrées aux builds ou distribuées par un mécanisme de contenu conçu séparément.

Sécurité :
- ne jamais inclure le secret Cloudinary dans le client ;
- générer les signatures d'upload via l'API de confiance ;
- limiter formats, tailles, dossiers et types de médias ;
- vérifier la propriété de chaque ressource ;
- modérer les médias envoyés par les joueurs ;
- conserver un identifiant d'asset plutôt que multiplier les URL transformées ;
- séparer les droits d'administration et ceux des joueurs.

### Offre gratuite

Cloudinary indique 25 crédits mensuels sur son offre Free. Un crédit correspond notamment à 1 000 transformations, ou 1 Gio de stockage, ou 1 Gio de bande passante image ; ces usages partagent le budget. Ce quota convient au prototype et à un petit catalogue, pas à une diffusion mondiale massive garantie.

Sources : [Cloudinary Pricing](https://cloudinary.com/pricing) et [Billing and Plans](https://cloudinary.com/documentation/billing_and_plans).



## 9. Hébergement des serveurs — Render exclu

L'hébergeur de partie devra prendre en charge un processus Node.js persistant, WebSocket sur TLS/HTTPS, CPU soutenu, mémoire suffisante, démarrage/arrêt de rooms, logs par instance, supervision, isolation des matchs, protection réseau, régions testables et gestion sécurisée des secrets. Si le transport évolue vers WebTransport ou une solution native, les ports et protocoles requis seront réévalués.

Un hébergement de site web ou HTTP uniquement ne répond pas automatiquement à ces besoins.

**Développement :** serveur de session autoritaire lancé sur la machine du développeur.

**Laboratoire :** machine ou VM de test à durée limitée, uniquement après comparaison de la latence, du CPU, de la mémoire, du comportement WebSocket et du coût réel.

**Bêta et production :** fournisseur à choisir après mesures. Render reste exclu. Aucun fournisseur ne sera qualifié de haut de gamme ou de gratuit sans vérification de ses conditions et performances.

### Réalité du 100 % gratuit

Le zéro dépense est réaliste pour la documentation, les outils locaux, les prototypes et certains services auxiliaires sous quotas. Il n'est pas possible de garantir gratuitement des serveurs dédiés haut de gamme, persistants, à faible latence et disponibles à grande échelle.

Règles :
- aucune dépense sans autorisation du fondateur ;
- pas d'activation silencieuse d'un service payant ;
- développement local tant que le budget serveur n'est pas approuvé ;
- calcul du coût par partie et par joueur avant toute bêta externe ;
- aucune promesse de capacité ou disponibilité non mesurée.

## 10. Environnements

Trois environnements distincts sont requis.

**Development :** projet Firebase de développement, émulateurs, données fictives, Cloudinary de test, serveur de test local et logs détaillés.

**Staging :** projet Firebase distinct, comptes de test, API privée, serveurs de test, build bêta interne et vérification des migrations.

**Production :** projet Firebase distinct, accès d'administration limité, secrets séparés, Cloudinary de production, serveurs dédiés, alertes, sauvegardes et procédure de retour arrière.

Ne pas mélanger comptes, clés, médias et données entre les environnements.


## 11. Sécurité et modèle de menace

Menaces à couvrir :
- client modifié ;
- répétition ou falsification de tickets ;
- déplacement ou vitesse impossible ;
- cadence de tir impossible ;
- manipulation de dégâts ou munitions ;
- lecture d'informations non visibles ;
- duplication de récompenses ;
- vol de compte ;
- abus de Firestore ;
- upload de médias malveillants ou inappropriés ;
- déni de service ;
- fuite de secrets.

Mesures :
- autorité serveur sur le combat ;
- authentification et autorisation sur les API ;
- tickets courts et liés à une partie ;
- règles Firestore restrictives ;
- App Check en complément ;
- secrets hors du dépôt ;
- limites de fréquence et de taille ;
- journalisation sans jetons ;
- analyse des comportements impossibles ;
- procédures de modération, sanctions et contestation.

Aucun système anti-triche ne garantit l'absence totale de fraude. Les sanctions sévères ne doivent pas être décidées à partir d'un signal isolé peu fiable.

## 12. Secrets et GitHub

Ne jamais versionner un compte de service Firebase, un secret Cloudinary, une clé privée de signature, un jeton de publication, un certificat de signature mobile, un mot de passe ou un fichier d'environnement réel.

Un fichier exemple peut documenter les variables attendues, sans valeur secrète. Les vrais secrets restent dans un gestionnaire adapté ou dans l'environnement local protégé.

Le dépôt suit le code, les documents, les configurations et les scripts. Les grosses ressources 3D (glTF, textures compressées, audio et bundles) nécessitent une stratégie contrôlée (Git LFS ou stockage adapté après vérification des quotas). Ne pas committer caches, builds générés ou fichiers temporaires.

## 13. Performance mobile

Profils proposés :
- **Minimum :** objectif 30 FPS stable sur la matrice d'appareils définie.
- **Standard :** compromis qualité et fréquence.
- **Élevé :** objectif 60 FPS sur les appareils capables, si température et batterie le permettent.

Ces profils sont des cibles à mesurer, pas des garanties.

Mesures obligatoires : CPU jeu et rendu, GPU, RAM, mémoire graphique, temps de chargement, température après session prolongée, batterie, taille de l'application, FPS moyens et percentiles, latence et pertes réseau.

Stratégies : niveaux de détail, budgets de matériaux et d'effets, streaming de textures, chargement asynchrone, déchargement des zones, limitation d'acteurs visibles et tests sur téléphones réels.

La lisibilité du combat passe avant les effets lourds.

## 14. Observabilité

Outils envisagés :
- Crashlytics pour les crashs ;
- Performance Monitoring pour certaines mesures client ;
- Analytics pour des événements produit minimaux ;
- App Check pour les services compatibles ;
- logs serveur structurés ;
- tableau de bord pour disponibilité, sessions, matchmaking, réseau et consommation.

Mesures à suivre : connexions réussies/échouées, attente et erreurs de matchmaking, serveurs actifs, CPU/mémoire/bande passante par serveur, ping/gigue/perte, crashs par appareil, opérations Firestore et crédits Cloudinary.

Ne jamais enregistrer mots de passe, jetons, secrets ou données personnelles inutiles.


## 15. Tests et critères d'acceptation

### 15.1 Tests automatisés
- règles de déplacement et de combat ;
- transitions d'état ;
- validation des tickets ;
- calcul des résultats et récompenses ;
- idempotence ;
- règles Firestore ;
- API avec comptes autorisés, anonymes, suspendus et non autorisés.

### 15.2 Tests réseau
- latence élevée ;
- gigue et perte de paquets ;
- déconnexion et reconnexion ;
- paquets répétés ou désordonnés ;
- client envoyant trop de requêtes ;
- serveur surchargé ;
- arrêt inattendu du processus.

### 15.3 Tests de charge
Progresser par paliers : 2, 8, 20, 40, puis objectif 60 joueurs si les étapes précédentes réussissent. Mesurer CPU, mémoire, bande passante, latence et cohérence de simulation. Tester plusieurs combats simultanés et les pires cas, pas uniquement les déplacements.

### 15.4 Tests appareils
Couvrir Android entrée/milieu/haut de gamme, plusieurs générations d'iPhone supportées, mémoire limitée, réseau mobile instable, passage en arrière-plan et longues sessions avec échauffement.

### 15.5 Porte de validation
Un jalon n'est accepté que si le build est reproductible, les tests obligatoires passent, aucun défaut critique connu n'affecte comptes ou résultats, les performances sont mesurées et les régressions sont documentées.

## 16. Build et livraison

- Build client Android.
- Build client iOS sur environnement macOS compatible.
- Build serveur Linux dédié.
- Identifiant de build partagé entre client et serveur.
- Tests automatisés de scripts, règles, secrets et backend.
- Publication staging avant production.
- Migration Firestore documentée.
- Procédure de retour arrière préparée.

GitHub peut automatiser les contrôles et tests. Le build client PlayCanvas/Vite est un bundle web statique. Les workflows doivent aussi vérifier les types du serveur Node.js, ses tests de rooms et les règles de sécurité ; les limitations de temps et de stockage du runner restent à contrôler.

## 17. Phases techniques

### Phase A — preuve de faisabilité

Prototype PlayCanvas minimal, serveur Node.js local, compilation web, Firebase Authentication de test, Firestore Emulator, règles de base, premier média Cloudinary et connexion client vers serveur local.

**Acceptation :** un joueur authentifié rejoint le serveur local sans exposer de secret.

### Phase B — prototype de combat réseau

Déplacement, caméra, une arme, intention de tir, validation serveur, dégâts, élimination et mesure mobile.

**Acceptation :** le client ne peut pas imposer un résultat de combat.

### Phase C — persistance

Profils, inventaire cosmétique, progression de test, sauvegarde idempotente, règles Firestore et API de confiance.

**Acceptation :** un client non autorisé ne modifie ni récompense, ni progression, ni résultat.

### Phase D — vertical slice

Scène représentative, un personnage, armes, interface, son, un objectif Réseau de Front et serveur de session local.

**Acceptation :** qualité visuelle, sensation, performances et réseau démontrés.

### Phase E — alpha Battle Royale

Carte, équipes, matchmaking, butin, zone, sauvegarde et supervision.

**Acceptation :** tests de charge réussis par paliers et absence de faille critique connue.

### Phase F — bêta et production

Serveurs financés ou infrastructure opérée, support, modération, procédures d'incident, tests de sécurité et validations des plateformes.

Ne pas lancer publiquement avec des quotas gratuits non maîtrisés ou un hébergement improvisé.



## 18. Coûts et politique de gratuité

Pendant la préproduction, privilégier les quotas gratuits, les émulateurs et les outils locaux. Les quotas doivent être suivis et vérifiés régulièrement.

Limites publiées à la date de rédaction :
- Firestore Standard : 1 Gio, 50 000 lectures/jour, 20 000 écritures/jour, 20 000 suppressions/jour et 10 Gio de sortie/mois pour une base éligible.
- Cloudinary Free : 25 crédits mensuels partagés entre transformations, stockage et bande passante.
- Cloud Functions for Firebase : nécessite le plan Blaze ; les quotas d'utilisation gratuits sur Blaze ne signifient pas que Spark permet son déploiement.
- Serveurs de partie : les quotas gratuits de petites VM ne sont pas considérés comme une infrastructure compétitive fiable.

Seuils d'alerte internes : 50 %, 75 % et 90 % des quotas pertinents. Ces alertes ne remplacent pas les protections de facturation du fournisseur.

Aucune offre payante ne doit être activée sans autorisation explicite du fondateur.


## 19. Risques et décisions ouvertes

| Sujet | Action requise |
|---|---|
| Version PlayCanvas / Colyseus | Build TypeScript, vérifier le rendu et le transport réseau |
| Capacité de serveur | Tests de charge progressifs |
| Région | Mesurer la latence sur les marchés visés |
| API de confiance | Prototyper localement, sélectionner un hébergement avant bêta |
| Coût Firestore | Modéliser lectures et écritures par joueur |
| Cloudinary | Surveiller crédits et définir export des médias |
| Sécurité | Tester règles, tickets et permissions |
| Budget | Calculer coût par partie et par joueur |
| Équipe | Auditer compétences, matériel et capacité de build |
| iOS | Vérifier environnement macOS, signature et distribution |

Questions à résoudre avant production complète :
1. Version PlayCanvas exacte et compatibilité mobile.
2. Transport temps réel et hébergement des rooms autoritaires.
3. Hébergement de l'API de confiance.
4. Plafond mensuel autorisé après préproduction.
5. Capacité joueurs validée par le matériel.
6. Compatibilité iOS et Android réellement testée.

Ne pas inventer de calendrier ou de coût avant ces preuves.

## 20. Sources officielles

- [Firebase — Plans tarifaires](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans)
- [Firebase — Tarifs](https://firebase.google.com/pricing)
- [Cloud Firestore — Tarification](https://firebase.google.com/docs/firestore/pricing)
- [Firebase — App Check](https://firebase.google.com/docs/app-check)
- [Cloud Functions — FAQ et facturation](https://firebase.google.com/docs/functions/faq-and-troubleshooting)
- [Cloudinary — Tarifs](https://cloudinary.com/pricing)
- [Cloudinary — Crédits et plans](https://cloudinary.com/documentation/billing_and_plans)
- [PlayCanvas — Engine standalone](https://developer.playcanvas.com/user-manual/engine/standalone/)
- [Colyseus — documentation](https://docs.colyseus.io/)

## 21. Décision finale d'architecture

TSI utilise PlayCanvas Engine pour le prototype client web, Firebase Authentication pour l'identité, Firestore pour les données persistantes et Cloudinary pour les médias. Colyseus/Node.js est le candidat serveur autoritaire à valider par tests de réseau et de charge.

Render est exclu. Les quotas gratuits sont privilégiés pendant la préproduction, mais ne sont pas présentés comme une solution de production illimitée. Le jeu ne passera à la bêta publique qu'après validation de la capacité serveur, de la sécurité, des coûts et de la disponibilité.

**Première preuve technique exigée :** un client PlayCanvas mobile rejoint un serveur de session autoritaire local ; le serveur valide un tir et des dégâts ; le résultat est ensuite enregistré de façon sécurisée dans Firestore ; le client affiche un média de profil hébergé sur Cloudinary.

*Fin du document — TSI TDD V1.*


---

## 22. Première implémentation locale — Field Test 0.2

Les éléments suivants sont présents dans le dépôt :

### Client PlayCanvas
- PlayCanvas Engine 2.23.3 en TypeScript/Vite.
- Arène d'entraînement de Kantara générée par code.
- Opérateur TSI et fusil AR-01 construits avec géométrie procédurale de blocout.
- Caméra troisième personne, déplacements, collisions locales, sprint et commandes tactiles.
- HUD, munitions, rechargement, cibles et tir local hors ligne.
- SDK Colyseus 0.18.9 pour une connexion de développement facultative ; la connexion client/room est implémentée, mais elle doit encore passer la CI et un test manuel à deux clients.

### Serveur Colyseus
- Colyseus 0.18.10 avec room `field_test`, limitée à huit clients de test.
- Écoute sur loopback uniquement en développement ; les joins sont refusés en mode production.
- Jeton local d'au moins 24 caractères, stocké dans les fichiers d'environnement locaux non versionnés.
- Synchronisation des positions et des orientations.
- Validation des numéros de séquence, des valeurs finies et de la magnitude des déplacements ; le contrôle de rotation et la validation anti-aimbot restent à renforcer.
- Collisions de déplacement vérifiées côté serveur pour le terrain d'entraînement.
- Cadence de tir, chargeur et réserve gérés par le serveur.
- Calcul serveur des impacts sur quatre cibles d'entraînement, dégâts, score privé et réapparition des cibles.
- État privé (munitions/score) adressé au propriétaire ; état public (positions/cibles) diffusé à la room.
- Tests unitaires des règles de déplacement/inputs et de résolution des tirs de pratique ; les tests d'intégration de room, reconnexion et charge restent à ajouter.
- Workflow GitHub Actions pour typage, tests et build client/serveur.

### 22.1 Barrière de sécurité locale

Le jeton du prototype est transmis par le navigateur : ce n'est **pas** un secret de production. Le serveur refuse les connexions lorsque `NODE_ENV=production`, et l'écoute de développement est liée à `127.0.0.1`. Ne pas exposer ce serveur de test à Internet.

Le mode local ne vérifie pas encore Firebase Authentication ni les tickets signés. Il n'est pas destiné aux parties publiques ou classées.

### 22.2 Fonctionnalités encore absentes

- Authentification Firebase et validation des ID tokens par un service de confiance.
- Tickets de session signés, renouvellement et révocation.
- Matchmaking et allocation de serveurs de production.
- Dégâts entre joueurs, réanimation, éliminations de joueurs et règles PvP.
- Anti-triche complète, modération et gestion des sanctions.
- Écriture sécurisée des profils, progression et résultats dans Firestore.
- Uploads Cloudinary signés et modération des médias.
- Tests de charge prolongés, mesures Android/iOS et validation de capacité 60 joueurs.
- Modèle 3D final riggé, textures PBR finales, animations de locomotion et animations d'arme.

Le tir local hors ligne reste un mode d'entraînement. Les tirs contre les cibles dans la room locale sont validés par le serveur, mais cela ne constitue pas encore un combat compétitif multijoueur complet.

### 22.3 Versions épinglées

- PlayCanvas Engine : 2.23.3
- Colyseus serveur : 0.18.10
- SDK Colyseus client : 0.18.9
- @colyseus/schema : 5.0.44
- TypeScript client et serveur : `^5.9.3` (plage déclarée dans les manifestes)
- Vite : `^7.1.12` (plage déclarée dans le manifeste)
- Node.js : 22.12 ou supérieur

Le workflow GitHub Actions contient maintenant trois jobs : build client PlayCanvas, vérification/tests du serveur Colyseus et tests des règles Firestore dans l'émulateur. Le statut de la dernière révision de code n'a pas encore été confirmé dans cette session. Aucun succès CI récent n'est revendiqué ici. Même une CI verte ne remplacerait pas les tests sur téléphones réels, les tests de charge ni une validation de production.



---

## 23. Firebase — règles de sécurité et tests émulateur

Les fichiers de sécurité initiaux sont maintenant présents :
- `firestore.rules` : règles avec refus par défaut ;
- `firebase.json` : configuration des émulateurs locaux Auth/Firestore ;
- `firestore.indexes.json` : manifeste d'index versionné ;
- `backend/firebase/tests/firestore.rules.test.ts` : tests automatisés d'accès ;
- `backend/firebase/README.md` : procédure locale de test.

Principes testés :
- accès d'un joueur à ses propres données privées, sans accès aux données privées d'un autre ;
- impossibilité pour le client de changer statut du compte, inventaire ou progression ;
- lecture des profils publics pour les utilisateurs authentifiés, sans écriture client ;
- lecture d'un historique de partie seulement si l'identifiant du joueur est inclus dans la liste des participants et si la requête applique ce filtre ;
- configuration de saison en lecture seule ;
- signalements et événements d'audit fermés au client ;
- refus des lectures et écritures non authentifiées.

Les écritures sensibles restent réservées aux services de confiance. Les règles Firestore ne protègent pas à elles seules une API serveur mal conçue ou un compte de service compromis.

### 23.1 Vérification CI

Le workflow actuel est configuré pour exécuter :
- vérification TypeScript et build du client PlayCanvas ;
- vérification TypeScript, tests unitaires et compilation du serveur Colyseus ;
- vérification TypeScript des tests Firebase et exécution des règles dans l'émulateur Firestore avec Java 21.

Le dernier statut CI n'a pas été confirmé dans cette session. Ces jobs ne certifieront pas à eux seuls l'expérience Android/iOS, la latence réelle, la sécurité de l'authentification de production, la capacité à 60 joueurs, ni l'intégration avec des projets Firebase ou Cloudinary réels.
