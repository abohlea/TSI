# TSI-WPN-AR-01 — intégration caméra et animation runtime

**Statut :** montage FPS dédié et animation procédurale de transition ajoutés au runtime. Les animations restent des approximations de gameplay; aucun clip Blender final ni GLB final n'est livré.

## Montage à deux caméras

- En TPS, `AR-01` est enfant du root opérateur et utilise son point de repos troisième personne.
- En FPS, le fusil est ré-parenté sous l'entité caméra et utilise un point de repos de viewmodel indépendant. Le corps local reste masqué par le mode caméra.
- Le changement de parent conserve un chemin de retour explicite vers le root opérateur lorsque le joueur repasse en TPS.
- Le recul procédural combine translation longitudinale et rotation légère; le balancement du viewmodel est atténué par rapport à la pose TPS.

## Gestuelle procédurale actuelle

- **Tir :** flash bref, impulsion de recul et retour amorti.
- **Rechargement :** le chargeur descend, reste dégagé pendant une courte fenêtre, remonte puis se stabilise; le charging handle reçoit un petit mouvement de fin de séquence.
- **Déplacement :** balancement léger de l'arme synchronisé avec le cycle de locomotion; amplitude réduite en FPS.
- **Impact :** fléchissement procédural des bras.

Ces mouvements sont des placeholders déterministes dans `prototype/src/game/player.ts`. Ils ne remplacent pas une animation d'arme riggée, des mains animées, ni des clips authored dans Blender. Le chargeur ne dispose pas encore d'un système de détachement/attachement physique indépendant.

## Contrat d'asset pour la prochaine intégration GLB

Le futur asset doit conserver un root stable et exposer au minimum :
- `AR01_MuzzleFlashSocket`
- `AR01_LeftHandGrip` et `AR01_RightHandGrip`
- `AR01_EjectSocket`
- `AR01_MagazineSocket`
- `AR01_SightSocket`

Clips attendus : `AR01_Idle`, `AR01_Fire`, `AR01_Reload`, `AR01_Equip`, `AR01_Unequip`, `AR01_Aim`, `AR01_Sprint`. Les noms et pivots devront être validés à l'import; le runtime actuel ne charge pas encore ces clips.

## Recette G1 — à exécuter avec Blender et sur appareil

1. Générer le GLB et ouvrir le résultat dans Blender.
2. Vérifier axes, échelle, normales, pivots, hiérarchie et sockets.
3. Comparer le montage FPS (alignement optique, couverture de l'écran, bras) et TPS (prise en main et silhouette).
4. Vérifier les phases du rechargement, la répétition rapide des tirs et le changement FPS/TPS pendant une session.
5. Tester sur Android réel, mesurer temps GPU/CPU et vérifier le coût des ombres.
6. Archiver le `.blend`, le GLB validé, les captures et la fiche de recette.

**Limite de validation :** les modifications de code sont committées, mais aucun rendu visuel PlayCanvas, test de navigation, test Blender ou test Android physique n'est revendiqué ici.

## Mise à jour — viewmodel et sockets runtime

Le blockout runtime possède maintenant une paire de manches/gants dédiée à la caméra FPS. Ces éléments restent indépendants du corps TPS masqué, suivent un léger mouvement vertical et sont activés/désactivés avec le changement de caméra. La pose d'arme utilise désormais des rotations de repos distinctes en FPS et TPS afin d'éviter de conserver la rotation FPS en troisième personne.

Sockets nommés créés sous le root runtime de l'arme :
- `AR01_MuzzleFlashSocket`
- `AR01_LeftHandGrip`
- `AR01_RightHandGrip`
- `AR01_EjectSocket`
- `AR01_MagazineSocket`
- `AR01_SightSocket`

Le chargeur est maintenant masqué pendant la courte phase de retrait et ses nervures sont enfants de son entité, afin qu'elles disparaissent avec lui. C'est une simulation visuelle simple : il n'existe pas encore de chargeur détaché avec trajectoire, collision ou animation de main dédiée.

**Important :** les manches, gants, pivots et sockets sont des primitives runtime. Ils définissent le contrat d'assemblage et permettent de préparer l'intégration, mais ne constituent ni un rig de personnage skinné ni un rig Blender exporté. Les clips finaux et l'asset GLB restent à fabriquer et à valider.
