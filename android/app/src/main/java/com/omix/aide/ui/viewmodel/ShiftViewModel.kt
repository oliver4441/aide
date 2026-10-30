package com.omix.aide.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.omix.aide.data.local.entities.CashierShiftEntity
import com.omix.aide.data.repository.ShiftRepository
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

data class ShiftUiState(
    val shifts: List<CashierShiftEntity> = emptyList(),
    val activeShift: CashierShiftEntity? = null,
    val isLoading: Boolean = true
)

class ShiftViewModel(
    private val shiftRepository: ShiftRepository,
    private val businessId: String
) : ViewModel() {

    val uiState: StateFlow<ShiftUiState> = shiftRepository.getShifts(businessId)
        .map { list ->
            val active = list.firstOrNull { it.status == "OPEN" }
            ShiftUiState(
                shifts = list,
                activeShift = active,
                isLoading = false
            )
        }.stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = ShiftUiState()
        )

    fun openShift(cashierName: String, startingFloat: Double) {
        viewModelScope.launch {
            shiftRepository.openShift(businessId, cashierName, startingFloat)
        }
    }

    fun closeShift(actualCash: Double) {
        viewModelScope.launch {
            val active = uiState.value.activeShift ?: return@launch
            shiftRepository.closeShift(businessId, active.id, actualCash)
        }
    }
}
