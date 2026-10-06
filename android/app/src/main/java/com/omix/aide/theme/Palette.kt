package com.omix.aide.theme

import android.content.Context
import androidx.core.content.res.ResourcesCompat
import com.omix.aide.R
import com.omix.aide.data.local.SettingsStore

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

    /**
     * The accent the user selected.
     *
     * Reads [SettingsStore], which owns the value. This used to keep its own
     * copy in a separate SharedPreferences file, which is how the splash and
     * the rest of the app came to disagree: the splash read one store and the
     * theme read the other, so a first-run pick showed on the splash and was
     * then ignored everywhere else.
     */
    fun read(context: Context): String = valid(readRaw(context))

    /**
     * Persists the accent, keeping every other saved setting untouched.
     *
     * Ignores unknown ids so a bad value can never leave the app with no theme.
     */
    fun write(context: Context, accent: String) {
        if (!all.any { it.id == accent }) return
        val current = SettingsStore.read(context)
        if (current.accent == accent) return
        SettingsStore.write(context, current.copy(accent = accent))
    }

    /** Falls back to the default accent for an id we do not recognise. */
    private fun valid(id: String?): String =
        if (id != null && all.any { it.id == id }) id else all.first().id

    private fun readRaw(context: Context): String = SettingsStore.read(context).accent
}
