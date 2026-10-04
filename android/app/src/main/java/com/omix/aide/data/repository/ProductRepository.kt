package com.omix.aide.data.repository

import com.omix.aide.data.local.dao.CategoryDao
import com.omix.aide.data.local.dao.ProductDao
import com.omix.aide.data.local.entities.CategoryEntity
import com.omix.aide.data.local.entities.ProductEntity
import kotlinx.coroutines.flow.Flow

/**
 * Local-only product storage. Every read and write goes straight to Room;
 * nothing leaves the device.
 */
class ProductRepository(
    private val productDao: ProductDao,
    private val categoryDao: CategoryDao
) {

    fun getProducts(businessId: String): Flow<List<ProductEntity>> =
        productDao.getProductsByBusiness(businessId)

    fun getLowStockProducts(businessId: String): Flow<List<ProductEntity>> =
        productDao.getLowStockProducts(businessId)

    fun getCategories(businessId: String): Flow<List<CategoryEntity>> =
        categoryDao.getCategoriesByBusiness(businessId)

    suspend fun addOrUpdateProduct(product: ProductEntity) {
        productDao.insertOrUpdate(product)
    }

    suspend fun deleteProduct(id: String) {
        productDao.deleteById(id)
    }
}
