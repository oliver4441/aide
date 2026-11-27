package com.omix.aide.data.sync

import com.omix.aide.data.local.dao.SaleWithItems
import com.omix.aide.data.local.entities.CategoryEntity
import com.omix.aide.data.local.entities.PendingMutationEntity
import com.omix.aide.data.local.entities.ProductEntity
import com.omix.aide.data.local.entities.SaleEntity
import com.omix.aide.data.local.entities.SaleItemEntity
import org.json.JSONArray
import org.json.JSONObject
import java.math.BigDecimal
import java.math.RoundingMode
import java.util.UUID

/**
 * Turns Room rows into the JSON `POST /api/sync` accepts, and server JSON back
 * into Room rows.
 *
 * Kept pure (no Context, no Room) so the monetary and date conversion — the
 * part that silently corrupts money if it is wrong — is covered by JVM tests.
 *
 * Room stores money as a Long scaled by 10,000; Prisma stores Decimal(19,4).
 * Every boundary therefore sends a `BigDecimal` with exactly four decimals and
 * parses with the same scale, rather than going through a Double.
 */
object SyncPayloads {

    const val TABLE_PRODUCTS = "products"
    const val TABLE_CATEGORIES = "categories"
    const val TABLE_SALES = "sales"

    fun productUpsert(product: ProductEntity): PendingMutationEntity =
        mutation(
            table = TABLE_PRODUCTS,
            action = "upsert",
            recordId = product.id,
            data = JSONObject().apply {
                put("name", product.name)
                put("sku", product.sku ?: JSONObject.NULL)
                put("buyingPrice", scaled(product.buyingPrice))
                put("sellingPrice", scaled(product.sellingPrice))
                put("quantity", product.quantity)
                put("lowStock", product.lowStock)
                put("isService", product.isService)
                put("isActive", product.isActive)
                put("categoryId", product.categoryId ?: JSONObject.NULL)
                put("imageUrl", product.imageUrl ?: JSONObject.NULL)
                put("createdAt", product.createdAt)
                put("updatedAt", product.updatedAt)
            }
        )

    fun productDelete(productId: String): PendingMutationEntity =
        mutation(
            table = TABLE_PRODUCTS,
            action = "delete",
            recordId = productId,
            data = JSONObject().put("id", productId)
        )

    fun saleCreate(
        sale: SaleEntity,
        items: List<SaleItemEntity>
    ): PendingMutationEntity =
        mutation(
            table = TABLE_SALES,
            action = "create",
            recordId = sale.id,
            data = JSONObject().apply {
                put("sale", JSONObject().apply {
                    put("id", sale.id)
                    put("total", scaled(sale.total))
                    put("cost", scaled(sale.cost))
                    put("profit", scaled(sale.profit))
                    put("paid", scaled(sale.paid))
                    put("change", scaled(sale.change))
                    put("tax", scaled(sale.tax))
                    put("taxRate", scaled(sale.taxRate))
                    put("paymentMethod", sale.paymentMethod)
                    put("cashier", sale.cashier ?: JSONObject.NULL)
                    put("notes", sale.notes ?: JSONObject.NULL)
                    put("createdAt", sale.createdAt)
                })
                put("items", JSONArray().apply {
                    items.forEach { item ->
                        put(JSONObject().apply {
                            put("id", item.id)
                            put("productId", item.productId ?: JSONObject.NULL)
                            put("name", item.name)
                            put("quantity", item.quantity)
                            put("price", scaled(item.price))
                            put("cost", scaled(item.cost))
                        })
                    }
                })
            }
        )

    fun categoryUpsert(category: CategoryEntity): PendingMutationEntity =
        mutation(
            table = TABLE_CATEGORIES,
            action = "upsert",
            recordId = category.id,
            data = JSONObject().apply {
                put("name", category.name)
                put("sortOrder", category.sortOrder)
                put("createdAt", category.createdAt)
            }
        )

    /**
     * The pull delta. Products the server has soft-deleted come back separately
     * so the device removes them instead of resurrecting an inactive row.
     */
    data class PulledData(
        val products: List<ProductEntity>,
        val removedProductIds: List<String>,
        val categories: List<CategoryEntity>,
        val sales: List<SaleWithItems>
    )

    fun parsePull(raw: JSONObject, businessId: String): PulledData {
        val products = mutableListOf<ProductEntity>()
        val removed = mutableListOf<String>()

        raw.optJSONArray("products")?.let { array ->
            for (i in 0 until array.length()) {
                val row = array.optJSONObject(i) ?: continue
                val id = row.optString("id", "")
                if (id.isBlank()) continue
                if (!row.optBoolean("isActive", true)) {
                    removed += id
                    continue
                }
                products += ProductEntity(
                    id = id,
                    businessId = row.optString("businessId", businessId),
                    categoryId = row.optString("categoryId", "").takeIf { it.isNotBlank() },
                    name = row.optString("name", ""),
                    sku = row.optString("sku", "").takeIf { it.isNotBlank() },
                    buyingPrice = row.scaledDecimal("buyingPrice"),
                    sellingPrice = row.scaledDecimal("sellingPrice"),
                    quantity = row.optInt("quantity", 0),
                    lowStock = row.optInt("lowStock", 5),
                    isService = row.optBoolean("isService", false),
                    imageUrl = row.optString("imageUrl", "").takeIf { it.isNotBlank() },
                    isActive = true,
                    createdAt = row.optString("createdAt", ""),
                    updatedAt = row.optString("updatedAt", "")
                )
            }
        }

        val categories = mutableListOf<CategoryEntity>()
        raw.optJSONArray("categories")?.let { array ->
            for (i in 0 until array.length()) {
                val row = array.optJSONObject(i) ?: continue
                val id = row.optString("id", "")
                if (id.isBlank()) continue
                categories += CategoryEntity(
                    id = id,
                    businessId = row.optString("businessId", businessId),
                    name = row.optString("name", ""),
                    sortOrder = row.optInt("sortOrder", 0),
                    createdAt = row.optString("createdAt", "")
                )
            }
        }

        val itemsBySale = mutableMapOf<String, MutableList<SaleItemEntity>>()
        raw.optJSONArray("saleItems")?.let { array ->
            for (i in 0 until array.length()) {
                val row = array.optJSONObject(i) ?: continue
                val saleId = row.optString("saleId", "")
                if (saleId.isBlank()) continue
                itemsBySale.getOrPut(saleId) { mutableListOf() } += SaleItemEntity(
                    id = row.optString("id", UUID.randomUUID().toString()),
                    saleId = saleId,
                    productId = row.optString("productId", "").takeIf { it.isNotBlank() },
                    name = row.optString("name", ""),
                    quantity = row.optInt("quantity", 0),
                    price = row.scaledDecimal("price"),
                    cost = row.scaledDecimal("cost")
                )
            }
        }

        val sales = mutableListOf<SaleWithItems>()
        raw.optJSONArray("sales")?.let { array ->
            for (i in 0 until array.length()) {
                val row = array.optJSONObject(i) ?: continue
                val id = row.optString("id", "")
                if (id.isBlank()) continue
                sales += SaleWithItems(
                    sale = SaleEntity(
                        id = id,
                        businessId = row.optString("businessId", businessId),
                        total = row.scaledDecimal("total"),
                        cost = row.scaledDecimal("cost"),
                        profit = row.scaledDecimal("profit"),
                        paid = row.scaledDecimal("paid"),
                        change = row.scaledDecimal("change"),
                        tax = row.scaledDecimal("tax"),
                        taxRate = row.scaledDecimal("taxRate"),
                        cashier = row.optString("cashier", "").takeIf { it.isNotBlank() },
                        paymentMethod = row.optString("paymentMethod", "CASH"),
                        notes = row.optString("notes", "").takeIf { it.isNotBlank() },
                        createdAt = row.optString("createdAt", "")
                    ),
                    items = itemsBySale[id].orEmpty()
                )
            }
        }

        return PulledData(
            products = products,
            removedProductIds = removed,
            categories = categories,
            sales = sales
        )
    }

    /** Scaled Long → exact four-decimal JSON number. */
    fun scaled(value: Long): BigDecimal = BigDecimal.valueOf(value, 4)

    /** Four-decimal JSON value (string or number) → scaled Long. */
    fun unscale(raw: Any?): Long {
        val text = when (raw) {
            null, JSONObject.NULL -> return 0L
            is Number -> raw.toString()
            is String -> raw
            else -> return 0L
        }
        return runCatching {
            BigDecimal(text).movePointRight(4).setScale(0, RoundingMode.HALF_UP).toLong()
        }.getOrDefault(0L)
    }

    private fun JSONObject.scaledDecimal(key: String): Long = unscale(opt(key))

    private fun mutation(
        table: String,
        action: String,
        recordId: String,
        data: JSONObject
    ): PendingMutationEntity = PendingMutationEntity(
        id = UUID.randomUUID().toString(),
        tableName = table,
        action = action,
        recordId = recordId,
        payload = data.toString(),
        createdAt = System.currentTimeMillis()
    )
}
