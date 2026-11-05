# TSI-CHAR-001 — Character de référence : opérateur principal

- **Statut :** spécification de production initiale — à valider avant modélisation finale
- **Branche :** `production/aaa-character-pipeline`
- **Cible runtime :** PlayCanvas Engine / client TypeScript
- **Format d'échange :** glTF 2.0 binaire (`.glb`)
- **Source artistique :** fichier Blender natif (`.blend`) conservé séparément du build runtime
- **Référence visuelle :** concept art TSI de l'escouade côtière, novembre 2026
- **Personnage :** opérateur principal TSI, nom et biographie à définir

> Ce document définit un asset à fabriquer et à contrôler. Il ne prétend pas qu'un modèle 3D, un rig ou des animations existent déjà.

## 1. Intention artistique

Créer un opérateur original de shooter tactique futur proche, immédiatement identifiable à moyenne distance et lisible sur écran mobile.

### Silhouette et identité

- Présentation masculine adulte, athlétique et crédible, proportions humaines réalistes.
- Silhouette fonctionnelle : épaules protégées, torse modulaire, ceinture utilitaire, genouillères et bottes tactiques.
- Armure principalement graphite/noir mat ; accents orange de sécurité et petites signatures bleu électrique réservées aux éléments d'identité TSI.
- Insigne TSI original sur l'épaule et le torse, sans reprendre de logo ou d'équipement identifiable d'une franchise existante.
- Visage, coiffure, cicatrices éventuelles et accessoires à concevoir sans caricature ni surenchère.
- Équipement cohérent : gants, radio, poches, sangles et protections doivent avoir une fonction visuelle et ne pas traverser le corps en animation.

### Règles de lisibilité

- La silhouette doit rester reconnaissable en contre-jour et à petite taille.
- Les accents orange/bleu ne doivent pas transformer le personnage en cible lumineuse.
- Les éléments fins (câbles, antennes, boucles) sont limités ou renforcés pour les niveaux de détail bas.
- Aucun accessoire ne doit gêner la caméra troisième personne ni masquer les mains sur les poses de visée.

## 2. Livrables obligatoires

| Livrable | Source / format | Critère d'acceptation |
|---|---|---|
| Planche de conception | PNG/PDF : face, profil, dos, détails | proportions, matériaux et accessoires cohérents |
| Modèle source | Blender `.blend` | objets nommés, transformations propres, unités documentées |
| Maillage runtime | GLB / glTF 2.0 | import PlayCanvas sans erreur, échelle et orientation correctes |
| Textures | PNG ou KTX2 après validation du pipeline | canaux PBR documentés, mipmaps et compression vérifiés |
| Squelette | inclus dans GLB | hiérarchie stable, noms normalisés, bind pose valide |
| Animations | clips glTF | clips séparés, transitions sans saut ni déformation critique |
| Colliders / sockets | documentation et nœuds dédiés | capsule cohérente, socket main droite et points d'équipement |
| Rapport QA | Markdown + captures | poids, textures, draw calls, tests et anomalies consignés |

## 3. Spécification technique initiale

Les chiffres ci-dessous sont des budgets de départ pour un personnage jouable mobile-first, et non une promesse de rendu AAA universel. Ils seront ajustés après mesure sur appareils de référence.

### Géométrie et niveaux de détail

- Unité de scène : mètres ; hauteur cible approximative : 1,80 m, à confirmer avec le gameplay et la caméra.
- Maillage LOD0 : budget cible de 45 000 à 65 000 triangles pour le personnage complet équipé.
- LOD1 : environ 50 % du coût géométrique de LOD0.
- LOD2 : environ 20–25 % du coût géométrique de LOD0, silhouette et insignes majeurs préservés.
- LOD/culling et distance de transition à mesurer dans la scène réelle.
- Éviter les pièces cachées qui ne sont jamais visibles ; séparer les pièces uniquement si cela sert l'animation, la personnalisation ou le rendu.
- Un seul matériau atlasé autant que possible pour le corps/armure ; matériaux séparés uniquement pour les besoins visuels ou techniques justifiés.

### Textures PBR

Convention glTF Metallic-Roughness :

- Base Color : sRGB.
- Normal : tangent-space, données linéaires, convention glTF/OpenGL à vérifier à l'import.
- Metallic-Roughness : Metallic dans le canal B, Roughness dans le canal G.
- Occlusion : canal R si packing partagé compatible.
- Emissive : seulement pour les éléments lumineux réellement nécessaires.
- Pas de lumière peinte dans Base Color ; les ombres doivent provenir de l'éclairage et des maps appropriées.

Budget initial à tester :
- LOD0 : atlas principal 2048×2048 ; accessoires secondaires intégrés à l'atlas si possible.
- Variante haute qualité PC éventuelle : 4096×4096 uniquement si la mesure le justifie.
- Mobile : 1024–2048 selon appareil, taille écran et mémoire GPU.
- Compression GPU et KTX2/Basis : à sélectionner après test de compatibilité navigateur/appareil ; conserver une source PNG/TGA non destructive dans le dossier source.
- Définir padding, dilation et mipmaps pour éviter les bavures aux coutures UV.

### Rig et skinning

- Squelette humanoïde compatible avec une convention d'animation documentée.
- Hiérarchie minimale : root, pelvis, spine, chest, neck, head, clavicles, arms, hands, legs, feet.
- Mains et doigts suffisamment riggés pour tenir l'arme et jouer les poses de rechargement.
- Maximum cible : 4 influences par sommet.
- Poids normalisés ; aucune déformation visible au niveau épaules, coudes, hanches, genoux, poignets et cou.
- Os d'accessoires/armes uniquement si un besoin d'animation le justifie.
- Socket d'arme en main droite, point d'attache de sac/dos et points d'accessoires documentés.
- Capsule de gameplay séparée du maillage visuel ; le squelette ne doit pas piloter la physique autoritaire.

## 4. Bibliothèque d'animations V1

Chaque clip doit avoir un nom stable, une plage temporelle propre et une pose de départ/fin exploitable. Les animations locomotion sont conçues pour blend tree ou blending équivalent côté client.

### Locomotion

- `TSI_Character_Idle_Rifle`
- `TSI_Character_Walk_Forward`
- `TSI_Character_Run_Forward`
- `TSI_Character_Sprint_Forward`
- `TSI_Character_Strafe_Left`
- `TSI_Character_Strafe_Right`
- `TSI_Character_Backpedal`
- `TSI_Character_Jump_Start`
- `TSI_Character_Jump_Loop`
- `TSI_Character_Jump_Land`

### Combat

- `TSI_Character_Aim_Rifle`
- `TSI_Character_Fire_Rifle` (additif haut du corps si le rig le permet)
- `TSI_Character_Reload_Rifle`
- `TSI_Character_Equip_Rifle`
- `TSI_Character_Unequip_Rifle`
- `TSI_Character_Hit_Reaction`
- `TSI_Character_Death`
- `TSI_Character_Revive` (à produire si le mode retient la réanimation)

### Contrôle qualité animation

- Vérifier les transitions idle/walk/run/sprint dans les deux sens.
- Vérifier que les pieds ne glissent pas excessivement à vitesse nominale.
- Vérifier mains, doigts et contacts avec la poignée, la détente et le chargeur.
- Vérifier que le chargeur ne traverse pas le torse pendant le rechargement.
- Tester visée et tir en déplacement, rotation, pente et changement de direction.
- Les animations ne déterminent jamais les impacts ou les dégâts : le serveur reste autoritaire.

## 5. Intégration PlayCanvas

1. Exporter le personnage en GLB avec armature, skins et clips d'animation.
2. Importer dans une scène de validation dédiée, sans remplacer le personnage blocout du prototype.
3. Vérifier échelle, axe avant, orientation des os, matériaux et textures.
4. Créer le contrôleur d'animation côté client avec états locomotion/combat.
5. Connecter le mouvement visuel à l'état de déplacement répliqué ; interpolation pour les joueurs distants.
6. Attacher l'arme au socket de main et vérifier les poses de visée.
7. Séparer collision/capsule gameplay, mesh visuel et effets.
8. Tester WebGL 2 en profil de compatibilité ; tester WebGPU séparément lorsqu'il est disponible.
9. Mesurer mémoire GPU, temps CPU/GPU, draw calls, triangles visibles et temps de chargement sur appareils réels.
10. Ne supprimer le blocout que lorsque le GLB passe les tests fonctionnels et visuels.

### Arborescence cible

```text
assets/
  characters/
    operator_alpha/
      source/
        operator_alpha.blend
      export/
        operator_alpha_lod0.glb
        operator_alpha_lod1.glb
        operator_alpha_lod2.glb
      textures/
        operator_alpha_basecolor.png
        operator_alpha_normal.png
        operator_alpha_metallic_roughness.png
        operator_alpha_occlusion.png
      references/
        character_turnaround.png
      README.md
docs/
  art/
    TSI-CHAR-001-operator-alpha.md
```

Les fichiers binaires lourds sont à versionner selon la politique de stockage du dépôt (Git LFS si nécessaire). Ne pas committer de fichiers temporaires, caches Blender ou exports de test inutilisés.

## 6. Portes de validation (Definition of Done)

### Gate A — Design approuvé
- [ ] Planche face/profil/dos validée.
- [ ] Silhouette et palette TSI validées.
- [ ] Équipement et proportions cohérents avec la caméra troisième personne.
- [ ] Droits d'utilisation des références et ressources documentés.

### Gate B — Modèle et matériaux
- [ ] Fichier Blender source propre et reproductible.
- [ ] Maillage sans normales inversées, faces dégénérées ou intersections majeures.
- [ ] UV sans chevauchements involontaires.
- [ ] Textures PBR conformes et testées sous éclairage neutre et extérieur.
- [ ] LOD0/1/2 visuellement cohérents.

### Gate C — Rig et animations
- [ ] Bind pose et hiérarchie validées.
- [ ] Skinning sans déformation critique.
- [ ] Tous les clips V1 exportés et nommés.
- [ ] Transitions et contacts arme/main validés.

### Gate D — Intégration moteur
- [ ] GLB chargé dans PlayCanvas sans erreur.
- [ ] Matériaux, textures et animations corrects.
- [ ] Contrôleur locomotion/combat fonctionnel.
- [ ] Arme attachée au socket et alignée en visée.
- [ ] Aucun remplacement du blocout avant validation.

### Gate E — Performance et QA
- [ ] Mesures réalisées sur au moins un appareil Android d'entrée/milieu de gamme et un appareil de référence plus puissant.
- [ ] Profil WebGL 2 testé ; WebGPU documenté séparément.
- [ ] Budget mémoire et temps de chargement respectés ou dérogations documentées.
- [ ] Tests prolongés sans fuite mémoire ni régression majeure.
- [ ] Captures, mesures, versions et anomalies archivées.

**Un gate non validé bloque la promotion de l'asset au statut “production-ready”.** Une belle image de présentation ne remplace aucun de ces contrôles.

## 7. Risques et décisions encore ouvertes

- Blender est proposé comme outil de création de référence ; confirmer la disponibilité d'un poste de travail capable de l'exécuter.
- La capacité de production d'un modèle de cette qualité dépendra de la modélisation, du sculpt, du retopology, des UV, du baking, du rigging et de l'animation. Une image générée ne produit pas automatiquement ces livrables.
- Le style exact du visage, le nom, l'histoire, les détails culturels et les signes distinctifs restent à valider par la direction du projet.
- Les budgets géométriques et textures sont des hypothèses initiales ; seuls les tests sur appareils réels les valideront.
- Les animations avancées (motion matching, facial rig complet, cloth simulation) ne sont pas exigées pour le premier vertical slice.
- Les licences des polices, sons, textures, outils et éventuels packs tiers doivent être consignées.

## 8. Prochaine livraison

La prochaine livraison doit être une **planche de turnaround et de matériaux** approuvée (face, profil, dos, gros plans du casque/visage, épaule TSI, torse, gants, bottes et palette). Ensuite seulement, le travail de modélisation 3D peut commencer avec une référence suffisamment stable.
