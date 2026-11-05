# TSI Field Test Server — Firebase local

Le serveur Colyseus de test authentifie désormais chaque connexion avec un **Firebase ID token**. Le navigateur crée ou reprend une session Firebase anonyme ; le serveur Admin vérifie le jeton et initialise les documents de profil dans l'émulateur Firestore.

> Cette configuration est réservée au développement local. Le serveur refuse le mode production, écoute sur `127.0.0.1` et exige les deux émulateurs Firebase. Ne publie jamais ce serveur ni les jetons de test sur Internet.

## Prérequis

- Node.js 22 ou supérieur
- npm
- Java 21 ou supérieur pour l'émulateur Firestore

## 1. Démarrer les émulateurs Firebase

Depuis la racine du dépôt :

```bash
cd backend/firebase
npm install
npx firebase --config ../../firebase.json emulators:start --project demo-tsi-local --only auth,firestore
```

Les ports utilisés sont Auth `9099` et Firestore `8080`. L'interface Emulator Suite est disponible sur `http://127.0.0.1:4000`.

## 2. Démarrer le serveur Colyseus

Dans un deuxième terminal :

```bash
cd server
npm install
cp .env.example .env
npm run check
npm test
npm run dev
```

Le fichier `.env.example` utilise le même identifiant de projet que la commande Firebase et configure les deux émulateurs. Aucun compte de service ni clé privée n'est requis pour ce mode local.

## 3. Démarrer le client PlayCanvas

Dans un troisième terminal :

```bash
cd game-client
npm install
cp .env.example .env.local
npm run build
npm run dev
```

Ouvre l'adresse Vite affichée. Le client se connecte à l'émulateur Auth, crée une session anonyme si aucune session n'existe, récupère un ID token Firebase puis rejoint la room Colyseus avec ce jeton.

## Documents Firestore créés par le serveur

Au premier accès d'un UID Firebase, le serveur crée avec le SDK Admin :

- `users/{uid}` : nom d'affichage, statut de compte, dates de création et mise à jour ;
- `playerProfiles/{uid}` : nom public et niveau initial ;
- `progression/{uid}` : niveau et expérience initiale.

Les écritures Admin contournent les règles Firestore. Elles restent donc strictement côté serveur. Les clients ne peuvent pas forger leur inventaire, leur progression ni leurs résultats.

## Sécurité et passage en production

- Le client n'obtient que la configuration Web Firebase publique et un ID token de courte durée.
- La clé Admin, le compte de service et les credentials Google ne vont jamais dans `game-client/`.
- Le serveur vérifie la signature, l'expiration et la révocation du token avec `verifyIdToken(token, true)`.
- Le statut de compte `accountStatus` doit être `active`.
- Les émulateurs ne doivent jamais être activés en production.
- Pour un futur serveur hébergé, utiliser Application Default Credentials / une identité de charge de travail, plutôt qu'une clé JSON committée.
- Avant un test distant, remplacer le mode local-only par un environnement de serveur dédié, avec validation de l'origine, politique réseau, tickets courts et observabilité.

L'authentification anonyme est une identité de préproduction. Avant le lancement, il faudra proposer une méthode de connexion durable et permettre de lier la session anonyme au compte permanent du joueur.
