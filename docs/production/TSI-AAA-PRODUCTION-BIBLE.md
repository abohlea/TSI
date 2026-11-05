# TSI — Bible de production AAA (V1)

- **Projet :** Tactical Strike Initiative (TSI)
- **Branche cible :** `production/aaa-character-pipeline`
- **Date :** 5 novembre 2026
- **Statut :** cadre de production initial ; les livrables restent à fabriquer, intégrer et tester
- **Moteur :** PlayCanvas / TypeScript
- **Réseau de jeu :** Colyseus autoritaire (candidat retenu pour le prototype)
- **Référence de direction :** shooter tactique compétitif mobile-first, identité TSI originale

> Cette bible décrit ce qu'il faut produire et comment l'accepter. Elle ne signifie pas que les modèles 3D, sons, animations, effets ou fonctionnalités listés existent déjà. Les images conceptuelles ne remplacent pas les fichiers sources, les exports runtime ni les tests.

## 1. Principes de qualité

1. **Gameplay d'abord :** lisibilité, réponse des commandes, stabilité réseau et équilibre priment sur les effets coûteux.
2. **Identité originale :** aucune copie de personnages, armes iconiques, logos, sons, cartes, interfaces ou assets d'autres franchises. Les jeux de référence servent uniquement à comparer le niveau de finition et la clarté.
3. **Mobile-first mesuré :** budgets provisoires, profils graphiques adaptatifs et tests sur appareils physiques. Ne pas annoncer 60 FPS ou un nombre de joueurs sans mesures reproductibles.
4. **Serveur autoritaire :** le serveur décide des tirs valides, dégâts, munitions, éliminations, score et résultats compétitifs. Le client prédit/affiche, mais ne s'auto-attribue pas les résultats.
5. **Pipeline traçable :** chaque asset a un identifiant, un propriétaire, une source, une licence, un statut, une version, des critères d'acceptation et une cible runtime.
6. **Accessibilité et confort :** mixage non agressif, options de volume, sous-titres/indications, réduction des flashes, remappage et commandes tactiles ajustables.

## 2. Piliers de direction artistique

- Univers : conflit tactique fictif dans un futur proche, technologie crédible mais non documentaire.
- Identité : graphite/noir, orange de sécurité, bleu électrique limité aux interfaces et éléments technologiques TSI.
- Formes : silhouette claire, détails fonctionnels, matériaux PBR sobres, usure contrôlée.
- Environnements : architecture originale inspirée de lieux côtiers, urbains et industriels, sans reproduire un site réel sensible.
- VFX : spectaculaire mais court, lisible et peu opaque ; les effets ne doivent pas cacher les adversaires ni les informations de jeu.
- UI : hiérarchie forte, typographie lisible sur téléphone, retours d'état immédiats et navigation clavier/manette/tactile.

## 3. Personnages et animation

### Familles d'assets
- Opérateurs jouables : silhouette, visage, coiffures, tenue de base, variantes cosmétiques et accessoires.
- PNJ/cibles d'entraînement : silhouettes distinctes et animations réduites.
- Éléments communs : mains, gants, bottes, sacs, radios, protections, insignes et accessoires.
- Visages : expressions neutres, effort, douleur stylisée, communication radio, victoire et défaite.

### Livraison obligatoire par personnage
- Planche approuvée : face, profil, dos, détails, palette, matériaux.
- Source Blender propre, maillage retopologisé, UV, textures PBR, rig, poids, sockets, colliders documentés.
- Exports GLB versionnés : LOD0/LOD1/LOD2 si le profil le justifie.
- Clips nommés et testés : idle, marche, course, sprint, strafe, saut, atterrissage, visée, tir, rechargement, équipement, impact, chute/élimination, victoire.
- Contrôle des pénétrations, glissements de pieds, contacts mains/arme, transitions et silhouette à distance.

### Règles
- Les animations sont visuelles ; elles ne décident jamais des dégâts.
- Les variantes cosmétiques ne doivent pas créer d'avantage compétitif (silhouette, camouflage excessif, hitbox).
- Le corps et l'équipement doivent rester lisibles en qualité basse.

## 4. Arsenal — spécification de jeu

Les armes sont des objets fictifs de gameplay. Leurs paramètres sont des valeurs de balance abstraites, non des instructions de fabrication ou des spécifications d'armes réelles.

### Familles V1
| Famille | Identifiant de contenu | Rôle de gameplay | Signature audio/VFX |
|---|---|---|---|
| Fusil d'assaut | `TSI-WPN-AR-01` | polyvalent, portée moyenne | cadence soutenue, flash bref |
| Pistolet | `TSI-WPN-PI-01` | arme secondaire, mobilité | claquement sec, flash compact |
| Précision | `TSI-WPN-MR-01` | tir posé, portée longue | rapport puissant, traînée discrète |
| Pompe | `TSI-WPN-SG-01` | courte portée, impact rapproché | détonation grave, éjection stylisée |
| Mitraillette | `TSI-WPN-SMG-01` | mobilité et courte portée | rafale rapide, recul visuel contenu |
| Soutien | `TSI-WPN-LMG-01` | pression de zone, mobilité réduite | son dense, chaleur et fumée contrôlées |

### Fiche de données par arme
Chaque arme doit disposer d'un fichier de données versionné couvrant :
- identifiant stable, nom d'affichage, famille, rareté/catégorie et icône ;
- cadence, dégâts de jeu, dispersion, recul caméra, temps de rechargement, capacité et réserve ;
- portée efficace et courbe de dégâts abstraite, mobilité et temps de visée ;
- animations de tir, visée, rechargement, inspection et changement d'arme ;
- sockets (main, chargeur, optique, bouche, effets), points d'éjection et d'impact ;
- sons de tir proche/lointain, mécanique, rechargement, manipulation et impacts ;
- muzzle flash, fumée, chaleur, douille, traceur optionnel et effets d'impact ;
- limites d'accessoires, règles d'équilibrage, version et notes de QA.

### Modèle 3D et finition
- Modèle original, silhouette reconnaissable, pièces séparées seulement si animées/personnalisables.
- Matériaux PBR : métal, polymère, caoutchouc, verre et marquages ; roughness crédible.
- LOD et texture budgets mesurés ; atlas et compression adaptés aux appareils.
- Aucun détail fin ne doit devenir du bruit visuel sur mobile.
- Contrôler alignement des mains, visée, caméra, chargeur, animation et absence de clipping.
- Les accessoires doivent avoir un effet de gameplay documenté ou être purement cosmétiques.

## 5. VFX — tirs, impacts, explosions et environnement

### Bibliothèque d'effets
- Tir : flash de bouche, légère fumée, impulsion lumineuse, chaleur facultative.
- Projectile : traceur rare et lisible, trajectoire cosmétique non autoritaire.
- Impacts : béton, métal, verre, terre, eau, végétation et bouclier fictif.
- Explosions : impulsion lumineuse, boule de feu stylisée, fumée, poussière, fragments non persistants, onde visuelle.
- Combat : suppression visuelle légère, étincelles, ricochets, marqueurs de dégâts et feedback d'élimination.
- Monde : pluie, éclaboussures, vent, poussière, brume, fumée ambiante, éclairage et météo.
- UI : transitions, confirmation de hit, objectifs, progression, victoire/défaite.

### Règles d'explosion
- Priorité à la lecture : distinguer immédiatement source, zone d'effet de gameplay et simple décoration.
- Le serveur calcule rayon, dégâts, ligne de vue et résultat ; le client joue le VFX et le son.
- Limiter particules, transparences superposées, lumières dynamiques et durée de vie.
- Prévoir qualité basse/moyenne/haute, pooling, culling, distance et plafonds simultanés.
- Pas de flash plein écran obligatoire ; option de réduction des flashes et intensité de caméra.
- Les débris décoratifs ne doivent pas créer de collision coûteuse ou de désynchronisation.

### QA VFX
- Capturer l'effet à plusieurs distances, angles et niveaux graphiques.
- Vérifier lisibilité des adversaires pendant et après l'effet.
- Mesurer coût GPU/CPU, overdraw, particules simultanées et mémoire.
- Tester scènes chargées et plusieurs explosions simultanées.

## 6. Audio — armes, explosions, voix, cris et monde

### Catégories
1. **Armes :** tir proche, tir lointain, intérieur/extérieur, manipulation, culasse stylisée, chargeur, tir à vide, changement et rechargement.
2. **Explosions :** attaque, corps grave, débris, queue/réverbération, distance, intérieur/extérieur et obstruction.
3. **Mouvement :** pas par surface, course, sprint, saut, réception, glissade, équipement et respiration.
4. **Voix :** callouts tactiques, confirmation d'objectif, blessure stylisée, effort, cris de combat, élimination, victoire, défaite et radio.
5. **Environnement :** vent, pluie, circulation lointaine, générateurs, foule distante, oiseaux, intérieur, réverbération de pièce.
6. **UI :** navigation, validation, erreur, notification, progression, ping et objectifs.
7. **Musique :** menu, préparation, tension, transition de manche, victoire et défaite.

### Direction de voix
- Casting adulte professionnel et diversifié, accents choisis avec cohérence et respect.
- Répliques courtes, naturelles, compréhensibles sous le mix de combat.
- Enregistrer chaque ligne en version sèche, radio et variations émotionnelles lorsque nécessaire.
- Éviter les cris constants : déclencheurs limités, priorité aux informations tactiques et option de volume voix.
- Prévoir sous-titres/callouts visuels pour les informations importantes.
- Consentements, droits d'exploitation, territoire, durée et crédits des comédiens documentés.

### Fiche audio
Chaque fichier audio doit inclure : identifiant, description, catégorie, source/créateur, licence, durée, fréquence, canaux, loudness cible, variations, distances, priorité, bus, boucle, déclencheur et statut d'intégration.
- Formats source non destructifs conservés hors build ; format runtime compressé choisi après tests.
- Mix adaptatif : proche/lointain, occlusion, réverbération, priorité, ducking voix/musique.
- Variations aléatoires contrôlées pour éviter la répétition, sans masquer les signaux importants.
- Prévoir sliders séparés : master, effets, armes, voix, musique et ambiance.

## 7. Niveaux, objets et destruction

- Cartes originales avec routes de combat, lignes de vue, couvertures, rotations, zones d'apparition et points d'intérêt.
- Kit modulaire : murs, portes, fenêtres, escaliers, sols, toits, mobilier, signalétique et accessoires.
- Matériaux de surface cohérents pour impacts, pas et audio.
- Destruction sélective et déterministe uniquement si elle améliore le gameplay ; pas de destruction générale coûteuse en V1.
- Les changements d'état ayant un impact compétitif doivent être répliqués et validés serveur.
- Contrôler navigation, collisions, zones de spawn, exploit spots, visibilité, performance et qualité artistique.

## 8. Gameplay et réseau

- Contrôles PC/mobile, sensibilité, accélération caméra, remappage et HUD adaptatif.
- Mouvements : marche, course, sprint, saut, accroupissement/glissade si validés par le design.
- Combat : visée, tir, rechargement, changement d'arme, dégâts, élimination, réapparition et spectateur.
- Modes à construire et valider séparément : entraînement, tactique 5v5, extraction, Battle Royale.
- Le mode « Réseau de Front » est une fonctionnalité différenciante candidate ; prototype séparé avant intégration.
- Colyseus : état de room, validation serveur, interpolation clients, latence, reconnexion, anti-spam et tests de charge.
- Firebase Authentication pour identité ; Firestore pour profils/résultats persistants, jamais pour les positions et tirs frame par frame.
- Sécurité : validation des messages, limites de cadence, tickets, autorisations, anti-triche côté serveur et journaux sans données sensibles.

## 9. Pipeline d'assets et convention de nommage

### Identifiants
- Personnage : `TSI-CHAR-###`
- Arme : `TSI-WPN-XX-##`
- VFX : `TSI-VFX-CATEGORY-###`
- Audio : `TSI-SFX-CATEGORY-###` ou `TSI-VO-LANG-###`
- Environnement : `TSI-ENV-MAP-###`
- UI : `TSI-UI-CATEGORY-###`

### États obligatoires
`brief` → `concept` → `approved` → `source-created` → `integrated` → `qa-passed` → `production-ready`.
Un asset peut être `blocked` ou `deprecated`. Aucun asset généré automatiquement ne passe directement à `production-ready`.

### Métadonnées
Pour chaque asset, conserver : identifiant, version, responsable, source, licence, logiciel/version, format source, format runtime, dépendances, dimensions, budgets, date, changelog, captures QA et approbateur.

### Stockage
- Sources lourdes (Blend, WAV/AIFF, PSD) dans stockage adapté ; Git LFS si les fichiers doivent être versionnés dans Git.
- Runtime optimisé dans les dossiers d'assets du jeu.
- Pas de secrets, fichiers temporaires, caches ou exports non validés dans le dépôt.
- Les licences et preuves d'autorisation sont conservées avec le registre de provenance.

## 10. Profils de performance et validation

Trois profils initiaux à mesurer, pas à promettre :
- **Mobile économe :** résolution/effets réduits, particules plafonnées, ombres limitées, textures adaptées.
- **Mobile élevé :** meilleure résolution, éclairage et effets modérés.
- **Desktop :** qualité supérieure selon GPU, résolution et fréquence d'affichage.

Mesures obligatoires : FPS médian et 1 % low, frame time CPU/GPU, mémoire, temps de chargement, taille des builds, draw calls, triangles, overdraw, trafic réseau, latence, pertes, reconnexions et crashs.

Appareils de validation : au minimum Android d'entrée/milieu de gamme, Android haut de gamme et ordinateur de référence ; ajouter iOS si support cible confirmé. Documenter modèle, OS, navigateur, résolution, paramètres et version du build.

## 11. Portes de sortie du vertical slice

- **Gate 0 — Préproduction :** vision, GDD, TDD, registre d'assets, direction artistique et risques approuvés.
- **Gate 1 — Prototype jouable :** boucle de jeu simple, contrôles, tir sur cible, HUD, build reproductible.
- **Gate 2 — Vertical slice :** une carte finie, un opérateur, deux armes complètes, audio/VFX cohérents, mode jouable, serveur autoritaire et QA sur appareils.
- **Gate 3 — Alpha :** systèmes principaux, plusieurs cartes/armes/personnages, outils de contenu, tests réseau et sécurité.
- **Gate 4 — Bêta :** contenu quasi complet, équilibrage, optimisation, accessibilité, tests à grande échelle et correction des défauts.
- **Gate 5 — Release candidate :** conformité plateformes, stabilité, télémétrie, support, politiques et validation finale.

Aucune phase ne se valide par une capture d'écran seule. Chaque gate requiert un build, des tests reproductibles, une liste de défauts et une décision documentée.

## 12. Ordre de production recommandé

1. Verrouiller la direction du premier opérateur et l'échelle visuelle.
2. Établir le pipeline de test GLB/rig/animation dans PlayCanvas.
3. Produire une arme complète de référence (modèle, animations, sons, VFX, données et intégration).
4. Construire une scène de tir qui teste impacts, explosions, matériaux, audio spatial et performances.
5. Finaliser une petite carte verticale avec éclairage et ambiance.
6. Stabiliser le combat autoritaire et le mode 5v5 avant d'étendre les modes.
7. Ajouter les variantes de contenu, puis élargir le roster et l'arsenal.
8. Tester chaque palier sur matériel réel et corriger avant d'augmenter le contenu.

## 13. Limites et dépendances

La production d'assets AAA nécessite des outils de création, des compétences artistiques/audio, des validations humaines et des tests sur matériel. L'assistant peut préparer les spécifications, écrire le code, organiser les données, créer des prototypes et contrôler les intégrations disponibles. Il ne doit jamais déclarer qu'un asset professionnel existe tant que son fichier source, son export et ses contrôles n'ont pas été produits et vérifiés.

Les coûts de serveurs, stockage, bande passante, licences, tests appareils et prestations audio/artistiques devront être estimés avant une exploitation commerciale. Aucun service payant ne sera activé sans accord du propriétaire.
