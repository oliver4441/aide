package com.omix.aide.data.local.dao

import androidx.room.*
import com.omix.aide.data.local.entities.*
import kotlinx.coroutines.flow.Flow

@Dao
interface ProductDao {
    @Query("SELECT * FROM products WHERE businessId = :businessId AND isActive = 1 ORDER BY name ASC")
    fun getProductsByBusiness(businessId: String): Flow<List<ProductEntity>>

    @Query("SELECT * FROM products WHERE id = :id")
    suspend fun getProductById(id: String): ProductEntity?

    @Query("SELECT * FROM products WHERE businessId = :businessId AND quantity <= lowStock AND isActive = 1")
    fun getLowStockProducts(businessId: String): Flow<List<ProductEntity>>

    /** One-shot variant for background workers. */
    @Query("SELECT * FROM products WHERE businessId = :businessId AND quantity <= lowStock AND isActive = 1 ORDER BY quantity ASC")
    suspend fun getLowStockProductsOnce(businessId: String): List<ProductEntity>

    @Query("SELECT COUNT(*) FROM products WHERE businessId = :businessId AND isActive = 1")
    suspend fun countActiveProducts(businessId: String): Int

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertOrUpdate(product: ProductEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(products: List<ProductEntity>)

    @Query("UPDATE products SET quantity = quantity - :qty WHERE id = :productId")
    suspend fun decrementStock(productId: String, qty: Int)

    @Query("DELETE FROM products WHERE id = :id")
    suspend fun deleteById(id: String)
}

@Dao
interface CategoryDao {
    @Query("SELECT * FROM categories WHERE businessId = :businessId ORDER BY sortOrder ASC, name ASC")
    fun getCategoriesByBusiness(businessId: String): Flow<List<CategoryEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertOrUpdate(category: CategoryEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(categories: List<CategoryEntity>)
}

data class SaleWithItems(
    @Embedded val sale: SaleEntity,
    @Relation(
        parentColumn = "id",
        entityColumn = "saleId"
    )
    val items: List<SaleItemEntity>
)

@Dao
interface SaleDao {
    @Transaction
    @Query("SELECT * FROM sales WHERE businessId = :businessId ORDER BY createdAt DESC")
    fun getSalesWithItems(businessId: String): Flow<List<SaleWithItems>>

    @Transaction
    @Query("SELECT * FROM sales WHERE id = :saleId")
    suspend fun getSaleWithItemsById(saleId: String): SaleWithItems?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSale(sale: SaleEntity)

    /**
     * Sales on or after an ISO-8601 timestamp. `createdAt` is stored as an ISO
     * string, which compares correctly lexicographically.
     */
    @Query("SELECT * FROM sales WHERE businessId = :businessId AND createdAt >= :sinceIso ORDER BY createdAt DESC")
    suspend fun getSalesSince(businessId: String, sinceIso: String): List<SaleEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSaleItems(items: List<SaleItemEntity>)

    @Transaction
    suspend fun insertSaleWithItems(sale: SaleEntity, items: List<SaleItemEntity>) {
        insertSale(sale)
        insertSaleItems(items)
    }

    // ---- report aggregates -------------------------------------------------
    // Aggregated in SQL rather than in Kotlin so a long history does not have
    // to be loaded into memory to draw one chart.

    @Query("SELECT COALESCE(SUM(total), 0) AS revenue, COALESCE(SUM(cost), 0) AS cost, COALESCE(SUM(profit), 0) AS profit, COALESCE(SUM(tax), 0) AS tax, COUNT(*) AS count FROM sales WHERE businessId = :businessId AND createdAt >= :sinceIso")
    suspend fun getTotalsSince(businessId: String, sinceIso: String): SalesTotalsRow

    @Query("SELECT si.productId AS productId, si.name AS name, SUM(si.quantity) AS quantity, SUM(si.quantity * si.price) AS revenue, SUM(si.quantity * (si.price - si.cost)) AS profit FROM sale_items si INNER JOIN sales s ON s.id = si.saleId WHERE s.businessId = :businessId AND s.createdAt >= :sinceIso GROUP BY si.productId, si.name ORDER BY revenue DESC LIMIT :limit")
    suspend fun getTopProducts(businessId: String, sinceIso: String, limit: Int): List<TopProductRow>

    @Query("SELECT paymentMethod AS method, COUNT(*) AS count, SUM(total) AS total FROM sales WHERE businessId = :businessId AND createdAt >= :sinceIso GROUP BY paymentMethod ORDER BY total DESC")
    suspend fun getPaymentBreakdown(businessId: String, sinceIso: String): List<PaymentBreakdownRow>

}

@Dao
interface NotificationDao {
    /** Returns the new row id, or -1 when the event was already recorded. */
    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insertIfNew(event: NotifiedEventEntity): Long

    @Query("SELECT * FROM notified_events ORDER BY createdAt DESC LIMIT :limit")
    fun recent(limit: Int = 50): Flow<List<NotifiedEventEntity>>

    @Query("SELECT COUNT(*) FROM notified_events WHERE read = 0")
    fun unreadCount(): Flow<Int>

    @Query("UPDATE notified_events SET read = 1 WHERE eventId = :eventId")
    suspend fun markRead(eventId: String)

    @Query("UPDATE notified_events SET read = 1")
    suspend fun markAllRead()

    @Query("DELETE FROM notified_events WHERE createdAt < :before")
    suspend fun pruneBefore(before: Long)

    @Query("DELETE FROM notified_events")
    suspend fun clearAll()
}


/** Aggregate row for the reports header. */
data class SalesTotalsRow(
    val revenue: Double,
    val cost: Double,
    val profit: Double,
    val tax: Double,
    val count: Int
)

/** One row of the "top products" table. */
data class TopProductRow(
    val productId: String?,
    val name: String,
    val quantity: Int,
    val revenue: Double,
    val profit: Double
)

/** One row of the payment-method breakdown. */
data class PaymentBreakdownRow(
    val method: String,
    val count: Int,
    val total: Double
)

@Dao
interface ExpenseDao {

    @Query("SELECT * FROM expenses WHERE businessId = :businessId ORDER BY createdAt DESC")
    fun getExpenses(businessId: String): Flow<List<ExpenseEntity>>

    @Query("SELECT * FROM expenses WHERE businessId = :businessId AND createdAt >= :sinceIso ORDER BY createdAt DESC")
    suspend fun getExpensesSince(businessId: String, sinceIso: String): List<ExpenseEntity>

    /** Overheads only. COGS is already carried on each sale. */
    @Query("SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE businessId = :businessId AND isCogs = 0 AND createdAt >= :sinceIso")
    suspend fun getOverheadsSince(businessId: String, sinceIso: String): Double

    @Query("SELECT category, SUM(amount) AS total FROM expenses WHERE businessId = :businessId AND createdAt >= :sinceIso GROUP BY category ORDER BY total DESC")
    suspend fun getCategoryTotalsSince(businessId: String, sinceIso: String): List<CategoryExpenseRow>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertOrUpdate(expense: ExpenseEntity)

    @Query("DELETE FROM expenses WHERE id = :id")
    suspend fun deleteById(id: String)
}

/** One row of the "spend by category" table. */
data class CategoryExpenseRow(
    val category: String,
    val total: Double
)

@Dao
interface CustomerDao {

    @Query("SELECT * FROM customers WHERE businessId = :businessId ORDER BY name ASC")
    fun getCustomers(businessId: String): Flow<List<CustomerEntity>>

    @Query("SELECT * FROM customers WHERE businessId = :businessId AND isActive = 1 ORDER BY name ASC")
    fun getActiveCustomers(businessId: String): Flow<List<CustomerEntity>>

    @Query("SELECT * FROM customers WHERE id = :id")
    suspend fun getById(id: String): CustomerEntity?

    @Query("SELECT COALESCE(SUM(balance), 0) FROM customers WHERE businessId = :businessId")
    suspend fun getTotalOwed(businessId: String): Double

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertOrUpdate(customer: CustomerEntity)

    @Query("DELETE FROM customers WHERE id = :id")
    suspend fun deleteById(id: String)
}
