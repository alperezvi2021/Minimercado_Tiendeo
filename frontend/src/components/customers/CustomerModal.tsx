'use client';
import { useState, useEffect } from 'react';
import { X, User, Phone, Mail, MapPin, CreditCard, Loader2 } from 'lucide-react';
import { useOfflineStore } from '@/store/useOfflineStore';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  customer?: any;
}

export default function CustomerModal({ isOpen, onClose, onSave, customer }: CustomerModalProps) {
  const { isOnline, addPendingCustomer } = useOfflineStore();
  const [formData, setFormData] = useState({
    name: '',
    idNumber: '',
    phone: '',
    email: '',
    address: '',
    initialDebt: '',
  });
  const [loading, setLoading] = useState(false);
  const [debts, setDebts] = useState<any[]>([]);
  const [loadingDebts, setLoadingDebts] = useState(false);

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || '',
        idNumber: customer.idNumber || '',
        phone: customer.phone || '',
        email: customer.email || '',
        address: customer.address || '',
        initialDebt: '',
      });
      if (isOpen) fetchCustomerDebts();
    } else {
      setFormData({
        name: '',
        idNumber: '',
        phone: '',
        email: '',
        address: '',
        initialDebt: '',
      });
      setDebts([]);
    }
  }, [customer, isOpen]);

  const fetchCustomerDebts = async () => {
    if (!customer?.id) return;
    setLoadingDebts(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/customers/${customer.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDebts(data.creditSales || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingDebts(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!isOnline && !customer) {
        // MODO OFFLINE - CREACIÓN
        const uuid = crypto.randomUUID();
        const localId = `temp-cust-${uuid}`;
        const newCustomer = {
          ...formData,
          id: localId,
          localId,
          totalDebt: 0,
          pendingInvoices: 0
        };
        addPendingCustomer(newCustomer);
        onSave();
        onClose();
        return;
      }

      if (!isOnline && customer) {
        alert('No se pueden editar clientes existentes en modo offline todavía.');
        return;
      }

      const token = localStorage.getItem('access_token');
      const url = customer 
        ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/customers/${customer.id}`
        : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/customers`;
      
      const res = await fetch(url, {
        method: customer ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        onSave();
        onClose();
      } else {
        alert('Error al guardar el cliente');
      }
    } catch (error) {
      console.error(error);
      alert('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200 max-h-[95vh] flex flex-col">
        <div className="px-8 py-6 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gray-50/50 dark:bg-slate-900/50 shrink-0">
          <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-600/20">
              <User className="w-5 h-5 text-white" />
            </div>
            {customer ? 'Editar Cliente' : 'Nuevo Cliente'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <form id="customer-form" onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="space-y-4">
              <div className="relative">
                <User className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                <input
                  required
                  type="text"
                  placeholder="Nombre Completo"
                  className="w-full bg-white text-black border border-gray-200 rounded-2xl pl-12 pr-4 py-3.5 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all font-bold"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <CreditCard className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="ID / Cédula / NIT"
                    className="w-full bg-white dark:bg-slate-800 text-black dark:text-white border border-gray-200 dark:border-slate-700 rounded-2xl pl-12 pr-4 py-3.5 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all font-bold"
                    value={formData.idNumber}
                    onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
                  />
                </div>
                <div className="relative">
                  <Phone className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    placeholder="Teléfono"
                    className="w-full bg-white dark:bg-slate-800 text-black dark:text-white border border-gray-200 dark:border-slate-700 rounded-2xl pl-12 pr-4 py-3.5 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all font-bold"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="relative">
                <Mail className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  placeholder="Correo Electrónico (Opcional)"
                  className="w-full bg-white dark:bg-slate-800 text-black dark:text-white border border-gray-200 dark:border-slate-700 rounded-2xl pl-12 pr-4 py-3.5 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all font-bold"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="relative">
                <MapPin className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                <textarea
                  placeholder="Dirección Física"
                  rows={2}
                  className="w-full bg-white dark:bg-slate-800 text-black dark:text-white border border-gray-200 dark:border-slate-700 rounded-2xl pl-12 pr-4 py-3.5 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all font-bold resize-none"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              <div className="relative bg-rose-50 dark:bg-rose-900/10 p-4 rounded-2xl border border-rose-100 dark:border-rose-900/20">
                <div className="flex items-center gap-2 mb-2 text-rose-600 dark:text-rose-400">
                  <CreditCard className="w-4 h-4" />
                  <span className="text-xs font-black uppercase tracking-widest">Añadir Saldo Pendiente (Opcional)</span>
                </div>
                <input
                  type="number"
                  placeholder="Ej: 50000"
                  className="w-full bg-white dark:bg-slate-900 text-black dark:text-white border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-rose-500/50 outline-none transition-all font-black text-lg"
                  value={formData.initialDebt}
                  onChange={(e) => setFormData({ ...formData, initialDebt: e.target.value })}
                />
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-2 italic">* Use este campo para registrar deudas de cuadernos externos.</p>
              </div>
            </div>

            {/* DEBT DETAILS TABLE */}
            {customer && (
              <div className="pt-4 border-t border-gray-100 dark:border-slate-800">
                <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Estado de Cuenta Detallado
                </h4>

                {loadingDebts ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                  </div>
                ) : debts.length === 0 ? (
                  <div className="text-center py-10 bg-gray-50 dark:bg-slate-800/50 rounded-3xl border border-dashed border-gray-200 dark:border-slate-700">
                    <p className="text-gray-400 font-bold italic text-sm text-black">No tiene deudas registradas en el sistema.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {debts.map((debt) => {
                      const totalPaid = debt.payments?.reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0;
                      return (
                        <div key={debt.id} className="p-4 bg-gray-50 dark:bg-slate-800/80 rounded-2xl border border-gray-100 dark:border-slate-700 flex flex-wrap items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                             <div className={`p-2 rounded-lg ${debt.status === 'PAID' ? 'bg-green-100 text-green-600' : 'bg-rose-100 text-rose-600'}`}>
                               <CreditCard className="w-4 h-4" />
                             </div>
                             <div>
                               <p className="text-xs font-black text-gray-400 uppercase tracking-tighter">Factura No.</p>
                               <p className="text-sm font-black text-gray-900 dark:text-white">{debt.sale?.invoiceNumber || 'S/N'}</p>
                             </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total</p>
                              <p className="font-bold text-gray-700 dark:text-slate-300">
                                ${Math.round(debt.amount).toLocaleString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Abonado</p>
                              <p className="font-bold text-emerald-600 dark:text-emerald-400">
                                ${Math.round(totalPaid).toLocaleString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Saldo</p>
                              <p className="font-bold text-rose-600 dark:text-rose-500 text-lg">
                                ${Math.round(debt.remainingAmount).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </form>
        </div>

        <div className="p-8 bg-gray-50 dark:bg-slate-900/80 border-t border-gray-100 dark:border-slate-800 shrink-0">
          <button
            form="customer-form"
            disabled={loading}
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-blue-600/20 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Guardar Información'}
          </button>
        </div>
      </div>
    </div>
  );
}
