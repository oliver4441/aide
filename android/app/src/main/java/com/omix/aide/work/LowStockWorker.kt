package com.omix.aide.work

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.omix.aide.data.local.AideDatabase
import com.omix.aide.data.local.LocalBusinessStore
import com.omix.aide.notifications.AideChannel
import com.omix.aide.notifications.AideRoute
import com.omix.aide.notifications.NotificationEngine

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

        val ordered = low.sortedBy { it.quantity }

        // One line per product so the shade can be expanded to show exactly
        // what is running out and by how much, instead of a truncated sentence.
        val lines = ordered.map { product ->
            val unit = if (product.quantity == 1) "unit" else "units"
            "${product.name} · ${product.quantity} $unit left"
        }
        val extra = if (ordered.size > 1) " and ${ordered.size - 1} more" else ""

        NotificationEngine.emit(
            context = context,
            channel = AideChannel.INVENTORY,
            title = if (low.size == 1) "Low stock" else "${low.size} items low in stock",
            message = "${ordered.first().name}${extra} — tap to restock",
            route = AideRoute.STOCK,
            eventId = "low_stock_${NotificationEngine.dayKey()}",
            detailLines = lines,
            summaryLine = "${low.size} item${if (low.size == 1) "" else "s"} at or below the low-stock level"
        )

        return Result.success()
    }

    companion object {
        const val UNIQUE_NAME = "aide_low_stock"
    }
}
