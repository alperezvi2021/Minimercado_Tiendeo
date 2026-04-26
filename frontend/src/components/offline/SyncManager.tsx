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

    // Resumen de resultados
    const results = {
      success: [] as string[],
      failed: [] as string[]
    };

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
            if (cat.localId) removePendingCategory(cat.localId);
            results.success.push(`Categoría: ${cat.name}`);
          } else {
            results.failed.push(`Categoría: ${cat.name} (Error servidor)`);
          }
        } catch (e) { 
          results.failed.push(`Categoría: ${cat.name} (Error conexión)`);
          console.error('Error sincronizando categoría', e); 
        }
      }

      // 2. Sincronizar Productos
      if (pendingProducts.length > 0) {
        try {
          const productsToSync = pendingProducts.map(p => {
              const pCategoryId = p.categoryId as string | undefined;
              return {
                  ...p,
                  categoryId: pCategoryId && categoryIdMapping[pCategoryId] ? categoryIdMapping[pCategoryId] : (pCategoryId?.startsWith('temp-') ? null : pCategoryId)
              };
          });
          const res = await fetch(`${apiUrl}/products/bulk`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(productsToSync)
          });
          if (res.ok) {
            results.success.push(`${pendingProducts.length} Productos sincronizados`);
            clearPendingProducts();
          } else {
            results.failed.push(`Lote de productos (${pendingProducts.length})`);
          }
        } catch (e) { 
          results.failed.push(`Lote de productos (Error conexión)`);
          console.error('Error sincronizando productos', e); 
        }
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
              initialDebt: cust.initialDebt, // Campo corregido: se envía deuda inicial
              localId: cust.localId
            })
          });
          if (res.ok) {
            const savedCust = await res.json();
            if (cust.localId && savedCust.id) customerIdMapping[cust.localId] = savedCust.id;
            if (cust.localId) removePendingCustomer(cust.localId);
            results.success.push(`Cliente: ${cust.name}`);
          } else {
            results.failed.push(`Cliente: ${cust.name} (Error servidor)`);
          }
        } catch (e) { 
          results.failed.push(`Cliente: ${cust.name} (Error conexión)`);
          console.error('Error sincronizando cliente', e); 
        }
      }

      // 4. Sincronizar Ventas
      for (const sale of pendingSales) {
        try {
          const isTempCustomer = typeof sale.customerId === 'string' && sale.customerId.startsWith('temp-cust-');
          const finalCustomerId = isTempCustomer ? customerIdMapping[sale.customerId as string] : sale.customerId;

          // Si el cliente era temporal y NO se pudo sincronizar, saltamos esta venta para evitar error de FK
          if (isTempCustomer && !finalCustomerId) {
            results.failed.push(`Venta: $${sale.total} (Cliente no sincronizado)`);
            continue;
          }
          
          const res = await fetch(`${apiUrl}/sales`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ 
              ...sale, 
              totalAmount: sale.total, // Corregir mapeo para el backend
              customerId: finalCustomerId,
              customerName: sale.customerName // Asegurar que se envíe el nombre para créditos
            })
          });
          if (res.ok) {
            const savedSale = await res.json();
            if (sale.paymentMethod === 'credito' && savedSale.creditSale?.id) {
               salesCreditIdMapping[sale.localId] = savedSale.creditSale.id;
            }
            if (sale.localId) removePendingSale(sale.localId);
            results.success.push(`Venta: $${sale.total}`);
          } else {
            results.failed.push(`Venta: $${sale.total} (Error servidor)`);
          }
        } catch (e) { 
          results.failed.push(`Venta: $${sale.total} (Error conexión)`);
          console.error('Error sincronizando venta', e); 
        }
      }

      // 5. Sincronizar Abonos
      for (const pay of pendingPayments) {
        try {
          const finalCreditId = (pay.creditSaleId && salesCreditIdMapping[pay.creditSaleId as string]) ? salesCreditIdMapping[pay.creditSaleId as string] : pay.creditSaleId;

          if (typeof pay.creditSaleId === 'string' && pay.creditSaleId.startsWith('temp-') && !finalCreditId) {
             results.failed.push(`Abono: $${pay.amount} (Crédito original no sincronizado)`);
             continue;
          }

          const res = await fetch(`${apiUrl}/sales/credits/${finalCreditId}/partial-payment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ amount: pay.amount, notes: pay.notes, localId: pay.localId })
          });
          if (res.ok) {
            if (pay.localId) removePendingPayment(pay.localId);
            results.success.push(`Abono: $${pay.amount}`);
          } else {
            results.failed.push(`Abono: $${pay.amount} (Error servidor)`);
          }
        } catch (e) { 
          results.failed.push(`Abono: $${pay.amount} (Error conexión)`);
          console.error('Error sincronizando abono', e); 
        }
      }

      console.log('Sincronización completa finalizada.');
      
      // Mostrar resumen detallado
      let summary = 'PROCESO DE SINCRONIZACIÓN FINALIZADO\n\n';
      if (results.success.length > 0) {
        summary += `✅ ÉXITOS (${results.success.length}):\n- ${results.success.join('\n- ')}\n\n`;
      }
      if (results.failed.length > 0) {
        summary += `❌ FALLOS (${results.failed.length}):\n- ${results.failed.join('\n- ')}\n\n`;
        summary += 'Los elementos fallidos permanecerán marcados como "Pendiente" para intentarlo más tarde.';
      } else {
        summary += '¡Todos los datos se sincronizaron correctamente!';
      }
      
      alert(summary);

    } catch (error) {
      console.error('Error general en sincronización', error);
      alert('Error inesperado durante la sincronización. Por favor intente de nuevo.');
    } finally {
      setIsSyncing(false);
      // Notificar a otros componentes que la sincronización terminó
      window.dispatchEvent(new Event('sync-finished'));
    }
  };

  return null; // Componente lógico, no renderiza nada
}
