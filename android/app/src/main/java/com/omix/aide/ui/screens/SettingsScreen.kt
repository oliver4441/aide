package com.omix.aide.ui.screens

import android.content.Context
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Backup
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import com.omix.aide.data.local.BusinessSettings
import com.omix.aide.data.local.LocalBusinessStore
import com.omix.aide.data.local.SettingsStore
import com.omix.aide.data.local.ThemeMode
import com.omix.aide.data.local.converters.asMoney
import com.omix.aide.notifications.AideChannel
import com.omix.aide.notifications.NotificationPrefs
import com.omix.aide.theme.Palette
import com.omix.aide.ui.components.AideCard
import com.omix.aide.ui.components.AideLocalOnlyBanner
import com.omix.aide.work.AideWorkScheduler
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * Business profile, receipt settings, accent/theme mode, notification preferences,
 * daily closing summary schedule, and JSON data export.
 */
@Composable
fun SettingsScreen(
    database: com.omix.aide.data.local.AideDatabase,
    businessId: String,
    onBack: () -> Unit,
    onSettingsChanged: (BusinessSettings) -> Unit = {}
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val initial = remember { SettingsStore.read(context) }

    var businessName by remember { mutableStateOf(initial.businessName) }
    var currency by remember { mutableStateOf(initial.currency) }
    var taxRate by remember {
        mutableStateOf(if (initial.taxRate <= 0.0) "" else initial.taxRate.toString())
    }
    var receiptFooter by remember { mutableStateOf(initial.receiptFooter) }
    var accent by remember { mutableStateOf(initial.accent) }
    var themeMode by remember { mutableStateOf(initial.themeMode) }
    var soundsEnabled by remember { mutableStateOf(initial.soundsEnabled) }
    var summaryHour by remember { mutableStateOf(initial.summaryHour) }
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
                .verticalScroll(rememberScrollState())
                .padding(16.dp)
        ) {
            AideLocalOnlyBanner()
            Spacer(Modifier.height(16.dp))

            Text("Business profile", style = MaterialTheme.typography.titleLarge)
            Spacer(Modifier.height(8.dp))
            AideCard {
                Column(modifier = Modifier.padding(16.dp)) {
                    OutlinedTextField(
                        value = businessName,
                        onValueChange = { businessName = it; saved = false },
                        label = { Text("Business name") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    Spacer(Modifier.height(10.dp))
                    OutlinedTextField(
                        value = currency,
                        onValueChange = { currency = it; saved = false },
                        label = { Text("Currency") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    Spacer(Modifier.height(10.dp))
                    OutlinedTextField(
                        value = taxRate,
                        onValueChange = { taxRate = it.filter { c -> c.isDigit() || c == '.' }; saved = false },
                        label = { Text("VAT rate (%)") },
                        placeholder = { Text("0") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    Spacer(Modifier.height(10.dp))
                    OutlinedTextField(
                        value = receiptFooter,
                        onValueChange = { receiptFooter = it; saved = false },
                        label = { Text("Receipt footer") },
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }

            Spacer(Modifier.height(20.dp))

            Text("Appearance", style = MaterialTheme.typography.titleLarge)
            Spacer(Modifier.height(8.dp))
            Row(
                modifier = Modifier.horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                listOf(
                    ThemeMode.DARK to "Dark",
                    ThemeMode.LIGHT to "Light",
                    ThemeMode.SYSTEM to "System"
                ).forEach { (mode, label) ->
                    FilterChip(
                        selected = themeMode == mode,
                        onClick = {
                            themeMode = mode
                            saved = false
                            val updated = SettingsStore.read(context).copy(themeMode = mode)
                            SettingsStore.write(context, updated)
                            onSettingsChanged(updated)
                        },
                        label = { Text(label) },
                        modifier = Modifier.height(48.dp)
                    )
                }
            }

            Spacer(Modifier.height(12.dp))
            Text("Accent theme", style = MaterialTheme.typography.titleMedium)
            Spacer(Modifier.height(8.dp))
            Row(
                modifier = Modifier.horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Palette.all.forEach { option ->
                    val swatch = remember(option.id) {
                        Color(ContextCompat.getColor(context, option.swatch))
                    }
                    AssistChip(
                        onClick = {
                            accent = option.id
                            saved = false
                            Palette.write(context, option.id)
                            onSettingsChanged(SettingsStore.read(context))
                        },
                        label = { Text(option.label) },
                        leadingIcon = {
                            Box(
                                Modifier
                                    .width(12.dp)
                                    .height(12.dp)
                                    .background(swatch, CircleShape)
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

            Spacer(Modifier.height(20.dp))

            Text("Notifications", style = MaterialTheme.typography.titleLarge)
            Spacer(Modifier.height(8.dp))
            AideCard {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Default.Notifications,
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
                                if (it) AideWorkScheduler.scheduleAll(context)
                                else AideWorkScheduler.cancelAll(context)
                            }
                        )
                    }

                    Spacer(Modifier.height(8.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Alert chimes",
                            style = MaterialTheme.typography.bodyMedium,
                            modifier = Modifier.weight(1f)
                        )
                        Switch(
                            checked = soundsEnabled,
                            onCheckedChange = {
                                soundsEnabled = it
                                saved = false
                            }
                        )
                    }

                    if (notificationsOn) {
                        Spacer(Modifier.height(8.dp))
                        HorizontalDivider()
                        Spacer(Modifier.height(8.dp))
                        listOf(
                            AideChannel.INVENTORY to "Low stock alerts",
                            AideChannel.REPORTS to "Daily closing summary",
                            AideChannel.ORDERS to "Completed sales",
                            AideChannel.SYSTEM to "System and backup alerts"
                        ).forEach { (channel, label) ->
                            Row(
                                modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    label,
                                    style = MaterialTheme.typography.bodyMedium,
                                    modifier = Modifier.weight(1f)
                                )
                                Switch(
                                    checked = prefs.isChannelEnabled(channel),
                                    onCheckedChange = { prefs.setChannelEnabled(channel, it) }
                                )
                            }
                        }

                        Spacer(Modifier.height(8.dp))
                        Text(
                            text = "Daily summary time",
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(Modifier.height(6.dp))
                        Row(
                            modifier = Modifier.horizontalScroll(rememberScrollState()),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            listOf(17, 18, 19, 20, 21).forEach { hour ->
                                FilterChip(
                                    selected = summaryHour == hour,
                                    onClick = {
                                        summaryHour = hour
                                        saved = false
                                    },
                                    label = { Text(String.format("%02d:00", hour)) },
                                    modifier = Modifier.height(44.dp)
                                )
                            }
                        }
                    }
                }
            }

            Spacer(Modifier.height(24.dp))

            Button(
                onClick = {
                    val trimmedName = businessName.trim()
                    if (trimmedName.isNotEmpty()) {
                        LocalBusinessStore(context).setBusinessName(trimmedName)
                    }
                    val settings = BusinessSettings(
                        businessName = trimmedName,
                        currency = currency.trim().ifBlank { "KSh" },
                        taxRate = taxRate.toDoubleOrNull() ?: 0.0,
                        receiptFooter = receiptFooter.trim(),
                        accent = accent,
                        themeMode = themeMode,
                        soundsEnabled = soundsEnabled,
                        summaryHour = summaryHour,
                        summaryMinute = 0
                    )
                    SettingsStore.write(context, settings)
                    Palette.write(context, accent)
                    if (notificationsOn) {
                        AideWorkScheduler.scheduleDailySummary(context, summaryHour, 0)
                    }
                    onSettingsChanged(settings)
                    saved = true
                },
                modifier = Modifier.fillMaxWidth().height(48.dp)
            ) {
                Text(if (saved) "Saved" else "Save changes")
            }

            Spacer(Modifier.height(10.dp))

            OutlinedButton(
                onClick = {
                    scope.launch {
                        exportData(context, database, businessId)
                    }
                },
                modifier = Modifier.fillMaxWidth().height(48.dp)
            ) {
                Icon(Icons.Default.Backup, contentDescription = null)
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
        }
    }
}

private fun escapeJson(value: String): String =
    value.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n")

private suspend fun exportData(
    context: Context,
    database: com.omix.aide.data.local.AideDatabase,
    businessId: String
) {
    val toast: suspend (String) -> Unit = { msg ->
        withContext(Dispatchers.Main) {
            android.widget.Toast.makeText(context, msg, android.widget.Toast.LENGTH_LONG).show()
        }
    }
    try {
        val file = withContext(Dispatchers.IO) {
            val snapshot = buildString {
                appendLine("{")
                appendLine("  \"exportedAt\": \"${java.util.Date()}\",")
                appendLine("  \"businessId\": \"${escapeJson(businessId)}\",")

                val products = database.productDao().getProductsByBusiness(businessId).first()
                appendLine("  \"products\": [")
                products.forEachIndexed { index, p ->
                    appendLine(
                        "    {\"name\": \"${escapeJson(p.name)}\", \"sku\": \"${escapeJson(p.sku ?: "")}\", " +
                            "\"buyingPrice\": ${p.buyingPrice.asMoney()}, \"sellingPrice\": ${p.sellingPrice.asMoney()}, " +
                            "\"quantity\": ${p.quantity}}" + if (index == products.lastIndex) "" else ","
                    )
                }
                appendLine("  ],")

                val sales = database.saleDao().getSalesWithItems(businessId).first()
                appendLine("  \"sales\": [")
                sales.forEachIndexed { index, sale ->
                    val s = sale.sale
                    appendLine(
                        "    {\"id\": \"${escapeJson(s.id)}\", \"total\": ${s.total.asMoney()}, \"cost\": ${s.cost.asMoney()}, " +
                            "\"profit\": ${s.profit.asMoney()}, \"paid\": ${s.paid.asMoney()}, " +
                            "\"paymentMethod\": \"${escapeJson(s.paymentMethod)}\", \"createdAt\": \"${escapeJson(s.createdAt)}\", " +
                            "\"items\": [" +
                            sale.items.joinToString(",") { i ->
                                "\"${escapeJson(i.name)} x${i.quantity} @ ${i.price.asMoney()}\""
                            } + "]}" + if (index == sales.lastIndex) "" else ","
                    )
                }
                appendLine("  ],")

                val expenses = database.expenseDao().getExpenses(businessId).first()
                appendLine("  \"expenses\": [")
                expenses.forEachIndexed { index, e ->
                    appendLine(
                        "    {\"category\": \"${escapeJson(e.category)}\", \"amount\": ${e.amount.asMoney()}, " +
                            "\"createdAt\": \"${escapeJson(e.createdAt)}\"}" +
                            if (index == expenses.lastIndex) "" else ","
                    )
                }
                appendLine("  ],")

                val customers = database.customerDao().getCustomers(businessId).first()
                appendLine("  \"customers\": [")
                customers.forEachIndexed { index, c ->
                    appendLine(
                        "    {\"name\": \"${escapeJson(c.name)}\", \"phone\": \"${escapeJson(c.phone ?: "")}\", " +
                            "\"balance\": ${c.balance.asMoney()}}" + if (index == customers.lastIndex) "" else ","
                    )
                }
                appendLine("  ]")
                appendLine("}")
            }

            val dir = context.getExternalFilesDir(null) ?: context.filesDir
            val out = java.io.File(dir, "aide-export-${System.currentTimeMillis()}.json")
            out.writeText(snapshot)
            out
        }
        toast("Exported ${file.length()} bytes to ${file.name}")
    } catch (e: Exception) {
        toast("Export failed: ${e.message}")
    }
}
