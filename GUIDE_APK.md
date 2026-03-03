# 📱 Guide : Générer votre premier APK Android

Ce guide explique comment générer un APK Android à partir de l'application React **PelletsFun** en utilisant **Capacitor** (Ionic).

## 📋 Prérequis

Avant de commencer, assurez-vous d'avoir installé :

1. **Node.js** (v18 ou supérieur) — [nodejs.org](https://nodejs.org)
2. **Java Development Kit (JDK) 17** — [adoptium.net](https://adoptium.net)
3. **Android Studio** — [developer.android.com/studio](https://developer.android.com/studio)
   - Pendant l'installation, cocher : Android SDK, Android SDK Platform, Android Virtual Device
4. **Variables d'environnement Android** à configurer :

   **Linux/macOS** (`~/.bashrc` ou `~/.zshrc`) :
   ```bash
   export ANDROID_HOME=$HOME/Android/Sdk
   export PATH=$PATH:$ANDROID_HOME/emulator
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   ```

   **Windows** (Variables d'environnement système) :
   ```
   ANDROID_HOME = C:\Users\<Utilisateur>\AppData\Local\Android\Sdk
   PATH += %ANDROID_HOME%\platform-tools
   ```

---

## 🚀 Étapes pour générer l'APK

### Étape 1 — Installer les dépendances

```bash
cd client
npm install
```

### Étape 2 — Initialiser la plateforme Android (une seule fois)

```bash
npm run android:add
```

> Cette commande crée le répertoire `android/` dans le dossier `client/`.

### Étape 3 — Construire l'application React et synchroniser avec Android

```bash
npm run android:sync
```

Cette commande :
- Compile l'application React (`npm run build`)
- Copie le build dans le projet Android (`npx cap sync android`)

### Étape 4 — Ouvrir Android Studio

```bash
npm run android:open
```

Android Studio s'ouvre avec le projet Android.

### Étape 5 — Générer l'APK dans Android Studio

Dans Android Studio :

1. Cliquer sur **Build** (menu du haut)
2. Cliquer sur **Build Bundle(s) / APK(s)**
3. Cliquer sur **Build APK(s)**
4. Attendre la compilation...
5. Cliquer sur **Locate** dans la notification pour trouver l'APK

> L'APK se trouve généralement dans :
> `client/android/app/build/outputs/apk/debug/app-debug.apk`

---

## ⚡ Commande tout-en-un (Linux/macOS)

Pour construire et générer l'APK debug en une seule commande :

```bash
cd client
npm run android:build
```

> Cette commande exécute : build React → sync Capacitor → Gradle assembleDebug
>
> ⚠️ **Windows** : utilisez `android:sync` puis ouvrez Android Studio avec `android:open` pour lancer le build Gradle.

---

## 🔑 APK de Release (signé)

Pour générer un APK signé pour publier sur le Google Play Store :

1. Dans Android Studio : **Build → Generate Signed Bundle / APK**
2. Sélectionner **APK**
3. Créer ou utiliser un **keystore existant**
4. Remplir les informations de signature
5. Sélectionner le variant **release**
6. Cliquer sur **Finish**

---

## 📲 Installer l'APK sur un téléphone Android

### Via câble USB :
```bash
adb install client/android/app/build/outputs/apk/debug/app-debug.apk
```

### Via fichier :
1. Copier l'APK sur le téléphone
2. Activer l'installation de sources inconnues dans les paramètres Android
3. Ouvrir l'APK depuis le gestionnaire de fichiers

---

## 🔧 Configuration de l'application

La configuration Capacitor se trouve dans `client/capacitor.config.json` :

```json
{
  "appId": "fr.harmonixe.pelletsfun",
  "appName": "PelletsFun",
  "webDir": "build"
}
```

- **appId** : Identifiant unique de l'application (format reverse domain)
- **appName** : Nom affiché sur le téléphone
- **webDir** : Répertoire du build React

---

## ❓ Problèmes courants

| Problème | Solution |
|----------|----------|
| `ANDROID_HOME not set` | Configurer la variable d'environnement ANDROID_HOME |
| `SDK not found` | Ouvrir Android Studio → SDK Manager → installer Android SDK |
| `Gradle build failed` | Ouvrir Android Studio et synchroniser le projet Gradle |
| `adb not found` | Ajouter `platform-tools` au PATH |

---

## 📚 Ressources

- [Documentation Capacitor](https://capacitorjs.com/docs)
- [Guide Android Capacitor](https://capacitorjs.com/docs/android)
- [Android Studio](https://developer.android.com/studio)
