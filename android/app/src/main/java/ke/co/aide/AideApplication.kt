package ke.co.aide

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import ke.co.aide.sync.WorkManagerScheduler

class AideApplication : Application() {

    override fun onCreate() {
        super.onCreate()
        createNotificationChannels()
        WorkManagerScheduler.schedulePeriodicSync(this)
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val lowStockChannel = NotificationChannel(
                LOW_STOCK_CHANNEL_ID,
                "Low Stock Alerts",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Alerts when products fall below low stock threshold"
            }

            val syncChannel = NotificationChannel(
                SYNC_CHANNEL_ID,
                "Sync Status",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Offline data synchronization status"
            }

            val notificationManager = getSystemService(NotificationManager::class.java)
            notificationManager?.createNotificationChannels(listOf(lowStockChannel, syncChannel))
        }
    }

    companion object {
        const val LOW_STOCK_CHANNEL_ID = "low_stock_channel"
        const val SYNC_CHANNEL_ID = "sync_channel"
    }
}
