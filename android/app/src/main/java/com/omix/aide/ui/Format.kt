package com.omix.aide.ui

import androidx.compose.runtime.Composable
import androidx.compose.runtime.compositionLocalOf
import com.omix.aide.data.local.BusinessSettings

/**
 * The business settings, provided once at the top of the composition.
 *
 * Everything that displays money reads the currency from here rather than
 * hardcoding "KSh". The Settings screen previously wrote these values to disk
 * and nothing ever read them, so saving a currency or a VAT rate had no effect
 * on anything the user could see.
 */
val LocalAideSettings = compositionLocalOf { BusinessSettings() }

/**
 * Formats an amount using the shop's configured currency.
 *
 * Always two decimal places, because that is what a till receipt and a KES
 * ledger are expected to show.
 */
@Composable
fun money(amount: Double): String {
    val settings = LocalAideSettings.current
    return "${settings.currency} ${"%.2f".format(amount)}"
}

/** Formats an amount without the currency prefix, for use inside a label. */
@Composable
fun moneyBare(amount: Double): String = "%.2f".format(amount)

/**
 * The VAT contained in a VAT-inclusive total.
 *
 * Kenya levies VAT on the price the customer pays, so the VAT portion is the
 * total minus the total divided by (1 + rate). The `total` itself is left
 * untouched: it is what the customer was charged and what the receipt prints as
 * the amount due.
 *
 * This mirrors the web app's `VAT = total - total/(1+rate/100)` so the two
 * clients cannot disagree about a day's takings.
 */
fun vatOn(total: Double, ratePercent: Double): Double {
    if (ratePercent <= 0.0) return 0.0
    return total - (total / (1.0 + ratePercent / 100.0))
}