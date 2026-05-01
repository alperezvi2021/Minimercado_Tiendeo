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

  // Nueva función interna para configurar el puerto consistentemente
  setupPort: async (port: any) => {
    try {
      // Si ya está abierto, no hacemos nada
      if (port.readable) return;

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
    
    // Si ya estamos conectados, no hacemos nada
    if (get().isScaleConnected && get().port?.readable) return;

    try {
      const ports = await (navigator as any).serial.getPorts();
      if (ports.length > 0) {
        // Intentar conectar al primer puerto autorizado disponible
        await get().setupPort(ports[0]);
      }
    } catch (e) {
      console.warn('Fallo silencioso de auto-reconexión:', e);
    }
  },

  // Inicializar escuchas de eventos de hardware (USB Connect/Disconnect)
  initGlobalListeners: () => {
    if (typeof window === 'undefined' || !('serial' in navigator)) return;

    // 1. Escuchar cuando se conecta un dispositivo USB
    (navigator as any).serial.addEventListener('connect', (e: any) => {
      console.log('Báscula detectada físicamente. Intentando vincular...');
      get().autoReconnect();
    });

    // 2. Escuchar cuando se desconecta
    (navigator as any).serial.addEventListener('disconnect', (e: any) => {
      console.log('Báscula desconectada físicamente.');
      set({ isScaleConnected: false, port: null, reader: null, scaleWeight: 0 });
    });

    // 3. Sistema de "Polling" (Reintento cada 5 segundos si no hay conexión)
    if (!get().reconnectInterval) {
      const interval = setInterval(() => {
        if (!get().isScaleConnected) {
          get().autoReconnect();
        }
      }, 5000);
      set({ reconnectInterval: interval });
    }
    
    // Ejecutar el primer intento de inmediato
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
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Bucle de lectura interrumpido:', error);
    } finally {
      set({ isScaleConnected: false });
      // Al romperse el bucle, el sistema de Polling intentará reconectar en el próximo ciclo
    }
  },
}));
