plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("com.google.gms.google-services")
}

android {
    namespace = "com.dypu.connect"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.dypu.connect"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"

        // ── Deployed web app URL ──
        buildConfigField("String", "WEB_APP_URL", "\"https://dypu-connect.netlify.app\"")
    }

    buildFeatures {
        buildConfig = true
        viewBinding = true
    }

    signingConfigs {
        create("release") {
            // Priority: Environment Variables (CI) > Local Keystore File
            val envFile = System.getenv("KEYSTORE_FILE")
            val envPassword = System.getenv("KEYSTORE_PASSWORD")
            val envAlias = System.getenv("KEY_ALIAS")
            val envKeyPassword = System.getenv("KEY_PASSWORD")

            if (envFile != null && file(envFile).exists()) {
                storeFile = file(envFile)
                storePassword = envPassword
                keyAlias = envAlias
                keyPassword = envKeyPassword
            } else {
                // Fallback for local development
                val localKeystore = file("keystore/release.keystore")
                if (localKeystore.exists()) {
                    storeFile = localKeystore
                    storePassword = envPassword ?: "dypuconnect" 
                    keyAlias = envAlias ?: "dypu-connect" 
                    keyPassword = envKeyPassword ?: "dypuconnect"
                }
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            // Only apply signing if storeFile is set
            if (signingConfigs.getByName("release").storeFile != null) {
                signingConfig = signingConfigs.getByName("release")
            }
        }
        debug {
            isDebuggable = true
            applicationIdSuffix = ".debug"
            versionNameSuffix = "-debug"
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    // Set custom output name for APKs
    setProperty("archivesBaseName", "DYPU-Connect")
}

dependencies {
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("com.google.android.material:material:1.12.0")
    implementation("androidx.activity:activity-ktx:1.9.3")
    implementation("androidx.constraintlayout:constraintlayout:2.2.0")
    implementation("androidx.swiperefreshlayout:swiperefreshlayout:1.1.0")
    implementation("androidx.webkit:webkit:1.12.1")
    implementation("androidx.core:core-splashscreen:1.0.1")

    // Import the Firebase BoM
    implementation(platform("com.google.firebase:firebase-bom:34.9.0"))

    // Firebase SDKs (versions managed by BoM)
    implementation("com.google.firebase:firebase-analytics")
    implementation("com.google.firebase:firebase-messaging")
    implementation("com.google.firebase:firebase-auth")
    implementation("com.google.android.gms:play-services-auth:21.3.0")
}
