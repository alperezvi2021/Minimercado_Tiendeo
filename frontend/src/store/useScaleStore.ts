import { create } from 'zustand';

interface ScaleState {
  isScaleConnected: boolean;
  scaleWeight: number;
  port: any | null;
  reader: any | null;
  reconnectInterval: NodeJS.Timeout | null;
  setScaleWeight: (weight: number) => void;
  setIsScaleConnected: (connected: boolean) => void;
  connectScale: () => Promise<void>;
  disconnectScale: () => Promise<void>;
  autoReconnect: () => Promise<void>;
  readScaleLoop: (reader: any) => Promise<void>;
  initGlobalListeners: () => void;
  setupPort: (port: any) => Promise<void>;
}

export const useScaleStore = create<ScaleState>((set, get) => ({
  isScaleConnected: false,
  scaleWeight: 0,
  port: null,
  reader: null,
  reconnectInterval: null,

  setScaleWeight: (weight) => set({ scaleWeight: weight }),
  setIsScaleConnected: (connected) => set({ isScaleConnected: connected }),

  connectScale: async () => {
    if (typeof window === 'undefined' || !('serial' in navigator)) {
      alert('Tu navegador no soporta la conexión con básculas. Usa Google Chrome o Microsoft Edge.');
      return;
    }

    try {
      const port = await (navigator as any).serial.requestPort();
      await get().setupPort(port);
    } catch (error) {
      console.error('Error solicitando puerto:', error);
    }
  },

  setupPort: async (port: any) => {
    try {
      // Si el puerto ya está abierto por otra instancia o similar, intentamos cerrarlo para limpiar
      if (port.readable) {
         try { await port.close(); } catch(e) {}
      }

      await port.open({ baudRate: 9600 });
      set({ port, isScaleConnected: true });

      const textDecoder = new TextDecoderStream();
      port.readable.pipeTo(textDecoder.writable);
      const reader = textDecoder.readable.getReader();
      set({ reader });

      get().readScaleLoop(reader);
    } catch (e) {
      console.warn('Error configurando puerto:', e);
      set({ isScaleConnected: false });
    }
  },

  autoReconnect: async () => {
    if (typeof window === 'undefined' || !('serial' in navigator)) return;
    
    // Verificación de Salud: Si el estado dice conectado pero el puerto no tiene "readable", resetear
    const { port, isScaleConnected } = get();
    if (isScaleConnected && (!port || !port.readable)) {
      set({ isScaleConnected: false });
    }

    if (get().isScaleConnected) return;

    try {
      const ports = await (navigator as any).serial.getPorts();
      if (ports.length > 0) {
        // Buscamos un puerto que no esté bloqueado
        for (const p of ports) {
          if (!p.readable) {
            await get().setupPort(p);
            if (get().isScaleConnected) break;
          }
        }
      }
    } catch (e) {
      console.warn('Fallo silencioso de auto-reconexión:', e);
    }
  },

  initGlobalListeners: () => {
    if (typeof window === 'undefined' || !('serial' in navigator)) return;

    // Evitar duplicar listeners si ya existen
    if ((window as any).__scaleListenersInitialized) return;
    (window as any).__scaleListenersInitialized = true;

    // 1. Escuchar cuando se conecta un dispositivo USB
    (navigator as any).serial.addEventListener('connect', (e: any) => {
      console.log('Báscula detectada físicamente. Intentando vincular...');
      setTimeout(() => get().autoReconnect(), 1000); // Pequeño delay para que el OS reconozca el puerto
    });

    // 2. Escuchar cuando se desconecta
    (navigator as any).serial.addEventListener('disconnect', (e: any) => {
      console.log('Báscula desconectada físicamente.');
      set({ isScaleConnected: false, port: null, reader: null, scaleWeight: 0 });
    });

    // 3. Sistema de "Polling" Agresivo (Reintento cada 3 segundos si no hay conexión)
    if (!get().reconnectInterval) {
      const interval = setInterval(() => {
        get().autoReconnect();
      }, 3000);
      set({ reconnectInterval: interval });
    }
    
    get().autoReconnect();
  },

  disconnectScale: async () => {
    const { port, reader } = get();
    try {
      if (reader) {
        await reader.cancel();
        reader.releaseLock();
      }
      if (port) {
        await port.close();
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
                  set({ scaleWeight: weight });
                  // Si estamos recibiendo peso, confirmamos que estamos conectados
                  if (!get().isScaleConnected) set({ isScaleConnected: true });
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Bucle de lectura interrumpido:', error);
    } finally {
      set({ isScaleConnected: false, reader: null });
    }
  },
}));
