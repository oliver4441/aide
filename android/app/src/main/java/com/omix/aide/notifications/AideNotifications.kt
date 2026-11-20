package com.omix.aide.notifications

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.app.PendingIntent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.omix.aide.MainActivity
import com.omix.aide.R

/**
 * Android notification channels. The user can control each of these
 * independently from Android's own notification settings.
 */
enum class AideChannel(
    val id: String,
    val title: String,
    val description: String
) {
    ORDERS("aide_orders", "Orders", "Completed sales and refunds"),
    INVENTORY("aide_inventory", "Inventory", "Low stock, out of stock and stock adjustments"),
    PAYMENTS("aide_payments", "Payments", "Payments received"),
    CUSTOMERS("aide_customers", "Customers", "New customers and customer activity"),
    REPORTS("aide_reports", "Reports", "Daily and weekly business summaries"),
    SYSTEM("aide_system", "System", "Backups, sync and account alerts");

    /** Channel key used in the notification log and in preferences. */
    val key: String get() = name.lowercase()

    companion object {
        fun fromKey(key: String): AideChannel =
            entries.firstOrNull { it.key == key } ?: SYSTEM
    }
}

/** Deep-link destinations a notification can open. */
enum class AideRoute(val route: String, val screen: String) {
    DASHBOARD("dashboard", "home"),
    SELL("sell", "sell"),
    STOCK("stock", "stock"),
    MORE("more", "more");

    companion object {
        fun fromRoute(route: String?): AideRoute? {
            if (route == null) return null
            return entries.firstOrNull { it.route == route }
        }
    }
}

/**
 * Builds and posts native Android notifications.
 *
 * Delivery is deliberately channel-independent: these are created on the device
 * from local data, so they work with no internet connection and do not depend
 * on FCM. When remote delivery is added later, the same [post] entry point can
 * be called from an FCM service.
 */
object AideNotifications {

    const val EXTRA_ROUTE = "aide_route"
    const val EXTRA_EVENT_ID = "aide_event_id"

    /** Channels are idempotent; call this on every app start. */
    fun ensureChannels(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return

        val manager = context.getSystemService(NotificationManager::class.java) ?: return
        AideChannel.entries.forEach { channel ->
            val existing = manager.getNotificationChannel(channel.id)
            if (existing == null) {
                val created = NotificationChannel(
                    channel.id,
                    channel.title,
                    NotificationManager.IMPORTANCE_DEFAULT
                ).apply {
                    description = channel.description
                    enableVibration(true)
                }
                manager.createNotificationChannel(created)
            }
        }
    }

    /**
     * Posts one notification.
     *
     * [eventId] is an idempotency key. Callers insert it into the notification
     * log first and only post when the insert is new, so the same business event
     * is never shown twice.
     */
    fun post(
        context: Context,
        channel: AideChannel,
        title: String,
        message: String,
        route: AideRoute? = null,
        eventId: String
    ) {
        if (!NotificationManagerCompat.from(context).areNotificationsEnabled()) return

        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra(EXTRA_ROUTE, route?.route)
            putExtra(EXTRA_EVENT_ID, eventId)
        }

        val pendingIntent = PendingIntent.getActivity(
            context,
            eventId.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(context, channel.id)
            .setSmallIcon(R.drawable.ic_stat_aide)
            .setContentTitle(title)
            .setContentText(message)
            .setStyle(NotificationCompat.BigTextStyle().bigText(message))
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .setWhen(System.currentTimeMillis())
            .build()

        try {
            NotificationManagerCompat.from(context).notify(eventId.hashCode(), notification)
        } catch (_: SecurityException) {
            // POST_NOTIFICATIONS not granted — nothing to show.
        }
    }
}
