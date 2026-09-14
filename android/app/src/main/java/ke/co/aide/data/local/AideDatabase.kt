package ke.co.aide.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import ke.co.aide.data.local.dao.*
import ke.co.aide.data.local.entities.*

@Database(
    entities = [
        ProductEntity::class,
        CategoryEntity::class,
        SaleEntity::class,
        SaleItemEntity::class,
        SyncMutationEntity::class
    ],
    version = 1,
    exportSchema = false
)
abstract class AideDatabase : RoomDatabase() {

    abstract fun productDao(): ProductDao
    abstract fun categoryDao(): CategoryDao
    abstract fun saleDao(): SaleDao
    abstract fun syncMutationDao(): SyncMutationDao

    companion object {
        @Volatile
        private var INSTANCE: AideDatabase? = null

        fun getDatabase(context: Context): AideDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AideDatabase::class.java,
                    "aide_database"
                ).fallbackToDestructiveMigration().build()
                INSTANCE = instance
                instance
            }
        }
    }
}
