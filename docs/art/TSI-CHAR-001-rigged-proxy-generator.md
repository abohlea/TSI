# TSI-CHAR-001 — générateur de proxy détaillé et riggé

## Génération

Depuis la racine du dépôt, avec Blender et l'exporteur glTF actifs :

```bash
blender --background --factory-startup --python tools/art/generate_character_proxy.py -- --output prototype/public/assets/tsi/TSI-CHAR-001-operator-proxy.glb
```

Le générateur construit un proxy tactique d'environ 1,9 m dans la palette graphite/noir, orange sécurité et bleu électrique. La géométrie comprend désormais :
- plastron multicouche, plaques abdominales, rails MOLLE, boucle et modules de ceinture ;
- épaulières, coques d'avant-bras avec inserts, protections de cuisses, genouillères et protège-tibias nervurés ;
- casque avec ligne de sourcil et rail arrière, visière, mentonnière, joint de cou, filtres respiratoires bilatéraux, évents de joues et modules de communication ;
- gants segmentés avec volumes proxy pour chaque phalange, capuchons d'orteils et semelles renforcées.

Le mesh fusionné reçoit un premier dépliage UV automatique par Smart UV Project et conserve un manifeste interne des pièces de détail pour le contrôle après export. Ce dépliage est une base de travail, pas des îlots UV optimisés pour une production texture.

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

Le validateur réimporte le GLB et vérifie une armature, les os principaux, les 28 os de phalanges, les trois sockets, le manifeste de détails de tête conservé dans le mesh fusionné, une couche UV, des sommets pondérés, les groupes de doigts, la normalisation des poids, un modificateur d'armature, les neuf clips et au moins trois matériaux. Code de sortie 0 = contrôles structurels passés ; code 1 ou 2 = échec. Ce contrôle ne certifie pas la qualité artistique, les déformations, la pose de prise d'arme ou la compatibilité PlayCanvas.

## Limites et statut

Il s'agit toujours d'un proxy procédural, pas du personnage final. Les plaques restent des volumes segmentés, les gants ne sont pas des mains anatomiques, les poids sont calculés automatiquement par distance aux segments osseux et nécessitent une correction manuelle. Les matériaux sont des couleurs Principled de base, pas un jeu de textures PBR final. Il n'y a pas encore de retopologie, d'UV artistiquement optimisés, de textures PBR peintes, de LOD, de mocap ni de validation Android.

Aucun GLB n'est livré par ces changements : l'export Blender n'a pas été exécuté ici. Ne pas activer le personnage dans le runtime avant génération, validation structurelle, revue visuelle et tests PlayCanvas/Android.

## Suite de production

La géométrie de tête reçoit maintenant des marqueurs de forme supplémentaires, mais reste constituée de primitives. Le générateur crée un UV de première passe et le validateur vérifie sa présence ainsi que le manifeste de détails après fusion des primitives. La validation des poids détecte les sommets dont la somme dépasse la tolérance et les meshes sans modificateur d'armature. La prochaine étape reste une vraie retopologie faciale et anatomique, une correction visuelle des déformations, des UV et textures PBR, puis une stratégie LOD mesurée sur le budget de triangles cible. Les clips de blocout devront ensuite être remplacés par des animations retargetées.
