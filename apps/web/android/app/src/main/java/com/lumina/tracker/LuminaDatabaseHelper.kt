package com.lumina.tracker

import android.content.Context
import net.sqlcipher.database.SQLiteDatabase
import net.sqlcipher.database.SQLiteOpenHelper

class LuminaDatabaseHelper private constructor(context: Context) :
    SQLiteOpenHelper(context, DATABASE_NAME, null, DATABASE_VERSION) {

    companion object {
        const val DATABASE_NAME = "LuminaDB.db"
        const val DATABASE_VERSION = 2

        private var instance: LuminaDatabaseHelper? = null

        @Synchronized
        fun getInstance(context: Context): LuminaDatabaseHelper {
            if (instance == null) {
                SQLiteDatabase.loadLibs(context.applicationContext)
                instance = LuminaDatabaseHelper(context.applicationContext)
            }
            return instance!!
        }
    }

    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL("""
            CREATE TABLE IF NOT EXISTS transactions (
                id TEXT PRIMARY KEY,
                server_id TEXT,
                client_mutation_id TEXT NOT NULL,
                type TEXT NOT NULL,
                amount REAL NOT NULL,
                date TEXT NOT NULL,
                description TEXT,
                category TEXT NOT NULL,
                subcategory TEXT,
                paymentMode TEXT,
                subPaymentMode TEXT,
                location TEXT,
                sync_status TEXT DEFAULT 'pending',
                depends_on_temp_id TEXT,
                updated_at INTEGER NOT NULL,
                deleted INTEGER DEFAULT 0
            );
        """.trimIndent())

        db.execSQL("""
            CREATE TABLE IF NOT EXISTS outbox (
                client_mutation_id TEXT PRIMARY KEY,
                entity_type TEXT NOT NULL,
                operation TEXT NOT NULL,
                entity_local_id TEXT NOT NULL,
                payload TEXT NOT NULL,
                depends_on_temp_id TEXT,
                status TEXT DEFAULT 'pending',
                retry_count INTEGER DEFAULT 0,
                created_at INTEGER NOT NULL,
                last_attempt_at INTEGER
            );
        """.trimIndent())

        db.execSQL("""
            CREATE TABLE IF NOT EXISTS sync_meta (
                entity_type TEXT PRIMARY KEY,
                last_fetched_at INTEGER NOT NULL
            );
        """.trimIndent())

        db.execSQL("""
            CREATE TABLE IF NOT EXISTS categories (
                id TEXT PRIMARY KEY,
                server_id TEXT,
                client_mutation_id TEXT,
                name TEXT NOT NULL,
                icon TEXT,
                color TEXT,
                type TEXT,
                subcategories TEXT,
                isGlobal INTEGER DEFAULT 0,
                sync_status TEXT DEFAULT 'pending',
                depends_on_temp_id TEXT,
                updated_at INTEGER NOT NULL,
                deleted INTEGER DEFAULT 0
            );
        """.trimIndent())

        db.execSQL("""
            CREATE TABLE IF NOT EXISTS payment_modes (
                id TEXT PRIMARY KEY,
                server_id TEXT,
                client_mutation_id TEXT,
                name TEXT NOT NULL,
                type TEXT,
                subPaymentModes TEXT,
                isCustom INTEGER DEFAULT 0,
                sync_status TEXT DEFAULT 'pending',
                depends_on_temp_id TEXT,
                updated_at INTEGER NOT NULL,
                deleted INTEGER DEFAULT 0
            );
        """.trimIndent())

        db.execSQL("""
            CREATE TABLE IF NOT EXISTS settings (
                id TEXT PRIMARY KEY,
                server_id TEXT,
                client_mutation_id TEXT,
                autoOpenKeyboard INTEGER DEFAULT 0,
                smsParserActive INTEGER DEFAULT 0,
                sync_status TEXT DEFAULT 'pending',
                depends_on_temp_id TEXT,
                updated_at INTEGER NOT NULL,
                deleted INTEGER DEFAULT 0
            );
        """.trimIndent())
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        onCreate(db)
    }

    override fun getWritableDatabase(passcode: String): SQLiteDatabase {
        return super.getWritableDatabase(passcode)
    }

    override fun getReadableDatabase(passcode: String): SQLiteDatabase {
        return super.getReadableDatabase(passcode)
    }
}
