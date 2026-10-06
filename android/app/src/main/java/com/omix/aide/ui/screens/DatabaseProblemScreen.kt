package com.omix.aide.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import com.omix.aide.data.local.DatabaseHealth
import com.omix.aide.ui.components.AideButton
import com.omix.aide.ui.components.AideCard
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * Shown instead of the app when the local database cannot be opened.
 *
 * The failure this replaces was a crash loop: Room validates the schema lazily,
 * so a bad migration threw from inside a coroutine on the first query and the
 * app died before drawing anything. A shop that hit it had no way to get back
 * in and no way to get their data out.
 *
 * The order of the buttons matters. Export comes first and is non-destructive;
 * Reset is last, behind a confirmation, and says plainly what it destroys.
 */
@Composable
fun DatabaseProblemScreen(
    errorMessage: String?,
    onRetry: () -> Unit,
    onReset: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    var confirmReset by remember { mutableStateOf(false) }
    var status by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(24.dp)
    ) {
        Text(
            text = "Your data could not be opened",
            style = MaterialTheme.typography.headlineMedium
        )
        Spacer(Modifier.height(8.dp))
        Text(
            text = "Aide stores everything on this device. Something about the local " +
                "database stopped matching what this version expects, so the app has " +
                "stopped short of opening it rather than risking your records.",
            style = MaterialTheme.typography.bodyLarge
        )

        Spacer(Modifier.height(16.dp))

        AideCard {
            Text(
                text = errorMessage ?: "No further detail available.",
                style = MaterialTheme.typography.bodyMedium,
                fontFamily = FontFamily.Monospace,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        Spacer(Modifier.height(20.dp))

        // Non-destructive first: take a copy before anything else is offered.
        AideButton(
            text = "Save a copy of my data",
            onClick = {
                scope.launch {
                    val result = withContext(Dispatchers.IO) {
                        runCatching { DatabaseHealth.exportDatabaseFiles(context) }
                    }
                    status = result.fold(
                        onSuccess = { dir ->
                            if (dir == null) "No database file was found."
                            else "Saved to ${dir.name}"
                        },
                        onFailure = { "Could not save a copy: ${it.message}" }
                    )
                }
            }
        )

        Spacer(Modifier.height(10.dp))

        OutlinedButton(
            onClick = onRetry,
            modifier = Modifier.fillMaxWidth().height(48.dp)
        ) {
            Text("Try again")
        }

        Spacer(Modifier.height(10.dp))

        OutlinedButton(
            onClick = { confirmReset = true },
            modifier = Modifier.fillMaxWidth().height(48.dp)
        ) {
            Text("Start fresh (erases data)", color = MaterialTheme.colorScheme.error)
        }

        status?.let {
            Spacer(Modifier.height(12.dp))
            Text(
                text = it,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.primary
            )
        }

        Spacer(Modifier.height(16.dp))
        Text(
            text = "Aide is built by Omix Systems. If you have already saved a copy, " +
                "contact us and we can help restore it.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }

    if (confirmReset) {
        AlertDialog(
            onDismissRequest = { confirmReset = false },
            title = { Text("Erase everything on this device?") },
            text = {
                Text(
                    "This permanently deletes your products, sales, expenses and " +
                        "customers from this phone. It cannot be undone.\n\n" +
                        "Save a copy first if you have not already."
                )
            },
            confirmButton = {
                TextButton(onClick = {
                    confirmReset = false
                    onReset()
                }) { Text("Erase", color = MaterialTheme.colorScheme.error) }
            },
            dismissButton = {
                TextButton(onClick = { confirmReset = false }) { Text("Cancel") }
            }
        )
    }
}