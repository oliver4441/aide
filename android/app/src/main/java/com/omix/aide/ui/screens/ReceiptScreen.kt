package com.omix.aide.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.omix.aide.data.local.dao.SaleWithItems
import com.omix.aide.data.repository.SaleRepository
import com.omix.aide.ui.components.AideButton
import com.omix.aide.ui.components.AideCard
import com.omix.aide.ui.theme.PrimaryGreen

@Composable
fun ReceiptScreen(
    saleId: String,
    saleRepository: SaleRepository,
    onDone: () -> Unit
) {
    var saleWithItems by remember { mutableStateOf<SaleWithItems?>(null) }

    LaunchedEffect(saleId) {
        saleWithItems = saleRepository.getSaleById(saleId)
    }

    val saleData = saleWithItems

    Column(
        modifier = Modifier.fillMaxSize().padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
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
                        text = "Aide Business Register",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "Receipt #${saleData.sale.id.takeLast(8)}",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                    )
                    Text(
                        text = "Date: ${saleData.sale.createdAt}",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                    )

                    HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp))

                    LazyColumn(modifier = Modifier.weight(1f)) {
                        items(saleData.items) { item ->
                            Row(
                                modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(text = "${item.name} x${item.quantity}")
                                Text(text = "KSh ${"%.2f".format(item.price * item.quantity)}")
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
                            text = "KSh ${"%.2f".format(saleData.sale.total)}",
                            fontWeight = FontWeight.Bold,
                            color = PrimaryGreen
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
                        Text(text = "KSh ${"%.2f".format(saleData.sale.change)}", style = MaterialTheme.typography.labelMedium)
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            AideButton(
                text = "Done",
                onClick = onDone
            )
        }
    }
}
