# Direction artistique officielle — TSI

- Statut : adoptée pour le vertical slice
- Référence : DA-001
- Date : 5 novembre 2026
- Style : réalisme militaire
- Caméras : FPS et TPS
- Cible : Android mobile, qualité adaptative selon l'appareil

## Vision

TSI vise un shooter militaire réaliste, avec des opérateurs crédibles, des armes détaillées, des environnements tactiques cohérents et une présentation soignée. Le réalisme doit renforcer la lisibilité du combat et l'identité originale de TSI.

« 15/10 » est une ambition de qualité, pas une promesse de photoréalisme identique sur tous les téléphones. La qualité sera évaluée avec des critères visuels, de jouabilité et de performance mesurables.

## Principes directeurs

1. Cohérence militaire des personnages, équipements, armes, matériaux et décors.
2. Lisibilité compétitive des silhouettes, adversaires, tirs, impacts, santé et couvertures.
3. Matériaux PBR, échelle crédible, éclairage cohérent et usure subtile.
4. FPS et TPS conçus ensemble : aucune arme ou animation ne doit traverser la caméra.
5. Mobile-first : budgets définis par mesure sur appareils bas, moyens et haut de gamme.
6. Identité originale : ne pas copier les personnages, logos, cartes, interfaces ou assets propriétaires d'autres jeux.

## Personnages

- Créer un opérateur original avec silhouette immédiatement reconnaissable.
- Définir un squelette stable et des conventions de nommage pour le retargeting.
- Prévoir LOD, matériaux réutilisables et textures adaptées à Android.
- Couvrir locomotion, marche, course, sprint, visée, tir, rechargement, impact, élimination et respawn.
- Éviter glissements de pieds, transitions brusques et pénétration des accessoires.

## Double caméra

### FPS
- Caméra dédiée avec FOV, hauteur et sensibilité réglables.
- Bras et arme de présentation dédiés si nécessaire.
- Animations spécifiques de visée, tir, recul, rechargement et changement d'arme.
- Aucun clipping visible dans les murs ou le corps.

### TPS
- Modèle complet et silhouette lisible.
- Caméra orbitale avec collision contre les murs et transitions fluides.
- Animations complètes de déplacement, visée, tir, rechargement, dégâts, élimination et respawn.
- Orientation du torse, des bras et de l'arme cohérente avec la visée.

### Cohérence
- FPS et TPS utilisent le même état de jeu et les mêmes événements serveur.
- La vue FPS ne crée jamais une seconde source de vérité du combat.
- Les autres joueurs voient toujours le modèle TPS complet du joueur.
- Changer de caméra ne réinitialise ni visée, ni munitions, ni état réseau.

## Armes et effets

- Modèles aux proportions et matériaux crédibles.
- Animations de tir, recul, rechargement et changement d'arme.
- Flash de bouche, fumée, douilles et impacts mesurés pour préserver la visibilité.
- Dégâts, cadence, munitions et rechargement restent autoritaires côté serveur.

## Environnements

- Carte tactique compacte avec lignes de vue et espaces hiérarchisés.
- Matériaux PBR cohérents : béton, métal, bois, verre, tissu, terre et asphalte.
- Couvertures lisibles dont les collisions correspondent aux volumes visibles.
- Éclairage et ombres adaptés aux capacités mesurées des appareils.
- Pas de décoration qui dégrade les performances ou crée de fausses couvertures.

## Interface

- HUD lisible sur petit écran et zones tactiles adaptées.
- Langage cohérent pour typographie, icônes, couleurs et états.
- Informations claires sur santé, munitions, rechargement, dégâts, éliminations et respawn.
- Ne pas masquer les cibles ou les informations critiques.

## Pipeline d'assets

Chaque asset doit avoir une source et une licence documentées, un format d'import convenu (GLB/glTF privilégié), une échelle et des pivots vérifiés, des matériaux optimisés, des LOD ou une justification, et une validation en jeu. Les objets interactifs doivent aussi passer une validation de collision. Les assets CC0 actuels restent des placeholders tant qu'ils ne sont pas approuvés comme contenu final TSI.

## Performance Android

Ne pas inventer de budgets universels avant le benchmark. Mesurer CPU/GPU, stabilité des frametimes, mémoire, textures, appels de rendu, ombres, transparences, particules, température et throttling. Prévoir trois profils graphiques (bas, moyen, élevé) après mesure. La réduction des effets ne doit jamais altérer les règles du jeu ou la visibilité compétitive.

## Jalons graphiques

### G0 — Audit
Inventorier modèles, animations, armes, matériaux, textures, scènes et licences. Capturer l'état actuel et choisir un appareil Android de référence.

### G1 — Opérateur
Finaliser un opérateur original, son rig et ses animations essentielles. Valider les transitions FPS/TPS.

### G2 — Arme de référence
Finaliser une arme avec modèle, matériaux, animations, audio et effets. Mesurer le coût Android.

### G3 — Environnement
Finaliser une petite zone de combat, ses matériaux, éclairages, couvertures et collisions.

### G4 — Intégration
Tester FPS/TPS en réseau, sur appareils réels, avec mesures de performance et de stabilité thermique.

## Critères d'acceptation

Le chantier n'est terminé que lorsque le personnage est convaincant et animé sans défaut majeur, l'arme de référence est cohérente et lisible, l'environnement et ses collisions concordent, les licences sont tracées, et les profils graphiques sont validés sur Android réel. Aucun défaut visuel critique ne doit gêner la visée ou la compréhension du combat.

## Premier livrable

Produire ensemble un opérateur, une arme et une petite zone de combat. Cette tranche verticale représentative fixe le langage visuel et le budget Android avant l'extension du contenu.

La qualité visuelle ne remplace pas la validation du gameplay : FPS et TPS sont deux présentations du même jeu multijoueur.
