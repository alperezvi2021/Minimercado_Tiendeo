'use client';
import { useState, useEffect } from 'react';
import { 
  UserPlus, 
  Search, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  ChevronRight, 
  Loader2,
  AlertCircle,
  CreditCard,
  History,
  Trash2,
  Settings
} from 'lucide-react';
import CustomerModal from '@/components/customers/CustomerModal';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  const fetchCustomers = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/customers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCustomers(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este cliente? No se podrá eliminar si tiene créditos asociados.')) return;
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/customers/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchCustomers();
      } else {
        alert('No se puede eliminar el cliente (posiblemente tiene deudas registradas)');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.idNumber && c.idNumber.includes(searchTerm))
  );

  const totalOwedByAll = filteredCustomers.reduce((sum, c) => sum + (c.totalDebt || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 dark:text-white flex items-center gap-3 tracking-tight">
            <User className="w-10 h-10 text-blue-600" />
            Gestión de Clientes
          </h1>
          <p className="text-gray-500 dark:text-slate-400 mt-2 font-medium">Administra tu base de datos de clientes y controla sus créditos</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 px-6 py-4 rounded-3xl shadow-xl hidden md:flex items-center gap-4">
            <div>
              <p className="text-[10px] font-black uppercase text-gray-400 dark:text-slate-500 tracking-widest">Cartera Total</p>
              <p className="text-2xl font-black text-rose-600 dark:text-rose-500">${Math.round(totalOwedByAll).toLocaleString('es-CO')}</p>
            </div>
          </div>
          <button 
            onClick={() => { setSelectedCustomer(null); setIsModalOpen(true); }}
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-4 rounded-2xl font-black flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all active:scale-95"
          >
            <UserPlus className="w-5 h-5" />
            <span className="hidden sm:inline">Nuevo Cliente</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
        <div className="px-8 py-6 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-950/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            Clientes Registrados
            <span className="text-xs font-black bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full uppercase">
              {filteredCustomers.length}
            </span>
          </h2>
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Buscar por nombre o ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white text-black border border-gray-200 rounded-2xl pl-12 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-bold"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 dark:border-slate-800/50">
                <th className="px-8 py-5 text-xs font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">Información Cliente</th>
                <th className="px-8 py-5 text-xs font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">Contacto</th>
                <th className="px-8 py-5 text-xs font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest text-center">Estado Crédito</th>
                <th className="px-8 py-5 text-xs font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800/50">
              {filteredCustomers.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="bg-gray-100 dark:bg-slate-800 p-3 rounded-2xl group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-all">
                        <User className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-lg font-black text-gray-900 dark:text-white leading-tight">{c.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <CreditCard className="w-3.5 h-3.5 text-gray-400" />
                          <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-tighter">
                            {c.idNumber || 'Sin Identificación'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="space-y-1.5 text-sm font-medium text-gray-600 dark:text-slate-400">
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-blue-500" />
                        <span>{c.phone || 'No registrado'}</span>
                      </div>
                      <div className="flex items-center gap-2 overflow-hidden max-w-[200px]">
                        <Mail className="w-3.5 h-3.5 text-blue-500" />
                        <span className="truncate">{c.email || 'No registrado'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col items-center">
                      <div className={`px-4 py-2 rounded-2xl flex flex-col items-center min-w-[140px] border shadow-sm ${
                        c.totalDebt > 0 
                        ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-900/30 text-rose-600 dark:text-rose-400' 
                        : 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-900/30 text-green-600 dark:text-green-400'
                      }`}>
                        <span className="text-xs font-black uppercase tracking-widest opacity-80 mb-1">
                          {c.totalDebt > 0 ? 'Deuda Activa' : 'Al Día'}
                        </span>
                        <span className="text-lg font-black">${Math.round(c.totalDebt).toLocaleString('es-CO')}</span>
                        {c.pendingInvoices > 0 && (
                          <span className="text-[10px] font-bold mt-0.5 opacity-70">
                            {c.pendingInvoices} Facturas pendientes
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => { setSelectedCustomer(c); setIsModalOpen(true); }}
                        className="p-3 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:bg-blue-600 hover:text-white rounded-xl transition-all shadow-sm"
                        title="Editar Datos"
                      >
                        <Settings className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => handleDelete(c.id)}
                        className="p-3 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:bg-rose-600 hover:text-white rounded-xl transition-all shadow-sm"
                        title="Eliminar"
                        disabled={c.totalDebt > 0}
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center">
                    <div className="bg-gray-50 dark:bg-slate-950/50 rounded-3xl p-10 border border-dashed border-gray-200 dark:border-slate-800 inline-block">
                      <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-xl font-bold text-gray-900 dark:text-white">No se encontraron clientes</p>
                      <p className="text-gray-500 dark:text-slate-500 mt-1">Intenta buscar con otros términos o registra uno nuevo.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CustomerModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={fetchCustomers}
        customer={selectedCustomer}
      />
    </div>
  );
}
