package com.omix.aide.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.unit.dp
import com.omix.aide.ui.components.AideCard
import com.omix.aide.ui.theme.DangerRed

/**
 * Pricing and profit calculator.
 *
 * Two questions a shopkeeper actually asks while restocking: "what do I charge
 * for this?" and "did I make money?". Kept separate from the POS change
 * calculator, which lives in the checkout sheet where it is needed at the till.
 */
@Composable
fun CalculatorScreen(onBack: () -> Unit) {
    var cost by remember { mutableStateOf("") }
    var price by remember { mutableStateOf("") }
    var quantity by remember { mutableStateOf("1") }

    val costValue = cost.toDoubleOrNull() ?: 0.0
    val priceValue = price.toDoubleOrNull() ?: 0.0
    val qty = quantity.toDoubleOrNull() ?: 0.0

    val profit = (priceValue - costValue) * qty
    val revenue = priceValue * qty
    val totalCost = costValue * qty
    val marginPercent = if (revenue > 0.0) profit / revenue * 100.0 else 0.0

    Scaffold(
        topBar = {
            Row(
                modifier = Modifier.fillMaxWidth().padding(16.dp),
                verticalAlignment = androidx.compose.ui.Alignment.CenterVertically
            ) {
                TextButton(onClick = onBack) { Text("Back") }
                Text(
                    text = "Calculator",
                    style = MaterialTheme.typography.headlineMedium,
                    modifier = Modifier.weight(1f)
                )
            }
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(padding).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            item {
                Text("Profit & pricing", style = MaterialTheme.typography.titleLarge)
                Spacer(Modifier.height(4.dp))
                Text(
                    text = "Work out what to charge and what you keep.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            item {
                OutlinedTextField(
                    value = cost,
                    onValueChange = { cost = it.filter { c -> c.isDigit() || c == '.' } },
                    label = { Text("Buying price per unit") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
            }

            item {
                OutlinedTextField(
                    value = price,
                    onValueChange = { price = it.filter { c -> c.isDigit() || c == '.' } },
                    label = { Text("Selling price per unit") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
            }

            item {
                OutlinedTextField(
                    value = quantity,
                    onValueChange = { quantity = it.filter { c -> c.isDigit() } },
                    label = { Text("Quantity") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
            }

            item {
                Spacer(Modifier.height(4.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf("1" to "1", "10" to "10", "100" to "100").forEach { (label, value) ->
                        FilterChip(
                            selected = quantity == value,
                            onClick = { quantity = value },
                            label = { Text(label) },
                            modifier = Modifier.height(48.dp)
                        )
                    }
                }
            }

            item {
                AideCard {
                    ResultRow("Revenue", "KSh ${"%.2f".format(revenue)}")
                    Spacer(Modifier.height(8.dp))
                    ResultRow("Cost", "KSh ${"%.2f".format(totalCost)}")
                    Spacer(Modifier.height(8.dp))
                    HorizontalDivider()
                    Spacer(Modifier.height(8.dp))
                    ResultRow(
                        label = "Profit",
                        value = "KSh ${"%.2f".format(profit)}",
                        emphasise = true,
                        positive = profit >= 0
                    )
                    Spacer(Modifier.height(8.dp))
                    ResultRow("Margin", "${"%.1f".format(marginPercent)}%")
                    if (qty > 0.0 && priceValue > costValue) {
                        Spacer(Modifier.height(8.dp))
                        Text(
                            text = "Each unit adds KSh " +
                                "%.2f".format(priceValue - costValue) + " of profit.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    if (priceValue <= 0.0 || costValue <= 0.0) {
                        Spacer(Modifier.height(8.dp))
                        Text(
                            text = "Enter a buying and a selling price to see the margin.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    if (costValue > 0.0 && priceValue > 0.0 && priceValue < costValue) {
                        Spacer(Modifier.height(8.dp))
                        Text(
                            text = "Warning: you are selling below cost.",
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.SemiBold,
                            color = DangerRed
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun ResultRow(
    label: String,
    value: String,
    emphasise: Boolean = false,
    positive: Boolean = true
) {
    Row(modifier = Modifier.fillMaxWidth()) {
        Text(
            text = label,
            style = if (emphasise) MaterialTheme.typography.titleMedium
            else MaterialTheme.typography.bodyLarge,
            modifier = Modifier.weight(1f)
        )
        Text(
            text = value,
            style = if (emphasise) MaterialTheme.typography.titleLarge
            else MaterialTheme.typography.bodyLarge,
            fontFamily = FontFamily.Monospace,
            fontWeight = if (emphasise) FontWeight.Bold else FontWeight.Normal,
            color = when {
                !emphasise -> MaterialTheme.colorScheme.onSurface
                positive -> MaterialTheme.colorScheme.primary
                else -> DangerRed
            }
        )
    }
}