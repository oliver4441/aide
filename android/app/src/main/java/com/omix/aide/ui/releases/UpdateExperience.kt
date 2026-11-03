package com.omix.aide.ui.releases

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.SystemUpdate
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.DialogProperties
import com.omix.aide.updates.UpdateManager
import com.omix.aide.updates.ApkInstaller
import com.omix.aide.updates.UpdateRetry
import com.omix.aide.updates.UpdateStage
import com.omix.aide.updates.UpdateUiState
import java.util.Locale

@Composable
fun UpdateHost(manager: UpdateManager, onCloseApp: () -> Unit) {
    val state by manager.state.collectAsState()
    val context = LocalContext.current
    val installer = rememberLauncherForActivityResult(ActivityResultContracts.StartActivityForResult()) {
        manager.installerReturned()
    }
    val permission = rememberLauncherForActivityResult(ActivityResultContracts.StartActivityForResult()) {
        manager.onResume()
    }
    if (state.visible) {
        UpdateDialog(
            state = state,
            onLater = manager::later,
            onDownload = manager::download,
            onRetryCheck = { manager.check(manual = true) },
            onInstall = {
                manager.prepareInstall { intent ->
                    try { installer.launch(intent) } catch (_: Exception) { manager.installerReturned() }
                }
            },
            onOpenPermission = {
                try {
                    permission.launch(ApkInstaller.permissionIntent(context))
                } catch (_: Exception) { manager.permissionUnavailable() }
            },
            onCheckInstallation = manager::installerReturned,
            onCloseApp = onCloseApp
        )
    }
}

/** A small persistent entry point after Later, or while the download runs in the background. */
@Composable
fun UpdateStatusBanner(state: UpdateUiState, onOpen: () -> Unit) {
    if (!state.hasUpdate || state.visible) return
    Surface(color = MaterialTheme.colorScheme.secondaryContainer) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
            Text(
                if (state.busy) "Downloading Aide ${state.manifest?.versionName}…" else "Aide ${state.manifest?.versionName} is available",
                style = MaterialTheme.typography.bodyMedium,
                modifier = Modifier.weight(1f)
            )
            TextButton(onClick = onOpen) { Text("View update") }
        }
    }
}

/** Stateless Material 3 UI so every important update state can be exercised on a device. */
@Composable
fun UpdateDialog(
    state: UpdateUiState,
    onLater: () -> Unit,
    onDownload: () -> Unit,
    onRetryCheck: () -> Unit,
    onInstall: () -> Unit,
    onOpenPermission: () -> Unit,
    onCheckInstallation: () -> Unit,
    onCloseApp: () -> Unit
) {
    val title = when (state.stage) {
        UpdateStage.CHECKING -> "Checking for updates"
        UpdateStage.WAITING -> "Waiting to download"
        UpdateStage.DOWNLOADING -> "Downloading update"
        UpdateStage.VERIFYING -> "Verifying update"
        UpdateStage.READY -> "Ready to install"
        UpdateStage.PERMISSION -> "Allow update installation"
        UpdateStage.INSTALLING -> "Continue in Android"
        UpdateStage.FAILED -> "Update couldn't be completed"
        UpdateStage.CURRENT -> "App update"
        else -> if (state.mandatory) "Update required" else "Update available"
    }
    AlertDialog(
        onDismissRequest = { if (!state.mandatory) onLater() },
        properties = DialogProperties(dismissOnBackPress = !state.mandatory, dismissOnClickOutside = !state.mandatory),
        icon = { Icon(Icons.Rounded.SystemUpdate, contentDescription = null) },
        title = { Text(title) },
        text = {
            Column(
                Modifier.heightIn(max = 440.dp).verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text("Installed: Aide ${state.installed.name} (${state.installed.code})", style = MaterialTheme.typography.bodySmall)
                state.manifest?.let { manifest ->
                    Text("Aide ${manifest.versionName} • build ${manifest.versionCode}", style = MaterialTheme.typography.titleMedium)
                    Text("Released ${manifest.publishedAt.take(10)} • ${state.asset?.let { formatUpdateSize(it.sizeBytes) } ?: "No compatible APK"}")
                    if (state.mandatory) {
                        Text("This update is required to continue using Aide. You can close the app instead. Android will still ask you to approve installation.", color = MaterialTheme.colorScheme.error)
                    }
                }
                when (state.stage) {
                    UpdateStage.CHECKING -> CircularProgressIndicator()
                    UpdateStage.WAITING -> {
                        LinearProgressIndicator(modifier = Modifier.fillMaxWidth())
                        Text("Waiting for a network connection or for Android to start the download. You can leave this screen; the download runs in the background.")
                    }
                    UpdateStage.DOWNLOADING -> {
                        val total = state.asset?.sizeBytes ?: 1L
                        val progress = (state.bytes.toFloat() / total).coerceIn(0f, 1f)
                        LinearProgressIndicator(progress = { progress }, modifier = Modifier.fillMaxWidth())
                        Text("${(progress * 100).toInt()}% • ${formatUpdateSize(state.bytes)} of ${formatUpdateSize(total)}")
                        Text("The download can continue in the background. Installation will never start without your confirmation.")
                    }
                    UpdateStage.VERIFYING -> {
                        CircularProgressIndicator()
                        Text("Checking the SHA-256 checksum, app identity, version and signing certificate before opening Android's installer.")
                    }
                    UpdateStage.PERMISSION -> Text(
                        if (state.legacyInstallPermission) "This Android version uses the global ‘Unknown sources’ setting. In the next screen, enable it under Security, then return here and tap Install update. Android will still ask you to confirm installation. You can turn Unknown sources off afterwards."
                        else "Android requires permission for Aide to request installation of an APK from GitHub. In the next screen, allow ‘Install unknown apps’ for Aide, then return here and tap Install update. This permission never allows silent installation. You can turn it off afterwards."
                    )
                    UpdateStage.READY -> Text("Download verified. Tap Install update to open Android's installer. Android controls the final confirmation; your local business data stays on this device.")
                    UpdateStage.INSTALLING -> Text("Finish or cancel in Android's installer, then return to Aide. We will refresh the installed version when you return. No silent installation is attempted.")
                    UpdateStage.AVAILABLE -> Text("Download from GitHub Releases. The SHA-256 checksum and signing certificate will be verified before Android asks you to install.")
                    else -> Unit
                }
                state.message?.let { Text(it, color = if (state.stage == UpdateStage.FAILED) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurfaceVariant) }
                if (state.manifest != null) {
                    Text("Release notes", style = MaterialTheme.typography.titleSmall)
                    Text(state.manifest.releaseNotes.ifBlank { "Maintenance and reliability improvements." })
                }
            }
        },
        confirmButton = {
            when (state.stage) {
                UpdateStage.AVAILABLE -> TextButton(onClick = onDownload) { Text("Update now") }
                UpdateStage.READY -> TextButton(onClick = onInstall) { Text("Install update") }
                UpdateStage.PERMISSION -> TextButton(onClick = onOpenPermission) { Text("Open settings") }
                UpdateStage.INSTALLING -> TextButton(onClick = onCheckInstallation) { Text("Check installation") }
                UpdateStage.FAILED -> if (state.asset != null && state.retry == UpdateRetry.DOWNLOAD) {
                    TextButton(onClick = onDownload) { Text("Retry download") }
                } else {
                    TextButton(onClick = onRetryCheck) { Text("Retry check") }
                }
                UpdateStage.CURRENT -> TextButton(onClick = onLater) { Text("Done") }
                else -> Unit
            }
        },
        dismissButton = {
            if (state.stage != UpdateStage.CURRENT) {
                if (state.mandatory) TextButton(onClick = onCloseApp) { Text("Close app") }
                else TextButton(onClick = onLater) { Text(if (state.busy) "Continue in background" else "Later") }
            }
        }
    )
}

fun formatUpdateSize(bytes: Long): String = when {
    bytes >= 1024 * 1024 -> String.format(Locale.getDefault(), "%.1f MB", bytes / (1024.0 * 1024.0))
    bytes >= 1024 -> String.format(Locale.getDefault(), "%.0f KB", bytes / 1024.0)
    else -> "$bytes B"
}
