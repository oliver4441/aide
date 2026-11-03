package com.omix.aide.ui.releases

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.omix.aide.notifications.NotificationPrefs
import com.omix.aide.work.AideWorkScheduler

/** Restore local reminders, not a build-time guess about future releases. */
class ReleaseReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action !in setOf(Intent.ACTION_BOOT_COMPLETED, Intent.ACTION_MY_PACKAGE_REPLACED)) return
        if (NotificationPrefs(context).isEnabled()) AideWorkScheduler.scheduleAll(context)
    }
}
