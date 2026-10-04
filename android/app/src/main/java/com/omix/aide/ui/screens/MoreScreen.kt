package com.omix.aide.ui.screens

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
import com.omix.aide.ui.components.AideCard
import com.omix.aide.ui.components.NotificationSettingsCard

@Composable
fun MoreScreen(
    businessName: String
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
            NotificationSettingsCard()
        }

        item {
            StaticInfoRow(
                icon = Icons.Default.PhoneAndroid,
                title = "Stored on this device",
                subtitle = "$businessName works offline. Nothing is uploaded to the cloud."
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
            StaticInfoRow(
                icon = Icons.Default.Info,
                title = "Local-only build",
                subtitle = "No account and no sync. Uninstalling the app deletes your data, " +
                    "so export anything you need to keep."
            )
        }
    }
}

/**
 * Informational row with no tap target, used to explain the local-only
 * behaviour rather than offer an action.
 */
@Composable
fun StaticInfoRow(
    icon: ImageVector,
    title: String,
    subtitle: String
) {
    AideCard {
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
                    style = MaterialTheme.typography.titleMedium
                )
                Text(
                    text = subtitle,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                )
            }
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
