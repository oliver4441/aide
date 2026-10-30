package com.omix.aide.ui.screens

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.omix.aide.data.local.entities.ProductEntity
import com.omix.aide.ui.components.*
import com.omix.aide.ui.money
import com.omix.aide.ui.theme.WarningAmber
import com.omix.aide.ui.viewmodel.StockViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StockScreen(
    stockViewModel: StockViewModel
) {
    val uiState by stockViewModel.uiState.collectAsState()

    var selectedFilter by remember { mutableStateOf("ALL") } // ALL, LOW_STOCK

    var name by remember { mutableStateOf("") }
    var buyingPrice by remember { mutableStateOf("") }
    var sellingPrice by remember { mutableStateOf("") }
    var quantity by remember { mutableStateOf("") }
    var lowStockThreshold by remember { mutableStateOf("5") }
    var sku by remember { mutableStateOf("") }
    var imagePath by remember { mutableStateOf<String?>(null) }

    val displayedProducts = remember(uiState.products, selectedFilter) {
        when (selectedFilter) {
            "LOW_STOCK" -> uiState.products.filter { it.quantity <= it.lowStock }
            else -> uiState.products
        }
    }

    val totalValuation = remember(uiState.products) {
        uiState.products.sumOf { it.sellingPrice * it.quantity }
    }
    val lowStockCount = remember(uiState.products) {
        uiState.products.count { it.quantity <= it.lowStock }
    }

    Scaffold(
        floatingActionButton = {
            FloatingActionButton(
                onClick = { stockViewModel.setAddProductOpen(true) },
                containerColor = MaterialTheme.colorScheme.primary,
                contentColor = MaterialTheme.colorScheme.onPrimary,
                shape = RoundedCornerShape(16.dp)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.Add, contentDescription = "Add Product")
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Add Product", fontWeight = FontWeight.Bold)
                }
            }
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            AideLocalOnlyBanner()

            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 16.dp, vertical = 12.dp)
            ) {
                if (uiState.isLoading) {
                    LoadingState()
                    return@Column
                }

                // Inventory Summary Metrics Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    AideStatCard(
                        title = "Products",
                        value = "${uiState.products.size}",
                        subtitle = "Total items",
                        icon = Icons.Default.Inventory2,
                        modifier = Modifier.weight(1f),
                        valueColor = MaterialTheme.colorScheme.primary
                    )
                    AideStatCard(
                        title = "Low Stock",
                        value = "$lowStockCount",
                        subtitle = "Needs restock",
                        icon = Icons.Default.Warning,
                        modifier = Modifier.weight(1f),
                        valueColor = if (lowStockCount > 0) WarningAmber else MaterialTheme.colorScheme.onSurface
                    )
                }

                Spacer(modifier = Modifier.height(14.dp))

                // Search & Filter Row
                AideSearchBar(
                    query = uiState.searchQuery,
                    onQueryChange = { stockViewModel.setSearchQuery(it) },
                    placeholder = "Search inventory name or SKU..."
                )

                Spacer(modifier = Modifier.height(12.dp))

                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    AideFilterChip(
                        selected = selectedFilter == "ALL",
                        onClick = { selectedFilter = "ALL" },
                        label = "All Items (${uiState.products.size})"
                    )
                    AideFilterChip(
                        selected = selectedFilter == "LOW_STOCK",
                        onClick = { selectedFilter = "LOW_STOCK" },
                        label = "Low Stock ($lowStockCount)"
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))

                if (displayedProducts.isEmpty()) {
                    AideEmptyState(
                        message = if (selectedFilter == "LOW_STOCK") "No low stock alerts!" else "No products in inventory.",
                        actionLabel = "+ Add Product",
                        onAction = { stockViewModel.setAddProductOpen(true) }
                    )
                } else {
                    LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        items(displayedProducts) { product ->
                            StockProductCard(
                                product = product,
                                onClick = { stockViewModel.setEditingProduct(product) }
                            )
                        }
                    }
                }
            }
        }
    }

    // Edit Product Bottom Sheet
    val editingProduct = uiState.editingProduct
    if (editingProduct != null) {
        var editName by remember(editingProduct) { mutableStateOf(editingProduct.name) }
        var editBuyingPrice by remember(editingProduct) { mutableStateOf(editingProduct.buyingPrice.toString()) }
        var editSellingPrice by remember(editingProduct) { mutableStateOf(editingProduct.sellingPrice.toString()) }
        var editQuantity by remember(editingProduct) { mutableStateOf(editingProduct.quantity.toString()) }
        var editLowStock by remember(editingProduct) { mutableStateOf(editingProduct.lowStock.toString()) }
        var editSku by remember(editingProduct) { mutableStateOf(editingProduct.sku ?: "") }
        var editImagePath by remember(editingProduct) { mutableStateOf(editingProduct.imageUrl) }
        var showDeleteConfirm by remember { mutableStateOf(false) }

        if (showDeleteConfirm) {
            AlertDialog(
                onDismissRequest = { showDeleteConfirm = false },
                title = { Text("Delete Product?") },
                text = { Text("Are you sure you want to delete '${editingProduct.name}'? This action cannot be undone.") },
                confirmButton = {
                    TextButton(
                        onClick = {
                            stockViewModel.deleteProduct(editingProduct.id)
                            showDeleteConfirm = false
                        }
                    ) {
                        Text("Delete", color = MaterialTheme.colorScheme.error, fontWeight = FontWeight.Bold)
                    }
                },
                dismissButton = {
                    TextButton(onClick = { showDeleteConfirm = false }) {
                        Text("Cancel")
                    }
                }
            )
        }

        ModalBottomSheet(
            onDismissRequest = { stockViewModel.setEditingProduct(null) },
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
                        text = "Edit Product",
                        style = MaterialTheme.typography.headlineMedium,
                        fontWeight = FontWeight.Bold
                    )
                    IconButton(onClick = { showDeleteConfirm = true }) {
                        Icon(
                            imageVector = Icons.Default.Delete,
                            contentDescription = "Delete Product",
                            tint = MaterialTheme.colorScheme.error
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
                            val bp = editBuyingPrice.toDoubleOrNull() ?: editingProduct.buyingPrice
                            val sp = editSellingPrice.toDoubleOrNull() ?: editingProduct.sellingPrice
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
        ModalBottomSheet(
            onDismissRequest = { stockViewModel.setAddProductOpen(false) },
            shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)
        ) {
            Column(
                modifier = Modifier
                    .padding(horizontal = 24.dp, vertical = 16.dp)
                    .fillMaxWidth()
            ) {
                Text(
                    text = "Add New Product",
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold
                )

                Spacer(modifier = Modifier.height(16.dp))

                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Product Name") },
                    placeholder = { Text("e.g. Milk 1L, Bread 500g") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp),
                    singleLine = true
                )

                Spacer(modifier = Modifier.height(12.dp))

                ProductImagePicker(imagePath = imagePath, onImagePicked = { imagePath = it })

                Spacer(modifier = Modifier.height(12.dp))

                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    OutlinedTextField(
                        value = buyingPrice,
                        onValueChange = { buyingPrice = it },
                        label = { Text("Buying Cost") },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(14.dp),
                        singleLine = true
                    )
                    OutlinedTextField(
                        value = sellingPrice,
                        onValueChange = { sellingPrice = it },
                        label = { Text("Selling Price") },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(14.dp),
                        singleLine = true
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))

                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    OutlinedTextField(
                        value = quantity,
                        onValueChange = { quantity = it },
                        label = { Text("Initial Stock Qty") },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(14.dp),
                        singleLine = true
                    )
                    OutlinedTextField(
                        value = lowStockThreshold,
                        onValueChange = { lowStockThreshold = it },
                        label = { Text("Low Alert Qty") },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(14.dp),
                        singleLine = true
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = sku,
                    onValueChange = { sku = it },
                    label = { Text("SKU / Barcode (Optional)") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp),
                    singleLine = true
                )

                Spacer(modifier = Modifier.height(24.dp))

                AideButton(
                    text = "Save Product to Inventory",
                    onClick = {
                        val bp = buyingPrice.toDoubleOrNull() ?: 0.0
                        val sp = sellingPrice.toDoubleOrNull() ?: 0.0
                        val qty = quantity.toIntOrNull() ?: 0
                        val alertQty = lowStockThreshold.toIntOrNull() ?: 5
                        if (name.isNotBlank() && sp > 0) {
                            stockViewModel.addProduct(
                                name = name,
                                buyingPrice = bp,
                                sellingPrice = sp,
                                quantity = qty,
                                lowStock = alertQty,
                                sku = sku.ifBlank { null },
                                imagePath = imagePath
                            )
                            name = ""
                            buyingPrice = ""
                            sellingPrice = ""
                            quantity = ""
                            sku = ""
                            imagePath = null
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
                        text = money(product.sellingPrice),
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
