package com.lumina.tracker

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.telephony.SmsMessage
import android.util.Log
import androidx.work.Data
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager

class SmsReceiver : BroadcastReceiver() {

    companion object {
        private var mainActivityInstance: MainActivity? = null

        @JvmStatic
        fun setMainActivity(activity: MainActivity?) {
            mainActivityInstance = activity
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        if ("android.provider.Telephony.SMS_RECEIVED" == intent.action) {
            val bundle = intent.extras
            if (bundle != null) {
                val pdus = bundle.get("pdus") as? Array<*>
                if (pdus != null) {
                    for (pdu in pdus) {
                        val smsMessage = SmsMessage.createFromPdu(pdu as ByteArray)
                        val sender = smsMessage.displayOriginatingAddress ?: "Unknown"
                        val body = smsMessage.messageBody ?: ""

                        Log.d("LuminaSmsReceiver", "Incoming SMS from: $sender")

                        // 1. Transaction filter check
                        if (!TransactionSmsFilter.shouldProcess(body)) {
                            Log.d("LuminaSmsReceiver", "SMS does not match transaction patterns. Discarding.")
                            continue
                        }

                        // 2. Compute minute-bucketed hash
                        val timestamp = smsMessage.timestampMillis
                        val smsHash = SmsParser.computeSmsHash(sender, body, timestamp)

                        // 3. Deduplication check
                        if (SmsDedupCache.isProcessed(context, smsHash)) {
                            Log.d("LuminaSmsReceiver", "Duplicate SMS detected via hash: $smsHash. Dropping.")
                            continue
                        }

                        // 4. Mark processed immediately (Single Source of Truth)
                        SmsDedupCache.markProcessed(context, smsHash)

                        // 5. Run synchronous parser (Pure function, fast)
                        val parsed = SmsParser.parse(context, sender, body, timestamp)

                        // 6. Post notification immediately
                        TransactionNotifier.notify(context, parsed)

                        // 7. Queue WorkManager expedited sync task
                        val inputData = Data.Builder()
                            .putString("smsHash", smsHash)
                            .putDouble("amount", parsed.amount)
                            .putString("direction", parsed.direction)
                            .putString("paymentType", parsed.paymentType)
                            .putString("category", parsed.category)
                            .putString("subcategory", parsed.subcategory)
                            .putString("merchant", parsed.merchant)
                            .putString("accountRef", parsed.accountRef)
                            .putLong("timestamp", parsed.timestamp)
                            .putString("rawSms", parsed.rawSms)
                            .putString("confidence", parsed.confidence)
                            .build()

                        val syncRequest = OneTimeWorkRequestBuilder<SmsSyncWorker>()
                            .setInputData(inputData)
                            .build()

                        WorkManager.getInstance(context).enqueueUniqueWork(
                            smsHash,
                            ExistingWorkPolicy.KEEP,
                            syncRequest
                        )

                        // 8. If app webview is open, trigger foreground JS event
                        mainActivityInstance?.let { activity ->
                            activity.triggerSmsReceived(sender, body)
                        }
                    }
                }
            }
        }
    }
}
