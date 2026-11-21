package com.omix.aide.ui.screens

import android.content.Intent
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.omix.aide.data.local.converters.asMoney
import com.omix.aide.data.local.dao.SaleWithItems
import com.omix.aide.data.repository.SaleRepository
import com.omix.aide.ui.LocalAideSettings
import com.omix.aide.ui.components.AideButton
import com.omix.aide.ui.components.AideCard
import com.omix.aide.ui.money

@Composable
fun ReceiptScreen(
    saleId: String,
    saleRepository: SaleRepository,
    onDone: () -> Unit
) {
    val context = LocalContext.current
    var saleWithItems by remember { mutableStateOf<SaleWithItems?>(null) }

    LaunchedEffect(saleId) {
        saleWithItems = saleRepository.getSaleById(saleId)
    }

    val saleData = saleWithItems
    val settings = LocalAideSettings.current
    val storeTitle = settings.businessName.ifBlank { "Aide Business Register" }

    val receiptText: String = if (saleData == null) {
        ""
    } else {
        buildString {
            appendLine("===============================")
            appendLine(storeTitle)
            appendLine("Receipt #${saleData.sale.id.takeLast(8)}")
            appendLine("Date: ${saleData.sale.createdAt}")
            appendLine("-------------------------------")
            saleData.items.forEach { item ->
                appendLine("${item.name} x${item.quantity}  ${money(item.price.asMoney() * item.quantity)}")
            }
            appendLine("-------------------------------")
            appendLine("TOTAL PAID: ${money(saleData.sale.total.asMoney())}")
            appendLine("Payment Method: ${saleData.sale.paymentMethod}")
            if (saleData.sale.change > 0L) {
                appendLine("Change: ${money(saleData.sale.change.asMoney())}")
            }
            if (saleData.sale.tax > 0L) {
                appendLine(
                    "VAT (${"%.0f".format(saleData.sale.taxRate.asMoney())}%): ${money(saleData.sale.tax.asMoney())}"
                )
            }
            if (settings.receiptFooter.isNotBlank()) {
                appendLine("-------------------------------")
                appendLine(settings.receiptFooter)
            }
            appendLine("===============================")
        }
    }

    fun shareReceipt() {
        if (receiptText.isEmpty()) return
        val sendIntent = Intent().apply {
            action = Intent.ACTION_SEND
            putExtra(Intent.EXTRA_TEXT, receiptText)
            type = "text/plain"
        }
        val shareIntent = Intent.createChooser(sendIntent, "Share Receipt")
        context.startActivity(shareIntent)
    }

    Column(
        modifier = Modifier.fillMaxSize().padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        if (settings.businessName.isNotBlank()) {
            Text(
                text = settings.businessName,
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary
            )
        }
        Text(
            text = "RECEIPT",
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold
        )

        Spacer(modifier = Modifier.height(16.dp))

        if (saleData == null) {
            CircularProgressIndicator()
        } else {
            AideCard(modifier = Modifier.weight(1f)) {
                Column(modifier = Modifier.padding(20.dp).fillMaxWidth()) {
                    Text(
                        text = storeTitle,
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "Receipt #${saleData.sale.id.takeLast(8)}",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        text = "Date: ${saleData.sale.createdAt}",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp))

                    LazyColumn(modifier = Modifier.weight(1f)) {
                        items(saleData.items, key = { it.id }) { item ->
                            Row(
                                modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(text = "${item.name} x${item.quantity}")
                                Text(text = money(item.price.asMoney() * item.quantity))
                            }
                        }
                    }

                    HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(text = "Total Paid:", fontWeight = FontWeight.Bold)
                        Text(
                            text = money(saleData.sale.total.asMoney()),
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(text = "Payment Method:", style = MaterialTheme.typography.labelMedium)
                        Text(text = saleData.sale.paymentMethod, style = MaterialTheme.typography.labelMedium)
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(text = "Change:", style = MaterialTheme.typography.labelMedium)
                        Text(text = money(saleData.sale.change.asMoney()), style = MaterialTheme.typography.labelMedium)
                    }

                    if (saleData.sale.tax > 0L) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                text = "VAT (${"%.0f".format(saleData.sale.taxRate.asMoney())}%):",
                                style = MaterialTheme.typography.labelMedium
                            )
                            Text(
                                text = money(saleData.sale.tax.asMoney()),
                                style = MaterialTheme.typography.labelMedium,
                                fontWeight = FontWeight.SemiBold
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            if (settings.receiptFooter.isNotBlank()) {
                Text(
                    text = settings.receiptFooter,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center
                )
                Spacer(modifier = Modifier.height(12.dp))
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                OutlinedButton(
                    onClick = { shareReceipt() },
                    modifier = Modifier.weight(1f).height(48.dp)
                ) {
                    Icon(Icons.Default.Share, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Share")
                }
                AideButton(
                    text = "Done",
                    onClick = onDone,
                    modifier = Modifier.weight(1f)
                )
            }
        }
    }
}
