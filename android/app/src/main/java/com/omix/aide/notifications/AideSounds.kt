package com.omix.aide.notifications

import android.content.Context
import android.media.AudioAttributes
import android.media.SoundPool
import com.omix.aide.R

/**
 * The two chimes Aide ships with, and where they belong.
 *
 * `till_chime` is the bright two-note bell for money coming in (a completed sale
 * and the daily summary); `warning_chime` is the lower descending pair for
 * stock running out. Both are short generated WAVs in `res/raw`, so they work
 * offline and need no downloaded asset.
 */
object AideSounds {

    private const val MAX_STREAMS = 2

    private var soundPool: SoundPool? = null
    private val sampleIds = HashMap<Int, Int>()

    /** Which chime a channel should play, or null for the system default. */
    fun soundFor(channel: AideChannel): Int? = when (channel) {
        AideChannel.REPORTS -> R.raw.till_chime
        AideChannel.INVENTORY -> R.raw.warning_chime
        AideChannel.ORDERS -> R.raw.till_chime
        else -> null
    }

    fun tillChime(): Int = R.raw.till_chime

    fun warningChime(): Int = R.raw.warning_chime

    /**
     * Plays a chime. The sample is loaded once and cached; a first load plays as
     * soon as it is ready, so the very first alert is not silent.
     */
    fun play(context: Context, resId: Int) {
        val pool = pool(context)
        val loaded = sampleIds[resId]
        if (loaded != null && loaded != 0) {
            pool.play(loaded, 1f, 1f, 1, 0, 1f)
            return
        }
        sampleIds[resId] = pool.load(context.applicationContext, resId, 1)
    }

    private fun pool(context: Context): SoundPool {
        soundPool?.let { return it }

        val attributes = AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ASSISTANCE_SONIFICATION)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build()

        val created = SoundPool.Builder()
            .setMaxStreams(MAX_STREAMS)
            .setAudioAttributes(attributes)
            .build()

        // A load finishes asynchronously; play it straight away so the first
        // chime of a session is audible.
        created.setOnLoadCompleteListener { pool, sampleId, status ->
            if (status == 0) pool.play(sampleId, 1f, 1f, 1, 0, 1f)
        }

        soundPool = created
        return created
    }
}
