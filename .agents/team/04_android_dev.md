# DYPU-Connect Subagent Training Manual: Android Development Agent

**Subagent Identifier**: `dypu_android_dev`  
**Role**: Android Development Agent  
**Domain**: Native Android Kotlin App, WebView Bridge, FCM Notifications & Permissions  

---

## 1. Mission & Purpose
The Android Development Agent develops and maintains the native Android wrapper for DYPU-Connect at `apps/android`. It bridges native hardware features (camera, microphone, haptics, notifications, sharing) to the web layer, manages deep links, and ensures flawless multi-device compatibility across Android smartphones, foldables, and tablets.

---

## 2. Codebase Architecture
```
apps/android/app/src/main/
├── AndroidManifest.xml          # Permissions, intent filters, deep links
├── java/com/dypu/connect/
│   ├── MainActivity.kt          # Host activity, WebView bridge, insets, PiP
│   └── MyFirebaseMessagingService.kt  # Notification channels & background push
└── res/
    ├── layout/activity_main.xml # CoordinatorLayout, WebView, glass error card
    ├── values/themes.xml        # Splash theme, edge-to-edge system colors
    └── xml/file_paths.xml       # FileProvider paths for photo/snapshot sharing
```

---

## 3. Native Bridge Contract (`WebAppInterface`)
The `@JavascriptInterface` bridge is injected under `window.AndroidApp`:

| Method | Parameters | Functionality |
|---|---|---|
| `showToast` | `(message: String)` | Native Android toast message |
| `vibrate` | `(duration: Long)` | Haptic feedback via `VibrationEffect` |
| `share` | `(text: String, title: String)` | Opens native Android Share Sheet (`ACTION_SEND`) |
| `shareImage`| `(base64Data: String, title: String)` | Writes base64 PNG to cache, launches FileProvider intent |
| `requestCallPermissions`| `()` | Requests `CAMERA`, `RECORD_AUDIO`, `BLUETOOTH_CONNECT` |
| `openNotificationSettings`| `()` | Opens system app notification settings |
| `getAppVersion`| `(): String` | Returns version string (e.g., `"1.0.0"`) |

### Event Bus to Web (`emitToWeb`):
The native app pushes events into the Web JavaScript runtime via:
```kotlin
fun emitToWeb(event: String, data: String) {
    val escapedData = data.replace("\\", "\\\\").replace("'", "\\'")
    val script = "if (window.onAndroidEvent) { window.onAndroidEvent('$event', '$escapedData'); }"
    runOnUiThread { webView.evaluateJavascript(script, null) }
}
```
Events emitted:
- `"fcm_token_ready"`: New FCM registration token
- `"notification_permission_result"`: Boolean string ("true"/"false")
- `"call_permissions_result"`: Boolean string ("true"/"false")

---

## 4. Multi-Device & Display Guidelines
1. **Prevent Refresh on Orientation Change**:
   `MainActivity` in `AndroidManifest.xml` must include:
   ```xml
   android:configChanges="orientation|screenSize|keyboardHidden|smallestScreenSize|screenLayout"
   android:resizeableActivity="true"
   ```
2. **Safe Area Inset Injection**:
   Using `WindowInsetsCompat`, calculate status bar and navigation bar insets and inject into Web CSS variables:
   - `--android-safe-area-top`
   - `--android-safe-area-bottom`
3. **Picture-in-Picture (PiP)**:
   In `onUserLeaveHint()`, enter PiP mode when a custom video view is active.

---

## 5. Build Verification
Always verify the APK compiles cleanly:
```bash
cd /home/ubuntu/DYPU-Connect/apps/android && ./gradlew assembleDebug
```
Ensure output APK is generated at `app/build/outputs/apk/debug/app-debug.apk`.
