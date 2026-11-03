package com.omix.aide.updates

import com.omix.aide.BuildConfig

enum class UpdateStage { IDLE, CHECKING, AVAILABLE, WAITING, DOWNLOADING, VERIFYING, READY, PERMISSION, INSTALLING, FAILED, CURRENT }
enum class UpdateRetry { CHECK, DOWNLOAD }

data class InstalledVersion(val name: String, val code: Long)

data class UpdateUiState(
    val installed: InstalledVersion = InstalledVersion(BuildConfig.VERSION_NAME, BuildConfig.VERSION_CODE.toLong()),
    val manifest: ReleaseManifest? = null,
    val asset: ApkAsset? = null,
    val stage: UpdateStage = UpdateStage.IDLE,
    val visible: Boolean = false,
    val bytes: Long = 0,
    val message: String? = null,
    val retry: UpdateRetry = UpdateRetry.DOWNLOAD
) {
    val mandatory: Boolean get() = manifest?.isMandatory(installed.code) == true
    val hasUpdate: Boolean get() = manifest?.let { isNewerVersion(it.versionCode, installed.code) } == true
    val busy: Boolean get() = stage in setOf(UpdateStage.WAITING, UpdateStage.DOWNLOADING, UpdateStage.VERIFYING)
}

/** Pure transitions shared by startup, foreground checks and installer callbacks. */
internal fun UpdateUiState.withRelease(
    release: ReleaseManifest,
    supportedAbis: List<String>,
    sdk: Int,
    manual: Boolean,
    deferred: Boolean
): UpdateUiState {
    if (!isNewerVersion(release.versionCode, installed.code)) {
        return if (manual) UpdateUiState(installed = installed, stage = UpdateStage.CURRENT, visible = true, message = "You're up to date.") else this
    }
    // Metadata arriving during a download must never relabel that work as a
    // different version or make its completed APK appear ready for another build.
    if (busy && manifest != null && manifest != release) return this
    val selected = release.selectAsset(supportedAbis)
    val show = visible || manual || release.isMandatory(installed.code) || !deferred
    if (selected == null || sdk < release.minSdk) {
        return copy(manifest = release, asset = null, stage = UpdateStage.FAILED, visible = show, retry = UpdateRetry.CHECK,
            message = "This release is not compatible with this device's Android version or processor. Your existing app and data are unchanged.")
    }
    val preserve = manifest == release && (stage in setOf(
        UpdateStage.WAITING, UpdateStage.DOWNLOADING, UpdateStage.VERIFYING,
        UpdateStage.READY, UpdateStage.PERMISSION, UpdateStage.INSTALLING
    ) || (!manual && stage == UpdateStage.FAILED))
    return copy(
        manifest = release, asset = selected,
        stage = if (preserve) stage else UpdateStage.AVAILABLE, visible = show,
        bytes = if (manifest == release) bytes else 0,
        message = if (preserve) message else null,
        retry = if (preserve) retry else UpdateRetry.DOWNLOAD
    )
}

/** Never infer success from RESULT_OK, a preference, or merely opening the installer. */
internal fun UpdateUiState.afterInstallationReturn(actual: InstalledVersion, pendingVersion: Long): UpdateUiState {
    if (pendingVersion > 0 && actual.code >= pendingVersion) {
        return UpdateUiState(installed = actual, stage = UpdateStage.CURRENT, visible = true,
            message = "Aide ${actual.name} is installed. Your local data is unchanged.")
    }
    val refreshed = copy(installed = actual)
    if (!refreshed.hasUpdate) {
        // A restored ActivityResult can arrive AFTER onResume has already
        // acknowledged the new version. Do not turn that success into READY.
        return if (stage == UpdateStage.CURRENT || manifest == null) refreshed else UpdateUiState(installed = actual)
    }
    return if (pendingVersion > 0 || stage == UpdateStage.INSTALLING) {
        refreshed.copy(stage = UpdateStage.READY, visible = true,
            message = "Installation was not completed. Android may have cancelled or rejected it. Your existing app and data are unchanged. Tap Install update to try again.")
    } else refreshed
}
