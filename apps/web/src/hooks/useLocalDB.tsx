import React, { useState, useEffect } from 'react';
import { luminaDB } from '../lib/db';
import { v4 as uuidv4 } from 'uuid';
import { CloudOff, RefreshCw, AlertCircle } from 'lucide-react';
import { syncEngine } from '../lib/syncEngine';

// Generic Live Query Hook
export function useLiveTable(tableName: string) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const fetchItems = async () => {
      try {
        const res = await luminaDB.getTableItems(tableName);
        if (active) {
          setItems(res);
          setLoading(false);
        }
      } catch (e) {
        console.error("Failed fetching live table", tableName, e);
      }
    };

    fetchItems();
    const unsubscribe = luminaDB.subscribe(fetchItems);

    return () => {
      active = false;
      unsubscribe();
    };
  }, [tableName]);

  return { items, loading };
}

// Live Transactions Hook (Sorted by date DESC)
export function useLiveTransactions() {
  const { items, loading } = useLiveTable('transactions');
  const sorted = [...items].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return { transactions: sorted, loading };
}

// Helper to Trigger Manual Retry of Failed Outbox Items
export async function retryFailedMutation(clientMutationId: string) {
  const outboxItems = await luminaDB.getOutboxItems();
  const failedItem = outboxItems.find(i => i.client_mutation_id === clientMutationId);
  if (failedItem) {
    // Reset status to pending so the syncEngine processes it again
    await luminaDB.putOutboxItem({ ...failedItem, status: 'pending', retry_count: 0 });
    const tableName = failedItem.entity_type === 'transaction' ? 'transactions' : failedItem.entity_type === 'category' ? 'categories' : failedItem.entity_type === 'payment_mode' ? 'payment_modes' : 'settings';
    const localEntity = await luminaDB.getItemById(tableName, failedItem.entity_local_id);
    if (localEntity) {
      await luminaDB.putItem(tableName, { ...localEntity, sync_status: 'pending' });
    }
    // Fire sync engine sweep
    syncEngine.sync().catch(err => console.error("Retry sync failed:", err));
  }
}

// Local Write Path Operations (Auto-enqueue Outbox Mutators)
export async function createLocalEntity(type: 'transaction' | 'category' | 'payment_mode' | 'setting', payload: any, dependsOnTempId: string | null = null) {
  const tempId = uuidv4();
  const mutationId = uuidv4();
  const tableName = type === 'transaction' ? 'transactions' : type === 'category' ? 'categories' : type === 'payment_mode' ? 'payment_modes' : 'settings';

  const entityRecord = {
    id: tempId,
    server_id: null,
    client_mutation_id: mutationId,
    ...payload,
    sync_status: 'pending',
    depends_on_temp_id: dependsOnTempId,
    updated_at: Date.now(),
    deleted: 0
  };

  const outboxRecord = {
    client_mutation_id: mutationId,
    entity_type: type,
    operation: 'create',
    entity_local_id: tempId,
    payload,
    depends_on_temp_id: dependsOnTempId,
    status: 'pending',
    retry_count: 0,
    created_at: Date.now(),
    last_attempt_at: null
  };

  await luminaDB.putItem(tableName, entityRecord);
  await luminaDB.putOutboxItem(outboxRecord);

  // Trigger background sync immediately if online
  syncEngine.sync().catch(err => console.error("Immediate sync failed:", err));
  
  return tempId;
}

export async function updateLocalEntity(type: 'transaction' | 'category' | 'payment_mode' | 'setting', id: string, payload: any) {
  const tableName = type === 'transaction' ? 'transactions' : type === 'category' ? 'categories' : type === 'payment_mode' ? 'payment_modes' : 'settings';
  const existing = await luminaDB.getItemById(tableName, id);
  if (!existing) return;

  const mutationId = uuidv4();

  const updatedRecord = {
    ...existing,
    ...payload,
    sync_status: 'pending',
    updated_at: Date.now()
  };

  const outboxRecord = {
    client_mutation_id: mutationId,
    entity_type: type,
    operation: 'update',
    entity_local_id: id,
    payload,
    depends_on_temp_id: null,
    status: 'pending',
    retry_count: 0,
    created_at: Date.now(),
    last_attempt_at: null
  };

  await luminaDB.putItem(tableName, updatedRecord);
  await luminaDB.putOutboxItem(outboxRecord);

  syncEngine.sync().catch(err => console.error("Immediate sync failed:", err));
}

export async function deleteLocalEntity(type: 'transaction' | 'category' | 'payment_mode' | 'setting', id: string) {
  const tableName = type === 'transaction' ? 'transactions' : type === 'category' ? 'categories' : type === 'payment_mode' ? 'payment_modes' : 'settings';
  const existing = await luminaDB.getItemById(tableName, id);
  if (!existing) return;

  const mutationId = uuidv4();

  const deletedRecord = {
    ...existing,
    deleted: 1,
    sync_status: 'pending',
    updated_at: Date.now()
  };

  const outboxRecord = {
    client_mutation_id: mutationId,
    entity_type: type,
    operation: 'delete',
    entity_local_id: id,
    payload: {},
    depends_on_temp_id: null,
    status: 'pending',
    retry_count: 0,
    created_at: Date.now(),
    last_attempt_at: null
  };

  await luminaDB.putItem(tableName, deletedRecord);
  await luminaDB.putOutboxItem(outboxRecord);

  syncEngine.sync().catch(err => console.error("Immediate sync failed:", err));
}

// Reusable OfflineBadge UI Component
export function OfflineBadge({ status, clientMutationId }: { status: 'pending' | 'syncing' | 'synced' | 'failed', clientMutationId?: string }) {
  if (status === 'synced' || !status) return null;

  if (status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 text-[9px] font-bold uppercase tracking-wider">
        <CloudOff className="w-2.5 h-2.5" />
        Offline
      </span>
    );
  }

  if (status === 'syncing') {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[9px] font-bold uppercase tracking-wider animate-pulse">
        <RefreshCw className="w-2.5 h-2.5 animate-spin" />
        Syncing
      </span>
    );
  }

  if (status === 'failed') {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          if (clientMutationId) {
            retryFailedMutation(clientMutationId).catch(err => console.error("Retry click failed:", err));
          }
        }}
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 text-[9px] font-bold uppercase tracking-wider hover:bg-red-500/20 cursor-pointer active:scale-95 transition-all"
        title="Sync failed. Tap to retry."
      >
        <AlertCircle className="w-2.5 h-2.5" />
        Failed — Tap to retry
      </button>
    );
  }

  return null;
}
