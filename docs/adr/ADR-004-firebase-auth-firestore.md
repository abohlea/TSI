# ADR-004 — Firebase Authentication et provisionnement initial Firestore

- **Statut :** implémenté pour le Field Test local ; validation sur projet Firebase réel à effectuer
- **Date :** 5 novembre 2026
- **Périmètre :** client PlayCanvas, serveur Colyseus local et émulateurs Firebase

## Contexte

Le serveur Field Test utilisait auparavant un jeton de développement partagé entre le navigateur et le serveur. Ce jeton identique pour tous les joueurs ne fournit pas une identité individuelle, ne permet pas de gérer les comptes et ne doit jamais être réutilisé pour des sessions publiques.

TSI a déjà des règles Firestore avec refus par défaut et une configuration Emulator Suite. Nous voulons utiliser cette base plutôt que d'écrire des données de jeu directement depuis le client.

## Décision

1. Le client utilise le SDK Firebase Web et démarre ou reprend une session Authentication anonyme pendant la préproduction.
2. Le client demande un Firebase ID token et l'envoie comme option d'authentification à Colyseus.
3. Le serveur utilise le SDK Firebase Admin et `verifyIdToken(idToken, true)` pour vérifier la signature, l'expiration et la révocation du jeton.
4. Le serveur dérive l'identité de l'UID vérifié, jamais d'un UID transmis par le client.
5. À la première connexion, le serveur crée si nécessaire :
   - `users/{uid}` : nom d'affichage et statut de compte ;
   - `playerProfiles/{uid}` : nom public et niveau initial ;
   - `progression/{uid}` : niveau et expérience.
6. Les documents sont créés par Admin SDK, tandis que les règles Firestore continuent d'interdire aux clients les écritures protégées.
7. Les tests locaux utilisent Firebase Auth Emulator et Firestore Emulator. Le serveur de test refuse le mode production et l'accès aux vrais services est désactivé par défaut dans son fichier d'environnement.

## Gestion des credentials

- La configuration Firebase Web présente dans le client contient uniquement des valeurs publiques du projet.
- Aucun secret Admin, clé privée, compte de service ou credential Google n'est autorisé dans le navigateur ou dans Git.
- En environnement hébergé, le serveur doit utiliser Application Default Credentials / identité de charge de travail.
- Les variables d'émulateur doivent être absentes en production.

## Limites

- La connexion anonyme est une identité de préproduction, pas le modèle final d'identité du joueur.
- Le flux de liaison d'un compte anonyme vers un compte email/Google permanent reste à construire.
- La validation doit être réalisée contre un projet Firebase réel avant toute distribution.
- Les documents de classement, les résultats de match et les achats ne doivent être écrits qu'après validation de la partie par le serveur autoritaire.
- Cloudinary reste indépendant : les uploads doivent utiliser des signatures générées côté serveur, jamais une clé secrète cliente.

## Conséquences

Le serveur peut associer une session Colyseus à un UID Firebase vérifié et initialiser les documents du joueur. Les règles Firestore et la séparation client/serveur existantes sont conservées. Le prochain jalon Firebase est la liaison de compte permanente, puis la persistance serveur des résultats de match et des profils, avec tests d'émulateur.
