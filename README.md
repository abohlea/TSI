# TSI — application de messagerie

TSI est une application de messagerie Expo / React Native avec une cible mobile Android/iOS et une version Web accessible depuis un navigateur. Le socle actuel comprend l'authentification Firebase par e-mail, une boîte de réception Firestore en temps réel, la création de discussions individuelles et l'envoi de messages texte.

## Stack et coût

- Expo SDK 54 / React Native
- Firebase Authentication et Cloud Firestore
- Cloudinary pour les médias (téléversement non signé)
- Les dépendances et services sont choisis pour démarrer avec les offres gratuites. Les quotas gratuits ont des limites et peuvent évoluer. **Ne passez pas un projet Firebase ou Cloudinary à une formule payante sans vérifier les quotas et les coûts.**

## Version Web

La version navigateur est construite avec Expo Web et utilise le même projet Firebase que les applications mobiles.

- Développement local : `npm run web`
- Génération du site statique : `npm run build:web` (fichiers produits dans `dist/`)
- Déploiement : connecter le dépôt à Vercel ou Netlify, définir les variables `EXPO_PUBLIC_FIREBASE_*` du fichier `.env.example`, utiliser `npm run build:web` comme commande de build et `dist` comme répertoire de sortie.
- Pour Vercel, le fichier `vercel.json` du dépôt configure le fallback des routes Expo Router.

Le déploiement public n'est pas encore activé : il nécessite de connecter un compte d'hébergement et de renseigner la configuration Firebase. Aucun jeton ni identifiant de déploiement ne doit être ajouté au dépôt.

## Configuration locale

1. Installer Node.js 20 ou 22.
2. Cloner le dépôt et installer les dépendances :

   ```bash
   npm install
   ```

3. Créer une application Web dans la console Firebase, activer Authentication > E-mail/Mot de passe et créer une base Cloud Firestore.
4. Copier `.env.example` vers `.env` et renseigner les valeurs de configuration Firebase :

   ```bash
   cp .env.example .env
   ```

   Les variables `EXPO_PUBLIC_*` sont intégrées au client mobile : elles ne doivent jamais contenir de secret privé. Restreindre la clé API selon les possibilités de Firebase.

5. Déployer les règles et index Firestore :

   ```bash
   firebase deploy --only firestore:rules,firestore:indexes
   ```

6. Démarrer l'application :

   ```bash
   npx expo start
   ```

## Cloudinary

Créer un preset de téléversement non signé dans Cloudinary et renseigner `EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME` et `EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET`. Ne jamais placer la clé secrète API Cloudinary dans l'application mobile. Les médias doivent être limités par le preset et les quotas du compte.

## Vérifications

```bash
npm run typecheck
```

Le workflow GitHub Actions exécute le contrôle TypeScript et génère la version Web à chaque mise à jour de la branche de développement.

## État fonctionnel — transparence

Déjà relié au backend :
- Inscription, connexion, réinitialisation du mot de passe et persistance de session Firebase.
- Écoute temps réel des conversations du membre connecté.
- Recherche de profils par préfixe de nom.
- Création de discussions individuelles.
- Écoute des messages et envoi de texte.

Pas encore livré / à tester avant toute mise en production :
- Appels audio/vidéo, statuts, communautés, notifications push.
- Envoi de médias depuis l'interface, même si le module Cloudinary existe.
- Accusés de réception, présence et compteurs de non-lus fiables.
- Chiffrement de bout en bout : **les messages ne sont pas actuellement chiffrés de bout en bout**.
- Tests sur appareils réels, tests de règles Firestore et audit de sécurité.

Cette liste évite de présenter des boutons ou des éléments d'interface comme des fonctionnalités terminées.
