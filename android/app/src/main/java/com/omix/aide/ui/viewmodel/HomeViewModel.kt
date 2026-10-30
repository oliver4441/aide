package com.omix.aide.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.omix.aide.data.local.dao.SaleWithItems
import com.omix.aide.data.local.entities.ProductEntity
import com.omix.aide.data.repository.ProductRepository
import com.omix.aide.data.repository.SaleRepository
import com.omix.aide.ui.components.ChartDataPoint
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.withContext

data class HomeUiState(
    val todaySalesTotal: Double = 0.0,
    val todayProfitTotal: Double = 0.0,
    val todaySalesCount: Int = 0,
    val weeklySalesChart: List<ChartDataPoint> = emptyList(),
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
    ) { lowStock, sales -> lowStock to sales }
        // The card says "today" and the chart says "last 7 days", so both are
        // measured against real calendar days rather than the whole history.
        // Parsing a few thousand timestamps is not main-thread work.
        .map { (lowStock, sales) ->
            withContext(Dispatchers.Default) {
                buildState(lowStock, sales, System.currentTimeMillis())
            }
        }
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = HomeUiState(isLoading = true)
        )

    private fun buildState(
        lowStock: List<ProductEntity>,
        sales: List<SaleWithItems>,
        now: Long
    ): HomeUiState {
        val today = SaleTimeline.todayTotals(sales, now)
        val week = SaleTimeline.lastSevenDays(sales, now)

        return HomeUiState(
            todaySalesTotal = today.total,
            todayProfitTotal = today.profit,
            todaySalesCount = today.count,
            weeklySalesChart = week.map { day ->
                ChartDataPoint(label = day.label, value = day.total.toFloat())
            },
            lowStockProducts = lowStock,
            // The DAO orders by createdAt DESC, so these are the newest sales.
            recentSales = sales.take(5),
            isLoading = false
        )
    }
}
