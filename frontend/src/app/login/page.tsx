'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Credenciales inválidas');
      }

      const data = await res.json();
      // Temporary storage for MVP.
      localStorage.setItem('access_token', data.access_token);
      
      // Decodificar el token o usar los datos del usuario si el backend los envía
      // En nuestro login actual, el backend podría enviar datos básicos del usuario
      if (data.user) {
        localStorage.setItem('user_role', data.user.role);
        localStorage.setItem('user_name', data.user.name);
        localStorage.setItem('tenant_modules', JSON.stringify(data.user.tenant_modules || []));
      } else {
        // Fallback: Si no vienen en data.user, intentamos sacarlos de data directamente
        localStorage.setItem('user_role', data.role || 'CASHIER');
        localStorage.setItem('user_name', data.name || 'Usuario');
        localStorage.setItem('tenant_modules', JSON.stringify(data.tenant_modules || []));
      }

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950 transition-colors duration-200">
      <div className="max-w-md w-full space-y-8 p-8 bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-gray-100 dark:border-slate-800 transition-all">
        <div>
          <h2 className="mt-4 text-center text-4xl font-black text-gray-900 dark:text-white tracking-tight">
            Tiendeo POS
          </h2>
          <p className="mt-2 text-center text-sm text-gray-500 dark:text-slate-400 font-medium">
            Inicia sesión para acceder a tu caja
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-500 ml-1" htmlFor="email">Correo electrónico</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="block w-full px-4 py-4 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 placeholder-gray-400 dark:placeholder-slate-500 text-gray-900 dark:text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold"
                placeholder="tu@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1 relative">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-500 ml-1" htmlFor="password">Contraseña</label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  className="block w-full px-4 py-4 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 placeholder-gray-400 dark:placeholder-slate-500 text-gray-900 dark:text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold pr-12"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-blue-500 dark:text-slate-500 dark:hover:text-blue-400 transition-colors z-20"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
  
          {error && <p className="text-red-500 text-sm text-center font-bold bg-red-50 dark:bg-red-500/10 py-3 rounded-2xl border border-red-100 dark:border-red-500/20">{error}</p>}
  
          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-4 px-4 border border-transparent text-lg font-black rounded-2xl text-white bg-blue-600 hover:bg-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all shadow-lg shadow-blue-600/20"
            >
              Ingresar
            </button>
          </div>
  
          <div className="text-center">
            <button
              type="button"
              onClick={() => setError('Por favor contacta al administrador para restablecer tu contraseña.')}
              className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:text-blue-500 transition-colors"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
