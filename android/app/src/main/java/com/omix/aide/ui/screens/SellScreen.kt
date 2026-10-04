package com.omix.aide.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.omix.aide.ui.components.*
import com.omix.aide.ui.viewmodel.SellViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SellScreen(
    sellViewModel: SellViewModel,
    onSaleCompleted: (String) -> Unit
) {
    val uiState by sellViewModel.uiState.collectAsState()
    var showCheckoutSheet by remember { mutableStateOf(false) }

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        AideSearchBar(
            query = uiState.searchQuery,
            onQueryChange = { sellViewModel.setSearchQuery(it) }
        )

        Spacer(modifier = Modifier.height(12.dp))

        Box(modifier = Modifier.weight(1f)) {
            if (uiState.products.isEmpty()) {
                AideEmptyState(message = "No products found.")
            } else {
                LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(uiState.products) { product ->
                        AideProductRow(
                            name = product.name,
                            stock = product.quantity,
                            price = "KSh ${product.sellingPrice}",
                            sku = product.sku,
                            lowStockThreshold = product.lowStock,
                            onAddClick = { sellViewModel.addToCart(product) }
                        )
                    }
                }
            }
        }

        if (uiState.cart.isNotEmpty()) {
            Spacer(modifier = Modifier.height(12.dp))
            AideCard {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Cart (${uiState.cart.sumOf { it.quantity }} items)",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "KSh ${"%.2f".format(uiState.subtotal)}",
                            style = MaterialTheme.typography.headlineMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    AideButton(
                        text = "Checkout • KSh ${"%.2f".format(uiState.subtotal)}",
                        onClick = { showCheckoutSheet = true }
                    )
                }
            }
        }
    }

    if (showCheckoutSheet) {
        ModalBottomSheet(onDismissRequest = { showCheckoutSheet = false }) {
            Column(modifier = Modifier.padding(24.dp).fillMaxWidth()) {
                Text(
                    text = "Payment",
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold
                )

                Spacer(modifier = Modifier.height(16.dp))

                Text(text = "Select Payment Method", style = MaterialTheme.typography.labelMedium)
                Spacer(modifier = Modifier.height(8.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    listOf("CASH", "MOBILE_MONEY", "CARD").forEach { method ->
                        FilterChip(
                            selected = uiState.paymentMethod == method,
                            onClick = { sellViewModel.setPaymentMethod(method) },
                            label = { Text(method.replace("_", " ")) },
                            modifier = Modifier.weight(1f)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                OutlinedTextField(
                    value = uiState.amountPaid,
                    onValueChange = { sellViewModel.setAmountPaid(it) },
                    label = { Text("Amount Received (KSh)") },
                    placeholder = { Text("%.2f".format(uiState.subtotal)) },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                Spacer(modifier = Modifier.height(24.dp))

                AideButton(
                    text = "Complete Sale",
                    onClick = {
                        sellViewModel.completeSale { saleId ->
                            showCheckoutSheet = false
                            onSaleCompleted(saleId)
                        }
                    }
                )
            }
        }
    }
}
