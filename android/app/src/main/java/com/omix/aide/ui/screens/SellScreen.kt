package com.omix.aide.ui.screens

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.automirrored.filled.ViewList
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.omix.aide.data.local.entities.ProductEntity
import com.omix.aide.ui.money
import com.omix.aide.ui.moneyBare
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
    var isGridView by remember { mutableStateOf(true) }

    Column(modifier = Modifier.fillMaxSize()) {
        AideLocalOnlyBanner()

        Column(modifier = Modifier.padding(16.dp)) {
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
                            imageVector = if (isGridView) Icons.AutoMirrored.Filled.ViewList else Icons.Default.GridView,
                            contentDescription = "Toggle View Mode",
                            tint = MaterialTheme.colorScheme.primary
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

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
                                imageVector = Icons.AutoMirrored.Filled.ArrowForward,
                                contentDescription = "Checkout",
                                tint = MaterialTheme.colorScheme.primary
                            )
                        }
                    }
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
                        .heightIn(max = 160.dp),
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

                Spacer(modifier = Modifier.height(14.dp))

                // Discount Selector Row
                Text(
                    text = "Apply Order Discount",
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(6.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    FilterChip(
                        selected = uiState.discountAmount == 0.0,
                        onClick = { sellViewModel.setDiscount(0.0) },
                        label = { Text("None") }
                    )
                    FilterChip(
                        selected = uiState.discountAmount > 0 && uiState.discountAmount == uiState.rawSubtotal * 0.05,
                        onClick = { sellViewModel.setDiscount(uiState.rawSubtotal * 0.05) },
                        label = { Text("5% OFF") }
                    )
                    FilterChip(
                        selected = uiState.discountAmount > 0 && uiState.discountAmount == uiState.rawSubtotal * 0.10,
                        onClick = { sellViewModel.setDiscount(uiState.rawSubtotal * 0.10) },
                        label = { Text("10% OFF") }
                    )
                }

                Spacer(modifier = Modifier.height(14.dp))

                Text(
                    text = "Select Payment Method",
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(8.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    listOf("CASH", "MOBILE_MONEY", "CARD", "CREDIT").forEach { method ->
                        val isSelected = uiState.paymentMethod == method
                        val displayLabel = when(method) {
                            "CREDIT" -> "STORE CREDIT"
                            else -> method.replace("_", " ")
                        }
                        FilterChip(
                            selected = isSelected,
                            onClick = { sellViewModel.setPaymentMethod(method) },
                            label = {
                                Text(
                                    text = displayLabel,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                                    fontSize = 11.sp
                                )
                            },
                            modifier = Modifier
                                .weight(1f)
                                .height(44.dp),
                            shape = RoundedCornerShape(12.dp),
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = MaterialTheme.colorScheme.primary,
                                selectedLabelColor = MaterialTheme.colorScheme.onPrimary
                            )
                        )
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                if (uiState.paymentMethod != "CREDIT") {
                    OutlinedTextField(
                        value = uiState.amountPaid,
                        onValueChange = { sellViewModel.setAmountPaid(it) },
                        label = { Text("Amount Received") },
                        placeholder = { Text("%.2f".format(uiState.subtotal)) },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(14.dp),
                        singleLine = true
                    )

                    val paid = uiState.amountPaid.toDoubleOrNull()
                    if (paid != null && paid > 0.0) {
                        val due = paid - uiState.subtotal
                        Spacer(modifier = Modifier.height(12.dp))
                        AideCard(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)) {
                            Column(modifier = Modifier.padding(12.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        text = if (due >= 0) "Change due to customer" else "Balance owed",
                                        style = MaterialTheme.typography.titleMedium,
                                        modifier = Modifier.weight(1f)
                                    )
                                    Text(
                                        text = money(kotlin.math.abs(due)),
                                        style = MaterialTheme.typography.headlineMedium,
                                        fontFamily = FontFamily.Monospace,
                                        fontWeight = FontWeight.Bold,
                                        color = if (due >= 0) MaterialTheme.colorScheme.primary else WarningAmber
                                    )
                                }
                            }
                        }
                    }
                } else {
                    Surface(
                        color = WarningAmber.copy(alpha = 0.15f),
                        shape = RoundedCornerShape(14.dp)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(14.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Default.Info,
                                contentDescription = null,
                                tint = WarningAmber
                            )
                            Spacer(modifier = Modifier.width(10.dp))
                            Text(
                                text = "Store Credit sale: Amount of ${money(uiState.subtotal)} will be recorded as credit.",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))

                AideButton(
                    text = "Complete Sale • ${money(uiState.subtotal)}",
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
