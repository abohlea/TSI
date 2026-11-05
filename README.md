# TSI — Next Generation Shooter

TSI est un projet original de shooter compétitif mobile-first. Le dépôt réunit la conception du jeu et son premier prototype technique.

## État actuel

- [GDD TSI V1](docs/GDD_TSI_V1.md) — vision, modes, univers et règles de conception.
- [TDD TSI V1](docs/TDD_TSI_V1.md) — architecture technique, réseau, données, sécurité et qualité.
- [ADR-001](docs/adr/ADR-001-backend-media-hosting.md) — Firebase, Firestore, Cloudinary et exclusion de Render.
- [ADR-002](docs/adr/ADR-002-playcanvas-colyseus.md) — PlayCanvas pour le prototype et Colyseus comme serveur candidat.
- `prototype/` — premier terrain d'entraînement PlayCanvas, en cours de construction.

**Important :** le prototype initial est local et mono-joueur. Il ne contient pas encore d'authentification Firebase, de persistance Firestore, de téléversement Cloudinary ni de serveur multijoueur. Ces intégrations viendront après validation du cœur de jeu et des règles de sécurité.

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
      player.ts
    ui/
      hud.ts
```

## Règles de sécurité

- Aucun secret Firebase ou Cloudinary dans le client.
- Aucun résultat de partie ou dégât compétitif ne sera décidé par le client.
- Firestore ne sera pas utilisé pour synchroniser les positions à chaque frame.
- Les combats publics nécessiteront un serveur dédié autoritaire.
- Aucun service payant ne doit être activé sans validation du propriétaire du projet.

## Prochaines étapes

1. Vérifier le build TypeScript et la scène sur navigateur.
2. Tester les commandes sur Android et iOS.
3. Ajuster caméra, mouvement et collisions.
4. Créer un serveur de simulation distinct et valider le réseau.
5. Ajouter les services Firebase et Cloudinary uniquement via des couches sécurisées.
6. Réévaluer l'aptitude de PlayCanvas à satisfaire les exigences de rendu et de distribution mobile avant de figer la technologie de production.

Les objectifs graphiques et de capacité du GDD sont des cibles à démontrer, pas des performances déjà acquises.
