# TSI — pipeline de ressources Android

## Personnages et éléments 3D

Le build récupère les personnages militaires, police, secours et éléments d'environnement depuis le manifeste public Gobkit : https://gobkit.com/api/free. Le script vérifie l'origine HTTPS et le champ de licence CC0 1.0 avant chaque téléchargement. Les modèles GLB, animations et informations de provenance sont consignés dans le manifeste embarqué.

Les personnages militaires du pack human004 déclarent notamment des clips Idle, Walk, Run, Death, Hit, Attack et Special. Le pipeline ne prétend pas que ces personnages sont des créations originales TSI : ils constituent une base CC0 à adapter, remplacer et améliorer.

## Matériaux et éclairages

Le build utilise également l'API publique de Poly Haven (https://api.polyhaven.com) pour récupérer six matériaux de terrain et de construction ainsi que deux environnements HDRI extérieurs. Les ressources Poly Haven sont CC0 ; l'écran d'accueil affiche le crédit demandé par leur API : « Powered by Poly Haven ».

Pour éviter un APK démesuré, le pipeline privilégie les textures 2K (1K en secours) et conserve uniquement les cartes albédo, normale et rugosité. Les cartes non utilisées par le rendu mobile ne sont pas embarquées. Le manifeste conserve les URL source, tailles et empreintes MD5.

## Génération Android

Depuis le dossier prototype :

```bash
node scripts/fetch-cc0-assets.mjs
npm run build
```

Les ressources sont téléchargées dans `prototype/public/assets/cc0/` avant Vite et Capacitor. Elles sont donc intégrées au paquet hors ligne.

## Taille et contrôle qualité

La cible demandée est une APK d'au moins 100 MiB. Le workflow mesure la taille réelle de l'APK après Gradle et doit échouer si le binaire est sous le seuil. Aucun fichier de remplissage n'est utilisé. Si le contenu CC0 disponible ne suffit pas, de vrais assets utiles (cartes, armes, personnages, sons et animations) doivent être ajoutés.

## Licences

- Gobkit : packs vérifiés par le script en CC0 1.0.
- Poly Haven : modèles, matériaux et HDRI CC0 1.0 ; l'utilisation de l'API publique est accompagnée du crédit visible « Powered by Poly Haven ».
- Les licences des nouvelles sources doivent être contrôlées avant intégration.
