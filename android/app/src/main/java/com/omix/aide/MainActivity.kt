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
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.MutableState
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.testTag
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
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
import com.omix.aide.data.local.OperationsStore
import com.omix.aide.data.local.SettingsStore
import com.omix.aide.data.local.WorkspaceContextStore
import com.omix.aide.data.repository.CustomerRepository
import com.omix.aide.data.repository.ExpenseRepository
import com.omix.aide.data.repository.ProductRepository
import com.omix.aide.data.repository.ReportRepository
import com.omix.aide.data.repository.SaleRepository
import com.omix.aide.domain.ia.MobileDestination
import com.omix.aide.domain.ia.OperatingContext
import com.omix.aide.domain.ia.RoleNavigationResolver
import com.omix.aide.notifications.AideNotifications
import com.omix.aide.notifications.AideRoute
import com.omix.aide.theme.Palette
import com.omix.aide.ui.LocalAideSettings
import com.omix.aide.ui.components.AccessRestrictedScreen
import com.omix.aide.ui.components.AideNavRail
import com.omix.aide.ui.components.ContextSwitcherSheet
import com.omix.aide.ui.components.NotificationBell
import com.omix.aide.ui.components.NotificationCenterSheet
import com.omix.aide.ui.components.OperatingContextBar
import com.omix.aide.ui.navigation.Screen
import com.omix.aide.ui.navigation.icon
import com.omix.aide.ui.releases.UpdateBanner
import com.omix.aide.ui.releases.UpdateCheck
import com.omix.aide.ui.releases.UpdateChecker
import com.omix.aide.ui.screens.ApprovalsScreen
import com.omix.aide.ui.screens.CalculatorScreen
import com.omix.aide.ui.screens.CustomersScreen
import com.omix.aide.ui.screens.DatabaseProblemScreen
import com.omix.aide.ui.screens.ExpensesScreen
import com.omix.aide.ui.screens.HomeScreen
import com.omix.aide.ui.screens.ProductLookupScreen
import com.omix.aide.ui.screens.ReceiveGoodsScreen
import com.omix.aide.ui.screens.ReceiptScreen
import com.omix.aide.ui.screens.ReportsScreen
import com.omix.aide.ui.screens.SellScreen
import com.omix.aide.ui.screens.SettingsScreen
import com.omix.aide.ui.screens.ShiftsScreen
import com.omix.aide.ui.screens.StockCountScreen
import com.omix.aide.ui.screens.StockScreen
import com.omix.aide.ui.screens.TasksScreen
import com.omix.aide.ui.screens.WelcomeScreen
import com.omix.aide.ui.screens.WorkspaceOnboardingScreen
import com.omix.aide.ui.screens.WorkspaceScreen
import com.omix.aide.ui.screens.showSplash
import com.omix.aide.ui.theme.AideTheme
import com.omix.aide.ui.theme.ThemePickerScreen
import com.omix.aide.ui.viewmodel.CustomerViewModel
import com.omix.aide.ui.viewmodel.ExpenseViewModel
import com.omix.aide.ui.viewmodel.HomeViewModel
import com.omix.aide.ui.viewmodel.OperationsViewModel
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
    private lateinit var workspaceStore: WorkspaceContextStore
    private lateinit var operationsStore: OperationsStore
    private lateinit var productRepository: ProductRepository
    private lateinit var saleRepository: SaleRepository
    private lateinit var homeViewModel: HomeViewModel
    private lateinit var sellViewModel: SellViewModel
    private lateinit var stockViewModel: StockViewModel
    private lateinit var expenseViewModel: ExpenseViewModel
    private lateinit var customerViewModel: CustomerViewModel
    private lateinit var reportViewModel: ReportViewModel
    private lateinit var operationsViewModel: OperationsViewModel

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        settings.value = SettingsStore.read(applicationContext)
        pendingRoute.value = routeFromIntent(intent)
        businessStore = LocalBusinessStore(applicationContext)

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
        workspaceStore = WorkspaceContextStore.create(applicationContext, businessStore)
        operationsStore = OperationsStore.create(applicationContext)

        productRepository = ProductRepository(
            productDao = database.productDao(),
            categoryDao = database.categoryDao()
        )
        saleRepository = SaleRepository(
            saleDao = database.saleDao(),
            productDao = database.productDao()
        )
        val expenseRepo = ExpenseRepository(database.expenseDao())
        val customerRepo = CustomerRepository(database.customerDao())
        val contextFlow = workspaceStore.activeContext

        homeViewModel = HomeViewModel(
            productRepository = productRepository,
            saleRepository = saleRepository,
            contextFlow = contextFlow,
            expenseRepository = expenseRepo,
            customerRepository = customerRepo,
            operationsStore = operationsStore
        )
        sellViewModel = SellViewModel(
            productRepository = productRepository,
            saleRepository = saleRepository,
            contextFlow = contextFlow
        ) {
            settings.value
        }
        stockViewModel = StockViewModel(
            productRepository = productRepository,
            contextFlow = contextFlow
        )
        expenseViewModel = ExpenseViewModel(
            expenseRepository = expenseRepo,
            contextFlow = contextFlow
        )
        customerViewModel = CustomerViewModel(
            customerRepository = customerRepo,
            contextFlow = contextFlow
        )
        reportViewModel = ReportViewModel(
            reportRepository = ReportRepository(database.saleDao(), expenseRepo),
            contextFlow = contextFlow
        )
        operationsViewModel = OperationsViewModel(
            productRepository = productRepository,
            saleRepository = saleRepository,
            operationsStore = operationsStore,
            contextFlow = contextFlow,
            membershipsCountProvider = { workspaceStore.memberships.value.size }
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

    private fun setupContent() {
        setContent {
            val permissionLauncher = rememberLauncherForActivityResult(
                contract = ActivityResultContracts.RequestPermission()
            ) { granted ->
                if (granted) AideWorkScheduler.scheduleAll(applicationContext)
            }

            var askedForNotifications by rememberSaveable { mutableStateOf(false) }

            val startDestination = remember {
                when {
                    !businessStore.hasSeenWelcome() -> Screen.Welcome.route
                    !workspaceStore.hasCompletedRoleOnboarding() -> Screen.Onboarding.route
                    !businessStore.hasCompletedSetup() -> Screen.ThemePicker.route
                    else -> Screen.Home.route
                }
            }

            CompositionLocalProvider(LocalAideSettings provides settings.value) {
                AideTheme(darkTheme = settings.value.themeMode.resolve(isSystemInDarkTheme())) {
                    AideAppShell(
                        database = database,
                        workspaceStore = workspaceStore,
                        saleRepository = saleRepository,
                        homeViewModel = homeViewModel,
                        sellViewModel = sellViewModel,
                        stockViewModel = stockViewModel,
                        expenseViewModel = expenseViewModel,
                        customerViewModel = customerViewModel,
                        reportViewModel = reportViewModel,
                        operationsViewModel = operationsViewModel,
                        startDestination = startDestination,
                        pendingRoute = pendingRoute,
                        updateBannerContent = {
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
                        },
                        onFirstHomeReached = {
                            if (!askedForNotifications) {
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
                        },
                        onMarkWelcomeSeen = { businessStore.markWelcomeSeen() },
                        onMarkSetupComplete = { businessStore.markSetupComplete() },
                        hasCompletedThemeSetup = { businessStore.hasCompletedSetup() },
                        currentAccent = settings.value.accent,
                        onSettingsChanged = { updated ->
                            settings.value = updated
                            if (updated.businessName.isNotBlank()) {
                                workspaceStore.syncActiveBusinessDisplayName(updated.businessName)
                            }
                        },
                        onReloadSettings = {
                            settings.value = SettingsStore.read(applicationContext)
                        }
                    )
                }
            }
        }
    }
}

internal fun destinationForRoute(route: String?): String? =
    AideRoute.fromRoute(route)?.screen

/**
 * Role- and permission-driven application shell shared between [MainActivity]
 * and Compose journey tests.
 */
@Composable
fun AideAppShell(
    database: AideDatabase,
    workspaceStore: WorkspaceContextStore,
    saleRepository: SaleRepository,
    homeViewModel: HomeViewModel,
    sellViewModel: SellViewModel,
    stockViewModel: StockViewModel,
    expenseViewModel: ExpenseViewModel,
    customerViewModel: CustomerViewModel,
    reportViewModel: ReportViewModel,
    operationsViewModel: OperationsViewModel,
    startDestination: String = Screen.Home.route,
    pendingRoute: MutableState<String?> = remember { mutableStateOf(null) },
    navController: NavHostController = rememberNavController(),
    updateBannerContent: @Composable () -> Unit = {},
    onFirstHomeReached: () -> Unit = {},
    onMarkWelcomeSeen: () -> Unit = {},
    onMarkSetupComplete: () -> Unit = {},
    hasCompletedThemeSetup: () -> Boolean = { true },
    currentAccent: String = "emerald",
    onSettingsChanged: (BusinessSettings) -> Unit = {},
    onReloadSettings: () -> Unit = {}
) {
    val activeContext by workspaceStore.activeContext.collectAsState()
    val memberships by workspaceStore.memberships.collectAsState()
    val sellUiState by sellViewModel.uiState.collectAsState()

    val roleNav = remember(activeContext) { RoleNavigationResolver.resolve(activeContext) }
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    var showNotifications by remember { mutableStateOf(false) }
    var showContextSwitcher by remember { mutableStateOf(false) }

    val isSetupScreen = currentRoute in setOf(
        Screen.Welcome.route,
        Screen.Onboarding.route,
        Screen.ThemePicker.route
    )
    val hasDedicatedBackTopBar = currentRoute in setOf(
        Screen.Customers.route,
        Screen.Expenses.route,
        Screen.Reports.route,
        Screen.Settings.route,
        Screen.Calculator.route,
        Screen.Receipt.route
    )
    val isWideScreen = LocalConfiguration.current.screenWidthDp >= 600
    val primaryRoutes = remember(roleNav) { roleNav.primaryDestinations.map { it.route }.toSet() }
    val showPrimaryNavigation = !isSetupScreen &&
        !hasDedicatedBackTopBar &&
        !roleNav.isAccessBlocked

    LaunchedEffect(currentRoute) {
        if (currentRoute == Screen.Home.route) {
            onFirstHomeReached()
        }
    }

    LaunchedEffect(pendingRoute.value, activeContext) {
        val target = pendingRoute.value ?: return@LaunchedEffect
        val destination = destinationForRoute(target)
        if (destination != null) {
            val safeRoute = if (RoleNavigationResolver.canAccessRoute(activeContext, destination)) {
                destination
            } else {
                Screen.Home.route
            }
            navController.navigate(safeRoute) {
                popUpTo(navController.graph.findStartDestination().id) {
                    saveState = true
                }
                launchSingleTop = true
            }
        }
        pendingRoute.value = null
    }

    fun navigateTopLevel(route: String) {
        navController.navigate(route) {
            popUpTo(navController.graph.findStartDestination().id) {
                saveState = true
            }
            launchSingleTop = true
            restoreState = false
        }
    }

    fun navigateToDestination(route: String) {
        if (route in primaryRoutes) {
            navigateTopLevel(route)
        } else {
            navController.navigate(route) {
                launchSingleTop = true
            }
        }
    }

    Scaffold(
        topBar = {
            Column {
                updateBannerContent()
                if (!isSetupScreen) {
                    OperatingContextBar(
                        context = activeContext,
                        onOpenSwitcher = { showContextSwitcher = true },
                        trailingContent = {
                            NotificationBell(
                                dao = database.notificationDao(),
                                onClick = { showNotifications = true }
                            )
                        }
                    )
                }
            }
        },
        bottomBar = {
            if (showPrimaryNavigation && !isWideScreen) {
                NavigationBar(modifier = Modifier.testTag("role_bottom_nav")) {
                    roleNav.primaryDestinations.forEach { dest ->
                        val selected = currentRoute == dest.route ||
                            (dest == MobileDestination.WORKSPACE && currentRoute == Screen.More.route)
                        NavigationBarItem(
                            modifier = Modifier.testTag("bottom_tab_${dest.route}"),
                            icon = { Icon(dest.icon(), contentDescription = dest.title) },
                            label = { Text(dest.navLabel) },
                            selected = selected,
                            onClick = { navigateTopLevel(dest.route) }
                        )
                    }
                }
            }
        }
    ) { innerPadding ->
        Row(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            if (showPrimaryNavigation && isWideScreen) {
                AideNavRail(
                    destinations = roleNav.primaryDestinations,
                    currentRoute = if (currentRoute == Screen.More.route) {
                        MobileDestination.WORKSPACE.route
                    } else {
                        currentRoute
                    },
                    onNavigate = { navigateTopLevel(it) }
                )
            }

            Box(modifier = Modifier.weight(1f).fillMaxSize()) {
                NavHost(
                    navController = navController,
                    startDestination = startDestination
                ) {
                    composable(Screen.Welcome.route) {
                        WelcomeScreen(
                            onGetStarted = {
                                onMarkWelcomeSeen()
                                navController.navigate(Screen.Onboarding.route) {
                                    popUpTo(Screen.Welcome.route) { inclusive = true }
                                }
                            },
                            onSkip = {
                                onMarkWelcomeSeen()
                                workspaceStore.markRoleOnboardingComplete()
                                onMarkSetupComplete()
                                navController.navigate(Screen.Home.route) {
                                    popUpTo(Screen.Welcome.route) { inclusive = true }
                                }
                            }
                        )
                    }

                    composable(Screen.Onboarding.route) {
                        WorkspaceOnboardingScreen(
                            initialContext = activeContext,
                            onComplete = { empName, orgName, bizName, branchName, whName, termName, role, devMode ->
                                workspaceStore.configurePrimaryWorkspace(
                                    employeeName = empName,
                                    organizationName = orgName,
                                    businessName = bizName,
                                    branchName = branchName,
                                    warehouseName = whName,
                                    terminalName = termName,
                                    role = role,
                                    deviceAssignment = devMode
                                )
                                val nextRoute = if (!hasCompletedThemeSetup()) {
                                    Screen.ThemePicker.route
                                } else {
                                    Screen.Home.route
                                }
                                navController.navigate(nextRoute) {
                                    popUpTo(Screen.Onboarding.route) { inclusive = true }
                                }
                            },
                            onSkipWithDefaults = {
                                workspaceStore.markRoleOnboardingComplete()
                                val nextRoute = if (!hasCompletedThemeSetup()) {
                                    Screen.ThemePicker.route
                                } else {
                                    Screen.Home.route
                                }
                                navController.navigate(nextRoute) {
                                    popUpTo(Screen.Onboarding.route) { inclusive = true }
                                }
                            }
                        )
                    }

                    composable(Screen.Home.route) {
                        HomeScreen(
                            homeViewModel = homeViewModel,
                            onNavigate = { route -> navigateToDestination(route) },
                            onOpenContextSwitcher = { showContextSwitcher = true }
                        )
                    }

                    composable(Screen.Sell.route) {
                        GuardedRoute(
                            context = activeContext,
                            destination = MobileDestination.SELL,
                            onReturnHome = { navigateTopLevel(Screen.Home.route) },
                            onOpenSwitcher = { showContextSwitcher = true }
                        ) {
                            SellScreen(
                                sellViewModel = sellViewModel,
                                onSaleCompleted = { saleId ->
                                    navController.navigate(Screen.Receipt.createRoute(saleId))
                                }
                            )
                        }
                    }

                    composable(Screen.Stock.route) {
                        GuardedRoute(
                            context = activeContext,
                            destination = MobileDestination.STOCK,
                            onReturnHome = { navigateTopLevel(Screen.Home.route) },
                            onOpenSwitcher = { showContextSwitcher = true }
                        ) {
                            StockScreen(stockViewModel = stockViewModel)
                        }
                    }

                    composable(Screen.ProductLookup.route) {
                        GuardedRoute(
                            context = activeContext,
                            destination = MobileDestination.PRODUCT_LOOKUP,
                            onReturnHome = { navigateTopLevel(Screen.Home.route) },
                            onOpenSwitcher = { showContextSwitcher = true }
                        ) {
                            ProductLookupScreen(
                                operationsViewModel = operationsViewModel,
                                onAddToSale = { product ->
                                    sellViewModel.addToCart(product)
                                    navigateToDestination(Screen.Sell.route)
                                }
                            )
                        }
                    }

                    composable(Screen.ReceiveGoods.route) {
                        GuardedRoute(
                            context = activeContext,
                            destination = MobileDestination.RECEIVE_GOODS,
                            onReturnHome = { navigateTopLevel(Screen.Home.route) },
                            onOpenSwitcher = { showContextSwitcher = true }
                        ) {
                            ReceiveGoodsScreen(operationsViewModel = operationsViewModel)
                        }
                    }

                    composable(Screen.StockCount.route) {
                        GuardedRoute(
                            context = activeContext,
                            destination = MobileDestination.STOCK_COUNT,
                            onReturnHome = { navigateTopLevel(Screen.Home.route) },
                            onOpenSwitcher = { showContextSwitcher = true }
                        ) {
                            StockCountScreen(operationsViewModel = operationsViewModel)
                        }
                    }

                    composable(Screen.Tasks.route) {
                        GuardedRoute(
                            context = activeContext,
                            destination = MobileDestination.TASKS,
                            onReturnHome = { navigateTopLevel(Screen.Home.route) },
                            onOpenSwitcher = { showContextSwitcher = true }
                        ) {
                            TasksScreen(
                                operationsViewModel = operationsViewModel,
                                onNavigateToWorkflow = { target ->
                                    if (RoleNavigationResolver.canAccessRoute(activeContext, target)) {
                                        navigateToDestination(target)
                                    }
                                }
                            )
                        }
                    }

                    composable(Screen.Shifts.route) {
                        GuardedRoute(
                            context = activeContext,
                            destination = MobileDestination.SHIFTS,
                            onReturnHome = { navigateTopLevel(Screen.Home.route) },
                            onOpenSwitcher = { showContextSwitcher = true }
                        ) {
                            ShiftsScreen(operationsViewModel = operationsViewModel)
                        }
                    }

                    composable(Screen.Approvals.route) {
                        GuardedRoute(
                            context = activeContext,
                            destination = MobileDestination.APPROVALS,
                            onReturnHome = { navigateTopLevel(Screen.Home.route) },
                            onOpenSwitcher = { showContextSwitcher = true }
                        ) {
                            ApprovalsScreen(operationsViewModel = operationsViewModel)
                        }
                    }

                    composable(Screen.Workspace.route) {
                        GuardedRoute(
                            context = activeContext,
                            destination = MobileDestination.WORKSPACE,
                            onReturnHome = { navigateTopLevel(Screen.Home.route) },
                            onOpenSwitcher = { showContextSwitcher = true }
                        ) {
                            WorkspaceScreen(
                                activeContext = activeContext,
                                navigation = roleNav,
                                onNavigate = { route -> navigateToDestination(route) },
                                onOpenContextSwitcher = { showContextSwitcher = true },
                                onOpenOnboardingGuide = {
                                    navController.navigate(Screen.Onboarding.route)
                                }
                            )
                        }
                    }

                    // Backwards-compatible alias for legacy "more" route
                    composable(Screen.More.route) {
                        GuardedRoute(
                            context = activeContext,
                            destination = MobileDestination.WORKSPACE,
                            onReturnHome = { navigateTopLevel(Screen.Home.route) },
                            onOpenSwitcher = { showContextSwitcher = true }
                        ) {
                            WorkspaceScreen(
                                activeContext = activeContext,
                                navigation = roleNav,
                                onNavigate = { route -> navigateToDestination(route) },
                                onOpenContextSwitcher = { showContextSwitcher = true },
                                onOpenOnboardingGuide = {
                                    navController.navigate(Screen.Onboarding.route)
                                }
                            )
                        }
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
                        GuardedRoute(
                            context = activeContext,
                            destination = MobileDestination.CUSTOMERS,
                            onReturnHome = { navigateTopLevel(Screen.Home.route) },
                            onOpenSwitcher = { showContextSwitcher = true }
                        ) {
                            CustomersScreen(
                                customerViewModel = customerViewModel,
                                onBack = { navController.popBackStack() }
                            )
                        }
                    }

                    composable(Screen.Expenses.route) {
                        GuardedRoute(
                            context = activeContext,
                            destination = MobileDestination.EXPENSES,
                            onReturnHome = { navigateTopLevel(Screen.Home.route) },
                            onOpenSwitcher = { showContextSwitcher = true }
                        ) {
                            ExpensesScreen(
                                expenseViewModel = expenseViewModel,
                                onBack = { navController.popBackStack() }
                            )
                        }
                    }

                    composable(Screen.Reports.route) {
                        GuardedRoute(
                            context = activeContext,
                            destination = MobileDestination.REPORTS,
                            onReturnHome = { navigateTopLevel(Screen.Home.route) },
                            onOpenSwitcher = { showContextSwitcher = true }
                        ) {
                            ReportsScreen(
                                reportViewModel = reportViewModel,
                                onBack = { navController.popBackStack() }
                            )
                        }
                    }

                    composable(Screen.Settings.route) {
                        GuardedRoute(
                            context = activeContext,
                            destination = MobileDestination.SETTINGS,
                            onReturnHome = { navigateTopLevel(Screen.Home.route) },
                            onOpenSwitcher = { showContextSwitcher = true }
                        ) {
                            SettingsScreen(
                                database = database,
                                businessId = activeContext.businessId,
                                onBack = { navController.popBackStack() },
                                onSettingsChanged = onSettingsChanged,
                                activeContext = activeContext,
                                onOpenContextSwitcher = { showContextSwitcher = true },
                                onOpenOnboardingGuide = {
                                    navController.navigate(Screen.Onboarding.route)
                                }
                            )
                        }
                    }

                    composable(Screen.Calculator.route) {
                        GuardedRoute(
                            context = activeContext,
                            destination = MobileDestination.CALCULATOR,
                            onReturnHome = { navigateTopLevel(Screen.Home.route) },
                            onOpenSwitcher = { showContextSwitcher = true }
                        ) {
                            CalculatorScreen(onBack = { navController.popBackStack() })
                        }
                    }

                    composable(Screen.ThemePicker.route) {
                        Column(modifier = Modifier.fillMaxSize()) {
                            ThemePickerScreen(
                                accent = currentAccent,
                                onDismiss = {
                                    onReloadSettings()
                                    onMarkSetupComplete()
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

        if (showNotifications) {
            NotificationCenterSheet(
                dao = database.notificationDao(),
                onDismiss = { showNotifications = false },
                onOpen = { event ->
                    showNotifications = false
                    val dest = destinationForRoute(event.route)
                    if (dest != null) {
                        val safe = if (RoleNavigationResolver.canAccessRoute(activeContext, dest)) {
                            dest
                        } else {
                            Screen.Home.route
                        }
                        navigateToDestination(safe)
                    }
                }
            )
        }

        if (showContextSwitcher) {
            ContextSwitcherSheet(
                activeContext = activeContext,
                memberships = memberships,
                hasActiveCartItems = sellUiState.cart.isNotEmpty(),
                onSelectMembership = { membershipId ->
                    sellViewModel.clearTransientCheckoutState()
                    workspaceStore.switchActiveMembership(membershipId)
                    val refreshed = workspaceStore.activeContext.value
                    if (!RoleNavigationResolver.canAccessRoute(refreshed, currentRoute)) {
                        navigateTopLevel(Screen.Home.route)
                    }
                },
                onChangeActiveRole = { role, branchName, whName, termName ->
                    sellViewModel.clearTransientCheckoutState()
                    val refreshed = workspaceStore.updateActiveRoleAndLocation(
                        role = role,
                        branchName = branchName,
                        warehouseName = whName,
                        terminalName = termName
                    )
                    if (!RoleNavigationResolver.canAccessRoute(refreshed, currentRoute)) {
                        navigateTopLevel(Screen.Home.route)
                    }
                },
                onAddMembership = { empName, orgName, bizName, branchName, whName, termName, role, devMode ->
                    sellViewModel.clearTransientCheckoutState()
                    workspaceStore.addMembership(
                        employeeName = empName,
                        organizationName = orgName,
                        businessName = bizName,
                        branchName = branchName,
                        warehouseName = whName,
                        terminalName = termName,
                        role = role,
                        deviceAssignment = devMode,
                        activateImmediately = true
                    )
                    val refreshed = workspaceStore.activeContext.value
                    if (!RoleNavigationResolver.canAccessRoute(refreshed, currentRoute)) {
                        navigateTopLevel(Screen.Home.route)
                    }
                },
                onDismiss = { showContextSwitcher = false }
            )
        }
    }
}

@Composable
private fun GuardedRoute(
    context: OperatingContext,
    destination: MobileDestination,
    onReturnHome: () -> Unit,
    onOpenSwitcher: () -> Unit,
    content: @Composable () -> Unit
) {
    if (!RoleNavigationResolver.canAccessDestination(context, destination)) {
        val reason = if (context.isRevoked) {
            context.revokedReason ?: "Access to ${context.operatingLocationLabel} has been revoked."
        } else {
            "${context.role.title} does not have permission to open ${destination.title}."
        }
        AccessRestrictedScreen(
            context = context,
            reason = reason,
            onReturnHome = onReturnHome,
            onOpenContextSwitcher = onOpenSwitcher
        )
    } else {
        content()
    }
}

data class NavItem(val label: String, val route: String, val icon: ImageVector)
