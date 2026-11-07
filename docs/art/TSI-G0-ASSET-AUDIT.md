# G0 — Audit des assets et du runtime graphique TSI

- Date : 5 novembre 2026
- Branche auditée : `feat/tsi-eight-point-vertical-slice`
- Runtime : `prototype/` (PlayCanvas / TypeScript)
- Direction : réalisme militaire, caméras FPS + TPS
- Statut : audit documentaire du contenu suivi dans Git ; les fichiers générés localement au build ne sont pas comptés comme assets source validés.

## 1. Résultat exécutif

Le dépôt contient une base de présentation 3D fonctionnelle pour le prototype, mais pas encore le contenu final correspondant à l'ambition visuelle de TSI. Le personnage visible est chargé depuis un GLB CC0 externe au dépôt via le pipeline, avec un fallback procédural ; l'arme de référence est un assemblage de primitives ; l'arène est principalement construite en primitives PlayCanvas et reçoit des matériaux CC0 lorsque le manifeste existe.

Les références d'assets dans les catalogues VFX/SFX sont des identifiants de contenu, pas des fichiers média. La présence de scripts d'import ne prouve pas qu'un asset est téléchargé, licencié, visuellement validé ou intégré dans un APK donné.

## 2. Inventaire vérifié

| Domaine | État dans le runtime | Décision G0 |
|---|---|---|
| Opérateur local | GLB Gobkit `ArmySniper.glb` chargé depuis `/assets/cc0/`; fallback de personnage procédural dans `player.ts` | Placeholder d'intégration, pas le héros original TSI-001 |
| Joueurs distants | Le même GLB est instancié pour les joueurs distants ; silhouette de secours procédurale | À conserver provisoirement pour tests, puis valider LOD et coût à 8 joueurs |
| Rig / animations | Clips détectés par alias (idle, walk, run, attack, hit, reload, death) ; locomotion et actions pilotées côté client | Couverture et qualité des clips réels à inspecter ; transitions, contacts main/arme et foot sliding non certifiés |
| Arme AR-01 | Modèle blocout en primitives avec flash, recul et mouvement de chargeur procéduraux | Pas une arme finale, pas de mesh/UV/textures/animations authored |
| Autres armes | Catalogue TypeScript de quatre familles et identifiants de présentation | Données provisoires ; pas de modèles ou sons finaux démontrés |
| Arène | Bâtiments, couvertures, balises et débris construits en primitives dans `arena.ts` | Blockout jouable, pas une carte artistique finale |
| Matériaux | Script de téléchargement Gobkit / Poly Haven CC0 ; application de textures diffuse, normale et AO au sol/béton | Manifestes et fichiers doivent être présents dans le build pour être visibles ; contrôle de provenance à automatiser |
| HDRI / éclairage | Deux HDRI peuvent être téléchargés par le pipeline ; la scène active utilise surtout soleil directionnel et fill light | HDRI disponibles mais pas de preuve qu'ils pilotent actuellement l'éclairage de la scène |
| VFX / SFX / voix | `combatPresentation.ts` référence des IDs ; aucun fichier audio/VFX final n'est référencé par ce registre | À produire, licencier et intégrer ; ne pas présenter les IDs comme médias livrés |
| Interface | HUD HTML/CSS de prototype, joystick et boutons tactiles | Fonctionnel de base, pas encore DA finale ni audit accessibilité |
| Caméra | Le code initial ne proposait qu'une caméra TPS orbitale | Le toggle FPS/TPS est ajouté dans ce chantier ; son comportement doit être vérifié dans le navigateur et sur Android |

## 3. Fichiers et points d'entrée concernés

- `prototype/src/main.ts` : initialisation PlayCanvas, éclairage, caméra, chargement du personnage, mise à jour caméra et synchronisation réseau.
- `prototype/src/game/player.ts` : blocout procédural du joueur et de l'AR-01.
- `prototype/src/game/cc0Operator.ts` : chargement GLB, recherche des clips et contrôleur d'actions.
- `prototype/src/game/arena.ts` : arène primitive, couvertures, obstacles et chargement des matériaux/props CC0.
- `prototype/src/game/content/weapons.ts` : données provisoires des armes.
- `prototype/src/game/content/combatPresentation.ts` : IDs de présentation uniquement.
- `prototype/scripts/fetch-cc0-assets.mjs` et `prototype/ASSET_PIPELINE.md` : récupération et crédit des assets CC0.
- `docs/art/TSI-CHAR-001-operator-alpha.md` : spécification de l'opérateur original, à valider avant modélisation.

## 4. Risques prioritaires

1. **Dépendance au téléchargement d'assets** : un build sans manifeste ou avec une source indisponible retombe sur le blockout. Il faut archiver le manifeste et la provenance exacts de chaque build candidat.
2. **Personnage CC0 générique** : le rig et les clips ne sont pas conçus spécifiquement pour le héros TSI ni pour la prise en main de l'AR-01.
3. **Caméra FPS/TPS** : la vue FPS doit masquer le corps local sans masquer l'arme, tandis que les autres joueurs doivent continuer à voir le modèle complet. Les collisions de caméra et le clipping restent à tester.
4. **Animations** : les durées d'actions sont des temporisations provisoires et ne sont pas synchronisées à la durée réelle de chaque clip.
5. **Arme blocout** : le chargeur et le recul sont animés de manière simplifiée ; les mains ne sont pas riggées sur l'arme.
6. **Performance** : aucune mesure CPU/GPU, mémoire, température ou stabilité sur appareil Android réel n'est jointe à cet audit.
7. **Contenu visuel** : les identifiants VFX/SFX ne remplacent pas les médias réels et leurs licences.

## 5. Plan de sortie G0

- [x] Identifier les chemins de runtime et les principaux fichiers de présentation.
- [x] Séparer les assets réels, placeholders, données de catalogue et scripts de téléchargement.
- [x] Formaliser la direction réaliste FPS/TPS dans `docs/ART_DIRECTION_TSI.md`.
- [x] Ajouter un premier sélecteur de caméra FPS/TPS au prototype (touche V sur desktop, bouton dans le HUD, caméra FPS à hauteur des yeux et masquage du corps local hors arme).
- [ ] Vérifier le build TypeScript/Vite et les workflows Android sur le commit de cette branche.
- [ ] Exécuter une revue visuelle du GLB et de tous ses clips réels dans le moteur.
- [ ] Vérifier FPS/TPS sur navigateur tactile et appareil Android physique.
- [ ] Mesurer la scène de référence sur un appareil bas/moyen de gamme et un appareil plus puissant.

## 6. Première tranche de production recommandée

Ne pas fabriquer une grande carte ni quatre armes simultanément. Produire une tranche de référence complète :

1. Un opérateur TSI-001 original : turnaround validé, source Blender, rig, textures PBR et LOD.
2. Une arme AR-01 originale : modèle, matériaux, sockets, mains/poses, animation tir/rechargement et audio licencié.
3. Une petite zone de combat : matériaux, éclairage, couvertures et collisions alignés.
4. Les vues FPS et TPS utilisant le même état de gameplay, puis validation Android.

## 7. Gate G0

G0 ne sera clos qu'après validation CI du code de caméra, revue réelle des assets générés, test des deux vues sur appareil Android et archivage des mesures. Cet audit ne déclare aucun modèle, animation, effet, son ou APK comme production-ready.
