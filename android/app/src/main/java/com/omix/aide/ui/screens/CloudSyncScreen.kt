package com.omix.aide.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Cloud
import androidx.compose.material.icons.filled.CloudDone
import androidx.compose.material.icons.filled.CloudOff
import androidx.compose.material.icons.filled.Sync
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import com.omix.aide.ui.components.AideCard
import com.omix.aide.ui.viewmodel.CloudSyncUiState
import com.omix.aide.ui.viewmodel.CloudSyncViewModel
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/**
 * Link this phone to an Aide Cloud account.
 *
 * Offline stays the default: nothing here is required to sell. Signing in adds
 * a second copy on the server and keeps another phone or the web dashboard in
 * step. Products, categories and sales sync; expenses and customers stay on the
 * phone, and the screen says so rather than implying a complete mirror.
 */
@Composable
fun CloudSyncScreen(
    viewModel: CloudSyncViewModel,
    onBack: () -> Unit,
    onBusinessChanged: () -> Unit
) {
    val state by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            Row(
                modifier = Modifier.fillMaxWidth().padding(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                TextButton(onClick = onBack) { Text("Back") }
                Text(
                    text = "Cloud sync",
                    style = MaterialTheme.typography.headlineMedium,
                    modifier = Modifier.weight(1f)
                )
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp)
        ) {
            if (state.linked) {
                LinkedContent(
                    state = state,
                    onSyncNow = viewModel::syncNow,
                    onAutoSync = viewModel::setAutoSync,
                    onDisconnect = viewModel::disconnect
                )
            } else {
                ConnectContent(
                    state = state,
                    onConnect = { url, email, password ->
                        viewModel.connect(url, email, password, onBusinessChanged)
                    }
                )
            }

            state.message?.let { message ->
                Spacer(Modifier.height(12.dp))
                StatusNote(text = message, isError = false, onDismiss = viewModel::dismissMessage)
            }
            state.error?.let { error ->
                Spacer(Modifier.height(12.dp))
                StatusNote(text = error, isError = true, onDismiss = viewModel::dismissMessage)
            }

            Spacer(Modifier.height(24.dp))
            Text(
                text = "The till never waits for the network. Sales are saved on this phone " +
                    "first and uploaded when a connection is available.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun ConnectContent(
    state: CloudSyncUiState,
    onConnect: (String, String, String) -> Unit
) {
    var serverUrl by rememberSaveable { mutableStateOf(state.baseUrl) }
    var email by rememberSaveable { mutableStateOf("") }
    var password by rememberSaveable { mutableStateOf("") }

    // Keep the field in step with a session that was linked elsewhere.
    LaunchedEffect(state.baseUrl) {
        if (serverUrl.isBlank()) serverUrl = state.baseUrl
    }

    Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(
            Icons.Default.Cloud,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.primary,
            modifier = Modifier.size(28.dp)
        )
        Spacer(Modifier.width(12.dp))
        Column {
            Text(
                "Keep this phone in step",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.SemiBold
            )
            Text(
                "Same account as aide.omixsystems.store",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }

    Spacer(Modifier.height(16.dp))
    AideCard {
        Column(modifier = Modifier.padding(16.dp)) {
            OutlinedTextField(
                value = serverUrl,
                onValueChange = { serverUrl = it },
                label = { Text("Aide Cloud address") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )
            Spacer(Modifier.height(10.dp))
            OutlinedTextField(
                value = email,
                onValueChange = { email = it },
                label = { Text("Email") },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                modifier = Modifier.fillMaxWidth()
            )
            Spacer(Modifier.height(10.dp))
            OutlinedTextField(
                value = password,
                onValueChange = { password = it },
                label = { Text("Password") },
                singleLine = true,
                visualTransformation = PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                modifier = Modifier.fillMaxWidth()
            )
            Spacer(Modifier.height(16.dp))
            Button(
                onClick = { onConnect(serverUrl, email, password) },
                enabled = !state.busy,
                modifier = Modifier.fillMaxWidth().height(48.dp)
            ) {
                if (state.busy) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(18.dp),
                        strokeWidth = 2.dp,
                        color = MaterialTheme.colorScheme.onPrimary
                    )
                    Spacer(Modifier.width(10.dp))
                }
                Text(if (state.busy) "Connecting…" else "Connect")
            }
        }
    }

    Spacer(Modifier.height(16.dp))
    AideCard {
        Column(modifier = Modifier.padding(16.dp)) {
            Text("What syncs", style = MaterialTheme.typography.titleMedium)
            Spacer(Modifier.height(6.dp))
            Text(
                "Products, categories and sales, in both directions. The first sign-in " +
                    "adopts this account's business and uploads the products and sales " +
                    "already on this phone — nothing is wiped.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(Modifier.height(10.dp))
            Text("What stays on this phone", style = MaterialTheme.typography.titleMedium)
            Spacer(Modifier.height(6.dp))
            Text(
                "Expenses, customer balances and the local notification log. They are " +
                    "still included in the JSON export in Settings.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun LinkedContent(
    state: CloudSyncUiState,
    onSyncNow: () -> Unit,
    onAutoSync: (Boolean) -> Unit,
    onDisconnect: () -> Unit
) {
    var confirmDisconnect by remember { mutableStateOf(false) }

    AideCard {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Default.CloudDone,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(28.dp)
                )
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Text(
                        "Connected",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.SemiBold
                    )
                    Text(
                        state.email.ifBlank { "Aide Cloud account" },
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            Spacer(Modifier.height(16.dp))
            HorizontalDivider()
            Spacer(Modifier.height(12.dp))

            InfoRow("Last sync", relativeTime(state.lastSyncAt))
            Spacer(Modifier.height(8.dp))
            InfoRow(
                "Waiting to upload",
                if (state.pending == 0) "Nothing queued" else "${state.pending} change${if (state.pending == 1) "" else "s"}"
            )
            Spacer(Modifier.height(8.dp))
            InfoRow("Server", state.baseUrl)

            Spacer(Modifier.height(8.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(Modifier.weight(1f)) {
                    Text("Sync automatically", style = MaterialTheme.typography.bodyLarge)
                    Text(
                        "Every 15 minutes while online",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                Switch(checked = state.autoSync, onCheckedChange = onAutoSync)
            }

            Spacer(Modifier.height(16.dp))
            Button(
                onClick = onSyncNow,
                enabled = !state.busy,
                modifier = Modifier.fillMaxWidth().height(48.dp)
            ) {
                if (state.busy) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(18.dp),
                        strokeWidth = 2.dp,
                        color = MaterialTheme.colorScheme.onPrimary
                    )
                } else {
                    Icon(Icons.Default.Sync, contentDescription = null)
                }
                Spacer(Modifier.width(8.dp))
                Text(if (state.busy) "Syncing…" else "Sync now")
            }
        }
    }

    Spacer(Modifier.height(16.dp))
    OutlinedButton(
        onClick = { confirmDisconnect = true },
        enabled = !state.busy,
        modifier = Modifier.fillMaxWidth().height(48.dp)
    ) {
        Icon(Icons.Default.CloudOff, contentDescription = null)
        Spacer(Modifier.width(8.dp))
        Text("Disconnect this phone")
    }
    Spacer(Modifier.height(8.dp))
    Text(
        "Disconnecting stops syncing. It does not delete the products and sales already " +
            "on this phone.",
        style = MaterialTheme.typography.bodySmall,
        color = MaterialTheme.colorScheme.onSurfaceVariant
    )

    if (confirmDisconnect) {
        AlertDialog(
            onDismissRequest = { confirmDisconnect = false },
            title = { Text("Disconnect Aide Cloud?") },
            text = {
                Text(
                    "This phone keeps working offline with the data it already has, " +
                        "but new changes will not reach your other devices."
                )
            },
            confirmButton = {
                TextButton(onClick = {
                    confirmDisconnect = false
                    onDisconnect()
                }) { Text("Disconnect") }
            },
            dismissButton = {
                TextButton(onClick = { confirmDisconnect = false }) { Text("Cancel") }
            }
        )
    }
}

@Composable
private fun InfoRow(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            label,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Text(
            value,
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.Medium,
            modifier = Modifier.padding(start = 16.dp)
        )
    }
}

@Composable
private fun StatusNote(text: String, isError: Boolean, onDismiss: () -> Unit) {
    val container = if (isError) {
        MaterialTheme.colorScheme.errorContainer
    } else {
        MaterialTheme.colorScheme.secondaryContainer
    }
    val content = if (isError) {
        MaterialTheme.colorScheme.onErrorContainer
    } else {
        MaterialTheme.colorScheme.onSecondaryContainer
    }
    Surface(color = container, contentColor = content, shape = MaterialTheme.shapes.medium) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(text, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f))
            TextButton(onClick = onDismiss) { Text("Dismiss") }
        }
    }
}

private fun relativeTime(iso: String?): String {
    if (iso.isNullOrBlank()) return "Not yet"
    val parsed: Date = runCatching {
        SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
            timeZone = TimeZone.getTimeZone("UTC")
        }.parse(iso)
    }.getOrNull() ?: return "Not yet"

    val minutes = ((System.currentTimeMillis() - parsed.time) / 60_000L).coerceAtLeast(0)
    return when {
        minutes < 1 -> "Just now"
        minutes < 60 -> "$minutes min ago"
        minutes < 60 * 24 -> "${minutes / 60} h ago"
        else -> "${minutes / (60 * 24)} d ago"
    }
}
