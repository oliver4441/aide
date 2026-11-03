import java.security.KeyStore
import java.security.MessageDigest
import java.security.cert.X509Certificate
import java.util.Properties

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.ksp)
}

val localVersion = Properties().apply {
    rootProject.file("version.properties").inputStream().use { load(it) }
}
val releaseCertificate = rootProject.file("release-certificate.sha256").readText().trim().lowercase()
require(releaseCertificate.matches(Regex("[0-9a-f]{64}"))) { "Invalid pinned release certificate" }

android {
    namespace = "com.omix.aide"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.omix.aide"
        minSdk = 24
        targetSdk = 35
        // Independent monotonic build numbers: never concatenate dotted versions.
        versionCode = providers.gradleProperty("aideVersionCode").getOrElse(localVersion.getProperty("versionCode")).toInt()
        versionName = providers.gradleProperty("aideVersionName").getOrElse(localVersion.getProperty("versionName"))
        require(versionCode!! in 1..2_100_000_000) { "Invalid Android versionCode" }
        buildConfigField("String", "UPDATE_CERT_SHA256", "\"$releaseCertificate\"")

        // Accent theme baked into the APK, read by theme/Palette.kt and the
        // release banner. Defaults to the first entry in Palette.
        buildConfigField(
            "String",
            "BRANDED",
            "\"${providers.gradleProperty("aideBranded").getOrElse("plum")}\""
        )

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables {
            useSupportLibrary = true
        }
    }

    signingConfigs {
        // Release signing fails closed. This block used to quietly do nothing
        // when ANDROID_KEYSTORE_PATH was absent, which shipped unsigned APKs
        // (HANDOFF.md §2.17). The configuration phase still has to succeed for
        // debug builds, so the hard failure lives in verifyReleaseSigning,
        // which only release builds depend on.
        create("release") {
            // Request both schemes. v2 is required for this app's minSdk 24+;
            // v1 is only an optional fallback and may be omitted by the signer.
            // CI verifies v2 and smoke-tests installability on an API 29 emulator.
            enableV1Signing = true
            enableV2Signing = true
            enableV3Signing = true

            val keystorePath = System.getenv("ANDROID_KEYSTORE_PATH")
            if (!keystorePath.isNullOrBlank()) {
                storeFile = file(keystorePath)
                storePassword = System.getenv("ANDROID_STORE_PASSWORD")
                keyAlias = System.getenv("ANDROID_KEY_ALIAS")
                keyPassword = System.getenv("ANDROID_KEY_PASSWORD")
            }
        }
    }

    buildTypes {
        debug {
            // Debug keys can never replace a production install (or its data).
            applicationIdSuffix = ".debug"
            versionNameSuffix = "-debug"
        }
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            if (!System.getenv("ANDROID_KEYSTORE_PATH").isNullOrBlank()) {
                signingConfig = signingConfigs.getByName("release")
            }
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    buildFeatures {
        compose = true
        buildConfig = true
    }
    packaging {
        resources {
            excludes += "/META-INDEX/AL2.0"
            excludes += "/META-INDEX/LGPL2.1"
            excludes += "/META-INF/*.version"
        }
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.activity.compose)

    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.ui)
    implementation(libs.androidx.ui.graphics)
    implementation(libs.androidx.ui.tooling.preview)
    implementation(libs.androidx.material3)
    implementation(libs.androidx.material.icons.extended)
    implementation(libs.androidx.navigation.compose)

    implementation(libs.androidx.room.runtime)
    implementation(libs.androidx.room.ktx)
    ksp(libs.androidx.room.compiler)

    implementation(libs.androidx.work.runtime.ktx)

    // Declared explicitly rather than inherited from room-ktx: Dispatchers.Main
    // is what viewModelScope and the update check run on, and it must not
    // disappear if an upstream dependency changes.
    implementation(libs.kotlinx.coroutines.android)

    // The splash and release-banner layouts are ConstraintLayout-based.
    implementation(libs.androidx.constraintlayout)



    // Android's org.json implementation is used in production; a real JSON
    // implementation (not android.jar stubs) exercises the parser in JVM tests.
    testImplementation(libs.json)
    testImplementation(libs.junit)
    androidTestImplementation(platform(libs.androidx.compose.bom))
    androidTestImplementation(libs.androidx.ui.test.junit4)
    androidTestImplementation(libs.androidx.test.runner)
    androidTestImplementation(libs.androidx.test.core)
    debugImplementation(libs.androidx.ui.test.manifest)
    testImplementation(libs.mockk)
    testImplementation(libs.kotlinx.coroutines.test)
    debugImplementation(libs.androidx.ui.tooling)
}

/**
 * Fails the build when a release APK would be unsigned.
 *
 * Only release builds depend on this, so `assembleDebug` is unaffected. Pass
 * -PaideAllowUnsignedRelease=true to build an unsigned release on purpose (CI
 * does this for pull-request builds, to keep R8 and resource shrinking
 * covered without needing the keystore).
 */
val verifyReleaseSigning by tasks.registering {
    doLast {
        val keystorePath = System.getenv("ANDROID_KEYSTORE_PATH")
        val allowUnsigned = providers.gradleProperty("aideAllowUnsignedRelease")
            .getOrElse("false")
            .toBoolean()

        if (allowUnsigned) {
            check(keystorePath.isNullOrBlank()) { "Unsigned CI opt-out cannot be combined with a release key" }
            logger.warn("Explicit unsigned CI build — not distributable.")
            return@doLast
        }
        check(!keystorePath.isNullOrBlank() && file(keystorePath).isFile) {
            "Refusing unsigned release: set ANDROID_KEYSTORE_PATH to the existing release keystore."
        }
        val storePassword = System.getenv("ANDROID_STORE_PASSWORD")
        val alias = System.getenv("ANDROID_KEY_ALIAS")
        val keyPassword = System.getenv("ANDROID_KEY_PASSWORD")
        check(!storePassword.isNullOrBlank() && !alias.isNullOrBlank() && !keyPassword.isNullOrBlank()) {
            "All four release signing settings are required. Never generate a replacement release key."
        }
        try {
            val store = KeyStore.getInstance(file(keystorePath), storePassword.toCharArray())
            check(store.isKeyEntry(alias)) { "Release alias is not a private key" }
            check(store.getKey(alias, keyPassword.toCharArray()) != null) { "Release private key is unavailable" }
            val certificate = store.getCertificate(alias) as X509Certificate
            certificate.checkValidity()
            val fingerprint = MessageDigest.getInstance("SHA-256").digest(certificate.encoded)
                .joinToString("") { "%02x".format(it) }
            check(fingerprint == releaseCertificate) {
                "Release certificate does not match android/release-certificate.sha256. Android would reject upgrades."
            }
        } catch (error: Exception) {
            throw GradleException("Release signing validation failed. Check the existing key, alias, passwords and pinned certificate.", error)
        }
    }
}

tasks.matching { it.name == "preReleaseBuild" }.configureEach {
    dependsOn(verifyReleaseSigning)
}
