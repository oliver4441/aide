package com.omix.aide.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.omix.aide.data.local.entities.CategoryEntity
import com.omix.aide.data.local.entities.ProductEntity
import com.omix.aide.data.repository.ProductRepository
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

data class StockUiState(
    val products: List<ProductEntity> = emptyList(),
    val categories: List<CategoryEntity> = emptyList(),
    val searchQuery: String = "",
    val isLoading: Boolean = false,
    val isAddProductOpen: Boolean = false
)

class StockViewModel(
    private val productRepository: ProductRepository,
    private val businessId: String
) : ViewModel() {

    private val _searchQuery = MutableStateFlow("")
    private val _isAddOpen = MutableStateFlow(false)

    val uiState: StateFlow<StockUiState> = combine(
        productRepository.getProducts(businessId),
        productRepository.getCategories(businessId),
        _searchQuery,
        _isAddOpen
    ) { products, categories, query, isAdd ->
        val filtered = if (query.isBlank()) products else products.filter {
            it.name.contains(query, ignoreCase = true) || (it.sku?.contains(query, ignoreCase = true) == true)
        }
        StockUiState(
            products = filtered,
            categories = categories,
            searchQuery = query,
            isAddProductOpen = isAdd
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = StockUiState(isLoading = true)
    )

    fun setSearchQuery(query: String) {
        _searchQuery.value = query
    }

    fun setAddProductOpen(isOpen: Boolean) {
        _isAddOpen.value = isOpen
    }

    fun addProduct(
        name: String,
        buyingPrice: Double,
        sellingPrice: Double,
        quantity: Int,
        lowStock: Int = 5,
        sku: String? = null,
        imagePath: String? = null
    ) {
        viewModelScope.launch {
            val isoFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
                timeZone = TimeZone.getTimeZone("UTC")
            }
            val now = isoFormat.format(Date())
            val product = ProductEntity(
                id = UUID.randomUUID().toString(),
                businessId = businessId,
                name = name,
                buyingPrice = buyingPrice,
                sellingPrice = sellingPrice,
                quantity = quantity,
                lowStock = lowStock,
                sku = sku,
                imageUrl = imagePath,
                createdAt = now,
                updatedAt = now
            )
            productRepository.addOrUpdateProduct(product)
            _isAddOpen.value = false
        }
    }
}
