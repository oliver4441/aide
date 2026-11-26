package com.omix.aide.ui.components

import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationRail
import androidx.compose.material3.NavigationRailItem
import androidx.compose.material3.NavigationRailItemDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.omix.aide.domain.ia.MobileDestination
import com.omix.aide.ui.navigation.icon

@Composable
fun AideNavRail(
    destinations: List<MobileDestination> = listOf(
        MobileDestination.HOME,
        MobileDestination.SELL,
        MobileDestination.STOCK,
        MobileDestination.WORKSPACE
    ),
    currentRoute: String?,
    onNavigate: (String) -> Unit
) {
    NavigationRail(
        containerColor = MaterialTheme.colorScheme.surface,
        header = {
            Text(
                text = "AIDE",
                style = MaterialTheme.typography.titleLarge,
                color = MaterialTheme.colorScheme.primary,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(vertical = 16.dp)
            )
            Spacer(modifier = Modifier.height(8.dp))
        }
    ) {
        destinations.forEach { dest ->
            val selected = currentRoute == dest.route
            NavigationRailItem(
                modifier = Modifier.testTag("nav_rail_${dest.route}"),
                icon = { Icon(dest.icon(), contentDescription = dest.title) },
                label = { Text(dest.navLabel, style = MaterialTheme.typography.labelSmall) },
                selected = selected,
                onClick = { onNavigate(dest.route) },
                colors = NavigationRailItemDefaults.colors(
                    selectedIconColor = MaterialTheme.colorScheme.primary,
                    selectedTextColor = MaterialTheme.colorScheme.primary,
                    indicatorColor = MaterialTheme.colorScheme.primaryContainer,
                    unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                    unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant
                )
            )
        }
    }
}
