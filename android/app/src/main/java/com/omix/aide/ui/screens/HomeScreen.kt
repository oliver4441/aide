package com.omix.aide.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.omix.aide.ui.components.*
import com.omix.aide.ui.theme.PrimaryGreen
import com.omix.aide.ui.theme.WarningAmber
import com.omix.aide.ui.viewmodel.HomeViewModel

@Composable
fun HomeScreen(
    homeViewModel: HomeViewModel,
    onNavigateToSell: () -> Unit,
    onNavigateToStock: () -> Unit
) {
    val uiState by homeViewModel.uiState.collectAsState()

    Column(modifier = Modifier.fillMaxSize()) {
        AideLocalOnlyBanner()

        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item {
                Text(text = "TODAY", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                Spacer(modifier = Modifier.height(4.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    AideStatCard(
                        title = "Sales",
                        value = "KSh ${"%.2f".format(uiState.todaySalesTotal)}",
                        subtitle = "${uiState.todaySalesCount} sales",
                        modifier = Modifier.weight(1f),
                        valueColor = PrimaryGreen
                    )
                    AideStatCard(
                        title = "Profit",
                        value = "KSh ${"%.2f".format(uiState.todayProfitTotal)}",
                        modifier = Modifier.weight(1f)
                    )
                }
            }

            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    AideButton(
                        text = "[ SELL ]",
                        onClick = onNavigateToSell,
                        modifier = Modifier.weight(1f)
                    )
                    AideButton(
                        text = "[ STOCK ]",
                        onClick = onNavigateToStock,
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                    )
                }
            }

            if (uiState.lowStockProducts.isNotEmpty()) {
                item {
                    AideCard {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text(
                                text = "What needs attention?",
                                style = MaterialTheme.typography.titleLarge,
                                color = WarningAmber,
                                fontWeight = FontWeight.Bold
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = "${uiState.lowStockProducts.size} products are running low in stock.",
                                style = MaterialTheme.typography.bodyMedium
                            )
                        }
                    }
                }
            }

            item {
                Text(
                    text = "Recent Activity",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold
                )
            }

            if (uiState.recentSales.isEmpty()) {
                item {
                    AideEmptyState(message = "No sales recorded today yet.")
                }
            } else {
                items(uiState.recentSales) { saleWithItems ->
                    AideCard {
                        Row(
                            modifier = Modifier.padding(16.dp).fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text(
                                    text = "Sale #${saleWithItems.sale.id.takeLast(6)}",
                                    style = MaterialTheme.typography.titleLarge,
                                    fontWeight = FontWeight.SemiBold
                                )
                                Text(
                                    text = "${saleWithItems.items.size} items • ${saleWithItems.sale.paymentMethod}",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                                )
                            }
                            Text(
                                text = "KSh ${"%.2f".format(saleWithItems.sale.total)}",
                                style = MaterialTheme.typography.titleLarge,
                                fontWeight = FontWeight.Bold,
                                color = PrimaryGreen
                            )
                        }
                    }
                }
            }
        }
    }
}
