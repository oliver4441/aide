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
        NotifiedEventEntity::class
    ],
    version = 3,
    exportSchema = false
)
abstract class AideDatabase : RoomDatabase() {

    abstract fun productDao(): ProductDao
    abstract fun categoryDao(): CategoryDao
    abstract fun saleDao(): SaleDao
    abstract fun notificationDao(): NotificationDao

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

        @Volatile
        private var INSTANCE: AideDatabase? = null

        fun getDatabase(context: Context): AideDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AideDatabase::class.java,
                    "aide_database"
                )
                    .addMigrations(MIGRATION_2_3)
                    .fallbackToDestructiveMigration()
                    .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
