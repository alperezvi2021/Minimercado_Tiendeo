'use client';
import { useEffect } from 'react';
import { useScaleStore } from '@/store/useScaleStore';

/**
 * Componente que inicializa la báscula a nivel de toda la aplicación.
 * Ahora es más pasivo para permitir que el sistema operativo libere los puertos.
 */
export default function ScaleInitializer() {
  const { initGlobalListeners } = useScaleStore();

  useEffect(() => {
    // Solo iniciamos los escuchas globales.
    // La lógica de "Cortesía" de 3 segundos está dentro del Store.
    initGlobalListeners();

    // HEMOS ELIMINADO beforeunload: 
    // Forzar el cierre asíncrono del puerto justo antes de cerrar la pestaña
    // a veces causa que el puerto quede bloqueado en el Sistema Operativo.
    // Es mejor dejar que el navegador lo limpie a su ritmo.
  }, [initGlobalListeners]);

  return null;
}
