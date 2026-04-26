'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ShoppingCart, Package, BarChart3, Settings, User, Truck, Receipt, ClipboardCheck, ArrowRightLeft, Database, RotateCcw, Utensils, Users, LogOut } from 'lucide-react';
import { useState, useEffect } from 'react';

const navItems = [
  { name: 'Gestión Pedidos', href: '/dashboard/orders', icon: ClipboardCheck, roles: ['OWNER', 'ADMIN', 'CASHIER', 'SUPER_ADMIN'], module: 'ORDERS' },
  { name: 'Caja (POS)', href: '/dashboard', icon: ShoppingCart, roles: ['OWNER', 'ADMIN', 'CASHIER', 'SUPER_ADMIN'], module: 'POS' },
  { name: 'Servicio a Mesas', href: '/dashboard/restaurant', icon: Utensils, roles: ['OWNER', 'ADMIN', 'CASHIER', 'WAITER', 'SUPER_ADMIN'], module: 'RESTAURANT' },
  { name: 'Control de Cajeros', href: '/dashboard/cashiers', icon: Users, roles: ['OWNER', 'ADMIN', 'SUPER_ADMIN'], module: 'CASHIER_MONITOR' },
  { name: 'Cierre de Caja', href: '/dashboard/closure', icon: ClipboardCheck, roles: ['OWNER', 'ADMIN', 'CASHIER', 'SUPER_ADMIN'], module: 'CLOSURE' },
  { name: 'Inventario', href: '/dashboard/inventory', icon: Package, roles: ['OWNER', 'ADMIN', 'CASHIER', 'SUPER_ADMIN'], module: 'INVENTORY' },
  { name: 'Reportes', href: '/dashboard/reports', icon: BarChart3, roles: ['OWNER', 'ADMIN', 'SUPER_ADMIN'], module: 'REPORTS' },
  { name: 'Proveedores', href: '/dashboard/suppliers', icon: Truck, roles: ['OWNER', 'ADMIN', 'SUPER_ADMIN'], module: 'SUPPLIERS' },
  { name: 'Clientes', href: '/dashboard/customers', icon: User, roles: ['OWNER', 'ADMIN', 'CASHIER', 'SUPER_ADMIN'], module: 'CUSTOMERS' },
  { name: 'Créditos', href: '/dashboard/credits', icon: ArrowRightLeft, roles: ['OWNER', 'ADMIN', 'CASHIER', 'SUPER_ADMIN'], module: 'CREDITS' },
  { name: 'Devoluciones', href: '/dashboard/sales/refunds', icon: RotateCcw, roles: ['OWNER', 'ADMIN', 'CASHIER', 'SUPER_ADMIN'], module: 'REFUNDS' },
  { name: 'Contabilidad', href: '/dashboard/accounting', icon: Receipt, roles: ['OWNER', 'ADMIN', 'SUPER_ADMIN'], module: 'ACCOUNTING' },
  { name: 'Gestionar Meseros', href: '/dashboard/restaurant/waiters', icon: Users, roles: ['OWNER', 'ADMIN', 'SUPER_ADMIN'], module: 'RESTAURANT' },
];

export default function Sidebar({ isOpen, onClose }: { isOpen?: boolean, onClose?: () => void }) {
  const pathname = usePathname();
  const [userRole, setUserRole] = useState('CASHIER');
  const [tenantModules, setTenantModules] = useState<string[]>([]);
  const [userName, setUserName] = useState('Usuario');
  const [waiterAliasSingular, setWaiterAliasSingular] = useState('Mesero');
  const [waiterAliasPlural, setWaiterAliasPlural] = useState('Meseros');

  useEffect(() => {
    const role = localStorage.getItem('user_role');
    const name = localStorage.getItem('user_name');
    const modulesString = localStorage.getItem('tenant_modules');
    
    if (role) setUserRole(role);
    if (name) setUserName(name);
    if (modulesString) {
      try {
        const parsed = JSON.parse(modulesString);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTenantModules(parsed);
        } else {
          setTenantModules(['POS', 'CLOSURE', 'INVENTORY', 'REPORTS', 'SUPPLIERS', 'CUSTOMERS', 'CREDITS', 'REFUNDS', 'ACCOUNTING', 'CASHIER_MONITOR']);
        }
      } catch (e) {
        setTenantModules(['POS', 'CLOSURE', 'INVENTORY', 'REPORTS', 'SUPPLIERS', 'CUSTOMERS', 'CREDITS', 'REFUNDS', 'ACCOUNTING', 'CASHIER_MONITOR']);
      }
    } else {
       // SuperAdmin sees everything, others default to full for now
        setTenantModules(['POS', 'CLOSURE', 'INVENTORY', 'REPORTS', 'SUPPLIERS', 'CUSTOMERS', 'CREDITS', 'REFUNDS', 'ACCOUNTING', 'CASHIER_MONITOR']);
    }

    const aliasSingular = localStorage.getItem('waiter_alias_singular');
    const aliasPlural = localStorage.getItem('waiter_alias_plural');
    if (aliasSingular) setWaiterAliasSingular(aliasSingular);
    if (aliasPlural) setWaiterAliasPlural(aliasPlural);
  }, []);

  const dynamicNavItems = navItems.map(item => {
    if (item.href === '/dashboard/restaurant/waiters') {
      return { ...item, name: `Gestionar ${waiterAliasPlural}` };
    }
    if (item.href === '/dashboard/restaurant') {
       return { ...item, name: `Servicio a ${waiterAliasPlural}` };
    }
    return item;
  });

  const filteredItems = dynamicNavItems.filter(item => {
    const hasRole = item.roles.includes(userRole);
    // SUPER_ADMIN skips module filtering
    if (userRole === 'SUPER_ADMIN') return hasRole;
    const hasModule = tenantModules.includes(item.module);
    return hasRole && hasModule;
  });

  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_name');
    router.push('/login');
  };

  return (
    <aside className={`
      fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 text-slate-300 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:w-64 md:flex md:shadow-xl
      ${isOpen ? 'translate-x-0' : '-translate-x-full'}
    `}>
      <div className="h-16 flex items-center justify-center border-b border-slate-800 px-6 bg-slate-950">
        <h1 className="text-xl font-bold tracking-tight text-white">
          Tiendeo<span className="text-blue-500">POS</span>
        </h1>
      </div>
      <div className="flex-1 overflow-y-auto py-6 px-4 flex flex-col justify-between">
        <nav className="space-y-2">
          {filteredItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                } group flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200`}
              >
                <Icon className={`w-5 h-5 mr-3 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>
        
        <div className="mt-auto space-y-1">
           {userRole === 'SUPER_ADMIN' && (
             <Link
               href="/superadmin"
               onClick={onClose}
               className="group flex items-center px-4 py-3 text-sm font-bold rounded-xl text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all border border-orange-200/50 dark:border-orange-800/50 mb-2"
             >
               <ShoppingCart className="w-5 h-5 mr-3 rotate-180" />
               Consola Global
             </Link>
           )}
           <Link
              href={userRole === 'CASHIER' ? '/dashboard/profile' : '/dashboard/settings'}
              onClick={onClose}
              className="group flex items-center px-4 py-3 text-sm font-semibold rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-all duration-200"
            >
              {userRole === 'CASHIER' ? (
                <User className="w-5 h-5 mr-3 text-slate-500 group-hover:text-slate-300" />
              ) : (
                <Settings className="w-5 h-5 mr-3 text-slate-500 group-hover:text-slate-300" />
              )}
              {userRole === 'CASHIER' ? 'Mi Perfil' : 'Configuración'}
            </Link>
        </div>

        {/* Profile Summary at Bottom */}
        <div className="mt-4 p-4 border-t border-slate-800">
          <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-800/50">
            <div className="flex items-center gap-3 overflow-hidden">
               <div className="bg-blue-900/30 p-2 rounded-xl flex-shrink-0">
                 <User className="w-5 h-5 text-blue-400" />
               </div>
               <div className="overflow-hidden">
                 <p className="text-sm font-bold text-white truncate">{userName}</p>
                 <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">
                   {userRole === 'SUPER_ADMIN' ? 'Super Admin' : userRole === 'OWNER' ? 'Dueño' : userRole === 'ADMIN' ? 'Admin' : 'Cajero'}
                 </p>
               </div>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-900/30 text-slate-400 hover:text-rose-400 transition-all"
              title="Cerrar sesión"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
