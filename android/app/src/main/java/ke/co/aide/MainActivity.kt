package ke.co.aide

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavType
import androidx.navigation.compose.*
import androidx.navigation.navArgument
import ke.co.aide.data.local.AideDatabase
import ke.co.aide.data.remote.api.AideApiService
import ke.co.aide.data.remote.auth.SessionManager
import ke.co.aide.data.repository.*
import ke.co.aide.sync.SyncEngine
import ke.co.aide.ui.navigation.Screen
import ke.co.aide.ui.screens.*
import ke.co.aide.ui.theme.AideTheme
import ke.co.aide.ui.viewmodel.*
import retrofit2.converter.kotlinx.serialization.asConverterFactory
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import retrofit2.Retrofit

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val database = AideDatabase.getDatabase(applicationContext)
        val sessionManager = SessionManager(applicationContext)

        val json = Json { ignoreUnknownKeys = true }
        val retrofit = Retrofit.Builder()
            .baseUrl("https://aide.omixsystems.store")
            .client(OkHttpClient())
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
            .build()

        val apiService = retrofit.create(AideApiService::class.java)

        val authRepository = AuthRepository(apiService, sessionManager)
        val productRepository = ProductRepository(
            database.productDao(),
            database.categoryDao(),
            database.syncMutationDao()
        )
        val saleRepository = SaleRepository(
            database.saleDao(),
            database.productDao(),
            database.syncMutationDao()
        )
        val syncEngine = SyncEngine(
            context = applicationContext,
            apiService = apiService,
            productDao = database.productDao(),
            categoryDao = database.categoryDao(),
            saleDao = database.saleDao(),
            syncMutationDao = database.syncMutationDao(),
            sessionManager = sessionManager
        )

        val authViewModel = AuthViewModel(authRepository)
        val activeBusinessId = sessionManager.getBusinessId() ?: "bus-demo-1"
        val homeViewModel = HomeViewModel(productRepository, saleRepository, activeBusinessId)
        val sellViewModel = SellViewModel(productRepository, saleRepository, activeBusinessId)
        val stockViewModel = StockViewModel(productRepository, activeBusinessId)
        val syncViewModel = SyncViewModel(syncEngine)

        setContent {
            AideTheme {
                val navController = rememberNavController()
                val navBackStackEntry by navController.currentBackStackEntryAsState()
                val currentRoute = navBackStackEntry?.destination?.route

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
                        startDestination = if (sessionManager.isLoggedIn()) Screen.Home.route else Screen.Login.route,
                        modifier = Modifier.padding(innerPadding)
                    ) {
                        composable(Screen.Login.route) {
                            LoginScreen(
                                authViewModel = authViewModel,
                                onLoginSuccess = {
                                    navController.navigate(Screen.Home.route) {
                                        popUpTo(Screen.Login.route) { inclusive = true }
                                    }
                                }
                            )
                        }

                        composable(Screen.Home.route) {
                            HomeScreen(
                                homeViewModel = homeViewModel,
                                onNavigateToSell = { navController.navigate(Screen.Sell.route) },
                                onNavigateToStock = { navController.navigate(Screen.Stock.route) },
                                onNavigateToSync = { navController.navigate(Screen.SyncCenter.route) }
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
                                onNavigateToSync = { navController.navigate(Screen.SyncCenter.route) },
                                onLogout = {
                                    authViewModel.logout()
                                    navController.navigate(Screen.Login.route) {
                                        popUpTo(0)
                                    }
                                }
                            )
                        }

                        composable(Screen.SyncCenter.route) {
                            SyncCenterScreen(syncViewModel = syncViewModel)
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
}

data class NavItem(val label: String, val route: String, val icon: ImageVector)
