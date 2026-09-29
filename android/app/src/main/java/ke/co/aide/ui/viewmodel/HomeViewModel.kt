package ke.co.aide.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import ke.co.aide.data.local.dao.SaleWithItems
import ke.co.aide.data.local.entities.ProductEntity
import ke.co.aide.data.repository.ProductRepository
import ke.co.aide.data.repository.SaleRepository
import kotlinx.coroutines.flow.*

data class HomeUiState(
    val todaySalesTotal: Double = 0.0,
    val todayProfitTotal: Double = 0.0,
    val todaySalesCount: Int = 0,
    val lowStockProducts: List<ProductEntity> = emptyList(),
    val recentSales: List<SaleWithItems> = emptyList(),
    val isLoading: Boolean = false
)

class HomeViewModel(
    private val productRepository: ProductRepository,
    private val saleRepository: SaleRepository,
    private val businessId: String
) : ViewModel() {

    val uiState: StateFlow<HomeUiState> = combine(
        productRepository.getLowStockProducts(businessId),
        saleRepository.getSales(businessId)
    ) { lowStock, sales ->
        val todayTotal = sales.sumOf { it.sale.total }
        val todayProfit = sales.sumOf { it.sale.profit }
        HomeUiState(
            todaySalesTotal = todayTotal,
            todayProfitTotal = todayProfit,
            todaySalesCount = sales.size,
            lowStockProducts = lowStock,
            recentSales = sales.take(5),
            isLoading = false
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = HomeUiState(isLoading = true)
    )
}
