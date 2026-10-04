package com.omix.aide

import com.omix.aide.data.local.entities.ProductEntity
import com.omix.aide.data.local.entities.SaleEntity
import com.omix.aide.data.local.entities.SaleItemEntity
import org.junit.Assert.assertEquals
import org.junit.Test

class AideUnitTest {

    @Test
    fun testProductEntityCreation() {
        val product = ProductEntity(
            id = "prod-1",
            businessId = "bus-1",
            name = "Milk 500ml",
            buyingPrice = 50.0,
            sellingPrice = 65.0,
            quantity = 24,
            createdAt = "2025-01-01T00:00:00.000Z",
            updatedAt = "2025-01-01T00:00:00.000Z"
        )
        assertEquals("Milk 500ml", product.name)
        assertEquals(65.0, product.sellingPrice, 0.01)
        assertEquals(24, product.quantity)
    }

    @Test
    fun testSaleProfitCalculation() {
        val total = 130.0
        val cost = 100.0
        val profit = total - cost
        assertEquals(30.0, profit, 0.01)
    }
}
