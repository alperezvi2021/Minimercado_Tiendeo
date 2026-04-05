'use client';
import { useState, useEffect } from 'react';
import { 
  Database, 
  Download, 
  Trash2, 
  RefreshCw, 
  Calendar, 
  HardDrive,
  Loader2,
  FileArchive,
  AlertCircle
} from 'lucide-react';

interface Backup {
  name: string;
  size: number;
  lastModified: string;
}

export default function BackupsManager() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBackups = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/backups`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Error al obtener respaldos');
      const data = await response.json();
      setBackups(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const handleCreateBackup = async () => {
    try {
      setCreating(true);
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/backups`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Error al crear respaldo');
      alert('Respaldo creado con éxito');
      fetchBackups();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al crear respaldo');
    } finally {
      setCreating(false);
    }
  };

  const handleDownload = async (filename: string) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/backups/${filename}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      window.open(data.url, '_blank');
    } catch (err) {
      alert('Error al descargar');
    }
  };

  const handleDelete = async (filename: string) => {
    if (!confirm('¿Está seguro de que desea eliminar este respaldo?')) return;
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/backups/${filename}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        fetchBackups();
      }
    } catch (err) {
      alert('Error al eliminar');
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-white flex items-center gap-3 tracking-tight">
            <Database className="w-10 h-10 text-emerald-500" />
            Respaldos de Seguridad
          </h1>
          <p className="text-slate-400 mt-2 font-medium italic">Gestión de copias de seguridad de la base de datos (PGSQL)</p>
        </div>
        <button
          onClick={handleCreateBackup}
          disabled={creating}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-emerald-900/20 transition-all active:scale-95 disabled:opacity-50"
        >
          {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
          {creating ? 'Generando...' : 'Generar Respaldo Ahora'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/5 border border-white/5 p-6 rounded-3xl shadow-xl">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="w-5 h-5 text-blue-400" />
            <span className="text-slate-400 font-bold text-sm uppercase">Frecuencia</span>
          </div>
          <p className="text-xl font-bold text-white">Diaria (Medianoche)</p>
        </div>
        <div className="bg-white/5 border border-white/5 p-6 rounded-3xl shadow-xl">
          <div className="flex items-center gap-3 mb-2">
            <HardDrive className="w-5 h-5 text-purple-400" />
            <span className="text-slate-400 font-bold text-sm uppercase">Destino</span>
          </div>
          <p className="text-xl font-bold text-white">Minio S3 Local</p>
        </div>
        <div className="bg-white/5 border border-white/5 p-6 rounded-3xl shadow-xl">
          <div className="flex items-center gap-3 mb-2">
            <FileArchive className="w-5 h-5 text-orange-400" />
            <span className="text-slate-400 font-bold text-sm uppercase">Total Archivos</span>
          </div>
          <p className="text-xl font-bold text-white">{backups.length} Respaldos</p>
        </div>
      </div>

      <div className="bg-white/5 border border-white/5 rounded-[40px] overflow-hidden shadow-2xl">
        <div className="px-8 py-6 border-b border-white/5 bg-white/5 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Historial de Respaldos</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5 bg-white/5">
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Nombre del Archivo</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Fecha</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Tamaño</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-8 py-12 text-center text-slate-500">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                    Cargando respaldos...
                  </td>
                </tr>
              ) : backups.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-8 py-12 text-center text-slate-500 italic">
                    {error || 'No se han generado respaldos todavía.'}
                  </td>
                </tr>
              ) : (
                backups.map((backup) => (
                  <tr key={backup.name} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-8 py-6">
                      <span className="text-sm font-bold text-white">{backup.name}</span>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-sm text-slate-400">{new Date().toLocaleString('es-CO')}</span>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-sm text-slate-400">{formatSize(backup.size)}</span>
                    </td>
                    <td className="px-8 py-6 text-right flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleDownload(backup.name)}
                        className="p-2 hover:bg-blue-500/20 text-blue-400 rounded-xl transition-all"
                        title="Descargar"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(backup.name)}
                        className="p-2 hover:bg-red-500/20 text-red-400 rounded-xl transition-all"
                        title="Eliminar"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-blue-900/20 border border-blue-500/30 p-8 rounded-[40px] flex items-start gap-4 shadow-xl">
        <AlertCircle className="w-6 h-6 text-blue-400 shrink-0 mt-1" />
        <div className="space-y-1">
          <p className="text-sm font-bold text-blue-100 uppercase tracking-widest">Información Global</p>
          <p className="text-sm text-blue-200/70 leading-relaxed font-medium">
            Este módulo genera una copia completa de la base de datos de **Tiendeo POS**, incluyendo todos los negocios registrados en la red. 
            Los respaldos automáticos se realizan todos los días a las 00:00 (hora del servidor).
          </p>
        </div>
      </div>
    </div>
  );
}
