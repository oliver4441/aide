package com.omix.aide.updates

import java.net.URI
import java.text.ParsePosition
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone
import org.json.JSONObject
import org.json.JSONTokener

const val UPDATE_PACKAGE = "com.omix.aide"
const val RELEASE_REPOSITORY = "oliver4441/aide"
const val MANIFEST_ASSET = "android-update.json"
const val CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000L
const val MAX_APK_BYTES = 512 * 1024 * 1024L
const val MAX_MANIFEST_BYTES = 256 * 1024

class InvalidManifest(message: String) : IllegalArgumentException(message)

data class ApkAsset(val abi: String, val url: String, val sizeBytes: Long, val sha256: String) {
    val fileName: String get() = "${sha256.take(16)}-$abi.apk"
}

data class ReleaseManifest(
    val versionName: String,
    val versionCode: Long,
    val minimumSupportedVersionCode: Long,
    val mandatory: Boolean,
    val minSdk: Int,
    val publishedAt: String,
    val releaseNotes: String,
    val releaseUrl: String,
    val certificateSha256: String,
    val assets: List<ApkAsset>
) {
    fun selectAsset(supportedAbis: List<String>): ApkAsset? =
        supportedAbis.firstNotNullOfOrNull { abi -> assets.find { it.abi == abi } }
            ?: assets.find { it.abi == "universal" }

    fun isMandatory(installedCode: Long): Boolean =
        versionCode > installedCode && (mandatory || installedCode < minimumSupportedVersionCode)

    companion object {
        private val abis = setOf("universal", "arm64-v8a", "armeabi-v7a", "x86", "x86_64")
        private val sha256 = Regex("^[a-fA-F0-9]{64}$")
        private val version = Regex("^(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)$")

        fun parse(raw: String, trustedCertificate: String, expectedTag: String? = null): ReleaseManifest {
            try {
                requireManifest(raw.toByteArray(Charsets.UTF_8).size <= MAX_MANIFEST_BYTES, "Manifest is too large")
                val tokener = JSONTokener(raw)
                val json = tokener.nextValue() as? JSONObject ?: throw InvalidManifest("Manifest must be an object")
                requireManifest(tokener.nextClean() == '\u0000', "Unexpected content after manifest")
                requireManifest(json.integer("schemaVersion") == 1L, "Unsupported manifest schema")
                requireManifest(json.text("packageName") == UPDATE_PACKAGE, "Wrong Android package")
                val name = json.text("versionName")
                val code = json.integer("versionCode")
                val minimum = json.integer("minimumSupportedVersionCode")
                requireManifest(version.matches(name), "Invalid version name")
                requireManifest(code in 1..2_100_000_000L, "Invalid version code")
                requireManifest(minimum in 1..code, "Invalid minimum supported version")
                val required = json.get("mandatory")
                requireManifest(required is Boolean, "mandatory must be a boolean")
                val sdk = json.integer("minSdk")
                requireManifest(sdk in 24..1000, "Invalid minimum Android version")
                val certificate = json.text("certificateSha256").lowercase()
                requireManifest(sha256.matches(certificate) && certificate == trustedCertificate.lowercase(), "Untrusted signing certificate")
                val releaseUrl = json.text("releaseUrl")
                val tag = releaseUrl.substringAfterLast('/')
                requireManifest(tag.matches(Regex("^v${Regex.escape(name)}(?:\\+[1-9][0-9]*)?$")), "Release tag and version disagree")
                requireManifest(!tag.contains('+') || tag.substringAfter('+').toLongOrNull() == code, "Tag build number disagrees")
                requireManifest(expectedTag == null || tag == expectedTag, "Manifest does not belong to this release")
                requireManifest(releaseUrl == "https://github.com/$RELEASE_REPOSITORY/releases/tag/$tag", "Invalid release URL")
                val published = json.text("publishedAt")
                requireManifest(published.matches(Regex("^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d+)?Z$")), "Invalid release date")
                val dateOnlySeconds = published.replace(Regex("\\.\\d+Z$"), "Z")
                val dateFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.ROOT).apply {
                    isLenient = false
                    timeZone = TimeZone.getTimeZone("UTC")
                }
                val position = ParsePosition(0)
                requireManifest(dateFormat.parse(dateOnlySeconds, position) != null && position.index == dateOnlySeconds.length, "Invalid release date")
                val notes = json.text("releaseNotes")
                requireManifest(notes.length <= 64_000, "Release notes are too long")
                val array = json.getJSONArray("assets")
                requireManifest(array.length() in 1..abis.size, "Invalid APK asset count")
                val assets = (0 until array.length()).map { index ->
                    val asset = array.getJSONObject(index)
                    val abi = asset.text("abi")
                    val url = asset.text("url")
                    val size = asset.integer("sizeBytes")
                    val checksum = asset.text("sha256").lowercase()
                    requireManifest(abi in abis, "Unsupported ABI")
                    requireManifest(size in 1..MAX_APK_BYTES, "Invalid APK size")
                    requireManifest(sha256.matches(checksum), "Invalid APK checksum")
                    requireManifest(isReleaseAssetUrl(url, tag) && URI(url).path.endsWith(".apk"), "Invalid APK URL")
                    ApkAsset(abi, url, size, checksum)
                }
                requireManifest(assets.distinctBy { it.abi }.size == assets.size, "Duplicate ABI")
                requireManifest(assets.distinctBy { it.url }.size == assets.size, "Duplicate APK URL")
                return ReleaseManifest(name, code, minimum, required as Boolean, sdk.toInt(), published, notes, releaseUrl, certificate, assets)
            } catch (error: InvalidManifest) {
                throw error
            } catch (error: Exception) {
                throw InvalidManifest("Malformed update manifest")
            }
        }
    }
}

internal fun JSONObject.text(key: String): String =
    (get(key) as? String) ?: throw InvalidManifest("$key must be a string")

internal fun JSONObject.integer(key: String): Long {
    val value = get(key)
    if (value !is Int && value !is Long) throw InvalidManifest("$key must be an integer")
    return (value as Number).toLong()
}

internal fun requireManifest(condition: Boolean, message: String) {
    if (!condition) throw InvalidManifest(message)
}

fun isReleaseAssetUrl(url: String, tag: String): Boolean = runCatching {
    val uri = URI(url)
    val prefix = "/$RELEASE_REPOSITORY/releases/download/$tag/"
    uri.scheme == "https" && uri.host == "github.com" && uri.port == -1 &&
        uri.userInfo == null && uri.query == null && uri.fragment == null &&
        uri.rawPath.replace("%2B", "+", ignoreCase = true) == uri.path && uri.path.startsWith(prefix) &&
        uri.path.removePrefix(prefix).matches(Regex("^[A-Za-z0-9][A-Za-z0-9._+-]*$"))
}.getOrDefault(false)

/** Android compares build numbers, never lexical version names or floating-point versions. */
fun isNewerVersion(publishedCode: Long, installedCode: Long): Boolean =
    publishedCode > 0 && publishedCode > installedCode

fun shouldCheck(now: Long, lastAttempt: Long, force: Boolean = false): Boolean =
    force || lastAttempt <= 0 || now < lastAttempt || now - lastAttempt >= CHECK_INTERVAL_MS
