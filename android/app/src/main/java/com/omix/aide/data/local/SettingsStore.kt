package com.omix.aide.data.local

import android.content.Context

/** How the app resolves light versus dark. */
enum class ThemeMode {
    /** Follow the phone's system setting. */
    SYSTEM,
    LIGHT,
    DARK;

    /** Applies this mode against the system preference. */
    fun resolve(systemDark: Boolean): Boolean = when (this) {
        SYSTEM -> systemDark
        LIGHT -> false
        DARK -> true
    }

    companion object {
        fun from(raw: String?): ThemeMode =
            entries.firstOrNull { it.name.equals(raw, ignoreCase = true) } ?: SYSTEM
    }
}

/**
 * Business profile, receipt and appearance settings.
 *
 * Deliberately SharedPreferences rather than a Room table: these are a handful
 * of scalars that the receipt and every screen read synchronously, and putting
 * them in Room would mean another schema migration for no query benefit.
 *
 * This is the single source of truth for the accent. It used to be duplicated
 * into a second SharedPreferences file owned by `Palette`, which meant the
 * splash and the rest of the app could disagree about the theme.
 */
data class BusinessSettings(
    val businessName: String = "",
    val currency: String = "KSh",
    /** VAT rate as a percentage, e.g. 16.0 for 16%. */
    val taxRate: Double = 0.0,
    val receiptFooter: String = "Thank you for your business",
    val accent: String = "plum",
    val themeMode: ThemeMode = ThemeMode.SYSTEM,
    val soundsEnabled: Boolean = true
)

object SettingsStore {

    private const val PREFS = "aide_settings"

    /** Where the accent used to live, before SettingsStore took ownership. */
    private const val LEGACY_PREFS = "aide_preferences"
    private const val LEGACY_KEY_ACCENT = "aide_accent"

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
            themeMode = ThemeMode.from(getString(KEY_THEME_MODE, null)),
            soundsEnabled = getBoolean(KEY_SOUNDS, true)
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
            .putBoolean(KEY_SOUNDS, settings.soundsEnabled)
            .apply()
    }

    /**
     * Adopts an accent chosen before this store existed.
     *
     * The first-run theme picker wrote straight to the legacy file and never
     * touched `aide_settings`, so anyone who picked a colour during onboarding
     * had it silently ignored by the rest of the app. This copies that choice
     * across once, so nobody loses the theme they already selected.
     *
     * Returns true when a legacy value was adopted.
     */
    fun migrateLegacyAccent(context: Context): Boolean {
        val legacy = context.getSharedPreferences(LEGACY_PREFS, Context.MODE_PRIVATE)
        val saved = legacy.getString(LEGACY_KEY_ACCENT, null) ?: return false

        val current = read(context)
        if (saved == current.accent) return false

        write(context, current.copy(accent = saved))
        return true
    }

    private const val KEY_NAME = "business_name"
    private const val KEY_CURRENCY = "currency"
    private const val KEY_TAX = "tax_rate"
    private const val KEY_FOOTER = "receipt_footer"
    private const val KEY_ACCENT = "accent"
    private const val KEY_THEME_MODE = "theme_mode"
    private const val KEY_SOUNDS = "sounds_enabled"
}