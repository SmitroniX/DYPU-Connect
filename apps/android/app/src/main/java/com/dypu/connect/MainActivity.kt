package com.dypu.connect

import android.Manifest
import android.annotation.SuppressLint
import android.app.DownloadManager
import android.app.PictureInPictureParams
import android.content.ActivityNotFoundException
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.provider.MediaStore
import android.util.Log
import android.util.Rational
import android.view.View
import android.webkit.*
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInClient
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.firebase.messaging.FirebaseMessaging
import java.io.File
import java.io.IOException

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var swipeRefresh: SwipeRefreshLayout
    private lateinit var progressBar: ProgressBar
    private lateinit var errorView: LinearLayout
    private lateinit var fullscreenContainer: FrameLayout
    private var customView: View? = null
    private var customViewCallback: WebChromeClient.CustomViewCallback? = null

    private var fileUploadCallback: ValueCallback<Array<Uri>>? = null
    private var cameraPhotoUri: Uri? = null

    lateinit var mGoogleSignInClient: GoogleSignInClient

    private val BASE_URL = BuildConfig.WEB_APP_URL
    private val TAG = "DYPUConnectNative"
    private var safeAreaTopDp = 0
    private var safeAreaBottomDp = 0
    private var safeAreaLeftDp = 0
    private var safeAreaRightDp = 0

    private var pendingWebPermissionRequest: PermissionRequest? = null

    private val tokenReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action == "FCM_TOKEN_UPDATE") {
                intent.getStringExtra("token")?.let { emitToWeb("fcm_token_ready", it) }
            }
        }
    }

    private val fileChooserLauncher = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        var results: Array<Uri>? = null
        if (result.resultCode == RESULT_OK) {
            val data = result.data
            if (data?.clipData != null) {
                val count = data.clipData!!.itemCount
                results = Array(count) { data.clipData!!.getItemAt(it).uri }
            } else if (data?.data != null) {
                results = arrayOf(data.data!!)
            } else if (cameraPhotoUri != null) {
                results = arrayOf(cameraPhotoUri!!)
            }
        }
        fileUploadCallback?.onReceiveValue(results ?: emptyArray())
        fileUploadCallback = null
        cameraPhotoUri = null
    }

    private val cameraPermissionLauncher = registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) {
        openFileChooser()
    }

    private val notificationPermissionLauncher = registerForActivityResult(ActivityResultContracts.RequestPermission()) { isGranted ->
        Log.d(TAG, "Notification permission result: $isGranted")
        emitToWeb("notification_permission_result", isGranted.toString())
    }

    private val callPermissionLauncher = registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { permissions ->
        val cameraGranted = permissions[Manifest.permission.CAMERA] ?: (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED)
        val audioGranted = permissions[Manifest.permission.RECORD_AUDIO] ?: (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED)
        val btGranted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            permissions[Manifest.permission.BLUETOOTH_CONNECT] ?: (ContextCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED)
        } else true
        
        val isGranted = cameraGranted && audioGranted
        Log.d(TAG, "Call permissions result: camera=$cameraGranted, audio=$audioGranted, bluetooth=$btGranted -> overall=$isGranted")
        
        pendingWebPermissionRequest?.let { request ->
            val granted = mutableListOf<String>()
            if (cameraGranted && request.resources.contains(PermissionRequest.RESOURCE_VIDEO_CAPTURE)) {
                granted.add(PermissionRequest.RESOURCE_VIDEO_CAPTURE)
            }
            if (audioGranted && request.resources.contains(PermissionRequest.RESOURCE_AUDIO_CAPTURE)) {
                granted.add(PermissionRequest.RESOURCE_AUDIO_CAPTURE)
            }
            
            if (granted.isNotEmpty()) {
                request.grant(granted.toTypedArray())
            } else {
                request.deny()
            }
            pendingWebPermissionRequest = null
        }
        
        emitToWeb("call_permissions_result", isGranted.toString())
    }

    private val googleSignInLauncher = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        if (result.resultCode == RESULT_OK) {
            val task = GoogleSignIn.getSignedInAccountFromIntent(result.data)
            try {
                val account = task.getResult(Exception::class.java)
                val idToken = account?.idToken
                if (idToken != null) {
                    emitToWeb("google_auth_success", idToken)
                } else {
                    emitToWeb("google_auth_error", "No ID token found")
                }
            } catch (e: Exception) {
                emitToWeb("google_auth_error", e.message ?: "Unknown error")
            }
        } else {
            emitToWeb("google_auth_error", "Canceled")
        }
    }

    @SuppressLint("SetJavaScriptEnabled", "JavascriptInterface")
    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        
        // Edge-to-Edge display
        WindowCompat.setDecorFitsSystemWindows(window, false)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webView)
        swipeRefresh = findViewById(R.id.swipeRefresh)
        progressBar = findViewById(R.id.progressBar)
        errorView = findViewById(R.id.errorView)
        fullscreenContainer = findViewById(R.id.fullscreenContainer)

        // CRITICAL FIX: Disable pull-to-refresh by default so downward swipes/scrolls never trigger unwanted reload
        swipeRefresh.isEnabled = false
        swipeRefresh.setColorSchemeResources(R.color.primary, R.color.accent)

        setupWebView()
        setupGoogleSignIn()

        // Handle Safe Area Insets for all device forms (portrait, landscape, cutouts, foldables, tablets)
        ViewCompat.setOnApplyWindowInsetsListener(webView) { _, insets ->
            val systemBars = insets.getInsets(
                WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout()
            )
            val density = resources.displayMetrics.density
            safeAreaTopDp = (systemBars.top / density).toInt()
            safeAreaBottomDp = (systemBars.bottom / density).toInt()
            safeAreaLeftDp = (systemBars.left / density).toInt()
            safeAreaRightDp = (systemBars.right / density).toInt()
            injectSafeAreaInsets()
            WindowInsetsCompat.CONSUMED
        }

        swipeRefresh.setOnRefreshListener {
            webView.reload()
        }

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (customView != null) {
                    customViewCallback?.onCustomViewHidden()
                } else if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    finish()
                }
            }
        })

        // Request notification permission gracefully on startup (Android 13+)
        promptNotificationPermissionIfNeeded()

        // Initial Load
        webView.loadUrl(BASE_URL)
        handleIntent(intent)
    }

    private fun promptNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
            }
        }
    }

    private fun setupGoogleSignIn() {
        val gso = GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
            .requestIdToken(getString(R.string.default_web_client_id))
            .requestEmail()
            .build()
        mGoogleSignInClient = GoogleSignIn.getClient(this, gso)
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.mediaPlaybackRequiresUserGesture = false
        settings.allowFileAccess = false
        settings.cacheMode = WebSettings.LOAD_DEFAULT
        settings.mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
        
        // Multi-device and tablet display optimization
        settings.useWideViewPort = true
        settings.loadWithOverviewMode = true
        settings.setSupportZoom(false)
        settings.displayZoomControls = false
        settings.builtInZoomControls = false

        CookieManager.getInstance().setAcceptCookie(true)
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true)

        webView.addJavascriptInterface(WebAppInterface(), "AndroidApp")

        webView.webViewClient = object : WebViewClient() {
            override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                progressBar.visibility = View.VISIBLE
                errorView.visibility = View.GONE
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                progressBar.visibility = View.GONE
                swipeRefresh.isRefreshing = false
                CookieManager.getInstance().flush()
                injectSafeAreaInsets()
            }

            override fun onReceivedError(view: WebView?, request: WebResourceRequest?, error: WebResourceError?) {
                if (request?.isForMainFrame == true) {
                    errorView.visibility = View.VISIBLE
                    progressBar.visibility = View.GONE
                    swipeRefresh.isRefreshing = false
                }
            }

            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val url = request?.url?.toString() ?: return false
                
                // Keep app domain, Firebase auth domain, and Google OAuth inside the WebView
                if (url.startsWith(BASE_URL) || 
                    url.contains("firebaseapp.com") || 
                    url.contains("web.app") ||
                    url.contains("accounts.google.com") ||
                    url.contains("github.com/login/oauth")) {
                    return false
                }

                if (url.startsWith("data:") || url.startsWith("blob:")) {
                    return false
                }
                
                try {
                    val uri = Uri.parse(url)
                    val scheme = uri.scheme?.lowercase()
                    if (scheme in listOf("http", "https", "mailto", "tel")) {
                        val intent = Intent(Intent.ACTION_VIEW, uri)
                        startActivity(intent)
                        return true
                    }
                    return false
                } catch (e: Exception) {
                    Log.e(TAG, "Cannot handle URL: $url")
                    return false
                }
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                progressBar.progress = newProgress
            }

            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                fileUploadCallback?.onReceiveValue(null)
                fileUploadCallback = filePathCallback

                if (ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
                    cameraPermissionLauncher.launch(arrayOf(Manifest.permission.CAMERA))
                } else {
                    openFileChooser()
                }
                return true
            }

            // WebRTC Call Permissions (Camera & Microphone)
            override fun onPermissionRequest(request: PermissionRequest?) {
                if (request == null) return
                val origin = request.origin?.toString() ?: ""
                
                // Validate origin
                if (!origin.startsWith(BASE_URL) && 
                    !origin.startsWith("https://dypu-connect.netlify.app") && 
                    !origin.contains("dypu-connect")) {
                    request.deny()
                    return
                }

                val resources = request.resources
                val needsCamera = resources.contains(PermissionRequest.RESOURCE_VIDEO_CAPTURE)
                val needsAudio = resources.contains(PermissionRequest.RESOURCE_AUDIO_CAPTURE)

                val hasCamera = ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
                val hasAudio = ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED

                val permissionsToRequest = mutableListOf<String>()
                if (needsCamera && !hasCamera) permissionsToRequest.add(Manifest.permission.CAMERA)
                if (needsAudio && !hasAudio) permissionsToRequest.add(Manifest.permission.RECORD_AUDIO)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    if (ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) {
                        permissionsToRequest.add(Manifest.permission.BLUETOOTH_CONNECT)
                    }
                }

                if (permissionsToRequest.isEmpty()) {
                    request.grant(resources)
                } else {
                    pendingWebPermissionRequest = request
                    callPermissionLauncher.launch(permissionsToRequest.toTypedArray())
                }
            }

            override fun onShowCustomView(view: View?, callback: CustomViewCallback?) {
                if (customView != null) {
                    callback?.onCustomViewHidden()
                    return
                }
                customView = view
                customViewCallback = callback
                fullscreenContainer.addView(view)
                fullscreenContainer.visibility = View.VISIBLE
                swipeRefresh.visibility = View.GONE
            }

            override fun onHideCustomView() {
                if (customView == null) return
                fullscreenContainer.removeView(customView)
                fullscreenContainer.visibility = View.GONE
                swipeRefresh.visibility = View.VISIBLE
                customViewCallback?.onCustomViewHidden()
                customView = null
                customViewCallback = null
            }
        }

        webView.setDownloadListener { url, _, contentDisposition, mimeType, _ ->
            val request = DownloadManager.Request(Uri.parse(url))
            request.setMimeType(mimeType)
            val fileName = URLUtil.guessFileName(url, contentDisposition, mimeType)
            request.setTitle(fileName)
            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
            request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName)
            val dm = getSystemService(DOWNLOAD_SERVICE) as DownloadManager
            dm.enqueue(request)
            Toast.makeText(this, "Downloading file...", Toast.LENGTH_SHORT).show()
        }
    }

    private fun openFileChooser() {
        val intents = mutableListOf<Intent>()
        val cameraIntent = Intent(MediaStore.ACTION_IMAGE_CAPTURE)
        if (cameraIntent.resolveActivity(packageManager) != null) {
            val photoFile = try {
                File.createTempFile("IMG_", ".jpg", getExternalFilesDir(Environment.DIRECTORY_PICTURES))
            } catch (ex: IOException) { null }
            
            if (photoFile != null) {
                cameraPhotoUri = FileProvider.getUriForFile(this, "$packageName.fileprovider", photoFile)
                cameraIntent.putExtra(MediaStore.EXTRA_OUTPUT, cameraPhotoUri)
                intents.add(cameraIntent)
            }
        }

        val fileIntent = Intent(Intent.ACTION_GET_CONTENT).apply {
            addCategory(Intent.CATEGORY_OPENABLE)
            type = "*/*"
            putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true)
            putExtra(Intent.EXTRA_MIME_TYPES, arrayOf("image/*", "video/*", "audio/*", "application/pdf"))
        }

        val chooserIntent = Intent.createChooser(fileIntent, "Select file").apply {
            if (intents.isNotEmpty()) {
                putExtra(Intent.EXTRA_INITIAL_INTENTS, intents.toTypedArray())
            }
        }

        fileChooserLauncher.launch(chooserIntent)
    }

    fun onRetryClicked(view: View) {
        errorView.visibility = View.GONE
        progressBar.visibility = View.VISIBLE
        webView.reload()
    }

    private fun injectSafeAreaInsets() {
        webView.evaluateJavascript(
            "document.documentElement.style.setProperty('--android-safe-area-top', '${safeAreaTopDp}px');" +
            "document.documentElement.style.setProperty('--android-safe-area-bottom', '${safeAreaBottomDp}px');" +
            "document.documentElement.style.setProperty('--android-safe-area-left', '${safeAreaLeftDp}px');" +
            "document.documentElement.style.setProperty('--android-safe-area-right', '${safeAreaRightDp}px');",
            null
        )
    }

    fun emitToWeb(event: String, data: String) {
        val escapedData = data.replace("\\", "\\\\").replace("'", "\\'").replace("\"", "\\\"").replace("\n", "\\n")
        val script = "if (window.onAndroidEvent) { window.onAndroidEvent('$event', '$escapedData'); }"
        runOnUiThread { webView.evaluateJavascript(script, null) }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleIntent(intent)
    }

    private fun handleIntent(intent: Intent?) {
        var url = intent?.getStringExtra("target_url")
        if (url == null && intent?.action == Intent.ACTION_VIEW) {
            url = intent.dataString
        }
        if (url == null) return
        
        var finalUrl = url
        if (finalUrl.startsWith("dypuconnect://")) {
            val path = finalUrl.removePrefix("dypuconnect://")
            finalUrl = BASE_URL + if (path.startsWith("/")) path else "/$path"
        } else if (finalUrl.startsWith("/")) {
            finalUrl = BASE_URL + finalUrl
        }
        
        if (webView.url != finalUrl) {
            webView.loadUrl(finalUrl)
        }
    }

    override fun onResume() {
        super.onResume()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(tokenReceiver, IntentFilter("FCM_TOKEN_UPDATE"), RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(tokenReceiver, IntentFilter("FCM_TOKEN_UPDATE"))
        }
    }

    override fun onPause() {
        super.onPause()
        unregisterReceiver(tokenReceiver)
    }

    override fun onUserLeaveHint() {
        super.onUserLeaveHint()
        // If during a call or fullscreen, support PiP mode
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && customView != null) {
            try {
                val params = PictureInPictureParams.Builder()
                    .setAspectRatio(Rational(16, 9))
                    .build()
                enterPictureInPictureMode(params)
            } catch (e: Exception) {
                Log.w(TAG, "PiP mode failed", e)
            }
        }
    }

    inner class WebAppInterface {
        @JavascriptInterface
        fun showToast(message: String) {
            runOnUiThread {
                Toast.makeText(this@MainActivity, message, Toast.LENGTH_SHORT).show()
            }
        }

        @JavascriptInterface
        fun vibrate(duration: Long) {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    val vibratorManager = getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
                    val vibrator = vibratorManager?.defaultVibrator ?: (getSystemService(Context.VIBRATOR_SERVICE) as Vibrator)
                    vibrator.vibrate(VibrationEffect.createOneShot(duration, VibrationEffect.DEFAULT_AMPLITUDE))
                } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    @Suppress("DEPRECATION")
                    val vibrator = getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
                    vibrator.vibrate(VibrationEffect.createOneShot(duration, VibrationEffect.DEFAULT_AMPLITUDE))
                } else {
                    @Suppress("DEPRECATION")
                    val vibrator = getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
                    vibrator.vibrate(duration)
                }
            } catch (e: Exception) {
                Log.w(TAG, "Vibrate failed", e)
            }
        }

        @JavascriptInterface
        fun share(text: String, title: String) {
            runOnUiThread {
                val intent = Intent(Intent.ACTION_SEND).apply {
                    type = "text/plain"
                    putExtra(Intent.EXTRA_SUBJECT, title)
                    putExtra(Intent.EXTRA_TEXT, text)
                }
                startActivity(Intent.createChooser(intent, "Share via"))
            }
        }

        @JavascriptInterface
        fun shareImage(base64Data: String, title: String) {
            runOnUiThread {
                try {
                    val pureBase64 = if (base64Data.contains(",")) base64Data.substringAfter(",") else base64Data
                    val decodedBytes = android.util.Base64.decode(pureBase64, android.util.Base64.DEFAULT)
                    val cachePath = File(cacheDir, "images").apply { mkdirs() }
                    val file = File(cachePath, "confession_snap.png")
                    file.outputStream().use { it.write(decodedBytes) }

                    val contentUri = FileProvider.getUriForFile(this@MainActivity, "${packageName}.fileprovider", file)
                    val shareIntent = Intent(Intent.ACTION_SEND).apply {
                        type = "image/png"
                        putExtra(Intent.EXTRA_STREAM, contentUri)
                        putExtra(Intent.EXTRA_TEXT, title)
                        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                    }
                    startActivity(Intent.createChooser(shareIntent, "Share Snapshot"))
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to share image", e)
                    Toast.makeText(this@MainActivity, "Failed to share image", Toast.LENGTH_SHORT).show()
                }
            }
        }

        @JavascriptInterface
        fun saveImage(base64Data: String, fileName: String) {
            runOnUiThread {
                try {
                    val pureBase64 = if (base64Data.contains(",")) base64Data.substringAfter(",") else base64Data
                    val decodedBytes = android.util.Base64.decode(pureBase64, android.util.Base64.DEFAULT)
                    val bitmap = android.graphics.BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.size)

                    val contentValues = android.content.ContentValues().apply {
                        put(MediaStore.MediaColumns.DISPLAY_NAME, fileName)
                        put(MediaStore.MediaColumns.MIME_TYPE, "image/png")
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                            put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/DYPU-Connect")
                            put(MediaStore.MediaColumns.IS_PENDING, 1)
                        }
                    }

                    val resolver = contentResolver
                    val uri = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, contentValues)
                    if (uri != null) {
                        resolver.openOutputStream(uri)?.use { out ->
                            bitmap.compress(Bitmap.CompressFormat.PNG, 100, out)
                        }
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                            contentValues.clear()
                            contentValues.put(MediaStore.MediaColumns.IS_PENDING, 0)
                            resolver.update(uri, contentValues, null, null)
                        }
                        Toast.makeText(this@MainActivity, "Saved to Pictures!", Toast.LENGTH_SHORT).show()
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to save image", e)
                    Toast.makeText(this@MainActivity, "Failed to save image", Toast.LENGTH_SHORT).show()
                }
            }
        }

        @JavascriptInterface
        fun getFCMToken() {
            FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
                if (task.isSuccessful) {
                    emitToWeb("fcm_token_ready", task.result)
                } else {
                    Log.w(TAG, "Fetching FCM token failed", task.exception)
                }
            }
        }

        @JavascriptInterface
        fun signInWithGoogle() {
            runOnUiThread {
                val signInIntent = mGoogleSignInClient.signInIntent
                googleSignInLauncher.launch(signInIntent)
            }
        }

        @JavascriptInterface
        fun getAppVersion(): String {
            return BuildConfig.VERSION_NAME
        }

        @JavascriptInterface
        fun onWebReady() {
            runOnUiThread { emitToWeb("app_connected", "Native bridge is active") }
        }

        // Notification Permission APIs
        @JavascriptInterface
        fun requestNotificationPermission() {
            runOnUiThread {
                promptNotificationPermissionIfNeeded()
            }
        }

        @JavascriptInterface
        fun hasNotificationPermission(): Boolean {
            return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
            } else {
                true
            }
        }

        @JavascriptInterface
        fun openNotificationSettings() {
            runOnUiThread {
                try {
                    val intent = Intent().apply {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                            action = android.provider.Settings.ACTION_APP_NOTIFICATION_SETTINGS
                            putExtra(android.provider.Settings.EXTRA_APP_PACKAGE, packageName)
                        } else {
                            action = android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS
                            data = Uri.fromParts("package", packageName, null)
                        }
                    }
                    startActivity(intent)
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to open notification settings", e)
                }
            }
        }

        // Call Permission APIs
        @JavascriptInterface
        fun requestCallPermissions() {
            runOnUiThread {
                val perms = mutableListOf(Manifest.permission.RECORD_AUDIO, Manifest.permission.CAMERA)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    perms.add(Manifest.permission.BLUETOOTH_CONNECT)
                }
                callPermissionLauncher.launch(perms.toTypedArray())
            }
        }

        @JavascriptInterface
        fun hasCallPermissions(): Boolean {
            val hasCam = ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
            val hasMic = ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED
            return hasCam && hasMic
        }

        // Pull to refresh control (disabled by default)
        @JavascriptInterface
        fun setPullToRefreshEnabled(enabled: Boolean) {
            runOnUiThread {
                swipeRefresh.isEnabled = enabled
            }
        }

        // System Bar / Status Bar Theme Sync
        @JavascriptInterface
        fun setStatusBarTheme(isDark: Boolean) {
            runOnUiThread {
                val controller = WindowInsetsControllerCompat(window, window.decorView)
                controller.isAppearanceLightStatusBars = !isDark
                controller.isAppearanceLightNavigationBars = !isDark
            }
        }
    }
}
