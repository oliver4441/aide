package com.omix.aide.data.repository

import com.omix.aide.data.local.dao.ShiftDao
import com.omix.aide.data.local.entities.CashierShiftEntity
import kotlinx.coroutines.flow.Flow
import java.util.UUID

class ShiftRepository(
    private val shiftDao: ShiftDao
) {
    fun getShifts(businessId: String): Flow<List<CashierShiftEntity>> =
        shiftDao.getShifts(businessId)

    suspend fun getActiveShift(businessId: String): CashierShiftEntity? =
        shiftDao.getActiveShift(businessId)

    suspend fun openShift(businessId: String, cashierName: String, startingFloat: Double) {
        val shift = CashierShiftEntity(
            id = UUID.randomUUID().toString(),
            businessId = businessId,
            cashierName = cashierName.ifBlank { "Cashier" },
            startingFloat = startingFloat,
            expectedCash = startingFloat,
            actualCash = 0.0,
            status = "OPEN",
            openedAt = nowIso(),
            closedAt = null
        )
        shiftDao.insertOrUpdate(shift)
    }

    suspend fun closeShift(businessId: String, shiftId: String, actualCash: Double) {
        val existing = shiftDao.getActiveShift(businessId) ?: return
        val updated = existing.copy(
            actualCash = actualCash,
            status = "CLOSED",
            closedAt = nowIso()
        )
        shiftDao.insertOrUpdate(updated)
    }
}
