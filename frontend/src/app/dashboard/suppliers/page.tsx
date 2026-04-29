'use client';
import { useState, useEffect } from 'react';
import { Plus, Search, Truck, Receipt, Eye, Edit3, Trash2, Calendar, User, FileText, CheckCircle2, Clock, Wallet, CalendarDays, DollarSign, CreditCard, Download, FileSpreadsheet } from 'lucide-react';
import { formatCurrency, parseCurrency } from '@/utils/formatters';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';


interface Supplier {
  id: string;
  name: string;
  taxId: string;
  address: string;
  phone: string;
  email: string;
}

interface InvoiceItem {
  description: string;
  quantity: number;
  unitNetValue: number;
  taxRate: number; // Ej: 19
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
}

interface ScheduledOrder {
  id: string;
  description: string;
  totalAmount: number;
  paymentType: string;
  date: string;
  status: string;
  supplier: Supplier;
}
interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  totalAmount: number;
  totalTax: number;
  isPaid: boolean;
  supplier: { id: string; name: string };
  description?: string;
  discount?: number;
  items?: InvoiceItem[];
}

export default function SuppliersPage() {
  const [activeTab, setActiveTab] = useState<'suppliers' | 'invoices' | 'expenses' | 'scheduled' | 'report'>('suppliers');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [scheduledOrders, setScheduledOrders] = useState<ScheduledOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  // Modales
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isScheduledModalOpen, setIsScheduledModalOpen] = useState(false);

  // Form Proveedor
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supName, setSupName] = useState('');
  const [supTaxId, setSupTaxId] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supEmail, setSupEmail] = useState('');
  const [supAddress, setSupAddress] = useState('');

  // Form Factura
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [invNumber, setInvNumber] = useState('');
  const [invDate, setInvDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [invItems, setInvItems] = useState<InvoiceItem[]>([{ description: '', quantity: 1, unitNetValue: 0, taxRate: 19 }]);
  const [invDiscount, setInvDiscount] = useState(0);

  // Form Gastos
  const [expDescription, setExpDescription] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0]);

  // Form Pedidos
  const [schDescription, setSchDescription] = useState('');
  const [schAmount, setSchAmount] = useState('');
  const [schDate, setSchDate] = useState(new Date().toISOString().split('T')[0]);
  const [schSupplierId, setSchSupplierId] = useState('');
  const [schPaymentType, setSchPaymentType] = useState('CONTADO');

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      let endpoint = 'suppliers';
      if (activeTab === 'invoices') endpoint = 'suppliers/invoices';
      else if (activeTab === 'expenses') endpoint = 'suppliers/expenses';
      else if (activeTab === 'scheduled') endpoint = 'suppliers/scheduled-orders';

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (activeTab === 'suppliers') setSuppliers(data);
        else if (activeTab === 'invoices') setInvoices(data);
        else if (activeTab === 'expenses') setExpenses(data);
        else if (activeTab === 'scheduled') setScheduledOrders(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('access_token');
      const url = editingSupplier 
        ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/suppliers/${editingSupplier.id}`
        : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/suppliers`;
      
      const res = await fetch(url, {
        method: editingSupplier ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: supName, taxId: supTaxId, phone: supPhone, email: supEmail, address: supAddress })
      });
      if (res.ok) {
        setIsSupplierModalOpen(false);
        setEditingSupplier(null);
        setSupName(''); setSupTaxId(''); setSupPhone(''); setSupEmail(''); setSupAddress('');
        fetchData();
        if (!editingSupplier && confirm('¿Deseas registrar una factura para este proveedor ahora?')) {
          const data = await res.json();
          handleOpenNewInvoice(); // Reset everything
          setSelectedSupplierId(data.id); // But set the new supplier
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleEditSupplier = (s: Supplier) => {
    setEditingSupplier(s);
    setSupName(s.name);
    setSupTaxId(s.taxId || '');
    setSupPhone(s.phone || '');
    setSupEmail(s.email || '');
    setSupAddress(s.address || '');
    setIsSupplierModalOpen(true);
  };

  const handleDeleteSupplier = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este proveedor?')) return;
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/suppliers/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchData();
      } else {
        const err = await res.json();
        alert(err.message || 'No se pudo eliminar el proveedor');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddLineItem = () => {
    setInvItems([...invItems, { description: '', quantity: 1, unitNetValue: 0, taxRate: 19 }]);
  };

  const handleRemoveLineItem = (index: number) => {
    setInvItems(invItems.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const newItems = [...invItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setInvItems(newItems);
  };

  const calculateInvoiceTotals = () => {
    let net = 0;
    let tax = 0;
    invItems.forEach(item => {
      const itemNet = item.quantity * item.unitNetValue;
      const itemTax = itemNet * (item.taxRate / 100);
      net += itemNet;
      tax += itemTax;
    });
    return { net, tax, total: net + tax - invDiscount };
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    const totals = calculateInvoiceTotals();
    const payload = {
      invoiceNumber: invNumber,
      date: invDate,
      supplierId: selectedSupplierId,
      totalNet: totals.net,
      totalTax: totals.tax,
      totalAmount: totals.total,
      discount: invDiscount,
      items: invItems.map(item => ({
        ...item,
        totalNetValue: item.quantity * item.unitNetValue,
        taxAmount: (item.quantity * item.unitNetValue) * (item.taxRate / 100),
        totalItemAmount: (item.quantity * item.unitNetValue) * (1 + item.taxRate / 100)
      }))
    };

    try {
      const token = localStorage.getItem('access_token');
      const url = editingInvoice 
        ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/suppliers/invoices/${editingInvoice.id}`
        : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/suppliers/invoices`;
      
      const res = await fetch(url, {
        method: editingInvoice ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setIsInvoiceModalOpen(false);
        setEditingInvoice(null);
        setInvNumber(''); setInvItems([{ description: '', quantity: 1, unitNetValue: 0, taxRate: 19 }]);
        setInvDiscount(0);
        fetchData();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleEditInvoice = (inv: Invoice) => {
    setEditingInvoice(inv);
    setInvNumber(inv.invoiceNumber);
    setInvDate(new Date(inv.date).toISOString().split('T')[0]);
    setSelectedSupplierId(inv.supplier?.id || '');
    setInvDiscount(inv.discount || 0);
    if (inv.items && inv.items.length > 0) {
      setInvItems(inv.items.map((i: InvoiceItem) => ({
        description: i.description,
        quantity: Number(i.quantity),
        unitNetValue: Number(i.unitNetValue),
        taxRate: Number(i.taxRate)
      })));
    }
    setIsInvoiceModalOpen(true);
  };

  const handleDeleteInvoice = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta factura?')) return;
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/suppliers/invoices/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  const handleOpenNewInvoice = () => {
    setEditingInvoice(null);
    setInvNumber('');
    setInvDate(new Date().toISOString().split('T')[0]);
    setSelectedSupplierId('');
    setInvItems([{ description: '', quantity: 1, unitNetValue: 0, taxRate: 19 }]);
    setInvDiscount(0);
    setIsInvoiceModalOpen(true);
  };
  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/suppliers/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ description: expDescription, amount: Number(expAmount), date: expDate })
      });
      if (res.ok) {
        setIsExpenseModalOpen(false);
        setExpDescription(''); setExpAmount('');
        fetchData();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleCreateScheduledOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/suppliers/scheduled-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ 
          description: schDescription, 
          totalAmount: Number(schAmount), 
          date: schDate, 
          supplierId: schSupplierId, 
          paymentType: schPaymentType 
        })
      });
      if (res.ok) {
        setIsScheduledModalOpen(false);
        setSchDescription(''); setSchAmount(''); setSchSupplierId('');
        fetchData();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedSuppliers = [...suppliers].filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.taxId?.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a: Supplier, b: Supplier) => {
    if (!sortConfig) return 0;
    const key = sortConfig.key as keyof Supplier;
    const aValue = String(a[key] || '');
    const bValue = String(b[key] || '');
    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const sortedInvoices = [...invoices].filter(inv => 
    inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
    inv.supplier?.name.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a: Invoice, b: Invoice) => {
    if (!sortConfig) return 0;
    let aValue = (a as any)[sortConfig.key];
    let bValue = (b as any)[sortConfig.key];
    
    if (sortConfig.key === 'supplier') {
      aValue = a.supplier?.name || '';
      bValue = b.supplier?.name || '';
    }

    if (aValue === null || aValue === undefined) aValue = '';
    if (bValue === null || bValue === undefined) bValue = '';

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const exportToPDF = () => {
    const doc = new jsPDF();
    const title = `Informe de Proveedores - ${new Date().toLocaleDateString()}`;
    
    doc.setFontSize(18);
    doc.text('TIENDEO POS - Reporte de Compras', 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(title, 14, 30);

    const tableData = suppliers.map(s => {
      const supInvoices = invoices.filter(i => i.supplier?.id === s.id);
      const total = supInvoices.reduce((sum, i) => sum + Number(i.totalAmount || 0), 0);
      return [
        s.name,
        s.taxId || 'N/A',
        supInvoices.length.toString(),
        `$${formatCurrency(total)}`
      ];
    });

    autoTable(doc, {
      startY: 40,
      head: [['Proveedor', 'NIT/ID', 'Facturas', 'Total Compras']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235] },
    });

    doc.save(`Reporte_Proveedores_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportToExcel = () => {
    const data = suppliers.map(s => {
      const supInvoices = invoices.filter(i => i.supplier?.id === s.id);
      const total = supInvoices.reduce((sum, i) => sum + Number(i.totalAmount || 0), 0);
      return {
        'Proveedor': s.name,
        'NIT/ID': s.taxId || 'N/A',
        'Facturas Registradas': supInvoices.length,
        'Total Compras': total
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Proveedores');
    XLSX.writeFile(wb, `Reporte_Proveedores_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Proveedores y Compras
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Gestiona tus socios comerciales y registra facturas de entrada de mercancía.
          </p>
        </div>
        
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button 
            onClick={() => setActiveTab('suppliers')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'suppliers' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Proveedores
          </button>
          <button 
            onClick={() => setActiveTab('invoices')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'invoices' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Facturas
          </button>
          <button 
            onClick={() => setActiveTab('expenses')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'expenses' ? 'bg-white dark:bg-slate-700 text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Gastos
          </button>
          <button 
            onClick={() => setActiveTab('scheduled')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'scheduled' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Pedidos
          </button>
          <button 
            onClick={() => setActiveTab('report')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'report' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Informe
          </button>
        </div>
      </div>

      {/* Acciones Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <button 
          onClick={() => setIsSupplierModalOpen(true)}
          className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl hover:border-blue-500 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600">
              <Truck className="w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="font-bold text-sm text-slate-900 dark:text-white">Nuevo Proveedor</p>
            </div>
          </div>
          <Plus className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
        </button>

        <button 
          onClick={handleOpenNewInvoice}
          className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl hover:border-emerald-500 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-emerald-600">
              <Receipt className="w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="font-bold text-sm text-slate-900 dark:text-white">Registrar Factura</p>
            </div>
          </div>
          <Plus className="w-4 h-4 text-slate-400 group-hover:text-emerald-600" />
        </button>

        <button 
          onClick={() => setIsExpenseModalOpen(true)}
          className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl hover:border-orange-500 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-xl text-orange-600">
              <Wallet className="w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="font-bold text-sm text-slate-900 dark:text-white">Gestión de Gastos</p>
            </div>
          </div>
          <Plus className="w-4 h-4 text-slate-400 group-hover:text-orange-600" />
        </button>

        <button 
          onClick={() => setIsScheduledModalOpen(true)}
          className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl hover:border-indigo-500 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl text-indigo-600">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="font-bold text-sm text-slate-900 dark:text-white">Programar Pedido</p>
            </div>
          </div>
          <Plus className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
        </button>
      </div>

      {/* Tabla de Datos */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              {activeTab === 'suppliers' ? (
                <tr>
                  <th 
                    className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-wider min-w-[200px] cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    onClick={() => requestSort('name')}
                  >
                    Nombre / NIT {sortConfig?.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-wider min-w-[180px]">Contacto</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-wider min-w-[200px]">Dirección</th>
                  <th className="relative px-6 py-4 min-w-[100px]"></th>
                </tr>
              ) : activeTab === 'invoices' ? (
                <tr>
                  <th 
                    className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-wider min-w-[110px] cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    onClick={() => requestSort('invoiceNumber')}
                  >
                    Factura # {sortConfig?.key === 'invoiceNumber' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-wider min-w-[110px] cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    onClick={() => requestSort('date')}
                  >
                    Fecha {sortConfig?.key === 'date' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-wider min-w-[180px] cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    onClick={() => requestSort('supplier')}
                  >
                    Proveedor {sortConfig?.key === 'supplier' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-wider min-w-[120px] cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    onClick={() => requestSort('totalAmount')}
                  >
                    Total {sortConfig?.key === 'totalAmount' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-wider min-w-[120px]">Estado</th>
                  <th className="relative px-6 py-4 min-w-[100px]"></th>
                </tr>
              ) : activeTab === 'expenses' ? (
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-wider">Fecha</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-wider">Descripción</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-wider">Valor</th>
                  <th className="relative px-6 py-4"></th>
                </tr>
              ) : (
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-wider">Fecha</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-wider">Proveedor</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-wider">Descripción</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-wider">Valor</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-wider">Pago</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-wider">Estado</th>
                  <th className="relative px-6 py-4"></th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500">Cargando datos...</td></tr>
              ) : activeTab === 'suppliers' ? (
                sortedSuppliers.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 dark:text-white">{s.name}</span>
                        <span className="text-xs text-slate-500">NIT: {s.taxId || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col text-sm">
                        <span className="text-slate-700 dark:text-slate-300">{s.phone}</span>
                        <span className="text-slate-500 text-xs">{s.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{s.address}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleEditSupplier(s)} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all" title="Editar"><Edit3 className="w-4 h-4" /></button>
                        <button onClick={() => handleDeleteSupplier(s.id)} className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : activeTab === 'invoices' ? (
                sortedInvoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 font-mono text-sm font-bold text-blue-600">{inv.invoiceNumber}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{new Date(inv.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-900 dark:text-white">{inv.supplier?.name}</td>
                    <td className="px-6 py-4 text-sm font-bold text-emerald-600">${formatCurrency(inv.totalAmount)}</td>
                    <td className="px-6 py-4">
                      {inv.isPaid ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Pagado
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                          <Clock className="w-3 h-3 mr-1" /> Pendiente
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleEditInvoice(inv)} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all" title="Editar"><Edit3 className="w-4 h-4" /></button>
                        <button onClick={() => handleDeleteInvoice(inv.id)} className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : activeTab === 'expenses' ? (
                expenses.map((exp: Expense) => (
                  <tr key={exp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{new Date(exp.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-900 dark:text-white">{exp.description}</td>
                    <td className="px-6 py-4 text-sm font-bold text-orange-600">${formatCurrency(exp.amount)}</td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={async () => {
                        if(confirm('¿Eliminar gasto?')) {
                          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/suppliers/expenses/${exp.id}`, {
                            method: 'DELETE',
                            headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
                          });
                          if(res.ok) fetchData();
                        }
                      }} className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))
              ) : activeTab === 'scheduled' ? (
                scheduledOrders.map((sch: ScheduledOrder) => (
                  <tr key={sch.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{new Date(sch.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-900 dark:text-white">{sch.supplier?.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{sch.description}</td>
                    <td className="px-6 py-4 text-sm font-bold text-indigo-600">${formatCurrency(sch.totalAmount)}</td>
                    <td className="px-6 py-4 text-xs font-bold uppercase">{sch.paymentType}</td>
                    <td className="px-6 py-4 text-xs">
                      <span className={`px-2 py-0.5 rounded-full ${sch.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                        {sch.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                       <button onClick={async () => {
                        if(confirm('¿Eliminar pedido?')) {
                          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/suppliers/scheduled-orders/${sch.id}`, {
                            method: 'DELETE',
                            headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
                          });
                          if(res.ok) fetchData();
                        }
                      }} className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12">
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                       <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700">
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Compras Brutas</p>
                          <p className="text-3xl font-black text-slate-900 dark:text-white">${formatCurrency(invoices.reduce((s: number, i: Invoice) => s + Number(i.totalAmount || 0), 0))}</p>
                       </div>
                       <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700">
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Total Impuestos</p>
                          <p className="text-3xl font-black text-blue-600">${formatCurrency(invoices.reduce((s: number, i: Invoice) => s + Number(i.totalTax || 0), 0))}</p>
                       </div>
                       <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700">
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Facturas Pendientes</p>
                          <p className="text-3xl font-black text-amber-600">{invoices.filter(i => !i.isPaid).length}</p>
                       </div>
                     </div>

                     <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-xl">
                        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                           <h4 className="font-bold text-slate-900 dark:text-white uppercase text-xs tracking-widest">Resumen por Proveedor</h4>
                           <div className="flex gap-2">
                             <button 
                               onClick={exportToPDF}
                               type="button"
                               className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl text-[10px] font-black border border-rose-100 dark:border-rose-800/50 hover:bg-rose-100 transition-all"
                             >
                               <FileText className="w-3 h-3" /> PDF
                             </button>
                             <button 
                               onClick={exportToExcel}
                               type="button"
                               className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-[10px] font-black border border-emerald-100 dark:border-emerald-800/50 hover:bg-emerald-100 transition-all"
                             >
                               <FileSpreadsheet className="w-3 h-3" /> EXCEL
                             </button>
                           </div>
                        </div>
                        <table className="w-full text-left">
                          <thead>
                            <tr className="border-b border-slate-100 dark:border-slate-800">
                              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Socio Comercial</th>
                              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase text-center">Facturas</th>
                              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase text-right">Total Compras</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                            {suppliers.map((s: Supplier) => {
                              const supInvoices = invoices.filter((i: Invoice) => i.supplier?.id === s.id);
                              const total = supInvoices.reduce((sum: number, i: Invoice) => sum + Number(i.totalAmount || 0), 0);
                              return (
                                <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                  <td className="px-6 py-4">
                                    <p className="font-bold text-slate-900 dark:text-white">{s.name}</p>
                                    <p className="text-[10px] text-slate-500">{s.taxId || 'N/A'}</p>
                                  </td>
                                  <td className="px-6 py-4 text-center font-bold text-slate-600 dark:text-slate-400">{supInvoices.length}</td>
                                  <td className="px-6 py-4 text-right font-black text-emerald-600">${formatCurrency(total)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                     </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Proveedor */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Truck className="text-blue-600" /> {editingSupplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}
              </h3>
            </div>
            <form onSubmit={handleCreateSupplier} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Nombre de la Empresa *</label>
                  <input required className="w-full mt-1 p-3 rounded-xl bg-white dark:bg-slate-800 text-black dark:text-white border-2 border-slate-100 dark:border-slate-800 outline-none focus:ring-2 focus:ring-blue-500 font-bold" value={supName} onChange={e => setSupName(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">NIT / Tax ID</label>
                  <input className="w-full mt-1 p-3 rounded-xl bg-white dark:bg-slate-800 text-black dark:text-white border-2 border-slate-100 dark:border-slate-800 outline-none focus:ring-2 focus:ring-blue-500 font-bold" value={supTaxId} onChange={e => setSupTaxId(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Teléfono</label>
                  <input className="w-full mt-1 p-3 rounded-xl bg-white dark:bg-slate-800 text-black dark:text-white border-2 border-slate-100 dark:border-slate-800 outline-none focus:ring-2 focus:ring-blue-500 font-bold" value={supPhone} onChange={e => setSupPhone(e.target.value)} />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Email</label>
                  <input type="email" className="w-full mt-1 p-3 rounded-xl bg-white dark:bg-slate-800 text-black dark:text-white border-2 border-slate-100 dark:border-slate-800 outline-none focus:ring-2 focus:ring-blue-500 font-bold" value={supEmail} onChange={e => setSupEmail(e.target.value)} />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Dirección</label>
                  <input className="w-full mt-1 p-3 rounded-xl bg-white dark:bg-slate-800 text-black dark:text-white border-2 border-slate-100 dark:border-slate-800 outline-none focus:ring-2 focus:ring-blue-500 font-bold" value={supAddress} onChange={e => setSupAddress(e.target.value)} />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => { setIsSupplierModalOpen(false); setEditingSupplier(null); }} className="px-6 py-3 font-bold text-slate-500">Cancelar</button>
                <button type="submit" className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-500 shadow-lg shadow-blue-500/20 transition-all uppercase">{editingSupplier ? 'Actualizar' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Factura */}
      {isInvoiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-4xl my-8 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Receipt className="text-emerald-600" /> {editingInvoice ? 'Editar Factura' : 'Registrar Factura de Compra'}
              </h3>
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Total Factura</p>
                <p className="text-2xl font-black text-emerald-600">${formatCurrency(calculateInvoiceTotals().total)}</p>
              </div>
            </div>
            
            <form onSubmit={handleCreateInvoice} className="p-6 grid grid-cols-3 gap-6">
              {/* Cabecera de Factura */}
              <div className="col-span-3 grid grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Nº Factura</label>
                  <input required placeholder="Ej: FV-001" className="w-full mt-1 p-3 rounded-xl bg-white dark:bg-slate-700 text-black dark:text-white border-none outline-none focus:ring-2 focus:ring-emerald-500 font-bold" value={invNumber} onChange={e => setInvNumber(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Fecha</label>
                  <input 
                    type="date" 
                    required 
                    className="w-full mt-1 p-3 rounded-xl bg-white dark:bg-slate-700 text-black dark:text-white border-none outline-none focus:ring-2 focus:ring-emerald-500 font-bold appearance-none cursor-pointer" 
                    value={invDate} 
                    onChange={e => setInvDate(e.target.value)} 
                    onClick={(e) => e.currentTarget.showPicker?.()}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Proveedor</label>
                  <select required className="w-full mt-1 p-3 rounded-xl bg-white dark:bg-slate-700 text-black dark:text-white border-none outline-none focus:ring-2 focus:ring-emerald-500 font-bold" value={selectedSupplierId} onChange={e => setSelectedSupplierId(e.target.value)}>
                    <option value="">Seleccionar...</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Detalle de Productos */}
              <div className="col-span-3">
                <div className="flex justify-between items-center mb-4 px-2">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Detalle de Productos</h4>
                  <button type="button" onClick={handleAddLineItem} className="flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-lg transition-colors">
                    <Plus className="w-4 h-4" /> Añadir Línea
                  </button>
                </div>
                
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {invItems.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-3 p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800 items-end animate-in slide-in-from-right-3 duration-200">
                      <div className="col-span-4">
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Descripción del Producto</label>
                        <input required placeholder="Ej: Arroz Diana 1kg x24" className="w-full p-2.5 rounded-lg bg-white dark:bg-slate-700 text-black dark:text-white text-sm border-none outline-none focus:ring-2 focus:ring-blue-500 font-bold" value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} />
                      </div>
                      <div className="col-span-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Cant.</label>
                        <input 
                          type="number" 
                          step="0.01" 
                          required 
                          placeholder="0"
                          className="w-full p-2.5 rounded-lg bg-white dark:bg-slate-700 text-black dark:text-white text-sm border-none outline-none focus:ring-2 focus:ring-blue-500 font-bold" 
                          value={item.quantity === 0 ? '' : item.quantity} 
                          onChange={e => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)} 
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">V. Neto Unid.</label>
                        <input 
                          type="text" 
                          required 
                          placeholder="0"
                          className="w-full p-2.5 rounded-lg bg-white dark:bg-slate-700 text-black dark:text-white text-sm border-none outline-none focus:ring-2 focus:ring-blue-500 font-bold" 
                          value={formatCurrency(item.unitNetValue)} 
                          onChange={e => updateItem(idx, 'unitNetValue', parseCurrency(e.target.value))} 
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">IVA %</label>
                        <select className="w-full p-2.5 rounded-lg bg-white dark:bg-slate-700 text-black dark:text-white text-sm border-none outline-none focus:ring-2 focus:ring-blue-500 font-bold" value={item.taxRate} onChange={e => updateItem(idx, 'taxRate', parseFloat(e.target.value))}>
                          <option value="0">0%</option>
                          <option value="5">5%</option>
                          <option value="19">19%</option>
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">V. Total</label>
                        <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 text-sm font-bold border-none h-[38px] flex items-center">
                          ${formatCurrency((item.quantity * item.unitNetValue) * (1 + item.taxRate / 100))}
                        </div>
                      </div>
                      <div className="col-span-1 flex justify-center">
                        <button type="button" onClick={() => handleRemoveLineItem(idx)} className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Resumen Final en el Modal */}
              <div className="col-span-3 flex justify-end">
                <div className="w-full max-w-xs space-y-2 bg-slate-50 dark:bg-slate-800/80 p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 font-bold">Subtotal Neto:</span>
                    <span className="text-slate-900 dark:text-white font-black">${formatCurrency(calculateInvoiceTotals().net)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-rose-500">
                    <span className="font-bold">Desc. por Cambio:</span>
                    <div className="flex items-center gap-1">
                      <span>$-</span>
                      <input 
                        type="text" 
                        className="w-20 bg-transparent border-b border-rose-300 outline-none text-right font-black"
                        value={formatCurrency(invDiscount)} 
                        onChange={e => setInvDiscount(parseCurrency(e.target.value))} 
                      />
                    </div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 font-bold">Impuestos (IVA):</span>
                    <span className="text-slate-900 dark:text-white font-black">${formatCurrency(calculateInvoiceTotals().tax)}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-600 flex justify-between">
                    <span className="text-slate-900 dark:text-white font-extrabold text-lg uppercase">TOTAL:</span>
                    <span className="text-emerald-600 font-black text-xl">${formatCurrency(calculateInvoiceTotals().total)}</span>
                  </div>
                </div>
              </div>

              <div className="col-span-3 flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => { setIsInvoiceModalOpen(false); setEditingInvoice(null); }} className="px-8 py-3 font-bold text-slate-500">Cancelar</button>
                <button 
                  type="submit" 
                  disabled={!invNumber || !invDate || !selectedSupplierId || invItems.some(i => !i.description)}
                  className="px-12 py-3 bg-emerald-600 text-white rounded-2xl font-black hover:bg-emerald-500 disabled:bg-slate-300 disabled:cursor-not-allowed shadow-xl shadow-emerald-500/20 transition-all uppercase tracking-widest"
                >
                  {editingInvoice ? 'Actualizar Factura' : 'Registrar Gasto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal Gasto */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Wallet className="text-orange-600" /> Gestión de Gastos
              </h3>
            </div>
            <form onSubmit={handleCreateExpense} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Descripción del Gasto *</label>
                <input required placeholder="Ej: Pago de luz local" className="w-full mt-1 p-3 rounded-xl bg-white dark:bg-slate-800 text-black dark:text-white border-2 border-slate-100 dark:border-slate-800 outline-none focus:ring-2 focus:ring-orange-500 font-bold" value={expDescription} onChange={e => setExpDescription(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Valor *</label>
                <input type="text" required placeholder="0" className="w-full mt-1 p-3 rounded-xl bg-white dark:bg-slate-800 text-black dark:text-white border-2 border-slate-100 dark:border-slate-800 outline-none focus:ring-2 focus:ring-orange-500 font-bold" value={formatCurrency(expAmount)} onChange={e => setExpAmount(parseCurrency(e.target.value).toString())} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Fecha *</label>
                <input type="date" required className="w-full mt-1 p-3 rounded-xl bg-white dark:bg-slate-800 text-black dark:text-white border-2 border-slate-100 dark:border-slate-800 outline-none focus:ring-2 focus:ring-orange-500 font-bold" value={expDate} onChange={e => setExpDate(e.target.value)} />
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsExpenseModalOpen(false)} className="px-6 py-3 font-bold text-slate-500">Cancelar</button>
                <button type="submit" className="px-8 py-3 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-500 shadow-lg shadow-orange-500/20 transition-all uppercase">Registrar Gasto</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Pedido Programado */}
      {isScheduledModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CalendarDays className="text-indigo-600" /> Programar Pedido
              </h3>
            </div>
            <form onSubmit={handleCreateScheduledOrder} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Proveedor *</label>
                <select required className="w-full mt-1 p-3 rounded-xl bg-white dark:bg-slate-800 text-black dark:text-white border-2 border-slate-100 dark:border-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 font-bold" value={schSupplierId} onChange={e => setSchSupplierId(e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Descripción / Productos *</label>
                <textarea required placeholder="Ej: Pedido semanal de lácteos" className="w-full mt-1 p-3 rounded-xl bg-white dark:bg-slate-800 text-black dark:text-white border-2 border-slate-100 dark:border-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 font-bold" value={schDescription} onChange={e => setSchDescription(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Valor Estimado *</label>
                  <input type="text" required placeholder="0" className="w-full mt-1 p-3 rounded-xl bg-white dark:bg-slate-800 text-black dark:text-white border-2 border-slate-100 dark:border-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 font-bold" value={formatCurrency(schAmount)} onChange={e => setSchAmount(parseCurrency(e.target.value).toString())} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Tipo de Pago *</label>
                  <select className="w-full mt-1 p-3 rounded-xl bg-white dark:bg-slate-800 text-black dark:text-white border-2 border-slate-100 dark:border-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 font-bold" value={schPaymentType} onChange={e => setSchPaymentType(e.target.value)}>
                    <option value="CONTADO">Contado</option>
                    <option value="CREDITO">Crédito</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Fecha Programada *</label>
                <input type="date" required className="w-full mt-1 p-3 rounded-xl bg-white dark:bg-slate-800 text-black dark:text-white border-2 border-slate-100 dark:border-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 font-bold" value={schDate} onChange={e => setSchDate(e.target.value)} />
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsScheduledModalOpen(false)} className="px-6 py-3 font-bold text-slate-500">Cancelar</button>
                <button type="submit" className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 transition-all uppercase">Programar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
