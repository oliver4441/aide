package ke.co.aide.notifications

import android.content.Context

/**
 * Which notification categories this device wants.
 *
 * Mirrors the PWA's in-app notification preferences: one master switch plus a
 * switch per channel.
 */
class NotificationPrefs(context: Context) {

    private val prefs = context.getSharedPreferences("aide_notifications", Context.MODE_PRIVATE)

    fun isEnabled(): Boolean = prefs.getBoolean(KEY_ENABLED, true)

    fun setEnabled(enabled: Boolean) {
        prefs.edit().putBoolean(KEY_ENABLED, enabled).apply()
    }

    fun isChannelEnabled(channel: AideChannel): Boolean =
        prefs.getBoolean(channelKey(channel), true)

    fun setChannelEnabled(channel: AideChannel, enabled: Boolean) {
        prefs.edit().putBoolean(channelKey(channel), enabled).apply()
    }

    /** True only when the master switch and the channel switch are both on. */
    fun shouldNotify(channel: AideChannel): Boolean =
        isEnabled() && isChannelEnabled(channel)

    private fun channelKey(channel: AideChannel) = "channel_${channel.key}"

    private companion object {
        const val KEY_ENABLED = "enabled"
    }
}
