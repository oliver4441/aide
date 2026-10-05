package com.omix.aide.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.omix.aide.data.repository.ReportRepository
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale
import java.util.TimeZone
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/** The ranges the reports screen offers. */
enum class ReportRange(val label: String, val days: Int) {
    TODAY("Today", 1),
    WEEK("Last 7 days", 7),
    MONTH("Last 30 days", 30),
    ALL("All time", 0)
}

data class ReportUiState(
    val range: ReportRange = ReportRange.WEEK,
    val report: ReportRepository.Report? = null,
    val isLoading: Boolean = true
)

class ReportViewModel(
    private val reportRepository: ReportRepository,
    private val businessId: String
) : ViewModel() {

    private val _uiState = MutableStateFlow(ReportUiState())
    val uiState: StateFlow<ReportUiState> = _uiState.asStateFlow()

    init {
        refresh()
    }

    fun setRange(range: ReportRange) {
        if (range == _uiState.value.range) return
        _uiState.value = _uiState.value.copy(range = range)
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            val report = reportRepository.build(businessId, sinceIso(_uiState.value.range))
            _uiState.value = _uiState.value.copy(report = report, isLoading = false)
        }
    }

    private companion object {

        /**
         * `createdAt` is stored as an ISO-8601 UTC string, which sorts
         * lexicographically, so "N days ago" is just a formatted cutoff.
         */
        fun sinceIso(range: ReportRange): String {
            if (range.days == 0) return "1970-01-01T00:00:00.000Z"
            val calendar = Calendar.getInstance(TimeZone.getTimeZone("UTC")).apply {
                add(Calendar.DAY_OF_YEAR, -(range.days - 1))
                set(Calendar.HOUR_OF_DAY, 0)
                set(Calendar.MINUTE, 0)
                set(Calendar.SECOND, 0)
                set(Calendar.MILLISECOND, 0)
            }
            val format = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
            format.timeZone = TimeZone.getTimeZone("UTC")
            return format.format(calendar.time)
        }
    }
}