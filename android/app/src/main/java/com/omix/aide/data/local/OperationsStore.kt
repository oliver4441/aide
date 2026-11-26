package com.omix.aide.data.local

import android.content.Context
import com.omix.aide.domain.ia.EmployeeRole
import com.omix.aide.domain.ia.MobilePermission
import com.omix.aide.domain.ia.OperatingContext
import com.omix.aide.domain.ia.OperationAuthResult
import com.omix.aide.domain.ia.RoleNavigationResolver
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.UUID
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.map
import org.json.JSONArray
import org.json.JSONObject

enum class MobileShiftStatus { OPEN, CLOSED }

data class ShiftRecord(
    val id: String,
    val shiftNo: String,
    val businessId: String,
    val branchName: String,
    val terminalName: String,
    val openedByName: String,
    val openedByRole: EmployeeRole,
    val status: MobileShiftStatus,
    val openedAt: String,
    val closedAt: String? = null,
    val openingFloat: Double,
    val closingCashCounted: Double? = null,
    val expectedCash: Double? = null,
    val cashVariance: Double? = null,
    val notes: String? = null
)

data class GoodsReceiptRecord(
    val id: String,
    val grnNumber: String,
    val businessId: String,
    val branchName: String,
    val warehouseName: String,
    val productId: String,
    val productName: String,
    val sku: String?,
    val supplierName: String,
    val referenceNumber: String,
    val quantityReceived: Int,
    val unitCost: Double,
    val receivedByRole: EmployeeRole,
    val notes: String? = null,
    val createdAt: String
)

data class StockCountRecord(
    val id: String,
    val countNumber: String,
    val businessId: String,
    val branchName: String,
    val warehouseName: String,
    val productId: String,
    val productName: String,
    val sku: String?,
    val systemQuantity: Int,
    val countedQuantity: Int,
    val variance: Int,
    val reason: String,
    val appliedToStock: Boolean,
    val countedByRole: EmployeeRole,
    val notes: String? = null,
    val createdAt: String
)

enum class TaskPriority(val label: String) {
    HIGH("High priority"),
    NORMAL("Routine")
}

data class AssignedTaskRecord(
    val id: String,
    val businessId: String,
    val branchName: String,
    val title: String,
    val description: String,
    val targetRoute: String,
    val assignedRoles: Set<EmployeeRole>,
    val priority: TaskPriority = TaskPriority.NORMAL,
    val dueLabel: String = "Today",
    val completed: Boolean = false,
    val completedByRole: EmployeeRole? = null,
    val completedAt: String? = null
)

enum class MobileApprovalStatus { PENDING, APPROVED, REJECTED }

data class ApprovalRequestRecord(
    val id: String,
    val requestNo: String,
    val businessId: String,
    val branchName: String,
    val locationLabel: String,
    val actionType: String,
    val title: String,
    val reason: String,
    val amount: Double,
    val requestedByMembershipId: String,
    val requestedByName: String,
    val requestedByRole: EmployeeRole,
    val status: MobileApprovalStatus = MobileApprovalStatus.PENDING,
    val decidedByMembershipId: String? = null,
    val decidedByRole: EmployeeRole? = null,
    val decisionComment: String? = null,
    val createdAt: String,
    val decidedAt: String? = null
)

data class BusinessOperationsSnapshot(
    val shifts: List<ShiftRecord> = emptyList(),
    val goodsReceipts: List<GoodsReceiptRecord> = emptyList(),
    val stockCounts: List<StockCountRecord> = emptyList(),
    val tasks: List<AssignedTaskRecord> = emptyList(),
    val approvals: List<ApprovalRequestRecord> = emptyList()
)

sealed class OperationResult<out T> {
    data class Success<T>(val data: T) : OperationResult<T>()
    data class Denied(val reason: String) : OperationResult<Nothing>()
    data class ValidationError(val message: String) : OperationResult<Nothing>()
}

/**
 * Tenant-scoped local operational ledger for cashier shifts, goods receiving
 * notes (GRNs), physical stock counts, daily role tasks, and approval requests.
 *
 * Every read and write is strictly partitioned by `businessId` so switching
 * membership context never leaks operational records across businesses.
 */
class OperationsStore(
    private val storage: KeyValueStorage
) {
    private val _shifts = MutableStateFlow(loadShifts())
    private val _receipts = MutableStateFlow(loadReceipts())
    private val _counts = MutableStateFlow(loadCounts())
    private val _tasks = MutableStateFlow(loadTasks())
    private val _approvals = MutableStateFlow(loadApprovals())

    fun observeBusinessOperations(
        businessId: String,
        branchName: String = "Main Branch"
    ): Flow<BusinessOperationsSnapshot> {
        ensureSeededTasks(businessId, branchName)
        return kotlinx.coroutines.flow.combine(
            _shifts,
            _receipts,
            _counts,
            _tasks,
            _approvals
        ) { shifts, receipts, counts, tasks, approvals ->
            BusinessOperationsSnapshot(
                shifts = shifts.filter { it.businessId == businessId },
                goodsReceipts = receipts.filter { it.businessId == businessId },
                stockCounts = counts.filter { it.businessId == businessId },
                tasks = tasks.filter { it.businessId == businessId },
                approvals = approvals.filter { it.businessId == businessId }
            )
        }
    }

    fun getSnapshot(businessId: String, branchName: String = "Main Branch"): BusinessOperationsSnapshot {
        ensureSeededTasks(businessId, branchName)
        return BusinessOperationsSnapshot(
            shifts = _shifts.value.filter { it.businessId == businessId },
            goodsReceipts = _receipts.value.filter { it.businessId == businessId },
            stockCounts = _counts.value.filter { it.businessId == businessId },
            tasks = _tasks.value.filter { it.businessId == businessId },
            approvals = _approvals.value.filter { it.businessId == businessId }
        )
    }

    fun openShift(
        context: OperatingContext,
        openingFloat: Double,
        notes: String? = null
    ): OperationResult<ShiftRecord> {
        val auth = RoleNavigationResolver.authorizeOperation(context, MobilePermission.SHIFT_OPEN)
        if (!auth.allowed) return OperationResult.Denied(auth.reason ?: "Not authorized to open shift")
        if (openingFloat < 0.0) {
            return OperationResult.ValidationError("Opening cash float cannot be negative.")
        }

        val existingOpen = _shifts.value.firstOrNull {
            it.businessId == context.businessId && it.status == MobileShiftStatus.OPEN
        }
        if (existingOpen != null) {
            return OperationResult.ValidationError(
                "Shift ${existingOpen.shiftNo} on ${existingOpen.terminalName} is already open."
            )
        }

        val seq = _shifts.value.count { it.businessId == context.businessId } + 1
        val record = ShiftRecord(
            id = UUID.randomUUID().toString(),
            shiftNo = "SH-${currentYear()}-${seq.toString().padStart(4, '0')}",
            businessId = context.businessId,
            branchName = context.branchName,
            terminalName = context.terminalName?.takeIf { it.isNotBlank() } ?: "Till 01",
            openedByName = context.employeeName,
            openedByRole = context.role,
            status = MobileShiftStatus.OPEN,
            openedAt = utcIsoNow(),
            openingFloat = openingFloat,
            notes = notes?.trim()?.takeIf { it.isNotEmpty() }
        )
        val next = listOf(record) + _shifts.value
        _shifts.value = next
        saveShifts(next)
        return OperationResult.Success(record)
    }

    fun closeShift(
        context: OperatingContext,
        shiftId: String,
        countedCash: Double,
        cashSalesDuringShift: Double,
        notes: String? = null
    ): OperationResult<ShiftRecord> {
        val auth = RoleNavigationResolver.authorizeOperation(context, MobilePermission.SHIFT_CLOSE)
        if (!auth.allowed) return OperationResult.Denied(auth.reason ?: "Not authorized to close shift")
        if (countedCash < 0.0) {
            return OperationResult.ValidationError("Counted cash cannot be negative.")
        }

        val existing = _shifts.value.firstOrNull {
            it.id == shiftId && it.businessId == context.businessId
        } ?: return OperationResult.ValidationError("Active shift not found for this branch.")

        if (existing.status == MobileShiftStatus.CLOSED) {
            return OperationResult.ValidationError("Shift ${existing.shiftNo} is already closed.")
        }

        val expected = existing.openingFloat + cashSalesDuringShift.coerceAtLeast(0.0)
        val variance = countedCash - expected
        val closed = existing.copy(
            status = MobileShiftStatus.CLOSED,
            closedAt = utcIsoNow(),
            closingCashCounted = countedCash,
            expectedCash = expected,
            cashVariance = variance,
            notes = notes?.trim()?.takeIf { it.isNotEmpty() } ?: existing.notes
        )
        val next = _shifts.value.map { if (it.id == shiftId) closed else it }
        _shifts.value = next
        saveShifts(next)
        return OperationResult.Success(closed)
    }

    fun recordGoodsReceipt(
        context: OperatingContext,
        productId: String,
        productName: String,
        sku: String?,
        supplierName: String,
        referenceNumber: String,
        quantityReceived: Int,
        unitCost: Double,
        notes: String? = null
    ): OperationResult<GoodsReceiptRecord> {
        val auth = RoleNavigationResolver.authorizeOperation(context, MobilePermission.GOODS_RECEIVE)
        if (!auth.allowed) return OperationResult.Denied(auth.reason ?: "Not authorized to receive goods")
        if (productName.isBlank()) {
            return OperationResult.ValidationError("Select a product to receive.")
        }
        if (quantityReceived <= 0) {
            return OperationResult.ValidationError("Received quantity must be greater than zero.")
        }
        if (unitCost < 0.0) {
            return OperationResult.ValidationError("Unit cost cannot be negative.")
        }

        val seq = _receipts.value.count { it.businessId == context.businessId } + 1
        val grn = GoodsReceiptRecord(
            id = UUID.randomUUID().toString(),
            grnNumber = "GRN-${currentYear()}-${seq.toString().padStart(4, '0')}",
            businessId = context.businessId,
            branchName = context.branchName,
            warehouseName = context.warehouseName?.takeIf { it.isNotBlank() } ?: "Main Stockroom",
            productId = productId,
            productName = productName.trim(),
            sku = sku?.trim()?.takeIf { it.isNotEmpty() },
            supplierName = supplierName.trim().ifBlank { "General Supplier" },
            referenceNumber = referenceNumber.trim().ifBlank { "DELIVERY-$seq" },
            quantityReceived = quantityReceived,
            unitCost = unitCost,
            receivedByRole = context.role,
            notes = notes?.trim()?.takeIf { it.isNotEmpty() },
            createdAt = utcIsoNow()
        )
        val next = listOf(grn) + _receipts.value
        _receipts.value = next
        saveReceipts(next)
        return OperationResult.Success(grn)
    }

    fun recordStockCount(
        context: OperatingContext,
        productId: String,
        productName: String,
        sku: String?,
        systemQuantity: Int,
        countedQuantity: Int,
        reason: String,
        notes: String? = null
    ): OperationResult<StockCountRecord> {
        val canCount = context.hasAnyPermission(
            MobilePermission.STOCK_COUNT_PERFORM,
            MobilePermission.STOCK_ADJUST_CREATE
        )
        if (!canCount || context.isRevoked) {
            return OperationResult.Denied("${context.role.title} is not authorized to perform stock counts.")
        }
        if (countedQuantity < 0) {
            return OperationResult.ValidationError("Counted stock cannot be negative.")
        }

        val variance = countedQuantity - systemQuantity
        val canApplyDirectly = variance == 0 || context.hasPermission(MobilePermission.STOCK_ADJUST_CREATE)
        val seq = _counts.value.count { it.businessId == context.businessId } + 1
        val countRecord = StockCountRecord(
            id = UUID.randomUUID().toString(),
            countNumber = "CNT-${currentYear()}-${seq.toString().padStart(4, '0')}",
            businessId = context.businessId,
            branchName = context.branchName,
            warehouseName = context.warehouseName?.takeIf { it.isNotBlank() } ?: "Main Stockroom",
            productId = productId,
            productName = productName.trim(),
            sku = sku?.trim()?.takeIf { it.isNotEmpty() },
            systemQuantity = systemQuantity,
            countedQuantity = countedQuantity,
            variance = variance,
            reason = reason.trim().ifBlank { "CYCLE_COUNT" },
            appliedToStock = canApplyDirectly,
            countedByRole = context.role,
            notes = notes?.trim()?.takeIf { it.isNotEmpty() },
            createdAt = utcIsoNow()
        )
        val next = listOf(countRecord) + _counts.value
        _counts.value = next
        saveCounts(next)
        return OperationResult.Success(countRecord)
    }

    fun setTaskCompleted(
        context: OperatingContext,
        taskId: String,
        completed: Boolean
    ): OperationResult<AssignedTaskRecord> {
        val auth = RoleNavigationResolver.authorizeOperation(context, MobilePermission.TASK_COMPLETE)
        if (!auth.allowed) return OperationResult.Denied(auth.reason ?: "Not authorized to update tasks")

        val existing = _tasks.value.firstOrNull {
            it.id == taskId && it.businessId == context.businessId
        } ?: return OperationResult.ValidationError("Task not found in active workspace.")

        val updated = existing.copy(
            completed = completed,
            completedByRole = if (completed) context.role else null,
            completedAt = if (completed) utcIsoNow() else null
        )
        val next = _tasks.value.map { if (it.id == taskId) updated else it }
        _tasks.value = next
        saveTasks(next)
        return OperationResult.Success(updated)
    }

    fun submitApprovalRequest(
        context: OperatingContext,
        actionType: String,
        title: String,
        reason: String,
        amount: Double = 0.0
    ): OperationResult<ApprovalRequestRecord> {
        val auth = RoleNavigationResolver.authorizeOperation(context, MobilePermission.APPROVAL_REQUEST)
        if (!auth.allowed) return OperationResult.Denied(auth.reason ?: "Not authorized to request approval")
        if (title.isBlank() || reason.isBlank()) {
            return OperationResult.ValidationError("Provide both a request summary and reason.")
        }
        if (amount < 0.0) {
            return OperationResult.ValidationError("Amount cannot be negative.")
        }

        val seq = _approvals.value.count { it.businessId == context.businessId } + 1
        val request = ApprovalRequestRecord(
            id = UUID.randomUUID().toString(),
            requestNo = "APR-${currentYear()}-${seq.toString().padStart(4, '0')}",
            businessId = context.businessId,
            branchName = context.branchName,
            locationLabel = context.operatingLocationLabel,
            actionType = actionType.trim().ifBlank { "GENERAL_OVERRIDE" },
            title = title.trim(),
            reason = reason.trim(),
            amount = amount,
            requestedByMembershipId = context.membershipId,
            requestedByName = context.employeeName,
            requestedByRole = context.role,
            status = MobileApprovalStatus.PENDING,
            createdAt = utcIsoNow()
        )
        val next = listOf(request) + _approvals.value
        _approvals.value = next
        saveApprovals(next)
        return OperationResult.Success(request)
    }

    fun decideApprovalRequest(
        context: OperatingContext,
        requestId: String,
        approve: Boolean,
        comment: String? = null,
        requireSeparationOfDuties: Boolean = true
    ): OperationResult<ApprovalRequestRecord> {
        val existing = _approvals.value.firstOrNull {
            it.id == requestId && it.businessId == context.businessId
        } ?: return OperationResult.ValidationError("Approval request not found in active workspace.")

        val auth: OperationAuthResult = RoleNavigationResolver.authorizeOperation(
            context = context,
            requiredPermission = MobilePermission.APPROVAL_DECIDE,
            targetBusinessId = existing.businessId,
            approvalRequestedByMembershipId = existing.requestedByMembershipId,
            requireSeparationOfDuties = requireSeparationOfDuties
        )
        if (!auth.allowed) return OperationResult.Denied(auth.reason ?: "Not authorized to decide approval")

        if (existing.status != MobileApprovalStatus.PENDING) {
            return OperationResult.ValidationError("Request ${existing.requestNo} has already been resolved.")
        }

        val updated = existing.copy(
            status = if (approve) MobileApprovalStatus.APPROVED else MobileApprovalStatus.REJECTED,
            decidedByMembershipId = context.membershipId,
            decidedByRole = context.role,
            decisionComment = comment?.trim()?.takeIf { it.isNotEmpty() },
            decidedAt = utcIsoNow()
        )
        val next = _approvals.value.map { if (it.id == requestId) updated else it }
        _approvals.value = next
        saveApprovals(next)
        return OperationResult.Success(updated)
    }

    private fun ensureSeededTasks(businessId: String, branchName: String) {
        if (businessId.isBlank()) return
        if (_tasks.value.any { it.businessId == businessId }) return

        val seeded = listOf(
            AssignedTaskRecord(
                id = "task-shift-$businessId",
                businessId = businessId,
                branchName = branchName,
                title = "Open cashier shift & verify till float",
                description = "Confirm opening cash in the assigned checkout lane before ringing up sales.",
                targetRoute = "shifts",
                assignedRoles = setOf(
                    EmployeeRole.CASHIER,
                    EmployeeRole.BRANCH_MANAGER,
                    EmployeeRole.OWNER_ADMIN
                ),
                priority = TaskPriority.HIGH,
                dueLabel = "Start of shift"
            ),
            AssignedTaskRecord(
                id = "task-receive-$businessId",
                businessId = businessId,
                branchName = branchName,
                title = "Verify inbound deliveries & record GRNs",
                description = "Match supplier delivery notes against SKUs and post received quantities.",
                targetRoute = "receive-goods",
                assignedRoles = setOf(
                    EmployeeRole.RECEIVING_CLERK,
                    EmployeeRole.WAREHOUSE_OPERATOR,
                    EmployeeRole.INVENTORY_CONTROLLER
                ),
                priority = TaskPriority.HIGH,
                dueLabel = "Morning dock"
            ),
            AssignedTaskRecord(
                id = "task-count-$businessId",
                businessId = businessId,
                branchName = branchName,
                title = "Complete daily cycle count on fast-moving items",
                description = "Count physical shelf/bin stock and flag any variances for reconciliation.",
                targetRoute = "stock-count",
                assignedRoles = setOf(
                    EmployeeRole.WAREHOUSE_OPERATOR,
                    EmployeeRole.INVENTORY_CONTROLLER,
                    EmployeeRole.BRANCH_MANAGER
                ),
                priority = TaskPriority.NORMAL,
                dueLabel = "Today"
            ),
            AssignedTaskRecord(
                id = "task-approvals-$businessId",
                businessId = businessId,
                branchName = branchName,
                title = "Review pending overrides & stock alerts",
                description = "Check staff discount, refund, or stock variance requests for this branch.",
                targetRoute = "approvals",
                assignedRoles = setOf(
                    EmployeeRole.OWNER_ADMIN,
                    EmployeeRole.BRANCH_MANAGER
                ),
                priority = TaskPriority.HIGH,
                dueLabel = "Daily review"
            ),
            AssignedTaskRecord(
                id = "task-finance-$businessId",
                businessId = businessId,
                branchName = branchName,
                title = "Reconcile daily revenue, overheads & receivables",
                description = "Verify VAT summary, recorded shop overheads, and outstanding customer balances.",
                targetRoute = "reports",
                assignedRoles = setOf(
                    EmployeeRole.ACCOUNTANT,
                    EmployeeRole.OWNER_ADMIN
                ),
                priority = TaskPriority.NORMAL,
                dueLabel = "End of day"
            )
        )
        val next = _tasks.value + seeded
        _tasks.value = next
        saveTasks(next)
    }

    private fun loadShifts(): List<ShiftRecord> {
        val raw = storage.getString(KEY_SHIFTS) ?: return emptyList()
        return runCatching {
            val arr = JSONArray(raw)
            buildList {
                for (i in 0 until arr.length()) {
                    val o = arr.optJSONObject(i) ?: continue
                    add(
                        ShiftRecord(
                            id = o.optString("id"),
                            shiftNo = o.optString("shiftNo"),
                            businessId = o.optString("businessId"),
                            branchName = o.optString("branchName", "Main Branch"),
                            terminalName = o.optString("terminalName", "Till 01"),
                            openedByName = o.optString("openedByName", "Cashier"),
                            openedByRole = EmployeeRole.fromKey(o.optString("openedByRole")),
                            status = if (o.optString("status") == "CLOSED") MobileShiftStatus.CLOSED else MobileShiftStatus.OPEN,
                            openedAt = o.optString("openedAt"),
                            closedAt = o.optString("closedAt").takeIf { it.isNotBlank() },
                            openingFloat = o.optDouble("openingFloat", 0.0),
                            closingCashCounted = if (o.has("closingCashCounted")) o.optDouble("closingCashCounted") else null,
                            expectedCash = if (o.has("expectedCash")) o.optDouble("expectedCash") else null,
                            cashVariance = if (o.has("cashVariance")) o.optDouble("cashVariance") else null,
                            notes = o.optString("notes").takeIf { it.isNotBlank() }
                        )
                    )
                }
            }
        }.getOrDefault(emptyList())
    }

    private fun saveShifts(items: List<ShiftRecord>) {
        val arr = JSONArray()
        items.forEach { s ->
            arr.put(
                JSONObject().apply {
                    put("id", s.id)
                    put("shiftNo", s.shiftNo)
                    put("businessId", s.businessId)
                    put("branchName", s.branchName)
                    put("terminalName", s.terminalName)
                    put("openedByName", s.openedByName)
                    put("openedByRole", s.openedByRole.name)
                    put("status", s.status.name)
                    put("openedAt", s.openedAt)
                    s.closedAt?.let { put("closedAt", it) }
                    put("openingFloat", s.openingFloat)
                    s.closingCashCounted?.let { put("closingCashCounted", it) }
                    s.expectedCash?.let { put("expectedCash", it) }
                    s.cashVariance?.let { put("cashVariance", it) }
                    s.notes?.let { put("notes", it) }
                }
            )
        }
        storage.putString(KEY_SHIFTS, arr.toString())
    }

    private fun loadReceipts(): List<GoodsReceiptRecord> {
        val raw = storage.getString(KEY_RECEIPTS) ?: return emptyList()
        return runCatching {
            val arr = JSONArray(raw)
            buildList {
                for (i in 0 until arr.length()) {
                    val o = arr.optJSONObject(i) ?: continue
                    add(
                        GoodsReceiptRecord(
                            id = o.optString("id"),
                            grnNumber = o.optString("grnNumber"),
                            businessId = o.optString("businessId"),
                            branchName = o.optString("branchName", "Main Branch"),
                            warehouseName = o.optString("warehouseName", "Main Stockroom"),
                            productId = o.optString("productId"),
                            productName = o.optString("productName"),
                            sku = o.optString("sku").takeIf { it.isNotBlank() },
                            supplierName = o.optString("supplierName", "Supplier"),
                            referenceNumber = o.optString("referenceNumber"),
                            quantityReceived = o.optInt("quantityReceived", 0),
                            unitCost = o.optDouble("unitCost", 0.0),
                            receivedByRole = EmployeeRole.fromKey(o.optString("receivedByRole")),
                            notes = o.optString("notes").takeIf { it.isNotBlank() },
                            createdAt = o.optString("createdAt")
                        )
                    )
                }
            }
        }.getOrDefault(emptyList())
    }

    private fun saveReceipts(items: List<GoodsReceiptRecord>) {
        val arr = JSONArray()
        items.forEach { r ->
            arr.put(
                JSONObject().apply {
                    put("id", r.id)
                    put("grnNumber", r.grnNumber)
                    put("businessId", r.businessId)
                    put("branchName", r.branchName)
                    put("warehouseName", r.warehouseName)
                    put("productId", r.productId)
                    put("productName", r.productName)
                    r.sku?.let { put("sku", it) }
                    put("supplierName", r.supplierName)
                    put("referenceNumber", r.referenceNumber)
                    put("quantityReceived", r.quantityReceived)
                    put("unitCost", r.unitCost)
                    put("receivedByRole", r.receivedByRole.name)
                    r.notes?.let { put("notes", it) }
                    put("createdAt", r.createdAt)
                }
            )
        }
        storage.putString(KEY_RECEIPTS, arr.toString())
    }

    private fun loadCounts(): List<StockCountRecord> {
        val raw = storage.getString(KEY_COUNTS) ?: return emptyList()
        return runCatching {
            val arr = JSONArray(raw)
            buildList {
                for (i in 0 until arr.length()) {
                    val o = arr.optJSONObject(i) ?: continue
                    add(
                        StockCountRecord(
                            id = o.optString("id"),
                            countNumber = o.optString("countNumber"),
                            businessId = o.optString("businessId"),
                            branchName = o.optString("branchName", "Main Branch"),
                            warehouseName = o.optString("warehouseName", "Main Stockroom"),
                            productId = o.optString("productId"),
                            productName = o.optString("productName"),
                            sku = o.optString("sku").takeIf { it.isNotBlank() },
                            systemQuantity = o.optInt("systemQuantity", 0),
                            countedQuantity = o.optInt("countedQuantity", 0),
                            variance = o.optInt("variance", 0),
                            reason = o.optString("reason", "CYCLE_COUNT"),
                            appliedToStock = o.optBoolean("appliedToStock", false),
                            countedByRole = EmployeeRole.fromKey(o.optString("countedByRole")),
                            notes = o.optString("notes").takeIf { it.isNotBlank() },
                            createdAt = o.optString("createdAt")
                        )
                    )
                }
            }
        }.getOrDefault(emptyList())
    }

    private fun saveCounts(items: List<StockCountRecord>) {
        val arr = JSONArray()
        items.forEach { c ->
            arr.put(
                JSONObject().apply {
                    put("id", c.id)
                    put("countNumber", c.countNumber)
                    put("businessId", c.businessId)
                    put("branchName", c.branchName)
                    put("warehouseName", c.warehouseName)
                    put("productId", c.productId)
                    put("productName", c.productName)
                    c.sku?.let { put("sku", it) }
                    put("systemQuantity", c.systemQuantity)
                    put("countedQuantity", c.countedQuantity)
                    put("variance", c.variance)
                    put("reason", c.reason)
                    put("appliedToStock", c.appliedToStock)
                    put("countedByRole", c.countedByRole.name)
                    c.notes?.let { put("notes", it) }
                    put("createdAt", c.createdAt)
                }
            )
        }
        storage.putString(KEY_COUNTS, arr.toString())
    }

    private fun loadTasks(): List<AssignedTaskRecord> {
        val raw = storage.getString(KEY_TASKS) ?: return emptyList()
        return runCatching {
            val arr = JSONArray(raw)
            buildList {
                for (i in 0 until arr.length()) {
                    val o = arr.optJSONObject(i) ?: continue
                    val rolesArr = o.optJSONArray("assignedRoles")
                    val roles = buildSet {
                        if (rolesArr != null) {
                            for (r in 0 until rolesArr.length()) {
                                add(EmployeeRole.fromKey(rolesArr.optString(r)))
                            }
                        }
                    }
                    add(
                        AssignedTaskRecord(
                            id = o.optString("id"),
                            businessId = o.optString("businessId"),
                            branchName = o.optString("branchName", "Main Branch"),
                            title = o.optString("title"),
                            description = o.optString("description"),
                            targetRoute = o.optString("targetRoute", "home"),
                            assignedRoles = roles,
                            priority = if (o.optString("priority") == "HIGH") TaskPriority.HIGH else TaskPriority.NORMAL,
                            dueLabel = o.optString("dueLabel", "Today"),
                            completed = o.optBoolean("completed", false),
                            completedByRole = o.optString("completedByRole")
                                .takeIf { it.isNotBlank() }?.let(EmployeeRole::fromKey),
                            completedAt = o.optString("completedAt").takeIf { it.isNotBlank() }
                        )
                    )
                }
            }
        }.getOrDefault(emptyList())
    }

    private fun saveTasks(items: List<AssignedTaskRecord>) {
        val arr = JSONArray()
        items.forEach { t ->
            val roles = JSONArray().apply { t.assignedRoles.forEach { put(it.name) } }
            arr.put(
                JSONObject().apply {
                    put("id", t.id)
                    put("businessId", t.businessId)
                    put("branchName", t.branchName)
                    put("title", t.title)
                    put("description", t.description)
                    put("targetRoute", t.targetRoute)
                    put("assignedRoles", roles)
                    put("priority", t.priority.name)
                    put("dueLabel", t.dueLabel)
                    put("completed", t.completed)
                    t.completedByRole?.let { put("completedByRole", it.name) }
                    t.completedAt?.let { put("completedAt", it) }
                }
            )
        }
        storage.putString(KEY_TASKS, arr.toString())
    }

    private fun loadApprovals(): List<ApprovalRequestRecord> {
        val raw = storage.getString(KEY_APPROVALS) ?: return emptyList()
        return runCatching {
            val arr = JSONArray(raw)
            buildList {
                for (i in 0 until arr.length()) {
                    val o = arr.optJSONObject(i) ?: continue
                    val status = when (o.optString("status")) {
                        "APPROVED" -> MobileApprovalStatus.APPROVED
                        "REJECTED" -> MobileApprovalStatus.REJECTED
                        else -> MobileApprovalStatus.PENDING
                    }
                    add(
                        ApprovalRequestRecord(
                            id = o.optString("id"),
                            requestNo = o.optString("requestNo"),
                            businessId = o.optString("businessId"),
                            branchName = o.optString("branchName", "Main Branch"),
                            locationLabel = o.optString("locationLabel", "Main Branch"),
                            actionType = o.optString("actionType", "OVERRIDE"),
                            title = o.optString("title"),
                            reason = o.optString("reason"),
                            amount = o.optDouble("amount", 0.0),
                            requestedByMembershipId = o.optString("requestedByMembershipId"),
                            requestedByName = o.optString("requestedByName", "Staff"),
                            requestedByRole = EmployeeRole.fromKey(o.optString("requestedByRole")),
                            status = status,
                            decidedByMembershipId = o.optString("decidedByMembershipId").takeIf { it.isNotBlank() },
                            decidedByRole = o.optString("decidedByRole")
                                .takeIf { it.isNotBlank() }?.let(EmployeeRole::fromKey),
                            decisionComment = o.optString("decisionComment").takeIf { it.isNotBlank() },
                            createdAt = o.optString("createdAt"),
                            decidedAt = o.optString("decidedAt").takeIf { it.isNotBlank() }
                        )
                    )
                }
            }
        }.getOrDefault(emptyList())
    }

    private fun saveApprovals(items: List<ApprovalRequestRecord>) {
        val arr = JSONArray()
        items.forEach { a ->
            arr.put(
                JSONObject().apply {
                    put("id", a.id)
                    put("requestNo", a.requestNo)
                    put("businessId", a.businessId)
                    put("branchName", a.branchName)
                    put("locationLabel", a.locationLabel)
                    put("actionType", a.actionType)
                    put("title", a.title)
                    put("reason", a.reason)
                    put("amount", a.amount)
                    put("requestedByMembershipId", a.requestedByMembershipId)
                    put("requestedByName", a.requestedByName)
                    put("requestedByRole", a.requestedByRole.name)
                    put("status", a.status.name)
                    a.decidedByMembershipId?.let { put("decidedByMembershipId", it) }
                    a.decidedByRole?.let { put("decidedByRole", it.name) }
                    a.decisionComment?.let { put("decisionComment", it) }
                    put("createdAt", a.createdAt)
                    a.decidedAt?.let { put("decidedAt", it) }
                }
            )
        }
        storage.putString(KEY_APPROVALS, arr.toString())
    }

    private fun currentYear(): Int =
        Calendar.getInstance(TimeZone.getTimeZone("UTC")).get(Calendar.YEAR)

    private fun utcIsoNow(): String =
        SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
            timeZone = TimeZone.getTimeZone("UTC")
        }.format(Date())

    companion object {
        private const val PREFS_NAME = "aide_operations_ledger"
        private const val KEY_SHIFTS = "shifts_json"
        private const val KEY_RECEIPTS = "goods_receipts_json"
        private const val KEY_COUNTS = "stock_counts_json"
        private const val KEY_TASKS = "assigned_tasks_json"
        private const val KEY_APPROVALS = "approvals_json"

        fun create(context: Context): OperationsStore =
            OperationsStore(SharedPreferencesKeyValueStorage(context.applicationContext, PREFS_NAME))
    }
}
