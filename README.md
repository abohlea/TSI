# TSI — Next Generation Shooter

TSI est un projet de shooter compétitif mobile-first. Ce dépôt regroupe le prototype PlayCanvas, le serveur Colyseus local, les documents de conception et les tests de sécurité Firebase.

## État technique

- [GDD TSI V1](docs/GDD_TSI_V1.md) — vision, modes, univers et conception.
- [TDD TSI V1](docs/TDD_TSI_V1.md) — architecture, réseau, données, sécurité et qualité.
- [ADR-001](docs/adr/ADR-001-backend-media-hosting.md) — Firebase, Firestore, Cloudinary et exclusion de Render.
- [ADR-002](docs/adr/ADR-002-playcanvas-colyseus.md) — PlayCanvas et Colyseus pour le prototype.
- [ADR-004](docs/adr/ADR-004-firebase-auth-firestore.md) — Firebase Authentication et création initiale des documents Firestore.
- `game-client/` — client PlayCanvas et intégration Firebase Authentication.
- `server/` — room Colyseus de test, vérification Firebase Admin et création initiale des documents joueur.
- `backend/firebase/` et `firestore.rules` — règles Firestore et tests de l'émulateur.
- `prototype/` et `backend/realtime/` — ancien prototype réseau conservé comme référence.

## Firebase local

Le parcours d'authentification utilise Firebase Auth Emulator et Firestore Emulator. Aucun projet Firebase réel ni compte de service n'est nécessaire pour le mode local.

1. Terminal 1 — démarrer les émulateurs :

```bash
cd backend/firebase
npm install
npx firebase --config ../../firebase.json emulators:start --project demo-tsi-local --only auth,firestore
```

2. Terminal 2 — démarrer le serveur :

```bash
cd server
npm install
cp .env.example .env
npm run check
npm test
npm run dev
```

3. Terminal 3 — démarrer le client :

```bash
cd game-client
npm install
cp .env.example .env.local
npm run build
npm run dev
```

Ouvre l'URL indiquée par Vite. Le client obtient une identité anonyme Firebase, récupère un ID token et rejoint la room. Le serveur vérifie ce token puis crée au besoin `users/{uid}`, `playerProfiles/{uid}` et `progression/{uid}` dans l'émulateur Firestore.

Le guide détaillé se trouve dans [server/README.md](server/README.md).

## Limites et sécurité

- Le serveur Field Test écoute uniquement sur `127.0.0.1` et refuse le mode production.
- La connexion anonyme est uniquement une solution de préproduction ; une connexion permanente et la liaison de compte sont à construire.
- Les secrets Firebase Admin et Cloudinary ne doivent jamais apparaître dans le client ou dans Git.
- Les règles Firestore empêchent les clients de modifier progression, inventaire, comptes et résultats protégés.
- Les tirs, dégâts et résultats de match ne doivent pas être décidés par le client ni synchronisés frame par frame dans Firestore.
- Aucun hébergement payant ni service externe ne sera activé sans validation.

## Prochains jalons

1. Valider le flux Auth Emulator → ID token → Colyseus → Firestore Emulator.
2. Ajouter une connexion permanente et la liaison du compte anonyme.
3. Raccorder le client courant au réseau et au combat autoritaire.
4. Persister profils et résultats uniquement après validation serveur.
5. Intégrer Cloudinary avec signatures d'upload créées côté serveur.
6. Réaliser des tests Android/iOS et des tests réseau avant toute bêta.
