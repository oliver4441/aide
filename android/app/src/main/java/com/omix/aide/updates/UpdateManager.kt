package com.omix.aide.updates

import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.work.Constraints
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkInfo
import androidx.work.WorkManager
import androidx.work.workDataOf
import com.omix.aide.BuildConfig
import java.io.File
import java.util.UUID
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/** Application-scoped: rotation never restarts a check or loses download progress. */
class UpdateManager private constructor(private val context: Context) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private val storage = AndroidUpdateStorage(context)
    private val repository = UpdateRepository(GitHubReleaseSource(GitHubTransport(), BuildConfig.UPDATE_CERT_SHA256), storage, BuildConfig.UPDATE_CERT_SHA256)
    private val workManager = WorkManager.getInstance(context)
    private val mutable = MutableStateFlow(UpdateUiState())
    val state = mutable.asStateFlow()
    private var checkJob: Job? = null
    private var observation: Job? = null
    private var preparingInstall = false

    init {
        val cached = repository.cached()
        if (cached != null) applyManifest(cached, false)
        val savedDownload = storage.downloadManifest?.let {
            runCatching { ReleaseManifest.parse(it, BuildConfig.UPDATE_CERT_SHA256) }.getOrNull()
        }
        if (savedDownload != null && savedDownload.versionCode > mutable.value.installed.code && storage.workId != null) {
            applyManifest(savedDownload, false)
            mutable.value = mutable.value.copy(stage = UpdateStage.WAITING)
            observe(storage.workId!!)
        }
    }

    /** Called on EVERY resume, including returning from Android's permission and installer screens. */
    fun onResume() {
        val installed = ApkInstaller.installed(context)
        val pending = storage.pendingInstallVersion
        val completedTarget = mutable.value.manifest?.versionCode?.let { it <= installed.code } == true
        mutable.value = mutable.value.afterInstallationReturn(installed, pending)
        if (pending > 0) storage.pendingInstallVersion = 0
        if (pending > 0 && installed.code >= pending) {
            clearCompletedDownload()
        } else if (completedTarget) {
            clearCompletedDownload()
            mutable.value = UpdateUiState(installed = installed)
        } else if (mutable.value.stage == UpdateStage.PERMISSION && ApkInstaller.canInstall(context)) {
            mutable.value = mutable.value.copy(stage = UpdateStage.READY, message = null)
        }
        check()
    }

    fun check(manual: Boolean = false) {
        if (BuildConfig.DEBUG || context.packageName != UPDATE_PACKAGE) {
            if (manual) mutable.value = mutable.value.copy(stage = UpdateStage.CURRENT, visible = true, message = "This is a separate development build. Automatic updates are available in the signed production app from GitHub Releases.")
            return
        }
        if (mutable.value.busy || mutable.value.stage == UpdateStage.INSTALLING || preparingInstall) {
            if (manual) show()
            return
        }
        if (checkJob?.isActive == true) {
            if (manual) show()
            return
        }
        checkJob = scope.launch {
            if (manual) {
                // Checking again must not discard a verified APK or a pending permission screen.
                val preserve = mutable.value.stage in setOf(UpdateStage.READY, UpdateStage.PERMISSION)
                mutable.value = mutable.value.copy(stage = if (preserve) mutable.value.stage else UpdateStage.CHECKING, visible = true, message = null)
            }
            when (val result = withContext(Dispatchers.IO) { repository.check(manual) }) {
                is CheckResult.Release -> applyManifest(result.manifest, manual)
                is CheckResult.NoRelease -> if (manual) mutable.value = mutable.value.copy(stage = UpdateStage.CURRENT, visible = true, message = "You're up to date. No newer compatible release is available.")
                is CheckResult.Failed -> {
                    result.cached?.let { applyManifest(it, manual) }
                    if (manual) mutable.value = mutable.value.copy(
                        stage = UpdateStage.FAILED, visible = true, retry = UpdateRetry.CHECK,
                        message = if (result.invalid) "The release metadata could not be verified. No APK was installed. Please try again later."
                        else "Couldn't check GitHub for updates. Check your connection and try again."
                    )
                }
            }
        }
    }

    private fun applyManifest(manifest: ReleaseManifest, manual: Boolean) {
        val deferred = storage.deferredVersion == manifest.versionCode && System.currentTimeMillis() < storage.deferredUntil
        mutable.value = mutable.value.withRelease(manifest, Build.SUPPORTED_ABIS.toList(), Build.VERSION.SDK_INT, manual, deferred)
    }

    private fun clearCompletedDownload() {
        storage.workId = null
        storage.downloadManifest = null
        observation?.cancel()
        scope.launch(Dispatchers.IO) { File(context.cacheDir, "updates").deleteRecursively() }
    }

    fun show() { mutable.value = mutable.value.copy(visible = true) }

    fun later() {
        if (mutable.value.mandatory) return
        mutable.value.manifest?.let {
            storage.deferredVersion = it.versionCode
            storage.deferredUntil = System.currentTimeMillis() + CHECK_INTERVAL_MS
        }
        mutable.value = mutable.value.copy(visible = false)
    }

    fun download() {
        val current = mutable.value
        val manifest = current.manifest ?: return
        val asset = current.asset ?: return
        if (current.busy || preparingInstall) return
        // Save the exact target separately; a later metadata check cannot change an active job.
        val raw = storage.cachedManifest ?: return
        val parsed = runCatching { ReleaseManifest.parse(raw, BuildConfig.UPDATE_CERT_SHA256) }.getOrNull() ?: return
        if (parsed != manifest) {
            check(manual = true)
            return
        }
        mutable.value = current.copy(stage = UpdateStage.WAITING, bytes = 0, message = null, visible = true, retry = UpdateRetry.DOWNLOAD)
        scope.launch {
            try {
                // A process can restart between enqueueing and observing work.
                // Reuse the active ID instead of watching a KEEP-ignored request.
                val active = withContext(Dispatchers.IO) {
                    workManager.getWorkInfosForUniqueWork("aide-apk-download").get().firstOrNull { !it.state.isFinished }
                }
                if (active != null) {
                    val saved = storage.downloadManifest?.let {
                        runCatching { ReleaseManifest.parse(it, BuildConfig.UPDATE_CERT_SHA256) }.getOrNull()
                    }
                    if (saved == null) {
                        // An orphaned job cannot be associated with an arbitrary
                        // cached release. Stop it before allowing a clean retry.
                        withContext(Dispatchers.IO) { workManager.cancelUniqueWork("aide-apk-download").result.get() }
                        throw InvalidManifest("The active download metadata was lost")
                    }
                    mutable.value = mutable.value.copy(stage = UpdateStage.IDLE)
                    applyManifest(saved, false)
                    mutable.value = mutable.value.copy(stage = UpdateStage.WAITING)
                    storage.workId = active.id.toString()
                    observe(active.id.toString())
                } else {
                    storage.downloadManifest = raw
                    val request = OneTimeWorkRequestBuilder<ApkDownloadWorker>()
                        .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
                        .setInputData(workDataOf("version" to manifest.versionCode, "sha256" to asset.sha256))
                        .addTag("aide-update")
                        .build()
                    // Persist the ID before enqueue: a process death at either
                    // boundary can be recovered by the active-work lookup above.
                    storage.workId = request.id.toString()
                    withContext(Dispatchers.IO) {
                        workManager.enqueueUniqueWork("aide-apk-download", ExistingWorkPolicy.KEEP, request).result.get()
                    }
                    observe(request.id.toString())
                }
            } catch (cancelled: CancellationException) {
                throw cancelled
            } catch (error: Exception) {
                mutable.value = mutable.value.copy(stage = UpdateStage.FAILED, message = "Android couldn't start the download. Please try again.")
            }
        }
    }

    private fun observe(id: String) {
        observation?.cancel()
        observation = scope.launch {
            try {
                val uuid = UUID.fromString(id)
                // Capture the target, not mutable metadata from a subsequent check.
                val target = mutable.value.manifest ?: return@launch
                workManager.getWorkInfoByIdFlow(uuid).collect { info ->
                    val current = mutable.value
                    if (!current.hasUpdate || current.manifest != target) return@collect
                    if (info == null) {
                        mutable.value = current.copy(stage = UpdateStage.FAILED, retry = UpdateRetry.DOWNLOAD,
                            message = "The previous download was interrupted or removed by Android. Retry to download a fresh, complete copy.")
                        return@collect
                    }
                    when (info.state) {
                        WorkInfo.State.ENQUEUED, WorkInfo.State.BLOCKED -> mutable.value = current.copy(stage = UpdateStage.WAITING)
                        WorkInfo.State.RUNNING -> mutable.value = current.copy(
                            stage = if (info.progress.getBoolean("verifying", false)) UpdateStage.VERIFYING else UpdateStage.DOWNLOADING,
                            bytes = info.progress.getLong("bytes", 0)
                        )
                        WorkInfo.State.SUCCEEDED -> if (!preparingInstall && current.stage !in setOf(UpdateStage.PERMISSION, UpdateStage.INSTALLING)) {
                            mutable.value = current.copy(stage = UpdateStage.READY, bytes = current.asset?.sizeBytes ?: 0, message = null)
                        }
                        WorkInfo.State.FAILED, WorkInfo.State.CANCELLED -> mutable.value = current.copy(stage = UpdateStage.FAILED,
                            retry = if (info.outputData.getString("error") == "metadata") UpdateRetry.CHECK else UpdateRetry.DOWNLOAD,
                            message = when (info.outputData.getString("error")) {
                                "checksum" -> "The download failed its SHA-256 checksum check. The file was not installed. Retry to download a fresh copy."
                                "signature" -> "Android could not verify this APK's package, version or signing certificate. Your installed app and data are unchanged. Try downloading again."
                                "metadata" -> "The update metadata is invalid. Check for updates again before downloading."
                                "interrupted" -> "The download was interrupted. Retry to download a fresh, complete copy."
                                else -> "The download failed or was interrupted. Check your connection and free storage, then retry."
                            })
                    }
                }
            } catch (cancelled: CancellationException) {
                throw cancelled
            } catch (_: Exception) {
                mutable.value = mutable.value.copy(stage = UpdateStage.FAILED, retry = UpdateRetry.DOWNLOAD,
                    message = "Android couldn't restore the download. Retry to download a fresh copy.")
            }
        }
    }

    /** Verify again after time in the background; cache files can be evicted or changed. */
    fun prepareInstall(onReady: (Intent) -> Unit) {
        val current = mutable.value
        val manifest = current.manifest ?: return
        val asset = current.asset ?: return
        if (preparingInstall) return
        preparingInstall = true
        scope.launch {
            try {
                mutable.value = current.copy(stage = UpdateStage.VERIFYING, visible = true)
                val apk = File(context.cacheDir, "updates/${asset.fileName}")
                withContext(Dispatchers.IO) { ApkInstaller.verify(context, manifest, asset, apk) }
                if (!ApkInstaller.canInstall(context)) {
                    mutable.value = mutable.value.copy(stage = UpdateStage.PERMISSION, message = null, legacyInstallPermission = Build.VERSION.SDK_INT < 26)
                } else {
                    val intent = ApkInstaller.intent(context, apk)
                    storage.pendingInstallVersion = manifest.versionCode
                    mutable.value = mutable.value.copy(stage = UpdateStage.INSTALLING, message = null)
                    onReady(intent)
                }
            } catch (cancelled: CancellationException) {
                throw cancelled
            } catch (error: Exception) {
                mutable.value = mutable.value.copy(stage = UpdateStage.FAILED, message = "The APK could not be verified or Android's installer could not be opened. Nothing was installed. Retry the download.")
            } finally {
                preparingInstall = false
            }
        }
    }

    fun permissionUnavailable() {
        mutable.value = mutable.value.copy(stage = UpdateStage.PERMISSION, message = if (Build.VERSION.SDK_INT >= 26)
            "Android couldn't open this setting. Open Settings → Apps → Aide → Install unknown apps, allow this source, then return here."
            else "Android couldn't open this setting. Open Settings → Security → Unknown sources, then return here. Android will still ask you to confirm installation.")
    }

    fun installerReturned() {
        // The lifecycle path and the activity-result path must be idempotent.
        // PackageManager is the only source of truth for successful installation.
        onResume()
    }

    companion object {
        @Volatile private var instance: UpdateManager? = null
        fun get(context: Context): UpdateManager = instance ?: synchronized(this) {
            instance ?: UpdateManager(context.applicationContext).also { instance = it }
        }
    }
}
