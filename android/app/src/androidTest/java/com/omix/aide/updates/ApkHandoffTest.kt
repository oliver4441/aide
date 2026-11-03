package com.omix.aide.updates

import android.content.Intent
import android.os.Build
import android.provider.Settings
import androidx.test.platform.app.InstrumentationRegistry
import java.io.File
import org.junit.Assert.*
import org.junit.Test

/** Real Android FileProvider/package metadata, without launching an installer. */
class ApkHandoffTest {
    private val context get() = InstrumentationRegistry.getInstrumentation().targetContext

    @Test fun readsTheActuallyInstalledVersionRatherThanAManifestOrSavedPreference() {
        val version = ApkInstaller.installed(context)
        assertTrue(version.code > 0)
        assertTrue(version.name.endsWith("-debug"))
        assertEquals("com.omix.aide.debug", context.packageName)
    }
    @Test fun handoffUsesTemporaryReadOnlyContentUriAndAnUnexportedProvider() {
        val directory = File(context.cacheDir, "updates").apply { mkdirs() }
        val file = File(directory, "handoff-test.apk").apply { writeText("test fixture, never installed") }
        try {
            val intent = ApkInstaller.intent(context, file)
            assertEquals(Intent.ACTION_VIEW, intent.action)
            assertEquals("content", intent.data?.scheme)
            assertEquals("${context.packageName}.updates", intent.data?.authority)
            assertEquals("application/vnd.android.package-archive", intent.type)
            assertTrue(intent.flags and Intent.FLAG_GRANT_READ_URI_PERMISSION != 0)
            assertEquals(0, intent.flags and Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
            assertNotNull(intent.clipData)
            assertTrue(intent.getBooleanExtra(Intent.EXTRA_RETURN_RESULT, false))
            val provider = context.packageManager.resolveContentProvider("${context.packageName}.updates", 0)
            assertNotNull(provider)
            assertFalse(provider!!.exported)
        } finally { file.delete() }
    }
    @Test fun permissionHandoffMatchesTheAndroidVersionWithoutChangingAnySetting() {
        val intent = ApkInstaller.permissionIntent(context)
        if (Build.VERSION.SDK_INT >= 26) {
            assertEquals(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, intent.action)
            assertEquals("package:${context.packageName}", intent.data.toString())
        } else {
            assertEquals(Settings.ACTION_SECURITY_SETTINGS, intent.action)
            assertNull(intent.data)
        }
    }
    @Test fun fileProviderRejectsFilesOutsideTheNarrowUpdateDirectory() {
        val file = File(context.cacheDir, "not-an-update.txt").apply { writeText("private") }
        try {
            try { ApkInstaller.intent(context, file); fail("Private file was shared") }
            catch (_: IllegalArgumentException) { }
        } finally { file.delete() }
    }
}
