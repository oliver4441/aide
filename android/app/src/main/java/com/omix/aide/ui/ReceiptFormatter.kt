package com.omix.aide.ui

import com.omix.aide.data.local.dao.SaleWithItems

/**
 * Formats a completed sale into standard 58mm / 80mm ESC/POS thermal printer commands
 * and plain text suitable for Bluetooth printing or messaging.
 */
object ReceiptFormatter {

    fun formatPlainText(
        saleWithItems: SaleWithItems,
        businessName: String,
        currency: String = "KSh",
        footer: String = "Thank you for your business!"
    ): String = buildString {
        appendLine("=================================")
        appendLine("         $businessName           ")
        appendLine("=================================")
        appendLine("Receipt #: ${saleWithItems.sale.id.takeLast(8).uppercase()}")
        appendLine("Date: ${saleWithItems.sale.createdAt.take(16)}")
        appendLine("Payment: ${saleWithItems.sale.paymentMethod.replace("_", " ")}")
        appendLine("---------------------------------")

        saleWithItems.items.forEach { item ->
            val total = item.price * item.quantity
            appendLine("${item.name} x${item.quantity}")
            appendLine("  @ $currency ${"%.2f".format(item.price)} = $currency ${"%.2f".format(total)}")
        }

        appendLine("---------------------------------")
        appendLine("TOTAL: $currency ${"%.2f".format(saleWithItems.sale.total)}")
        if (saleWithItems.sale.paid > 0) {
            appendLine("PAID:  $currency ${"%.2f".format(saleWithItems.sale.paid)}")
            appendLine("CHANGE: $currency ${"%.2f".format(saleWithItems.sale.change)}")
        }
        if (saleWithItems.sale.tax > 0) {
            appendLine("VAT (Included): $currency ${"%.2f".format(saleWithItems.sale.tax)}")
        }
        appendLine("=================================")
        appendLine("  $footer  ")
        appendLine("=================================")
    }

    /** ESC/POS byte sequence generation for 58mm Bluetooth thermal printers. */
    fun formatEscPosBytes(
        saleWithItems: SaleWithItems,
        businessName: String,
        currency: String = "KSh"
    ): ByteArray {
        val text = formatPlainText(saleWithItems, businessName, currency)
        val initPrinter = byteArrayOf(0x1B, 0x40) // ESC @
        val centerAlign = byteArrayOf(0x1B, 0x61, 0x01) // ESC a 1
        val leftAlign = byteArrayOf(0x1B, 0x61, 0x00) // ESC a 0
        val cutPaper = byteArrayOf(0x1D, 0x56, 0x41, 0x00) // GS V A 0

        return initPrinter + centerAlign + text.toByteArray(Charsets.US_ASCII) + cutPaper
    }
}
