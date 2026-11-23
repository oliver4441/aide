package com.omix.aide.ui.screens

import com.omix.aide.data.local.converters.asMoney

import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material3.FilterChip
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.omix.aide.ui.money
import com.omix.aide.ui.components.AideCard
import com.omix.aide.ui.components.AideEmptyState
import com.omix.aide.ui.components.AideStatCard
import com.omix.aide.ui.components.LoadingState
import com.omix.aide.ui.theme.DangerRed
import com.omix.aide.ui.theme.WarningAmber
import com.omix.aide.ui.viewmodel.ReportRange
import com.omix.aide.ui.viewmodel.ReportViewModel

/**
 * Sales analytics. The third More-menu row whose onClick was an empty lambda.
 *
 * Everything is aggregated in SQL (see SaleDao) and scoped to the selected
 * range, so a shop with a long history does not load every sale to draw a
 * chart.
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

            if (uiState.isLoading || report == null) {
                LoadingState()
                return@Column
            }

            if (report.totals.count == 0 && report.overheads <= 0.0) {
                AideEmptyState(message = "No sales or expenses in this period.")
                return@Column
            }

            // Revenue, gross profit, overheads, and what is actually left.
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                AideStatCard(
                    title = "Revenue",
                    value = money(report.totals.revenue),
                    subtitle = "${report.totals.count} sale(s)",
                    modifier = Modifier.weight(1f)
                )
                AideStatCard(
                    title = "Gross profit",
                    value = money(report.totals.profit),
                    modifier = Modifier.weight(1f),
                    valueColor = WarningAmber
                )
            }

            Spacer(Modifier.height(12.dp))

            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                AideStatCard(
                    title = "Overheads",
                    value = money(report.overheads),
                    modifier = Modifier.weight(1f),
                    valueColor = DangerRed
                )
                AideStatCard(
                    title = "Net profit",
                    value = money(report.netProfit),
                    subtitle = "${"%.1f".format(report.marginPercent)}% margin",
                    modifier = Modifier.weight(1f),
                    valueColor = if (report.netProfit >= 0) {
                        MaterialTheme.colorScheme.primary
                    } else {
                        DangerRed
                    }
                )
            }

            if (report.totals.tax > 0.0) {
                Spacer(Modifier.height(8.dp))
                Text(
                    text = "VAT collected: KSh ${"%.2f".format(report.totals.tax)}",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            Spacer(Modifier.height(20.dp))

            if (report.topProducts.isNotEmpty()) {
                Text("Top products", style = MaterialTheme.typography.titleLarge)
                Spacer(Modifier.height(8.dp))
                val top = report.topProducts.maxOf { it.revenue }.coerceAtLeast(1.0)
                report.topProducts.forEach { product ->
                    AideCard {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Column(Modifier.weight(1f)) {
                                Text(
                                    text = product.name,
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.SemiBold
                                )
                                Text(
                                    text = "${product.quantity} sold · profit KSh " +
                                        "%.2f".format(product.profit),
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                                Spacer(Modifier.height(6.dp))
                                // Bar length is relative to the best seller.
                                Box(
                                    Modifier
                                        .fillMaxWidth()
                                        .height(6.dp)
                                        .background(
                                            MaterialTheme.colorScheme.surfaceVariant,
                                            RoundedCornerShape(3.dp)
                                        )
                                ) {
                                    Box(
                                        Modifier
                                            .fillMaxWidth((product.revenue / top).toFloat())
                                            .fillMaxHeight()
                                            .background(
                                                MaterialTheme.colorScheme.primary,
                                                RoundedCornerShape(3.dp)
                                            )
                                    )
                                }
                            }
                            Spacer(Modifier.width(12.dp))
                            Text(
                                text = money(product.revenue),
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.primary
                            )
                        }
                    }
                    Spacer(Modifier.height(8.dp))
                }
            }

            if (report.payments.isNotEmpty()) {
                Spacer(Modifier.height(12.dp))
                Text("Payment methods", style = MaterialTheme.typography.titleLarge)
                Spacer(Modifier.height(8.dp))
                AideCard {
                    report.payments.forEachIndexed { index, row ->
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = row.method.replace("_", " "),
                                style = MaterialTheme.typography.bodyLarge,
                                modifier = Modifier.weight(1f)
                            )
                            Text(
                                text = "${row.count} · KSh ${"%.2f".format(row.total)}",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        if (index != report.payments.lastIndex) {
                            Spacer(Modifier.height(4.dp))
                            LinearProgressIndicator(
                                progress = { (row.total / report.totals.revenue).toFloat() },
                                modifier = Modifier.fillMaxWidth().height(4.dp),
                                color = MaterialTheme.colorScheme.primary
                            )
                        }
                    }
                }
            }

                if (uiState.isLoading || report == null) {
                    item { LoadingState() }
                } else if (report.totals.count == 0 && report.overheads <= 0.0) {
                    item {
                        AideEmptyState(message = "No sales or expenses recorded for ${uiState.range.label}.")
                    }
                } else {
                    // Top Financial Stats Matrix
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

                            if (report.totals.tax > 0.0) {
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

                    // Top Products Visual Leaderboard
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

                                    val topRevenue = report.topProducts.maxOf { it.revenue }.asMoney().coerceAtLeast(1.0)

                                    report.topProducts.forEachIndexed { index, product ->
                                        Column(modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp)) {
                                            Row(
                                                modifier = Modifier.fillMaxWidth(),
                                                horizontalArrangement = Arrangement.SpaceBetween,
                                                verticalAlignment = Alignment.CenterVertically
                                            ) {
                                                Row(verticalAlignment = Alignment.CenterVertically) {
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
                                                    text = money(product.revenue.asMoney()),
                                                    style = MaterialTheme.typography.titleMedium,
                                                    fontWeight = FontWeight.ExtraBold,
                                                    color = MaterialTheme.colorScheme.primary
                                                )
                                            }

                                            Spacer(modifier = Modifier.height(6.dp))

                                            LinearProgressIndicator(
                                                progress = { (product.revenue / topRevenue).toFloat() },
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

                    // Payment Methods Breakdown Chart
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

                    // Spend by Category
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