'use client';
import { useState, useEffect } from 'react';
import { User, Shield, Mail, Key, Save } from 'lucide-react';

export default function ProfilePage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');

  useEffect(() => {
    setName(localStorage.getItem('user_name') || '');
    setEmail(localStorage.getItem('user_email') || '');
    setRole(localStorage.getItem('user_role') || '');
  }, []);

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Funcionalidad en desarrollo: Tu perfil ha sido guardado localmente en esta demo.');
    localStorage.setItem('user_name', name);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-black text-slate-900 dark:text-white">Mi Perfil</h2>
        <p className="text-slate-500 dark:text-slate-400">Gestiona tu información personal y seguridad.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="col-span-2 space-y-6">
          <form onSubmit={handleUpdateProfile} className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-4 bg-blue-100 dark:bg-blue-900/30 rounded-2xl text-blue-600">
                <User className="w-8 h-8" />
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-white text-lg">{name}</p>
                <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Configuración Personal</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                   <User className="w-3 h-3" /> Nombre Completo
                </label>
                <input 
                  className="w-full mt-1 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                   <Mail className="w-3 h-3" /> Correo Electrónico
                </label>
                <input 
                  disabled
                  className="w-full mt-1 p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/50 text-slate-400 border-none outline-none cursor-not-allowed"
                  value={email} 
                />
              </div>
            </div>

            <button type="submit" className="w-full py-4 bg-slate-900 dark:bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-[1.02] transition-all flex items-center justify-center gap-2">
              <Save className="w-4 h-4" /> Guardar Cambios
            </button>
          </form>

          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
             <h4 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
               <Key className="w-5 h-5 text-amber-500" /> Seguridad
             </h4>
             <button className="text-sm font-bold text-blue-600 hover:underline">Cambiar mi contraseña</button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 dark:bg-blue-900/10 p-8 rounded-3xl border border-slate-800 dark:border-blue-900/30">
            <Shield className="w-12 h-12 text-blue-400 mb-4" />
            <h4 className="font-bold text-white mb-2 uppercase text-xs tracking-widest">Tu Rol en el Sistema</h4>
            <p className="text-3xl font-black text-white">{role === 'CASHIER' ? 'Cajero' : role === 'OWNER' ? 'Dueño' : role}</p>
            <p className="text-sm text-slate-400 mt-4 leading-relaxed">
              Tu rol está limitado por el administrador del negocio para garantizar la seguridad de los datos sensibles.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
