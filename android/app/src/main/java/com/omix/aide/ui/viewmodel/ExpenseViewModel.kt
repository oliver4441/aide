package com.omix.aide.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.omix.aide.data.local.converters.asMoney
import com.omix.aide.data.local.entities.ExpenseEntity
import com.omix.aide.data.repository.ExpenseRepository
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

data class ExpenseUiState(
    val expenses: List<ExpenseEntity> = emptyList(),
    val isLoading: Boolean = true,
    val isAddOpen: Boolean = false,
    val canCreateExpense: Boolean = true
) {
    val total: Double get() = expenses.sumOf { it.amount.asMoney() }
}

@OptIn(ExperimentalCoroutinesApi::class)
class ExpenseViewModel(
    private val expenseRepository: ExpenseRepository,
    private val contextFlow: StateFlow<OperatingContext>
) : ViewModel() {

    constructor(
        expenseRepository: ExpenseRepository,
        businessId: String
    ) : this(
        expenseRepository = expenseRepository,
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

    private val _isAddOpen = MutableStateFlow(false)
    private var lastBusinessId: String = contextFlow.value.businessId

    init {
        viewModelScope.launch {
            contextFlow.collect { ctx ->
                if (ctx.businessId != lastBusinessId || ctx.isRevoked) {
                    lastBusinessId = ctx.businessId
                    _isAddOpen.value = false
                }
            }
        }
    }

    val uiState: StateFlow<ExpenseUiState> = contextFlow.flatMapLatest { ctx ->
        if (!ctx.hasPermission(MobilePermission.EXPENSE_READ)) {
            return@flatMapLatest flowOf(
                ExpenseUiState(
                    expenses = emptyList(),
                    isLoading = false,
                    canCreateExpense = false
                )
            )
        }
        val canCreate = ctx.hasPermission(MobilePermission.EXPENSE_CREATE)
        combine(
            expenseRepository.getExpenses(ctx.businessId),
            _isAddOpen
        ) { expenses, isAdd ->
            ExpenseUiState(
                expenses = expenses,
                isLoading = false,
                isAddOpen = isAdd && canCreate,
                canCreateExpense = canCreate
            )
        }
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = ExpenseUiState()
    )

    fun setAddOpen(isOpen: Boolean) {
        if (isOpen && !contextFlow.value.hasPermission(MobilePermission.EXPENSE_CREATE)) return
        _isAddOpen.value = isOpen
    }

    fun addExpense(
        category: String,
        amount: Double,
        description: String,
        notes: String,
        isCogs: Boolean
    ) {
        val ctx = contextFlow.value
        if (!RoleNavigationResolver.authorizeOperation(ctx, MobilePermission.EXPENSE_CREATE).allowed) return
        viewModelScope.launch {
            expenseRepository.addExpense(
                businessId = ctx.businessId,
                category = category,
                amount = amount,
                description = description,
                notes = notes,
                isCogs = isCogs
            )
            _isAddOpen.value = false
        }
    }

    fun deleteExpense(id: String) {
        val ctx = contextFlow.value
        if (!RoleNavigationResolver.authorizeOperation(ctx, MobilePermission.EXPENSE_CREATE).allowed) return
        viewModelScope.launch { expenseRepository.deleteExpense(id) }
    }
}
