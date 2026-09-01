package com.dypu.connect

import android.Manifest
import android.annotation.SuppressLint
import android.app.DownloadManager
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
import android.provider.MediaStore
import android.util.Log
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
        
        WindowCompat.setDecorFitsSystemWindows(window, false)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webView)
        swipeRefresh = findViewById(R.id.swipeRefresh)
        progressBar = findViewById(R.id.progressBar)
        errorView = findViewById(R.id.errorView)
        fullscreenContainer = findViewById(R.id.fullscreenContainer)

        setupWebView()
        setupGoogleSignIn()

        // Handle Safe Area Insets for Edge-to-Edge
        ViewCompat.setOnApplyWindowInsetsListener(webView) { _, insets ->
            val top = insets.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout()).top
            val bottom = insets.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout()).bottom
            val density = resources.displayMetrics.density
            safeAreaTopDp = (top / density).toInt()
            safeAreaBottomDp = (bottom / density).toInt()
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

        // Initial Load
        webView.loadUrl(BASE_URL)
        handleIntent(intent)
    }

    private fun setupGoogleSignIn() {
        val gso = GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
            .requestIdToken(getString(R.string.default_web_client_id)) // Requires google-services.json
            .requestEmail()
            .build()
        mGoogleSignInClient = GoogleSignIn.getClient(this, gso)
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.mediaPlaybackRequiresUserGesture = false
        settings.allowFileAccess = true
        settings.cacheMode = WebSettings.LOAD_DEFAULT
        settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
        settings.setSupportZoom(false)

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
                if (url.startsWith(BASE_URL)) return false
                
                try {
                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                    startActivity(intent)
                    return true
                } catch (e: Exception) {
                    Log.e(TAG, "Cannot handle URL: $url")
                }
                return false
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

            override fun onPermissionRequest(request: PermissionRequest?) {
                request?.grant(request.resources)
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
            request.allowScanningByMediaScanner()
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

        val fileIntent = Intent(Intent.ACTION_GET_CONTENT)
        fileIntent.addCategory(Intent.CATEGORY_OPENABLE)
        fileIntent.type = "*/*"
        fileIntent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true)
        fileIntent.putExtra(Intent.EXTRA_MIME_TYPES, arrayOf("image/*", "video/*", "audio/*", "application/pdf"))

        val chooserIntent = Intent.createChooser(fileIntent, "Select file")
        if (intents.isNotEmpty()) {
            chooserIntent.putExtra(Intent.EXTRA_INITIAL_INTENTS, intents.toTypedArray())
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
            "document.documentElement.style.setProperty('--android-safe-area-bottom', '${safeAreaBottomDp}px');",
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
        val url = intent?.getStringExtra("target_url") ?: return
        var finalUrl = url
        if (finalUrl.startsWith("/")) {
            finalUrl = BASE_URL + finalUrl
        }
        webView.loadUrl(finalUrl)
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

    inner class WebAppInterface {
        @JavascriptInterface
        fun showToast(message: String) {
            Toast.makeText(this@MainActivity, message, Toast.LENGTH_SHORT).show()
        }

        @JavascriptInterface
        fun vibrate(duration: Long) {
            val vibrator = getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(VibrationEffect.createOneShot(duration, VibrationEffect.DEFAULT_AMPLITUDE))
            } else {
                vibrator.vibrate(duration)
            }
        }

        @JavascriptInterface
        fun share(text: String, title: String) {
            val intent = Intent(Intent.ACTION_SEND)
            intent.type = "text/plain"
            intent.putExtra(Intent.EXTRA_SUBJECT, title)
            intent.putExtra(Intent.EXTRA_TEXT, text)
            startActivity(Intent.createChooser(intent, "Share via"))
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
    }
}
