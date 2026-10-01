package ke.co.aide.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import ke.co.aide.notifications.AideChannel
import ke.co.aide.notifications.NotificationEngine
import ke.co.aide.notifications.NotificationPrefs
import ke.co.aide.ui.theme.PrimaryGreen
import ke.co.aide.work.AideWorkScheduler

/**
 * Native notification preferences.
 *
 * Only the channels Aide itself generates on-device are listed here; the rest
 * still exist as Android channels and can be tuned in system settings. Each
 * toggle writes straight to [NotificationPrefs].
 */
@Composable
fun NotificationSettingsCard() {
    val context = LocalContext.current
    val prefs = remember { NotificationPrefs(context) }

    var enabled by remember { mutableStateOf(prefs.isEnabled()) }
    var channelState by remember {
        mutableStateOf(AideChannel.entries.associateWith { prefs.isChannelEnabled(it) })
    }

    // Re-read the system-level permission each time the card appears.
    val systemAllowed = remember { NotificationEngine.notificationsAllowed(context) }

    AideCard {
        Column(modifier = Modifier.padding(16.dp).fillMaxWidth()) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Default.Notifications,
                    contentDescription = null,
                    tint = PrimaryGreen,
                    modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.width(10.dp))
                Text(
                    text = "Notifications",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onSurface
                )
            }

            Spacer(modifier = Modifier.height(4.dp))

            Text(
                text = if (systemAllowed) {
                    "Aide alerts you about low stock and daily sales, even when the app is closed. These work offline."
                } else {
                    "Android is currently blocking Aide's notifications. Enable them in system settings to receive alerts."
                },
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
            )

            Spacer(modifier = Modifier.height(12.dp))

            SwitchRow(
                title = "Enable notifications",
                subtitle = "Master switch for all Aide alerts",
                checked = enabled,
                onCheckedChange = { value ->
                    enabled = value
                    prefs.setEnabled(value)
                    if (value) {
                        AideWorkScheduler.scheduleAll(context)
                    } else {
                        AideWorkScheduler.cancelAll(context)
                    }
                }
            )

            if (enabled) {
                HorizontalDivider(
                    modifier = Modifier.padding(vertical = 8.dp),
                    color = MaterialTheme.colorScheme.outline.copy(alpha = 0.3f)
                )

                AideChannel.entries.forEach { channel ->
                    SwitchRow(
                        title = channel.title,
                        subtitle = channel.description,
                        checked = channelState[channel] ?: true,
                        onCheckedChange = { value ->
                            channelState = channelState.toMutableMap().apply { put(channel, value) }
                            prefs.setChannelEnabled(channel, value)
                        }
                    )
                }
            }
        }
    }
}

@Composable
private fun SwitchRow(
    title: String,
    subtitle: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Medium,
                color = MaterialTheme.colorScheme.onSurface
            )
            Text(
                text = subtitle,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
            )
        }
        Spacer(modifier = Modifier.width(12.dp))
        Switch(checked = checked, onCheckedChange = onCheckedChange)
    }
}
