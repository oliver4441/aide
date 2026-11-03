package com.omix.aide.updates

import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

class ReleaseManifestTest {
    @Test fun parsesPrettyPrintedJsonAndEscapedUnicodeNotes() {
        val manifest = ReleaseManifest.parse(manifestJson().toString(2), testCertificate, "v1.0.13")
        assertEquals(1013L, manifest.versionCode)
        assertEquals("1.0.13", manifest.versionName)
        assertEquals("Fixes \"installation\".\nA second line — Unicode ✓", manifest.releaseNotes)
        assertEquals(testBytes.size.toLong(), manifest.assets.single().sizeBytes)
    }

    @Test fun prefersDeviceAbiOrderOverManifestAssetOrder() {
        val json = manifestJson().put("assets", JSONArray().put(assetJson("universal")).put(assetJson("armeabi-v7a")).put(assetJson("arm64-v8a")))
        assertEquals("arm64-v8a", testManifest(json).selectAsset(listOf("arm64-v8a", "armeabi-v7a"))?.abi)
        assertEquals("armeabi-v7a", testManifest(json).selectAsset(listOf("armeabi-v7a", "arm64-v8a"))?.abi)
    }
    @Test fun universalWorksForUnlistedOrFutureAbi() {
        assertEquals("universal", testManifest().selectAsset(listOf("riscv64"))?.abi)
    }
    @Test fun neverDownloadsAnIncompatibleAbi() {
        assertNull(testManifest(manifestJson().put("assets", JSONArray().put(assetJson("arm64-v8a")))).selectAsset(listOf("x86_64", "x86")))
    }
    @Test fun emptyAbiListCanOnlySelectUniversal() {
        assertEquals("universal", testManifest().selectAsset(emptyList())?.abi)
    }
    @Test fun optionalUpdateDoesNotBlockSupportedVersions() {
        assertFalse(testManifest().isMandatory(1012))
    }
    @Test fun minimumSupportedCodeMakesOnlyOlderInstallsMandatory() {
        val release = testManifest(manifestJson().put("minimumSupportedVersionCode", 1012))
        assertTrue(release.isMandatory(1011))
        assertFalse(release.isMandatory(1012))
        assertFalse(release.isMandatory(1013))
    }
    @Test fun explicitMandatoryStillNeverDowngradesOrPromptsCurrentBuild() {
        val release = testManifest(manifestJson().put("mandatory", true))
        assertTrue(release.isMandatory(1012))
        assertFalse(release.isMandatory(1013))
        assertFalse(release.isMandatory(1014))
    }
    @Test fun versionComparisonUsesCodesNotDisplayVersionStrings() {
        assertTrue(isNewerVersion(1013, 1012))
        assertFalse(isNewerVersion(1013, 1013))
        assertFalse(isNewerVersion(1012, 1013))
        assertFalse(isNewerVersion(0, 1012))
        assertTrue(isNewerVersion(2_100_000_000, 1012))
    }
    @Test fun explicitBuildSuffixMustAgreeWithManifest() {
        val json = manifestJson().put("releaseUrl", "https://github.com/$RELEASE_REPOSITORY/releases/tag/v1.0.13+1013")
        json.getJSONArray("assets").getJSONObject(0).put("url", "https://github.com/$RELEASE_REPOSITORY/releases/download/v1.0.13+1013/aide.apk")
        assertEquals(1013L, ReleaseManifest.parse(json.toString(), testCertificate, "v1.0.13+1013").versionCode)
        invalid(json.put("releaseUrl", "https://github.com/$RELEASE_REPOSITORY/releases/tag/v1.0.13+1014"))
    }
    @Test fun rejectsMalformedOrMissingMetadata() {
        listOf("", "null", "[]", "{broken", "{\"schemaVersion\":1}").forEach { raw ->
            assertThrows(InvalidManifest::class.java) { ReleaseManifest.parse(raw, testCertificate) }
        }
        listOf("versionCode", "versionName", "mandatory", "minimumSupportedVersionCode", "publishedAt", "releaseNotes", "certificateSha256", "assets").forEach { key ->
            invalid(manifestJson().apply { remove(key) })
        }
    }
    @Test fun rejectsWrongSchemaPackageAndCertificate() {
        invalid(manifestJson().put("schemaVersion", 2))
        invalid(manifestJson().put("packageName", "evil.app"))
        invalid(manifestJson().put("certificateSha256", "b".repeat(64)))
    }
    @Test fun neverCoercesStringsFloatsOrBooleansIntoVersionCodes() {
        listOf<Any>("1013", 1013.5, true, 0, -1, 2_100_000_001L, JSONObject.NULL).forEach { invalid(manifestJson().put("versionCode", it)) }
        invalid(manifestJson().put("mandatory", "false"))
    }
    @Test fun rejectsImpossibleMinimumVersionAndInvalidSdk() {
        invalid(manifestJson().put("minimumSupportedVersionCode", 1014))
        invalid(manifestJson().put("minimumSupportedVersionCode", 0))
        invalid(manifestJson().put("minSdk", 0))
    }
    @Test fun rejectsWrongTagAndInvalidNamesAndDates() {
        assertThrows(InvalidManifest::class.java) { ReleaseManifest.parse(manifestJson().toString(), testCertificate, "v1.0.14") }
        invalid(manifestJson().put("versionName", "1.0.13-beta"))
        invalid(manifestJson().put("publishedAt", "yesterday"))
    }
    @Test fun rejectsInvalidAssetsAndDuplicateAbis() {
        invalid(manifestJson().put("assets", JSONArray()))
        invalid(manifestJson().put("assets", JSONArray().put(assetJson()).put(assetJson())))
        listOf("sha256" to "bad", "sizeBytes" to -1, "sizeBytes" to MAX_APK_BYTES + 1, "abi" to "mips").forEach { (key, value) ->
            invalid(manifestJson().put("assets", JSONArray().put(assetJson().put(key, value))))
        }
    }
    @Test fun rejectsUntrustedUrlsAndPathTricks() {
        val prefix = "https://github.com/$RELEASE_REPOSITORY/releases/download/v1.0.13/"
        listOf("http://github.com/$RELEASE_REPOSITORY/releases/download/v1.0.13/a.apk", "https://evil.example/a.apk", "${prefix}../a.apk", "${prefix}a.apk?token=1", "${prefix}a.apk#fragment", "${prefix}%2e%2e/a.apk", "https://github.com@evil.example/a.apk", "${prefix}a.exe").forEach {
            invalid(manifestJson().put("assets", JSONArray().put(assetJson().put("url", it))))
        }
    }
    @Test fun rejectsOversizedManifestAndNotes() {
        assertThrows(InvalidManifest::class.java) { ReleaseManifest.parse(" ".repeat(MAX_MANIFEST_BYTES + 1), testCertificate) }
        invalid(manifestJson().put("releaseNotes", "x".repeat(64_001)))
    }

    private fun invalid(json: JSONObject) {
        assertThrows("Accepted invalid manifest: $json", InvalidManifest::class.java) { testManifest(json) }
    }
}
