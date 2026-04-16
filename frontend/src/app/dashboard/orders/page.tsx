'use client';
import { useState, useEffect } from 'react';
import { 
  ClipboardCheck, 
  Search, 
  Plus, 
  User, 
  Clock, 
  ArrowRight, 
  Trash2, 
  ChevronDown,
  Loader2,
  Utensils
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/utils/formatters';

interface OpenSale {
  id: string;
  tableName: string;
  totalAmount: number;
  createdAt: string;
  waiterId: string;
  waiter?: { name: string };
  items: any[];
}

interface Waiter {
  id: string;
  name: string;
}

export default function OrderManagementPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OpenSale[]>([]);
  const [waiters, setWaiters] = useState<Waiter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isUpdatingWaiter, setIsUpdatingWaiter] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const [resOrders, resWaiters] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/sales/restaurant/open`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/waiters`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (resOrders.ok) setOrders(await resOrders.json());
      if (resWaiters.ok) setWaiters(await resWaiters.json());
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateWaiter = async (saleId: string, newWaiterId: string) => {
    setIsUpdatingWaiter(saleId);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/sales/restaurant/order/${saleId}/waiter`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ waiterId: newWaiterId })
      });

      if (res.ok) {
        // Actualizar localmente
        setOrders(prev => prev.map(o => 
          o.id === saleId 
            ? { ...o, waiterId: newWaiterId, waiter: waiters.find(w => w.id === newWaiterId) } 
            : o
        ));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdatingWaiter(null);
    }
  };

  const handleCancelOrder = async (saleId: string) => {
    if (!confirm('¿Estás seguro de que deseas cancelar este pedido por completo? Esta acción devolverá los productos al inventario y ELIMINARÁ el registro.')) {
      return;
    }

    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/sales/restaurant/order/${saleId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        setOrders(prev => prev.filter(o => o.id !== saleId));
      } else {
        alert('Error al cancelar el pedido');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredOrders = orders.filter(o => 
    o.tableName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.waiter?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-white flex items-center gap-4">
            <ClipboardCheck className="w-10 h-10 text-blue-500" />
            Gestión de Pedidos
          </h1>
          <p className="text-slate-400 mt-2 text-lg">
            Facturación rápida de mesas y consumos activos.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative group flex-1 sm:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
            <input
              type="text"
              placeholder="Buscar por mesa o mesero..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800/40 border border-slate-700/50 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all backdrop-blur-sm"
            />
          </div>
          <button
            onClick={() => router.push('/dashboard/restaurant')}
            className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all shadow-xl shadow-blue-900/30 active:scale-95"
          >
            <Plus className="w-6 h-6" />
            Abrir Nuevo Pedido
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
          <p className="text-slate-400 font-bold animate-pulse">Cargando pedidos activos...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredOrders.map((order) => (
            <div 
              key={order.id}
              className="group bg-slate-800/40 border border-slate-700/50 rounded-[2.5rem] overflow-hidden flex flex-col transition-all hover:bg-slate-800/60 hover:shadow-2xl hover:shadow-black/40 hover:-translate-y-1 relative"
            >
              {/* Card Header: Waiter Selection */}
              <div className="p-6 pb-2">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="bg-blue-500/10 p-2 rounded-xl">
                      <User className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Mesero</p>
                      <div className="relative">
                        <select
                          value={order.waiterId}
                          onChange={(e) => handleUpdateWaiter(order.id, e.target.value)}
                          disabled={isUpdatingWaiter === order.id}
                          className="appearance-none bg-transparent text-white font-bold pr-6 focus:outline-none cursor-pointer disabled:opacity-50"
                        >
                          {waiters.map(w => (
                            <option key={w.id} value={w.id} className="bg-slate-900 font-sans">{w.name}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => handleCancelOrder(order.id)}
                    className="p-3 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-2xl transition-all opacity-0 group-hover:opacity-100"
                    title="Cancelar pedido completo"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                <h3 className="text-3xl font-black text-white leading-tight">
                  {order.tableName}
                </h3>
              </div>

              {/* Card Content: Items Summary */}
              <div className="p-6 pt-2 flex-1">
                 <div className="bg-black/20 rounded-2xl p-4 min-h-[80px]">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-2">Consumo Actual</p>
                    <div className="space-y-1">
                       {order.items?.length > 0 ? (
                         order.items.slice(0, 3).map((item: any, idx) => (
                           <div key={idx} className="flex justify-between items-center text-sm font-medium text-slate-300">
                             <span className="truncate flex-1">{item.productName}</span>
                             <span className="text-slate-500 ml-2">x{item.quantity}</span>
                           </div>
                         ))
                       ) : (
                         <p className="text-slate-500 text-sm italic">Sin productos aún</p>
                       )}
                       {order.items?.length > 3 && (
                         <p className="text-[10px] text-blue-500 font-bold mt-1">+{order.items.length - 3} productos más...</p>
                       )}
                    </div>
                 </div>
              </div>

              {/* Card Footer: Total & Call to Action */}
              <div className="p-6 pt-0 mt-auto">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Total</p>
                    <p className="text-4xl font-black text-rose-500 font-mono tracking-tighter">
                      ${formatCurrency(order.totalAmount)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-bold">
                       <Clock className="w-3.5 h-3.5" />
                       {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => router.push(`/dashboard/restaurant/pay/${order.id}`)}
                  className="w-full bg-[#10b981] hover:bg-[#059669] text-white font-black py-5 rounded-[1.5rem] flex items-center justify-center gap-3 transition-all shadow-xl shadow-emerald-900/20 active:scale-95 text-lg uppercase tracking-wider"
                >
                  Pagar Pedido
                  <ArrowRight className="w-6 h-6" />
                </button>
              </div>
            </div>
          ))}

          {filteredOrders.length === 0 && (
            <div className="col-span-full py-32 bg-slate-800/10 border-2 border-dashed border-slate-700/50 rounded-[3.5rem] flex flex-col items-center justify-center text-slate-500">
               <Utensils className="w-20 h-20 mb-6 opacity-20" />
               <p className="text-xl font-bold">No hay pedidos activos para los filtros actuales</p>
               <button 
                onClick={() => router.push('/dashboard/restaurant')}
                className="mt-4 text-blue-500 hover:text-blue-400 font-bold transition-colors"
               >
                 Abrir un nuevo pedido desde mesas
               </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
