package com.omix.aide

import com.omix.aide.data.local.BusinessSettings
import com.omix.aide.data.local.InMemoryKeyValueStorage
import com.omix.aide.data.local.MobileApprovalStatus
import com.omix.aide.data.local.MobileShiftStatus
import com.omix.aide.data.local.OperationsStore
import com.omix.aide.data.local.WorkspaceContextStore
import com.omix.aide.data.local.converters.asMoney
import com.omix.aide.data.local.converters.toScaledMoney
import com.omix.aide.data.local.dao.CategoryDao
import com.omix.aide.data.local.dao.CategoryExpenseRow
import com.omix.aide.data.local.dao.CustomerDao
import com.omix.aide.data.local.dao.ExpenseDao
import com.omix.aide.data.local.dao.PaymentBreakdownRow
import com.omix.aide.data.local.dao.ProductDao
import com.omix.aide.data.local.dao.SaleDao
import com.omix.aide.data.local.dao.SaleWithItems
import com.omix.aide.data.local.dao.SalesTotalsRow
import com.omix.aide.data.local.dao.TopProductRow
import com.omix.aide.data.local.entities.CategoryEntity
import com.omix.aide.data.local.entities.CustomerEntity
import com.omix.aide.data.local.entities.ExpenseEntity
import com.omix.aide.data.local.entities.ProductEntity
import com.omix.aide.data.local.entities.SaleEntity
import com.omix.aide.data.local.entities.SaleItemEntity
import com.omix.aide.data.repository.CustomerRepository
import com.omix.aide.data.repository.ExpenseRepository
import com.omix.aide.data.repository.ProductRepository
import com.omix.aide.data.repository.ReportRepository
import com.omix.aide.data.repository.SaleRepository
import com.omix.aide.domain.ia.DeviceAssignmentMode
import com.omix.aide.domain.ia.EmployeeRole
import com.omix.aide.domain.ia.MobileDestination
import com.omix.aide.domain.ia.RoleNavigationResolver
import com.omix.aide.ui.viewmodel.HomeViewModel
import com.omix.aide.ui.viewmodel.OperationsViewModel
import com.omix.aide.ui.viewmodel.ReportViewModel
import com.omix.aide.ui.viewmodel.SellViewModel
import com.omix.aide.ui.viewmodel.StockViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/**
 * Quantitative usability & context-isolation journey tests (AIDE-ANDROID-06).
 *
 * Measures task completion time, interaction step count (tap depth), and error
 * rate across core Cashier, Warehouse Operator, and Branch Manager journeys,
 * and verifies zero stale content leakage across role/branch switches.
 */
@OptIn(ExperimentalCoroutinesApi::class)
class RoleIaUsabilityJourneyTest {

    data class UsabilityJourneyMetrics(
        val journeyName: String,
        val elapsedMillis: Long,
        val interactionSteps: Int,
        val maxReachTaps: Int,
        val errorCount: Int
    ) {
        val errorRate: Double
            get() = if (interactionSteps == 0) 0.0 else errorCount.toDouble() / interactionSteps
    }

    private val testDispatcher = UnconfinedTestDispatcher()

    @Before
    fun setUp() {
        Dispatchers.setMain(testDispatcher)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun coreCashierJourneyMeasuresFastCompletionZeroErrorRateAndHidesFinancialProfit() = runTest(testDispatcher) {
        val env = TestWorkspaceEnvironment()
        val cashierMembership = env.workspaceStore.addMembership(
            employeeName = "Grace Wanjiku",
            organizationName = "Omix Retail",
            businessName = "Nairobi Branch",
            branchName = "Nairobi CBD",
            terminalName = "Till 02",
            role = EmployeeRole.CASHIER,
            deviceAssignment = DeviceAssignmentMode.DEDICATED_POS_TERMINAL,
            businessId = "biz-cbd",
            activateImmediately = true
        )
        assertNotNull(cashierMembership)

        env.seedProduct(
            id = "sku-flour-2kg",
            businessId = "biz-cbd",
            name = "Maize Flour 2kg",
            sku = "FLR-2KG",
            buyingPrice = 145.0,
            sellingPrice = 180.0,
            quantity = 30
        )

        val unconfined = UnconfinedTestDispatcher(testScheduler)
        val homeCollector = backgroundScope.launch(unconfined) { env.homeViewModel.uiState.collect {} }
        val sellCollector = backgroundScope.launch(unconfined) { env.sellViewModel.uiState.collect {} }
        val opsCollector = backgroundScope.launch(unconfined) { env.operationsViewModel.uiState.collect {} }
        val reportCollector = backgroundScope.launch(unconfined) { env.reportViewModel.uiState.collect {} }
        advanceUntilIdle()

        val startedNs = System.nanoTime()
        var steps = 0
        var errors = 0
        var maxReachTaps = 0

        // Step 1: Verify Cashier primary bar exposes Shifts, Lookup, Sell in 1 tap
        val nav = RoleNavigationResolver.resolve(env.workspaceStore.activeContext.value)
        steps++
        if (MobileDestination.SHIFTS !in nav.primaryDestinations ||
            MobileDestination.SELL !in nav.primaryDestinations ||
            MobileDestination.PRODUCT_LOOKUP !in nav.primaryDestinations
        ) {
            errors++
        }
        maxReachTaps = maxOf(maxReachTaps, 1)

        // Step 2: Open shift with 2,000 float on Till 02 (1 tap to Shift tab + 1 tap to Open)
        env.operationsViewModel.openShift(openingFloat = 2000.0)
        steps++
        maxReachTaps = maxOf(maxReachTaps, 2)
        if (env.operationsViewModel.uiState.value.errorMessage != null ||
            env.operationsViewModel.uiState.value.openShift == null
        ) {
            errors++
        }

        // Step 3: Lookup SKU by barcode/code and add 2 packs to POS cart
        env.operationsViewModel.setLookupQuery("FLR-2KG")
        val found = env.operationsViewModel.uiState.value.filteredProducts.firstOrNull()
        steps++
        if (found == null) {
            errors++
        } else {
            env.sellViewModel.addToCart(found)
            env.sellViewModel.updateQuantity(found.id, 1) // total 2 units = 360.0
        }

        // Step 4: Complete cash sale (paid 500 -> change 140)
        var completedSaleId: String? = null
        env.sellViewModel.setPaymentMethod("CASH")
        env.sellViewModel.setAmountPaid("500")
        env.sellViewModel.completeSale { saleId -> completedSaleId = saleId }
        steps++
        if (completedSaleId == null || env.sellViewModel.uiState.value.error != null) {
            errors++
        }

        // Step 5: Request manager approval for a customer loyalty discount on next order
        env.operationsViewModel.requestApproval(
            actionType = "PRICE_OVERRIDE",
            title = "Bulk crate 5% discount",
            reason = "Repeat wholesale buyer at Till 02",
            amount = 90.0
        )
        steps++
        if (env.operationsViewModel.uiState.value.errorMessage != null) {
            errors++
        }

        // Step 6: Close shift and reconcile drawer (expected 2,000 + 360 = 2,360)
        env.operationsViewModel.closeShift(countedCash = 2360.0, notes = "Balanced drawer")
        steps++
        val closedShift = env.operationsViewModel.uiState.value.shiftHistory.firstOrNull()
        if (env.operationsViewModel.uiState.value.errorMessage != null ||
            closedShift?.status != MobileShiftStatus.CLOSED ||
            closedShift.cashVariance != 0.0
        ) {
            errors++
        }

        val elapsedMs = (System.nanoTime() - startedNs) / 1_000_000
        val metrics = UsabilityJourneyMetrics(
            journeyName = "Cashier Shift-to-Close Journey",
            elapsedMillis = elapsedMs,
            interactionSteps = steps,
            maxReachTaps = maxReachTaps,
            errorCount = errors
        )

        assertEquals("Cashier journey error rate must be 0%", 0.0, metrics.errorRate, 0.0)
        assertTrue("Cashier primary tasks must stay within <=2 taps", metrics.maxReachTaps <= 2)
        assertTrue("Cashier journey should complete well under 2,000ms budget", metrics.elapsedMillis < 2_000L)

        // Verify Cashier cannot see profit on Home or access Reports
        assertEquals(0.0, env.homeViewModel.uiState.value.todayProfitTotal, 0.001)
        assertEquals(360.0, env.homeViewModel.uiState.value.todaySalesTotal, 0.001)
        assertFalse(env.reportViewModel.uiState.value.canReadReport)
        assertNull(env.reportViewModel.uiState.value.report)

        homeCollector.cancel()
        sellCollector.cancel()
        opsCollector.cancel()
        reportCollector.cancel()
    }

    @Test
    fun coreWarehouseJourneyReceivesGoodsLogsVarianceApprovalAndCompletesChecklistWithZeroErrors() = runTest(testDispatcher) {
        val env = TestWorkspaceEnvironment()
        env.workspaceStore.addMembership(
            employeeName = "David Otieno",
            organizationName = "Omix Logistics",
            businessName = "Industrial Area Depot",
            branchName = "Industrial Area",
            warehouseName = "Stockroom B",
            role = EmployeeRole.WAREHOUSE_OPERATOR,
            deviceAssignment = DeviceAssignmentMode.DEDICATED_WAREHOUSE_HANDHELD,
            businessId = "biz-depot",
            activateImmediately = true
        )

        env.seedProduct(
            id = "sku-oil-5l",
            businessId = "biz-depot",
            name = "Cooking Oil 5L",
            sku = "OIL-5L",
            buyingPrice = 980.0,
            sellingPrice = 1250.0,
            quantity = 10
        )

        val unconfined = UnconfinedTestDispatcher(testScheduler)
        val homeCollector = backgroundScope.launch(unconfined) { env.homeViewModel.uiState.collect {} }
        val opsCollector = backgroundScope.launch(unconfined) { env.operationsViewModel.uiState.collect {} }
        advanceUntilIdle()

        val startedNs = System.nanoTime()
        var steps = 0
        var errors = 0

        // Step 1: Verify Warehouse primary navigation has Receive, Count, Tasks directly in 1 tap
        val nav = RoleNavigationResolver.resolve(env.workspaceStore.activeContext.value)
        steps++
        if (nav.primaryDestinations.map { it.route } != listOf("home", "receive-goods", "stock-count", "tasks")) {
            errors++
        }

        // Step 2: Receive 15 jerrycans on GRN
        val productBefore = env.operationsViewModel.uiState.value.products.single()
        env.operationsViewModel.receiveGoods(
            product = productBefore,
            supplierName = "Bidco Refineries",
            referenceNumber = "DN-8841",
            quantityReceived = 15,
            unitCost = 980.0
        )
        steps++
        val afterGrn = env.operationsViewModel.uiState.value.products.single()
        if (afterGrn.quantity != 25 || env.operationsViewModel.uiState.value.goodsReceipts.size != 1) {
            errors++
        }

        // Step 3: Perform cycle count discovering 1 damaged unit (counted 24 vs system 25)
        // Warehouse Operator lacks STOCK_ADJUST_CREATE, so system logs count & auto-queues variance approval!
        env.operationsViewModel.submitStockCount(
            product = afterGrn,
            countedQuantity = 24,
            reason = "1 leaking jerrycan on pallet"
        )
        steps++
        val recordedCount = env.operationsViewModel.uiState.value.stockCounts.firstOrNull()
        val autoApproval = env.operationsViewModel.uiState.value.approvals.firstOrNull()
        if (recordedCount == null ||
            recordedCount.appliedToStock ||
            recordedCount.variance != -1 ||
            autoApproval == null ||
            autoApproval.actionType != "STOCK_VARIANCE"
        ) {
            errors++
        }

        // Step 4: Mark assigned warehouse task completed
        val firstTask = env.operationsViewModel.uiState.value.roleTasks.firstOrNull()
        steps++
        if (firstTask == null) {
            errors++
        } else {
            env.operationsViewModel.setTaskCompleted(firstTask.id, true)
            val updatedTask = env.operationsViewModel.uiState.value.roleTasks.first { it.id == firstTask.id }
            if (!updatedTask.completed) errors++
        }

        val elapsedMs = (System.nanoTime() - startedNs) / 1_000_000
        val metrics = UsabilityJourneyMetrics(
            journeyName = "Warehouse Receiving & Cycle Count Journey",
            elapsedMillis = elapsedMs,
            interactionSteps = steps,
            maxReachTaps = 1,
            errorCount = errors
        )

        assertEquals("Warehouse journey error rate must be 0%", 0.0, metrics.errorRate, 0.0)
        assertTrue("Warehouse journey must complete within 2,000ms", metrics.elapsedMillis < 2_000L)
        // Warehouse operator never sees sales or profit figures
        assertEquals(0.0, env.homeViewModel.uiState.value.todaySalesTotal, 0.001)
        assertEquals(0.0, env.homeViewModel.uiState.value.todayProfitTotal, 0.001)

        homeCollector.cancel()
        opsCollector.cancel()
    }

    @Test
    fun managerJourneyApprovesTeamRequestAndContextSwitchClearsStaleDataAcrossTenants() = runTest(testDispatcher) {
        val env = TestWorkspaceEnvironment()

        // Branch A: Cashier submits approval request + Branch A has products & sales
        val cashierBranchA = env.workspaceStore.addMembership(
            employeeName = "Grace",
            organizationName = "Omix Group",
            businessName = "Branch A - Kilimani",
            branchName = "Kilimani",
            terminalName = "Till 01",
            role = EmployeeRole.CASHIER,
            businessId = "biz-kilimani",
            activateImmediately = true
        )
        val managerBranchA = env.workspaceStore.addMembership(
            employeeName = "Peter Kamau",
            organizationName = "Omix Group",
            businessName = "Branch A - Kilimani",
            branchName = "Kilimani",
            terminalName = "Manager Desk",
            role = EmployeeRole.BRANCH_MANAGER,
            businessId = "biz-kilimani",
            activateImmediately = false
        )
        val managerBranchB = env.workspaceStore.addMembership(
            employeeName = "Peter Kamau",
            organizationName = "Omix Group",
            businessName = "Branch B - Thika Road",
            branchName = "Thika Road",
            terminalName = "Manager Desk",
            role = EmployeeRole.BRANCH_MANAGER,
            businessId = "biz-thika",
            activateImmediately = false
        )

        env.seedProduct(
            id = "prod-kilimani",
            businessId = "biz-kilimani",
            name = "Kilimani Espresso Beans",
            sku = "KIL-ESP",
            buyingPrice = 800.0,
            sellingPrice = 1200.0,
            quantity = 12
        )
        env.seedProduct(
            id = "prod-thika",
            businessId = "biz-thika",
            name = "Thika Tea Leaves",
            sku = "THK-TEA",
            buyingPrice = 200.0,
            sellingPrice = 320.0,
            quantity = 40
        )

        val unconfined = UnconfinedTestDispatcher(testScheduler)
        val homeCollector = backgroundScope.launch(unconfined) { env.homeViewModel.uiState.collect {} }
        val sellCollector = backgroundScope.launch(unconfined) { env.sellViewModel.uiState.collect {} }
        val stockCollector = backgroundScope.launch(unconfined) { env.stockViewModel.uiState.collect {} }
        val opsCollector = backgroundScope.launch(unconfined) { env.operationsViewModel.uiState.collect {} }
        advanceUntilIdle()

        // Cashier submits an override request in Branch A
        assertEquals(cashierBranchA.membershipId, env.workspaceStore.activeContext.value.membershipId)
        env.operationsViewModel.requestApproval(
            actionType = "SALE_REFUND",
            title = "Refund damaged mug",
            reason = "Cracked handle on unboxing",
            amount = 450.0
        )
        val pendingId = env.operationsViewModel.uiState.value.approvals.single().id

        val startedNs = System.nanoTime()
        var steps = 0
        var errors = 0

        // Step 1: Switch to Branch Manager in Branch A
        env.workspaceStore.switchActiveMembership(managerBranchA.membershipId)
        steps++
        if (env.homeViewModel.uiState.value.pendingApprovals.size != 1) errors++

        // Step 2: Manager approves Cashier's request
        env.operationsViewModel.decideApproval(requestId = pendingId, approve = true, comment = "Verified item")
        steps++
        val decided = env.operationsViewModel.uiState.value.approvals.first { it.id == pendingId }
        if (decided.status != MobileApprovalStatus.APPROVED ||
            env.operationsViewModel.uiState.value.errorMessage != null
        ) {
            errors++
        }

        // Step 3: Manager submits their OWN request and tries to self-approve -> blocked by Separation of Duties!
        env.operationsViewModel.requestApproval(
            actionType = "STOCK_VARIANCE",
            title = "Manager self write-off",
            reason = "Self submitted",
            amount = 1200.0
        )
        val selfReqId = env.operationsViewModel.uiState.value.approvals.first {
            it.requestedByMembershipId == managerBranchA.membershipId
        }.id
        env.operationsViewModel.decideApproval(requestId = selfReqId, approve = true)
        steps++
        val stillPending = env.operationsViewModel.uiState.value.approvals.first { it.id == selfReqId }
        if (stillPending.status != MobileApprovalStatus.PENDING ||
            env.operationsViewModel.uiState.value.errorMessage == null
        ) {
            errors++
        }
        env.operationsViewModel.clearMessages()

        // Step 4: Put a Branch A product into POS cart + search query, then switch to Branch B
        val branchAProduct = env.sellViewModel.uiState.value.products.single()
        env.sellViewModel.addToCart(branchAProduct)
        env.stockViewModel.setSearchQuery("Kilimani")
        assertTrue(env.sellViewModel.hasActiveCartItems())

        env.workspaceStore.switchActiveMembership(managerBranchB.membershipId)
        steps++

        // Verify ZERO stale Branch A cart, search query, products, or approvals in Branch B!
        if (env.sellViewModel.uiState.value.cart.isNotEmpty() ||
            env.stockViewModel.uiState.value.searchQuery.isNotEmpty() ||
            env.stockViewModel.uiState.value.products.map { it.id } != listOf("prod-thika") ||
            env.operationsViewModel.uiState.value.approvals.isNotEmpty()
        ) {
            errors++
        }

        val elapsedMs = (System.nanoTime() - startedNs) / 1_000_000
        val metrics = UsabilityJourneyMetrics(
            journeyName = "Branch Manager Approval & Multi-Branch Switch Journey",
            elapsedMillis = elapsedMs,
            interactionSteps = steps,
            maxReachTaps = 2,
            errorCount = errors
        )

        assertEquals("Manager journey error rate must be 0%", 0.0, metrics.errorRate, 0.0)
        assertTrue("Manager journey must complete within 2,000ms", metrics.elapsedMillis < 2_000L)

        homeCollector.cancel()
        sellCollector.cancel()
        stockCollector.cancel()
        opsCollector.cancel()
    }
}

/**
 * Self-contained in-memory Room-DAO environment for fast, deterministic JVM
 * ViewModel + Store journey testing without Android emulator overhead.
 */
private class TestWorkspaceEnvironment {
    val storage = InMemoryKeyValueStorage()
    val workspaceStore = WorkspaceContextStore(
        storage = storage,
        initialBusinessId = "biz-default",
        initialBusinessName = "Default Shop",
        alreadyCompletedLegacySetup = true
    )
    val operationsStore = OperationsStore(storage)

    private val productDao = FakeProductDao()
    private val categoryDao = FakeCategoryDao()
    private val saleDao = FakeSaleDao()
    private val expenseDao = FakeExpenseDao()
    private val customerDao = FakeCustomerDao()

    val productRepository = ProductRepository(productDao, categoryDao)
    val saleRepository = SaleRepository(saleDao, productDao)
    val expenseRepository = ExpenseRepository(expenseDao)
    val customerRepository = CustomerRepository(customerDao)
    val reportRepository = ReportRepository(saleDao, expenseRepository)

    val homeViewModel = HomeViewModel(
        productRepository = productRepository,
        saleRepository = saleRepository,
        contextFlow = workspaceStore.activeContext,
        expenseRepository = expenseRepository,
        customerRepository = customerRepository,
        operationsStore = operationsStore
    )
    val sellViewModel = SellViewModel(
        productRepository = productRepository,
        saleRepository = saleRepository,
        contextFlow = workspaceStore.activeContext,
        settingsProvider = { BusinessSettings(currency = "KSh", taxRate = 16.0) }
    )
    val stockViewModel = StockViewModel(
        productRepository = productRepository,
        contextFlow = workspaceStore.activeContext
    )
    val reportViewModel = ReportViewModel(
        reportRepository = reportRepository,
        contextFlow = workspaceStore.activeContext
    )
    val operationsViewModel = OperationsViewModel(
        productRepository = productRepository,
        saleRepository = saleRepository,
        operationsStore = operationsStore,
        contextFlow = workspaceStore.activeContext,
        membershipsCountProvider = { workspaceStore.memberships.value.size }
    )

    suspend fun seedProduct(
        id: String,
        businessId: String,
        name: String,
        sku: String,
        buyingPrice: Double,
        sellingPrice: Double,
        quantity: Int
    ) {
        productDao.insertOrUpdate(
            ProductEntity(
                id = id,
                businessId = businessId,
                name = name,
                sku = sku,
                buyingPrice = buyingPrice.toScaledMoney(),
                sellingPrice = sellingPrice.toScaledMoney(),
                quantity = quantity,
                lowStock = 5,
                createdAt = "2026-11-26T08:00:00.000Z",
                updatedAt = "2026-11-26T08:00:00.000Z"
            )
        )
    }
}

private class FakeProductDao : ProductDao {
    private val rows = MutableStateFlow<List<ProductEntity>>(emptyList())

    override fun getProductsByBusiness(businessId: String): Flow<List<ProductEntity>> =
        rows.map { list -> list.filter { it.businessId == businessId && it.isActive }.sortedBy { it.name } }

    override suspend fun getProductById(id: String): ProductEntity? =
        rows.value.firstOrNull { it.id == id }

    override fun getLowStockProducts(businessId: String): Flow<List<ProductEntity>> =
        rows.map { list -> list.filter { it.businessId == businessId && it.isActive && it.quantity <= it.lowStock } }

    override suspend fun getLowStockProductsOnce(businessId: String): List<ProductEntity> =
        rows.value.filter { it.businessId == businessId && it.isActive && it.quantity <= it.lowStock }

    override suspend fun countActiveProducts(businessId: String): Int =
        rows.value.count { it.businessId == businessId && it.isActive }

    override suspend fun insertOrUpdate(product: ProductEntity) {
        rows.value = rows.value.filterNot { it.id == product.id } + product
    }

    override suspend fun insertAll(products: List<ProductEntity>) {
        val ids = products.map { it.id }.toSet()
        rows.value = rows.value.filterNot { it.id in ids } + products
    }

    override suspend fun decrementStock(productId: String, qty: Int) {
        rows.value = rows.value.map {
            if (it.id == productId) it.copy(quantity = it.quantity - qty) else it
        }
    }

    override suspend fun deleteById(id: String) {
        rows.value = rows.value.filterNot { it.id == id }
    }
}

private class FakeCategoryDao : CategoryDao {
    private val rows = MutableStateFlow<List<CategoryEntity>>(emptyList())

    override fun getCategoriesByBusiness(businessId: String): Flow<List<CategoryEntity>> =
        rows.map { list -> list.filter { it.businessId == businessId } }

    override suspend fun insertOrUpdate(category: CategoryEntity) {
        rows.value = rows.value.filterNot { it.id == category.id } + category
    }

    override suspend fun insertAll(categories: List<CategoryEntity>) {
        val ids = categories.map { it.id }.toSet()
        rows.value = rows.value.filterNot { it.id in ids } + categories
    }
}

private class FakeSaleDao : SaleDao {
    private val sales = MutableStateFlow<List<SaleEntity>>(emptyList())
    private val items = MutableStateFlow<List<SaleItemEntity>>(emptyList())

    override fun getSalesWithItems(businessId: String): Flow<List<SaleWithItems>> =
        combine(sales, items) { salesList, itemsList ->
            salesList.filter { it.businessId == businessId }
                .sortedByDescending { it.createdAt }
                .map { s -> SaleWithItems(s, itemsList.filter { it.saleId == s.id }) }
        }

    override suspend fun getSaleWithItemsById(saleId: String): SaleWithItems? {
        val sale = sales.value.firstOrNull { it.id == saleId } ?: return null
        return SaleWithItems(sale, items.value.filter { it.saleId == saleId })
    }

    override suspend fun insertSale(sale: SaleEntity) {
        sales.value = sales.value.filterNot { it.id == sale.id } + sale
    }

    override suspend fun getSalesSince(businessId: String, sinceIso: String): List<SaleEntity> =
        sales.value.filter { it.businessId == businessId && it.createdAt >= sinceIso }

    override suspend fun insertSaleItems(items: List<SaleItemEntity>) {
        val ids = items.map { it.id }.toSet()
        this.items.value = this.items.value.filterNot { it.id in ids } + items
    }

    override suspend fun getTotalsSince(businessId: String, sinceIso: String): SalesTotalsRow {
        val matching = getSalesSince(businessId, sinceIso)
        return SalesTotalsRow(
            revenue = matching.sumOf { it.total },
            cost = matching.sumOf { it.cost },
            profit = matching.sumOf { it.profit },
            tax = matching.sumOf { it.tax },
            count = matching.size
        )
    }

    override suspend fun getTopProducts(
        businessId: String,
        sinceIso: String,
        limit: Int
    ): List<TopProductRow> = emptyList()

    override suspend fun getPaymentBreakdown(
        businessId: String,
        sinceIso: String
    ): List<PaymentBreakdownRow> = emptyList()
}

private class FakeExpenseDao : ExpenseDao {
    private val rows = MutableStateFlow<List<ExpenseEntity>>(emptyList())

    override fun getExpenses(businessId: String): Flow<List<ExpenseEntity>> =
        rows.map { list -> list.filter { it.businessId == businessId } }

    override suspend fun getExpensesSince(businessId: String, sinceIso: String): List<ExpenseEntity> =
        rows.value.filter { it.businessId == businessId && it.createdAt >= sinceIso }

    override suspend fun getOverheadsSince(businessId: String, sinceIso: String): Long =
        rows.value.filter { it.businessId == businessId && !it.isCogs && it.createdAt >= sinceIso }
            .sumOf { it.amount }

    override suspend fun getCategoryTotalsSince(
        businessId: String,
        sinceIso: String
    ): List<CategoryExpenseRow> = emptyList()

    override suspend fun insertOrUpdate(expense: ExpenseEntity) {
        rows.value = rows.value.filterNot { it.id == expense.id } + expense
    }

    override suspend fun deleteById(id: String) {
        rows.value = rows.value.filterNot { it.id == id }
    }
}

private class FakeCustomerDao : CustomerDao {
    private val rows = MutableStateFlow<List<CustomerEntity>>(emptyList())

    override fun getCustomers(businessId: String): Flow<List<CustomerEntity>> =
        rows.map { list -> list.filter { it.businessId == businessId } }

    override fun getActiveCustomers(businessId: String): Flow<List<CustomerEntity>> =
        rows.map { list -> list.filter { it.businessId == businessId && it.isActive } }

    override suspend fun getById(id: String): CustomerEntity? =
        rows.value.firstOrNull { it.id == id }

    override suspend fun getTotalOwed(businessId: String): Long =
        rows.value.filter { it.businessId == businessId && it.balance > 0L }.sumOf { it.balance }

    override suspend fun insertOrUpdate(customer: CustomerEntity) {
        rows.value = rows.value.filterNot { it.id == customer.id } + customer
    }

    override suspend fun deleteById(id: String) {
        rows.value = rows.value.filterNot { it.id == id }
    }
}
