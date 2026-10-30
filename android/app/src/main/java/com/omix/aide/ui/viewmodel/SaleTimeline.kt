package com.omix.aide.ui.viewmodel

import com.omix.aide.data.local.dao.SaleWithItems
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/** One bar of the home chart: a calendar day and what was taken on it. */
data class DailyTotal(val dayStart: Long, val label: String, val total: Double)

/** Takings for the current calendar day. */
data class TodayTotals(val total: Double, val profit: Double, val count: Int)

/**
 * Date maths for the home screen.
 *
 * This used to live inside the ViewModel and summed *every* sale the shop had
 * ever recorded while labelling the result "Sales Today", and the same all-time
 * data fed a chart captioned "Weekly Sales Trend / 7 Days". Both are computed
 * here against real calendar boundaries instead, and kept Android-free so they
 * can be unit tested.
 *
 * Dates are stored by [com.omix.aide.data.repository.SaleRepository] as
 * `yyyy-MM-dd'T'HH:mm:ss.SSS'Z'` formatted in UTC — a real UTC instant, even
 * though `Z` is written as a literal in the pattern. Parsing must therefore
 * force UTC; parsing in the device zone (the previous behaviour) shifted early
 * sales, so a 02:00 sale in Nairobi was counted as yesterday's.
 *
 * Grouping into days then happens in the device's zone, because "today" is the
 * shop's today, not UTC's.
 */
object SaleTimeline {

    private const val STORED_PATTERN = "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"
    private const val DAYS_IN_CHART = 7

    /** Parses a stored `createdAt`, or null when the value is not a date. */
    fun parseSaleTime(iso: String): Long? = runCatching {
        SimpleDateFormat(STORED_PATTERN, Locale.US).apply {
            timeZone = TimeZone.getTimeZone("UTC")
        }.parse(iso)?.time
    }.getOrNull()

    /** Midnight (local) of the day the given instant falls in. */
    fun startOfDay(millis: Long): Long = Calendar.getInstance().apply {
        timeInMillis = millis
        set(Calendar.HOUR_OF_DAY, 0)
        set(Calendar.MINUTE, 0)
        set(Calendar.SECOND, 0)
        set(Calendar.MILLISECOND, 0)
    }.timeInMillis

    /** Totals for the day containing [now]. Undated sales are left out. */
    fun todayTotals(sales: List<SaleWithItems>, now: Long): TodayTotals {
        val today = startOfDay(now)
        var total = 0.0
        var profit = 0.0
        var count = 0

        sales.forEach { item ->
            val time = parseSaleTime(item.sale.createdAt) ?: return@forEach
            if (startOfDay(time) == today) {
                total += item.sale.total
                profit += item.sale.profit
                count += 1
            }
        }
        return TodayTotals(total = total, profit = profit, count = count)
    }

    /**
     * The last [DAYS_IN_CHART] calendar days ending today, oldest first, with
     * each day's takings. Days with no sales are present with a zero total so
     * the chart keeps a stable seven columns.
     */
    fun lastSevenDays(sales: List<SaleWithItems>, now: Long): List<DailyTotal> {
        val today = startOfDay(now)
        val days = (DAYS_IN_CHART - 1 downTo 0).map { offset ->
            val start = startOfDay(shiftDays(today, -offset))
            DailyTotal(dayStart = start, label = weekdayLabel(start), total = 0.0)
        }
        val wanted = days.map { it.dayStart }.toHashSet()
        val totals = HashMap<Long, Double>()

        sales.forEach { item ->
            val time = parseSaleTime(item.sale.createdAt) ?: return@forEach
            val day = startOfDay(time)
            if (day in wanted) {
                totals[day] = (totals[day] ?: 0.0) + item.sale.total
            }
        }
        return days.map { it.copy(total = totals[it.dayStart] ?: 0.0) }
    }

    /** Shifts by whole days through the calendar, so DST months stay correct. */
    private fun shiftDays(millis: Long, days: Int): Long = Calendar.getInstance().apply {
        timeInMillis = millis
        add(Calendar.DAY_OF_YEAR, days)
    }.timeInMillis

    private fun weekdayLabel(millis: Long): String =
        SimpleDateFormat("EEE", Locale.getDefault()).format(Date(millis))
}
