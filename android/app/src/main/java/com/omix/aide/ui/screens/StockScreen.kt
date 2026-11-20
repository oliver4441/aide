package com.omix.aide.ui.screens

import com.omix.aide.data.local.converters.asMoney

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.omix.aide.ui.components.*
import com.omix.aide.ui.money
import com.omix.aide.ui.viewmodel.StockViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StockScreen(
    stockViewModel: StockViewModel
) {
    val uiState by stockViewModel.uiState.collectAsState()

    var name by remember { mutableStateOf("") }
    var buyingPrice by remember { mutableStateOf("") }
    var sellingPrice by remember { mutableStateOf("") }
    var quantity by remember { mutableStateOf("") }
    var sku by remember { mutableStateOf("") }
    var imagePath by remember { mutableStateOf<String?>(null) }

    val displayedProducts = remember(uiState.products, selectedFilter) {
        when (selectedFilter) {
            "LOW_STOCK" -> uiState.products.filter { it.quantity <= it.lowStock }
            else -> uiState.products
        }
    }

    val totalValuation = remember(uiState.products) {
        uiState.products.sumOf { it.sellingPrice.asMoney() * it.quantity }
    }
    val lowStockCount = remember(uiState.products) {
        uiState.products.count { it.quantity <= it.lowStock }
    }

    Scaffold(
        floatingActionButton = {
            FloatingActionButton(
                onClick = { stockViewModel.setAddProductOpen(true) },
                containerColor = MaterialTheme.colorScheme.primary
            ) {
                Icon(Icons.Default.Add, contentDescription = "Add Product")
            }
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(16.dp)
        ) {
            if (uiState.isLoading) {
                LoadingState()
                return@Column
            }

            AideSearchBar(
                query = uiState.searchQuery,
                onQueryChange = { stockViewModel.setSearchQuery(it) }
            )

            Spacer(modifier = Modifier.height(12.dp))

            if (uiState.products.isEmpty()) {
                AideEmptyState(
                    message = "No products in inventory.",
                    actionLabel = "+ Add Product",
                    onAction = { stockViewModel.setAddProductOpen(true) }
                )
            } else {
                LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(uiState.products) { product ->
                        AideProductRow(
                            name = product.name,
                            stock = product.quantity,
                            price = money(product.sellingPrice),
                            sku = product.sku,
                            lowStockThreshold = product.lowStock,
                            imagePath = product.imageUrl
                        )
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                OutlinedTextField(
                    value = editName,
                    onValueChange = { editName = it },
                    label = { Text("Product Name") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp),
                    singleLine = true
                )

                Spacer(modifier = Modifier.height(12.dp))

                ProductImagePicker(imagePath = editImagePath, onImagePicked = { editImagePath = it })

                Spacer(modifier = Modifier.height(12.dp))

                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    OutlinedTextField(
                        value = editBuyingPrice,
                        onValueChange = { editBuyingPrice = it },
                        label = { Text("Buying Cost") },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(14.dp),
                        singleLine = true
                    )
                    OutlinedTextField(
                        value = editSellingPrice,
                        onValueChange = { editSellingPrice = it },
                        label = { Text("Selling Price") },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(14.dp),
                        singleLine = true
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))

                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    OutlinedTextField(
                        value = editQuantity,
                        onValueChange = { editQuantity = it },
                        label = { Text("Current Stock") },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(14.dp),
                        singleLine = true
                    )
                    OutlinedTextField(
                        value = editLowStock,
                        onValueChange = { editLowStock = it },
                        label = { Text("Low Alert Qty") },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(14.dp),
                        singleLine = true
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = editSku,
                    onValueChange = { editSku = it },
                    label = { Text("SKU / Barcode (Optional)") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp),
                    singleLine = true
                )

                Spacer(modifier = Modifier.height(24.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    OutlinedButton(
                        onClick = { stockViewModel.setEditingProduct(null) },
                        modifier = Modifier.weight(1f).height(50.dp),
                        shape = RoundedCornerShape(14.dp)
                    ) {
                        Text("Cancel")
                    }
                    Button(
                        onClick = {
                            val bp = editBuyingPrice.toDoubleOrNull() ?: editingProduct.buyingPrice.asMoney()
                            val sp = editSellingPrice.toDoubleOrNull() ?: editingProduct.sellingPrice.asMoney()
                            val qty = editQuantity.toIntOrNull() ?: editingProduct.quantity
                            val alertQty = editLowStock.toIntOrNull() ?: editingProduct.lowStock
                            if (editName.isNotBlank() && sp > 0) {
                                stockViewModel.updateProduct(
                                    id = editingProduct.id,
                                    name = editName,
                                    buyingPrice = bp,
                                    sellingPrice = sp,
                                    quantity = qty,
                                    lowStock = alertQty,
                                    sku = editSku.ifBlank { null },
                                    imagePath = editImagePath
                                )
                            }
                        },
                        modifier = Modifier.weight(1.5f).height(50.dp),
                        shape = RoundedCornerShape(14.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                    ) {
                        Text("Save Changes", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }

    if (uiState.isAddProductOpen) {
        ModalBottomSheet(onDismissRequest = { stockViewModel.setAddProductOpen(false) }) {
            Column(modifier = Modifier.padding(24.dp).fillMaxWidth()) {
                Text(
                    text = "Add Product",
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold
                )

                Spacer(modifier = Modifier.height(16.dp))

                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Product Name") },
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(12.dp))

                Spacer(modifier = Modifier.height(16.dp))
                ProductImagePicker(imagePath = imagePath, onImagePicked = { imagePath = it })
                Spacer(modifier = Modifier.height(16.dp))

                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    OutlinedTextField(
                        value = buyingPrice,
                        onValueChange = { buyingPrice = it },
                        label = { Text("Buying Price") },
                        modifier = Modifier.weight(1f)
                    )
                    OutlinedTextField(
                        value = sellingPrice,
                        onValueChange = { sellingPrice = it },
                        label = { Text("Selling Price") },
                        modifier = Modifier.weight(1f)
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))

                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    OutlinedTextField(
                        value = quantity,
                        onValueChange = { quantity = it },
                        label = { Text("Quantity") },
                        modifier = Modifier.weight(1f)
                    )
                    OutlinedTextField(
                        value = sku,
                        onValueChange = { sku = it },
                        label = { Text("SKU (Optional)") },
                        modifier = Modifier.weight(1f)
                    )
                }

                Spacer(modifier = Modifier.height(24.dp))

                AideButton(
                    text = "Save Product",
                    onClick = {
                        val bp = buyingPrice.toDoubleOrNull() ?: 0.0
                        val sp = sellingPrice.toDoubleOrNull() ?: 0.0
                        val qty = quantity.toIntOrNull() ?: 0
                        if (name.isNotBlank() && sp > 0) {
                            stockViewModel.addProduct(
                                name = name,
                                buyingPrice = bp,
                                sellingPrice = sp,
                                quantity = qty,
                                sku = sku.ifBlank { null },
                                imagePath = imagePath
                            )
                        }
                    }
                )
            }
        }
    }
}

/**
 * Expressive Inventory Item Card with visual stock progress bar
 */
@Composable
fun StockProductCard(
    product: ProductEntity,
    onClick: () -> Unit = {}
) {
    val isLow = product.quantity <= product.lowStock
    val margin = if (product.sellingPrice > 0) {
        ((product.sellingPrice - product.buyingPrice) / product.sellingPrice * 100).toInt()
    } else 0

    AideCard(onClick = onClick) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    modifier = Modifier.weight(1f),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    if (!product.imageUrl.isNullOrBlank()) {
                        ProductThumbnail(path = product.imageUrl, size = 48)
                    } else {
                        Box(
                            modifier = Modifier
                                .size(48.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .background(MaterialTheme.colorScheme.primaryContainer),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.Inventory,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.onPrimaryContainer,
                                modifier = Modifier.size(24.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.width(12.dp))

                    Column {
                        Text(
                            text = product.name,
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        if (!product.sku.isNullOrBlank()) {
                            Text(
                                text = "SKU: ${product.sku}",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }

                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        text = money(product.sellingPrice.asMoney()),
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.ExtraBold,
                        color = MaterialTheme.colorScheme.primary
                    )
                    if (margin > 0) {
                        AideBadge(
                            text = "+$margin% margin",
                            containerColor = MaterialTheme.colorScheme.secondaryContainer,
                            contentColor = MaterialTheme.colorScheme.onSecondaryContainer
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Stock Indicator Bar
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Stock Level: ${product.quantity} units",
                    style = MaterialTheme.typography.bodySmall,
                    fontWeight = if (isLow) FontWeight.Bold else FontWeight.Normal,
                    color = if (isLow) WarningAmber else MaterialTheme.colorScheme.onSurface
                )
                if (isLow) {
                    AideBadge(
                        text = "Low Stock Alert (Threshold: ${product.lowStock})",
                        containerColor = WarningAmber.copy(alpha = 0.2f),
                        contentColor = WarningAmber,
                        icon = Icons.Default.Warning
                    )
                }
            }

            Spacer(modifier = Modifier.height(6.dp))

            val progress = remember(product.quantity, product.lowStock) {
                val maxEst = (product.lowStock * 4).coerceAtLeast(20)
                (product.quantity.toFloat() / maxEst.toFloat()).coerceIn(0f, 1f)
            }

            LinearProgressIndicator(
                progress = { progress },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(6.dp)
                    .clip(RoundedCornerShape(3.dp)),
                color = if (isLow) WarningAmber else MaterialTheme.colorScheme.primary,
                trackColor = MaterialTheme.colorScheme.surfaceVariant
            )
        }
    }
}
