package com.omix.aide.ui.navigation

/** Every screen in the Android app. */
sealed class Screen(val route: String) {
    object Home : Screen("home")
    object Sell : Screen("sell")
    object Stock : Screen("stock")
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
