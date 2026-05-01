'use client';
import { useEffect } from 'react';
import { useScaleStore } from '@/store/useScaleStore';

export default function ScaleInitializer() {
  const { initGlobalListeners, disconnectScale } = useScaleStore();

  useEffect(() => {
    initGlobalListeners();

    // 'pagehide' es más confiable que 'beforeunload' para limpiar hardware en navegadores modernos
    const handleExit = () => {
      // Intentamos un cierre rápido. Aunque es asíncrono, 'pagehide' da un pequeño margen extra
      disconnectScale();
    };

    window.addEventListener('pagehide', handleExit);
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        // Opcional: Podríamos pausar el puerto aquí, pero mejor solo al cerrar
      }
    });

    return () => {
      window.removeEventListener('pagehide', handleExit);
    };
  }, [initGlobalListeners, disconnectScale]);

  return null;
}
