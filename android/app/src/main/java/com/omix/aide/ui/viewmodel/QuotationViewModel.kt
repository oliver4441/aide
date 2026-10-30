package com.omix.aide.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.omix.aide.data.local.entities.QuotationEntity
import com.omix.aide.data.repository.QuotationRepository
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

data class QuotationUiState(
    val quotations: List<QuotationEntity> = emptyList(),
    val isLoading: Boolean = true,
    val isCreateOpen: Boolean = false
)

class QuotationViewModel(
    private val quotationRepository: QuotationRepository,
    private val businessId: String
) : ViewModel() {

    val uiState: StateFlow<QuotationUiState> = quotationRepository.getQuotations(businessId)
        .map { list ->
            QuotationUiState(quotations = list, isLoading = false)
        }.stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = QuotationUiState()
        )

    fun createQuotation(customerName: String, totalAmount: Double) {
        viewModelScope.launch {
            quotationRepository.createQuotation(businessId, customerName, totalAmount)
        }
    }

    fun deleteQuotation(id: String) {
        viewModelScope.launch {
            quotationRepository.deleteQuotation(id)
        }
    }
}
