'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShoppingBag, Store, User, Mail, Lock, ArrowRight, Loader2, CheckCircle2, Eye, EyeOff } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    storeName: '',
    userName: '',
    email: '',
    password: '',
    modules: ['POS', 'CLOSURE', 'INVENTORY', 'REPORTS', 'SUPPLIERS', 'CUSTOMERS', 'CREDITS', 'REFUNDS', 'ACCOUNTING', 'ORDERS', 'RESTAURANT', 'WAITERS', 'CASHIER_MONITOR']
  });

  const modulesList = [
    { id: 'POS', name: 'Caja Registradora (POS)', description: 'Venta rápida e impresión de tickets' },
    { id: 'CLOSURE', name: 'Cierre de Caja', description: 'Control de turnos y arqueos' },
    { id: 'INVENTORY', name: 'Control de Inventario', description: 'Stock, categorías y alertas' },
    { id: 'REPORTS', name: 'Reportes y Estadísticas', description: 'Análisis de ventas y ganancias' },
    { id: 'SUPPLIERS', name: 'Proveedores y Gastos', description: 'Gestión de compras y facturas' },
    { id: 'CUSTOMERS', name: 'Base de Datos de Clientes', description: 'Historial y fidelización' },
    { id: 'CREDITS', name: 'Créditos (Cuentas por Cobrar)', description: 'Venta a crédito y abonos' },
    { id: 'REFUNDS', name: 'Devoluciones y Reembolsos', description: 'Gestión de cambios de productos' },
    { id: 'ACCOUNTING', name: 'Módulo Contable', description: 'Libro de ingresos y egresos' },
    { id: 'ORDERS', name: 'Gestión de Pedidos', description: 'Control de pedidos y entregas' },
    { id: 'RESTAURANT', name: 'Servicio a Mesas (Restaurante)', description: 'Comandas, mesas y cuentas' },
    { id: 'WAITERS', name: 'Gestión de Personal (Nombres/PIN)', description: 'Control de acceso y seguridad' },
    { id: 'CASHIER_MONITOR', name: 'Monitoreo de Cajeros', description: 'Supervisión de actividad en tiempo real' },
  ];

  const toggleModule = (id: string) => {
    setFormData(prev => ({
      ...prev,
      modules: prev.modules.includes(id) 
        ? prev.modules.filter(m => m !== id) 
        : [...prev.modules, id]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${apiUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const contentType = res.headers.get('content-type');
      if (res.ok) {
        if (contentType && contentType.includes('application/json')) {
          const data = await res.json();
          // Guardar sesión y redirigir
          localStorage.setItem('access_token', data.access_token);
          localStorage.setItem('user_role', data.user.role);
          localStorage.setItem('user_name', data.user.name);
          localStorage.setItem('tenant_modules', JSON.stringify(data.user.tenant_modules || []));
          setStep(4); // Paso de éxito
          setTimeout(() => {
            router.push('/dashboard');
          }, 2000);
        } else {
           throw new Error('Respuesta del servidor no es JSON');
        }
      } else {
        // ... err handling remains same ...
        if (contentType && contentType.includes('application/json')) {
          const err = await res.json();
          alert(`Error: ${err.message || 'No se pudo registrar el negocio'}`);
        } else {
          alert(`Error del Servidor: Código ${res.status}. Posible caída del Backend.`);
        }
      }
    } catch (error: any) {
      alert('Error de conexión: ' + (error.message || 'Fallo desconocido'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0f172a] flex flex-col justify-center items-center p-6">
      
      {/* Brand Header */}
      <Link href="/" className="flex items-center gap-2 mb-12 hover:opacity-80 transition-opacity">
        <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-600/20">
          <ShoppingBag className="w-6 h-6 text-white" />
        </div>
        <span className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter">
          Tiendeo<span className="text-blue-500">POS</span>
        </span>
      </Link>

      <div className={`w-full ${step === 3 ? 'max-w-2xl' : 'max-w-md'}`}>
        {/* Progress Bar */}
        <div className="flex justify-between mb-8 px-2">
            {[1, 2, 3, 4].map(i => (
                <div key={i} className={`h-1.5 flex-1 mx-1 rounded-full transition-all duration-500 ${step >= i ? 'bg-blue-600' : 'bg-gray-200 dark:bg-slate-800'}`} />
            ))}
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 md:p-10 shadow-2xl border border-gray-100 dark:border-slate-800 relative overflow-hidden transition-all duration-300">
          
          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="mb-8">
                <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-2">Tu Negocio</h2>
                <p className="text-gray-500 dark:text-gray-400 font-bold">Primero, ¿cómo se llama tu tienda?</p>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Nombre de la Tienda</label>
                  <div className="relative">
                    <Store className="absolute left-4 top-4 w-5 h-5 text-gray-400" />
                    <input 
                      type="text" 
                      placeholder="Ej. Tienda Las Margaritas"
                      value={formData.storeName}
                      onChange={(e) => setFormData({...formData, storeName: e.target.value})}
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-slate-800 border-0 rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all font-bold text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                </div>

                <button 
                  disabled={!formData.storeName}
                  onClick={() => setStep(2)}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-100 dark:disabled:bg-slate-800 disabled:text-gray-400 text-white py-4 rounded-2xl font-black text-lg transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center gap-2 group"
                >
                  Continuar <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <form onSubmit={(e) => { e.preventDefault(); setStep(3); }} className="animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="mb-8">
                <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-2">Tus Datos</h2>
                <p className="text-gray-500 dark:text-gray-400 font-bold">Configura tu usuario para administrar.</p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Nombre del Dueño</label>
                  <div className="relative">
                    <User className="absolute left-4 top-4 w-5 h-5 text-gray-400" />
                    <input 
                      type="text" 
                      placeholder="¿Quién eres?"
                      value={formData.userName}
                      onChange={(e) => setFormData({...formData, userName: e.target.value})}
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-slate-800 border-0 rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all font-bold text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Email de Acceso</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-4 w-5 h-5 text-gray-400" />
                    <input 
                      type="email" 
                      placeholder="admin@tu-tienda.com"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-slate-800 border-0 rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all font-bold text-gray-900 dark:text-white"
                      required
                      autoComplete="off"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Contraseña</label>
                  <div className="relative flex items-center">
                    <Lock className="absolute left-4 top-4 w-5 h-5 text-gray-400" />
                    <input 
                      type={showPassword ? "text" : "password"}
                      placeholder="********"
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      className="w-full pl-12 pr-12 py-4 bg-gray-50 dark:bg-slate-800 border-0 rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all font-bold text-gray-900 dark:text-white"
                      required
                      autoComplete="new-password"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                    <button 
                      type="button" 
                      onClick={() => setStep(1)}
                      className="px-6 py-4 rounded-2xl bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 font-bold hover:bg-gray-200"
                    >
                      Atrás
                    </button>
                    <button 
                      className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-black text-lg transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center gap-2"
                    >
                      Continuar a Módulos
                    </button>
                </div>
              </div>
            </form>
          )}

          {step === 3 && (
             <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="mb-6">
                  <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-2">Personaliza</h2>
                  <p className="text-gray-500 dark:text-gray-400 font-bold">¿Qué módulos necesita tu negocio hoy?</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
                  {modulesList.map(mod => (
                    <button
                      key={mod.id}
                      onClick={() => toggleModule(mod.id)}
                      className={`text-left p-4 rounded-2xl border-2 transition-all group ${formData.modules.includes(mod.id) ? 'border-blue-500 bg-blue-50/30 dark:bg-blue-500/10' : 'border-gray-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-900/30'}`}
                    >
                      <div className="flex items-center gap-3 mb-1">
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${formData.modules.includes(mod.id) ? 'bg-blue-600 border-blue-600' : 'border-gray-300 dark:border-slate-700'}`}>
                          {formData.modules.includes(mod.id) && <CheckCircle2 className="w-3 h-3 text-white" />}
                        </div>
                        <span className={`text-sm font-black ${formData.modules.includes(mod.id) ? 'text-blue-700 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>{mod.name}</span>
                      </div>
                      <p className="text-[10px] font-bold text-gray-400 group-hover:text-gray-500 transition-colors leading-tight">{mod.description}</p>
                    </button>
                  ))}
                </div>

                <div className="flex gap-3">
                    <button 
                      type="button" 
                      onClick={() => setStep(2)}
                      className="px-6 py-4 rounded-2xl bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 font-bold hover:bg-gray-200"
                    >
                      Atrás
                    </button>
                    <button 
                      disabled={loading || formData.modules.length === 0}
                      onClick={handleSubmit}
                      className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-black text-lg transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center gap-2"
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Finalizar Registro'}
                    </button>
                </div>
             </div>
          )}

          {step === 4 && (
            <div className="text-center py-10 animate-in zoom-in duration-500">
               <div className="mx-auto w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6 border-8 border-green-50 dark:border-green-900/10">
                 <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400" />
               </div>
               <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-2">¡Todo Listo!</h2>
               <p className="text-gray-500 dark:text-gray-400 font-bold max-w-xs mx-auto mb-8">
                 Tu negocio **{formData.storeName}** ha sido creado. Estamos redirigiéndote a tu dashboard...
               </p>
               <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto opacity-20" />
            </div>
          )}

        </div>
        
        <p className="mt-8 text-center text-sm font-bold text-gray-500">
          ¿Ya tienes una cuenta? <Link href="/login" className="text-blue-600 hover:underline">Inicia Sesión aquí</Link>
        </p>
      </div>
    </div>
  );
}
