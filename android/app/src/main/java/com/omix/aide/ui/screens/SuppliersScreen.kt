package com.omix.aide.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.omix.aide.ui.components.*
import com.omix.aide.ui.money
import com.omix.aide.ui.viewmodel.SupplierViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SuppliersScreen(
    supplierViewModel: SupplierViewModel,
    onBack: () -> Unit
) {
    val uiState by supplierViewModel.uiState.collectAsState()
    var selectedTab by remember { mutableIntStateOf(0) }

    var supplierName by remember { mutableStateOf("") }
    var supplierPhone by remember { mutableStateOf("") }
    var supplierEmail by remember { mutableStateOf("") }
    var supplierAddress by remember { mutableStateOf("") }

    var poAmount by remember { mutableStateOf("") }
    var poNotes by remember { mutableStateOf("") }
    var selectedSupplierForPO by remember { mutableStateOf("") }

    Scaffold(
        topBar = {
            Surface(
                color = MaterialTheme.colorScheme.surface,
                tonalElevation = 2.dp
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back"
                        )
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Suppliers & Procurement",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        },
        floatingActionButton = {
            ExtendedFloatingActionButton(
                onClick = {
                    if (selectedTab == 0) supplierViewModel.setAddSupplierOpen(true)
                    else supplierViewModel.setAddPOOpen(true)
                },
                icon = { Icon(Icons.Default.Add, contentDescription = null) },
                text = { Text(if (selectedTab == 0) "Add Supplier" else "Create PO") },
                containerColor = MaterialTheme.colorScheme.primary
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
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

                TabRow(
                    selectedTabIndex = selectedTab,
                    containerColor = MaterialTheme.colorScheme.surfaceVariant
                ) {
                    Tab(
                        selected = selectedTab == 0,
                        onClick = { selectedTab = 0 },
                        text = { Text("Vendors (${uiState.suppliers.size})", fontWeight = FontWeight.Bold) }
                    )
                    Tab(
                        selected = selectedTab == 1,
                        onClick = { selectedTab = 1 },
                        text = { Text("Orders (${uiState.purchaseOrders.size})", fontWeight = FontWeight.Bold) }
                    )
                }

                Spacer(modifier = Modifier.height(14.dp))

                if (selectedTab == 0) {
                    AideSearchBar(
                        query = uiState.searchQuery,
                        onQueryChange = supplierViewModel::setSearchQuery,
                        placeholder = "Search suppliers..."
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    if (uiState.suppliers.isEmpty()) {
                        AideEmptyState(
                            message = "No suppliers registered yet.",
                            actionLabel = "Add Supplier",
                            onAction = { supplierViewModel.setAddSupplierOpen(true) }
                        )
                    } else {
                        LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            items(uiState.suppliers, key = { it.id }) { supplier ->
                                AideCard {
                                    Row(
                                        modifier = Modifier
                                            .padding(16.dp)
                                            .fillMaxWidth(),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Box(
                                            modifier = Modifier
                                                .size(44.dp)
                                                .clip(CircleShape)
                                                .background(MaterialTheme.colorScheme.primaryContainer),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Icon(
                                                imageVector = Icons.Default.LocalShipping,
                                                contentDescription = null,
                                                tint = MaterialTheme.colorScheme.onPrimaryContainer
                                            )
                                        }

                                        Spacer(modifier = Modifier.width(12.dp))

                                        Column(modifier = Modifier.weight(1f)) {
                                            Text(
                                                text = supplier.name,
                                                style = MaterialTheme.typography.titleMedium,
                                                fontWeight = FontWeight.Bold
                                            )
                                            if (!supplier.phone.isNullOrBlank()) {
                                                Text(
                                                    text = "Phone: ${supplier.phone}",
                                                    style = MaterialTheme.typography.bodySmall,
                                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                                )
                                            }
                                        }

                                        IconButton(onClick = { supplierViewModel.deleteSupplier(supplier.id) }) {
                                            Icon(
                                                imageVector = Icons.Default.Delete,
                                                contentDescription = "Delete",
                                                tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f)
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                } else {
                    if (uiState.purchaseOrders.isEmpty()) {
                        AideEmptyState(
                            message = "No purchase orders generated yet.",
                            actionLabel = "Create PO",
                            onAction = { supplierViewModel.setAddPOOpen(true) }
                        )
                    } else {
                        LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            items(uiState.purchaseOrders, key = { it.id }) { po ->
                                AideCard {
                                    Row(
                                        modifier = Modifier
                                            .padding(16.dp)
                                            .fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Column {
                                            Text(
                                                text = "PO #${po.id.takeLast(6).uppercase()}",
                                                style = MaterialTheme.typography.titleMedium,
                                                fontWeight = FontWeight.Bold
                                            )
                                            Text(
                                                text = "Supplier: ${po.supplierName}",
                                                style = MaterialTheme.typography.bodyMedium,
                                                color = MaterialTheme.colorScheme.onSurfaceVariant
                                            )
                                        }

                                        Column(horizontalAlignment = Alignment.End) {
                                            Text(
                                                text = money(po.totalAmount),
                                                style = MaterialTheme.typography.titleLarge,
                                                fontWeight = FontWeight.ExtraBold,
                                                color = MaterialTheme.colorScheme.primary
                                            )
                                            AideBadge(
                                                text = po.status,
                                                containerColor = MaterialTheme.colorScheme.primaryContainer,
                                                contentColor = MaterialTheme.colorScheme.onPrimaryContainer
                                            )
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

    if (uiState.isAddSupplierOpen) {
        ModalBottomSheet(onDismissRequest = { supplierViewModel.setAddSupplierOpen(false) }) {
            Column(modifier = Modifier.padding(24.dp).fillMaxWidth()) {
                Text("Add New Supplier", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(16.dp))
                OutlinedTextField(
                    value = supplierName,
                    onValueChange = { supplierName = it },
                    label = { Text("Supplier Name") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )
                Spacer(modifier = Modifier.height(10.dp))
                OutlinedTextField(
                    value = supplierPhone,
                    onValueChange = { supplierPhone = it },
                    label = { Text("Phone Number") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )
                Spacer(modifier = Modifier.height(10.dp))
                OutlinedTextField(
                    value = supplierAddress,
                    onValueChange = { supplierAddress = it },
                    label = { Text("Address / Location") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )
                Spacer(modifier = Modifier.height(20.dp))
                AideButton(
                    text = "Save Supplier",
                    onClick = {
                        if (supplierName.isNotBlank()) {
                            supplierViewModel.addSupplier(supplierName, supplierPhone, supplierEmail, supplierAddress)
                            supplierName = ""
                            supplierPhone = ""
                            supplierAddress = ""
                        }
                    }
                )
            }
        }
    }

    if (uiState.isAddPOOpen) {
        ModalBottomSheet(onDismissRequest = { supplierViewModel.setAddPOOpen(false) }) {
            Column(modifier = Modifier.padding(24.dp).fillMaxWidth()) {
                Text("Create Purchase Order", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(16.dp))
                OutlinedTextField(
                    value = selectedSupplierForPO,
                    onValueChange = { selectedSupplierForPO = it },
                    label = { Text("Supplier Name") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )
                Spacer(modifier = Modifier.height(10.dp))
                OutlinedTextField(
                    value = poAmount,
                    onValueChange = { poAmount = it },
                    label = { Text("Order Total Amount (KSh)") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )
                Spacer(modifier = Modifier.height(10.dp))
                OutlinedTextField(
                    value = poNotes,
                    onValueChange = { poNotes = it },
                    label = { Text("Order Notes / Items") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )
                Spacer(modifier = Modifier.height(20.dp))
                AideButton(
                    text = "Issue Purchase Order",
                    onClick = {
                        val amount = poAmount.toDoubleOrNull() ?: 0.0
                        if (selectedSupplierForPO.isNotBlank() && amount > 0) {
                            supplierViewModel.createPurchaseOrder(
                                supplierId = "sup_gen",
                                supplierName = selectedSupplierForPO,
                                amount = amount,
                                notes = poNotes
                            )
                            poAmount = ""
                            poNotes = ""
                            selectedSupplierForPO = ""
                        }
                    }
                )
            }
        }
    }
}
