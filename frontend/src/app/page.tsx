'use client';
import Link from 'next/link';
import { ShoppingBag, Zap, Shield, BarChart3, Users, ChevronRight, Store, ArrowRight, MessageCircle, Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 transition-colors duration-300 overflow-x-hidden selection:bg-blue-500/30">
      {/* Dynamic Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-[#020617]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 group cursor-pointer">
            <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-600/20 group-hover:scale-110 transition-transform">
              <ShoppingBag className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-black text-white tracking-tighter">
              Tiendeo<span className="text-blue-500">POS</span>
            </span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-bold">
            <a href="#features" className="text-slate-400 hover:text-white transition-colors">Funcionalidades</a>
            <a href="#pricing" className="text-slate-400 hover:text-white transition-colors">Precios</a>
            <Link href="/login" className="px-6 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 transition-all">
              Iniciar Sesión
            </Link>
            <Link href="/register" className="px-6 py-2.5 rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 hover:scale-105 active:scale-95 transition-all">
              Crear mi Negocio
            </Link>
          </div>

          <button 
            className="md:hidden p-2 text-slate-400 hover:text-white transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-8 h-8" /> : <Menu className="w-8 h-8" />}
          </button>
        </div>

      </nav>

      {/* Mobile Menu Drawer (Movido fuera del nav para evitar el bug del backdrop-filter) */}
      <div className={`
        fixed inset-0 top-20 z-[100] bg-[#020617] md:hidden transition-all duration-300 ease-in-out border-t border-white/5
        ${mobileMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full pointer-events-none'}
      `}>
        <div className="flex flex-col p-6 gap-6 text-center">
          <a href="#features" onClick={() => setMobileMenuOpen(false)} className="text-2xl font-bold text-slate-300">Funcionalidades</a>
          <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="text-2xl font-bold text-slate-300">Precios</a>
          <div className="h-px bg-white/5 my-2" />
          <Link href="/login" className="text-2xl font-bold text-white">Iniciar Sesión</Link>
          <Link href="/register" className="px-8 py-4 rounded-2xl bg-blue-600 text-white font-black text-xl shadow-xl">
            Crear mi Negocio
          </Link>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8 animate-in fade-in slide-in-from-left duration-1000">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 rounded-full border border-blue-500/20">
              <Zap className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-black uppercase tracking-widest text-blue-400">Punto de Venta Inteligente</span>
            </div>
            <h1 className="text-6xl md:text-7xl font-black text-white tracking-tight leading-[1.1]">
              Gestiona tu negocio <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-blue-600 to-indigo-400">como un profesional.</span>
            </h1>
            <p className="text-xl text-slate-400 max-w-xl leading-relaxed font-medium">
              Vende en segundos, controla tu inventario en tiempo real y obtén reportes detallados. 
              Diseñado para tiendas, minimercados y emprendedores modernos.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link href="/register" className="group px-8 py-5 rounded-2xl bg-blue-600 text-white font-black text-lg shadow-2xl shadow-blue-600/30 hover:bg-blue-500 transition-all flex items-center justify-center gap-2">
                Empezar Gratis <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link href="#features" className="px-8 py-5 rounded-2xl border-2 border-white/5 font-black text-lg text-white hover:bg-white/5 transition-all text-center">
                Ver Funciones
              </Link>
            </div>
            
            <div className="flex items-center gap-6 pt-8 border-t border-white/5">
               <div className="flex -space-x-3">
                 {[1,2,3,4].map(i => (
                   <div key={i} className={`w-10 h-10 rounded-full border-4 border-[#020617] bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400`}>
                      U{i}
                   </div>
                 ))}
               </div>
               <p className="text-sm font-bold text-slate-500">
                 Más de <span className="text-white">500+ negocios</span> confían en Tiendeo
               </p>
            </div>
          </div>
          
          <div className="relative animate-in fade-in zoom-in duration-1000">
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-600/30 to-purple-600/30 rounded-[3rem] blur-3xl opacity-50"></div>
            <div className="relative bg-white/5 rounded-[2.5rem] border border-white/10 shadow-2xl p-4 overflow-hidden backdrop-blur-sm">
               {/* Mockup POS Interface */}
               <div className="bg-slate-950/50 rounded-[1.5rem] h-[400px] flex flex-col items-center justify-center p-8 text-center border border-white/5">
                  <BarChart3 className="w-20 h-20 text-blue-500 mb-6 animate-pulse" />
                  <div className="space-y-4 w-full max-w-xs">
                    <div className="h-4 w-full bg-slate-800 rounded-full mx-auto" />
                    <div className="h-4 w-2/3 bg-slate-800 rounded-full mx-auto opacity-50" />
                  </div>
                  <div className="mt-12 grid grid-cols-3 gap-4 w-full">
                    {[1,2,3].map(i => <div key={i} className="h-20 bg-slate-900/50 rounded-2xl border border-white/5 animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />)}
                  </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 px-6 bg-[#020617] border-y border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-blue-500">Simplifica tu vida</h2>
            <h3 className="text-4xl font-black text-white tracking-tight">Todo lo que necesitas en un solo lugar</h3>
            <p className="text-slate-400 font-medium text-lg leading-relaxed">
              Olvídate de las hojas de cálculo y el desorden. Controla tu negocio desde cualquier dispositivo.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Store className="w-6 h-6 text-blue-400" />}
              title="Caja Registradora"
              desc="Venta rápida con código de barras, atajos de teclado y múltiples métodos de pago."
            />
            <FeatureCard 
              icon={<Zap className="w-6 h-6 text-amber-400" />}
              title="Inventario Inteligente"
              desc="Alertas de stock bajo, gestión de categorías y control de precios centralizado."
            />
            <FeatureCard 
              icon={<BarChart3 className="w-6 h-6 text-emerald-400" />}
              title="Reportes Pro"
              desc="Visualiza tus ventas diarias, productos más vendidos y márgenes de ganancia."
            />
            <FeatureCard 
              icon={<Users className="w-6 h-6 text-purple-400" />}
              title="Gestión de Empleados"
              desc="Crea accesos limitados para cajeros y protege la información confidencial."
            />
            <FeatureCard 
              icon={<Shield className="w-6 h-6 text-red-400" />}
              title="Seguridad SaaS"
              desc="Tu información está segura en la nube, con auditorías globales del SuperAdmin."
            />
            <FeatureCard 
              icon={<ShoppingBag className="w-6 h-6 text-indigo-400" />}
              title="Offline Ready"
              desc="Sigue vendiendo incluso si pierdes internet. Los datos se sincronizarán después."
            />
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-24 px-6 relative">
        <div className="max-w-5xl mx-auto bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[3rem] p-12 md:p-20 text-center space-y-8 shadow-2xl shadow-blue-600/40 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
           <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full translateY-1/2 -translateX-1/2 blur-2xl"></div>
           
           <h3 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-tight relative">
             Lleva tu negocio al siguiente nivel <br /> hoy mismo.
           </h3>
           <p className="text-blue-100 text-lg font-medium max-w-2xl mx-auto relative opacity-90">
             Únete a los cientos de comerciantes que ya están digitalizando su éxito con TiendeoPOS. 
             Registro en menos de 1 minuto.
           </p>
           <div className="pt-6 relative">
             <Link href="/register" className="group inline-flex items-center gap-2 bg-white text-blue-600 px-10 py-5 rounded-2xl font-black text-xl hover:bg-gray-50 transition-all shadow-xl hover:scale-105 active:scale-95">
               Crear mi Tienda Gratis <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
             </Link>
           </div>
        </div>
      </section>

      <footer className="py-12 px-6 border-t border-white/5 text-center">
        <p className="text-slate-500 text-sm font-bold">
          © 2026 Tiendeo POS. Desarrollado con ❤️ para emprendedores.
        </p>
      </footer>
      
      {/* WhatsApp Floating Button */}
      <a 
        href="https://wa.me/573004516713" 
        target="_blank" 
        rel="noopener noreferrer"
        className="fixed bottom-8 right-8 z-[100] group flex items-center gap-3"
      >
        <div className="absolute inset-0 bg-emerald-500 rounded-full blur-xl opacity-20 group-hover:opacity-40 animate-pulse transition-opacity"></div>
        <div className="relative bg-emerald-500 text-white p-4 rounded-2xl shadow-2xl shadow-emerald-500/20 hover:bg-emerald-400 hover:scale-110 active:scale-95 transition-all duration-300">
          <MessageCircle className="w-8 h-8 fill-current" />
        </div>
        <div className="opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all duration-300 pointer-events-none">
          <div className="bg-white text-slate-900 px-4 py-2 rounded-xl text-sm font-black shadow-xl whitespace-nowrap">
            ¿Necesitas ayuda? <span className="text-emerald-500">¡Escríbenos!</span>
          </div>
        </div>
      </a>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="p-8 rounded-[2rem] bg-white/5 border border-white/5 hover:border-blue-500/30 hover:bg-white/10 transition-all group overflow-hidden relative">
      <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-blue-600/10 transition-colors"></div>
      <div className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-white/5 group-hover:scale-110 group-hover:bg-blue-600/20 transition-all">
        {icon}
      </div>
      <h4 className="text-xl font-black text-white mb-3 tracking-tight">{title}</h4>
      <p className="text-slate-400 font-medium leading-relaxed italic line-clamp-2 hover:line-clamp-none transition-all">
        {desc}
      </p>
    </div>
  );
}
