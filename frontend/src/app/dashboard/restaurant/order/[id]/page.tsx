'use client';
import { useState, useEffect, use } from 'react';
import { Utensils, Search, Plus, Trash2, CreditCard, ChevronLeft, User, DollarSign, X, Minus, Printer } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/utils/formatters';
import { useRef } from 'react';

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
  const [shouldPrintCommand, setShouldPrintCommand] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (!selectedProduct) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [selectedProduct]);

  const handleRemoveItem = async (itemId: string) => {
    if (!confirm('¿Eliminar este producto de la mesa? El stock será devuelto.')) return;
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/sales/restaurant/order/${id}/items/${itemId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) fetchOrder();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateQuantity = async (itemId: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(itemId);
      return;
    }
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/sales/restaurant/order/${id}/items/${itemId}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ quantity: newQty })
      });
      if (res.ok) fetchOrder();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && filteredProducts.length > 0) {
      setSelectedProduct(filteredProducts[0]);
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
            <p className="text-blue-500 text-sm font-black uppercase tracking-wider mt-1">
              Mesero: {sale.waiter?.name || <span className="text-slate-600 italic">No asignado</span>}
            </p>
         </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
           {(sale.items || []).map((item) => (
             <div key={item.id} className="flex justify-between items-center group bg-white/5 p-3 rounded-2xl border border-white/5 hover:border-blue-500/30 transition-all">
                <div className="flex-1 min-w-0 pr-2">
                   <p className="text-white font-bold truncate text-sm">{item.productName}</p>
                   <p className="text-slate-500 text-[10px] font-bold uppercase">${formatCurrency(item.unitPrice)}</p>
                </div>
                
                <div className="flex items-center gap-2">
                   <div className="flex items-center bg-slate-800 rounded-xl p-1">
                      <button 
                        onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                        className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                      >
                         <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center text-white font-black text-sm">{item.quantity}</span>
                      <button 
                        onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                        className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                      >
                         <Plus className="w-4 h-4" />
                      </button>
                   </div>
                   
                   <div className="text-right min-w-[70px]">
                      <p className="text-white font-black text-sm">${formatCurrency(item.subtotal)}</p>
                   </div>
                   
                   <button 
                    onClick={() => handleRemoveItem(item.id)}
                    className="p-2 text-slate-600 hover:text-red-500 transition-colors"
                   >
                      <Trash2 className="w-4 h-4" />
                   </button>
                </div>
             </div>
           ))}

           {(!sale.items || sale.items.length === 0) && (
             <div className="py-20 text-center text-slate-600 border-2 border-dashed border-slate-800 rounded-3xl">
                <Utensils className="w-12 h-12 mx-auto mb-4 opacity-10" />
                No hay consumos todavía
             </div>
           )}
        </div>

        <div className="p-8 bg-slate-900 border-t border-slate-800 space-y-4">
           <button 
             onClick={() => setShouldPrintCommand(!shouldPrintCommand)}
             className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all ${shouldPrintCommand ? 'bg-blue-600/10 border-blue-500 text-blue-400' : 'bg-slate-800 border-slate-700 text-slate-500'}`}
           >
              <div className="flex items-center gap-2">
                 <Printer className="w-4 h-4" />
                 <span className="text-xs font-bold uppercase tracking-wider">Comanda opcional</span>
              </div>
              <div className={`w-8 h-4 rounded-full relative transition-all ${shouldPrintCommand ? 'bg-blue-500' : 'bg-slate-600'}`}>
                 <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${shouldPrintCommand ? 'right-0.5' : 'left-0.5'}`} />
              </div>
           </button>

           <div className="flex justify-between items-end">
              <span className="text-slate-500 font-bold uppercase tracking-widest text-xs">Total Parcial</span>
              <span className="text-4xl font-black text-blue-400">${formatCurrency(sale.totalAmount)}</span>
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
                ref={searchInputRef}
                type="text"
                placeholder="Busca o Escanea..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="w-full bg-slate-800/40 border border-slate-700/50 rounded-[2rem] py-6 pl-16 pr-8 text-2xl text-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold"
              />
           </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {search && filteredProducts.map((p) => (
                 <button
                   key={p.id}
                   onClick={() => setSelectedProduct(p)}
                   className="bg-slate-800/40 border border-slate-700/50 rounded-3xl p-6 text-left hover:border-blue-500 hover:bg-slate-800 transition-all group scale-100 active:scale-95 animate-in fade-in zoom-in-95"
                 >
                    <div className="flex justify-between items-start mb-2">
                       <div className="bg-blue-500/10 p-3 rounded-2xl text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-all">
                         <Plus className="w-5 h-5" />
                       </div>
                       <span className="text-xl font-black text-white">${formatCurrency(p.price)}</span>
                    </div>
                    <h4 className="text-lg font-bold text-slate-300 group-hover:text-white truncate">{p.name}</h4>
                 </button>
               ))}
               
               {search && filteredProducts.length === 0 && (
                 <div className="col-span-full py-12 text-center bg-slate-800/20 border border-dashed border-slate-700 rounded-3xl">
                    <Search className="w-10 h-10 mx-auto mb-3 text-slate-700" />
                    <p className="text-slate-500 font-bold">No se encontraron productos con "{search}"</p>
                 </div>
               )}
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
