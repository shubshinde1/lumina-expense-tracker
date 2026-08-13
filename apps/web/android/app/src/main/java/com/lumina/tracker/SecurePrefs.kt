package com.lumina.tracker

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKeys

object SecurePrefs {
    private const val SECURE_PREFS_NAME = "LuminaPrefsSecure"
    private const val KEY_TOKEN = "token"
    private const val KEY_API_URL = "apiUrl"
    private const val KEY_EMAIL = "email"

    private fun getEncryptedPrefs(context: Context) = try {
        val masterKeyAlias = MasterKeys.getOrCreate(MasterKeys.AES256_GCM_SPEC)
        EncryptedSharedPreferences.create(
            SECURE_PREFS_NAME,
            masterKeyAlias,
            context,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    } catch (e: Exception) {
        // Fallback to standard SharedPreferences in case of keystore failure
        context.getSharedPreferences(SECURE_PREFS_NAME, Context.MODE_PRIVATE)
    }

    @JvmStatic
    fun saveSession(context: Context, token: String, email: String, apiUrl: String) {
        val prefs = getEncryptedPrefs(context)
        prefs.edit()
            .putString(KEY_TOKEN, token)
            .putString(KEY_EMAIL, email)
            .putString(KEY_API_URL, apiUrl)
            .apply()
    }

    @JvmStatic
    fun clearSession(context: Context) {
        val prefs = getEncryptedPrefs(context)
        prefs.edit()
            .remove(KEY_TOKEN)
            .remove(KEY_EMAIL)
            .remove(KEY_API_URL)
            .apply()
    }

    @JvmStatic
    fun getToken(context: Context): String? {
        return getEncryptedPrefs(context).getString(KEY_TOKEN, null)
    }

    @JvmStatic
    fun getApiUrl(context: Context): String? {
        return getEncryptedPrefs(context).getString(KEY_API_URL, null)
    }

    @JvmStatic
    fun getEmail(context: Context): String? {
        return getEncryptedPrefs(context).getString(KEY_EMAIL, null)
    }
}
