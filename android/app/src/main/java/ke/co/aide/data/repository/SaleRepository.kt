package ke.co.aide.data.repository

import ke.co.aide.data.local.dao.*
import ke.co.aide.data.local.entities.*
import ke.co.aide.data.remote.dto.SaleDto
import ke.co.aide.data.remote.dto.SaleItemDto
import kotlinx.coroutines.flow.Flow
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.text.SimpleDateFormat
import java.util.*

@Serializable
private data class SaleMutationPayload(
    val sale: SaleDto,
    val items: List<SaleItemDto>
)

class SaleRepository(
    private val saleDao: SaleDao,
    private val productDao: ProductDao,
    private val syncMutationDao: SyncMutationDao
) {
    private val json = Json { ignoreUnknownKeys = true }

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
            createdAt = now,
            isSynced = false
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

        val saleDto = SaleDto(
            id = saleId,
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
            businessId = businessId,
            createdAt = now
        )

        val itemDtos = saleItemsWithId.map { item ->
            SaleItemDto(
                id = item.id,
                name = item.name,
                quantity = item.quantity,
                price = item.price,
                cost = item.cost,
                productId = item.productId
            )
        }

        val payload = SaleMutationPayload(sale = saleDto, items = itemDtos)

        syncMutationDao.insertMutation(
            SyncMutationEntity(
                table = "sales",
                action = "create",
                recordId = saleId,
                dataJson = json.encodeToString(payload)
            )
        )

        return sale
    }
}
