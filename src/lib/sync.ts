import db, { SyncQueueItem } from './db';

function getDeviceId(): string {
  if (typeof window === 'undefined') return 'server';
  let id = localStorage.getItem('aide_device_id');
  if (!id) {
    id = `dev_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem('aide_device_id', id);
  }
  return id;
}

function getActiveBusinessId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('aide_business_id');
}

class SyncEngine {
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private isSyncing: boolean = false;
  private listeners: Set<() => void> = new Set();
  private syncInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }
  }

  private handleOnline = () => {
    this.isOnline = true;
    this.notifyListeners();
    this.sync();
  };

  private handleOffline = () => {
    this.isOnline = false;
    this.notifyListeners();
  };

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach((l) => l());
  }

  getStatus() {
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
    };
  }

  startAutoSync(intervalMs: number = 30000) {
    if (this.syncInterval) clearInterval(this.syncInterval);
    this.syncInterval = setInterval(() => {
      if (this.isOnline && !this.isSyncing) {
        this.sync();
      }
    }, intervalMs);
  }

  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  async enqueue(table: string, action: 'create' | 'update' | 'delete', recordId: string, data: any) {
    const item: SyncQueueItem = {
      action,
      table,
      recordId,
      data,
      timestamp: new Date().toISOString(),
      deviceId: getDeviceId(),
    };
    await db.syncQueue.add(item);

    if (table === 'products') {
      await db.products.update(recordId, { syncStatus: 'pending' });
    } else if (table === 'categories') {
      await db.categories.update(recordId, { syncStatus: 'pending' });
    } else if (table === 'sales') {
      await db.sales.update(recordId, { syncStatus: 'pending' });
    }

    this.notifyListeners();
  }

  async push(): Promise<{ synced: number; conflicts: any[] }> {
    if (!this.isOnline || this.isSyncing) return { synced: 0, conflicts: [] };

    this.isSyncing = true;
    this.notifyListeners();

    try {
      const mutations = await db.syncQueue.orderBy('timestamp').toArray();
      if (mutations.length === 0) return { synced: 0, conflicts: [] };

      const deviceId = getDeviceId();
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mutations, deviceId }),
      });

      if (!res.ok) throw new Error(`Sync failed: ${res.status}`);

      const result = await res.json();

      for (const mutation of mutations) {
        await db.syncQueue.where('key').equals(mutation.key!).delete();

        if (mutation.table === 'products') {
          await db.products.update(mutation.recordId, { syncStatus: 'synced' }).catch(() => {});
        } else if (mutation.table === 'categories') {
          await db.categories.update(mutation.recordId, { syncStatus: 'synced' }).catch(() => {});
        } else if (mutation.table === 'sales') {
          await db.sales.update(mutation.recordId, { syncStatus: 'synced' }).catch(() => {});
        }
      }

      for (const conflict of result.conflicts || []) {
        await db.syncConflicts.put(conflict);
      }

      return { synced: result.synced || mutations.length, conflicts: result.conflicts || [] };
    } catch (err) {
      console.error('Push failed:', err);
      return { synced: 0, conflicts: [] };
    } finally {
      this.isSyncing = false;
      this.notifyListeners();
    }
  }

  async pull(): Promise<number> {
    if (!this.isOnline || this.isSyncing) return 0;

    this.isSyncing = true;
    this.notifyListeners();

    try {
      const businessId = getActiveBusinessId();
      if (!businessId) return 0;

      const lastSync = localStorage.getItem('aide_last_sync') || '0';
      const res = await fetch(`/api/sync?since=${lastSync}&businessId=${businessId}`);

      if (!res.ok) throw new Error(`Pull failed: ${res.status}`);

      const result = await res.json();
      let count = 0;

      if (result.business) {
        await db.businesses.put(result.business);
      }
      if (result.products) {
        for (const p of result.products) {
          await db.products.put({ ...p, syncStatus: 'synced' });
          count++;
        }
      }
      if (result.categories) {
        for (const c of result.categories) {
          await db.categories.put({ ...c, syncStatus: 'synced' });
          count++;
        }
      }
      if (result.sales) {
        for (const s of result.sales) {
          await db.sales.put({ ...s, syncStatus: 'synced' });
          count++;
        }
      }
      if (result.saleItems) {
        for (const si of result.saleItems) {
          await db.saleItems.put(si);
          count++;
        }
      }

      localStorage.setItem('aide_last_sync', new Date().toISOString());
      return count;
    } catch (err) {
      console.error('Pull failed:', err);
      return 0;
    } finally {
      this.isSyncing = false;
      this.notifyListeners();
    }
  }

  async sync() {
    const pushed = await this.push();
    const pulled = await this.pull();
    return { pushed: pushed.synced, pulled, conflicts: pushed.conflicts };
  }

  destroy() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
    }
    this.stopAutoSync();
    this.listeners.clear();
  }
}

export const syncEngine = new SyncEngine();

export async function seedFromSession(businessId: string): Promise<number> {
  if (typeof window === 'undefined') return 0;
  localStorage.setItem('aide_business_id', businessId);
  localStorage.setItem('aide_last_sync', '0');
  return syncEngine.pull();
}
