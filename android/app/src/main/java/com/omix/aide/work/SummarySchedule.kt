package com.omix.aide.work

import java.util.Calendar

/**
 * When the daily summary should next run.
 *
 * Periodic work cannot be pinned to a wall-clock time, so the worker is queued
 * once with an initial delay up to the shop's chosen closing time and repeats
 * every 24 hours after that. Kept separate from the scheduler so the arithmetic
 * can be unit tested: the previous version hard-coded 18:00 in two places and
 * nobody could check it without a device.
 */
object SummarySchedule {

    /**
     * The next occurrence of [hour]:[minute] strictly after [now].
     *
     * A time that has already passed today — or is exactly now — rolls to
     * tomorrow, so the summary never fires twice for one closing time.
     */
    fun nextRun(now: Long, hour: Int, minute: Int): Long = Calendar.getInstance().apply {
        timeInMillis = now
        set(Calendar.HOUR_OF_DAY, hour.coerceIn(0, 23))
        set(Calendar.MINUTE, minute.coerceIn(0, 59))
        set(Calendar.SECOND, 0)
        set(Calendar.MILLISECOND, 0)
        if (timeInMillis <= now) add(Calendar.DAY_OF_YEAR, 1)
    }.timeInMillis

    /** Milliseconds from [now] until the next summary. */
    fun delayFrom(now: Long, hour: Int, minute: Int): Long = nextRun(now, hour, minute) - now
}
