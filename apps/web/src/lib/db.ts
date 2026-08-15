import Dexie, { type Table } from 'dexie';
import { Capacitor, registerPlugin } from '@capacitor/core';

// Dexie Web DB Schema
export class DexieLuminaDB extends Dexie {
  transactions!: Table<any>;
  categories!: Table<any>;
  payment_modes!: Table<any>;
  settings!: Table<any>;
  outbox!: Table<any>;
  sync_meta!: Table<any>;

  constructor() {
    super('LuminaDB');
    this.version(1).stores({
      transactions: 'id, server_id, client_mutation_id, sync_status, depends_on_temp_id, updated_at, deleted',
      categories: 'id, server_id, client_mutation_id, sync_status, depends_on_temp_id, updated_at, deleted',
      payment_modes: 'id, server_id, client_mutation_id, sync_status, depends_on_temp_id, updated_at, deleted',
      settings: 'id, server_id, client_mutation_id, sync_status, depends_on_temp_id, updated_at, deleted',
      outbox: 'client_mutation_id, entity_type, status, depends_on_temp_id, created_at',
      sync_meta: 'entity_type'
    });
  }
}

// Simple Web Crypto API Helper for Web Encrypted IndexedDB
const getCryptoKey = async (salt: string): Promise<CryptoKey> => {
  const enc = new TextEncoder();
  const rawKey = enc.encode(salt + "lumina_encryption_salt_1938");
  return crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  ).then(key => crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode("unique_salt_string"),
      iterations: 1000,
      hash: "SHA-256"
    },
    key,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  ));
};

export const encryptString = async (text: string, secretSalt: string): Promise<string> => {
  if (!text) return text;
  try {
    const key = await getCryptoKey(secretSalt);
    const enc = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      enc.encode(text)
    );
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    return btoa(String.fromCharCode(...combined));
  } catch (e) {
    console.error("Encryption failed:", e);
    return text;
  }
};

export const decryptString = async (cipherText: string, secretSalt: string): Promise<string> => {
  if (!cipherText) return cipherText;
  try {
    const key = await getCryptoKey(secretSalt);
    const dec = new TextDecoder();
    const combined = new Uint8Array(
      atob(cipherText).split("").map(c => c.charCodeAt(0))
    );
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      data
    );
    return dec.decode(decrypted);
  } catch (e) {
    console.error("Decryption failed:", e);
    return cipherText;
  }
};

// Unified Database Class
class LuminaDBClient {
  private dexieDB: DexieLuminaDB | null = null;
  private sqliteDB: any = null;
  private isInitialized = false;
  private changeListeners = new Set<() => void>();
  private secretKey: string = 'lumina_session_default_salt';

  constructor() {
    if (typeof window !== 'undefined') {
      const isNative = Capacitor.isNativePlatform();
      if (!isNative) {
        this.dexieDB = new DexieLuminaDB();
        this.isInitialized = true;
      }
    }
  }

  // Load encryption salt from logged-in user
  updateSecretSalt(userTokenOrEmail: string) {
    if (userTokenOrEmail) {
      this.secretKey = userTokenOrEmail;
    }
  }

  // Subscriptions for React updates
  subscribe(callback: () => void) {
    this.changeListeners.add(callback);
    return () => {
      this.changeListeners.delete(callback);
    };
  }

  notifyChange() {
    this.changeListeners.forEach(cb => {
      try { cb(); } catch (e) {}
    });
  }

  async init() {
    if (this.isInitialized) return;
    if (typeof window === 'undefined') return;

    const isNative = Capacitor.isNativePlatform();
    if (isNative) {
      try {
        const { SQLiteConnection } = await import('@capacitor-community/sqlite');
        const sqlitePlugin = registerPlugin<any>('CapacitorSQLite');
        const sqlite = new SQLiteConnection(sqlitePlugin);

        // Fetch native keystore passcode
        let dbPassphrase = "default_passcode_9281729";
        try {
          const LuminaBridge = registerPlugin<any>('LuminaBridge');
          const secureKeyRes = await LuminaBridge.getDatabasePasscode();
          if (secureKeyRes && secureKeyRes.passcode) {
            dbPassphrase = secureKeyRes.passcode;
          }
        } catch (e) {
          console.warn("LuminaBridge passcode fetch unavailable, falling back to session salt");
        }

        // Set the encryption secret on SQLiteConnection
        try {
          const isSecretStored = await sqlite.isSecretStored();
          if (!isSecretStored) {
            await sqlite.setEncryptionSecret(dbPassphrase);
          }
        } catch (secErr) {
          console.warn("Failed to set encryption secret, trying to proceed:", secErr);
        }

        // Initialize SQLite Encrypted database connection
        const db = await sqlite.createConnection(
          'LuminaDB.db',
          true, // encrypted
          'secret', // mode
          1,
          false
        );
        await db.open();
        this.sqliteDB = db;

        // Create tables if they do not exist
        await this.createSqliteSchema();
        this.isInitialized = true;
      } catch (err) {
        console.error("SQLite initialization failed:", err);
        // Fallback to Dexie if SQLite fails
        this.dexieDB = new DexieLuminaDB();
        this.isInitialized = true;
      }
    }
  }

  private async createSqliteSchema() {
    const tableQueries = [
      `CREATE TABLE IF NOT EXISTS transactions (
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
      );`,
      `CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        server_id TEXT,
        client_mutation_id TEXT NOT NULL,
        name TEXT NOT NULL,
        icon TEXT NOT NULL,
        color TEXT NOT NULL,
        subcategories TEXT,
        sync_status TEXT DEFAULT 'pending',
        depends_on_temp_id TEXT,
        updated_at INTEGER NOT NULL,
        deleted INTEGER DEFAULT 0
      );`,
      `CREATE TABLE IF NOT EXISTS payment_modes (
        id TEXT PRIMARY KEY,
        server_id TEXT,
        client_mutation_id TEXT NOT NULL,
        name TEXT NOT NULL,
        subPaymentModes TEXT,
        sync_status TEXT DEFAULT 'pending',
        depends_on_temp_id TEXT,
        updated_at INTEGER NOT NULL,
        deleted INTEGER DEFAULT 0
      );`,
      `CREATE TABLE IF NOT EXISTS settings (
        id TEXT PRIMARY KEY,
        server_id TEXT,
        client_mutation_id TEXT NOT NULL,
        autoOpenKeyboard INTEGER DEFAULT 1,
        smsParserActive INTEGER DEFAULT 1,
        sync_status TEXT DEFAULT 'pending',
        depends_on_temp_id TEXT,
        updated_at INTEGER NOT NULL,
        deleted INTEGER DEFAULT 0
      );`,
      `CREATE TABLE IF NOT EXISTS outbox (
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
      );`,
      `CREATE TABLE IF NOT EXISTS sync_meta (
        entity_type TEXT PRIMARY KEY,
        last_fetched_at INTEGER NOT NULL
      );`
    ];

    for (const sql of tableQueries) {
      await this.sqliteDB.execute(sql);
    }
  }

  // --- CRUD Wrapper Abstraction ---
  async getTableItems(tableName: string): Promise<any[]> {
    await this.init();
    if (this.sqliteDB) {
      const res = await this.sqliteDB.query(`SELECT * FROM ${tableName} WHERE deleted = 0`);
      const items = res.values || [];
      return items.map((item: any) => {
        // Parse nested text objects
        if (item.subcategories && typeof item.subcategories === 'string') {
          try { item.subcategories = JSON.parse(item.subcategories); } catch {}
        }
        if (item.subPaymentModes && typeof item.subPaymentModes === 'string') {
          try { item.subPaymentModes = JSON.parse(item.subPaymentModes); } catch {}
        }
        if (item.location && typeof item.location === 'string') {
          try { item.location = JSON.parse(item.location); } catch {}
        }
        return item;
      });
    } else {
      const items = await (this.dexieDB as any)[tableName].toArray();
      // Decrypt transaction details for web IndexDB
      if (tableName === 'transactions') {
        const decryptedItems = [];
        for (const item of items) {
          const dec = { ...item };
          if (dec.description) dec.description = await decryptString(dec.description, this.secretKey);
          if (dec.location && typeof dec.location === 'string') {
            const locStr = await decryptString(dec.location, this.secretKey);
            try { dec.location = JSON.parse(locStr); } catch {}
          }
          decryptedItems.push(dec);
        }
        return decryptedItems.filter((i: any) => !i.deleted);
      }
      return items.filter((i: any) => !i.deleted);
    }
  }

  async getItemById(tableName: string, id: string): Promise<any | null> {
    await this.init();
    if (this.sqliteDB) {
      const res = await this.sqliteDB.query(`SELECT * FROM ${tableName} WHERE id = ?`, [id]);
      if (res.values && res.values.length > 0) {
        const item = res.values[0];
        if (item.subcategories && typeof item.subcategories === 'string') {
          try { item.subcategories = JSON.parse(item.subcategories); } catch {}
        }
        if (item.subPaymentModes && typeof item.subPaymentModes === 'string') {
          try { item.subPaymentModes = JSON.parse(item.subPaymentModes); } catch {}
        }
        if (item.location && typeof item.location === 'string') {
          try { item.location = JSON.parse(item.location); } catch {}
        }
        return item;
      }
      return null;
    } else {
      const item = await (this.dexieDB as any)[tableName].get(id);
      if (item && tableName === 'transactions') {
        const dec = { ...item };
        if (dec.description) dec.description = await decryptString(dec.description, this.secretKey);
        if (dec.location && typeof dec.location === 'string') {
          const locStr = await decryptString(dec.location, this.secretKey);
          try { dec.location = JSON.parse(locStr); } catch {}
        }
        return dec;
      }
      return item || null;
    }
  }

  async putItem(tableName: string, item: any): Promise<void> {
    await this.init();
    if (this.sqliteDB) {
      const keys = Object.keys(item);
      const placeholders = keys.map(() => '?').join(',');
      const values = keys.map(k => {
        const v = item[k];
        if (v !== null && typeof v === 'object') {
          return JSON.stringify(v);
        }
        return v;
      });

      const sql = `INSERT OR REPLACE INTO ${tableName} (${keys.join(',')}) VALUES (${placeholders})`;
      await this.sqliteDB.run(sql, values);
    } else {
      // Encrypt description and location before saving to Dexie web db
      const encItem = { ...item };
      if (tableName === 'transactions') {
        if (encItem.description) {
          encItem.description = await encryptString(encItem.description, this.secretKey);
        }
        if (encItem.location && typeof encItem.location === 'object') {
          encItem.location = await encryptString(JSON.stringify(encItem.location), this.secretKey);
        }
      }
      await (this.dexieDB as any)[tableName].put(encItem);
    }
    this.notifyChange();
  }

  async deleteItem(tableName: string, id: string): Promise<void> {
    await this.init();
    const existing = await this.getItemById(tableName, id);
    if (existing) {
      // Soft delete: mark deleted = 1 and sync_status = 'pending'
      const softDeletedItem = {
        ...existing,
        deleted: 1,
        sync_status: 'pending',
        updated_at: Date.now()
      };
      await this.putItem(tableName, softDeletedItem);
    }
  }

  async purgeItemPermanently(tableName: string, id: string): Promise<void> {
    await this.init();
    if (this.sqliteDB) {
      await this.sqliteDB.run(`DELETE FROM ${tableName} WHERE id = ?`, [id]);
    } else {
      await (this.dexieDB as any)[tableName].delete(id);
    }
    this.notifyChange();
  }

  // --- Outbox Specific CRUD ---
  async getOutboxItems(): Promise<any[]> {
    await this.init();
    if (this.sqliteDB) {
      const res = await this.sqliteDB.query(`SELECT * FROM outbox ORDER BY created_at ASC`);
      const items = res.values || [];
      return items.map((item: any) => {
        if (item.payload && typeof item.payload === 'string') {
          try { item.payload = JSON.parse(item.payload); } catch {}
        }
        return item;
      });
    } else {
      return this.dexieDB!.outbox.orderBy('created_at').toArray();
    }
  }

  async putOutboxItem(outboxItem: any): Promise<void> {
    await this.init();
    if (this.sqliteDB) {
      const item = { ...outboxItem };
      if (item.payload && typeof item.payload === 'object') {
        item.payload = JSON.stringify(item.payload);
      }
      const keys = Object.keys(item);
      const placeholders = keys.map(() => '?').join(',');
      const sql = `INSERT OR REPLACE INTO outbox (${keys.join(',')}) VALUES (${placeholders})`;
      await this.sqliteDB.run(sql, keys.map(k => item[k]));
    } else {
      await this.dexieDB!.outbox.put(outboxItem);
    }
    this.notifyChange();
  }

  async deleteOutboxItem(clientMutationId: string): Promise<void> {
    await this.init();
    if (this.sqliteDB) {
      await this.sqliteDB.run(`DELETE FROM outbox WHERE client_mutation_id = ?`, [clientMutationId]);
    } else {
      await this.dexieDB!.outbox.delete(clientMutationId);
    }
    this.notifyChange();
  }

  // --- Sync Meta CRUD ---
  async getLastFetchedAt(entityType: string): Promise<number> {
    await this.init();
    if (this.sqliteDB) {
      const res = await this.sqliteDB.query(`SELECT last_fetched_at FROM sync_meta WHERE entity_type = ?`, [entityType]);
      if (res.values && res.values.length > 0) {
        return Number(res.values[0].last_fetched_at) || 0;
      }
      return 0;
    } else {
      const meta = await this.dexieDB!.sync_meta.get(entityType);
      return meta ? meta.last_fetched_at : 0;
    }
  }

  async setLastFetchedAt(entityType: string, timestamp: number): Promise<void> {
    await this.init();
    if (this.sqliteDB) {
      await this.sqliteDB.run(`INSERT OR REPLACE INTO sync_meta (entity_type, last_fetched_at) VALUES (?, ?)`, [entityType, timestamp]);
    } else {
      await this.dexieDB!.sync_meta.put({ entity_type: entityType, last_fetched_at: timestamp });
    }
  }
}

export const luminaDB = new LuminaDBClient();
