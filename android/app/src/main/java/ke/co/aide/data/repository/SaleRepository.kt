package ke.co.aide.data.repository

import ke.co.aide.data.local.dao.ProductDao
import ke.co.aide.data.local.dao.SaleDao
import ke.co.aide.data.local.dao.SaleWithItems
import ke.co.aide.data.local.entities.SaleEntity
import ke.co.aide.data.local.entities.SaleItemEntity
import kotlinx.coroutines.flow.Flow
import java.text.SimpleDateFormat
import java.util.*

/**
 * Local-only sales storage: records the sale, writes its items, and decrements
 * stock, all inside this device's database.
 */
class SaleRepository(
    private val saleDao: SaleDao,
    private val productDao: ProductDao
) {

    fun getSales(businessId: String): Flow<List<SaleWithItems>> =
        saleDao.getSalesWithItems(businessId)

    suspend fun getSaleById(saleId: String): SaleWithItems? =
        saleDao.getSaleWithItemsById(saleId)

    suspend fun createSale(
        businessId: String,
        items: List<SaleItemEntity>,
        total: Double,
        cost: Double,
        profit: Double,
        paid: Double,
        change: Double,
        tax: Double = 0.0,
        taxRate: Double = 0.0,
        paymentMethod: String = "CASH",
        cashier: String? = null,
        notes: String? = null
    ): SaleEntity {
        val saleId = UUID.randomUUID().toString()
        val isoFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
            timeZone = TimeZone.getTimeZone("UTC")
        }
        val now = isoFormat.format(Date())

        val sale = SaleEntity(
            id = saleId,
            businessId = businessId,
            total = total,
            cost = cost,
            profit = profit,
            paid = paid,
            change = change,
            tax = tax,
            taxRate = taxRate,
            cashier = cashier,
            paymentMethod = paymentMethod,
            notes = notes,
            createdAt = now
        )

        val saleItemsWithId = items.map { item ->
            if (item.id.isBlank()) item.copy(id = UUID.randomUUID().toString(), saleId = saleId)
            else item.copy(saleId = saleId)
        }

        saleDao.insertSaleWithItems(sale, saleItemsWithId)

        // Decrement stock locally immediately
        for (item in saleItemsWithId) {
            item.productId?.let { pid ->
                productDao.decrementStock(pid, item.quantity)
            }
        }

        return sale
    }
}
