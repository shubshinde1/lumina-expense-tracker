package com.lumina.tracker

import android.content.Context
import org.json.JSONArray

object SmsDedupCache {
    private const val PREFS_NAME = "LuminaSmsDedup"
    private const val KEY_PROCESSED_HASHES = "processed_hashes"
    private const val MAX_SIZE = 100

    @JvmStatic
    @Synchronized
    fun isProcessed(context: Context, hash: String): Boolean {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val hashesJson = prefs.getString(KEY_PROCESSED_HASHES, "[]") ?: "[]"
        try {
            val jsonArray = JSONArray(hashesJson)
            for (i in 0 until jsonArray.length()) {
                if (jsonArray.getString(i) == hash) {
                    return true
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return false
    }

    @JvmStatic
    @Synchronized
    fun markProcessed(context: Context, hash: String) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val hashesJson = prefs.getString(KEY_PROCESSED_HASHES, "[]") ?: "[]"
        try {
            val list = mutableListOf<String>()
            val jsonArray = JSONArray(hashesJson)
            for (i in 0 until jsonArray.length()) {
                list.add(jsonArray.getString(i))
            }
            
            list.remove(hash)
            list.add(hash)

            while (list.size > MAX_SIZE) {
                list.removeAt(0)
            }

            val newArray = JSONArray(list)
            prefs.edit().putString(KEY_PROCESSED_HASHES, newArray.toString()).apply()
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}
