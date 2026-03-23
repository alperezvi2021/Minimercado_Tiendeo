'use client';
import { useState, useEffect } from 'react';
import { X, DollarSign, Calendar, FileText, Loader2, ArrowDownCircle, History, User } from 'lucide-react';

interface AbonoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  credit: any;
}

export default function AbonoModal({ isOpen, onClose, onSave, credit }: AbonoModalProps) {
  const [amount, setAmount] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (isOpen && credit) {
      setAmount('');
      setNotes('');
      fetchHistory();
    }
  }, [isOpen, credit]);

  const fetchHistory = async () => {
    if (!credit) return;
    setLoadingHistory(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/sales/credits/${credit.id}/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data.payments || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/sales/credits/${credit.id}/partial-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          amount: parseFloat(amount),
          notes 
        })
      });

      if (res.ok) {
        onSave();
        onClose();
      } else {
        const err = await res.json();
        alert('Error: ' + (err.message || 'No se pudo registrar el abono'));
      }
    } catch (error) {
      console.error(error);
      alert('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !credit) return null;

  const remaining = Number(credit.remainingAmount || credit.amount);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-[3rem] shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden flex flex-col md:flex-row h-full max-h-[85vh] animate-in zoom-in-95 duration-300">
        
        {/* Left Side: Abono Form */}
        <div className="w-full md:w-1/2 p-10 flex flex-col justify-center border-b md:border-b-0 md:border-r border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-950/50">
          <div className="mb-8">
            <h3 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-3">
              <div className="bg-blue-600 p-3 rounded-2xl shadow-xl shadow-blue-600/20">
                <ArrowDownCircle className="w-6 h-6 text-white" />
              </div>
              Registrar Abono
            </h3>
            <div className="mt-6 p-6 bg-white dark:bg-slate-900 rounded-[2rem] border border-gray-200 dark:border-slate-800 shadow-sm">
                <p className="text-xs font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1">Saldo Pendiente</p>
                <p className="text-4xl font-black text-rose-600 dark:text-rose-500">${Math.round(remaining).toLocaleString('es-CO')}</p>
                <div className="mt-4 flex items-center gap-2 text-sm font-bold text-gray-600 dark:text-slate-400">
                   <User className="w-4 h-4 text-blue-500" />
                   {credit.customerName || 'Cliente Genérico'}
                </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-4">Monto a abonar</label>
              <div className="relative">
                <DollarSign className="absolute left-6 top-5 w-6 h-6 text-blue-600" />
                <input
                  required
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl pl-16 pr-6 py-5 text-2xl font-black text-gray-900 dark:text-white focus:border-blue-500 outline-none transition-all"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-4">Nota / Observación</label>
              <div className="relative">
                <FileText className="absolute left-6 top-5 w-6 h-6 text-gray-400" />
                <textarea
                  placeholder="Ej: Pago en efectivo parte de la deuda..."
                  rows={2}
                  className="w-full bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl pl-16 pr-6 py-5 text-lg font-bold text-gray-900 dark:text-white focus:border-blue-500 outline-none transition-all resize-none"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            <button
              disabled={loading}
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white py-5 rounded-3xl font-black text-xl shadow-2xl shadow-blue-600/30 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <>Confirmar Abono</>}
            </button>
          </form>
        </div>

        {/* Right Side: History */}
        <div className="w-full md:w-1/2 p-10 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-3">
              <History className="w-6 h-6 text-slate-400" />
              Historial de Pagos
            </h3>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors md:hidden">
                <X className="w-6 h-6 text-gray-400" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
            {loadingHistory ? (
              <div className="flex flex-col items-center justify-center h-40 opacity-50">
                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                <p className="text-xs font-bold uppercase tracking-widest">Cargando historial...</p>
              </div>
            ) : history.length === 0 ? (
              <div className="border-2 border-dashed border-gray-100 dark:border-slate-800 rounded-[2.5rem] p-12 text-center">
                <p className="text-gray-400 dark:text-slate-500 font-bold">No hay abonos registrados para esta deuda.</p>
              </div>
            ) : (
              history.map((h) => (
                <div key={h.id} className="p-6 bg-gray-50 dark:bg-slate-800/50 rounded-3xl border border-gray-100 dark:border-slate-800 transition-all hover:shadow-lg">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-xl font-black text-green-600 dark:text-green-500">+ ${Math.round(h.amount).toLocaleString('es-CO')}</p>
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-slate-900 rounded-full border border-gray-200 dark:border-slate-800 shadow-sm">
                      <Calendar className="w-3 h-3 text-blue-500" />
                      <span className="text-[10px] font-black text-gray-500 dark:text-slate-400">
                        {new Date(h.paymentDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  {h.notes && (
                    <p className="text-sm font-medium text-gray-600 dark:text-slate-400 italic">"{h.notes}"</p>
                  )}
                </div>
              ))
            )}
          </div>

          <button 
            onClick={onClose} 
            className="hidden md:flex mt-8 w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all"
          >
            Cerrar Ventana
          </button>
        </div>
      </div>
    </div>
  );
}
