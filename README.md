# TSI — Next Generation Shooter

TSI est un projet original de shooter compétitif mobile-first. Le dépôt réunit la conception du jeu et son premier prototype technique.

## État actuel

- [GDD TSI V1](docs/GDD_TSI_V1.md) — vision, modes, univers et règles de conception.
- [TDD TSI V1](docs/TDD_TSI_V1.md) — architecture technique, réseau, données, sécurité et qualité.
- [ADR-001](docs/adr/ADR-001-backend-media-hosting.md) — Firebase, Firestore, Cloudinary et exclusion de Render.
- [ADR-002](docs/adr/ADR-002-playcanvas-colyseus.md) — PlayCanvas pour le prototype et Colyseus comme serveur candidat.
- [ADR-003](docs/adr/ADR-003-local-pvp-proof.md) — périmètre et limites de la première preuve PvP autoritaire.
- [backend/firebase/README.md](backend/firebase/README.md) — émulateur Firebase et tests des règles Firestore.
- `server/` — serveur Colyseus local de référence, avec déplacement autoritaire, tirs sur cibles et première preuve PvP documentée.
- `game-client/` — shell PlayCanvas visuel hors ligne ; son raccordement au protocole du serveur `server/` reste à réaliser.
- `prototype/` et `backend/realtime/` — ancien prototype réseau, conservé comme référence et non raccordé au nouveau serveur PvP.

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

## Vérifier le serveur PvP local

Le serveur Colyseus reste volontairement limité au développement local. Le client `game-client/` n'est pas encore raccordé à son protocole PvP : les commandes ci-dessous vérifient le serveur et ses règles, pas une partie visuelle multijoueur complète.

Depuis `server` :

```bash
cp .env.example .env
# Remplacer TSI_LOCAL_DEV_TOKEN par une valeur privée aléatoire d'au moins 24 caractères.
npm install
npm run check
npm test
npm run dev
```

Le serveur écoute uniquement sur `127.0.0.1:2567`, refuse `NODE_ENV=production` et n'accepte que le jeton local. Ne pas l'exposer à Internet, ne pas réutiliser le jeton en production et ne jamais le committer. Le guide complet se trouve dans [server/README.md](server/README.md).

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
server/
  src/
    index.ts
    combat.ts
    gameRules.ts
    rooms/FieldTestRoom.ts
    schema/FieldTestState.ts
  tests/
backend/realtime/  # ancien prototype réseau
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
