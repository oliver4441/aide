package com.omix.aide

import com.omix.aide.data.local.dao.SaleWithItems
import com.omix.aide.data.local.entities.SaleEntity
import com.omix.aide.ui.viewmodel.SaleTimeline
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Test
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

/**
 * The home screen used to label the shop's entire history as "Sales Today" and
 * feed the same all-time data to a "last 7 days" chart. These tests pin the
 * calendar boundaries that fix that.
 */
class SaleTimelineTest {

    private val storedPattern = "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"

    private fun at(daysAgo: Int, hour: Int): Long = Calendar.getInstance().apply {
        add(Calendar.DAY_OF_YEAR, -daysAgo)
        set(Calendar.HOUR_OF_DAY, hour)
        set(Calendar.MINUTE, 0)
        set(Calendar.SECOND, 0)
        set(Calendar.MILLISECOND, 0)
    }.timeInMillis

    private fun iso(millis: Long): String =
        SimpleDateFormat(storedPattern, Locale.US).format(Date(millis))

    private fun sale(id: String, createdAt: String, total: Double, profit: Double) = SaleWithItems(
        sale = SaleEntity(
            id = id,
            businessId = "bus-1",
            total = total,
            cost = total - profit,
            profit = profit,
            paid = total,
            change = 0.0,
            createdAt = createdAt
        ),
        items = emptyList()
    )

    @Test
    fun todayTotalsCountOnlyTodaysSales() {
        val now = at(0, 12)
        val sales = listOf(
            sale("today-1", iso(at(0, 9)), total = 500.0, profit = 100.0),
            sale("today-2", iso(at(0, 11)), total = 250.0, profit = 50.0),
            sale("yesterday", iso(at(1, 15)), total = 900.0, profit = 200.0),
            sale("last-week", iso(at(8, 10)), total = 4000.0, profit = 800.0)
        )

        val today = SaleTimeline.todayTotals(sales, now)

        assertEquals(750.0, today.total, 0.01)
        assertEquals(150.0, today.profit, 0.01)
        assertEquals(2, today.count)
    }

    @Test
    fun lastSevenDaysHasSevenBucketsOldestFirstAndStopsAtToday() {
        val now = at(0, 12)
        val sales = listOf(
            sale("today", iso(at(0, 9)), total = 500.0, profit = 100.0),
            sale("yesterday", iso(at(1, 15)), total = 900.0, profit = 200.0),
            sale("six-days", iso(at(6, 8)), total = 100.0, profit = 10.0),
            // Outside the window: must not appear in any bar.
            sale("seven-days", iso(at(7, 8)), total = 7000.0, profit = 700.0)
        )

        val days = SaleTimeline.lastSevenDays(sales, now)

        assertEquals(7, days.size)
        assertEquals(SaleTimeline.startOfDay(now), days.last().dayStart)
        assertEquals(500.0, days.last().total, 0.01)
        assertEquals(900.0, days[5].total, 0.01)
        assertEquals(100.0, days.first().total, 0.01)
        assertEquals(1500.0, days.sumOf { it.total }, 0.01)
    }

    @Test
    fun unparsableTimestampsAreIgnoredRatherThanCountedAsToday() {
        val now = at(0, 12)
        val sales = listOf(
            sale("good", iso(at(0, 9)), total = 300.0, profit = 30.0),
            sale("bad", "not-a-date", total = 999.0, profit = 99.0)
        )

        val today = SaleTimeline.todayTotals(sales, now)
        val days = SaleTimeline.lastSevenDays(sales, now)

        assertEquals(300.0, today.total, 0.01)
        assertEquals(1, today.count)
        assertEquals(300.0, days.sumOf { it.total }, 0.01)
    }

    @Test
    fun parseRoundTripsTheStoredFormat() {
        val millis = at(0, 9)
        val parsed = SaleTimeline.parseSaleTime(iso(millis))

        assertNotNull(parsed)
        assertEquals(millis, parsed!!.toLong())
        assertNull(SaleTimeline.parseSaleTime("garbage"))
    }
}
