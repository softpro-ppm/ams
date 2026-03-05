// Offline Sync Service using Background Sync API

interface PendingAction {
  id: string;
  type: "create" | "update" | "delete";
  resource: "transaction" | "loan" | "project" | "category";
  data: any;
  timestamp: number;
}

class OfflineSyncService {
  private dbName = "softpro-offline-db";
  private storeName = "pending-actions";
  private db: IDBDatabase | null = null;

  async initialize(): Promise<boolean> {
    if (!("indexedDB" in window)) {
      console.warn("IndexedDB is not supported");
      return false;
    }

    return new Promise((resolve) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => {
        console.error("Error opening IndexedDB:", request.error);
        resolve(false);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(true);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: "id" });
        }
      };
    });
  }

  async registerBackgroundSync(): Promise<boolean> {
    if (!("serviceWorker" in navigator) || !("sync" in (navigator.serviceWorker as any))) {
      console.warn("Background Sync is not supported");
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      await (registration as any).sync.register("sync-pending-actions");
      return true;
    } catch (error) {
      console.error("Error registering background sync:", error);
      return false;
    }
  }

  async addPendingAction(action: Omit<PendingAction, "id" | "timestamp">): Promise<string> {
    if (!this.db) {
      await this.initialize();
    }

    if (!this.db) {
      throw new Error("Database not initialized");
    }

    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const pendingAction: PendingAction = {
      id,
      ...action,
      timestamp: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.add(pendingAction);

      request.onsuccess = () => {
        this.registerBackgroundSync();
        resolve(id);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async getPendingActions(): Promise<PendingAction[]> {
    if (!this.db) {
      await this.initialize();
    }

    if (!this.db) {
      return [];
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async removePendingAction(id: string): Promise<void> {
    if (!this.db) {
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async syncPendingActions(): Promise<void> {
    const pendingActions = await this.getPendingActions();
    
    for (const action of pendingActions) {
      try {
        // In production, this would call your API
        // For now, we'll just remove successfully synced actions
        await this.removePendingAction(action.id);
      } catch (error) {
        console.error(`Error syncing action ${action.id}:`, error);
        // Keep the action for retry
      }
    }
  }

  async clearAllPendingActions(): Promise<void> {
    if (!this.db) {
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

export const offlineSyncService = new OfflineSyncService();

// Register sync event listener in service worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("message", async (event) => {
    if (event.data && event.data.type === "SYNC_PENDING_ACTIONS") {
      await offlineSyncService.syncPendingActions();
    }
  });
}

