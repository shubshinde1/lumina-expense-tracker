package com.lumina.tracker

import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import java.util.Date

class SmsParserTest {

    @Before
    fun setUp() {
        // Pre-populate category lookups to simulate JSON asset file loading
        SmsParser.setCategoryLookup(mapOf(
            "food" to listOf("swiggy", "zomato"),
            "transport" to listOf("uber", "ola"),
            "shopping" to listOf("amazon", "flipkart")
        ))
    }

    @Test
    fun testSmsFilter_shouldProcess() {
        val test1 = "Rs.450.00 debited from A/c XX1234 on 12-Aug-26 to SWIGGY via UPI. Avl bal Rs.12,340.50"
        val test2 = "Rs 25,000 credited to your account XX5678 by NEFT from JOHN DOE INC. Ref No 4521178"
        val test3 = "Your UPI Autopay mandate of Rs.499 for NETFLIX has been executed successfully."
        val test4 = "INR 1,200 spent on your Card XX9012 at AMAZON on 11-Aug-26."
        val test5 = "Payment of Rs.850 to UBER via UPI was declined due to insufficient balance."

        assertTrue(TransactionSmsFilter.shouldProcess(test1))
        assertTrue(TransactionSmsFilter.shouldProcess(test2))
        assertTrue(TransactionSmsFilter.shouldProcess(test3))
        assertTrue(TransactionSmsFilter.shouldProcess(test4))
        
        // Declined transactions must be filtered out
        assertFalse(TransactionSmsFilter.shouldProcess(test5))
    }

    @Test
    fun testSmsParser_debitUpi() {
        val sms = "Rs.450.00 debited from A/c XX1234 on 12-Aug-26 to SWIGGY via UPI. Avl bal Rs.12,340.50"
        val parsed = SmsParser.parse(null as? android.content.Context ?: getMockContext(), "HDFC", sms)

        assertEquals(450.0, parsed.amount, 0.0)
        assertEquals("expense", parsed.direction)
        assertEquals("UPI", parsed.paymentType)
        assertEquals("SWIGGY", parsed.merchant)
        assertEquals("1234", parsed.accountRef)
        assertEquals("Food", parsed.category)
        assertEquals("Swiggy", parsed.subcategory)
        assertEquals("high", parsed.confidence)
    }

    @Test
    fun testSmsParser_creditNeft() {
        val sms = "Rs 25,000 credited to your account XX5678 by NEFT from JOHN DOE INC. Ref No 4521178"
        val parsed = SmsParser.parse(null as? android.content.Context ?: getMockContext(), "ICICI", sms)

        assertEquals(25000.0, parsed.amount, 0.0)
        assertEquals("income", parsed.direction)
        assertEquals("Bank transfer", parsed.paymentType)
        assertEquals("JOHN DOE INC", parsed.merchant)
        assertEquals("5678", parsed.accountRef)
        assertEquals("high", parsed.confidence)
    }

    @Test
    fun testSmsParser_mandateAutopay() {
        val sms = "Your UPI Autopay mandate of Rs.499 for NETFLIX has been executed successfully."
        val parsed = SmsParser.parse(null as? android.content.Context ?: getMockContext(), "UPI", sms)

        assertEquals(499.0, parsed.amount, 0.0)
        assertEquals("expense", parsed.direction)
        assertEquals("Mandate", parsed.paymentType)
        assertEquals("NETFLIX", parsed.merchant)
        assertEquals("", parsed.accountRef) // No account suffix
        assertEquals("low", parsed.confidence) // low confidence due to missing account ref
    }

    @Test
    fun testSmsParser_cardDebit() {
        val sms = "INR 1,200 spent on your Card XX9012 at AMAZON on 11-Aug-26."
        val parsed = SmsParser.parse(null as? android.content.Context ?: getMockContext(), "AMEX", sms)

        assertEquals(1200.0, parsed.amount, 0.0)
        assertEquals("expense", parsed.direction)
        assertEquals("Card", parsed.paymentType)
        assertEquals("AMAZON", parsed.merchant)
        assertEquals("9012", parsed.accountRef)
        assertEquals("Shopping", parsed.category)
        assertEquals("Amazon", parsed.subcategory)
        assertEquals("high", parsed.confidence)
    }

    private fun getMockContext(): android.content.Context? {
        return null
    }
}
