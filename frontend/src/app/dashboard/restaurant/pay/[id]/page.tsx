'use client';
import { useState, useEffect, use } from 'react';
import { CreditCard, DollarSign, ArrowLeft, Printer, CheckCircle2, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Sale {
  id: string;
  tableName: string;
  totalAmount: number;
  waiter?: { name: string };
}

export default function RestaurantPayPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [sale, setSale] = useState<Sale | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'tarjeta' | 'transferencia'>('efectivo');
  const [shouldPrint, setShouldPrint] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    fetchOrder();
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
    }
  };

  const handleFinalize = async () => {
    setIsProcessing(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/sales/restaurant/order/${id}/close`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ paymentMethod })
      });

      if (res.ok) {
        setIsSuccess(true);
        // Simular impresión si está activo
        if (shouldPrint) {
          console.log("Simulando impresión de factura final...");
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
    <div className="p-6 h-full flex items-center justify-center bg-[#0f172a]">
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
              <div className="grid grid-cols-3 gap-4">
                 {[
                   { id: 'efectivo', icon: DollarSign, label: 'Efectivo' },
                   { id: 'tarjeta', icon: CreditCard, label: 'Tarjeta' },
                   { id: 'transferencia', icon: ChevronRight, label: 'Transf.' }
                 ].map((method) => (
                   <button
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id as any)}
                    className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 font-bold ${
                      paymentMethod === method.id 
                      ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-900/30' 
                      : 'bg-slate-800/50 border-slate-700 text-slate-500 hover:border-slate-500'
                    }`}
                   >
                      <method.icon className="w-6 h-6" />
                      {method.label}
                   </button>
                 ))}
              </div>
           </div>

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
  );
}
