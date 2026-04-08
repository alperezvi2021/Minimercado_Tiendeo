'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ClipboardCheck, 
  CircleDollarSign, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  User as UserIcon,
  Search,
  ArrowRightLeft,
  Banknote,
  FileText,
  PlusCircle,
  Wallet
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency, parseCurrency } from '@/utils/formatters';

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
    openingAmount: number;
  };
  openingAmount: number;
  totalCash: number;
  totalCredit: number;
  totalPayments?: number;
  totalToDeliver: number;
  salesCount: number;
}

export default function ClosurePage() {
  const router = useRouter();
  const [status, setStatus] = useState<ClosureStatus | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [payments, setPayments] = useState<any[]>([]);
  const [openingAmount, setOpeningAmount] = useState<string>('');
  const [opening, setOpening] = useState(false);

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

  const fetchPayments = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/sales/closure/payments`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
      });
      const data = await response.json();
      setPayments(data);
    } catch (error) {
      console.error('Error fetching closure payments:', error);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchSales();
    fetchPayments();
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
        alert('Pago registrado con éxito. Te redirigiremos al módulo de créditos para verificar.');
        router.push('/dashboard/credits');
      }
    } catch (error) {
      console.error('Error paying credit:', error);
    }
  };

  const handleOpenBox = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseCurrency(openingAmount);
    if (!openingAmount || amountNum < 0) return;

    setOpening(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/sales/closure/open`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({ openingAmount: amountNum })
      });

      if (response.ok) {
        window.location.reload();
      } else {
        alert('Error al abrir la caja');
      }
    } catch (error) {
      console.error('Error opening box:', error);
    } finally {
      setOpening(false);
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
          // Generar PDF antes de recargar si es posible, o avisar
          alert('Cierre de caja realizado con éxito. El turno ha sido guardado.');
          window.location.reload();
      }
    } catch (error) {
      console.error('Error performing closure:', error);
    } finally {
      setClosing(false);
    }
  };

  const exportToPDF = () => {
    if (!status) return;
    const doc = new jsPDF();
    
    // Header
    doc.setFillColor(30, 41, 59); // Slate 800
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text('COMPROBANTE DE ARQUEO', 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Tiendeo POS - ${status.closure.userName}`, 105, 30, { align: 'center' });

    // Summary Info
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text('RESUMEN DE TURNO', 14, 50);
    
    const summaryData = [
      ['Cajero:', status.closure.userName],
      ['Apertura:', new Date().toLocaleString('es-CO')],
      ['Cierre (Generado):', new Date().toLocaleString('es-CO')],
      ['Base de Caja:', `$${formatCurrency(status.openingAmount)}`],
      ['Ventas Efectivo:', `$${formatCurrency(status.totalCash)}`],
      ['Abonos Crédito:', `$${formatCurrency(status.totalPayments)}`],
      ['TOTAL EFECTIVO A ENTREGAR:', `$${formatCurrency(status.totalToDeliver)}`]
    ];

    autoTable(doc, {
      startY: 55,
      body: summaryData,
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 2 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 } }
    });

    // Sales Detail
    doc.setFontSize(12);
    doc.text('DETALLE DE VENTAS', 14, (doc as any).lastAutoTable.finalY + 15);

    const salesData = sales.map(s => [
      `#${s.id.split('-')[0]}`,
      new Date(s.createdAt).toLocaleTimeString(),
      s.paymentMethod.toUpperCase(),
      s.customerName || 'Contado',
      `$${formatCurrency(s.totalAmount)}`
    ]);

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['Ticket', 'Hora', 'Método', 'Cliente', 'Monto']],
      body: salesData,
      headStyles: { fillColor: [59, 130, 246] } // Blue 500
    });

    if (payments && payments.length > 0) {
      doc.setFontSize(12);
      doc.text('DETALLE DE ABONOS A CRÉDITOS', 14, (doc as any).lastAutoTable.finalY + 15);

      const paymentsData = payments.map(p => [
        `#${p.id.split('-')[0]}`,
        new Date(p.paymentDate).toLocaleTimeString(),
        (p.paymentMethod || 'efectivo').toUpperCase(),
        p.creditSale?.customerName || 'Cliente No Ident.',
        `$${formatCurrency(p.amount)}`
      ]);

      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 20,
        head: [['Op. ID', 'Hora', 'Método', 'Cliente', 'Abono']],
        body: paymentsData,
        headStyles: { fillColor: [249, 115, 22] } // Orange 500
      });
    }

    doc.save(`Arqueo_${status.closure.userName}_${new Date().toLocaleDateString()}.pdf`);
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
      <div className="p-8 max-w-2xl mx-auto animate-in zoom-in-95 duration-500">
        <div className="bg-slate-900 border border-slate-800 rounded-[3rem] p-12 shadow-2xl text-center space-y-8">
          <div className="bg-blue-600/10 w-24 h-24 rounded-full flex items-center justify-center mx-auto">
            <PlusCircle className="w-12 h-12 text-blue-500" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-white mb-2 italic uppercase tracking-tighter">Apertura de Caja</h2>
            <p className="text-slate-400 font-medium">Inicie su turno definiendo el monto base de la caja</p>
          </div>

          <form onSubmit={handleOpenBox} className="space-y-6">
            <div className="relative">
              <CircleDollarSign className="absolute left-6 top-5 w-6 h-6 text-blue-500" />
              <input
                required
                type="text"
                placeholder="0"
                className="w-full bg-slate-950 border-2 border-slate-800 rounded-3xl pl-16 pr-6 py-5 text-3xl font-black text-white focus:border-blue-500 outline-none transition-all placeholder:text-slate-800"
                value={formatCurrency(openingAmount)}
                onChange={(e) => setOpeningAmount(parseCurrency(e.target.value).toString())}
                autoFocus
              />
            </div>
            
            <button
              disabled={opening}
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white py-5 rounded-3xl font-black text-xl shadow-xl shadow-blue-900/30 active:scale-95 transition-all disabled:opacity-50"
            >
              {opening ? 'Abriendo Turno...' : 'Iniciar Turno de Trabajo'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-white flex items-center gap-3 tracking-tight italic uppercase">
            <ClipboardCheck className="w-10 h-10 text-blue-500" />
            Cierre de Caja
          </h1>
          <p className="text-slate-400 mt-2 font-bold uppercase tracking-widest text-[10px]">Gestión de Arqueo y Conciliación Actual</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={exportToPDF}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95"
          >
            <FileText className="w-4 h-4" />
            Informe Arqueo
          </button>
          <button
            onClick={handleCloseBox}
            disabled={closing}
            className="bg-red-600 hover:bg-red-500 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-red-900/20 transition-all active:scale-95 disabled:opacity-50"
          >
            {closing ? 'Procesando...' : 'Finalizar Turno'}
            <CheckCircle2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-blue-500/10 p-2 rounded-xl">
              <UserIcon className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-slate-500 font-black text-[10px] uppercase tracking-widest">Responsable</span>
          </div>
          <p className="text-2xl font-black text-white uppercase tracking-tighter italic">{status.closure?.userName || 'Cajero'}</p>
          <div className="flex items-center gap-2 mt-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <Clock className="w-3 h-3 text-blue-500" />
            {status.closure?.openedAt ? new Date(status.closure.openedAt).toLocaleTimeString() : '---'}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-orange-500/10 p-2 rounded-xl">
              <Wallet className="w-5 h-5 text-orange-400" />
            </div>
            <span className="text-slate-500 font-black text-[10px] uppercase tracking-widest">Base Inicial</span>
          </div>
          <p className="text-3xl font-black text-white tracking-tighter">${formatCurrency(status.openingAmount)}</p>
          <p className="text-[10px] font-bold text-slate-600 mt-4 uppercase tracking-widest">Efectivo declarado al abrir</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-green-500/10 p-2 rounded-xl">
              <CircleDollarSign className="w-5 h-5 text-green-400" />
            </div>
            <span className="text-slate-500 font-black text-[10px] uppercase tracking-widest">Ventas Efectivo</span>
          </div>
          <p className="text-3xl font-black text-white tracking-tighter">${formatCurrency(status.totalCash)}</p>
          <p className="text-[10px] font-bold text-slate-600 mt-4 uppercase tracking-widest">Pagos de Contado</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-orange-500/10 p-2 rounded-xl">
              <ArrowRightLeft className="w-5 h-5 text-orange-400" />
            </div>
            <span className="text-slate-500 font-black text-[10px] uppercase tracking-widest">Abonos Créditos</span>
          </div>
          <p className="text-3xl font-black text-white tracking-tighter">${formatCurrency(status.totalPayments || 0)}</p>
          <p className="text-[10px] font-bold text-slate-600 mt-4 uppercase tracking-widest">Cartera Recaudada</p>
        </div>

        <div className="bg-blue-600 p-8 rounded-[2.5rem] shadow-2xl border border-blue-500/50 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 transition-all group-hover:scale-110"></div>
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-white/20 p-2 rounded-xl">
              <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-blue-100 font-black text-[10px] uppercase tracking-widest">Total a Entregar</span>
          </div>
          <p className="text-4xl font-black text-white tracking-tighter">${formatCurrency(status.totalToDeliver)}</p>
          <p className="text-[11px] font-bold text-blue-100 mt-4 uppercase tracking-widest">DINERO REAL QUE DEBE HABER EN CAJA</p>
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
                    <span className="text-sm font-black text-white">${formatCurrency(sale.totalAmount)}</span>
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
