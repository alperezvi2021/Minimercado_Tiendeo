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

export interface OfflineSaleItem {
  productId?: number | string;
  localId?: string;
  quantity: number;
  price: number;
  name?: string;
  unitPrice?: number;
  subtotal?: number;
  [key: string]: unknown;
}

export interface OfflineSale {
  localId: string;
  items: OfflineSaleItem[];
  total: number;
  paymentMethod: string;
  receivedAmount: number;
  changeAmount: number;
  customerId?: string | number;
  isCredit: boolean;
  timestamp: number;
  createdAt?: string;
  [key: string]: unknown;
}

export interface OfflineProduct {
  id?: number | string;
  localId?: string;
  name?: string;
  price?: number;
  categoryId?: string;
  [key: string]: unknown;
}

export interface OfflineCategory {
  id?: number | string;
  localId?: string;
  name?: string;
  [key: string]: unknown;
}

export interface OfflineCustomer {
  id?: number | string;
  localId?: string;
  name?: string;
  idNumber?: string;
  phone?: string;
  email?: string;
  address?: string;
  initialDebt?: number;
  [key: string]: unknown;
}

export interface OfflinePayment {
  localId?: string;
  creditSaleId?: string;
  customerId?: string | number;
  amount?: number;
  notes?: string;
  [key: string]: unknown;
}

export interface OfflineCredit {
  id?: number | string;
  [key: string]: unknown;
}

interface OfflineState {
  isOnline: boolean;
  products: OfflineProduct[];
  categories: OfflineCategory[];
  customers: OfflineCustomer[];
  rawCredits: OfflineCredit[]; // Para caché de deudas
  pendingSales: OfflineSale[];
  pendingProducts: OfflineProduct[];
  pendingCategories: OfflineCategory[];
  pendingCustomers: OfflineCustomer[];
  pendingPayments: OfflinePayment[];
  lastSyncTime: number | null;
  setIsOnline: (status: boolean) => void;
  setCache: (data: { products?: OfflineProduct[]; categories?: OfflineCategory[]; customers?: OfflineCustomer[]; rawCredits?: OfflineCredit[] }) => void;
  
  addPendingSale: (sale: OfflineSale) => void;
  removePendingSale: (localId: string) => void;
  clearPendingSales: () => void;

  addPendingProduct: (product: OfflineProduct) => void;
  removePendingProduct: (localId: string) => void;
  clearPendingProducts: () => void;

  addPendingCategory: (category: OfflineCategory) => void;
  removePendingCategory: (localId: string) => void;
  clearPendingCategories: () => void;

  addPendingCustomer: (customer: OfflineCustomer) => void;
  removePendingCustomer: (localId: string) => void;
  clearPendingCustomers: () => void;

  addPendingPayment: (payment: OfflinePayment) => void;
  removePendingPayment: (localId: string) => void;
  clearPendingPayments: () => void;

  setLastSyncTime: (time: number) => void;
}

export const useOfflineStore = create<OfflineState>()(
  persist(
    (set) => ({
      isOnline: typeof window !== 'undefined' ? navigator.onLine : true,
      products: [],
      categories: [],
      customers: [],
      rawCredits: [],
      pendingSales: [],
      pendingProducts: [],
      pendingCategories: [],
      pendingCustomers: [],
      pendingPayments: [],
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
      
      // Productos
      addPendingProduct: (product) => set((state) => ({
        pendingProducts: [...state.pendingProducts, product],
        // También lo metemos al caché local para que se vea inmediatamente
        products: [product, ...state.products]
      })),
      removePendingProduct: (localId) => set((state) => ({
        pendingProducts: state.pendingProducts.filter((p) => p.localId !== localId),
      })),
      clearPendingProducts: () => set({ pendingProducts: [] }),

      // Categorías
      addPendingCategory: (category) => set((state) => ({
        pendingCategories: [...state.pendingCategories, category],
        categories: [category, ...state.categories]
      })),
      removePendingCategory: (localId) => set((state) => ({
        pendingCategories: state.pendingCategories.filter((c) => c.localId !== localId),
      })),
      clearPendingCategories: () => set({ pendingCategories: [] }),

      // Clientes
      addPendingCustomer: (customer) => set((state) => ({
        pendingCustomers: [...state.pendingCustomers, customer],
        customers: [customer, ...state.customers]
      })),
      removePendingCustomer: (localId) => set((state) => ({
        pendingCustomers: state.pendingCustomers.filter((c) => c.localId !== localId),
      })),
      clearPendingCustomers: () => set({ pendingCustomers: [] }),

      // Pagos
      addPendingPayment: (payment) => set((state) => ({
        pendingPayments: [...state.pendingPayments, payment]
      })),
      removePendingPayment: (localId) => set((state) => ({
        pendingPayments: state.pendingPayments.filter((p) => p.localId !== localId),
      })),
      clearPendingPayments: () => set({ pendingPayments: [] }),

      setLastSyncTime: (time) => set({ lastSyncTime: time }),
    }),
    {
      name: 'tiendeo-offline-storage', // key in IndexedDB
      storage: createJSONStorage(() => storage),
    }
  )
);
