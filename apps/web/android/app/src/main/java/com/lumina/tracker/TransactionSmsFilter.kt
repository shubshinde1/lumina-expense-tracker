package com.lumina.tracker

import java.util.regex.Pattern

object TransactionSmsFilter {
    private val CURRENCY_PATTERN = Pattern.compile("(rs\\.?|inr|₹|rupees)", Pattern.CASE_INSENSITIVE)
    
    private val VERBS_PATTERN = Pattern.compile(
        "(debited|credited|spent|paid|received|withdrawn|sent|deposited|added|transfer|txn|transaction|mandate|auto-debit|autopay)", 
        Pattern.CASE_INSENSITIVE
    )
    
    private val NEGATIVE_PATTERN = Pattern.compile(
        "(failed|declined|unsuccessful|cancelled|insufficient|reverted)", 
        Pattern.CASE_INSENSITIVE
    )
    
    private val REVERSAL_PATTERN = Pattern.compile(
        "(refund|reversed|reversal)", 
        Pattern.CASE_INSENSITIVE
    )

    private val MANDATE_PATTERN = Pattern.compile(
        "(mandate|upi\\s+autopay|nach|standing\\s+instruction|e-mandate)", 
        Pattern.CASE_INSENSITIVE
    )

    @JvmStatic
    fun shouldProcess(body: String?): Boolean {
        if (body.isNullOrEmpty()) return false
        val lower = body.lowercase()

        // 1. Mandate-type messages have priority routing
        if (MANDATE_PATTERN.matcher(lower).find()) {
            return true
        }

        // 2. Reversals/refunds have priority if they represent success
        if (REVERSAL_PATTERN.matcher(lower).find() && !lower.contains("failed")) {
            return true
        }

        // 3. Negative checks (declined/failed checks)
        if (NEGATIVE_PATTERN.matcher(lower).find()) {
            return false
        }

        // 4. Standard currency + verb check
        val hasCurrency = CURRENCY_PATTERN.matcher(lower).find()
        val hasVerb = VERBS_PATTERN.matcher(lower).find()
        
        return hasCurrency && hasVerb
    }

    @JvmStatic
    fun isMandate(body: String): Boolean {
        return MANDATE_PATTERN.matcher(body.lowercase()).find()
    }

    @JvmStatic
    fun isRefund(body: String): Boolean {
        return REVERSAL_PATTERN.matcher(body.lowercase()).find() && !body.lowercase().contains("failed")
    }
}
