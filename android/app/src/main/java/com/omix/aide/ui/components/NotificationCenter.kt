package com.omix.aide.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Assessment
import androidx.compose.material.icons.filled.Done
import androidx.compose.material.icons.filled.Inventory
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Payments
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.omix.aide.data.local.dao.NotificationDao
import com.omix.aide.data.local.entities.NotifiedEventEntity
import com.omix.aide.notifications.AideChannel
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * The bell in the top bar.
 *
 * Alerts have always been written to `notified_events`; until now there was no
 * way to read them back after the shade was cleared. The badge is the unread
 * count straight from Room, so it updates whenever a worker posts or the user
 * marks something read.
 */
@Composable
fun NotificationBell(
    dao: NotificationDao,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val unread by dao.unreadCount().collectAsState(initial = 0)

    Box(modifier = modifier.size(48.dp)) {
        IconButton(onClick = onClick, modifier = Modifier.align(Alignment.Center)) {
            Icon(
                imageVector = Icons.Default.Notifications,
                contentDescription = if (unread > 0) {
                    "Activity history, $unread unread"
                } else {
                    "Activity history"
                },
                tint = MaterialTheme.colorScheme.onSurface
            )
        }

        if (unread > 0) {
            Box(
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(top = 6.dp, end = 6.dp)
                    .defaultMinSize(minWidth = 18.dp, minHeight = 18.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.error),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = if (unread > 9) "9+" else unread.toString(),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onError,
                    modifier = Modifier.padding(horizontal = 4.dp)
                )
            }
        }
    }
}

/**
 * Activity history: every alert the device has raised, newest first, with
 * per-row and bulk "mark as read".
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotificationCenterSheet(
    dao: NotificationDao,
    onDismiss: () -> Unit,
    onOpen: (NotifiedEventEntity) -> Unit
) {
    val events by dao.recent(100).collectAsState(initial = emptyList())
    val scope = rememberCoroutineScope()
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val unread = events.count { !it.read }

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheetState) {
        Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "Activity",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = if (unread > 0) "$unread unread" else "All caught up",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                if (unread > 0) {
                    TextButton(onClick = { scope.launch { dao.markAllRead() } }) {
                        Text("Mark all read")
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            if (events.isEmpty()) {
                Text(
                    text = "No alerts yet. Low-stock warnings and the daily summary appear here, " +
                        "and stay on the device.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(vertical = 32.dp)
                )
            } else {
                LazyColumn(modifier = Modifier.fillMaxWidth().heightIn(max = 520.dp)) {
                    items(events, key = { it.eventId }) { event ->
                        ActivityRow(
                            event = event,
                            onClick = {
                                // Reading an alert is what opening it means.
                                if (!event.read) scope.launch { dao.markRead(event.eventId) }
                                onOpen(event)
                            },
                            onMarkRead = { scope.launch { dao.markRead(event.eventId) } }
                        )
                        HorizontalDivider(
                            color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.6f)
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun ActivityRow(
    event: NotifiedEventEntity,
    onClick: () -> Unit,
    onMarkRead: () -> Unit
) {
    val channel = AideChannel.fromKey(event.channel)

    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .clickable(onClick = onClick)
            .padding(vertical = 12.dp, horizontal = 4.dp)
    ) {
        Box(
            modifier = Modifier
                .size(36.dp)
                .clip(CircleShape)
                .background(
                    if (event.read) {
                        MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f)
                    } else {
                        MaterialTheme.colorScheme.secondaryContainer
                    }
                ),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = iconFor(channel),
                contentDescription = null,
                tint = if (event.read) {
                    MaterialTheme.colorScheme.onSurfaceVariant
                } else {
                    MaterialTheme.colorScheme.onSecondaryContainer
                },
                modifier = Modifier.size(18.dp)
            )
        }

        Spacer(modifier = Modifier.width(12.dp))

        Column(modifier = Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = event.title,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = if (event.read) FontWeight.Medium else FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface,
                    modifier = Modifier.weight(1f, fill = false)
                )
                if (!event.read) {
                    Spacer(modifier = Modifier.width(6.dp))
                    Box(
                        modifier = Modifier
                            .size(7.dp)
                            .clip(CircleShape)
                            .background(MaterialTheme.colorScheme.error)
                    )
                }
            }
            Text(
                text = event.message,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Text(
                text = "${channel.title} · ${relativeTime(event.createdAt)}",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        if (!event.read) {
            IconButton(onClick = onMarkRead) {
                Icon(
                    imageVector = Icons.Default.Done,
                    contentDescription = "Mark as read",
                    tint = MaterialTheme.colorScheme.primary
                )
            }
        }
    }
}

private fun iconFor(channel: AideChannel): ImageVector = when (channel) {
    AideChannel.ORDERS -> Icons.Default.ShoppingCart
    AideChannel.INVENTORY -> Icons.Default.Inventory
    AideChannel.PAYMENTS -> Icons.Default.Payments
    AideChannel.CUSTOMERS -> Icons.Default.People
    AideChannel.REPORTS -> Icons.Default.Assessment
    AideChannel.SYSTEM -> Icons.Default.Settings
}

private fun relativeTime(createdAt: Long): String {
    val diff = System.currentTimeMillis() - createdAt
    return when {
        diff < 60_000L -> "Just now"
        diff < 3_600_000L -> "${diff / 60_000L} min ago"
        diff < 86_400_000L -> "${diff / 3_600_000L} h ago"
        diff < 7 * 86_400_000L -> "${diff / 86_400_000L} d ago"
        else -> SimpleDateFormat("d MMM, HH:mm", Locale.getDefault()).format(Date(createdAt))
    }
}
