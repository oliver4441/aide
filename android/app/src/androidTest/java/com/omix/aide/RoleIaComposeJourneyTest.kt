package com.omix.aide

import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.focus.FocusManager
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.platform.SoftwareKeyboardController
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onAllNodesWithTag
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.test.performTextReplacement
import androidx.room.Room
import androidx.test.platform.app.InstrumentationRegistry
import com.omix.aide.data.local.AideDatabase
import com.omix.aide.data.local.BusinessSettings
import com.omix.aide.data.local.InMemoryKeyValueStorage
import com.omix.aide.data.local.OperationsStore
import com.omix.aide.data.local.WorkspaceContextStore
import com.omix.aide.data.local.converters.toScaledMoney
import com.omix.aide.data.local.entities.ProductEntity
import com.omix.aide.data.repository.CustomerRepository
import com.omix.aide.data.repository.ExpenseRepository
import com.omix.aide.data.repository.ProductRepository
import com.omix.aide.data.repository.ReportRepository
import com.omix.aide.data.repository.SaleRepository
import com.omix.aide.domain.ia.DeviceAssignmentMode
import com.omix.aide.domain.ia.EmployeeRole
import com.omix.aide.ui.LocalAideSettings
import com.omix.aide.ui.theme.AideTheme
import com.omix.aide.ui.viewmodel.CustomerViewModel
import com.omix.aide.ui.viewmodel.ExpenseViewModel
import com.omix.aide.ui.viewmodel.HomeViewModel
import com.omix.aide.ui.viewmodel.OperationsViewModel
import com.omix.aide.ui.viewmodel.ReportViewModel
import com.omix.aide.ui.viewmodel.SellViewModel
import com.omix.aide.ui.viewmodel.StockViewModel
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Rule
import org.junit.Test

/**
 * End-to-end Compose UI instrumentation tests verifying role-based navigation,
 * unauthorized control hiding, context switching, and graceful revocation in
 * the rendered Android UI across both phone and tablet viewports.
 */
class RoleIaComposeJourneyTest {

    @get:Rule
    val composeRule = createComposeRule()

    private lateinit var database: AideDatabase
    private lateinit var workspaceStore: WorkspaceContextStore
    private lateinit var operationsStore: OperationsStore
    private var focusManager: FocusManager? = null
    private var keyboardController: SoftwareKeyboardController? = null

    @Before
    fun setUp() {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        database = Room.inMemoryDatabaseBuilder(context, AideDatabase::class.java)
            .allowMainThreadQueries()
            .build()
        val storage = InMemoryKeyValueStorage()
        workspaceStore = WorkspaceContextStore(
            storage = storage,
            initialBusinessId = "biz-nairobi",
            initialBusinessName = "Nairobi Flagship",
            alreadyCompletedLegacySetup = true
        )
        operationsStore = OperationsStore(storage)

        runBlocking {
            database.productDao().insertOrUpdate(
                ProductEntity(
                    id = "sku-rice-2kg",
                    businessId = "biz-nairobi",
                    name = "Basmati Rice 2kg",
                    sku = "RICE-2KG",
                    buyingPrice = 320.0.toScaledMoney(),
                    sellingPrice = 450.0.toScaledMoney(),
                    quantity = 20,
                    lowStock = 5,
                    createdAt = "2026-11-26T08:00:00.000Z",
                    updatedAt = "2026-11-26T08:00:00.000Z"
                )
            )
        }
    }

    @After
    fun tearDown() {
        database.close()
    }

    private fun dismissKeyboard() {
        composeRule.runOnIdle {
            focusManager?.clearFocus(force = true)
            keyboardController?.hide()
        }
        composeRule.waitForIdle()
    }

    private fun clickPrimaryDestination(route: String) {
        val bottomNodes = composeRule.onAllNodesWithTag("bottom_tab_$route").fetchSemanticsNodes()
        if (bottomNodes.isNotEmpty()) {
            composeRule.onNodeWithTag("bottom_tab_$route").performClick()
        } else {
            composeRule.onNodeWithTag("nav_rail_$route").performClick()
        }
    }

    private fun countPrimaryDestinationNodes(route: String): Int =
        composeRule.onAllNodesWithTag("bottom_tab_$route").fetchSemanticsNodes().size +
            composeRule.onAllNodesWithTag("nav_rail_$route").fetchSemanticsNodes().size

    private fun mountShell() {
        val productRepo = ProductRepository(database.productDao(), database.categoryDao())
        val saleRepo = SaleRepository(database.saleDao(), database.productDao())
        val expenseRepo = ExpenseRepository(database.expenseDao())
        val customerRepo = CustomerRepository(database.customerDao())
        val reportRepo = ReportRepository(database.saleDao(), expenseRepo)
        val ctxFlow = workspaceStore.activeContext

        val homeVm = HomeViewModel(productRepo, saleRepo, ctxFlow, expenseRepo, customerRepo, operationsStore)
        val sellVm = SellViewModel(productRepo, saleRepo, ctxFlow) { BusinessSettings() }
        val stockVm = StockViewModel(productRepo, ctxFlow)
        val expenseVm = ExpenseViewModel(expenseRepo, ctxFlow)
        val customerVm = CustomerViewModel(customerRepo, ctxFlow)
        val reportVm = ReportViewModel(reportRepo, ctxFlow)
        val opsVm = OperationsViewModel(productRepo, saleRepo, operationsStore, ctxFlow) {
            workspaceStore.memberships.value.size
        }

        composeRule.setContent {
            focusManager = LocalFocusManager.current
            keyboardController = LocalSoftwareKeyboardController.current
            CompositionLocalProvider(LocalAideSettings provides BusinessSettings()) {
                AideTheme(darkTheme = true) {
                    AideAppShell(
                        database = database,
                        workspaceStore = workspaceStore,
                        saleRepository = saleRepo,
                        homeViewModel = homeVm,
                        sellViewModel = sellVm,
                        stockViewModel = stockVm,
                        expenseViewModel = expenseVm,
                        customerViewModel = customerVm,
                        reportViewModel = reportVm,
                        operationsViewModel = opsVm
                    )
                }
            }
        }
    }

    @Test
    fun cashierWarehouseAndRevocationJourneysUpdateUiCleanlyWithoutUnauthorizedControls() {
        workspaceStore.updateActiveRoleAndLocation(
            role = EmployeeRole.CASHIER,
            branchName = "Nairobi Flagship",
            terminalName = "Till 01",
            deviceAssignment = DeviceAssignmentMode.DEDICATED_POS_TERMINAL
        )

        mountShell()
        composeRule.waitUntil(timeoutMillis = 10_000) {
            composeRule.onAllNodesWithTag("home_role_header").fetchSemanticsNodes().isNotEmpty()
        }

        // 1. Cashier sees operating context header + Cashier priorities, never Profit KPI or Reports/Stock tabs
        composeRule.onNodeWithTag("operating_context_bar").assertIsDisplayed()
        composeRule.onNodeWithTag("role_home_CASHIER").assertIsDisplayed()
        assertEquals(0, composeRule.onAllNodesWithTag("kpi_profit_today").fetchSemanticsNodes().size)
        assertEquals(0, countPrimaryDestinationNodes("reports"))
        assertEquals(0, countPrimaryDestinationNodes("stock"))

        // 2. Cashier opens Shift in 2 taps (Shift tab -> Open Shift)
        clickPrimaryDestination("shifts")
        composeRule.waitUntil(timeoutMillis = 10_000) {
            composeRule.onAllNodesWithTag("shift_open_button").fetchSemanticsNodes().isNotEmpty()
        }
        composeRule.onNodeWithTag("shift_opening_float_input").performScrollTo().performTextReplacement("1500")
        dismissKeyboard()
        composeRule.onNodeWithTag("shift_open_button").performScrollTo().performClick()
        composeRule.waitUntil(timeoutMillis = 10_000) {
            composeRule.onAllNodesWithTag("shift_close_button").fetchSemanticsNodes().isNotEmpty()
        }
        composeRule.onNodeWithTag("shift_close_button").performScrollTo().assertIsDisplayed()

        // 3. Cashier checks price in Lookup (waits for Room Flow to emit stocked product)
        clickPrimaryDestination("lookup")
        composeRule.waitUntil(timeoutMillis = 10_000) {
            composeRule.onAllNodesWithTag("lookup_item_sku-rice-2kg").fetchSemanticsNodes().isNotEmpty()
        }
        composeRule.onNodeWithText("Basmati Rice 2kg").assertIsDisplayed()

        // 4. Switch role to Warehouse Operator -> navigation updates immediately to Receive / Count / Tasks
        composeRule.runOnIdle {
            workspaceStore.updateActiveRoleAndLocation(
                role = EmployeeRole.WAREHOUSE_OPERATOR,
                branchName = "Nairobi Flagship",
                warehouseName = "Main Stockroom",
                deviceAssignment = DeviceAssignmentMode.DEDICATED_WAREHOUSE_HANDHELD
            )
        }
        composeRule.waitUntil(timeoutMillis = 10_000) {
            countPrimaryDestinationNodes("receive-goods") > 0
        }
        assertEquals(0, countPrimaryDestinationNodes("sell"))

        clickPrimaryDestination("receive-goods")
        composeRule.waitUntil(timeoutMillis = 10_000) {
            composeRule.onAllNodesWithTag("grn_select_product_sku-rice-2kg").fetchSemanticsNodes().isNotEmpty()
        }

        // Post an inbound Goods Receipt on ReceiveGoodsScreen
        composeRule.onNodeWithTag("grn_supplier_input").performScrollTo().performTextReplacement("Mwea Growers")
        dismissKeyboard()
        composeRule.onNodeWithTag("grn_select_product_sku-rice-2kg").performScrollTo().performClick()
        composeRule.onNodeWithTag("grn_quantity_input").performScrollTo().performTextReplacement("12")
        dismissKeyboard()
        composeRule.onNodeWithTag("grn_submit_button").performScrollTo().performClick()
        composeRule.waitUntil(timeoutMillis = 10_000) {
            composeRule.onAllNodesWithText("Recorded GRN-", substring = true).fetchSemanticsNodes().isNotEmpty()
        }
        composeRule.onNodeWithText("Recorded GRN-", substring = true).assertIsDisplayed()

        // 5. Server revokes membership -> UI fails closed immediately with AccessRestrictedScreen
        val activeMembershipId = workspaceStore.activeContext.value.membershipId
        composeRule.runOnIdle {
            workspaceStore.applyServerPermissionChange(
                membershipId = activeMembershipId,
                isRevoked = true,
                revokedReason = "Device reassigned by administrator."
            )
        }
        composeRule.waitUntil(timeoutMillis = 10_000) {
            composeRule.onAllNodesWithTag("access_restricted_screen").fetchSemanticsNodes().isNotEmpty()
        }
        composeRule.onNodeWithTag("access_restricted_screen").assertIsDisplayed()
        composeRule.onNodeWithText("Device reassigned by administrator.").assertIsDisplayed()
    }
}
