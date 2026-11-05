# TSI-CHAR-001 — générateur de proxy riggé

## Génération

Depuis la racine du dépôt, avec Blender installé et l'exporteur glTF actif :

```bash
blender --background --factory-startup --python tools/art/generate_character_proxy.py -- --output prototype/public/assets/tsi/TSI-CHAR-001-operator-proxy.glb
```

Le générateur produit un proxy humanoïde d'environ 1,9 m avec une armature, un mesh skinné, des protections tactiques, un casque, une visière, un respirateur, des protections de joues et des gants. Les mains comprennent une chaîne d'os par phalange (pouce à deux segments, autres doigts à trois segments) et une géométrie de gant segmentée affectée aux os correspondants. Des cibles IK de main et des pôles de coude sont créés pour les deux côtés.

Sockets exportés :
- `TSI001_weapon_hand_socket`
- `TSI001_back_gear_socket`
- `TSI001_head_camera_socket`

Clips de prévisualisation exportés via les pistes NLA :
- `TSI_Character_Idle_Rifle`
- `TSI_Character_Walk_Forward`
- `TSI_Character_Run_Forward`
- `TSI_Character_Sprint_Forward`
- `TSI_Character_Aim_Rifle`
- `TSI_Character_Fire_Rifle`
- `TSI_Character_Reload_Rifle`
- `TSI_Character_Hit_Reaction`
- `TSI_Character_Death`

## Validation structurelle du GLB

Après génération, exécuter :

```bash
blender --background --python tools/art/validate_character_glb.py -- prototype/public/assets/tsi/TSI-CHAR-001-operator-proxy.glb
```

Le validateur réimporte le GLB et vérifie la présence d'une armature, des os principaux, des trois sockets, d'au moins un mesh avec sommets pondérés, des neuf clips et d'au moins trois matériaux. Code de sortie 0 = contrôles structurels passés ; code 1 ou 2 = échec. Ce contrôle ne certifie ni la qualité des déformations, ni la prise d'arme, ni le rendu, ni la compatibilité PlayCanvas.

## Limites explicites

C'est un proxy de pipeline, pas l'opérateur final. Le mesh est fusionné et reçoit des poids automatiques calculés par distance aux segments osseux (deux influences normalisées par sommet). Les volumes restent stylisés et segmentés ; les doigts sont des volumes de gant proxy, pas une main anatomique détaillée. Les cibles IK sont des contrôles de pose Blender et ne constituent pas une prise d'arme validée. Les clips sont des mouvements de blocout, pas des animations de production. Il n'y a pas encore de retopologie, d'UV dédiés, de textures PBR finales, de LOD, de mocap, ni de test visuel sur appareil Android.

Le GLB n'est pas livré par ces changements : aucun export Blender n'a été exécuté ici. Ne pas activer ce proxy dans le runtime avant génération, validation structurelle, revue visuelle et test PlayCanvas/Android.

## Étape suivante

Produire une retopologie propre, une anatomie de main crédible, un skinning corrigé manuellement autour des articulations, les textures PBR et les LOD. Remplacer les clips de blocout par des animations retargetées et valider le personnage en FPS/TPS avant intégration.
