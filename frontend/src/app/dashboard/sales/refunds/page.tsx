'use client';
import { useState, useEffect } from 'react';
import { Search, RotateCcw, Package, AlertCircle, CheckCircle2, Hash, Trash2 } from 'lucide-react';

export default function RefundsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sale, setSale] = useState<any>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refundItems, setRefundItems] = useState<any[]>([]);
  const [reason, setReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const searchSale = async () => {
    if (!searchQuery) return;
    setLoading(true);
    setSale(null);
    setSearchResults([]);
    try {
      const token = localStorage.getItem('access_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      
      const res = await fetch(`${apiUrl}/sales`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error('Error al buscar ventas');
      const data = await res.json();
      
      const query = searchQuery.toLowerCase();
      const filteredSales = data.filter((s: any) => {
        const invMatch = s.invoiceNumber ? s.invoiceNumber.toLowerCase().includes(query) : false;
        const idMatch = s.id === searchQuery;
        const productMatch = s.items?.some((item: any) => 
          item.productName && item.productName.toLowerCase().includes(query)
        );
        return invMatch || idMatch || productMatch;
      });

      if (filteredSales.length === 1) {
        selectSale(filteredSales[0]);
      } else if (filteredSales.length > 1) {
        setSearchResults(filteredSales);
      } else {
        showNotification('No se encontraron ventas con esos criterios', 'error');
      }
    } catch (error) {
      console.error(error);
      showNotification('Error al buscar la venta', 'error');
    } finally {
      setLoading(false);
    }
  };

  const selectSale = (s: any) => {
    setSale(s);
    setSearchResults([]);
    setRefundItems(s.items.map((item: any) => ({
      ...item,
      refundQuantity: 0,
      returnsToInventory: true
    })));
  };

  const handleQuantityChange = (index: number, val: number) => {
    const updated = [...refundItems];
    const max = updated[index].quantity;
    const newVal = Math.max(0, Math.min(max, val));
    updated[index].refundQuantity = newVal;
    setRefundItems(updated);
  };

  const toggleInventoryReturn = (index: number) => {
    const updated = [...refundItems];
    updated[index].returnsToInventory = !updated[index].returnsToInventory;
    setRefundItems(updated);
  };

  const calculateTotalRefund = () => {
    return refundItems.reduce((sum, item) => sum + (item.refundQuantity * item.unitPrice), 0);
  };

  const processRefund = async () => {
    const totalAmount = calculateTotalRefund();
    if (totalAmount <= 0) {
      showNotification('Selecciona al menos un producto para devolver', 'error');
      return;
    }

    setProcessing(true);
    try {
      const token = localStorage.getItem('access_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      
      const itemsToRefund = refundItems
        .filter(item => item.refundQuantity > 0)
        .map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.refundQuantity,
          unitPrice: item.unitPrice,
          subtotal: item.refundQuantity * item.unitPrice,
          returnsToInventory: item.returnsToInventory
        }));

      const res = await fetch(`${apiUrl}/sales/refunds`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          saleId: sale.id,
          totalAmount,
          reason,
          items: itemsToRefund
        })
      });

      if (!res.ok) throw new Error('Error al procesar devolución');

      showNotification('Devolución procesada con éxito');
      
      // Limpiar después de un momento
      setTimeout(() => {
        setSale(null);
        setSearchQuery('');
        setReason('');
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      console.error(error);
      showNotification('Error al procesar la devolución', 'error');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 relative">
      {/* Notificación flotante */}
      {notification && (
        <div className={`fixed top-24 right-8 z-[100] p-4 rounded-2xl shadow-2xl animate-in slide-in-from-right duration-300 border ${
          notification.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-400' 
            : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-900/30 dark:border-rose-800 dark:text-rose-400'
        } flex items-center gap-3 font-bold`}>
          {notification.type === 'success' ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
          {notification.message}
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-2xl">
              <RotateCcw className="w-8 h-8 text-blue-600" />
            </div>
            Devoluciones y Cambios
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">
            Ingresa el número de ticket para iniciar un proceso de retorno.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl border border-slate-100 dark:border-slate-800 transition-all hover:shadow-blue-500/5">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 group">
            <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
              <Search className="w-6 h-6 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Buscar Ticket o Producto..."
              className="w-full pl-14 pr-6 py-5 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 rounded-3xl transition-all text-xl font-bold placeholder:font-medium placeholder:text-slate-400 dark:text-white outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchSale()}
            />
          </div>
          <button
            onClick={searchSale}
            disabled={loading}
            className="px-10 py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-3xl font-black text-lg transition-all shadow-xl shadow-blue-500/20 disabled:opacity-50 active:scale-95 flex items-center justify-center gap-2"
          >
            {loading ? (
               <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : 'Buscar'}
          </button>
        </div>
      </div>

      {/* Resultados de búsqueda (Múltiples ventas) */}
      {searchResults.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in zoom-in duration-300">
          {searchResults.map((s) => (
            <button
              key={s.id}
              onClick={() => selectSale(s)}
              className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 text-left hover:border-blue-500 hover:shadow-xl transition-all group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Hash className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(s.createdAt).toLocaleDateString()}</span>
              </div>
              <h3 className="font-extrabold text-xl dark:text-white mb-1 uppercase tracking-tight">{s.invoiceNumber}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-bold mb-4">${Math.round(s.totalAmount).toLocaleString('es-CO', { maximumFractionDigits: 0 })}</p>
              <div className="space-y-1">
                {s.items.slice(0, 2).map((item: any, i: number) => (
                  <p key={i} className="text-xs text-slate-400 truncate tracking-tight">• {item.productName}</p>
                ))}
                {s.items.length > 2 && <p className="text-[10px] text-blue-500 font-black">+{s.items.length - 2} productos más</p>}
              </div>
            </button>
          ))}
        </div>
      )}

      {sale && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-10 duration-700">
          {/* Detalles de la Venta */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm text-blue-600">
                    <Hash className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Comprobante</span>
                    <span className="font-extrabold text-2xl dark:text-white uppercase tracking-tight">{sale.invoiceNumber}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Fecha Emisión</span>
                  <span className="text-sm font-bold text-slate-600 dark:text-slate-300">
                    {new Date(sale.createdAt).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>

              <div className="p-8">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">
                        <th className="pb-6">Producto</th>
                        <th className="pb-6 text-center">C. Orig.</th>
                        <th className="pb-6 text-center">A Devolver</th>
                        <th className="pb-6 text-right">Precio</th>
                        <th className="pb-6 text-center">Stock</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {refundItems.map((item, idx) => (
                        <tr key={idx} className="group transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="py-6">
                            <div className="font-bold text-slate-900 dark:text-white text-lg">{item.productName}</div>
                            <div className="text-xs text-slate-400 font-medium">SKU: {item.productId.slice(-8)}</div>
                          </td>
                          <td className="py-6 text-center font-black text-slate-400">
                            {item.quantity}
                          </td>
                          <td className="py-6">
                            <div className="flex items-center justify-center gap-4">
                              <button
                                onClick={() => handleQuantityChange(idx, item.refundQuantity - 1)}
                                className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-blue-500 hover:text-white transition-all active:scale-90 font-black"
                              >
                                -
                              </button>
                              <span className="w-10 text-center font-black text-2xl text-blue-600 dark:text-blue-400">
                                {item.refundQuantity}
                              </span>
                              <button
                                onClick={() => handleQuantityChange(idx, item.refundQuantity + 1)}
                                className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-blue-500 hover:text-white transition-all active:scale-90 font-black"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="py-6 text-right font-black text-slate-900 dark:text-white text-lg">
                            ${Number(item.unitPrice).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                          </td>
                          <td className="py-6 text-center">
                            <button
                              onClick={() => toggleInventoryReturn(idx)}
                              className={`p-3 rounded-2xl transition-all active:scale-90 border-2 ${
                                item.returnsToInventory
                                  ? 'bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:border-emerald-900/50'
                                  : 'bg-slate-50 border-slate-100 text-slate-400 dark:bg-slate-800 dark:border-slate-700'
                              }`}
                              title={item.returnsToInventory ? "Regresa al stock" : "No regresa al stock"}
                            >
                              <Package className="w-6 h-6" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Resumen de Devolución */}
          <div className="space-y-8">
            <div className="bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl text-white sticky top-10 border border-slate-800">
              <h2 className="text-2xl font-black mb-8 flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl">
                  <AlertCircle className="w-6 h-6 text-blue-400" />
                </div>
                Liquidación
              </h2>
              
              <div className="space-y-6 mb-8">
                <div className="flex justify-between items-center pb-4 border-b border-white/10">
                  <span className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Medio de Pago</span>
                  <span className="font-black uppercase bg-blue-500/20 px-3 py-1 rounded-lg text-blue-400 text-sm">
                    {sale.paymentMethod}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-white/10">
                  <span className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Titular</span>
                  <span className="font-black text-sm">{sale.customerName || 'Consumidor Final'}</span>
                </div>
                
                <div className="pt-4">
                  <span className="block text-slate-400 font-bold uppercase text-[10px] tracking-widest mb-2">Total Ajuste</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-black text-white">
                      ${calculateTotalRefund().toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Observaciones / Motivo</label>
                <textarea
                  className="w-full p-5 bg-white/5 border border-white/10 rounded-3xl focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600 font-medium"
                  rows={4}
                  placeholder="Explica el motivo (ej: Mismo cambio, daño fábrica)..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>

              <button
                onClick={processRefund}
                disabled={processing || calculateTotalRefund() <= 0}
                className="w-full py-5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-3xl font-black text-lg transition-all shadow-xl shadow-blue-900/40 flex items-center justify-center gap-3 disabled:opacity-30 active:scale-95 group"
              >
                {processing ? (
                   <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <CheckCircle2 className="w-6 h-6 group-hover:scale-110 transition-transform" />
                    Finalizar Retorno
                  </>
                )}
              </button>
              
              <p className="text-[10px] text-center text-slate-500 font-bold uppercase mt-6 tracking-tight">
                * Esta operación afectará inventario y cierre de caja activo
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
