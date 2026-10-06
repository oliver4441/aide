package com.omix.aide.data.local

import android.content.Context
import android.util.Log
import java.io.File

/**
 * Startup probe for the local database.
 *
 * Room validates the schema lazily, the first time the file is actually opened.
 * That means a failed migration does not throw from `getDatabase` -- it throws
 * later, from inside a coroutine on a background thread, where nothing catches
 * it. The result is an app that opens and immediately dies, over and over, with
 * no screen and no way out.
 *
 * This forces the open during Application.onCreate so a failure is a value we
 * can hold rather than an exception we cannot see, and so the user gets a
 * recovery screen instead of a crash loop.
 */
object DatabaseHealth {

    private const val TAG = "AideDatabase"
    private const val PREFS = "aide_health"
    private const val KEY_BROKEN = "db_broken"
    private const val KEY_ERROR = "db_error"

    private val DB_FILES = listOf("aide_database", "aide_database-wal", "aide_database-shm")

    /**
     * Opens the database once and reports whether it worked.
     *
     * Returns true when healthy. On failure the cause is logged, persisted, and
     * copied to a file the user can send us -- which is the only way to actually
     * diagnose a migration mismatch on a real device.
     */
    fun probe(context: Context): Boolean {
        val app = context.applicationContext
        return try {
            // Touching the helper is what triggers the open, and therefore the
            // migration and Room's post-migration schema validation.
            AideDatabase.getDatabase(app).openHelper.writableDatabase
            prefs(app).edit().putBoolean(KEY_BROKEN, false).remove(KEY_ERROR).apply()
            true
        } catch (t: Throwable) {
            // Throwable, not Exception: a corrupt SQLite file surfaces as an
            // error type that is not an Exception subclass.
            val message = "${t::class.java.simpleName}: ${t.message}"
            Log.e(TAG, "Database could not be opened", t)
            writeFailureReport(app, message)
            prefs(app).edit()
                .putBoolean(KEY_BROKEN, true)
                .putString(KEY_ERROR, message)
                .apply()
            false
        }
    }

    /** True when the last probe failed, so the UI can offer recovery. */
    fun isBroken(context: Context): Boolean =
        prefs(context.applicationContext).getBoolean(KEY_BROKEN, false)

    /** The stored failure message, for showing on the recovery screen. */
    fun errorMessage(context: Context): String? =
        prefs(context.applicationContext).getString(KEY_ERROR, null)

    /** Forgets a previous failure, so a Retry can succeed. */
    fun clear(context: Context) {
        prefs(context.applicationContext).edit()
            .putBoolean(KEY_BROKEN, false)
            .remove(KEY_ERROR)
            .apply()
    }

    /**
     * Copies the database files somewhere the user can reach them.
     *
     * The point is that a reset destroys data. Copying the raw files first
     * means a shop's history can still be recovered by hand even if the schema
     * cannot be opened by this build.
     */
    fun exportDatabaseFiles(context: Context): File? {
        val app = context.applicationContext
        val source = app.getDatabasePath(DB_FILES.first())
        if (!source.exists()) return null

        val dir = app.getExternalFilesDir(null) ?: app.filesDir
        val stamp = System.currentTimeMillis()
        val target = File(dir, "aide-database-$stamp")
        if (!target.exists()) target.mkdirs()

        DB_FILES.forEach { name ->
            val from = File(source.parentFile, name)
            if (from.exists()) from.copyTo(File(target, name), overwrite = true)
        }
        File(target, "error.txt").writeText(errorMessage(app) ?: "unknown")
        return target
    }

    /**
     * Deletes the database so the next launch starts fresh.
     *
     * Destructive, and only reachable from an explicit tap on the recovery
     * screen -- never automatically.
     */
    fun deleteDatabase(context: Context) {
        val app = context.applicationContext
        AideDatabase.closeInstance()
        val base = app.getDatabasePath(DB_FILES.first()).parentFile ?: return
        DB_FILES.forEach { name -> File(base, name).delete() }
        clear(app)
    }

    private fun prefs(context: Context) =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    /** Drops a copy of the failure next to the exported files. */
    private fun writeFailureReport(context: Context, message: String) {
        runCatching {
            val dir = context.getExternalFilesDir(null) ?: context.filesDir
            File(dir, "aide-db-error.txt").writeText(
                "Aide database could not be opened.\n\n$message\n"
            )
        }
    }
}