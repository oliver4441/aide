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
import com.omix.aide.data.local.converters.asMoney
import com.omix.aide.ui.components.*
import com.omix.aide.ui.money
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

        if (uiState.isLoading) {
            LoadingState()
            return@Column
        }

        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item {
                Text(
                    text = "TODAY",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.height(4.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    AideStatCard(
                        title = "Sales",
                        value = money(uiState.todaySalesTotal),
                        subtitle = "${uiState.todaySalesCount} sale${if (uiState.todaySalesCount == 1) "" else "s"}",
                        modifier = Modifier.weight(1f),
                        valueColor = MaterialTheme.colorScheme.primary
                    )
                    AideStatCard(
                        title = "Profit",
                        value = money(uiState.todayProfitTotal),
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
                        colors = ButtonDefaults.buttonColors(
                            containerColor = MaterialTheme.colorScheme.surfaceVariant,
                            contentColor = MaterialTheme.colorScheme.onSurface
                        )
                    )
                }
            }

            if (uiState.weeklySales.isNotEmpty() && uiState.weeklySales.any { it.total > 0.0 }) {
                item {
                    AideCard {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text(
                                text = "Last 7 Days",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold
                            )
                            Spacer(modifier = Modifier.height(12.dp))
                            AideBarChart(
                                data = uiState.weeklySales.map { day ->
                                    ChartDataPoint(
                                        label = day.label,
                                        value = day.total.toFloat(),
                                        formattedValue = money(day.total)
                                    )
                                },
                                height = 150.dp
                            )
                        }
                    }
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
                                text = "${uiState.lowStockProducts.size} product${if (uiState.lowStockProducts.size == 1) "" else "s"} running low in stock.",
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
                    AideEmptyState(message = "No sales recorded yet.")
                }
            } else {
                items(uiState.recentSales, key = { it.sale.id }) { saleWithItems ->
                    AideCard {
                        Row(
                            modifier = Modifier.padding(16.dp).fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text(
                                    text = "${saleWithItems.items.size} item${if (saleWithItems.items.size == 1) "" else "s"} • ${saleWithItems.sale.paymentMethod.replace('_', ' ')}",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.SemiBold
                                )
                                Text(
                                    text = saleWithItems.sale.createdAt.take(10),
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                            Text(
                                text = money(saleWithItems.sale.total.asMoney()),
                                style = MaterialTheme.typography.titleLarge,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.primary
                            )
                        }
                    }
                }
            }
        }
    }
}
