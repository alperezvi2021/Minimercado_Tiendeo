'use client';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Search, Bell, LogOut, Sun, Moon, User } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function Header() {
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

  const handleLogout = () => {
    localStorage.removeItem('tenant_token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_name');
    router.push('/login');
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'OWNER': return 'Dueño';
      case 'ADMIN': return 'Administrador';
      default: return 'Cajero';
    }
  };

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between px-6 z-10 hidden md:flex transition-colors duration-200">
      <div className="flex-1">
        <div className="relative w-96">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 dark:text-gray-500">
            <Search className="w-5 h-5" />
          </span>
          <input
            type="text"
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-800 border-none rounded-lg text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-700 transition-all"
            placeholder="Buscar productos o recibos..."
          />
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
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
        
        <div className="flex items-center space-x-3 pl-4 border-l border-gray-200 dark:border-slate-700">
          <div className="h-9 w-9 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
             <User className="h-5 w-5" />
          </div>
          <div className="text-right">
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
            className="ml-2 h-9 w-9 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-gray-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-colors"
            title="Cerrar sesión"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
