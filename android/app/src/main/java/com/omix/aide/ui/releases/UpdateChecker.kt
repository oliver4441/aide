package com.omix.aide.ui.releases

import android.content.Context
import com.omix.aide.BuildConfig
import java.net.HttpURLConnection
import java.net.URL
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * What the server knows about the newest published release.
 *
 * @param versionCode the published release's build code, or 0 when unknown.
 * @param newer true when a published release is newer than the running build.
 */
data class UpdateCheck(
    val version: String?,
    val versionCode: Int,
    val newer: Boolean,
    val downloadUrl: String?,
    val notes: String?
) {
    companion object {
        val UNKNOWN = UpdateCheck(null, 0, false, null, null)
    }
}

/**
 * Asks our own site whether a newer release exists.
 *
 * The previous mechanism baked `LATEST_VERSION_CODE` into the APK at build
 * time, which could only ever tell a user what was true when their APK was
 * built. A v1.0.4 install would keep claiming it was current forever, no
 * matter how many releases followed. The version now has to be fetched.
 *
 * Deliberately best-effort: this runs on a launch path, on a phone that may be
 * offline, and must never block or throw. Any failure resolves to
 * [UpdateCheck.UNKNOWN] and the app behaves exactly as before.
 */
object UpdateChecker {

    private const val ENDPOINT = "https://aide.omixsystems.store/api/latest-release"
    private const val TIMEOUT_MS = 4000

    suspend fun check(): UpdateCheck = withContext(Dispatchers.IO) {
        try {
            val connection = (URL(ENDPOINT).openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                connectTimeout = TIMEOUT_MS
                readTimeout = TIMEOUT_MS
                setRequestProperty("Accept", "application/json")
            }

            try {
                if (connection.responseCode !in 200..299) return@withContext UpdateCheck.UNKNOWN
                val body = connection.inputStream.bufferedReader().use { it.readText() }

                val versionCode = extractInt(body, "versionCode") ?: 0
                val version = extractString(body, "version")

                UpdateCheck(
                    version = version,
                    versionCode = versionCode,
                    // Strictly greater: a build must not nag about itself, and a
                    // locally-built debug APK with versionCode 0 must not think
                    // it is behind everything.
                    newer = versionCode > BuildConfig.VERSION_CODE,
                    downloadUrl = extractString(body, "downloadUrl"),
                    notes = extractString(body, "notes")
                )
            } finally {
                connection.disconnect()
            }
        } catch (e: Exception) {
            // Offline, DNS failure, timeout, malformed body — all mean the same
            // thing to the caller: carry on silently.
            UpdateCheck.UNKNOWN
        }
    }

    /**
     * Pulls one field out of the response.
     *
     * Hand-rolled rather than pulling in a JSON library: this runs on every
     * launch, the payload is a flat object of strings and numbers, and
     * `org.json` is already on the platform so there is nothing to add.
     */
    private fun extractString(body: String, key: String): String? {
        val marker = "\"$key\":"
        val start = body.indexOf(marker)
        if (start < 0) return null
        val from = start + marker.length
        if (from >= body.length) return null
        if (body[from] != '"') return null
        val end = body.indexOf('"', from + 1)
        if (end < 0) return null
        return body.substring(from + 1, end)
            .replace("\\n", "\n")
            .replace("\\\"", "\"")
    }

    private fun extractInt(body: String, key: String): Int? {
        val marker = "\"$key\":"
        val start = body.indexOf(marker)
        if (start < 0) return null
        var i = start + marker.length
        val end = body.indexOfAny(charArrayOf(',', '}'), i).let { if (it < 0) body.length else it }
        return body.substring(i, end).trim().toIntOrNull()
    }

    /** Kept for symmetry with the receiver-based check. */
    @Suppress("unused")
    fun installedVersionCode(): Int = BuildConfig.VERSION_CODE
}