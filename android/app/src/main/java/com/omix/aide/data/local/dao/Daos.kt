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

