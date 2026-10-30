package com.omix.aide.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.omix.aide.data.local.dao.SaleWithItems
import com.omix.aide.data.local.entities.ProductEntity
import com.omix.aide.data.repository.ProductRepository
import com.omix.aide.data.repository.SaleRepository
import com.omix.aide.ui.components.ChartDataPoint
import kotlinx.coroutines.flow.*
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

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
    ) { lowStock, sales ->
        val todayTotal = sales.sumOf { it.sale.total }
        val todayProfit = sales.sumOf { it.sale.profit }

        // Build 7-day sales breakdown for visual chart
        val chartData = buildWeeklyChartData(sales)

        HomeUiState(
            todaySalesTotal = todayTotal,
            todayProfitTotal = todayProfit,
            todaySalesCount = sales.size,
            weeklySalesChart = chartData,
            lowStockProducts = lowStock,
            recentSales = sales.take(5),
            isLoading = false
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = HomeUiState(isLoading = true)
    )

    private fun buildWeeklyChartData(sales: List<SaleWithItems>): List<ChartDataPoint> {
        val days = listOf("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun")
        val calendar = Calendar.getInstance()
        val dayOfWeekIndex = (calendar.get(Calendar.DAY_OF_WEEK) + 5) % 7 // Monday = 0

        val salesByDay = FloatArray(7) { 0f }

        sales.forEach { item ->
            val dateStr = item.sale.createdAt
            val date = parseIsoDate(dateStr)
            if (date != null) {
                val itemCal = Calendar.getInstance().apply { time = date }
                val itemDayIndex = (itemCal.get(Calendar.DAY_OF_WEEK) + 5) % 7
                salesByDay[itemDayIndex] += item.sale.total.toFloat()
            } else {
                salesByDay[dayOfWeekIndex] += item.sale.total.toFloat()
            }
        }

        return days.mapIndexed { index, dayName ->
            ChartDataPoint(
                label = dayName,
                value = salesByDay[index],
                formattedValue = String.format(Locale.US, "%.2f", salesByDay[index])
            )
        }
    }

    private fun parseIsoDate(isoStr: String): Date? {
        return runCatching {
            SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US).parse(isoStr)
        }.getOrNull()
    }
}
