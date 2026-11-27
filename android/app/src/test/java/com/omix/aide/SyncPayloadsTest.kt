package com.omix.aide

import com.omix.aide.data.local.converters.toScaledMoney
import com.omix.aide.data.local.entities.ProductEntity
import com.omix.aide.data.local.entities.SaleEntity
import com.omix.aide.data.local.entities.SaleItemEntity
import com.omix.aide.data.sync.SyncPayloads
import com.omix.aide.data.remote.CloudUrls
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * The wire format between the APK and `/api/sync`.
 *
 * Money crosses two representations (Room's scaled Long and Prisma's
 * Decimal(19,4)), so a rounding mistake here would silently change a shop's
 * prices or takings. These tests pin the conversion in both directions.
 */
class SyncPayloadsTest {

    private val product = ProductEntity(
        id = "product-1",
        businessId = "business-1",
        categoryId = "category-1",
        name = "Milk 500ml",
        sku = "DAI-0001",
        buyingPrice = 50.0.toScaledMoney(),
        sellingPrice = 65.5.toScaledMoney(),
        quantity = 24,
        lowStock = 6,
        isService = false,
        imageUrl = null,
        isActive = true,
        createdAt = "2026-11-20T09:00:00.000Z",
        updatedAt = "2026-11-26T09:00:00.000Z"
    )

    private val sale = SaleEntity(
        id = "sale-1",
        businessId = "business-1",
        total = 131.0.toScaledMoney(),
        cost = 100.0.toScaledMoney(),
        profit = 31.0.toScaledMoney(),
        paid = 200.0.toScaledMoney(),
        change = 69.0.toScaledMoney(),
        tax = 18.07.toScaledMoney(),
        taxRate = 16.0.toScaledMoney(),
        cashier = "Amina",
        paymentMethod = "MOBILE_MONEY",
        notes = null,
        createdAt = "2026-11-26T08:30:00.000Z"
    )

    private val item = SaleItemEntity(
        id = "item-1",
        saleId = sale.id,
        productId = product.id,
        name = product.name,
        quantity = 2,
        price = 65.5.toScaledMoney(),
        cost = 50.0.toScaledMoney()
    )

    @Test
    fun productPricesKeepTheirFourDecimalScale() {
        val data = JSONObject(SyncPayloads.productUpsert(product).payload)

        assertEquals(product.buyingPrice, SyncPayloads.unscale(data.get("buyingPrice")))
        assertEquals(product.sellingPrice, SyncPayloads.unscale(data.get("sellingPrice")))
        assertEquals(24, data.getInt("quantity"))
        assertEquals("2026-11-26T09:00:00.000Z", data.getString("updatedAt"))
    }

    @Test
    fun aFractionalAmountSurvivesTheRoundTrip() {
        // 0.01 is the amount most likely to disappear through a Double.
        assertEquals(100L, SyncPayloads.unscale("0.0100"))
        assertEquals(999_999_999L, SyncPayloads.unscale("99999.9999"))
        assertEquals(0L, SyncPayloads.unscale(null))
        assertEquals(0L, SyncPayloads.unscale("not a number"))
    }

    @Test
    fun saleMutationCarriesItsOriginalTimeAndItems() {
        val data = JSONObject(SyncPayloads.saleCreate(sale, listOf(item)).payload)
        val saleJson = data.getJSONObject("sale")
        val items = data.getJSONArray("items")

        assertEquals("2026-11-26T08:30:00.000Z", saleJson.getString("createdAt"))
        assertEquals("MOBILE_MONEY", saleJson.getString("paymentMethod"))
        assertEquals(sale.total, SyncPayloads.unscale(saleJson.get("total")))
        assertEquals(1, items.length())
        assertEquals(product.id, items.getJSONObject(0).getString("productId"))
    }

    @Test
    fun pullParsesServerDecimalsAndGroupsSaleItems() {
        val raw = JSONObject(
            """
            {
              "products": [
                {"id":"p1","businessId":"b1","name":"Milk","buyingPrice":"50.0000",
                 "sellingPrice":"65.5000","quantity":3,"lowStock":5,"isService":false,
                 "isActive":true,"createdAt":"2026-11-20T09:00:00.000Z",
                 "updatedAt":"2026-11-26T09:00:00.000Z"},
                {"id":"p2","businessId":"b1","name":"Deleted","isActive":false,
                 "buyingPrice":"1.0000","sellingPrice":"2.0000","quantity":0,
                 "createdAt":"2026-11-20T09:00:00.000Z","updatedAt":"2026-11-26T09:00:00.000Z"}
              ],
              "categories": [
                {"id":"c1","businessId":"b1","name":"Dairy","sortOrder":2,
                 "createdAt":"2026-11-20T09:00:00.000Z"}
              ],
              "sales": [
                {"id":"s1","businessId":"b1","total":"131.0000","cost":"100.0000",
                 "profit":"31.0000","paid":"200.0000","change":"69.0000",
                 "tax":"18.0700","taxRate":"16.0000","cashier":"Amina",
                 "paymentMethod":"MOBILE_MONEY","createdAt":"2026-11-26T08:30:00.000Z"}
              ],
              "saleItems": [
                {"id":"i1","saleId":"s1","productId":"p1","name":"Milk","quantity":2,
                 "price":"65.5000","cost":"50.0000"}
              ]
            }
            """.trimIndent()
        )

        val delta = SyncPayloads.parsePull(raw, "b1")

        assertEquals(1, delta.products.size)
        assertEquals(65.5.toScaledMoney(), delta.products[0].sellingPrice)
        assertEquals(listOf("p2"), delta.removedProductIds)
        assertEquals(1, delta.categories.size)
        assertEquals("Dairy", delta.categories[0].name)
        assertEquals(1, delta.sales.size)
        assertEquals(131.0.toScaledMoney(), delta.sales[0].sale.total)
        assertEquals(1, delta.sales[0].items.size)
        assertEquals(65.5.toScaledMoney(), delta.sales[0].items[0].price)
    }

    @Test
    fun baseUrlIsNormalisedForRealWorldPasting() {
        assertEquals("https://aide.omixsystems.store", CloudUrls.normalize("https://aide.omixsystems.store/"))
        assertEquals("https://aide.omixsystems.store", CloudUrls.normalize("aide.omixsystems.store"))
        assertEquals("https://aide.omixsystems.store", CloudUrls.normalize("  aide.omixsystems.store/  "))
        assertEquals("https://aide.omixsystems.store", CloudUrls.normalize("http://aide.omixsystems.store"))
        assertEquals("https://aide.example.com/api", CloudUrls.normalize("https://aide.example.com/api/"))
    }

    @Test
    fun anEmptyBaseUrlFallsBackToTheBuildDefault() {
        val normalized = CloudUrls.normalize("   ")
        assertTrue(normalized.startsWith("https://"))
        assertFalse(normalized.endsWith("/"))
    }
}
