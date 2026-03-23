'use client';
import { useState, useEffect } from 'react';
import { 
  ArrowRightLeft, 
  Search, 
  User, 
  Calendar, 
  CheckCircle2, 
  Banknote,
  Loader2,
  AlertCircle
} from 'lucide-react';

interface CreditSale {
  id: string;
  customerName: string;
  amount: number;
  status: string;
  createdAt: string;
  sale: {
    id: string;
    totalAmount: number;
  }
}

export default function CreditsPage() {
  const [credits, setCredits] = useState<CreditSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchCredits = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/sales/credits/pending`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCredits(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCredits();
  }, []);

  const handlePay = async (creditId: string) => {
    if (!confirm('¿Confirmar que el cliente ha pagado este crédito en efectivo?')) return;
    
    setProcessingId(creditId);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/sales/credits/${creditId}/pay`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        alert('Pago registrado correctamente. El ingreso aparecerá ahora en la contabilidad como efectivo.');
        fetchCredits();
      } else {
        alert('Error al procesar el pago');
      }
    } catch (e) {
      console.error(e);
      alert('Error de conexión');
    } finally {
      setProcessingId(null);
    }
  };

  const filteredCredits = credits.filter(c => 
    c.customerName.toLowerCase().includes(filter.toLowerCase())
  );

  const totalOwed = filteredCredits.reduce((sum, c) => sum + Number(c.amount), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-white flex items-center gap-3 tracking-tight">
            <ArrowRightLeft className="w-10 h-10 text-orange-500" />
            Cuentas por Cobrar
          </h1>
          <p className="text-slate-400 mt-2 font-medium">Gestiona las deudas de tus clientes y registra sus pagos</p>
        </div>
        
        <div className="bg-slate-900 border border-slate-800 px-6 py-4 rounded-3xl shadow-xl flex items-center gap-4">
          <div>
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Total por Cobrar</p>
            <p className="text-3xl font-black text-orange-500">${Math.round(totalOwed).toLocaleString('es-CO')}</p>
          </div>
          <div className="h-10 w-px bg-slate-800 mx-2" />
          <div className="text-center">
             <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Clientes</p>
             <p className="text-2xl font-black text-white">{filteredCredits.length}</p>
          </div>
        </div>
      </div>

      {/* Filter and Content */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="px-8 py-6 border-b border-slate-800 bg-slate-950/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            Deudas Pendientes
          </h2>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-3 w-5 h-5 text-slate-500" />
            <input 
              type="text" 
              placeholder="Buscar cliente..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-12 pr-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-bold"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-800/50">
                <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Cliente</th>
                <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Fecha Deuda</th>
                <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Monto</th>
                <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Estado</th>
                <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredCredits.map((credit) => (
                <tr key={credit.id} className="hover:bg-slate-800/30 transition-colors group">
                  <td className="px-8 py-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-slate-800 p-2 rounded-xl group-hover:bg-slate-700 transition-colors">
                        <User className="w-5 h-5 text-slate-400" />
                      </div>
                      <span className="text-sm font-black text-white">{credit.customerName}</span>
                    </div>
                  </td>
                  <td className="px-8 py-4 text-center">
                    <div className="inline-flex items-center gap-2 text-xs text-slate-500 font-bold bg-slate-950/50 px-3 py-1 rounded-full">
                      <Calendar className="w-3 h-3" />
                      {new Date(credit.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-8 py-4">
                    <span className="text-lg font-black text-white">${Math.round(credit.amount).toLocaleString('es-CO')}</span>
                  </td>
                  <td className="px-8 py-4">
                    <span className="bg-orange-900/40 text-orange-400 text-[10px] font-black uppercase px-2.5 py-1 rounded-full border border-orange-500/20">
                      Pendiente
                    </span>
                  </td>
                  <td className="px-8 py-4 text-right">
                    <button
                      onClick={() => handlePay(credit.id)}
                      disabled={processingId === credit.id}
                      className="bg-green-600 hover:bg-green-500 text-white px-5 py-2 rounded-xl font-bold text-sm flex items-center gap-2 ml-auto shadow-lg shadow-green-900/20 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {processingId === credit.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Banknote className="w-4 h-4" />
                          Marcar Pago
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
              {filteredCredits.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-16 text-center text-slate-500 italic">
                    <div className="flex flex-col items-center gap-4">
                       <CheckCircle2 className="w-12 h-12 text-slate-700" />
                       <p className="text-lg font-bold">No hay deudas pendientes</p>
                       <p className="text-sm">¡Buen trabajo! Todo está al día.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Alert */}
      <div className="bg-blue-600/10 border border-blue-500/20 rounded-3xl p-6 flex items-start gap-4">
        <AlertCircle className="w-6 h-6 text-blue-500 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-white font-bold mb-1">Impacto en Contabilidad</h4>
          <p className="text-sm text-slate-400">
            Al marcar un crédito como pagado, el monto se moverá automáticamente de "Cuentas por Cobrar" a "Ingresos Efectivo". 
            Esto afectará tus balances globales inmediatamente.
          </p>
        </div>
      </div>
    </div>
  );
}
