# TSI-WPN-AR-01 — contrat d'asset skinné et import runtime

## Statut

Le runtime tente maintenant de charger `prototype/public/assets/tsi/TSI-WPN-AR-01.glb` au démarrage. Si le fichier est absent ou invalide, le blockout procédural reste actif. Le chargeur ne constitue pas un modèle final : il prépare le point d'entrée de remplacement sans casser le prototype.

## Livraison attendue

Déposer le GLB optimisé à l'emplacement exact :

`prototype/public/assets/tsi/TSI-WPN-AR-01.glb`

Le GLB doit avoir :
- un root `TSI-WPN-AR-01`, axe avant local `-Z`, échelle en mètres;
- meshes séparés : receiver, handguard, barrel, stock, optic, magazine;
- un armature `AR01_RIG` avec bones `AR01_Root`, `AR01_Magazine`, `AR01_ChargingHandle`;
- sockets empties nommés `AR01_MuzzleFlashSocket`, `AR01_LeftHandGrip`, `AR01_RightHandGrip`, `AR01_EjectSocket`, `AR01_MagazineSocket`, `AR01_SightSocket`;
- actions `AR01_Idle`, `AR01_Fire`, `AR01_Reload`, `AR01_Equip`, `AR01_Unequip`, `AR01_Aim`, `AR01_Sprint`;
- UV propres et textures PBR séparées BaseColor, Metallic, Roughness, Normal; aucun shader procédural non exportable.

## Contrat du personnage FPS/TPS

Le modèle d'opérateur final doit fournir un squelette humanoïde compatible avec une convention documentée (root, pelvis, spine, neck, head, clavicles, upper/lower arms, hands, upper/lower legs, feet). Les clips requis sont idle, walk, run/sprint, fire/aim, reload, hit, death et revive. Les deux mains doivent être pilotables par IK ou sockets de prise; les mains FPS caméra-space actuelles ne sont qu'un proxy temporaire.

## Contrôle de qualité avant activation

1. Vérifier le GLB dans Blender et un viewer glTF.
2. Confirmer que les six sockets existent et sont des enfants du root de l'arme.
3. Vérifier que les sept actions existent et ont une durée non nulle.
4. Vérifier poids, orientation, normales, UV, matériaux et textures embarquées.
5. Tester l'arme dans FPS et TPS, notamment les mains, la ligne de visée et le rechargement.
6. Comparer le coût GPU sur Android réel.

Le runtime actuel n'active pas encore les clips d'arme exportés ni l'IK des mains. Il remplace les primitives par le GLB lorsqu'il le trouve, mais l'alignement et l'échelle doivent être validés visuellement avant de considérer l'intégration terminée.

## État de livraison

Aucun fichier GLB riggé n'est inclus dans ce commit. Le chemin d'import et le contrat de production sont préparés; la création du modèle, du rig, des actions et des textures reste un travail d'asset 3D à réaliser dans Blender.
