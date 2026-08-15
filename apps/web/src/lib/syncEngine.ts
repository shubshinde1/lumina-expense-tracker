import api from './api';
import { luminaDB } from './db';

const ENTITY_ROUTES: Record<string, string> = {
  transaction: '/transactions',
  category: '/categories',
  payment_mode: '/payment-modes',
  setting: '/auth/settings'
};

const ENTITY_TABLES: Record<string, string> = {
  transaction: 'transactions',
  category: 'categories',
  payment_mode: 'payment_modes',
  setting: 'settings'
};

// Topological Sort for Outbox Dependency Resolution
export function sortOutbox(items: any[]): any[] {
  const visited = new Set<string>();
  const temp = new Set<string>();
  const result: any[] = [];
  const map = new Map<string, any>();

  for (const item of items) {
    map.set(item.entity_local_id, item);
  }

  function visit(item: any) {
    const id = item.entity_local_id;
    if (visited.has(id)) return;
    if (temp.has(id)) {
      // Break cycle
      return;
    }
    temp.add(id);

    const depId = item.depends_on_temp_id;
    if (depId && map.has(depId)) {
      visit(map.get(depId));
    }

    temp.delete(id);
    visited.add(id);
    result.push(item);
  }

  for (const item of items) {
    visit(item);
  }

  return result;
}

export class OutboxSyncEngine {
  private isSyncing = false;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('[Sync Engine] Network online. Triggering sync...');
        this.sync().catch(err => console.error('[Sync Engine] Online trigger failed:', err));
      });
    }
  }

  async sync(): Promise<void> {
    if (this.isSyncing) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      console.log('[Sync Engine] Device is offline. Sync skipped.');
      return;
    }

    this.isSyncing = true;
    console.log('[Sync Engine] Starting outbox sync sweep...');

    try {
      const outboxItems = await luminaDB.getOutboxItems();
      if (outboxItems.length === 0) {
        console.log('[Sync Engine] Outbox is empty. Skipping mutations.');
      } else {
        // 1. Sort outbox topologically
        const sortedItems = sortOutbox(outboxItems);

        // 2. Process each mutation sequentially
        for (const item of sortedItems) {
          if (item.status === 'failed') continue; // Skip permanently failed items until manually retried

          const success = await this.processMutation(item);
          if (!success) {
            console.log('[Sync Engine] Mutation sync encountered transient failure. Stopping loop.');
            break; // Stop execution to maintain dependency ordering integrity
          }
        }
      }

      // 3. Trigger Delta Sync pull from backend
      await this.runDeltaPull();
    } catch (err) {
      console.error('[Sync Engine] Sync failed:', err);
    } finally {
      this.isSyncing = false;
      luminaDB.notifyChange();
    }
  }

  private async processMutation(outboxItem: any): Promise<boolean> {
    const { client_mutation_id, entity_type, operation, entity_local_id, payload, status } = outboxItem;
    const tableName = ENTITY_TABLES[entity_type];
    const route = ENTITY_ROUTES[entity_type];

    // Set state to syncing
    await luminaDB.putOutboxItem({ ...outboxItem, status: 'syncing' });
    const localEntity = await luminaDB.getItemById(tableName, entity_local_id);
    if (localEntity) {
      await luminaDB.putItem(tableName, { ...localEntity, sync_status: 'syncing' });
    }

    try {
      let response: any;
      const headers = { 'Idempotency-Key': client_mutation_id };

      // Determine HTTP method, url, and request body
      if (operation === 'create') {
        response = await api.post(route, payload, { headers });
      } else if (operation === 'update') {
        if (entity_type === 'setting') {
          response = await api.put(route, payload, { headers });
        } else {
          const serverId = localEntity?.server_id;
          if (!serverId) throw new Error(`Missing server_id for update on local record ${entity_local_id}`);
          response = await api.put(`${route}/${serverId}`, payload, { headers });
        }
      } else if (operation === 'delete') {
        if (entity_type === 'setting') {
          // No delete operation for setting
          response = { status: 200, data: {} };
        } else {
          const serverId = localEntity?.server_id;
          if (!serverId) {
            // Unsynced deletion is trivial - purge local db row immediately
            await luminaDB.purgeItemPermanently(tableName, entity_local_id);
            await luminaDB.deleteOutboxItem(client_mutation_id);
            return true;
          }
          response = await api.delete(`${route}/${serverId}`, { headers });
        }
      }

      // Parse server response canonical details
      const responseData = response?.data || {};
      const serverId = responseData._id || responseData.id || (responseData.transaction?._id) || (responseData.category?._id) || (responseData.paymentMode?._id);

      // Reconcile entity
      if (localEntity) {
        if (operation === 'delete') {
          await luminaDB.purgeItemPermanently(tableName, entity_local_id);
        } else {
          const finalServerId = serverId || localEntity.server_id;
          if (finalServerId && finalServerId !== entity_local_id) {
            // Delete temporary local ID key row
            await luminaDB.purgeItemPermanently(tableName, entity_local_id);
            // Insert reconciled row with server ID as primary key
            await luminaDB.putItem(tableName, {
              ...localEntity,
              id: finalServerId,
              server_id: finalServerId,
              sync_status: 'synced',
              updated_at: responseData.updatedAt || Date.now()
            });
          } else {
            await luminaDB.putItem(tableName, {
              ...localEntity,
              server_id: finalServerId,
              sync_status: 'synced',
              updated_at: responseData.updatedAt || Date.now()
            });
          }
        }
      }

      // If created/updated, propagate resolved serverId to dependent outbox records
      if (serverId && serverId !== entity_local_id) {
        await this.reconcileDependencies(entity_local_id, serverId);
      }

      // Dequeue outbox item
      await luminaDB.deleteOutboxItem(client_mutation_id);
      return true;
    } catch (err: any) {
      console.error(`[Sync Engine] Failed processing outbox mutation ${client_mutation_id}:`, err);
      const isTransient = !err.response || err.response.status >= 500;

      if (isTransient) {
        // Transient error (network down, server down)
        const retryCount = (outboxItem.retry_count || 0) + 1;
        await luminaDB.putOutboxItem({
          ...outboxItem,
          status: 'pending',
          retry_count: retryCount,
          last_attempt_at: Date.now()
        });
        if (localEntity) {
          await luminaDB.putItem(tableName, { ...localEntity, sync_status: 'pending' });
        }
        return false; // Tells the sync loop to stop processing
      } else {
        // Permanent error (validation error 4xx)
        await luminaDB.putOutboxItem({
          ...outboxItem,
          status: 'failed',
          last_attempt_at: Date.now()
        });
        if (localEntity) {
          await luminaDB.putItem(tableName, { ...localEntity, sync_status: 'failed' });
        }
        return true; // Continues the sync loop for other entities
      }
    }
  }

  private async reconcileDependencies(tempId: string, serverId: string) {
    const outboxItems = await luminaDB.getOutboxItems();
    for (const item of outboxItems) {
      let dirty = false;
      const updatedItem = { ...item };

      // Resolve outbox dependencies
      if (updatedItem.depends_on_temp_id === tempId) {
        updatedItem.depends_on_temp_id = null;
        dirty = true;
      }

      // Replace tempId with serverId inside payload JSON
      if (updatedItem.payload) {
        let payloadStr = JSON.stringify(updatedItem.payload);
        if (payloadStr.includes(tempId)) {
          payloadStr = payloadStr.replaceAll(tempId, serverId);
          updatedItem.payload = JSON.parse(payloadStr);
          dirty = true;
        }
      }

      if (dirty) {
        await luminaDB.putOutboxItem(updatedItem);
      }
    }

    // Resolve SQLite/Dexie DB dependent local entities
    for (const type of ['transaction', 'category', 'payment_mode']) {
      const tableName = ENTITY_TABLES[type];
      const items = await luminaDB.getTableItems(tableName);
      for (const item of items) {
        let dirty = false;
        const updatedItem = { ...item };

        if (updatedItem.depends_on_temp_id === tempId) {
          updatedItem.depends_on_temp_id = null;
          dirty = true;
        }

        // Replace category reference in transactions
        if (type === 'transaction') {
          if (updatedItem.category === tempId) {
            updatedItem.category = serverId;
            dirty = true;
          }
          if (updatedItem.subcategory === tempId) {
            updatedItem.subcategory = serverId;
            dirty = true;
          }
        }

        if (dirty) {
          await luminaDB.putItem(tableName, updatedItem);
        }
      }
    }
  }

  private async runDeltaPull(): Promise<void> {
    console.log('[Sync Engine] Starting delta pulls from server...');

    for (const type of ['transaction', 'category', 'payment_mode']) {
      const route = ENTITY_ROUTES[type];
      const tableName = ENTITY_TABLES[type];
      const lastFetchedAt = await luminaDB.getLastFetchedAt(type);

      try {
        const response = await api.get(`${route}?updatedSince=${lastFetchedAt}`);
        const serverItems = response.data || [];
        
        let maxUpdatedAt = lastFetchedAt;

        for (const sItem of serverItems) {
          const sId = sItem._id || sItem.id;
          const sUpdatedAt = new Date(sItem.updatedAt || sItem.updated_at || Date.now()).getTime();

          if (sUpdatedAt > maxUpdatedAt) {
            maxUpdatedAt = sUpdatedAt;
          }

          // Check if local matches
          const localItem = await luminaDB.getItemById(tableName, sId);
          
          if (localItem) {
            const localUpdatedAt = localItem.updated_at || 0;
            // Last-Write-Wins Conflict Resolution
            if (sUpdatedAt > localUpdatedAt) {
              await luminaDB.putItem(tableName, {
                ...sItem,
                id: sId,
                server_id: sId,
                sync_status: 'synced',
                updated_at: sUpdatedAt
              });
            }
          } else {
            // New record from server
            await luminaDB.putItem(tableName, {
              ...sItem,
              id: sId,
              server_id: sId,
              sync_status: 'synced',
              updated_at: sUpdatedAt
            });
          }
        }

        await luminaDB.setLastFetchedAt(type, maxUpdatedAt);
      } catch (err) {
        console.error(`[Sync Engine] Delta pull failed for ${type}:`, err);
      }
    }
  }
}

export const syncEngine = new OutboxSyncEngine();
