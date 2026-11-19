package com.omix.aide

import com.omix.aide.data.local.entities.ProductEntity
import com.omix.aide.data.local.entities.SaleEntity
import com.omix.aide.data.local.entities.SaleItemEntity
import com.omix.aide.data.local.converters.asMoney
import com.omix.aide.data.local.converters.toScaledMoney
import org.junit.Assert.assertEquals
import org.junit.Test

class AideUnitTest {

    @Test
    fun testProductEntityCreation() {
        val product = ProductEntity(
            id = "prod-1",
            businessId = "bus-1",
            name = "Milk 500ml",
            buyingPrice = 50.0.toScaledMoney(),
            sellingPrice = 65.0.toScaledMoney(),
            quantity = 24,
            createdAt = "2025-01-01T00:00:00.000Z",
            updatedAt = "2025-01-01T00:00:00.000Z"
        )
        assertEquals("Milk 500ml", product.name)
        assertEquals(65.0, product.sellingPrice.asMoney(), 0.01)
        assertEquals(24, product.quantity)
    }

    @Test
    fun testSaleProfitCalculation() {
        val total = 130.0
        val cost = 100.0
        val profit = total - cost
        assertEquals(30.0, profit, 0.01)
    }

    @Test
    fun testProductMarginCalculation() {
        val buyingPrice = 80.0
        val sellingPrice = 100.0
        val margin = ((sellingPrice - buyingPrice) / sellingPrice * 100).toInt()
        assertEquals(20, margin)
    }

    @Test
    fun testProductQuantityUpdate() {
        val original = ProductEntity(
            id = "prod-1",
            businessId = "bus-1",
            name = "Sugar 1kg",
            buyingPrice = 120.0.toScaledMoney(),
            sellingPrice = 150.0.toScaledMoney(),
            quantity = 10,
            createdAt = "2026-01-01T00:00:00.000Z",
            updatedAt = "2026-01-01T00:00:00.000Z"
        )
        val updated = original.copy(quantity = 25, sellingPrice = 155.0.toScaledMoney())
        assertEquals(25, updated.quantity)
        assertEquals(155.0, updated.sellingPrice.asMoney(), 0.01)
    }
}
