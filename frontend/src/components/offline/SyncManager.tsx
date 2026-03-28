'use client';
import { useEffect, useState } from 'react';
import { useOfflineStore } from '@/store/useOfflineStore';

export default function SyncManager() {
  const { 
    isOnline, 
    pendingSales, 
    pendingProducts, 
    pendingCategories,
    pendingCustomers,
    pendingPayments,
    removePendingSale,
    removePendingProduct,
    removePendingCategory,
    removePendingCustomer,
    removePendingPayment,
    clearPendingSales,
    clearPendingProducts,
    clearPendingCategories
  } = useOfflineStore();

  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const handleManualSync = () => {
      if (isOnline) {
        performSync();
      } else {
        alert('No se puede sincronizar sin conexión a internet.');
      }
    };

    window.addEventListener('manual-sync', handleManualSync);
    return () => window.removeEventListener('manual-sync', handleManualSync);
  }, [isOnline, pendingSales, pendingProducts, pendingCategories, pendingCustomers, pendingPayments]);

  const performSync = async () => {
    if (isSyncing) return;
    
    const totalItems = pendingSales.length + pendingProducts.length + pendingCategories.length + pendingCustomers.length + pendingPayments.length;
    if (totalItems === 0) return;

    setIsSyncing(true);
    console.log('Iniciando sincronización manual...');

    try {
      const token = localStorage.getItem('access_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

      // Mapeos para traducir IDs temporales a reales
      const categoryIdMapping: Record<string, string> = {};
      const customerIdMapping: Record<string, string> = {};
      const salesCreditIdMapping: Record<string, string> = {};

      // 1. Sincronizar Categorías
      for (const cat of pendingCategories) {
        try {
          const res = await fetch(`${apiUrl}/categories`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ name: cat.name, localId: cat.localId })
          });
          if (res.ok) {
            const savedCat = await res.json();
            if (cat.localId && savedCat.id) categoryIdMapping[cat.localId] = savedCat.id;
            removePendingCategory(cat.localId);
          }
        } catch (e) { console.error('Error sincronizando categoría', e); }
      }

      // 2. Sincronizar Productos
      if (pendingProducts.length > 0) {
        try {
          const productsToSync = pendingProducts.map(p => ({
              ...p,
              categoryId: p.categoryId && categoryIdMapping[p.categoryId] ? categoryIdMapping[p.categoryId] : (p.categoryId?.startsWith('temp-') ? null : p.categoryId)
          }));
          const res = await fetch(`${apiUrl}/products/bulk`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(productsToSync)
          });
          if (res.ok) clearPendingProducts();
        } catch (e) { console.error('Error sincronizando productos', e); }
      }

      // 3. Sincronizar Clientes
      for (const cust of pendingCustomers) {
        try {
          const res = await fetch(`${apiUrl}/customers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              name: cust.name,
              idNumber: cust.idNumber,
              phone: cust.phone,
              email: cust.email,
              address: cust.address,
              localId: cust.localId
            })
          });
          if (res.ok) {
            const savedCust = await res.json();
            if (cust.localId && savedCust.id) customerIdMapping[cust.localId] = savedCust.id;
            removePendingCustomer(cust.localId);
          }
        } catch (e) { console.error('Error sincronizando cliente', e); }
      }

      // 4. Sincronizar Ventas
      for (const sale of pendingSales) {
        try {
          // Ajustar customerId si era un cliente temporal
          const finalCustomerId = sale.customerId && customerIdMapping[sale.customerId] ? customerIdMapping[sale.customerId] : sale.customerId;
          
          const res = await fetch(`${apiUrl}/sales`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ ...sale, customerId: finalCustomerId })
          });
          if (res.ok) {
            const savedSale = await res.json();
            // Si la venta generó un crédito, necesitamos su ID para los abonos
            if (sale.paymentMethod === 'credito' && savedSale.creditSale?.id) {
               salesCreditIdMapping[sale.localId] = savedSale.creditSale.id;
            }
            removePendingSale(sale.localId);
          }
        } catch (e) { console.error('Error sincronizando venta', e); }
      }

      // 5. Sincronizar Abonos
      for (const pay of pendingPayments) {
        try {
          // Si el pago era para una venta de crédito recién creada offline
          const finalCreditId = pay.creditSaleId && salesCreditIdMapping[pay.creditSaleId] ? salesCreditIdMapping[pay.creditSaleId] : pay.creditSaleId;

          const res = await fetch(`${apiUrl}/sales/credits/${finalCreditId}/partial-payment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ amount: pay.amount, notes: pay.notes, localId: pay.localId })
          });
          if (res.ok) {
            removePendingPayment(pay.localId);
          }
        } catch (e) { console.error('Error sincronizando abono', e); }
      }

      console.log('Sincronización completa finalizada.');
      alert('Sincronización completada exitosamente.');
    } catch (error) {
      console.error('Error general en sincronización', error);
    } finally {
      setIsSyncing(false);
    }
  };

  return null; // Componente lógico, no renderiza nada
}
