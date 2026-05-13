'use client';
import { useState, useEffect } from 'react';
import { X, User, Phone, Mail, MapPin, CreditCard, Loader2, Banknote, ArrowDownCircle, CheckSquare, Square, DollarSign, ClipboardCheck, AlertTriangle } from 'lucide-react';
import { useOfflineStore } from '@/store/useOfflineStore';
import AbonoModal from './AbonoModal';
import { formatCurrency, parseCurrency } from '@/utils/formatters';


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
    description: '',
  });
  const [completedDebt, setCompletedDebt] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [debts, setDebts] = useState<any[]>([]);
  const [loadingDebts, setLoadingDebts] = useState(false);
  const [selectedCredit, setSelectedCredit] = useState<any>(null);
  const [isAbonoModalOpen, setIsAbonoModalOpen] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  // Bulk and Total Debt payment states
  const [selectedDebts, setSelectedDebts] = useState<string[]>([]);
  const [totalAbono, setTotalAbono] = useState('');
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);
  const [isProcessingTotalDebt, setIsProcessingTotalDebt] = useState(false);
  const [completedPayment, setCompletedPayment] = useState<any>(null);

  const totalDebt = debts.reduce((sum, d) => sum + Number(d.remainingAmount || 0), 0);

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || '',
        idNumber: customer.idNumber || '',
        phone: customer.phone || '',
        email: customer.email || '',
        address: customer.address || '',
        initialDebt: '',
        description: '',
      });
      setTotalAbono('');
      setSelectedDebts([]);
      setCompletedPayment(null);
      if (isOpen) fetchCustomerDebts();
    } else {
      setFormData({
        name: '',
        idNumber: '',
        phone: '',
        email: '',
        address: '',
        initialDebt: '',
        description: '',
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

  const handlePay = async (creditId: string) => {
    if (!confirm('¿Confirmar que el cliente ha pagado esta factura totalmente en efectivo?')) return;
    
    setProcessingId(creditId);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/sales/credits/${creditId}/pay`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const debtObj = debts.find(d => d.id === creditId);
        setCompletedPayment({
          amount: debtObj ? debtObj.remainingAmount : 0,
          customerName: customer?.name || 'Cliente',
          invoices: [{
            number: debtObj?.sale?.invoiceNumber || 'S/N',
            amount: debtObj ? debtObj.remainingAmount : 0
          }],
          date: new Date().toISOString()
        });
        fetchCustomerDebts();
        onSave(); // Refrescar lista principal también
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

  const handleBulkPay = async () => {
    if (selectedDebts.length === 0) return;
    if (!confirm(`¿Pagar totalmente las ${selectedDebts.length} facturas seleccionadas?`)) return;

    setIsProcessingBulk(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/sales/credits/bulk-pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ creditIds: selectedDebts })
      });

      if (res.ok) {
        const amount = selectedDebts.reduce((sum, id) => {
          const d = debts.find(x => x.id === id);
          return sum + (d ? Number(d.remainingAmount) : 0);
        }, 0);
        const invoiceDetails = selectedDebts.map(id => {
          const debt = debts.find(x => x.id === id);
          return {
            number: debt?.sale?.invoiceNumber || 'S/N',
            amount: debt ? Number(debt.remainingAmount) : 0
          };
        });
        setCompletedPayment({
          amount: amount,
          customerName: customer?.name || 'Cliente',
          invoices: invoiceDetails,
          date: new Date().toISOString()
        });
        setSelectedDebts([]);
        fetchCustomerDebts();
        onSave();
      } else {
        alert('Error al procesar pagos masivos');
      }
    } catch (e) {
      console.error(e);
      alert('Error de conexión');
    } finally {
      setIsProcessingBulk(false);
    }
  };

  // Distribution Preview Logic - MANUAL SELECTION MODE
  const calculateDistribution = () => {
    const amount = parseCurrency(totalAbono);
    const map: Record<string, number> = {};
    if (amount <= 0) return { map, count: 0, fullyCovered: 0, remaining: amount, isAllSelectedCovered: false };
    let remaining = amount;
    let count = 0;
    let fullyCovered = 0;

    // We use the order in which the user selected the invoices
    for (const debtId of selectedDebts) {
      const debt = debts.find(d => d.id === debtId);
      if (!debt || debt.remainingAmount <= 0) continue;

      const debtAmount = Number(debt.remainingAmount);
      const payment = Math.min(debtAmount, remaining);
      
      map[debtId] = payment;
      remaining -= payment;
      if (payment > 0) count++;
      if (payment >= debtAmount) fullyCovered++;
    }

    const isAllSelectedCovered = selectedDebts.length > 0 && fullyCovered === selectedDebts.length;

    return { map, count, fullyCovered, remaining, isAllSelectedCovered };
  };

  const distribution = calculateDistribution();

  const handlePayTotalDebt = async () => {
    const amount = parseCurrency(totalAbono);
    if (amount <= 0) return;
    
    if (selectedDebts.length === 0) {
      alert('Por favor, selecciona las facturas a las que deseas aplicar este abono.');
      return;
    }

    const payments = selectedDebts
      .map(id => ({ creditId: id, amount: (distribution.map as any)[id] || 0 }))
      .filter(p => p.amount > 0);

    if (payments.length === 0) {
      alert('No hay facturas seleccionadas con saldo pendiente suficiente para aplicar el abono.');
      return;
    }

    if (!confirm(`¿Aplicar abono manual de $${formatCurrency(amount)} a ${payments.length} facturas seleccionadas?`)) return;

    setIsProcessingTotalDebt(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/sales/credits/bulk-abono`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ payments })
      });

      if (res.ok) {
        if (distribution.isAllSelectedCovered && distribution.remaining > 0) {
          alert(`Abonos procesados. RECUERDA ENTREGAR EL CAMBIO: $${formatCurrency(distribution.remaining)}`);
        }
        
        const invoiceDetails = payments.map(p => {
          const debt = debts.find(d => d.id === p.creditId);
          return {
            number: debt?.sale?.invoiceNumber || 'S/N',
            amount: p.amount
          };
        });
        
        setCompletedPayment({
          amount: amount - distribution.remaining,
          customerName: customer?.name || 'Cliente',
          invoices: invoiceDetails,
          date: new Date().toISOString()
        });
        
        setTotalAbono('');
        setSelectedDebts([]);
        fetchCustomerDebts();
        onSave();
      } else {
        alert('Error al procesar los abonos manuales');
      }
    } catch (e) {
      console.error(e);
      alert('Error de conexión');
    } finally {
      setIsProcessingTotalDebt(false);
    }
  };

  const toggleSelectAll = () => {
    const pendingDebts = debts.filter(d => d.remainingAmount > 0).map(d => d.id);
    if (selectedDebts.length === pendingDebts.length && pendingDebts.length > 0) {
      setSelectedDebts([]);
    } else {
      setSelectedDebts(pendingDebts);
    }
  };

  const toggleDebtSelection = (id: string) => {
    if (selectedDebts.includes(id)) {
      setSelectedDebts(selectedDebts.filter(d => d !== id));
    } else {
      setSelectedDebts([...selectedDebts, id]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // VALIDACIÓN: Nombre y Teléfono obligatorios
    if (!formData.name || !formData.phone) {
      alert('El Nombre y el Teléfono son OBLIGATORIOS para registrar un cliente.');
      return;
    }

    // SMART SUBMIT: Prevent confusion if user filled an Abono and clicked Guardar
    const amountToPay = parseCurrency(totalAbono);
    if (amountToPay > 0 && selectedDebts.length > 0) {
      // Trigger the total debt payment instead of saving the customer
      await handlePayTotalDebt();
      return;
    } else if (amountToPay > 0 && selectedDebts.length === 0) {
      alert('Para registrar el abono, primero selecciona las facturas a pagar de la lista y luego presiona "Abonar".');
      return;
    } else if (selectedDebts.length > 0) {
      // User selected debts but didn't fill totalAbono
      alert('Tienes facturas seleccionadas. Si deseas saldarlas, presiona el botón azul "Pagar Seleccionados".');
      return;
    }

    if (Number(formData.initialDebt) > 0 && !formData.description) {
      alert('Debe ingresar una descripción para el saldo adicionado.');
      return;
    }

    setLoading(true);
    try {
      if (!isOnline && !customer) {
        // MODO OFFLINE - CREACIÓN
        const uuid = crypto.randomUUID();
        const localId = `temp-cust-${uuid}`;
        const newCustomer = {
          ...formData,
          initialDebt: Number(formData.initialDebt) || 0,
          id: localId,
          localId,
          totalDebt: Number(formData.initialDebt) || 0,
          pendingInvoices: 0
        };
        addPendingCustomer(newCustomer);
        
        if (newCustomer.initialDebt > 0) {
          setCompletedDebt({
            amount: newCustomer.initialDebt,
            description: formData.description,
            customerName: formData.name,
            date: new Date().toISOString()
          });
        } else {
          onSave();
          onClose();
        }
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
        if (Number(formData.initialDebt) > 0) {
          setCompletedDebt({
            amount: Number(formData.initialDebt),
            description: formData.description,
            customerName: formData.name || customer?.name,
            date: new Date().toISOString()
          });
          onSave();
        } else {
          onSave();
          onClose();
        }
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(`Error al guardar el cliente: ${errorData.message || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error(error);
      alert('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  if (completedDebt) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-300">
        <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="bg-rose-600 text-white p-4 text-center print:hidden">
            <h3 className="text-lg font-black uppercase tracking-wider">¡Saldo Adicionado!</h3>
            <p className="text-xs opacity-90 font-bold">Se ha registrado la nueva deuda</p>
          </div>
          
          <div className="bg-white p-4" style={{ margin: '0 auto', width: '58mm' }}>
            <pre 
              id="printable-debt-receipt" 
              className="bg-white text-black font-mono font-bold leading-tight whitespace-pre text-left print:p-0 print:m-0"
              style={{ fontSize: '10px', width: '100%', color: '#000000', fontWeight: 900 }}
            >
{`------------------------
      COMPROBANTE      
     DEUDA EXTERNA      
------------------------
Fecha: ${new Date(completedDebt.date).toLocaleDateString('es-CO')}
Hora:  ${new Date(completedDebt.date).toLocaleTimeString('es-CO')}

Cliente:
${completedDebt.customerName.substring(0,24)}

Detalle:
${completedDebt.description.substring(0,48)}

------------------------
VALOR ADICIONADO:
$${formatCurrency(completedDebt.amount)}
------------------------

Firma Cliente:


________________________
`}
            </pre>
          </div>

          <div className="p-4 bg-gray-50 border-t border-gray-200 flex gap-3 print:hidden">
            <button 
              onClick={() => { setCompletedDebt(null); onClose(); }} 
              className="flex-1 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-xl transition-colors"
            >
              Cerrar
            </button>
            <button 
              onClick={() => window.print()} 
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition-colors"
            >
              🖨️ Imprimir
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (completedPayment) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-300">
        <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="bg-emerald-600 text-white p-4 text-center print:hidden">
            <h3 className="text-lg font-black uppercase tracking-wider">¡Pago Registrado!</h3>
            <p className="text-xs opacity-90 font-bold">La transacción fue exitosa</p>
          </div>
          
          <div className="bg-white p-4" style={{ margin: '0 auto', width: '58mm' }}>
            <pre 
              id="printable-receipt" 
              className="bg-white text-black font-mono font-bold leading-tight whitespace-pre text-left print:p-0 print:m-0"
              style={{ fontSize: '10px', width: '100%', color: '#000000', fontWeight: 900 }}
            >
{`------------------------
      RECIBO DE PAGO      
------------------------
Fecha: ${new Date(completedPayment.date).toLocaleDateString('es-CO')}
Hora:  ${new Date(completedPayment.date).toLocaleTimeString('es-CO')}

Cliente:
${completedPayment.customerName.substring(0,24)}

Factura(s):
${completedPayment.invoices.length > 20 
  ? `${completedPayment.invoices.length} Facturas` 
  : completedPayment.invoices.map((inv: any) => `${inv.number.padEnd(14)} $${formatCurrency(inv.amount)}`).join('\n')}

------------------------
TOTAL PAGO: $${formatCurrency(completedPayment.amount)}
------------------------

¡Gracias por su pago!
`}
            </pre>
          </div>

          <div className="p-4 bg-gray-50 border-t border-gray-200 flex gap-3 print:hidden">
            <button 
              onClick={() => { setCompletedPayment(null); onClose(); }} 
              className="flex-1 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-xl transition-colors"
            >
              Cerrar
            </button>
            <button 
              onClick={() => window.print()} 
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition-colors"
            >
              🖨️ Imprimir
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200 max-h-[95vh] flex flex-col">
        <div className="px-8 py-6 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gray-50/50 dark:bg-slate-900/50 shrink-0">
          <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-600/20">
              <User className="w-5 h-5 text-white" />
            </div>
            <div className="flex items-center flex-wrap gap-3">
              <span>{customer ? 'Editar Cliente' : 'Nuevo Cliente'}</span>
              {customer && totalDebt > 0 && (
                <span className="px-3 py-1 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-lg text-sm font-black uppercase tracking-widest shadow-sm border border-rose-200 dark:border-rose-800">
                  Deuda Activa: ${formatCurrency(totalDebt)}
                </span>
              )}
            </div>
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
                    placeholder="Teléfono (Obligatorio)"
                    className="w-full bg-white dark:bg-slate-800 text-black dark:text-white border-2 border-blue-500/30 dark:border-blue-500/20 rounded-2xl pl-12 pr-4 py-3.5 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all font-bold"
                    value={formData.phone}
                    required
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
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                    <CreditCard className="w-4 h-4" />
                    <span className="text-xs font-black uppercase tracking-widest">Añadir Saldo Pendiente (Opcional)</span>
                  </div>
                  {Number(formData.initialDebt) > 0 && !formData.description && (
                     <div className="flex items-center gap-1.5 bg-rose-600 text-white px-2 py-1 rounded-lg animate-bounce shadow-lg">
                        <AlertTriangle className="w-3 h-3" />
                        <span className="text-[9px] font-black uppercase">¡Falta Detalle!</span>
                     </div>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="Ej: 50.000"
                  className="w-full bg-white dark:bg-slate-900 text-black dark:text-white border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-rose-500/50 outline-none transition-all font-black text-lg"
                  value={formatCurrency(formData.initialDebt)}
                  onChange={(e) => setFormData({ ...formData, initialDebt: parseCurrency(e.target.value).toString() })}
                />
                
                {Number(formData.initialDebt) > 0 && (
                  <div className="mt-4 p-4 bg-rose-50/50 dark:bg-rose-900/10 rounded-2xl border-2 border-rose-200 dark:border-rose-900/30 animate-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="bg-rose-600 text-white p-1 rounded-lg">
                        <AlertTriangle className="w-3 h-3" />
                      </div>
                      <p className="text-[11px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest">Descripción del saldo a añadir (Obligatorio)</p>
                    </div>
                    <textarea
                      required
                      placeholder="Indique el motivo o detalle de esta deuda... Ejemplo: 'Venta de cerveza y shampoo del domingo'"
                      className="w-full bg-white dark:bg-slate-900 text-black dark:text-white border border-rose-200 dark:border-rose-800 rounded-xl px-4 py-3 focus:ring-2 focus:ring-rose-500/50 outline-none transition-all font-bold text-sm resize-none placeholder:text-gray-400"
                      rows={2}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                    <p className="text-[9px] text-rose-500 font-bold mt-2 italic px-1">
                      * Este detalle aparecerá en el recibo y en el estado de cuenta del cliente.
                    </p>
                  </div>
                )}
                
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

                {/* TOTAL DEBT PAYMENT BOX */}
                {debts.some(d => d.remainingAmount > 0) && (
                   <div className="mb-6 p-5 bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2rem] border border-slate-700 shadow-xl overflow-hidden relative group">
                      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                         <DollarSign className="w-16 h-16 text-emerald-400" />
                      </div>
                      <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-3 text-emerald-400">
                          <Banknote className="w-4 h-4" />
                          <span className="text-xs font-black uppercase tracking-widest">Abono a Deuda Total</span>
                        </div>
                        <div className="flex gap-3">
                          <div className="relative flex-1">
                             <DollarSign className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                             <input
                              type="text"
                              placeholder="Monto a abonar..."
                              className="w-full bg-slate-950/50 text-white border border-slate-700 rounded-2xl pl-12 pr-4 py-3.5 focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all font-black text-lg placeholder:text-slate-600"
                              value={formatCurrency(totalAbono)}
                              onChange={(e) => setTotalAbono(parseCurrency(e.target.value).toString())}
                            />
                          </div>
                          <button
                            type="button"
                            disabled={isProcessingTotalDebt || !totalAbono || totalAbono === '0'}
                            onClick={handlePayTotalDebt}
                            className="px-6 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:grayscale"
                          >
                            {isProcessingTotalDebt ? <Loader2 className="w-5 h-5 animate-spin" /> : <ClipboardCheck className="w-5 h-5" />}
                            <span>Abonar</span>
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-3 italic">
                          * El sistema distribuirá este monto automáticamente entre las facturas más antiguas.
                        </p>

                        {/* PREVIEW SUMMARY */}
                        {parseCurrency(totalAbono) > 0 && (
                          <div className="mt-4 p-4 bg-slate-950/40 rounded-2xl border border-slate-700/50 animate-in fade-in slide-in-from-top-2 duration-300">
                             <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${distribution.isAllSelectedCovered ? 'bg-amber-500 animate-pulse' : distribution.remaining > 0 ? 'bg-blue-500' : 'bg-emerald-500'}`}>
                                    {distribution.isAllSelectedCovered ? <ArrowDownCircle className="w-4 h-4 rotate-180" /> : <DollarSign className="w-4 h-4" />}
                                  </div>
                                  <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                      {distribution.isAllSelectedCovered ? 'Cambio a Devolver' : 'Saldo Disponible'}
                                    </p>
                                    <p className={`text-sm font-black ${distribution.isAllSelectedCovered ? 'text-amber-400' : distribution.remaining > 0 ? 'text-blue-400' : 'text-emerald-400'}`}>
                                      ${formatCurrency(distribution.remaining)}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Facturas a Pagar</p>
                                  <p className="text-sm font-black text-white">{distribution.count}</p>
                                </div>
                             </div>
                             
                             {selectedDebts.length === 0 ? (
                               <p className="text-[10px] text-amber-400 font-bold italic animate-pulse">
                                 * Selecciona las facturas de la lista para asignarles este abono.
                               </p>
                             ) : (
                               <p className="text-xs text-slate-300">
                                 Se saldarán <span className="text-emerald-400 font-black">{distribution.fullyCovered}</span> facturas completamente.
                               </p>
                             )}
                          </div>
                        )}
                      </div>
                   </div>
                )}

                {/* BULK ACTIONS HEADER */}
                {debts.filter(d => d.remainingAmount > 0).length > 1 && (
                  <div className="flex items-center justify-between mb-4 px-2">
                    <button 
                      type="button"
                      onClick={toggleSelectAll}
                      className="flex items-center gap-2 text-xs font-black text-slate-500 hover:text-blue-600 transition-colors uppercase tracking-widest"
                    >
                      {selectedDebts.length === debts.filter(d => d.remainingAmount > 0).length ? (
                        <CheckSquare className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                      Seleccionar Todo ({debts.filter(d => d.remainingAmount > 0).length})
                    </button>

                    {selectedDebts.length > 0 && (
                      <button
                        type="button"
                        disabled={isProcessingBulk}
                        onClick={handleBulkPay}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition-all animate-in slide-in-from-right-4"
                      >
                        {isProcessingBulk ? <Loader2 className="w-4 h-4 animate-spin" /> : <Banknote className="w-4 h-4" />}
                        Pagar Seleccionados ({selectedDebts.length})
                      </button>
                    )}
                  </div>
                )}

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
                      const previewAmount = distribution.map[debt.id] || 0;
                      const isAffected = previewAmount > 0;
                      const isFullyCoveredByPreview = previewAmount >= Number(debt.remainingAmount);

                      return (
                        <div key={debt.id} className={`p-4 rounded-2xl border transition-all duration-300 relative overflow-hidden ${
                          isAffected 
                            ? 'bg-emerald-50/30 dark:bg-emerald-900/10 border-emerald-500/50 shadow-lg shadow-emerald-500/5' 
                            : selectedDebts.includes(debt.id) 
                              ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800 shadow-md' 
                              : 'bg-gray-50 dark:bg-slate-800/80 border-gray-100 dark:border-slate-700'
                        }`}>
                          
                          {/* PREVIEW INDICATOR */}
                          {isAffected && (
                            <div className="absolute top-0 right-0 px-4 py-1 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-bl-xl shadow-sm animate-in slide-in-from-right-full duration-300">
                              {isFullyCoveredByPreview ? 'Saldará Total' : `Abonará $${formatCurrency(previewAmount)}`}
                            </div>
                          )}

                          <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                               {debt.remainingAmount > 0 && (
                                 <button
                                  type="button"
                                  onClick={() => toggleDebtSelection(debt.id)}
                                  className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors"
                                 >
                                   {selectedDebts.includes(debt.id) ? (
                                      <CheckSquare className="w-5 h-5 text-blue-600" />
                                   ) : (
                                      <Square className="w-5 h-5 text-gray-300 dark:text-slate-600" />
                                   )}
                                 </button>
                               )}
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
                                  ${formatCurrency(debt.amount)}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Abonado</p>
                                <p className="font-bold text-emerald-600 dark:text-emerald-400">
                                  ${formatCurrency(totalPaid)}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Saldo</p>
                                <p className="font-bold text-rose-600 dark:text-rose-500 text-lg">
                                  ${formatCurrency(debt.remainingAmount)}
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          {/* Payment Actions */}
                          {debt.remainingAmount > 0 && (
                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-200 dark:border-slate-700">
                              <button
                                type="button"
                                onClick={() => { setSelectedCredit(debt); setIsAbonoModalOpen(true); }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                              >
                                <ArrowDownCircle className="w-3.5 h-3.5" />
                                Abonar
                              </button>
                              <button
                                type="button"
                                disabled={processingId === debt.id}
                                onClick={() => handlePay(debt.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all shadow-sm disabled:opacity-50"
                              >
                                {processingId === debt.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Banknote className="w-3.5 h-3.5" />}
                                Pagar Total
                              </button>
                            </div>
                          )}
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
      
      <AbonoModal 
        isOpen={isAbonoModalOpen}
        onClose={() => setIsAbonoModalOpen(false)}
        onSave={() => { fetchCustomerDebts(); onSave(); }}
        credit={selectedCredit}
      />
    </div>
  );
}
