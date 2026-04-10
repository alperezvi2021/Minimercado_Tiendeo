'use client';
import { useState, useEffect } from 'react';
import { Plus, User, Trash2, Key, Info, Edit2 } from 'lucide-react';

interface Waiter {
  id: string;
  name: string;
  pin: string;
}

export default function WaitersPage() {
  const [waiters, setWaiters] = useState<Waiter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newWaiterName, setNewWaiterName] = useState('');
  const [newWaiterPin, setNewWaiterPin] = useState('');
  const [editingWaiter, setEditingWaiter] = useState<Waiter | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchWaiters();
  }, []);

  const fetchWaiters = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/waiters`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setWaiters(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateWaiter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newWaiterPin.length !== 4) {
      setError('El PIN debe tener 4 dígitos');
      return;
    }
    
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/waiters`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ name: newWaiterName, pin: newWaiterPin })
      });

      if (res.ok) {
        setShowAddModal(false);
        setNewWaiterName('');
        setNewWaiterPin('');
        setError('');
        fetchWaiters();
      } else {
        const data = await res.json();
        setError(data.message || 'Error al crear mesero');
      }
    } catch (err) {
      setError('Fallo de conexión');
    }
  };

  const handleUpdateWaiter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWaiter) return;
    if (editingWaiter.pin.length !== 4) {
      setError('El PIN debe tener 4 dígitos');
      return;
    }
    
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/waiters/${editingWaiter.id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ name: editingWaiter.name, pin: editingWaiter.pin })
      });

      if (res.ok) {
        setEditingWaiter(null);
        setError('');
        fetchWaiters();
      } else {
        const data = await res.json();
        setError(data.message || 'Error al actualizar mesero');
      }
    } catch (err) {
      setError('Fallo de conexión');
    }
  };

  const handleDeleteWaiter = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar a este mesero?')) return;
    
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/waiters/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) fetchWaiters();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
            Gestión de Meseros
          </h1>
          <p className="text-slate-400 mt-1 flex items-center gap-2">
            <Info className="w-4 h-4" />
            Configura los accesos rápidos por PIN para tu personal de mesas.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-blue-900/20 active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Nuevo Mesero
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-40 bg-slate-800/50 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {waiters.map((waiter) => (
            <div 
              key={waiter.id} 
              className="group bg-slate-800/40 border border-slate-700/50 hover:border-blue-500/50 p-6 rounded-3xl transition-all hover:shadow-2xl hover:shadow-blue-900/10 flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div className="bg-blue-600/10 p-4 rounded-2xl text-blue-500">
                  <User className="w-8 h-8" />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingWaiter(waiter)}
                    className="p-2 text-slate-500 hover:text-blue-400 hover:bg-blue-400/10 rounded-xl transition-colors"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDeleteWaiter(waiter.id)}
                    className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="mt-6">
                <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">
                  {waiter.name}
                </h3>
                <div className="mt-2 flex items-center gap-2 text-slate-400 font-mono">
                  <Key className="w-4 h-4 text-orange-500" />
                  PIN: <span className="bg-slate-900/50 px-2 py-0.5 rounded-lg text-white tracking-widest">****</span>
                </div>
              </div>
            </div>
          ))}
          
          {waiters.length === 0 && (
            <div className="col-span-full py-20 bg-slate-800/20 border-2 border-dashed border-slate-700 rounded-3xl flex flex-col items-center text-slate-500 font-medium">
              <User className="w-16 h-16 mb-4 opacity-20" />
              Todavía no has creado ningún mesero.
            </div>
          )}
        </div>
      )}

      {/* Modal Agregar Mesero */}
      {showAddModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md p-8 rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-bold text-white mb-6">Nuevo Mesero</h2>
            <form onSubmit={handleCreateWaiter} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-400 mb-2 px-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={newWaiterName}
                  onChange={(e) => setNewWaiterName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="Ej: Juan Pérez"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-400 mb-2 px-1">PIN de Acceso (4 dígitos)</label>
                <input
                  type="text"
                  maxLength={4}
                  required
                  value={newWaiterPin}
                  onChange={(e) => setNewWaiterPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-white text-center text-3xl font-mono tracking-[1rem] focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all font-bold"
                  placeholder="0000"
                />
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-xl text-sm font-semibold">
                  {error}
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-4 rounded-2xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-blue-900/20"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Mesero */}
      {editingWaiter && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md p-8 rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-bold text-white mb-6">Editar Mesero</h2>
            <form onSubmit={handleUpdateWaiter} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-400 mb-2 px-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={editingWaiter.name}
                  onChange={(e) => setEditingWaiter({ ...editingWaiter, name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-400 mb-2 px-1">Nuevo PIN (4 dígitos)</label>
                <input
                  type="text"
                  maxLength={4}
                  required
                  value={editingWaiter.pin}
                  onChange={(e) => setEditingWaiter({ ...editingWaiter, pin: e.target.value.replace(/\D/g, '') })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-white text-center text-3xl font-mono tracking-[1rem] focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all font-bold"
                />
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-xl text-sm font-semibold">
                  {error}
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => { setEditingWaiter(null); setError(''); }}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-4 rounded-2xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-blue-900/20"
                >
                  Actualizar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
