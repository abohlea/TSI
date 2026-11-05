# TSI Field Test — Android (production prototype branch)

Cette application encapsule le client PlayCanvas de la branche active `production/aaa-character-pipeline` avec Capacitor.

## Génération

Le workflow GitHub Actions **Build Android APK** se déclenche sur les changements du client dans `build/android-production-field-test` ou manuellement depuis Actions.

Après réussite, télécharger l'artifact `tsi-production-field-test-android-debug` et extraire `app-debug.apk`.

## Portée réelle

- Inclut le client PlayCanvas du prototype de production, les commandes tactiles et l'intégration Colyseus/Firebase côté code.
- Le mode entraînement local peut être essayé sans serveur public.
- Le PvP en réseau n'est pas prêt sur un téléphone hors réseau local tant qu'un serveur Colyseus accessible publiquement et une configuration Firebase réelle ne sont pas fournis.
- Les variables de `.env.example` sont des exemples locaux : `localhost` sur Android désigne le téléphone, pas l'ordinateur qui héberge un serveur.
- Aucun secret Firebase Admin, clé privée ou secret Cloudinary ne doit être ajouté au client ou au dépôt.

## Limites

APK de débogage destinée aux essais, non signée pour Play Store. Les performances, les commandes et la connexion doivent être validées sur des appareils Android physiques. La création de l'APK ne constitue pas une validation de session multijoueur.
