package com.omix.aide.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.omix.aide.data.local.entities.PurchaseOrderEntity
import com.omix.aide.data.local.entities.SupplierEntity
import com.omix.aide.data.repository.SupplierRepository
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

data class SupplierUiState(
    val suppliers: List<SupplierEntity> = emptyList(),
    val purchaseOrders: List<PurchaseOrderEntity> = emptyList(),
    val searchQuery: String = "",
    val isLoading: Boolean = true,
    val isAddSupplierOpen: Boolean = false,
    val isAddPOOpen: Boolean = false
)

class SupplierViewModel(
    private val supplierRepository: SupplierRepository,
    private val businessId: String
) : ViewModel() {

    private val _searchQuery = MutableStateFlow("")
    private val _isAddSupplierOpen = MutableStateFlow(false)
    private val _isAddPOOpen = MutableStateFlow(false)

    val uiState: StateFlow<SupplierUiState> = combine(
        supplierRepository.getSuppliers(businessId),
        supplierRepository.getPurchaseOrders(businessId),
        _searchQuery,
        _isAddSupplierOpen,
        _isAddPOOpen
    ) { suppliers, pos, query, isAddSupplier, isAddPO ->
        val filtered = if (query.isBlank()) suppliers else suppliers.filter {
            it.name.contains(query, ignoreCase = true) || (it.phone?.contains(query, ignoreCase = true) == true)
        }
        SupplierUiState(
            suppliers = filtered,
            purchaseOrders = pos,
            searchQuery = query,
            isLoading = false,
            isAddSupplierOpen = isAddSupplier,
            isAddPOOpen = isAddPO
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = SupplierUiState()
    )

    fun setSearchQuery(query: String) {
        _searchQuery.value = query
    }

    fun setAddSupplierOpen(isOpen: Boolean) {
        _isAddSupplierOpen.value = isOpen
    }

    fun setAddPOOpen(isOpen: Boolean) {
        _isAddPOOpen.value = isOpen
    }

    fun addSupplier(name: String, phone: String, email: String, address: String) {
        viewModelScope.launch {
            supplierRepository.addSupplier(businessId, name, phone, email, address)
            _isAddSupplierOpen.value = false
        }
    }

    fun createPurchaseOrder(supplierId: String, supplierName: String, amount: Double, notes: String?) {
        viewModelScope.launch {
            supplierRepository.createPurchaseOrder(businessId, supplierId, supplierName, amount, notes)
            _isAddPOOpen.value = false
        }
    }

    fun deleteSupplier(id: String) {
        viewModelScope.launch { supplierRepository.deleteSupplier(id) }
    }
}
