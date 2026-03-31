'use client';
import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Calendar, CreditCard, Banknote, Receipt, Tag, FileText, Download, ArrowUpRight } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { utils, writeFile } from 'xlsx';

interface SaleItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

interface Sale {
  id: string;
  invoiceNumber?: string;
  totalAmount: number;
  paymentMethod: string;
  customerName?: string;
  userId?: string;
  sellerName?: string;
  user?: { name: string };
  createdAt: string;
  items: SaleItem[];
}

export default function ReportsPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Sale | 'user'; direction: 'asc' | 'desc' } | null>(null);

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/sales`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSales(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };
  const requestSort = (key: keyof Sale | 'user') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedSales = [...sales].sort((a, b) => {
    if (!sortConfig) return 0;
    
    let aValue: any = a[sortConfig.key as keyof Sale];
    let bValue: any = b[sortConfig.key as keyof Sale];

    if (sortConfig.key === 'user') {
      aValue = a.sellerName || a.user?.name || '';
      bValue = b.sellerName || b.user?.name || '';
    }

    if (aValue === null || aValue === undefined) aValue = '';
    if (bValue === null || bValue === undefined) bValue = '';

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const totalRevenue = sales.reduce((acc, sale) => acc + Number(sale.totalAmount), 0);
  const totalCredit = sales.filter(s => s.paymentMethod === 'credito').reduce((acc, sale) => acc + Number(sale.totalAmount), 0);
  const totalItemsSold = sales.reduce((acc, sale) => acc + sale.items.reduce((sum, item) => sum + item.quantity, 0), 0);

  const formatCurrency = (amount: number) => `$${Math.round(amount).toLocaleString('es-CO')}`;

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('TIENDEO POS - REPORTE DE VENTAS', 14, 20);
    doc.setFontSize(10);
    doc.text(`Generado: ${new Date().toLocaleString()}`, 14, 28);
    
    const tableData = sortedSales.map(sale => [
      sale.invoiceNumber || 'S/N',
      new Date(sale.createdAt).toLocaleString(),
      sale.user?.name || 'Sistema',
      sale.paymentMethod + (sale.customerName ? ` (${sale.customerName})` : ''),
      sale.items.map(i => `${i.quantity}x ${i.productName}`).join(', '),
      `$${Math.round(sale.totalAmount).toLocaleString()}`
    ]);
    
    autoTable(doc, {
      startY: 35,
      head: [['Factura #', 'Fecha', 'Vendedor', 'Método / Cliente', 'Resumen Productos', 'Total']],
      body: tableData,
      headStyles: { fillColor: [37, 99, 235] }
    });
    
    doc.save('Historial_Ventas.pdf');
  };

  const exportToExcel = () => {
    const data = sortedSales.map(sale => ({
      'Factura #': sale.invoiceNumber || 'S/N',
      Fecha: new Date(sale.createdAt).toLocaleString(),
      Vendedor: sale.user?.name || 'Sistema',
      Metodo: sale.paymentMethod,
      Cliente: sale.customerName || 'N/A',
      Productos: sale.items.map(i => `${i.quantity}x ${i.productName}`).join(', '),
      Total: Number(sale.totalAmount)
    }));
    
    const ws = utils.json_to_sheet(data);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Ventas');
    writeFile(wb, 'Ventas_Tiendeo.xlsx');
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Cargando reportes...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold leading-7 text-gray-900 dark:text-white sm:truncate sm:text-3xl sm:tracking-tight transition-colors flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-blue-600" />
          Reportes y Ventas Diarias
        </h2>
        
        <div className="flex gap-3">
          <button 
            onClick={exportToPDF}
            className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-4 py-2.5 rounded-xl font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-200 transition-all active:scale-95"
          >
            <FileText className="w-4 h-4 text-rose-500" />
            Ventas PDF
          </button>
          <button 
            onClick={exportToExcel}
            className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-4 py-2.5 rounded-xl font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-200 transition-all active:scale-95"
          >
            <Download className="w-4 h-4 text-emerald-500" />
            Ventas Excel
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 px-4 py-5 shadow-sm border border-gray-100 dark:border-slate-800 sm:px-6 transition-all hover:shadow-md">
          <dl>
            <dt>
              <div className="absolute rounded-xl bg-blue-50 dark:bg-blue-900/30 p-3">
                <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="ml-16 truncate text-sm font-medium text-gray-500 dark:text-gray-400">Total Hoy</p>
            </dt>
            <dd className="ml-16 flex items-baseline pb-1 sm:pb-2">
              <p className="text-2xl font-black text-gray-900 dark:text-white">{formatCurrency(totalRevenue)}</p>
            </dd>
          </dl>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 px-4 py-5 shadow-sm border border-gray-100 dark:border-slate-800 sm:px-6 transition-all hover:shadow-md">
          <dl>
            <dt>
              <div className="absolute rounded-xl bg-orange-50 dark:bg-orange-900/30 p-3">
                <TrendingUp className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <p className="ml-16 truncate text-sm font-medium text-gray-500 dark:text-gray-400">En Crédito (Deuda)</p>
            </dt>
            <dd className="ml-16 flex items-baseline pb-1 sm:pb-2">
              <p className="text-2xl font-black text-orange-600">{formatCurrency(totalCredit)}</p>
            </dd>
          </dl>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 px-4 py-5 shadow-sm border border-gray-100 dark:border-slate-800 sm:px-6 transition-all hover:shadow-md">
          <dl>
            <dt>
              <div className="absolute rounded-xl bg-purple-50 dark:bg-purple-900/30 p-3">
                <Receipt className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <p className="ml-16 truncate text-sm font-medium text-gray-500 dark:text-gray-400">Transacciones</p>
            </dt>
            <dd className="ml-16 flex items-baseline pb-1 sm:pb-2">
              <p className="text-2xl font-black text-gray-900 dark:text-white">{sales.length}</p>
            </dd>
          </dl>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 px-4 py-5 shadow-sm border border-gray-100 dark:border-slate-800 sm:px-6 transition-all hover:shadow-md">
          <dl>
            <dt>
              <div className="absolute rounded-xl bg-green-50 dark:bg-green-900/30 p-3">
                <Tag className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <p className="ml-16 truncate text-sm font-medium text-gray-500 dark:text-gray-400">Unds. Vendidas</p>
            </dt>
            <dd className="ml-16 flex items-baseline pb-1 sm:pb-2">
              <p className="text-2xl font-black text-gray-900 dark:text-white">{totalItemsSold}</p>
            </dd>
          </dl>
        </div>
      </div>

      <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-10 mb-4 flex items-center">
        <Calendar className="w-5 h-5 mr-2 text-gray-500" /> Historial de Transacciones
      </h3>
      
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden text-left">
        {sales.length === 0 ? (
          <div className="p-4 md:p-8 text-center text-gray-500 dark:text-gray-400">No hay ventas registradas todavía.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
              <thead className="bg-gray-50 dark:bg-slate-800/50">
                <tr>
                  <th 
                    className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest min-w-[120px] cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                    onClick={() => requestSort('invoiceNumber')}
                  >
                    Factura {sortConfig?.key === 'invoiceNumber' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest min-w-[170px] cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                    onClick={() => requestSort('createdAt')}
                  >
                    Fecha / Hora {sortConfig?.key === 'createdAt' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest min-w-[150px] cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                    onClick={() => requestSort('user')}
                  >
                    Vendedor {sortConfig?.key === 'user' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest min-w-[180px]">Método / Cliente</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest min-w-[300px]">Productos</th>
                  <th 
                    className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right min-w-[120px] cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                    onClick={() => requestSort('totalAmount')}
                  >
                    Total {sortConfig?.key === 'totalAmount' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-100 dark:divide-slate-800">
                {sortedSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-black text-blue-600 dark:text-blue-400">
                      {sale.invoiceNumber || 'S/N'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300 font-medium">
                      {new Date(sale.createdAt).toLocaleString('es-CO')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                         <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase">
                            {(sale.sellerName || sale.user?.name || 'S')[0]}
                         </div>
                         <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                           {sale.sellerName || sale.user?.name || <span className="text-gray-400 italic font-medium">Sistema</span>}
                         </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        sale.paymentMethod === 'credito' 
                          ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' 
                          : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      }`}>
                        {sale.paymentMethod === 'credito' ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <Banknote className="w-3 h-3 mr-1" />}
                        {sale.paymentMethod} {sale.customerName ? `(${sale.customerName})` : ''}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 min-w-[300px]">
                      {sale.items.map(i => `${i.quantity}x ${i.productName}`).join(', ')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-black text-gray-900 dark:text-white">
                      {formatCurrency(Number(sale.totalAmount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
