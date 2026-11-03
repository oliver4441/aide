package com.omix.aide.updates

import android.content.Context

/** Only update metadata is persisted, never credentials or business data. */
class AndroidUpdateStorage(context: Context) : UpdateStorage {
    private val prefs = context.getSharedPreferences("aide_updates", Context.MODE_PRIVATE)
    override var lastAttempt: Long
        get() = prefs.getLong("last_attempt", 0)
        set(value) { prefs.edit().putLong("last_attempt", value).apply() }
    override var cachedManifest: String?
        get() = prefs.getString("manifest", null)
        set(value) { prefs.edit().putString("manifest", value).apply() }
    var downloadManifest: String?
        get() = prefs.getString("download_manifest", null)
        set(value) { prefs.edit().putString("download_manifest", value).apply() }
    var workId: String?
        get() = prefs.getString("work_id", null)
        set(value) { prefs.edit().putString("work_id", value).apply() }
    var deferredVersion: Long
        get() = prefs.getLong("deferred_version", 0)
        set(value) { prefs.edit().putLong("deferred_version", value).apply() }
    var deferredUntil: Long
        get() = prefs.getLong("deferred_until", 0)
        set(value) { prefs.edit().putLong("deferred_until", value).apply() }
    var pendingInstallVersion: Long
        get() = prefs.getLong("pending_install", 0)
        set(value) { prefs.edit().putLong("pending_install", value).commit() }
}
