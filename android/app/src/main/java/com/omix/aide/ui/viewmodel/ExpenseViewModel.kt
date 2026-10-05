package com.omix.aide.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.omix.aide.data.local.entities.ExpenseEntity
import com.omix.aide.data.repository.ExpenseRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

data class ExpenseUiState(
    val expenses: List<ExpenseEntity> = emptyList(),
    val isLoading: Boolean = true,
    val isAddOpen: Boolean = false
) {
    val total: Double get() = expenses.sumOf { it.amount }
}

class ExpenseViewModel(
    private val expenseRepository: ExpenseRepository,
    private val businessId: String
) : ViewModel() {

    private val _isAddOpen = MutableStateFlow(false)

    val uiState: StateFlow<ExpenseUiState> = combine(
        expenseRepository.getExpenses(businessId),
        _isAddOpen
    ) { expenses, isAdd ->
        ExpenseUiState(expenses = expenses, isLoading = false, isAddOpen = isAdd)
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = ExpenseUiState()
    )

    fun setAddOpen(isOpen: Boolean) {
        _isAddOpen.value = isOpen
    }

    fun addExpense(
        category: String,
        amount: Double,
        description: String,
        notes: String,
        isCogs: Boolean
    ) {
        viewModelScope.launch {
            expenseRepository.addExpense(
                businessId = businessId,
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
        viewModelScope.launch { expenseRepository.deleteExpense(id) }
    }
}