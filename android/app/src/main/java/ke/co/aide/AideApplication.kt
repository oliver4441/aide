package ke.co.aide

import android.app.Application
import ke.co.aide.notifications.AideNotifications
import ke.co.aide.notifications.NotificationPrefs
import ke.co.aide.work.AideWorkScheduler

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
