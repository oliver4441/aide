package com.omix.aide.ui.screens

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.AssistChip
import androidx.compose.material3.AssistChipDefaults
import androidx.compose.material3.Checkbox
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.omix.aide.ui.money
import com.omix.aide.ui.components.AideButton
import com.omix.aide.ui.components.AideCard
import com.omix.aide.ui.components.AideEmptyState
import com.omix.aide.ui.components.AideStatCard
import com.omix.aide.ui.components.LoadingState
import com.omix.aide.ui.theme.DangerRed
import com.omix.aide.ui.viewmodel.ExpenseViewModel

private val EXPENSE_CATEGORIES = listOf(
    "Rent", "Utilities", "Transport", "Wages", "Restocking", "Marketing", "Repairs", "Other"
)

/**
 * Shop overheads. This was one of the four More-menu rows whose onClick was an
 * empty lambda, so the screen did not exist at all.
 */
@Composable
fun ExpensesScreen(
    expenseViewModel: ExpenseViewModel,
    onBack: () -> Unit
) {
    val uiState by expenseViewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            Row(
                modifier = Modifier.fillMaxWidth().padding(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                TextButton(onClick = onBack) { Text("Back") }
                Text(
                    text = "Expenses",
                    style = MaterialTheme.typography.headlineMedium,
                    modifier = Modifier.weight(1f)
                )
            }
        },
        floatingActionButton = {
            if (!uiState.isLoading) {
                ExtendedFloatingActionButton(
                    onClick = { expenseViewModel.setAddOpen(true) },
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

        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(padding).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    AideStatCard(
                        title = "Total spend",
                        value = money(uiState.total),
                        modifier = Modifier.weight(1f)
                    )
                    AideStatCard(
                        title = "Entries",
                        value = uiState.expenses.size.toString(),
                        modifier = Modifier.weight(1f)
                    )
                }
            }

            if (uiState.expenses.isEmpty()) {
                item {
                    AideEmptyState(
                        message = "No expenses recorded yet.",
                        actionLabel = "Add the first one",
                        onAction = { expenseViewModel.setAddOpen(true) }
                    )
                }
            } else {
                items(uiState.expenses, key = { it.id }) { expense ->
                    AideCard {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Column(Modifier.weight(1f)) {
                                Text(
                                    text = expense.category,
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.SemiBold
                                )
                                expense.description?.let {
                                    Text(
                                        text = it,
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                                if (expense.isCogs) {
                                    Text(
                                        text = "Cost of goods",
                                        style = MaterialTheme.typography.labelMedium,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }
                            Column(horizontalAlignment = Alignment.End) {
                                Text(
                                    text = money(expense.amount),
                                    style = MaterialTheme.typography.titleLarge,
                                    fontWeight = FontWeight.Bold,
                                    color = DangerRed
                                )
                                IconButton(
                                    onClick = { expenseViewModel.deleteExpense(expense.id) },
                                    modifier = Modifier.height(48.dp)
                                ) {
                                    Icon(
                                        Icons.Default.Delete,
                                        contentDescription = "Delete expense",
                                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }
                        }
                        Text(
                            text = expense.createdAt.take(10),
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        }
    }

    if (uiState.isAddOpen) {
        AddExpenseDialog(
            onDismiss = { expenseViewModel.setAddOpen(false) },
            onSave = { category, amount, description, notes, isCogs ->
                expenseViewModel.addExpense(category, amount, description, notes, isCogs)
            }
        )
    }
}

@Composable
private fun AddExpenseDialog(
    onDismiss: () -> Unit,
    onSave: (String, Double, String, String, Boolean) -> Unit
) {
    var category by remember { mutableStateOf(EXPENSE_CATEGORIES.first()) }
    var amount by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var notes by remember { mutableStateOf("") }
    var isCogs by remember { mutableStateOf(false) }

    val parsed = amount.toDoubleOrNull()

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Record an expense") },
        text = {
            Column {
                Text("Category", style = MaterialTheme.typography.labelMedium)
                Spacer(Modifier.height(6.dp))
                Row(
                    modifier = Modifier.horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    EXPENSE_CATEGORIES.forEach { option ->
                        AssistChip(
                            onClick = { category = option },
                            label = { Text(option) },
                            colors = AssistChipDefaults.assistChipColors(
                                labelColor = if (option == category) {
                                    MaterialTheme.colorScheme.primary
                                } else {
                                    MaterialTheme.colorScheme.onSurfaceVariant
                                }
                            )
                        )
                    }
                }
                Spacer(Modifier.height(12.dp))
                OutlinedTextField(
                    value = amount,
                    onValueChange = { amount = it.filter { c -> c.isDigit() || c == '.' } },
                    label = { Text("Amount (KSh)") },
                    singleLine = true
                )
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(
                    value = description,
                    onValueChange = { description = it },
                    label = { Text("Description (optional)") },
                    singleLine = true
                )
                Spacer(Modifier.height(8.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Checkbox(checked = isCogs, onCheckedChange = { isCogs = it })
                    Text("This is cost of goods sold", style = MaterialTheme.typography.bodyMedium)
                }
                OutlinedTextField(
                    value = notes,
                    onValueChange = { notes = it },
                    label = { Text("Notes (optional)") },
                    singleLine = true
                )
            }
        },
        confirmButton = {
            TextButton(
                enabled = parsed != null && parsed > 0.0,
                onClick = {
                    onSave(category, parsed ?: 0.0, description, notes, isCogs)
                }
            ) { Text("Save") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } }
    )
}