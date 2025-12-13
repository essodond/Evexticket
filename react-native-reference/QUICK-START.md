# 🚀 EVEX Ticket - Démarrage Rapide

## Installation en 5 minutes

### 1️⃣ Créer le projet

```bash
# Créer un nouveau projet Expo
npx create-expo-app evex-ticket
cd evex-ticket
```

### 2️⃣ Installer toutes les dépendances

Copiez-collez cette commande complète:

```bash
npx expo install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs react-native-screens react-native-safe-area-context react-native-gesture-handler react-native-reanimated @react-native-async-storage/async-storage @react-native-community/datetimepicker expo-linear-gradient @expo/vector-icons && npm install react-native-qrcode-svg react-native-svg
```

### 3️⃣ Copier les fichiers

```bash
# Depuis le dossier react-native-reference, copier:
# - App.tsx → remplacer le App.tsx existant
# - src/ → créer le dossier src/ avec tout son contenu
# - app.json → fusionner avec l'existant
# - babel.config.js → remplacer l'existant
```

### 4️⃣ Configurer Babel

Éditez `babel.config.js`:

```javascript
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin', // Important: doit être en dernier!
    ],
  };
};
```

### 5️⃣ Lancer l'application

```bash
# Nettoyer le cache et démarrer
npx expo start -c

# Ou directement sur iOS
npx expo start --ios

# Ou directement sur Android
npx expo start --android

# Ou scan QR code avec Expo Go app
```

---

## Structure du projet créé

```
evex-ticket/
├── App.tsx                          # ✅ Point d'entrée
├── app.json                         # ✅ Config Expo
├── package.json                     # ✅ Dépendances
├── babel.config.js                  # ✅ Config Babel + Reanimated
├── tsconfig.json                    # Config TypeScript
└── src/
    ├── navigation/
    │   └── AppNavigator.tsx        # ✅ Navigation principale
    ├── screens/                     # ✅ Tous les écrans
    │   ├── SplashScreen.tsx
    │   ├── OnboardingScreen.tsx
    │   ├── PublicHomeScreen.tsx
    │   ├── AuthScreen.tsx
    │   ├── HomeConnectedScreen.tsx
    │   ├── TripDetailsScreen.tsx
    │   ├── PaymentScreen.tsx
    │   ├── TicketScreen.tsx
    │   ├── MyTicketsScreen.tsx
    │   └── ProfileScreen.tsx
    ├── components/                  # ✅ Composants réutilisables
    │   ├── Button.tsx
    │   ├── Input.tsx
    │   └── TripCard.tsx
    ├── constants/                   # ✅ Constantes
    │   ├── colors.ts
    │   └── fonts.ts
    ├── types/                       # ✅ Types TypeScript
    │   └── index.ts
    └── utils/                       # ✅ Utilitaires
        └── mockData.ts
```

---

## Tester sur appareil physique

### iOS (iPhone/iPad)

1. **Télécharger Expo Go**
   - App Store → rechercher "Expo Go"
   - Installer l'application

2. **Scanner le QR code**
   - Lancer `npx expo start`
   - Ouvrir l'app Caméra
   - Scanner le QR code affiché dans le terminal
   - L'app s'ouvrira dans Expo Go

### Android

1. **Télécharger Expo Go**
   - Google Play Store → rechercher "Expo Go"
   - Installer l'application

2. **Scanner le QR code**
   - Lancer `npx expo start`
   - Ouvrir Expo Go
   - Appuyer sur "Scan QR code"
   - Scanner le code affiché dans le terminal

---

## Problèmes courants et solutions

### ❌ Erreur: "Unable to resolve module"

```bash
# Solution: Nettoyer et réinstaller
rm -rf node_modules
npm install
npx expo start -c
```

### ❌ Erreur: "Reanimated 2 failed to create a worklet"

```bash
# Vérifier que babel.config.js contient:
plugins: ['react-native-reanimated/plugin']

# Puis nettoyer:
npx expo start -c
```

### ❌ Erreur: "Metro bundler crashing"

```bash
# Augmenter la limite de watchers (Linux/Mac):
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

### ❌ L'app est lente sur Android

```bash
# Activer Hermes (déjà activé par défaut dans Expo 49+)
# Vérifier dans app.json:
"android": {
  "jsEngine": "hermes"
}
```

### ❌ Images ne se chargent pas

Les URLs Unsplash peuvent expirer. Remplacez-les par vos propres images:

```typescript
// Dans src/screens/*Screen.tsx
// Remplacer les URLs Unsplash par:
require('../assets/images/your-image.jpg')
```

---

## Personnalisation rapide

### Changer les couleurs

Éditez `src/constants/colors.ts`:

```typescript
export const COLORS = {
  primary: '#0A84FF',        // ← Votre couleur principale
  primaryDark: '#0066CC',    // ← Version foncée
  // ... etc
};
```

### Changer le logo

1. Créez votre logo (format PNG, fond transparent)
2. Remplacez dans:
   - `assets/icon.png` (1024x1024)
   - `assets/splash.png` (1242x2436)
   - `assets/adaptive-icon.png` (1024x1024)

### Modifier les données de test

Éditez `src/utils/mockData.ts`:

```typescript
export const mockTrips: Trip[] = [
  {
    id: '1',
    company: 'Votre Compagnie',
    from: 'Votre Ville',
    // ... vos données
  },
];
```

---

## Commandes essentielles

```bash
# Démarrer en mode développement
npx expo start

# Démarrer et ouvrir iOS simulator
npx expo start --ios

# Démarrer et ouvrir Android emulator
npx expo start --android

# Nettoyer le cache
npx expo start -c

# Voir les logs détaillés
npx expo start --dev-client

# Créer un build de développement
eas build --profile development --platform ios

# Publier une mise à jour OTA
eas update --branch production
```

---

## Prochaines étapes

1. **Remplacer les images mock** par vos vraies images
2. **Connecter à un backend** (voir README.md pour Supabase)
3. **Intégrer vrais paiements** (Flooz, TMoney APIs)
4. **Ajouter des notifications push** (Expo Notifications)
5. **Tester sur vrais appareils** (amis, famille)
6. **Préparer les screenshots** pour les stores
7. **Déployer** (voir DEPLOYMENT.md)

---

## Ressources utiles

- 📖 [Documentation Expo](https://docs.expo.dev)
- 🎨 [React Navigation](https://reactnavigation.org)
- 🎬 [Reanimated Docs](https://docs.swmansion.com/react-native-reanimated/)
- 💬 [Discord Expo](https://chat.expo.dev)
- 🐛 [GitHub Issues](https://github.com/expo/expo/issues)

---

## Support

Si vous rencontrez des problèmes:

1. Vérifiez la [documentation Expo](https://docs.expo.dev)
2. Recherchez sur [Stack Overflow](https://stackoverflow.com/questions/tagged/expo)
3. Demandez sur le [Discord Expo](https://chat.expo.dev)
4. Consultez les [GitHub Issues](https://github.com/expo/expo/issues)

---

**Bon développement! 🎉**

Si tout fonctionne, vous devriez voir le splash screen EVEX, puis l'onboarding en 3 écrans!
