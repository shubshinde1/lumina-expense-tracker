# 🔄 Syncing your Mobile App (Capacitor)

This project uses **Capacitor** to run your `apps/web` (Next.js) code as a native Android app.

## 🚀 How to update the App:
Whenever you change your code in **`src/`**, run these commands in **`apps/web`**:

```bash
cd apps/web
npm run build
npx cap sync
```

---

## 🛠️ Build Status:
*   **Android Folder**: `apps/web/android/`
*   **AGP Version**: `8.10.0` (Stable)
*   **Target Android SDK**: `35` (Android 15)
*   **Package Name**: `com.lumina.tracker`

---

## 📂 To find your APK:
1. Open **Android Studio**.
2. Click **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**.
3. Once the build finishes, look for the **"Locate"** link in the popup at the bottom right.
