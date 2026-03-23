'use client';
import { useState, useEffect } from 'react';
import { 
  ClipboardCheck, 
  CircleDollarSign, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  User as UserIcon,
  Search,
  ArrowRightLeft,
  Banknote
} from 'lucide-react';

interface Sale {
  id: string;
  totalAmount: number;
  paymentMethod: string;
  customerName?: string;
  createdAt: string;
}

interface ClosureStatus {
  closure: {
    id: string;
    userName: string;
    openedAt: string;
  };
  totalCash: number;
  totalCredit: number;
  salesCount: number;
}

export default function ClosurePage() {
  const [status, setStatus] = useState<ClosureStatus | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);

  const fetchStatus = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/sales/closure/status`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Error fetching closure status:', error);
    }
  };

  const fetchSales = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/sales/closure/sales`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      const data = await response.json();
      setSales(data);
    } catch (error) {
      console.error('Error fetching closure sales:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchSales();
  }, []);

  const handlePayCredit = async (saleId: string) => {
    if (!confirm('¿Marcar esta venta a crédito como pagada en efectivo?')) {
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/sales/${saleId}/pay-from-closure`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });

      if (response.ok) {
        alert('Pago registrado con éxito');
        fetchStatus();
        fetchSales();
      }
    } catch (error) {
      console.error('Error paying credit:', error);
    }
  };

  const handleCloseBox = async () => {
    if (!confirm('¿Está seguro de que desea realizar el cierre de caja? Esto finalizará su turno actual.')) {
      return;
    }

    setClosing(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/sales/closure/close`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });

      if (response.ok) {
        alert('Cierre de caja realizado con éxito');
        window.location.reload();
      }
    } catch (error) {
      console.error('Error performing closure:', error);
    } finally {
      setClosing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!status || !status.closure) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center">
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-3xl p-12 shadow-2xl">
          <AlertCircle className="w-16 h-16 text-slate-500 mx-auto mb-6" />
          <h2 className="text-2xl font-bold mb-4 text-white">No hay turno abierto</h2>
          <p className="text-slate-400 mb-8">
            Realice una venta en la caja para iniciar un nuevo turno automáticamente.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-white flex items-center gap-3 tracking-tight">
            <ClipboardCheck className="w-10 h-10 text-blue-500" />
            Cierre de Caja
          </h1>
          <p className="text-slate-400 mt-2 font-medium">Gestiona tu turno y concilia las ventas del día</p>
        </div>
        <button
          onClick={handleCloseBox}
          disabled={closing}
          className="bg-red-600 hover:bg-red-500 text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-red-900/20 transition-all active:scale-95 disabled:opacity-50"
        >
          {closing ? 'Procesando...' : 'Finalizar Turno y Cerrar Caja'}
          <CheckCircle2 className="w-5 h-5" />
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-blue-500/10 p-2 rounded-xl">
              <UserIcon className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-slate-400 font-bold text-sm uppercase tracking-wider">Cajero</span>
          </div>
          <p className="text-2xl font-black text-white">{status.closure?.userName || 'Cajero'}</p>
          <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
            <Clock className="w-3 h-3" />
            Desde {status.closure?.openedAt ? new Date(status.closure.openedAt).toLocaleString() : '---'}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-green-500/10 p-2 rounded-xl">
              <CircleDollarSign className="w-5 h-5 text-green-400" />
            </div>
            <span className="text-slate-400 font-bold text-sm uppercase tracking-wider">Efectivo Turno</span>
          </div>
          <p className="text-2xl font-black text-white">${Number(status.totalCash).toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-2">Ventas pagadas al instante</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-orange-500/10 p-2 rounded-xl">
              <ArrowRightLeft className="w-5 h-5 text-orange-400" />
            </div>
            <span className="text-slate-400 font-bold text-sm uppercase tracking-wider">A Crédito</span>
          </div>
          <p className="text-2xl font-black text-white">${Number(status.totalCredit).toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-2">Cuentas por cobrar generadas</p>
        </div>

        <div className="bg-blue-600 p-6 rounded-3xl shadow-xl border border-blue-500/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-white/20 p-2 rounded-xl">
              <Search className="w-5 h-5 text-white" />
            </div>
            <span className="text-blue-100 font-bold text-sm uppercase tracking-wider">Total Ventas</span>
          </div>
          <p className="text-2xl font-black text-white">${(Number(status.totalCash) + Number(status.totalCredit)).toLocaleString()}</p>
          <p className="text-xs text-blue-100 mt-2">{status.salesCount} transacciones realizadas</p>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="px-8 py-6 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            Ventas del Turno Actual
          </h2>
          <span className="text-xs font-bold text-slate-500 bg-slate-800 px-3 py-1 rounded-full uppercase tracking-tighter">
            En Tiempo Real
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-800/50">
                <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Ticket / Hora</th>
                <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Monto</th>
                <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Método</th>
                <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Cliente / Deuda</th>
                <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {sales.map((sale) => (
                <tr key={sale.id} className="hover:bg-slate-800/30 transition-colors group">
                  <td className="px-8 py-4">
                    <p className="text-sm font-bold text-white uppercase tracking-tighter">#{sale.id.split('-')[0]}</p>
                    <p className="text-[10px] text-slate-500">{new Date(sale.createdAt).toLocaleTimeString()}</p>
                  </td>
                  <td className="px-8 py-4">
                    <span className="text-sm font-black text-white">${Number(sale.totalAmount).toLocaleString()}</span>
                  </td>
                  <td className="px-8 py-4">
                    <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full ${
                      sale.paymentMethod === 'credito' 
                      ? 'bg-orange-900/40 text-orange-400' 
                      : 'bg-green-900/40 text-green-400'
                    }`}>
                      {sale.paymentMethod}
                    </span>
                  </td>
                  <td className="px-8 py-4">
                    {sale.paymentMethod === 'credito' ? (
                      <span className="text-sm font-bold text-white underline decoration-orange-500/50 underline-offset-4">
                        {sale.customerName || 'Cliente Genérico'}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-600 italic">Pago al contado</span>
                    )}
                  </td>
                  <td className="px-8 py-4 text-right">
                    {sale.paymentMethod === 'credito' && (
                      <button
                        onClick={() => handlePayCredit(sale.id)}
                        className="p-2 hover:bg-green-500/20 text-slate-500 hover:text-green-400 rounded-xl transition-all"
                        title="Marcar como Pagado"
                      >
                        <Banknote className="w-5 h-5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {sales.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-12 text-center text-slate-500 italic">
                    No hay ventas registradas en este turno aún.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
