'use client';
import { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Calendar, 
  Clock, 
  Banknote, 
  CreditCard, 
  ArrowRightLeft, 
  TrendingUp,
  Activity,
  User,
  ExternalLink,
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';

interface Closure {
  id: string;
  userName: string;
  openedAt: string;
  closedAt: string | null;
  openingAmount: number;
  totalCashSales: number;
  totalCreditSales: number;
  totalCreditPayments: number;
  totalExpenses: number;
  totalAmount: number;
  status: 'OPEN' | 'CLOSED';
}

export default function CashiersActivityPage() {
  const [closures, setClosures] = useState<Closure[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'open' | 'closed'>('all');

  useEffect(() => {
    fetchClosures();
  }, []);

  const fetchClosures = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/sales/closures`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setClosures(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredClosures = closures.filter(c => {
    const matchesFilter = c.userName.toLowerCase().includes(filter.toLowerCase());
    if (activeTab === 'open') return matchesFilter && c.status === 'OPEN';
    if (activeTab === 'closed') return matchesFilter && c.status === 'CLOSED';
    return matchesFilter;
  });

  const activeSessions = closures.filter(c => c.status === 'OPEN');
  const totalCashInHands = activeSessions.reduce((sum, c) => {
      // Dinero en mano = Base + Ventas Efectivo + Abonos - Gastos
      return sum + Number(c.openingAmount) + Number(c.totalCashSales) + Number(c.totalCreditPayments) - Number(c.totalExpenses);
  }, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-white flex items-center gap-3 tracking-tight">
            <Activity className="w-10 h-10 text-emerald-500" />
            Monitoreo de Cajeros
          </h1>
          <p className="text-slate-400 mt-2 font-medium">Actividad en tiempo real y control de movimientos de caja</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
           <div className="bg-slate-900 border border-slate-800 px-6 py-4 rounded-3xl shadow-xl flex items-center gap-6">
              <div className="text-center">
                 <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Sesiones Activas</p>
                 <p className="text-2xl font-black text-emerald-500">{activeSessions.length}</p>
              </div>
              <div className="h-10 w-px bg-slate-800" />
              <div className="text-center">
                 <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Efectivo en Cajas</p>
                 <p className="text-2xl font-black text-white">${formatCurrency(totalCashInHands)}</p>
              </div>
           </div>
        </div>
      </div>

      {/* Navigation and Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
         <div className="flex bg-slate-900/50 p-1 rounded-2xl border border-slate-800">
            <button 
              onClick={() => setActiveTab('all')}
              className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'all' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              Todos
            </button>
            <button 
              onClick={() => setActiveTab('open')}
              className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'open' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              Abiertos
            </button>
            <button 
              onClick={() => setActiveTab('closed')}
              className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'closed' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              Cerrados
            </button>
         </div>

         <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-3 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Buscar cajero..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-bold text-sm"
            />
         </div>
      </div>

      {/* Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredClosures.map((c) => {
          const cashInHands = Number(c.openingAmount) + Number(c.totalCashSales) + Number(c.totalCreditPayments) - Number(c.totalExpenses);
          
          return (
            <div key={c.id} className={`bg-slate-900 border ${c.status === 'OPEN' ? 'border-emerald-500/30 bg-emerald-500/[0.02]' : 'border-slate-800'} rounded-[2.5rem] p-6 shadow-2xl transition-all hover:scale-[1.01] group`}>
               {/* Card Header */}
               <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                     <div className={`p-4 rounded-2xl ${c.status === 'OPEN' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-800 text-slate-400'}`}>
                        <User className="w-6 h-6" />
                     </div>
                     <div>
                        <h3 className="text-xl font-black text-white tracking-tight">{c.userName}</h3>
                        <div className="flex items-center gap-2 mt-1">
                           <span className={`w-2 h-2 rounded-full ${c.status === 'OPEN' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
                           <span className={`text-[10px] font-black uppercase tracking-widest ${c.status === 'OPEN' ? 'text-emerald-500' : 'text-slate-500'}`}>
                              {c.status === 'OPEN' ? 'Sesión Activa' : 'Turno Cerrado'}
                           </span>
                        </div>
                     </div>
                  </div>
                  <div className="text-right">
                     <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Iniciado</p>
                     <p className="text-xs font-bold text-slate-300">{new Date(c.openedAt).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}</p>
                  </div>
               </div>

               {/* Metrics Grid */}
               <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                  <div className="bg-slate-950/50 p-4 rounded-3xl border border-slate-800/50">
                     <div className="flex items-center gap-2 text-slate-500 mb-1">
                        <Banknote className="w-3.5 h-3.5" />
                        <span className="text-[9px] font-black uppercase">Base</span>
                     </div>
                     <p className="text-lg font-black text-white">${formatCurrency(c.openingAmount)}</p>
                  </div>
                  <div className="bg-slate-950/50 p-4 rounded-3xl border border-slate-800/50">
                     <div className="flex items-center gap-2 text-blue-500 mb-1">
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span className="text-[9px] font-black uppercase">Ventas Efec.</span>
                     </div>
                     <p className="text-lg font-black text-blue-500">${formatCurrency(c.totalCashSales)}</p>
                  </div>
                  <div className="bg-slate-950/50 p-4 rounded-3xl border border-slate-800/50">
                     <div className="flex items-center gap-2 text-orange-500 mb-1">
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                        <span className="text-[9px] font-black uppercase">Abonos</span>
                     </div>
                     <p className="text-lg font-black text-orange-500">${formatCurrency(c.totalCreditPayments)}</p>
                  </div>
               </div>

               {/* Cash Detail */}
               <div className={`p-5 rounded-3xl flex items-center justify-between ${c.status === 'OPEN' ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-slate-800/50 border border-slate-700/50'}`}>
                  <div>
                     <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Efectivo que debe haber</p>
                     <p className={`text-2xl font-black ${c.status === 'OPEN' ? 'text-emerald-500' : 'text-white'}`}>
                        ${formatCurrency(cashInHands)}
                     </p>
                  </div>
                  {c.status === 'CLOSED' && (
                     <div className="text-right">
                        <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Cerrado En</p>
                        <p className="text-sm font-bold text-slate-300">{new Date(c.closedAt!).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</p>
                     </div>
                  )}
               </div>

               {/* Additional Stats Footer */}
               <div className="mt-6 pt-6 border-t border-slate-800/50 flex flex-wrap gap-6">
                  <div className="flex items-center gap-2">
                     <CreditCard className="w-4 h-4 text-slate-500" />
                     <span className="text-xs font-bold text-slate-400">Ventas Crédito: <span className="text-white">${formatCurrency(c.totalCreditSales)}</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                     <AlertCircle className="w-4 h-4 text-rose-500" />
                     <span className="text-xs font-bold text-slate-400">Gastos: <span className="text-rose-400">${formatCurrency(c.totalExpenses)}</span></span>
                  </div>
               </div>
            </div>
          );
        })}

        {filteredClosures.length === 0 && (
          <div className="lg:col-span-2 py-20 text-center bg-slate-900 rounded-[3rem] border border-dashed border-slate-800">
             <Activity className="w-16 h-16 text-slate-700 mx-auto mb-4" />
             <h3 className="text-xl font-bold text-white">No se encontró actividad</h3>
             <p className="text-slate-500">No hay registros que coincidan con los filtros actuales.</p>
          </div>
        )}
      </div>

      {/* Legend / Info */}
      <div className="bg-blue-600/10 border border-blue-500/20 rounded-[2.5rem] p-8 flex items-start gap-4">
         <div className="bg-blue-600/20 p-3 rounded-2xl">
            <CheckCircle2 className="w-6 h-6 text-blue-500" />
         </div>
         <div>
            <h4 className="text-lg font-black text-white mb-1">Información de Supervisión</h4>
            <p className="text-slate-400 text-sm leading-relaxed max-w-3xl">
               Los valores se actualizan cada vez que el cajero realiza una venta o registra un abono. 
               El "Efectivo que debe haber" se calcula automáticamente sumando la base inicial, las ventas en efectivo y los abonos recibidos, 
               menos los gastos registrados en ese turno.
            </p>
         </div>
      </div>
    </div>
  );
}
