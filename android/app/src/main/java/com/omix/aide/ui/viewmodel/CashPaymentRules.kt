package com.omix.aide.ui.viewmodel

/**
 * Checkout rules for cash sales. A blank tender means the customer paid the
 * exact total; a non-cash payment is recorded as paid in full. Partial cash
 * payments are not supported by the current sale model.
 */
object CashPaymentRules {
    const val CASH = "CASH"

    fun isCashAmountSufficient(total: Double, input: String): Boolean {
        if (input.isBlank()) return true
        val received = input.trim().toDoubleOrNull() ?: return false
        return total.isFinite() && received.isFinite() && received >= total
    }

    /** Returns the recorded amount, or null when a cash tender is invalid. */
    fun amountToRecord(total: Double, paymentMethod: String, input: String): Double? {
        if (!total.isFinite() || total < 0.0) return null
        if (paymentMethod != CASH) return total
        if (input.isBlank()) return total

        val received = input.trim().toDoubleOrNull() ?: return null
        return received.takeIf { it.isFinite() && it >= total }
    }
}
