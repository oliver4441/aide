package com.omix.aide.ui.screens
import android.content.Intent

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.filled.OpenInNew
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.omix.aide.ui.components.AideCard
import com.omix.aide.ui.components.NotificationSettingsCard

@Composable
fun MoreScreen(
    businessName: String,
    onNavigateToCustomers: () -> Unit,
    onNavigateToExpenses: () -> Unit,
    onNavigateToReports: () -> Unit,
    onNavigateToSettings: () -> Unit,
    onNavigateToCalculator: () -> Unit
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Text(
                text = "MORE",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
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
                onClick = onNavigateToCustomers
            )
        }

        item {
            MoreMenuItem(
                icon = Icons.Default.Receipt,
                title = "Expenses",
                subtitle = "Track shop overheads & payments",
                onClick = onNavigateToExpenses
            )
        }

        item {
            MoreMenuItem(
                icon = Icons.Default.Assessment,
                title = "Reports",
                subtitle = "Sales analytics, profit, & summaries",
                onClick = onNavigateToReports
            )
        }

        item {
            MoreMenuItem(
                icon = Icons.Default.Settings,
                title = "Settings",
                subtitle = "Business profile & receipt customization",
                onClick = onNavigateToSettings
            )

            Spacer(modifier = Modifier.height(8.dp))
            MoreMenuItem(
                icon = Icons.Default.Calculate,
                title = "Calculator",
                subtitle = "Pricing, margin & profit",
                onClick = onNavigateToCalculator
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

        item {
            // Omix Systems credit, and a route to the company's site.
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { openCompanyWebsite() }
                    .padding(vertical = 16.dp),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Made by Omix Systems",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.width(6.dp))
                Icon(
                    imageVector = Icons.Default.OpenInNew,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.size(14.dp)
                )
            }
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
                    color = MaterialTheme.colorScheme.onSurfaceVariant
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
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

/** Opens the Omix Systems website. Reads the context from composition. */
@Composable
fun openCompanyWebsite() {
    val context = LocalContext.current
    val intent = Intent(Intent.ACTION_VIEW, android.net.Uri.parse(COMPANY_URL))
    runCatching { context.startActivity(intent) }
}
