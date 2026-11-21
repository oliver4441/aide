package com.omix.aide.data.local

import android.content.Context

/** How the app chooses light vs dark theme. */
enum class ThemeMode {
    SYSTEM,
    DARK,
    LIGHT;

    fun resolve(systemDark: Boolean): Boolean = when (this) {
        SYSTEM -> systemDark
        DARK -> true
        LIGHT -> false
    }

    companion object {
        fun from(value: String?): ThemeMode = when (value?.trim()?.uppercase()) {
            "LIGHT" -> LIGHT
            "SYSTEM" -> SYSTEM
            else -> DARK
        }
    }
}

/**
 * Business profile and receipt settings.
 *
 * Deliberately SharedPreferences rather than a Room table: these are a handful
 * of scalars that the receipt and every report read synchronously, and putting
 * them in Room would mean another schema migration for no query benefit.
 */
data class BusinessSettings(
    val businessName: String = "",
    val currency: String = "KSh",
    /** VAT rate as a percentage, e.g. 16.0 for 16%. */
    val taxRate: Double = 0.0,
    val receiptFooter: String = "Thank you for your business",
    val accent: String = "plum",
    val themeMode: ThemeMode = ThemeMode.DARK,
    val soundsEnabled: Boolean = true,
    val summaryHour: Int = 18,
    val summaryMinute: Int = 0
)

object SettingsStore {

    private const val PREFS = "aide_settings"

    private fun prefs(context: Context) =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun read(context: Context): BusinessSettings = with(prefs(context)) {
        BusinessSettings(
            businessName = getString(KEY_NAME, "") ?: "",
            currency = getString(KEY_CURRENCY, "KSh") ?: "KSh",
            taxRate = getFloat(KEY_TAX, 0f).toDouble(),
            receiptFooter = getString(KEY_FOOTER, "Thank you for your business")
                ?: "Thank you for your business",
            accent = getString(KEY_ACCENT, "plum") ?: "plum",
            themeMode = ThemeMode.from(getString(KEY_THEME_MODE, ThemeMode.DARK.name)),
            soundsEnabled = getBoolean(KEY_SOUNDS_ENABLED, true),
            summaryHour = getInt(KEY_SUMMARY_HOUR, 18).coerceIn(0, 23),
            summaryMinute = getInt(KEY_SUMMARY_MINUTE, 0).coerceIn(0, 59)
        )
    }

    fun write(context: Context, settings: BusinessSettings) {
        prefs(context).edit()
            .putString(KEY_NAME, settings.businessName)
            .putString(KEY_CURRENCY, settings.currency)
            .putFloat(KEY_TAX, settings.taxRate.toFloat())
            .putString(KEY_FOOTER, settings.receiptFooter)
            .putString(KEY_ACCENT, settings.accent)
            .putString(KEY_THEME_MODE, settings.themeMode.name)
            .putBoolean(KEY_SOUNDS_ENABLED, settings.soundsEnabled)
            .putInt(KEY_SUMMARY_HOUR, settings.summaryHour.coerceIn(0, 23))
            .putInt(KEY_SUMMARY_MINUTE, settings.summaryMinute.coerceIn(0, 59))
            .apply()
    }

    private const val KEY_NAME = "business_name"
    private const val KEY_CURRENCY = "currency"
    private const val KEY_TAX = "tax_rate"
    private const val KEY_FOOTER = "receipt_footer"
    private const val KEY_ACCENT = "accent"
    private const val KEY_THEME_MODE = "theme_mode"
    private const val KEY_SOUNDS_ENABLED = "sounds_enabled"
    private const val KEY_SUMMARY_HOUR = "summary_hour"
    private const val KEY_SUMMARY_MINUTE = "summary_minute"
}
