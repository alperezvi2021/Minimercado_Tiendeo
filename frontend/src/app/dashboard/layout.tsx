'use client';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Migración de token: si existe el antiguo y no el nuevo, copiarlo.
    const tenantToken = localStorage.getItem('tenant_token');
    const accessToken = localStorage.getItem('access_token');
    if (tenantToken && !accessToken) {
      localStorage.setItem('access_token', tenantToken);
    }

    const role = localStorage.getItem('user_role');
    const restrictedRoutes = [
      '/dashboard/inventory',
      '/dashboard/reports',
      '/dashboard/suppliers',
      '/dashboard/accounting',
      '/dashboard/settings'
    ];

    if (role === 'CASHIER') {
      if (restrictedRoutes.some(route => pathname.startsWith(route))) {
        router.push('/dashboard');
      }
    }
    setLoading(false);
  }, [pathname, router]);

  if (loading) return null;

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-slate-950 overflow-hidden transition-colors duration-200">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 dark:bg-slate-950 p-6 md:p-8 transition-colors duration-200">
          {children}
        </main>
      </div>
    </div>
  );
}
