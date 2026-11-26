package com.omix.aide.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Assessment
import androidx.compose.material.icons.filled.Calculate
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.HelpOutline
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.PhoneAndroid
import androidx.compose.material.icons.filled.Receipt
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.SwapHoriz
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.omix.aide.domain.ia.OperatingContext
import com.omix.aide.domain.ia.ResolvedRoleNavigation
import com.omix.aide.domain.ia.RoleNavigationResolver
import com.omix.aide.ui.components.AideBadge
import com.omix.aide.ui.components.AideCard
import com.omix.aide.ui.components.NotificationSettingsCard
import com.omix.aide.ui.navigation.Screen
import com.omix.aide.ui.navigation.icon

/**
 * Grouped, permission-driven Workspace hub replacing the flat Desktop-style
 * module dump. Only destinations permitted for [activeContext] are rendered,
 * grouped under clear operational headings.
 */
@Composable
fun WorkspaceScreen(
    activeContext: OperatingContext,
    navigation: ResolvedRoleNavigation = RoleNavigationResolver.resolve(activeContext),
    onNavigate: (String) -> Unit,
    onOpenContextSwitcher: () -> Unit,
    onOpenOnboardingGuide: () -> Unit
) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
            .testTag("workspace_hub_screen"),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // Active Location & Role Summary Card
        item {
            AideCard(onClick = onOpenContextSwitcher) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "ACTIVE WORKSPACE",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = activeContext.operatingLocationLabel,
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "${activeContext.role.title} · ${activeContext.deviceAssignment.title}",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    AideBadge(
                        text = "Switch",
                        icon = Icons.Default.SwapHoriz
                    )
                }
            }
        }

        // Grouped Permission-Driven Module Sections
        navigation.workspaceSections.forEach { section ->
            item(key = "header-${section.group.name}") {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = section.group.title.uppercase(),
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = section.group.subtitle,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            section.destinations.forEach { dest ->
                item(key = "dest-${dest.route}") {
                    MoreMenuItem(
                        icon = dest.icon(),
                        title = dest.title,
                        subtitle = dest.subtitle,
                        tag = "workspace_dest_${dest.route}",
                        onClick = { onNavigate(dest.route) }
                    )
                }
            }
        }

        // Setup & Role Guide re-entry
        item {
            MoreMenuItem(
                icon = Icons.Default.HelpOutline,
                title = "Role, Permissions & Setup Guide",
                subtitle = "Review location assignment, role permissions and offline rules",
                tag = "workspace_dest_onboarding",
                onClick = onOpenOnboardingGuide
            )
        }

        item {
            NotificationSettingsCard()
        }

        item {
            StaticInfoRow(
                icon = Icons.Default.PhoneAndroid,
                title = activeContext.syncMode.badgeLabel,
                subtitle = activeContext.syncMode.statusDescription
            )
        }
    }
}

/** Backwards-compatible overload preserving existing callers. */
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
                text = "WORKSPACE",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
        item { NotificationSettingsCard() }
        item {
            StaticInfoRow(
                icon = Icons.Default.PhoneAndroid,
                title = "Stored on this device",
                subtitle = "$businessName works offline. Nothing is uploaded automatically."
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
                icon = Icons.Default.Calculate,
                title = "Margin Calculator",
                subtitle = "Pricing, margin & profit",
                onClick = onNavigateToCalculator
            )
        }
        item {
            MoreMenuItem(
                icon = Icons.Default.Settings,
                title = "Settings",
                subtitle = "Business profile & receipt customization",
                onClick = onNavigateToSettings
            )
        }
        item {
            StaticInfoRow(
                icon = Icons.Default.Info,
                title = "Local-only build",
                subtitle = "Uninstalling the app deletes local records, so export anything you need to keep."
            )
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
    tag: String? = null,
    onClick: () -> Unit
) {
    val modifier = if (tag != null) {
        Modifier.clickable { onClick() }.testTag(tag)
    } else {
        Modifier.clickable { onClick() }
    }
    AideCard(modifier = modifier) {
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
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold
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
                tint = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}
