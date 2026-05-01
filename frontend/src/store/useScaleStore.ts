import { create } from 'zustand';

interface ScaleState {
  isScaleConnected: boolean;
  scaleWeight: number;
  port: any | null;
  reader: any | null;
  reconnectInterval: NodeJS.Timeout | null;
  needsRevincular: boolean; // Nuevo estado para avisar si el navegador perdió el permiso
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
      // Guardar en localStorage que el usuario ya autorizó una vez
      localStorage.setItem('has_authorized_scale', 'true');
      set({ needsRevincular: false });
      await get().setupPort(port);
    } catch (error) {
      console.error('Error solicitando puerto:', error);
    }
  },

  setupPort: async (port: any) => {
    try {
      if (globalReader) {
        try { await globalReader.cancel(); globalReader.releaseLock(); } catch(e) {}
        globalReader = null;
      }

      // La propiedad correcta para saber si está abierto es ver si tiene readable/writable
      if (port.readable) {
        set({ port, isScaleConnected: true, needsRevincular: false });
        return;
      }

      await port.open({ baudRate: 9600 });
      globalPort = port;
      set({ port, isScaleConnected: true, needsRevincular: false });

      const textDecoder = new TextDecoderStream();
      port.readable.pipeTo(textDecoder.writable);
      const reader = textDecoder.readable.getReader();
      globalReader = reader;
      set({ reader });

      get().readScaleLoop(reader);
    } catch (e: any) {
      console.warn('Error configurando puerto:', e.message);
      if (e.message.includes('already open')) {
        set({ isScaleConnected: true, needsRevincular: false });
      } else {
        set({ isScaleConnected: false });
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
      } else {
        // Si no hay puertos pero el usuario dijo que tenía una, avisar que debe re-vincular
        if (localStorage.getItem('has_authorized_scale') === 'true') {
          set({ needsRevincular: true });
        }
      }
    } catch (e) {
      console.warn('Auto-reconexión fallida:', e);
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
      }, 4000);
      set({ reconnectInterval: interval });
    }
    
    setTimeout(() => get().autoReconnect(), 2000);
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
      console.error('Cierre de bucle:', error);
    } finally {
      set({ isScaleConnected: false });
    }
  },
}));
