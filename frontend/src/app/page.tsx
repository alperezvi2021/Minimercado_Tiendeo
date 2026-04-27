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
      <nav className="fixed top-0 w-full z-[100] bg-[#020617]/80 backdrop-blur-xl border-b border-white/5">
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
            <a href="https://wa.me/573004516713" target="_blank" rel="noopener noreferrer" className="px-6 py-2.5 rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 hover:scale-105 active:scale-95 transition-all outline-none">
              Crear mi Negocio
            </a>
          </div>

          <button 
            className="md:hidden p-3 text-slate-400 hover:text-white transition-colors outline-none active:scale-90"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-9 h-9" /> : <Menu className="w-9 h-9" />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Drawer (Improved Responsiveness) */}
      <div className={`
        fixed inset-0 z-[90] bg-[#020617] md:hidden transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) flex flex-col items-center justify-center
        ${mobileMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full pointer-events-none'}
      `}>
        <div className="flex flex-col gap-8 text-center px-6 w-full max-w-sm pt-20">
          <a href="#features" onClick={() => setMobileMenuOpen(false)} className="text-3xl font-black text-slate-300 hover:text-blue-500 transition-colors">Funcionalidades</a>
          <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="text-3xl font-black text-slate-300 hover:text-blue-500 transition-colors">Precios</a>
          <div className="h-px bg-white/10 my-4 shadow-sm" />
          <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="text-3xl font-black text-white">Iniciar Sesión</Link>
          <a href="https://wa.me/573004516713" target="_blank" rel="noopener noreferrer" onClick={() => setMobileMenuOpen(false)} className="px-10 py-5 rounded-[2rem] bg-blue-600 text-white font-black text-2xl shadow-2xl shadow-blue-600/40 active:scale-95 transition-all">
            Crear mi Negocio
          </a>
        </div>
      </div>

      {/* Hero Section (Responsive Font Sizes) */}
      <section className="relative pt-32 sm:pt-40 md:pt-48 pb-16 sm:pb-24 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div className="space-y-8 animate-in fade-in slide-in-from-left duration-1000 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 rounded-full border border-blue-500/20 mx-auto lg:mx-0">
              <Zap className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-black uppercase tracking-[0.3em] text-blue-400">Punto de venta inteligente</span>
            </div>
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-white tracking-tighter leading-[0.9] lg:leading-[0.95]">
              Gestiona tu negocio <br className="hidden sm:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-blue-600 to-indigo-400">como un profesional.</span>
            </h1>
            <p className="text-lg sm:text-xl text-slate-400 max-w-xl leading-relaxed font-medium mx-auto lg:mx-0">
              Vende en segundos, controla tu inventario en tiempo real y obtén reportes detallados. 
              Diseñado para tiendas, minimercados y emprendedores modernos.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-6">
              <a href="https://wa.me/573004516713" target="_blank" rel="noopener noreferrer" className="group px-10 py-6 rounded-[1.5rem] bg-blue-600 text-white font-black text-xl shadow-2xl shadow-blue-600/30 hover:bg-blue-500 transition-all flex items-center justify-center gap-3">
                Empezar Ahora <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </a>
              <Link href="#features" className="px-10 py-6 rounded-[1.5rem] border-2 border-white/10 font-black text-xl text-white hover:bg-white/5 transition-all text-center">
                Ver Funciones
              </Link>
            </div>
            
            <div className="flex items-center justify-center lg:justify-start gap-6 pt-10 border-t border-white/5">
               <div className="flex -space-x-3">
                 {[1,2,3,4].map(i => (
                   <div key={i} className={`w-12 h-12 rounded-full border-4 border-[#020617] bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400 shadow-xl`}>
                      U{i}
                   </div>
                 ))}
               </div>
               <p className="text-sm sm:text-base font-bold text-slate-500">
                 Confianza de <span className="text-white">500+ dueños</span> de negocios
               </p>
            </div>
          </div>
          
          <div className="relative animate-in fade-in zoom-in duration-1000 hidden lg:block">
            <div className="absolute -inset-10 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 rounded-full blur-[100px] opacity-50"></div>
            <div className="relative bg-white/5 rounded-[3rem] border border-white/10 shadow-2xl p-6 backdrop-blur-3xl">
               <div className="bg-slate-950/80 rounded-[2rem] h-[500px] w-full overflow-hidden border border-white/5 shadow-inner relative group">
                  <img src="/hero-image.jpeg" alt="TiendeoPOS Dashboard" className="absolute inset-0 w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700" />
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid (Responsive Columns) */}
      <section id="features" className="py-24 sm:py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-20 space-y-6">
            <h2 className="text-xs font-black uppercase tracking-[0.4em] text-blue-500">Simplifica tu vida</h2>
            <h3 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tighter">Todo lo que necesitas en un solo lugar</h3>
            <p className="text-slate-400 font-medium text-lg lg:text-xl leading-relaxed">
              Olvídate de las hojas de cálculo y el desorden. Controla tu negocio desde cualquier dispositivo.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            <FeatureCard 
              icon={<Store className="w-7 h-7 text-blue-400" />}
              title="Caja Registradora"
              desc="Venta intuitiva con buscador inteligente y múltiples métodos de cobro rápidos."
            />
            <FeatureCard 
              icon={<Zap className="w-7 h-7 text-amber-500" />}
              title="Control de Stock"
              desc="Olvídate de las sorpresas. Recibe alertas cuando tus productos se estén agotando."
            />
            <FeatureCard 
              icon={<BarChart3 className="w-7 h-7 text-emerald-400" />}
              title="Analítica Real"
              desc="Reportes automáticos de tus márgenes, ventas y productos estrella en tiempo real."
            />
            <FeatureCard 
              icon={<Users className="w-7 h-7 text-purple-400" />}
              title="Multi-Usuario"
              desc="Asigna roles específicos (cajeros, meseros, admin) y supervisa sus movimientos."
            />
            <FeatureCard 
              icon={<Shield className="w-7 h-7 text-rose-500" />}
              title="Nube Segura"
              desc="Respaldo automático total. Tu información disponible 24/7 sin riesgo de pérdida."
            />
            <FeatureCard 
              icon={<ShoppingBag className="w-7 h-7 text-indigo-400" />}
              title="Modo Desconectado"
              desc="¿Sin internet? No hay problema. Sigue vendiendo y sincroniza todo al recuperar la red."
            />
          </div>
        </div>
      </section>

      {/* Pricing Section (Optimized for Mobile Viewing) */}
      <section id="pricing" className="py-24 sm:py-32 px-6 bg-slate-900/20 backdrop-blur-sm border-t border-white/5">
        <div className="max-w-7xl mx-auto text-center">
            <h2 className="text-xs font-black uppercase tracking-[0.4em] text-blue-500 mb-6">PLANES Y PRECIOS</h2>
            <h3 className="text-4xl sm:text-5xl font-black text-white tracking-tighter mb-4 px-4">Increíblemente simple y transparente</h3>
            
            <div className="flex flex-col items-center gap-4 mb-16">
              <div className="inline-flex items-center gap-3 px-6 py-2 bg-slate-800/50 rounded-2xl border border-white/10 shadow-xl">
                 <span className="text-slate-400 font-bold text-sm">Costo de Implementación:</span>
                 <span className="text-white font-black text-xl">$250.000 <span className="text-xs text-slate-500 uppercase">COP</span></span>
                 <div className="bg-blue-600 px-2 py-0.5 rounded-lg text-[10px] font-black text-white ml-2">PAGO ÚNICO</div>
              </div>
              <p className="text-emerald-400 font-black text-sm animate-pulse tracking-wide">¡Tus primeros 2 meses son totalmente gratis!</p>
            </div>
            
            <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 max-w-5xl mx-auto">
              {/* Plan Mensual */}
              <div className="bg-white/5 border border-white/10 rounded-[3rem] p-10 flex flex-col items-center text-center hover:bg-white/10 transition-all group">
                <h4 className="text-2xl font-black text-white mb-6">Plan Mensual</h4>
                <p className="text-5xl font-black text-white tracking-tighter mb-4">$140.000 <span className="text-lg text-slate-500">/ mes</span></p>
                <div className="bg-blue-600/10 text-blue-400 px-4 py-1.5 rounded-full text-xs font-black mb-10 tracking-widest uppercase">Sin Permanencia</div>
                <ul className="space-y-4 mb-12 text-slate-400 font-bold text-sm w-full">
                  <li className="flex items-center justify-center gap-2 tracking-tight">Sin Cláusulas de Permanencia</li>
                  <li className="flex items-center justify-center gap-2 tracking-tight">Pago mes adelantado (Día 1-5)</li>
                  <li className="flex items-center justify-center gap-2 tracking-tight">Soporte Prioritario WhatsApp</li>
                  <li className="flex items-center justify-center gap-2 tracking-tight">Todas las funcionalidades Pro</li>
                </ul>
                <a href="https://wa.me/573004516713" className="w-full py-5 rounded-2xl bg-white/10 text-white font-black hover:bg-white/20 transition-all active:scale-95">Elegir Mensual</a>
              </div>

              {/* Plan Anual (Destacado) */}
              <div className="relative bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[3rem] p-10 flex flex-col items-center text-center shadow-[0_30px_60px_-15px_rgba(37,99,235,0.4)] transform lg:scale-105">
                <div className="absolute top-8 right-8 bg-white text-blue-600 px-4 py-1 rounded-full text-[10px] font-black tracking-widest uppercase shadow-xl">Best Value</div>
                <h4 className="text-2xl font-black text-white mb-6">Plan Anual</h4>
                <p className="text-5xl font-black text-white tracking-tighter mb-4">$1'440.000 <span className="text-lg text-blue-200">/ año</span></p>
                <div className="bg-white/20 text-white px-4 py-1.5 rounded-full text-xs font-black mb-10 tracking-widest uppercase">Ahorro Extremo</div>
                <ul className="space-y-4 mb-12 text-blue-100 font-bold text-sm w-full">
                  <li className="flex items-center justify-center gap-2">Pago único por adelantado</li>
                  <li className="flex items-center justify-center gap-2">Cláusula de permanencia (1 año)</li>
                  <li className="flex items-center justify-center gap-2">Atención Personalizada 24/7</li>
                  <li className="flex items-center justify-center gap-2">Capacitación completa equipo</li>
                </ul>
                <a href="https://wa.me/573004516713" target="_blank" rel="noopener noreferrer" className="w-full py-5 rounded-2xl bg-white text-blue-600 font-black shadow-2xl hover:bg-gray-50 transition-all active:scale-95">Obtener Plan Anual</a>
              </div>
            </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6 md:py-40">
        <div className="max-w-4xl mx-auto text-center space-y-12">
           <h3 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white tracking-tighter leading-none">Lleva tu negocio al siguiente nivel <span className="text-blue-500">hoy mismo.</span></h3>
           <p className="text-xl text-slate-500 max-w-2xl mx-auto font-medium">Únete a los cientos de comerciantes que ya están digitalizando su éxito con TiendeoPOS. Registro en menos de 1 minuto.</p>
           <a href="https://wa.me/573004516713" className="inline-flex items-center gap-4 bg-blue-600 text-white px-12 py-6 rounded-[2rem] font-black text-2xl shadow-2xl shadow-blue-600/30 hover:bg-blue-500 transition-all active:scale-95">
             Crear mi Negocio <ChevronRight className="w-7 h-7" />
           </a>
        </div>
      </section>

      <footer className="py-12 px-6 border-t border-white/5 text-center text-slate-600 font-bold text-sm">
        <p>© 2026 Tiendeo POS. Desarrollado con ❤️ para emprendedores.</p>
      </footer>

      {/* WhatsApp Fixed */}
      <a 
        href="https://wa.me/573004516713" 
        target="_blank" 
        className="fixed bottom-6 right-6 z-[100] bg-[#25D366] text-white p-5 rounded-3xl shadow-2xl hover:scale-110 active:scale-90 transition-all duration-300"
      >
        <MessageCircle className="w-8 h-8" />
      </a>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="p-10 rounded-[2.5rem] bg-white/5 border border-white/5 hover:border-blue-500/20 hover:bg-white/10 transition-all group">
      <div className="w-16 h-16 bg-slate-800 rounded-3xl flex items-center justify-center mb-8 border border-white/5 group-hover:bg-blue-600/20 group-hover:scale-110 transition-all duration-500">
        {icon}
      </div>
      <h4 className="text-2xl font-black text-white mb-4 tracking-tight">{title}</h4>
      <p className="text-slate-400 font-medium leading-relaxed italic">{desc}</p>
    </div>
  );
}
