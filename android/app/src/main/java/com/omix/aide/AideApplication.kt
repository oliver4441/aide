package com.omix.aide

import android.app.Application
import com.omix.aide.data.local.DatabaseHealth
import com.omix.aide.notifications.AideNotifications
import com.omix.aide.notifications.NotificationPrefs
import com.omix.aide.work.AideWorkScheduler

class AideApplication : Application() {

    override fun onCreate() {
        super.onCreate()

        // Channels must exist before anything is posted; creating them is idempotent.
        AideNotifications.ensureChannels(this)

        // Open and validate Room up front so a broken migration surfaces a
        // recovery UI instead of crashing later on a worker/UI coroutine.
        val dbHealthy = DatabaseHealth.probe(this)

        // Only schedule background checks when the DB is healthy and notifications are on.
        if (dbHealthy && NotificationPrefs(this).isEnabled()) {
            AideWorkScheduler.scheduleAll(this)
        } else if (!NotificationPrefs(this).isEnabled()) {
            AideWorkScheduler.cancelAll(this)
        }
    }
}
