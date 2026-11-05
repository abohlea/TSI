# ADR-005 — Uploads Cloudinary signés pour les médias de joueur

- **Statut :** adopté pour la préproduction, non validé en production
- **Date :** 5 novembre 2026
- **Contexte :** TSI utilise Firebase Authentication et Cloud Firestore pour l'identité et les données persistantes. Le client PlayCanvas doit pouvoir téléverser des images sans recevoir le secret API Cloudinary.

## Décision

1. Le premier cas d'usage est l'avatar de joueur uniquement.
2. Le client envoie un Firebase ID token au Media API TSI local.
3. Le serveur vérifie le token avec Firebase Admin et contrôle le statut actif du compte.
4. Le serveur génère un `public_id` unique sous `tsi/players/{uid-encodé}/avatars/` et signe les paramètres Cloudinary avec le SDK Node.js.
5. Le client téléverse le fichier directement vers l'Upload API Cloudinary ; les octets ne transitent pas par le serveur de jeu.
6. Après l'upload, le serveur interroge l'API Admin Cloudinary, vérifie l'asset et enregistre ses identifiants et son URL HTTPS dans `playerProfiles/{uid}.avatar`.
7. Le secret API Cloudinary reste dans l'environnement serveur. Le client ne reçoit que Cloud name, API Key et signature temporaire.
8. Le service local est désactivé quand les variables Cloudinary ne sont pas renseignées, écoute sur `127.0.0.1` et refuse le démarrage en mode production.

## Politique initiale d'avatar

- Ressource : `image`.
- Formats : JPG, JPEG, PNG et WebP.
- Taille maximale enregistrée dans le profil : 5 Mio.
- Dimensions maximales enregistrées : 4096 × 4096.
- Upload preset requis : signé, avec `allowed_formats` restreint aux formats autorisés.
- Préfixe de stockage : `tsi/players/{uid-encodé}/avatars/`.
- Limite de signature : 8 par joueur et par minute dans le processus local.
- Origines Web autorisées : localhost et 127.0.0.1 sur le port Vite 5173 par défaut.

**Limite importante :** Cloudinary précise que les upload presets ne prennent pas en charge une limite de taille de fichier par preset. La limite de 5 Mio est donc vérifiée côté client pour l'ergonomie puis après upload côté serveur avant écriture dans Firestore. Le serveur tente de supprimer un asset invalide, mais le transfert a déjà eu lieu et peut avoir consommé des crédits. Un upload direct ne constitue pas une garantie de dépense maximale ; il faut un proxy à taille bornée ou un contrôle d'upload équivalent avant production.

## Raisons

- Le secret API ne quitte jamais le serveur.
- Les fichiers n'occupent pas la bande passante du serveur de partie.
- Les répertoires sont isolés par UID Firebase sans supposer le format de l'UID.
- Une vérification Admin Cloudinary est faite avant d'écrire la référence dans Firestore.
- Les métadonnées stockées dans Firestore restent petites ; les fichiers binaires restent dans Cloudinary.

## Limites non couvertes

- Aucun projet Cloudinary réel ni aucun secret n'a été configuré dans ce dépôt.
- L'intégration n'a pas encore effectué d'upload réel ; la CI peut uniquement tester les paramètres et la génération de signature.
- Pas encore d'interface de sélection/aperçu d'avatar dans le jeu.
- Pas encore de suppression de l'ancien avatar, de quota de stockage par compte, de modération ni de flux de contestation.
- Les bannières, captures, clips vidéo, audio et assets officiels nécessitent des presets, formats, budgets et permissions distincts.
- Le Media API local ne constitue pas un endpoint de production : il n'a pas encore de déploiement public, d'anti-abus distribué, d'App Check ni de supervision.

## Sécurité opérationnelle

- Ne jamais committer `CLOUDINARY_API_SECRET`, un `.env` réel ou des jetons Firebase.
- Ne jamais définir le secret avec un préfixe `VITE_`.
- Restreindre le preset Cloudinary aux formats, tailles et ressources nécessaires.
- Configurer des origines CORS explicites pour chaque environnement.
- Avant la production, utiliser TLS, secrets gérés, rate limit distribué, journalisation structurée, App Check selon plateformes et validation des coûts/quotas.
- Les coûts Cloudinary et les crédits mensuels doivent être surveillés ; aucun plan payant n'est activé par cette intégration.

## Références officielles

- [Cloudinary — Authentication signatures](https://cloudinary.com/documentation/authentication_signatures)
- [Cloudinary — Upload API](https://cloudinary.com/documentation/image_upload_api_reference)
- [Cloudinary — Upload presets](https://cloudinary.com/documentation/upload_presets)
- [Cloudinary Node.js SDK](https://www.npmjs.com/package/cloudinary)
