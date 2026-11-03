package com.omix.aide.updates

import java.io.Closeable
import java.io.IOException
import java.io.InputStream
import java.net.HttpURLConnection
import java.net.URI
import java.net.URL
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.withContext
import org.json.JSONArray

class UpdateNetworkException(message: String) : IOException(message)

interface UpdateResponse : Closeable {
    val status: Int
    val length: Long
    val body: InputStream
}

fun interface UpdateTransport {
    fun open(url: String): UpdateResponse
}

/** Redirects are explicit: never downgrade HTTPS or send the updater to an arbitrary host. */
class GitHubTransport : UpdateTransport {
    override fun open(url: String): UpdateResponse {
        var next = url
        repeat(6) {
            if (!trustedDownloadHost(next)) throw UpdateNetworkException("Untrusted download redirect")
            val connection = (URL(next).openConnection() as HttpURLConnection).apply {
                instanceFollowRedirects = false
                connectTimeout = 15_000
                readTimeout = 30_000
                setRequestProperty("Accept", if (URI(next).host == "api.github.com") "application/vnd.github+json" else "application/octet-stream")
                setRequestProperty("Accept-Encoding", "identity")
                setRequestProperty("User-Agent", "Aide-Android-Updater")
            }
            try {
                val status = connection.responseCode
                if (status in setOf(301, 302, 303, 307, 308)) {
                    val location = connection.getHeaderField("Location")
                        ?: throw UpdateNetworkException("Missing download redirect")
                    next = URI(next).resolve(location).toString()
                    connection.disconnect()
                } else {
                    return object : UpdateResponse {
                        override val status = status
                        override val length = connection.contentLengthLong
                        override val body: InputStream get() = connection.inputStream
                        override fun close() = connection.disconnect()
                    }
                }
            } catch (error: Exception) {
                connection.disconnect()
                throw error
            }
        }
        throw UpdateNetworkException("Too many download redirects")
    }
}

internal fun trustedDownloadHost(url: String): Boolean = runCatching {
    val uri = URI(url)
    uri.scheme == "https" && uri.port == -1 && uri.userInfo == null && uri.host in setOf(
        "github.com", "api.github.com", "release-assets.githubusercontent.com",
        "objects.githubusercontent.com", "github-releases.githubusercontent.com"
    )
}.getOrDefault(false)

fun interface ManifestSource {
    suspend fun latest(): String?
}

class GitHubReleaseSource(
    private val transport: UpdateTransport,
    private val certificate: String
) : ManifestSource {
    override suspend fun latest(): String? = withContext(Dispatchers.IO) {
        val raw = text("https://api.github.com/repos/$RELEASE_REPOSITORY/releases?per_page=100", 2 * 1024 * 1024)
        val releases = JSONArray(raw)
        // The API lists by publication date, not by Android build number. Select
        // the highest advertised build to avoid an old re-published release.
        val candidates = (0 until releases.length()).map { releases.getJSONObject(it) }
            .filter { !it.optBoolean("draft") && !it.optBoolean("prerelease") }
            .filter { it.optString("tag_name").matches(Regex("^v[0-9]+\\.[0-9]+\\.[0-9]+(?:\\+[1-9][0-9]*)?$")) }
            .filter { release ->
                val assets = release.optJSONArray("assets") ?: JSONArray()
                (0 until assets.length()).any {
                    val name = assets.getJSONObject(it).optString("name").lowercase()
                    name.endsWith(".apk") && !name.contains("debug")
                }
            }
            .sortedWith(compareByDescending<org.json.JSONObject> { release ->
                val tag = release.optString("tag_name")
                tag.substringAfter('+', "").toLongOrNull()
                    ?: Regex("\\(([0-9]+)\\)").find(release.optString("name"))?.groupValues?.get(1)?.toLongOrNull()
                    ?: 0L
            })
        for (release in candidates) {
            val assets = release.getJSONArray("assets")
            val asset = (0 until assets.length()).map { assets.getJSONObject(it) }
                .find { it.optString("name") == MANIFEST_ASSET } ?: continue // pre-updater releases
            val tag = release.text("tag_name")
            val url = asset.text("browser_download_url")
            requireManifest(isReleaseAssetUrl(url, tag) && url.endsWith("/$MANIFEST_ASSET"), "Invalid manifest URL")
            val manifestRaw = text(url, MAX_MANIFEST_BYTES)
            ReleaseManifest.parse(manifestRaw, certificate, tag)
            return@withContext manifestRaw
        }
        null
    }

    private suspend fun text(url: String, limit: Int): String = transport.open(url).use { response ->
        if (response.status != 200) throw UpdateNetworkException("GitHub returned HTTP ${response.status}")
        if (response.length > limit) throw InvalidManifest("Update response is too large")
        response.body.use { stream ->
            val bytes = java.io.ByteArrayOutputStream()
            val buffer = ByteArray(8192)
            while (true) {
                currentCoroutineContext().ensureActive()
                val read = stream.read(buffer)
                if (read < 0) break
                if (bytes.size() + read > limit) throw InvalidManifest("Update response is too large")
                bytes.write(buffer, 0, read)
            }
            bytes.toString("UTF-8")
        }
    }
}
