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

enum class UpdateStage { IDLE, CHECKING, AVAILABLE, WAITING, DOWNLOADING, VERIFYING, READY, PERMISSION, INSTALLING, FAILED, CURRENT }

data class UpdateUiState(
    val installed: InstalledVersion = InstalledVersion(BuildConfig.VERSION_NAME, BuildConfig.VERSION_CODE.toLong()),
    val manifest: ReleaseManifest? = null,
    val asset: ApkAsset? = null,
    val stage: UpdateStage = UpdateStage.IDLE,
    val visible: Boolean = false,
    val bytes: Long = 0,
    val message: String? = null
) {
    val mandatory: Boolean get() = manifest?.isMandatory(installed.code) == true
    val hasUpdate: Boolean get() = manifest?.let { isNewerVersion(it.versionCode, installed.code) } == true
    val busy: Boolean get() = stage in setOf(UpdateStage.WAITING, UpdateStage.DOWNLOADING, UpdateStage.VERIFYING)
}

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
            observe(storage.workId!!)
        }
    }

    /** Called on EVERY resume, including returning from Android's permission and installer screens. */
    fun onResume() {
        val installed = ApkInstaller.installed(context)
        mutable.value = mutable.value.copy(installed = installed)
        val pending = storage.pendingInstallVersion
        if (pending > 0 && installed.code >= pending) {
            storage.pendingInstallVersion = 0
            storage.workId = null
            storage.downloadManifest = null
            observation?.cancel()
            mutable.value = UpdateUiState(installed = installed, stage = UpdateStage.CURRENT, visible = true, message = "Aide ${installed.name} is installed. Your local data is unchanged.")
            scope.launch(Dispatchers.IO) { File(context.cacheDir, "updates").deleteRecursively() }
        } else if (mutable.value.manifest?.versionCode?.let { it <= installed.code } == true) {
            observation?.cancel()
            mutable.value = UpdateUiState(installed = installed)
        } else if (mutable.value.stage == UpdateStage.PERMISSION && ApkInstaller.canInstall(context)) {
            mutable.value = mutable.value.copy(stage = UpdateStage.READY, message = null)
        } else if (pending > 0 && mutable.value.stage != UpdateStage.INSTALLING) {
            mutable.value = mutable.value.copy(stage = UpdateStage.READY, visible = true, message = "Installation was not completed. You can try again; Android will ask you to confirm.")
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
            if (manual) mutable.value = mutable.value.copy(stage = UpdateStage.CHECKING, visible = true, message = null)
            when (val result = withContext(Dispatchers.IO) { repository.check(manual) }) {
                is CheckResult.Release -> applyManifest(result.manifest, manual)
                is CheckResult.NoRelease -> if (manual) mutable.value = mutable.value.copy(stage = UpdateStage.CURRENT, visible = true, message = "You're up to date. No newer compatible release is available.")
                is CheckResult.Failed -> {
                    result.cached?.let { applyManifest(it, manual) }
                    if (manual) mutable.value = mutable.value.copy(
                        stage = UpdateStage.FAILED, visible = true,
                        message = if (result.invalid) "The release metadata could not be verified. No APK was installed. Please try again later."
                        else "Couldn't check GitHub for updates. Check your connection and try again."
                    )
                }
            }
        }
    }

    private fun applyManifest(manifest: ReleaseManifest, manual: Boolean) {
        val current = mutable.value
        if (!isNewerVersion(manifest.versionCode, current.installed.code)) {
            if (manual) mutable.value = current.copy(manifest = null, asset = null, stage = UpdateStage.CURRENT, visible = true, message = "You're up to date.")
            return
        }
        val asset = manifest.selectAsset(Build.SUPPORTED_ABIS.toList())
        val deferred = storage.deferredVersion == manifest.versionCode && System.currentTimeMillis() < storage.deferredUntil
        val visible = current.visible || manual || manifest.isMandatory(current.installed.code) || !deferred
        if (asset == null || Build.VERSION.SDK_INT < manifest.minSdk) {
            mutable.value = current.copy(manifest = manifest, asset = null, stage = UpdateStage.FAILED, visible = visible,
                message = "This release is not compatible with this device's Android version or processor. Your existing app and data are unchanged.")
            return
        }
        // Do not turn a downloaded/permission-pending APK back into an offer.
        val preserve = current.manifest?.versionCode == manifest.versionCode && current.stage in setOf(UpdateStage.READY, UpdateStage.PERMISSION, UpdateStage.INSTALLING)
        mutable.value = current.copy(manifest = manifest, asset = asset, stage = if (preserve) current.stage else UpdateStage.AVAILABLE, visible = visible, message = if (preserve) current.message else null)
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
        storage.downloadManifest = raw
        val request = OneTimeWorkRequestBuilder<ApkDownloadWorker>()
            .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
            .setInputData(workDataOf("version" to manifest.versionCode, "sha256" to asset.sha256))
            .addTag("aide-update")
            .build()
        storage.workId = request.id.toString()
        mutable.value = current.copy(stage = UpdateStage.WAITING, bytes = 0, message = null, visible = true)
        // Only one job at a time. Completed/failed work may be retried explicitly.
        workManager.enqueueUniqueWork("aide-apk-download", ExistingWorkPolicy.KEEP, request)
        observe(request.id.toString())
    }

    private fun observe(id: String) {
        observation?.cancel()
        observation = scope.launch {
            val uuid = runCatching { UUID.fromString(id) }.getOrNull() ?: return@launch
            workManager.getWorkInfoByIdFlow(uuid).collect { info ->
                if (info == null) return@collect
                val current = mutable.value
                if (!current.hasUpdate) return@collect
                when (info.state) {
                    WorkInfo.State.ENQUEUED, WorkInfo.State.BLOCKED -> mutable.value = current.copy(stage = UpdateStage.WAITING)
                    WorkInfo.State.RUNNING -> mutable.value = current.copy(
                        stage = if (info.progress.getBoolean("verifying", false)) UpdateStage.VERIFYING else UpdateStage.DOWNLOADING,
                        bytes = info.progress.getLong("bytes", 0)
                    )
                    WorkInfo.State.SUCCEEDED -> if (current.stage !in setOf(UpdateStage.PERMISSION, UpdateStage.INSTALLING)) {
                        mutable.value = current.copy(stage = UpdateStage.READY, bytes = current.asset?.sizeBytes ?: 0, message = null)
                    }
                    WorkInfo.State.FAILED, WorkInfo.State.CANCELLED -> mutable.value = current.copy(stage = UpdateStage.FAILED,
                        message = when (info.outputData.getString("error")) {
                            "checksum" -> "The download failed its SHA-256 checksum check. The file was not installed. Retry to download a fresh copy."
                            "signature" -> "Android could not verify this APK's package, version or signing certificate. Your installed app and data are unchanged. Try downloading again."
                            "metadata" -> "The update metadata is invalid. Check for updates again before downloading."
                            "interrupted" -> "The download was interrupted. Retry to download a fresh, complete copy."
                            else -> "The download failed or was interrupted. Check your connection and free storage, then retry."
                        })
                }
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
                    mutable.value = mutable.value.copy(stage = UpdateStage.PERMISSION, message = null)
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
        mutable.value = mutable.value.copy(stage = UpdateStage.PERMISSION, message = "Android couldn't open this setting. Open Settings → Apps → Aide → Install unknown apps, allow this source, then return here.")
    }

    fun installerReturned() {
        val installed = ApkInstaller.installed(context)
        if (installed.code >= storage.pendingInstallVersion && storage.pendingInstallVersion > 0) {
            onResume()
        } else {
            mutable.value = mutable.value.copy(installed = installed, stage = UpdateStage.READY, visible = true,
                message = "Installation was not completed. Android may have cancelled or rejected it. Your existing app and data are unchanged. Tap Install update to try again.")
        }
    }

    companion object {
        @Volatile private var instance: UpdateManager? = null
        fun get(context: Context): UpdateManager = instance ?: synchronized(this) {
            instance ?: UpdateManager(context.applicationContext).also { instance = it }
        }
    }
}
