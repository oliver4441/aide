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
import com.omix.aide.ui.navigation.Screen
import com.omix.aide.ui.screens.CalculatorScreen
import com.omix.aide.ui.screens.CustomersScreen
import com.omix.aide.ui.screens.ExpensesScreen
import com.omix.aide.ui.screens.HomeScreen
import com.omix.aide.ui.screens.MoreScreen
import com.omix.aide.ui.screens.ReceiptScreen
import com.omix.aide.ui.screens.ReportsScreen
import com.omix.aide.ui.screens.SettingsScreen
import com.omix.aide.ui.screens.SellScreen
import com.omix.aide.ui.screens.StockScreen
import com.omix.aide.ui.screens.showSplash
import com.omix.aide.ui.LocalAideSettings
import com.omix.aide.ui.theme.AideTheme
import com.omix.aide.ui.theme.ThemePickerScreen
import com.omix.aide.ui.viewmodel.CustomerViewModel
import com.omix.aide.ui.viewmodel.ExpenseViewModel
import com.omix.aide.ui.viewmodel.HomeViewModel
import com.omix.aide.ui.viewmodel.ReportViewModel
import com.omix.aide.ui.viewmodel.SellViewModel
import com.omix.aide.ui.viewmodel.StockViewModel
import com.omix.aide.work.AideWorkScheduler

class MainActivity : ComponentActivity() {

    /** Route requested by a tapped notification, consumed once by the nav host. */
    private val pendingRoute = mutableStateOf<String?>(null)

    /**
     * The saved business settings, held as state so that changing the accent or
     * currency re-themes and re-formats the running app instead of only taking
     * effect after a restart.
     */
    private val settings = mutableStateOf(SettingsStore.read(applicationContext))

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

        pendingRoute.value = routeFromIntent(intent)

        // Everything below reads and writes Room on this device only — there is
        // no account, no server, and no sync.
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

        // The branded View-based splash owns the content view until the local
        // database is ready; setupContent then replaces it with the Compose UI.
        // Only one setContent call may happen per activity, hence the handoff.
        setContentView(R.layout.splash)
        val accent = Palette.read(this)
        showSplash(
            onReady = { setupContent() },
            accent = accent
        )
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        pendingRoute.value = routeFromIntent(intent)
    }

    private fun routeFromIntent(intent: Intent?): String? =
        intent?.getStringExtra(AideNotifications.EXTRA_ROUTE)

    /** Maps a notification's deep link onto a screen in the nav graph. */
    private fun destinationForRoute(route: String?): String? =
        when (AideRoute.fromRoute(route)) {
            AideRoute.DASHBOARD -> Screen.Home.route
            AideRoute.SELL -> Screen.Sell.route
            AideRoute.STOCK -> Screen.Stock.route
            AideRoute.MORE -> Screen.More.route
            null -> null
        }

    /**
     * Switches to the main Compose content. Kept as a separate function so the
     * splash can present the same content without blocking on compose.
     */
    private fun setupContent() {
        setContent {
            val navController = rememberNavController()
            val navBackStackEntry by navController.currentBackStackEntryAsState()
            val currentRoute = navBackStackEntry?.destination?.route

            // First-time Android users pick a theme before anything else.
            val startDestination = remember {
                if (businessStore.hasCompletedSetup()) {
                    Screen.Home.route
                } else {
                    Screen.ThemePicker.route
                }
            }

            // Ask for notification permission once on Android 13+.
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

            // Follow a notification tap to the screen it points at.
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
                                }
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

                        // These four were menu rows with empty onClick lambdas,
                        // so tapping them did nothing.
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

                        // First-time Android users pick a theme here instead of
                        // straight into the app.
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