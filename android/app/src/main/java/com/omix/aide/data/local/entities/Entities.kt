package com.omix.aide.data.local.entities

import androidx.room.Entity
import androidx.room.Index
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

/**
 * A notification that has been shown on this device.
 *
 * Doubles as the idempotency log and the in-app notification inbox: the primary
 * key is the event id, so inserting the same business event twice is a no-op and
 * the notification is never displayed twice.
 */
@Entity(
    tableName = "notified_events",
    indices = [Index("createdAt"), Index("read")]
)
data class NotifiedEventEntity(
    @PrimaryKey val eventId: String,
    val channel: String,
    val title: String,
    val message: String,
    val route: String? = null,
    val read: Boolean = false,
    val createdAt: Long
)


/**
 * A business expense — rent, utilities, transport, restocking, wages.
 *
 * Kept separate from [SaleEntity] on purpose: sales are revenue, expenses are
 * cost, and net profit is only meaningful once both exist. Indexed by
 * createdAt because every report filters on a date range.
 */
@Entity(
    tableName = "expenses",
    indices = [Index("businessId"), Index("createdAt")]
)
data class ExpenseEntity(
    @PrimaryKey val id: String,
    val businessId: String,
    val category: String,
    val description: String? = null,
    val amount: Double,
    /** Shop overheads are not itemised against a product; COGS lives on the sale. */
    val isCogs: Boolean = false,
    val notes: String? = null,
    val createdAt: String
)

/**
 * A customer in the local directory.
 *
 * `balance` is denormalised on purpose: it is maintained when a sale is
 * recorded on credit, so the directory can be listed without joining every
 * time. Negative means the customer owes the business.
 */
@Entity(
    tableName = "customers",
    indices = [Index("businessId"), Index("name")]
)
data class CustomerEntity(
    @PrimaryKey val id: String,
    val businessId: String,
    val name: String,
    val phone: String? = null,
    val email: String? = null,
    val notes: String? = null,
    val balance: Double = 0.0,
    val isActive: Boolean = true,
    val createdAt: String,
    val updatedAt: String
)
