package com.omix.aide.data.repository

import com.omix.aide.data.local.dao.QuotationDao
import com.omix.aide.data.local.entities.QuotationEntity
import kotlinx.coroutines.flow.Flow
import java.util.UUID

class QuotationRepository(
    private val quotationDao: QuotationDao
) {
    fun getQuotations(businessId: String): Flow<List<QuotationEntity>> =
        quotationDao.getQuotations(businessId)

    suspend fun createQuotation(businessId: String, customerName: String, totalAmount: Double) {
        if (totalAmount <= 0.0) return
        val quote = QuotationEntity(
            id = UUID.randomUUID().toString(),
            businessId = businessId,
            customerName = customerName.ifBlank { "Client" },
            totalAmount = totalAmount,
            status = "DRAFT",
            createdAt = nowIso()
        )
        quotationDao.insertOrUpdate(quote)
    }

    suspend fun deleteQuotation(id: String) = quotationDao.deleteById(id)
}
