package com.omix.aide.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AddCircleOutline
import androidx.compose.material.icons.filled.DeleteOutline
import androidx.compose.material.icons.filled.RemoveCircleOutline
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.omix.aide.ui.components.*
import com.omix.aide.ui.theme.WarningAmber
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
                            imagePath = product.imageUrl,
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

                    // Line items with quantity controls. The cart used to show
                    // only a total, so nothing could be removed or corrected
                    // once added -- you had to complete the sale or start over.
                    uiState.cart.forEach { item ->
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(Modifier.weight(1f)) {
                                Text(
                                    text = item.product.name,
                                    style = MaterialTheme.typography.bodyLarge
                                )
                                Text(
                                    text = "KSh ${"%.2f".format(item.product.sellingPrice)} each",
                                    style = MaterialTheme.typography.labelMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }

                            Text(
                                text = "KSh ${"%.2f".format(
                                    item.product.sellingPrice * item.quantity
                                )}",
                                style = MaterialTheme.typography.bodyLarge,
                                fontWeight = FontWeight.SemiBold
                            )

                            IconButton(
                                onClick = {
                                    sellViewModel.updateQuantity(item.product.id, -1)
                                },
                                modifier = Modifier.size(48.dp)
                            ) {
                                Icon(
                                    Icons.Default.RemoveCircleOutline,
                                    contentDescription = "Decrease ${item.product.name}"
                                )
                            }
                            Text(
                                text = item.quantity.toString(),
                                style = MaterialTheme.typography.titleMedium,
                                modifier = Modifier.width(24.dp),
                                textAlign = androidx.compose.ui.text.style.TextAlign.Center
                            )
                            IconButton(
                                onClick = {
                                    sellViewModel.updateQuantity(item.product.id, 1)
                                },
                                modifier = Modifier.size(48.dp)
                            ) {
                                Icon(
                                    Icons.Default.AddCircleOutline,
                                    contentDescription = "Increase ${item.product.name}"
                                )
                            }
                            IconButton(
                                onClick = {
                                    sellViewModel.removeFromCart(item.product.id)
                                },
                                modifier = Modifier.size(48.dp)
                            ) {
                                Icon(
                                    Icons.Default.DeleteOutline,
                                    contentDescription = "Remove ${item.product.name}",
                                    tint = MaterialTheme.colorScheme.error
                                )
                            }
                        }
                        if (item.product.id != uiState.cart.last().product.id) {
                            HorizontalDivider()
                        }
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
                            // FilterChip defaults to 32dp tall, which is under
                            // the 48dp minimum tap target.
                            modifier = Modifier.weight(1f).height(48.dp)
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

                // Change due, worked out as they type. Nothing to press — this
                // is the calculation a cashier does mentally at the till.
                val paid = uiState.amountPaid.toDoubleOrNull()
                if (paid != null && paid > 0.0) {
                    val due = paid - uiState.subtotal
                    Spacer(Modifier.height(8.dp))
                    AideCard {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = if (due >= 0) "Change due" else "Still owed",
                                style = MaterialTheme.typography.titleMedium,
                                modifier = Modifier.weight(1f)
                            )
                            Text(
                                text = "KSh ${"%.2f".format(kotlin.math.abs(due))}",
                                style = MaterialTheme.typography.headlineMedium,
                                fontFamily = FontFamily.Monospace,
                                fontWeight = FontWeight.Bold,
                                color = if (due >= 0) {
                                    MaterialTheme.colorScheme.primary
                                } else {
                                    WarningAmber
                                }
                            )
                        }
                        Spacer(Modifier.height(4.dp))
                        // Quick exact-tender buttons, so the common case needs
                        // no typing at all.
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            val suggestions = listOf(
                                uiState.subtotal,
                                Math.ceil(uiState.subtotal / 100.0) * 100.0,
                                Math.ceil(uiState.subtotal / 500.0) * 500.0,
                                Math.ceil(uiState.subtotal / 1000.0) * 1000.0
                            ).distinct().filter { it >= uiState.subtotal }

                            suggestions.forEach { amount ->
                                FilterChip(
                                    selected = paid != null && kotlin.math.abs(paid - amount) < 0.005,
                                    onClick = {
                                        sellViewModel.setAmountPaid("%.2f".format(amount))
                                    },
                                    label = { Text("%.0f".format(amount)) },
                                    modifier = Modifier.height(48.dp)
                                )
                            }
                        }
                    }
                }

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
