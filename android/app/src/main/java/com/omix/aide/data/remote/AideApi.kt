package com.omix.aide.data.remote

import com.omix.aide.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder

/** Raised for any non-2xx response, with the server's message when it sent one. */
class AideApiException(
    val statusCode: Int,
    override val message: String
) : Exception(message) {
    val isAuthFailure: Boolean get() = statusCode == 401 || statusCode == 403
}

/** The account returned by `/api/auth/mobile-login`. */
data class CloudLogin(
    val token: String,
    val userId: String,
    val email: String,
    val name: String,
    val businessId: String?
)

data class PushResponse(
    val synced: Int,
    val conflicts: Int,
    val failed: List<FailedMutation>
)

data class FailedMutation(
    val table: String,
    val recordId: String,
    val error: String
)

/** One queued change in the shape `POST /api/sync` expects. */
data class RemoteMutation(
    val table: String,
    val action: String,
    val recordId: String,
    val data: JSONObject
) {
    fun toJson(): JSONObject = JSONObject().apply {
        put("table", table)
        put("action", action)
        put("recordId", recordId)
        put("data", data)
    }
}

/**
 * A small HTTP client for the three Aide Cloud endpoints the APK needs.
 *
 * Deliberately `HttpURLConnection` + `org.json`: both are in the platform, so
 * enabling sync does not add OkHttp/Retrofit (which this app removed when it
 * went local-only) or inflate the APK for three calls.
 */
class AideApi(rawBaseUrl: String) {

    val baseUrl: String = CloudUrls.normalize(rawBaseUrl)

    suspend fun login(email: String, password: String): CloudLogin =
        withContext(Dispatchers.IO) {
            val body = JSONObject().apply {
                put("email", email)
                put("password", password)
            }
            val response = request(
                method = "POST",
                path = "/api/auth/mobile-login",
                token = null,
                body = body
            )
            val token = response.optString("token", "")
            if (token.isBlank()) {
                throw AideApiException(500, "The server did not return a sign-in token")
            }
            val user = response.optJSONObject("user") ?: JSONObject()
            val businessId = user.optString("businessId", "").takeIf { it.isNotBlank() }
            CloudLogin(
                token = token,
                userId = user.optString("id", ""),
                email = user.optString("email", email),
                name = user.optString("name", ""),
                businessId = businessId
            )
        }

    suspend fun push(
        token: String,
        businessId: String,
        deviceId: String,
        mutations: List<RemoteMutation>
    ): PushResponse = withContext(Dispatchers.IO) {
        val body = JSONObject().apply {
            put("businessId", businessId)
            put("deviceId", deviceId)
            put("mutations", JSONArray().apply {
                mutations.forEach { put(it.toJson()) }
            })
        }
        val response = request("POST", "/api/sync", token, body)
        val failed = mutableListOf<FailedMutation>()
        response.optJSONArray("failed")?.let { array ->
            for (i in 0 until array.length()) {
                val row = array.optJSONObject(i) ?: continue
                failed += FailedMutation(
                    table = row.optString("table", ""),
                    recordId = row.optString("recordId", ""),
                    error = row.optString("error", "Sync failed")
                )
            }
        }
        PushResponse(
            synced = response.optInt("synced", 0),
            conflicts = response.optJSONArray("conflicts")?.length() ?: 0,
            failed = failed
        )
    }

    /** Full pull delta. `since` is an ISO timestamp or `0`. */
    suspend fun pull(token: String, businessId: String, since: String?): JSONObject =
        withContext(Dispatchers.IO) {
            val encodedBusiness = URLEncoder.encode(businessId, "UTF-8")
            val encodedSince = URLEncoder.encode(since ?: "0", "UTF-8")
            request(
                method = "GET",
                path = "/api/sync?businessId=$encodedBusiness&since=$encodedSince&limit=2000",
                token = token,
                body = null
            )
        }

    private fun request(
        method: String,
        path: String,
        token: String?,
        body: JSONObject?
    ): JSONObject {
        val connection = (URL(baseUrl + path).openConnection() as HttpURLConnection).apply {
            requestMethod = method
            connectTimeout = 15_000
            readTimeout = 30_000
            instanceFollowRedirects = true
            setRequestProperty("Accept", "application/json")
            setRequestProperty("User-Agent", "Aide-Android/${BuildConfig.VERSION_NAME}")
            if (token != null) setRequestProperty("Authorization", "Bearer $token")
            if (body != null) {
                doOutput = true
                setRequestProperty("Content-Type", "application/json; charset=utf-8")
            }
        }

        return try {
            if (body != null) {
                connection.outputStream.use { out ->
                    out.write(body.toString().toByteArray(Charsets.UTF_8))
                }
            }

            val status = connection.responseCode
            val stream = if (status in 200..299) connection.inputStream else connection.errorStream
            val text = stream?.let {
                BufferedReader(InputStreamReader(it, Charsets.UTF_8)).use { reader ->
                    reader.readText()
                }
            }.orEmpty()

            if (status !in 200..299) {
                val message = runCatching {
                    JSONObject(text).optString("error", "")
                }.getOrNull()?.takeIf { it.isNotBlank() }
                    ?: when (status) {
                        401 -> "Email or password is incorrect"
                        403 -> "This account cannot sync this business"
                        404 -> "Aide Cloud endpoint not found"
                        else -> "Aide Cloud returned HTTP $status"
                    }
                throw AideApiException(status, message)
            }

            if (text.isBlank()) JSONObject() else JSONObject(text)
        } finally {
            connection.disconnect()
        }
    }
}

object CloudUrls {

    /**
     * Trim, default to https, and drop trailing slashes.
     *
     * Owners type `aide.omixsystems.store` or paste a URL with a `/`, and both
     * should reach the same endpoints. Cleartext is refused by the manifest, so
     * an `http://` value is upgraded rather than failing at request time.
     */
    fun normalize(raw: String): String {
        var value = raw.trim().trimEnd('/')
        if (value.isEmpty()) return BuildConfig.CLOUD_BASE_URL
        val lower = value.lowercase()
        value = when {
            lower.startsWith("http://") -> "https://" + value.substring(7)
            lower.startsWith("https://") -> value
            else -> "https://$value"
        }
        return value.trimEnd('/')
    }
}
