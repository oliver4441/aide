package com.omix.aide.work

import android.content.Context
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import java.util.Calendar
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
     * Daily summary, first run at the next 18:00 local time.
     *
     * Periodic work cannot be pinned to a wall-clock time, so we delay the first
     * run until the evening and repeat every 24 hours from there.
     */
    fun scheduleDailySummary(context: Context) {
        val now = Calendar.getInstance()
        val next = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, 18)
            set(Calendar.MINUTE, 0)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
            if (before(now)) add(Calendar.DAY_OF_YEAR, 1)
        }
        val delayMs = next.timeInMillis - now.timeInMillis

        val request = PeriodicWorkRequestBuilder<DailySummaryWorker>(24, TimeUnit.HOURS)
            .setInitialDelay(delayMs, TimeUnit.MILLISECONDS)
            .build()

        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
            DailySummaryWorker.UNIQUE_NAME,
            ExistingPeriodicWorkPolicy.UPDATE,
            request
        )
    }

    fun scheduleAll(context: Context) {
        scheduleLowStock(context)
        scheduleDailySummary(context)
    }

    fun cancelAll(context: Context) {
        WorkManager.getInstance(context).apply {
            cancelUniqueWork(LowStockWorker.UNIQUE_NAME)
            cancelUniqueWork(DailySummaryWorker.UNIQUE_NAME)
        }
    }
}
