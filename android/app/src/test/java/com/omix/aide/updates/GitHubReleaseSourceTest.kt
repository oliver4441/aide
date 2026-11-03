package com.omix.aide.updates

import java.io.IOException
import kotlinx.coroutines.test.runTest
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

class GitHubReleaseSourceTest {
    private fun release(tag: String = "v1.0.13", draft: Boolean = false, prerelease: Boolean = false): JSONObject = JSONObject().apply {
        put("tag_name", tag)
        put("name", "Aide $tag (1013)")
        put("draft", draft)
        put("prerelease", prerelease)
        put("assets", JSONArray().put(JSONObject().put("name", "aide.apk")).put(
            JSONObject().put("name", MANIFEST_ASSET).put("browser_download_url", "https://github.com/$RELEASE_REPOSITORY/releases/download/$tag/$MANIFEST_ASSET")
        ))
    }
    @Test fun desktopDraftsAndPrereleasesNeverReplaceStableAndroidUpdate() = runTest {
        val list = JSONArray().put(release("desktop-v9.0.0")).put(release(draft = true)).put(release(prerelease = true)).put(release())
        val requested = mutableListOf<String>()
        val source = GitHubReleaseSource({ url ->
            requested += url
            response((if (url.contains("api.github.com")) list.toString() else manifestJson().toString(2)).toByteArray())
        }, testCertificate)
        assertEquals(1013L, ReleaseManifest.parse(source.latest()!!, testCertificate).versionCode)
        assertEquals(2, requested.size)
    }
    @Test fun emptyReleaseListAndLegacyReleasesWithoutManifestAreSafeNoUpdates() = runTest {
        val legacy = release().apply { getJSONArray("assets").remove(1) }
        for (list in listOf(JSONArray(), JSONArray().put(legacy))) {
            assertNull(GitHubReleaseSource({ response(list.toString().toByteArray()) }, testCertificate).latest())
        }
    }
    @Test fun githubHttpErrorDoesNotMasqueradeAsUpToDate() = runTest {
        try {
            GitHubReleaseSource({ response(status = 429) }, testCertificate).latest()
            fail("Expected rate limit failure")
        } catch (_: UpdateNetworkException) { }
    }
    @Test fun malformedReleaseListFailsSafely() = runTest {
        try {
            GitHubReleaseSource({ response("{}".toByteArray()) }, testCertificate).latest()
            fail("Expected invalid JSON array")
        } catch (_: org.json.JSONException) { }
    }
    @Test fun rejectsManifestHostedOutsideOurRelease() = runTest {
        val list = JSONArray().put(release().apply { getJSONArray("assets").getJSONObject(1).put("browser_download_url", "https://evil.example/android-update.json") })
        var calls = 0
        try {
            GitHubReleaseSource({ calls++; response(list.toString().toByteArray()) }, testCertificate).latest()
            fail("Expected untrusted manifest URL")
        } catch (_: InvalidManifest) { }
        assertEquals(1, calls)
    }
    @Test fun releaseTagAndManifestMustMatch() = runTest {
        try {
            GitHubReleaseSource({ url -> response((if (url.contains("api.github.com")) JSONArray().put(release("v1.0.14")).toString() else manifestJson().toString()).toByteArray()) }, testCertificate).latest()
            fail("Expected tag mismatch")
        } catch (_: InvalidManifest) { }
    }
    @Test fun oversizedResponseIsRejected() = runTest {
        try {
            GitHubReleaseSource({ response(length = 4 * 1024 * 1024) }, testCertificate).latest()
            fail("Expected bounded response")
        } catch (_: InvalidManifest) { }
    }
    @Test fun networkTimeoutPropagatesToRepositoryFailureHandling() = runTest {
        try {
            GitHubReleaseSource({ throw IOException("timeout") }, testCertificate).latest()
            fail("Expected IOException")
        } catch (_: IOException) { }
    }
}
