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

// Variable persistente fuera del store por si se reinicia el estado de Zustand
let globalPort: any = null;
let globalReader: any = null;

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
      // 1. Limpieza radical antes de abrir
      if (globalReader) {
        try { await globalReader.cancel(); globalReader.releaseLock(); } catch(e) {}
        globalReader = null;
      }
      
      // 2. Si el puerto ya está abierto en este objeto, intentamos reusar o cerrar
      if (port.readable) {
        // El puerto ya está abierto y fluyendo, no hacemos nada o refrescamos loop
        set({ port, isScaleConnected: true });
        return;
      }

      await port.open({ baudRate: 9600 });
      globalPort = port;
      set({ port, isScaleConnected: true });

      const textDecoder = new TextDecoderStream();
      port.readable.pipeTo(textDecoder.writable);
      const reader = textDecoder.readable.getReader();
      globalReader = reader;
      set({ reader });

      get().readScaleLoop(reader);
    } catch (e: any) {
      console.warn('Error configurando puerto:', e.message);
      // Si el error es "already open", intentamos marcarlo como conectado
      if (e.message.includes('already open')) {
        set({ port, isScaleConnected: true });
      } else {
        set({ isScaleConnected: false });
      }
    }
  },

  autoReconnect: async () => {
    if (typeof window === 'undefined' || !('serial' in navigator)) return;
    
    // Si ya estamos recibiendo datos (salud), no molestamos
    if (get().isScaleConnected && globalPort?.readable) return;

    try {
      const ports = await (navigator as any).serial.getPorts();
      if (ports.length > 0) {
        // Intentar recuperar el puerto autorizado
        await get().setupPort(ports[0]);
      }
    } catch (e) {
      console.warn('Fallo silencioso de auto-reconexión:', e);
    }
  },

  initGlobalListeners: () => {
    if (typeof window === 'undefined' || !('serial' in navigator)) return;

    if ((window as any).__scaleListenersInitialized) return;
    (window as any).__scaleListenersInitialized = true;

    (navigator as any).serial.addEventListener('connect', () => {
      setTimeout(() => get().autoReconnect(), 1000);
    });

    (navigator as any).serial.addEventListener('disconnect', () => {
      set({ isScaleConnected: false, port: null, reader: null, scaleWeight: 0 });
      globalPort = null;
      globalReader = null;
    });

    if (!get().reconnectInterval) {
      const interval = setInterval(() => {
        get().autoReconnect();
      }, 3000);
      set({ reconnectInterval: interval });
    }
    
    get().autoReconnect();
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
    } catch (error) {
      console.error('Lectura finalizada:', error);
    } finally {
      set({ isScaleConnected: false });
    }
  },
}));
