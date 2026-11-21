package com.omix.aide.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.omix.aide.data.local.dao.SaleWithItems
import com.omix.aide.data.local.entities.ProductEntity
import com.omix.aide.data.repository.ProductRepository
import com.omix.aide.data.repository.SaleRepository
import kotlinx.coroutines.flow.*

data class HomeUiState(
    val todaySalesTotal: Double = 0.0,
    val todayProfitTotal: Double = 0.0,
    val todaySalesCount: Int = 0,
    val weeklySales: List<DailyTotal> = emptyList(),
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
        val now = System.currentTimeMillis()
        val today = SaleTimeline.todayTotals(sales, now)
        val week = SaleTimeline.lastSevenDays(sales, now)
        HomeUiState(
            todaySalesTotal = today.total,
            todayProfitTotal = today.profit,
            todaySalesCount = today.count,
            weeklySales = week,
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
