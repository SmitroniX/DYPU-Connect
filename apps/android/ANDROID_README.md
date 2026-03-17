# 📱 DYPU Connect — Android App

Native Android wrapper for the DYPU Connect web app using WebView.

---

## Architecture

This is a **WebView wrapper** (not a full native rebuild). It loads your deployed Next.js web app inside an Android WebView with native integrations for:

| Feature | How it works |
|---------|-------------|
| **Firebase Email Link Auth** | Deep links intercepted via intent-filter → loaded in WebView |
| **WebRTC Video Calls** | Native camera/mic permissions granted to WebView |
| **File Upload** | Native file picker + camera capture via `onShowFileChooser` |
| **Downloads** | Android `DownloadManager` handles file downloads |
| **Pull-to-Refresh** | `SwipeRefreshLayout` wrapping WebView |
| **Back Navigation** | Native back button → `webView.goBack()` → exit app |
| **Fullscreen Video** | `onShowCustomView` / `onHideCustomView` |
| **Splash Screen** | Android 12+ SplashScreen API with back-compat |
| **Dark Theme** | Matches web app's `#0f0f0f` dark background |
| **Offline Error** | Custom error screen with retry button |

---

## Prerequisites

| Tool | Version |
|------|---------|
| Android Studio | Ladybug (2024.2.1) or newer |
| JDK | 17+ |
| Android SDK | API 35 (compileSdk), API 26+ (minSdk) |
| Deployed web app | Your Vercel/Netlify URL must be live |

---

## Setup

### 1. Open in Android Studio

```
File → Open → select the `android/` folder
```

Android Studio will download Gradle, SDK, and dependencies automatically.

### 2. Web app URL (already configured)

The app is pre-configured to load `https://dypu-connect.netlify.app`. No changes needed.

If you ever change the hosting domain, update it in `android/app/build.gradle.kts`:

```kotlin
buildConfigField("String", "WEB_APP_URL", "\"https://dypu-connect.netlify.app\"")
```

### 3. Deep link domains (already configured)

The deep links are pre-configured for:
- `dypu-connect.netlify.app` — your Netlify domain (email link auth)
- `dypu-connect.firebaseapp.com` — your Firebase auth domain

### 4. Firebase Android config (required)

Download `google-services.json` for the Android app from:
**Firebase Console -> Project Settings -> General -> Your apps -> Android app**

Place it at `android/app/google-services.json`.

This file is intentionally gitignored. Do not commit it; use `android/app/google-services.example.json` only as a shape reference.

### 5. Run on device/emulator

```
Run → Run 'app'  (or Shift+F10)
```

### 6. For local development

Uncomment this line in `build.gradle.kts` under the `debug` build type:

```kotlin
buildConfigField("String", "WEB_APP_URL", "\"http://10.0.2.2:3000\"")
```

`10.0.2.2` is the Android emulator's alias for your host machine's `localhost`.

---

## Build APK / AAB

### Debug APK (for testing)

```bash
cd android
./gradlew assembleDebug
```

Output: `android/app/build/outputs/apk/debug/app-debug.apk`

### Release AAB (for Play Store)

1. **Generate a keystore** (one-time):

```bash
keytool -genkey -v -keystore android/app/keystore/release.keystore -alias dypu-connect -keyalg RSA -keysize 2048 -validity 10000
```

2. **Configure signing** in `android/app/build.gradle.kts`:

```kotlin
signingConfigs {
    create("release") {
        storeFile = file("keystore/release.keystore")
        storePassword = "your-store-password"
        keyAlias = "dypu-connect"
        keyPassword = "your-key-password"
    }
}
```

And uncomment:
```kotlin
signingConfig = signingConfigs.getByName("release")
```

3. **Build**:

```bash
cd android
./gradlew bundleRelease    # AAB for Play Store
./gradlew assembleRelease  # APK for sideloading
```

---

## Firebase Configuration

After building, you need to add the Android app to Firebase:

1. Go to **Firebase Console → Project Settings → General → Add app → Android**
2. Package name: `com.dypu.connect`
3. Get your SHA-256 fingerprint:
   ```bash
   # Debug
   keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android
   
   # Release
   keytool -list -v -keystore android/app/keystore/release.keystore -alias dypu-connect
   ```
4. Add the SHA-256 fingerprint to Firebase Console
5. Add your app domain to **Authentication → Settings → Authorized domains**

---

## Digital Asset Links (Optional)

For verified deep links (no disambiguation dialog), host this at `https://dypu-connect.netlify.app/.well-known/assetlinks.json`:

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.dypu.connect",
    "sha256_cert_fingerprints": ["YOUR_SHA256_FINGERPRINT"]
  }
}]
```

You can add this as a static file in `public/.well-known/assetlinks.json` in your Next.js project.

---

## CSP Changes Made

The following security headers were relaxed from `DENY`/`none` to `SAMEORIGIN`/`self` to allow the WebView to render the page:

- `next.config.ts` — `frame-ancestors 'self'`, `X-Frame-Options: SAMEORIGIN`
- `vercel.json` — same changes
- `netlify.toml` — same changes

This still prevents your site from being embedded in arbitrary iframes on other websites.

---

## Project Structure

```
android/
├── app/
│   ├── build.gradle.kts          # App dependencies & config
│   ├── proguard-rules.pro        # ProGuard rules
│   └── src/main/
│       ├── AndroidManifest.xml   # Permissions, deep links, activity
│       ├── java/com/dypu/connect/
│       │   └── MainActivity.kt   # WebView wrapper (all native logic)
│       └── res/
│           ├── drawable/         # Icons, error illustration
│           ├── layout/           # activity_main.xml
│           ├── mipmap-*/         # Adaptive launcher icons
│           ├── values/           # Colors, strings, themes
│           └── xml/              # Network security, file paths
├── build.gradle.kts              # Project-level Gradle
├── settings.gradle.kts           # Project settings
├── gradle.properties             # Gradle JVM options
├── gradlew / gradlew.bat         # Gradle wrapper scripts
└── gradle/wrapper/               # Gradle wrapper JAR & properties
```

