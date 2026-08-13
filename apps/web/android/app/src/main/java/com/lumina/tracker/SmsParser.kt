package com.lumina.tracker

import android.content.Context
import org.json.JSONObject
import java.io.InputStream
import java.nio.charset.Charset
import java.security.MessageDigest
import java.util.regex.Pattern

data class ParsedTransaction(
    val amount: Double,
    val direction: String, // "income" or "expense"
    val paymentType: String, // "UPI" | "Card" | "Bank transfer" | "Mandate" | "Other"
    val category: String,
    val subcategory: String,
    val merchant: String,
    val accountRef: String,
    val timestamp: Long,
    val rawSms: String,
    val confidence: String // "high" or "low"
)

object SmsParser {
    private val AMOUNT_PATTERN = Pattern.compile("(?:rs\\.?|inr|₹)\\s*([\\d,]+(?:\\.\\d{1,2})?)", Pattern.CASE_INSENSITIVE)
    
    private val DEBIT_VERBS = Pattern.compile("debited|spent|paid|sent|withdrawn|auto-debit|transfer", Pattern.CASE_INSENSITIVE)
    private val CREDIT_VERBS = Pattern.compile("credited|received|added|deposited|refund", Pattern.CASE_INSENSITIVE)
    
    private val UPI_PATTERN = Pattern.compile("\\bupi\\b", Pattern.CASE_INSENSITIVE)
    private val CARD_PATTERN = Pattern.compile("\\b(pos|card ending|card xx|spent on your card)\\b", Pattern.CASE_INSENSITIVE)
    private val TRANSFER_PATTERN = Pattern.compile("\\b(neft|imps|rtgs|transfer|bank transfer)\\b", Pattern.CASE_INSENSITIVE)
    private val MANDATE_KEYWORDS = Pattern.compile("mandate|autopay|nach|standing instruction", Pattern.CASE_INSENSITIVE)

    private val ACCOUNT_PATTERN = Pattern.compile("(?:a/c|card|account)\\s*.*?(\\d{4})\\b", Pattern.CASE_INSENSITIVE)

    private var categoryMap: Map<String, List<String>>? = null

    @JvmStatic
    fun setCategoryLookup(map: Map<String, List<String>>) {
        categoryMap = map
    }

    private fun loadLookupTable(context: Context?) {
        if (categoryMap != null || context == null) return
        try {
            val stream: InputStream = context.assets.open("CategoryLookup.json")
            val size = stream.available()
            val buffer = ByteArray(size)
            stream.read(buffer)
            stream.close()
            val jsonStr = String(buffer, Charset.forName("UTF-8"))
            val json = JSONObject(jsonStr)
            val tempMap = mutableMapOf<String, List<String>>()
            json.keys().forEach { key ->
                val arr = json.getJSONArray(key)
                val list = mutableListOf<String>()
                for (i in 0 until arr.length()) {
                    list.add(arr.getString(i).lowercase())
                }
                tempMap[key] = list
            }
            categoryMap = tempMap
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    @JvmStatic
    fun parse(context: Context?, sender: String, body: String, timestamp: Long = System.currentTimeMillis()): ParsedTransaction {
        loadLookupTable(context)
        val cleanBody = body.replace("\n", " ").replace("\r", " ").trim()
        val lowerBody = cleanBody.lowercase()

        // 1. Amount
        var amount = 0.0
        val amtMatcher = AMOUNT_PATTERN.matcher(cleanBody)
        if (amtMatcher.find()) {
            try {
                amount = amtMatcher.group(1)?.replace(",", "")?.toDouble() ?: 0.0
            } catch (e: Exception) {}
        }

        // 2. Direction
        var direction = "expense"
        if (CREDIT_VERBS.matcher(lowerBody).find() || TransactionSmsFilter.isRefund(body)) {
            direction = "income"
        } else if (DEBIT_VERBS.matcher(lowerBody).find()) {
            direction = "expense"
        }

        // 3. Payment Type
        var paymentType = "Other"
        if (MANDATE_KEYWORDS.matcher(lowerBody).find() || TransactionSmsFilter.isMandate(body)) {
            paymentType = "Mandate"
        } else if (UPI_PATTERN.matcher(lowerBody).find()) {
            paymentType = "UPI"
        } else if (CARD_PATTERN.matcher(lowerBody).find()) {
            paymentType = "Card"
        } else if (TRANSFER_PATTERN.matcher(lowerBody).find()) {
            paymentType = "Bank transfer"
        }

        // 4. Merchant
        var merchant = "Unknown Merchant"
        val merchantPatterns = listOf(
            Pattern.compile("to\\s+([^\\s.]+.*?)(?:via|on|avl|ref|\\.)", Pattern.CASE_INSENSITIVE),
            Pattern.compile("at\\s+([^\\s.]+.*?)(?:via|on|avl|ref|\\.)", Pattern.CASE_INSENSITIVE),
            Pattern.compile("from\\s+([^\\s.]+.*?)(?:via|on|avl|ref|\\.)", Pattern.CASE_INSENSITIVE),
            Pattern.compile("for\\s+([^\\s.]+.*?)(?:via|on|avl|ref|has|is|been|\\.)", Pattern.CASE_INSENSITIVE),
            Pattern.compile("by\\s+([^\\s.]+.*?)(?:via|on|avl|ref|\\.)", Pattern.CASE_INSENSITIVE)
        )
        for (pat in merchantPatterns) {
            val matcher = pat.matcher(cleanBody)
            if (matcher.find()) {
                val candidate = matcher.group(1)?.trim() ?: ""
                if (candidate.isNotEmpty() && candidate.length < 35) {
                    merchant = candidate
                    break
                }
            }
        }

        // 5. Account Ref
        var accountRef = ""
        val accMatcher = ACCOUNT_PATTERN.matcher(cleanBody)
        if (accMatcher.find()) {
            accountRef = accMatcher.group(1) ?: ""
        }

        // 6. Category / Subcategory
        var category = "Uncategorized"
        var subcategory = ""
        categoryMap?.forEach { (cat, keywords) ->
            for (kw in keywords) {
                if (lowerBody.contains(kw) || merchant.lowercase().contains(kw)) {
                    category = cat.replaceFirstChar { it.uppercase() }
                    subcategory = kw.replaceFirstChar { it.uppercase() }
                    break
                }
            }
        }

        // 7. Confidence Score
        val hasAmount = amount > 0.0
        val hasMerchant = merchant != "Unknown Merchant"
        val hasAccRef = accountRef.isNotEmpty()
        
        val confidence = if (hasAmount && hasMerchant && hasAccRef) "high" else "low"

        return ParsedTransaction(
            amount = amount,
            direction = direction,
            paymentType = paymentType,
            category = category,
            subcategory = subcategory,
            merchant = merchant,
            accountRef = accountRef,
            timestamp = timestamp,
            rawSms = body,
            confidence = confidence
        )
    }

    @JvmStatic
    fun computeSmsHash(sender: String, body: String, timestamp: Long): String {
        val normalizedSender = sender.trim().lowercase()
        val normalizedBody = body.replace("\\s+".toRegex(), " ").trim().lowercase()
        val minuteBucket = timestamp / 60000

        val textToHash = "$normalizedSender|$normalizedBody|$minuteBucket"
        return try {
            val digest = MessageDigest.getInstance("SHA-256")
            val hashBytes = digest.digest(textToHash.toByteArray())
            hashBytes.joinToString("") { "%02x".format(it) }
        } catch (e: Exception) {
            "hash_${textToHash.hashCode()}"
        }
    }
}
