package com.omix.aide.ui.screens

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.omix.aide.data.local.entities.ProductEntity
import com.omix.aide.ui.money
import com.omix.aide.ui.moneyBare
import com.omix.aide.ui.components.*
import com.omix.aide.ui.theme.WarningAmber
import com.omix.aide.ui.viewmodel.CashPaymentRules
import com.omix.aide.ui.viewmodel.SellViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SellScreen(
    sellViewModel: SellViewModel,
    onSaleCompleted: (String) -> Unit
) {
    val uiState by sellViewModel.uiState.collectAsState()
    var showCheckoutSheet by remember { mutableStateOf(false) }
    var isGridView by remember { mutableStateOf(true) }
    val isCashPayment = uiState.paymentMethod == CashPaymentRules.CASH
    val cashAmountIsValid = CashPaymentRules.isCashAmountSufficient(
        uiState.subtotal,
        uiState.amountPaid
    )

    Column(modifier = Modifier.fillMaxSize()) {
        AideLocalOnlyBanner()

        Column(modifier = Modifier.padding(16.dp)) {
            // Top Bar Controls: Search & Grid/List Toggle
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Box(modifier = Modifier.weight(1f)) {
                    AideSearchBar(
                        query = uiState.searchQuery,
                        onQueryChange = { sellViewModel.setSearchQuery(it) },
                        placeholder = "Search catalog or scan SKU..."
                    )
                }

                Surface(
                    onClick = { isGridView = !isGridView },
                    shape = RoundedCornerShape(14.dp),
                    color = MaterialTheme.colorScheme.surfaceVariant,
                    modifier = Modifier.size(50.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            imageVector = if (isGridView) Icons.Default.ViewList else Icons.Default.GridView,
                            contentDescription = "Toggle View Mode",
                            tint = MaterialTheme.colorScheme.primary
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Catalog Grid or List
            Box(modifier = Modifier.weight(1f)) {
                if (uiState.products.isEmpty()) {
                    AideEmptyState(message = "No matching products in catalog.")
                } else if (isGridView) {
                    LazyVerticalGrid(
                        columns = GridCells.Fixed(2),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                        modifier = Modifier.fillMaxSize()
                    ) {
                        items(uiState.products) { product ->
                            val cartItem = uiState.cart.find { it.product.id == product.id }
                            SellProductGridCard(
                                product = product,
                                cartQuantity = cartItem?.quantity ?: 0,
                                onAdd = { sellViewModel.addToCart(product) },
                                onIncrement = { sellViewModel.updateQuantity(product.id, 1) },
                                onDecrement = { sellViewModel.updateQuantity(product.id, -1) }
                            )
                        }
                    }
                } else {
                    LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        items(uiState.products) { product ->
                            AideProductRow(
                                name = product.name,
                                stock = product.quantity,
                                price = money(product.sellingPrice),
                                sku = product.sku,
                                lowStockThreshold = product.lowStock,
                                imagePath = product.imageUrl,
                                onAddClick = { sellViewModel.addToCart(product) }
                            )
                        }
                    }
                }
            }

            // Cart Summary Banner at Bottom
            if (uiState.cart.isNotEmpty()) {
                Spacer(modifier = Modifier.height(12.dp))
                AideCard(
                    containerColor = MaterialTheme.colorScheme.primaryContainer,
                    borderColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.3f),
                    onClick = { showCheckoutSheet = true }
                ) {
                    Row(
                        modifier = Modifier
                            .padding(16.dp)
                            .fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(42.dp)
                                    .clip(CircleShape)
                                    .background(MaterialTheme.colorScheme.primary),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = Icons.Default.ShoppingCart,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.onPrimary,
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                            Spacer(modifier = Modifier.width(12.dp))
                            Column {
                                Text(
                                    text = "${uiState.cart.sumOf { it.quantity }} items in Cart",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.onPrimaryContainer
                                )
                                Text(
                                    text = "Tap to review & checkout",
                                    style = MaterialTheme.typography.labelMedium,
                                    color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.8f)
                                )
                            }
                        }

                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = money(uiState.subtotal),
                                style = MaterialTheme.typography.headlineMedium,
                                fontWeight = FontWeight.ExtraBold,
                                color = MaterialTheme.colorScheme.primary
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Icon(
                                imageVector = Icons.Default.ArrowForward,
                                contentDescription = "Checkout",
                                tint = MaterialTheme.colorScheme.primary
                            )
                        }
                    }
                }
            }
        }
    }

    // Checkout Modal Bottom Sheet
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

                // Cart Line Items List
                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 200.dp),
                    shape = RoundedCornerShape(16.dp),
                    color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f)
                ) {
                    LazyColumn(modifier = Modifier.padding(8.dp)) {
                        items(uiState.cart) { item ->
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
                                        text = "${moneyBare(item.product.sellingPrice)} each",
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
                                        textAlign = androidx.compose.ui.text.style.TextAlign.Center
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
                                    text = money(item.product.sellingPrice * item.quantity),
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.primary
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Payment Method Chips
                Text(
                    text = "Select Payment Method",
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(8.dp))
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    listOf("CASH", "MOBILE_MONEY", "CARD").forEach { method ->
                        val isSelected = uiState.paymentMethod == method
                        FilterChip(
                            selected = isSelected,
                            onClick = { sellViewModel.setPaymentMethod(method) },
                            label = {
                                Text(
                                    text = when (method) {
                                        "CASH" -> "Cash"
                                        "MOBILE_MONEY" -> "Mobile money"
                                        else -> "Card"
                                    },
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                                )
                            },
                            modifier = Modifier.height(48.dp),
                            shape = RoundedCornerShape(12.dp),
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = MaterialTheme.colorScheme.primary,
                                selectedLabelColor = MaterialTheme.colorScheme.onPrimary
                            )
                        )
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                if (isCashPayment) {
                    OutlinedTextField(
                        value = uiState.amountPaid,
                        onValueChange = { sellViewModel.setAmountPaid(it) },
                        label = { Text("Cash received") },
                        placeholder = { Text("Exact total: ${moneyBare(uiState.subtotal)}") },
                        supportingText = {
                            Text(
                                text = when {
                                    !cashAmountIsValid -> "Enter at least ${money(uiState.subtotal)} to complete this sale."
                                    else -> "Leave blank if the customer pays the exact total."
                                }
                            )
                        },
                        isError = !cashAmountIsValid,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(14.dp),
                        singleLine = true
                    )
                } else {
                    Text(
                        text = "${if (uiState.paymentMethod == "CARD") "Card" else "Mobile money"} payment is recorded as paid in full.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                // Cashier-friendly tender shortcuts; non-cash methods are paid
                // in full and do not need an amount-received field.
                val quickAmounts = remember(uiState.subtotal) {
                    listOf(
                        uiState.subtotal,
                        roundUpTo(uiState.subtotal, 100.0),
                        roundUpTo(uiState.subtotal, 500.0),
                        roundUpTo(uiState.subtotal, 1000.0)
                    ).filter { it > 0.0 }.distinct().take(4)
                }
                if (isCashPayment && quickAmounts.isNotEmpty()) {
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        quickAmounts.forEach { amount ->
                            AssistChip(
                                onClick = { sellViewModel.setAmountPaid("%.2f".format(amount)) },
                                label = {
                                    Text(
                                        text = moneyBare(amount),
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            )
                        }
                    }
                }

                // Change calculation
                val paid = uiState.amountPaid.toDoubleOrNull()
                if (isCashPayment && paid != null && paid >= uiState.subtotal) {
                    val change = paid - uiState.subtotal
                    Spacer(modifier = Modifier.height(12.dp))
                    AideCard(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)) {
                        Row(
                            modifier = Modifier.padding(12.dp).fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "Change due",
                                style = MaterialTheme.typography.titleMedium,
                                modifier = Modifier.weight(1f)
                            )
                            Text(
                                text = money(change),
                                style = MaterialTheme.typography.headlineMedium,
                                fontFamily = FontFamily.Monospace,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.primary
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))

                uiState.error?.let { message ->
                    Text(
                        text = message,
                        color = MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodyMedium,
                        modifier = Modifier.padding(bottom = 8.dp)
                    )
                }

                AideButton(
                    text = "${if (isCashPayment) "Complete cash sale" else "Confirm sale"} • ${money(uiState.subtotal)}",
                    enabled = uiState.cart.isNotEmpty() && (!isCashPayment || cashAmountIsValid),
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

/**
 * Grid View Card Item for POS Catalog
 */
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
                text = money(product.sellingPrice),
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

/** Rounds [amount] up to the next multiple of [step], for the quick-cash chips. */
private fun roundUpTo(amount: Double, step: Double): Double =
    if (amount <= 0.0) 0.0 else kotlin.math.ceil(amount / step) * step
