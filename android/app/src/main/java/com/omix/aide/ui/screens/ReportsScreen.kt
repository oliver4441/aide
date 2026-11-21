package com.omix.aide.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountBalanceWallet
import androidx.compose.material.icons.filled.Leaderboard
import androidx.compose.material.icons.filled.Payments
import androidx.compose.material.icons.filled.PieChart
import androidx.compose.material.icons.filled.Savings
import androidx.compose.material.icons.filled.TrendingUp
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.omix.aide.data.local.converters.asMoney
import com.omix.aide.ui.components.AideBadge
import com.omix.aide.ui.components.AideCard
import com.omix.aide.ui.components.AideDonutChart
import com.omix.aide.ui.components.AideEmptyState
import com.omix.aide.ui.components.AideStatCard
import com.omix.aide.ui.components.LoadingState
import com.omix.aide.ui.money
import com.omix.aide.ui.theme.DangerRed
import com.omix.aide.ui.theme.WarningAmber
import com.omix.aide.ui.viewmodel.ReportRange
import com.omix.aide.ui.viewmodel.ReportViewModel

/**
 * Sales analytics scoped to the selected range and aggregated in SQL (see SaleDao).
 */
@Composable
fun ReportsScreen(
    reportViewModel: ReportViewModel,
    onBack: () -> Unit
) {
    val uiState by reportViewModel.uiState.collectAsState()
    val report = uiState.report

    Scaffold(
        topBar = {
            Row(
                modifier = Modifier.fillMaxWidth().padding(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                TextButton(onClick = onBack) { Text("Back") }
                Text(
                    text = "Reports",
                    style = MaterialTheme.typography.headlineMedium,
                    modifier = Modifier.weight(1f)
                )
            }
        }
    ) { padding ->
        Column(Modifier.fillMaxSize().padding(padding).padding(16.dp)) {
            Row(
                modifier = Modifier.horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                ReportRange.entries.forEach { range ->
                    FilterChip(
                        selected = range == uiState.range,
                        onClick = { reportViewModel.setRange(range) },
                        label = { Text(range.label) },
                        modifier = Modifier.height(48.dp)
                    )
                }
            }

            Spacer(Modifier.height(16.dp))

            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                if (uiState.isLoading || report == null) {
                    item { LoadingState() }
                } else if (report.totals.count == 0 && report.overheads <= 0.0) {
                    item {
                        AideEmptyState(message = "No sales or expenses recorded for ${uiState.range.label}.")
                    }
                } else {
                    item {
                        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                AideStatCard(
                                    title = "Gross Revenue",
                                    value = money(report.totals.revenue.asMoney()),
                                    subtitle = "${report.totals.count} sale(s)",
                                    icon = Icons.Default.Payments,
                                    modifier = Modifier.weight(1f),
                                    valueColor = MaterialTheme.colorScheme.primary
                                )
                                AideStatCard(
                                    title = "Gross Profit",
                                    value = money(report.totals.profit.asMoney()),
                                    icon = Icons.Default.TrendingUp,
                                    modifier = Modifier.weight(1f),
                                    valueColor = WarningAmber
                                )
                            }

                            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                AideStatCard(
                                    title = "Overheads",
                                    value = money(report.overheads),
                                    icon = Icons.Default.AccountBalanceWallet,
                                    modifier = Modifier.weight(1f),
                                    valueColor = DangerRed
                                )
                                AideStatCard(
                                    title = "Net Profit",
                                    value = money(report.netProfit),
                                    subtitle = "${"%.1f".format(report.marginPercent)}% profit margin",
                                    icon = Icons.Default.Savings,
                                    modifier = Modifier.weight(1f),
                                    valueColor = if (report.netProfit >= 0) MaterialTheme.colorScheme.primary else DangerRed
                                )
                            }

                            if (report.totals.tax > 0L) {
                                Surface(
                                    color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                                    shape = RoundedCornerShape(12.dp)
                                ) {
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(horizontal = 14.dp, vertical = 8.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(
                                            text = "VAT Collected (${report.totals.count} sales)",
                                            style = MaterialTheme.typography.labelMedium,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant
                                        )
                                        Text(
                                            text = money(report.totals.tax.asMoney()),
                                            style = MaterialTheme.typography.titleMedium,
                                            fontWeight = FontWeight.Bold,
                                            color = MaterialTheme.colorScheme.primary
                                        )
                                    }
                                }
                            }
                        }
                    }

                    if (report.topProducts.isNotEmpty()) {
                        item {
                            AideCard {
                                Column(modifier = Modifier.padding(16.dp)) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Icon(
                                                imageVector = Icons.Default.Leaderboard,
                                                contentDescription = null,
                                                tint = MaterialTheme.colorScheme.primary,
                                                modifier = Modifier.size(20.dp)
                                            )
                                            Spacer(modifier = Modifier.width(8.dp))
                                            Text(
                                                text = "Top Selling Products",
                                                style = MaterialTheme.typography.titleLarge,
                                                fontWeight = FontWeight.Bold
                                            )
                                        }
                                        AideBadge(
                                            text = "${report.topProducts.size} items",
                                            containerColor = MaterialTheme.colorScheme.primaryContainer,
                                            contentColor = MaterialTheme.colorScheme.onPrimaryContainer
                                        )
                                    }

                                    Spacer(modifier = Modifier.height(16.dp))

                                    val topRevenue = report.topProducts.maxOf { it.revenue.asMoney() }.coerceAtLeast(1.0)

                                    report.topProducts.forEachIndexed { index, product ->
                                        val productRevenue = product.revenue.asMoney()
                                        Column(modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp)) {
                                            Row(
                                                modifier = Modifier.fillMaxWidth(),
                                                horizontalArrangement = Arrangement.SpaceBetween,
                                                verticalAlignment = Alignment.CenterVertically
                                            ) {
                                                Row(
                                                    modifier = Modifier.weight(1f),
                                                    verticalAlignment = Alignment.CenterVertically
                                                ) {
                                                    Box(
                                                        modifier = Modifier
                                                            .size(24.dp)
                                                            .clip(CircleShape)
                                                            .background(
                                                                if (index == 0) WarningAmber
                                                                else MaterialTheme.colorScheme.surfaceVariant
                                                            ),
                                                        contentAlignment = Alignment.Center
                                                    ) {
                                                        Text(
                                                            text = "${index + 1}",
                                                            style = MaterialTheme.typography.labelSmall,
                                                            fontWeight = FontWeight.Bold,
                                                            color = if (index == 0) Color.White else MaterialTheme.colorScheme.onSurfaceVariant
                                                        )
                                                    }
                                                    Spacer(modifier = Modifier.width(10.dp))
                                                    Column {
                                                        Text(
                                                            text = product.name,
                                                            style = MaterialTheme.typography.titleMedium,
                                                            fontWeight = FontWeight.SemiBold
                                                        )
                                                        Text(
                                                            text = "${product.quantity} sold • Profit: ${money(product.profit.asMoney())}",
                                                            style = MaterialTheme.typography.labelSmall,
                                                            color = MaterialTheme.colorScheme.onSurfaceVariant
                                                        )
                                                    }
                                                }
                                                Text(
                                                    text = money(productRevenue),
                                                    style = MaterialTheme.typography.titleMedium,
                                                    fontWeight = FontWeight.ExtraBold,
                                                    color = MaterialTheme.colorScheme.primary
                                                )
                                            }

                                            Spacer(modifier = Modifier.height(6.dp))

                                            LinearProgressIndicator(
                                                progress = { (productRevenue / topRevenue).toFloat().coerceIn(0f, 1f) },
                                                modifier = Modifier
                                                    .fillMaxWidth()
                                                    .height(6.dp)
                                                    .clip(RoundedCornerShape(3.dp)),
                                                color = MaterialTheme.colorScheme.primary,
                                                trackColor = MaterialTheme.colorScheme.surfaceVariant
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }

                    if (report.payments.isNotEmpty()) {
                        item {
                            AideCard {
                                Column(modifier = Modifier.padding(16.dp)) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(
                                            imageVector = Icons.Default.PieChart,
                                            contentDescription = null,
                                            tint = MaterialTheme.colorScheme.primary,
                                            modifier = Modifier.size(20.dp)
                                        )
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Text(
                                            text = "Payment Distribution",
                                            style = MaterialTheme.typography.titleLarge,
                                            fontWeight = FontWeight.Bold
                                        )
                                    }

                                    Spacer(modifier = Modifier.height(16.dp))

                                    val chartItems = report.payments.map {
                                        it.method.replace("_", " ") to it.total.asMoney()
                                    }
                                    val colors = listOf(
                                        MaterialTheme.colorScheme.primary,
                                        MaterialTheme.colorScheme.secondary,
                                        WarningAmber,
                                        DangerRed
                                    )

                                    AideDonutChart(
                                        items = chartItems,
                                        colors = colors,
                                        sizeDp = 130.dp
                                    )
                                }
                            }
                        }
                    }

                    if (report.expenseCategories.isNotEmpty()) {
                        item {
                            AideCard {
                                Column(modifier = Modifier.padding(16.dp)) {
                                    Text(
                                        text = "Expense Breakdown",
                                        style = MaterialTheme.typography.titleLarge,
                                        fontWeight = FontWeight.Bold
                                    )

                                    Spacer(modifier = Modifier.height(12.dp))

                                    report.expenseCategories.forEach { row ->
                                        Row(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .padding(vertical = 6.dp),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Text(
                                                text = row.category,
                                                style = MaterialTheme.typography.bodyLarge,
                                                fontWeight = FontWeight.Medium
                                            )
                                            Text(
                                                text = money(row.total.asMoney()),
                                                style = MaterialTheme.typography.titleMedium,
                                                fontWeight = FontWeight.Bold,
                                                color = DangerRed
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
}
