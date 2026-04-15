'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield, Users, Store, Search, Key, LogOut, ExternalLink, Activity, Plus, Database, ArrowLeft, Trash2, AlertTriangle, Check, RefreshCcw, Menu, X, ToggleRight, ToggleLeft, Power } from 'lucide-react';
import BackupsManager from '@/components/admin/BackupsManager';

export default function SuperAdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('tenants');
  const [tenants, setTenants] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedTenantForReset, setSelectedTenantForReset] = useState<any>(null);
  const [adminResetConfirmText, setAdminResetConfirmText] = useState('');
  const [isResettingData, setIsResettingData] = useState(false);
  const [resetOptions, setResetOptions] = useState({
    cleanSales: true,
    cleanCredits: true,
    cleanCashClosures: true,
    cleanRefunds: true,
    cleanSupplierInvoices: false
  });
  const [isCleaningData, setIsCleaningData] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [newPassword, setNewPassword] = useState('');
  const [isModulesModalOpen, setIsModulesModalOpen] = useState(false);
  const [selectedTenantForModules, setSelectedTenantForModules] = useState<any>(null);
  const [editingModules, setEditingModules] = useState<string[]>([]);
  const [isSavingModules, setIsSavingModules] = useState(false);

  const ALL_MODULES = [
    { id: 'POS', name: 'Caja Registradora (POS)' },
    { id: 'CLOSURE', name: 'Cierre de Caja' },
    { id: 'INVENTORY', name: 'Control de Inventario' },
    { id: 'REPORTS', name: 'Reportes y Estadísticas' },
    { id: 'SUPPLIERS', name: 'Proveedores y Gastos' },
    { id: 'CUSTOMERS', name: 'Base de Clientes' },
    { id: 'CREDITS', name: 'Créditos (Cuentas por Cobrar)' },
    { id: 'REFUNDS', name: 'Devoluciones y Reembolsos' },
    { id: 'ACCOUNTING', name: 'Módulo Contable' },
    { id: 'RESTAURANT', name: 'Servicio a Mesas (Restaurante)' },
  ];

  const openModulesModal = (tenant: any) => {
    const defaultModules = ['POS', 'CLOSURE', 'INVENTORY', 'REPORTS', 'SUPPLIERS', 'CUSTOMERS', 'CREDITS', 'REFUNDS', 'ACCOUNTING'];
    setSelectedTenantForModules(tenant);
    setEditingModules(tenant.modules || defaultModules);
    setIsModulesModalOpen(true);
  };

  const handleSaveModules = async () => {
    setIsSavingModules(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/admin/tenants/${selectedTenantForModules.id}/modules`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ modules: editingModules })
      });
      if (res.ok) {
        setIsModulesModalOpen(false);
        fetchData(); // refresh tenant list
        alert('Módulos actualizados correctamente');
      } else {
        alert('Error al actualizar módulos');
      }
    } catch (e) {
      alert('Error de conexión');
    } finally {
      setIsSavingModules(false);
    }
  };

  useEffect(() => {
    const role = localStorage.getItem('user_role');
    if (role !== 'SUPER_ADMIN') {
      router.push('/dashboard');
      return;
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const [tenantsRes, usersRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/admin/tenants`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/admin/users`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (tenantsRes.ok) setTenants(await tenantsRes.json());
      if (usersRes.ok) setUsers(await usersRes.json());
    } catch (error) {
      console.error('Error fetching admin data', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword) return;
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/admin/users/${selectedUser.id}/reset-password`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ newPassword })
      });

      if (res.ok) {
        alert('Contraseña restablecida correctamente');
        setIsResetModalOpen(false);
        setNewPassword('');
      } else {
        alert('Error al restablecer contraseña');
      }
    } catch (error) {
      alert('Error de conexión');
    }
  };

  const handleAdminResetData = async () => {
    if (adminResetConfirmText !== 'REINICIAR_SISTEMA_GLOBAL') {
      alert('Error: Escriba la frase de confirmación exacta.');
      return;
    }

    setIsResettingData(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/maintenance/admin-reset/${selectedTenantForReset.id}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          confirmText: adminResetConfirmText,
          ...resetOptions
        })
      });

      if (res.ok) {
        const data = await res.json();
        alert(data.message || 'Limpieza completada con éxito');
        setIsMaintenanceModalOpen(false);
        setAdminResetConfirmText('');
      } else {
        const err = await res.json();
        alert(`Error: ${err.message || 'No se pudo completar la limpieza'}`);
      }
    } catch (error) {
      alert('Error de conexión');
    } finally {
      setIsResettingData(false);
    }
  };

  const handleAdminCleanupDuplicates = async () => {
    if (!confirm(`Este proceso eliminará los registros de ventas duplicados para ${selectedTenantForReset?.name} (manteniendo el más reciente). ¿Deseas continuar?`)) return;
    
    setIsCleaningData(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/maintenance/admin-cleanup-duplicates/${selectedTenantForReset.id}`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}` 
        }
      });

      if (res.ok) {
        const data = await res.json();
        alert(data.message || 'Limpieza completada con éxito');
      } else {
        const err = await res.json();
        alert(`Error: ${err.message || 'No se pudo realizar la limpieza'}`);
      }
    } catch (error) {
      alert('Error de conexión');
    } finally {
      setIsCleaningData(false);
    }
  };

  const handleToggleTenantStatus = async (tenantId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/tenants/${tenantId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({ isActive: !currentStatus })
      });

      if (response.ok) {
        setTenants(prev => prev.map(t => t.id === tenantId ? { ...t, isActive: !currentStatus } : t));
      } else {
        const err = await response.json();
        alert(`Error al actualizar estado: ${err.message}`);
      }
    } catch (error) {
      console.error('Error toggling tenant status:', error);
      alert('Error de conexión al actualizar el estado del negocio');
    }
  };

  const logout = () => {
    localStorage.clear();
    router.push('/login');
  };

  const filteredTenants = tenants.filter((t: any) => t.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredUsers = users.filter((u: any) => u.email.toLowerCase().includes(searchQuery.toLowerCase()) || u.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="min-h-screen bg-[#050510] text-gray-300 font-sans selection:bg-blue-500/30">
      
      {/* Mobile Sidebar Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`fixed left-0 top-0 bottom-0 w-72 bg-[#0a0a1a] border-r border-white/5 p-6 flex flex-col z-50 transform transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="flex items-center justify-between gap-3 mb-10 px-2 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight">TIENDEO <span className="text-blue-500">PRO</span></h1>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">SuperAdmin Console</p>
            </div>
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)} title="Cerrar menú" aria-label="Cerrar menú" className="md:hidden p-2 text-gray-500 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 space-y-2">
          <button 
            onClick={() => setActiveTab('tenants')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'tenants' ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20' : 'hover:bg-white/5 text-gray-400'}`}
          >
            <Store className="w-5 h-5" />
            Negocios / Clientes
          </button>
          
          <button 
            onClick={() => setActiveTab('users')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'users' ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20' : 'hover:bg-white/5 text-gray-400'}`}
          >
            <Users className="w-5 h-5" />
            Usuarios Globales
          </button>

          <button 
            onClick={() => setActiveTab('backups')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'backups' ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20' : 'hover:bg-white/5 text-gray-400'}`}
          >
            <Database className="w-5 h-5" />
            Respaldos Globales
          </button>

          <div className="pt-4 mt-4 border-t border-white/5">
            <Link 
              href="/register"
              className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl font-black transition-all bg-rose-600 text-white shadow-2xl shadow-rose-600/30 hover:bg-rose-500 hover:scale-[1.02] active:scale-95"
            >
              <Plus className="w-6 h-6" />
              CREAR NEGOCIO
            </Link>
          </div>
        </nav>

        <button 
          onClick={() => router.push('/dashboard')}
          className="mt-auto flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-blue-400 hover:bg-blue-500/10 transition-all border border-blue-500/20"
        >
          <ArrowLeft className="w-5 h-5" />
          Volver al Dashboard
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="md:pl-72 p-4 md:p-10 max-w-[1600px] mx-auto pt-24 md:pt-10">
        
        {/* Mobile Header Toggle */}
        <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[#0a0a1a]/90 backdrop-blur-xl border-b border-white/5 z-30 flex items-center px-4">
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            title="Abrir menú"
            aria-label="Abrir menú"
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="ml-2 font-black text-white tracking-tight">TIENDEO <span className="text-blue-500">PRO</span></div>
        </div>

        {/* Header Section */}
        <header className="flex flex-col md:flex-row justify-between md:items-end gap-6 mb-8 md:mb-12">
          <div>
            <h2 className="text-4xl font-black text-white mb-2">Panel de Control <span className="text-gray-600 italic font-medium">Global</span></h2>
            <p className="text-gray-500 font-medium">Gestiona todos los negocios y usuarios en la red Tiendeo.</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-[10px] uppercase font-black tracking-widest text-blue-500 mb-1">Estado del Sistema</p>
              <div className="flex items-center gap-2 justify-end">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-bold text-white">Cloud Sync Online</span>
              </div>
            </div>
          </div>
        </header>

        {/* Global Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-10">
           <div className="bg-[#0a0a1a] border border-white/5 p-6 rounded-3xl shadow-sm">
              <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-4">
                <Store className="w-6 h-6 text-blue-500" />
              </div>
              <p className="text-gray-500 font-bold text-xs uppercase mb-1">Total Negocios</p>
              <h4 className="text-3xl font-black text-white">{tenants.length}</h4>
           </div>
           <div className="bg-[#0a0a1a] border border-white/5 p-6 rounded-3xl shadow-sm">
              <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-purple-500" />
              </div>
              <p className="text-gray-500 font-bold text-xs uppercase mb-1">Usuarios Activos</p>
              <h4 className="text-3xl font-black text-white">{users.length}</h4>
           </div>
           <div className="bg-[#0a0a1a] border border-white/5 p-6 rounded-3xl shadow-sm">
              <div className="w-12 h-12 bg-green-500/10 rounded-2xl flex items-center justify-center mb-4">
                <Activity className="w-6 h-6 text-green-500" />
              </div>
              <p className="text-gray-500 font-bold text-xs uppercase mb-1">uptime Global</p>
              <h4 className="text-3xl font-black text-white">99.9%</h4>
           </div>
           <div className="bg-[#0a0a1a] border border-white/5 p-6 rounded-3xl shadow-sm bg-gradient-to-br from-blue-600/5 to-transparent">
              <div className="w-12 h-12 bg-yellow-500/10 rounded-2xl flex items-center justify-center mb-4">
                <ExternalLink className="w-6 h-6 text-yellow-500" />
              </div>
              <p className="text-gray-500 font-bold text-xs uppercase mb-1">Acceso Directo</p>
              <h4 className="text-xl font-black text-white">Tiendeo Portal</h4>
           </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-8 group">
          <Search className="absolute left-6 top-5 text-gray-600 group-focus-within:text-blue-500 transition-colors" />
          <input 
            type="text" 
            placeholder={activeTab === 'tenants' ? "Buscar por nombre de negocio..." : "Buscar por nombre o email de usuario..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0a0a1a] border-0 rounded-3xl pl-16 pr-6 py-5 focus:ring-2 focus:ring-blue-500/50 text-lg font-medium tracking-tight placeholder-gray-700 transition-all shadow-xl"
          />
        </div>

        {/* Lists Container */}
        <div className={`${activeTab === 'backups' ? '' : 'bg-[#0a0a1a] border border-white/5 rounded-3xl md:rounded-[40px] overflow-hidden shadow-2xl'}`}>
          {activeTab === 'tenants' ? (
            <div className="overflow-x-auto pb-4">
              <table className="w-full text-left min-w-[900px]">
              {/* ... table content remains the same ... */}
              <thead>
                <tr className="bg-white/5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                  <th className="px-8 py-6">ID Sistema / Tenant</th>
                  <th className="px-8 py-6">Nombre de la Tienda</th>
                  <th className="px-8 py-6">Usuarios</th>
                  <th className="px-8 py-6">Fecha Creación</th>
                  <th className="px-8 py-6">Estado</th>
                  <th className="px-8 py-6">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredTenants.map((t: any) => (
                  <tr key={t.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-8 py-6 text-xs font-mono text-gray-600 group-hover:text-blue-500 transition-colors">{t.id}</td>
                    <td className="px-8 py-6 font-black text-white text-lg">{t.name}</td>
                    <td className="px-8 py-6">
                      <span className="bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest">{t.userCount} Empleados</span>
                    </td>
                    <td className="px-8 py-6 text-sm font-medium text-gray-500">{new Date(t.createdAt).toLocaleDateString()}</td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${t.isActive !== false ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]'}`}></span>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${t.isActive !== false ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {t.isActive !== false ? 'Activo' : 'Suspendido'}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => handleToggleTenantStatus(t.id, t.isActive !== false)}
                          className={`p-2 rounded-lg transition-all ${t.isActive !== false ? 'text-gray-400 hover:text-rose-500 hover:bg-rose-500/10' : 'text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10'}`}
                          title={t.isActive !== false ? "Suspender Negocio" : "Activar Negocio"}
                        >
                          <Power className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => openModulesModal(t)}
                          className="text-blue-400 hover:text-blue-300 transition-colors p-2 hover:bg-blue-500/10 rounded-lg" 
                          title="Configurar Módulos del Negocio"
                        >
                          <ToggleRight className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => { setSelectedTenantForReset(t); setIsMaintenanceModalOpen(true); }}
                          className="text-rose-500 hover:text-rose-400 transition-colors p-2 hover:bg-rose-500/10 rounded-lg" 
                          title="Mantenimiento / Limpieza de Datos"
                        >
                          <RefreshCcw className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          ) : activeTab === 'users' ? (
            <div className="overflow-x-auto pb-4">
              <table className="w-full text-left min-w-[900px]">
              {/* ... table content remains the same ... */}
              <thead>
                <tr className="bg-white/5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                  <th className="px-8 py-6">Nombre Usuario</th>
                  <th className="px-8 py-6">Email / Acceso</th>
                  <th className="px-8 py-6">Negocio</th>
                  <th className="px-8 py-6">Rol</th>
                  <th className="px-8 py-6">Recuperación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredUsers.map((u: any) => (
                  <tr key={u.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-8 py-6 font-black text-white text-lg">{u.name}</td>
                    <td className="px-8 py-6 text-sm font-medium text-blue-400">{u.email}</td>
                    <td className="px-8 py-6 font-bold text-gray-400 uppercase tracking-tight">{u.tenant?.name || 'Sistema Core'}</td>
                    <td className="px-8 py-6">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${u.role === 'SUPER_ADMIN' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : u.role === 'OWNER' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-gray-800 text-gray-400 border border-white/5'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <button 
                        onClick={() => { setSelectedUser(u); setIsResetModalOpen(true); }}
                        className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all border border-white/5"
                      >
                        <Key className="w-4 h-4" />
                        Reset PWD
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          ) : (
            <div className="p-8">
              <BackupsManager />
            </div>
          )}
        </div>
      </main>

      {/* Reset Password Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0a0a1a] border border-white/10 w-full max-w-md rounded-[40px] p-10 shadow-3xl animate-in zoom-in-95 duration-200">
            <h3 className="text-3xl font-black text-white mb-2">Restablecer</h3>
            <p className="text-gray-500 mb-8 font-medium italic">Acción de recuperación global para: <span className="text-blue-400">{selectedUser?.email}</span></p>
            
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3">Nueva Contraseña Temporal</label>
                <input 
                  type="password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Ej. Pass2024!"
                  className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 focus:ring-2 focus:ring-blue-500/50 text-white font-bold transition-all"
                />
              </div>
            </div>

            <div className="flex gap-4 mt-10">
              <button 
                onClick={() => setIsResetModalOpen(false)}
                className="flex-1 px-6 py-4 rounded-2xl font-black text-gray-500 hover:bg-white/5 transition-all text-sm uppercase tracking-widest"
              >
                Cancelar
              </button>
              <button 
                onClick={handleResetPassword}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-2xl font-black shadow-xl shadow-blue-500/20 transition-all text-sm uppercase tracking-widest"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Maintenance / Reset Modal */}
      {isMaintenanceModalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-50 flex items-center justify-center p-4">
          <div className="bg-[#0a0a1a] border border-white/10 w-full max-w-2xl rounded-[40px] shadow-3xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-10 bg-gradient-to-b from-rose-500/10 to-transparent">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 bg-rose-500/20 rounded-2xl flex items-center justify-center">
                  <RefreshCcw className="w-8 h-8 text-rose-500" />
                </div>
                <div>
                  <h3 className="text-3xl font-black text-white italic">Mantenimiento de Datos</h3>
                  <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Tienda: <span className="text-rose-500">{selectedTenantForReset?.name}</span></p>
                </div>
              </div>

              <div className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-6 mb-8">
                <div className="flex gap-4">
                  <AlertTriangle className="w-6 h-6 text-rose-500 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-white mb-1">¡ADVERTENCIA DE SEGURIDAD!</p>
                    <p className="text-xs text-rose-200/60 leading-relaxed font-medium">
                      Esta herramienta permite reiniciar contadores y borrar registros históricos. **Esta acción es irreversible**. 
                      Las facturas de proveedores están protegidas por defecto.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-10">
                <label className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/5 cursor-pointer hover:bg-white/10 transition-all">
                  <input 
                    type="checkbox" 
                    className="w-5 h-5 rounded border-gray-700 bg-gray-800 text-blue-600 focus:ring-blue-500"
                    checked={resetOptions.cleanSales} 
                    onChange={e => setResetOptions({...resetOptions, cleanSales: e.target.checked})}
                  />
                  <div>
                    <p className="text-sm font-bold text-white">Ventas</p>
                    <p className="text-[10px] text-gray-500 uppercase font-black">Historial de Caja y Facturación</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/5 cursor-pointer hover:bg-white/10 transition-all">
                  <input 
                    type="checkbox" 
                    className="w-5 h-5 rounded border-gray-700 bg-gray-800 text-blue-600 focus:ring-blue-500"
                    checked={resetOptions.cleanCredits} 
                    onChange={e => setResetOptions({...resetOptions, cleanCredits: e.target.checked})}
                  />
                  <div>
                    <p className="text-sm font-bold text-white">Créditos y Abonos</p>
                    <p className="text-[10px] text-gray-500 uppercase font-black">Cuentas por Cobrar de Clientes</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/5 cursor-pointer hover:bg-white/10 transition-all">
                  <input 
                    type="checkbox" 
                    className="w-5 h-5 rounded border-gray-700 bg-gray-800 text-blue-600 focus:ring-blue-500"
                    checked={resetOptions.cleanCashClosures} 
                    onChange={e => setResetOptions({...resetOptions, cleanCashClosures: e.target.checked})}
                  />
                  <div>
                    <p className="text-sm font-bold text-white">Cierres de Caja</p>
                    <p className="text-[10px] text-gray-500 uppercase font-black">Reportes Daily</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/5 cursor-pointer hover:bg-white/10 transition-all">
                  <input 
                    type="checkbox" 
                    className="w-5 h-5 rounded border-gray-700 bg-gray-800 text-blue-600 focus:ring-blue-500"
                    checked={resetOptions.cleanRefunds} 
                    onChange={e => setResetOptions({...resetOptions, cleanRefunds: e.target.checked})}
                  />
                  <div>
                    <p className="text-sm font-bold text-white">Devoluciones</p>
                    <p className="text-[10px] text-gray-500 uppercase font-black">Log de Reembolsos</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-4 bg-rose-500/5 rounded-2xl border border-rose-500/20 cursor-pointer hover:bg-rose-500/10 transition-all col-span-2">
                  <input 
                    type="checkbox" 
                    className="w-5 h-5 rounded border-rose-900 bg-gray-800 text-rose-600 focus:ring-rose-500"
                    checked={resetOptions.cleanSupplierInvoices} 
                    onChange={e => setResetOptions({...resetOptions, cleanSupplierInvoices: e.target.checked})}
                  />
                  <div>
                    <p className="text-sm font-bold text-rose-500">Limpiar Facturas de Proveedores (Gastos/Costos)</p>
                    <p className="text-[10px] text-rose-700 uppercase font-black tracking-tight">¡CUIDADO! Esta opción borra todos los gastos. Usar solo si es estrictamente necesario.</p>
                  </div>
                </label>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-4 text-center">Escriba para confirmar ejecución: <span className="text-rose-500">REINICIAR_SISTEMA_GLOBAL</span></label>
                  <input 
                    type="text" 
                    value={adminResetConfirmText}
                    onChange={(e) => setAdminResetConfirmText(e.target.value)}
                    placeholder="Frase de seguridad obligatoria"
                    className="w-full bg-white/5 border border-white/5 rounded-3xl px-8 py-5 focus:ring-2 focus:ring-rose-500/50 text-white font-black text-center text-xl tracking-tight transition-all"
                  />
                </div>
              </div>

              <div className="flex gap-4 mt-12 bg-white/5 -mx-10 -mb-10 p-8 border-t border-white/5">
                <button 
                  onClick={() => setIsMaintenanceModalOpen(false)}
                  className="flex-1 px-6 py-4 rounded-2xl font-black text-gray-400 hover:bg-white/5 transition-all text-xs uppercase tracking-widest"
                >
                  Mejor No, Cancelar
                </button>
                
                <button 
                  onClick={handleAdminCleanupDuplicates}
                  disabled={isCleaningData || isResettingData}
                  className="flex-1 bg-orange-600/20 hover:bg-orange-600/40 text-orange-400 border border-orange-500/20 px-6 py-4 rounded-2xl font-black transition-all text-xs uppercase tracking-widest disabled:opacity-50"
                >
                  {isCleaningData ? 'Limpiando...' : 'Limpiar Duplicados'}
                </button>

                <button 
                  onClick={handleAdminResetData}
                  disabled={isResettingData || isCleaningData || adminResetConfirmText !== 'REINICIAR_SISTEMA_GLOBAL' || Object.values(resetOptions).every(v => !v)}
                  className="flex-[2] bg-rose-600 hover:bg-rose-700 text-white px-6 py-4 rounded-2xl font-black shadow-2xl shadow-rose-600/30 transition-all text-sm uppercase tracking-widest disabled:bg-gray-800 disabled:text-gray-600 disabled:shadow-none"
                >
                  {isResettingData ? 'VACIANDO BASE DE DATOS...' : 'EJECUTAR REINICIO'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modules Configuration Modal */}
      {isModulesModalOpen && selectedTenantForModules && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0a0a1a] border border-white/10 w-full max-w-xl rounded-[40px] p-10 shadow-3xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center">
                <ToggleRight className="w-7 h-7 text-blue-400" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-white">Módulos del Negocio</h3>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{selectedTenantForModules.name}</p>
              </div>
            </div>
            <p className="text-gray-500 text-sm font-medium mb-6">Activa o desactiva las funciones que este negocio puede usar. El menú lateral del negocio se actualizará en el próximo login.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
              {ALL_MODULES.map(mod => {
                const active = editingModules.includes(mod.id);
                return (
                  <button
                    key={mod.id}
                    onClick={() => setEditingModules(prev => active ? prev.filter(m => m !== mod.id) : [...prev, mod.id])}
                    className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all text-left ${
                      active ? 'border-blue-500 bg-blue-500/10' : 'border-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                      active ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-600'
                    }`}>
                      {active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                    </div>
                    <span className={`text-sm font-bold ${
                      active ? 'text-blue-400' : 'text-gray-500'
                    }`}>{mod.name}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => setIsModulesModalOpen(false)}
                className="flex-1 px-6 py-4 rounded-2xl font-black text-gray-500 hover:bg-white/5 transition-all text-sm uppercase tracking-widest"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveModules}
                disabled={isSavingModules || editingModules.length === 0}
                className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-2xl font-black shadow-xl shadow-blue-500/20 transition-all text-sm uppercase tracking-widest disabled:bg-gray-800 disabled:text-gray-600"
              >
                {isSavingModules ? 'Guardando...' : 'Guardar Módulos'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
