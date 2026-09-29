package ke.co.aide.ui.navigation

sealed class Screen(val route: String) {
    object Home : Screen("home")
    object Sell : Screen("sell")
    object Stock : Screen("stock")
    object More : Screen("more")
    object Customers : Screen("customers")
    object Expenses : Screen("expenses")
    object Reports : Screen("reports")
    object Receipt : Screen("receipt/{saleId}") {
        fun createRoute(saleId: String) = "receipt/$saleId"
    }
}
