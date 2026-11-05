# Ressources 3D, textures et audio

Les ressources du prototype Android sont servies depuis `prototype/public/assets/` et sont donc copiées dans le build Vite puis dans l'application Capacitor.

## Arborescence prévue

- `characters/` : opérateur TSI et variantes, modèles `.glb`
- `weapons/` : armes et accessoires, modèles `.glb`
- `environment/` : bâtiments, couvertures et éléments de décor
- `textures/` : textures `.ktx2` (priorité Android), `.webp`, `.jpg` ou `.png`
- `audio/` : effets et ambiances `.ogg` ou `.mp3`

## Règles d'intégration

1. Préférer glTF binaire (`.glb`) pour les modèles livrés ensemble avec leurs matériaux.
2. Garder les textures séparées et compressées; éviter les textures 4K sur les appareils mobiles.
3. Prévoir des niveaux de détail (LOD) pour les personnages et bâtiments visibles à distance.
4. Limiter chaque fichier à 25 MiB; découper ou optimiser les ressources trop lourdes.
5. Ne pas ajouter de fichiers factices pour atteindre une taille APK cible. La taille doit venir de contenu jouable réel.
6. Vérifier le rendu, la mémoire et les FPS sur un vrai téléphone Android avant de déclarer une ressource validée.

## État actuel

Le prototype utilise encore des formes PlayCanvas générées en code pour le personnage, les armes et le terrain. Aucun modèle GLB, texture de jeu ou fichier audio n'est encore livré dans ce dossier. Le visuel de soldat créé comme référence artistique doit être modélisé, riggé et exporté avant de pouvoir être utilisé comme personnage animé.

Lancer `npm run assets:check` avant le build pour vérifier les formats et tailles des ressources installées.
