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
  AlertCircle,
  FileText,
  Download,
  History,
  ArrowDownCircle
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { utils, writeFile } from 'xlsx';
import AbonoModal from '@/components/customers/AbonoModal';
import { useOfflineStore } from '@/store/useOfflineStore';

interface CreditSale {
  id: string;
  customerName: string;
  amount: number;
  remainingAmount: number;
  status: string;
  createdAt: string;
  sale?: {
    id: string;
    totalAmount: number;
    invoiceNumber?: string;
  }
}

export default function CreditsPage() {
  const { isOnline, rawCredits: cachedCredits, setCache } = useOfflineStore();
  const [credits, setCredits] = useState<CreditSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' } | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedCredit, setSelectedCredit] = useState<CreditSale | null>(null);
  const [isAbonoModalOpen, setIsAbonoModalOpen] = useState(false);

  const requestSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  useEffect(() => {
    if (isOnline) {
      fetchCredits();
    } else {
      setCredits(cachedCredits || []);
      setLoading(false);
    }
  }, [isOnline, cachedCredits]);

  const fetchCredits = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/sales/credits/pending`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCredits(data);
        setCache({ rawCredits: data });
      }
    } catch (e) {
      console.error(e);
      setCredits(cachedCredits || []);
    } finally {
      setLoading(false);
    }
  };

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

  const handleSync = async () => {
    if (!confirm('¿Deseas sincronizar las ventas antiguas con el módulo de créditos? Esto buscará ventas de crédito que no aparezcan aquí.')) return;
    setIsSyncing(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/sales/sync-credits`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const result = await res.json();
        alert(`Sincronización completada.\nNuevos créditos: ${result.created}\nNombres actualizados: ${result.updated}`);
        fetchCredits();
      } else {
        alert('Error al sincronizar');
      }
    } catch (e) {
      console.error(e);
      alert('Error de conexión');
    } finally {
      setIsSyncing(false);
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('TIENDEO POS - CUENTAS POR COBRAR', 14, 20);
    doc.setFontSize(10);
    doc.text(`Generado: ${new Date().toLocaleString('es-CO')}`, 14, 28);
    
    const tableData = filteredCredits.map(c => [
      c.sale?.invoiceNumber || 'N/A',
      c.customerName,
      new Date(c.createdAt).toLocaleDateString(),
      `$${Math.round(c.amount).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`,
      'PENDIENTE'
    ]);
    
    autoTable(doc, {
      startY: 35,
      head: [['Factura #', 'Cliente', 'Fecha Deuda', 'Monto', 'Estado']],
      body: tableData,
      headStyles: { fillColor: [249, 115, 22] } // Orange
    });
    
    doc.save('Cuentas_Por_Cobrar.pdf');
  };

  const exportToExcel = () => {
    const data = filteredCredits.map(c => ({
      'Factura #': c.sale?.invoiceNumber || 'N/A',
      Cliente: c.customerName,
      Fecha: new Date(c.createdAt).toLocaleDateString(),
      Monto: Number(c.amount),
      Estado: 'PENDIENTE'
    }));
    
    const ws = utils.json_to_sheet(data);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Créditos');
    writeFile(wb, 'Cuentas_Por_Cobrar.xlsx');
  };

  const sortedCredits = [...credits].sort((a, b) => {
    if (!sortConfig) return 0;
    
    let aValue: any = a[sortConfig.key as keyof CreditSale];
    let bValue: any = b[sortConfig.key as keyof CreditSale];

    if (sortConfig.key === 'invoice') {
      aValue = a.sale?.invoiceNumber || '';
      bValue = b.sale?.invoiceNumber || '';
    } else if (sortConfig.key === 'remaining') {
       aValue = Number(a.remainingAmount || a.amount);
       bValue = Number(b.remainingAmount || b.amount);
    } else if (sortConfig.key === 'amount') {
       aValue = Number(a.amount);
       bValue = Number(b.amount);
    }
    
    if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
    return 0;
  });

  const filteredCredits = sortedCredits.filter(c => 
    c.customerName.toLowerCase().includes(filter.toLowerCase())
  );

  const totalOwed = filteredCredits.reduce((sum, c) => {
    const val = Number(c.remainingAmount);
    return sum + (val > 0 ? val : Number(c.amount));
  }, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-white flex items-center gap-3 tracking-tight">
            <ArrowRightLeft className="w-10 h-10 text-orange-500" />
            Cuentas por Cobrar
          </h1>
          <p className="text-slate-400 mt-2 font-medium">Gestiona las deudas de tus clientes y registra sus pagos</p>
        </div>
        
        <div className="bg-slate-900 border border-slate-800 px-4 sm:px-6 py-4 rounded-3xl shadow-xl flex flex-wrap items-center justify-center gap-2 sm:gap-4 shrink-0">
          <div>
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Total por Cobrar</p>
            <p className="text-3xl font-black text-orange-500">${Math.round(totalOwed).toLocaleString('es-CO', { maximumFractionDigits: 0 })}</p>
          </div>
          <div className="h-10 w-px bg-slate-800 mx-2" />
          <div className="text-center">
             <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Clientes</p>
             <p className="text-2xl font-black text-white">{filteredCredits.length}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button 
            onClick={exportToPDF}
            className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-4 py-2.5 rounded-xl font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-200 transition-all active:scale-95"
          >
            <FileText className="w-4 h-4 text-rose-500" />
            PDF
          </button>
          <button 
            onClick={exportToExcel}
            className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-4 py-2.5 rounded-xl font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-200 transition-all active:scale-95"
          >
            <Download className="w-4 h-4 text-emerald-500" />
            Excel
          </button>
          <button 
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-4 py-2.5 rounded-xl font-bold shadow-lg shadow-orange-900/20 transition-all active:scale-95 disabled:opacity-50"
            title="Sincronizar créditos de ventas antiguas"
          >
            <ArrowRightLeft className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Sincronizando...' : 'Sincronizar Datos'}
          </button>
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

        <div className="overflow-x-auto pb-4">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-800/50">
                <th 
                  onClick={() => requestSort('invoice')}
                  className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest min-w-[120px] cursor-pointer hover:text-blue-500 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    Factura #
                    {sortConfig?.key === 'invoice' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
                  </div>
                </th>
                <th 
                  onClick={() => requestSort('customerName')}
                  className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest min-w-[180px] cursor-pointer hover:text-blue-500 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    Cliente
                    {sortConfig?.key === 'customerName' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
                  </div>
                </th>
                <th 
                  onClick={() => requestSort('createdAt')}
                  className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center min-w-[140px] cursor-pointer hover:text-blue-500 transition-colors"
                >
                  <div className="flex items-center gap-2 justify-center">
                    Fecha Deuda
                    {sortConfig?.key === 'createdAt' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
                  </div>
                </th>
                <th 
                  onClick={() => requestSort('amount')}
                  className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest min-w-[140px] cursor-pointer hover:text-blue-500 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    Monto Original
                    {sortConfig?.key === 'amount' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
                  </div>
                </th>
                <th 
                  onClick={() => requestSort('remaining')}
                  className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest min-w-[160px] cursor-pointer hover:text-blue-500 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    Saldo Pendiente
                    {sortConfig?.key === 'remaining' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
                  </div>
                </th>
                <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest min-w-[120px]">Estado</th>
                <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right min-w-[180px]">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredCredits.map((credit) => (
                <tr key={credit.id} className="hover:bg-slate-800/30 transition-colors group">
                  <td className="px-8 py-4">
                    <span className="text-xs font-black text-blue-500 bg-blue-500/10 px-2 py-1 rounded-lg">
                      {credit.sale?.invoiceNumber || 'S/N'}
                    </span>
                  </td>
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
                    <span className="text-sm font-bold text-slate-400">${Math.round(credit.amount).toLocaleString('es-CO', { maximumFractionDigits: 0 })}</span>
                  </td>
                  <td className="px-8 py-4">
                    <span className="text-xl font-black text-rose-500 shadow-rose-900/10">${Math.round(Number(credit.remainingAmount) || Number(credit.amount)).toLocaleString('es-CO', { maximumFractionDigits: 0 })}</span>
                  </td>
                  <td className="px-8 py-4">
                    <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${
                      credit.status === 'PARTIAL' 
                      ? 'bg-blue-900/40 text-blue-400 border-blue-500/20' 
                      : 'bg-orange-900/40 text-orange-400 border-orange-500/20'
                    }`}>
                      {credit.status === 'PARTIAL' ? 'Abonado' : 'Pendiente'}
                    </span>
                  </td>
                  <td className="px-8 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => { setSelectedCredit(credit); setIsAbonoModalOpen(true); }}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-900/20 transition-all active:scale-95"
                      >
                        <ArrowDownCircle className="w-4 h-4" />
                        Abonar
                      </button>
                      <button
                        onClick={() => handlePay(credit.id)}
                        disabled={processingId === credit.id}
                        className="bg-green-600 hover:bg-green-500 text-white p-2 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-green-900/20 transition-all active:scale-95 disabled:opacity-50"
                        title="Marcar como pagado totalmente"
                      >
                        {processingId === credit.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Banknote className="w-5 h-5" />
                        )}
                      </button>
                    </div>
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
      <AbonoModal 
        isOpen={isAbonoModalOpen}
        onClose={() => setIsAbonoModalOpen(false)}
        onSave={fetchCredits}
        credit={selectedCredit}
      />
    </div>
  );
}
