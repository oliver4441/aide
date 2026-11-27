package com.omix.aide.data.local

import android.content.Context
import com.omix.aide.BuildConfig
import java.util.UUID

/**
 * The Aide Cloud account this device is linked to.
 *
 * Holds the bearer token (30-day expiry, issued by `/api/auth/mobile-login`) and
 * the business it grants access to. Kept in private SharedPreferences: the token
 * is scoped to one account on one device and never leaves the app.
 */
data class CloudSession(
    val baseUrl: String,
    val token: String,
    val email: String,
    val name: String,
    val userId: String,
    val businessId: String,
    val lastSyncAt: String? = null,
    val autoSync: Boolean = true,
    val deviceId: String = ""
) {
    val isLinked: Boolean get() = token.isNotBlank() && businessId.isNotBlank()
}

class CloudSessionStore(context: Context) {

    private val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    /** A stable id for this install, so the server can tell devices apart. */
    fun deviceId(): String {
        prefs.getString(KEY_DEVICE_ID, null)?.let { return it }
        val generated = UUID.randomUUID().toString()
        prefs.edit().putString(KEY_DEVICE_ID, generated).apply()
        return generated
    }

    fun defaultBaseUrl(): String =
        prefs.getString(KEY_BASE_URL, null) ?: BuildConfig.CLOUD_BASE_URL

    fun read(): CloudSession? {
        val token = prefs.getString(KEY_TOKEN, null) ?: return null
        if (token.isBlank()) return null
        return CloudSession(
            baseUrl = prefs.getString(KEY_BASE_URL, null) ?: BuildConfig.CLOUD_BASE_URL,
            token = token,
            email = prefs.getString(KEY_EMAIL, "") ?: "",
            name = prefs.getString(KEY_NAME, "") ?: "",
            userId = prefs.getString(KEY_USER_ID, "") ?: "",
            businessId = prefs.getString(KEY_BUSINESS_ID, "") ?: "",
            lastSyncAt = prefs.getString(KEY_LAST_SYNC, null),
            autoSync = prefs.getBoolean(KEY_AUTO_SYNC, true),
            deviceId = deviceId()
        )
    }

    fun save(session: CloudSession) {
        prefs.edit()
            .putString(KEY_BASE_URL, session.baseUrl)
            .putString(KEY_TOKEN, session.token)
            .putString(KEY_EMAIL, session.email)
            .putString(KEY_NAME, session.name)
            .putString(KEY_USER_ID, session.userId)
            .putString(KEY_BUSINESS_ID, session.businessId)
            .putString(KEY_LAST_SYNC, session.lastSyncAt)
            .putBoolean(KEY_AUTO_SYNC, session.autoSync)
            .putString(KEY_DEVICE_ID, session.deviceId)
            .apply()
    }

    fun setLastSyncAt(isoTimestamp: String) {
        prefs.edit().putString(KEY_LAST_SYNC, isoTimestamp).apply()
    }

    fun setAutoSync(enabled: Boolean) {
        prefs.edit().putBoolean(KEY_AUTO_SYNC, enabled).apply()
    }

    /**
     * Forget the account but keep the server URL and device id: the local
     * business and its data stay on the device, and reconnecting is one form.
     */
    fun clear() {
        prefs.edit()
            .remove(KEY_TOKEN)
            .remove(KEY_EMAIL)
            .remove(KEY_NAME)
            .remove(KEY_USER_ID)
            .remove(KEY_BUSINESS_ID)
            .remove(KEY_LAST_SYNC)
            .apply()
    }

    private companion object {
        const val PREFS = "aide_cloud"
        const val KEY_BASE_URL = "base_url"
        const val KEY_TOKEN = "token"
        const val KEY_EMAIL = "email"
        const val KEY_NAME = "name"
        const val KEY_USER_ID = "user_id"
        const val KEY_BUSINESS_ID = "business_id"
        const val KEY_LAST_SYNC = "last_sync"
        const val KEY_AUTO_SYNC = "auto_sync"
        const val KEY_DEVICE_ID = "device_id"
    }
}
