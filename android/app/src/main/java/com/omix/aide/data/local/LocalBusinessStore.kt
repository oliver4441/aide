package com.omix.aide.data.local

import android.content.Context
import java.util.UUID

/**
 * Holds the single local business this device manages.
 *
 * The app is local-only: there is no account, no server, and no sync. A
 * business id is generated once on first launch and reused for the life of the
 * install so rows in Room keep a stable owner.
 */
class LocalBusinessStore(context: Context) {

    private val prefs = context.getSharedPreferences("aide_business", Context.MODE_PRIVATE)

    fun getBusinessId(): String {
        prefs.getString(KEY_BUSINESS_ID, null)?.let { return it }
        val generated = UUID.randomUUID().toString()
        prefs.edit().putString(KEY_BUSINESS_ID, generated).apply()
        return generated
    }

    fun getBusinessName(): String =
        prefs.getString(KEY_BUSINESS_NAME, null) ?: "My Business"

    fun setBusinessName(name: String) {
        val trimmed = name.trim()
        if (trimmed.isNotEmpty()) {
            prefs.edit().putString(KEY_BUSINESS_NAME, trimmed).apply()
        }
    }

    fun hasCompletedSetup(): Boolean = prefs.getBoolean(KEY_SETUP_DONE, false)

    fun markSetupComplete() {
        prefs.edit().putBoolean(KEY_SETUP_DONE, true).apply()
    }

    /** Whether the app launched on a version behind the latest published release. */
    fun isOutOfDate(): Boolean = prefs.getBoolean(KEY_OUT_OF_DATE, false)

    /** Mark the app as up to date with the latest published release. */
    fun markUpToDate() {
        prefs.edit().putBoolean(KEY_OUT_OF_DATE, false).apply()
    }

    /** Mark the app as out of date (called by [ReleaseReceiver] when a newer
     *  release is available). */
    fun markOutOfDate() {
        prefs.edit().putBoolean(KEY_OUT_OF_DATE, true).apply()
    }

    private companion object {
        const val KEY_BUSINESS_ID = "business_id"
        const val KEY_BUSINESS_NAME = "business_name"
        const val KEY_SETUP_DONE = "setup_done"
        const val KEY_OUT_OF_DATE = "aide_out_of_date"
    }
}
