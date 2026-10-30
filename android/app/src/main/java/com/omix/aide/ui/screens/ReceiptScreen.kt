package com.omix.aide.ui.screens

import android.content.Intent
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Print
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.omix.aide.data.local.dao.SaleWithItems
import com.omix.aide.data.repository.SaleRepository
import com.omix.aide.ui.LocalAideSettings
import com.omix.aide.ui.ReceiptFormatter
import com.omix.aide.ui.money
import com.omix.aide.ui.components.AideButton
import com.omix.aide.ui.components.AideCard

@Composable
fun ReceiptScreen(
    saleId: String,
    saleRepository: SaleRepository,
    onDone: () -> Unit
) {
    var saleWithItems by remember { mutableStateOf<SaleWithItems?>(null) }
    val context = LocalContext.current

    LaunchedEffect(saleId) {
        saleWithItems = saleRepository.getSaleById(saleId)
    }

    val saleData = saleWithItems
    val settings = LocalAideSettings.current

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
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
                Column(
                    modifier = Modifier
                        .padding(20.dp)
                        .fillMaxWidth()
                ) {
                    Text(
                        text = settings.businessName.ifBlank { "Aide Register" },
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "Receipt #${saleData.sale.id.takeLast(8).uppercase()}",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        text = "Date: ${saleData.sale.createdAt.take(16)}",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp))

                    LazyColumn(modifier = Modifier.weight(1f)) {
                        items(saleData.items) { item ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 4.dp),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(text = "${item.name} x${item.quantity}")
                                Text(text = money(item.price * item.quantity))
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
                            text = money(saleData.sale.total),
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(text = "Payment Method:", style = MaterialTheme.typography.labelMedium)
                        Text(text = saleData.sale.paymentMethod.replace("_", " "), style = MaterialTheme.typography.labelMedium)
                    }

                    if (saleData.sale.paid > 0) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(text = "Change:", style = MaterialTheme.typography.labelMedium)
                            Text(text = money(saleData.sale.change), style = MaterialTheme.typography.labelMedium)
                        }
                    }

                    if (saleData.sale.tax > 0.0) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                text = "VAT (${"%.0f".format(saleData.sale.taxRate)}%):",
                                style = MaterialTheme.typography.labelMedium
                            )
                            Text(
                                text = money(saleData.sale.tax),
                                style = MaterialTheme.typography.labelMedium,
                                fontWeight = FontWeight.SemiBold
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                OutlinedButton(
                    onClick = {
                        val text = ReceiptFormatter.formatPlainText(
                            saleWithItems = saleData,
                            businessName = settings.businessName,
                            currency = settings.currency,
                            footer = settings.receiptFooter
                        )
                        val sendIntent = Intent().apply {
                            action = Intent.ACTION_SEND
                            putExtra(Intent.EXTRA_TEXT, text)
                            type = "text/plain"
                        }
                        runCatching { context.startActivity(Intent.createChooser(sendIntent, "Share Thermal Receipt")) }
                    },
                    modifier = Modifier
                        .weight(1f)
                        .height(48.dp),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Icon(Icons.Default.Share, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Share Text")
                }

                OutlinedButton(
                    onClick = {
                        val text = ReceiptFormatter.formatPlainText(
                            saleWithItems = saleData,
                            businessName = settings.businessName,
                            currency = settings.currency,
                            footer = settings.receiptFooter
                        )
                        val printIntent = Intent().apply {
                            action = Intent.ACTION_SEND
                            putExtra(Intent.EXTRA_TEXT, text)
                            type = "text/plain"
                        }
                        runCatching { context.startActivity(Intent.createChooser(printIntent, "Print ESC/POS Thermal Receipt")) }
                    },
                    modifier = Modifier
                        .weight(1f)
                        .height(48.dp),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Icon(Icons.Default.Print, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Thermal Print")
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            AideButton(
                text = "Complete & Back to Till",
                onClick = onDone
            )
        }
    }
}
