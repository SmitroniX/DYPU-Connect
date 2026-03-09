package com.dypu.connect;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.DownloadManager;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.Message;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.provider.MediaStore;
import android.view.View;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.URLUtil;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.ProgressBar;
import android.widget.Toast;

import androidx.activity.OnBackPressedCallback;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;
import androidx.core.splashscreen.SplashScreen;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;
import androidx.webkit.WebSettingsCompat;
import androidx.webkit.WebViewFeature;

import java.io.File;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

public class MainActivity extends AppCompatActivity {

    // ── Constants ─────────────────────────────────────────────
    private static final String WEB_URL = BuildConfig.WEB_APP_URL;
    private static final String TAG = "DYPUConnect";

    // ── Views ─────────────────────────────────────────────────
    private WebView webView;
    private ProgressBar progressBar;
    private SwipeRefreshLayout swipeRefresh;
    private View errorView;
    private FrameLayout fullscreenContainer;

    // ── File Upload ───────────────────────────────────────────
    private ValueCallback<Uri[]> fileUploadCallback;
    private Uri cameraPhotoUri;

    // ── Fullscreen (video) ────────────────────────────────────
    private View fullscreenView;
    private WebChromeClient.CustomViewCallback fullscreenCallback;

    // ── Splash ────────────────────────────────────────────────
    private boolean isWebViewReady = false;

    // ── Permission Launchers ──────────────────────────────────
    private ActivityResultLauncher<String[]> cameraPermissionLauncher;
    private ActivityResultLauncher<Intent> fileChooserLauncher;
    private ActivityResultLauncher<String> notificationPermissionLauncher;
    private ActivityResultLauncher<String[]> webrtcPermissionLauncher;

    // Pending WebView permission request
    private PermissionRequest pendingPermissionRequest;

    // ──────────────────────────────────────────────────────────
    //  LIFECYCLE
    // ──────────────────────────────────────────────────────────

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Splash screen (Android 12+ API, back-compat via core-splashscreen)
        SplashScreen splashScreen = SplashScreen.installSplashScreen(this);
        splashScreen.setKeepOnScreenCondition(() -> !isWebViewReady);

        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        // Edge-to-edge & dark status/nav bars
        setupSystemBars();

        // Find views
        webView = findViewById(R.id.webView);
        progressBar = findViewById(R.id.progressBar);
        swipeRefresh = findViewById(R.id.swipeRefresh);
        errorView = findViewById(R.id.errorView);
        fullscreenContainer = findViewById(R.id.fullscreenContainer);

        // Register activity result launchers
        registerLaunchers();

        // Setup WebView
        setupWebView();

        // Setup swipe-to-refresh
        setupSwipeRefresh();

        // Setup back button handling
        setupBackNavigation();

        // Request notification permission (Android 13+)
        requestNotificationPermission();

        // Load the web app (or handle deep link)
        handleIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIntent(intent);
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) webView.onResume();
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (webView != null) webView.onPause();
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
        }
        super.onDestroy();
    }

    // ──────────────────────────────────────────────────────────
    //  SYSTEM BARS (edge-to-edge dark theme)
    // ──────────────────────────────────────────────────────────

    private void setupSystemBars() {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
        getWindow().setStatusBarColor(Color.parseColor("#0f0f0f"));
        getWindow().setNavigationBarColor(Color.parseColor("#0f0f0f"));

        WindowInsetsControllerCompat insetsController = new WindowInsetsControllerCompat(getWindow(), getWindow().getDecorView());
        insetsController.setAppearanceLightStatusBars(false);
        insetsController.setAppearanceLightNavigationBars(false);

        // Keep screen on while app is visible
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    }

    // ──────────────────────────────────────────────────────────
    //  REGISTER ACTIVITY RESULT LAUNCHERS
    // ──────────────────────────────────────────────────────────

    private void registerLaunchers() {
        // File chooser result
        fileChooserLauncher = registerForActivityResult(
                new ActivityResultContracts.StartActivityForResult(),
                result -> {
                    if (result.getResultCode() == RESULT_OK) {
                        Intent data = result.getData();
                        Uri[] results = null;
                        if (data != null && data.getClipData() != null) {
                            int count = data.getClipData().getItemCount();
                            results = new Uri[count];
                            for (int i = 0; i < count; i++) {
                                results[i] = data.getClipData().getItemAt(i).getUri();
                            }
                        } else if (data != null && data.getData() != null) {
                            results = new Uri[]{data.getData()};
                        } else if (cameraPhotoUri != null) {
                            results = new Uri[]{cameraPhotoUri};
                        }

                        if (fileUploadCallback != null) {
                            fileUploadCallback.onReceiveValue(results != null ? results : new Uri[0]);
                        }
                    } else {
                        if (fileUploadCallback != null) {
                            fileUploadCallback.onReceiveValue(new Uri[0]);
                        }
                    }
                    fileUploadCallback = null;
                    cameraPhotoUri = null;
                }
        );

        // Camera permission for file upload
        cameraPermissionLauncher = registerForActivityResult(
                new ActivityResultContracts.RequestMultiplePermissions(),
                permissions -> openFileChooser()
        );

        // WebRTC permission
        webrtcPermissionLauncher = registerForActivityResult(
                new ActivityResultContracts.RequestMultiplePermissions(),
                permissions -> {
                    if (pendingPermissionRequest == null) return;
                    List<String> granted = new ArrayList<>();
                    for (String resource : pendingPermissionRequest.getResources()) {
                        if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)) {
                            if (Boolean.TRUE.equals(permissions.get(Manifest.permission.CAMERA))) {
                                granted.add(resource);
                            }
                        } else if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)) {
                            if (Boolean.TRUE.equals(permissions.get(Manifest.permission.RECORD_AUDIO))) {
                                granted.add(resource);
                            }
                        } else {
                            granted.add(resource);
                        }
                    }

                    if (!granted.isEmpty()) {
                        pendingPermissionRequest.grant(granted.toArray(new String[0]));
                    } else {
                        pendingPermissionRequest.deny();
                    }
                    pendingPermissionRequest = null;
                }
        );

        // Notification permission
        notificationPermissionLauncher = registerForActivityResult(
                new ActivityResultContracts.RequestPermission(),
                granted -> { /* no-op */ }
        );
    }

    // ──────────────────────────────────────────────────────────
    //  WEBVIEW SETUP
    // ──────────────────────────────────────────────────────────

    @SuppressLint("SetJavaScriptEnabled")
    private void setupWebView() {
        WebSettings settings = webView.getSettings();

        if (WebViewFeature.isFeatureSupported(WebViewFeature.ALGORITHMIC_DARKENING)) {
            WebSettingsCompat.setAlgorithmicDarkeningAllowed(settings, true);
        }

        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setSupportMultipleWindows(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        // User-Agent: Remove WebView marker
        String defaultUA = settings.getUserAgentString();
        settings.setUserAgentString(defaultUA.replace("; wv)", ")") + " DYPUConnect/1.0");

        webView.setScrollbarFadingEnabled(true);
        webView.setScrollBarStyle(View.SCROLLBARS_INSIDE_OVERLAY);

        // Cookie support
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);

        // Add Javascript Interface
        webView.addJavascriptInterface(new WebAppInterface(this), "AndroidApp");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
                progressBar.setVisibility(View.VISIBLE);
                errorView.setVisibility(View.GONE);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                progressBar.setVisibility(View.GONE);
                swipeRefresh.setRefreshing(false);
                if (!isWebViewReady) {
                    isWebViewReady = true;
                }

                // Inject CSS to hide PWA install banners
                view.evaluateJavascript(
                        "(function() {" +
                                "var style = document.createElement('style');" +
                                "style.textContent = '.pwa-install-banner, [data-pwa-install] { display: none !important; }';" +
                                "document.head.appendChild(style);" +
                                "})();", null);
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                if (isInternalUrl(url)) return false;

                if (url.startsWith("tel:") || url.startsWith("mailto:") || url.startsWith("sms:")) {
                    try {
                        startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
                    } catch (ActivityNotFoundException ignored) {}
                    return true;
                }

                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
                } catch (ActivityNotFoundException ignored) {}
                return true;
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view, request, error);
                if (request.isForMainFrame()) {
                    progressBar.setVisibility(View.GONE);
                    swipeRefresh.setRefreshing(false);
                    errorView.setVisibility(View.VISIBLE);
                    isWebViewReady = true;
                }
            }

            @Override
            public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse errorResponse) {
                super.onReceivedHttpError(view, request, errorResponse);
                if (request.isForMainFrame() && errorResponse.getStatusCode() >= 500) {
                    errorView.setVisibility(View.VISIBLE);
                }
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                progressBar.setProgress(newProgress);
                if (newProgress == 100) {
                    progressBar.setVisibility(View.GONE);
                }
            }

            @Override
            public void onPermissionRequest(PermissionRequest request) {
                List<String> neededPermissions = new ArrayList<>();
                for (String resource : request.getResources()) {
                    if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)) {
                        if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
                            neededPermissions.add(Manifest.permission.CAMERA);
                        }
                    } else if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)) {
                        if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                            neededPermissions.add(Manifest.permission.RECORD_AUDIO);
                        }
                    }
                }

                if (neededPermissions.isEmpty()) {
                    request.grant(request.getResources());
                } else {
                    pendingPermissionRequest = request;
                    webrtcPermissionLauncher.launch(neededPermissions.toArray(new String[0]));
                }
            }

            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                if (fileUploadCallback != null) fileUploadCallback.onReceiveValue(null);
                fileUploadCallback = filePathCallback;

                if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
                    cameraPermissionLauncher.launch(new String[]{Manifest.permission.CAMERA});
                } else {
                    openFileChooser();
                }
                return true;
            }

            @Override
            public void onShowCustomView(View view, CustomViewCallback callback) {
                if (fullscreenView != null) {
                    callback.onCustomViewHidden();
                    return;
                }
                fullscreenView = view;
                fullscreenCallback = callback;
                fullscreenContainer.addView(view);
                fullscreenContainer.setVisibility(View.VISIBLE);
                webView.setVisibility(View.GONE);

                WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
                WindowInsetsControllerCompat controller = new WindowInsetsControllerCompat(getWindow(), getWindow().getDecorView());
                controller.hide(WindowInsetsCompat.Type.systemBars());
                controller.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }

            @Override
            public void onHideCustomView() {
                fullscreenContainer.removeView(fullscreenView);
                fullscreenContainer.setVisibility(View.GONE);
                webView.setVisibility(View.VISIBLE);
                fullscreenView = null;
                if (fullscreenCallback != null) fullscreenCallback.onCustomViewHidden();
                fullscreenCallback = null;

                WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
                WindowInsetsControllerCompat controller = new WindowInsetsControllerCompat(getWindow(), getWindow().getDecorView());
                controller.show(WindowInsetsCompat.Type.systemBars());
            }

            @Override
            public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, Message resultMsg) {
                WebView newWebView = new WebView(MainActivity.this);
                newWebView.setWebViewClient(new WebViewClient() {
                    @Override
                    public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                        String url = request.getUrl().toString();
                        if (isInternalUrl(url)) {
                            MainActivity.this.webView.loadUrl(url);
                        } else {
                            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
                        }
                        return true;
                    }
                });
                WebView.WebViewTransport transport = (WebView.WebViewTransport) resultMsg.obj;
                transport.setWebView(newWebView);
                resultMsg.sendToTarget();
                return true;
            }

            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                callback.invoke(origin, true, false);
            }
        });

        webView.setDownloadListener((url, userAgent, contentDisposition, mimeType, contentLength) -> {
            try {
                DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
                request.setMimeType(mimeType);
                request.addRequestHeader("User-Agent", userAgent);
                request.setDescription("Downloading file...");
                request.setTitle(URLUtil.guessFileName(url, contentDisposition, mimeType));
                request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, URLUtil.guessFileName(url, contentDisposition, mimeType));

                DownloadManager dm = (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
                dm.enqueue(request);

                Toast.makeText(MainActivity.this, "Downloading...", Toast.LENGTH_SHORT).show();
            } catch (Exception e) {
                Toast.makeText(MainActivity.this, "Download failed", Toast.LENGTH_SHORT).show();
            }
        });
    }

    // ──────────────────────────────────────────────────────────
    //  FILE CHOOSER
    // ──────────────────────────────────────────────────────────

    private void openFileChooser() {
        List<Intent> intents = new ArrayList<>();

        Intent cameraIntent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
        if (cameraIntent.resolveActivity(getPackageManager()) != null) {
            File photoFile = createImageFile();
            if (photoFile != null) {
                cameraPhotoUri = FileProvider.getUriForFile(this, getPackageName() + ".fileprovider", photoFile);
                cameraIntent.putExtra(MediaStore.EXTRA_OUTPUT, cameraPhotoUri);
                intents.add(cameraIntent);
            }
        }

        Intent fileIntent = new Intent(Intent.ACTION_GET_CONTENT);
        fileIntent.addCategory(Intent.CATEGORY_OPENABLE);
        fileIntent.setType("*/*");
        fileIntent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
        fileIntent.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{
                "image/*", "video/*", "audio/*",
                "application/pdf",
                "application/msword",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        });

        Intent chooserIntent = Intent.createChooser(fileIntent, "Select file");
        if (!intents.isEmpty()) {
            chooserIntent.putExtra(Intent.EXTRA_INITIAL_INTENTS, intents.toArray(new Intent[0]));
        }

        fileChooserLauncher.launch(chooserIntent);
    }

    private File createImageFile() {
        try {
            String timeStamp = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(new Date());
            File storageDir = getExternalFilesDir(Environment.DIRECTORY_PICTURES);
            return File.createTempFile("DYPU_" + timeStamp + "_", ".jpg", storageDir);
        } catch (IOException e) {
            return null;
        }
    }

    // ──────────────────────────────────────────────────────────
    //  HELPERS
    // ──────────────────────────────────────────────────────────

    private void setupSwipeRefresh() {
        swipeRefresh.setColorSchemeColors(
                Color.parseColor("#6366f1"),
                Color.parseColor("#8b5cf6"),
                Color.parseColor("#a855f7")
        );
        swipeRefresh.setProgressBackgroundColorSchemeColor(Color.parseColor("#1a1a2e"));
        swipeRefresh.setOnRefreshListener(() -> webView.reload());
    }

    private void setupBackNavigation() {
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (fullscreenView != null) {
                    if (fullscreenCallback != null) fullscreenCallback.onCustomViewHidden();
                    fullscreenView = null;
                    return;
                }

                if (webView.canGoBack()) {
                    webView.goBack();
                    return;
                }

                setEnabled(false);
                getOnBackPressedDispatcher().onBackPressed();
            }
        });
    }

    private void handleIntent(Intent intent) {
        Uri uri = intent.getData();
        if (uri != null && isInternalUrl(uri.toString())) {
            webView.loadUrl(uri.toString());
        } else {
            webView.loadUrl(WEB_URL);
        }
    }

    private boolean isInternalUrl(String url) {
        String webHost = Uri.parse(WEB_URL).getHost();
        String urlHost = Uri.parse(url).getHost();
        if (webHost == null || urlHost == null) return false;
        
        // Match the web host exactly or as a sub-domain (for netlify.app, vercel.app)
        boolean isMainHost = urlHost.equals(webHost) || urlHost.endsWith("." + webHost);
        
        return isMainHost
                || urlHost.endsWith(".firebaseapp.com")
                || urlHost.endsWith(".firebaseio.com")
                || urlHost.equals("accounts.google.com")
                || urlHost.endsWith(".googleapis.com")
                || urlHost.equals("localhost")
                || urlHost.equals("10.0.2.2");
    }

    private void requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS);
            }
        }
    }

    public void onRetryClicked(View view) {
        errorView.setVisibility(View.GONE);
        webView.reload();
    }

    /**
     * Helper to call a JavaScript function on the web side.
     * The web side should have a global function 'onAndroidEvent(event, data)'.
     */
    public void emitToWeb(String event, String data) {
        webView.post(() -> {
            String script = String.format("if(window.onAndroidEvent) { window.onAndroidEvent('%s', '%s'); }", event, data);
            webView.evaluateJavascript(script, null);
        });
    }

    // ──────────────────────────────────────────────────────────
    //  JAVASCRIPT INTERFACE
    // ──────────────────────────────────────────────────────────

    public static class WebAppInterface {
        private final MainActivity mActivity;

        WebAppInterface(MainActivity activity) {
            mActivity = activity;
        }

        @JavascriptInterface
        public void showToast(String message) {
            Toast.makeText(mActivity, message, Toast.LENGTH_SHORT).show();
        }

        @JavascriptInterface
        public void vibrate(long duration) {
            Vibrator v = (Vibrator) mActivity.getSystemService(Context.VIBRATOR_SERVICE);
            if (v != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    v.vibrate(VibrationEffect.createOneShot(duration, VibrationEffect.DEFAULT_AMPLITUDE));
                } else {
                    v.vibrate(duration);
                }
            }
        }

        @JavascriptInterface
        public void share(String text, String title) {
            Intent sendIntent = new Intent();
            sendIntent.setAction(Intent.ACTION_SEND);
            sendIntent.putExtra(Intent.EXTRA_TEXT, text);
            sendIntent.setType("text/plain");

            Intent shareIntent = Intent.createChooser(sendIntent, title);
            mActivity.startActivity(shareIntent);
        }
        
        @JavascriptInterface
        public String getAppVersion() {
            try {
                return mActivity.getPackageManager().getPackageInfo(mActivity.getPackageName(), 0).versionName;
            } catch (PackageManager.NameNotFoundException e) {
                return "1.0.0";
            }
        }

        @JavascriptInterface
        public void onWebReady() {
            // Web app is fully loaded and ready to receive events
            mActivity.runOnUiThread(() -> {
                mActivity.emitToWeb("app_connected", "Native bridge is active");
            });
        }
    }
}
