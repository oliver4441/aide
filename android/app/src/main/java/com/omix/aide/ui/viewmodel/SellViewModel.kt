package com.omix.aide.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.omix.aide.data.local.entities.ProductEntity
import com.omix.aide.data.local.entities.SaleItemEntity
import com.omix.aide.data.repository.ProductRepository
import com.omix.aide.data.repository.SaleRepository
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

data class CartItem(
    val product: ProductEntity,
    val quantity: Int
)

data class SellUiState(
    val products: List<ProductEntity> = emptyList(),
    val cart: List<CartItem> = emptyList(),
    val searchQuery: String = "",
    val paymentMethod: String = "CASH",
    val amountPaid: String = "",
    val lastCompletedSaleId: String? = null,
    val error: String? = null
) {
    val subtotal: Double get() = cart.sumOf { it.product.sellingPrice * it.quantity }
    val totalCost: Double get() = cart.sumOf { it.product.buyingPrice * it.quantity }
    val profit: Double get() = subtotal - totalCost
}

class SellViewModel(
    private val productRepository: ProductRepository,
    private val saleRepository: SaleRepository,
    private val businessId: String
) : ViewModel() {

    private val _searchQuery = MutableStateFlow("")
    private val _cart = MutableStateFlow<List<CartItem>>(emptyList())
    private val _paymentMethod = MutableStateFlow("CASH")
    private val _amountPaid = MutableStateFlow("")
    private val _lastSaleId = MutableStateFlow<String?>(null)
    private val _error = MutableStateFlow<String?>(null)

    private val _inputsFlow = combine(
        _searchQuery,
        _cart,
        _paymentMethod,
        _amountPaid
    ) { query, cart, method, paid ->
        Tuple4(query, cart, method, paid)
    }

    private val _statusFlow = combine(
        _lastSaleId,
        _error
    ) { saleId, err ->
        Pair(saleId, err)
    }

    val uiState: StateFlow<SellUiState> = combine(
        productRepository.getProducts(businessId),
        _inputsFlow,
        _statusFlow
    ) { products, inputs, status ->
        val query = inputs.val1
        val cart = inputs.val2
        val method = inputs.val3
        val paid = inputs.val4
        val saleId = status.first
        val err = status.second

        val filtered = if (query.isBlank()) products else products.filter { p ->
            p.name.lowercase().contains(query.lowercase()) || (p.sku?.lowercase()?.contains(query.lowercase()) == true)
        }

        SellUiState(
            products = filtered,
            cart = cart,
            searchQuery = query,
            paymentMethod = method,
            amountPaid = paid,
            lastCompletedSaleId = saleId,
            error = err
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = SellUiState()
    )

    fun setSearchQuery(query: String) {
        _searchQuery.value = query
    }

    fun addToCart(product: ProductEntity) {
        val current = _cart.value.toMutableList()
        val index = current.indexOfFirst { it.product.id == product.id }
        if (index >= 0) {
            val existing = current[index]
            current[index] = existing.copy(quantity = existing.quantity + 1)
        } else {
            current.add(CartItem(product = product, quantity = 1))
        }
        _cart.value = current
    }

    fun removeFromCart(productId: String) {
        _cart.value = _cart.value.filterNot { it.product.id == productId }
    }

    fun updateQuantity(productId: String, delta: Int) {
        val current = _cart.value.toMutableList()
        val index = current.indexOfFirst { it.product.id == productId }
        if (index >= 0) {
            val newQty = current[index].quantity + delta
            if (newQty <= 0) {
                current.removeAt(index)
            } else {
                current[index] = current[index].copy(quantity = newQty)
            }
            _cart.value = current
        }
    }

    fun setPaymentMethod(method: String) {
        _paymentMethod.value = method
    }

    fun setAmountPaid(amount: String) {
        _amountPaid.value = amount
    }

    fun completeSale(onSuccess: (String) -> Unit) {
        val currentCart = _cart.value
        if (currentCart.isEmpty()) {
            _error.value = "Cart is empty"
            return
        }

        viewModelScope.launch {
            val total = currentCart.sumOf { it.product.sellingPrice * it.quantity }
            val cost = currentCart.sumOf { it.product.buyingPrice * it.quantity }
            val profit = total - cost
            val paidVal = _amountPaid.value.toDoubleOrNull() ?: total
            val change = (paidVal - total).coerceAtLeast(0.0)

            val saleItems = currentCart.map { item ->
                SaleItemEntity(
                    id = "",
                    saleId = "",
                    productId = item.product.id,
                    name = item.product.name,
                    quantity = item.quantity,
                    price = item.product.sellingPrice,
                    cost = item.product.buyingPrice
                )
            }

            try {
                val sale = saleRepository.createSale(
                    businessId = businessId,
                    items = saleItems,
                    total = total,
                    cost = cost,
                    profit = profit,
                    paid = paidVal,
                    change = change,
                    paymentMethod = _paymentMethod.value
                )

                _cart.value = emptyList()
                _amountPaid.value = ""
                _lastSaleId.value = sale.id
                onSuccess(sale.id)
            } catch (e: Exception) {
                _error.value = e.message ?: "Failed to record sale"
            }
        }
    }

    fun clearError() {
        _error.value = null
    }

    private data class Tuple4<A, B, C, D>(
        val val1: A,
        val val2: B,
        val val3: C,
        val val4: D
    )
}
