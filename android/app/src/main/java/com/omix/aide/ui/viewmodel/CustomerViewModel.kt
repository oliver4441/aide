package com.omix.aide.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.omix.aide.data.local.converters.asMoney
import com.omix.aide.data.local.entities.CustomerEntity
import com.omix.aide.data.repository.CustomerRepository
import com.omix.aide.domain.ia.EmployeeRole
import com.omix.aide.domain.ia.MobilePermission
import com.omix.aide.domain.ia.OperatingContext
import com.omix.aide.domain.ia.RoleNavigationResolver
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

data class CustomerUiState(
    val customers: List<CustomerEntity> = emptyList(),
    val searchQuery: String = "",
    val isLoading: Boolean = true,
    val isAddOpen: Boolean = false,
    val canCreateCustomer: Boolean = true,
    val canDeleteCustomer: Boolean = true
) {
    /** Total outstanding across every customer who owes the business. */
    val totalOwed: Double get() = customers.sumOf { it.balance.asMoney() }
    val owingCount: Int get() = customers.count { it.balance > 0L }
}

@OptIn(ExperimentalCoroutinesApi::class)
class CustomerViewModel(
    private val customerRepository: CustomerRepository,
    private val contextFlow: StateFlow<OperatingContext>
) : ViewModel() {

    constructor(
        customerRepository: CustomerRepository,
        businessId: String
    ) : this(
        customerRepository = customerRepository,
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
    private var lastBusinessId: String = contextFlow.value.businessId

    init {
        viewModelScope.launch {
            contextFlow.collect { ctx ->
                if (ctx.businessId != lastBusinessId || ctx.isRevoked) {
                    lastBusinessId = ctx.businessId
                    _searchQuery.value = ""
                    _isAddOpen.value = false
                }
            }
        }
    }

    val uiState: StateFlow<CustomerUiState> = contextFlow.flatMapLatest { ctx ->
        if (!ctx.hasPermission(MobilePermission.CUSTOMER_READ)) {
            return@flatMapLatest flowOf(
                CustomerUiState(
                    customers = emptyList(),
                    isLoading = false,
                    canCreateCustomer = false,
                    canDeleteCustomer = false
                )
            )
        }
        combine(
            customerRepository.getCustomers(ctx.businessId),
            _searchQuery,
            _isAddOpen
        ) { customers, query, isAdd ->
            val filtered = if (query.isBlank()) customers else customers.filter {
                it.name.contains(query, ignoreCase = true) ||
                    (it.phone?.contains(query, ignoreCase = true) == true)
            }
            val canCreate = ctx.hasPermission(MobilePermission.CUSTOMER_CREATE)
            val canDelete = ctx.hasPermission(MobilePermission.CUSTOMER_DELETE)
            CustomerUiState(
                customers = filtered,
                searchQuery = query,
                isLoading = false,
                isAddOpen = isAdd && canCreate,
                canCreateCustomer = canCreate,
                canDeleteCustomer = canDelete
            )
        }
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = CustomerUiState()
    )

    fun setSearchQuery(query: String) {
        _searchQuery.value = query
    }

    fun setAddOpen(isOpen: Boolean) {
        if (isOpen && !contextFlow.value.hasPermission(MobilePermission.CUSTOMER_CREATE)) return
        _isAddOpen.value = isOpen
    }

    fun addCustomer(name: String, phone: String, email: String, notes: String) {
        val ctx = contextFlow.value
        if (!RoleNavigationResolver.authorizeOperation(ctx, MobilePermission.CUSTOMER_CREATE).allowed) return
        viewModelScope.launch {
            customerRepository.addCustomer(ctx.businessId, name, phone, email, notes)
            _isAddOpen.value = false
        }
    }

    fun deleteCustomer(id: String) {
        val ctx = contextFlow.value
        if (!RoleNavigationResolver.authorizeOperation(ctx, MobilePermission.CUSTOMER_DELETE).allowed) return
        viewModelScope.launch { customerRepository.deleteCustomer(id) }
    }
}
