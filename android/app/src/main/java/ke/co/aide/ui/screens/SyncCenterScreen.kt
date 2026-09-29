package ke.co.aide.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import ke.co.aide.ui.components.AideButton
import ke.co.aide.ui.components.AideCard
import ke.co.aide.ui.components.AideEmptyState
import ke.co.aide.ui.theme.PrimaryGreen
import ke.co.aide.ui.theme.WarningAmber
import ke.co.aide.ui.viewmodel.SyncViewModel

@Composable
fun SyncCenterScreen(
    syncViewModel: SyncViewModel
) {
    val uiState by syncViewModel.uiState.collectAsState()

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Text(
            text = "SYNC CENTRE",
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold
        )

        Spacer(modifier = Modifier.height(16.dp))

        AideCard {
            Column(modifier = Modifier.padding(16.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = if (uiState.pendingMutations.isEmpty()) "● Everything synced" else "● Offline changes waiting",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold,
                            color = if (uiState.pendingMutations.isEmpty()) PrimaryGreen else WarningAmber
                        )
                        Text(
                            text = "${uiState.pendingMutations.size} pending mutations",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                        )
                    }

                    AideButton(
                        text = if (uiState.isSyncing) "Syncing..." else "SYNC NOW",
                        onClick = { syncViewModel.syncNow() },
                        enabled = !uiState.isSyncing,
                        modifier = Modifier.width(140.dp)
                    )
                }

                if (uiState.lastSyncMessage != null) {
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        text = uiState.lastSyncMessage!!,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        Text(
            text = "Pending Outbox",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold
        )

        Spacer(modifier = Modifier.height(8.dp))

        if (uiState.pendingMutations.isEmpty()) {
            AideEmptyState(message = "No pending offline mutations.")
        } else {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(uiState.pendingMutations) { mutation ->
                    AideCard {
                        Row(
                            modifier = Modifier.padding(16.dp).fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Column {
                                Text(
                                    text = "${mutation.action.uppercase()} ${mutation.table.uppercase()}",
                                    style = MaterialTheme.typography.titleLarge,
                                    fontWeight = FontWeight.SemiBold
                                )
                                Text(
                                    text = "Record ID: ${mutation.recordId}",
                                    style = MaterialTheme.typography.labelMedium,
                                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
                                )
                            }
                            Text(
                                text = "Waiting",
                                style = MaterialTheme.typography.labelMedium,
                                color = WarningAmber,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }
        }
    }
}
