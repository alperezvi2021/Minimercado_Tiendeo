'use client';
import { useState, useEffect, useRef } from 'react';
import { 
  ClipboardCheck, 
  Search, 
  Plus, 
  User, 
  Trash2, 
  ChevronDown,
  ChevronUp,
  Loader2,
  Minus,
  ShoppingCart,
  Banknote,
  X,
  CreditCard,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatCurrency, parseCurrency } from '@/utils/formatters';

interface Product {
  id: string;
  name: string;
  price: number;
  barcode?: string;
}

interface OpenSaleItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  productId: string;
}

interface OpenSale {
  id: string;
  tableName: string;
  totalAmount: number;
  createdAt: string;
  waiterId: string;
  waiter?: { name: string };
  items: OpenSaleItem[];
}

interface Waiter {
  id: string;
  name: string;
}

export default function OrderManagementPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OpenSale[]>([]);
  const [waiters, setWaiters] = useState<Waiter[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [notification, setNotification] = useState<{message: string, type: 'error' | 'success'} | null>(null);

  // Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payingOrder, setPayingOrder] = useState<OpenSale | null>(null);
  const [cashReceived, setCashReceived] = useState('');
  const [paymentFinished, setPaymentFinished] = useState(false);
  const [changeAmount, setChangeAmount] = useState(0);

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Auto-hide notification
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Persistent Focus Logic
  useEffect(() => {
    const focusTimer = setTimeout(() => {
      if (!showPaymentModal && !isProcessing) {
        searchInputRef.current?.focus();
      }
    }, 100);
    return () => clearTimeout(focusTimer);
  }, [showPaymentModal, isProcessing, orders.length]);

  const fetchInitialData = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const [resOrders, resWaiters, resProducts] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/sales/restaurant/open`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/waiters`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/products`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (resOrders.ok) {
        const data = await resOrders.json();
        setOrders(data);
        if (data.length > 0) {
           setSelectedOrderId(data[0].id);
           setExpandedOrderId(data[0].id);
        }
      }
      if (resWaiters.ok) setWaiters(await resWaiters.json());
      if (resProducts.ok) setProducts(await resProducts.json());
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateOrder = async (waiterId?: string) => {
    setIsProcessing(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/sales/restaurant/order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          tableName: 'Barra',
          waiterId: waiterId || waiters[0]?.id,
          items: [] 
        })
      });

      if (res.ok) {
        const newOrder = await res.json();
        setOrders(prev => [newOrder, ...prev]);
        setSelectedOrderId(newOrder.id);
        setExpandedOrderId(newOrder.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddItemToOrder = async (orderId: string, product: Product) => {
    setIsProcessing(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/sales/restaurant/order/${orderId}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          items: [{
            productId: product.id,
            productName: product.name,
            quantity: 1,
            unitPrice: product.price
          }] 
        })
      });

      if (res.ok) {
        const updatedOrder = await res.json();
        setOrders(prev => prev.map(o => o.id === orderId ? updatedOrder : o));
        setNotification({ message: `${product.name} añadido`, type: 'success' });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
      setSearchQuery('');
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    
    // Auto-Add Logic for Barcode
    if (value.length >= 6) {
      const exactMatch = products.find(p => p.barcode === value);
      if (exactMatch) {
         if (selectedOrderId) {
            handleAddItemToOrder(selectedOrderId, exactMatch);
         } else {
            setNotification({ message: 'Por favor, selecciona un pedido primero', type: 'error' });
            setSearchQuery('');
         }
      }
    }
  };

  const handleUpdateQuantity = async (orderId: string, itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) return handleRemoveItem(orderId, itemId);
    
    setIsProcessing(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/sales/restaurant/order/${orderId}/items/${itemId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ quantity: newQuantity })
      });

      if (res.ok) {
        const updatedOrder = await res.json();
        setOrders(prev => prev.map(o => o.id === orderId ? updatedOrder : o));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveItem = async (orderId: string, itemId: string) => {
    setIsProcessing(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/sales/restaurant/order/${orderId}/items/${itemId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const updatedOrder = await res.json();
        setOrders(prev => prev.map(o => o.id === orderId ? updatedOrder : o));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePayOrder = (order: OpenSale) => {
    setPayingOrder(order);
    setCashReceived('');
    setPaymentFinished(false);
    setShowPaymentModal(true);
  };

  const confirmPayment = async () => {
    if (!payingOrder) return;
    const received = parseCurrency(cashReceived);
    const amountToReturn = received - payingOrder.totalAmount;

    setIsProcessing(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/sales/restaurant/order/${payingOrder.id}/close`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ paymentMethod: 'efectivo' })
      });

      if (res.ok) {
        setChangeAmount(amountToReturn);
        setPaymentFinished(true);
        setOrders(prev => prev.filter(o => o.id !== payingOrder.id));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredProducts = searchQuery.length > 1 
    ? products.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (p.barcode && p.barcode.includes(searchQuery))
      ).slice(0, 5)
    : [];

  return (
    <div className="max-w-full mx-auto space-y-6 animate-in fade-in duration-500 pb-20 relative">
      
      {/* Notifications */}
      {notification && (
        <div className={`fixed top-24 right-8 z-[100] p-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right duration-300 ${notification.type === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'}`}>
           {notification.type === 'error' ? <AlertCircle className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
           <p className="font-black text-sm">{notification.message}</p>
        </div>
      )}

      {/* Search Header (Sticky) */}
      <div className="sticky top-0 z-40 -mt-2 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800 p-6 -mx-8 px-8 mb-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="bg-blue-600 p-4 rounded-2xl shadow-lg shadow-blue-500/20">
             <ClipboardCheck className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">Caja Registradora</h1>
            <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">Gestión de Pedidos en Barra</p>
          </div>
        </div>

        <div className="flex-1 max-w-2xl w-full relative">
          <div className="relative group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Escanea el código o busca por nombre..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full bg-slate-950 border-2 border-slate-800 rounded-3xl py-5 pl-16 pr-8 text-white font-black placeholder-slate-600 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xl shadow-inner min-h-[70px]"
              onBlur={(e) => {
                // Solo re-enfocar si no estamos intentando interactuar con otro elemento importante (como el modal o el selector de mesero)
                if (!showPaymentModal && !isProcessing) {
                  const timer = setTimeout(() => {
                    if (document.activeElement?.tagName !== 'INPUT' && 
                        document.activeElement?.tagName !== 'SELECT' && 
                        document.activeElement?.contentEditable !== 'true') {
                      searchInputRef.current?.focus();
                    }
                  }, 150);
                  return () => clearTimeout(timer);
                }
              }}
            />
          </div>

          {/* Search Dropdown */}
          {filteredProducts.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-3 bg-slate-900 border-2 border-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden z-50 animate-in zoom-in-95 duration-200">
              {filteredProducts.map(product => (
                <button
                  key={product.id}
                  onClick={() => {
                    if (selectedOrderId) {
                      handleAddItemToOrder(selectedOrderId, product);
                    } else {
                      setNotification({ message: 'Selecciona un pedido primero', type: 'error' });
                      setSearchQuery('');
                    }
                  }}
                  className="w-full flex items-center justify-between p-6 hover:bg-slate-800 text-left transition-colors border-b-2 border-slate-800/50 last:border-0"
                >
                  <div className="flex items-center gap-5">
                    <div className="bg-slate-800 p-3 rounded-2xl">
                      <ShoppingCart className="w-6 h-6 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-white font-black text-lg">{product.name}</p>
                      <div className="flex items-center gap-3">
                        <p className="text-blue-500 font-bold">${formatCurrency(product.price)}</p>
                        {product.barcode && <p className="text-slate-500 text-xs font-mono">{product.barcode}</p>}
                      </div>
                    </div>
                  </div>
                  <div className="bg-blue-600/20 text-blue-500 p-3 rounded-full hover:bg-blue-600 hover:text-white transition-all">
                    <Plus className="w-6 h-6" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <button 
          onClick={() => handleCreateOrder()}
          className="bg-blue-600 hover:bg-blue-500 text-white px-10 py-5 rounded-[2rem] font-black flex items-center gap-3 transition-all shadow-xl shadow-blue-900/40 active:scale-95 whitespace-nowrap min-h-[70px] text-lg"
        >
          <Plus className="w-7 h-7" />
          Nuevo Pedido
        </button>
      </div>

      {/* Orders List (Rows) */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-40 space-y-4">
            <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />
            <p className="text-slate-500 font-black tracking-widest uppercase">Consultando pedidos abiertos...</p>
          </div>
        ) : (
          orders.map((order) => {
            const isExpanded = expandedOrderId === order.id;
            const isSelected = selectedOrderId === order.id;

            return (
              <div 
                key={order.id}
                className={`
                  group bg-slate-900/40 border-2 rounded-[2.5rem] transition-all overflow-hidden relative
                  ${isSelected ? 'border-blue-600/50 bg-slate-800/60 shadow-2xl' : 'border-slate-800 hover:border-slate-700 hover:bg-slate-900/60 shadow-lg'}
                `}
              >
                {/* Header of Row */}
                <div 
                  className="p-6 flex flex-col md:flex-row items-center gap-6 md:gap-10 cursor-pointer"
                  onClick={() => {
                    setSelectedOrderId(order.id);
                    setExpandedOrderId(isExpanded ? null : order.id);
                  }}
                >
                  {/* Selection Indicator */}
                  <div className={`
                    absolute left-0 top-0 bottom-0 w-3 transition-all
                    ${isSelected ? 'bg-blue-600' : 'bg-transparent'}
                  `} />

                  {/* Waiter Information */}
                  <div className="min-w-[180px] w-full md:w-auto">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2 mb-2">
                       Mesero
                    </p>
                    <div className="flex items-center gap-3">
                       <div className={`p-3 rounded-2xl ${isSelected ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400'}`}>
                          <User className="w-6 h-6" />
                       </div>
                       <select 
                        value={order.waiterId}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/sales/restaurant/order/${order.id}/waiter`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('access_token')}` },
                            body: JSON.stringify({ waiterId: e.target.value })
                          });
                          setOrders(prev => prev.map(o => o.id === order.id ? { ...o, waiterId: e.target.value } : o));
                        }}
                        className="bg-transparent text-white font-black focus:outline-none cursor-pointer text-lg flex-1 md:w-32"
                      >
                        {waiters.map(w => <option key={w.id} value={w.id} className="bg-slate-900">{w.name}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Order Summary Label */}
                  <div className="flex-1 w-full text-center md:text-left">
                     <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">Items en pedido</p>
                     <p className="text-xl font-black text-white">
                        {order.items?.length || 0} productos registrados
                     </p>
                     <p className="text-slate-500 text-sm font-medium mt-1">
                        Toca para ver el detalle {isExpanded ? '▲' : '▼'}
                     </p>
                  </div>

                  {/* Total Financial Section */}
                  <div className="text-right min-w-[200px] w-full md:w-auto">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Total a Cobrar</p>
                    <p className="text-5xl font-black text-rose-500 tracking-tighter drop-shadow-sm">
                      ${formatCurrency(order.totalAmount)}
                    </p>
                  </div>

                  {/* Pay Button */}
                  <button 
                    onClick={(e) => {
                       e.stopPropagation();
                       handlePayOrder(order);
                    }}
                    className="w-full md:w-auto bg-[#10b981] hover:bg-[#059669] text-white px-10 py-6 rounded-[2rem] font-black text-xl uppercase tracking-wider flex items-center justify-center gap-3 transition-all shadow-xl shadow-emerald-500/20 active:scale-95 min-h-[80px]"
                  >
                    Pagar Pedido
                  </button>
                </div>

                {/* Expanded Item List (Vertical Accordion) */}
                <div className={`
                    border-t-2 border-slate-800/50 bg-slate-950/30 overflow-hidden transition-all duration-300 ease-in-out
                    ${isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}
                `}>
                   <div className="p-6 space-y-4">
                      {order.items?.map((item) => (
                        <div key={item.id} className="bg-slate-900/40 border border-slate-800 rounded-3xl p-5 flex flex-col sm:flex-row items-center justify-between gap-6 hover:bg-slate-800/40 transition-colors">
                           <div className="flex items-center gap-5 flex-1 min-w-0">
                              <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center flex-shrink-0">
                                 <ShoppingCart className="w-6 h-6 text-slate-500" />
                              </div>
                              <div className="truncate">
                                 <p className="text-white font-black text-lg truncate uppercase tracking-tight">{item.productName}</p>
                                 <p className="text-blue-500 font-bold">${formatCurrency(item.unitPrice)} p/u</p>
                              </div>
                           </div>

                           <div className="flex items-center gap-10">
                              {/* Quantity Controls - Optimized for Touch */}
                              <div className="flex items-center bg-slate-950 p-2 rounded-2xl border-2 border-slate-800">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleUpdateQuantity(order.id, item.id, item.quantity - 1); }}
                                  className="p-4 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all active:scale-90"
                                >
                                  <Minus className="w-6 h-6" />
                                </button>
                                <span className="px-6 text-center text-white font-black text-2xl min-w-[60px]">{item.quantity}</span>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleUpdateQuantity(order.id, item.id, item.quantity + 1); }}
                                  className="p-4 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all active:scale-90"
                                >
                                  <Plus className="w-6 h-6" />
                                </button>
                              </div>

                              <div className="text-right min-w-[120px]">
                                 <p className="text-[10px] font-black text-slate-600 uppercase mb-1">Subtotal</p>
                                 <p className="text-2xl font-black text-white">${formatCurrency(item.subtotal)}</p>
                              </div>

                              <button 
                                onClick={(e) => { e.stopPropagation(); handleRemoveItem(order.id, item.id); }}
                                className="p-5 text-slate-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-2xl transition-all active:scale-95"
                              >
                                <Trash2 className="w-7 h-7" />
                              </button>
                           </div>
                        </div>
                      ))}
                      {order.items?.length === 0 && (
                        <div className="text-center py-10">
                           <ShoppingCart className="w-16 h-16 text-slate-800 mx-auto mb-4" />
                           <p className="text-slate-600 font-bold uppercase tracking-widest text-sm">Este pedido no tiene productos registrados</p>
                        </div>
                      )}
                   </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && payingOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300" onClick={() => !isProcessing && setShowPaymentModal(false)} />
          
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[3.5rem] shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden animate-in zoom-in-95 duration-200">
             {!paymentFinished ? (
               <div className="p-10 md:p-14 flex flex-col items-center">
                  <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-900/30 rounded-3xl flex items-center justify-center mb-8 shadow-inner">
                    <Banknote className="w-12 h-12 text-emerald-600" />
                  </div>
                  <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-3">Proceso de Pago</h2>
                  <p className="text-slate-500 font-bold mb-10 uppercase tracking-[0.2em] text-sm">Total a pagar: <span className="text-rose-500 text-lg"> ${formatCurrency(payingOrder.totalAmount)}</span></p>

                  <div className="w-full space-y-8">
                    <div className="bg-slate-50 dark:bg-slate-950 p-8 rounded-[2.5rem] border-2 border-slate-100 dark:border-slate-800 shadow-inner">
                       <p className="text-xs font-black text-slate-400 mb-4 uppercase tracking-widest">Efectivo Recibido</p>
                       <div className="relative">
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 text-5xl font-black text-slate-300">$</span>
                          <input 
                            autoFocus
                            type="text"
                            value={formatCurrency(cashReceived)}
                            onChange={(e) => setCashReceived(parseCurrency(e.target.value).toString())}
                            className="w-full bg-transparent border-none text-6xl font-black text-slate-900 dark:text-white pl-12 focus:ring-0 outline-none tracking-tighter"
                            placeholder="0"
                            onKeyDown={(e) => e.key === 'Enter' && parseCurrency(cashReceived) >= payingOrder.totalAmount && confirmPayment()}
                          />
                       </div>
                    </div>

                    {parseCurrency(cashReceived) > 0 && (
                      <div className={`p-8 rounded-[2.5rem] flex justify-between items-center animate-in slide-in-from-top-4 ${parseCurrency(cashReceived) >= payingOrder.totalAmount ? 'bg-emerald-600' : 'bg-rose-600'} text-white shadow-2xl transition-all duration-300`}>
                        <span className="font-black uppercase tracking-widest text-sm">
                          {parseCurrency(cashReceived) >= payingOrder.totalAmount ? 'Vueltas a devolver' : 'Faltan fondos'}
                        </span>
                        <span className="text-4xl font-black">
                           ${formatCurrency(Math.abs(parseCurrency(cashReceived) - payingOrder.totalAmount))}
                        </span>
                      </div>
                    )}

                    <div className="flex gap-6">
                      <button 
                        onClick={() => setShowPaymentModal(false)}
                        className="flex-1 py-6 rounded-[2rem] bg-slate-100 dark:bg-slate-800 text-slate-400 font-black uppercase text-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95"
                      >
                        Cancelar
                      </button>
                      <button 
                         disabled={isProcessing || parseCurrency(cashReceived) < payingOrder.totalAmount}
                         onClick={confirmPayment}
                         className="flex-1 py-6 rounded-[2rem] bg-emerald-600 text-white font-black uppercase text-lg hover:bg-emerald-500 shadow-[0_15px_30px_rgba(16,185,129,0.3)] disabled:opacity-30 transition-all active:scale-95"
                      >
                         {isProcessing ? 'Procesando...' : 'Confirmar Venta'}
                      </button>
                    </div>
                  </div>
               </div>
             ) : (
               <div className="p-16 flex flex-col items-center text-center animate-in zoom-in-95 duration-500">
                  <div className="w-32 h-32 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-10 shadow-2xl">
                     <CheckCircle2 className="w-16 h-16 text-emerald-600" />
                  </div>
                  <h2 className="text-5xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">¡Venta Exitosa!</h2>
                  <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-sm mb-12">Toda la orden ha sido liquidada</p>
                  
                  <div className="w-full bg-emerald-600 text-white p-10 rounded-[3rem] mb-12 shadow-[0_25px_50px_rgba(16,185,129,0.4)] relative overflow-hidden">
                     <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                     <p className="text-xs font-black uppercase tracking-widest opacity-80 mb-3">Entregar Vueltas</p>
                     <p className="text-7xl font-black tracking-tighter">${formatCurrency(changeAmount)}</p>
                  </div>

                  <button 
                    onClick={() => {
                      setShowPaymentModal(false);
                      setPayingOrder(null);
                    }}
                    className="w-full py-7 rounded-[2.5rem] bg-slate-900 text-white font-black uppercase text-2xl hover:bg-black transition-all shadow-xl active:scale-95"
                  >
                    Cerrar (Esc)
                  </button>
               </div>
             )}
          </div>
        </div>
      )}
    </div>
  );
}
