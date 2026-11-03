package com.omix.aide

import android.database.sqlite.SQLiteDatabase
import androidx.test.platform.app.InstrumentationRegistry
import com.omix.aide.data.local.AideDatabase
import com.omix.aide.data.local.entities.ProductEntity
import com.omix.aide.data.local.entities.SaleEntity
import com.omix.aide.data.local.entities.SaleItemEntity
import java.util.UUID
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Assert.*
import org.junit.Test

/** An APK upgrade must never recover from an unknown schema by deleting shop records. */
class DatabaseUpgradeTest {
    private val context get() = InstrumentationRegistry.getInstrumentation().targetContext
    private val databases = mutableListOf<String>()
    private val product = ProductEntity("saved-product", "saved-shop", name = "Milk", buyingPrice = 50.0,
        sellingPrice = 65.0, quantity = 24, createdAt = "2026-11-01T12:00:00Z", updatedAt = "2026-11-01T12:00:00Z")
    private val sale = SaleEntity("saved-sale", "saved-shop", total = 130.0, cost = 100.0, profit = 30.0,
        paid = 130.0, change = 0.0, createdAt = "2026-11-01T12:00:00Z")
    private val item = SaleItemEntity("saved-item", sale.id, product.id, product.name, 2, 65.0, 50.0)

    @After fun cleanUp() {
        databases.forEach { context.deleteDatabase(it) }
    }

    /** Reconstruct old versions of the unchanged product/sale tables, in an isolated file. */
    private fun seed(version: Int): String {
        val name = "upgrade-test-${UUID.randomUUID()}.db".also { databases += it }
        val database = AideDatabase.buildDatabase(context, name)
        try {
            runBlocking {
                database.productDao().insertOrUpdate(product)
                database.saleDao().insertSaleWithItems(sale, listOf(item))
            }
            val sqlite = database.openHelper.writableDatabase
            if (version in 2..3) {
                sqlite.execSQL("DROP TABLE expenses")
                sqlite.execSQL("DROP TABLE customers")
                if (version == 2) sqlite.execSQL("DROP TABLE notified_events")
            }
            sqlite.version = version
        } finally { database.close() }
        return name
    }

    @Test fun supportedMigrationsRetainProductsSalesAndSaleItems() {
        for (version in listOf(2, 3)) {
            val database = AideDatabase.buildDatabase(context, seed(version))
            try {
                runBlocking {
                    assertEquals(product, database.productDao().getProductById(product.id))
                    val saved = database.saleDao().getSaleWithItemsById(sale.id)
                    assertNotNull(saved)
                    assertEquals(sale, saved!!.sale)
                    assertEquals(listOf(item), saved.items)
                }
                assertEquals(4, database.openHelper.writableDatabase.version)
            } finally { database.close() }
        }
    }

    @Test fun missingMigrationAndDowngradeFailWithoutDeletingData() {
        for (version in listOf(1, 5)) {
            val name = seed(version)
            val database = AideDatabase.buildDatabase(context, name)
            try {
                try {
                    database.openHelper.writableDatabase
                    fail("An unknown schema must require recovery, not a destructive reset")
                } catch (error: IllegalStateException) {
                    assertTrue(error.message.orEmpty().contains("migration", ignoreCase = true))
                }
            } finally { database.close() }
            SQLiteDatabase.openDatabase(context.getDatabasePath(name).path, null, SQLiteDatabase.OPEN_READONLY).use { raw ->
                assertEquals(version, raw.version)
                raw.rawQuery("SELECT name, quantity FROM products WHERE id = ?", arrayOf(product.id)).use { cursor ->
                    assertTrue(cursor.moveToFirst())
                    assertEquals(product.name, cursor.getString(0))
                    assertEquals(product.quantity, cursor.getInt(1))
                }
                raw.rawQuery("SELECT profit FROM sales WHERE id = ?", arrayOf(sale.id)).use { cursor ->
                    assertTrue(cursor.moveToFirst())
                    assertEquals(sale.profit, cursor.getDouble(0), 0.0)
                }
            }
        }
    }
}
