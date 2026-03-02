package com.dypu.connect

import android.Manifest
import android.annotation.SuppressLint
import android.app.DownloadManager
import android.content.ActivityNotFoundException
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.os.Message
import android.provider.MediaStore
import android.view.View
import android.view.WindowManager
import android.webkit.*
import android.widget.FrameLayout
import android.widget.ProgressBar
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import androidx.webkit.WebSettingsCompat
import androidx.webkit.WebViewFeature
import java.io.File
import java.text.SimpleDateFormat
import java.util.*

class MainActivity : AppCompatActivity() {

    // ── Constants ─────────────────────────────────────────────
    companion object {
        private const val WEB_URL = BuildConfig.WEB_APP_URL
        private const val TAG = "DYPUConnect"
    }

    // ── Views ─────────────────────────────────────────────────
    private lateinit var webView: WebView
    private lateinit var progressBar: ProgressBar
    private lateinit var swipeRefresh: SwipeRefreshLayout
    private lateinit var errorView: View
    private lateinit var fullscreenContainer: FrameLayout

    // ── File Upload ───────────────────────────────────────────
    private var fileUploadCallback: ValueCallback<Array<Uri>>? = null
    private var cameraPhotoUri: Uri? = null

    // ── Fullscreen (video) ────────────────────────────────────
    private var fullscreenView: View? = null
    private var fullscreenCallback: WebChromeClient.CustomViewCallback? = null

    // ── Splash ────────────────────────────────────────────────
    private var isWebViewReady = false

    // ── Permission Launchers ──────────────────────────────────
    private lateinit var cameraPermissionLauncher: ActivityResultLauncher<Array<String>>
    private lateinit var fileChooserLauncher: ActivityResultLauncher<Intent>
    private lateinit var notificationPermissionLauncher: ActivityResultLauncher<String>

    // Pending WebView permission request
    private var pendingPermissionRequest: PermissionRequest? = null
    private lateinit var webrtcPermissionLauncher: ActivityResultLauncher<Array<String>>

    // ──────────────────────────────────────────────────────────
    //  LIFECYCLE
    // ──────────────────────────────────────────────────────────

    override fun onCreate(savedInstanceState: Bundle?) {
        // Splash screen (Android 12+ API, back-compat via core-splashscreen)
        val splashScreen = installSplashScreen()
        splashScreen.setKeepOnScreenCondition { !isWebViewReady }

        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        // Edge-to-edge & dark status/nav bars
        setupSystemBars()

        // Find views
        webView = findViewById(R.id.webView)
        progressBar = findViewById(R.id.progressBar)
        swipeRefresh = findViewById(R.id.swipeRefresh)
        errorView = findViewById(R.id.errorView)
        fullscreenContainer = findViewById(R.id.fullscreenContainer)

        // Register activity result launchers
        registerLaunchers()

        // Setup WebView
        setupWebView()

        // Setup swipe-to-refresh
        setupSwipeRefresh()

        // Setup back button handling
        setupBackNavigation()

        // Request notification permission (Android 13+)
        requestNotificationPermission()

        // Load the web app (or handle deep link)
        handleIntent(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleIntent(intent)
    }

    override fun onResume() {
        super.onResume()
        webView.onResume()
    }

    override fun onPause() {
        super.onPause()
        webView.onPause()
    }

    override fun onDestroy() {
        webView.destroy()
        super.onDestroy()
    }

    // ──────────────────────────────────────────────────────────
    //  SYSTEM BARS (edge-to-edge dark theme)
    // ──────────────────────────────────────────────────────────

    @Suppress("DEPRECATION")
    private fun setupSystemBars() {
        // Let the system fit content within the safe area (below status bar, above nav bar)
        WindowCompat.setDecorFitsSystemWindows(window, true)
        window.statusBarColor = Color.parseColor("#0f0f0f")
        window.navigationBarColor = Color.parseColor("#0f0f0f")

        val insetsController = WindowInsetsControllerCompat(window, window.decorView)
        insetsController.isAppearanceLightStatusBars = false
        insetsController.isAppearanceLightNavigationBars = false

        // Keep screen on while app is visible (useful for video calls)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    }

    // ──────────────────────────────────────────────────────────
    //  REGISTER ACTIVITY RESULT LAUNCHERS
    // ──────────────────────────────────────────────────────────

    private fun registerLaunchers() {
        // File chooser result
        fileChooserLauncher = registerForActivityResult(
            ActivityResultContracts.StartActivityForResult()
        ) { result ->
            if (result.resultCode == RESULT_OK) {
                val data = result.data
                val results: Array<Uri>? = when {
                    // Multiple files selected
                    data?.clipData != null -> {
                        val count = data.clipData!!.itemCount
                        Array(count) { i -> data.clipData!!.getItemAt(i).uri }
                    }
                    // Single file or camera photo
                    data?.data != null -> arrayOf(data.data!!)
                    // Camera capture (no data intent, use stored URI)
                    cameraPhotoUri != null -> arrayOf(cameraPhotoUri!!)
                    else -> null
                }
                fileUploadCallback?.onReceiveValue(results ?: arrayOf())
            } else {
                fileUploadCallback?.onReceiveValue(arrayOf())
            }
            fileUploadCallback = null
            cameraPhotoUri = null
        }

        // Camera permission for file upload
        cameraPermissionLauncher = registerForActivityResult(
            ActivityResultContracts.RequestMultiplePermissions()
        ) { permissions ->
            // Regardless of result, open the file chooser
            openFileChooser()
        }

        // WebRTC permission (camera + mic for video calls)
        webrtcPermissionLauncher = registerForActivityResult(
            ActivityResultContracts.RequestMultiplePermissions()
        ) { permissions ->
            val request = pendingPermissionRequest ?: return@registerForActivityResult
            val granted = mutableListOf<String>()

            request.resources.forEach { resource ->
                when (resource) {
                    PermissionRequest.RESOURCE_VIDEO_CAPTURE -> {
                        if (permissions[Manifest.permission.CAMERA] == true) {
                            granted.add(resource)
                        }
                    }
                    PermissionRequest.RESOURCE_AUDIO_CAPTURE -> {
                        if (permissions[Manifest.permission.RECORD_AUDIO] == true) {
                            granted.add(resource)
                        }
                    }
                    else -> granted.add(resource) // grant other resources
                }
            }

            if (granted.isNotEmpty()) {
                request.grant(granted.toTypedArray())
            } else {
                request.deny()
            }
            pendingPermissionRequest = null
        }

        // Notification permission
        notificationPermissionLauncher = registerForActivityResult(
            ActivityResultContracts.RequestPermission()
        ) { /* no-op, just requesting */ }
    }

    // ──────────────────────────────────────────────────────────
    //  WEBVIEW SETUP
    // ──────────────────────────────────────────────────────────

    @SuppressLint("SetJavaScriptEnabled")
    @Suppress("DEPRECATION")
    private fun setupWebView() {
        webView.apply {
            // Enable dark mode for WebView if supported
            if (WebViewFeature.isFeatureSupported(WebViewFeature.ALGORITHMIC_DARKENING)) {
                WebSettingsCompat.setAlgorithmicDarkeningAllowed(settings, true)
            }

            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                databaseEnabled = true
                allowFileAccess = true
                allowContentAccess = true
                mediaPlaybackRequiresUserGesture = false  // Required for WebRTC
                useWideViewPort = true
                loadWithOverviewMode = true
                setSupportMultipleWindows(true)
                javaScriptCanOpenWindowsAutomatically = true
                mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
                cacheMode = WebSettings.LOAD_DEFAULT

                // User-Agent: Remove WebView marker so Google OAuth works.
                // Google blocks sign-in if it detects "; wv)" in the UA string.
                // Also append our app identifier for detection on the web side.
                val defaultUA = userAgentString
                userAgentString = defaultUA
                    .replace("; wv)", ")")  // Remove WebView marker
                    .plus(" DYPUConnect/1.0")
            }

            // Scrollbar styling
            isScrollbarFadingEnabled = true
            scrollBarStyle = View.SCROLLBARS_INSIDE_OVERLAY

            // Cookie support
            CookieManager.getInstance().apply {
                setAcceptCookie(true)
                setAcceptThirdPartyCookies(webView, true)
            }

            // ── WebViewClient (navigation & errors) ──────────
            webViewClient = object : WebViewClient() {

                override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                    super.onPageStarted(view, url, favicon)
                    progressBar.visibility = View.VISIBLE
                    errorView.visibility = View.GONE
                }

                override fun onPageFinished(view: WebView?, url: String?) {
                    super.onPageFinished(view, url)
                    progressBar.visibility = View.GONE
                    swipeRefresh.isRefreshing = false

                    if (!isWebViewReady) {
                        isWebViewReady = true
                    }

                    // Inject CSS to hide any web-app install banners inside the WebView
                    view?.evaluateJavascript("""
                        (function() {
                            var style = document.createElement('style');
                            style.textContent = '.pwa-install-banner, [data-pwa-install] { display: none !important; }';
                            document.head.appendChild(style);
                        })();
                    """.trimIndent(), null)
                }

                override fun shouldOverrideUrlLoading(
                    view: WebView?,
                    request: WebResourceRequest?
                ): Boolean {
                    val url = request?.url?.toString() ?: return false

                    // Keep navigation inside WebView for our domain and Google auth
                    if (isInternalUrl(url)) return false

                    // Handle tel: and mailto: links
                    if (url.startsWith("tel:") || url.startsWith("mailto:") || url.startsWith("sms:")) {
                        try {
                            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                        } catch (_: ActivityNotFoundException) { }
                        return true
                    }

                    // Open external URLs in system browser
                    try {
                        startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                    } catch (_: ActivityNotFoundException) { }
                    return true
                }

                override fun onReceivedError(
                    view: WebView?,
                    request: WebResourceRequest?,
                    error: WebResourceError?
                ) {
                    super.onReceivedError(view, request, error)
                    // Only show error for main frame
                    if (request?.isForMainFrame == true) {
                        progressBar.visibility = View.GONE
                        swipeRefresh.isRefreshing = false
                        errorView.visibility = View.VISIBLE
                        isWebViewReady = true // dismiss splash even on error
                    }
                }

                override fun onReceivedHttpError(
                    view: WebView?,
                    request: WebResourceRequest?,
                    errorResponse: WebResourceResponse?
                ) {
                    super.onReceivedHttpError(view, request, errorResponse)
                    if (request?.isForMainFrame == true && (errorResponse?.statusCode ?: 0) >= 500) {
                        errorView.visibility = View.VISIBLE
                    }
                }
            }

            // ── WebChromeClient (permissions, file upload, fullscreen) ──
            webChromeClient = object : WebChromeClient() {

                // Progress bar
                override fun onProgressChanged(view: WebView?, newProgress: Int) {
                    progressBar.progress = newProgress
                    if (newProgress == 100) {
                        progressBar.visibility = View.GONE
                    }
                }

                // WebRTC camera/mic permissions
                override fun onPermissionRequest(request: PermissionRequest?) {
                    request ?: return

                    val neededPermissions = mutableListOf<String>()

                    request.resources.forEach { resource ->
                        when (resource) {
                            PermissionRequest.RESOURCE_VIDEO_CAPTURE -> {
                                if (ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.CAMERA)
                                    != PackageManager.PERMISSION_GRANTED) {
                                    neededPermissions.add(Manifest.permission.CAMERA)
                                }
                            }
                            PermissionRequest.RESOURCE_AUDIO_CAPTURE -> {
                                if (ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.RECORD_AUDIO)
                                    != PackageManager.PERMISSION_GRANTED) {
                                    neededPermissions.add(Manifest.permission.RECORD_AUDIO)
                                }
                            }
                        }
                    }

                    if (neededPermissions.isEmpty()) {
                        // All permissions already granted
                        request.grant(request.resources)
                    } else {
                        // Need to request permissions
                        pendingPermissionRequest = request
                        webrtcPermissionLauncher.launch(neededPermissions.toTypedArray())
                    }
                }

                // File upload (profile image, attachments, etc.)
                override fun onShowFileChooser(
                    webView: WebView?,
                    filePathCallback: ValueCallback<Array<Uri>>?,
                    fileChooserParams: FileChooserParams?
                ): Boolean {
                    // Cancel any existing callback
                    fileUploadCallback?.onReceiveValue(arrayOf())
                    fileUploadCallback = filePathCallback

                    // Check if we need camera permission
                    if (ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.CAMERA)
                        != PackageManager.PERMISSION_GRANTED) {
                        cameraPermissionLauncher.launch(arrayOf(Manifest.permission.CAMERA))
                    } else {
                        openFileChooser()
                    }
                    return true
                }

                // Fullscreen video
                override fun onShowCustomView(view: View?, callback: CustomViewCallback?) {
                    if (fullscreenView != null) {
                        callback?.onCustomViewHidden()
                        return
                    }
                    fullscreenView = view
                    fullscreenCallback = callback
                    fullscreenContainer.addView(view)
                    fullscreenContainer.visibility = View.VISIBLE
                    webView.visibility = View.GONE

                    // Hide system bars for immersive fullscreen
                    WindowCompat.setDecorFitsSystemWindows(window, false)
                    val controller = WindowInsetsControllerCompat(window, window.decorView)
                    controller.hide(androidx.core.view.WindowInsetsCompat.Type.systemBars())
                    controller.systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
                }

                override fun onHideCustomView() {
                    fullscreenContainer.removeView(fullscreenView)
                    fullscreenContainer.visibility = View.GONE
                    webView.visibility = View.VISIBLE
                    fullscreenView = null
                    fullscreenCallback?.onCustomViewHidden()
                    fullscreenCallback = null

                    // Restore system bars and safe area fitting
                    WindowCompat.setDecorFitsSystemWindows(window, true)
                    val controller = WindowInsetsControllerCompat(window, window.decorView)
                    controller.show(androidx.core.view.WindowInsetsCompat.Type.systemBars())
                }

                // Allow window.open for Firebase auth popups (Google sign-in)
                override fun onCreateWindow(
                    view: WebView?,
                    isDialog: Boolean,
                    isUserGesture: Boolean,
                    resultMsg: Message?
                ): Boolean {
                    val newWebView = WebView(this@MainActivity)
                    newWebView.webViewClient = object : WebViewClient() {
                        override fun shouldOverrideUrlLoading(
                            view: WebView?,
                            request: WebResourceRequest?
                        ): Boolean {
                            val url = request?.url?.toString() ?: return false
                            if (isInternalUrl(url)) {
                                this@MainActivity.webView.loadUrl(url)
                            } else {
                                startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                            }
                            return true
                        }
                    }
                    val transport = resultMsg?.obj as? WebView.WebViewTransport
                    transport?.webView = newWebView
                    resultMsg?.sendToTarget()
                    return true
                }

                // Geolocation permission
                override fun onGeolocationPermissionsShowPrompt(
                    origin: String?,
                    callback: GeolocationPermissions.Callback?
                ) {
                    callback?.invoke(origin, true, false)
                }
            }

            // ── Download listener ────────────────────────────
            setDownloadListener { url, userAgent, contentDisposition, mimeType, contentLength ->
                try {
                    val request = DownloadManager.Request(Uri.parse(url))
                    request.setMimeType(mimeType)
                    request.addRequestHeader("User-Agent", userAgent)
                    request.setDescription("Downloading file...")
                    request.setTitle(URLUtil.guessFileName(url, contentDisposition, mimeType))
                    request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                    request.setDestinationInExternalPublicDir(
                        Environment.DIRECTORY_DOWNLOADS,
                        URLUtil.guessFileName(url, contentDisposition, mimeType)
                    )

                    val dm = getSystemService(DOWNLOAD_SERVICE) as DownloadManager
                    dm.enqueue(request)

                    Toast.makeText(this@MainActivity, "Downloading...", Toast.LENGTH_SHORT).show()
                } catch (e: Exception) {
                    Toast.makeText(this@MainActivity, "Download failed", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    // ──────────────────────────────────────────────────────────
    //  FILE CHOOSER (Camera + Gallery + Files)
    // ──────────────────────────────────────────────────────────

    private fun openFileChooser() {
        val intents = mutableListOf<Intent>()

        // Camera intent
        val cameraIntent = Intent(MediaStore.ACTION_IMAGE_CAPTURE)
        if (cameraIntent.resolveActivity(packageManager) != null) {
            val photoFile = createImageFile()
            if (photoFile != null) {
                cameraPhotoUri = FileProvider.getUriForFile(
                    this,
                    "$packageName.fileprovider",
                    photoFile
                )
                cameraIntent.putExtra(MediaStore.EXTRA_OUTPUT, cameraPhotoUri)
                intents.add(cameraIntent)
            }
        }

        // File picker intent
        val fileIntent = Intent(Intent.ACTION_GET_CONTENT).apply {
            addCategory(Intent.CATEGORY_OPENABLE)
            type = "*/*"
            putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true)
            putExtra(Intent.EXTRA_MIME_TYPES, arrayOf(
                "image/*", "video/*", "audio/*",
                "application/pdf",
                "application/msword",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            ))
        }

        // Combine into chooser
        val chooserIntent = Intent.createChooser(fileIntent, "Select file")
        if (intents.isNotEmpty()) {
            chooserIntent.putExtra(Intent.EXTRA_INITIAL_INTENTS, intents.toTypedArray())
        }

        fileChooserLauncher.launch(chooserIntent)
    }

    private fun createImageFile(): File? {
        return try {
            val timeStamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(Date())
            val storageDir = getExternalFilesDir(Environment.DIRECTORY_PICTURES)
            File.createTempFile("DYPU_${timeStamp}_", ".jpg", storageDir)
        } catch (e: Exception) {
            null
        }
    }

    // ──────────────────────────────────────────────────────────
    //  SWIPE-TO-REFRESH
    // ──────────────────────────────────────────────────────────

    private fun setupSwipeRefresh() {
        swipeRefresh.apply {
            setColorSchemeColors(
                Color.parseColor("#6366f1"), // Indigo (matches the app accent)
                Color.parseColor("#8b5cf6"), // Violet
                Color.parseColor("#a855f7")  // Purple
            )
            setProgressBackgroundColorSchemeColor(Color.parseColor("#1a1a2e"))
            setOnRefreshListener {
                webView.reload()
            }
        }
    }

    // ──────────────────────────────────────────────────────────
    //  BACK NAVIGATION
    // ──────────────────────────────────────────────────────────

    private fun setupBackNavigation() {
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                // 1. Exit fullscreen video if active
                if (fullscreenView != null) {
                    fullscreenCallback?.onCustomViewHidden()
                    fullscreenView = null
                    return
                }

                // 2. Go back in WebView history if possible
                if (webView.canGoBack()) {
                    webView.goBack()
                    return
                }

                // 3. Exit the app
                isEnabled = false
                onBackPressedDispatcher.onBackPressed()
            }
        })
    }

    // ──────────────────────────────────────────────────────────
    //  DEEP LINK / INTENT HANDLING
    // ──────────────────────────────────────────────────────────

    private fun handleIntent(intent: Intent?) {
        val uri = intent?.data
        if (uri != null && isInternalUrl(uri.toString())) {
            // Deep link — load the full URL in WebView
            webView.loadUrl(uri.toString())
        } else {
            // Normal launch — load the main URL
            webView.loadUrl(WEB_URL)
        }
    }

    // ──────────────────────────────────────────────────────────
    //  URL HELPERS
    // ──────────────────────────────────────────────────────────

    private fun isInternalUrl(url: String): Boolean {
        val webHost = Uri.parse(WEB_URL).host ?: return false
        val urlHost = Uri.parse(url).host ?: return false
        return urlHost == webHost
                || urlHost.endsWith(".firebaseapp.com")
                || urlHost.endsWith(".firebaseio.com")
                || urlHost == "accounts.google.com"
                || urlHost.endsWith(".googleapis.com")
                // Local development
                || urlHost == "localhost"
                || urlHost == "10.0.2.2"
    }


    // ──────────────────────────────────────────────────────────
    //  NOTIFICATIONS (Android 13+)
    // ──────────────────────────────────────────────────────────

    private fun requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED) {
                notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
            }
        }
    }

    // ──────────────────────────────────────────────────────────
    //  ERROR VIEW RETRY
    // ──────────────────────────────────────────────────────────

    fun onRetryClicked(@Suppress("UNUSED_PARAMETER") view: View) {
        errorView.visibility = View.GONE
        webView.reload()
    }
}

