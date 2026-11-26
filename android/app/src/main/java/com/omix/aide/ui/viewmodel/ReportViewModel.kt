package com.omix.aide.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.omix.aide.data.repository.ReportRepository
import com.omix.aide.domain.ia.EmployeeRole
import com.omix.aide.domain.ia.MobilePermission
import com.omix.aide.domain.ia.OperatingContext
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

private fun defaultReportContext(businessId: String) = OperatingContext(
    membershipId = "mem-$businessId",
    organizationId = "org-$businessId",
    organizationName = "My Business",
    businessId = businessId,
    businessName = "My Business",
    role = EmployeeRole.OWNER_ADMIN
)

data class ReportUiState(
    val activeContext: OperatingContext = defaultReportContext("default"),
    val range: ReportRange = ReportRange.WEEK,
    val report: ReportRepository.Report? = null,
    val branchLabel: String = "Main Branch",
    val canReadReport: Boolean = true,
    val accessDeniedReason: String? = null,
    val isLoading: Boolean = true
)

class ReportViewModel(
    private val reportRepository: ReportRepository,
    private val contextFlow: StateFlow<OperatingContext>
) : ViewModel() {

    constructor(
        reportRepository: ReportRepository,
        businessId: String
    ) : this(
        reportRepository = reportRepository,
        contextFlow = MutableStateFlow(defaultReportContext(businessId))
    )

    private val _uiState = MutableStateFlow(
        ReportUiState(
            activeContext = contextFlow.value,
            branchLabel = contextFlow.value.operatingLocationLabel,
            canReadReport = contextFlow.value.hasPermission(MobilePermission.REPORT_READ)
        )
    )
    val uiState: StateFlow<ReportUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            contextFlow.collect { ctx ->
                if (!ctx.hasPermission(MobilePermission.REPORT_READ)) {
                    // Immediately drop any cached report when switching to a role
                    // without REPORT_READ so financial figures cannot linger.
                    _uiState.value = ReportUiState(
                        activeContext = ctx,
                        range = _uiState.value.range,
                        report = null,
                        branchLabel = ctx.operatingLocationLabel,
                        canReadReport = false,
                        accessDeniedReason = "${ctx.role.title} does not have permission to view financial reports.",
                        isLoading = false
                    )
                } else {
                    // Clear previous business report immediately before loading new scope.
                    _uiState.value = _uiState.value.copy(
                        activeContext = ctx,
                        report = null,
                        branchLabel = ctx.operatingLocationLabel,
                        canReadReport = true,
                        accessDeniedReason = null,
                        isLoading = true
                    )
                    loadReportFor(ctx)
                }
            }
        }
    }

    fun setRange(range: ReportRange) {
        if (range == _uiState.value.range) return
        _uiState.value = _uiState.value.copy(range = range)
        refresh()
    }

    fun refresh() {
        val ctx = contextFlow.value
        if (!ctx.hasPermission(MobilePermission.REPORT_READ)) {
            _uiState.value = _uiState.value.copy(
                activeContext = ctx,
                report = null,
                canReadReport = false,
                isLoading = false
            )
            return
        }
        viewModelScope.launch {
            loadReportFor(ctx)
        }
    }

    private suspend fun loadReportFor(ctx: OperatingContext) {
        _uiState.value = _uiState.value.copy(
            activeContext = ctx,
            branchLabel = ctx.operatingLocationLabel,
            canReadReport = true,
            isLoading = true
        )
        val built = reportRepository.build(ctx.businessId, sinceIso(_uiState.value.range))
        // Guard against race if active business changed mid-query.
        if (contextFlow.value.businessId == ctx.businessId &&
            contextFlow.value.hasPermission(MobilePermission.REPORT_READ)
        ) {
            _uiState.value = _uiState.value.copy(report = built, isLoading = false)
        }
    }

    private companion object {
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
