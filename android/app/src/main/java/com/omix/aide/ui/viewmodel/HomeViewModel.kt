package com.omix.aide.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.omix.aide.data.local.AssignedTaskRecord
import com.omix.aide.data.local.ApprovalRequestRecord
import com.omix.aide.data.local.BusinessOperationsSnapshot
import com.omix.aide.data.local.GoodsReceiptRecord
import com.omix.aide.data.local.InMemoryKeyValueStorage
import com.omix.aide.data.local.MobileApprovalStatus
import com.omix.aide.data.local.MobileShiftStatus
import com.omix.aide.data.local.OperationsStore
import com.omix.aide.data.local.ShiftRecord
import com.omix.aide.data.local.StockCountRecord
import com.omix.aide.data.local.converters.asMoney
import com.omix.aide.data.local.dao.SaleWithItems
import com.omix.aide.data.local.entities.CustomerEntity
import com.omix.aide.data.local.entities.ExpenseEntity
import com.omix.aide.data.local.entities.ProductEntity
import com.omix.aide.data.repository.CustomerRepository
import com.omix.aide.data.repository.ExpenseRepository
import com.omix.aide.data.repository.ProductRepository
import com.omix.aide.data.repository.SaleRepository
import com.omix.aide.domain.ia.EmployeeRole
import com.omix.aide.domain.ia.MobilePermission
import com.omix.aide.domain.ia.OperatingContext
import com.omix.aide.domain.ia.ResolvedRoleNavigation
import com.omix.aide.domain.ia.RoleNavigationResolver
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.stateIn

data class HomeUiState(
    val activeContext: OperatingContext = defaultHomeContext("default"),
    val navigation: ResolvedRoleNavigation = RoleNavigationResolver.resolve(defaultHomeContext("default")),
    val todaySalesTotal: Double = 0.0,
    val todayProfitTotal: Double = 0.0,
    val todaySalesCount: Int = 0,
    val weeklySales: List<DailyTotal> = emptyList(),
    val totalProductsCount: Int = 0,
    val stockRetailValue: Double = 0.0,
    val lowStockProducts: List<ProductEntity> = emptyList(),
    val recentSales: List<SaleWithItems> = emptyList(),
    val totalReceivablesOwed: Double = 0.0,
    val totalExpensesRecorded: Double = 0.0,
    val openShift: ShiftRecord? = null,
    val shiftSalesTotal: Double = 0.0,
    val shiftSalesCount: Int = 0,
    val assignedTasks: List<AssignedTaskRecord> = emptyList(),
    val pendingApprovals: List<ApprovalRequestRecord> = emptyList(),
    val myPendingApprovalCount: Int = 0,
    val recentGoodsReceipts: List<GoodsReceiptRecord> = emptyList(),
    val recentStockCounts: List<StockCountRecord> = emptyList(),
    val isLoading: Boolean = false
)

private fun defaultHomeContext(businessId: String) = OperatingContext(
    membershipId = "mem-$businessId",
    organizationId = "org-$businessId",
    organizationName = "My Business",
    businessId = businessId,
    businessName = "My Business",
    role = EmployeeRole.OWNER_ADMIN
)

@OptIn(ExperimentalCoroutinesApi::class)
class HomeViewModel(
    private val productRepository: ProductRepository,
    private val saleRepository: SaleRepository,
    contextFlow: StateFlow<OperatingContext>,
    private val expenseRepository: ExpenseRepository? = null,
    private val customerRepository: CustomerRepository? = null,
    private val operationsStore: OperationsStore = OperationsStore(InMemoryKeyValueStorage())
) : ViewModel() {

    constructor(
        productRepository: ProductRepository,
        saleRepository: SaleRepository,
        businessId: String
    ) : this(
        productRepository = productRepository,
        saleRepository = saleRepository,
        contextFlow = MutableStateFlow(defaultHomeContext(businessId))
    )

    val uiState: StateFlow<HomeUiState> = contextFlow.flatMapLatest { context ->
        val nav = RoleNavigationResolver.resolve(context)
        if (context.isRevoked) {
            return@flatMapLatest flowOf(
                HomeUiState(
                    activeContext = context,
                    navigation = nav,
                    isLoading = false
                )
            )
        }

        val bId = context.businessId
        val productsFlow: Flow<List<ProductEntity>> =
            if (context.hasPermission(MobilePermission.PRODUCT_READ)) {
                productRepository.getProducts(bId)
            } else {
                flowOf(emptyList())
            }
        val salesFlow: Flow<List<SaleWithItems>> =
            if (context.hasAnyPermission(MobilePermission.SALE_READ, MobilePermission.REPORT_READ)) {
                saleRepository.getSales(bId)
            } else {
                flowOf(emptyList())
            }
        val expensesFlow: Flow<List<ExpenseEntity>> =
            if (expenseRepository != null && context.hasPermission(MobilePermission.EXPENSE_READ)) {
                expenseRepository.getExpenses(bId)
            } else {
                flowOf(emptyList())
            }
        val customersFlow: Flow<List<CustomerEntity>> =
            if (customerRepository != null && context.hasPermission(MobilePermission.CUSTOMER_READ)) {
                customerRepository.getCustomers(bId)
            } else {
                flowOf(emptyList())
            }
        val opsFlow: Flow<BusinessOperationsSnapshot> =
            operationsStore.observeBusinessOperations(bId, context.branchName)

        combine(
            productsFlow,
            salesFlow,
            expensesFlow,
            customersFlow,
            opsFlow
        ) { products, sales, expenses, customers, ops ->
            val now = System.currentTimeMillis()
            val canReadSales = context.hasPermission(MobilePermission.SALE_READ)
            val canReadReports = context.hasPermission(MobilePermission.REPORT_READ)
            val today = SaleTimeline.todayTotals(sales, now)
            val week = if (canReadReports) SaleTimeline.lastSevenDays(sales, now) else emptyList()
            val lowStock = products.filter { it.quantity <= it.lowStock }
            val retailVal = products.sumOf { it.sellingPrice.asMoney() * it.quantity }

            val openShift = ops.shifts.firstOrNull { it.status == MobileShiftStatus.OPEN }
            val shiftSales = if (openShift != null && canReadSales) {
                sales.filter { it.sale.createdAt >= openShift.openedAt }
            } else {
                emptyList()
            }

            val roleTasks = ops.tasks.filter { context.role in it.assignedRoles }
            val pendingApprovals = ops.approvals.filter { it.status == MobileApprovalStatus.PENDING }

            HomeUiState(
                activeContext = context,
                navigation = nav,
                todaySalesTotal = if (canReadSales || canReadReports) today.total else 0.0,
                todayProfitTotal = if (canReadReports) today.profit else 0.0,
                todaySalesCount = if (canReadSales || canReadReports) today.count else 0,
                weeklySales = week,
                totalProductsCount = products.size,
                stockRetailValue = if (context.hasAnyPermission(
                        MobilePermission.PRODUCT_UPDATE,
                        MobilePermission.REPORT_READ
                    )
                ) retailVal else 0.0,
                lowStockProducts = lowStock,
                recentSales = if (canReadSales) sales.take(5) else emptyList(),
                totalReceivablesOwed = customers.filter { it.balance > 0L }.sumOf { it.balance.asMoney() },
                totalExpensesRecorded = expenses.sumOf { it.amount.asMoney() },
                openShift = openShift,
                shiftSalesTotal = shiftSales.sumOf { it.sale.total.asMoney() },
                shiftSalesCount = shiftSales.size,
                assignedTasks = roleTasks,
                pendingApprovals = if (context.hasPermission(MobilePermission.APPROVAL_DECIDE)) {
                    pendingApprovals
                } else {
                    emptyList()
                },
                myPendingApprovalCount = pendingApprovals.count {
                    it.requestedByMembershipId == context.membershipId
                },
                recentGoodsReceipts = if (context.hasAnyPermission(
                        MobilePermission.GOODS_RECEIVE,
                        MobilePermission.PURCHASE_ORDER_READ
                    )
                ) ops.goodsReceipts.take(5) else emptyList(),
                recentStockCounts = if (context.hasAnyPermission(
                        MobilePermission.STOCK_COUNT_PERFORM,
                        MobilePermission.STOCK_ADJUST_READ
                    )
                ) ops.stockCounts.take(5) else emptyList(),
                isLoading = false
            )
        }
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = HomeUiState(
            activeContext = contextFlow.value,
            navigation = RoleNavigationResolver.resolve(contextFlow.value),
            isLoading = true
        )
    )
}
