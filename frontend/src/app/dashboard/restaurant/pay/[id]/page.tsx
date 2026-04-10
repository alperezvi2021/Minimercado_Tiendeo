'use client';
import { useState, useEffect, use } from 'react';
import { CreditCard, DollarSign, ArrowLeft, Printer, CheckCircle2, ChevronRight, Search, User, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/utils/formatters';

interface Sale {
  id: string;
  tableName: string;
  totalAmount: number;
  waiter?: { name: string };
  items?: {
    quantity: number;
    productName: string;
    subtotal: number;
  }[];
}

export default function RestaurantPayPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [sale, setSale] = useState<Sale | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'tarjeta' | 'transferencia' | 'credito'>('efectivo');
  const [shouldPrint, setShouldPrint] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerSearch, setCustomerSearch] = useState('');

  useEffect(() => {
    fetchOrder();
    fetchCustomers();
  }, [id]);

  const fetchCustomers = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/customers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setCustomers(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const fetchOrder = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/sales/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setSale(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const handleFinalize = async () => {
    setIsProcessing(true);
    try {
      const token = localStorage.getItem('access_token');
      const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/sales/restaurant/order/${id}/close`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          paymentMethod,
          customerId: selectedCustomerId || undefined,
          customerName: selectedCustomer?.name || (paymentMethod === 'credito' ? customerSearch : undefined)
        })
      });

      if (res.ok) {
        setIsSuccess(true);
        if (shouldPrint) {
          setTimeout(() => {
            window.print();
          }, 500);
        }
        setTimeout(() => router.push('/dashboard/restaurant'), 2000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!sale) return <div className="p-10 text-center text-slate-500">Cargando datos de cobro...</div>;

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-6 animate-in zoom-in-95 duration-500">
        <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center shadow-2xl shadow-green-900/40">
           <CheckCircle2 className="w-14 h-14 text-white" />
        </div>
        <div className="text-center">
          <h2 className="text-4xl font-black text-white">¡Pago Exitoso!</h2>
          <p className="text-slate-400 mt-2">La mesa {sale.tableName} ha sido cerrada correctamente.</p>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="p-6 h-full flex items-center justify-center bg-[#0f172a] print:hidden">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-[3rem] overflow-hidden shadow-2xl">
        <div className="p-10 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
           <div>
              <h1 className="text-3xl font-black text-white">Cerrar Cuenta</h1>
              <p className="text-slate-500 font-bold uppercase tracking-wider text-xs mt-1">
                {sale.tableName} — {sale.waiter?.name}
              </p>
           </div>
           <div className="text-right">
              <p className="text-slate-500 text-sm font-bold">Total a Pagar</p>
              <p className="text-4xl font-black text-blue-400">${Number(sale.totalAmount).toLocaleString('es-CO')}</p>
           </div>
        </div>

        <div className="p-10 space-y-10">
            <div className="space-y-4">
               <label className="text-sm font-black uppercase tracking-widest text-slate-500 ml-1">Método de Pago</label>
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { id: 'efectivo', icon: DollarSign, label: 'Efectivo' },
                    { id: 'credito', icon: User, label: 'Crédito' }
                  ].map((method) => (
                    <button
                     key={method.id}
                     onClick={() => setPaymentMethod(method.id as any)}
                     className={`p-4 rounded-3xl border-2 transition-all flex flex-col items-center gap-2 font-bold ${
                       paymentMethod === method.id 
                       ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-900/30' 
                       : 'bg-slate-800/50 border-slate-700 text-slate-500 hover:border-slate-500'
                     }`}
                    >
                       <method.icon className="w-5 h-5" />
                       <span className="text-xs">{method.label}</span>
                    </button>
                  ))}
               </div>
            </div>

            {/* SELECCIÓN DE CLIENTE (Solo si es Crédito) */}
            {paymentMethod === 'credito' && (
              <div className="space-y-4 animate-in slide-in-from-top-4 duration-300">
                <label className="text-sm font-black uppercase tracking-widest text-slate-500 ml-1">Seleccionar Cliente</label>
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Buscar cliente..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-blue-500 transition-all font-bold"
                  />
                </div>
                
                <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                   {customers
                     .filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()))
                     .slice(0, 4)
                     .map(customer => (
                       <button
                         key={customer.id}
                         onClick={() => {
                           setSelectedCustomerId(customer.id);
                           setCustomerSearch(customer.name);
                         }}
                         className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                           selectedCustomerId === customer.id 
                           ? 'bg-blue-600/20 border-blue-500 text-white' 
                           : 'bg-slate-800/30 border-slate-700 text-slate-400 hover:bg-slate-800'
                         }`}
                       >
                         <span className="font-bold">{customer.name}</span>
                         {selectedCustomerId === customer.id && <CheckCircle2 className="w-4 h-4 text-blue-400" />}
                       </button>
                   ))}
                   {customerSearch && !customers.some(c => c.name.toLowerCase() === customerSearch.toLowerCase()) && (
                      <div className="p-4 rounded-2xl border border-dashed border-slate-700 text-slate-500 text-center flex items-center justify-center gap-2">
                         <UserPlus className="w-4 h-4" />
                         <span className="text-xs font-bold">Se creará cliente nuevo: "{customerSearch}"</span>
                      </div>
                   )}
                </div>
              </div>
            )}

           <div className="flex items-center justify-between bg-slate-800/30 p-6 rounded-3xl border border-slate-700/50">
              <div className="flex items-center gap-4">
                 <div className="bg-slate-800 p-3 rounded-2xl text-slate-400">
                    <Printer className="w-6 h-6" />
                 </div>
                 <div>
                    <p className="text-white font-bold">Imprimir Comprobante</p>
                    <p className="text-slate-500 text-xs">Generar ticket de venta física</p>
                 </div>
              </div>
              <button 
                onClick={() => setShouldPrint(!shouldPrint)}
                className={`w-16 h-8 rounded-full transition-all relative ${shouldPrint ? 'bg-blue-600' : 'bg-slate-700'}`}
              >
                 <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${shouldPrint ? 'right-1' : 'left-1'}`} />
              </button>
           </div>

           <div className="flex gap-4 pt-4">
              <button
                onClick={() => router.back()}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-5 rounded-3xl transition-all"
              >
                Cancelar
              </button>
              <button
                disabled={isProcessing}
                onClick={handleFinalize}
                className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white font-black py-5 rounded-3xl text-xl transition-all shadow-2xl shadow-blue-900/40 flex items-center justify-center gap-3 active:scale-95"
              >
                {isProcessing ? "Procesando..." : "Confirmar y Cobrar"}
              </button>
           </div>
        </div>
      </div>
    </div>

    {/* TICKET DE IMPRESIÓN (Solo visible al imprimir) */}
    <div id="printable-receipt" className="hidden print:block text-black bg-white p-4 font-mono text-sm leading-tight w-[58mm]">
      <div className="text-center mb-4">
        <h2 className="font-bold text-lg border-b border-black pb-2 mb-2 z-10 relative">Servicio a Mesas</h2>
        <p className="font-bold border border-black rounded inline-block px-2 mb-2">{sale.tableName}</p>
        <p className="text-xs">Atiende: {sale.waiter?.name || 'Varios'}</p>
        <p className="text-xs">{new Date().toLocaleString('es-CO')}</p>
      </div>

      <div className="border-b border-black border-dashed pb-2 mb-2 text-xs">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-black">
              <th className="w-8 pb-1">Cant</th>
              <th className="pb-1">Prod</th>
              <th className="text-right pb-1">Total</th>
            </tr>
          </thead>
          <tbody>
            {(sale.items || []).map((item, idx) => (
              <tr key={idx}>
                <td className="align-top font-bold">{item.quantity}</td>
                <td className="align-top truncate">{item.productName}</td>
                <td className="text-right align-top">${Number(item.subtotal).toLocaleString('es-CO')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-right pb-2 border-b border-black border-dashed">
        <p className="font-bold text-lg tracking-tight">TOTAL: ${Number(sale.totalAmount).toLocaleString('es-CO')}</p>
        <p className="text-xs mt-1">PAGO EN: {paymentMethod.toUpperCase()}</p>
      </div>
      
      <div className="text-center mt-4 text-[10px]">
        <p className="font-bold">¡Gracias por su visita!</p>
        <p className="mt-1">Sistema POS Tiendeo</p>
      </div>
    </div>
    </>
  );
}
