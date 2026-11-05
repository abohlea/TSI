# TSI-CHAR-001 — générateur de proxy détaillé et riggé

## Génération

Depuis la racine du dépôt, avec Blender et l'exporteur glTF actifs :

```bash
blender --background --factory-startup --python tools/art/generate_character_proxy.py -- --output prototype/public/assets/tsi/TSI-CHAR-001-operator-proxy.glb
```

Le générateur construit un proxy tactique d'environ 1,9 m dans la palette graphite/noir, orange sécurité et bleu électrique. La géométrie comprend désormais :
- plastron multicouche, plaques abdominales, rails MOLLE, boucle et modules de ceinture ;
- épaulières, coques d'avant-bras avec inserts, protections de cuisses, genouillères et protège-tibias nervurés ;
- casque, visière, mentonnière, respirateur, protections de joues et modules de communication ;
- gants segmentés avec volumes proxy pour chaque phalange, capuchons d'orteils et semelles renforcées.

Le rig contient les os humanoïdes et les chaînes des doigts (deux segments pour le pouce, trois pour chaque autre doigt). Les vertex groups sont maintenant créés depuis l'ensemble des os de l'armature, doigts compris, afin que les volumes des gants puissent recevoir leurs poids. Les contrôles IK des mains et pôles de coude restent des contrôles de pose Blender.

Sockets exportés :
- `TSI001_weapon_hand_socket`
- `TSI001_back_gear_socket`
- `TSI001_head_camera_socket`

Neuf clips de blocout sont conservés en pistes NLA : Idle, Walk, Run, Sprint, Aim, Fire, Reload, Hit Reaction et Death (préfixe `TSI_Character_`).

## Validation structurelle du GLB

Après génération, exécuter :

```bash
blender --background --python tools/art/validate_character_glb.py -- prototype/public/assets/tsi/TSI-CHAR-001-operator-proxy.glb
```

Le validateur réimporte le GLB et vérifie une armature, les os principaux, les 28 os de phalanges, les trois sockets, des sommets pondérés, les vertex groups de doigts, les neuf clips et au moins trois matériaux. Code de sortie 0 = contrôles structurels passés ; code 1 ou 2 = échec. Ce contrôle ne certifie pas la qualité artistique, les déformations, la pose de prise d'arme ou la compatibilité PlayCanvas.

## Limites et statut

Il s'agit toujours d'un proxy procédural, pas du personnage final. Les plaques restent des volumes segmentés, les gants ne sont pas des mains anatomiques, les poids sont calculés automatiquement par distance aux segments osseux et nécessitent une correction manuelle. Les matériaux sont des couleurs Principled de base, pas un jeu de textures PBR final. Il n'y a pas encore de retopologie, d'UV dédiés, de LOD, de mocap ni de validation Android.

Aucun GLB n'est livré par ces changements : l'export Blender n'a pas été exécuté ici. Ne pas activer le personnage dans le runtime avant génération, validation structurelle, revue visuelle et tests PlayCanvas/Android.

## Suite de production

La prochaine passe devra remplacer les volumes proxy par des meshes retopologisés, créer des mains anatomiques et une topologie faciale détaillée, corriger les poids aux articulations, produire les textures PBR/UV/LOD et remplacer les clips de blocout par des animations retargetées.
