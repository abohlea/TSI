# TSI — Next Generation Shooter

TSI est un projet original de shooter compétitif mobile-first. Le dépôt réunit la conception du jeu et son premier prototype technique.

## État actuel

- [GDD TSI V1](docs/GDD_TSI_V1.md) — vision, modes, univers et règles de conception.
- [TDD TSI V1](docs/TDD_TSI_V1.md) — architecture technique, réseau, données, sécurité et qualité.
- [ADR-001](docs/adr/ADR-001-backend-media-hosting.md) — Firebase, Firestore, Cloudinary et exclusion de Render.
- [ADR-002](docs/adr/ADR-002-playcanvas-colyseus.md) — PlayCanvas pour le prototype et Colyseus comme serveur candidat.
- `prototype/` — terrain d'entraînement PlayCanvas et client Colyseus optionnel.
- `backend/realtime/` — room Colyseus locale avec déplacement, collisions, tirs hitscan sur cibles et joueurs, dégâts, score et réapparition validés côté serveur.

**Important :** le tir hors ligne reste local au navigateur. Dans la room locale, le serveur valide les tirs sur les six cibles et les autres joueurs, la cadence, les munitions, le rechargement, les collisions de terrain, les dégâts, les éliminations et la réapparition. Le PvP est une preuve technique locale limitée à huit clients, pas un système compétitif de production. Firebase Authentication, Firestore, Cloudinary et le matchmaking de production ne sont pas encore intégrés.

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

1. Depuis `backend/realtime`, installer les dépendances, copier `.env.example` vers `.env`, puis définir un jeton local aléatoire d'au moins 24 caractères.
2. Démarrer le serveur avec `npm run dev`.
3. Depuis `prototype`, copier `.env.example` vers `.env.local` et mettre exactement le même jeton dans `VITE_TSI_LOCAL_DEV_TOKEN`.
4. Démarrer Vite avec `npm run dev`.
5. Ouvrir deux fenêtres du navigateur sur la même machine et cliquer sur **REJOINDRE LE SERVEUR DE TEST**.

Les clients doivent utiliser le même serveur local. Les déplacements, les tirs sur cibles et les tirs contre joueurs sont validés par la room ; le serveur possède la santé, le score, les munitions et les réapparitions. La room reste une arène de test FFA sans équipes, anti-triche complet, comptes Firebase ni protection de production. Ne jamais l'exposer sur Internet ou réutiliser le jeton en production. Le guide complet se trouve dans [backend/realtime/README.md](backend/realtime/README.md).

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
3. Étendre les tests d'intégration du PvP : latence, cadence réelle, réapparitions concurrentes, collision des joueurs et cohérence du réticule.
4. Intégrer Firebase Authentication et des tickets de session signés.
5. Enregistrer les profils et résultats confirmés dans Firestore, puis intégrer Cloudinary pour les médias.
6. Mesurer les performances réseau et graphiques sur appareils réels avant de figer l'architecture de production.

Les objectifs graphiques et de capacité du GDD sont des cibles à démontrer, pas des performances déjà acquises.
