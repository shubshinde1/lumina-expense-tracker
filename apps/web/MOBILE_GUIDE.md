# 📱 Lumina Mobile (Capacitor) Guide

This guide explains how to manage, update, and build the Lumina Android app using Capacitor.

---

## 🚀 Daily Update Workflow
Since the Android app is a wrapper for your web project, follow these steps to sync changes:

1. **Modify Web Code**: Edit files in `apps/web/src`.
2. **Build the Web App**:
   ```bash
   cd apps/web
   npm run build
   ```
3. **Sync to Android**:
   ```bash
   npx cap sync
   ```
4. **Run on Device**:
   Open Android Studio and click the **Run** button (green arrow).

---

## 🛠️ Trouble-Shooting & Config
If you encounter Gradle errors like "AGP version incompatible":

### Fixed AGP & Gradle Versions
We have locked these versions to ensure stability on standard Android Studio installs:
- **Android Gradle Plugin (AGP)**: `8.10.0` (Set in `android/build.gradle`)
- **Gradle Wrapper**: `8.10.2` (Set in `android/gradle/wrapper/gradle-wrapper.properties`)
- **Target/Compile SDK**: `35` (Android 15)

### Re-initializing from scratch
If the `android` folder ever gets corrupted:
```bash
rm -rf android
npx cap add android
# Note: You may need to re-apply the AGP 8.10.0 downgrade in build.gradle after this.
```

---

## 📦 Building for Production (APK)
1. **Open Android Studio**: `npx cap open android`.
2. Go to **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**.
3. Once finished, click the **Locate** link in the popup to find your `app-debug.apk` or `app-release.apk`.

---

## ⚙️ Native Customizations
- **App Icon**: Use `capacitor-assets` or manually replace files in `android/app/src/main/res/`.
- **App Name**: Edit `app_name` in `android/app/src/main/res/values/strings.xml`.
- **Package ID**: `com.lumina.tracker`
