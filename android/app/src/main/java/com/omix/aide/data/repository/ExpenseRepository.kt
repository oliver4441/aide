package com.omix.aide.data.repository

import com.omix.aide.data.local.dao.CategoryExpenseRow
import com.omix.aide.data.local.dao.CustomerDao
import com.omix.aide.data.local.dao.ExpenseDao
import com.omix.aide.data.local.dao.PaymentBreakdownRow
import com.omix.aide.data.local.dao.SaleDao
import com.omix.aide.data.local.dao.SalesTotalsRow
import com.omix.aide.data.local.dao.TopProductRow
import com.omix.aide.data.local.entities.CustomerEntity
import com.omix.aide.data.local.entities.CustomerPaymentEntity
import com.omix.aide.data.local.entities.ExpenseEntity
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.UUID
import kotlinx.coroutines.flow.Flow

class ExpenseRepository(
    private val expenseDao: ExpenseDao
) {

    fun getExpenses(businessId: String): Flow<List<ExpenseEntity>> =
        expenseDao.getExpenses(businessId)

    suspend fun addExpense(
        businessId: String,
        category: String,
        amount: Double,
        description: String? = null,
        notes: String? = null,
        isCogs: Boolean = false
    ) {
        if (amount <= 0.0) return
        expenseDao.insertOrUpdate(
            ExpenseEntity(
                id = UUID.randomUUID().toString(),
                businessId = businessId,
                category = category.ifBlank { "Other" },
                description = description?.takeIf { it.isNotBlank() },
                amount = amount,
                isCogs = isCogs,
                notes = notes?.takeIf { it.isNotBlank() },
                createdAt = nowIso()
            )
        )
    }

    suspend fun deleteExpense(id: String) = expenseDao.deleteById(id)

    suspend fun getSince(businessId: String, sinceIso: String): List<ExpenseEntity> =
        expenseDao.getExpensesSince(businessId, sinceIso)

    suspend fun getOverheadsSince(businessId: String, sinceIso: String): Double =
        expenseDao.getOverheadsSince(businessId, sinceIso)

    suspend fun getCategoryTotalsSince(
        businessId: String,
        sinceIso: String
    ): List<CategoryExpenseRow> =
        expenseDao.getCategoryTotalsSince(businessId, sinceIso)
}

/** The local customer directory, debt tracking and repayments. */
class CustomerRepository(
    private val customerDao: CustomerDao
) {

    fun getCustomers(businessId: String): Flow<List<CustomerEntity>> =
        customerDao.getCustomers(businessId)

    fun getPayments(customerId: String): Flow<List<CustomerPaymentEntity>> =
        customerDao.getPaymentsByCustomer(customerId)

    suspend fun addCustomer(
        businessId: String,
        name: String,
        phone: String? = null,
        email: String? = null,
        notes: String? = null
    ) {
        if (name.isBlank()) return
        val timestamp = nowIso()
        customerDao.insertOrUpdate(
            CustomerEntity(
                id = UUID.randomUUID().toString(),
                businessId = businessId,
                name = name.trim(),
                phone = phone?.takeIf { it.isNotBlank() },
                email = email?.takeIf { it.isNotBlank() },
                notes = notes?.takeIf { it.isNotBlank() },
                balance = 0.0,
                isActive = true,
                createdAt = timestamp,
                updatedAt = timestamp
            )
        )
    }

    suspend fun updateBalance(customerId: String, delta: Double) {
        val existing = customerDao.getById(customerId) ?: return
        customerDao.insertOrUpdate(
            existing.copy(balance = existing.balance + delta, updatedAt = nowIso())
        )
    }

    suspend fun recordPayment(
        businessId: String,
        customerId: String,
        amount: Double,
        paymentMethod: String = "CASH",
        notes: String? = null
    ) {
        if (amount <= 0.0) return
        val existing = customerDao.getById(customerId) ?: return
        val payment = CustomerPaymentEntity(
            id = UUID.randomUUID().toString(),
            businessId = businessId,
            customerId = customerId,
            amount = amount,
            paymentMethod = paymentMethod,
            notes = notes,
            createdAt = nowIso()
        )
        customerDao.insertPayment(payment)
        // Debt payment reduces customer balance
        customerDao.insertOrUpdate(
            existing.copy(balance = (existing.balance - amount).coerceAtLeast(0.0), updatedAt = nowIso())
        )
    }

    suspend fun deleteCustomer(id: String) = customerDao.deleteById(id)

    suspend fun getTotalOwed(businessId: String): Double =
        customerDao.getTotalOwed(businessId)
}

class ReportRepository(
    private val saleDao: SaleDao,
    private val expenseRepository: ExpenseRepository
) {

    data class Report(
        val totals: SalesTotalsRow,
        val overheads: Double,
        val topProducts: List<TopProductRow>,
        val payments: List<PaymentBreakdownRow>,
        val expenseCategories: List<CategoryExpenseRow>
    ) {
        val netProfit: Double get() = totals.profit - overheads
        val marginPercent: Double
            get() = if (totals.revenue <= 0.0) 0.0 else netProfit / totals.revenue * 100.0
    }

    suspend fun build(businessId: String, sinceIso: String): Report = Report(
        totals = saleDao.getTotalsSince(businessId, sinceIso),
        overheads = expenseRepository.getOverheadsSince(businessId, sinceIso),
        topProducts = saleDao.getTopProducts(businessId, sinceIso, TOP_LIMIT),
        payments = saleDao.getPaymentBreakdown(businessId, sinceIso),
        expenseCategories = expenseRepository.getCategoryTotalsSince(businessId, sinceIso)
    )

    private companion object {
        const val TOP_LIMIT = 10
    }
}

internal fun nowIso(): String {
    val format = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
    format.timeZone = TimeZone.getTimeZone("UTC")
    return format.format(Date())
}
