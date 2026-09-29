package ke.co.aide.sync

import android.content.Context
import ke.co.aide.data.local.dao.*
import ke.co.aide.data.local.entities.*
import ke.co.aide.data.remote.api.AideApiService
import ke.co.aide.data.remote.auth.SessionManager
import ke.co.aide.data.remote.dto.*
import kotlinx.coroutines.flow.Flow
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject

class SyncEngine(
    private val context: Context,
    private val apiService: AideApiService,
    private val productDao: ProductDao,
    private val categoryDao: CategoryDao,
    private val saleDao: SaleDao,
    private val syncMutationDao: SyncMutationDao,
    private val sessionManager: SessionManager
) {
    val pendingMutationsFlow: Flow<List<SyncMutationEntity>> = syncMutationDao.getAllMutations()

    suspend fun performSync(): Result<Int> {
        val businessId = sessionManager.getBusinessId() ?: return Result.failure(IllegalStateException("No business select"))
        val pending = syncMutationDao.getPendingMutations()

        var syncedCount = 0

        if (pending.isNotEmpty()) {
            val dtoList = pending.map { m ->
                val jsonObject = try {
                    Json.parseToJsonElement(m.dataJson).jsonObject
                } catch (e: Exception) {
                    Json.parseToJsonElement("{}").jsonObject
                }
                SyncMutationDto(
                    table = m.table,
                    action = m.action,
                    recordId = m.recordId,
                    data = jsonObject
                )
            }

            try {
                val pushResponse = apiService.pushSync(
                    SyncPushRequestDto(
                        mutations = dtoList,
                        deviceId = sessionManager.getUserId() ?: "android-device"
                    )
                )

                if (pushResponse.isSuccessful) {
                    val body = pushResponse.body()
                    syncedCount = body?.synced ?: 0
                    // Delete processed mutations
                    syncMutationDao.deleteMutations(pending.map { it.id })
                } else {
                    return Result.failure(Exception("Push failed: ${pushResponse.code()}"))
                }
            } catch (e: Exception) {
                return Result.failure(e)
            }
        }

        // Pull server changes
        try {
            val pullResponse = apiService.pullSync(businessId = businessId, since = "0")
            if (pullResponse.isSuccessful) {
                val data = pullResponse.body()
                data?.products?.let { products ->
                    productDao.insertAll(products.map { p ->
                        ProductEntity(
                            id = p.id,
                            businessId = p.businessId,
                            categoryId = p.categoryId,
                            name = p.name,
                            sku = p.sku,
                            buyingPrice = p.buyingPrice,
                            sellingPrice = p.sellingPrice,
                            quantity = p.quantity,
                            lowStock = p.lowStock,
                            isService = p.isService,
                            createdAt = p.createdAt ?: "",
                            updatedAt = p.updatedAt ?: ""
                        )
                    })
                }

                data?.categories?.let { categories ->
                    categoryDao.insertAll(categories.map { c ->
                        CategoryEntity(
                            id = c.id,
                            businessId = c.businessId,
                            name = c.name,
                            sortOrder = c.sortOrder,
                            createdAt = c.createdAt ?: ""
                        )
                    })
                }
            }
        } catch (e: Exception) {
            // Pull failed non-fatally
        }

        return Result.success(syncedCount)
    }
}
