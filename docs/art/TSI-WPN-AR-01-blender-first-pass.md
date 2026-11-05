# TSI-WPN-AR-01 — première base Blender procédurale

**Statut :** générateur de blockout technique livré dans le dépôt. Ce n'est pas encore le modèle final de production.

## Fichier

- Script : [`tools/art/generate_ar01_blockout.py`](../../tools/art/generate_ar01_blockout.py)
- Sortie locale par défaut : `TSI-WPN-AR-01-blockout.glb` dans le dossier courant de Blender.
- Format : glTF 2.0 binaire, matériaux Principled simples, pièces séparées et sockets nommés.

## Génération

Depuis la racine du dépôt, avec Blender 3.6+ ou 4.x installé :

```bash
blender --background --factory-startup --python tools/art/generate_ar01_blockout.py
```

Pour choisir explicitement le chemin de sortie :

```bash
blender --background --factory-startup --python tools/art/generate_ar01_blockout.py -- --output ./prototype/public/assets/weapons/TSI-WPN-AR-01-blockout.glb
```

Le script génère une silhouette fictive avec receiver, panneaux latéraux, fixations, nervures de refroidissement, rail supérieur segmenté, canon, crosse, poignée, chargeur nervuré, optique et accents TSI. Les nœuds visibles utilisent le préfixe `AR01_`. Le root et les points d'attache sont également préfixés. Les objets Empty des sockets sont inclus dans la sélection d'export.

## Convention de scène

- Axe longitudinal : X ; bouche vers +X.
- Largeur : Y.
- Hauteur : Z.
- Unité : mètre.
- Root : `AR01_Root`.
- Sockets : `AR01_MuzzleFlashSocket`, `AR01_LeftHandGrip`, `AR01_RightHandGrip`, `AR01_EjectSocket`, `AR01_MagazineSocket`, `AR01_SightSocket`.

Les coordonnées des sockets sont des valeurs de départ. Elles doivent être ajustées avec le rig réel de l'opérateur et les poses FPS/TPS.

## Ce que cette base apporte

- Une géométrie de blockout paramétrique enrichie de détails hard-surface, modifiable dans Blender.
- Des pièces isolées pour préparer les animations, notamment le chargeur.
- Une palette de matériaux Principled avec paramètres métalliques et rugosité distincts : graphite, polymère, métal sombre, verre teinté et orange de sécurité.
- Les sockets Empty inclus dans la sélection d'export.
- Un export GLB reproductible.

Le blockout runtime PlayCanvas a également reçu des détails visuels correspondants (plaques latérales, évents, crans de rail, nervures du chargeur et commandes). Il reste une géométrie procédurale de secours, pas le GLB final.

## Ce qui reste à faire avant G1

1. Ouvrir le résultat dans Blender et vérifier l'échelle, les normales, les pivots et les hiérarchies.
2. Remplacer les volumes simples par un vrai modèle hard-surface high/medium/low, avec bevels contrôlés et détails non destructifs.
3. Créer des UV propres, des textures PBR optimisées et des micro-détails de surface (roughness/normal) ; les matériaux Principled actuels ne sont pas des textures PBR finales.
4. Aligner les sockets sur les mains, la caméra et les effets du jeu.
5. Construire et exporter les clips `AR01_Idle`, `AR01_Fire`, `AR01_Reload`, `AR01_Equip`, `AR01_Unequip`, `AR01_Aim` et `AR01_Sprint` ; aucun de ces clips n'est encore livré dans le générateur Blender.
6. Importer le GLB dans une scène de test PlayCanvas, vérifier FPS et TPS, puis profiler sur Android réel.
7. Archiver le `.blend`, le GLB final, les captures et le rapport de recette.

**Important :** le dépôt contient le générateur, pas un binaire GLB déjà exporté. Blender n'a pas été exécuté dans cette opération et aucun résultat d'import PlayCanvas ou de test Android de ce nouvel asset n'est revendiqué. Le blocout actuel du runtime ne doit être remplacé qu'après ces validations.


## Intégration runtime FPS/TPS

Le runtime dispose maintenant d'un montage d'arme FPS indépendant, d'un retour explicite au montage TPS et d'une gestuelle procédurale de tir/rechargement. Voir [la fiche d'intégration caméra et animation runtime](./TSI-WPN-AR-01-runtime-animation-and-camera.md) pour le contrat et la recette G1. Ces mouvements ne sont pas des clips Blender exportés : les animations finales listées ci-dessus restent à produire et à valider.
