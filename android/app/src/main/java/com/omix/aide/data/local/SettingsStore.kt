package com.omix.aide.data.local

import android.content.Context

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
    val accent: String = "plum"
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
            accent = getString(KEY_ACCENT, "plum") ?: "plum"
        )
    }

    fun write(context: Context, settings: BusinessSettings) {
        prefs(context).edit()
            .putString(KEY_NAME, settings.businessName)
            .putString(KEY_CURRENCY, settings.currency)
            .putFloat(KEY_TAX, settings.taxRate.toFloat())
            .putString(KEY_FOOTER, settings.receiptFooter)
            .putString(KEY_ACCENT, settings.accent)
            .apply()
    }

    private const val KEY_NAME = "business_name"
    private const val KEY_CURRENCY = "currency"
    private const val KEY_TAX = "tax_rate"
    private const val KEY_FOOTER = "receipt_footer"
    private const val KEY_ACCENT = "accent"
}