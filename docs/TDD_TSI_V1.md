# TSI — Technical Design Document (TDD V1)

Document technique de référence pour la préproduction. Version 1.0 — 5 novembre 2026.

Firebase Authentication, Cloud Firestore et Cloudinary sont retenus. Render est exclu. Les quotas gratuits sont privilégiés pendant la préproduction. Les serveurs de combat seront des serveurs Unreal dédiés et autoritaires.


## 0. Statut et gouvernance

Ce document explique comment TSI doit être construit, testé et exploité. Il ne signifie pas que les systèmes sont déjà développés : le dépôt contient aujourd'hui la documentation de conception, pas encore le projet Unreal, les serveurs ou le backend.

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
| Moteur | Unreal Engine 5 ; version mineure figée après test client et serveur | À prototyper |
| Langage gameplay | C++ pour les règles fondamentales ; Blueprints pour assemblage et réglages | Proposé |
| Plateformes prioritaires | Android et iOS | Retenu dans le GDD |
| Comptes | Firebase Authentication | Retenu |
| Base persistante | Cloud Firestore | Retenu |
| Médias | Cloudinary | Retenu |
| Protection des services | Firebase App Check en complément des règles | Proposé |
| Simulation | Serveurs Unreal dédiés et autoritaires | Exigence |
| API sensible | Service serveur de confiance, hébergeur non choisi | À prototyper |
| Render | Exclu | Retenu |
| Préproduction | Émulateurs, quotas gratuits et serveurs locaux | Retenu |
| Production gratuite illimitée | Ne peut pas être promise | Limite à accepter |

Firebase, Firestore et Cloudinary ne sont pas des serveurs de combat. Firestore ne doit pas recevoir les positions à chaque frame, les tirs continus ou chaque variation de santé. Cloudinary ne remplace pas la base de données ni un serveur de simulation.

## 2. Architecture générale

TSI est divisé en quatre plans :

1. **Client :** application Unreal Android/iOS, rendu, commandes, interface et prédiction visuelle.
2. **Simulation :** serveur Unreal dédié qui détient l'état officiel de chaque partie.
3. **Contrôle et persistance :** Firebase Authentication, API de confiance et Firestore.
4. **Médias :** Cloudinary pour les images, portraits, bannières et vidéos promotionnelles.

Schéma logique :

    CLIENT UNREAL
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
               SERVEUR UNREAL DÉDIÉ
                      ^
                      | UDP / trafic de partie
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
6. Le client rejoint le serveur Unreal dédié.
7. Le serveur valide le ticket et refuse les tickets expirés ou réutilisés.
8. La partie se déroule sur le serveur dédié.
9. Le serveur produit le résultat officiel.
10. Le service de confiance valide et enregistre ce résultat dans Firestore.
11. Le client affiche le résumé.

Le client ne choisit jamais lui-même une victoire, un rang ou une récompense.

## 3. Client Unreal Engine

### 3.1 Version

Unreal Engine 5 est la piste de référence. La version mineure sera figée après une preuve comprenant : compilation Android, compilation et démarrage d'un serveur Linux dédié, connexion client-serveur, compatibilité des plugins, mesure sur téléphone réel et revue des conditions de licence.

Les fonctions réseau encore expérimentales dans la version retenue ne doivent pas devenir une dépendance du chemin critique sans validation indépendante.

Documentation : [Epic — Setting Up Dedicated Servers](https://dev.epicgames.com/documentation/unreal-engine/setting-up-dedicated-servers-in-unreal-engine).

### 3.2 Responsabilités

- **C++ :** déplacement, armes, dégâts, inventaire de partie, règles de match, validation serveur, réplication et interfaces de services.
- **Blueprints :** assemblage de niveaux, séquences simples, paramètres et prototypage visuel.
- **Data Assets / Data Tables :** paramètres d'armes, objets, profils graphiques, modes et versions de contenu.
- **Scripts d'outillage :** validation de ressources, automatisation de build et tests hors runtime.

Les règles critiques ne doivent pas être dupliquées dans deux implémentations différentes.

### 3.3 Modules logiques

- TSI.Core : types, identifiants et interfaces partagées.
- TSI.Gameplay : déplacement, combat et interactions.
- TSI.Weapons : cadence, recul, munitions et tirs.
- TSI.Match : équipes, zone, objectifs et résultats.
- TSI.Online : connexion, tickets et matchmaking.
- TSI.Persistence : accès aux données persistantes.
- TSI.UI : menus et HUD.
- TSI.Mobile : commandes tactiles et profils graphiques.
- TSI.Security : validations et limites d'actions.
- TSI.Server : configuration propre au serveur dédié.

Cette liste définit des responsabilités ; elle ne force pas à créer dix plugins avant d'en avoir besoin.


## 4. Serveur dédié et réseau temps réel

### 4.1 Autorité serveur

Les matchs publics utilisent un serveur Unreal dédié, sans joueur hôte. Le serveur valide l'identité de session, les déplacements plausibles, les changements d'état, la cadence de tir, les munitions, les impacts, les dégâts, la santé, les éliminations, les interactions, le butin, les objectifs et les résultats.

Le client envoie une intention de tir ; il ne transmet jamais une instruction disant quel dégât appliquer à un adversaire.

### 4.2 Transport réseau

- HTTPS pour identité, profil, matchmaking et résultats.
- Transport de jeu Unreal sur UDP pour les parties, après vérification des ports disponibles chez l'hébergeur retenu.
- Tickets de session courts, liés à un joueur et une partie.
- Identifiants de requête pour les opérations qui pourraient être rejouées.
- Séparation des messages de contrôle et des données fréquentes de simulation.
- Aucun secret Firebase ou Cloudinary dans le client.

### 4.3 Capacité et fréquence

Commencer à 2–8 clients, mesurer CPU, mémoire, bande passante, pertes, fréquence de mise à jour et latence. Augmenter ensuite par paliers de 20, 40 et viser 60 joueurs uniquement si chaque palier passe les tests prolongés.

Une fréquence de 20 à 30 ticks/s peut servir de plage d'expérimentation initiale, mais ce n'est pas une décision finale. Elle dépend des mécaniques, du nombre d'acteurs répliqués, du matériel serveur et de la latence observée.

Les 60 joueurs du GDD sont une cible de conception, pas une capacité déjà démontrée.

### 4.4 Réplication et optimisation

- Envoyer à chaque client uniquement les informations pertinentes.
- Définir la pertinence selon distance, visibilité, équipe et état de partie.
- Prioriser les états qui influencent le combat.
- Réduire les mises à jour des acteurs éloignés ou non pertinents.
- Tester les pires cas avec plusieurs combats et beaucoup d'acteurs actifs.
- Évaluer Replication Graph après profilage si la réplication standard devient insuffisante.
- Ne pas baser la sortie du jeu sur une fonction réseau expérimentale non validée.

### 4.5 Prédiction et correction

Le client peut prédire son mouvement pour réduire la latence ressentie, mais le serveur reste l'autorité et corrige les états impossibles. Les corrections doivent être mesurées pour éviter les téléportations visuellement brutales.

La compensation de latence et la validation des impacts seront conçues par type d'arme. Le serveur ne doit pas accepter sans contrôle une date de tir arbitraire fournie par le client.

### 4.6 Déconnexion

Prévoir une fenêtre de reconnexion configurable. Le serveur conserve temporairement l'état si le mode le permet. Les tickets expirés ou réutilisés sont rejetés. Les résultats et récompenses sont persistés une seule fois. Une déconnexion ne donne pas automatiquement la victoire à une autre équipe sans règle de jeu définie.

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
