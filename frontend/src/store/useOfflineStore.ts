import { create } from 'zustand';
import { persist, StateStorage, createJSONStorage } from 'zustand/middleware';
import { get, set, del } from 'idb-keyval';

// Adaptador de idb-keyval para Zustand
const storage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return (await get(name)) || null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await set(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await del(name);
  },
};

export interface OfflineSale {
  localId: string;
  items: any[];
  total: number;
  paymentMethod: string;
  receivedAmount: number;
  changeAmount: number;
  customerId?: string | null;
  isCredit: boolean;
  timestamp: number;
}

interface OfflineState {
  isOnline: boolean;
  products: any[];
  customers: any[];
  pendingSales: OfflineSale[];
  lastSyncTime: number | null;
  setIsOnline: (status: boolean) => void;
  setCache: (data: { products?: any[]; customers?: any[] }) => void;
  addPendingSale: (sale: OfflineSale) => void;
  removePendingSale: (localId: string) => void;
  clearPendingSales: () => void;
  setLastSyncTime: (time: number) => void;
}

export const useOfflineStore = create<OfflineState>()(
  persist(
    (set) => ({
      isOnline: typeof window !== 'undefined' ? navigator.onLine : true,
      products: [],
      customers: [],
      pendingSales: [],
      lastSyncTime: null,
      setIsOnline: (status) => set({ isOnline: status }),
      setCache: (data) => set((state) => ({ ...state, ...data })),
      addPendingSale: (sale) =>
        set((state) => ({ pendingSales: [...state.pendingSales, sale] })),
      removePendingSale: (localId) =>
        set((state) => ({
          pendingSales: state.pendingSales.filter((s) => s.localId !== localId),
        })),
      clearPendingSales: () => set({ pendingSales: [] }),
      setLastSyncTime: (time) => set({ lastSyncTime: time }),
    }),
    {
      name: 'tiendeo-offline-storage', // key in IndexedDB
      storage: createJSONStorage(() => storage),
    }
  )
);
