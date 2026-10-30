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
        CustomerPaymentEntity::class
    ],
    version = 5,
    exportSchema = false
)
abstract class AideDatabase : RoomDatabase() {

    abstract fun productDao(): ProductDao
    abstract fun categoryDao(): CategoryDao
    abstract fun saleDao(): SaleDao
    abstract fun notificationDao(): NotificationDao
    abstract fun expenseDao(): ExpenseDao
    abstract fun customerDao(): CustomerDao

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
                    .addMigrations(MIGRATION_2_3, MIGRATION_3_4, MIGRATION_4_5)
                    .fallbackToDestructiveMigration()
                    .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
