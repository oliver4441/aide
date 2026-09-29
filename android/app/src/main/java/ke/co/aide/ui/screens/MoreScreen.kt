package ke.co.aide.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import ke.co.aide.ui.components.AideCard

@Composable
fun MoreScreen(
    onNavigateToSync: () -> Unit,
    onLogout: () -> Unit
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Text(
                text = "MORE",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
            )
        }

        item {
            MoreMenuItem(
                icon = Icons.Default.Sync,
                title = "Sync Centre",
                subtitle = "Manage offline data & sync status",
                onClick = onNavigateToSync
            )
        }

        item {
            MoreMenuItem(
                icon = Icons.Default.People,
                title = "Customers",
                subtitle = "Manage customer balances & directory",
                onClick = {}
            )
        }

        item {
            MoreMenuItem(
                icon = Icons.Default.Receipt,
                title = "Expenses",
                subtitle = "Track shop overheads & payments",
                onClick = {}
            )
        }

        item {
            MoreMenuItem(
                icon = Icons.Default.Assessment,
                title = "Reports",
                subtitle = "Sales analytics, profit, & summaries",
                onClick = {}
            )
        }

        item {
            MoreMenuItem(
                icon = Icons.Default.Settings,
                title = "Settings",
                subtitle = "Business profile & receipt customization",
                onClick = {}
            )
        }

        item {
            Spacer(modifier = Modifier.height(16.dp))
            MoreMenuItem(
                icon = Icons.Default.ExitToApp,
                title = "Sign Out",
                subtitle = "Log out of current business session",
                onClick = onLogout
            )
        }
    }
}

@Composable
fun MoreMenuItem(
    icon: ImageVector,
    title: String,
    subtitle: String,
    onClick: () -> Unit
) {
    AideCard(modifier = Modifier.clickable { onClick() }) {
        Row(
            modifier = Modifier.padding(16.dp).fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = icon,
                contentDescription = title,
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(24.dp)
            )
            Spacer(modifier = Modifier.width(16.dp))
            Column {
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    text = subtitle,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                )
            }
        }
    }
}
