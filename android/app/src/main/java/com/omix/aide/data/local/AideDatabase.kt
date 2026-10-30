package com.omix.aide.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase
import com.omix.aide.data.local.dao.*
import com.omix.aide.data.local.entities.*

@Database(
    entities = [
        ProductEntity::class,
        CategoryEntity::class,
        SaleEntity::class,
        SaleItemEntity::class,
        NotifiedEventEntity::class,
        ExpenseEntity::class,
        CustomerEntity::class,
        CustomerPaymentEntity::class,
        SupplierEntity::class,
        PurchaseOrderEntity::class,
        CashierShiftEntity::class,
        QuotationEntity::class
    ],
    version = 6,
    exportSchema = false
)
abstract class AideDatabase : RoomDatabase() {

    abstract fun productDao(): ProductDao
    abstract fun categoryDao(): CategoryDao
    abstract fun saleDao(): SaleDao
    abstract fun notificationDao(): NotificationDao
    abstract fun expenseDao(): ExpenseDao
    abstract fun customerDao(): CustomerDao
    abstract fun supplierDao(): SupplierDao
    abstract fun shiftDao(): ShiftDao
    abstract fun quotationDao(): QuotationDao

    companion object {

        private val MIGRATION_2_3 = object : Migration(2, 3) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL(
                    """
                    CREATE TABLE IF NOT EXISTS `notified_events` (
                        `eventId` TEXT NOT NULL,
                        `channel` TEXT NOT NULL,
                        `title` TEXT NOT NULL,
                        `message` TEXT NOT NULL,
                        `route` TEXT,
                        `read` INTEGER NOT NULL DEFAULT 0,
                        `createdAt` INTEGER NOT NULL,
                        PRIMARY KEY(`eventId`)
                    )
                    """.trimIndent()
                )
                db.execSQL(
                    "CREATE INDEX IF NOT EXISTS `index_notified_events_createdAt` ON `notified_events` (`createdAt`)"
                )
                db.execSQL(
                    "CREATE INDEX IF NOT EXISTS `index_notified_events_read` ON `notified_events` (`read`)"
                )
            }
        }

        private val MIGRATION_3_4 = object : Migration(3, 4) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL(
                    """
                    CREATE TABLE IF NOT EXISTS `expenses` (
                        `id` TEXT NOT NULL,
                        `businessId` TEXT NOT NULL,
                        `category` TEXT NOT NULL,
                        `description` TEXT,
                        `amount` REAL NOT NULL,
                        `isCogs` INTEGER NOT NULL,
                        `notes` TEXT,
                        `createdAt` TEXT NOT NULL,
                        PRIMARY KEY(`id`)
                    )
                    """.trimIndent()
                )
                db.execSQL(
                    "CREATE INDEX IF NOT EXISTS `index_expenses_businessId` ON `expenses` (`businessId`)"
                )
                db.execSQL(
                    "CREATE INDEX IF NOT EXISTS `index_expenses_createdAt` ON `expenses` (`createdAt`)"
                )

                db.execSQL(
                    """
                    CREATE TABLE IF NOT EXISTS `customers` (
                        `id` TEXT NOT NULL,
                        `businessId` TEXT NOT NULL,
                        `name` TEXT NOT NULL,
                        `phone` TEXT,
                        `email` TEXT,
                        `notes` TEXT,
                        `balance` REAL NOT NULL,
                        `isActive` INTEGER NOT NULL,
                        `createdAt` TEXT NOT NULL,
                        `updatedAt` TEXT NOT NULL,
                        PRIMARY KEY(`id`)
                    )
                    """.trimIndent()
                )
                db.execSQL(
                    "CREATE INDEX IF NOT EXISTS `index_customers_businessId` ON `customers` (`businessId`)"
                )
                db.execSQL(
                    "CREATE INDEX IF NOT EXISTS `index_customers_name` ON `customers` (`name`)"
                )
            }
        }

        private val MIGRATION_4_5 = object : Migration(4, 5) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL(
                    """
                    CREATE TABLE IF NOT EXISTS `customer_payments` (
                        `id` TEXT NOT NULL,
                        `businessId` TEXT NOT NULL,
                        `customerId` TEXT NOT NULL,
                        `amount` REAL NOT NULL,
                        `paymentMethod` TEXT NOT NULL,
                        `notes` TEXT,
                        `createdAt` TEXT NOT NULL,
                        PRIMARY KEY(`id`)
                    )
                    """.trimIndent()
                )
                db.execSQL(
                    "CREATE INDEX IF NOT EXISTS `index_customer_payments_businessId` ON `customer_payments` (`businessId`)"
                )
                db.execSQL(
                    "CREATE INDEX IF NOT EXISTS `index_customer_payments_customerId` ON `customer_payments` (`customerId`)"
                )
            }
        }

        private val MIGRATION_5_6 = object : Migration(5, 6) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE products ADD COLUMN `packSize` INTEGER NOT NULL DEFAULT 1")
                db.execSQL("ALTER TABLE products ADD COLUMN `packPrice` REAL NOT NULL DEFAULT 0.0")
                db.execSQL("ALTER TABLE products ADD COLUMN `batchNumber` TEXT DEFAULT NULL")
                db.execSQL("ALTER TABLE products ADD COLUMN `expiryDate` TEXT DEFAULT NULL")

                db.execSQL("ALTER TABLE sales ADD COLUMN `discount` REAL NOT NULL DEFAULT 0.0")
                db.execSQL("ALTER TABLE sales ADD COLUMN `customerId` TEXT DEFAULT NULL")

                db.execSQL("ALTER TABLE customers ADD COLUMN `loyaltyPoints` INTEGER NOT NULL DEFAULT 0")

                db.execSQL(
                    """
                    CREATE TABLE IF NOT EXISTS `suppliers` (
                        `id` TEXT NOT NULL,
                        `businessId` TEXT NOT NULL,
                        `name` TEXT NOT NULL,
                        `phone` TEXT,
                        `email` TEXT,
                        `address` TEXT,
                        `balance` REAL NOT NULL DEFAULT 0.0,
                        `createdAt` TEXT NOT NULL,
                        PRIMARY KEY(`id`)
                    )
                    """.trimIndent()
                )
                db.execSQL("CREATE INDEX IF NOT EXISTS `index_suppliers_businessId` ON `suppliers` (`businessId`)")

                db.execSQL(
                    """
                    CREATE TABLE IF NOT EXISTS `purchase_orders` (
                        `id` TEXT NOT NULL,
                        `businessId` TEXT NOT NULL,
                        `supplierId` TEXT NOT NULL,
                        `supplierName` TEXT NOT NULL,
                        `totalAmount` REAL NOT NULL,
                        `status` TEXT NOT NULL DEFAULT 'PENDING',
                        `notes` TEXT,
                        `createdAt` TEXT NOT NULL,
                        PRIMARY KEY(`id`)
                    )
                    """.trimIndent()
                )
                db.execSQL("CREATE INDEX IF NOT EXISTS `index_purchase_orders_businessId` ON `purchase_orders` (`businessId`)")

                db.execSQL(
                    """
                    CREATE TABLE IF NOT EXISTS `cashier_shifts` (
                        `id` TEXT NOT NULL,
                        `businessId` TEXT NOT NULL,
                        `cashierName` TEXT NOT NULL,
                        `startingFloat` REAL NOT NULL,
                        `expectedCash` REAL NOT NULL DEFAULT 0.0,
                        `actualCash` REAL NOT NULL DEFAULT 0.0,
                        `status` TEXT NOT NULL DEFAULT 'OPEN',
                        `openedAt` TEXT NOT NULL,
                        `closedAt` TEXT,
                        PRIMARY KEY(`id`)
                    )
                    """.trimIndent()
                )
                db.execSQL("CREATE INDEX IF NOT EXISTS `index_cashier_shifts_businessId` ON `cashier_shifts` (`businessId`)")

                db.execSQL(
                    """
                    CREATE TABLE IF NOT EXISTS `quotations` (
                        `id` TEXT NOT NULL,
                        `businessId` TEXT NOT NULL,
                        `customerName` TEXT NOT NULL,
                        `totalAmount` REAL NOT NULL,
                        `status` TEXT NOT NULL DEFAULT 'DRAFT',
                        `createdAt` TEXT NOT NULL,
                        PRIMARY KEY(`id`)
                    )
                    """.trimIndent()
                )
                db.execSQL("CREATE INDEX IF NOT EXISTS `index_quotations_businessId` ON `quotations` (`businessId`)")
            }
        }

        @Volatile
        private var INSTANCE: AideDatabase? = null

        fun closeInstance() {
            synchronized(this) {
                INSTANCE?.close()
                INSTANCE = null
            }
        }

        fun getDatabase(context: Context): AideDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AideDatabase::class.java,
                    "aide_database"
                )
                    .addMigrations(MIGRATION_2_3, MIGRATION_3_4, MIGRATION_4_5, MIGRATION_5_6)
                    .fallbackToDestructiveMigration()
                    .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
