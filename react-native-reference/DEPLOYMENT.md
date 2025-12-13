# 📱 Guide de Déploiement EVEX Ticket

## Table des matières
1. [Préparation avant déploiement](#préparation)
2. [Build iOS](#build-ios)
3. [Build Android](#build-android)
4. [Publication sur les stores](#publication-stores)
5. [OTA Updates avec Expo](#ota-updates)

---

## Préparation

### 1. Créer les assets nécessaires

#### Icon (1024x1024 px)
Créez un fichier `assets/icon.png` avec le logo EVEX sur fond bleu #0A84FF

#### Splash Screen (1242x2436 px)
Créez un fichier `assets/splash.png` avec le logo EVEX centré sur fond blanc

#### Adaptive Icon Android (1024x1024 px)
Créez `assets/adaptive-icon.png` - partie visible de l'icône (108x108 dp safe zone)

### 2. Installer EAS CLI (Expo Application Services)

```bash
npm install -g eas-cli
```

### 3. Login Expo

```bash
eas login
```

### 4. Configurer le projet

```bash
eas build:configure
```

Cela créera un fichier `eas.json`:

```json
{
  "cli": {
    "version": ">= 5.9.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

---

## Build iOS

### Prérequis
- Compte Apple Developer (99$/an)
- Mac avec Xcode installé (pour build local) OU utiliser EAS Build (cloud)

### Option 1: EAS Build (Recommandé - Pas besoin de Mac)

```bash
# Build pour TestFlight (beta testing)
eas build --platform ios --profile preview

# Build pour production App Store
eas build --platform ios --profile production
```

### Option 2: Build Local (nécessite un Mac)

```bash
# Installer les dépendances
npx pod-install

# Build de développement
npx expo run:ios

# Build de production
eas build --platform ios --profile production --local
```

### Configuration Apple Developer

1. **Créer un App ID**
   - Aller sur [Apple Developer](https://developer.apple.com)
   - Certificates, IDs & Profiles → Identifiers
   - Créer un App ID: `com.evex.ticket`

2. **Créer un Provisioning Profile**
   - Production: App Store
   - Development: Development

3. **Créer l'app sur App Store Connect**
   - [App Store Connect](https://appstoreconnect.apple.com)
   - My Apps → + → New App
   - Bundle ID: `com.evex.ticket`

### Soumettre à l'App Store

```bash
eas submit --platform ios
```

---

## Build Android

### Option 1: EAS Build (Recommandé)

```bash
# Build APK pour tests
eas build --platform android --profile preview

# Build AAB pour Google Play Store
eas build --platform android --profile production
```

### Option 2: Build Local

```bash
# Build de développement
npx expo run:android

# Build de production (AAB)
cd android
./gradlew bundleRelease

# Build APK
./gradlew assembleRelease
```

Le fichier sera dans:
- AAB: `android/app/build/outputs/bundle/release/app-release.aab`
- APK: `android/app/build/outputs/apk/release/app-release.apk`

### Configuration Google Play Console

1. **Créer un Keystore (première fois seulement)**

EAS gère automatiquement les keystores. Mais si vous voulez créer manuellement:

```bash
keytool -genkeypair -v -storetype PKCS12 -keystore evex-upload-key.keystore -alias evex-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

2. **Créer l'app sur Google Play Console**
   - [Google Play Console](https://play.google.com/console)
   - Créer une application
   - Nom: EVEX Ticket
   - Package: `com.evex.ticket`

### Soumettre à Google Play

```bash
eas submit --platform android
```

---

## Publication Stores

### App Store (iOS)

1. **Informations requises:**
   - Nom: EVEX Ticket
   - Sous-titre: Réservation de bus au Togo
   - Description détaillée
   - Mots-clés: bus, togo, transport, réservation, ticket
   - Captures d'écran: 6.5", 5.5", 12.9" iPad
   - Catégorie: Voyages
   - Âge: 4+

2. **Checklist:**
   - ✅ Privacy Policy URL
   - ✅ Support URL
   - ✅ Marketing URL (optionnel)
   - ✅ Screenshots (5-10 par taille)
   - ✅ App Preview vidéo (optionnel mais recommandé)

3. **Soumettre pour review:**
   - Temps de review: 24-48h généralement
   - Préparer réponse pour questions Apple

### Google Play Store (Android)

1. **Informations requises:**
   - Titre: EVEX Ticket
   - Description courte (80 caractères max)
   - Description complète (4000 caractères max)
   - Screenshots: Phone, 7" Tablet, 10" Tablet
   - Feature Graphic (1024x500)
   - Icône haute résolution (512x512)

2. **Checklist:**
   - ✅ Privacy Policy URL
   - ✅ Content rating questionnaire
   - ✅ Target audience et contenu
   - ✅ Store listing
   - ✅ Prix et distribution (pays)

3. **Tests:**
   - Internal testing → Closed testing → Open testing → Production
   - Minimum 20 testeurs pour 14 jours avant production

---

## OTA Updates avec Expo

Les Over-The-Air updates permettent de mettre à jour l'app sans passer par les stores!

### Configuration

```bash
# Installer
npm install -g expo-cli

# Publier une mise à jour
eas update --branch production --message "Fix bugs"
```

### Limitations OTA
✅ **Peut être mis à jour OTA:**
- Code JavaScript/TypeScript
- Assets (images, fonts)
- Styles et UI
- Logic métier

❌ **Nécessite rebuild:**
- Dépendances natives
- Permissions dans app.json
- Plugins Expo
- Version iOS/Android

### Stratégie de branches

```bash
# Développement
eas update --branch development

# Staging
eas update --branch staging

# Production
eas update --branch production
```

---

## Checklist finale avant lancement

### Technique
- [ ] Tester sur iOS réel (iPhone 12+, iOS 15+)
- [ ] Tester sur Android réel (Samsung, Pixel, Xiaomi)
- [ ] Tester les paiements en mode production
- [ ] Vérifier les permissions (caméra, stockage)
- [ ] Tester offline mode si applicable
- [ ] Performance: app < 50 MB, cold start < 3s
- [ ] Crash reporting configuré (Sentry, Crashlytics)
- [ ] Analytics configuré (Google Analytics, Mixpanel)

### Légal & Privacy
- [ ] Privacy Policy rédigée et hébergée
- [ ] Terms & Conditions rédigés
- [ ] RGPD compliance (si Europe)
- [ ] Mentions légales
- [ ] Déclaration CNIL si nécessaire

### Marketing
- [ ] Page web de landing
- [ ] Présence sur réseaux sociaux
- [ ] Screenshots professionnels
- [ ] Vidéo démo (30-60s)
- [ ] Press kit prêt

### Monitoring
- [ ] Backend monitoring (Uptime)
- [ ] Error tracking (Sentry)
- [ ] Analytics (Firebase, Mixpanel)
- [ ] Performance monitoring
- [ ] User feedback système

---

## Commandes utiles

```bash
# Voir les builds
eas build:list

# Voir les updates
eas update:list

# Rollback un update
eas update:rollback

# Télécharger un build
eas build:download --platform ios

# Logs en temps réel
eas build:view --platform android

# Tester avant build
npx expo-doctor

# Nettoyer le cache
npx expo start -c
```

---

## Support & Ressources

- [Documentation Expo](https://docs.expo.dev)
- [EAS Build](https://docs.expo.dev/build/introduction/)
- [EAS Submit](https://docs.expo.dev/submit/introduction/)
- [App Store Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Policies](https://play.google.com/about/developer-content-policy/)

---

## Coûts estimés

| Service | Coût | Fréquence |
|---------|------|-----------|
| Apple Developer | $99 | /an |
| Google Play Console | $25 | Une fois |
| Expo EAS (Production) | $29-$99 | /mois |
| Serveur Backend (Supabase) | $0-$25 | /mois |
| **TOTAL première année** | **~$500-1200** | - |

---

Bon déploiement ! 🚀
