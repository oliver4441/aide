package com.omix.aide

import com.omix.aide.work.SummarySchedule
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.Calendar

/**
 * The summary time is configurable now, so the "next run" arithmetic is worth
 * pinning: an 18:00 default that silently ran at the wrong time would be a
 * quiet bug on every device.
 */
class SummaryScheduleTest {

    private fun at(hour: Int, minute: Int): Long = Calendar.getInstance().apply {
        set(Calendar.HOUR_OF_DAY, hour)
        set(Calendar.MINUTE, minute)
        set(Calendar.SECOND, 0)
        set(Calendar.MILLISECOND, 0)
    }.timeInMillis

    private fun hourOf(millis: Long): Int = Calendar.getInstance().apply {
        timeInMillis = millis
    }.get(Calendar.HOUR_OF_DAY)

    private fun dayOf(millis: Long): Int = Calendar.getInstance().apply {
        timeInMillis = millis
    }.get(Calendar.DAY_OF_YEAR)

    @Test
    fun eveningSummaryRunsTheSameDayWhenItIsStillAhead() {
        val now = at(10, 0)
        val next = SummarySchedule.nextRun(now, 18, 0)

        assertEquals(18, hourOf(next))
        assertEquals(dayOf(now), dayOf(next))
    }

    @Test
    fun summaryRollsToTomorrowOnceTheTimeHasPassed() {
        val now = at(19, 30)
        val next = SummarySchedule.nextRun(now, 18, 0)

        assertEquals(18, hourOf(next))
        assertTrue(next > now)
        assertTrue(dayOf(next) != dayOf(now) || next - now > 20 * 60 * 60 * 1000L)
    }

    @Test
    fun exactlyNowRollsToTomorrowRatherThanRepeating() {
        val now = at(18, 0)
        val delay = SummarySchedule.delayFrom(now, 18, 0)

        assertTrue("expected a full day of delay, got $delay", delay >= 23 * 60 * 60 * 1000L)
    }

    @Test
    fun customClosingTimeIsRespected() {
        val now = at(9, 0)
        val next = SummarySchedule.nextRun(now, 21, 45)
        val cal = Calendar.getInstance().apply { timeInMillis = next }

        assertEquals(21, cal.get(Calendar.HOUR_OF_DAY))
        assertEquals(45, cal.get(Calendar.MINUTE))
        assertEquals(dayOf(now), cal.get(Calendar.DAY_OF_YEAR))
    }
}
