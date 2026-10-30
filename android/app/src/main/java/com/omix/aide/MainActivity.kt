package com.omix.aide

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Inventory
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.core.content.ContextCompat
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavType
import androidx.navigation.navArgument
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.omix.aide.data.local.AideDatabase
import com.omix.aide.data.local.DatabaseHealth
import com.omix.aide.data.local.LocalBusinessStore
import com.omix.aide.data.local.SettingsStore
import com.omix.aide.data.repository.CustomerRepository
import com.omix.aide.data.repository.ExpenseRepository
import com.omix.aide.data.repository.ProductRepository
import com.omix.aide.data.repository.QuotationRepository
import com.omix.aide.data.repository.ReportRepository
import com.omix.aide.data.repository.SaleRepository
import com.omix.aide.data.repository.ShiftRepository
import com.omix.aide.data.repository.SupplierRepository
import com.omix.aide.notifications.AideNotifications
import com.omix.aide.notifications.AideRoute
import com.omix.aide.theme.Palette
import com.omix.aide.ui.navigation.Screen
import com.omix.aide.ui.screens.CalculatorScreen
import com.omix.aide.ui.screens.DatabaseProblemScreen
import com.omix.aide.ui.screens.CustomersScreen
import com.omix.aide.ui.screens.ExpensesScreen
import com.omix.aide.ui.screens.HomeScreen
import com.omix.aide.ui.screens.MoreScreen
import com.omix.aide.ui.screens.OnboardingScreen
import com.omix.aide.ui.screens.QuotationsScreen
import com.omix.aide.ui.screens.ReceiptScreen
import com.omix.aide.ui.screens.ReportsScreen
import com.omix.aide.ui.screens.SettingsScreen
import com.omix.aide.ui.screens.SellScreen
import com.omix.aide.ui.screens.ShiftsScreen
import com.omix.aide.ui.screens.StockScreen
import com.omix.aide.ui.screens.SuppliersScreen
import com.omix.aide.ui.screens.showSplash
import com.omix.aide.ui.LocalAideSettings
import com.omix.aide.ui.releases.UpdateCheck
import com.omix.aide.ui.releases.UpdateChecker
import com.omix.aide.ui.releases.UpdateBanner
import com.omix.aide.ui.theme.AideTheme
import com.omix.aide.ui.theme.ThemePickerScreen
import com.omix.aide.ui.viewmodel.CustomerViewModel
import com.omix.aide.ui.viewmodel.ExpenseViewModel
import com.omix.aide.ui.viewmodel.HomeViewModel
import com.omix.aide.ui.viewmodel.QuotationViewModel
import com.omix.aide.ui.viewmodel.ReportViewModel
import com.omix.aide.ui.viewmodel.SellViewModel
import com.omix.aide.ui.viewmodel.ShiftViewModel
import com.omix.aide.ui.viewmodel.StockViewModel
import com.omix.aide.ui.viewmodel.SupplierViewModel
import com.omix.aide.work.AideWorkScheduler
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {

    private val pendingRoute = mutableStateOf<String?>(null)
    private val settings = mutableStateOf(SettingsStore.read(applicationContext))
    private val updateCheck = mutableStateOf<UpdateCheck?>(null)

    init {
        kotlinx.coroutines.CoroutineScope(Dispatchers.Main).launch {
            val result = UpdateChecker.check()
            if (result.newer) {
                LocalBusinessStore(applicationContext).markOutOfDate()
            }
            updateCheck.value = result
        }
    }

    private lateinit var database: AideDatabase
    private lateinit var businessStore: LocalBusinessStore
    private lateinit var businessId: String
    private lateinit var productRepository: ProductRepository
    private lateinit var saleRepository: SaleRepository
    private lateinit var homeViewModel: HomeViewModel
    private lateinit var sellViewModel: SellViewModel
    private lateinit var stockViewModel: StockViewModel
    private lateinit var expenseViewModel: ExpenseViewModel
    private lateinit var customerViewModel: CustomerViewModel
    private lateinit var reportViewModel: ReportViewModel
    private lateinit var supplierViewModel: SupplierViewModel
    private lateinit var shiftViewModel: ShiftViewModel
    private lateinit var quotationViewModel: QuotationViewModel

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        if (DatabaseHealth.isBroken(applicationContext)) {
            showDatabaseRecovery()
            return
        }

        pendingRoute.value = routeFromIntent(intent)

        database = AideDatabase.getDatabase(applicationContext)
        businessStore = LocalBusinessStore(applicationContext)
        businessId = businessStore.getBusinessId()

        productRepository = ProductRepository(
            productDao = database.productDao(),
            categoryDao = database.categoryDao()
        )
        saleRepository = SaleRepository(
            saleDao = database.saleDao(),
            productDao = database.productDao()
        )

        homeViewModel = HomeViewModel(productRepository, saleRepository, businessId)
        sellViewModel = SellViewModel(productRepository, saleRepository, businessId) {
            settings.value
        }
        stockViewModel = StockViewModel(productRepository, businessId)

        expenseViewModel = ExpenseViewModel(
            ExpenseRepository(database.expenseDao()),
            businessId
        )
        customerViewModel = CustomerViewModel(
            CustomerRepository(database.customerDao()),
            businessId
        )
        reportViewModel = ReportViewModel(
            ReportRepository(database.saleDao(), ExpenseRepository(database.expenseDao())),
            businessId
        )
        supplierViewModel = SupplierViewModel(
            SupplierRepository(database.supplierDao()),
            businessId
        )
        shiftViewModel = ShiftViewModel(
            ShiftRepository(database.shiftDao()),
            businessId
        )
        quotationViewModel = QuotationViewModel(
            QuotationRepository(database.quotationDao()),
            businessId
        )

        setContentView(R.layout.splash)
        val accent = Palette.read(this)
        showSplash(
            onReady = { setupContent() },
            accent = accent
        )
    }

    private fun showDatabaseRecovery() {
        setContent {
            CompositionLocalProvider(LocalAideSettings provides settings.value) {
                AideTheme {
                    DatabaseProblemScreen(
                        errorMessage = DatabaseHealth.errorMessage(applicationContext),
                        onRetry = {
                            if (DatabaseHealth.probe(applicationContext)) {
                                recreate()
                            }
                        },
                        onReset = {
                            DatabaseHealth.deleteDatabase(applicationContext)
                            recreate()
                        }
                    )
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        pendingRoute.value = routeFromIntent(intent)
    }

    private fun routeFromIntent(intent: Intent?): String? =
        intent?.getStringExtra(AideNotifications.EXTRA_ROUTE)

    private fun destinationForRoute(route: String?): String? =
        when (AideRoute.fromRoute(route)) {
            AideRoute.DASHBOARD -> Screen.Home.route
            AideRoute.SELL -> Screen.Sell.route
            AideRoute.STOCK -> Screen.Stock.route
            AideRoute.MORE -> Screen.More.route
            null -> null
        }

    private fun setupContent() {
        setContent {
            val navController = rememberNavController()
            val navBackStackEntry by navController.currentBackStackEntryAsState()
            val currentRoute = navBackStackEntry?.destination?.route

            val startDestination = remember {
                if (businessStore.hasCompletedSetup()) {
                    Screen.Home.route
                } else {
                    Screen.Onboarding.route
                }
            }

            val permissionLauncher = rememberLauncherForActivityResult(
                contract = ActivityResultContracts.RequestPermission()
            ) { granted ->
                if (granted) AideWorkScheduler.scheduleAll(applicationContext)
            }

            LaunchedEffect(Unit) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    val granted = ContextCompat.checkSelfPermission(
                        applicationContext,
                        Manifest.permission.POST_NOTIFICATIONS
                    ) == PackageManager.PERMISSION_GRANTED
                    if (!granted) {
                        permissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
                    }
                }
            }

            LaunchedEffect(pendingRoute.value) {
                val target = pendingRoute.value ?: return@LaunchedEffect
                val destination = destinationForRoute(target)
                if (destination != null) {
                    navController.navigate(destination) {
                        popUpTo(navController.graph.findStartDestination().id) {
                            saveState = true
                        }
                        launchSingleTop = true
                    }
                }
                pendingRoute.value = null
            }

            CompositionLocalProvider(LocalAideSettings provides settings.value) {
            AideTheme {
                val bottomNavItems = listOf(
                    NavItem("HOME", Screen.Home.route, Icons.Default.Home),
                    NavItem("SELL", Screen.Sell.route, Icons.Default.ShoppingCart),
                    NavItem("STOCK", Screen.Stock.route, Icons.Default.Inventory),
                    NavItem("MORE", Screen.More.route, Icons.Default.Menu)
                )

                val showBottomBar = currentRoute in bottomNavItems.map { it.route }

                Scaffold(
                    topBar = {
                        val update = updateCheck.value
                        if (update != null && update.newer) {
                            UpdateBanner(
                                version = update.version,
                                onDownload = {
                                    val url = update.downloadUrl
                                    if (url != null) {
                                        runCatching {
                                            startActivity(
                                                Intent(Intent.ACTION_VIEW, android.net.Uri.parse(url))
                                            )
                                        }
                                    }
                                    LocalBusinessStore(applicationContext).markUpToDate()
                                },
                                onDismiss = {
                                    LocalBusinessStore(applicationContext).markUpToDate()
                                }
                            )
                        }
                    },
                    bottomBar = {
                        if (showBottomBar) {
                            NavigationBar {
                                bottomNavItems.forEach { item ->
                                    NavigationBarItem(
                                        icon = {
                                            Icon(item.icon, contentDescription = item.label)
                                        },
                                        label = { Text(item.label) },
                                        selected = currentRoute == item.route,
                                        onClick = {
                                            navController.navigate(item.route) {
                                                popUpTo(
                                                    navController.graph.findStartDestination().id
                                                ) {
                                                    saveState = true
                                                }
                                                launchSingleTop = true
                                                restoreState = true
                                            }
                                        }
                                    )
                                }
                            }
                        }
                    }
                ) { innerPadding ->
                    NavHost(
                        navController = navController,
                        startDestination = startDestination,
                        modifier = Modifier.padding(innerPadding)
                    ) {
                        composable(Screen.Onboarding.route) {
                            OnboardingScreen(
                                onComplete = {
                                    settings.value = SettingsStore.read(applicationContext)
                                    navController.navigate(Screen.Home.route) {
                                        popUpTo(Screen.Onboarding.route) { inclusive = true }
                                    }
                                }
                            )
                        }

                        composable(Screen.Home.route) {
                            HomeScreen(
                                homeViewModel = homeViewModel,
                                onNavigateToSell = {
                                    navController.navigate(Screen.Sell.route)
                                },
                                onNavigateToStock = {
                                    navController.navigate(Screen.Stock.route)
                                }
                            )
                        }

                        composable(Screen.Sell.route) {
                            SellScreen(
                                sellViewModel = sellViewModel,
                                onSaleCompleted = { saleId ->
                                    navController.navigate(Screen.Receipt.createRoute(saleId))
                                }
                            )
                        }

                        composable(Screen.Stock.route) {
                            StockScreen(stockViewModel = stockViewModel)
                        }

                        composable(Screen.More.route) {
                            MoreScreen(
                                businessName = businessStore.getBusinessName(),
                                onNavigateToCustomers = {
                                    navController.navigate(Screen.Customers.route)
                                },
                                onNavigateToExpenses = {
                                    navController.navigate(Screen.Expenses.route)
                                },
                                onNavigateToReports = {
                                    navController.navigate(Screen.Reports.route)
                                },
                                onNavigateToSettings = {
                                    navController.navigate(Screen.Settings.route)
                                },
                                onNavigateToCalculator = {
                                    navController.navigate(Screen.Calculator.route)
                                },
                                onNavigateToSuppliers = {
                                    navController.navigate(Screen.Suppliers.route)
                                },
                                onNavigateToShifts = {
                                    navController.navigate(Screen.Shifts.route)
                                },
                                onNavigateToQuotations = {
                                    navController.navigate(Screen.Quotations.route)
                                }
                            )
                        }

                        composable(Screen.Suppliers.route) {
                            SuppliersScreen(
                                supplierViewModel = supplierViewModel,
                                onBack = { navController.popBackStack() }
                            )
                        }

                        composable(Screen.Shifts.route) {
                            ShiftsScreen(
                                shiftViewModel = shiftViewModel,
                                onBack = { navController.popBackStack() }
                            )
                        }

                        composable(Screen.Quotations.route) {
                            QuotationsScreen(
                                quotationViewModel = quotationViewModel,
                                onBack = { navController.popBackStack() }
                            )
                        }

                        composable(
                            route = Screen.Receipt.route,
                            arguments = listOf(
                                navArgument("saleId") { type = NavType.StringType }
                            )
                        ) { backStackEntry ->
                            val saleId = backStackEntry.arguments?.getString("saleId") ?: ""
                            ReceiptScreen(
                                saleId = saleId,
                                saleRepository = saleRepository,
                                onDone = {
                                    navController.navigate(Screen.Home.route) {
                                        popUpTo(Screen.Home.route) { inclusive = true }
                                    }
                                }
                            )
                        }

                        composable(Screen.Customers.route) {
                            CustomersScreen(
                                customerViewModel = customerViewModel,
                                onBack = { navController.popBackStack() }
                            )
                        }

                        composable(Screen.Expenses.route) {
                            ExpensesScreen(
                                expenseViewModel = expenseViewModel,
                                onBack = { navController.popBackStack() }
                            )
                        }

                        composable(Screen.Reports.route) {
                            ReportsScreen(
                                reportViewModel = reportViewModel,
                                onBack = { navController.popBackStack() }
                            )
                        }

                        composable(Screen.Settings.route) {
                            SettingsScreen(
                                database = database,
                                businessId = businessId,
                                onBack = { navController.popBackStack() },
                                onSettingsChanged = { updated -> settings.value = updated }
                            )
                        }

                        composable(Screen.Calculator.route) {
                            CalculatorScreen(onBack = { navController.popBackStack() })
                        }

                        composable(Screen.ThemePicker.route) {
                            Column(modifier = Modifier.fillMaxSize()) {
                                ThemePickerScreen(
                                    accent = settings.value.accent,
                                    onDismiss = {
                                        businessStore.markSetupComplete()
                                        if (!navController.popBackStack()) {
                                            navController.navigate(Screen.Home.route)
                                        }
                                    }
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

data class NavItem(val label: String, val route: String, val icon: ImageVector)
