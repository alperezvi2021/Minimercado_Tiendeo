'use client';
import { useEffect } from 'react';
import { useScaleStore } from '@/store/useScaleStore';

/**
 * Componente que inicializa la báscula a nivel de toda la aplicación.
 * Al estar aquí, la conexión persiste incluso en el Login.
 */
export default function ScaleInitializer() {
  const { initGlobalListeners, disconnectScale } = useScaleStore();

  useEffect(() => {
    // 1. Iniciar los escuchas globales (USB y Polling)
    initGlobalListeners();

    // 2. Blindar contra cierres de pestaña para evitar bloqueos del puerto
    const handleBeforeUnload = () => {
      disconnectScale();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // NO desconectamos aquí para que la báscula sobreviva a la navegación interna
    };
  }, [initGlobalListeners, disconnectScale]);

  return null;
}
