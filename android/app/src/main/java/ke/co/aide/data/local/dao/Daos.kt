package ke.co.aide.data.local.dao

import androidx.room.*
import ke.co.aide.data.local.entities.*
import kotlinx.coroutines.flow.Flow

@Dao
interface ProductDao {
    @Query("SELECT * FROM products WHERE businessId = :businessId AND isActive = 1 ORDER BY name ASC")
    fun getProductsByBusiness(businessId: String): Flow<List<ProductEntity>>

    @Query("SELECT * FROM products WHERE id = :id")
    suspend fun getProductById(id: String): ProductEntity?

    @Query("SELECT * FROM products WHERE businessId = :businessId AND quantity <= lowStock AND isActive = 1")
    fun getLowStockProducts(businessId: String): Flow<List<ProductEntity>>

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

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSaleItems(items: List<SaleItemEntity>)

    @Transaction
    suspend fun insertSaleWithItems(sale: SaleEntity, items: List<SaleItemEntity>) {
        insertSale(sale)
        insertSaleItems(items)
    }

    @Query("UPDATE sales SET isSynced = 1 WHERE id = :saleId")
    suspend fun markSynced(saleId: String)
}

@Dao
interface SyncMutationDao {
    @Query("SELECT * FROM sync_mutations ORDER BY id ASC")
    fun getAllMutations(): Flow<List<SyncMutationEntity>>

    @Query("SELECT * FROM sync_mutations ORDER BY id ASC")
    suspend fun getPendingMutations(): List<SyncMutationEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertMutation(mutation: SyncMutationEntity)

    @Query("DELETE FROM sync_mutations WHERE id = :id")
    suspend fun deleteMutation(id: Long)

    @Query("DELETE FROM sync_mutations WHERE id IN (:ids)")
    suspend fun deleteMutations(ids: List<Long>)

    @Query("UPDATE sync_mutations SET attempts = attempts + 1, lastError = :error WHERE id = :id")
    suspend fun recordAttemptFailed(id: Long, error: String)
}
