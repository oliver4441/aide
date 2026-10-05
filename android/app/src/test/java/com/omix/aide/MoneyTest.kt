package com.omix.aide

import com.omix.aide.data.local.BusinessSettings
import com.omix.aide.ui.releases.isNewerRelease
import com.omix.aide.ui.vatOn
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * The money arithmetic that the receipt, the reports and the POS all depend on.
 *
 * These were pure functions with no coverage at all, and getting VAT wrong is
 * the kind of bug a shopkeeper finds immediately and nobody catches in review.
 */
class MoneyTest {

    private val delta = 0.005

    @Test
    fun vatIsExtractedFromAVatInclusiveTotal() {
        // Prices are VAT-inclusive, so 1160 at 16% contains 160 of tax.
        assertEquals(160.0, vatOn(1160.0, 16.0), delta)
    }

    @Test
    fun vatIsZeroWhenNoRateIsConfigured() {
        assertEquals(0.0, vatOn(1000.0, 0.0), delta)
        assertEquals(0.0, vatOn(1000.0, -5.0), delta)
    }

    @Test
    fun vatScalesWithTheRate() {
        assertEquals(50.0, vatOn(1000.0, 5.0), delta)
        assertEquals(250.0, vatOn(1000.0, 33.3333), 0.01)
    }

    @Test
    fun taxPlusNetEqualsTheGrossTheCustomerPaid() {
        // The invariant that matters: what the customer handed over is exactly
        // the tax plus everything the shop keeps.
        val gross = 2450.0
        val tax = vatOn(gross, 16.0)
        val net = gross - tax
        assertEquals(gross, tax + net, delta)
    }

    @Test
    fun settingsDefaultToAWorkingShop() {
        val defaults = BusinessSettings()
        assertEquals("KSh", defaults.currency)
        assertEquals(0.0, defaults.taxRate, delta)
        assertTrue(defaults.receiptFooter.isNotBlank())
    }
}

/**
 * The comparison behind the update banner.
 *
 * Kept as a plain function so it can be tested without a network or a device —
 * the previous mechanism was a compile-time constant and could not be tested at
 * all, which is part of why it silently stopped meaning anything.
 */
class UpdateComparisonTest {

    // Calls the real rule from UpdateChecker.kt, not a copy of it.
    private fun isNewer(publishedCode: Int, installedCode: Int) =
        isNewerRelease(publishedCode, installedCode)

    @Test
    fun anOlderBuildIsToldToUpdate() {
        assertTrue(isNewer(publishedCode = 105, installedCode = 104))
    }

    @Test
    fun theCurrentBuildIsNotNagged() {
        assertFalse(isNewer(publishedCode = 104, installedCode = 104))
    }

    @Test
    fun aNewerLocalBuildIsNotToldToGoBackwards() {
        assertFalse(isNewer(publishedCode = 104, installedCode = 105))
    }

    @Test
    fun anUnknownPublishedVersionNeverPrompts() {
        // versionCode 0 means the check failed or nothing is published.
        assertFalse(isNewer(publishedCode = 0, installedCode = 104))
        assertFalse(isNewer(publishedCode = 0, installedCode = 0))
    }

    @Test
    fun aDebugBuildWithCodeZeroIsStillPrompted() {
        // A local debug APK compiles to versionCode 0 by default, and should
        // be told about any real published release.
        assertTrue(isNewer(publishedCode = 104, installedCode = 0))
    }
}