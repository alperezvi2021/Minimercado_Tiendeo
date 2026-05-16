'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, ChevronRight, X, Loader2 } from 'lucide-react';

interface Tenant {
  userId: string;
  tenantId: string;
  tenantName: string;
  role: string;
}

export default function TenantSwitcher({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [currentTenantId, setCurrentTenantId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('available_tenants');
    const current = localStorage.getItem('tenant_id'); // We should store this too or get it from token
    if (stored) {
      try {
        setTenants(JSON.parse(stored));
      } catch (e) {
        console.error('Error parsing available_tenants');
      }
    }
  }, [isOpen]);

  const handleSwitch = async (tenantId: string) => {
    if (loading) return;
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/auth/switch`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ tenantId }),
      });

      if (!res.ok) throw new Error('Error al cambiar de negocio');

      const data = await res.json();
      
      // Update local storage
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('user_role', data.user.role);
      localStorage.setItem('user_name', data.user.name);
      localStorage.setItem('tenant_modules', JSON.stringify(data.user.tenant_modules || []));
      localStorage.setItem('available_tenants', JSON.stringify(data.user.availableTenants || []));
      
      // Clear specific tenant data if needed (cache, etc)
      // For now, simple reload
      window.location.href = '/dashboard';
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white">Panel Central</h3>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Cambiar de Negocio</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-sm font-bold border border-rose-100 dark:border-rose-800">
              {error}
            </div>
          )}

          <div className="space-y-3">
            {tenants.map((t) => (
              <button
                key={t.tenantId}
                onClick={() => handleSwitch(t.tenantId)}
                disabled={loading}
                className="w-full flex items-center justify-between p-4 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 bg-white dark:bg-slate-900 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-all group"
              >
                <div className="flex items-center gap-4 text-left">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">{t.tenantName}</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.role === 'OWNER' ? 'Dueño' : 'Administrador'}</p>
                  </div>
                </div>
                {loading ? (
                  <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors" />
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800">
          <p className="text-[10px] text-center font-bold text-slate-500 leading-relaxed uppercase tracking-widest">
            Selecciona un negocio para cambiar de entorno instantáneamente
          </p>
        </div>
      </div>
    </div>
  );
}
