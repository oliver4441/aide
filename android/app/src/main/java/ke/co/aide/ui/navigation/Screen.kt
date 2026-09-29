package ke.co.aide.ui.navigation

sealed class Screen(val route: String) {
    object Login : Screen("login")
    object Home : Screen("home")
    object Sell : Screen("sell")
    object Stock : Screen("stock")
    object More : Screen("more")
    object SyncCenter : Screen("sync_center")
    object Customers : Screen("customers")
    object Expenses : Screen("expenses")
    object Reports : Screen("reports")
    object Receipt : Screen("receipt/{saleId}") {
        fun createRoute(saleId: String) = "receipt/$saleId"
    }
}
