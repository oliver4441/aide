package com.omix.aide.data.repository

import com.omix.aide.data.local.dao.SupplierDao
import com.omix.aide.data.local.entities.PurchaseOrderEntity
import com.omix.aide.data.local.entities.SupplierEntity
import kotlinx.coroutines.flow.Flow
import java.util.UUID

class SupplierRepository(
    private val supplierDao: SupplierDao
) {
    fun getSuppliers(businessId: String): Flow<List<SupplierEntity>> =
        supplierDao.getSuppliers(businessId)

    fun getPurchaseOrders(businessId: String): Flow<List<PurchaseOrderEntity>> =
        supplierDao.getPurchaseOrders(businessId)

    suspend fun addSupplier(
        businessId: String,
        name: String,
        phone: String? = null,
        email: String? = null,
        address: String? = null
    ) {
        if (name.isBlank()) return
        val supplier = SupplierEntity(
            id = UUID.randomUUID().toString(),
            businessId = businessId,
            name = name.trim(),
            phone = phone?.takeIf { it.isNotBlank() },
            email = email?.takeIf { it.isNotBlank() },
            address = address?.takeIf { it.isNotBlank() },
            balance = 0.0,
            createdAt = nowIso()
        )
        supplierDao.insertOrUpdate(supplier)
    }

    suspend fun createPurchaseOrder(
        businessId: String,
        supplierId: String,
        supplierName: String,
        totalAmount: Double,
        notes: String? = null
    ) {
        if (totalAmount <= 0.0) return
        val po = PurchaseOrderEntity(
            id = UUID.randomUUID().toString(),
            businessId = businessId,
            supplierId = supplierId,
            supplierName = supplierName,
            totalAmount = totalAmount,
            status = "PENDING",
            notes = notes,
            createdAt = nowIso()
        )
        supplierDao.insertPO(po)
    }

    suspend fun deleteSupplier(id: String) = supplierDao.deleteById(id)
}
