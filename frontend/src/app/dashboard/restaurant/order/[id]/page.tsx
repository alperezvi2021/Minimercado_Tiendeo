'use client';
import { useState, useEffect, use } from 'react';
import { Utensils, Search, Plus, Trash2, CreditCard, ChevronLeft, User, DollarSign, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Product {
  id: string;
  name: string;
  price: number;
}

interface SaleItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

interface Sale {
  id: string;
  tableName: string;
  totalAmount: number;
  status: string;
  waiter?: { name: string };
  items: SaleItem[];
}

export default function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [sale, setSale] = useState<Sale | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // New Item selection
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    fetchOrder();
    fetchProducts();
  }, [id]);

  const fetchOrder = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/sales/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setSale(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/products`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setProducts(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddItem = async () => {
    if (!selectedProduct) return;
    setIsAdding(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/sales/restaurant/order/${id}/items`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          items: [{ 
            productId: selectedProduct.id, 
            productName: selectedProduct.name,
            quantity, 
            unitPrice: selectedProduct.price 
          }] 
        })
      });

      if (res.ok) {
        setSelectedProduct(null);
        setQuantity(1);
        setSearch('');
        fetchOrder();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAdding(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!confirm('¿Realmente deseas cancelar esta mesa? Los productos volverán al inventario.')) return;
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/sales/restaurant/order/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) router.push('/dashboard/restaurant');
    } catch (err) {
      console.error(err);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 6);

  if (isLoading) return <div className="p-10 text-center animate-pulse text-slate-500">Cargando mesa...</div>;
  if (!sale) return <div className="p-10 text-center text-red-500">Mesa no encontrada</div>;

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)] bg-[#0f172a] overflow-hidden">
      {/* Sidebar: Current Ticket */}
      <div className="w-full lg:w-[400px] border-r border-slate-800 flex flex-col bg-slate-900/50 backdrop-blur-md">
        <div className="p-6 border-b border-slate-800">
           <button onClick={() => router.push('/dashboard/restaurant')} className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors mb-4 text-sm font-bold">
             <ChevronLeft className="w-4 h-4" /> Volver al Dashboard
           </button>
           <h2 className="text-3xl font-black text-white truncate">{sale.tableName}</h2>
           <p className="text-blue-500 text-sm font-black uppercase tracking-wider mt-1">Mesero: {sale.waiter?.name}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
           {sale.items.map((item) => (
             <div key={item.id} className="flex justify-between items-start group">
                <div className="flex-1 min-w-0 pr-4">
                   <p className="text-white font-bold truncate">{item.productName}</p>
                   <p className="text-slate-500 text-xs">Cant: {item.quantity} x ${item.unitPrice.toLocaleString()}</p>
                </div>
                <div className="text-right">
                   <p className="text-white font-black">${item.subtotal.toLocaleString()}</p>
                </div>
             </div>
           ))}

           {sale.items.length === 0 && (
             <div className="py-20 text-center text-slate-600 border-2 border-dashed border-slate-800 rounded-3xl">
                <Utensils className="w-12 h-12 mx-auto mb-4 opacity-10" />
                No hay consumos todavía
             </div>
           )}
        </div>

        <div className="p-8 bg-slate-900 border-t border-slate-800 space-y-6">
           <div className="flex justify-between items-end">
              <span className="text-slate-500 font-bold uppercase tracking-widest text-xs">Total Parcial</span>
              <span className="text-4xl font-black text-blue-400">${Number(sale.totalAmount).toLocaleString('es-CO')}</span>
           </div>

           <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={handleCancelOrder}
                className="bg-slate-800 hover:bg-red-950/30 hover:text-red-500 border border-slate-700 hover:border-red-500/50 text-slate-400 font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2"
              >
                <Trash2 className="w-5 h-5" /> Cancelar
              </button>
              <button 
                onClick={() => router.push(`/dashboard/restaurant/pay/${sale.id}`)}
                className="bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-blue-900/30 flex items-center justify-center gap-2"
              >
                <CreditCard className="w-5 h-5" /> Cobrar
              </button>
           </div>
        </div>
      </div>

      {/* Main Area: Item Selection */}
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-8">
           <div className="relative group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="text"
                placeholder="Buscar producto para añadir..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-800/40 border border-slate-700/50 rounded-[2rem] py-6 pl-16 pr-8 text-2xl text-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold"
              />
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {search && filteredProducts.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedProduct(p)}
                  className="bg-slate-800/40 border border-slate-700/50 rounded-3xl p-6 text-left hover:border-blue-500 hover:bg-slate-800 transition-all group scale-100 active:scale-95"
                >
                   <div className="flex justify-between items-start mb-2">
                      <div className="bg-blue-500/10 p-3 rounded-2xl text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-all">
                        <Plus className="w-5 h-5" />
                      </div>
                      <span className="text-xl font-black text-white">${p.price.toLocaleString()}</span>
                   </div>
                   <h4 className="text-lg font-bold text-slate-300 group-hover:text-white truncate">{p.name}</h4>
                </button>
              ))}
           </div>

           {/* Quick Quantity and Add Modal Overlay */}
           {selectedProduct && (
             <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-slate-900 border border-slate-800 w-full max-w-sm p-10 rounded-[3rem] shadow-2xl relative animate-in zoom-in-95 duration-200">
                   <button onClick={() => setSelectedProduct(null)} className="absolute top-6 right-6 p-2 text-slate-500 hover:text-white">
                      <X className="w-6 h-6" />
                   </button>
                   
                   <h3 className="text-xl font-black text-white mb-2">{selectedProduct.name}</h3>
                   <p className="text-slate-500 font-bold mb-8">Selecciona la cantidad</p>

                   <div className="flex items-center justify-center gap-8 mb-10">
                      <button 
                        onClick={() => setQuantity(q => Math.max(1, q - 1))}
                        className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-3xl font-black text-white hover:bg-slate-700 active:scale-90 transition-all"
                      > - </button>
                      <span className="text-6xl font-black text-white">{quantity}</span>
                      <button 
                        onClick={() => setQuantity(q => q + 1)}
                        className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-3xl font-black text-white hover:bg-blue-500 active:scale-90 transition-all shadow-lg shadow-blue-900/40"
                      > + </button>
                   </div>

                   <button
                     disabled={isAdding}
                     onClick={handleAddItem}
                     className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-black py-6 rounded-3xl text-xl shadow-2xl shadow-blue-900/40 transition-all flex items-center justify-center gap-3"
                   >
                     {isAdding ? "Añadiendo..." : "Confirmar Ítem"}
                   </button>
                </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
