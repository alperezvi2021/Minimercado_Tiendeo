import { create } from 'zustand';

interface ScaleState {
  isScaleConnected: boolean;
  scaleWeight: number;
  port: any | null;
  reader: any | null;
  reconnectInterval: NodeJS.Timeout | null;
  needsRevincular: boolean;
  setScaleWeight: (weight: number) => void;
  setIsScaleConnected: (connected: boolean) => void;
  connectScale: () => Promise<void>;
  disconnectScale: () => Promise<void>;
  autoReconnect: () => Promise<void>;
  readScaleLoop: (reader: any) => Promise<void>;
  initGlobalListeners: () => void;
  setupPort: (port: any) => Promise<void>;
}

let globalPort: any = null;
let globalReader: any = null;

export const useScaleStore = create<ScaleState>((set, get) => ({
  isScaleConnected: false,
  scaleWeight: 0,
  port: null,
  reader: null,
  reconnectInterval: null,
  needsRevincular: false,

  setScaleWeight: (weight) => set({ scaleWeight: weight }),
  setIsScaleConnected: (connected) => set({ isScaleConnected: connected }),

  connectScale: async () => {
    if (typeof window === 'undefined' || !('serial' in navigator)) {
      alert('Tu navegador no soporta la conexión con básculas. Usa Google Chrome o Microsoft Edge.');
      return;
    }
    try {
      const port = await (navigator as any).serial.requestPort();
      localStorage.setItem('has_authorized_scale', 'true');
      set({ needsRevincular: false });
      await get().setupPort(port);
    } catch (error) {
      console.error('Error solicitando puerto:', error);
      // No alertar si el usuario simplemente canceló la ventana
      if ((error as any).name !== 'NotFoundError') {
         alert('Error al seleccionar la báscula: ' + (error as any).message);
      }
    }
  },

  setupPort: async (port: any) => {
    try {
      // 1. Limpieza radical de cualquier residuo anterior
      if (globalReader) {
        try { await globalReader.cancel(); globalReader.releaseLock(); } catch(e) {}
        globalReader = null;
      }
      
      // 2. Si el puerto ya está abierto (port.readable no es null), lo cerramos para reiniciar limpio
      if (port.readable || port.writable) {
         try { await port.close(); } catch(e) {}
      }

      // 3. Abrir con parámetros estándar
      await port.open({ baudRate: 9600 });
      globalPort = port;
      
      // PAUSA DE SEGURIDAD: Darle tiempo al hardware de estabilizar la conexión
      await new Promise(resolve => setTimeout(resolve, 600));

      const textDecoder = new TextDecoderStream();
      port.readable.pipeTo(textDecoder.writable);
      const reader = textDecoder.readable.getReader();
      globalReader = reader;
      set({ reader, port, isScaleConnected: true, needsRevincular: false });

      get().readScaleLoop(reader);
    } catch (e: any) {
      console.warn('Error configurando puerto:', e.message);
      set({ isScaleConnected: false });
      
      if (e.message.includes('already open') || e.message.includes('Access denied')) {
        alert('El puerto está bloqueado por Windows. Intenta desconectar y volver a conectar el cable USB de la báscula.');
      } else {
        alert('Error de configuración: ' + e.message);
      }
    }
  },

  autoReconnect: async () => {
    if (typeof window === 'undefined' || !('serial' in navigator)) return;
    if (get().isScaleConnected && globalPort?.readable) return;

    try {
      const ports = await (navigator as any).serial.getPorts();
      if (ports.length > 0) {
        await get().setupPort(ports[0]);
      } else if (localStorage.getItem('has_authorized_scale') === 'true') {
        set({ needsRevincular: true });
      }
    } catch (e) {
      console.warn('Auto-reconexión fallida silenciosamente');
    }
  },

  initGlobalListeners: () => {
    if (typeof window === 'undefined' || !('serial' in navigator)) return;
    if ((window as any).__scaleListenersInitialized) return;
    (window as any).__scaleListenersInitialized = true;

    (navigator as any).serial.addEventListener('connect', () => {
      setTimeout(() => get().autoReconnect(), 2000);
    });

    (navigator as any).serial.addEventListener('disconnect', () => {
      set({ isScaleConnected: false, port: null, reader: null, scaleWeight: 0 });
      globalPort = null;
      globalReader = null;
    });

    if (!get().reconnectInterval) {
      const interval = setInterval(() => {
        if (!get().isScaleConnected) {
          get().autoReconnect();
        }
      }, 5000);
      set({ reconnectInterval: interval });
    }
    
    setTimeout(() => get().autoReconnect(), 3000);
  },

  disconnectScale: async () => {
    try {
      if (globalReader) {
        await globalReader.cancel();
        globalReader.releaseLock();
        globalReader = null;
      }
      if (globalPort) {
        await globalPort.close();
        globalPort = null;
      }
    } catch (e) {
      console.error('Error desconectando:', e);
    } finally {
      set({ port: null, reader: null, isScaleConnected: false, scaleWeight: 0 });
    }
  },

  readScaleLoop: async (reader: any) => {
    let buffer = '';
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          buffer += value;
          const lines = buffer.split(/[\r\n\x02\x03]+/);
          if (lines.length > 1) {
            buffer = lines.pop() || ''; 
            for (const line of lines) {
              const match = line.match(/(\d+\.\d+)/);
              if (match) {
                const weight = parseFloat(match[1]);
                if (!isNaN(weight) && weight >= 0 && weight < 500) {
                  set({ scaleWeight: weight, isScaleConnected: true });
                }
              }
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Error de lectura:', error.message);
      // Si el error es de desconexión física, limpiar todo
      if (error.message.includes('device was disconnected')) {
         set({ isScaleConnected: false, port: null, reader: null });
      }
    } finally {
      set({ isScaleConnected: false });
    }
  },
}));
