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

Ne pas utiliser Cloudinary comme base de données, serveur de match ou stockage principal de grandes archives Unreal (niveaux, textures, sons ou paquets de contenu). Les ressources nécessaires au gameplay sont intégrées aux builds ou distribuées par un mécanisme de contenu conçu séparément.

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

L'hébergeur de partie devra prendre en charge un processus Linux persistant, UDP et ports configurables, CPU soutenu, mémoire suffisante, démarrage/arrêt de sessions, logs par instance, supervision, isolation des matchs, protection réseau, régions testables et gestion sécurisée des secrets.

Un hébergement de site web ou HTTP uniquement ne répond pas automatiquement à ces besoins.

**Développement :** serveur Unreal dédié lancé sur la machine du développeur.

**Laboratoire :** machine ou VM de test à durée limitée, uniquement après comparaison de la latence, du CPU, de la mémoire, des ports UDP et du coût réel.

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

**Development :** projet Firebase de développement, émulateurs, données fictives, Cloudinary de test, serveur Unreal local et logs détaillés.

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

Le dépôt suit le code, les documents, les configurations et les scripts. Les gros fichiers binaires Unreal nécessitent une stratégie contrôlée (Git LFS ou stockage adapté après vérification des quotas). Ne pas committer caches, builds générés ou fichiers temporaires.

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

GitHub peut automatiser les contrôles et tests. La compilation Unreal complète peut nécessiter des runners adaptés et beaucoup de stockage ; ne pas supposer qu'un runner gratuit standard suffira.

## 17. Phases techniques

### Phase A — preuve de faisabilité

Projet Unreal minimal, cible serveur, compilation mobile, Firebase Authentication de test, Firestore Emulator, règles de base, premier média Cloudinary et connexion client vers serveur local.

**Acceptation :** un joueur authentifié rejoint le serveur local sans exposer de secret.

### Phase B — prototype de combat réseau

Déplacement, caméra, une arme, intention de tir, validation serveur, dégâts, élimination et mesure mobile.

**Acceptation :** le client ne peut pas imposer un résultat de combat.

### Phase C — persistance

Profils, inventaire cosmétique, progression de test, sauvegarde idempotente, règles Firestore et API de confiance.

**Acceptation :** un client non autorisé ne modifie ni récompense, ni progression, ni résultat.

### Phase D — vertical slice

Scène représentative, un personnage, armes, interface, son, un objectif Réseau de Front et serveur dédié Linux.

**Acceptation :** qualité visuelle, sensation, performances et réseau démontrés.

### Phase E — alpha Battle Royale

Carte, équipes, matchmaking, butin, zone, sauvegarde et supervision.

**Acceptation :** tests de charge réussis par paliers et absence de faille critique connue.

### Phase F — bêta et production

Serveurs financés ou infrastructure opérée, support, modération, procédures d'incident, tests de sécurité et validations des plateformes.

Ne pas lancer publiquement avec des quotas gratuits non maîtrisés ou un hébergement improvisé.

