package com.omix.aide.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase
import com.omix.aide.data.local.dao.*
import com.omix.aide.data.local.entities.*

private fun SupportSQLiteDatabase.tableExists(table: String): Boolean {
    val cursor = query(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?",
        arrayOf(table)
    )
    return try {
        cursor.moveToFirst()
    } finally {
        cursor.close()
    }
}

/** Idempotent column add: upgrading an already-migrated file must not fail. */
private fun SupportSQLiteDatabase.addColumnIfMissing(table: String, column: String, definition: String) {
    val cursor = query("PRAGMA table_info(`$table`)", emptyArray<Any>())
    var exists = false
    try {
        val nameIndex = cursor.getColumnIndex("name")
        while (cursor.moveToNext()) {
            if (cursor.getString(nameIndex) == column) {
                exists = true
                break
            }
        }
    } finally {
        cursor.close()
    }
    if (!exists) execSQL("ALTER TABLE `$table` ADD COLUMN `$column` $definition")
}

@Database(
    entities = [
        ProductEntity::class,
        CategoryEntity::class,
        SaleEntity::class,
        SaleItemEntity::class,
        NotifiedEventEntity::class,
        ExpenseEntity::class,
        CustomerEntity::class,
        OrganizationEntity::class,
        LocationEntity::class
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

    companion object {

        /**
         * Adds the notification log.
         *
         * Written as an explicit migration rather than relying on
         * `fallbackToDestructiveMigration`, so updating the app does not wipe a
         * shop's products and sales history.
         */
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

        /**
         * Adds the expense log and the customer directory.
         */
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

        /**
         * Adds Organization and Location tables.
         * Guards legacy `businesses` table operations because Android stores the
         * single local business in SharedPreferences rather than a Room table.
         */
        private val MIGRATION_4_5 = object : Migration(4, 5) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL(
                    """
                    CREATE TABLE IF NOT EXISTS `organizations` (
                        `id` TEXT NOT NULL,
                        `name` TEXT NOT NULL,
                        `slug` TEXT NOT NULL,
                        `currency` TEXT NOT NULL,
                        `createdAt` TEXT NOT NULL,
                        `updatedAt` TEXT NOT NULL,
                        PRIMARY KEY(`id`)
                    )
                    """.trimIndent()
                )
                db.execSQL(
                    "CREATE INDEX IF NOT EXISTS `index_organizations_name` ON `organizations` (`name`)"
                )

                db.execSQL(
                    """
                    CREATE TABLE IF NOT EXISTS `locations` (
                        `id` TEXT NOT NULL,
                        `organizationId` TEXT NOT NULL,
                        `name` TEXT NOT NULL,
                        `address` TEXT,
                        `phone` TEXT,
                        `isActive` INTEGER NOT NULL,
                        `createdAt` TEXT NOT NULL,
                        `updatedAt` TEXT NOT NULL,
                        PRIMARY KEY(`id`)
                    )
                    """.trimIndent()
                )
                db.execSQL(
                    "CREATE INDEX IF NOT EXISTS `index_locations_organizationId` ON `locations` (`organizationId`)"
                )
                db.execSQL(
                    "CREATE INDEX IF NOT EXISTS `index_locations_name` ON `locations` (`name`)"
                )

                if (db.tableExists("businesses")) {
                    db.addColumnIfMissing("businesses", "organizationId", "TEXT")
                    db.addColumnIfMissing("businesses", "locationId", "TEXT")
                    db.execSQL("CREATE INDEX IF NOT EXISTS `index_businesses_organizationId` ON `businesses` (`organizationId`)")
                    db.execSQL("CREATE INDEX IF NOT EXISTS `index_businesses_locationId` ON `businesses` (`locationId`)")

                    db.execSQL(
                        """
                        INSERT OR IGNORE INTO `organizations` (`id`, `name`, `slug`, `currency`, `createdAt`, `updatedAt`)
                        SELECT
                            `id` || '_org',
                            `name` || ' Organization',
                            LOWER(`slug`) || '-org',
                            `currency`,
                            `createdAt`,
                            `updatedAt`
                        FROM `businesses`
                        WHERE `organizationId` IS NULL
                        """.trimIndent()
                    )

                    db.execSQL(
                        """
                        INSERT OR IGNORE INTO `locations` (`id`, `organizationId`, `name`, `isActive`, `createdAt`, `updatedAt`)
                        SELECT
                            `id` || '_loc',
                            `id` || '_org',
                            `name` || ' Main',
                            1,
                            `createdAt`,
                            `updatedAt`
                        FROM `businesses`
                        WHERE `locationId` IS NULL
                        """.trimIndent()
                    )

                    db.execSQL(
                        """
                        UPDATE `businesses`
                        SET `organizationId` = `id` || '_org', `locationId` = `id` || '_loc'
                        WHERE `organizationId` IS NULL OR `locationId` IS NULL
                        """.trimIndent()
                    )
                }
            }
        }

        /**
         * Decimal migration: change monetary columns from REAL to INTEGER (scaled by 10000).
         */
        private val MIGRATION_5_6 = object : Migration(5, 6) {
            override fun migrate(db: SupportSQLiteDatabase) {
                // ===== PRODUCTS =====
                db.execSQL("ALTER TABLE `products` ADD COLUMN `buyingPrice_scaled` INTEGER")
                db.execSQL("ALTER TABLE `products` ADD COLUMN `sellingPrice_scaled` INTEGER")
                db.execSQL(
                    """
                    UPDATE `products` SET
                        `buyingPrice_scaled` = CAST(COALESCE(ROUND(`buyingPrice` * 10000), 0) AS INTEGER),
                        `sellingPrice_scaled` = CAST(COALESCE(ROUND(`sellingPrice` * 10000), 0) AS INTEGER)
                    """.trimIndent()
                )
                db.execSQL(
                    """
                    CREATE TABLE `products_new` (
                        `id` TEXT NOT NULL,
                        `businessId` TEXT NOT NULL,
                        `categoryId` TEXT,
                        `name` TEXT NOT NULL,
                        `sku` TEXT,
                        `buyingPrice` INTEGER NOT NULL,
                        `sellingPrice` INTEGER NOT NULL,
                        `quantity` INTEGER NOT NULL,
                        `lowStock` INTEGER NOT NULL,
                        `isService` INTEGER NOT NULL,
                        `imageUrl` TEXT,
                        `isActive` INTEGER NOT NULL,
                        `createdAt` TEXT NOT NULL,
                        `updatedAt` TEXT NOT NULL,
                        PRIMARY KEY(`id`)
                    )
                    """.trimIndent()
                )
                db.execSQL(
                    """
                    INSERT INTO `products_new` (`id`, `businessId`, `categoryId`, `name`, `sku`, `buyingPrice`, `sellingPrice`, `quantity`, `lowStock`, `isService`, `imageUrl`, `isActive`, `createdAt`, `updatedAt`)
                    SELECT `id`, `businessId`, `categoryId`, `name`, `sku`, `buyingPrice_scaled`, `sellingPrice_scaled`, `quantity`, `lowStock`, `isService`, `imageUrl`, `isActive`, `createdAt`, `updatedAt` FROM `products`
                    """.trimIndent()
                )
                db.execSQL("DROP TABLE `products`")
                db.execSQL("ALTER TABLE `products_new` RENAME TO `products`")

                // ===== SALES =====
                db.execSQL("ALTER TABLE `sales` ADD COLUMN `total_scaled` INTEGER")
                db.execSQL("ALTER TABLE `sales` ADD COLUMN `cost_scaled` INTEGER")
                db.execSQL("ALTER TABLE `sales` ADD COLUMN `profit_scaled` INTEGER")
                db.execSQL("ALTER TABLE `sales` ADD COLUMN `paid_scaled` INTEGER")
                db.execSQL("ALTER TABLE `sales` ADD COLUMN `change_scaled` INTEGER")
                db.execSQL("ALTER TABLE `sales` ADD COLUMN `tax_scaled` INTEGER")
                db.execSQL("ALTER TABLE `sales` ADD COLUMN `taxRate_scaled` INTEGER")
                db.execSQL(
                    """
                    UPDATE `sales` SET
                        `total_scaled` = CAST(COALESCE(ROUND(`total` * 10000), 0) AS INTEGER),
                        `cost_scaled` = CAST(COALESCE(ROUND(`cost` * 10000), 0) AS INTEGER),
                        `profit_scaled` = CAST(COALESCE(ROUND(`profit` * 10000), 0) AS INTEGER),
                        `paid_scaled` = CAST(COALESCE(ROUND(`paid` * 10000), 0) AS INTEGER),
                        `change_scaled` = CAST(COALESCE(ROUND(`change` * 10000), 0) AS INTEGER),
                        `tax_scaled` = CAST(COALESCE(ROUND(`tax` * 10000), 0) AS INTEGER),
                        `taxRate_scaled` = CAST(COALESCE(ROUND(`taxRate` * 10000), 0) AS INTEGER)
                    """.trimIndent()
                )
                db.execSQL(
                    """
                    CREATE TABLE `sales_new` (
                        `id` TEXT NOT NULL,
                        `businessId` TEXT NOT NULL,
                        `total` INTEGER NOT NULL,
                        `cost` INTEGER NOT NULL,
                        `profit` INTEGER NOT NULL,
                        `paid` INTEGER NOT NULL,
                        `change` INTEGER NOT NULL,
                        `tax` INTEGER NOT NULL,
                        `taxRate` INTEGER NOT NULL,
                        `cashier` TEXT,
                        `paymentMethod` TEXT NOT NULL,
                        `notes` TEXT,
                        `createdAt` TEXT NOT NULL,
                        PRIMARY KEY(`id`)
                    )
                    """.trimIndent()
                )
                db.execSQL(
                    """
                    INSERT INTO `sales_new` (`id`, `businessId`, `total`, `cost`, `profit`, `paid`, `change`, `tax`, `taxRate`, `cashier`, `paymentMethod`, `notes`, `createdAt`)
                    SELECT `id`, `businessId`, `total_scaled`, `cost_scaled`, `profit_scaled`, `paid_scaled`, `change_scaled`, `tax_scaled`, `taxRate_scaled`, `cashier`, `paymentMethod`, `notes`, `createdAt` FROM `sales`
                    """.trimIndent()
                )
                db.execSQL("DROP TABLE `sales`")
                db.execSQL("ALTER TABLE `sales_new` RENAME TO `sales`")

                // ===== SALE_ITEMS =====
                db.execSQL("ALTER TABLE `sale_items` ADD COLUMN `price_scaled` INTEGER")
                db.execSQL("ALTER TABLE `sale_items` ADD COLUMN `cost_scaled` INTEGER")
                db.execSQL(
                    """
                    UPDATE `sale_items` SET
                        `price_scaled` = CAST(COALESCE(ROUND(`price` * 10000), 0) AS INTEGER),
                        `cost_scaled` = CAST(COALESCE(ROUND(`cost` * 10000), 0) AS INTEGER)
                    """.trimIndent()
                )
                db.execSQL(
                    """
                    CREATE TABLE `sale_items_new` (
                        `id` TEXT NOT NULL,
                        `saleId` TEXT NOT NULL,
                        `productId` TEXT,
                        `name` TEXT NOT NULL,
                        `quantity` INTEGER NOT NULL,
                        `price` INTEGER NOT NULL,
                        `cost` INTEGER NOT NULL,
                        PRIMARY KEY(`id`)
                    )
                    """.trimIndent()
                )
                db.execSQL(
                    """
                    INSERT INTO `sale_items_new` (`id`, `saleId`, `productId`, `name`, `quantity`, `price`, `cost`)
                    SELECT `id`, `saleId`, `productId`, `name`, `quantity`, `price_scaled`, `cost_scaled` FROM `sale_items`
                    """.trimIndent()
                )
                db.execSQL("DROP TABLE `sale_items`")
                db.execSQL("ALTER TABLE `sale_items_new` RENAME TO `sale_items`")

                // ===== EXPENSES =====
                db.execSQL("ALTER TABLE `expenses` ADD COLUMN `amount_scaled` INTEGER")
                db.execSQL("UPDATE `expenses` SET `amount_scaled` = CAST(COALESCE(ROUND(`amount` * 10000), 0) AS INTEGER)")
                db.execSQL(
                    """
                    CREATE TABLE `expenses_new` (
                        `id` TEXT NOT NULL,
                        `businessId` TEXT NOT NULL,
                        `category` TEXT NOT NULL,
                        `description` TEXT,
                        `amount` INTEGER NOT NULL,
                        `isCogs` INTEGER NOT NULL,
                        `notes` TEXT,
                        `createdAt` TEXT NOT NULL,
                        PRIMARY KEY(`id`)
                    )
                    """.trimIndent()
                )
                db.execSQL(
                    """
                    INSERT INTO `expenses_new` (`id`, `businessId`, `category`, `description`, `amount`, `isCogs`, `notes`, `createdAt`)
                    SELECT `id`, `businessId`, `category`, `description`, `amount_scaled`, `isCogs`, `notes`, `createdAt` FROM `expenses`
                    """.trimIndent()
                )
                db.execSQL("DROP TABLE `expenses`")
                db.execSQL("ALTER TABLE `expenses_new` RENAME TO `expenses`")
                db.execSQL("CREATE INDEX IF NOT EXISTS `index_expenses_businessId` ON `expenses` (`businessId`)")
                db.execSQL("CREATE INDEX IF NOT EXISTS `index_expenses_createdAt` ON `expenses` (`createdAt`)")

                // ===== CUSTOMERS =====
                db.execSQL("ALTER TABLE `customers` ADD COLUMN `balance_scaled` INTEGER")
                db.execSQL("UPDATE `customers` SET `balance_scaled` = CAST(COALESCE(ROUND(`balance` * 10000), 0) AS INTEGER)")
                db.execSQL(
                    """
                    CREATE TABLE `customers_new` (
                        `id` TEXT NOT NULL,
                        `businessId` TEXT NOT NULL,
                        `name` TEXT NOT NULL,
                        `phone` TEXT,
                        `email` TEXT,
                        `notes` TEXT,
                        `balance` INTEGER NOT NULL,
                        `isActive` INTEGER NOT NULL,
                        `createdAt` TEXT NOT NULL,
                        `updatedAt` TEXT NOT NULL,
                        PRIMARY KEY(`id`)
                    )
                    """.trimIndent()
                )
                db.execSQL(
                    """
                    INSERT INTO `customers_new` (`id`, `businessId`, `name`, `phone`, `email`, `notes`, `balance`, `isActive`, `createdAt`, `updatedAt`)
                    SELECT `id`, `businessId`, `name`, `phone`, `email`, `notes`, `balance_scaled`, `isActive`, `createdAt`, `updatedAt` FROM `customers`
                    """.trimIndent()
                )
                db.execSQL("DROP TABLE `customers`")
                db.execSQL("ALTER TABLE `customers_new` RENAME TO `customers`")
                db.execSQL("CREATE INDEX IF NOT EXISTS `index_customers_businessId` ON `customers` (`businessId`)")
                db.execSQL("CREATE INDEX IF NOT EXISTS `index_customers_name` ON `customers` (`name`)")

                // ===== BUSINESSES (if legacy table exists) =====
                if (db.tableExists("businesses")) {
                    db.execSQL("ALTER TABLE `businesses` ADD COLUMN `taxRate_scaled` INTEGER")
                    db.execSQL("UPDATE `businesses` SET `taxRate_scaled` = CAST(COALESCE(ROUND(`taxRate` * 10000), 0) AS INTEGER)")
                    db.execSQL(
                        """
                        CREATE TABLE `businesses_new` (
                            `id` TEXT NOT NULL,
                            `name` TEXT NOT NULL,
                            `type` TEXT NOT NULL,
                            `slug` TEXT NOT NULL,
                            `currency` TEXT NOT NULL,
                            `taxRate` INTEGER NOT NULL,
                            `receiptFooter` TEXT,
                            `logoUrl` TEXT,
                            `organizationId` TEXT,
                            `locationId` TEXT,
                            `createdAt` TEXT NOT NULL,
                            `updatedAt` TEXT NOT NULL,
                            PRIMARY KEY(`id`),
                            FOREIGN KEY(`organizationId`) REFERENCES `organizations`(`id`) ON UPDATE NO ACTION ON DELETE SET NULL,
                            FOREIGN KEY(`locationId`) REFERENCES `locations`(`id`) ON UPDATE NO ACTION ON DELETE SET NULL
                        )
                        """.trimIndent()
                    )
                    db.execSQL(
                        """
                        INSERT INTO `businesses_new` (`id`, `name`, `type`, `slug`, `currency`, `taxRate`, `receiptFooter`, `logoUrl`, `organizationId`, `locationId`, `createdAt`, `updatedAt`)
                        SELECT `id`, `name`, `type`, `slug`, `currency`, `taxRate_scaled`, `receiptFooter`, `logoUrl`, `organizationId`, `locationId`, `createdAt`, `updatedAt` FROM `businesses`
                        """.trimIndent()
                    )
                    db.execSQL("DROP TABLE `businesses`")
                    db.execSQL("ALTER TABLE `businesses_new` RENAME TO `businesses`")
                    db.execSQL("CREATE INDEX IF NOT EXISTS `index_businesses_organizationId` ON `businesses` (`organizationId`)")
                    db.execSQL("CREATE INDEX IF NOT EXISTS `index_businesses_locationId` ON `businesses` (`locationId`)")
                }
            }
        }

        @Volatile
        private var INSTANCE: AideDatabase? = null

        fun buildDatabase(context: Context, name: String): AideDatabase =
            Room.databaseBuilder(
                context.applicationContext,
                AideDatabase::class.java,
                name
            )
                .addMigrations(MIGRATION_2_3, MIGRATION_3_4, MIGRATION_4_5, MIGRATION_5_6)
                .build()

        fun getDatabase(context: Context): AideDatabase {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: buildDatabase(context, "aide_database").also { INSTANCE = it }
            }
        }

        fun closeInstance() {
            synchronized(this) {
                INSTANCE?.close()
                INSTANCE = null
            }
        }
    }
}
