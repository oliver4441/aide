package com.omix.aide.updates

import org.junit.Assert.*
import org.junit.Test

class UpdateStateTest {
    private val installed = InstalledVersion("1.0.12", 1012)
    private val release get() = testManifest()
    private fun offer(manifest: ReleaseManifest = release) = UpdateUiState(installed = installed)
        .withRelease(manifest, listOf("arm64-v8a"), 35, manual = false, deferred = false)

    @Test fun newerBuildOffersOptionalUpdateWithoutStartingADownload() {
        val state = offer()
        assertEquals(UpdateStage.AVAILABLE, state.stage)
        assertTrue(state.visible)
        assertTrue(state.hasUpdate)
        assertFalse(state.mandatory)
        assertFalse(state.busy)
    }
    @Test fun equalAndOlderBuildsNeverOfferOrMandateAnUpdate() {
        for (code in listOf(1013L, 1014L)) {
            val current = UpdateUiState(installed = InstalledVersion("installed", code))
            val state = current.withRelease(release.copy(mandatory = true), listOf("arm64-v8a"), 35, false, false)
            assertEquals(current, state)
            assertFalse(state.hasUpdate)
            assertFalse(state.mandatory)
        }
    }
    @Test fun manualNoUpdateResultShowsCurrentState() {
        val state = UpdateUiState(installed = InstalledVersion("1.0.13", 1013))
            .withRelease(release, listOf("arm64-v8a"), 35, true, false)
        assertEquals(UpdateStage.CURRENT, state.stage)
        assertTrue(state.visible)
        assertNull(state.manifest)
    }
    @Test fun optionalDeferralSurvivesStartupButNotAnExplicitCheck() {
        val current = UpdateUiState(installed = installed)
        assertFalse(current.withRelease(release, listOf("arm64-v8a"), 35, false, true).visible)
        assertTrue(current.withRelease(release, listOf("arm64-v8a"), 35, true, true).visible)
    }
    @Test fun mandatoryPolicyOverridesDeferralForFlagAndMinimumThreshold() {
        for (required in listOf(release.copy(mandatory = true), release.copy(minimumSupportedVersionCode = 1013))) {
            val state = UpdateUiState(installed = installed).withRelease(required, listOf("arm64-v8a"), 35, false, true)
            assertTrue(state.mandatory)
            assertTrue(state.visible)
        }
    }
    @Test fun unsupportedAbiAndSdkExplainFailureWithoutProvidingAnApk() {
        for (manifest in listOf(release.copy(assets = listOf(release.assets.single().copy(abi = "x86_64"))), release.copy(minSdk = 36))) {
            val state = offer(manifest)
            assertEquals(UpdateStage.FAILED, state.stage)
            assertEquals(UpdateRetry.CHECK, state.retry)
            assertNull(state.asset)
            assertNotNull(state.message)
        }
    }
    @Test fun recheckingIdenticalMetadataKeepsVerifiedAndPermissionStates() {
        for (stage in listOf(UpdateStage.READY, UpdateStage.PERMISSION, UpdateStage.INSTALLING, UpdateStage.DOWNLOADING)) {
            val current = offer().copy(stage = stage, bytes = 10)
            val result = current.withRelease(release, listOf("arm64-v8a"), 35, true, false)
            assertEquals(stage, result.stage)
            assertEquals(10L, result.bytes)
        }
    }
    @Test fun inFlightDownloadIsNeverRelabelledAsANewerBuild() {
        val current = offer().copy(stage = UpdateStage.DOWNLOADING, bytes = 10)
        assertEquals(current, current.withRelease(release.copy(versionCode = 1014), listOf("arm64-v8a"), 35, false, false))
    }
    @Test fun automaticChecksKeepFailureExplanationButManualChecksCanRetry() {
        val failed = offer().copy(stage = UpdateStage.FAILED, message = "Interrupted", retry = UpdateRetry.DOWNLOAD)
        assertEquals(failed, failed.withRelease(release, listOf("arm64-v8a"), 35, false, false))
        val retry = failed.withRelease(release, listOf("arm64-v8a"), 35, true, false)
        assertEquals(UpdateStage.AVAILABLE, retry.stage)
        assertNull(retry.message)
    }
    @Test fun installerCancellationOrRejectionIsNotReportedAsSuccess() {
        val state = offer().copy(stage = UpdateStage.INSTALLING).afterInstallationReturn(installed, 1013)
        assertEquals(UpdateStage.READY, state.stage)
        assertEquals(installed, state.installed)
        assertTrue(state.message!!.contains("not completed"))
        assertTrue(state.visible)
    }
    @Test fun onlyActuallyInstalledVersionAcknowledgesSuccessAfterProcessReplacement() {
        val actual = InstalledVersion("1.0.13", 1013)
        val state = UpdateUiState(installed = actual).afterInstallationReturn(actual, 1013)
        assertEquals(UpdateStage.CURRENT, state.stage)
        assertEquals(actual, state.installed)
        assertFalse(state.hasUpdate)
        assertTrue(state.visible)
    }
    @Test fun lifecycleAndRestoredActivityResultAreIdempotent() {
        val actual = InstalledVersion("1.0.13", 1013)
        val acknowledged = offer().copy(stage = UpdateStage.INSTALLING).afterInstallationReturn(actual, 1013)
        assertEquals(acknowledged, acknowledged.afterInstallationReturn(actual, 0))
        assertEquals(UpdateStage.CURRENT, acknowledged.stage)
    }
    @Test fun staleInstallerResultDoesNotInventReadyStateWithNoTarget() {
        val state = UpdateUiState(installed = installed)
        assertEquals(state, state.afterInstallationReturn(installed, 0))
    }
    @Test fun emptyReleaseResponseCannotReplaceAKnownMandatoryTargetWithAnUndismissableDoneDialog() {
        val known = offer(release.copy(mandatory = true)).copy(stage = UpdateStage.CHECKING)
        val result = known.withNoRelease(true, listOf("arm64-v8a"), 35)
        assertEquals(UpdateStage.AVAILABLE, result.stage)
        assertTrue(result.mandatory)
        assertTrue(result.visible)
        assertEquals(known.manifest, result.manifest)
    }
    @Test fun emptyReleaseResponseKeepsAVerifiedDownloadAndPermissionState() {
        for (stage in listOf(UpdateStage.READY, UpdateStage.PERMISSION)) {
            val current = offer().copy(stage = stage)
            assertEquals(current, current.withNoRelease(true, listOf("arm64-v8a"), 35))
        }
    }
    @Test fun emptyReleaseWithoutAKnownTargetShowsCurrentOnlyForAManualCheck() {
        val current = UpdateUiState(installed = installed)
        assertEquals(current, current.withNoRelease(false, listOf("arm64-v8a"), 35))
        val manual = current.copy(stage = UpdateStage.CHECKING).withNoRelease(true, listOf("arm64-v8a"), 35)
        assertEquals(UpdateStage.CURRENT, manual.stage)
        assertFalse(manual.mandatory)
        assertFalse(manual.hasUpdate)
        assertTrue(manual.visible)
    }
    @Test fun returningFromPermissionDoesNotInitiateInstallation() {
        val state = offer().copy(stage = UpdateStage.PERMISSION)
        assertEquals(UpdateStage.PERMISSION, state.afterInstallationReturn(installed, 0).stage)
    }
    @Test fun externallyInstalledCurrentOrNewerVersionClearsTheOldOffer() {
        for (code in listOf(1013L, 1014L)) {
            val actual = InstalledVersion("current", code)
            val state = offer().afterInstallationReturn(actual, 0)
            assertEquals(actual, state.installed)
            assertNull(state.manifest)
            assertFalse(state.hasUpdate)
        }
    }
}
