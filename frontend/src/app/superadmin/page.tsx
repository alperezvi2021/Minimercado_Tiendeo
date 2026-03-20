'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Users, Store, Search, Key, LogOut, ExternalLink, Activity, Plus } from 'lucide-react';

export default function SuperAdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('tenants');
  const [tenants, setTenants] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [newPassword, setNewPassword] = useState('');

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
        fetch('http://localhost:3001/admin/tenants', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('http://localhost:3001/admin/users', { headers: { Authorization: `Bearer ${token}` } })
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
      const res = await fetch(`http://localhost:3001/admin/users/${selectedUser.id}/reset-password`, {
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

  const logout = () => {
    localStorage.clear();
    router.push('/login');
  };

  const filteredTenants = tenants.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredUsers = users.filter(u => u.email.toLowerCase().includes(searchQuery.toLowerCase()) || u.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="min-h-screen bg-[#050510] text-gray-300 font-sans selection:bg-blue-500/30">
      
      {/* Sidebar Navigation */}
      <aside className="fixed left-0 top-0 bottom-0 w-72 bg-[#0a0a1a] border-r border-white/5 p-6 flex flex-col z-20">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight">TIENDEO <span className="text-blue-500">PRO</span></h1>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">SuperAdmin Console</p>
          </div>
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
        </nav>

        <button 
          onClick={logout}
          className="mt-auto flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-red-400 hover:bg-red-500/10 transition-all border border-red-500/20"
        >
          <LogOut className="w-5 h-5" />
          Cerrar Plataforma
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="pl-72 p-10 max-w-[1600px] mx-auto">
        
        {/* Header Section */}
        <header className="flex justify-between items-end mb-12">
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
        <div className="grid grid-cols-4 gap-6 mb-10">
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
        <div className="bg-[#0a0a1a] border border-white/5 rounded-[40px] overflow-hidden shadow-2xl">
          {activeTab === 'tenants' ? (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                  <th className="px-8 py-6">ID Negocio</th>
                  <th className="px-8 py-6">Nombre de la Tienda</th>
                  <th className="px-8 py-6">Usuarios</th>
                  <th className="px-8 py-6">Fecha Creación</th>
                  <th className="px-8 py-6">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredTenants.map(t => (
                  <tr key={t.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-8 py-6 text-xs font-mono text-gray-600 group-hover:text-blue-500 transition-colors">{t.id}</td>
                    <td className="px-8 py-6 font-black text-white text-lg">{t.name}</td>
                    <td className="px-8 py-6">
                      <span className="bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest">{t.userCount} Empleados</span>
                    </td>
                    <td className="px-8 py-6 text-sm font-medium text-gray-500">{new Date(t.createdAt).toLocaleDateString()}</td>
                    <td className="px-8 py-6">
                      <button className="text-gray-600 hover:text-white transition-colors">
                        <ExternalLink className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left">
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
                {filteredUsers.map(u => (
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

    </div>
  );
}
