# TSI — Next Generation Shooter

TSI est un projet original de shooter compétitif mobile-first. Le dépôt réunit la conception du jeu et son premier prototype technique.

## État actuel

- [GDD TSI V1](docs/GDD_TSI_V1.md) — vision, modes, univers et règles de conception.
- [TDD TSI V1](docs/TDD_TSI_V1.md) — architecture technique, réseau, données, sécurité et qualité.
- [ADR-001](docs/adr/ADR-001-backend-media-hosting.md) — Firebase, Firestore, Cloudinary et exclusion de Render.
- [ADR-002](docs/adr/ADR-002-playcanvas-colyseus.md) — PlayCanvas pour le prototype et Colyseus comme serveur candidat.
- [ADR-003](docs/adr/ADR-003-single-active-runtime.md) — désignation du runtime unique et gel des anciens dossiers.
- [Direction artistique officielle](docs/ART_DIRECTION_TSI.md) — réalisme militaire, caméras FPS/TPS, pipeline d'assets et critères graphiques Android.
- [backend/firebase/README.md](backend/firebase/README.md) — émulateur Firebase et tests des règles Firestore.
- `prototype/` — terrain d'entraînement PlayCanvas et client Colyseus optionnel.
- `backend/realtime/` — room Colyseus locale avec déplacement, tirs sur cibles et première boucle PvP FFA (dégâts, élimination et réapparition) validés côté serveur.

**Important :** le tir hors ligne reste local au navigateur. Dans la room locale, le serveur valide les tirs sur les six cibles et les autres joueurs, la cadence, les munitions, le rechargement, les collisions du terrain, les dégâts, les éliminations et la réapparition après quatre secondes. Le PvP reste un prototype FFA : hitboxes simplifiées, pas de manches/équipes ni de compensation de latence. Le code de connexion Firebase et les tickets serveur sont présents sur cette branche, mais nécessitent encore la configuration d'un vrai projet. Les profils/résultats Firestore, le flux Cloudinary et le matchmaking public ne sont pas encore livrés dans cette architecture.

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

Le serveur Colyseus garde un mode local par jeton pour les tests. Un flux distinct Firebase Authentication + ticket signé est préparé pour les environnements configurés ; il n'est pas nécessaire pour lancer l'entraînement local.

1. Depuis `backend/realtime`, installer les dépendances, copier `.env.example` vers `.env`, puis définir un jeton local aléatoire d'au moins 24 caractères.
2. Démarrer le serveur avec `npm run dev`.
3. Depuis `prototype`, copier `.env.example` vers `.env.local` et mettre exactement le même jeton dans `VITE_TSI_LOCAL_DEV_TOKEN`.
4. Démarrer Vite avec `npm run dev`.
5. Ouvrir deux fenêtres du navigateur sur la même machine et cliquer sur **REJOINDRE LE SERVEUR DE TEST**.

Les deux clients doivent utiliser le même serveur local. Les déplacements et tirs sur les cibles de pratique sont validés par la room ; le score et les munitions proviennent du serveur. Le combat joueur contre joueur est maintenant disponible en version expérimentale locale (FFA, hitbox sphérique simplifiée et réapparition temporisée avec points de spawn libres). Ne jamais exposer ce serveur de test sur Internet ou réutiliser le jeton en production. Le guide complet se trouve dans [backend/realtime/README.md](backend/realtime/README.md).

## Commandes de test

- **W / A / S / D** ou **Z / Q / S / D** : déplacement
- **Souris** : caméra (cliquer sur le terrain pour activer le verrouillage du pointeur)
- **V** : basculer entre les caméras FPS et TPS
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

## Code de contenu — arsenal et présentation de combat

- `prototype/src/game/content/weapons.ts` — catalogue TypeScript provisoire des quatre premières familles d'armes et de leurs références de présentation.
- `prototype/src/game/content/combatPresentation.ts` — registre des événements VFX/audio (tirs, impacts, explosions, pas, voix et élimination), avec options de réduction des flashes et secousses.

Ces fichiers structurent les références de contenu ; les sons, modèles et effets référencés restent à créer/intégrer. Les valeurs d'armes sont des paramètres de prototype, pas la vérité compétitive serveur.

## Production AAA — exécution et état réel

- [Feuille de route d'exécution AAA](docs/production/TSI-AAA-EXECUTION-ROADMAP.md) — audit des éléments présents/manquants, backlog P0 à P7 et critères de sortie du vertical slice jusqu'à la release.

## Production AAA — bible complète

- [TSI AAA Production Bible](docs/production/TSI-AAA-PRODUCTION-BIBLE.md) — cadre de production pour personnages, armes, animations, VFX/explosions, audio/voix, environnements, réseau, pipeline d'assets, performances et gates de validation.

## Production AAA — premier asset personnage

- [TSI-CHAR-001 — Character de référence : opérateur principal](docs/art/TSI-CHAR-001-operator-alpha.md) — spécification du modèle, PBR, rig, animations, intégration GLB/PlayCanvas et critères de validation. Le modèle 3D final n'est pas encore produit.

## Architecture retenue

Le chemin officiel et unique est `prototype/` + `backend/realtime/`, avec `backend/firebase/` pour l'authentification et les règles de données. Les anciens dossiers `game-client/` et `server/` sont archivés en lecture seule ; ils ne doivent plus recevoir de nouvelles fonctionnalités. Voir [ADR-003](docs/adr/ADR-003-single-active-runtime.md).

Après avoir installé les dépendances dans les trois paquets actifs (`prototype`, `backend/realtime` et `backend/firebase`), exécuter `npm run validate:active` à la racine pour lancer le typecheck/build du client, les tests et le build du serveur, puis les tests Firestore.

## Prochaines étapes

1. Ajouter et vérifier les lockfiles npm des trois paquets actifs, puis passer la CI à `npm ci`.
2. Vérifier la scène et les commandes sur de vrais appareils Android et iOS.
3. Ajouter équipes, manches, résultats persistants et tests multi-clients au combat autoritaire.
4. Finaliser l'initialisation des profils et l'écriture idempotente des résultats dans Firestore.
5. Brancher le flux d'avatar Cloudinary après validation du compte et des limites d'upload.
6. Vérifier les règles Firestore avec l'émulateur avant d'activer les flux de données client.
7. Mesurer les performances réseau et graphiques sur appareils réels avant de figer l'architecture de production.

Les objectifs graphiques et de capacité du GDD sont des cibles à démontrer, pas des performances déjà acquises.
