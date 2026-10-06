package com.omix.aide

import com.omix.aide.data.local.BusinessSettings
import com.omix.aide.data.local.ThemeMode
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Appearance settings.
 *
 * The accent used to be stored twice, in two different SharedPreferences files,
 * with nothing reconciling them. That made the bug invisible to a unit test --
 * it only showed up as "the splash is teal and the app is plum" on a device --
 * so the resolution logic is pinned here instead.
 */
class ThemeSettingsTest {

    @Test
    fun systemModeFollowsThePhone() {
        assertTrue(ThemeMode.SYSTEM.resolve(systemDark = true))
        assertFalse(ThemeMode.SYSTEM.resolve(systemDark = false))
    }

    @Test
    fun explicitModesIgnoreTheSystem() {
        assertTrue(ThemeMode.DARK.resolve(systemDark = false))
        assertFalse(ThemeMode.LIGHT.resolve(systemDark = true))
        assertTrue(ThemeMode.DARK.resolve(systemDark = true))
        assertFalse(ThemeMode.LIGHT.resolve(systemDark = false))
    }

    @Test
    fun anUnrecognisedStoredModeFallsBackToSystem() {
        // A corrupt or future value must not leave the app un-themed.
        assertEquals(ThemeMode.SYSTEM, ThemeMode.from("sepia"))
        assertEquals(ThemeMode.SYSTEM, ThemeMode.from(null))
        assertEquals(ThemeMode.SYSTEM, ThemeMode.from(""))
        assertEquals(ThemeMode.DARK, ThemeMode.from("dark"))
        assertEquals(ThemeMode.LIGHT, ThemeMode.from("LIGHT"))
    }

    @Test
    fun defaultsAreUsableWithoutAnySavedSettings() {
        val defaults = BusinessSettings()
        assertEquals("plum", defaults.accent)
        assertEquals(ThemeMode.SYSTEM, defaults.themeMode)
        assertTrue(defaults.soundsEnabled)
    }

    @Test
    fun changingTheAccentLeavesOtherSettingsAlone() {
        // This is what Palette.write does: read, copy the one field, write back.
        // A blind write would reset the shop's name, currency and VAT rate.
        val before = BusinessSettings(
            businessName = "Mama Njeri",
            currency = "UGX",
            taxRate = 16.0,
            accent = "plum",
            themeMode = ThemeMode.DARK
        )
        val after = before.copy(accent = "teal")

        assertEquals("teal", after.accent)
        assertEquals("Mama Njeri", after.businessName)
        assertEquals("UGX", after.currency)
        assertEquals(16.0, after.taxRate, 0.001)
        assertEquals(ThemeMode.DARK, after.themeMode)
    }
}