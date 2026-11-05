# TSI — feuille de route d'exécution AAA

- Date de l'audit : 5 novembre 2026
- Branche auditée : `production/aaa-character-pipeline`
- Dépôt : `abohlea/TSI`
- Statut : plan d'exécution fondé sur les fichiers réellement présents ; aucun jalon de production n'est déclaré terminé sur la seule base de cette feuille de route.

## 1. État vérifié au début de cette feuille de route

### Déjà présent dans le dépôt
- GDD V1 et TDD V1.
- Architecture prototype PlayCanvas/TypeScript et room Colyseus locale.
- Champ d'entraînement construit par primitives PlayCanvas, cibles et résolution de tirs d'entraînement.
- Mouvement local et connexion optionnelle à une room locale ; documentation du serveur indique validation serveur du déplacement et tirs sur cibles.
- Spécification initiale du personnage TSI-001.
- Bible de production AAA couvrant personnages, armes, VFX, audio, environnements, réseau, pipeline et QA.
- Catalogue TypeScript de quatre familles d'armes (données provisoires).
- Registre de références VFX/SFX/voix (identifiants de contenu, pas fichiers audio ou effets produits).

### Non démontré / non terminé
- Modèle 3D final du héros, textures, rig professionnel et animations finales.
- Armes 3D finales, animations dédiées, accessoires et fichiers audio réels.
- Fichiers VFX finaux pour tirs, impacts, explosions, fumée et débris.
- Enregistrements de voix, cris, répliques radio, ambiances et musique sous licences validées.
- Carte artistique complète et pipeline de contenu.
- Combat joueur contre joueur complet et vérifié côté serveur.
- Firebase Authentication, tickets de session signés, persistance sécurisée des résultats.
- Matchmaking de production, anti-triche opérationnelle, modération et outils d'exploitation.
- Battle Royale, 5v5 et Extraction livrés comme modes de jeu complets.
- Builds Android/iOS testés sur appareils réels, profilage et certification.
- CI verte et tests reproductibles pour la branche de production.

Les références de contenu dans le code sont des identifiants d'assets attendus. Elles ne chargent pas de sons ou de modèles qui n'existent pas encore.

## Journal d'exécution — 5 novembre 2026

### P0 — CI de validation (en cours)
- Le workflow `.github/workflows/validate.yml` déclenche maintenant les validations sur toutes les branches, toutes les PR et manuellement ; les mises à jour de cette branche sont donc couvertes par push CI.
- Trois jobs sont définis : prototype PlayCanvas (typecheck/build), serveur Colyseus (typecheck/tests/build) et règles Firestore (typecheck/tests avec émulateur).
- Le cache npm invalide basé sur des chemins `package.json` a été retiré.
- Exécution GitHub Actions complète sur le HEAD de la branche : [run 42111350092](https://github.com/abohlea/TSI/actions/runs/42111350092) — succès pour typecheck/build PlayCanvas, typecheck/tests/build Colyseus et typecheck/tests Firestore. Cela valide ces commandes sur ce commit, mais ne clôt pas P0 tant que les lockfiles et l'installation reproductible `npm ci` ne sont pas en place.
- Les lockfiles npm ne sont toujours pas présents ; l'installation utilise donc `npm install` et n'est pas encore totalement reproductible. Leur génération et leur commit restent requis.

### P1 — première boucle PvP locale (en cours)
- Le serveur Colyseus applique les dégâts joueur contre joueur à partir d'un raycast serveur et de hitboxes sphériques provisoires.
- Les obstacles du terrain bloquent les tirs ; la cible joueur la plus proche est touchée ; le serveur gère l'élimination et une réapparition après quatre secondes.
- Les joueurs éliminés ne peuvent plus tirer, recharger ou se déplacer côté serveur.
- Tests unitaires ajoutés pour le hit PvP, la sélection de cible, l'occlusion par obstacle et l'élimination.
- Le client affiche les opérateurs éliminés/réapparus à partir de leur santé serveur.
- Correction complémentaire : allocation des points de spawn libres sur connexion et réapparition, avec refus d'une neuvième entrée si aucun spawn n'est disponible ; les tests couvrent la reconnexion après départ et les huit places distinctes.
- La limite de demandes de tickets est maintenant bornée en mémoire à 20 000 adresses IP et purge les entrées expirées avant de refuser une nouvelle adresse.
- Limites restantes : équipes, manches, score de manche, hitboxes articulées, compensation de latence, tests multi-clients automatisés et anti-triche avancée.

### Complément P1 — durcissement des tests serveur (5 novembre 2026)
- Commit `15d333b066835840b1adb83088a570c2d0bfaeac` : tests de validation des séquences non sûres, valeurs non finies, bornes de pitch et séquences régressives.
- Commit `34b8fd8287fdfc8a25b892ae609218e6fe530984` : tests de portée maximale, cibles inactives et exclusion des joueurs déjà éliminés.
- Les tests de validation serveur et de monde ont été exécutés avec succès par les runs GitHub Actions 42114340310 et 42113677643 sur leurs révisions respectives ; les modifications spawn/rate-limit plus récentes doivent encore obtenir leur propre run CI.

### Complément P5 — authentification Firebase et tickets de session (5 novembre 2026)
- Le serveur utilise `firebase-admin@14.5.0`, vérifie les ID tokens Firebase avec contrôle de révocation et exige `FIREBASE_PROJECT_ID` ainsi que des credentials ADC/workload identity côté runtime.
- Le prototype web intègre le SDK Firebase `13.2.0` et une connexion Google via Firebase Authentication ; les paramètres publics de l'application Web sont fournis par `VITE_FIREBASE_*`.
- Le client échange l'ID token dans `POST /auth/session-ticket`. Le serveur renvoie un ticket HMAC-SHA256 valable 45 secondes ; le hook `onAuth` Colyseus consomme ce ticket une seule fois.
- Le serveur refuse le démarrage en production si `TSI_SESSION_TICKET_SECRET` ne contient pas au moins 32 caractères. L'endpoint autorise les requêtes navigateur par CORS avec bearer token ; les secrets Admin ne sont jamais exposés au client.
- Tests unitaires ajoutés pour validité, expiration, réutilisation et altération du ticket.
- Limites : le registre des nonces et la limite de débit sont en mémoire (instance unique seulement) ; la connexion Google exige la configuration du projet Firebase et l'activation du fournisseur dans la console ; aucun déploiement ni test avec un vrai projet Firebase ; aucune écriture de résultat Firestore. Cette intégration n'est pas encore validée en exécution ni prête à l'exploitation multi-instance.
- Commits clés : `12d8a18` (tickets), `501e3fb` (tests), `927e3e0` (endpoint), `64048bc` (consommation room), `34ae89f` (tests renforcés), `4d9c684` (SDK web), `c1332bb` (Firebase client), `0b2e0ba` (client ticket), `ba98a9e` (connexion UI), `92b2dbc` (CORS), `8621271` (documentation).

## 2. Périmètre prioritaire : vertical slice

Ne pas produire simultanément tous les modes. Le premier objectif de production est une tranche jouable complète qui prouve la qualité de bout en bout :

- une carte compacte originale ;
- un opérateur jouable complet ;
- deux armes finalisées (une polyvalente et une secondaire) ;
- un serveur autoritaire avec combat joueur contre joueur ;
- une boucle de partie courte et reproductible ;
- animations, audio, VFX, HUD et feedback d'élimination ;
- reconnexion, résultats persistants et sécurité minimale ;
- profils graphiques et tests sur appareils de référence.

Le Battle Royale 60 joueurs reste hors engagement jusqu'à ce que les tests de charge le justifient.

## 3. Backlog priorisé et critères d'acceptation

### P0 — rendre la base reproductible
- [ ] Installer et verrouiller les dépendances avec lockfiles vérifiés.
- [ ] Exécuter typecheck, tests unitaires et builds client/serveur.
- [ ] Ajouter CI GitHub Actions : install reproductible, lint si configuré, typecheck, tests, build.
- [ ] Corriger toutes les erreurs et avertissements bloquants.
- [ ] Définir une convention de logs et de configuration sans secrets.
- **Acceptation :** CI verte sur PR, instructions de démarrage testées depuis un clone propre.

### P1 — vertical slice de combat
- [ ] Définir le modèle d'état joueur : santé, équipe, équipement, état de vie.
- [ ] Implémenter tirs joueur contre joueur côté serveur, cadence, munitions, rechargement, validation de ligne de vue et dégâts.
- [ ] Ajouter règles de mort, spectateur/réapparition et fin de manche.
- [ ] Ajouter tests serveur de triche triviale : cadence impossible, valeurs non finies, séquence invalide, portée et tirs à travers obstacles.
- [ ] Construire une petite carte avec collisions et points de spawn validés.
- **Acceptation :** deux à huit clients peuvent terminer plusieurs manches ; le serveur est la source de vérité ; les résultats sont identiques pour tous.

### P2 — premier opérateur et arsenal
- [ ] Approuver turnaround, échelle, proportions, visage et matériaux TSI-001.
- [ ] Produire le fichier source 3D, UV, textures PBR, rig, LOD et GLB.
- [ ] Produire locomotion, sprint, visée, tir, rechargement, impacts, élimination et transitions.
- [ ] Produire deux armes originales avec sockets, animations, données, LOD et matériaux.
- [ ] Vérifier clipping, pose des mains, silhouette et lisibilité à distance.
- **Acceptation :** assets source archivés, exports validés dans PlayCanvas, aucune animation bloquante et budgets mesurés.

### P3 — effets et audio de combat
- [ ] Créer VFX tir, impact béton/métal/terre, petite explosion et grande explosion.
- [ ] Créer poussière, fumée, étincelles et fragments décoratifs avec pooling et limites.
- [ ] Enregistrer/produire tirs proche/lointain, rechargements, impacts, explosions, pas et radio.
- [ ] Enregistrer les voix et cris de combat avec contrats/licences, variantes et sous-titres.
- [ ] Implémenter mixage spatial, occlusion, réverbération, priorités et réglages de volume.
- [ ] Ajouter réduction des flashes et secousses de caméra.
- **Acceptation :** aucun identifiant audio/VFX manquant dans la scène du vertical slice ; mix clair en combat ; performances respectées.

### P4 — carte et présentation
- [ ] Finaliser blockout, métriques de déplacement, rotations, couvertures et lignes de vue.
- [ ] Produire kit modulaire, matériaux, éclairage, décors, météo et ambiances.
- [ ] Ajouter optimisation LOD, occlusion/culling et budgets de transparence.
- [ ] Effectuer playtests et corriger les points d'apparition, angles dominants et zones exploitables.
- **Acceptation :** carte complète, lisible et équilibrée ; aucun bug de collision/spawn bloquant.

### P5 — identité, comptes et persistance
- [x] Intégration de code Firebase Authentication (Google côté client, vérification ID token côté serveur).
- [x] Tickets de session signés, courts, à usage unique (45 secondes, single-process).
- [ ] API de confiance pour profil et progression.
- [ ] Règles Firestore et tests émulateur.
- [ ] Écriture des résultats uniquement après validation serveur, avec idempotence.
- [ ] Cloudinary réservé aux médias et uploads autorisés.
- **Acceptation :** tests d'accès refusé, jetons expirés/réutilisés et résultats falsifiés rejetés.

### P6 — production et exploitation
- [ ] Choisir et chiffrer l'hébergement du serveur de jeu ; aucun service payant sans accord.
- [ ] Matchmaking, allocation, limites de régions et capacité.
- [ ] Anti-triche serveur, détection comportementale, journaux et outils d'administration.
- [ ] Signalement, sanctions, confidentialité, sauvegardes et réponse aux incidents.
- [ ] Tests de charge progressifs 2/8/20/40 joueurs ; 60 uniquement si les seuils passent.
- **Acceptation :** procédures d'exploitation et de reprise testées, métriques et alertes opérationnelles.

### P7 — plateformes et release
- [ ] Builds Android et iOS reproductibles.
- [ ] Test appareils bas/milieu/haut de gamme et thermique.
- [ ] Profils graphiques, taille téléchargement, mémoire, crashs et stabilité réseau.
- [ ] Accessibilité, localisation, conformité des stores, politique de confidentialité et support.
- [ ] Bêta fermée, collecte de retours et plan de correction.
- **Acceptation :** release candidate signée, aucune anomalie bloquante, seuils qualité atteints et validation plateforme.

## 4. Contrats de qualité transversaux

Chaque tâche doit fournir :
- un identifiant de ticket ou d'asset ;
- une définition de fini vérifiable ;
- le code ou fichier source modifié ;
- des tests ou captures de preuve ;
- une vérification de licence/provenance pour tout média ;
- une mesure de performance lorsque pertinente ;
- un statut : non commencé, en cours, bloqué, prêt QA, validé.

Les budgets graphiques, réseau et de capacité restent provisoires jusqu'aux mesures sur appareils et serveurs réels.

## 5. Règle de communication

Les rapports doivent séparer explicitement :
- **fait dans GitHub** : fichier/commit vérifié ;
- **testé** : commande ou workflow exécuté et résultat observé ;
- **asset produit** : source et export présents ;
- **à faire** : toute dépendance manquante.

Ne jamais appeler « AAA terminé » un ensemble de spécifications, un prototype local ou des identifiants d'assets sans contenu. Le niveau AAA est un résultat global de production, de finition, de stabilité, de contenu et de QA — pas un label qu'un document peut attribuer.

## 6. Prochaine exécution

La prochaine livraison doit obtenir un run CI vert sur le HEAD après les corrections spawn/rate-limit, puis terminer l'écriture idempotente des résultats Firestore et brancher le flux Cloudinary à cette architecture PlayCanvas/Colyseus. Le stockage partagé des tickets sera requis avant toute montée en plusieurs instances. Les lockfiles npm restent bloquants pour une installation réellement reproductible.
