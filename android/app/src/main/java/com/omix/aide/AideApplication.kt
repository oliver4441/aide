package com.omix.aide

import android.app.Application
import com.omix.aide.notifications.AideNotifications
import com.omix.aide.notifications.NotificationPrefs
import com.omix.aide.work.AideWorkScheduler

class AideApplication : Application() {

    override fun onCreate() {
        super.onCreate()

        // Channels must exist before anything is posted; creating them is idempotent.
        AideNotifications.ensureChannels(this)

        // Only keep background checks running while the user wants notifications.
        if (NotificationPrefs(this).isEnabled()) {
            AideWorkScheduler.scheduleAll(this)
        } else {
            AideWorkScheduler.cancelAll(this)
        }
    }
}
