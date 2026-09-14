package ke.co.aide.data.remote.dto

import kotlinx.serialization.Serializable

@Serializable
data class LoginRequestDto(
    val email: String,
    val password: String
)

@Serializable
data class UserDto(
    val id: String,
    val email: String,
    val name: String,
    val role: String,
    val businessId: String? = null
)

@Serializable
data class SyncMutationDto(
    val table: String,
    val action: String,
    val recordId: String,
    val data: kotlinx.serialization.json.JsonObject
)

@Serializable
data class SyncPushRequestDto(
    val mutations: List<SyncMutationDto>,
    val deviceId: String
)

@Serializable
data class SyncPushResponseDto(
    val synced: Int,
    val conflicts: List<kotlinx.serialization.json.JsonObject> = emptyList()
)

@Serializable
data class BusinessDto(
    val id: String,
    val name: String,
    val type: String,
    val currency: String = "KSh",
    val taxRate: Double = 0.0,
    val receiptFooter: String? = null
)

@Serializable
data class ProductDto(
    val id: String,
    val name: String,
    val sku: String? = null,
    val buyingPrice: Double,
    val sellingPrice: Double,
    val quantity: Int,
    val lowStock: Int = 5,
    val isService: Boolean = false,
    val categoryId: String? = null,
    val businessId: String,
    val createdAt: String? = null,
    val updatedAt: String? = null
)

@Serializable
data class CategoryDto(
    val id: String,
    val name: String,
    val sortOrder: Int = 0,
    val businessId: String,
    val createdAt: String? = null
)

@Serializable
data class SaleItemDto(
    val id: String,
    val name: String,
    val quantity: Int,
    val price: Double,
    val cost: Double,
    val productId: String? = null
)

@Serializable
data class SaleDto(
    val id: String,
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
    val businessId: String,
    val createdAt: String? = null
)

@Serializable
data class SyncPullResponseDto(
    val business: BusinessDto? = null,
    val products: List<ProductDto> = emptyList(),
    val categories: List<CategoryDto> = emptyList(),
    val sales: List<SaleDto> = emptyList(),
    val saleItems: List<SaleItemDto> = emptyList()
)
