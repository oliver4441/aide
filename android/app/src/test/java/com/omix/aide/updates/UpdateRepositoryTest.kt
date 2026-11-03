package com.omix.aide.updates

import java.io.IOException
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.async
import kotlinx.coroutines.test.runTest
import org.junit.Assert.*
import org.junit.Test

class UpdateRepositoryTest {
    @Test fun automaticChecksAreThrottledForSixHoursIncludingRestarts() = runTest {
        var now = 10_000L
        var calls = 0
        val storage = MemoryStorage()
        val source = ManifestSource { calls++; manifestJson().toString() }
        val first = UpdateRepository(source, storage, testCertificate) { now }
        assertTrue(first.check() is CheckResult.Release)
        now += CHECK_INTERVAL_MS - 1
        val restarted = UpdateRepository(source, storage, testCertificate) { now }
        assertTrue((restarted.check() as CheckResult.Release).fromCache)
        assertEquals(1, calls)
        now++
        restarted.check()
        assertEquals(2, calls)
    }
    @Test fun explicitUserCheckBypassesThrottle() = runTest {
        var calls = 0
        val repository = UpdateRepository(ManifestSource { calls++; null }, MemoryStorage(), testCertificate) { 1000 }
        repository.check()
        repository.check(force = true)
        assertEquals(2, calls)
    }
    @Test fun failuresAreNotAnExcuseToSpamTheNetworkOnEveryLaunch() = runTest {
        var calls = 0
        val repository = UpdateRepository(ManifestSource { calls++; throw IOException("offline") }, MemoryStorage(), testCertificate) { 1000 }
        assertTrue(repository.check() is CheckResult.Failed)
        repository.check()
        assertEquals(1, calls)
    }
    @Test fun simultaneousStartupChecksShareTheThrottle() = runTest {
        var calls = 0
        val repository = UpdateRepository(ManifestSource { calls++; manifestJson().toString() }, MemoryStorage(), testCertificate) { 1000 }
        val one = async { repository.check() }
        val two = async { repository.check() }
        one.await(); two.await()
        assertEquals(1, calls)
    }
    @Test fun noReleasesIsAValidNoUpdateScenario() = runTest {
        assertSame(CheckResult.NoRelease, UpdateRepository(ManifestSource { null }, MemoryStorage(), testCertificate).check())
    }
    @Test fun networkFailurePreservesCachedMandatoryUpdate() = runTest {
        val storage = MemoryStorage().apply { cachedManifest = manifestJson().put("mandatory", true).toString() }
        val result = UpdateRepository(ManifestSource { throw IOException("timeout") }, storage, testCertificate).check() as CheckResult.Failed
        assertTrue(result.cached!!.isMandatory(1012))
        assertFalse(result.invalid)
    }
    @Test fun invalidManifestNeverReplacesTrustedCache() = runTest {
        val storage = MemoryStorage().apply { cachedManifest = manifestJson().toString() }
        val result = UpdateRepository(ManifestSource { "{\"versionCode\":9999}" }, storage, testCertificate).check() as CheckResult.Failed
        assertTrue(result.invalid)
        assertEquals(1013L, result.cached!!.versionCode)
        assertEquals(1013L, testManifest(org.json.JSONObject(storage.cachedManifest!!)).versionCode)
    }
    @Test fun corruptCacheDoesNotCrashOrBecomeAnUpdate() = runTest {
        val storage = MemoryStorage().apply { cachedManifest = "garbage" }
        assertSame(CheckResult.NoRelease, UpdateRepository(ManifestSource { null }, storage, testCertificate).check())
    }
    @Test fun aRemovedReleaseDoesNotEraseAnAlreadyKnownMandatoryPolicy() = runTest {
        val storage = MemoryStorage().apply { cachedManifest = manifestJson().put("mandatory", true).toString() }
        val result = UpdateRepository(ManifestSource { null }, storage, testCertificate).check() as CheckResult.Release
        assertTrue(result.manifest.isMandatory(1012))
    }
    @Test fun cancellationIsPropagatedNotMisreportedAsNoUpdate() = runTest {
        val repository = UpdateRepository(ManifestSource { throw CancellationException() }, MemoryStorage(), testCertificate)
        try { repository.check(); fail("Expected cancellation") } catch (_: CancellationException) { }
    }
    @Test fun clockRollbackCannotSuppressChecksIndefinitely() {
        assertTrue(shouldCheck(1000, 2000))
        assertFalse(shouldCheck(2000, 1000))
        assertTrue(shouldCheck(2000, 1000, force = true))
    }
}
