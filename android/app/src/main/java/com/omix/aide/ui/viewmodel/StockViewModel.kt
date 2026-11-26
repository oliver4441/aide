package com.omix.aide.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.omix.aide.data.local.converters.toScaledMoney
import com.omix.aide.data.local.entities.CategoryEntity
import com.omix.aide.data.local.entities.ProductEntity
import com.omix.aide.data.repository.ProductRepository
import com.omix.aide.domain.ia.EmployeeRole
import com.omix.aide.domain.ia.MobilePermission
import com.omix.aide.domain.ia.OperatingContext
import com.omix.aide.domain.ia.RoleNavigationResolver
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.UUID
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

data class StockUiState(
    val products: List<ProductEntity> = emptyList(),
    val categories: List<CategoryEntity> = emptyList(),
    val searchQuery: String = "",
    val isLoading: Boolean = false,
    val isAddProductOpen: Boolean = false,
    val editingProduct: ProductEntity? = null,
    val canCreateProduct: Boolean = true,
    val canUpdateProduct: Boolean = true,
    val canDeleteProduct: Boolean = true,
    val canViewCostAndMargin: Boolean = true,
    val error: String? = null
)

@OptIn(ExperimentalCoroutinesApi::class)
class StockViewModel(
    private val productRepository: ProductRepository,
    private val contextFlow: StateFlow<OperatingContext>
) : ViewModel() {

    constructor(
        productRepository: ProductRepository,
        businessId: String
    ) : this(
        productRepository = productRepository,
        contextFlow = MutableStateFlow(
            OperatingContext(
                membershipId = "mem-$businessId",
                organizationId = "org-$businessId",
                organizationName = "My Business",
                businessId = businessId,
                businessName = "My Business",
                role = EmployeeRole.OWNER_ADMIN
            )
        )
    )

    private val _searchQuery = MutableStateFlow("")
    private val _isAddOpen = MutableStateFlow(false)
    private val _editingProduct = MutableStateFlow<ProductEntity?>(null)
    private val _error = MutableStateFlow<String?>(null)
    private var lastBusinessId: String = contextFlow.value.businessId

    init {
        viewModelScope.launch {
            contextFlow.collect { ctx ->
                if (ctx.businessId != lastBusinessId || ctx.isRevoked) {
                    lastBusinessId = ctx.businessId
                    _searchQuery.value = ""
                    _isAddOpen.value = false
                    _editingProduct.value = null
                    _error.value = null
                }
            }
        }
    }

    val uiState: StateFlow<StockUiState> = contextFlow.flatMapLatest { ctx ->
        if (!ctx.hasPermission(MobilePermission.PRODUCT_READ)) {
            return@flatMapLatest flowOf(
                StockUiState(
                    canCreateProduct = false,
                    canUpdateProduct = false,
                    canDeleteProduct = false,
                    canViewCostAndMargin = false,
                    isLoading = false
                )
            )
        }
        combine(
            productRepository.getProducts(ctx.businessId),
            productRepository.getCategories(ctx.businessId),
            _searchQuery,
            _isAddOpen,
            combine(_editingProduct, _error) { edit, err -> edit to err }
        ) { products, categories, query, isAdd, editAndErr ->
            val filtered = if (query.isBlank()) products else products.filter {
                it.name.contains(query, ignoreCase = true) ||
                    (it.sku?.contains(query, ignoreCase = true) == true)
            }
            val canCreate = ctx.hasPermission(MobilePermission.PRODUCT_CREATE)
            val canUpdate = ctx.hasPermission(MobilePermission.PRODUCT_UPDATE)
            val canDelete = ctx.hasPermission(MobilePermission.PRODUCT_DELETE)
            val canSeeCost = canUpdate || ctx.hasPermission(MobilePermission.REPORT_READ)
            StockUiState(
                products = filtered,
                categories = categories,
                searchQuery = query,
                isAddProductOpen = isAdd && canCreate,
                editingProduct = editAndErr.first?.takeIf { canUpdate && it.businessId == ctx.businessId },
                canCreateProduct = canCreate,
                canUpdateProduct = canUpdate,
                canDeleteProduct = canDelete,
                canViewCostAndMargin = canSeeCost,
                error = editAndErr.second
            )
        }
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = StockUiState(isLoading = true)
    )

    fun setSearchQuery(query: String) {
        _searchQuery.value = query
    }

    fun setAddProductOpen(isOpen: Boolean) {
        if (isOpen && !contextFlow.value.hasPermission(MobilePermission.PRODUCT_CREATE)) return
        _isAddOpen.value = isOpen
    }

    fun setEditingProduct(product: ProductEntity?) {
        if (product != null && !contextFlow.value.hasPermission(MobilePermission.PRODUCT_UPDATE)) return
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
        val ctx = contextFlow.value
        val auth = RoleNavigationResolver.authorizeOperation(ctx, MobilePermission.PRODUCT_CREATE)
        if (!auth.allowed) {
            _error.value = auth.reason
            return
        }
        viewModelScope.launch {
            val isoFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
                timeZone = TimeZone.getTimeZone("UTC")
            }
            val now = isoFormat.format(Date())
            val product = ProductEntity(
                id = UUID.randomUUID().toString(),
                businessId = ctx.businessId,
                name = name,
                buyingPrice = buyingPrice.toScaledMoney(),
                sellingPrice = sellingPrice.toScaledMoney(),
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
        val ctx = contextFlow.value
        val auth = RoleNavigationResolver.authorizeOperation(ctx, MobilePermission.PRODUCT_UPDATE)
        if (!auth.allowed) {
            _error.value = auth.reason
            return
        }
        viewModelScope.launch {
            val isoFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
                timeZone = TimeZone.getTimeZone("UTC")
            }
            val now = isoFormat.format(Date())
            val existing = uiState.value.products.find { it.id == id }
            if (existing != null && existing.businessId != ctx.businessId) return@launch
            val product = ProductEntity(
                id = id,
                businessId = ctx.businessId,
                name = name,
                buyingPrice = buyingPrice.toScaledMoney(),
                sellingPrice = sellingPrice.toScaledMoney(),
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
        val ctx = contextFlow.value
        val auth = RoleNavigationResolver.authorizeOperation(ctx, MobilePermission.PRODUCT_DELETE)
        if (!auth.allowed) {
            _error.value = auth.reason
            return
        }
        viewModelScope.launch {
            productRepository.deleteProduct(id)
            if (_editingProduct.value?.id == id) {
                _editingProduct.value = null
            }
        }
    }
}
