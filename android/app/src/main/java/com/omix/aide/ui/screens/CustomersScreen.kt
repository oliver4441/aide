package com.omix.aide.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.omix.aide.ui.components.AideCard
import com.omix.aide.ui.components.AideEmptyState
import com.omix.aide.ui.components.AideSearchBar
import com.omix.aide.ui.components.AideStatCard
import com.omix.aide.ui.components.LoadingState
import com.omix.aide.ui.theme.DangerRed
import com.omix.aide.ui.viewmodel.CustomerViewModel

/**
 * The local customer directory. Another of the four More-menu rows whose
 * onClick was an empty lambda.
 */
@Composable
fun CustomersScreen(
    customerViewModel: CustomerViewModel,
    onBack: () -> Unit
) {
    val uiState by customerViewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            Row(
                modifier = Modifier.fillMaxWidth().padding(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                TextButton(onClick = onBack) { Text("Back") }
                Text(
                    text = "Customers",
                    style = MaterialTheme.typography.headlineMedium,
                    modifier = Modifier.weight(1f)
                )
            }
        },
        floatingActionButton = {
            if (!uiState.isLoading) {
                ExtendedFloatingActionButton(
                    onClick = { customerViewModel.setAddOpen(true) },
                    icon = { Icon(Icons.Default.Add, contentDescription = null) },
                    text = { Text("Add") }
                )
            }
        }
    ) { padding ->
        if (uiState.isLoading) {
            LoadingState(Modifier.padding(padding))
            return@Scaffold
        }

        Column(Modifier.fillMaxSize().padding(padding).padding(16.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                AideStatCard(
                    title = "Total owed",
                    value = "KSh ${"%.2f".format(uiState.totalOwed)}",
                    modifier = Modifier.weight(1f),
                    valueColor = if (uiState.totalOwed > 0.0) DangerRed
                    else MaterialTheme.colorScheme.onSurface
                )
                AideStatCard(
                    title = "Owing",
                    value = uiState.owingCount.toString(),
                    modifier = Modifier.weight(1f)
                )
            }

            Spacer(Modifier.height(12.dp))

            AideSearchBar(
                query = uiState.searchQuery,
                onQueryChange = customerViewModel::setSearchQuery,
                placeholder = "Search customers..."
            )

            Spacer(Modifier.height(12.dp))

            if (uiState.customers.isEmpty()) {
                AideEmptyState(
                    message = if (uiState.searchQuery.isBlank()) {
                        "No customers yet."
                    } else {
                        "No customers match \"${uiState.searchQuery}\"."
                    },
                    actionLabel = if (uiState.searchQuery.isBlank()) "Add a customer" else null,
                    onAction = if (uiState.searchQuery.isBlank()) {
                        { customerViewModel.setAddOpen(true) }
                    } else {
                        null
                    }
                )
            } else {
                LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(uiState.customers, key = { it.id }) { customer ->
                        AideCard {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    Icons.Default.Person,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.primary
                                )
                                Spacer(Modifier.width(12.dp))
                                Column(
                                    Modifier.weight(1f).padding(start = 12.dp)
                                ) {
                                    Text(
                                        text = customer.name,
                                        style = MaterialTheme.typography.titleMedium,
                                        fontWeight = FontWeight.SemiBold
                                    )
                                    customer.phone?.let {
                                        Text(
                                            text = it,
                                            style = MaterialTheme.typography.bodyMedium,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant
                                        )
                                    }
                                    if (customer.balance != 0.0) {
                                        Text(
                                            text = if (customer.balance > 0) {
                                                "Owes KSh ${"%.2f".format(customer.balance)}"
                                            } else {
                                                "Credit KSh ${"%.2f".format(-customer.balance)}"
                                            },
                                            style = MaterialTheme.typography.labelMedium,
                                            fontWeight = FontWeight.SemiBold,
                                            color = if (customer.balance > 0) DangerRed
                                            else MaterialTheme.colorScheme.primary
                                        )
                                    }
                                }
                                IconButton(
                                    onClick = { customerViewModel.deleteCustomer(customer.id) },
                                    modifier = Modifier.height(48.dp)
                                ) {
                                    Icon(
                                        Icons.Default.Delete,
                                        contentDescription = "Delete customer",
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

    if (uiState.isAddOpen) {
        AddCustomerDialog(
            onDismiss = { customerViewModel.setAddOpen(false) },
            onSave = { name, phone, email, notes ->
                customerViewModel.addCustomer(name, phone, email, notes)
            }
        )
    }
}

@Composable
private fun AddCustomerDialog(
    onDismiss: () -> Unit,
    onSave: (String, String, String, String) -> Unit
) {
    var name by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var notes by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Add a customer") },
        text = {
            Column {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Name") },
                    singleLine = true
                )
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(
                    value = phone,
                    onValueChange = { phone = it },
                    label = { Text("Phone (optional)") },
                    singleLine = true
                )
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(
                    value = email,
                    onValueChange = { email = it },
                    label = { Text("Email (optional)") },
                    singleLine = true
                )
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(
                    value = notes,
                    onValueChange = { notes = it },
                    label = { Text("Notes (optional)") }
                )
            }
        },
        confirmButton = {
            TextButton(
                enabled = name.isNotBlank(),
                onClick = { onSave(name, phone, email, notes) }
            ) { Text("Save") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } }
    )
}