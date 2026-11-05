# TSI — Next Generation Shooter

TSI est un projet original de shooter compétitif mobile-first. Le dépôt réunit la conception du jeu et son premier prototype technique.

## État actuel

- [GDD TSI V1](docs/GDD_TSI_V1.md) — vision, modes, univers et règles de conception.
- [TDD TSI V1](docs/TDD_TSI_V1.md) — architecture technique, réseau, données, sécurité et qualité.
- [ADR-001](docs/adr/ADR-001-backend-media-hosting.md) — Firebase, Firestore, Cloudinary et exclusion de Render.
- [ADR-002](docs/adr/ADR-002-playcanvas-colyseus.md) — PlayCanvas pour le prototype et Colyseus comme serveur candidat.
- [backend/firebase/README.md](backend/firebase/README.md) — émulateur Firebase et tests des règles Firestore.
- `prototype/` — terrain d'entraînement PlayCanvas et client Colyseus optionnel.
- `server/` — serveur Colyseus local de référence, avec déplacement autoritaire, tirs sur cibles et première preuve PvP documentée.
- `prototype/` — ancien client PlayCanvas relié à l'API de la room historique `backend/realtime/`.
- `game-client/` — shell PlayCanvas visuel hors ligne ; son raccordement au serveur `server/` reste à réaliser.

**Important :** `server/` contient maintenant une preuve PvP côté serveur, mais aucun client jouable n'est encore raccordé à cette room. Le test reste local, limité à huit clients et ne constitue pas un serveur compétitif de production. Firebase Authentication, la persistance Firestore, Cloudinary, le matchmaking, la compensation de latence et l'anti-triche de production restent à intégrer.

## Stack du prototype

- PlayCanvas Engine 2.23.3 (MIT)
- TypeScript 7.0.2
- Vite 8.3.6
- WebGL 2 / WebGPU selon la compatibilité du navigateur

Le code utilise PlayCanvas Engine directement ; l'éditeur visuel PlayCanvas n'est pas requis pour modifier ou compiler ce projet.

## Prérequis

- Node.js 22.12 ou supérieur
- npm 10 ou supérieur
- Un navigateur récent avec WebGL 2

## Lancer le prototype

Depuis le dossier `prototype` :

```bash
npm install
npm run dev
```

Ouvrir l'adresse locale affichée par Vite.

Pour vérifier les types et produire le build :

```bash
npm run typecheck
npm run build
npm run preview
```

## Test local en room (mouvements et cibles validés serveur)

Le serveur Colyseus est volontairement protégé pour le développement local. Il n'utilise pas encore Firebase Authentication.

1. Depuis `server`, installer les dépendances, copier `.env.example` vers `.env`, puis définir un jeton local aléatoire d'au moins 24 caractères.
2. Démarrer le serveur avec `npm run dev`.
3. Depuis `prototype`, copier `.env.example` vers `.env.local` et mettre exactement le même jeton dans `VITE_TSI_LOCAL_DEV_TOKEN`.
4. Démarrer Vite avec `npm run dev`.
5. Ouvrir deux fenêtres du navigateur sur la même machine et cliquer sur **REJOINDRE LE SERVEUR DE TEST**.

Le serveur `server/` contient maintenant un prototype PvP autoritaire, mais le client `game-client/` n'est pas encore connecté à ce protocole. Le prototype réseau historique `prototype/` utilise une autre room et ne doit pas être présenté comme client PvP de `server/`. Ne jamais exposer ce serveur de test sur Internet ni réutiliser le jeton local en production. Le guide se trouve dans [server/README.md](server/README.md).

## Commandes de test

- **W / A / S / D** ou **Z / Q / S / D** : déplacement
- **Souris** : caméra (cliquer sur le terrain pour activer le verrouillage du pointeur)
- **Clic gauche** : tir
- **Maj** ou **Espace** : sprint
- **R** : rechargement
- **Mobile** : joystick, zone de regard, tir, sprint et rechargement tactiles

## Structure

```text
prototype/
  index.html
  package.json
  tsconfig.json
  vite.config.ts
  src/
    main.ts
    style.css
    game/
      arena.ts
      combat.ts
      input.ts
      network.ts
      player.ts
    ui/
      hud.ts
backend/realtime/
  src/
    index.ts
    rooms/FieldTestRoom.ts
    types.ts
```

## Règles de sécurité

- Aucun secret Firebase ou Cloudinary dans le client.
- Aucun résultat de partie ou dégât compétitif ne sera décidé par le client.
- Firestore ne sera pas utilisé pour synchroniser les positions à chaque frame.
- Les combats publics nécessiteront un serveur dédié autoritaire.
- Aucun service payant ne doit être activé sans validation du propriétaire du projet.

## Prochaines étapes

1. Obtenir une installation npm reproductible et valider les builds du client et du serveur.
2. Vérifier la scène et les commandes sur de vrais appareils Android et iOS.
3. Raccorder `game-client/` au protocole de `server/` : snapshots, tirs, santé, éliminations et réapparitions.
4. Intégrer Firebase Authentication et des tickets de session signés.
5. Enregistrer les profils et résultats confirmés dans Firestore, puis intégrer Cloudinary pour les médias.
6. Vérifier les règles Firestore avec l'émulateur avant d'activer les flux de données client.
7. Mesurer les performances réseau et graphiques sur appareils réels avant de figer l'architecture de production.

Les objectifs graphiques et de capacité du GDD sont des cibles à démontrer, pas des performances déjà acquises.
