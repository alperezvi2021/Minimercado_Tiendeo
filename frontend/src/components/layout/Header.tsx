'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Search, Bell, LogOut, Sun, Moon, User, Menu, X, Wifi, WifiOff, CloudLightning, RefreshCcw, ClipboardCheck } from 'lucide-react';
import { useOfflineStore } from '@/store/useOfflineStore';
import { useState, useEffect } from 'react';

export default function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [userName, setUserName] = useState('Usuario');
  const [userRole, setUserRole] = useState('CASHIER');

  useEffect(() => {
    const name = localStorage.getItem('user_name');
    const role = localStorage.getItem('user_role');
    if (name) setUserName(name);
    if (role) setUserRole(role);
  }, []);

  const { 
    isOnline, 
    setIsOnline, 
    pendingSales,
    pendingProducts,
    pendingCategories,
    pendingCustomers,
    pendingPayments
  } = useOfflineStore();

  const totalPending = pendingSales.length + pendingProducts.length + pendingCategories.length + pendingCustomers.length + pendingPayments.length;
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Manejo de eventos de red global
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    if (typeof navigator !== 'undefined') {
      setIsOnline(navigator.onLine);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setIsOnline]);

  useEffect(() => {
    const handleSyncFinished = () => {
      setIsSyncing(false);
    };

    window.addEventListener('sync-finished', handleSyncFinished);
    return () => window.removeEventListener('sync-finished', handleSyncFinished);
  }, []);

  const handleManualSync = () => {
    if (totalPending > 0) {
      setIsSyncing(true);
      window.dispatchEvent(new Event('manual-sync'));
    }
  };

  const handleRefreshData = () => {
    setIsSyncing(true);
    window.dispatchEvent(new Event('force-sync'));
    // Feedback visual breve
    setTimeout(() => setIsSyncing(false), 1500);
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_name');
    router.push('/login');
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'OWNER': return 'Dueño';
      case 'ADMIN': return 'Administrador';
      case 'SUPER_ADMIN': return 'Super Admin';
      default: return 'Cajero';
    }
  };

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between px-4 md:px-6 z-10 transition-colors duration-200">
      <div className="flex items-center gap-3">
        <button 
          onClick={onMenuClick}
          className="md:hidden p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
        >
          <Menu className="w-6 h-6" />
        </button>

        {pathname === '/dashboard/orders' ? (
          <div className="flex items-center gap-3 px-4 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-2xl animate-in slide-in-from-left duration-500">
            <ClipboardCheck className="w-5 h-5 text-blue-500" />
            <span className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Gestión de Pedidos</span>
          </div>
        ) : (
          <div className="relative hidden lg:block w-72 xl:w-96">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 dark:text-gray-500">
              <Search className="w-5 h-5" />
            </span>
            <input
              type="text"
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-800 border-none rounded-lg text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-700 transition-all"
              placeholder="Buscar productos o recibos..."
            />
          </div>
        )}
      </div>
      
      <div className="flex items-center space-x-4">
        {/* Offline Status Indicator & Sync Button */}
        <div className="flex items-center">
          {!isOnline ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 rounded-full text-rose-600 dark:text-rose-400 text-xs font-black tracking-tight animate-pulse transition-all">
              <WifiOff className="w-4 h-4" />
              <span className="hidden sm:inline">Sin Conexión</span>
              {totalPending > 0 && (
                <span className="bg-rose-500 text-white px-1.5 py-0.5 rounded-full text-[10px] ml-1">{totalPending}</span>
              )}
            </div>
          ) : totalPending > 0 ? (
            <button 
              onClick={handleManualSync}
              disabled={isSyncing}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black tracking-tight transition-all shadow-sm
                ${isSyncing 
                  ? 'bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-500 cursor-wait animate-pulse' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-0.5'
                }`}
              title="Sincronizar datos pendientes con el servidor"
            >
              <CloudLightning className={`w-4 h-4 ${isSyncing ? '' : 'animate-bounce'}`} />
              <span className="hidden sm:inline">{isSyncing ? 'Sincronizando...' : 'Sincronizar'}</span>
              <span className={`${isSyncing ? 'bg-amber-500' : 'bg-white/20 text-white'} px-1.5 py-0.5 rounded-full text-[10px] ml-1`}>
                {totalPending}
              </span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-600 dark:text-emerald-400 text-[10px] font-black tracking-widest uppercase transition-all">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-sm shadow-emerald-500/50" />
              <span>en linea</span>
            </div>
          )}
        </div>

        {/* Refresh Data Button */}
        <button 
          onClick={handleRefreshData}
          disabled={isSyncing}
          className={`text-gray-500 hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-400 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-all ${isSyncing ? 'animate-spin text-emerald-500' : ''}`}
          title="Refrescar datos del servidor (Productos, Clientes, Categorías)"
        >
          <RefreshCcw className="w-5 h-5" />
        </button>

        {/* Theme Toggle */}
        <button 
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-amber-400 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          title="Alternar modo oscuro"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        <button className="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
          <Bell className="w-5 h-5" />
        </button>
        
        <div className="flex items-center space-x-2 md:space-x-3 pl-2 md:pl-4 border-l border-gray-200 dark:border-slate-700">
          <div className="h-8 w-8 md:h-9 md:w-9 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0">
             <User className="h-4 w-4 md:h-5 md:w-5" />
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-none">{userName}</p>
            <div className="mt-1 flex items-center justify-end">
               {userRole === 'SUPER_ADMIN' ? (
                 <span className="bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter border border-orange-200 dark:border-orange-800 animate-pulse">
                   Modo SuperAdmin
                 </span>
               ) : (
                 <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">{getRoleLabel(userRole)}</p>
               )}
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="h-8 w-8 md:h-9 md:w-9 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-gray-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-colors flex-shrink-0"
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
