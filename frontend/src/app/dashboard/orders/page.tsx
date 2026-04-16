'use client';
import { useState, useEffect, useRef } from 'react';
import { 
  ClipboardCheck, 
  Search, 
  Plus, 
  User, 
  Trash2, 
  ChevronDown,
  Loader2,
  Minus,
  ShoppingCart,
  Banknote,
  X,
  CreditCard,
  CheckCircle2
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatCurrency, parseCurrency } from '@/utils/formatters';

interface Product {
  id: string;
  name: string;
  price: number;
}

interface OpenSaleItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
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
  const [isProcessing, setIsProcessing] = useState(false);

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

      if (resOrders.ok) setOrders(await resOrders.json());
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
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
      setSearchQuery('');
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
    ? products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 5)
    : [];

  return (
    <div className="max-w-full mx-auto space-y-6 animate-in fade-in duration-500 pb-20">
      {/* Search Header */}
      <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 p-6 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl relative z-30">
        <div className="flex items-center gap-4">
          <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-500/20">
             <ClipboardCheck className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">Caja Registradora</h1>
            <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">Gestión de Pedidos en Barra</p>
          </div>
        </div>

        <div className="flex-1 max-w-2xl w-full relative">
          <div className="relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Escanear producto o buscar por nombre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-3xl py-4 pl-14 pr-6 text-white font-bold placeholder-slate-600 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-lg shadow-inner"
            />
          </div>

          {/* Search Dropdown */}
          {filteredProducts.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-800 rounded-[2rem] shadow-2xl overflow-hidden z-50 animate-in zoom-in-95 duration-200">
              {filteredProducts.map(product => (
                <button
                  key={product.id}
                  onClick={() => {
                    if (selectedOrderId) {
                      handleAddItemToOrder(selectedOrderId, product);
                    } else if (orders.length > 0) {
                      handleAddItemToOrder(orders[0].id, product);
                    } else {
                      handleCreateOrder(waiters[0]?.id).then(() => {
                        // This would need a bit more state to add the item after creation if we wanted it instant
                      });
                    }
                  }}
                  className="w-full flex items-center justify-between p-5 hover:bg-slate-800 text-left transition-colors border-b border-slate-800/50 last:border-0"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-slate-800 p-2 rounded-xl">
                      <ShoppingCart className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-white font-black">{product.name}</p>
                      <p className="text-blue-500 font-bold">${formatCurrency(product.price)}</p>
                    </div>
                  </div>
                  <div className="bg-blue-600/20 text-blue-500 p-2 rounded-full">
                    <Plus className="w-5 h-5" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <button 
          onClick={() => handleCreateOrder()}
          className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-3xl font-black flex items-center gap-3 transition-all shadow-xl shadow-blue-900/40 active:scale-95 whitespace-nowrap"
        >
          <Plus className="w-6 h-6" />
          Nuevo Pedido
        </button>
      </div>

      {/* Orders List (Rows) */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
            <p className="text-slate-500 font-bold tracking-widest uppercase">Consultando pedidos abiertos...</p>
          </div>
        ) : (
          orders.map((order) => (
            <div 
              key={order.id}
              onClick={() => setSelectedOrderId(order.id)}
              className={`
                group bg-slate-900/40 border-l-[12px] rounded-[2rem] transition-all p-6 flex flex-col lg:flex-row items-center gap-8 relative
                ${selectedOrderId === order.id ? 'border-blue-600 bg-slate-800/60 shadow-2xl' : 'border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'}
              `}
            >
              {/* Waiter Selection */}
              <div className="min-w-[150px] flex flex-col gap-2">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                  <User className="w-3 h-3" /> Mesero
                </p>
                <div className="relative">
                  <select 
                    value={order.waiterId}
                    onChange={(e) => {
                      const res = fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/sales/restaurant/order/${order.id}/waiter`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('access_token')}` },
                        body: JSON.stringify({ waiterId: e.target.value })
                      });
                      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, waiterId: e.target.value } : o));
                    }}
                    className="appearance-none bg-slate-950/50 border border-slate-800 border-none rounded-xl py-3 pl-4 pr-10 text-white font-black focus:outline-none cursor-pointer text-sm w-full"
                  >
                    {waiters.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                </div>
              </div>

              {/* Items List (Horizontal scrollable) */}
              <div className="flex-1 flex gap-4 overflow-x-auto py-2 no-scrollbar scroll-smooth w-full">
                {order.items?.map((item) => (
                  <div key={item.id} className="min-w-[280px] bg-slate-950/50 border border-slate-800 rounded-3xl p-4 flex items-center justify-between gap-4 group/item">
                    <div className="overflow-hidden">
                      <p className="text-white font-black text-sm truncate">{item.productName}</p>
                      <p className="text-slate-500 font-bold text-xs">${formatCurrency(item.unitPrice)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center bg-slate-900 rounded-2xl p-1 border border-slate-800">
                        <button 
                          onClick={() => handleUpdateQuantity(order.id, item.id, item.quantity - 1)}
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center text-white font-black text-xs">{item.quantity}</span>
                        <button 
                          onClick={() => handleUpdateQuantity(order.id, item.id, item.quantity + 1)}
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <button 
                         onClick={() => handleRemoveItem(order.id, item.id)}
                         className="p-2 text-slate-600 hover:text-rose-500 transition-colors"
                      >
                         <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {order.items?.length === 0 && (
                  <div className="flex items-center gap-2 text-slate-600 italic text-sm">
                    <ShoppingCart className="w-4 h-4" /> Sin productos aún
                  </div>
                )}
              </div>

              {/* Total Financial */}
              <div className="text-right min-w-[200px]">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Total a Cobrar</p>
                <p className="text-4xl font-black text-rose-500 tracking-tighter">
                  ${formatCurrency(order.totalAmount)}
                </p>
              </div>

              {/* Pay Button */}
              <button 
                onClick={() => handlePayOrder(order)}
                className="bg-[#10b981] hover:bg-[#059669] text-white px-10 py-5 rounded-3xl font-black text-lg uppercase tracking-wider flex items-center gap-3 transition-all shadow-xl shadow-emerald-500/20 active:scale-95"
              >
                Pagar Pedido
              </button>
            </div>
          ))
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && payingOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300" onClick={() => !isProcessing && setShowPaymentModal(false)} />
          
          <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
             {!paymentFinished ? (
               <div className="p-8 flex flex-col items-center">
                  <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-3xl flex items-center justify-center mb-6">
                    <Banknote className="w-10 h-10 text-emerald-600" />
                  </div>
                  <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2">Proceso de Pago</h2>
                  <p className="text-slate-500 font-bold mb-8 uppercase tracking-widest text-xs">Total a pagar: <span className="text-rose-500"> ${formatCurrency(payingOrder.totalAmount)}</span></p>

                  <div className="w-full space-y-6">
                    <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-[2rem] border-2 border-slate-100 dark:border-slate-800">
                       <p className="text-[10px] font-black text-slate-400 mb-2 uppercase">Efectivo Recibido</p>
                       <div className="relative">
                          <span className="absolute left-6 top-1/2 -translate-y-1/2 text-3xl font-black text-slate-300">$</span>
                          <input 
                            autoFocus
                            type="text"
                            value={formatCurrency(cashReceived)}
                            onChange={(e) => setCashReceived(parseCurrency(e.target.value).toString())}
                            className="w-full bg-transparent border-none text-4xl font-black text-slate-900 dark:text-white pl-12 focus:ring-0 outline-none"
                            placeholder="0"
                            onKeyDown={(e) => e.key === 'Enter' && parseCurrency(cashReceived) >= payingOrder.totalAmount && confirmPayment()}
                          />
                       </div>
                    </div>

                    {parseCurrency(cashReceived) > 0 && (
                      <div className={`p-6 rounded-[2rem] flex justify-between items-center animate-in slide-in-from-top-2 ${parseCurrency(cashReceived) >= payingOrder.totalAmount ? 'bg-emerald-600' : 'bg-rose-600'} text-white`}>
                        <span className="font-black uppercase tracking-widest text-xs">
                          {parseCurrency(cashReceived) >= payingOrder.totalAmount ? 'Vueltas a devolver' : 'Faltan fondos'}
                        </span>
                        <span className="text-3xl font-black">
                           ${formatCurrency(Math.abs(parseCurrency(cashReceived) - payingOrder.totalAmount))}
                        </span>
                      </div>
                    )}

                    <div className="flex gap-4">
                      <button 
                        onClick={() => setShowPaymentModal(false)}
                        className="flex-1 py-5 rounded-[1.5rem] bg-slate-100 dark:bg-slate-800 text-slate-400 font-black uppercase text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                      >
                        Cancelar
                      </button>
                      <button 
                         disabled={isProcessing || parseCurrency(cashReceived) < payingOrder.totalAmount}
                         onClick={confirmPayment}
                         className="flex-1 py-5 rounded-[1.5rem] bg-emerald-600 text-white font-black uppercase text-sm hover:bg-emerald-500 shadow-lg shadow-emerald-500/20 disabled:opacity-30 transition-all"
                      >
                         {isProcessing ? 'Procesando...' : 'Confirmar Venta'}
                      </button>
                    </div>
                  </div>
               </div>
             ) : (
               <div className="p-12 flex flex-col items-center text-center animate-in zoom-in-95 duration-500">
                  <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-8">
                     <CheckCircle2 className="w-12 h-12 text-emerald-600" />
                  </div>
                  <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">¡Venta Exitosa!</h2>
                  <p className="text-slate-500 font-bold uppercase tracking-widest text-sm mb-10">Toda la orden ha sido liquidada</p>
                  
                  <div className="w-full bg-emerald-600 text-white p-8 rounded-[2.5rem] mb-10 shadow-2xl shadow-emerald-500/30">
                     <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-2">Entregar Vueltas</p>
                     <p className="text-6xl font-black tracking-tighter">${formatCurrency(changeAmount)}</p>
                  </div>

                  <button 
                    onClick={() => {
                      setShowPaymentModal(false);
                      setPayingOrder(null);
                    }}
                    className="w-full py-6 rounded-[2rem] bg-slate-900 text-white font-black uppercase text-lg hover:bg-black transition-all"
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
