package com.omix.aide.theme

import android.content.Context
import android.content.SharedPreferences
import androidx.core.content.res.ResourcesCompat

/** A single accent theme the user can pick. (Plum, Lavender, Teal, Amber,
 *  Orange — mirroring the web app's `ACCENTS`.) */
data class AccentTheme(
    val id: String,
    val label: String,
    val swatch: Int,
    val textOnSwatch: Int
)

object Palette {
    private val entries = listOf(
        AccentTheme("plum", "Plum", R.color.plum, R.color.plum_text),
        AccentTheme("lavender", "Lavender", R.color.lavender, R.color.lavender_text),
        AccentTheme("teal", "Teal", R.color.teal, R.color.teal_text),
        AccentTheme("amber", "Amber", R.color.amber, R.color.amber_text),
        AccentTheme("orange", "Orange", R.color.orange, R.color.orange_text)
    )

    val all: List<AccentTheme> = entries

    fun find(id: String): AccentTheme =
        entries.firstOrNull { it.id == id } ?: entries.first()

    /** Read the persisted accent theme from SharedPreferences. */
    fun read(context: Context): String {
        val prefs: SharedPreferences = context.getSharedPreferences(
            "aide_preferences", Context.MODE_PRIVATE
        )
        val saved = prefs.getString(KEY_ACCENT, null)
        return if (saved != null && all.any { it.id == saved }) saved else all.first().id
    }

    /** Persist the accepted accent theme. */
    fun write(context: Context, accent: String) {
        if (!all.any { it.id == accent }) return
        val prefs: SharedPreferences = context.getSharedPreferences(
            "aide_preferences", Context.MODE_PRIVATE
        )
        prefs.edit().putString(KEY_ACCENT, accent).apply()
    }

    private const val KEY_ACCENT = "aide_accent"
}
