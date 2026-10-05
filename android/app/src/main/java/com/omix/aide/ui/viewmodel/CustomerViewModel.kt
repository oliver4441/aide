package com.omix.aide.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.omix.aide.data.local.entities.CustomerEntity
import com.omix.aide.data.repository.CustomerRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

data class CustomerUiState(
    val customers: List<CustomerEntity> = emptyList(),
    val searchQuery: String = "",
    val isLoading: Boolean = true,
    val isAddOpen: Boolean = false
) {
    /** Total outstanding across every customer who owes the business. */
    val totalOwed: Double get() = customers.sumOf { it.balance }
    val owingCount: Int get() = customers.count { it.balance > 0.0 }
}

class CustomerViewModel(
    private val customerRepository: CustomerRepository,
    private val businessId: String
) : ViewModel() {

    private val _searchQuery = MutableStateFlow("")
    private val _isAddOpen = MutableStateFlow(false)

    val uiState: StateFlow<CustomerUiState> = combine(
        customerRepository.getCustomers(businessId),
        _searchQuery,
        _isAddOpen
    ) { customers, query, isAdd ->
        val filtered = if (query.isBlank()) customers else customers.filter {
            it.name.contains(query, ignoreCase = true) ||
                (it.phone?.contains(query, ignoreCase = true) == true)
        }
        CustomerUiState(
            customers = filtered,
            searchQuery = query,
            isLoading = false,
            isAddOpen = isAdd
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = CustomerUiState()
    )

    fun setSearchQuery(query: String) {
        _searchQuery.value = query
    }

    fun setAddOpen(isOpen: Boolean) {
        _isAddOpen.value = isOpen
    }

    fun addCustomer(name: String, phone: String, email: String, notes: String) {
        viewModelScope.launch {
            customerRepository.addCustomer(businessId, name, phone, email, notes)
            _isAddOpen.value = false
        }
    }

    fun deleteCustomer(id: String) {
        viewModelScope.launch { customerRepository.deleteCustomer(id) }
    }
}