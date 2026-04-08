'use client';
import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Receipt, Calculator, ArrowUpRight, ArrowDownRight, Briefcase, FileText, Download, ChartBar } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { utils, writeFile } from 'xlsx';
import { formatCurrency as curr } from '@/utils/formatters';


interface Summary {
  totalRevenue: number;
  totalCashRevenue: number;
  accountsReceivable: number;
  totalExpenses: number;
  grossProfit: number;
  taxBalance: number;
  salesCount: number;
  purchasesCount: number;
}

export default function AccountingPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/accounting/summary`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = () => {
    if (!summary) return;
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(40);
    doc.text('TIENDEO POS - REPORTE CONTABLE', 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Fecha de generación: ${new Date().toLocaleString('es-CO')}`, 14, 30);
    
    // Summary Data
    autoTable(doc, {
      startY: 40,
      head: [['Indicador', 'Valor']],
      body: [
        ['Total Facturado (Revenue)', `$${curr(summary.totalRevenue)}`],
        ['Ingresos en Efectivo/Tarjeta', `$${curr(summary.totalCashRevenue)}`],
        ['Cuentas por Cobrar (Créditos)', `$${curr(summary.accountsReceivable)}`],
        ['Egresos Totales (Compras)', `$${curr(summary.totalExpenses)}`],
        ['Utilidad Bruta', `$${curr(summary.grossProfit)}`],
        ['IVA por Pagar (Ventas 19%)', `$${curr(summary.totalRevenue * 0.19)}`],
        ['IVA a Favor (Compras)', `$${curr(summary.taxBalance + (summary.totalRevenue * 0.19))}`],
        ['Saldo IVA Neto', `${curr(Math.abs(summary.taxBalance))} (${summary.taxBalance >= 0 ? 'Por Pagar' : 'A Favor'})`],
      ],
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235] }
    });
    
    doc.save(`Reporte_Contable_${new Date().getTime()}.pdf`);
  };

  const exportToExcel = () => {
    if (!summary) return;
    const data = [
      { Concepto: 'Total Facturado (Revenue)', Valor: summary.totalRevenue },
      { Concepto: 'Ingresos Efectivo/Tarjeta', Valor: summary.totalCashRevenue },
      { Concepto: 'Cuentas por Cobrar (Crédito)', Valor: summary.accountsReceivable },
      { Concepto: 'Egresos Totales (Compras)', Valor: summary.totalExpenses },
      { Concepto: 'Utilidad Bruta', Valor: summary.grossProfit },
      { Concepto: 'IVA por Pagar (Ventas 19%)', Valor: Math.round(summary.totalRevenue * 0.19) },
      { Concepto: 'IVA a Favor (Compras)', Valor: Math.round(summary.taxBalance + (summary.totalRevenue * 0.19)) },
      { Concepto: 'Saldo IVA Neto', Valor: summary.taxBalance },
    ];
    
    const ws = utils.json_to_sheet(data);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Resumen Contable');
    writeFile(wb, `Contabilidad_Tiendeo_${new Date().getTime()}.xlsx`);
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Cargando contabilidad...</div>;
  if (!summary) return <div className="p-8 text-center text-red-500">Error al cargar el resumen financiero.</div>;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Contabilidad y Finanzas
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Resumen ejecutivo digital. Exporta tus datos para tu contador.
          </p>
        </div>
        
        <div className="flex gap-3 flex-wrap">
          <button 
            onClick={exportToPDF}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
          >
            <FileText className="w-5 h-5" />
            Descargar PDF
          </button>
          <button 
            onClick={exportToExcel}
            className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-3 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
          >
            <Download className="w-5 h-5" />
            Exportar Excel
          </button>
        </div>
      </div>

      {/* Tarjetas de Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:scale-[1.02]">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl text-blue-600">
              <TrendingUp className="w-6 h-6" />
            </div>
            <span className="flex items-center text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-lg">
              Total
            </span>
          </div>
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Facturado</p>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            ${curr(summary.totalRevenue)}
          </h3>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:scale-[1.02]">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-2xl text-green-600">
              <DollarSign className="w-6 h-6" />
            </div>
            <span className="flex items-center text-xs font-bold text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-lg">
              Caja
            </span>
          </div>
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Ingresos Efectivo</p>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            ${curr(summary.totalCashRevenue)}
          </h3>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:scale-[1.02]">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-2xl text-orange-600">
              <ArrowUpRight className="w-6 h-6" />
            </div>
            <span className="flex items-center text-xs font-bold text-orange-600 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded-lg">
              Crédito
            </span>
          </div>
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Cuentas por Cobrar</p>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            ${curr(summary.accountsReceivable)}
          </h3>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:scale-[1.02]">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-rose-50 dark:bg-rose-900/20 rounded-2xl text-rose-600">
              <TrendingDown className="w-6 h-6" />
            </div>
            <span className="flex items-center text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-900/20 px-2 py-1 rounded-lg">
              <ArrowDownRight className="w-3 h-3 mr-1" /> Gastos
            </span>
          </div>
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Egresos Totales (Compras)</p>
          <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-1">
            ${curr(summary.totalExpenses)}
          </h3>
          <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase">{summary.purchasesCount} facturas de proveedores</p>
        </div>

        <div className="bg-emerald-600 p-6 rounded-3xl shadow-xl shadow-emerald-500/20 transition-all hover:scale-[1.02]">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-white/20 rounded-2xl text-white">
              <DollarSign className="w-6 h-6" />
            </div>
            <Briefcase className="w-5 h-5 text-white/40" />
          </div>
          <p className="text-sm font-bold text-emerald-100 uppercase tracking-wider">Utilidad Bruta</p>
          <h3 className="text-3xl font-black text-white mt-1">
            ${curr(summary.grossProfit)}
          </h3>
          <p className="text-[10px] text-white/60 mt-2 font-bold uppercase">Rentabilidad calculada</p>
        </div>
      </div>

      {/* Detalle Contable Adicional */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800">
          <h4 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white mb-6">
            <Calculator className="text-blue-600 w-5 h-5" /> Balance Tributario Estimado
          </h4>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
              <span className="text-sm font-bold text-slate-600 dark:text-slate-400">IVA por Pagar (Ventas 19%)</span>
              <span className="text-sm font-black text-rose-600">${curr(summary.totalRevenue * 0.19)}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
              <span className="text-sm font-bold text-slate-600 dark:text-slate-400">IVA a Favor (Compras)</span>
              <span className="text-sm font-black text-emerald-600">${curr(summary.taxBalance + (summary.totalRevenue * 0.19))}</span>
            </div>
            <div className="pt-4 flex justify-between items-center">
              <span className="text-md font-extrabold text-slate-900 dark:text-white uppercase tracking-widest">Saldo IVA Neto</span>
              <span className={`text-xl font-black ${summary.taxBalance >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                ${curr(Math.abs(summary.taxBalance))}
                <span className="text-[10px] ml-1 uppercase">{summary.taxBalance >= 0 ? 'por pagar' : 'a favor'}</span>
              </span>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-6 leading-relaxed">
            * Este balance es informativo basado en las facturas y ventas registradas. Consulta con tu contador para una declaración oficial de impuestos.
          </p>
        </div>

        <div className="bg-slate-900 dark:bg-slate-950 p-8 rounded-3xl relative overflow-hidden group">
          <div className="relative z-10">
            <h4 className="flex items-center gap-2 text-lg font-bold text-white mb-2">
              <TrendingUp className="text-emerald-400 w-5 h-5" /> Análisis de Margen
            </h4>
            <p className="text-slate-400 text-sm mb-8">Rendimiento porcentual sobre tus costos de compra.</p>
            
            <div className="flex items-end gap-2 mb-2">
              <span className="text-5xl font-black text-white">
                {summary.totalExpenses > 0 
                  ? Math.round((summary.grossProfit / summary.totalExpenses) * 100) 
                  : 0}%
              </span>
              <span className="text-emerald-400 font-bold mb-2">Margen Global</span>
            </div>
            
            <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden mt-4">
              <div 
                className="bg-gradient-to-r from-emerald-600 to-emerald-400 h-full transition-all duration-1000"
                style={{ width: `${Math.min(100, Math.max(0, summary.totalExpenses > 0 ? (summary.grossProfit / summary.totalExpenses) * 100 : 0))}%` }}
              ></div>
            </div>
          </div>
          
          {/* Decoración de fondo */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all"></div>
        </div>
      </div>
    </div>
  );
}
