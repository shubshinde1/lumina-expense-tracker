package com.lumina.tracker

import android.content.ContentValues
import android.content.Context
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import net.sqlcipher.database.SQLiteDatabase
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL

class SmsSyncWorker(
    context: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(context, workerParams) {

    companion object {
        private const val TAG = "LuminaSmsSyncWorker"
        private val ENTITY_ROUTES = mapOf(
            "transaction" to "/transactions",
            "category" to "/categories",
            "payment_mode" to "/payment-modes",
            "setting" to "/auth/settings"
        )
        private val ENTITY_TABLES = mapOf(
            "transaction" to "transactions",
            "category" to "categories",
            "payment_mode" to "payment_modes",
            "setting" to "settings"
        )
    }

    override suspend fun doWork(): Result {
        Log.d(TAG, "Background outbox sync worker started.")

        val token = SecurePrefs.getToken(applicationContext)
        val apiUrl = SecurePrefs.getApiUrl(applicationContext)

        if (token == null || apiUrl == null) {
            Log.w(TAG, "Missing active session credentials. Skipping background outbox sync.")
            return Result.success()
        }

        try {
            val helper = LuminaDatabaseHelper.getInstance(applicationContext)
            val passcode = SecurePrefs.getDatabasePasscode(applicationContext)
            val db = helper.getWritableDatabase(passcode)

            // 1. Fetch pending outbox records
            val cursor = db.rawQuery(
                "SELECT * FROM outbox WHERE status = 'pending' ORDER BY created_at ASC",
                null
            )

            val pendingList = mutableListOf<JSONObject>()
            while (cursor.moveToNext()) {
                val row = JSONObject().apply {
                    put("client_mutation_id", cursor.getString(cursor.getColumnIndexOrThrow("client_mutation_id")))
                    put("entity_type", cursor.getString(cursor.getColumnIndexOrThrow("entity_type")))
                    put("operation", cursor.getString(cursor.getColumnIndexOrThrow("operation")))
                    put("entity_local_id", cursor.getString(cursor.getColumnIndexOrThrow("entity_local_id")))
                    put("payload", cursor.getString(cursor.getColumnIndexOrThrow("payload")))
                    put("depends_on_temp_id", cursor.getString(cursor.getColumnIndexOrThrow("depends_on_temp_id")))
                    put("retry_count", cursor.getInt(cursor.getColumnIndexOrThrow("retry_count")))
                }
                pendingList.add(row)
            }
            cursor.close()

            if (pendingList.isEmpty()) {
                Log.d(TAG, "No pending outbox transactions to sync.")
                db.close()
                return Result.success()
            }

            // 2. Process outbox items sequentially (Topological ordering is handled by insertion order in background SMS case)
            for (item in pendingList) {
                val mutationId = item.getString("client_mutation_id")
                val entityType = item.getString("entity_type")
                val operation = item.getString("operation")
                val localId = item.getString("entity_local_id")
                val payloadStr = item.getString("payload")
                val retryCount = item.getInt("retry_count")

                val tableName = ENTITY_TABLES[entityType] ?: continue
                val route = ENTITY_ROUTES[entityType] ?: continue

                // Update outbox status to syncing
                val outboxSyncing = ContentValues().apply { put("status", "syncing") }
                db.update("outbox", outboxSyncing, "client_mutation_id = ?", arrayOf(mutationId))

                val entitySyncing = ContentValues().apply { put("sync_status", "syncing") }
                db.update(tableName, entitySyncing, "id = ?", arrayOf(localId))

                // Build Request connection
                val requestUrl = if (operation == "create") {
                    URL("$apiUrl$route")
                } else if (operation == "update" && entityType == "setting") {
                    URL("$apiUrl$route")
                } else {
                    val serverId = getServerId(db, tableName, localId)
                    if (serverId.isNullOrEmpty()) {
                        if (operation == "delete") {
                            // Unsynced deletion, purge locally
                            db.delete(tableName, "id = ?", arrayOf(localId))
                            db.delete("outbox", "client_mutation_id = ?", arrayOf(mutationId))
                            continue
                        }
                        Log.e(TAG, "Missing server_id for outbox operation $operation on $localId")
                        markFailed(db, tableName, localId, mutationId)
                        continue
                    }
                    if (operation == "delete") URL("$apiUrl$route/$serverId") else URL("$apiUrl$route/$serverId")
                }

                val method = when (operation) {
                    "create" -> "POST"
                    "update" -> "PUT"
                    "delete" -> "DELETE"
                    else -> "POST"
                }

                try {
                    val conn = requestUrl.openConnection() as HttpURLConnection
                    conn.requestMethod = method
                    conn.setRequestProperty("Content-Type", "application/json; utf-8")
                    conn.setRequestProperty("Accept", "application/json")
                    conn.setRequestProperty("Authorization", "Bearer $token")
                    conn.setRequestProperty("Idempotency-Key", mutationId)
                    conn.connectTimeout = 15000
                    conn.readTimeout = 15000

                    if (operation != "delete") {
                        conn.doOutput = true
                        conn.outputStream.use { os ->
                            val input = payloadStr.toByteArray(Charsets.UTF_8)
                            os.write(input, 0, input.size)
                        }
                    }

                    val code = conn.responseCode
                    if (code == 200 || code == 201) {
                        // Success! Read response
                        val responseText = conn.inputStream.bufferedReader().use(BufferedReader::readText)
                        val resJson = JSONObject(responseText)
                        
                        // Extract serverId
                        val serverId = resJson.optString("_id", "")
                            .ifEmpty { resJson.optString("id", "") }
                            .ifEmpty { resJson.optJSONObject("transaction")?.optString("_id", "") ?: "" }
                            .ifEmpty { resJson.optJSONObject("category")?.optString("_id", "") ?: "" }
                            .ifEmpty { resJson.optJSONObject("paymentMode")?.optString("_id", "") ?: "" }

                        db.beginTransaction()
                        try {
                            if (operation == "delete") {
                                db.delete(tableName, "id = ?", arrayOf(localId))
                            } else {
                                val resolvedServerId = if (serverId.isNotEmpty()) serverId else localId
                                val entityVals = ContentValues().apply {
                                    put("server_id", resolvedServerId)
                                    put("sync_status", "synced")
                                    put("updated_at", resJson.optLong("updatedAt", System.currentTimeMillis()))
                                }
                                db.update(tableName, entityVals, "id = ?", arrayOf(localId))

                                // If created, propagate ID replacement to outbox dependencies
                                if (resolvedServerId != localId) {
                                    reconcileSqliteDependencies(db, localId, resolvedServerId)
                                }
                            }
                            // Remove outbox entry
                            db.delete("outbox", "client_mutation_id = ?", arrayOf(mutationId))
                            db.setTransactionSuccessful()
                        } finally {
                            db.endTransaction()
                        }
                        Log.d(TAG, "Outbox item $mutationId synced successfully.")
                    } else {
                        Log.e(TAG, "Server responded with status: $code")
                        if (code >= 500) {
                            // Transient 5xx, rollback outbox state and retry later
                            rollbackPending(db, tableName, localId, mutationId, retryCount + 1)
                            db.close()
                            return Result.retry()
                        } else {
                            // Permanent 4xx, flag failed
                            markFailed(db, tableName, localId, mutationId)
                        }
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Network connection error syncing outbox item $mutationId: ${e.message}", e)
                    rollbackPending(db, tableName, localId, mutationId, retryCount + 1)
                    db.close()
                    return Result.retry()
                }
            }

            db.close()
            return Result.success()
        } catch (e: Exception) {
            Log.e(TAG, "Background outbox sync worker failed to execute: ${e.message}", e)
            return Result.retry()
        }
    }

    private fun getServerId(db: SQLiteDatabase, tableName: String, localId: String): String? {
        var serverId: String? = null
        val cursor = db.rawQuery("SELECT server_id FROM $tableName WHERE id = ?", arrayOf(localId))
        if (cursor.moveToFirst()) {
            serverId = cursor.getString(0)
        }
        cursor.close()
        return serverId
    }

    private fun markFailed(db: SQLiteDatabase, tableName: String, localId: String, mutationId: String) {
        val outboxVals = ContentValues().apply { put("status", "failed") }
        db.update("outbox", outboxVals, "client_mutation_id = ?", arrayOf(mutationId))

        val entityVals = ContentValues().apply { put("sync_status", "failed") }
        db.update(tableName, entityVals, "id = ?", arrayOf(localId))
    }

    private fun rollbackPending(db: SQLiteDatabase, tableName: String, localId: String, mutationId: String, nextRetry: Int) {
        val outboxVals = ContentValues().apply {
            put("status", "pending")
            put("retry_count", nextRetry)
            put("last_attempt_at", System.currentTimeMillis())
        }
        db.update("outbox", outboxVals, "client_mutation_id = ?", arrayOf(mutationId))

        val entityVals = ContentValues().apply { put("sync_status", "pending") }
        db.update(tableName, entityVals, "id = ?", arrayOf(localId))
    }

    private fun reconcileSqliteDependencies(db: SQLiteDatabase, tempId: String, serverId: String) {
        // Resolve outbox dependencies payloads
        val cursor = db.rawQuery("SELECT client_mutation_id, payload, depends_on_temp_id FROM outbox", null)
        while (cursor.moveToNext()) {
            val mutId = cursor.getString(0)
            var payloadStr = cursor.getString(1)
            var dependsId = cursor.getString(2)
            var dirty = false

            if (dependsId == tempId) {
                dependsId = null
                dirty = true
            }

            if (payloadStr.contains(tempId)) {
                payloadStr = payloadStr.replace(tempId, serverId)
                dirty = true
            }

            if (dirty) {
                val vals = ContentValues().apply {
                    put("payload", payloadStr)
                    put("depends_on_temp_id", dependsId)
                }
                db.update("outbox", vals, "client_mutation_id = ?", arrayOf(mutId))
            }
        }
        cursor.close()

        // Resolve SQLite tables category/paymentMode references
        db.execSQL(
            "UPDATE transactions SET category = ?, depends_on_temp_id = NULL WHERE category = ?",
            arrayOf(serverId, tempId)
        )
        db.execSQL(
            "UPDATE transactions SET subcategory = ?, depends_on_temp_id = NULL WHERE subcategory = ?",
            arrayOf(serverId, tempId)
        )
    }
}
