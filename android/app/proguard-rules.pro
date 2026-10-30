# Room Database
-keep class * extends androidx.room.RoomDatabase { <init>(); }
-keep @androidx.room.Dao interface *
-keep @androidx.room.Database class *
-keep @androidx.room.Entity class *
-dontwarn androidx.room.paging.**

# Keep entities and DAOs in aide package
-keep class com.omix.aide.data.local.entities.** { *; }
-keep class com.omix.aide.data.local.dao.** { *; }
-keep class com.omix.aide.data.local.AideDatabase { *; }

# WorkManager Workers
-keep class * extends androidx.work.ListenableWorker {
    public <init>(android.content.Context, androidx.work.WorkerParameters);
}
-keep class * extends androidx.work.Worker {
    public <init>(android.content.Context, androidx.work.WorkerParameters);
}
-keep class * extends androidx.work.CoroutineWorker {
    public <init>(android.content.Context, androidx.work.WorkerParameters);
}
-keep class com.omix.aide.work.** { *; }

# ViewModels and Compose Nav
-keep class * extends androidx.lifecycle.ViewModel { <init>(); }
-keep class com.omix.aide.ui.viewmodel.** { *; }

# Keep data models used in UI state or JSON serialization
-keep class com.omix.aide.data.repository.** { *; }
-keep class com.omix.aide.data.local.LocalBusinessStore** { *; }
-keep class com.omix.aide.data.local.SettingsStore** { *; }

# AndroidX Compose & Lifecycle
-keep class androidx.compose.** { *; }
-dontwarn androidx.compose.**
