# TSI-WPN-AR-01 — Brief de production de l'arme de référence

- **Statut :** spécification de production — aucun modèle final n'est livré par ce document.
- **Branche :** `feat/tsi-eight-point-vertical-slice`
- **Runtime :** PlayCanvas / TypeScript
- **Format runtime :** glTF 2.0 binaire (`.glb`)
- **Source :** Blender (`.blend`)
- **Identifiant gameplay :** `TSI-WPN-AR-01`
- **Nom d'affichage actuel :** Vektor AR (nom de travail, modifiable)
- **Caméras :** FPS et TPS
- **Cible :** Android en priorité, desktop pour validation

> Cette fiche est un cahier de fabrication et de recette. Elle ne signifie pas que le fusil blocout actuellement visible dans le prototype est un modèle final, ni qu'un rig ou des animations d'arme définitifs existent.

## 1. Intention artistique

Concevoir un fusil d'assaut fictif contemporain/futur proche, crédible, robuste et immédiatement lisible. Son langage visuel doit s'accorder à l'opérateur TSI-CHAR-001 : finition graphite et noir mat, petites pièces métalliques, marquages techniques originaux et accent orange de sécurité très limité. Éviter toute reproduction directe d'une arme iconique, d'un modèle commercial identifiable ou d'un design de franchise.

La silhouette doit rester identifiable en vue FPS sans occuper excessivement l'écran et en vue TPS sans devenir un simple bloc sombre.

## 2. Architecture visuelle à modéliser

- Corps principal avec volumes propres et arêtes contrôlées.
- Garde-main ventilé, canon et dispositif de bouche fictifs.
- Poignée, crosse réglable, chargeur amovible et viseur optique original.
- Commandes, attaches et détails secondaires uniquement lorsqu'ils restent lisibles à l'échelle mobile.
- Marquages TSI discrets, sans texte minuscule illisible ni logo tiers.
- Variantes LOD : silhouette complète, niveau moyen, niveau léger.

Les pièces mobiles destinées aux animations doivent être des objets séparés, nommés et pivotés correctement. Les détails de surface doivent être réalisés par matériaux/textures plutôt que par une densité de géométrie excessive.

## 3. Livrables

| Livrable | Format | Critère d'acceptation |
|---|---|---|
| Planche concept | PNG | vues 3/4, profil, dessus et détails ; proportions cohérentes |
| Source modifiable | Blender `.blend` | collections et objets nommés, transforms propres |
| Modèle runtime | GLB | import PlayCanvas sans erreur |
| Matériaux | PBR | base color, metallic, roughness ; textures optimisées |
| Pièces animables | objets séparés | chargeur, culasse/levier fictif, commandes pertinentes |
| Rig/points d'attache | hiérarchie documentée | mains, caméra, muzzle, éjection et chargeur alignés |
| LOD | GLB ou variantes documentées | silhouette préservée, coût réduit |
| Rapport de recette | Markdown | captures FPS/TPS, mesures mémoire et performances |

## 4. Contrat d'intégration

Noms de nœuds recommandés (stables et sans espaces) :

- `AR01_Root`
- `AR01_Body`
- `AR01_Handguard`
- `AR01_Barrel`
- `AR01_Stock`
- `AR01_Magazine`
- `AR01_Optic`
- `AR01_Muzzle`
- `AR01_MuzzleFlashSocket`
- `AR01_LeftHandGrip`
- `AR01_RightHandGrip`
- `AR01_EjectSocket`

Les sockets sont des points d'attache vides, orientés et documentés. Le code gameplay reste propriétaire des dégâts, munitions, cadence et validation des impacts ; le modèle 3D ne porte aucune logique de dégâts.

## 5. Animations à produire

Les animations doivent être livrées avec une convention de nommage stable et des transitions testées :

- `AR01_Idle` — arme tenue, micro-mouvement discret.
- `AR01_Fire` — recul bref, retour contrôlé et cohérent avec la cadence.
- `AR01_Reload` — retrait, remplacement et remise en batterie ; chargeur animé séparément.
- `AR01_Equip` — entrée en main sans saut de position.
- `AR01_Unequip` — sortie de main.
- `AR01_Aim` — transition vers la visée.
- `AR01_Sprint` — port bas dynamique, sans clipping majeur.

Les clips doivent être testés à vitesse normale et en transition. Pas de snap, de pénétration visible des mains, de chargeur qui flotte ou de mouvement exagéré en vue FPS.

## 6. Exigences FPS / TPS

### FPS
- Arme positionnée dans un rig de vue dédié, distinct du squelette du personnage.
- Mains et avant-bras visibles, sans corps local dans le champ de vision.
- Recul, visée et rechargement cadrés pour écrans 16:9 et formats mobiles étroits.
- Aucun clipping de l'arme dans la caméra lors des mouvements usuels.

### TPS
- Arme alignée avec les deux mains du squelette opérateur.
- Poignée et crosse cohérentes avec les poses d'épaule.
- Animations lisibles depuis les angles de caméra de jeu.
- La présentation locale FPS ne doit pas modifier l'arme observée chez les autres joueurs.

## 7. Budget et performance

Les budgets ci-dessous sont des plafonds initiaux à mesurer, pas des résultats déjà obtenus :

- Cible de départ : 25–45 k triangles pour le modèle principal, hors variantes et accessoires optionnels.
- Matériaux : viser 2 à 4 slots au maximum.
- Textures : 1K par défaut ; 2K uniquement si le gain visuel est démontré sur appareil cible.
- Compression et mipmaps à vérifier sur Android.
- LOD activé à distance ; éviter les effets coûteux permanents.
- Mesurer mémoire GPU, temps de frame et draw calls sur appareils bas/milieu de gamme.

## 8. Critères de validation G1

- [ ] Planche concept validée avant modélisation finale.
- [ ] Source Blender et GLB archivés.
- [ ] Hiérarchie et sockets conformes au contrat.
- [ ] Matériaux PBR et textures contrôlés.
- [ ] Clips idle/fire/reload/equip/aim/sprint présents et relus.
- [ ] FPS : mains, arme, recul et rechargement sans clipping bloquant.
- [ ] TPS : alignement des mains et cohérence des poses.
- [ ] LOD et budgets mesurés.
- [ ] Import PlayCanvas vérifié sans erreur.
- [ ] Test sur navigateur desktop et appareil Android réel.
- [ ] Captures et rapport de recette ajoutés au dépôt.

## 9. Ordre de fabrication recommandé

1. Valider la planche concept et les proportions.
2. Construire le modèle high/medium/low et ses matériaux.
3. Définir les sockets et le rig de vue FPS.
4. Produire les animations d'arme.
5. Intégrer en scène de test PlayCanvas avec l'opérateur TSI-CHAR-001.
6. Régler les poses FPS/TPS et les transitions.
7. Profiler sur Android et réduire les coûts si nécessaire.
8. Remplacer le blocout uniquement après validation complète.

## 10. Dépendances et limites

- Dépend du personnage TSI-CHAR-001 et de son squelette/poses de prise en main.
- Dépend du système de caméra FPS/TPS et des animations gameplay.
- Les identifiants VFX/SFX du catalogue sont des références de présentation ; ils ne prouvent pas l'existence de médias finaux.
- Les statistiques d'arme et la validation des tirs doivent rester autoritaires côté serveur.
