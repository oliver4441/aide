package com.omix.aide.ui.releases

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.omix.aide.BuildConfig
import com.omix.aide.data.local.LocalBusinessStore
import com.omix.aide.notifications.AideChannel
import com.omix.aide.notifications.NotificationEngine
import com.omix.aide.work.AideWorkScheduler
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/**
 * Broadcast receiver that fires on boot and after an app update, and checks
 * whether a newer published release is available. If so, it records the
 * out-of-date state and posts a system notification so the user can download
 * the new version.
 *
 * The check is cheap and idempotent: we only alert when the installed
 * version code is strictly older than the latest published one. The user can
 * dismiss the banner once, and the preference persists until a new release is
 * published.
 */
class ReleaseReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val installedCode = BuildConfig.VERSION_CODE
        val latestCode = BuildConfig.LATEST_VERSION_CODE

        // No published release known to this build → nothing to alert about.
        if (latestCode <= 0) return

        // Nothing new → silently exit.
        if (installedCode >= latestCode) return

        val appContext = context.applicationContext

        // This device is behind the latest release. Record the "out of date"
        // state and surface it to the user.
        LocalBusinessStore(appContext).markOutOfDate()

        // Schedule the local background workers (low stock + daily summary).
        AideWorkScheduler.scheduleAll(appContext)

        // emit() is suspending, so hand off to a coroutine and keep the
        // receiver alive until the notification has actually been posted.
        val pendingResult = goAsync()
        CoroutineScope(Dispatchers.IO).launch {
            try {
                NotificationEngine.emit(
                    context = appContext,
                    channel = AideChannel.SYSTEM,
                    title = "New release available",
                    message = "You're on Aide ${BuildConfig.VERSION_NAME}. " +
                        "A newer version includes bug fixes and new features.",
                    route = null,
                    eventId = "aide_release_${installedCode}_${latestCode}"
                )
            } finally {
                pendingResult.finish()
            }
        }
    }
}