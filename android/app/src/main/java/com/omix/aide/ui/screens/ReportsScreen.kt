package com.omix.aide.ui.screens

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

            if (report.expenseCategories.isNotEmpty()) {
                Spacer(Modifier.height(20.dp))
                Text("Spend by category", style = MaterialTheme.typography.titleLarge)
                Spacer(Modifier.height(8.dp))
                AideCard {
                    report.expenseCategories.forEach { row ->
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)
                        ) {
                            Text(
                                text = row.category,
                                style = MaterialTheme.typography.bodyLarge,
                                modifier = Modifier.weight(1f)
                            )
                            Text(
                                text = money(row.total),
                                style = MaterialTheme.typography.bodyLarge,
                                fontWeight = FontWeight.SemiBold,
                                color = DangerRed
                            )
                        }
                    }
                }
            }
        }
    }
}