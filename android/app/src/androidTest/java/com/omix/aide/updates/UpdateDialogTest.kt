package com.omix.aide.updates

import androidx.compose.material3.MaterialTheme
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import com.omix.aide.ui.releases.UpdateDialog
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

class UpdateDialogTest {
    @get:Rule val compose = createComposeRule()
    private val asset = ApkAsset("universal", "https://github.com/oliver4441/aide/releases/download/v1.0.13/aide.apk", 8_388_608, "a".repeat(64))
    private val manifest = ReleaseManifest("1.0.13", 1013, 1, false, 24, "2026-11-03T12:00:00Z", "Safer updates and installation fixes.", "https://github.com/oliver4441/aide/releases/tag/v1.0.13", "a".repeat(64), listOf(asset))
    private val base = UpdateUiState(InstalledVersion("1.0.12", 1012), manifest, asset, UpdateStage.AVAILABLE, visible = true)

    private fun show(state: UpdateUiState, onDownload: () -> Unit = {}, onPermission: () -> Unit = {}, onLater: () -> Unit = {}) {
        compose.setContent {
            MaterialTheme {
                UpdateDialog(state, onLater, onDownload, {}, {}, onPermission, {}, {})
            }
        }
    }
    @Test fun optionalOfferShowsVersionSizeNotesAndUserChoices() {
        var downloaded = false
        show(base, onDownload = { downloaded = true })
        compose.onNodeWithText("Update available").assertIsDisplayed()
        compose.onNodeWithText("Aide 1.0.13 • build 1013").assertIsDisplayed()
        compose.onNodeWithText("Released 2026-11-03 • 8.0 MB").assertIsDisplayed()
        compose.onNodeWithText("Later").assertIsDisplayed()
        compose.onNodeWithText("Update now").performClick()
        assertTrue(downloaded)
    }
    @Test fun mandatoryOfferCannotBeDeferredButCanCloseApp() {
        show(base.copy(manifest = manifest.copy(minimumSupportedVersionCode = 1013)))
        compose.onNodeWithText("Update required").assertIsDisplayed()
        compose.onNodeWithText("Later").assertDoesNotExist()
        compose.onNodeWithText("Close app").assertIsDisplayed()
    }
    @Test fun progressIsVisibleAndCanContinueInBackground() {
        show(base.copy(stage = UpdateStage.DOWNLOADING, bytes = 4_194_304))
        compose.onNodeWithText("50% • 4.0 MB of 8.0 MB").assertIsDisplayed()
        compose.onNodeWithText("Continue in background").assertIsDisplayed()
    }
    @Test fun failedDownloadHasClearRetry() {
        var retried = false
        show(base.copy(stage = UpdateStage.FAILED, message = "Checksum verification failed. Nothing was installed."), onDownload = { retried = true })
        compose.onNodeWithText("Checksum verification failed. Nothing was installed.").assertIsDisplayed()
        compose.onNodeWithText("Retry download").performClick()
        assertTrue(retried)
    }
    @Test fun failedMetadataCheckRetriesTheCheckNotACachedApkDownload() {
        show(base.copy(stage = UpdateStage.FAILED, retry = UpdateRetry.CHECK, message = "Couldn't check GitHub for updates."))
        compose.onNodeWithText("Retry check").assertIsDisplayed()
        compose.onNodeWithText("Retry download").assertDoesNotExist()
    }
    @Test fun permissionNeedsExplicitSettingsActionAndNeverInstallsItself() {
        var opened = false
        show(base.copy(stage = UpdateStage.PERMISSION), onPermission = { opened = true })
        compose.onNodeWithText("Allow update installation").assertIsDisplayed()
        compose.onNodeWithText("Install update").assertDoesNotExist()
        compose.onNodeWithText("Open settings").performClick()
        assertTrue(opened)
    }
    @Test fun olderAndroidExplainsTheGlobalUnknownSourcesSetting() {
        show(base.copy(stage = UpdateStage.PERMISSION, legacyInstallPermission = true))
        compose.onNodeWithText("This Android version uses the global", substring = true).assertExists()
        compose.onNodeWithText("Open settings").assertIsDisplayed()
        compose.onNodeWithText("Install update").assertDoesNotExist()
    }
    @Test fun verifiedDownloadRequiresExplicitInstallationHandoff() {
        show(base.copy(stage = UpdateStage.READY))
        compose.onNodeWithText("Ready to install").assertIsDisplayed()
        compose.onNodeWithText("Install update").assertIsDisplayed()
    }
    @Test fun noUpdateAndNetworkFailuresHaveNativeStates() {
        show(UpdateUiState(stage = UpdateStage.CURRENT, visible = true, message = "You're up to date."))
        compose.onNodeWithText("You're up to date.").assertIsDisplayed()
        compose.onNodeWithText("Done").assertIsDisplayed()
    }
}
