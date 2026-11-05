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
