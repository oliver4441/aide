package com.omix.aide.ui.screens

import android.content.Context
import android.content.Intent
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.OpenInNew
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.omix.aide.ui.components.AideBadge
import com.omix.aide.ui.components.AideCard
import com.omix.aide.ui.components.AideLocalOnlyBanner
import com.omix.aide.ui.components.NotificationSettingsCard

@Composable
fun MoreScreen(
    businessName: String,
    onNavigateToCustomers: () -> Unit,
    onNavigateToExpenses: () -> Unit,
    onNavigateToReports: () -> Unit,
    onNavigateToSettings: () -> Unit,
    onNavigateToCalculator: () -> Unit,
    onNavigateToSuppliers: () -> Unit = {},
    onNavigateToShifts: () -> Unit = {},
    onNavigateToQuotations: () -> Unit = {}
) {
    val context = LocalContext.current

    Column(modifier = Modifier.fillMaxSize()) {
        AideLocalOnlyBanner()

        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Header Profile Card
            item {
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(20.dp),
                    color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.35f),
                    border = androidx.compose.foundation.BorderStroke(
                        1.dp,
                        MaterialTheme.colorScheme.primary.copy(alpha = 0.2f)
                    )
                ) {
                    Row(
                        modifier = Modifier.padding(18.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(52.dp)
                                .clip(CircleShape)
                                .background(MaterialTheme.colorScheme.primary),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.Storefront,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.onPrimary,
                                modifier = Modifier.size(28.dp)
                            )
                        }
                        Spacer(modifier = Modifier.width(16.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = businessName,
                                style = MaterialTheme.typography.titleLarge,
                                fontWeight = FontWeight.ExtraBold
                            )
                            Spacer(modifier = Modifier.height(2.dp))
                            AideBadge(
                                text = "Local Business • Offline First",
                                containerColor = MaterialTheme.colorScheme.primaryContainer,
                                contentColor = MaterialTheme.colorScheme.onPrimaryContainer
                            )
                        }
                    }
                }
            }

            item {
                NotificationSettingsCard()
            }

            // Business Operations Section
            item {
                Text(
                    text = "Business Operations",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Spacer(modifier = Modifier.height(8.dp))
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    MoreMenuItem(
                        icon = Icons.Default.People,
                        title = "Customers Directory & Credit",
                        subtitle = "Track customer accounts, contact details & debtors",
                        onClick = onNavigateToCustomers
                    )
                    MoreMenuItem(
                        icon = Icons.Default.LocalShipping,
                        title = "Suppliers & Procurement",
                        subtitle = "Manage vendors & purchase orders",
                        onClick = onNavigateToSuppliers
                    )
                    MoreMenuItem(
                        icon = Icons.Default.PointOfSale,
                        title = "Cashier Shifts & Till Audit",
                        subtitle = "Open/close till float & cash reconciliation",
                        onClick = onNavigateToShifts
                    )
                    MoreMenuItem(
                        icon = Icons.Default.Description,
                        title = "Quotations & Estimates",
                        subtitle = "Create and share proforma invoice quotes",
                        onClick = onNavigateToQuotations
                    )
                    MoreMenuItem(
                        icon = Icons.Default.Receipt,
                        title = "Expenses & Overheads",
                        subtitle = "Record shop overheads, utilities & COGS expenses",
                        onClick = onNavigateToExpenses
                    )
                    MoreMenuItem(
                        icon = Icons.Default.Assessment,
                        title = "Sales Analytics & Reports",
                        subtitle = "Detailed profit margins, VAT & product performance",
                        onClick = onNavigateToReports
                    )
                }
            }

            // Management Tools Section
            item {
                Text(
                    text = "Tools & Configuration",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Spacer(modifier = Modifier.height(8.dp))
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    MoreMenuItem(
                        icon = Icons.Default.Settings,
                        title = "App Settings",
                        subtitle = "Business profile, theme color, receipt options & data backup",
                        onClick = onNavigateToSettings
                    )
                    MoreMenuItem(
                        icon = Icons.Default.Calculate,
                        title = "Pricing Calculator",
                        subtitle = "Calculate markup, margins & profit for products",
                        onClick = onNavigateToCalculator
                    )
                }
            }

            item {
                StaticInfoRow(
                    icon = Icons.Default.Info,
                    title = "Offline Storage Notice",
                    subtitle = "All records are kept locally on this phone. Export your data regularly from Settings to protect your store history."
                )
            }

            item {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .clickable { openCompanyWebsite(context) }
                        .padding(vertical = 12.dp),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Made by Omix Systems",
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Medium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.OpenInNew,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(16.dp)
                    )
                }
            }
        }
    }
}

@Composable
fun StaticInfoRow(
    icon: ImageVector,
    title: String,
    subtitle: String
) {
    AideCard {
        Row(
            modifier = Modifier
                .padding(16.dp)
                .fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.12f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = title,
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(20.dp)
                )
            }
            Spacer(modifier = Modifier.width(14.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
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
    AideCard(onClick = onClick) {
        Row(
            modifier = Modifier
                .padding(16.dp)
                .fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(42.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.primaryContainer),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = title,
                    tint = MaterialTheme.colorScheme.onPrimaryContainer,
                    modifier = Modifier.size(22.dp)
                )
            }
            Spacer(modifier = Modifier.width(14.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = subtitle,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Icon(
                imageVector = Icons.Default.ChevronRight,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f)
            )
        }
    }
}

fun openCompanyWebsite(context: Context) {
    val intent = Intent(Intent.ACTION_VIEW, android.net.Uri.parse(COMPANY_URL))
    runCatching { context.startActivity(intent) }
}
