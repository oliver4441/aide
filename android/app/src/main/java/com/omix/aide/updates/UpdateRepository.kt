package com.omix.aide.updates

import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

interface UpdateStorage {
    var lastAttempt: Long
    var cachedManifest: String?
}

sealed interface CheckResult {
    data class Release(val manifest: ReleaseManifest, val fromCache: Boolean) : CheckResult
    data object NoRelease : CheckResult
    data class Failed(val cached: ReleaseManifest?, val invalid: Boolean) : CheckResult
}

/** No network on the UI thread. Failed automatic attempts are throttled too. */
class UpdateRepository(
    private val source: ManifestSource,
    private val storage: UpdateStorage,
    private val certificate: String,
    private val clock: () -> Long = System::currentTimeMillis
) {
    private val mutex = Mutex()

    fun cached(): ReleaseManifest? = storage.cachedManifest?.let {
        runCatching { ReleaseManifest.parse(it, certificate) }.getOrNull()
    }

    suspend fun check(force: Boolean = false): CheckResult = mutex.withLock {
        val cached = cached()
        if (!shouldCheck(clock(), storage.lastAttempt, force)) {
            return@withLock cached?.let { CheckResult.Release(it, true) } ?: CheckResult.NoRelease
        }
        storage.lastAttempt = clock()
        try {
            val raw = source.latest()
            if (raw == null) {
                // A transient empty release list must not erase a known mandatory update.
                return@withLock cached?.let { CheckResult.Release(it, true) } ?: CheckResult.NoRelease
            }
            val manifest = ReleaseManifest.parse(raw, certificate)
            if (cached != null && manifest.versionCode < cached.versionCode) {
                return@withLock CheckResult.Release(cached, true)
            }
            storage.cachedManifest = raw
            CheckResult.Release(manifest, false)
        } catch (cancelled: CancellationException) {
            throw cancelled
        } catch (error: Exception) {
            CheckResult.Failed(cached, error is InvalidManifest || error is org.json.JSONException)
        }
    }
}
