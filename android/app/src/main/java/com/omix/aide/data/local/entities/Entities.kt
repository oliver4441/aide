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
    val updatedAt: String,
    // Multi-unit & Expiry additions
    val packSize: Int = 1,
    val packPrice: Double = 0.0,
    val batchNumber: String? = null,
    val expiryDate: String? = null
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
    val discount: Double = 0.0,
    val customerId: String? = null
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
    val isCogs: Boolean = false,
    val notes: String? = null,
    val createdAt: String
)

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
    val loyaltyPoints: Int = 0,
    val isActive: Boolean = true,
    val createdAt: String,
    val updatedAt: String
)

@Entity(
    tableName = "customer_payments",
    indices = [Index("businessId"), Index("customerId")]
)
data class CustomerPaymentEntity(
    @PrimaryKey val id: String,
    val businessId: String,
    val customerId: String,
    val amount: Double,
    val paymentMethod: String = "CASH",
    val notes: String? = null,
    val createdAt: String
)

@Entity(
    tableName = "suppliers",
    indices = [Index("businessId"), Index("name")]
)
data class SupplierEntity(
    @PrimaryKey val id: String,
    val businessId: String,
    val name: String,
    val phone: String? = null,
    val email: String? = null,
    val address: String? = null,
    val balance: Double = 0.0,
    val createdAt: String
)

@Entity(
    tableName = "purchase_orders",
    indices = [Index("businessId"), Index("supplierId")]
)
data class PurchaseOrderEntity(
    @PrimaryKey val id: String,
    val businessId: String,
    val supplierId: String,
    val supplierName: String,
    val totalAmount: Double,
    val status: String = "PENDING", // PENDING, RECEIVED, CANCELLED
    val notes: String? = null,
    val createdAt: String
)

@Entity(
    tableName = "cashier_shifts",
    indices = [Index("businessId"), Index("openedAt")]
)
data class CashierShiftEntity(
    @PrimaryKey val id: String,
    val businessId: String,
    val cashierName: String,
    val startingFloat: Double,
    val expectedCash: Double = 0.0,
    val actualCash: Double = 0.0,
    val status: String = "OPEN", // OPEN, CLOSED
    val openedAt: String,
    val closedAt: String? = null
)

@Entity(
    tableName = "quotations",
    indices = [Index("businessId"), Index("createdAt")]
)
data class QuotationEntity(
    @PrimaryKey val id: String,
    val businessId: String,
    val customerName: String,
    val totalAmount: Double,
    val status: String = "DRAFT", // DRAFT, ACCEPTED, CONVERTED
    val createdAt: String
)
