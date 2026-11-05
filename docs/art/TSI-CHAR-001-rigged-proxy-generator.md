# TSI-CHAR-001 — générateur de proxy riggé

## Génération

Depuis la racine du dépôt, avec Blender installé et son exporteur glTF actif :

```bash
blender --background --factory-startup --python tools/art/generate_character_proxy.py -- --output prototype/public/assets/tsi/TSI-CHAR-001-operator-proxy.glb
```

Le script crée un opérateur tactique humanoïde d'environ 1,9 m, palette graphite/noir, accents orange et visière bleue. Il construit une armature humanoïde, des pièces d'armure séparées parentées aux os, trois sockets et des clips de prévisualisation conservés en pistes NLA :
- `TSI_Character_Idle_Rifle`
- `TSI_Character_Walk_Forward`
- `TSI_Character_Run_Forward`
- `TSI_Character_Death`

## Limites explicites

C'est un proxy de pipeline, pas l'opérateur final. Les pièces d'armure sont parentées rigidement aux os : il n'y a pas de skinning organique, de doigts articulés, d'IK, de retopologie, d'UV dédiés, de textures PBR finales, de LOD, ni de capture de mouvement. Les animations sont des mouvements de validation très simples et ne doivent pas être utilisées comme animations de combat finales.

Le script source est versionné, mais le GLB n'est pas généré dans le dépôt par ce commit : l'environnement de travail ne dispose pas d'une exécution Blender vérifiée. Après génération, ouvrir le GLB dans Blender ou un viewer glTF, vérifier la présence du rig, des meshes, des trois sockets et des quatre clips, puis effectuer le test d'intégration PlayCanvas avant toute activation runtime.

## Étape suivante

Remplacer progressivement les volumes proxy par des meshes retopologisés, créer le skinning et l'IK des mains, puis produire les clips de locomotion et combat sur le même squelette. Ne pas remplacer le personnage CC0 actuel dans le jeu avant validation visuelle et Android.
