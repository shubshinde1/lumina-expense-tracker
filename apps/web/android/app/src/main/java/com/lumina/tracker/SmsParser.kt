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
    val paymentType: String, // "UPI" | "Debit Card" | "Credit Card" | "Net Banking" | "Cash"
    val category: String,
    val subcategory: String,
    val merchant: String,
    val accountRef: String,
    val timestamp: Long,
    val rawSms: String,
    val confidence: String // "high" or "low"
)

object SmsParser {
    private data class DirectionRule(val pattern: Pattern, val type: String)

    private val DIRECTION_RULES = listOf(
        DirectionRule(Pattern.compile("transferred\\b(?:\\s+\\S+){0,6}\\s+to your (?:a/c|ac|acct|account)\\b", Pattern.CASE_INSENSITIVE), "income"),
        DirectionRule(Pattern.compile("credited to your (?:a/c|ac|acct|account)\\b", Pattern.CASE_INSENSITIVE), "income"),
        DirectionRule(Pattern.compile("credited to (?:your )?(?:a/c|ac|acct|account)\\b", Pattern.CASE_INSENSITIVE), "income"),
        DirectionRule(Pattern.compile("received by\\s+[a-z0-9@._-]+", Pattern.CASE_INSENSITIVE), "expense"),
        DirectionRule(Pattern.compile("paid\\b(?:\\s+\\S+){0,6}\\s+to\\b", Pattern.CASE_INSENSITIVE), "expense"),
        DirectionRule(Pattern.compile("sent\\b(?:\\s+\\S+){0,6}\\s+to\\b", Pattern.CASE_INSENSITIVE), "expense"),
        DirectionRule(Pattern.compile("transferred\\b(?:\\s+\\S+){0,6}\\s+to\\b", Pattern.CASE_INSENSITIVE), "expense"),
        DirectionRule(Pattern.compile("purchase of\\b", Pattern.CASE_INSENSITIVE), "expense"),
        DirectionRule(Pattern.compile("\\bdebited\\b", Pattern.CASE_INSENSITIVE), "expense"),
        DirectionRule(Pattern.compile("\\bwithdrawn\\b", Pattern.CASE_INSENSITIVE), "expense"),
        DirectionRule(Pattern.compile("\\bspent\\b", Pattern.CASE_INSENSITIVE), "expense"),
        DirectionRule(Pattern.compile("received from\\b", Pattern.CASE_INSENSITIVE), "income"),
        DirectionRule(Pattern.compile("\\bdeposited\\b", Pattern.CASE_INSENSITIVE), "income"),
        DirectionRule(Pattern.compile("\\bsalary\\b", Pattern.CASE_INSENSITIVE), "income"),
        DirectionRule(Pattern.compile("\\bcredited(?!\\s+back)\\b", Pattern.CASE_INSENSITIVE), "income")
    )

    private val MERCHANT_PATTERNS = listOf(
        Pattern.compile("([a-z0-9._-]{2,}@(?:ybl|okhdfc|okaxis|oksbi|okicici|paytm|axl|ibl|upi))\\b", Pattern.CASE_INSENSITIVE),
        Pattern.compile("(?:vpa|upi\\s*id)\\s*[:\\-]?\\s*([a-z0-9._-]+@[a-z0-9]+)", Pattern.CASE_INSENSITIVE),
        Pattern.compile("info:\\s*upi(?:\\/[^\\s\\/]+){1,8}\\/([A-Za-z][A-Za-z0-9 .@_-]{1,32})", Pattern.CASE_INSENSITIVE),
        Pattern.compile("(?:paid|sent|transferred)\\b(?:\\s+\\S+){0,6}\\s+to\\s+([A-Za-z0-9@][A-Za-z0-9 .@_-]{1,40}?)(?=\\s+via|\\s+on|\\s+ref|\\s+upi|\\s+avl|[.]|$)", Pattern.CASE_INSENSITIVE),
        Pattern.compile("\\bat\\s+([A-Za-z][A-Za-z0-9 .@_-]{1,40}?)(?=\\s+via|\\s+on|\\s+ref|\\s+upi|\\s+avl|\\s+has|[.]|$)", Pattern.CASE_INSENSITIVE),
        Pattern.compile("\\bto\\s+([A-Za-z][A-Za-z0-9 .@_-]{1,40}?)(?=\\s+via|\\s+on|\\s+ref|\\s+upi|\\s+avl|\\s+has|[.]|$)", Pattern.CASE_INSENSITIVE),
        Pattern.compile("\\bfrom\\s+([A-Za-z][A-Za-z0-9 .@_-]{1,40}?)(?=\\s+via|\\s+on|\\s+ref|\\s+upi|\\s+avl|\\s+has|[.]|$)", Pattern.CASE_INSENSITIVE),
        Pattern.compile("\\bfor\\s+([A-Za-z][A-Za-z0-9 .@_-]{1,40}?)(?=\\s+via|\\s+on|\\s+ref|\\s+upi|\\s+avl|\\s+has|[.]|$)", Pattern.CASE_INSENSITIVE)
    )

    private val CURRENCY_PATTERNS = listOf(
        Pattern.compile("(?:rs\\.?|inr|₹)\\s*([\\d,]+(?:\\.\\d{1,2})?)", Pattern.CASE_INSENSITIVE),
        Pattern.compile("([\\d,]+(?:\\.\\d{1,2})?)\\s*(?:rupees|rs\\.?|inr)\\b", Pattern.CASE_INSENSITIVE)
    )
    private val BARE_AMOUNT = Pattern.compile("\\b(\\d+(?:\\.\\d{1,2})?)\\b")
    private val BALANCE_CONTEXT = Pattern.compile("\\b(avl\\.?|bal\\.?|balance|available)\\b", Pattern.CASE_INSENSITIVE)
    private val ACCOUNT_PREFIX = Pattern.compile("xx|\\*\\*|x{2,}", Pattern.CASE_INSENSITIVE)
    private val ACCOUNT_PATTERN = Pattern.compile("(?:a/c|card|account)\\s*.*?(\\d{4})\\b", Pattern.CASE_INSENSITIVE)
    private val BLOCKED_MERCHANT = Pattern.compile("^(your|a/c|ac|acct|account|the|a|an)\\b", Pattern.CASE_INSENSITIVE)
    private val ACCOUNT_WORD = Pattern.compile("\\b(a/c|account|acct)\\b", Pattern.CASE_INSENSITIVE)

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
            val tempMap = linkedMapOf<String, List<String>>()
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

    private data class DirectionHit(val type: String, val index: Int)

    private fun findDirection(text: String): DirectionHit {
        val hits = mutableListOf<Triple<String, Int, Int>>()
        for (rule in DIRECTION_RULES) {
            val matcher = rule.pattern.matcher(text)
            while (matcher.find()) {
                hits.add(Triple(rule.type, matcher.start(), matcher.end() - matcher.start()))
            }
        }
        if (hits.isEmpty()) return DirectionHit("expense", -1)
        hits.sortWith(compareBy<Triple<String, Int, Int>> { it.second }.thenByDescending { it.third })
        return DirectionHit(hits[0].first, hits[0].second)
    }

    private fun isBalanceContext(text: String, index: Int): Boolean {
        val start = (index - 28).coerceAtLeast(0)
        return BALANCE_CONTEXT.matcher(text.substring(start, index)).find()
    }

    private fun isAccountDigits(text: String, index: Int): Boolean {
        val start = (index - 4).coerceAtLeast(0)
        return ACCOUNT_PREFIX.matcher(text.substring(start, index)).find()
    }

    private data class AmountHit(val value: Double, val index: Int)

    private fun collectAmounts(text: String, allowBare: Boolean): List<AmountHit> {
        val hits = mutableListOf<AmountHit>()
        val seen = mutableSetOf<Int>()
        val patterns = CURRENCY_PATTERNS.toMutableList()
        if (allowBare) patterns.add(BARE_AMOUNT)

        for (pattern in patterns) {
            val matcher = pattern.matcher(text)
            while (matcher.find()) {
                val index = matcher.start()
                if (seen.contains(index) || isBalanceContext(text, index)) continue
                if (allowBare && isAccountDigits(text, index)) continue
                val raw = matcher.group(1)?.replace(",", "") ?: continue
                val value = raw.toDoubleOrNull() ?: continue
                if (value <= 0.0 || value >= 100000000.0) continue
                if (allowBare && raw.length == 4 && value >= 1900 && value <= 2100) continue
                seen.add(index)
                hits.add(AmountHit(value, index))
            }
        }
        return hits
    }

    private fun pickAmount(text: String, phraseIndex: Int): Double {
        val currencyHits = collectAmounts(text, false)
        val hits = if (currencyHits.isNotEmpty()) currencyHits else collectAmounts(text, true)
        if (hits.isEmpty()) return 0.0
        if (phraseIndex < 0) return hits[0].value
        return hits.minByOrNull { kotlin.math.abs(it.index - phraseIndex) }?.value ?: 0.0
    }

    private fun sumMathExpression(text: String): Double {
        val lower = text.lowercase()
        if (!text.contains("+") && !lower.contains("plus") && !Regex("\\bsum\\b").containsMatchIn(lower)) return 0.0
        val numbers = Regex("\\b\\d+(?:\\.\\d{1,2})?\\b").findAll(text)
            .mapNotNull { it.value.toDoubleOrNull() }
            .filter { it > 0.0 && it < 1000000.0 }
            .toList()
        if (numbers.size < 2) return 0.0
        return numbers.sum()
    }

    private fun cleanMerchant(raw: String): String? {
        val merchant = raw.trim().trimEnd('.', ' ')
        if (merchant.isEmpty() || merchant.length > 40) return null
        if (BLOCKED_MERCHANT.matcher(merchant).find()) return null
        if (ACCOUNT_WORD.matcher(merchant).find()) return null
        return merchant
    }

    private fun findMerchant(text: String): String {
        for (pattern in MERCHANT_PATTERNS) {
            val matcher = pattern.matcher(text)
            if (!matcher.find()) continue
            val merchant = cleanMerchant(matcher.group(1) ?: "") ?: continue
            return merchant
        }
        return ""
    }

    private fun mapPaymentMode(text: String): String {
        val lower = text.lowercase()
        return when {
            Regex("\\bcash\\b|\\bcod\\b|hand cash").containsMatchIn(lower) -> "Cash"
            Regex("credit card|\\bcreditcard\\b|\\bcc\\b").containsMatchIn(lower) -> "Credit Card"
            Regex("debit card|\\bdebitcard\\b|\\bdc\\b|\\bcard\\b").containsMatchIn(lower) -> "Debit Card"
            Regex("net banking|netbanking|\\bneft\\b|\\brtgs\\b|\\bimps\\b").containsMatchIn(lower) -> "Net Banking"
            else -> "UPI"
        }
    }

    @JvmStatic
    fun parse(context: Context?, sender: String, body: String, timestamp: Long = System.currentTimeMillis()): ParsedTransaction {
        loadLookupTable(context)
        val cleanBody = body.replace("\n", " ").replace("\r", " ").trim()

        val directionHit = findDirection(cleanBody)
        val mathAmount = sumMathExpression(cleanBody)
        val amount = if (mathAmount > 0.0) mathAmount else pickAmount(cleanBody, directionHit.index)
        val merchant = findMerchant(cleanBody).ifEmpty { "Unknown Merchant" }
        val paymentType = mapPaymentMode(cleanBody)

        var accountRef = ""
        val accMatcher = ACCOUNT_PATTERN.matcher(cleanBody)
        if (accMatcher.find()) {
            accountRef = accMatcher.group(1) ?: ""
        }

        var category = "Uncategorized"
        var subcategory = ""
        val lookup = categoryMap
        if (lookup != null) {
            val lowerBody = cleanBody.lowercase()
            val merchantLower = merchant.lowercase()
            loop@ for ((cat, keywords) in lookup) {
                for (kw in keywords) {
                    if (kw.isNotEmpty() && (lowerBody.contains(kw) || merchantLower.contains(kw))) {
                        category = cat.replaceFirstChar { it.uppercase() }
                        subcategory = kw.replaceFirstChar { it.uppercase() }
                        break@loop
                    }
                }
            }
        }

        val hasAmount = amount > 0.0
        val hasMerchant = merchant != "Unknown Merchant"
        val hasAccRef = accountRef.isNotEmpty()
        val confidence = if (hasAmount && hasMerchant && hasAccRef) "high" else "low"

        return ParsedTransaction(
            amount = amount,
            direction = directionHit.type,
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
