package com.omix.aide.ui.screens

import android.content.Context
import android.content.Intent
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Alarm
import androidx.compose.material.icons.rounded.FileDownload
import androidx.compose.material.icons.rounded.Inventory2
import androidx.compose.material.icons.rounded.NotificationsActive
import androidx.compose.material.icons.rounded.NotificationsOff
import androidx.compose.material.icons.rounded.Payments
import androidx.compose.material.icons.rounded.Percent
import androidx.compose.material.icons.rounded.PointOfSale
import androidx.compose.material.icons.rounded.Public
import androidx.compose.material.icons.rounded.ReceiptLong
import androidx.compose.material.icons.rounded.Storefront
import androidx.compose.material.icons.rounded.Summarize
import androidx.compose.material.icons.rounded.VolumeUp
import androidx.compose.material.icons.rounded.WarningAmber
import androidx.compose.material3.AssistChip
import androidx.compose.material3.AssistChipDefaults
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TimePicker
import androidx.compose.material3.rememberTimePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.core.content.ContextCompat
import com.omix.aide.BuildConfig
import com.omix.aide.data.local.BusinessSettings
import com.omix.aide.data.local.SettingsStore
import com.omix.aide.data.local.ThemeMode
import com.omix.aide.notifications.AideChannel
import com.omix.aide.notifications.AideNotifications
import com.omix.aide.notifications.AideSounds
import com.omix.aide.notifications.NotificationPrefs
import com.omix.aide.theme.Palette
import com.omix.aide.ui.components.AideCard
import com.omix.aide.ui.components.AideLocalOnlyBanner
import com.omix.aide.work.AideWorkScheduler
import kotlinx.coroutines.flow.first

/**
 * Business profile, receipt settings, accent theme, notification preferences
 * and a data export.
 *
 * The fourth More-menu row whose onClick was an empty lambda.
 */
@Composable
fun SettingsScreen(
    database: com.omix.aide.data.local.AideDatabase,
    businessId: String,
    onBack: () -> Unit,
    onSettingsChanged: (BusinessSettings) -> Unit = {}
) {
    val context = LocalContext.current
    val initial = remember { SettingsStore.read(context) }

    var businessName by remember { mutableStateOf(initial.businessName) }
    var currency by remember { mutableStateOf(initial.currency) }
    var taxRate by remember { mutableStateOf(
        if (initial.taxRate <= 0.0) "" else initial.taxRate.toString()
    ) }
    var receiptFooter by remember { mutableStateOf(initial.receiptFooter) }
    var accent by remember { mutableStateOf(initial.accent) }
    var themeMode by remember { mutableStateOf(initial.themeMode) }
    var soundsOn by remember { mutableStateOf(initial.soundsEnabled) }
    var summaryHour by remember { mutableStateOf(initial.summaryHour) }
    var summaryMinute by remember { mutableStateOf(initial.summaryMinute) }
    var saved by remember { mutableStateOf(false) }

    val prefs = remember { NotificationPrefs(context) }
    var notificationsOn by remember { mutableStateOf(prefs.isEnabled()) }

    Scaffold(
        topBar = {
            Row(
                modifier = Modifier.fillMaxWidth().padding(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                TextButton(onClick = onBack) { Text("Back") }
                Text(
                    text = "Settings",
                    style = MaterialTheme.typography.headlineMedium,
                    modifier = Modifier.weight(1f)
                )
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp)
        ) {
            AideLocalOnlyBanner()
            Spacer(Modifier.height(16.dp))

            // ---- business profile -------------------------------------------
            Text("Business profile", style = MaterialTheme.typography.titleLarge)
            Spacer(Modifier.height(8.dp))
            AideCard {
                OutlinedTextField(
                    value = businessName,
                    onValueChange = { businessName = it; saved = false },
                    label = { Text("Business name") },
                    leadingIcon = { Icon(Icons.Rounded.Storefront, null, Modifier.size(20.dp)) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(Modifier.height(10.dp))
                OutlinedTextField(
                    value = currency,
                    onValueChange = { currency = it; saved = false },
                    label = { Text("Currency") },
                    leadingIcon = { Icon(Icons.Rounded.Payments, null, Modifier.size(20.dp)) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(Modifier.height(10.dp))
                OutlinedTextField(
                    value = taxRate,
                    onValueChange = { taxRate = it.filter { c -> c.isDigit() || c == '.' }; saved = false },
                    label = { Text("VAT rate (%)") },
                    leadingIcon = { Icon(Icons.Rounded.Percent, null, Modifier.size(20.dp)) },
                    placeholder = { Text("0") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(Modifier.height(10.dp))
                OutlinedTextField(
                    value = receiptFooter,
                    onValueChange = { receiptFooter = it; saved = false },
                    label = { Text("Receipt footer") },
                    leadingIcon = { Icon(Icons.Rounded.ReceiptLong, null, Modifier.size(20.dp)) },
                    modifier = Modifier.fillMaxWidth()
                )
            }

            Spacer(Modifier.height(20.dp))

            // ---- accent theme -----------------------------------------------
            Text("Appearance", style = MaterialTheme.typography.titleLarge)
            Spacer(Modifier.height(8.dp))
            Row(
                modifier = Modifier.horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Palette.all.forEach { option ->
                    val swatch = remember(option.id) {
                        androidx.compose.ui.graphics.Color(
                            ContextCompat.getColor(context, option.swatch)
                        )
                    }
                    AssistChip(
                        onClick = {
                            accent = option.id
                            saved = false
                            // Apply immediately so the choice is visible without
                            // waiting for the Save button.
                            Palette.write(context, option.id)
                            onSettingsChanged(SettingsStore.read(context))
                        },
                        label = { Text(option.label) },
                        leadingIcon = {
                            androidx.compose.foundation.layout.Box(
                                Modifier
                                    .width(12.dp)
                                    .height(12.dp)
                                    .background(
                                        swatch,
                                        androidx.compose.foundation.shape.CircleShape
                                    )
                            )
                        },
                        colors = AssistChipDefaults.assistChipColors(
                            labelColor = if (option.id == accent) {
                                MaterialTheme.colorScheme.primary
                            } else {
                                MaterialTheme.colorScheme.onSurfaceVariant
                            }
                        )
                    )
                }
            }

            Spacer(Modifier.height(12.dp))

            // Light/dark had no control at all before this: the app was pinned
            // to the system setting with no way to override it.
            Row(
                modifier = Modifier.horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                ThemeMode.entries.forEach { mode ->
                    FilterChip(
                        selected = mode == themeMode,
                        onClick = {
                            themeMode = mode
                            saved = false
                            onSettingsChanged(SettingsStore.read(context).copy(themeMode = mode))
                        },
                        label = {
                            Text(
                                when (mode) {
                                    ThemeMode.SYSTEM -> "System"
                                    ThemeMode.LIGHT -> "Light"
                                    ThemeMode.DARK -> "Dark"
                                }
                            )
                        },
                        modifier = Modifier.height(48.dp)
                    )
                }
            }

            Spacer(Modifier.height(20.dp))

            // ---- notifications ----------------------------------------------
            Text("Notifications", style = MaterialTheme.typography.titleLarge)
            Spacer(Modifier.height(8.dp))
            AideCard {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        // The bell answers the switch: ringing when alerts are on.
                        if (notificationsOn) {
                            Icons.Rounded.NotificationsActive
                        } else {
                            Icons.Rounded.NotificationsOff
                        },
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary
                    )
                    Spacer(Modifier.width(12.dp))
                    Column(Modifier.weight(1f)) {
                        Text("Enable notifications", style = MaterialTheme.typography.bodyLarge)
                        Text(
                            text = "Low stock alerts and daily summaries",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    Switch(
                        checked = notificationsOn,
                        onCheckedChange = {
                            notificationsOn = it
                            prefs.setEnabled(it)
                        }
                    )
                }

                if (notificationsOn) {
                    Spacer(Modifier.height(8.dp))
                    HorizontalDivider()
                    Spacer(Modifier.height(8.dp))
                    listOf(
                        Triple(AideChannel.INVENTORY, "Low stock alerts", Icons.Rounded.Inventory2),
                        Triple(AideChannel.REPORTS, "Daily summary", Icons.Rounded.Summarize)
                    ).forEach { (channel, label, channelIcon) ->
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                channelIcon,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.size(20.dp)
                            )
                            Spacer(Modifier.width(12.dp))
                            Text(label, style = MaterialTheme.typography.bodyMedium,
                                modifier = Modifier.weight(1f))
                            Switch(
                                checked = prefs.isChannelEnabled(channel),
                                onCheckedChange = { prefs.setChannelEnabled(channel, it) }
                            )
                        }
                    }

                    HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))

                    // The summary used to be hard-wired to 18:00; owners close at
                    // whatever time their shop closes.
                    SummaryTimeRow(
                        hour = summaryHour,
                        minute = summaryMinute,
                        onChange = { hour, minute ->
                            summaryHour = hour
                            summaryMinute = minute
                            val updated = SettingsStore.read(context).copy(
                                summaryHour = hour,
                                summaryMinute = minute
                            )
                            SettingsStore.write(context, updated)
                            onSettingsChanged(updated)
                            if (prefs.isEnabled()) {
                                AideWorkScheduler.scheduleDailySummary(context, hour, minute)
                            }
                        }
                    )
                }
            }

            Spacer(Modifier.height(20.dp))

            Text("Sounds", style = MaterialTheme.typography.titleLarge)
            Spacer(Modifier.height(8.dp))
            AideCard {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Rounded.VolumeUp,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary
                    )
                    Spacer(Modifier.width(12.dp))
                    Column(Modifier.weight(1f)) {
                        Text("App sounds", style = MaterialTheme.typography.bodyLarge)
                        Text(
                            text = "Till chime on a completed sale and on daily summaries, " +
                                "warning chime on low stock",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    Switch(checked = soundsOn, onCheckedChange = { soundsOn = it; saved = false })
                }

                Spacer(Modifier.height(8.dp))

                // Let the owner hear the two chimes instead of guessing.
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    AssistChip(
                        onClick = { AideSounds.play(context, AideSounds.tillChime()) },
                        label = { Text("Till chime") },
                        leadingIcon = {
                            Icon(Icons.Rounded.PointOfSale, null, Modifier.size(18.dp))
                        }
                    )
                    AssistChip(
                        onClick = { AideSounds.play(context, AideSounds.warningChime()) },
                        label = { Text("Warning chime") },
                        leadingIcon = {
                            Icon(Icons.Rounded.WarningAmber, null, Modifier.size(18.dp))
                        }
                    )
                }
            }

            Spacer(Modifier.height(24.dp))

            Button(
                onClick = {
                    val settings = BusinessSettings(
                        businessName = businessName.trim(),
                        currency = currency.trim().ifBlank { "KSh" },
                        taxRate = taxRate.toDoubleOrNull() ?: 0.0,
                        receiptFooter = receiptFooter.trim(),
                        accent = accent,
                        themeMode = themeMode,
                        soundsEnabled = soundsOn,
                        summaryHour = summaryHour,
                        summaryMinute = summaryMinute
                    )
                    SettingsStore.write(context, settings)
                    Palette.write(context, accent)
                    onSettingsChanged(settings)
                    // Android fixes a channel's sound at creation, so switching
                    // sounds means switching to the matching channel set.
                    AideNotifications.ensureChannels(context)
                    if (prefs.isEnabled()) AideWorkScheduler.scheduleAll(context)
                    saved = true
                },
                modifier = Modifier.fillMaxWidth().height(48.dp)
            ) {
                Text(if (saved) "Saved" else "Save changes")
            }

            Spacer(Modifier.height(10.dp))

            OutlinedButton(
                onClick = { exportData(context, database, businessId) },
                modifier = Modifier.fillMaxWidth().height(48.dp)
            ) {
                Icon(Icons.Rounded.FileDownload, contentDescription = null)
                Spacer(Modifier.width(8.dp))
                Text("Export data")
            }

            Spacer(Modifier.height(8.dp))
            Text(
                text = "Uninstalling the app deletes everything on this device. Export a copy " +
                    "of your products and sales before you do.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Spacer(Modifier.height(24.dp))

            Text("About", style = MaterialTheme.typography.titleLarge)
            Spacer(Modifier.height(8.dp))
            AideCard {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Rounded.Public,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary
                    )
                    Spacer(Modifier.width(12.dp))
                    Column(Modifier.weight(1f)) {
                        Text("Omix Systems", style = MaterialTheme.typography.bodyLarge)
                        Text(
                            text = COMPANY_URL.replace("https://", ""),
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    OutlinedButton(
                        onClick = { openCompanySite(context) },
                        modifier = Modifier.height(48.dp)
                    ) {
                        Text("Visit")
                    }
                }

                Spacer(Modifier.height(10.dp))
                HorizontalDivider()
                Spacer(Modifier.height(10.dp))

                Row(modifier = Modifier.fillMaxWidth()) {
                    Column(Modifier.weight(1f)) {
                        Text("Version", style = MaterialTheme.typography.bodyMedium)
                        Text(
                            text = "${BuildConfig.VERSION_NAME} (${BuildConfig.VERSION_CODE})",
                            style = MaterialTheme.typography.bodyLarge,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                    TextButton(onClick = { checkForUpdate(context) }) { Text("Check for updates") }
                }
            }
        }
    }
}

/**
 * Writes a real JSON snapshot of this business's local data -- products,
 * categories, sales, sale lines, expenses and customers -- into the app's
 * external files directory, then tells the user where it landed.
 *
 * Uninstalling the app removes its private storage, so this is the only way to
 * keep a copy of a shop's history.
 */
private fun exportData(
    context: Context,
    database: com.omix.aide.data.local.AideDatabase,
    businessId: String
) {
    val toast = { msg: String ->
        android.widget.Toast.makeText(context, msg, android.widget.Toast.LENGTH_LONG).show()
    }
    try {
        val snapshot = kotlinx.coroutines.runBlocking {
            buildString {
                appendLine("{")
                appendLine("  \"exportedAt\": \"${java.util.Date()}\",")
                appendLine("  \"businessId\": \"$businessId\",")

                val products = database.productDao().getProductsByBusiness(businessId).first()
                appendLine("  \"products\": [")
                products.forEachIndexed { index, p ->
                    appendLine(
                        "    {\"name\": \"${p.name}\", \"sku\": \"${p.sku ?: ""}\", " +
                            "\"buyingPrice\": ${p.buyingPrice}, \"sellingPrice\": ${p.sellingPrice}, " +
                            "\"quantity\": ${p.quantity}}" + if (index == products.lastIndex) "" else ","
                    )
                }
                appendLine("  ],")

                val sales = database.saleDao().getSalesWithItems(businessId).first()
                appendLine("  \"sales\": [")
                sales.forEachIndexed { index, sale ->
                    val s = sale.sale
                    appendLine(
                        "    {\"id\": \"${s.id}\", \"total\": ${s.total}, \"cost\": ${s.cost}, " +
                            "\"profit\": ${s.profit}, \"paid\": ${s.paid}, " +
                            "\"paymentMethod\": \"${s.paymentMethod}\", \"createdAt\": \"${s.createdAt}\", " +
                            "\"items\": [" +
                            sale.items.joinToString(",") { i ->
                                "\"${i.name} x${i.quantity} @ ${i.price}\""
                            } + "]}" + if (index == sales.lastIndex) "" else ","
                    )
                }
                appendLine("  ],")

                val expenses = database.expenseDao().getExpenses(businessId).first()
                appendLine("  \"expenses\": [")
                expenses.forEachIndexed { index, e ->
                    appendLine(
                        "    {\"category\": \"${e.category}\", \"amount\": ${e.amount}, " +
                            "\"createdAt\": \"${e.createdAt}\"}" +
                            if (index == expenses.lastIndex) "" else ","
                    )
                }
                appendLine("  ],")

                val customers = database.customerDao().getCustomers(businessId).first()
                appendLine("  \"customers\": [")
                customers.forEachIndexed { index, c ->
                    appendLine(
                        "    {\"name\": \"${c.name}\", \"phone\": \"${c.phone ?: ""}\", " +
                            "\"balance\": ${c.balance}}" + if (index == customers.lastIndex) "" else ","
                    )
                }
                appendLine("  ]")
                appendLine("}")
            }
        }

        val dir = context.getExternalFilesDir(null) ?: context.filesDir
        val file = java.io.File(dir, "aide-export-${System.currentTimeMillis()}.json")
        file.writeText(snapshot)
        toast("Exported ${file.length()} bytes to ${file.name}")
    } catch (e: Exception) {
        toast("Export failed: ${e.message}")
    }
}

/** Omix Systems — the company behind Aide. */
const val COMPANY_URL = "https://omixsystems.store"

private fun openCompanySite(context: Context) {
    val intent = Intent(Intent.ACTION_VIEW, android.net.Uri.parse(COMPANY_URL))
    runCatching { context.startActivity(intent) }
}

/** Opens the releases page so the user can pull a newer build manually. */
private fun checkForUpdate(context: Context) {
    val intent = Intent(Intent.ACTION_VIEW, android.net.Uri.parse("$COMPANY_URL/downloads"))
    runCatching { context.startActivity(intent) }
}

/** Clock time for the daily summary, with a real time picker. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SummaryTimeRow(hour: Int, minute: Int, onChange: (Int, Int) -> Unit) {
    var picking by remember { mutableStateOf(false) }

    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            Icons.Rounded.Alarm,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text("Daily summary time", style = MaterialTheme.typography.bodyLarge)
            Text(
                text = "Fires every day at %02d:%02d on this device".format(hour, minute),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
        TextButton(onClick = { picking = true }) { Text("Change") }
    }

    if (picking) {
        val state = rememberTimePickerState(
            initialHour = hour,
            initialMinute = minute,
            is24Hour = true
        )
        // A plain Dialog rather than AlertDialog: the clock face needs the full
        // width, and AlertDialog's text slot clips it on a phone.
        Dialog(onDismissRequest = { picking = false }) {
            Surface(
                shape = MaterialTheme.shapes.extraLarge,
                tonalElevation = 6.dp
            ) {
                Column(modifier = Modifier.padding(24.dp)) {
                    Text(
                        text = "Daily summary time",
                        style = MaterialTheme.typography.titleMedium
                    )
                    Spacer(Modifier.height(16.dp))
                    TimePicker(state = state)
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.End
                    ) {
                        TextButton(onClick = { picking = false }) { Text("Cancel") }
                        TextButton(
                            onClick = {
                                picking = false
                                onChange(state.hour, state.minute)
                            }
                        ) { Text("Set time") }
                    }
                }
            }
        }
    }
}
