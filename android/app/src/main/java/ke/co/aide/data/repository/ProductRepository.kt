package ke.co.aide.data.repository

import ke.co.aide.data.local.dao.*
import ke.co.aide.data.local.entities.*
import ke.co.aide.data.remote.dto.ProductDto
import kotlinx.coroutines.flow.Flow
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.text.SimpleDateFormat
import java.util.*

class ProductRepository(
    private val productDao: ProductDao,
    private val categoryDao: CategoryDao,
    private val syncMutationDao: SyncMutationDao
) {
    private val json = Json { ignoreUnknownKeys = true }

    fun getProducts(businessId: String): Flow<List<ProductEntity>> =
        productDao.getProductsByBusiness(businessId)

    fun getLowStockProducts(businessId: String): Flow<List<ProductEntity>> =
        productDao.getLowStockProducts(businessId)

    fun getCategories(businessId: String): Flow<List<CategoryEntity>> =
        categoryDao.getCategoriesByBusiness(businessId)

    suspend fun addOrUpdateProduct(product: ProductEntity) {
        productDao.insertOrUpdate(product)
        val dto = ProductDto(
            id = product.id,
            name = product.name,
            sku = product.sku,
            buyingPrice = product.buyingPrice,
            sellingPrice = product.sellingPrice,
            quantity = product.quantity,
            lowStock = product.lowStock,
            isService = product.isService,
            categoryId = product.categoryId,
            businessId = product.businessId,
            createdAt = product.createdAt,
            updatedAt = product.updatedAt
        )

        syncMutationDao.insertMutation(
            SyncMutationEntity(
                table = "products",
                action = "upsert",
                recordId = product.id,
                dataJson = json.encodeToString(dto)
            )
        )
    }

    suspend fun deleteProduct(id: String) {
        productDao.deleteById(id)
        syncMutationDao.insertMutation(
            SyncMutationEntity(
                table = "products",
                action = "delete",
                recordId = id,
                dataJson = "{}"
            )
        )
    }
}
