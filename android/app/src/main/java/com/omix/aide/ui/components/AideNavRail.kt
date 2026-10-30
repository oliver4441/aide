package com.omix.aide.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.omix.aide.R

/** A destination in the navigation rail. */
data class NavItem(val label: String, val route: String, val icon: ImageVector)

private val RailCollapsedWidth = 76.dp
private val RailExpandedWidth = 208.dp

/**
 * The app's primary navigation: a left rail instead of the bottom bar, so the
 * till keeps the full height of the screen and the brand mark can sit at the
 * top of the hierarchy.
 *
 * The rail is collapsible — icons only at 76dp, icons plus labels at 208dp. It
 * starts collapsed on phones and expanded on tablets (see MainActivity), and
 * the choice survives rotation through `rememberSaveable` there.
 */
@Composable
fun AideNavRail(
    items: List<NavItem>,
    currentRoute: String?,
    expanded: Boolean,
    onToggleExpanded: () -> Unit,
    onNavigate: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val width by animateDpAsState(
        targetValue = if (expanded) RailExpandedWidth else RailCollapsedWidth,
        animationSpec = tween(durationMillis = 220),
        label = "navRailWidth"
    )

    Row(
        modifier = modifier
            .width(width)
            .fillMaxHeight()
            .background(MaterialTheme.colorScheme.surface)
    ) {
        Column(
            modifier = Modifier
                .fillMaxHeight()
                .weight(1f)
                .padding(vertical = 12.dp, horizontal = 8.dp)
        ) {
            RailBrandHeader(
                expanded = expanded,
                onClick = { onNavigate(items.first().route) }
            )

            Spacer(modifier = Modifier.height(8.dp))

            items.forEach { item ->
                RailItem(
                    item = item,
                    selected = currentRoute == item.route,
                    expanded = expanded,
                    onClick = { onNavigate(item.route) }
                )
                Spacer(modifier = Modifier.height(4.dp))
            }

            Spacer(modifier = Modifier.weight(1f))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = if (expanded) Arrangement.End else Arrangement.Center
            ) {
                IconButton(onClick = onToggleExpanded) {
                    Icon(
                        imageVector = if (expanded) {
                            Icons.Default.ChevronLeft
                        } else {
                            Icons.Default.ChevronRight
                        },
                        contentDescription = if (expanded) {
                            "Collapse navigation"
                        } else {
                            "Expand navigation"
                        },
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }

        // Hairline rule against the content, in keeping with the ruled look of
        // the rest of the app rather than a shadow.
        Box(
            modifier = Modifier
                .fillMaxHeight()
                .width(1.dp)
                .background(MaterialTheme.colorScheme.outlineVariant)
        )
    }
}

@Composable
private fun RailBrandHeader(expanded: Boolean, onClick: () -> Unit) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = if (expanded) Arrangement.Start else Arrangement.Center,
        modifier = Modifier
            .fillMaxWidth()
            .height(56.dp)
            .clip(RoundedCornerShape(12.dp))
            .clickable(onClick = onClick)
            .padding(horizontal = 4.dp)
    ) {
        Box(modifier = Modifier.size(38.dp), contentAlignment = Alignment.Center) {
            Image(
                painter = painterResource(id = R.drawable.app_circle),
                contentDescription = null,
                modifier = Modifier.size(38.dp)
            )
            Image(
                painter = painterResource(id = R.drawable.app_icon),
                contentDescription = "Aide",
                modifier = Modifier.size(26.dp)
            )
        }
        AnimatedVisibility(visible = expanded, enter = fadeIn(), exit = fadeOut()) {
            Text(
                text = "Aide",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Black,
                color = MaterialTheme.colorScheme.onSurface,
                maxLines = 1,
                overflow = TextOverflow.Clip,
                modifier = Modifier.padding(start = 10.dp)
            )
        }
    }
}

@Composable
private fun RailItem(
    item: NavItem,
    selected: Boolean,
    expanded: Boolean,
    onClick: () -> Unit
) {
    val container = if (selected) {
        MaterialTheme.colorScheme.secondaryContainer
    } else {
        MaterialTheme.colorScheme.surface
    }
    val content = if (selected) {
        MaterialTheme.colorScheme.onSecondaryContainer
    } else {
        MaterialTheme.colorScheme.onSurfaceVariant
    }

    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = if (expanded) Arrangement.Start else Arrangement.Center,
        modifier = Modifier
            .fillMaxWidth()
            .height(52.dp)
            .clip(RoundedCornerShape(14.dp))
            .background(container)
            .selectable(selected = selected, role = Role.Tab, onClick = onClick)
            .padding(horizontal = 4.dp)
    ) {
        Box(modifier = Modifier.size(40.dp), contentAlignment = Alignment.Center) {
            Icon(
                imageVector = item.icon,
                // Collapsed, the icon is the only label left.
                contentDescription = if (expanded) null else item.label,
                tint = content
            )
        }
        AnimatedVisibility(visible = expanded, enter = fadeIn(), exit = fadeOut()) {
            Text(
                text = item.label,
                style = MaterialTheme.typography.titleSmall,
                fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
                color = content,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.padding(start = 10.dp, end = 6.dp)
            )
        }
    }
}
