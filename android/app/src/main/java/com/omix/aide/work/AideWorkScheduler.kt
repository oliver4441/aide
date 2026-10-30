package com.omix.aide.work

import android.content.Context
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import com.omix.aide.data.local.SettingsStore
import java.util.concurrent.TimeUnit

/**
 * Schedules Aide's on-device background checks.
 *
 * All of these run locally against Room and need no network, which is the point
 * for an offline-first app. WorkManager will run them opportunistically,
 * respecting battery optimisations and Doze.
 */
object AideWorkScheduler {

    /** Check stock levels a few times a day. */
    fun scheduleLowStock(context: Context) {
        val request = PeriodicWorkRequestBuilder<LowStockWorker>(6, TimeUnit.HOURS)
            .setConstraints(
                Constraints.Builder()
                    .setRequiresBatteryNotLow(true)
                    .build()
            )
            .build()

        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
            LowStockWorker.UNIQUE_NAME,
            ExistingPeriodicWorkPolicy.KEEP,
            request
        )
    }

    /**
     * Daily summary, first run at the next [hour]:[minute] local time.
     *
     * Periodic work cannot be pinned to a wall-clock time, so we delay the first
     * run until the shop's chosen closing time and repeat every 24 hours from
     * there. Settings calls this again with the new time whenever the owner
     * moves the summary, so the change takes effect without a reinstall.
     */
    fun scheduleDailySummary(context: Context, hour: Int, minute: Int) {
        val delayMs = SummarySchedule.delayFrom(System.currentTimeMillis(), hour, minute)

        val request = PeriodicWorkRequestBuilder<DailySummaryWorker>(24, TimeUnit.HOURS)
            .setInitialDelay(delayMs, TimeUnit.MILLISECONDS)
            .build()

        // CANCEL_AND_REENQUEUE rather than UPDATE: UPDATE keeps the existing
        // schedule, so moving the summary from 18:00 to 21:00 would not take
        // effect until the old request happened to fire. Replacing the request
        // is what actually moves the time.
        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
            DailySummaryWorker.UNIQUE_NAME,
            ExistingPeriodicWorkPolicy.CANCEL_AND_REENQUEUE,
            request
        )
    }

    fun scheduleAll(context: Context) {
        val settings = SettingsStore.read(context)
        scheduleLowStock(context)
        scheduleDailySummary(context, settings.summaryHour, settings.summaryMinute)
    }

    fun cancelAll(context: Context) {
        WorkManager.getInstance(context).apply {
            cancelUniqueWork(LowStockWorker.UNIQUE_NAME)
            cancelUniqueWork(DailySummaryWorker.UNIQUE_NAME)
        }
    }
}
