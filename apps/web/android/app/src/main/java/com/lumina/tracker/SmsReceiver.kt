package com.lumina.tracker

import android.content.BroadcastReceiver
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.telephony.SmsMessage
import android.util.Log
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import net.sqlcipher.database.SQLiteDatabase
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.UUID

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

                        // 5. Run synchronous parser
                        val parsed = SmsParser.parse(context, sender, body, timestamp)

                        // 6. Post notification immediately
                        TransactionNotifier.notify(context, parsed)

                        // 7. Write directly to shared local SQLite DB and populate Outbox
                        try {
                            val helper = LuminaDatabaseHelper.getInstance(context)
                            val passcode = SecurePrefs.getDatabasePasscode(context)
                            val db = helper.getWritableDatabase(passcode)

                            val tempId = UUID.randomUUID().toString()
                            val mutationId = UUID.randomUUID().toString()

                            // Resolve category ID in SQLite database
                            val resolvedCategoryId = getCategoryIdByName(db, parsed.category)

                            // Date formatter in ISO 8601 UTC
                            val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
                            sdf.timeZone = TimeZone.getTimeZone("UTC")
                            val isoDate = sdf.format(Date(parsed.timestamp))

                            // Insert local transaction record
                            val txValues = ContentValues().apply {
                                put("id", tempId)
                                put("server_id", null as String?)
                                put("client_mutation_id", mutationId)
                                put("type", parsed.direction)
                                put("amount", parsed.amount)
                                put("date", isoDate)
                                put("description", "SMS: ${parsed.merchant}")
                                put("category", resolvedCategoryId)
                                put("subcategory", parsed.subcategory)
                                put("paymentMode", parsed.paymentType)
                                put("subPaymentMode", null as String?)
                                put("location", null as String?)
                                put("sync_status", "pending")
                                put("depends_on_temp_id", null as String?)
                                put("updated_at", System.currentTimeMillis())
                                put("deleted", 0)
                            }
                            db.insertWithOnConflict("transactions", null, txValues, SQLiteDatabase.CONFLICT_REPLACE)

                            // Generate outbox payload
                            val payloadJson = JSONObject().apply {
                                put("type", parsed.direction)
                                put("amount", parsed.amount)
                                put("date", isoDate)
                                put("description", "SMS: ${parsed.merchant}")
                                put("category", resolvedCategoryId)
                                put("subcategory", parsed.subcategory)
                                put("paymentMode", parsed.paymentType)
                                
                                val metadata = JSONObject().apply {
                                    put("smsHash", smsHash)
                                    put("rawSms", body)
                                }
                                put("metadata", metadata)
                            }

                            // Insert local outbox record
                            val outboxValues = ContentValues().apply {
                                put("client_mutation_id", mutationId)
                                put("entity_type", "transaction")
                                put("operation", "create")
                                put("entity_local_id", tempId)
                                put("payload", payloadJson.toString())
                                put("depends_on_temp_id", null as String?)
                                put("status", "pending")
                                put("retry_count", 0)
                                put("created_at", System.currentTimeMillis())
                                put("last_attempt_at", null as Long?)
                            }
                            db.insertWithOnConflict("outbox", null, outboxValues, SQLiteDatabase.CONFLICT_REPLACE)

                            db.close()
                            Log.d("LuminaSmsReceiver", "Successfully wrote transaction $tempId and outbox $mutationId to local SQLite database.")

                            // 8. Queue WorkManager outbox sync task (tries to push outbox immediately)
                            val syncRequest = OneTimeWorkRequestBuilder<SmsSyncWorker>().build()
                            WorkManager.getInstance(context).enqueueUniqueWork(
                                "OutboxSyncWork",
                                ExistingWorkPolicy.KEEP,
                                syncRequest
                            )
                        } catch (e: Exception) {
                            Log.e("LuminaSmsReceiver", "Failed to write transaction directly to local SQLite DB", e)
                        }

                        // 9. If app webview is open, trigger foreground JS event
                        mainActivityInstance?.let { activity ->
                            activity.triggerSmsReceived(sender, body)
                        }
                    }
                }
            }
        }
    }

    private fun getCategoryIdByName(db: SQLiteDatabase, name: String): String {
        var resolvedId = "uncategorized_temp_id"

        // 1. Search matching name
        val cursor = db.rawQuery("SELECT id FROM categories WHERE LOWER(name) = LOWER(?) LIMIT 1", arrayOf(name))
        if (cursor.moveToFirst()) {
            resolvedId = cursor.getString(0)
            cursor.close()
            return resolvedId
        }
        cursor.close()

        // 2. Fallback: Search default label
        val defaultCursor = db.rawQuery("SELECT id FROM categories WHERE LOWER(name) IN ('others', 'uncategorized', 'other') LIMIT 1", null)
        if (defaultCursor.moveToFirst()) {
            resolvedId = defaultCursor.getString(0)
            defaultCursor.close()
            return resolvedId
        }
        defaultCursor.close()

        // 3. Ultimate Fallback: First available record
        val firstCursor = db.rawQuery("SELECT id FROM categories LIMIT 1", null)
        if (firstCursor.moveToFirst()) {
            resolvedId = firstCursor.getString(0)
        }
        firstCursor.close()

        return resolvedId
    }
}
