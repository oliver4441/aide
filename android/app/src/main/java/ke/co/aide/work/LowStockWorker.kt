package ke.co.aide.work

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import ke.co.aide.data.local.AideDatabase
import ke.co.aide.data.local.LocalBusinessStore
import ke.co.aide.notifications.AideChannel
import ke.co.aide.notifications.AideRoute
import ke.co.aide.notifications.NotificationEngine

/**
 * Checks local stock levels and raises one alert per day when anything is low.
 *
 * Runs entirely on-device against Room, so it works with no internet
 * connection. The day key in the event id means the alert fires once a day
 * rather than on every periodic run.
 */
class LowStockWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        val context = applicationContext
        val businessId = LocalBusinessStore(context).getBusinessId()
        val db = AideDatabase.getDatabase(context)

        val low = db.productDao().getLowStockProductsOnce(businessId)

        if (low.isEmpty()) {
            // Nothing to report today; clear the flag so tomorrow can alert again.
            return Result.success()
        }

        val preview = low.take(3).joinToString(", ") { "${it.name} (${it.quantity})" }
        val extra = if (low.size > 3) " +${low.size - 3} more" else ""

        NotificationEngine.emit(
            context = context,
            channel = AideChannel.INVENTORY,
            title = if (low.size == 1) "Low stock" else "${low.size} items low in stock",
            message = "$preview$extra",
            route = AideRoute.STOCK,
            eventId = "low_stock_${NotificationEngine.dayKey()}"
        )

        return Result.success()
    }

    companion object {
        const val UNIQUE_NAME = "aide_low_stock"
    }
}
