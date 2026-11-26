package com.omix.aide.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.omix.aide.data.local.ApprovalRequestRecord
import com.omix.aide.data.local.AssignedTaskRecord
import com.omix.aide.data.local.GoodsReceiptRecord
import com.omix.aide.data.local.MobileShiftStatus
import com.omix.aide.data.local.OperationResult
import com.omix.aide.data.local.OperationsStore
import com.omix.aide.data.local.ShiftRecord
import com.omix.aide.data.local.StockCountRecord
import com.omix.aide.data.local.converters.asMoney
import com.omix.aide.data.local.converters.toScaledMoney
import com.omix.aide.data.local.entities.ProductEntity
import com.omix.aide.data.repository.ProductRepository
import com.omix.aide.data.repository.SaleRepository
import com.omix.aide.domain.ia.EmployeeRole
import com.omix.aide.domain.ia.MobilePermission
import com.omix.aide.domain.ia.OperatingContext
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

data class OperationsUiState(
    val activeContext: OperatingContext,
    val products: List<ProductEntity> = emptyList(),
    val lookupQuery: String = "",
    val openShift: ShiftRecord? = null,
    val shiftHistory: List<ShiftRecord> = emptyList(),
    val currentShiftCashSales: Double = 0.0,
    val currentShiftTotalSales: Double = 0.0,
    val currentShiftSalesCount: Int = 0,
    val goodsReceipts: List<GoodsReceiptRecord> = emptyList(),
    val stockCounts: List<StockCountRecord> = emptyList(),
    val roleTasks: List<AssignedTaskRecord> = emptyList(),
    val approvals: List<ApprovalRequestRecord> = emptyList(),
    val feedbackMessage: String? = null,
    val errorMessage: String? = null
) {
    val filteredProducts: List<ProductEntity>
        get() = if (lookupQuery.isBlank()) products else products.filter {
            it.name.contains(lookupQuery, ignoreCase = true) ||
                (it.sku?.contains(lookupQuery, ignoreCase = true) == true)
        }
}

@OptIn(ExperimentalCoroutinesApi::class)
class OperationsViewModel(
    private val productRepository: ProductRepository,
    private val saleRepository: SaleRepository,
    private val operationsStore: OperationsStore,
    private val contextFlow: StateFlow<OperatingContext>,
    private val membershipsCountProvider: () -> Int = { 1 }
) : ViewModel() {

    private val _lookupQuery = MutableStateFlow("")
    private val _feedback = MutableStateFlow<String?>(null)
    private val _error = MutableStateFlow<String?>(null)
    private var lastBusinessId: String = contextFlow.value.businessId

    init {
        viewModelScope.launch {
            contextFlow.collect { ctx ->
                if (ctx.businessId != lastBusinessId || ctx.isRevoked) {
                    lastBusinessId = ctx.businessId
                    _lookupQuery.value = ""
                    _feedback.value = null
                    _error.value = null
                }
            }
        }
    }

    val uiState: StateFlow<OperationsUiState> = contextFlow.flatMapLatest { ctx ->
        val productsFlow = if (ctx.hasPermission(MobilePermission.PRODUCT_READ)) {
            productRepository.getProducts(ctx.businessId)
        } else {
            flowOf(emptyList())
        }
        val salesFlow = if (ctx.hasAnyPermission(
                MobilePermission.SALE_READ,
                MobilePermission.SHIFT_OPEN,
                MobilePermission.SHIFT_CLOSE,
                MobilePermission.SHIFT_MANAGE
            )
        ) {
            saleRepository.getSales(ctx.businessId)
        } else {
            flowOf(emptyList())
        }
        val opsFlow = operationsStore.observeBusinessOperations(ctx.businessId, ctx.branchName)
        val messagesFlow = combine(_lookupQuery, _feedback, _error) { q, f, e -> Triple(q, f, e) }

        combine(productsFlow, salesFlow, opsFlow, messagesFlow) { products, sales, ops, msgs ->
            val openShift = ops.shifts.firstOrNull { it.status == MobileShiftStatus.OPEN }
            val shiftSales = if (openShift != null) {
                sales.filter { it.sale.createdAt >= openShift.openedAt }
            } else {
                emptyList()
            }
            val cashSales = shiftSales
                .filter { it.sale.paymentMethod == "CASH" }
                .sumOf { it.sale.total.asMoney() }

            val visibleApprovals = if (ctx.hasPermission(MobilePermission.APPROVAL_DECIDE)) {
                ops.approvals
            } else {
                ops.approvals.filter { it.requestedByMembershipId == ctx.membershipId }
            }

            OperationsUiState(
                activeContext = ctx,
                products = products,
                lookupQuery = msgs.first,
                openShift = openShift,
                shiftHistory = ops.shifts,
                currentShiftCashSales = cashSales,
                currentShiftTotalSales = shiftSales.sumOf { it.sale.total.asMoney() },
                currentShiftSalesCount = shiftSales.size,
                goodsReceipts = ops.goodsReceipts,
                stockCounts = ops.stockCounts,
                roleTasks = ops.tasks.filter { ctx.role in it.assignedRoles },
                approvals = visibleApprovals,
                feedbackMessage = msgs.second,
                errorMessage = msgs.third
            )
        }
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = OperationsUiState(activeContext = contextFlow.value)
    )

    fun setLookupQuery(query: String) {
        _lookupQuery.value = query
    }

    fun clearMessages() {
        _feedback.value = null
        _error.value = null
    }

    fun openShift(openingFloat: Double, notes: String? = null) {
        clearMessages()
        when (val res = operationsStore.openShift(contextFlow.value, openingFloat, notes)) {
            is OperationResult.Success ->
                _feedback.value = "Opened shift ${res.data.shiftNo} on ${res.data.terminalName}."
            is OperationResult.Denied -> _error.value = res.reason
            is OperationResult.ValidationError -> _error.value = res.message
        }
    }

    fun closeShift(countedCash: Double, notes: String? = null) {
        clearMessages()
        val open = uiState.value.openShift
        if (open == null) {
            _error.value = "No active shift to close."
            return
        }
        val cashSales = uiState.value.currentShiftCashSales
        when (val res = operationsStore.closeShift(contextFlow.value, open.id, countedCash, cashSales, notes)) {
            is OperationResult.Success ->
                _feedback.value = "Closed shift ${res.data.shiftNo}. Variance: %.2f".format(res.data.cashVariance ?: 0.0)
            is OperationResult.Denied -> _error.value = res.reason
            is OperationResult.ValidationError -> _error.value = res.message
        }
    }

    fun receiveGoods(
        product: ProductEntity,
        supplierName: String,
        referenceNumber: String,
        quantityReceived: Int,
        unitCost: Double,
        notes: String? = null
    ) {
        clearMessages()
        val ctx = contextFlow.value
        if (product.businessId != ctx.businessId) {
            _error.value = "Product does not belong to active branch."
            return
        }
        val result = operationsStore.recordGoodsReceipt(
            context = ctx,
            productId = product.id,
            productName = product.name,
            sku = product.sku,
            supplierName = supplierName,
            referenceNumber = referenceNumber,
            quantityReceived = quantityReceived,
            unitCost = unitCost,
            notes = notes
        )
        when (result) {
            is OperationResult.Success -> {
                viewModelScope.launch {
                    val updated = product.copy(
                        quantity = product.quantity + quantityReceived,
                        buyingPrice = if (unitCost > 0.0) unitCost.toScaledMoney() else product.buyingPrice,
                        updatedAt = nowUtcIso()
                    )
                    productRepository.addOrUpdateProduct(updated)
                    _feedback.value = "Recorded ${result.data.grnNumber}: +$quantityReceived ${product.name}."
                }
            }
            is OperationResult.Denied -> _error.value = result.reason
            is OperationResult.ValidationError -> _error.value = result.message
        }
    }

    fun submitStockCount(
        product: ProductEntity,
        countedQuantity: Int,
        reason: String,
        notes: String? = null
    ) {
        clearMessages()
        val ctx = contextFlow.value
        if (product.businessId != ctx.businessId) {
            _error.value = "Product does not belong to active branch."
            return
        }
        val result = operationsStore.recordStockCount(
            context = ctx,
            productId = product.id,
            productName = product.name,
            sku = product.sku,
            systemQuantity = product.quantity,
            countedQuantity = countedQuantity,
            reason = reason,
            notes = notes
        )
        when (result) {
            is OperationResult.Success -> {
                val record = result.data
                viewModelScope.launch {
                    if (record.appliedToStock && record.variance != 0) {
                        productRepository.addOrUpdateProduct(
                            product.copy(
                                quantity = countedQuantity,
                                updatedAt = nowUtcIso()
                            )
                        )
                        _feedback.value =
                            "Saved ${record.countNumber}: stock updated to $countedQuantity (variance ${formatSigned(record.variance)})."
                    } else if (!record.appliedToStock && record.variance != 0) {
                        // Warehouse operator found a variance but lacks direct write-off permission:
                        // automatically queue a variance approval request so nothing is lost.
                        val varianceCost = kotlin.math.abs(record.variance) * product.buyingPrice.asMoney()
                        operationsStore.submitApprovalRequest(
                            context = ctx,
                            actionType = "STOCK_VARIANCE",
                            title = "Stock variance on ${product.name} (${formatSigned(record.variance)} units)",
                            reason = "Count ${record.countNumber} ($reason): system ${product.quantity}, counted $countedQuantity.",
                            amount = varianceCost
                        )
                        _feedback.value =
                            "Logged ${record.countNumber} and submitted variance (${formatSigned(record.variance)}) for manager approval."
                    } else {
                        _feedback.value = "Verified ${record.countNumber}: ${product.name} matches system stock ($countedQuantity)."
                    }
                }
            }
            is OperationResult.Denied -> _error.value = result.reason
            is OperationResult.ValidationError -> _error.value = result.message
        }
    }

    fun setTaskCompleted(taskId: String, completed: Boolean) {
        clearMessages()
        when (val res = operationsStore.setTaskCompleted(contextFlow.value, taskId, completed)) {
            is OperationResult.Success -> Unit
            is OperationResult.Denied -> _error.value = res.reason
            is OperationResult.ValidationError -> _error.value = res.message
        }
    }

    fun requestApproval(
        actionType: String,
        title: String,
        reason: String,
        amount: Double
    ) {
        clearMessages()
        when (val res = operationsStore.submitApprovalRequest(contextFlow.value, actionType, title, reason, amount)) {
            is OperationResult.Success ->
                _feedback.value = "Submitted ${res.data.requestNo} for manager review."
            is OperationResult.Denied -> _error.value = res.reason
            is OperationResult.ValidationError -> _error.value = res.message
        }
    }

    fun decideApproval(requestId: String, approve: Boolean, comment: String? = null) {
        clearMessages()
        val ctx = contextFlow.value
        val enforceSeparation = membershipsCountProvider() > 1 || ctx.role != EmployeeRole.OWNER_ADMIN
        when (
            val res = operationsStore.decideApprovalRequest(
                context = ctx,
                requestId = requestId,
                approve = approve,
                comment = comment,
                requireSeparationOfDuties = enforceSeparation
            )
        ) {
            is OperationResult.Success ->
                _feedback.value = "${res.data.requestNo} ${if (approve) "approved" else "rejected"}."
            is OperationResult.Denied -> _error.value = res.reason
            is OperationResult.ValidationError -> _error.value = res.message
        }
    }

    private fun formatSigned(value: Int): String = if (value > 0) "+$value" else value.toString()

    private fun nowUtcIso(): String =
        SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
            timeZone = TimeZone.getTimeZone("UTC")
        }.format(Date())
}
