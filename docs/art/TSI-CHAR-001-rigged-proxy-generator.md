# TSI-CHAR-001 — générateur de proxy détaillé et riggé

## Génération

Depuis la racine du dépôt, avec Blender et l'exporteur glTF actifs :

```bash
blender --background --factory-startup --python tools/art/generate_character_proxy.py -- --output prototype/public/assets/tsi/TSI-CHAR-001-operator-proxy.glb --lod-output prototype/public/assets/tsi/TSI-CHAR-001-operator-lod-mobile.glb --lod-target-triangles 35000
```

Le générateur construit un proxy tactique d'environ 1,9 m dans la palette graphite/noir, orange sécurité et bleu électrique. La géométrie comprend désormais :
- plastron multicouche, plaques abdominales, rails MOLLE, boucle et modules de ceinture ;
- épaulières, coques d'avant-bras avec inserts, protections de cuisses, genouillères et protège-tibias nervurés ;
- casque avec ligne de sourcil et rail arrière, visière, mentonnière, joint de cou, filtres respiratoires bilatéraux, évents de joues et modules de communication ;
- gants segmentés avec volumes proxy pour chaque phalange, capuchons d'orteils et semelles renforcées.

Le mesh fusionné reçoit un premier dépliage UV automatique par Smart UV Project et conserve un manifeste interne des pièces de détail pour le contrôle après export. Ce dépliage est une base de travail, pas des îlots UV optimisés pour une production texture.

Les matériaux portent des rôles PBR explicites (armure, textile, alliage, marquage, visière et proxy peau) avec valeurs Metallic/Roughness distinctes et réglages de couche spéculaire compatibles Principled/glTF. Ce sont des matériaux de base colorés : aucune map Base Color, Normal, ORM ou AO peinte n'est générée à ce stade.

Avec les options --lod-output et --lod-ratio, le script produit un second GLB autonome destiné au profil mobile. Le mesh est dupliqué, décimé en mode Collapse, puis exporté seul avec le rig, les sockets et les clips. Par défaut, le générateur calcule le ratio de décimation à partir du nombre de triangles source pour viser 35 000 triangles. `--lod-ratio` permet de forcer un ratio (0.1 à 0.99) si une revue artistique le demande. Le nombre réel après décimation est imprimé dans la console ; la cible n'est pas garantie au triangle près. Le LOD n'est volontairement pas empilé dans le GLB principal afin d'éviter le rendu simultané des deux versions.

Le rig contient les os humanoïdes et les chaînes des doigts (deux segments pour le pouce, trois pour chaque autre doigt). Les vertex groups sont maintenant créés depuis l'ensemble des os de l'armature, doigts compris, afin que les volumes des gants puissent recevoir leurs poids. Les contrôles IK des mains et pôles de coude restent des contrôles de pose Blender.

Sockets exportés :
- `TSI001_weapon_hand_socket`
- `TSI001_back_gear_socket`
- `TSI001_head_camera_socket`

Neuf clips de blocout sont conservés en pistes NLA : Idle, Walk, Run, Sprint, Aim, Fire, Reload, Hit Reaction et Death (préfixe `TSI_Character_`).

## Validation structurelle du GLB

Après génération, exécuter :

```bash
blender --background --python tools/art/validate_character_glb.py -- prototype/public/assets/tsi/TSI-CHAR-001-operator-proxy.glb --max-triangles 65000
blender --background --python tools/art/validate_character_glb.py -- prototype/public/assets/tsi/TSI-CHAR-001-operator-lod-mobile.glb --max-triangles 35000
```

Le validateur réimporte le GLB et vérifie une armature, les os principaux, les 28 os de phalanges, les trois sockets, le manifeste de détails de tête conservé dans le mesh fusionné, une couche UV, des sommets pondérés, les groupes de doigts, la normalisation des poids, un modificateur d'armature, les neuf clips et au moins trois matériaux et, si `--max-triangles` est fourni, le budget polygonal. Les seuils de départ sont 65 000 triangles pour le modèle principal et 35 000 pour le profil mobile ; ils devront être confirmés par mesure et tests de performance. Code de sortie 0 = contrôles structurels passés ; code 1 ou 2 = échec. Ce contrôle ne certifie pas la qualité artistique, les déformations, la pose de prise d'arme ou la compatibilité PlayCanvas.

## Limites et statut

Il s'agit toujours d'un proxy procédural, pas du personnage final. Les plaques restent des volumes segmentés, les gants ne sont pas des mains anatomiques, les poids sont calculés automatiquement par distance aux segments osseux et nécessitent une correction manuelle. Les matériaux sont des Principled paramétrés, pas un jeu de textures PBR final. Le script sait exporter un LOD mobile séparé par décimation pilotée par une cible de triangles, et le validateur peut bloquer un GLB dépassant son budget ; aucun LOD n'a encore été généré ni approuvé visuellement. Il n'y a pas encore de retopologie, d'UV artistiquement optimisés, de textures PBR peintes, de mocap ni de validation Android.

Aucun GLB n'est livré par ces changements : l'export Blender n'a pas été exécuté ici. Ne pas activer le personnage dans le runtime avant génération, validation structurelle, revue visuelle et tests PlayCanvas/Android.

## Suite de production

La géométrie de tête reçoit maintenant des marqueurs de forme supplémentaires, mais reste constituée de primitives. Le générateur crée un UV de première passe et le validateur vérifie sa présence ainsi que le manifeste de détails après fusion des primitives. La validation des poids détecte les sommets dont la somme dépasse la tolérance et les meshes sans modificateur d'armature. La retopologie faciale et anatomique reste une opération de modélisation manuelle dans Blender : une décimation automatique ne constitue pas une topologie de production. Le prochain gate est de générer les deux GLB, vérifier les budgets 65k/35k, inspecter les déformations et silhouette, puis faire la retopologie propre et les textures PBR peintes. Les clips de blocout devront ensuite être remplacés par des animations retargetées.


## Préparation de la retopologie manuelle

Un outil distinct prépare maintenant une surface de référence sans écraser le GLB source :

```bash
blender --background --factory-startup --python tools/art/prepare_character_retopology.py -- prototype/public/assets/tsi/TSI-CHAR-001-operator-proxy.glb --blend-output work/TSI001-retopo.blend --obj-output work/TSI001-retopo-reference.obj --voxel-size 0.008
```

Le fichier Blender conserve le GLB importé dans la collection masquée `SOURCE_LOCKED_DO_NOT_EDIT` et crée `TSI001_RETPOLOGY_REFERENCE` comme copie de travail. Les modificateurs d'armature sont appliqués uniquement à cette copie ; un voxel remesh soude les volumes qui se croisent et un léger lissage prépare la sculpture et le tracé de la nouvelle topologie. Un OBJ de référence est également exporté.

**Limite importante :** le voxel remesh produit une surface de référence triangulée, pas une retopologie quad de production. Il peut arrondir ou effacer des petits détails. Il ne remplace ni le retopo manuel (boucles autour des épaules, coudes, poignets, bassin, genoux, visage et doigts), ni la reconstruction des UV, des poids et des clips. Le GLB source reste préservé dans le fichier de travail pour comparaison. Aucun artefact n'est annoncé comme généré tant que Blender n'a pas exécuté ce script.
