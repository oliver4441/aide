package com.omix.aide.ui.viewmodel

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.omix.aide.data.local.entities.CustomerEntity
import com.omix.aide.data.local.entities.CustomerPaymentEntity
import com.omix.aide.data.repository.CustomerRepository
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

data class CustomerUiState(
    val customers: List<CustomerEntity> = emptyList(),
    val searchQuery: String = "",
    val isLoading: Boolean = true,
    val isAddOpen: Boolean = false,
    val selectedCustomerForPayment: CustomerEntity? = null,
    val selectedCustomerPayments: List<CustomerPaymentEntity> = emptyList()
) {
    val totalOwed: Double get() = customers.sumOf { it.balance }
    val owingCount: Int get() = customers.count { it.balance > 0.0 }
}

@OptIn(ExperimentalCoroutinesApi::class)
class CustomerViewModel(
    private val customerRepository: CustomerRepository,
    private val businessId: String
) : ViewModel() {

    private val _searchQuery = MutableStateFlow("")
    private val _isAddOpen = MutableStateFlow(false)
    private val _selectedCustomerForPayment = MutableStateFlow<CustomerEntity?>(null)

    private val _selectedPayments = _selectedCustomerForPayment
        .flatMapLatest { customer ->
            if (customer != null) customerRepository.getPayments(customer.id)
            else flowOf(emptyList())
        }

    val uiState: StateFlow<CustomerUiState> = combine(
        customerRepository.getCustomers(businessId),
        _searchQuery,
        _isAddOpen,
        _selectedCustomerForPayment,
        _selectedPayments
    ) { customers, query, isAdd, selectedCustomer, payments ->
        val filtered = if (query.isBlank()) customers else customers.filter {
            it.name.contains(query, ignoreCase = true) ||
                (it.phone?.contains(query, ignoreCase = true) == true)
        }
        CustomerUiState(
            customers = filtered,
            searchQuery = query,
            isLoading = false,
            isAddOpen = isAdd,
            selectedCustomerForPayment = selectedCustomer,
            selectedCustomerPayments = payments
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

    fun setSelectedCustomerForPayment(customer: CustomerEntity?) {
        _selectedCustomerForPayment.value = customer
    }

    fun addCustomer(name: String, phone: String, email: String, notes: String) {
        viewModelScope.launch {
            customerRepository.addCustomer(businessId, name, phone, email, notes)
            _isAddOpen.value = false
        }
    }

    fun recordPayment(customerId: String, amount: Double, method: String, notes: String?) {
        viewModelScope.launch {
            customerRepository.recordPayment(businessId, customerId, amount, method, notes)
            _selectedCustomerForPayment.value = null
        }
    }

    fun deleteCustomer(id: String) {
        viewModelScope.launch { customerRepository.deleteCustomer(id) }
    }

    fun sendWhatsAppReminder(context: Context, customer: CustomerEntity, storeName: String) {
        val phone = customer.phone?.replace("[^0-9]".toRegex(), "") ?: return
        val message = "Hello ${customer.name}, friendly reminder regarding your balance of KSh ${"%.2f".format(customer.balance)} at $storeName. Thank you!"
        val intent = Intent(Intent.ACTION_VIEW).apply {
            data = Uri.parse("https://api.whatsapp.com/send?phone=$phone&text=${Uri.encode(message)}")
        }
        runCatching { context.startActivity(intent) }
    }
}
