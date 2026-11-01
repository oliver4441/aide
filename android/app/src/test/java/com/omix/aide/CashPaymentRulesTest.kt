package com.omix.aide

import com.omix.aide.ui.viewmodel.CashPaymentRules
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class CashPaymentRulesTest {
    @Test
    fun blankCashTenderMeansExactPayment() {
        assertTrue(CashPaymentRules.isCashAmountSufficient(125.0, ""))
        assertEquals(125.0, CashPaymentRules.amountToRecord(125.0, "CASH", "")!!, 0.0)
    }

    @Test
    fun exactAndOverpaymentAreAccepted() {
        assertTrue(CashPaymentRules.isCashAmountSufficient(125.0, "125"))
        assertEquals(125.0, CashPaymentRules.amountToRecord(125.0, "CASH", "125.00")!!, 0.0)
        assertEquals(200.0, CashPaymentRules.amountToRecord(125.0, "CASH", "200")!!, 0.0)
    }

    @Test
    fun underpaymentAndInvalidTextAreRejected() {
        assertFalse(CashPaymentRules.isCashAmountSufficient(125.0, "124.99"))
        assertFalse(CashPaymentRules.isCashAmountSufficient(125.0, "oops"))
        assertNull(CashPaymentRules.amountToRecord(125.0, "CASH", "124.99"))
    }

    @Test
    fun nonCashPaymentIsRecordedAtExactTotal() {
        assertEquals(125.0, CashPaymentRules.amountToRecord(125.0, "CARD", "200")!!, 0.0)
    }

    @Test
    fun invalidTotalsAreRejected() {
        assertNull(CashPaymentRules.amountToRecord(Double.NaN, "CASH", ""))
        assertNull(CashPaymentRules.amountToRecord(-1.0, "CARD", ""))
    }
}
