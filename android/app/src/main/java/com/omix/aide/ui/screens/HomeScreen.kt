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
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.VerifiedUser
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.omix.aide.data.local.converters.asMoney
import com.omix.aide.domain.ia.EmployeeRole
import com.omix.aide.domain.ia.MobileDestination
import com.omix.aide.domain.ia.MobilePermission
import com.omix.aide.domain.ia.QuickAction
import com.omix.aide.ui.components.AccessRestrictedScreen
import com.omix.aide.ui.components.AideBadge
import com.omix.aide.ui.components.AideBarChart
import com.omix.aide.ui.components.AideCard
import com.omix.aide.ui.components.AideEmptyState
import com.omix.aide.ui.components.AideLocalOnlyBanner
import com.omix.aide.ui.components.AideStatCard
import com.omix.aide.ui.components.ChartDataPoint
import com.omix.aide.ui.components.LoadingState
import com.omix.aide.ui.money
import com.omix.aide.ui.navigation.Screen
import com.omix.aide.ui.navigation.icon
import com.omix.aide.ui.theme.DangerRed
import com.omix.aide.ui.theme.WarningAmber
import com.omix.aide.ui.viewmodel.HomeUiState
import com.omix.aide.ui.viewmodel.HomeViewModel

@Composable
fun HomeScreen(
    homeViewModel: HomeViewModel,
    onNavigateToSell: () -> Unit,
    onNavigateToStock: () -> Unit
) {
    HomeScreen(
        homeViewModel = homeViewModel,
        onNavigate = { route ->
            when (route) {
                Screen.Sell.route -> onNavigateToSell()
                Screen.Stock.route -> onNavigateToStock()
            }
        }
    )
}

@Composable
fun HomeScreen(
    homeViewModel: HomeViewModel,
    onNavigate: (String) -> Unit,
    onOpenContextSwitcher: () -> Unit = {}
) {
    val uiState by homeViewModel.uiState.collectAsState()
    val context = uiState.activeContext
    val nav = uiState.navigation

    if (nav.isAccessBlocked) {
        AccessRestrictedScreen(
            context = context,
            reason = nav.blockedReason ?: "Access to this workspace is unavailable.",
            onReturnHome = null,
            onOpenContextSwitcher = onOpenContextSwitcher
        )
        return
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .testTag("role_home_${context.role.name}")
    ) {
        AideLocalOnlyBanner()

        if (uiState.isLoading) {
            LoadingState()
            return@Column
        }

        val openTasksCount = uiState.assignedTasks.count { !it.completed }

        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            // 1. Role-Specific Priority KPI Summary (never generic Sales/Profit for every role)
            item {
                Text(
                    text = "${context.role.title.uppercase()} PRIORITIES",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.testTag("home_role_header")
                )
                Spacer(modifier = Modifier.height(6.dp))
                RolePriorityStatsGrid(uiState = uiState, openTasksCount = openTasksCount)
            }

            // 2. High-Frequency Quick Actions (strictly permission-filtered)
            if (nav.quickActions.isNotEmpty()) {
                item {
                    Text(
                        text = "QUICK ACTIONS",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    QuickActionsGrid(
                        actions = nav.quickActions,
                        onActionClick = { action -> onNavigate(action.destination.route) }
                    )
                }
            }

            // 3. Actionable Alerts (tap directly into the resolving task)
            val hasShiftPrompt = context.hasPermission(MobilePermission.SHIFT_OPEN) &&
                context.role == EmployeeRole.CASHIER &&
                uiState.openShift == null
            val hasPendingApprovals = context.hasPermission(MobilePermission.APPROVAL_DECIDE) &&
                uiState.pendingApprovals.isNotEmpty()
            val hasLowStockAlert = context.hasPermission(MobilePermission.PRODUCT_READ) &&
                uiState.lowStockProducts.isNotEmpty()

            if (hasShiftPrompt || hasPendingApprovals || hasLowStockAlert) {
                item {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        if (hasShiftPrompt) {
                            ActionableAlertCard(
                                title = "Shift not opened on ${context.terminalName ?: "Till 01"}",
                                subtitle = "Open your till shift and record opening float before checkout.",
                                accentColor = WarningAmber,
                                icon = Icons.Default.Schedule,
                                tag = "alert_open_shift",
                                onClick = { onNavigate(MobileDestination.SHIFTS.route) }
                            )
                        }
                        if (hasPendingApprovals) {
                            ActionableAlertCard(
                                title = "${uiState.pendingApprovals.size} approval request${if (uiState.pendingApprovals.size == 1) "" else "s"} pending",
                                subtitle = "Staff overrides or variances require your decision.",
                                accentColor = WarningAmber,
                                icon = Icons.Default.VerifiedUser,
                                tag = "alert_pending_approvals",
                                onClick = { onNavigate(MobileDestination.APPROVALS.route) }
                            )
                        }
                        if (hasLowStockAlert) {
                            val lowTarget = when {
                                context.hasPermission(MobilePermission.PRODUCT_UPDATE) -> MobileDestination.STOCK.route
                                context.hasPermission(MobilePermission.STOCK_COUNT_PERFORM) -> MobileDestination.STOCK_COUNT.route
                                context.hasPermission(MobilePermission.GOODS_RECEIVE) -> MobileDestination.RECEIVE_GOODS.route
                                else -> MobileDestination.PRODUCT_LOOKUP.route
                            }
                            ActionableAlertCard(
                                title = "${uiState.lowStockProducts.size} product${if (uiState.lowStockProducts.size == 1) "" else "s"} low in stock",
                                subtitle = uiState.lowStockProducts.take(3)
                                    .joinToString(", ") { "${it.name} (${it.quantity})" },
                                accentColor = WarningAmber,
                                icon = Icons.Default.Warning,
                                tag = "alert_low_stock",
                                onClick = { onNavigate(lowTarget) }
                            )
                        }
                    }
                }
            }

            // 4. 7-Day Revenue Trend (ONLY for roles with REPORT_READ and recorded sales)
            if (context.hasPermission(MobilePermission.REPORT_READ) &&
                uiState.weeklySales.any { it.total > 0.0 }
            ) {
                item {
                    AideCard {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text(
                                text = "Last 7 Days Revenue",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold
                            )
                            Spacer(modifier = Modifier.height(10.dp))
                            AideBarChart(
                                data = uiState.weeklySales.map { day ->
                                    ChartDataPoint(
                                        label = day.label,
                                        value = day.total.toFloat(),
                                        formattedValue = money(day.total)
                                    )
                                },
                                height = 140.dp
                            )
                        }
                    }
                }
            }

            // 5. Role-Scoped Recent Activity & Guidance
            item {
                Text(
                    text = recentActivityHeading(context.role),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
            }

            when {
                context.role in setOf(
                    EmployeeRole.WAREHOUSE_OPERATOR,
                    EmployeeRole.RECEIVING_CLERK,
                    EmployeeRole.INVENTORY_CONTROLLER
                ) -> {
                    val hasStockOps = uiState.recentGoodsReceipts.isNotEmpty() ||
                        uiState.recentStockCounts.isNotEmpty()
                    if (!hasStockOps) {
                        item {
                            AideEmptyState(
                                message = "No inbound goods receipts or stock counts logged yet in ${context.branchName}.",
                                actionLabel = if (context.hasPermission(MobilePermission.GOODS_RECEIVE)) {
                                    "Receive Goods"
                                } else {
                                    "Count Stock"
                                },
                                onAction = {
                                    if (context.hasPermission(MobilePermission.GOODS_RECEIVE)) {
                                        onNavigate(MobileDestination.RECEIVE_GOODS.route)
                                    } else {
                                        onNavigate(MobileDestination.STOCK_COUNT.route)
                                    }
                                }
                            )
                        }
                    } else {
                        items(uiState.recentGoodsReceipts, key = { "grn-${it.id}" }) { grn ->
                            AideCard {
                                Row(
                                    modifier = Modifier.padding(14.dp).fillMaxWidth(),
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
                                    }
                                    AideBadge(
                                        text = "+${grn.quantityReceived} units",
                                        containerColor = MaterialTheme.colorScheme.primaryContainer,
                                        contentColor = MaterialTheme.colorScheme.onPrimaryContainer
                                    )
                                }
                            }
                        }
                        items(uiState.recentStockCounts, key = { "cnt-${it.id}" }) { cnt ->
                            AideCard {
                                Row(
                                    modifier = Modifier.padding(14.dp).fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            text = "${cnt.countNumber} · ${cnt.productName}",
                                            style = MaterialTheme.typography.titleSmall,
                                            fontWeight = FontWeight.Bold
                                        )
                                        Text(
                                            text = "Counted ${cnt.countedQuantity} (system ${cnt.systemQuantity}) · ${cnt.reason}",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant
                                        )
                                    }
                                    val varianceText = if (cnt.variance >= 0) "+${cnt.variance}" else "${cnt.variance}"
                                    AideBadge(
                                        text = "Var $varianceText",
                                        containerColor = if (cnt.variance == 0) {
                                            MaterialTheme.colorScheme.secondaryContainer
                                        } else {
                                            WarningAmber.copy(alpha = 0.2f)
                                        },
                                        contentColor = if (cnt.variance == 0) {
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

                else -> {
                    if (uiState.recentSales.isEmpty()) {
                        item {
                            AideEmptyState(
                                message = if (context.role == EmployeeRole.CASHIER) {
                                    "No checkout receipts recorded yet on ${context.terminalName ?: context.branchName}."
                                } else {
                                    "No sales recorded yet in ${context.branchName}."
                                },
                                actionLabel = if (context.hasPermission(MobilePermission.SALE_CREATE)) {
                                    "Start Sale"
                                } else null,
                                onAction = if (context.hasPermission(MobilePermission.SALE_CREATE)) {
                                    { onNavigate(MobileDestination.SELL.route) }
                                } else null
                            )
                        }
                    } else {
                        items(uiState.recentSales, key = { it.sale.id }) { saleWithItems ->
                            AideCard {
                                Row(
                                    modifier = Modifier.padding(14.dp).fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            text = "${saleWithItems.items.size} item${if (saleWithItems.items.size == 1) "" else "s"} • ${saleWithItems.sale.paymentMethod.replace('_', ' ')}",
                                            style = MaterialTheme.typography.titleSmall,
                                            fontWeight = FontWeight.SemiBold
                                        )
                                        Text(
                                            text = buildString {
                                                append(saleWithItems.sale.createdAt.take(10))
                                                saleWithItems.sale.cashier?.takeIf { it.isNotBlank() }?.let {
                                                    append(" · ")
                                                    append(it)
                                                }
                                            },
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant
                                        )
                                    }
                                    Text(
                                        text = money(saleWithItems.sale.total.asMoney()),
                                        style = MaterialTheme.typography.titleMedium,
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
    }
}

@Composable
private fun RolePriorityStatsGrid(
    uiState: HomeUiState,
    openTasksCount: Int
) {
    val context = uiState.activeContext
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        when (context.role) {
            EmployeeRole.OWNER_ADMIN -> {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    AideStatCard(
                        title = "Sales Today",
                        value = money(uiState.todaySalesTotal),
                        subtitle = "${uiState.todaySalesCount} sale${if (uiState.todaySalesCount == 1) "" else "s"}",
                        modifier = Modifier.weight(1f).testTag("kpi_sales_today"),
                        valueColor = MaterialTheme.colorScheme.primary
                    )
                    AideStatCard(
                        title = "Profit Today",
                        value = money(uiState.todayProfitTotal),
                        subtitle = "${uiState.pendingApprovals.size} pending approval(s)",
                        modifier = Modifier.weight(1f).testTag("kpi_profit_today")
                    )
                }
            }

            EmployeeRole.BRANCH_MANAGER -> {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    AideStatCard(
                        title = "Branch Sales",
                        value = money(uiState.todaySalesTotal),
                        subtitle = "${uiState.todaySalesCount} sale${if (uiState.todaySalesCount == 1) "" else "s"} today",
                        modifier = Modifier.weight(1f).testTag("kpi_branch_sales"),
                        valueColor = MaterialTheme.colorScheme.primary
                    )
                    AideStatCard(
                        title = "Approvals & Alerts",
                        value = "${uiState.pendingApprovals.size}",
                        subtitle = "${uiState.lowStockProducts.size} low-stock SKU(s)",
                        modifier = Modifier.weight(1f).testTag("kpi_manager_approvals"),
                        valueColor = if (uiState.pendingApprovals.isNotEmpty()) WarningAmber else MaterialTheme.colorScheme.onSurface
                    )
                }
            }

            EmployeeRole.CASHIER -> {
                val shift = uiState.openShift
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    AideStatCard(
                        title = "Till Shift",
                        value = if (shift != null) "OPEN" else "CLOSED",
                        subtitle = shift?.terminalName ?: (context.terminalName ?: "Till 01"),
                        modifier = Modifier.weight(1f).testTag("kpi_cashier_shift"),
                        valueColor = if (shift != null) MaterialTheme.colorScheme.primary else WarningAmber
                    )
                    AideStatCard(
                        title = if (shift != null) "Shift Takings" else "Today's Till",
                        value = money(if (shift != null) uiState.shiftSalesTotal else uiState.todaySalesTotal),
                        subtitle = "${if (shift != null) uiState.shiftSalesCount else uiState.todaySalesCount} receipt(s)",
                        modifier = Modifier.weight(1f).testTag("kpi_cashier_takings"),
                        valueColor = MaterialTheme.colorScheme.primary
                    )
                }
            }

            EmployeeRole.WAREHOUSE_OPERATOR -> {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    AideStatCard(
                        title = "Open Tasks",
                        value = "$openTasksCount",
                        subtitle = context.warehouseName ?: "Warehouse queue",
                        modifier = Modifier.weight(1f).testTag("kpi_warehouse_tasks"),
                        valueColor = MaterialTheme.colorScheme.primary
                    )
                    AideStatCard(
                        title = "Low Stock",
                        value = "${uiState.lowStockProducts.size}",
                        subtitle = "${uiState.recentGoodsReceipts.size} GRN · ${uiState.recentStockCounts.size} count",
                        modifier = Modifier.weight(1f).testTag("kpi_warehouse_low_stock"),
                        valueColor = if (uiState.lowStockProducts.isNotEmpty()) WarningAmber else MaterialTheme.colorScheme.onSurface
                    )
                }
            }

            EmployeeRole.RECEIVING_CLERK -> {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    AideStatCard(
                        title = "Goods Receipts",
                        value = "${uiState.recentGoodsReceipts.size}",
                        subtitle = context.warehouseName ?: "Receiving bay",
                        modifier = Modifier.weight(1f).testTag("kpi_receiving_grns"),
                        valueColor = MaterialTheme.colorScheme.primary
                    )
                    AideStatCard(
                        title = "Awaiting Restock",
                        value = "${uiState.lowStockProducts.size}",
                        subtitle = "$openTasksCount open task(s)",
                        modifier = Modifier.weight(1f).testTag("kpi_receiving_low_stock"),
                        valueColor = if (uiState.lowStockProducts.isNotEmpty()) WarningAmber else MaterialTheme.colorScheme.onSurface
                    )
                }
            }

            EmployeeRole.INVENTORY_CONTROLLER -> {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    AideStatCard(
                        title = "Active SKUs",
                        value = "${uiState.totalProductsCount}",
                        subtitle = "${uiState.lowStockProducts.size} below threshold",
                        modifier = Modifier.weight(1f).testTag("kpi_inventory_skus"),
                        valueColor = if (uiState.lowStockProducts.isNotEmpty()) WarningAmber else MaterialTheme.colorScheme.primary
                    )
                    AideStatCard(
                        title = "Stock Value",
                        value = money(uiState.stockRetailValue),
                        subtitle = "${uiState.recentStockCounts.size} count(s) logged",
                        modifier = Modifier.weight(1f).testTag("kpi_inventory_value")
                    )
                }
            }

            EmployeeRole.ACCOUNTANT -> {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    AideStatCard(
                        title = "Revenue Today",
                        value = money(uiState.todaySalesTotal),
                        subtitle = "Gross profit ${money(uiState.todayProfitTotal)}",
                        modifier = Modifier.weight(1f).testTag("kpi_accountant_revenue"),
                        valueColor = MaterialTheme.colorScheme.primary
                    )
                    AideStatCard(
                        title = "Receivables Owed",
                        value = money(uiState.totalReceivablesOwed),
                        subtitle = "Expenses ${money(uiState.totalExpensesRecorded)}",
                        modifier = Modifier.weight(1f).testTag("kpi_accountant_receivables"),
                        valueColor = if (uiState.totalReceivablesOwed > 0.0) DangerRed else MaterialTheme.colorScheme.onSurface
                    )
                }
            }
        }
    }
}

@Composable
private fun QuickActionsGrid(
    actions: List<QuickAction>,
    onActionClick: (QuickAction) -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        actions.chunked(2).forEach { rowItems ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                rowItems.forEach { action ->
                    AideCard(
                        modifier = Modifier
                            .weight(1f)
                            .testTag("quick_action_${action.name}"),
                        onClick = { onActionClick(action) }
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 12.dp, vertical = 12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Icon(
                                imageVector = action.icon(),
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.size(22.dp)
                            )
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = action.label,
                                    style = MaterialTheme.typography.titleSmall,
                                    fontWeight = FontWeight.Bold
                                )
                                Text(
                                    text = action.subtitle,
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }
                }
                if (rowItems.size == 1) {
                    Spacer(modifier = Modifier.weight(1f))
                }
            }
        }
    }
}

@Composable
private fun ActionableAlertCard(
    title: String,
    subtitle: String,
    accentColor: androidx.compose.ui.graphics.Color,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    tag: String,
    onClick: () -> Unit
) {
    AideCard(
        modifier = Modifier.testTag(tag),
        borderColor = accentColor.copy(alpha = 0.5f),
        onClick = onClick
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = accentColor,
                modifier = Modifier.size(22.dp)
            )
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                    color = accentColor
                )
                Text(
                    text = subtitle,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Icon(
                imageVector = Icons.Default.ChevronRight,
                contentDescription = "Open",
                tint = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

private fun recentActivityHeading(role: EmployeeRole): String = when (role) {
    EmployeeRole.WAREHOUSE_OPERATOR,
    EmployeeRole.RECEIVING_CLERK,
    EmployeeRole.INVENTORY_CONTROLLER -> "Recent Stock Movements & Counts"
    EmployeeRole.CASHIER -> "Recent Till Receipts"
    EmployeeRole.ACCOUNTANT -> "Recent Ledger Sales"
    else -> "Recent Activity"
}
