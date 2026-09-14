package ke.co.aide.data.local.entities

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "products")
data class ProductEntity(
    @PrimaryKey val id: String,
    val businessId: String,
    val categoryId: String? = null,
    val name: String,
    val sku: String? = null,
    val buyingPrice: Double,
    val sellingPrice: Double,
    val quantity: Int = 0,
    val lowStock: Int = 5,
    val isService: Boolean = false,
    val imageUrl: String? = null,
    val isActive: Boolean = true,
    val createdAt: String,
    val updatedAt: String
)

@Entity(tableName = "categories")
data class CategoryEntity(
    @PrimaryKey val id: String,
    val businessId: String,
    val name: String,
    val sortOrder: Int = 0,
    val createdAt: String
)

@Entity(tableName = "sales")
data class SaleEntity(
    @PrimaryKey val id: String,
    val businessId: String,
    val total: Double,
    val cost: Double,
    val profit: Double,
    val paid: Double,
    val change: Double,
    val tax: Double = 0.0,
    val taxRate: Double = 0.0,
    val cashier: String? = null,
    val paymentMethod: String = "CASH",
    val notes: String? = null,
    val createdAt: String,
    val isSynced: Boolean = false
)

@Entity(tableName = "sale_items")
data class SaleItemEntity(
    @PrimaryKey val id: String,
    val saleId: String,
    val productId: String? = null,
    val name: String,
    val quantity: Int,
    val price: Double,
    val cost: Double
)

@Entity(tableName = "sync_mutations")
data class SyncMutationEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val table: String,
    val action: String, // "create", "update", "delete"
    val recordId: String,
    val dataJson: String,
    val timestamp: Long = System.currentTimeMillis(),
    val attempts: Int = 0,
    val lastError: String? = null
)
