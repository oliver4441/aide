package com.omix.aide.ui.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Apps
import androidx.compose.material.icons.filled.Assessment
import androidx.compose.material.icons.filled.Calculate
import androidx.compose.material.icons.filled.Checklist
import androidx.compose.material.icons.filled.FactCheck
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Inventory
import androidx.compose.material.icons.filled.LocalShipping
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.PointOfSale
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.material.icons.filled.Receipt
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material.icons.filled.VerifiedUser
import androidx.compose.ui.graphics.vector.ImageVector
import com.omix.aide.domain.ia.MobileDestination
import com.omix.aide.domain.ia.QuickAction

/** Every screen route in the Android app. */
sealed class Screen(val route: String) {
    object Welcome : Screen("welcome")
    object Onboarding : Screen("onboarding")
    object Home : Screen("home")
    object Sell : Screen("sell")
    object Stock : Screen("stock")
    object ProductLookup : Screen("lookup")
    object ReceiveGoods : Screen("receive-goods")
    object StockCount : Screen("stock-count")
    object Tasks : Screen("tasks")
    object Shifts : Screen("shifts")
    object Approvals : Screen("approvals")
    object Workspace : Screen("workspace")
    object More : Screen("more")
    object Customers : Screen("customers")
    object Expenses : Screen("expenses")
    object Reports : Screen("reports")
    object Calculator : Screen("calculator")
    object Settings : Screen("settings")
    object Receipt : Screen("receipt/{saleId}") {
        fun createRoute(saleId: String) = "receipt/$saleId"
    }

    /** The themed theme-selection screen, shown to first-time Android users. */
    object ThemePicker : Screen("theme-picker")
}

fun MobileDestination.icon(): ImageVector = when (this) {
    MobileDestination.HOME -> Icons.Default.Home
    MobileDestination.SELL -> Icons.Default.ShoppingCart
    MobileDestination.STOCK -> Icons.Default.Inventory
    MobileDestination.PRODUCT_LOOKUP -> Icons.Default.QrCodeScanner
    MobileDestination.RECEIVE_GOODS -> Icons.Default.LocalShipping
    MobileDestination.STOCK_COUNT -> Icons.Default.FactCheck
    MobileDestination.TASKS -> Icons.Default.Checklist
    MobileDestination.SHIFTS -> Icons.Default.Schedule
    MobileDestination.APPROVALS -> Icons.Default.VerifiedUser
    MobileDestination.CUSTOMERS -> Icons.Default.People
    MobileDestination.EXPENSES -> Icons.Default.Receipt
    MobileDestination.REPORTS -> Icons.Default.Assessment
    MobileDestination.CALCULATOR -> Icons.Default.Calculate
    MobileDestination.SETTINGS -> Icons.Default.Settings
    MobileDestination.WORKSPACE -> Icons.Default.Apps
}

fun QuickAction.icon(): ImageVector = when (this) {
    QuickAction.START_SALE -> Icons.Default.PointOfSale
    QuickAction.SCAN_SEARCH_PRODUCT -> Icons.Default.QrCodeScanner
    QuickAction.RECEIVE_GOODS -> Icons.Default.LocalShipping
    QuickAction.COUNT_STOCK -> Icons.Default.FactCheck
    QuickAction.VIEW_ASSIGNED_TASKS -> Icons.Default.Checklist
    QuickAction.REVIEW_APPROVALS -> Icons.Default.VerifiedUser
    QuickAction.REQUEST_APPROVAL -> Icons.Default.VerifiedUser
    QuickAction.OPEN_CLOSE_SHIFT -> Icons.Default.Schedule
    QuickAction.VIEW_REPORTS -> Icons.Default.Assessment
    QuickAction.RECORD_EXPENSE -> Icons.Default.Receipt
    QuickAction.CUSTOMER_BALANCES -> Icons.Default.People
    QuickAction.MANAGE_CATALOGUE -> Icons.Default.Inventory
}
