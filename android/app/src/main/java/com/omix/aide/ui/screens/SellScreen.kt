package com.omix.aide.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.AddCircleOutline
import androidx.compose.material.icons.filled.Category
import androidx.compose.material.icons.filled.DeleteOutline
import androidx.compose.material.icons.filled.GridView
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material.icons.filled.RemoveCircleOutline
import androidx.compose.material.icons.filled.ViewList
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.omix.aide.data.local.converters.asMoney
import com.omix.aide.data.local.entities.ProductEntity
import com.omix.aide.ui.components.*
import com.omix.aide.ui.money
import com.omix.aide.ui.moneyBare
import com.omix.aide.ui.theme.WarningAmber
import com.omix.aide.ui.viewmodel.CashPaymentRules
import com.omix.aide.ui.viewmodel.SellViewModel
import kotlin.math.abs
import kotlin.math.ceil

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SellScreen(
    sellViewModel: SellViewModel,
    onSaleCompleted: (String) -> Unit
) {
    val uiState by sellViewModel.uiState.collectAsState()
    var showCheckoutSheet by remember { mutableStateOf(false) }
    var isGridView by remember { mutableStateOf(false) }
    val haptic = rememberAideHaptics()

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            AideSearchBar(
                query = uiState.searchQuery,
                onQueryChange = { sellViewModel.setSearchQuery(it) },
                modifier = Modifier.weight(1f)
            )
            IconButton(
                onClick = { isGridView = !isGridView },
                modifier = Modifier.size(48.dp)
            ) {
                Icon(
                    imageVector = if (isGridView) Icons.Default.ViewList else Icons.Default.GridView,
                    contentDescription = if (isGridView) "Switch to list view" else "Switch to grid view"
                )
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        Box(modifier = Modifier.weight(1f)) {
            if (uiState.products.isEmpty()) {
                AideEmptyState(message = "No matching products found.")
            } else if (isGridView) {
                LazyVerticalGrid(
                    columns = GridCells.Fixed(2),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier.fillMaxSize()
                ) {
                    items(uiState.products, key = { it.id }) { product ->
                        val cartItem = uiState.cart.find { it.product.id == product.id }
                        SellProductGridCard(
                            product = product,
                            cartQuantity = cartItem?.quantity ?: 0,
                            onAdd = {
                                haptic(AideHaptic.CONFIRM)
                                sellViewModel.addToCart(product)
                            },
                            onIncrement = {
                                haptic(AideHaptic.TICK)
                                sellViewModel.updateQuantity(product.id, 1)
                            },
                            onDecrement = {
                                haptic(AideHaptic.TICK)
                                sellViewModel.updateQuantity(product.id, -1)
                            }
                        )
                    }
                }
            } else {
                LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(uiState.products, key = { it.id }) { product ->
                        AideProductRow(
                            name = product.name,
                            stock = product.quantity,
                            price = money(product.sellingPrice.asMoney()),
                            sku = product.sku,
                            lowStockThreshold = product.lowStock,
                            imagePath = product.imageUrl,
                            onAddClick = {
                                haptic(AideHaptic.CONFIRM)
                                sellViewModel.addToCart(product)
                            }
                        )
                    }
                }
            }
        }

        if (uiState.cart.isNotEmpty()) {
            Spacer(modifier = Modifier.height(12.dp))
            AideCard(
                containerColor = MaterialTheme.colorScheme.primaryContainer,
                borderColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.3f),
                onClick = { showCheckoutSheet = true }
            ) {
                Column(modifier = Modifier.padding(16.dp).fillMaxWidth()) {
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
                            text = money(uiState.subtotal),
                            style = MaterialTheme.typography.headlineMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    uiState.cart.forEach { item ->
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(Modifier.weight(1f)) {
                                Text(
                                    text = item.product.name,
                                    style = MaterialTheme.typography.bodyLarge,
                                    fontWeight = FontWeight.Medium
                                )
                                Text(
                                    text = "${moneyBare(item.product.sellingPrice.asMoney())} each",
                                    style = MaterialTheme.typography.labelMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }

                            Text(
                                text = money(item.product.sellingPrice.asMoney() * item.quantity),
                                style = MaterialTheme.typography.bodyLarge,
                                fontWeight = FontWeight.SemiBold
                            )

                            IconButton(
                                onClick = {
                                    haptic(AideHaptic.TICK)
                                    sellViewModel.updateQuantity(item.product.id, -1)
                                },
                                modifier = Modifier.size(44.dp)
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
                                textAlign = TextAlign.Center
                            )
                            IconButton(
                                onClick = {
                                    haptic(AideHaptic.TICK)
                                    sellViewModel.updateQuantity(item.product.id, 1)
                                },
                                modifier = Modifier.size(44.dp)
                            ) {
                                Icon(
                                    Icons.Default.AddCircleOutline,
                                    contentDescription = "Increase ${item.product.name}"
                                )
                            }
                            IconButton(
                                onClick = {
                                    haptic(AideHaptic.WARN)
                                    sellViewModel.removeFromCart(item.product.id)
                                },
                                modifier = Modifier.size(44.dp)
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
                        text = "Checkout • ${money(uiState.subtotal)}",
                        onClick = { showCheckoutSheet = true }
                    )
                }
            }
        }
    }

    if (showCheckoutSheet) {
        ModalBottomSheet(
            onDismissRequest = { showCheckoutSheet = false },
            shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)
        ) {
            Column(
                modifier = Modifier
                    .padding(horizontal = 24.dp, vertical = 16.dp)
                    .fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Current Order",
                        style = MaterialTheme.typography.headlineMedium,
                        fontWeight = FontWeight.Bold
                    )
                    AideBadge(
                        text = "${uiState.cart.sumOf { it.quantity }} items",
                        containerColor = MaterialTheme.colorScheme.primaryContainer,
                        contentColor = MaterialTheme.colorScheme.onPrimaryContainer
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))

                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 200.dp),
                    shape = RoundedCornerShape(16.dp),
                    color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f)
                ) {
                    LazyColumn(modifier = Modifier.padding(8.dp)) {
                        items(uiState.cart, key = { it.product.id }) { item ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 8.dp, vertical = 6.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = item.product.name,
                                        style = MaterialTheme.typography.bodyLarge,
                                        fontWeight = FontWeight.SemiBold
                                    )
                                    Text(
                                        text = "${moneyBare(item.product.sellingPrice.asMoney())} each",
                                        style = MaterialTheme.typography.labelSmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }

                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    IconButton(
                                        onClick = { sellViewModel.updateQuantity(item.product.id, -1) },
                                        modifier = Modifier.size(36.dp)
                                    ) {
                                        Icon(
                                            Icons.Default.RemoveCircleOutline,
                                            contentDescription = "Decrease",
                                            modifier = Modifier.size(20.dp)
                                        )
                                    }
                                    Text(
                                        text = "${item.quantity}",
                                        style = MaterialTheme.typography.titleMedium,
                                        fontWeight = FontWeight.Bold,
                                        modifier = Modifier.widthIn(min = 20.dp),
                                        textAlign = TextAlign.Center
                                    )
                                    IconButton(
                                        onClick = { sellViewModel.updateQuantity(item.product.id, 1) },
                                        modifier = Modifier.size(36.dp)
                                    ) {
                                        Icon(
                                            Icons.Default.AddCircleOutline,
                                            contentDescription = "Increase",
                                            modifier = Modifier.size(20.dp)
                                        )
                                    }
                                    IconButton(
                                        onClick = { sellViewModel.removeFromCart(item.product.id) },
                                        modifier = Modifier.size(36.dp)
                                    ) {
                                        Icon(
                                            Icons.Default.DeleteOutline,
                                            contentDescription = "Remove",
                                            tint = MaterialTheme.colorScheme.error,
                                            modifier = Modifier.size(20.dp)
                                        )
                                    }
                                }

                                Spacer(modifier = Modifier.width(8.dp))

                                Text(
                                    text = money(item.product.sellingPrice.asMoney() * item.quantity),
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.primary
                                )
                            }
                        }
                    }
                }

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
                            onClick = {
                                haptic(AideHaptic.TICK)
                                sellViewModel.setPaymentMethod(method)
                            },
                            label = { Text(method.replace("_", " ")) },
                            modifier = Modifier.weight(1f).height(48.dp)
                        )
                    }
                }

                if (uiState.paymentMethod == CashPaymentRules.CASH) {
                    Spacer(modifier = Modifier.height(16.dp))

                    OutlinedTextField(
                        value = uiState.amountPaid,
                        onValueChange = { sellViewModel.setAmountPaid(it) },
                        label = { Text("Amount Received") },
                        placeholder = { Text("%.2f".format(uiState.subtotal)) },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )

                    val paid = uiState.amountPaid.toDoubleOrNull()
                    if (paid != null && paid > 0.0) {
                        val due = paid - uiState.subtotal
                        Spacer(Modifier.height(8.dp))
                        AideCard {
                            Column(modifier = Modifier.padding(12.dp)) {
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
                                        text = money(abs(due)),
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
                            }
                        }
                    }

                    Spacer(Modifier.height(8.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        val suggestions = listOf(
                            uiState.subtotal,
                            roundUpTo(uiState.subtotal, 100.0),
                            roundUpTo(uiState.subtotal, 500.0),
                            roundUpTo(uiState.subtotal, 1000.0)
                        ).distinct().filter { it >= uiState.subtotal }

                        suggestions.forEach { amount ->
                            FilterChip(
                                selected = paid != null && abs(paid - amount) < 0.005,
                                onClick = {
                                    haptic(AideHaptic.TICK)
                                    sellViewModel.setAmountPaid("%.2f".format(amount))
                                },
                                label = { Text("%.0f".format(amount)) },
                                modifier = Modifier.height(48.dp)
                            )
                        }
                    }
                }

                uiState.error?.let { err ->
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = err,
                        color = MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodyMedium
                    )
                }

                Spacer(modifier = Modifier.height(20.dp))

                AideButton(
                    text = "Complete Sale • ${money(uiState.subtotal)}",
                    onClick = {
                        sellViewModel.completeSale { saleId ->
                            haptic(AideHaptic.CONFIRM)
                            showCheckoutSheet = false
                            onSaleCompleted(saleId)
                        }
                    }
                )
            }
        }
    }
}

@Composable
fun SellProductGridCard(
    product: ProductEntity,
    cartQuantity: Int,
    onAdd: () -> Unit,
    onIncrement: () -> Unit,
    onDecrement: () -> Unit
) {
    AideCard {
        Column(
            modifier = Modifier
                .padding(12.dp)
                .fillMaxWidth(),
            horizontalAlignment = Alignment.Start
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                if (!product.imageUrl.isNullOrBlank()) {
                    ProductThumbnail(path = product.imageUrl, size = 44)
                } else {
                    Box(
                        modifier = Modifier
                            .size(44.dp)
                            .clip(RoundedCornerShape(10.dp))
                            .background(MaterialTheme.colorScheme.primaryContainer),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Category,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.onPrimaryContainer,
                            modifier = Modifier.size(22.dp)
                        )
                    }
                }
                if (cartQuantity > 0) {
                    AideBadge(
                        text = "$cartQuantity",
                        containerColor = MaterialTheme.colorScheme.primary,
                        contentColor = MaterialTheme.colorScheme.onPrimary
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            Text(
                text = product.name,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                maxLines = 2,
                minLines = 2
            )

            Spacer(modifier = Modifier.height(4.dp))

            Text(
                text = money(product.sellingPrice.asMoney()),
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.ExtraBold,
                color = MaterialTheme.colorScheme.primary
            )

            Text(
                text = "Stock: ${product.quantity}",
                style = MaterialTheme.typography.labelSmall,
                color = if (product.quantity <= product.lowStock) WarningAmber else MaterialTheme.colorScheme.onSurfaceVariant
            )

            Spacer(modifier = Modifier.height(10.dp))

            if (cartQuantity == 0) {
                Button(
                    onClick = onAdd,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(38.dp),
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                ) {
                    Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Add", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
                }
            } else {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(
                        onClick = onDecrement,
                        modifier = Modifier
                            .size(36.dp)
                            .clip(CircleShape)
                            .background(MaterialTheme.colorScheme.surfaceVariant)
                    ) {
                        Icon(Icons.Default.Remove, contentDescription = "Decrease", modifier = Modifier.size(18.dp))
                    }

                    Text(
                        text = "$cartQuantity",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )

                    IconButton(
                        onClick = onIncrement,
                        modifier = Modifier
                            .size(36.dp)
                            .clip(CircleShape)
                            .background(MaterialTheme.colorScheme.primary)
                    ) {
                        Icon(
                            Icons.Default.Add,
                            contentDescription = "Increase",
                            tint = MaterialTheme.colorScheme.onPrimary,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }
            }
        }
    }
}

private fun roundUpTo(amount: Double, step: Double): Double =
    if (amount <= 0.0) 0.0 else ceil(amount / step) * step
