package com.omix.aide.updates

import java.io.ByteArrayInputStream
import java.io.InputStream
import java.security.MessageDigest
import org.json.JSONArray
import org.json.JSONObject

internal val testCertificate = "a".repeat(64)
internal val testBytes = "a complete APK fixture".toByteArray()
internal fun checksum(bytes: ByteArray) = MessageDigest.getInstance("SHA-256").digest(bytes).toHex()
internal fun manifestJson(): JSONObject = JSONObject().apply {
    put("schemaVersion", 1)
    put("packageName", UPDATE_PACKAGE)
    put("versionName", "1.0.13")
    put("versionCode", 1013)
    put("minimumSupportedVersionCode", 1)
    put("mandatory", false)
    put("minSdk", 24)
    put("publishedAt", "2026-11-03T12:00:00Z")
    put("releaseNotes", "Fixes \"installation\".\nA second line — Unicode ✓")
    put("releaseUrl", "https://github.com/$RELEASE_REPOSITORY/releases/tag/v1.0.13")
    put("certificateSha256", testCertificate)
    put("assets", JSONArray().put(assetJson()))
}
internal fun assetJson(abi: String = "universal") = JSONObject().apply {
    put("abi", abi)
    put("url", "https://github.com/$RELEASE_REPOSITORY/releases/download/v1.0.13/aide-$abi.apk")
    put("sizeBytes", testBytes.size)
    put("sha256", checksum(testBytes))
}
internal fun testManifest(json: JSONObject = manifestJson()) = ReleaseManifest.parse(json.toString(), testCertificate)
internal fun response(bytes: ByteArray = testBytes, status: Int = 200, length: Long = bytes.size.toLong(), stream: InputStream = ByteArrayInputStream(bytes)): UpdateResponse =
    object : UpdateResponse {
        override val status = status
        override val length = length
        override val body = stream
        override fun close() { stream.close() }
    }
internal class MemoryStorage : UpdateStorage {
    override var lastAttempt = 0L
    override var cachedManifest: String? = null
}
