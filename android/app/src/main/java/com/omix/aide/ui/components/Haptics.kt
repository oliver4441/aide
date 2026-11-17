package com.omix.aide.ui.components

import android.os.Build
import android.view.HapticFeedbackConstants
import android.view.View
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalView

/**
 * The three tactile moments Aide actually needs at a busy till.
 *
 * Kept coarse on purpose: a light tick for small selections, a firm press for
 * actions that commit something, and a distinct buzz for destructive or
 * "check this" moments. All of them go through [View.performHapticFeedback],
 * so the phone's own touch-feedback setting governs whether anything is felt
 * at all -- we never vibrate against the user's wishes.
 */
enum class AideHaptic {
    /** Light: steppers, payment chips, quick-amount chips. */
    TICK,

    /** Firm: add to cart, complete a sale. */
    CONFIRM,

    /** Distinct: removing a cart line, balance owed. */
    WARN
}

/**
 * Returns a fire-and-forget haptic function scoped to the current view.
 *
 * Compose's LocalHapticFeedback only exposes LongPress and text-handle
 * vibrations -- not enough range for a till. Going through the view gives the
 * full constant set, with API-level fallbacks for CONFIRM/REJECT (API 30+).
 */
@Composable
fun rememberAideHaptics(): (AideHaptic) -> Unit {
    val view = LocalView.current
    return { haptic ->
        when (haptic) {
            AideHaptic.TICK ->
                view.performHapticFeedback(HapticFeedbackConstants.CLOCK_TICK)

            AideHaptic.CONFIRM ->
                view.performHapticFeedback(
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                        HapticFeedbackConstants.CONFIRM
                    } else {
                        HapticFeedbackConstants.VIRTUAL_KEY
                    }
                )

            AideHaptic.WARN ->
                view.performHapticFeedback(
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                        HapticFeedbackConstants.REJECT
                    } else {
                        HapticFeedbackConstants.LONG_PRESS
                    }
                )
        }
    }
}
