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
    val isAddProductOpen: Boolean = false,
    val editingProduct: ProductEntity? = null
)

class StockViewModel(
    private val productRepository: ProductRepository,
    private val businessId: String
) : ViewModel() {

    private val _searchQuery = MutableStateFlow("")
    private val _isAddOpen = MutableStateFlow(false)
    private val _editingProduct = MutableStateFlow<ProductEntity?>(null)

    val uiState: StateFlow<StockUiState> = combine(
        productRepository.getProducts(businessId),
        productRepository.getCategories(businessId),
        _searchQuery,
        _isAddOpen,
        _editingProduct
    ) { products, categories, query, isAdd, editing ->
        val filtered = if (query.isBlank()) products else products.filter {
            it.name.contains(query, ignoreCase = true) || (it.sku?.contains(query, ignoreCase = true) == true)
        }
        StockUiState(
            products = filtered,
            categories = categories,
            searchQuery = query,
            isAddProductOpen = isAdd,
            editingProduct = editing
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

    fun setEditingProduct(product: ProductEntity?) {
        _editingProduct.value = product
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

    fun updateProduct(
        id: String,
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
            val existing = uiState.value.products.find { it.id == id }
            val product = ProductEntity(
                id = id,
                businessId = businessId,
                name = name,
                buyingPrice = buyingPrice,
                sellingPrice = sellingPrice,
                quantity = quantity,
                lowStock = lowStock,
                sku = sku,
                imageUrl = imagePath ?: existing?.imageUrl,
                createdAt = existing?.createdAt ?: now,
                updatedAt = now
            )
            productRepository.addOrUpdateProduct(product)
            _editingProduct.value = null
        }
    }

    fun deleteProduct(id: String) {
        viewModelScope.launch {
            productRepository.deleteProduct(id)
            if (_editingProduct.value?.id == id) {
                _editingProduct.value = null
            }
        }
    }
}
