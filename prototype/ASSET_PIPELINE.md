# TSI — pipeline de ressources Android

## Source initiale de ressources 3D

Le build Android récupère les modèles 3D depuis le manifeste public de Gobkit :
https://gobkit.com/api/free

Les packs retenus sont les personnages militaires (human004), policiers (human012), secours (human007) et les packs d'environnement. Le script vérifie le domaine HTTPS et la licence CC0 1.0 avant de télécharger chaque GLB. Le manifeste local conserve le nom, le pack, les animations déclarées, la licence, l'URL d'origine et la taille de chaque fichier.

Les personnages militaires du pack human004 incluent des clips Idle, Walk, Run, Death, Hit, Attack et Special à 30 FPS selon le manifeste source. Les fichiers sont des GLB skinnés. Le pipeline ne prétend pas que ces personnages sont des créations originales TSI : ils servent de ressources CC0 temporaires à intégrer, adapter et remplacer progressivement par les assets finaux du studio.

## Génération

Depuis le dossier prototype :

```bash
node scripts/fetch-cc0-assets.mjs
npm run build
```

Les ressources sont téléchargées dans `prototype/public/assets/cc0/` avant la compilation. Elles sont donc intégrées au build web puis au paquet Android hors ligne.

## Taille APK

La cible de distribution demandée est au moins 100 Mo. La taille finale dépend des fichiers effectivement disponibles, des textures et des formats compressés. Le workflow publie les tailles du pack de ressources et de l'APK ; il ne doit pas fabriquer de données de remplissage pour atteindre le seuil. Si le seuil n'est pas atteint, il faut ajouter de vrais contenus utiles (cartes, textures PBR, sons, animations et modèles) puis reconstruire.

## Licences et contrôle

- Gobkit annonce les modèles de son manifeste gratuit sous CC0 1.0 ; le script vérifie le champ licence des packs sélectionnés à chaque build.
- Les URL sont consommées depuis le manifeste, jamais reconstruites.
- Seuls les fichiers GLB HTTPS servis par gobkit.com sont acceptés.
- Les crédits et les références sources restent documentés ici et dans le manifeste embarqué.
- Les licences de toute nouvelle source doivent être vérifiées avant son ajout.
