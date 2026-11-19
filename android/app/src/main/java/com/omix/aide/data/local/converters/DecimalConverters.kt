package com.omix.aide.data.local.converters

import androidx.room.TypeConverter

/**
 * Type converters for exact decimal arithmetic in Room.
 *
 * Strategy: Store monetary values as scaled Long (amount × 10,000).
 * - DECIMAL(19,4) in PostgreSQL maps to 4 decimal places
 * - Long provides exact integer arithmetic up to 9 quintillion
 * - Covers KES amounts up to 999 trillion (more than sufficient)
 */
object DecimalConverters {
    private const val SCALE = 10_000L

    @TypeConverter
    fun fromDecimal(value: Long?): Double {
        return value?.let { it / SCALE.toDouble() } ?: 0.0
    }

    @TypeConverter
    fun toDecimal(value: Double?): Long {
        return value?.let { Math.round(it * SCALE) } ?: 0L
    }

    @TypeConverter
    fun fromDecimalString(value: String?): Double {
        return value?.toDoubleOrNull()?.let { Math.round(it * SCALE) }?.let { it / SCALE.toDouble() } ?: 0.0
    }

    @TypeConverter
    fun toDecimalString(value: Double?): String {
        return value?.let { String.format("%.4f", it) } ?: "0.0000"
    }
}

/** Stored scaled Long -> display Double. Use at every UI/report boundary. */
fun Long.asMoney(): Double = DecimalConverters.fromDecimal(this)

/** Display Double -> stored scaled Long. Use at every write boundary. */
fun Double.toScaledMoney(): Long = DecimalConverters.toDecimal(this)