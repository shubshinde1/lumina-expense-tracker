package com.lumina.tracker

import android.content.Context
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

class SmsSyncWorker(
    context: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(context, workerParams) {

    override suspend fun doWork(): Result {
        val smsHash = inputData.getString("smsHash") ?: return Result.failure()
        val amount = inputData.getDouble("amount", 0.0)
        val direction = inputData.getString("direction") ?: "expense"
        val paymentType = inputData.getString("paymentType") ?: "Other"
        val category = inputData.getString("category") ?: "Uncategorized"
        val subcategory = inputData.getString("subcategory") ?: ""
        val merchant = inputData.getString("merchant") ?: "Unknown Merchant"
        val accountRef = inputData.getString("accountRef") ?: ""
        val timestamp = inputData.getLong("timestamp", System.currentTimeMillis())
        val rawSms = inputData.getString("rawSms") ?: ""
        val confidence = inputData.getString("confidence") ?: "low"

        val token = SecurePrefs.getToken(applicationContext)
        val apiUrl = SecurePrefs.getApiUrl(applicationContext)

        if (token == null || apiUrl == null) {
            Log.w("LuminaSmsSyncWorker", "No auth token or API URL found in SecurePrefs. Saving locally as fallback.")
            saveToOfflineQueue(rawSms)
            return Result.failure()
        }

        try {
            val url = URL("$apiUrl/transactions/auto-log")
            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "POST"
            conn.setRequestProperty("Content-Type", "application/json; utf-8")
            conn.setRequestProperty("Accept", "application/json")
            conn.setRequestProperty("Authorization", "Bearer $token")
            conn.doOutput = true
            conn.connectTimeout = 15000
            conn.readTimeout = 15000

            val jsonPayload = JSONObject().apply {
                put("smsHash", smsHash)
                put("rawSms", rawSms)
                
                val parsedTxJson = JSONObject().apply {
                    put("amount", amount)
                    put("direction", direction)
                    put("paymentType", paymentType)
                    put("category", category)
                    put("subcategory", subcategory)
                    put("merchant", merchant)
                    put("accountRef", accountRef)
                    put("timestamp", timestamp)
                    put("confidence", confidence)
                }
                put("parsedTransaction", parsedTxJson)
            }

            val jsonInputString = jsonPayload.toString()
            conn.outputStream.use { os ->
                val input = jsonInputString.toByteArray(Charsets.UTF_8)
                os.write(input, 0, input.size)
            }

            val responseCode = conn.responseCode
            if (responseCode == 200 || responseCode == 201) {
                Log.d("LuminaSmsSyncWorker", "Sync successful for SMS Hash: $smsHash")
                return Result.success()
            } else {
                Log.e("LuminaSmsSyncWorker", "API returned error code: $responseCode")
                return if (responseCode >= 500) {
                    Result.retry()
                } else {
                    saveToOfflineQueue(rawSms)
                    Result.failure()
                }
            }
        } catch (e: Exception) {
            Log.e("LuminaSmsSyncWorker", "Error uploading SMS: ${e.message}", e)
            return Result.retry()
        }
    }

    private fun saveToOfflineQueue(rawSms: String) {
        try {
            val prefs = applicationContext.getSharedPreferences("LuminaPrefs", Context.MODE_PRIVATE)
            val pendingJson = prefs.getString("pendingSmsList", "[]") ?: "[]"
            val array = org.json.JSONArray(pendingJson)
            
            var exists = false
            for (i in 0 until array.length()) {
                if (array.getString(i) == rawSms) {
                    exists = true
                    break
                }
            }
            if (!exists) {
                array.put(rawSms)
                prefs.edit().putString("pendingSmsList", array.toString()).apply()
                Log.d("LuminaSmsSyncWorker", "Saved offline transaction fallback queue.")
            }
        } catch (e: Exception) {
            Log.e("LuminaSmsSyncWorker", "Failed to cache offline SMS", e)
        }
    }
}
