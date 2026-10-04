package com.omix.aide.notifications

import android.content.Context
import android.os.Build
import androidx.core.app.NotificationManagerCompat
import com.omix.aide.data.local.AideDatabase
import com.omix.aide.data.local.entities.NotifiedEventEntity
import java.util.Calendar

/**
 * The single place local business events turn into notifications.
 *
 * Each notification carries an idempotency key ([eventId]). We insert it into
 * the notification log first; if it is already there we skip posting, so the
 * same event can never be shown twice (e.g. when a periodic worker runs again
 * before the stock level changes).
 */
object NotificationEngine {

    fun notificationsAllowed(context: Context): Boolean {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            val granted = androidx.core.content.ContextCompat.checkSelfPermission(
                context,
                android.Manifest.permission.POST_NOTIFICATIONS
            ) == android.content.pm.PackageManager.PERMISSION_GRANTED
            if (!granted) return false
        }
        return NotificationManagerCompat.from(context).areNotificationsEnabled()
    }

    /**
     * Records the event and posts it, unless it was already recorded.
     *
     * @return true when the notification was newly posted.
     */
    suspend fun emit(
        context: Context,
        channel: AideChannel,
        title: String,
        message: String,
        route: AideRoute? = null,
        eventId: String
    ): Boolean {
        val prefs = NotificationPrefs(context)
        if (!prefs.shouldNotify(channel)) return false

        val db = AideDatabase.getDatabase(context)
        val now = System.currentTimeMillis()

        val inserted = db.notificationDao().insertIfNew(
            NotifiedEventEntity(
                eventId = eventId,
                channel = channel.key,
                title = title,
                message = message,
                route = route?.route,
                read = false,
                createdAt = now
            )
        )

        // Insert returns -1 when the row already existed (OnConflictStrategy.IGNORE).
        if (inserted == -1L) return false

        // Keep the local log from growing without bound.
        db.notificationDao().pruneBefore(now - NINETY_DAYS_MS)

        if (notificationsAllowed(context)) {
            AideNotifications.post(
                context = context,
                channel = channel,
                title = title,
                message = message,
                route = route,
                eventId = eventId
            )
        }
        return true
    }

    /** Stable day key so a "low stock" alert fires once per day, not per check. */
    fun dayKey(now: Long = System.currentTimeMillis()): String {
        val cal = Calendar.getInstance().apply { timeInMillis = now }
        return "%04d%02d%02d".format(
            cal.get(Calendar.YEAR),
            cal.get(Calendar.MONTH) + 1,
            cal.get(Calendar.DAY_OF_MONTH)
        )
    }

    private const val NINETY_DAYS_MS = 90L * 24 * 60 * 60 * 1000
}
