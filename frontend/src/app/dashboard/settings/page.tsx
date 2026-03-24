'use client';
import { useState, useEffect } from 'react';
import { Store, Users, User, Settings as SettingsIcon, Save, Key, Printer, Phone, Eye, EyeOff, MapPin, X, Edit2, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('business');
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('');
  
  // Business State (from DB)
  const [tenantData, setTenantData] = useState({
    name: 'TIENDA LAS MARGARITAS',
    rutNit: '',
    ticketPaperSize: '58mm',
    ticketAutoPrint: false,
    ticketHeaderMessage: '',
    ticketFooterMessage: '',
    location: '',
    phone: '',
    address: ''
  });

  const [isSaving, setIsSaving] = useState(false);
  
  // Users management state
  const [users, setUsers] = useState<any[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'CASHIER' });
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    const savedName = localStorage.getItem('user_name');
    const savedRole = localStorage.getItem('user_role');
    
    if (savedName) setUserName(savedName);
    if (savedRole) setUserRole(savedRole);
    
    fetchTenant();
    fetchUsers();
  }, []);

  const fetchTenant = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/tenants/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTenantData({
          ...tenantData,
          name: data.name,
          rutNit: data.rutNit || '',
          ticketPaperSize: data.ticketPaperSize || '58mm',
          ticketAutoPrint: data.ticketAutoPrint || false,
          ticketHeaderMessage: data.ticketHeaderMessage || '',
          ticketFooterMessage: data.ticketFooterMessage || '',
          location: data.location || '',
          phone: data.phone || '',
          address: data.address || '',
        });
      }
    } catch (error) {
      console.error("Error fetching tenant", error);
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (error) {
      console.error("Error fetching users", error);
    }
  };

  const handleEditUser = (user: any) => {
    setEditingUser({ ...user, password: '' });
    setIsEditModalOpen(true);
  };

  const handleUpdateUser = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const payload: any = {
        name: editingUser.name,
        email: editingUser.email,
        role: editingUser.role
      };
      if (editingUser.password) {
        payload.passwordHash = editingUser.password;
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setIsEditModalOpen(false);
        fetchUsers();
        alert('Usuario actualizado correctamente');
      } else {
        const err = await res.json();
        alert(`Error: ${err.message || 'No se pudo actualizar el usuario'}`);
      }
    } catch (error) {
      alert('Error de conexión al actualizar usuario');
    }
  };
  
  const handleDeleteUser = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este usuario?')) return;
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        fetchUsers();
        alert('Usuario eliminado');
      } else {
        alert('No se pudo eliminar el usuario');
      }
    } catch (error) {
      alert('Error de conexión al eliminar');
    }
  };

  const handleCreateUser = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/users`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          name: newUser.name,
          email: newUser.email,
          passwordHash: newUser.password,
          role: newUser.role
        })
      });

      if (res.ok) {
        setIsCreateModalOpen(false);
        setNewUser({ name: '', email: '', password: '', role: 'CASHIER' });
        setShowPassword(false);
        fetchUsers();
        alert('Usuario creado correctamente');
      } else {
        const err = await res.json();
        alert(`Error: ${err.message || 'No se pudo crear el usuario'}`);
      }
    } catch (error) {
      alert('Error de conexión al crear usuario');
    }
  };

  const handleSaveBusiness = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/tenants/me`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          name: tenantData.name,
          rutNit: tenantData.rutNit,
          ticketPaperSize: tenantData.ticketPaperSize,
          ticketAutoPrint: tenantData.ticketAutoPrint,
          ticketHeaderMessage: tenantData.ticketHeaderMessage,
          ticketFooterMessage: tenantData.ticketFooterMessage,
          location: tenantData.location,
          phone: tenantData.phone,
          address: tenantData.address,
        })
      });

      if (res.ok) {
        alert('Configuración guardada correctamente.');
        // Update local storage for immediate UI reflected in header if needed
        localStorage.setItem('store_name', tenantData.name);
      } else {
        alert('Error al guardar la configuración.');
      }
    } catch (error) {
      alert('Error de conexión al guardar.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetData = async () => {
    if (resetConfirmText !== 'REINICIAR_TODO_A_CEROS') {
      alert('Por favor escriba la frase de confirmación exacta: REINICIAR_TODO_A_CEROS');
      return;
    }

    setIsResetting(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/maintenance/reset-my-data`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ confirmText: resetConfirmText })
      });

      if (res.ok) {
        alert('Los datos han sido reiniciados correctamente. El sistema se redirigirá al inicio.');
        setIsResetModalOpen(false);
        setResetConfirmText('');
        router.push('/dashboard');
      } else {
        const err = await res.json();
        alert(`Error: ${err.message || 'No se pudo reiniciar los datos'}`);
      }
    } catch (error) {
      alert('Error de conexión al reiniciar datos');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row gap-8">
        
        {/* Sidebar Mini - Tabs */}
        <div className="w-full md:w-64 space-y-2">
          <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-6">Configuración</h2>
          
          <button 
            onClick={() => setActiveTab('business')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${activeTab === 'business' ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-gray-400'}`}
          >
            <Store className="w-5 h-5" />
            Mi Negocio
          </button>
          
          <button 
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${activeTab === 'profile' ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-gray-400'}`}
          >
            <User className="w-5 h-5" />
            Mi Perfil
          </button>

          {(userRole === 'OWNER' || userRole === 'SUPER_ADMIN') && (
            <button 
              onClick={() => setActiveTab('users')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${activeTab === 'users' ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-gray-400'}`}
            >
              <Users className="w-5 h-5" />
              Empresa / Usuarios
            </button>
          )}

          <button 
            onClick={() => setActiveTab('ticket')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${activeTab === 'ticket' ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-gray-400'}`}
          >
            <Printer className="w-5 h-5" />
            Formato Ticket
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-gray-100 dark:border-slate-800 shadow-sm">
          
          {activeTab === 'business' && (
            <div className="animate-in fade-in duration-300">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <Store className="w-6 h-6 text-blue-500" />
                Información del Negocio
              </h3>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Nombre de la Tienda</label>
                  <input 
                    type="text" 
                    value={tenantData.name}
                    onChange={(e) => setTenantData({...tenantData, name: e.target.value})}
                    className="w-full bg-gray-50 dark:bg-slate-800 border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 transition-all font-bold"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">NIT / RUT</label>
                  <input 
                    type="text" 
                    placeholder="Ej. 901.234.567-1"
                    value={tenantData.rutNit}
                    onChange={(e) => setTenantData({...tenantData, rutNit: e.target.value})}
                    className="w-full bg-gray-50 dark:bg-slate-800 border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 transition-all font-bold"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Teléfono de Contacto</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                    <input 
                      type="text" 
                      value={tenantData.phone}
                      onChange={(e) => setTenantData({...tenantData, phone: e.target.value})}
                      className="w-full bg-gray-50 dark:bg-slate-800 border-0 rounded-xl pl-10 pr-4 py-3 focus:ring-2 focus:ring-blue-500 transition-all font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Ubicación / Ciudad</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                    <input 
                      type="text" 
                      value={tenantData.location}
                      onChange={(e) => setTenantData({...tenantData, location: e.target.value})}
                      className="w-full bg-gray-50 dark:bg-slate-800 border-0 rounded-xl pl-10 pr-4 py-3 focus:ring-2 focus:ring-blue-500 transition-all font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Dirección Local</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                    <input 
                      type="text" 
                      placeholder="Ej. Calle 10 # 5-20"
                      value={tenantData.address}
                      onChange={(e) => setTenantData({...tenantData, address: e.target.value})}
                      className="w-full bg-gray-50 dark:bg-slate-800 border-0 rounded-xl pl-10 pr-4 py-3 focus:ring-2 focus:ring-blue-500 transition-all font-bold"
                    />
                  </div>
                </div>
                <div className="pt-4 flex gap-3">
                  <button 
                    onClick={handleSaveBusiness}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-600/20 transition-all"
                  >
                    <Save className="w-5 h-5" />
                    {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                  <button 
                    onClick={() => router.push('/dashboard')}
                    className="flex items-center gap-2 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700 px-6 py-3 rounded-xl font-bold transition-all"
                  >
                    <X className="w-5 h-5" />
                    Cancelar
                  </button>
                </div>
              </div>

              {userRole === 'OWNER' && (
                <div className="mt-12 pt-8 border-t border-rose-100 dark:border-rose-900/30">
                  <h4 className="text-rose-600 dark:text-rose-400 font-black flex items-center gap-2 mb-2">
                    <Trash2 className="w-5 h-5" />
                    Zona de Peligro
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                    Estas acciones son permanentes y no se pueden deshacer. Úselas con extrema precaución.
                  </p>
                  
                  <div className="p-6 bg-rose-50 dark:bg-rose-900/10 rounded-2xl border border-rose-100 dark:border-rose-900/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white">Reiniciar a Cero para Producción</p>
                      <p className="text-xs text-rose-700/70 dark:text-rose-400/70">Borra ventas, créditos, abonos y cierres de caja. Mantiene inventario y usuarios.</p>
                    </div>
                    <button 
                      onClick={() => setIsResetModalOpen(true)}
                      className="bg-rose-600 hover:bg-rose-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-rose-600/20 whitespace-nowrap"
                    >
                      Reiniciar Todo
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="animate-in fade-in duration-300">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <User className="w-6 h-6 text-purple-500" />
                Configuración de Perfil
              </h3>
              
              <div className="space-y-6">
                <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl mb-6">
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center">
                    <User className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h4 className="font-black text-gray-900 dark:text-white">{userName}</h4>
                    <span className="text-xs font-bold uppercase tracking-widest text-blue-500">{userRole === 'OWNER' ? 'Dueño del Negocio' : 'Empleado'}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Cambiar Contraseña</label>
                  <div className="space-y-3">
                    <input 
                      type="password" 
                      placeholder="Contraseña Actual"
                      className="w-full bg-gray-50 dark:bg-slate-800 border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                    <input 
                      type="password" 
                      placeholder="Nueva Contraseña"
                      className="w-full bg-gray-50 dark:bg-slate-800 border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <button className="flex items-center gap-2 bg-gray-900 dark:bg-white dark:text-gray-900 text-white px-6 py-3 rounded-xl font-bold transition-all">
                    <Key className="w-5 h-5" />
                    Actualizar Contraseña
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="animate-in fade-in duration-300">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Users className="w-6 h-6 text-green-500" />
                  Gestión de Empleados
                </h3>
                <button 
                  onClick={() => setIsCreateModalOpen(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all"
                >
                  + Crear Usuario
                </button>
              </div>
              
              <div className="overflow-hidden bg-gray-50 dark:bg-slate-800/50 rounded-2xl border border-gray-100 dark:border-slate-800">
                <table className="w-full text-left">
                  <thead className="bg-gray-100 dark:bg-slate-800 text-xs font-black uppercase tracking-widest text-gray-500">
                    <tr>
                      <th className="px-6 py-4">Usuario</th>
                      <th className="px-6 py-4">Email</th>
                      <th className="px-6 py-4">Rol</th>
                      <th className="px-6 py-4">Estado</th>
                      <th className="px-6 py-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-sm">
                    {users.map((u: any) => (
                      <tr key={u.id}>
                        <td className="px-6 py-4 font-bold text-gray-900 dark:text-white uppercase">{u.name}</td>
                        <td className="px-6 py-4 text-gray-500">{u.email}</td>
                        <td className="px-6 py-4">
                           <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${u.role === 'OWNER' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                             {u.role}
                           </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-lg text-[10px] font-black">Activo</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => handleEditUser(u)}
                              className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 rounded-lg transition-all"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteUser(u.id)}
                              className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-600 rounded-lg transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-gray-400 italic">No hay empleados registrados.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Modal Crear Usuario */}
          {isCreateModalOpen && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-8 shadow-2xl animate-in zoom-in duration-200">
                <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-6">Nuevo Usuario</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Nombre Completo</label>
                    <input 
                      type="text" 
                      value={newUser.name}
                      onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                      placeholder="Ej. Juan Pérez"
                      className="w-full bg-gray-50 dark:bg-slate-800 border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 transition-all font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Email / Usuario</label>
                    <input 
                      type="email" 
                      value={newUser.email}
                      onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                      placeholder="email@ejemplo.com"
                      className="w-full bg-gray-50 dark:bg-slate-800 border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 transition-all font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Contraseña Temporal</label>
                    <div className="relative">
                      <input 
                        type={showPassword ? "text" : "password"} 
                        value={newUser.password}
                        onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                        className="w-full bg-gray-50 dark:bg-slate-800 border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 transition-all font-bold pr-12"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Rol del Usuario</label>
                    <select 
                      value={newUser.role}
                      onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                      className="w-full bg-gray-50 dark:bg-slate-800 border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 transition-all font-bold"
                    >
                      <option value="CASHIER">Cajero / Vendedor</option>
                      <option value="ADMIN">Administrador</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 mt-8">
                  <button 
                    onClick={() => setIsCreateModalOpen(false)}
                    className="flex-1 px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleCreateUser}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-600/20 transition-all"
                  >
                    Crear Ahora
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ticket' && (
            <div className="animate-in fade-in duration-300">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <Printer className="w-6 h-6 text-orange-500" />
                Configuración del Ticket POS
              </h3>
              
              <div className="space-y-6">
                <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800/50 rounded-2xl">
                   <p className="text-xs text-orange-800 dark:text-orange-300 leading-relaxed font-medium">
                     Configura aquí el formato que saldrá impreso. Los cambios se aplicarán instantáneamente en la próxima venta.
                   </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Tamaño de Papel</label>
                    <select 
                      value={tenantData.ticketPaperSize}
                      onChange={(e) => setTenantData({...tenantData, ticketPaperSize: e.target.value})}
                      className="w-full bg-gray-50 dark:bg-slate-800 border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 transition-all font-bold text-sm"
                    >
                      <option value="58mm">Papel Térmico 58mm (Estándar)</option>
                      <option value="80mm">Papel Térmico 80mm (Grande)</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl border border-transparent hover:border-blue-500/20 transition-all">
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">Impresión Automática</p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400">¿Imprimir ticket después de cobrar?</p>
                    </div>
                    <button 
                      onClick={() => setTenantData({...tenantData, ticketAutoPrint: !tenantData.ticketAutoPrint})}
                      className={`w-12 h-6 rounded-full flex items-center transition-all ${tenantData.ticketAutoPrint ? 'bg-blue-600 justify-end px-1' : 'bg-gray-300 dark:bg-slate-700 justify-start px-1'}`}
                    >
                        <div className="w-4 h-4 bg-white rounded-full shadow-sm"></div>
                    </button>
                  </div>
                </div>

                <div>
                   <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Mensaje Superior (Encabezado)</label>
                   <textarea 
                     placeholder="Ej: Régimen Simplificado - Gracias por preferirnos"
                     value={tenantData.ticketHeaderMessage}
                     onChange={(e) => setTenantData({...tenantData, ticketHeaderMessage: e.target.value})}
                     className="w-full bg-gray-50 dark:bg-slate-800 border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 transition-all font-bold min-h-[80px]"
                   />
                </div>

                <div>
                   <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Mensaje Inferior (Pie de Página)</label>
                   <textarea 
                     placeholder="Ej: No se aceptan devoluciones después de 24h"
                     value={tenantData.ticketFooterMessage}
                     onChange={(e) => setTenantData({...tenantData, ticketFooterMessage: e.target.value})}
                     className="w-full bg-gray-50 dark:bg-slate-800 border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 transition-all font-bold min-h-[80px]"
                   />
                </div>

                <div className="pt-4 flex flex-col md:flex-row gap-3">
                  <button 
                    onClick={handleSaveBusiness}
                    className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-600/20 transition-all w-full md:w-auto"
                  >
                    <Save className="w-5 h-5" />
                    {isSaving ? 'Guardando...' : 'Guardar Formato de Ticket'}
                  </button>
                  <button 
                    onClick={() => router.push('/dashboard')}
                    className="flex items-center justify-center gap-2 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700 px-6 py-3 rounded-xl font-bold transition-all w-full md:w-auto"
                  >
                    <X className="w-5 h-5" />
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal Editar Usuario */}
          {isEditModalOpen && editingUser && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-8 shadow-2xl animate-in zoom-in duration-200">
                <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-6">Editar Usuario</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Nombre Completo</label>
                    <input 
                      type="text" 
                      value={editingUser.name}
                      onChange={(e) => setEditingUser({...editingUser, name: e.target.value})}
                      className="w-full bg-gray-50 dark:bg-slate-800 border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 transition-all font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Email / Usuario</label>
                    <input 
                      type="email" 
                      value={editingUser.email}
                      onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                      className="w-full bg-gray-50 dark:bg-slate-800 border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 transition-all font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Contraseña (Dejar vacío para no cambiar)</label>
                    <div className="relative">
                      <input 
                        type={showPassword ? "text" : "password"} 
                        value={editingUser.password}
                        onChange={(e) => setEditingUser({...editingUser, password: e.target.value})}
                        className="w-full bg-gray-50 dark:bg-slate-800 border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 transition-all font-bold pr-12"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Rol del Usuario</label>
                    <select 
                      value={editingUser.role}
                      onChange={(e) => setEditingUser({...editingUser, role: e.target.value})}
                      className="w-full bg-gray-50 dark:bg-slate-800 border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 transition-all font-bold"
                    >
                      <option value="CASHIER">Cajero / Vendedor</option>
                      <option value="ADMIN">Administrador</option>
                      <option value="OWNER">Dueño del Negocio</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 mt-8">
                  <button 
                    onClick={() => setIsEditModalOpen(false)}
                    className="flex-1 px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleUpdateUser}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-600/20 transition-all"
                  >
                    Guardar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Confirmación Reset */}
      {isResetModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl p-8 shadow-2xl animate-in zoom-in duration-200 border-4 border-rose-500/20 text-center">
            <div className="w-20 h-20 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 className="w-10 h-10 text-rose-600" />
            </div>
            
            <h3 className="text-3xl font-black text-gray-900 dark:text-white mb-4 italic">¿ESTÁS TOTALMENTE SEGURO?</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-8 font-medium">
              Esta acción borrará <span className="text-rose-600 font-black">TODAS LAS VENTAS, CRÉDITOS Y REPORTES</span> de {tenantData.name}. 
              <br/><br/>
              Tu inventario de productos y tus usuarios se mantendrán, pero todo lo demás volverá a cero. <span className="font-black underline italic">ESTO NO SE PUEDE DESHACER.</span>
            </p>
            
            <div className="space-y-4 max-w-sm mx-auto">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-rose-600 mb-3">Para confirmar, escriba: REINICIAR_TODO_A_CEROS</label>
                <input 
                  type="text" 
                  value={resetConfirmText}
                  onChange={(e) => setResetConfirmText(e.target.value)}
                  placeholder="Escriba la frase de confirmación"
                  className="w-full bg-rose-50 dark:bg-rose-900/10 border-2 border-rose-200 dark:border-rose-900/30 rounded-2xl px-6 py-4 focus:ring-4 focus:ring-rose-500/20 transition-all font-black text-center text-rose-700 dark:text-rose-400 placeholder:text-rose-300 dark:placeholder:text-rose-800"
                />
              </div>
              
              <div className="flex flex-col gap-3 pt-4">
                <button 
                  onClick={handleResetData}
                  disabled={isResetting || resetConfirmText !== 'REINICIAR_TODO_A_CEROS'}
                  className="w-full bg-rose-600 disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-rose-700 text-white px-8 py-5 rounded-2xl font-black text-lg transition-all shadow-xl shadow-rose-600/30 flex items-center justify-center gap-3"
                >
                  {isResetting ? (
                    'PROCESANDO LIMPIEZA...'
                  ) : (
                    <>
                      <Trash2 className="w-6 h-6" />
                      SÍ, REINICIAR TODO AHORA
                    </>
                  )}
                </button>
                <button 
                  onClick={() => {
                    setIsResetModalOpen(false);
                    setResetConfirmText('');
                  }}
                  className="w-full py-4 text-gray-500 font-bold hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  MEJOR NO, CANCELAR
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
