# TSI Field Test — Android

Cette application Android encapsule le prototype web PlayCanvas avec Capacitor. Elle sert au test du prototype local (terrain, déplacement, caméra, tir et commandes tactiles), pas au multijoueur public.

## Générer l'APK

Le workflow GitHub Actions **Build Android APK** construit automatiquement une APK de débogage à chaque push sur `build/android-field-test-apk` (si les fichiers du prototype changent), ou manuellement depuis l'onglet Actions.

Après réussite du workflow :
1. Ouvrir le run GitHub Actions.
2. Télécharger l'artifact `tsi-field-test-android-debug`.
3. Extraire `app-debug.apk` et transférer le fichier sur le téléphone Android.
4. Autoriser temporairement l'installation depuis cette source si Android le demande.

## Construction locale

Prérequis : Node.js 22.12+, JDK 21, Android SDK et Android Studio.

```bash
cd prototype
npm install
npm run build
npx cap add android
npx cap sync android
cd android
./gradlew assembleDebug
```

APK : `prototype/android/app/build/outputs/apk/debug/app-debug.apk`.

## Limites de cette version

- APK de débogage, non signée pour une publication Play Store.
- Mode d'entraînement local uniquement ; le serveur multijoueur n'est pas inclus.
- Le rendu et les performances doivent être vérifiés sur des appareils Android réels.
- Cette génération crée le projet Android dans l'environnement CI ; elle ne modifie pas le dépôt avec un dossier Android généré.
