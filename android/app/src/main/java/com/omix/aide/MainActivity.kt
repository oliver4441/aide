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
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
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
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.omix.aide.data.local.AideDatabase
import com.omix.aide.data.local.BusinessSettings
import com.omix.aide.data.local.DatabaseHealth
import com.omix.aide.data.local.LocalBusinessStore
import com.omix.aide.data.local.SettingsStore
import com.omix.aide.data.repository.CustomerRepository
import com.omix.aide.data.repository.ExpenseRepository
import com.omix.aide.data.repository.ProductRepository
import com.omix.aide.data.repository.ReportRepository
import com.omix.aide.data.repository.SaleRepository
import com.omix.aide.notifications.AideNotifications
import com.omix.aide.notifications.AideRoute
import com.omix.aide.theme.Palette
import com.omix.aide.ui.LocalAideSettings
import com.omix.aide.ui.components.NotificationBell
import com.omix.aide.ui.components.NotificationCenterSheet
import com.omix.aide.ui.navigation.Screen
import com.omix.aide.ui.releases.UpdateBanner
import com.omix.aide.ui.releases.UpdateCheck
import com.omix.aide.ui.releases.UpdateChecker
import com.omix.aide.ui.screens.CalculatorScreen
import com.omix.aide.ui.screens.CustomersScreen
import com.omix.aide.ui.screens.DatabaseProblemScreen
import com.omix.aide.ui.screens.ExpensesScreen
import com.omix.aide.ui.screens.HomeScreen
import com.omix.aide.ui.screens.MoreScreen
import com.omix.aide.ui.screens.ReceiptScreen
import com.omix.aide.ui.screens.ReportsScreen
import com.omix.aide.ui.screens.SellScreen
import com.omix.aide.ui.screens.SettingsScreen
import com.omix.aide.ui.screens.StockScreen
import com.omix.aide.ui.screens.WelcomeScreen
import com.omix.aide.ui.screens.showSplash
import com.omix.aide.ui.theme.AideTheme
import com.omix.aide.ui.theme.ThemePickerScreen
import com.omix.aide.ui.viewmodel.CustomerViewModel
import com.omix.aide.ui.viewmodel.ExpenseViewModel
import com.omix.aide.ui.viewmodel.HomeViewModel
import com.omix.aide.ui.viewmodel.ReportViewModel
import com.omix.aide.ui.viewmodel.SellViewModel
import com.omix.aide.ui.viewmodel.StockViewModel
import com.omix.aide.work.AideWorkScheduler
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {

    /** Route requested by a tapped notification, consumed once by the nav host. */
    private val pendingRoute = mutableStateOf<String?>(null)

    /**
     * Held with safe default; loaded from SharedPreferences in onCreate() so
     * no Context access ever occurs during Activity construction.
     */
    private val settings = mutableStateOf(BusinessSettings())

    private val updateCheck = mutableStateOf<UpdateCheck?>(null)
    private val databaseBroken = mutableStateOf(false)

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

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        settings.value = SettingsStore.read(applicationContext)
        pendingRoute.value = routeFromIntent(intent)
        businessStore = LocalBusinessStore(applicationContext)
        businessId = businessStore.getBusinessId()

        lifecycleScope.launch {
            val result = UpdateChecker.check()
            if (result.newer) {
                businessStore.markOutOfDate()
            }
            updateCheck.value = result
        }

        if (DatabaseHealth.isBroken(applicationContext)) {
            databaseBroken.value = true
            setupRecoveryContent()
            return
        }

        initDependencies()

        setContentView(R.layout.splash)
        val accent = Palette.read(this)
        showSplash(
            onReady = { setupContent() },
            accent = accent
        )
    }

    private fun initDependencies() {
        database = AideDatabase.getDatabase(applicationContext)
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

        val expenseRepo = ExpenseRepository(database.expenseDao())
        expenseViewModel = ExpenseViewModel(expenseRepo, businessId)
        customerViewModel = CustomerViewModel(
            CustomerRepository(database.customerDao()),
            businessId
        )
        reportViewModel = ReportViewModel(
            ReportRepository(database.saleDao(), expenseRepo),
            businessId
        )
    }

    private fun setupRecoveryContent() {
        setContent {
            CompositionLocalProvider(LocalAideSettings provides settings.value) {
                AideTheme(darkTheme = settings.value.themeMode.resolve(isSystemInDarkTheme())) {
                    DatabaseProblemScreen(
                        errorMessage = DatabaseHealth.errorMessage(applicationContext),
                        onRetry = {
                            if (DatabaseHealth.probe(applicationContext)) {
                                databaseBroken.value = false
                                initDependencies()
                                setupContent()
                            }
                        },
                        onReset = {
                            DatabaseHealth.deleteDatabase(applicationContext)
                            if (DatabaseHealth.probe(applicationContext)) {
                                databaseBroken.value = false
                                initDependencies()
                                setupContent()
                            }
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
            var showNotifications by remember { mutableStateOf(false) }

            val startDestination = remember {
                when {
                    !businessStore.hasSeenWelcome() -> Screen.Welcome.route
                    !businessStore.hasCompletedSetup() -> Screen.ThemePicker.route
                    else -> Screen.Home.route
                }
            }

            val permissionLauncher = rememberLauncherForActivityResult(
                contract = ActivityResultContracts.RequestPermission()
            ) { granted ->
                if (granted) AideWorkScheduler.scheduleAll(applicationContext)
            }

            var askedForNotifications by rememberSaveable { mutableStateOf(false) }
            LaunchedEffect(currentRoute) {
                if (currentRoute != Screen.Home.route || askedForNotifications) return@LaunchedEffect
                askedForNotifications = true
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
                AideTheme(darkTheme = settings.value.themeMode.resolve(isSystemInDarkTheme())) {
                    val bottomNavItems = listOf(
                        NavItem("HOME", Screen.Home.route, Icons.Default.Home),
                        NavItem("SELL", Screen.Sell.route, Icons.Default.ShoppingCart),
                        NavItem("STOCK", Screen.Stock.route, Icons.Default.Inventory),
                        NavItem("MORE", Screen.More.route, Icons.Default.Menu)
                    )

                    val showBottomBar = currentRoute in bottomNavItems.map { it.route }

                    Scaffold(
                        topBar = {
                            Column {
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
                                            businessStore.markUpToDate()
                                        },
                                        onDismiss = {
                                            businessStore.markUpToDate()
                                        }
                                    )
                                }
                                if (showBottomBar) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp),
                                        horizontalArrangement = Arrangement.End,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        NotificationBell(
                                            dao = database.notificationDao(),
                                            onClick = { showNotifications = true }
                                        )
                                    }
                                }
                            }
                        },
                        bottomBar = {
                            if (showBottomBar) {
                                NavigationBar {
                                    bottomNavItems.forEach { item ->
                                        NavigationBarItem(
                                            icon = { Icon(item.icon, contentDescription = item.label) },
                                            label = { Text(item.label) },
                                            selected = currentRoute == item.route,
                                            onClick = {
                                                navController.navigate(item.route) {
                                                    popUpTo(navController.graph.findStartDestination().id) {
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
                            composable(Screen.Welcome.route) {
                                WelcomeScreen(
                                    onGetStarted = {
                                        businessStore.markWelcomeSeen()
                                        navController.navigate(Screen.ThemePicker.route) {
                                            popUpTo(Screen.Welcome.route) { inclusive = true }
                                        }
                                    },
                                    onSkip = {
                                        businessStore.markWelcomeSeen()
                                        businessStore.markSetupComplete()
                                        navController.navigate(Screen.Home.route) {
                                            popUpTo(Screen.Welcome.route) { inclusive = true }
                                        }
                                    }
                                )
                            }

                            composable(Screen.Home.route) {
                                HomeScreen(
                                    homeViewModel = homeViewModel,
                                    onNavigateToSell = { navController.navigate(Screen.Sell.route) },
                                    onNavigateToStock = { navController.navigate(Screen.Stock.route) }
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
                                    businessName = settings.value.businessName.ifBlank { businessStore.getBusinessName() },
                                    onNavigateToCustomers = { navController.navigate(Screen.Customers.route) },
                                    onNavigateToExpenses = { navController.navigate(Screen.Expenses.route) },
                                    onNavigateToReports = { navController.navigate(Screen.Reports.route) },
                                    onNavigateToSettings = { navController.navigate(Screen.Settings.route) },
                                    onNavigateToCalculator = { navController.navigate(Screen.Calculator.route) }
                                )
                            }

                            composable(
                                route = Screen.Receipt.route,
                                arguments = listOf(navArgument("saleId") { type = NavType.StringType })
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
                                            settings.value = SettingsStore.read(applicationContext)
                                            businessStore.markSetupComplete()
                                            if (!navController.popBackStack()) {
                                                navController.navigate(Screen.Home.route)
                                            }
                                        }
                                    )
                                }
                            }
                        }

                        if (showNotifications) {
                            NotificationCenterSheet(
                                dao = database.notificationDao(),
                                onDismiss = { showNotifications = false },
                                onOpen = { event ->
                                    showNotifications = false
                                    val dest = destinationForRoute(event.route)
                                    if (dest != null) {
                                        navController.navigate(dest) {
                                            popUpTo(navController.graph.findStartDestination().id) {
                                                saveState = true
                                            }
                                            launchSingleTop = true
                                        }
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

data class NavItem(val label: String, val route: String, val icon: ImageVector)
