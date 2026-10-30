package com.omix.aide.notifications

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.ContentResolver
import android.content.Context
import android.content.Intent
import android.app.PendingIntent
import android.media.AudioAttributes
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.omix.aide.MainActivity
import com.omix.aide.R
import com.omix.aide.data.local.SettingsStore

/**
 * Android notification channels. The user can control each of these
 * independently from Android's own notification settings.
 */
enum class AideChannel(
    val id: String,
    val title: String,
    val description: String,
    /**
     * True when the APK actually raises this kind of alert today.
     *
     * The others exist as Android channels so the system settings screen and
     * the notification log have a stable vocabulary, but nothing emits them on
     * this client — they are for the cloud client's events, if it ever posts
     * here. Showing them as switches would promise alerts that never arrive.
     */
    val onDevice: Boolean = false
) {
    ORDERS("aide_orders", "Orders", "Completed sales and refunds"),
    INVENTORY(
        "aide_inventory",
        "Inventory",
        "Low stock, out of stock and stock adjustments",
        onDevice = true
    ),
    PAYMENTS("aide_payments", "Payments", "Payments received"),
    CUSTOMERS("aide_customers", "Customers", "New customers and customer activity"),
    REPORTS(
        "aide_reports",
        "Reports",
        "Daily and weekly business summaries",
        onDevice = true
    ),
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

    /** Suffix used when the user has turned sound effects off. */
    private const val SILENT_SUFFIX = "_silent"

    /**
     * A channel only ever exists in the variant that matches the current sound
     * setting: Android freezes a channel's sound at creation, so switching
     * chimes has to mean switching channels.
     */
    fun channelId(context: Context, channel: AideChannel): String =
        if (SettingsStore.read(context).soundsEnabled) channel.id else channel.id + SILENT_SUFFIX

    private fun soundUri(context: Context, resId: Int): Uri = Uri.parse(
        "${ContentResolver.SCHEME_ANDROID_RESOURCE}://${context.packageName}/$resId"
    )

    /**
     * Channels are idempotent; call this on every app start, and again whenever
     * the sound setting or a channel's sound changes.
     */
    fun ensureChannels(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return

        val manager = context.getSystemService(NotificationManager::class.java) ?: return
        val soundsEnabled = SettingsStore.read(context).soundsEnabled
        val prefs = NotificationPrefs(context)
        val scheme = if (soundsEnabled) "sound" else "silent"

        // A channel's sound is fixed at creation, so a change of scheme means
        // replacing the whole set. Only do that when the answer actually
        // changed, otherwise every launch would discard the user's tuning.
        if (prefs.appliedChannelScheme() != scheme) {
            AideChannel.entries.forEach { channel ->
                manager.deleteNotificationChannel(channel.id)
                manager.deleteNotificationChannel(channel.id + SILENT_SUFFIX)
            }
            prefs.setAppliedChannelScheme(scheme)
        }

        AideChannel.entries.forEach { channel ->
            val activeId = channelId(context, channel)
            val staleId = if (soundsEnabled) channel.id + SILENT_SUFFIX else channel.id

            // Drop the variant that no longer applies so the system settings
            // screen does not show two copies of every channel.
            if (manager.getNotificationChannel(staleId) != null) {
                manager.deleteNotificationChannel(staleId)
            }

            if (manager.getNotificationChannel(activeId) == null) {
                val created = NotificationChannel(
                    activeId,
                    channel.title,
                    NotificationManager.IMPORTANCE_DEFAULT
                ).apply {
                    description = channel.description
                    enableVibration(true)
                    val chime = if (soundsEnabled) AideSounds.soundFor(channel) else null
                    if (chime != null) {
                        setSound(
                            soundUri(context, chime),
                            AudioAttributes.Builder()
                                .setUsage(AudioAttributes.USAGE_NOTIFICATION_EVENT)
                                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                                .build()
                        )
                    } else {
                        setSound(null, null)
                    }
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
     *
     * [detailLines] turn the notification into an expandable card: the shade
     * shows one line per item (a product and its remaining stock, or each figure
     * of the day's takings) instead of a single truncated sentence.
     */
    fun post(
        context: Context,
        channel: AideChannel,
        title: String,
        message: String,
        route: AideRoute? = null,
        eventId: String,
        detailLines: List<String> = emptyList(),
        summaryLine: String? = null
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

        // Inbox line count is capped by the platform (six on most builds); keep
        // the tail as a summary so nothing is silently dropped.
        val lines = detailLines.take(6)
        val overflow = detailLines.size - lines.size
        val summary = summaryLine ?: if (overflow > 0) "+$overflow more" else null

        val builder = NotificationCompat.Builder(context, channelId(context, channel))
            .setSmallIcon(R.drawable.ic_stat_aide)
            .setContentTitle(title)
            .setContentText(message)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .setWhen(System.currentTimeMillis())

        // The explicit type keeps inference from widening `apply`'s receiver to
        // NotificationCompat.Style, which has neither addLine nor setSummaryText.
        val style: NotificationCompat.Style = if (lines.isNotEmpty()) {
            NotificationCompat.InboxStyle().apply {
                setBigContentTitle(title)
                lines.forEach { addLine(it) }
                summary?.let { setSummaryText(it) }
            }
        } else {
            NotificationCompat.BigTextStyle().bigText(message)
        }
        builder.setStyle(style)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            builder.setChannelId(channelId(context, channel))
        } else {
            // Pre-O there are no channels, so the sound is per notification.
            val chime = if (SettingsStore.read(context).soundsEnabled) {
                AideSounds.soundFor(channel)
            } else {
                null
            }
            if (chime != null) builder.setSound(soundUri(context, chime))
        }

        val notification = builder.build()

        try {
            NotificationManagerCompat.from(context).notify(eventId.hashCode(), notification)
        } catch (_: SecurityException) {
            // POST_NOTIFICATIONS not granted — nothing to show.
        }
    }
}
