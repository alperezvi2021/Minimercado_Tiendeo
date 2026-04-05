'use client';
import { useState, useEffect, useCallback } from 'react';
import { 
  X, 
  History, 
  FileText, 
  DollarSign, 
  Calendar, 
  Loader2, 
  Download, 
  ArrowUpRight,
  TrendingDown,
  Clock
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Payment {
  id: string;
  amount: number;
  paymentDate: string;
  notes?: string;
}

interface CreditSale {
  id: string;
  amount: number;
  remainingAmount: number;
  status: string;
  createdAt: string;
  sale?: {
    invoiceNumber?: string;
  };
  payments?: Payment[];
}

interface CustomerHistory {
  id: string;
  name: string;
  idNumber?: string;
  phone?: string;
  email?: string;
  address?: string;
  creditSales?: CreditSale[];
}

interface CustomerHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  customerName: string;
}

export default function CustomerHistoryModal({ isOpen, onClose, customerId, customerName }: CustomerHistoryModalProps) {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<CustomerHistory | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!customerId) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/customers/${customerId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    if (isOpen && customerId) {
      fetchHistory();
    }
  }, [isOpen, customerId, fetchHistory]);

  const generatePDF = () => {
    if (!history) return;

    const doc = new jsPDF();
    
    // Header
    doc.setFillColor(30, 41, 59); // Dark slate
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text('ESTADO DE CUENTA DE CLIENTE', 14, 25);
    
    doc.setFontSize(10);
    doc.text(`TIENDEO POS - Software de Gestión`, 150, 25);
    doc.text(`Fecha: ${new Date().toLocaleString('es-CO')}`, 150, 32);

    // Customer Info
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(14);
    doc.text('INFORMACIÓN DEL CLIENTE', 14, 50);
    doc.setFontSize(10);
    doc.text(`Nombre: ${history.name}`, 14, 58);
    doc.text(`ID/NIT: ${history.idNumber || 'N/A'}`, 14, 64);
    doc.text(`Teléfono: ${history.phone || 'N/A'}`, 14, 70);
    doc.text(`Email: ${history.email || 'N/A'}`, 14, 76);

    // Summary Box
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(140, 45, 55, 35, 3, 3, 'FD');
    
    doc.setTextColor(100, 116, 139);
    doc.text('SALDO TOTAL PENDIENTE', 145, 55);
    doc.setTextColor(225, 29, 72); // Rose 600
    doc.setFontSize(16);
    const totalDebt = history.creditSales?.reduce((sum: number, cs: CreditSale) => sum + Number(cs.remainingAmount), 0) || 0;
    doc.text(`$${Math.round(totalDebt).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`, 145, 65);

    // Invoices Table
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(12);
    doc.text('DETALLE DE FACTURAS A CRÉDITO', 14, 90);

    const invoiceData = history.creditSales?.map((cs: CreditSale) => [
      cs.sale?.invoiceNumber || 'S/N',
      new Date(cs.createdAt).toLocaleDateString(),
      `$${Math.round(cs.amount).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`,
      `$${Math.round(cs.remainingAmount).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`,
      cs.status === 'PAID' ? 'PAGADO' : cs.status === 'PARTIAL' ? 'ABONADO' : 'PENDIENTE'
    ]) || [];

    autoTable(doc, {
      startY: 95,
      head: [['Factura #', 'Fecha', 'Monto Original', 'Saldo Pendiente', 'Estado']],
      body: invoiceData,
      headStyles: { fillColor: [59, 130, 246] }, // Blue 500
      styles: { fontSize: 9 }
    });

    // Payments detail
    let currentY = (doc as any).lastAutoTable.finalY + 15;
    if (currentY > 250) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFontSize(12);
    doc.text('HISTORIAL DE ABONOS RECIBIDOS', 14, currentY);
    
    const paymentData: any[] = [];
    history.creditSales?.forEach((cs: CreditSale) => {
      cs.payments?.forEach((p: Payment) => {
        paymentData.push([
          new Date(p.paymentDate).toLocaleDateString(),
          cs.sale?.invoiceNumber || 'S/N',
          `$${Math.round(p.amount).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`,
          p.notes || '-'
        ]);
      });
    });

    autoTable(doc, {
      startY: currentY + 5,
      head: [['Fecha Abono', 'Factura Ref.', 'Monto Abonado', 'Notas']],
      body: paymentData,
      headStyles: { fillColor: [16, 185, 129] }, // Emerald 500
      styles: { fontSize: 9 }
    });

    doc.save(`Estado_Cuenta_${history.name.replace(/\s+/g, '_')}.pdf`);
  };

  if (!isOpen) return null;

  const creditSales = history?.creditSales || [];
  const totalDebt = creditSales.reduce((sum: number, cs: CreditSale) => sum + Number(cs.remainingAmount), 0);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-[3rem] shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden flex flex-col h-full max-h-[90vh] animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="px-10 py-8 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gray-50/50 dark:bg-slate-950/50">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-3 rounded-2xl shadow-xl shadow-blue-600/20">
              <History className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white leading-none">Historial del Cliente</h3>
              <p className="text-gray-500 dark:text-slate-400 mt-1 font-bold">{customerName}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={generatePDF}
              disabled={loading || !history}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-50"
            >
              <Download className="w-5 h-5" />
              Estado de Cuenta PDF
            </button>
            <button 
              onClick={onClose} 
              className="p-3 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-2xl transition-all"
              title="Cerrar"
              aria-label="Cerrar modal"
            >
              <X className="w-6 h-6 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-50">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
              <p className="font-black uppercase tracking-widest text-gray-500">Cargando información detallada...</p>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-rose-50 dark:bg-rose-900/20 p-6 rounded-[2.5rem] border border-rose-100 dark:border-rose-900/30">
                  <p className="text-[10px] font-black text-rose-400 dark:text-rose-500 uppercase tracking-widest mb-1">Deuda Total Pendiente</p>
                  <p className="text-3xl font-black text-rose-600 dark:text-rose-400">${Math.round(totalDebt).toLocaleString('es-CO', { maximumFractionDigits: 0 })}</p>
                  <TrendingDown className="w-8 h-8 text-rose-200 dark:text-rose-900/50 absolute right-8 bottom-8" />
                </div>
                
                <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-[2.5rem] border border-blue-100 dark:border-blue-900/30">
                  <p className="text-[10px] font-black text-blue-400 dark:text-blue-500 uppercase tracking-widest mb-1">Facturas Pendientes</p>
                  <p className="text-3xl font-black text-blue-600 dark:text-blue-400">
                    {creditSales.filter((cs: CreditSale) => cs.status !== 'PAID').length}
                  </p>
                  <FileText className="w-8 h-8 text-blue-200 dark:text-blue-900/50 absolute right-8 bottom-8" />
                </div>

                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-[2.5rem] border border-emerald-100 dark:border-emerald-900/30">
                  <p className="text-[10px] font-black text-emerald-400 dark:text-emerald-500 uppercase tracking-widest mb-1">Total Abonos Realizados</p>
                  <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                    {creditSales.reduce((acc: number, cs: CreditSale) => acc + (cs.payments?.length || 0), 0)}
                  </p>
                  <ArrowUpRight className="w-8 h-8 text-emerald-200 dark:text-emerald-900/50 absolute right-8 bottom-8" />
                </div>
              </div>

              {/* Detailed List */}
              <div className="space-y-6">
                <h4 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                  <FileText className="w-6 h-6 text-blue-500" />
                  Detalle de Facturas y Abonos
                </h4>
                
                <div className="space-y-4">
                  {creditSales.length === 0 ? (
                    <div className="py-20 text-center border-2 border-dashed border-gray-100 dark:border-slate-800 rounded-[3rem]">
                      <p className="text-gray-400 font-bold italic">Este cliente no tiene historial de créditos.</p>
                    </div>
                  ) : (
                    creditSales.map((cs: CreditSale) => (
                      <div key={cs.id} className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-[2.5rem] overflow-hidden hover:shadow-xl transition-all">
                        <div className="p-6 bg-gray-50/50 dark:bg-slate-950/50 border-b border-gray-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-xl text-blue-600 dark:text-blue-400">
                              <FileText className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-sm font-black text-gray-400 dark:text-slate-500 uppercase tracking-tighter">Factura No.</p>
                              <p className="text-xl font-black text-gray-900 dark:text-white">{cs.sale?.invoiceNumber || 'S/N'}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-8">
                            <div className="text-center">
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Monto Original</p>
                              <p className="text-lg font-black text-gray-600 dark:text-slate-300">${Math.round(cs.amount).toLocaleString('es-CO', { maximumFractionDigits: 0 })}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Saldo Pendiente</p>
                              <p className="text-2xl font-black text-rose-600 dark:text-rose-500">${Math.round(cs.remainingAmount).toLocaleString('es-CO', { maximumFractionDigits: 0 })}</p>
                            </div>
                            <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase border ${
                              cs.status === 'PAID' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                              cs.status === 'PARTIAL' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                              'bg-orange-500/10 text-orange-500 border-orange-500/20'
                            }`}>
                              {cs.status === 'PAID' ? 'Totalmente Pagada' : cs.status === 'PARTIAL' ? 'Abonos Pendientes' : 'Pendiente Total'}
                            </div>
                          </div>
                        </div>
                        
                        {/* Sub-table of payments */}
                        {cs.payments && cs.payments.length > 0 && (
                          <div className="p-6 bg-white dark:bg-slate-900">
                            <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ml-2 flex items-center gap-2">
                              <Clock className="w-3.5 h-3.5" />
                              Historial de Abonos para esta Factura
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {cs.payments.map((p: Payment) => (
                                <div key={p.id} className="p-4 bg-gray-50 dark:bg-slate-800/50 rounded-2xl border border-gray-100 dark:border-slate-800 flex items-center justify-between">
                                  <div>
                                    <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">+ ${Math.round(p.amount).toLocaleString('es-CO', { maximumFractionDigits: 0 })}</p>
                                    <div className="flex items-center gap-1.5 mt-0.5 opacity-60">
                                      <Calendar className="w-3 h-3" />
                                      <span className="text-[10px] font-bold">{new Date(p.paymentDate).toLocaleDateString()}</span>
                                    </div>
                                  </div>
                                  {p.notes && (
                                    <div title={p.notes} className="bg-gray-200 dark:bg-slate-700 p-1.5 rounded-lg cursor-help">
                                      <FileText className="w-4 h-4 text-gray-500 dark:text-slate-400" />
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50 dark:bg-slate-950/50 border-t border-gray-100 dark:border-slate-800 flex justify-center">
           <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
             <TrendingDown className="w-4 h-4" />
             Información sincronizada con el módulo de contabilidad y créditos
           </p>
        </div>
      </div>
    </div>
  );
}
