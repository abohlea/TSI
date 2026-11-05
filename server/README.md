# TSI Field Test Server — Firebase et Cloudinary locaux

Le serveur Colyseus de test authentifie chaque connexion avec un **Firebase ID token**. Le navigateur crée ou reprend une session Firebase anonyme ; le serveur Admin vérifie le jeton et initialise les documents de profil dans l'émulateur Firestore.

Cloudinary est intégré pour le premier cas d'usage : **l'avatar de joueur**. Le client demande une signature au Media API local, téléverse directement l'image vers Cloudinary, puis le serveur vérifie l'asset auprès de Cloudinary et enregistre sa référence dans `playerProfiles/{uid}.avatar`.

> Cette configuration reste réservée au développement local. Le serveur Colyseus et le Media API écoutent sur `127.0.0.1`, le mode production est bloqué et les émulateurs Firebase sont obligatoires. Ne publie pas ces services sur Internet.

## Prérequis

- Node.js 22 ou supérieur
- npm
- Java 21 ou supérieur pour l'émulateur Firestore
- Un environnement Cloudinary (les valeurs de compte sont facultatives pour exécuter les tests, mais nécessaires pour téléverser réellement)

## 1. Démarrer les émulateurs Firebase

Depuis la racine du dépôt :

```bash
cd backend/firebase
npm install
npx firebase --config ../../firebase.json emulators:start --project demo-tsi-local --only auth,firestore
```

Les ports utilisés sont Auth `9099` et Firestore `8080`. L'interface Emulator Suite est disponible sur `http://127.0.0.1:4000`.

## 2. Configurer Cloudinary

Dans la console Cloudinary :

1. Ouvre **Settings → Upload → Upload presets**.
2. Crée un preset nommé par exemple `tsi_player_avatar_signed`.
3. Choisis le mode **Signed**.
4. Restreins les formats autorisés à `jpg`, `jpeg` et `png` (et `webp` si disponible dans ton environnement).
5. Configure le type de ressource comme image et, si souhaité, une transformation entrante pour normaliser les avatars.
6. Enregistre le preset, puis récupère le Cloud name et l'API Key dans la console API Keys.

**Important : Cloudinary indique que les upload presets ne prennent pas en charge une limite de taille de fichier par preset.** Le client TSI bloque les fichiers de plus de 5 Mio pour l'expérience utilisateur et le serveur revérifie la taille après upload avant d'enregistrer l'avatar dans Firestore. Un fichier trop volumineux peut donc avoir déjà été transféré et consommer des crédits avant d'être rejeté ; ce flux direct ne suffit pas à garantir un plafond de coût. Un contrôle strict avant transfert (proxy serveur à taille bornée ou mécanisme équivalent) reste requis avant production.

Dans `server/.env` (copie locale de `.env.example`), renseigne :

```dotenv
CLOUDINARY_CLOUD_NAME=ton_cloud_name
CLOUDINARY_API_KEY=ta_cle_api
CLOUDINARY_API_SECRET=ton_secret_api
CLOUDINARY_UPLOAD_PRESET=tsi_player_avatar_signed
MEDIA_API_PORT=2568
MEDIA_API_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

**Le secret API Cloudinary reste exclusivement côté serveur.** Ne le place jamais dans `game-client/.env.local`, une variable `VITE_*`, le code client ou Git. Le Media API reste désactivé tant que les quatre variables Cloudinary ne sont pas renseignées. Une configuration partielle provoque une erreur au démarrage.

## 3. Démarrer le serveur Colyseus et le Media API

Dans un deuxième terminal :

```bash
cd server
npm install
cp .env.example .env
# Renseigne les quatre variables Cloudinary décrites plus haut dans .env
npm run check
npm test
npm run dev
```

Le fichier `.env.example` configure les émulateurs Firebase. Aucun compte de service ni clé privée Firebase n'est requis en mode local.

- Colyseus : `ws://127.0.0.1:2567`
- Media API : `http://127.0.0.1:2568`

## 4. Démarrer le client PlayCanvas

Dans un troisième terminal :

```bash
cd game-client
npm install
cp .env.example .env.local
npm run build
npm run dev
```

Le client utilise `VITE_TSI_MEDIA_API_URL=http://127.0.0.1:2568`. Le module `src/media/cloudinaryMedia.ts` expose `uploadPlayerAvatar(file, identity)` pour l'écran de profil à venir. Il vérifie le type MIME et la taille avant upload ; ces vérifications client ne remplacent pas les contrôles serveur.

## Flux d'upload d'avatar

1. Le client demande `POST /v1/media/avatar/signature` avec le Firebase ID token dans `Authorization: Bearer …`.
2. Le serveur vérifie le token, l'état actif du compte, applique une limite de signatures et crée un `public_id` unique sous `tsi/players/{uid-encodé}/avatars/`.
3. Le serveur signe les paramètres avec le SDK Cloudinary ; seul le client reçoit la signature temporaire, l'API Key et l'URL d'upload.
4. Le navigateur envoie le fichier directement à l'API Upload Cloudinary. Le serveur TSI ne relaie donc pas les octets du fichier.
5. Le client confirme `asset_id` et `public_id` via `POST /v1/media/avatar/confirm`.
6. Le serveur relit la ressource dans l'API Admin Cloudinary, vérifie l'UID propriétaire, le cloud d'origine, les identifiants, le type image, le format, les dimensions et la taille, puis écrit `playerProfiles/{uid}.avatar` dans Firestore avec Admin SDK.
7. Si le fichier ne respecte pas la politique TSI, le serveur tente de supprimer cet asset de Cloudinary avant de refuser l'enregistrement Firestore.

La réponse n'est donc pas acceptée sur la seule base de valeurs déclarées par le navigateur. Les avatars enregistrés sont limités à JPG/JPEG/PNG/WebP, 5 Mio maximum et 4096 × 4096 pixels maximum. Le point de terminaison de signature est limité à 8 signatures par joueur et par minute dans ce serveur de préproduction.

## Documents Firestore

Au premier accès d'un UID Firebase, le serveur crée avec le SDK Admin :

- `users/{uid}` : nom d'affichage, statut de compte, dates de création et mise à jour ;
- `playerProfiles/{uid}` : nom public et niveau initial ;
- `progression/{uid}` : niveau et expérience initiale.

Après confirmation d'un avatar, `playerProfiles/{uid}.avatar` conserve `assetId`, `publicId`, `secureUrl`, format, dimensions et taille. Le client ne peut pas écrire ce champ directement. Les écritures Admin contournent les règles Firestore et restent strictement côté serveur.

## Sécurité et limites

- Le client ne reçoit que la configuration publique Cloudinary (Cloud name/API Key) et une signature à durée limitée ; aucun API Secret.
- Le serveur vérifie la signature, l'expiration et la révocation du Firebase token avec `verifyIdToken(token, true)`.
- Les uploads sont liés à l'UID authentifié ; l'UID Firebase est encodé pour former un chemin Cloudinary sûr.
- Les origines navigateur sont limitées par `MEDIA_API_ALLOWED_ORIGINS`.
- Le serveur vérifie à nouveau la ressource via l'API Admin Cloudinary avant écriture Firestore.
- Le serveur refuse le mode production et les émulateurs ne doivent jamais être activés en production.
- Le module actuel couvre uniquement les avatars. Les bannières, captures, clips vidéo, assets officiels du jeu, modération complète et suppression d'anciens médias nécessitent des politiques séparées.
- Pour un futur serveur hébergé, utiliser Application Default Credentials / une identité de charge de travail Firebase plutôt qu'une clé JSON committée et stocker les secrets Cloudinary dans un gestionnaire de secrets.
- L'authentification anonyme est une identité de préproduction. Avant le lancement, il faudra proposer une méthode de connexion durable et permettre de lier la session anonyme au compte permanent du joueur.

La CI valide les types et les tests de paramètres/signatures sans contacter ton compte Cloudinary. Un upload réel ne sera vérifié qu'après configuration des quatre variables dans un environnement local contrôlé.
