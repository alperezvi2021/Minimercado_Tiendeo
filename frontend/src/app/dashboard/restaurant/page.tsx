'use client';
import { useState, useEffect } from 'react';
import { Utensils, Plus, User, Clock, DollarSign, ArrowRight, Trash2, Search, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface OpenSale {
  id: string;
  tableName: string;
  totalAmount: number;
  createdAt: string;
  waiter?: { name: string };
}

interface Waiter {
  id: string;
  name: string;
}

export default function RestaurantDashboard() {
  const router = useRouter();
  const [openTables, setOpenTables] = useState<OpenSale[]>([]);
  const [waiters, setWaiters] = useState<Waiter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [newAlias, setNewAlias] = useState('');
  const [selectedWaiterId, setSelectedWaiterId] = useState('');
  const [waiterPin, setWaiterPin] = useState('');
  const [error, setError] = useState('');
  const [aliasSingular, setAliasSingular] = useState('Mesero');
  const [aliasPlural, setAliasPlural] = useState('Meseros');

  useEffect(() => {
    fetchData();
    const savedSingular = localStorage.getItem('waiter_alias_singular');
    const savedPlural = localStorage.getItem('waiter_alias_plural');
    if (savedSingular) setAliasSingular(savedSingular);
    if (savedPlural) setAliasPlural(savedPlural);
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const [resOpen, resWaiters] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/sales/restaurant/open`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/waiters`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (resOpen.ok) setOpenTables(await resOpen.json());
      if (resWaiters.ok) setWaiters(await resWaiters.json());
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlias || !selectedWaiterId || waiterPin.length !== 4) {
      setError('Por favor completa todos los campos correctamente');
      return;
    }

    try {
      const token = localStorage.getItem('access_token');
      const resVal = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/waiters/validate-pin`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ pin: waiterPin })
      });

      if (!resVal.ok) {
        setError(`PIN de ${aliasSingular.toLowerCase()} incorrecto`);
        return;
      }

      const waiter = await resVal.json();
      if (waiter.id !== selectedWaiterId) {
        setError(`Ese PIN no pertenece al ${aliasSingular.toLowerCase()} seleccionado`);
        return;
      }

      const resCreate = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/sales/restaurant/order`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ tableName: newAlias, waiterId: selectedWaiterId, items: [] })
      });

      if (resCreate.ok) {
        const sale = await resCreate.json();
        router.push(`/dashboard/restaurant/order/${sale.id}`);
      } else {
        setError('Error al abrir la mesa');
      }
      
    } catch (err) {
      setError('Error de conexión');
    }
  };

  const filteredTables = openTables.filter(t => 
    t.tableName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.waiter?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-white flex items-center gap-4">
            <Utensils className="w-10 h-10 text-blue-500" />
            Servicio a {aliasPlural}
          </h1>
          <p className="text-slate-400 mt-2 text-lg">
            Control de consumos activos y atención en barra.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative group flex-1 sm:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
            <input
              type="text"
              placeholder={`Buscar ${aliasSingular.toLowerCase()} o servicio...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl py-3 pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
          <button
            onClick={() => { setNewAlias(''); setSelectedWaiterId(''); setWaiterPin(''); setError(''); setShowOpenModal(true); }}
            className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all shadow-xl shadow-blue-900/30 active:scale-95"
          >
            <Plus className="w-6 h-6" />
            Abrir Servicio
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-48 bg-slate-800/40 rounded-[2rem] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredTables.map((table) => (
            <div 
              key={table.id}
              onClick={() => router.push(`/dashboard/restaurant/order/${table.id}`)}
              className="group bg-slate-800/40 border border-slate-700/50 p-6 rounded-[2rem] hover:border-blue-500/50 hover:bg-slate-800/60 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between"
            >
              <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-blue-600 text-white p-2 rounded-xl">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-3 text-slate-400 text-sm font-bold uppercase tracking-widest mb-3">
                  <User className="w-4 h-4 text-blue-500" />
                  {table.waiter?.name || 'Varios'}
                </div>
                <h3 className="text-2xl font-black text-white truncate leading-tight">
                  {table.tableName}
                </h3>
              </div>

              <div className="mt-8 flex items-end justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-slate-500 text-xs font-bold mb-1">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(table.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="text-3xl font-black text-blue-400">
                    ${Number(table.totalAmount).toLocaleString('es-CO')}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {filteredTables.length === 0 && (
            <div className="col-span-full py-32 bg-slate-800/10 border-2 border-dashed border-slate-700/50 rounded-[3rem] flex flex-col items-center justify-center text-slate-500">
               <Utensils className="w-20 h-20 mb-6 opacity-20" />
               <p className="text-xl font-bold">No hay servicios activos en este momento</p>
               <button 
                onClick={() => { setNewAlias(''); setSelectedWaiterId(''); setWaiterPin(''); setError(''); setShowOpenModal(true); }}
                className="mt-4 text-blue-500 hover:text-blue-400 font-bold transition-colors"
               >
                 Comenzar mi primer servicio del turno
               </button>
            </div>
          )}
        </div>
      )}

      {showOpenModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-[#0f172a] border border-slate-800 w-full max-w-lg p-10 rounded-[3rem] shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setShowOpenModal(false)}
              className="absolute top-6 right-6 p-2 text-slate-500 hover:text-white rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <h2 className="text-3xl font-black text-white mb-8">Abrir Nuevo Servicio</h2>
            
            <form onSubmit={handleOpenTable} className="space-y-8">
              {/* Campos ocultos para "atrapar" el autocompletado del navegador y evitar que ensucie los campos reales */}
              <input type="text" name="prevent_autofill" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" />
              <input type="password" name="password_fake" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" />
              
              <div className="space-y-2">
                <label className="text-sm font-black uppercase tracking-widest text-slate-500 ml-1">Alias o Nombre</label>
                  <input
                    type="text"
                    name="table_alias_name_unique"
                    id="table_alias_name_unique"
                    required
                    autoComplete="off"
                    placeholder="Ej: Barra Principal / Mesa Terraza 4"
                    value={newAlias}
                    onChange={(e) => setNewAlias(e.target.value)}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-3xl p-5 text-xl text-white focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
              </div>

              <div className="space-y-4">
                 <div className="flex flex-col gap-2">
                    <label className="text-sm font-black uppercase tracking-widest text-slate-500 ml-1">Seleccionar {aliasSingular}</label>
                    <select
                      required
                      value={selectedWaiterId}
                      onChange={(e) => setSelectedWaiterId(e.target.value)}
                      className="w-full bg-slate-800/50 border border-slate-700 rounded-3xl p-5 text-lg text-white appearance-none focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all pointer-events-auto"
                    >
                      <option value="">Selecciona tu nombre...</option>
                      {waiters.map(w => (
                        <option key={w.id} value={w.id} className="bg-slate-900">{w.name}</option>
                      ))}
                    </select>
                 </div>

                 <div className="flex flex-col gap-2">
                    <label className="text-sm font-black uppercase tracking-widest text-slate-500 ml-1 text-center">Ingresa tu PIN de 4 dígitos</label>
                    <input
                      type="password"
                      name="waiter_pin_code_unique"
                      id="waiter_pin_code_unique"
                      maxLength={4}
                      required
                      autoComplete="new-password"
                      value={waiterPin}
                      onChange={(e) => setWaiterPin(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-slate-900 border-2 border-slate-700 rounded-3xl p-6 text-center text-4xl font-mono tracking-[2rem] text-blue-400 focus:outline-none focus:border-blue-500 transition-all"
                      placeholder="****"
                    />
                 </div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-500 p-5 rounded-2xl text-center font-bold">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-6 rounded-[2rem] text-xl transition-all shadow-2xl shadow-blue-900/40 transform active:scale-[0.98]"
              >
                Comenzar Servicio
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
