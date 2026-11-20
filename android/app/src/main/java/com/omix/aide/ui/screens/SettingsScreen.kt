package com.omix.aide.ui.screens

import android.content.Context
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.background
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Backup
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material3.AssistChip
import androidx.compose.material3.AssistChipDefaults
import androidx.compose.material3.Button
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import kotlinx.coroutines.flow.first
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import com.omix.aide.data.local.BusinessSettings
import com.omix.aide.data.local.SettingsStore
import com.omix.aide.notifications.AideChannel
import com.omix.aide.notifications.NotificationPrefs
import com.omix.aide.theme.Palette
import com.omix.aide.ui.components.AideCard
import com.omix.aide.ui.components.AideLocalOnlyBanner

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

            Spacer(Modifier.height(20.dp))

            // ---- accent theme -----------------------------------------------
            Text("Accent theme", style = MaterialTheme.typography.titleLarge)
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

            Spacer(Modifier.height(20.dp))

            // ---- notifications ----------------------------------------------
            Text("Notifications", style = MaterialTheme.typography.titleLarge)
            Spacer(Modifier.height(8.dp))
            AideCard {
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
                        }
                    )
                }

                if (notificationsOn) {
                    Spacer(Modifier.height(8.dp))
                    HorizontalDivider()
                    Spacer(Modifier.height(8.dp))
                    listOf(
                        AideChannel.INVENTORY to "Low stock alerts",
                        AideChannel.ORDERS to "Completed sales",
                        AideChannel.SYSTEM to "System and backup alerts"
                    ).forEach { (channel, label) ->
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(label, style = MaterialTheme.typography.bodyMedium,
                                modifier = Modifier.weight(1f))
                            Switch(
                                checked = prefs.isChannelEnabled(channel),
                                onCheckedChange = { prefs.setChannelEnabled(channel, it) }
                            )
                        }
                    }
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
                        accent = accent
                    )
                    SettingsStore.write(context, settings)
                    Palette.write(context, accent)
                    onSettingsChanged(settings)
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
