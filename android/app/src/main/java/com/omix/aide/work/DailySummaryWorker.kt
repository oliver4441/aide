package com.omix.aide.work

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.omix.aide.data.local.AideDatabase
import com.omix.aide.data.local.LocalBusinessStore
import com.omix.aide.notifications.AideChannel
import com.omix.aide.notifications.AideRoute
import com.omix.aide.notifications.NotificationEngine
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/**
 * End-of-day summary built from the sales already stored on the device.
 *
 * Offline-only: reads Room, sums today's sales, and posts one summary
 * notification keyed to the date so it cannot repeat.
 *
 * Sales are stored as UTC ISO-8601 strings (see SaleRepository), so "today"
 * means local midnight converted to that same UTC form.
 */
class DailySummaryWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        val context = applicationContext
        val businessId = LocalBusinessStore(context).getBusinessId()
        val db = AideDatabase.getDatabase(context)

        val today = db.saleDao().getSalesSince(businessId, startOfTodayIso())

        if (today.isEmpty()) {
            NotificationEngine.emit(
                context = context,
                channel = AideChannel.REPORTS,
                title = "No sales recorded today",
                message = "Nothing has been rung up yet. Open Aide to add today's sales before you close.",
                route = AideRoute.SELL,
                eventId = "daily_zero_${NotificationEngine.dayKey()}"
            )
            return Result.success()
        }

        val total = today.sumOf { it.total }
        val profit = today.sumOf { it.profit }

        NotificationEngine.emit(
            context = context,
            channel = AideChannel.REPORTS,
            title = "Today's summary",
            message = "${today.size} sale${if (today.size == 1) "" else "s"} · " +
                "KSh ${formatAmount(total)} revenue · KSh ${formatAmount(profit)} profit",
            route = AideRoute.DASHBOARD,
            eventId = "daily_summary_${NotificationEngine.dayKey()}"
        )

        return Result.success()
    }

    /** Local midnight, expressed in the UTC form sales are stored in. */
    private fun startOfTodayIso(): String {
        val localMidnight = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, 0)
            set(Calendar.MINUTE, 0)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }

        return SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
            .apply { timeZone = TimeZone.getTimeZone("UTC") }
            .format(Date(localMidnight.timeInMillis))
    }

    private fun formatAmount(value: Double): String =
        String.format(Locale.US, "%,.2f", value)

    companion object {
        const val UNIQUE_NAME = "aide_daily_summary"
    }
}
