plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.ksp)
}

android {
    namespace = "com.omix.aide"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.omix.aide"
        minSdk = 24
        targetSdk = 35
        // CI derives both of these from the release tag and passes them in as
        // -PaideVersionName / -PaideVersionCode, so an APK can never report a
        // version that disagrees with the GitHub release it hangs off. The
        // literals below are only the local-development fallback.
        versionCode = providers.gradleProperty("aideVersionCode").getOrElse("2").toInt()
        versionName = providers.gradleProperty("aideVersionName").getOrElse("1.0.2")

        // Accent theme baked into the APK, read by theme/Palette.kt and the
        // release banner. Defaults to the first entry in Palette.
        buildConfigField(
            "String",
            "BRANDED",
            "\"${providers.gradleProperty("aideBranded").getOrElse("plum")}\""
        )

        // Version code of the latest published release, injected by CI. 0 means
        // "no published release known", which keeps the update banner hidden.
        buildConfigField(
            "int",
            "LATEST_VERSION_CODE",
            providers.gradleProperty("aideLatestVersionCode").getOrElse("0")
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

    // The splash and release-banner layouts are ConstraintLayout-based.
    implementation(libs.androidx.constraintlayout)



    testImplementation(libs.junit)
    testImplementation(libs.mockk)
    testImplementation(libs.kotlinx.coroutines.test)
    debugImplementation(androidx.compose.ui.tooling)
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

        when {
            allowUnsigned ->
                logger.warn(
                    "aideAllowUnsignedRelease is set — this release APK will NOT be signed."
                )

            keystorePath.isNullOrBlank() ->
                throw GradleException(
                    "Refusing to build an unsigned release APK: ANDROID_KEYSTORE_PATH is not " +
                        "set. CI decodes ANDROID_KEYSTORE_BASE64 into it before building. Pass " +
                        "-PaideAllowUnsignedRelease=true if an unsigned build is really intended."
                )

            !file(keystorePath).exists() ->
                throw GradleException(
                    "Refusing to build a release APK: ANDROID_KEYSTORE_PATH points at " +
                        "'$keystorePath', which does not exist."
                )
        }
    }
}

tasks.matching { it.name == "preReleaseBuild" }.configureEach {
    dependsOn(verifyReleaseSigning)
}
