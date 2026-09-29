# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.kts.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# Keep data classes for Room database
-keep class ke.co.aide.data.local.entities.** { *; }
-keep class ke.co.aide.data.local.dao.** { *; }
-keep class ke.co.aide.data.local.AideDatabase { *; }

# Keep Retrofit API service interfaces and DTOs
-keep interface ke.co.aide.data.remote.api.** { *; }
-keep class ke.co.aide.data.remote.dto.** { *; }
-keep class ke.co.aide.data.remote.auth.** { *; }

# Keep session manager
-keep class ke.co.aide.data.remote.auth.SessionManager { *; }

# Keep sync engine classes
-keep class ke.co.aide.sync.** { *; }

# Keep ViewModel classes
-keep class ke.co.aide.ui.viewmodel.** { *; }

# Keep Room database
-keep class * extends androidx.room.RoomDatabase
-dontwarn androidx.room.paging.**

# Keep serialization classes
-keep class kotlinx.serialization.** { *; }
-keep class kotlinx.coroutines.** { *; }

# Keep OkHttp
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }
-dontwarn okhttp3.**
-dontwarn okio.**

# Keep Retrofit
-keep class retrofit2.** { *; }
-dontwarn retrofit2.**
-dontwarn javax.annotation.**

# Keep Kotlin coroutines
-keepnames class kotlinx.coroutines.internal.MainDispatcherFactory {}
-keepnames class kotlinx.coroutines.CoroutineExceptionHandler {}
-dontwarn kotlinx.coroutines.suspend.*

# Keep Compose
-keep class androidx.compose.** { *; }
-keep interface androidx.compose.** { *; }
-dontwarn androidx.compose.**

# Keep navigation
-keep class androidx.navigation.** { *; }
-dontwarn androidx.navigation.**

# Keep WorkManager
-keep class androidx.work.** { *; }
-dontwarn androidx.work.**

# Keep Room compiler generated code
-keep class * extends androidx.room.RoomDatabase
-keep class * extends androidx.room.dao
-keep @androidx.room.Entity class *
-keepclassmembers @androidx.room.Entity class * {
    *;
}

# Keep KSP generated code
-keep class com.google.devtools.ksp.** { *; }

# Preserve JSON field names for API responses
-keepclassmembers class * {
    @kotlinx.serialization.Serializable <fields>;
}

# Keep @OptIn annotation
-keep class kotlin.Experimental { *; }
-keep class kotlin.RequiresOptIn { *; }
-keep class kotlin.Deprecated { *; }

# Preserve lambda expressions
-keepclassmembers class * {
    java.lang.Object invoke(...);
}

# Keep companion objects
-keepclassmembers class * {
    public static ** Companion;
}

# Keep enum classes
-keepclassmembers enum * {
    **[] $VALUES;
    public *;
}

# Preserve annotation attributes
-keepattributes RuntimeVisibleAnnotations
-keepattributes AnnotationDefault
-keepattributes EnclosingMethod
-keepattributes InnerClasses

# Keep generic signature of Call, ResponseBody, and others.
-keep,allowobfuscation,allowshrinking interface kotlinx.coroutines.InternalCoroutinesApi
-keep,allowobfuscation,allowshrinking interface kotlinx.coroutines.FlowPreview
-keep,allowobfuscation,allowshrinking interface kotlinx.coroutines.CoroutineContext$Element
