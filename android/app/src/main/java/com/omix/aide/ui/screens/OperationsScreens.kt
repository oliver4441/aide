package com.omix.aide.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.FactCheck
import androidx.compose.material.icons.filled.MoveToInbox
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material.icons.filled.VerifiedUser
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.omix.aide.data.local.MobileApprovalStatus
import com.omix.aide.data.local.MobileShiftStatus
import com.omix.aide.data.local.converters.asMoney
import com.omix.aide.data.local.entities.ProductEntity
import com.omix.aide.domain.ia.EmployeeRole
import com.omix.aide.domain.ia.MobilePermission
import com.omix.aide.ui.components.AideBadge
import com.omix.aide.ui.components.AideCard
import com.omix.aide.ui.components.AideEmptyState
import com.omix.aide.ui.components.OperatingLocationNotice
import com.omix.aide.ui.money
import com.omix.aide.ui.theme.DangerRed
import com.omix.aide.ui.theme.WarningAmber
import com.omix.aide.ui.viewmodel.OperationsViewModel

/**
 * 1. Read-Only Product Lookup & Scan Screen (`lookup`).
 * Safe for cashiers, receiving clerks, and warehouse staff: checks SKU/barcode,
 * retail price, and shelf quantity without exposing cost prices or edit/delete actions.
 */
@Composable
fun ProductLookupScreen(
    operationsViewModel: OperationsViewModel,
    onAddToSale: ((ProductEntity) -> Unit)? = null
) {
    val uiState by operationsViewModel.uiState.collectAsState()
    val context = uiState.activeContext
    val canSell = context.hasPermission(MobilePermission.SALE_CREATE) && onAddToSale != null
    val canViewCost = context.hasPermission(MobilePermission.PRODUCT_UPDATE) ||
        context.hasPermission(MobilePermission.REPORT_READ)

    val filteredProducts = uiState.filteredProducts

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
            .testTag("screen_product_lookup"),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        OperatingLocationNotice(
            context = context,
            actionSummary = "Price & Stock Check (Read-Only)"
        )

        OutlinedTextField(
            value = uiState.lookupQuery,
            onValueChange = { operationsViewModel.setLookupQuery(it) },
            placeholder = { Text("Scan barcode, SKU, or type product name...") },
            leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
            trailingIcon = { Icon(Icons.Default.QrCodeScanner, contentDescription = "Barcode ready") },
            singleLine = true,
            modifier = Modifier
                .fillMaxWidth()
                .testTag("lookup_search_input")
        )

        if (filteredProducts.isEmpty()) {
            AideEmptyState(
                message = if (uiState.products.isEmpty()) {
                    "No products are stocked in ${context.branchName} yet."
                } else {
                    "No products match \"${uiState.lookupQuery}\" in ${context.branchName}."
                }
            )
        } else {
            LazyColumn(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                items(filteredProducts, key = { it.id }) { product ->
                    val isLow = product.quantity <= product.lowStock
                    AideCard(modifier = Modifier.testTag("lookup_item_${product.id}")) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(14.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = product.name,
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold
                                )
                                Text(
                                    text = product.sku?.takeIf { it.isNotBlank() } ?: "No SKU",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Row(
                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    AideBadge(
                                        text = if (product.quantity <= 0) {
                                            "Out of stock"
                                        } else {
                                            "${product.quantity} in stock"
                                        },
                                        containerColor = when {
                                            product.quantity <= 0 -> DangerRed.copy(alpha = 0.16f)
                                            isLow -> WarningAmber.copy(alpha = 0.18f)
                                            else -> MaterialTheme.colorScheme.secondaryContainer
                                        },
                                        contentColor = when {
                                            product.quantity <= 0 -> DangerRed
                                            isLow -> WarningAmber
                                            else -> MaterialTheme.colorScheme.onSecondaryContainer
                                        }
                                    )
                                    if (canViewCost) {
                                        Text(
                                            text = "Cost ${money(product.buyingPrice.asMoney())}",
                                            style = MaterialTheme.typography.labelSmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant
                                        )
                                    }
                                }
                            }

                            Column(horizontalAlignment = Alignment.End) {
                                Text(
                                    text = money(product.sellingPrice.asMoney()),
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.primary
                                )
                                if (canSell && product.quantity > 0) {
                                    Spacer(modifier = Modifier.height(6.dp))
                                    OutlinedButton(
                                        onClick = { onAddToSale?.invoke(product) },
                                        modifier = Modifier.testTag("lookup_add_to_sale_${product.id}")
                                    ) {
                                        Icon(
                                            Icons.Default.ShoppingCart,
                                            contentDescription = null,
                                            modifier = Modifier.size(16.dp)
                                        )
                                        Spacer(modifier = Modifier.width(4.dp))
                                        Text("Sell")
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

/**
 * 2. Goods Receipt Workflow (`receive-goods`).
 * Allows warehouse operators, receiving clerks, inventory controllers, branch managers,
 * and owners to receive supplier deliveries into the active warehouse/branch with GRN audit records.
 */
@Composable
fun ReceiveGoodsScreen(operationsViewModel: OperationsViewModel) {
    val uiState by operationsViewModel.uiState.collectAsState()
    val context = uiState.activeContext
    val focusManager = LocalFocusManager.current

    var selectedProductId by remember { mutableStateOf<String?>(null) }
    var supplierName by remember { mutableStateOf("") }
    var referenceNumber by remember { mutableStateOf("") }
    var quantityReceived by remember { mutableStateOf("") }
    var productFilter by remember { mutableStateOf("") }

    val matchingProducts = remember(uiState.products, productFilter) {
        val q = productFilter.trim()
        if (q.isEmpty()) uiState.products else uiState.products.filter {
            it.name.contains(q, ignoreCase = true) ||
                (it.sku?.contains(q, ignoreCase = true) == true)
        }
    }
    val selectedProduct = matchingProducts.firstOrNull { it.id == selectedProductId }
        ?: uiState.products.firstOrNull { it.id == selectedProductId }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
            .testTag("screen_receive_goods"),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            OperatingLocationNotice(
                context = context,
                actionSummary = "Inbound Goods Receipt (GRN)"
            )
        }

        uiState.feedbackMessage?.let { msg ->
            item {
                FeedbackBanner(
                    message = msg,
                    isError = false,
                    onDismiss = { operationsViewModel.clearMessages() }
                )
            }
        }
        uiState.errorMessage?.let { err ->
            item {
                FeedbackBanner(
                    message = err,
                    isError = true,
                    onDismiss = { operationsViewModel.clearMessages() }
                )
            }
        }

        item {
            AideCard {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Text(
                        text = "Record Supplier Delivery",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )

                    OutlinedTextField(
                        value = supplierName,
                        onValueChange = { supplierName = it },
                        label = { Text("Supplier Name *") },
                        singleLine = true,
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("grn_supplier_input")
                    )

                    OutlinedTextField(
                        value = referenceNumber,
                        onValueChange = { referenceNumber = it },
                        label = { Text("Delivery Note / PO Reference") },
                        singleLine = true,
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("grn_reference_input")
                    )

                    OutlinedTextField(
                        value = productFilter,
                        onValueChange = { productFilter = it },
                        label = { Text("Find SKU or Product to Receive") },
                        leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                        singleLine = true,
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("grn_product_search")
                    )

                    if (matchingProducts.isEmpty()) {
                        Text(
                            text = "No matching SKUs in ${context.branchName}. Ask an inventory controller or manager to register new SKUs first.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    } else {
                        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            matchingProducts.take(5).forEach { prod ->
                                val isSelected = selectedProduct?.id == prod.id
                                FilterChip(
                                    selected = isSelected,
                                    onClick = { selectedProductId = prod.id },
                                    label = {
                                        Text("${prod.name} (${prod.quantity} on hand)")
                                    },
                                    modifier = Modifier.testTag("grn_select_product_${prod.id}")
                                )
                            }
                        }
                    }

                    OutlinedTextField(
                        value = quantityReceived,
                        onValueChange = { quantityReceived = it },
                        label = { Text("Quantity Received *") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        singleLine = true,
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("grn_quantity_input")
                    )

                    Button(
                        onClick = {
                            focusManager.clearFocus()
                            val prod = selectedProduct ?: matchingProducts.firstOrNull()
                            val qty = quantityReceived.trim().toIntOrNull() ?: 0
                            if (prod != null) {
                                operationsViewModel.receiveGoods(
                                    product = prod,
                                    supplierName = supplierName,
                                    referenceNumber = referenceNumber.ifBlank { "DN-LOCAL" },
                                    quantityReceived = qty,
                                    unitCost = prod.buyingPrice.asMoney()
                                )
                                quantityReceived = ""
                                referenceNumber = ""
                            }
                        },
                        enabled = (selectedProduct != null || matchingProducts.size == 1) &&
                            supplierName.isNotBlank() &&
                            (quantityReceived.trim().toIntOrNull() ?: 0) > 0,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp)
                            .testTag("grn_submit_button")
                    ) {
                        Icon(Icons.Default.MoveToInbox, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Post Goods Receipt")
                    }
                }
            }
        }

        item {
            Text(
                text = "Recent Goods Receipts (${uiState.goodsReceipts.size})",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
        }

        if (uiState.goodsReceipts.isEmpty()) {
            item {
                AideEmptyState(
                    message = "No goods receipts posted yet in ${context.warehouseName ?: context.branchName}."
                )
            }
        } else {
            items(uiState.goodsReceipts, key = { it.id }) { grn ->
                AideCard(modifier = Modifier.testTag("grn_row_${grn.grnNumber}")) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(14.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "${grn.grnNumber} · ${grn.productName}",
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = "${grn.supplierName} · ${grn.warehouseName}",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            if (grn.referenceNumber.isNotBlank()) {
                                Text(
                                    text = "Ref: ${grn.referenceNumber}",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                        AideBadge(
                            text = "+${grn.quantityReceived}",
                            containerColor = MaterialTheme.colorScheme.primaryContainer,
                            contentColor = MaterialTheme.colorScheme.onPrimaryContainer
                        )
                    }
                }
            }
        }
    }
}

/**
 * 3. Cycle Stock Count Workflow (`stock-count`).
 * Records physical shelf/bin counts. Automatically reconciles inventory when the
 * employee holds `STOCK_ADJUST_CREATE`; otherwise queues a manager approval request!
 */
@Composable
fun StockCountScreen(operationsViewModel: OperationsViewModel) {
    val uiState by operationsViewModel.uiState.collectAsState()
    val context = uiState.activeContext
    val canDirectAdjust = context.hasPermission(MobilePermission.STOCK_ADJUST_CREATE)

    var selectedProductId by remember { mutableStateOf<String?>(null) }
    var countedQty by remember { mutableStateOf("") }
    var reason by remember { mutableStateOf("Routine cycle count") }
    var search by remember { mutableStateOf("") }

    val matchingProducts = remember(uiState.products, search) {
        val q = search.trim()
        if (q.isEmpty()) uiState.products else uiState.products.filter {
            it.name.contains(q, ignoreCase = true) ||
                (it.sku?.contains(q, ignoreCase = true) == true)
        }
    }
    val selectedProduct = matchingProducts.firstOrNull { it.id == selectedProductId }
        ?: uiState.products.firstOrNull { it.id == selectedProductId }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
            .testTag("screen_stock_count"),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            OperatingLocationNotice(
                context = context,
                actionSummary = if (canDirectAdjust) {
                    "Physical Count & Direct Variance Reconciliation"
                } else {
                    "Physical Count (Variances route for Manager Approval)"
                }
            )
        }

        uiState.feedbackMessage?.let { msg ->
            item {
                FeedbackBanner(
                    message = msg,
                    isError = false,
                    onDismiss = { operationsViewModel.clearMessages() }
                )
            }
        }
        uiState.errorMessage?.let { err ->
            item {
                FeedbackBanner(
                    message = err,
                    isError = true,
                    onDismiss = { operationsViewModel.clearMessages() }
                )
            }
        }

        item {
            AideCard {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Text(
                        text = "Record Physical Bin / Shelf Count",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )

                    OutlinedTextField(
                        value = search,
                        onValueChange = { search = it },
                        label = { Text("Scan or Search SKU") },
                        leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                        singleLine = true,
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("count_product_search")
                    )

                    if (matchingProducts.isNotEmpty()) {
                        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            matchingProducts.take(5).forEach { prod ->
                                FilterChip(
                                    selected = selectedProduct?.id == prod.id,
                                    onClick = { selectedProductId = prod.id },
                                    label = {
                                        Text("${prod.name} (System: ${prod.quantity})")
                                    },
                                    modifier = Modifier.testTag("count_select_product_${prod.id}")
                                )
                            }
                        }
                    }

                    OutlinedTextField(
                        value = countedQty,
                        onValueChange = { countedQty = it },
                        label = { Text("Physical Counted Quantity *") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        singleLine = true,
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("count_quantity_input")
                    )

                    OutlinedTextField(
                        value = reason,
                        onValueChange = { reason = it },
                        label = { Text("Count Note / Variance Reason") },
                        singleLine = true,
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("count_reason_input")
                    )

                    Button(
                        onClick = {
                            val prod = selectedProduct ?: matchingProducts.firstOrNull()
                            val qty = countedQty.trim().toIntOrNull()
                            if (prod != null && qty != null && qty >= 0) {
                                operationsViewModel.submitStockCount(
                                    product = prod,
                                    countedQuantity = qty,
                                    reason = reason
                                )
                                countedQty = ""
                            }
                        },
                        enabled = (selectedProduct != null || matchingProducts.size == 1) &&
                            (countedQty.trim().toIntOrNull()?.let { it >= 0 } == true),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp)
                            .testTag("count_submit_button")
                    ) {
                        Icon(Icons.Default.FactCheck, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(if (canDirectAdjust) "Save & Reconcile Count" else "Submit Count")
                    }
                }
            }
        }

        item {
            Text(
                text = "Recent Cycle Counts (${uiState.stockCounts.size})",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
        }

        if (uiState.stockCounts.isEmpty()) {
            item {
                AideEmptyState(
                    message = "No cycle counts logged yet in ${context.warehouseName ?: context.branchName}."
                )
            }
        } else {
            items(uiState.stockCounts, key = { it.id }) { record ->
                AideCard(modifier = Modifier.testTag("count_row_${record.countNumber}")) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(14.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "${record.countNumber} · ${record.productName}",
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = "System ${record.systemQuantity} → Counted ${record.countedQuantity} · ${record.reason}",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        val v = if (record.variance >= 0) "+${record.variance}" else "${record.variance}"
                        AideBadge(
                            text = if (record.appliedToStock) "Applied ($v)" else "Approval ($v)",
                            containerColor = if (record.appliedToStock) {
                                MaterialTheme.colorScheme.secondaryContainer
                            } else {
                                WarningAmber.copy(alpha = 0.2f)
                            },
                            contentColor = if (record.appliedToStock) {
                                MaterialTheme.colorScheme.onSecondaryContainer
                            } else {
                                WarningAmber
                            }
                        )
                    }
                }
            }
        }
    }
}

/**
 * 4. Assigned Daily Tasks Queue (`tasks`).
 * Displays role-scoped operational checklist items and links directly into each task's workflow.
 */
@Composable
fun TasksScreen(
    operationsViewModel: OperationsViewModel,
    onNavigateToWorkflow: ((String) -> Unit)? = null
) {
    val uiState by operationsViewModel.uiState.collectAsState()
    val context = uiState.activeContext
    val canComplete = context.hasPermission(MobilePermission.TASK_COMPLETE)

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
            .testTag("screen_tasks"),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        OperatingLocationNotice(
            context = context,
            actionSummary = "${context.role.title} Daily Task Queue"
        )

        uiState.errorMessage?.let { err ->
            FeedbackBanner(
                message = err,
                isError = true,
                onDismiss = { operationsViewModel.clearMessages() }
            )
        }

        if (uiState.roleTasks.isEmpty()) {
            AideEmptyState(
                message = "No tasks assigned to ${context.role.title} in ${context.branchName}."
            )
        } else {
            LazyColumn(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                items(uiState.roleTasks, key = { it.id }) { task ->
                    AideCard(
                        modifier = Modifier.testTag("task_item_${task.id}"),
                        onClick = if (onNavigateToWorkflow != null) {
                            { onNavigateToWorkflow(task.targetRoute) }
                        } else null
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(14.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Checkbox(
                                checked = task.completed,
                                enabled = canComplete,
                                onCheckedChange = { checked ->
                                    operationsViewModel.setTaskCompleted(task.id, checked)
                                },
                                modifier = Modifier.testTag("task_checkbox_${task.id}")
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = task.title,
                                    style = MaterialTheme.typography.titleSmall,
                                    fontWeight = FontWeight.Bold
                                )
                                Text(
                                    text = task.description,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                            AideBadge(
                                text = if (task.completed) "Done" else task.priority.label,
                                containerColor = if (task.completed) {
                                    MaterialTheme.colorScheme.secondaryContainer
                                } else {
                                    MaterialTheme.colorScheme.primaryContainer
                                },
                                contentColor = if (task.completed) {
                                    MaterialTheme.colorScheme.onSecondaryContainer
                                } else {
                                    MaterialTheme.colorScheme.onPrimaryContainer
                                }
                            )
                            if (onNavigateToWorkflow != null) {
                                Spacer(modifier = Modifier.width(4.dp))
                                Icon(
                                    imageVector = Icons.Default.ChevronRight,
                                    contentDescription = "Open task workflow",
                                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

/**
 * 5. Till Shift Management (`shifts`).
 * Open till float, track active cashier session, count closing cash, and view variance.
 */
@Composable
fun ShiftsScreen(operationsViewModel: OperationsViewModel) {
    val uiState by operationsViewModel.uiState.collectAsState()
    val context = uiState.activeContext
    val focusManager = LocalFocusManager.current
    val openShift = uiState.openShift
    val canOpen = context.hasPermission(MobilePermission.SHIFT_OPEN)
    val canClose = context.hasPermission(MobilePermission.SHIFT_CLOSE)

    var openingFloatInput by remember { mutableStateOf("0") }
    var closingCashInput by remember { mutableStateOf("") }
    var closingNote by remember { mutableStateOf("") }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
            .testTag("screen_shifts"),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            OperatingLocationNotice(
                context = context,
                actionSummary = "Cashier Till Shift & Drawer Reconciliation"
            )
        }

        uiState.feedbackMessage?.let { msg ->
            item {
                FeedbackBanner(
                    message = msg,
                    isError = false,
                    onDismiss = { operationsViewModel.clearMessages() }
                )
            }
        }
        uiState.errorMessage?.let { err ->
            item {
                FeedbackBanner(
                    message = err,
                    isError = true,
                    onDismiss = { operationsViewModel.clearMessages() }
                )
            }
        }

        item {
            if (openShift == null) {
                AideCard {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Text(
                            text = "Open Till Shift (${context.terminalName ?: "Till 01"})",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "Count your starting cash float before ringing sales on this terminal.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        if (canOpen) {
                            OutlinedTextField(
                                value = openingFloatInput,
                                onValueChange = { openingFloatInput = it },
                                label = { Text("Opening Float Amount") },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                                singleLine = true,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .testTag("shift_opening_float_input")
                            )
                            Button(
                                onClick = {
                                    focusManager.clearFocus()
                                    val amount = openingFloatInput.trim().toDoubleOrNull() ?: 0.0
                                    operationsViewModel.openShift(amount)
                                },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(48.dp)
                                    .testTag("shift_open_button")
                            ) {
                                Icon(Icons.Default.Schedule, contentDescription = null)
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Open Shift")
                            }
                        } else {
                            Text(
                                text = "No shift is currently open on this terminal.",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            } else {
                val expectedDrawer = openShift.openingFloat + uiState.currentShiftCashSales
                AideCard {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "Active Shift ${openShift.shiftNo} · ${openShift.terminalName}",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold
                            )
                            AideBadge(text = "OPEN")
                        }
                        Text(
                            text = "Opening float ${money(openShift.openingFloat)} + Cash sales ${money(uiState.currentShiftCashSales)} = Expected ${money(expectedDrawer)}",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )

                        if (canClose) {
                            OutlinedTextField(
                                value = closingCashInput,
                                onValueChange = { closingCashInput = it },
                                label = { Text("Counted Closing Cash *") },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                                singleLine = true,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .testTag("shift_closing_cash_input")
                            )
                            OutlinedTextField(
                                value = closingNote,
                                onValueChange = { closingNote = it },
                                label = { Text("Handover / Variance Note (optional)") },
                                singleLine = true,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .testTag("shift_closing_note_input")
                            )
                            Button(
                                onClick = {
                                    val counted = closingCashInput.trim().toDoubleOrNull() ?: return@Button
                                    operationsViewModel.closeShift(
                                        countedCash = counted,
                                        notes = closingNote.ifBlank { null }
                                    )
                                    closingCashInput = ""
                                    closingNote = ""
                                },
                                enabled = closingCashInput.trim().toDoubleOrNull()?.let { it >= 0.0 } == true,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(48.dp)
                                    .testTag("shift_close_button")
                            ) {
                                Icon(Icons.Default.CheckCircle, contentDescription = null)
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Close Shift & Reconcile Drawer")
                            }
                        }
                    }
                }
            }
        }

        item {
            Text(
                text = "Shift History (${uiState.shiftHistory.size})",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
        }

        items(uiState.shiftHistory, key = { it.id }) { shift ->
            AideCard(modifier = Modifier.testTag("shift_row_${shift.id}")) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(14.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "${shift.shiftNo} · ${shift.terminalName} (${shift.openedByName})",
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = if (shift.status == MobileShiftStatus.OPEN) {
                                "Opened with float ${money(shift.openingFloat)}"
                            } else {
                                "Counted ${money(shift.closingCashCounted ?: 0.0)} (Expected ${money(shift.expectedCash ?: 0.0)})"
                            },
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    AideBadge(text = shift.status.name)
                }
            }
        }
    }
}

private val APPROVAL_TYPES = listOf(
    "PRICE_OVERRIDE" to "Discount",
    "SALE_REFUND" to "Refund",
    "STOCK_VARIANCE" to "Stock Variance"
)

/**
 * 6. Approvals Inbox & Request Screen (`approvals`).
 * Supports Separation of Duties: frontline roles submit requests (`APPROVAL_REQUEST`)
 * while managers/owners review and decide (`APPROVAL_DECIDE`).
 */
@Composable
fun ApprovalsScreen(operationsViewModel: OperationsViewModel) {
    val uiState by operationsViewModel.uiState.collectAsState()
    val context = uiState.activeContext
    val canRequest = context.hasPermission(MobilePermission.APPROVAL_REQUEST)
    val canDecide = context.hasPermission(MobilePermission.APPROVAL_DECIDE)

    var showRequestDialog by remember { mutableStateOf(false) }
    var reqTitle by remember { mutableStateOf("") }
    var reqReason by remember { mutableStateOf("") }
    var reqAmount by remember { mutableStateOf("") }
    var reqActionType by remember { mutableStateOf("PRICE_OVERRIDE") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
            .testTag("screen_approvals"),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = if (canDecide) "Approvals Inbox" else "My Approval Requests",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = context.operatingLocationLabel,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            if (canRequest) {
                Button(
                    onClick = { showRequestDialog = true },
                    modifier = Modifier.testTag("approvals_new_request_button")
                ) {
                    Icon(Icons.Default.VerifiedUser, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Request")
                }
            }
        }

        uiState.feedbackMessage?.let { msg ->
            FeedbackBanner(
                message = msg,
                isError = false,
                onDismiss = { operationsViewModel.clearMessages() }
            )
        }
        uiState.errorMessage?.let { err ->
            FeedbackBanner(
                message = err,
                isError = true,
                onDismiss = { operationsViewModel.clearMessages() }
            )
        }

        if (uiState.approvals.isEmpty()) {
            AideEmptyState(
                message = if (canDecide) {
                    "No pending or historical approval requests in ${context.branchName}."
                } else {
                    "No approval requests submitted yet. Request manager approval for price overrides, refunds, or stock variances."
                },
                actionLabel = if (canRequest) "Request Approval" else null,
                onAction = if (canRequest) { { showRequestDialog = true } } else null
            )
        } else {
            LazyColumn(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                items(uiState.approvals, key = { it.id }) { req ->
                    val isPending = req.status == MobileApprovalStatus.PENDING
                    val isSelfBlocked = req.requestedByMembershipId == context.membershipId &&
                        context.role != EmployeeRole.OWNER_ADMIN
                    AideCard(modifier = Modifier.testTag("approval_card_${req.id}")) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(14.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "${req.requestNo} · ${req.title}",
                                    style = MaterialTheme.typography.titleSmall,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.weight(1f)
                                )
                                AideBadge(
                                    text = req.status.name,
                                    containerColor = when (req.status) {
                                        MobileApprovalStatus.PENDING -> WarningAmber.copy(alpha = 0.2f)
                                        MobileApprovalStatus.APPROVED -> MaterialTheme.colorScheme.secondaryContainer
                                        MobileApprovalStatus.REJECTED -> DangerRed.copy(alpha = 0.16f)
                                    },
                                    contentColor = when (req.status) {
                                        MobileApprovalStatus.PENDING -> WarningAmber
                                        MobileApprovalStatus.APPROVED -> MaterialTheme.colorScheme.onSecondaryContainer
                                        MobileApprovalStatus.REJECTED -> DangerRed
                                    }
                                )
                            }

                            Text(
                                text = "${req.actionType.replace('_', ' ')} · Requested by ${req.requestedByName} (${req.requestedByRole.title})",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )

                            Text(
                                text = req.reason,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )

                            if (req.amount > 0.0) {
                                Text(
                                    text = "Impact: ${money(req.amount)}",
                                    style = MaterialTheme.typography.labelMedium,
                                    fontWeight = FontWeight.SemiBold
                                )
                            }

                            if (isPending && canDecide) {
                                if (isSelfBlocked) {
                                    Text(
                                        text = "Separation of duties: another manager or owner must review your own request.",
                                        style = MaterialTheme.typography.labelSmall,
                                        color = WarningAmber
                                    )
                                } else {
                                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                        Button(
                                            onClick = {
                                                operationsViewModel.decideApproval(
                                                    requestId = req.id,
                                                    approve = true
                                                )
                                            },
                                            modifier = Modifier
                                                .weight(1f)
                                                .testTag("approval_approve_${req.id}")
                                        ) {
                                            Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(16.dp))
                                            Spacer(modifier = Modifier.width(4.dp))
                                            Text("Approve")
                                        }
                                        OutlinedButton(
                                            onClick = {
                                                operationsViewModel.decideApproval(
                                                    requestId = req.id,
                                                    approve = false
                                                )
                                            },
                                            colors = ButtonDefaults.outlinedButtonColors(contentColor = DangerRed),
                                            modifier = Modifier
                                                .weight(1f)
                                                .testTag("approval_reject_${req.id}")
                                        ) {
                                            Icon(Icons.Default.Close, contentDescription = null, modifier = Modifier.size(16.dp))
                                            Spacer(modifier = Modifier.width(4.dp))
                                            Text("Reject")
                                        }
                                    }
                                }
                            } else if (!isPending && req.decidedByRole != null) {
                                Text(
                                    text = "${req.status.name.lowercase().replaceFirstChar { it.uppercase() }} by ${req.decidedByRole.title}",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    if (showRequestDialog) {
        AlertDialog(
            onDismissRequest = { showRequestDialog = false },
            title = { Text("Request Manager Approval") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        APPROVAL_TYPES.forEach { (code, label) ->
                            FilterChip(
                                selected = reqActionType == code,
                                onClick = { reqActionType = code },
                                label = { Text(label) }
                            )
                        }
                    }
                    OutlinedTextField(
                        value = reqTitle,
                        onValueChange = { reqTitle = it },
                        label = { Text("Summary *") },
                        singleLine = true,
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("approval_summary_input")
                    )
                    OutlinedTextField(
                        value = reqReason,
                        onValueChange = { reqReason = it },
                        label = { Text("Reason / Receipt or Bin Reference *") },
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("approval_details_input")
                    )
                    OutlinedTextField(
                        value = reqAmount,
                        onValueChange = { reqAmount = it },
                        label = { Text("Value Impact (optional)") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        operationsViewModel.requestApproval(
                            actionType = reqActionType,
                            title = reqTitle,
                            reason = reqReason,
                            amount = reqAmount.trim().toDoubleOrNull() ?: 0.0
                        )
                        reqTitle = ""
                        reqReason = ""
                        reqAmount = ""
                        showRequestDialog = false
                    },
                    enabled = reqTitle.isNotBlank() && reqReason.isNotBlank(),
                    modifier = Modifier.testTag("approval_submit_request_button")
                ) {
                    Text("Submit Request")
                }
            },
            dismissButton = {
                TextButton(onClick = { showRequestDialog = false }) { Text("Cancel") }
            }
        )
    }
}

@Composable
private fun FeedbackBanner(
    message: String,
    isError: Boolean,
    onDismiss: () -> Unit
) {
    val tint = if (isError) DangerRed else MaterialTheme.colorScheme.primary
    AideCard(borderColor = tint.copy(alpha = 0.5f)) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 14.dp, vertical = 10.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = message,
                style = MaterialTheme.typography.bodySmall,
                color = tint,
                modifier = Modifier.weight(1f)
            )
            TextButton(onClick = onDismiss) {
                Text("Dismiss")
            }
        }
    }
}
