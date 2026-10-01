package ke.co.aide

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.core.content.ContextCompat
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavType
import androidx.navigation.compose.*
import androidx.navigation.navArgument
import ke.co.aide.data.local.AideDatabase
import ke.co.aide.data.local.LocalBusinessStore
import ke.co.aide.data.repository.ProductRepository
import ke.co.aide.data.repository.SaleRepository
import ke.co.aide.notifications.AideNotifications
import ke.co.aide.notifications.AideRoute
import ke.co.aide.ui.navigation.Screen
import ke.co.aide.ui.screens.*
import ke.co.aide.ui.theme.AideTheme
import ke.co.aide.ui.viewmodel.*
import ke.co.aide.work.AideWorkScheduler

class MainActivity : ComponentActivity() {

    /** Route requested by a tapped notification, consumed once by the nav host. */
    private val pendingRoute = mutableStateOf<String?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        pendingRoute.value = routeFromIntent(intent)

        val database = AideDatabase.getDatabase(applicationContext)
        val businessStore = LocalBusinessStore(applicationContext)

        // Everything below reads and writes Room on this device only — there is
        // no account, no server, and no sync.
        val businessId = businessStore.getBusinessId()

        val productRepository = ProductRepository(
            productDao = database.productDao(),
            categoryDao = database.categoryDao()
        )
        val saleRepository = SaleRepository(
            saleDao = database.saleDao(),
            productDao = database.productDao()
        )

        val homeViewModel = HomeViewModel(productRepository, saleRepository, businessId)
        val sellViewModel = SellViewModel(productRepository, saleRepository, businessId)
        val stockViewModel = StockViewModel(productRepository, businessId)

        setContent {
            AideTheme {
                val navController = rememberNavController()
                val navBackStackEntry by navController.currentBackStackEntryAsState()
                val currentRoute = navBackStackEntry?.destination?.route

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
                        startDestination = Screen.Home.route,
                        modifier = Modifier.padding(innerPadding)
                    ) {
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
                                businessName = businessStore.getBusinessName()
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
                    }
                }
            }
        }
    }

    /** Handles a notification tap while the app is already running. */
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
}

data class NavItem(val label: String, val route: String, val icon: ImageVector)
