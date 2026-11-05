# TSI — Next Generation Shooter

TSI est un projet de shooter compétitif mobile-first. Ce dépôt regroupe le prototype PlayCanvas, le serveur Colyseus local, les documents de conception et les tests de sécurité Firebase.

## État technique

- [GDD TSI V1](docs/GDD_TSI_V1.md) — vision, modes, univers et conception.
- [TDD TSI V1](docs/TDD_TSI_V1.md) — architecture, réseau, données, sécurité et qualité.
- [ADR-001](docs/adr/ADR-001-backend-media-hosting.md) — Firebase, Firestore, Cloudinary et exclusion de Render.
- [ADR-002](docs/adr/ADR-002-playcanvas-colyseus.md) — PlayCanvas et Colyseus pour le prototype.
- [ADR-004](docs/adr/ADR-004-firebase-auth-firestore.md) — Firebase Authentication et création initiale des documents Firestore.
- [ADR-005](docs/adr/ADR-005-cloudinary-signed-player-uploads.md) — signatures Cloudinary côté serveur et validation des avatars.
- `game-client/` — client PlayCanvas, Firebase Authentication et helper d'upload Cloudinary.
- `server/` — room Colyseus de test, vérification Firebase Admin, provisionnement Firestore et Media API Cloudinary.
- `backend/firebase/` et `firestore.rules` — règles Firestore et tests de l'émulateur.
- `prototype/` et `backend/realtime/` — ancien prototype réseau conservé comme référence.

## Démarrage local

1. Terminal 1 — démarrer les émulateurs Firebase :

```bash
cd backend/firebase
npm install
npx firebase --config ../../firebase.json emulators:start --project demo-tsi-local --only auth,firestore
```

2. Terminal 2 — démarrer le serveur et le Media API :

```bash
cd server
npm install
cp .env.example .env
# Cloudinary est facultatif pour les tests ; renseigne ses 4 variables pour activer les uploads.
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

Le guide complet, notamment la création d'un preset Cloudinary signé, est dans [server/README.md](server/README.md).

## Limites et sécurité

- Le serveur Field Test et le Media API écoutent uniquement sur `127.0.0.1` et refusent le mode production.
- La connexion Firebase anonyme est une solution de préproduction ; une connexion permanente et la liaison de compte restent à construire.
- Les secrets Firebase Admin et Cloudinary ne doivent jamais apparaître dans le client ou dans Git.
- Cloudinary couvre actuellement l'upload signé d'avatars uniquement ; pas encore de bannières, vidéo, bibliothèque d'assets, modération, ni nettoyage automatique.
- Les règles Firestore empêchent les clients de modifier progression, inventaire, comptes et résultats protégés.
- Les tirs, dégâts et résultats de match ne doivent pas être décidés par le client ni synchronisés frame par frame dans Firestore.
- Aucun hébergement payant ni service externe ne sera activé sans validation.

## Prochains jalons

1. Finaliser la liaison de comptes Firebase permanents.
2. Ajouter la persistance serveur des résultats de match et de la progression.
3. Intégrer l'interface d'édition du profil pour choisir l'avatar et prévisualiser les médias.
4. Ajouter une politique Cloudinary séparée pour bannières et médias officiels, ainsi que la modération et le nettoyage.
5. Réaliser des tests Android/iOS et des tests réseau avant toute bêta.
