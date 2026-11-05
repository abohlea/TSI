# TSI — pipeline de ressources Android

## Personnages et animations

Le build récupère les personnages militaires, police, secours et éléments d'environnement depuis le catalogue public Gobkit : https://gobkit.com/api/free. Le script contrôle l'origine HTTPS et exige la licence CC0 1.0 avant chaque téléchargement. Les modèles GLB, leurs clips déclarés, la provenance et les tailles sont consignés dans le manifeste embarqué.

Le personnage ArmySniper est chargé comme opérateur local et comme rig pour les joueurs distants. La machine d'animation recherche les clips par alias et pilote Idle, Walk et Run selon le déplacement, puis Attack, Hit, Reload et Death lors des événements de jeu. Les noms exacts disponibles restent visibles dans le manifeste et dans le tableau de clips chargé ; un clip absent est ignoré sans empêcher le fallback procédural.

## Armes et interactions

Le fusil AR-01 du blockout conserve ses pièces distinctes. Le tir déclenche le flash et le recul, le rechargement anime le chargeur, et le personnage réagit aux impacts. Ces animations procédurales assurent un comportement de secours si un modèle CC0 ne fournit pas tous les clips attendus.

## Arène, bâtiments et couvertures

Les bâtiments reçoivent des détails de façade, fenêtres, piliers d'angle et éléments de toiture. Les couvertures sont différenciées en sacs de sable, caisses, blocs béton et barrières. Leurs volumes sont ajoutés à la liste de collision utilisée par le déplacement. Des éléments de débris non bloquants complètent le terrain.

Le chargeur de ressources instancie également jusqu'à six modèles d'environnement CC0 non riggés depuis le manifeste, lorsqu'un nom de modèle correspond à un élément de décor reconnu.

## Matériaux et éclairages

L'API Poly Haven (https://api.polyhaven.com) fournit jusqu'à huit matériaux CC0 de terrain et de construction. Le pipeline privilégie les cartes 4K, avec repli 2K puis 1K, et sélectionne les cartes diffuse, normale et occlusion ambiante. Le rendu applique ces cartes aux matériaux du sol et du béton. Deux HDRI extérieurs sont également téléchargés pour être disponibles dans le paquet hors ligne. Le crédit « Powered by Poly Haven » est affiché dans l'écran d'accueil.

## Génération Android

Depuis le dossier prototype :

```bash
node scripts/fetch-cc0-assets.mjs
npm run build
npx cap add android
npx cap sync android
cd android && ./gradlew assembleDebug
```

Les ressources sont téléchargées dans `prototype/public/assets/cc0/` avant Vite et Capacitor ; elles sont donc intégrées au paquet hors ligne.

## Taille et validation

La cible est une APK Debug d'au moins 100 MiB. Le workflow mesure la taille du binaire réellement généré après Gradle et échoue sous le seuil. Aucun fichier de remplissage n'est utilisé. Le volume de fichiers CC0 téléchargés n'est pas considéré comme une preuve de réussite : seule la taille mesurée de l'APK fait foi. Si le contenu utile et licencié reste insuffisant, le contrôle doit rester rouge jusqu'à l'ajout de véritables ressources.

## Licences

- Gobkit : chaque pack retenu doit déclarer CC0 1.0.
- Poly Haven : les modèles, textures et HDRI retenus sont CC0 1.0 ; le crédit visible « Powered by Poly Haven » est conservé.
- Toute nouvelle source doit être vérifiée avant son intégration.
